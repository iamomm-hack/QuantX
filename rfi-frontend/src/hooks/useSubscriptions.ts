import { useState, useEffect } from 'react';
import api from '@/lib/api';

export interface Subscription {
  id: string;
  payer: string;
  recipient: string;
  token: string;
  amount: number;
  interval: number;
  intervalFormatted: string;
  nextExecution: number;
  status: 'Active' | 'Paused' | 'Failed' | 'Cancelled' | 'Completed';
  subType: 'AutoPay' | 'Prepaid';
  paidCycles: number;
  totalCycles: number;
  prepaidBalance: number;
}

export function useSubscriptions(address: string | null) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    if (!address) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getPaymentsByUser(address, 0, 50);
      
      if (response.success && response.payments) {
        const mapped: Subscription[] = response.payments.map((p: any) => ({
          id: p.id?.toString() || '0',
          payer: p.payer || address,
          recipient: p.recipient || '',
          token: p.token || 'USDC',
          amount: (p.amount || 0) / 10000000,
          interval: p.interval || 0,
          intervalFormatted: p.intervalFormatted || formatInterval(p.interval || 0),
          nextExecution: p.nextExecution || p.next_execution || 0,
          status: mapStatus(p.status),
          subType: p.subType || p.sub_type || 'AutoPay',
          paidCycles: p.paidCycles || p.paid_cycles || 0,
          totalCycles: p.totalCycles || p.total_cycles || 0,
          prepaidBalance: (p.prepaidBalance || p.prepaid_balance || 0) / 10000000,
        }));
        
        setSubscriptions(mapped);
      } else {
        setSubscriptions([]);
      }
    } catch (err: any) {
      console.error('Error fetching subscriptions:', err);
      setError(err.message || 'Failed to fetch subscriptions');
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [address]);

  return { subscriptions, loading, error, refetch: fetchSubscriptions };
}

// Helper functions
function formatInterval(seconds: number): string {
  if (seconds >= 2592000) return 'Monthly';
  if (seconds >= 604800) return 'Weekly';
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)} days`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 60)} mins`;
}

function mapStatus(status: any): Subscription['status'] {
  if (typeof status === 'string') {
    const statusMap: Record<string, Subscription['status']> = {
      'ACTIVE': 'Active',
      'PAUSED': 'Paused',
      'FAILED': 'Failed',
      'CANCELLED': 'Cancelled',
      'COMPLETED': 'Completed',
    };
    return statusMap[status.toUpperCase()] || 'Active';
  }
  
  const numMap: Record<number, Subscription['status']> = {
    0: 'Active',
    1: 'Paused',
    2: 'Failed',
    3: 'Cancelled',
    4: 'Completed',
  };
  return numMap[status] || 'Active';
}
