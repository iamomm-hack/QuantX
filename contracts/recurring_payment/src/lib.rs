#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, token, Address, BytesN, Env, Vec,
    symbol_short,
};

// ==============================
// CONSTANTS
// ==============================

const MAX_RETRIES: u32 = 3;
const MIN_INTERVAL: u64 = 60;
const LIFETIME_THRESHOLD: u32 = 17280;
const BUMP_AMOUNT: u32 = 518400;

// ==============================
// ERRORS - Must use #[contracterror]
// ==============================

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
    InvalidToken = 17,
    RateLimited = 18,
    BatchTooLarge = 19,
}

// ==============================
// DATA STRUCTURES
// ==============================

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[contracttype]
pub enum PaymentStatus {
    Active = 0,
    Paused = 1,
    Failed = 2,
    Cancelled = 3,
    Completed = 4,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[contracttype]
pub enum SubscriptionType {
    AutoPay = 0,
    Prepaid = 1,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[contracttype]
pub enum ChargeStart {
    Immediate = 0,
    Delayed = 1,
}

#[derive(Clone)]
#[contracttype]
pub struct Payment {
    pub id: u64,
    pub payer: Address,
    pub recipient: Address,
    pub token: Address,
    pub amount: i128,
    pub interval: u64,
    pub next_execution: u64,
    pub last_execution_ledger: u32,
    pub status: PaymentStatus,
    pub retry_count: u32,
    pub created_at: u64,
    pub sub_type: SubscriptionType,
    pub total_cycles: u64,
    pub paid_cycles: u64,
    pub prepaid_balance: i128,
}

#[derive(Clone)]
#[contracttype]
pub struct ContractConfig {
    pub admin: Address,
    pub paused: bool,
    pub total_payments: u64,
    pub total_executions: u64,
    pub total_failures: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct BatchResult {
    pub payment_id: u64,
    pub success: bool,
}

// ==============================
// STORAGE KEYS
// ==============================

#[derive(Clone)]
#[contracttype]
pub enum StorageKey {
    Config,
    Payment(u64),
    PayerCount(Address),
}

// ==============================
// CONTRACT
// ==============================

#[contract]
pub struct RecurringPaymentContract;

#[contractimpl]
impl RecurringPaymentContract {
    // ==============================
    // ADMIN FUNCTIONS
    // ==============================

    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&StorageKey::Config) {
            return Err(Error::NotAuthorized);
        }

        let config = ContractConfig {
            admin: admin.clone(),
            paused: false,
            total_payments: 0,
            total_executions: 0,
            total_failures: 0,
        };
        env.storage().instance().set(&StorageKey::Config, &config);
        env.storage().instance().extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);

        env.events().publish((symbol_short!("init"), admin), env.ledger().timestamp());
        Ok(())
    }

    pub fn emergency_pause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let mut config = Self::get_config(&env)?;
        if config.admin != admin {
            return Err(Error::NotAdmin);
        }

        config.paused = true;
        env.storage().instance().set(&StorageKey::Config, &config);

