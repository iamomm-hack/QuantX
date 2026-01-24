#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    token, Address, BytesN, Env, Vec, Map, symbol_short,
};

const MAX_RETRIES: u32 = 3;
const MIN_INTERVAL: u64 = 60;
const MAX_BATCH_SIZE: u32 = 20;
const LIFETIME_THRESHOLD: u32 = 17280;
const BUMP_AMOUNT: u32 = 518400;

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    PaymentNotDue = 2,
    InsufficientBalance = 3,
    InsufficientAllowance = 4,
    PaymentInactive = 5,
    AlreadyExecuted = 6,
    InvalidInterval = 7,
    InvalidAmount = 8,
    PaymentNotFound = 9,
    InvalidTotalCycles = 10,
    CannotResumeCancelled = 11,
    CannotResumeCompleted = 12,
    AlreadyCancelled = 13,
    RefundFailed = 14,
    ContractPaused = 15,
    NotAdmin = 16,
    ExecutorNotAllowed = 17,
    RateLimited = 18,
    BatchTooLarge = 19,
    PlanNotFound = 20,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum PaymentStatus {
    Active,
    Paused,
    Failed,
    Cancelled,
    Completed,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SubscriptionType {
    AutoPay,
    Prepaid,
}

#[contracttype]
#[derive(Clone)]
pub struct Payment {
    pub id: u64,
    pub payer: Address,
    pub recipient: Address,
    pub token: Address,
    pub amount: i128,
    pub interval: u64,
    pub next_execution: u64,
    pub last_ledger: u32,
    pub status: PaymentStatus,
    pub retries: u32,
    pub sub_type: SubscriptionType,
    pub total_cycles: u64,
    pub paid_cycles: u64,
    pub prepaid_balance: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct Plan {
    pub id: u32,
    pub token: Address,
    pub amount: i128,
    pub interval: u64,
    pub active: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub admin: Address,
    pub treasury: Address,
    pub platform_fee_bps: u32,
    pub paused: bool,
}

#[contracttype]
pub enum StorageKey {
    Config,
    Payment(u64),
    Plan(u32),
    Executor(Address),
    PaymentCount,
}

#[contract]
pub struct StripeLikeSubscriptions;

#[contractimpl]
impl StripeLikeSubscriptions {

    /* ---------------- ADMIN ---------------- */

    pub fn initialize(
        env: Env,
        admin: Address,
        treasury: Address,
        platform_fee_bps: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&StorageKey::Config) {
            return Err(Error::NotAuthorized);
        }

        let cfg = Config {
            admin: admin.clone(),
            treasury,
            platform_fee_bps,
            paused: false,
        };

        env.storage().instance().set(&StorageKey::Config, &cfg);
        env.storage().instance().extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);

        Ok(())
    }

    pub fn add_executor(env: Env, admin: Address, executor: Address) -> Result<(), Error> {
        admin.require_auth();
        let cfg = Self::config(&env)?;
        if cfg.admin != admin {
            return Err(Error::NotAdmin);
        }

        env.storage().persistent().set(&StorageKey::Executor(executor), &true);
        Ok(())
    }

    /* ---------------- PLAN ---------------- */

    pub fn create_plan(
        env: Env,
        admin: Address,
        plan_id: u32,
        token: Address,
        amount: i128,
        interval: u64,
    ) -> Result<(), Error> {
        admin.require_auth();
        let cfg = Self::config(&env)?;
        if cfg.admin != admin {
            return Err(Error::NotAdmin);
        }

        let plan = Plan {
            id: plan_id,
            token,
            amount,
            interval,
            active: true,
        };

        env.storage().persistent().set(&StorageKey::Plan(plan_id), &plan);
        Ok(())
    }

    pub fn subscribe_to_plan(
        env: Env,
        payer: Address,
        plan_id: u32,
        recipient: Address,
        total_cycles: u64,
        sub_type_symbol: soroban_sdk::Symbol,
    ) -> Result<u64, Error> {
        payer.require_auth();

        let plan: Plan = env.storage()
            .persistent()
            .get(&StorageKey::Plan(plan_id))
            .ok_or(Error::PlanNotFound)?;

        if !plan.active {
            return Err(Error::PlanNotFound);
        }

        // Convert symbol to enum
        let sub_type = if sub_type_symbol == symbol_short!("AutoPay") {
            SubscriptionType::AutoPay
        } else {
            SubscriptionType::Prepaid
        };

        let token_client = token::Client::new(&env, &plan.token);

        let prepaid_balance = if sub_type == SubscriptionType::Prepaid {
            let total_amount = plan.amount.checked_mul(total_cycles as i128).unwrap_or(0);
            if total_amount <= 0 {
                return Err(Error::InvalidAmount);
            }
            token_client.transfer(&payer, &env.current_contract_address(), &total_amount);
            total_amount
        } else {
            0
        };

        let payment_count: u64 = env.storage()
            .instance()
            .get(&StorageKey::PaymentCount)
            .unwrap_or(0);

        let payment_id = payment_count + 1;

        let payment = Payment {
            id: payment_id,
            payer: payer.clone(),
            recipient,
            token: plan.token,
            amount: plan.amount,
            interval: plan.interval,
            next_execution: env.ledger().timestamp(),
            last_ledger: 0,
            status: PaymentStatus::Active,
            retries: 0,
            sub_type,
            total_cycles,
            paid_cycles: 0,
            prepaid_balance,
        };

        env.storage().persistent().set(&StorageKey::Payment(payment_id), &payment);
        env.storage().instance().set(&StorageKey::PaymentCount, &payment_id);

        Ok(payment_id)
    }

    /* ---------------- EXECUTION ---------------- */

    pub fn execute_batch(
        env: Env,
        executor: Address,
        payment_ids: Vec<u64>,
    ) -> Result<Vec<bool>, Error> {
        executor.require_auth();

        if payment_ids.len() > MAX_BATCH_SIZE {
            return Err(Error::BatchTooLarge);
        }

        if !env.storage().persistent().has(&StorageKey::Executor(executor.clone())) {
            return Err(Error::ExecutorNotAllowed);
        }

        let mut results = Vec::new(&env);
        for pid in payment_ids {
            let res = Self::execute_payment(env.clone(), pid).unwrap_or(false);
            results.push_back(res);
        }

        Ok(results)
    }

    pub fn execute_payment(env: Env, payment_id: u64) -> Result<bool, Error> {
        let mut payment: Payment = env.storage()
            .persistent()
            .get(&StorageKey::Payment(payment_id))
            .ok_or(Error::PaymentNotFound)?;

        let now = env.ledger().timestamp();
        let ledger = env.ledger().sequence();

        if payment.last_ledger == ledger {
            return Err(Error::RateLimited);
        }
        if payment.status != PaymentStatus::Active {
            return Err(Error::PaymentInactive);
        }
        if now < payment.next_execution {
            return Err(Error::PaymentNotDue);
        }

        let cfg = Self::config(&env)?;
        let fee = payment.amount * cfg.platform_fee_bps as i128 / 10_000;
        let net = payment.amount - fee;

        let token_client = token::Client::new(&env, &payment.token);

        match payment.sub_type {
            SubscriptionType::AutoPay => {
                // Use transfer_from to transfer from payer using the contract's allowance
                token_client.transfer_from(&env.current_contract_address(), &payment.payer, &payment.recipient, &net);
                if fee > 0 {
                    token_client.transfer_from(&env.current_contract_address(), &payment.payer, &cfg.treasury, &fee);
                }
            }
            SubscriptionType::Prepaid => {
                payment.prepaid_balance -= payment.amount;
                token_client.transfer(&env.current_contract_address(), &payment.recipient, &net);
                if fee > 0 {
                    token_client.transfer(&env.current_contract_address(), &cfg.treasury, &fee);
                }
            }
        }

        payment.last_ledger = ledger;
        payment.paid_cycles += 1;
        payment.next_execution = now + payment.interval;

        if payment.sub_type == SubscriptionType::Prepaid && payment.paid_cycles >= payment.total_cycles {
            payment.status = PaymentStatus::Completed;
        }

        env.storage().persistent().set(&StorageKey::Payment(payment_id), &payment);
        Ok(true)
    }

    /* ---------------- QUERY ---------------- */

    pub fn get_payment(env: Env, payment_id: u64) -> Result<Payment, Error> {
        env.storage()
            .persistent()
            .get(&StorageKey::Payment(payment_id))
            .ok_or(Error::PaymentNotFound)
    }

    pub fn get_plan(env: Env, plan_id: u32) -> Result<Plan, Error> {
        env.storage()
            .persistent()
            .get(&StorageKey::Plan(plan_id))
            .ok_or(Error::PlanNotFound)
    }

    pub fn can_execute(env: Env, payment_id: u64) -> bool {
        let payment_opt: Option<Payment> = env.storage().persistent().get(&StorageKey::Payment(payment_id));
        match payment_opt {
            Some(p) => {
                p.status == PaymentStatus::Active &&
                env.ledger().timestamp() >= p.next_execution &&
                p.last_ledger != env.ledger().sequence()
            }
            None => false,
        }
    }

    pub fn get_payments_by_payer(env: Env, payer: Address, offset: u32, limit: u32) -> Vec<Payment> {
        let mut result = Vec::new(&env);
        let payment_count: u64 = env.storage().instance().get(&StorageKey::PaymentCount).unwrap_or(0);
        
        // Simple linear scan (not optimal for production, but works for now)
        let mut found = 0u32;
        let mut skipped = 0u32;
        
        for i in 1..=payment_count {
            if found >= limit {
                break;
            }
            
            if let Some(payment) = env.storage().persistent().get::<StorageKey, Payment>(&StorageKey::Payment(i)) {
                if payment.payer == payer {
                    if skipped >= offset {
                        result.push_back(payment);
                        found += 1;
                    } else {
                        skipped += 1;
                    }
                }
            }
        }
        
        result
    }

    /* ---------------- INTERNAL ---------------- */

    fn config(env: &Env) -> Result<Config, Error> {
        env.storage().instance()
            .get(&StorageKey::Config)
            .ok_or(Error::NotAuthorized)
    }
}
