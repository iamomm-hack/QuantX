#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec, symbol_short};

// Error codes
pub const ERR_NOT_PAYER: u32 = 1;
pub const ERR_NOT_DUE: u32 = 2;
pub const ERR_INSUFFICIENT_BALANCE: u32 = 3;
pub const ERR_INSUFFICIENT_ALLOWANCE: u32 = 4;
pub const ERR_PAYMENT_INACTIVE: u32 = 5;
pub const ERR_ALREADY_EXECUTED: u32 = 6;
pub const ERR_INVALID_INTERVAL: u32 = 7;
pub const ERR_INVALID_AMOUNT: u32 = 8;

#[derive(Clone, Copy, PartialEq, Eq)]
#[contracttype]
pub enum PaymentStatus {
    Active = 0,
    Paused = 1,
    Failed = 2,
    Cancelled = 3,
}

#[derive(Clone)]
#[contracttype]
pub struct Payment {
    pub id: u64,
    pub payer: Address,
    pub recipient: Address,
    pub amount: i128,
    pub interval: u64,
    pub next_execution: u64,
    pub last_execution_ledger: u32,
    pub status: PaymentStatus,
    pub retry_count: u32,
    pub created_at: u64,
}

#[contract]
pub struct RecurringPaymentContract;

#[contractimpl]
impl RecurringPaymentContract {
    /// Create a new recurring payment
    pub fn create_payment(
        env: Env,
        payer: Address,
        recipient: Address,
        amount: i128,
        interval: u64,
    ) -> u64 {
        payer.require_auth();

        // Validation
        if amount <= 0 {
            panic!("Invalid amount: {}", ERR_INVALID_AMOUNT);
        }
        if interval < 60 {
            panic!("Invalid interval: {}", ERR_INVALID_INTERVAL);
        }

        // Generate payment ID
        let payment_count = Self::get_payment_count(&env, &payer);
        let payment_id = payment_count + 1;

        let current_time = env.ledger().timestamp();
        let next_execution = current_time + interval;

        let payment = Payment {
            id: payment_id,
            payer: payer.clone(),
            recipient,
            amount,
            interval,
            next_execution,
            last_execution_ledger: 0,
            status: PaymentStatus::Active,
            retry_count: 0,
            created_at: current_time,
        };

        // Store payment
        env.storage().persistent().set(&payment_id, &payment);

        // Update payer's payment index
        Self::add_payment_to_payer(&env, &payer, payment_id);

        // Emit event
        env.events().publish(
            (symbol_short!("created"), payer.clone()),
            (payment_id, amount, interval),
        );

        payment_id
    }

    /// Execute a recurring payment (called by executor)
    pub fn execute_payment(env: Env, payment_id: u64) -> bool {
        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&payment_id)
            .unwrap_or_else(|| panic!("Payment not found"));

        let current_time = env.ledger().timestamp();
        let current_ledger = env.ledger().sequence();

        // Guard 1: Check if payment is active
        if payment.status != PaymentStatus::Active {
            panic!("Payment inactive: {}", ERR_PAYMENT_INACTIVE);
        }

        // Guard 2: Check if payment is due
        if current_time < payment.next_execution {
            panic!("Payment not due: {}", ERR_NOT_DUE);
        }

        // Guard 3: Prevent duplicate execution in same ledger
        if payment.last_execution_ledger == current_ledger {
            panic!("Already executed: {}", ERR_ALREADY_EXECUTED);
        }

        // Attempt transfer (this will fail if insufficient balance/allowance)
        let transfer_result = Self::try_transfer(
            &env,
            &payment.payer,
            &payment.recipient,
            payment.amount,
        );

