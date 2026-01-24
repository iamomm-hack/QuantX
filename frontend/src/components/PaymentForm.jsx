import { useState } from 'react';
import { Contract, SorobanRpc, TransactionBuilder, Networks, BASE_FEE, Address } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'YOUR_CONTRACT_ID';
const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org';

const ERROR_MESSAGES = {
  1: 'You are not authorized to perform this action',
  2: 'Payment is not yet due for execution',
  3: 'Insufficient balance in your account',
  4: 'Insufficient allowance - please approve contract spending',
  5: 'Payment is not active (paused, failed, or cancelled)',
  6: 'Payment already executed in this ledger',
  7: 'Interval must be at least 60 seconds',
  8: 'Amount must be greater than 0',
};

function PaymentForm({ publicKey }) {
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    interval: '3600', // 1 hour default
    token: 'USDC', // USDC or XLM
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate inputs
      if (!formData.recipient || !formData.amount || !formData.interval || !formData.token) {
        throw new Error('Please fill in all fields');
      }

      const amount = parseFloat(formData.amount);
      const interval = parseInt(formData.interval);

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (interval < 60) {
        throw new Error('Interval must be at least 60 seconds');
      }

      // Development mode - skip contract interaction
      const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';
      
      if (DEV_MODE) {
        // Simulate successful payment creation
        console.log('🔧 DEV MODE: Simulating payment creation', {
          recipient: formData.recipient,
          amount: amount,
          token: formData.token,
          interval: interval,
        });

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        setMessage({
          type: 'success',
          text: `✅ DEV MODE: Payment created! ${amount} ${formData.token} every ${interval}s to ${formData.recipient.slice(0, 8)}...`,
        });

        // Reset form
        setFormData({
          recipient: '',
          amount: '',
          interval: '3600',
          token: 'USDC',
        });

        setLoading(false);
        return;
      }

      // Production mode - actual contract interaction
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ID);

      // Build transaction
      const account = await server.getAccount(publicKey);
      
      // Import nativeToScVal for proper type conversion
      const { nativeToScVal } = await import('@stellar/stellar-sdk');
      
      // Prepare contract call with proper parameter types
      const params = [
        new Address(publicKey).toScVal(), // payer address
        new Address(formData.recipient).toScVal(), // recipient address
        nativeToScVal(Math.floor(amount * 10000000), { type: 'i128' }), // amount in stroops
        nativeToScVal(interval, { type: 'u64' }) // interval in seconds
      ];

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call('create_payment', ...params)
        )
        .setTimeout(30)
        .build();

      // Simulate transaction first to check for errors
      console.log('🔍 Simulating transaction...');
      const simulated = await server.simulateTransaction(transaction);
      
      if (simulated.error) {
        console.error('❌ Simulation error:', simulated.error);
        throw new Error(`Simulation failed: ${simulated.error}`);
      }
      
      console.log('✅ Simulation successful:', simulated);

      // Use the prepared transaction from simulation (includes proper fees and footprint)
      const preparedTransaction = SorobanRpc.assembleTransaction(transaction, simulated).build();

      // Sign with Freighter
      console.log('📝 Requesting signature from Freighter...');
      const xdr = preparedTransaction.toXDR();
      const signedXdr = await signTransaction(xdr, {
        network: 'TESTNET',
        networkPassphrase: Networks.TESTNET,
      });

      // Submit transaction
      console.log('📤 Submitting transaction...');
      const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      const response = await server.sendTransaction(signedTx);

      console.log('📊 Transaction response:', response);

      if (response.status === 'PENDING') {
        setMessage({
          type: 'success',
          text: 'Payment created successfully! Waiting for confirmation...',
        });

        // Reset form
        setFormData({
          recipient: '',
          amount: '',
          interval: '3600',
          token: 'USDC',
        });
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 5000);
      } else if (response.status === 'ERROR') {
        console.error('❌ Transaction error:', response);
        console.error('❌ Error result:', response.errorResult);
        
        // Try to decode the error
        let errorMessage = 'Transaction failed';
        if (response.errorResult) {
          try {
            const errorCode = response.errorResult.result?.value()?.value();
            console.error('❌ Error code:', errorCode);
            errorMessage = `Transaction failed: ${errorCode || 'Unknown error'}`;
          } catch (e) {
            console.error('Could not decode error:', e);
          }
        }
        
        throw new Error(errorMessage);
      } else {
        console.error('❌ Unexpected response status:', response);
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      
      // Parse error code if available
      const errorCode = parseInt(error.message.match(/\d+/)?.[0]);
      const errorMessage = ERROR_MESSAGES[errorCode] || error.message;
      
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem' }}>Create Recurring Payment</h2>

      {message.text && (
        <div className={message.type}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Recipient Address</label>
          <input
            type="text"
            name="recipient"
            value={formData.recipient}
            onChange={handleChange}
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            required
          />
        </div>

        <div className="form-group">
          <label>Token</label>
          <select
            name="token"
            value={formData.token}
            onChange={handleChange}
            required
            style={{ padding: '0.75rem', fontSize: '1rem' }}
          >
            <option value="USDC">USDC (USD Coin)</option>
            <option value="XLM">XLM (Stellar Lumens)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Amount ({formData.token})</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="100"
            step="0.01"
            min="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label>Interval (seconds)</label>
          <input
            type="number"
            name="interval"
            value={formData.interval}
            onChange={handleChange}
            placeholder="3600"
            min="60"
            required
          />
          <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Minimum: 60 seconds (For demo: use 30 seconds)
          </small>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Creating...' : 'Create Payment'}
        </button>
      </form>
    </div>
  );
}

export default PaymentForm;
