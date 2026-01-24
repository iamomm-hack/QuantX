import { useState, useEffect } from 'react';
import { Contract, SorobanRpc, TransactionBuilder, Networks, BASE_FEE } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'YOUR_CONTRACT_ID';
const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org';

const STATUS_LABELS = {
  0: { label: 'Active', class: 'status-active' },
  1: { label: 'Paused', class: 'status-paused' },
  2: { label: 'Failed', class: 'status-failed' },
  3: { label: 'Cancelled', class: 'status-cancelled' },
};

function PaymentList({ publicKey }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadPayments();
    // Disabled auto-refresh to prevent excessive contract calls
    // const interval = setInterval(loadPayments, 10000);
    // return () => clearInterval(interval);
  }, [publicKey]);

  const loadPayments = async () => {
    try {
      // Development mode - use mock data
      const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';
      
      if (DEV_MODE) {
        console.log('🔧 DEV MODE: Using mock payment data');
        
        const mockPayments = [
          {
            id: 1,
            recipient: 'GCUOCLOPD3I7ECINEXFOJVGFGFNJILYYW26BERBCCQBG7WHJMICHR2WPM',
            amount: 100 * 10000000,
            interval: 3600,
            next_execution: Date.now() / 1000 + 1800,
            status: 0,
            created_at: Date.now() / 1000 - 86400,
            token: 'USDC',
          },
          {
            id: 2,
            recipient: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
            amount: 50 * 10000000,
            interval: 86400,
            next_execution: Date.now() / 1000 + 43200,
            status: 0,
            created_at: Date.now() / 1000 - 172800,
            token: 'XLM',
          },
        ];

        setPayments(mockPayments);
        setLoading(false);
        return;
      }

      // Production mode - fetch from contract
      console.log('📡 Fetching payments from contract...');
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ID);

      try {
        // Import Address for parameter conversion
        const { Address, nativeToScVal } = await import('@stellar/stellar-sdk');
        
        // Build transaction to call get_payments_by_payer
        const account = await server.getAccount(publicKey);
        
        const params = [
          new Address(publicKey).toScVal(), // payer address
          nativeToScVal(0, { type: 'u32' }), // offset
          nativeToScVal(10, { type: 'u32' }) // limit
        ];

        const transaction = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(contract.call('get_payments_by_payer', ...params))
          .setTimeout(30)
          .build();

        // Simulate to get result
        const simulated = await server.simulateTransaction(transaction);
        
        if (simulated.result) {
          console.log('✅ Payments fetched:', simulated.result);
          // Parse the result - this will be a Vec<Payment>
          // For now, show empty until we implement proper parsing
          setPayments([]);
        } else {
          console.log('ℹ️ No payments found or error:', simulated);
          setPayments([]);
        }
      } catch (contractError) {
        console.error('Error calling contract:', contractError);
        // Fallback to empty array
        setPayments([]);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (paymentId) => {
    await executeAction(paymentId, 'pause_payment', 'Pausing...');
  };

  const handleResume = async (paymentId) => {
    await executeAction(paymentId, 'resume_payment', 'Resuming...');
  };

  const handleCancel = async (paymentId) => {
    if (!confirm('Are you sure you want to cancel this payment?')) {
      return;
    }
    await executeAction(paymentId, 'cancel_payment', 'Cancelling...');
  };

  const executeAction = async (paymentId, action, loadingText) => {
    setActionLoading(paymentId);

    try {
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ID);

      const account = await server.getAccount(publicKey);
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call(action, paymentId))
        .setTimeout(30)
        .build();

      const xdr = transaction.toXDR();
      const signedXdr = await signTransaction(xdr, {
        network: 'TESTNET',
        networkPassphrase: Networks.TESTNET,
      });

      const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      await server.sendTransaction(signedTx);

      // Reload payments after action
      setTimeout(loadPayments, 2000);
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      alert(`Failed to ${action.replace('_', ' ')}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatInterval = (seconds) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    } else {
      const days = Math.floor(seconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading pulse">Loading payments...</div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>No Recurring Payments</h3>
          <p>Create your first recurring payment above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem' }}>Your Recurring Payments</h2>
      
      <div className="payment-list">
        {payments.map((payment) => {
          const statusInfo = STATUS_LABELS[payment.status];
          const isActive = payment.status === 0;
          const isPaused = payment.status === 1;
          const isFailed = payment.status === 2;
          const isCancelled = payment.status === 3;

          return (
            <div key={payment.id} className="payment-item">
              <div className="payment-info">
                <h3>
                  {payment.amount / 10000000} {payment.token || 'USDC'} every {formatInterval(payment.interval)}
                  <span className={`status-badge ${statusInfo.class}`}>
                    {statusInfo.label}
                  </span>
                </h3>
                <p>To: {payment.recipient.slice(0, 8)}...{payment.recipient.slice(-8)}</p>
                <p>
                  Next execution: {formatTime(payment.next_execution)}
                </p>
              </div>

              <div className="payment-actions">
                {isActive && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handlePause(payment.id)}
                      disabled={actionLoading === payment.id}
                    >
                      {actionLoading === payment.id ? 'Pausing...' : 'Pause'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancel(payment.id)}
                      disabled={actionLoading === payment.id}
                    >
                      Cancel
                    </button>
                  </>
                )}

                {(isPaused || isFailed) && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => handleResume(payment.id)}
                      disabled={actionLoading === payment.id}
                    >
                      {actionLoading === payment.id ? 'Resuming...' : 'Resume'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancel(payment.id)}
                      disabled={actionLoading === payment.id}
                    >
                      Cancel
                    </button>
                  </>
                )}

                {isCancelled && (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Cancelled
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PaymentList;