        if transfer_result {
            // Success - update payment
            payment.next_execution = current_time + payment.interval;
            payment.last_execution_ledger = current_ledger;
            payment.retry_count = 0;

            env.storage().persistent().set(&payment_id, &payment);

            // Emit success event
            env.events().publish(
                (symbol_short!("executed"), payment_id),
                (payment.amount, payment.next_execution),
            );

            true
        } else {
            // Failure - increment retry count
            payment.retry_count += 1;

            if payment.retry_count >= 3 {
                payment.status = PaymentStatus::Failed;
            }

            env.storage().persistent().set(&payment_id, &payment);

            // Emit failure event
            env.events().publish(
                (symbol_short!("failed"), payment_id),
                payment.retry_count,
            );

            false
        }
    }

    /// Pause a recurring payment
    pub fn pause_payment(env: Env, payment_id: u64) {
        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&payment_id)
            .unwrap_or_else(|| panic!("Payment not found"));

        payment.payer.require_auth();

        if payment.status != PaymentStatus::Active {
            panic!("Payment not active: {}", ERR_PAYMENT_INACTIVE);
        }

        payment.status = PaymentStatus::Paused;
        env.storage().persistent().set(&payment_id, &payment);

        env.events().publish(
            (symbol_short!("paused"), payment_id),
            env.ledger().timestamp(),
        );
    }

    /// Resume a paused or failed payment
    pub fn resume_payment(env: Env, payment_id: u64) {
        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&payment_id)
            .unwrap_or_else(|| panic!("Payment not found"));

        payment.payer.require_auth();

        if payment.status == PaymentStatus::Cancelled {
            panic!("Cannot resume cancelled payment");
        }

        let current_time = env.ledger().timestamp();

        payment.status = PaymentStatus::Active;
        payment.retry_count = 0;
        payment.next_execution = current_time + payment.interval;

        env.storage().persistent().set(&payment_id, &payment);

        env.events().publish(
            (symbol_short!("resumed"), payment_id),
            payment.next_execution,
        );
    }

    /// Cancel a recurring payment
    pub fn cancel_payment(env: Env, payment_id: u64) {
        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&payment_id)
            .unwrap_or_else(|| panic!("Payment not found"));

        payment.payer.require_auth();

        payment.status = PaymentStatus::Cancelled;
        env.storage().persistent().set(&payment_id, &payment);

        env.events().publish(
            (symbol_short!("cancelled"), payment_id),
            env.ledger().timestamp(),
        );
    }

    /// Get payment details
    pub fn get_payment(env: Env, payment_id: u64) -> Payment {
        env.storage()
            .persistent()
            .get(&payment_id)
            .unwrap_or_else(|| panic!("Payment not found"))
    }

    /// Get all payments for a payer
    pub fn get_payments_by_payer(env: Env, payer: Address, offset: u32, limit: u32) -> Vec<Payment> {
        let payment_count = Self::get_payment_count(&env, &payer);
        let mut payments = Vec::new(&env);

        let start = offset;
        let end = (offset + limit).min(payment_count as u32);

        for i in start..end {
            let payment_id: u64 = env
                .storage()
                .persistent()
                .get(&(payer.clone(), i))
                .unwrap_or(0);

            if payment_id > 0 {
                if let Some(payment) = env.storage().persistent().get(&payment_id) {
                    payments.push_back(payment);
                }
            }
        }

        payments
    }

    // Helper functions

    fn get_payment_count(env: &Env, payer: &Address) -> u64 {
        env.storage()
            .persistent()
            .get(&(symbol_short!("count"), payer.clone()))
            .unwrap_or(0)
    }

    fn add_payment_to_payer(env: &Env, payer: &Address, payment_id: u64) {
        let count = Self::get_payment_count(env, payer);
        let new_count = count + 1;

        // Store payment ID at index
        env.storage()
            .persistent()
            .set(&(payer.clone(), count as u32), &payment_id);

        // Update count
        env.storage()
            .persistent()
            .set(&(symbol_short!("count"), payer.clone()), &new_count);
    }

    fn try_transfer(_env: &Env, _from: &Address, _to: &Address, _amount: i128) -> bool {
        // In a real implementation, this would use Stellar's token interface
        // For now, we'll simulate the transfer
        // This should use: token_client.transfer(from, to, amount)
        
        // Placeholder - in production, check allowance and execute transfer
        // using Stellar Asset Contract (SAC) interface
        true
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn test_create_payment() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RecurringPaymentContract);
        let client = RecurringPaymentContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);

        env.mock_all_auths();

        let payment_id = client.create_payment(&payer, &recipient, &1000, &3600);

        assert_eq!(payment_id, 1);

        let payment = client.get_payment(&payment_id);
        assert_eq!(payment.payer, payer);
        assert_eq!(payment.recipient, recipient);
        assert_eq!(payment.amount, 1000);
        assert_eq!(payment.interval, 3600);
    }

    #[test]
    #[should_panic(expected = "Invalid amount")]
    fn test_invalid_amount() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RecurringPaymentContract);
        let client = RecurringPaymentContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);

        env.mock_all_auths();

        client.create_payment(&payer, &recipient, &0, &3600);
    }

    #[test]
    #[should_panic(expected = "Invalid interval")]
    fn test_invalid_interval() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RecurringPaymentContract);
        let client = RecurringPaymentContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);

        env.mock_all_auths();

        client.create_payment(&payer, &recipient, &1000, &30);
    }
}
