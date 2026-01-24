import { useState, useEffect } from 'react';
import { isConnected, getPublicKey, requestAccess } from '@stellar/freighter-api';
import PaymentForm from './components/PaymentForm';
import PaymentList from './components/PaymentList';

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const connected = await isConnected();
      if (connected) {
        const key = await getPublicKey();
        setPublicKey(key);
        setWalletConnected(true);
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      const access = await requestAccess();
      
      if (access.error) {
        alert('Failed to connect wallet: ' + access.error);
        return;
      }

      const key = await getPublicKey();
      setPublicKey(key);
      setWalletConnected(true);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Please install Freighter wallet extension');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setPublicKey('');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          ⚡ QuantX
          {import.meta.env.VITE_DEV_MODE === 'true' && (
            <span style={{ 
              marginLeft: '1rem', 
              padding: '0.25rem 0.75rem', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              letterSpacing: '0.5px'
            }}>
              🔧 DEV MODE
            </span>
          )}
        </div>
        <div>
          {walletConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
              </span>
              <button className="btn btn-secondary" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {!walletConnected ? (
        <div className="empty-state">
          <h3>Welcome to QuantX</h3>
          <p>Recurring payments infrastructure on Stellar</p>
          <p style={{ marginTop: '1rem' }}>Connect your Freighter wallet to get started</p>
        </div>
      ) : (
        <>
          <PaymentForm publicKey={publicKey} />
          <PaymentList publicKey={publicKey} />
        </>
      )}
    </div>
  );
}

export default App;