        env.events().publish((symbol_short!("paused"), admin), env.ledger().timestamp());
        Ok(())
    }

    pub fn emergency_resume(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let mut config = Self::get_config(&env)?;
        if config.admin != admin {
            return Err(Error::NotAdmin);
        }

        config.paused = false;
        env.storage().instance().set(&StorageKey::Config, &config);

        env.events().publish((symbol_short!("resumed"), admin), env.ledger().timestamp());
        Ok(())
    }

    pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        admin.require_auth();
        let config = Self::get_config(&env)?;
        if config.admin != admin {
            return Err(Error::NotAdmin);
        }

        env.deployer().update_current_contract_wasm(new_wasm_hash);

        env.events().publish((symbol_short!("upgraded"), admin), env.ledger().timestamp());
        Ok(())
    }

    // ==============================
    // PAYMENT MANAGEMENT
    // ==============================

    pub fn create_payment(
        env: Env,
        payer: Address,
        recipient: Address,
        token: Address,
        amount: i128,
        interval: u64,
        sub_type: SubscriptionType,
        total_cycles: u64,
        charge_start: ChargeStart,
    ) -> Result<u64, Error> {
        let mut config = Self::get_config(&env)?;
        if config.paused {
            return Err(Error::ContractPaused);
        }

        payer.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if interval < MIN_INTERVAL {
            return Err(Error::InvalidInterval);
        }
        if sub_type == SubscriptionType::Prepaid && total_cycles == 0 {
            return Err(Error::InvalidTotalCycles);
        }

        let token_client = token::Client::new(&env, &token);

        let prepaid_balance = if sub_type == SubscriptionType::Prepaid {
            let total_amount = amount.checked_mul(total_cycles as i128).unwrap_or(0);
            if total_amount <= 0 {
                return Err(Error::InvalidAmount);
            }
            token_client.transfer(&payer, &env.current_contract_address(), &total_amount);
            total_amount
        } else {
            0
        };

        let payment_id = config.total_payments + 1;
        config.total_payments = payment_id;

        let current_time = env.ledger().timestamp();
        let next_execution = match charge_start {
            ChargeStart::Immediate => current_time,
            ChargeStart::Delayed => current_time + interval,
        };

        let payment = Payment {
            id: payment_id,
            payer: payer.clone(),
            recipient,
            token,
            amount,
            interval,
            next_execution,
            last_execution_ledger: 0,
            status: PaymentStatus::Active,
            retry_count: 0,
            created_at: current_time,
            sub_type,
            total_cycles,
            paid_cycles: 0,
            prepaid_balance,
        };

        env.storage().persistent().set(&StorageKey::Payment(payment_id), &payment);
        Self::extend_payment_ttl(&env, payment_id);
        Self::add_payment_to_payer(&env, &payer, payment_id);
        env.storage().instance().set(&StorageKey::Config, &config);

        env.events().publish(
            (symbol_short!("created"), payer),
            (payment_id, amount, interval),
        );

        Ok(payment_id)
    }

    pub fn execute_payment(env: Env, payment_id: u64) -> Result<bool, Error> {
        let mut config = Self::get_config(&env)?;
        if config.paused {
            return Err(Error::ContractPaused);
        }

        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&StorageKey::Payment(payment_id))
            .ok_or(Error::PaymentNotFound)?;

        let current_time = env.ledger().timestamp();
        let current_ledger = env.ledger().sequence();

        if payment.status != PaymentStatus::Active {
            return Err(Error::PaymentInactive);
        }
        if current_time < payment.next_execution {
            return Err(Error::PaymentNotDue);
        }
        if payment.last_execution_ledger == current_ledger {
            return Err(Error::AlreadyExecuted);
        }

        let success = match payment.sub_type {
            SubscriptionType::AutoPay => {
                Self::try_transfer(&env, &payment.token, &payment.payer, &payment.recipient, payment.amount)
            }
            SubscriptionType::Prepaid => {
                if payment.prepaid_balance < payment.amount {
                    payment.status = PaymentStatus::Failed;
                    env.storage().persistent().set(&StorageKey::Payment(payment_id), &payment);
                    config.total_failures += 1;
                    env.storage().instance().set(&StorageKey::Config, &config);
                    env.events().publish((symbol_short!("failed"), payment_id), payment.retry_count);
                    return Ok(false);
                }

                payment.prepaid_balance -= payment.amount;
                let ok = Self::try_transfer(&env, &payment.token, &env.current_contract_address(), &payment.recipient, payment.amount);
                if !ok {
                    payment.prepaid_balance += payment.amount;
                }
                ok
            }
        };

        if success {
            payment.paid_cycles += 1;
            payment.next_execution = current_time + payment.interval;
            payment.last_execution_ledger = current_ledger;
            payment.retry_count = 0;

            if payment.sub_type == SubscriptionType::Prepaid && payment.paid_cycles >= payment.total_cycles {
                payment.status = PaymentStatus::Completed;
            }

            env.storage().persistent().set(&StorageKey::Payment(payment_id), &payment);
            Self::extend_payment_ttl(&env, payment_id);
            config.total_executions += 1;
            env.storage().instance().set(&StorageKey::Config, &config);

            env.events().publish((symbol_short!("executed"), payment_id), (payment.amount, payment.paid_cycles));
            Ok(true)
        } else {
            payment.retry_count += 1;
            if payment.retry_count >= MAX_RETRIES {
                payment.status = PaymentStatus::Failed;
            }
            env.storage().persistent().set(&StorageKey::Payment(payment_id), &payment);
            config.total_failures += 1;
            env.storage().instance().set(&StorageKey::Config, &config);

            env.events().publish((symbol_short!("failed"), payment_id), payment.retry_count);
            Ok(false)
        }
    }

    pub fn can_execute(env: Env, payment_id: u64) -> bool {
        let payment_opt: Option<Payment> = env.storage().persistent().get(&StorageKey::Payment(payment_id));
        match payment_opt {
            Some(p) => {
                p.status == PaymentStatus::Active &&
                env.ledger().timestamp() >= p.next_execution &&
                p.last_execution_ledger != env.ledger().sequence()
            }
            None => false,
        }
    }

    pub fn pause_payment(env: Env, payment_id: u64) -> Result<(), Error> {
        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&StorageKey::Payment(payment_id))
            .ok_or(Error::PaymentNotFound)?;

        payment.payer.require_auth();

        if payment.status != PaymentStatus::Active {
            return Err(Error::PaymentInactive);
        }

        payment.status = PaymentStatus::Paused;
        env.storage().persistent().set(&StorageKey::Payment(payment_id), &payment);
        Self::extend_payment_ttl(&env, payment_id);

        env.events().publish((symbol_short!("paused"), payment_id), env.ledger().timestamp());
        Ok(())
    }

    pub fn resume_payment(env: Env, payment_id: u64) -> Result<(), Error> {
        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&StorageKey::Payment(payment_id))
            .ok_or(Error::PaymentNotFound)?;

        payment.payer.require_auth();

        if payment.status == PaymentStatus::Cancelled {
            return Err(Error::CannotResumeCancelled);
        }
        if payment.status == PaymentStatus::Completed {
            return Err(Error::CannotResumeCompleted);
        }

        payment.status = PaymentStatus::Active;
        payment.retry_count = 0;
        payment.next_execution = env.ledger().timestamp() + payment.interval;

        env.storage().persistent().set(&StorageKey::Payment(payment_id), &payment);
        Self::extend_payment_ttl(&env, payment_id);

        env.events().publish((symbol_short!("resumed"), payment_id), payment.next_execution);
        Ok(())
    }

    pub fn cancel_payment(env: Env, payment_id: u64) -> Result<(), Error> {
        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&StorageKey::Payment(payment_id))
            .ok_or(Error::PaymentNotFound)?;

        payment.payer.require_auth();

        if payment.status == PaymentStatus::Cancelled {
            return Err(Error::AlreadyCancelled);
        }

        if payment.sub_type == SubscriptionType::Prepaid && payment.prepaid_balance > 0 {
            let refund = payment.prepaid_balance;
            payment.prepaid_balance = 0;

            let ok = Self::try_transfer(&env, &payment.token, &env.current_contract_address(), &payment.payer, refund);
            if !ok {
                return Err(Error::RefundFailed);
            }

            env.events().publish((symbol_short!("refunded"), payment_id), refund);
        }

        payment.status = PaymentStatus::Cancelled;
        env.storage().persistent().set(&StorageKey::Payment(payment_id), &payment);
        Self::extend_payment_ttl(&env, payment_id);

        env.events().publish((symbol_short!("cancelled"), payment_id), env.ledger().timestamp());
        Ok(())
    }

    // ==============================
    // QUERY FUNCTIONS
    // ==============================

    pub fn get_payment(env: Env, payment_id: u64) -> Result<Payment, Error> {
        env.storage()
            .persistent()
            .get(&StorageKey::Payment(payment_id))
            .ok_or(Error::PaymentNotFound)
    }

    pub fn get_stats(env: Env) -> Result<(u64, u64, u64, bool), Error> {
        let config = Self::get_config(&env)?;
        Ok((config.total_payments, config.total_executions, config.total_failures, config.paused))
    }

    pub fn get_payments_by_payer(env: Env, payer: Address, offset: u32, limit: u32) -> Vec<Payment> {
        let count = Self::get_payment_count(&env, &payer);
        let mut result = Vec::new(&env);

        let start = offset;
        let end = (offset + limit).min(count as u32);

        for i in start..end {
            let pid: u64 = env.storage().persistent().get(&(payer.clone(), i)).unwrap_or(0);
            if pid > 0 {
                if let Some(p) = env.storage().persistent().get(&StorageKey::Payment(pid)) {
                    result.push_back(p);
                }
            }
        }

        result
    }

    // ==============================
    // INTERNAL HELPERS
    // ==============================

    fn get_config(env: &Env) -> Result<ContractConfig, Error> {
        env.storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(Error::NotAuthorized)
    }

    fn get_payment_count(env: &Env, payer: &Address) -> u64 {
        env.storage()
            .persistent()
            .get(&StorageKey::PayerCount(payer.clone()))
            .unwrap_or(0)
    }

    fn add_payment_to_payer(env: &Env, payer: &Address, payment_id: u64) {
        let count = Self::get_payment_count(env, payer);
        env.storage().persistent().set(&(payer.clone(), count as u32), &payment_id);
        env.storage().persistent().set(&StorageKey::PayerCount(payer.clone()), &(count + 1));
    }

    fn extend_payment_ttl(env: &Env, payment_id: u64) {
        env.storage()
            .persistent()
            .extend_ttl(&StorageKey::Payment(payment_id), LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }

    fn try_transfer(env: &Env, token: &Address, from: &Address, to: &Address, amount: i128) -> bool {
        if amount <= 0 {
            return false;
        }

        let client = token::Client::new(env, token);

        if *from != env.current_contract_address() {
            let allowance = client.allowance(from, &env.current_contract_address());
            if allowance < amount {
                return false;
            }
        }

        let balance = client.balance(from);
        if balance < amount {
            return false;
        }

        client.transfer(from, to, &amount);
        true
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RecurringPaymentContract);
        let client = RecurringPaymentContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        env.mock_all_auths();

        client.initialize(&admin);

        let (total, exec, fail, paused) = client.get_stats();
        assert_eq!(total, 0);
        assert_eq!(exec, 0);
        assert_eq!(fail, 0);
        assert!(!paused);
    }
}
