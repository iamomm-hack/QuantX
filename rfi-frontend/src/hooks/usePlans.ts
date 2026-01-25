import { useState, useEffect } from 'react';
import {
  Contract,
  rpc as SorobanRpc,
  nativeToScVal,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || '';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://soroban-testnet.stellar.org';

export interface Plan {
  id: number;
  token: string;
  amount: bigint;
  interval: number;
  active: boolean;
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async (planId: number): Promise<Plan | null> => {
    try {
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ID);

      const result = await server.simulateTransaction(
        new TransactionBuilder(
          await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
          { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
        )
          .addOperation(
            contract.call('get_plan', nativeToScVal(planId, { type: 'u32' }))
          )
          .setTimeout(30)
          .build()
      );

      if (SorobanRpc.Api.isSimulationSuccess(result)) {
        const planData = result.result?.retval;
        if (planData) {
          // Parse the plan data from ScVal
          return {
            id: planId,
            token: '', // Extract from planData
            amount: BigInt(0), // Extract from planData
            interval: 0, // Extract from planData
            active: true,
          };
        }
      }
      return null;
    } catch (err) {
      console.error(`Error fetching plan ${planId}:`, err);
      return null;
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch plans 1-10 (adjust range as needed)
      const planPromises = Array.from({ length: 10 }, (_, i) => fetchPlan(i + 1));
      const results = await Promise.all(planPromises);
      const validPlans = results.filter((p): p is Plan => p !== null && p.active);
      
      setPlans(validPlans);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return { plans, loading, error, refetch: fetchPlans };
}
