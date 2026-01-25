/**
 * QuantX SDK Types
 */

export type Network = "TESTNET" | "MAINNET";

export interface QuantXConfig {
  /**
   * Network to connect to (TESTNET or MAINNET)
   */
  network: Network;
  /**
   * Contract ID of the deployed QuantX contract
   */
  contractId: string;
  /**
   * RPC URL (optional, defaults to public endpoints)
   */
  rpcUrl?: string;
  /**
   * Wallet configuration
   */
  wallet?: {
    secretKey?: string;
    publicKey?: string;
    signTransaction?: (xdr: string) => Promise<string>;
  };
}

export interface SubscriptionParams {
  /**
   * Address of the recipient (merchant/service provider)
   */
  recipient: string;
  /**
   * Token address (USDC/Stellar Asset Contract ID)
   */
  token: string;
  /**
   * Amount per payment cycle (in human readable units, e.g., "10.5")
   */
  amount: string;
  /**
   * Interval in seconds between payments
   */
  interval: number;
  /**
   * Type of subscription (0 = AutoPay, 1 = Prepaid)
   * Default: 0
   */
  subType?: number;
  /**
   * Start delay in seconds
   */
  startDelay?: number;
  /**
   * Number of cycles (0 = unlimited)
   */
  cycles?: number;
  /**
   * Initial deposit for prepaid subscriptions (human readable)
   */
  deposit?: string;
}

export interface PaymentData {
  id: number;
  payer: string;
  recipient: string;
  token: string;
  amount: number; // Raw integer from contract
  amountFormatted: string; // Human readable
  interval: number;
  nextExecution: number;
  status: string;
  balance?: number; // For prepaid
}

export interface TransactionResult {
  status: "SUCCESS" | "FAILED";
  hash: string;
  returnValue?: any; 
  error?: string;
}
