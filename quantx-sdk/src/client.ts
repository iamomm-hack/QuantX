import {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  Account,
  nativeToScVal,
  Address,
  TimeoutInfinite,
  xdr,
  Horizon,
} from "@stellar/stellar-sdk";
import { QuantXConfig, SubscriptionParams, PaymentData, TransactionResult } from "./types";
import { toContractAmount, fromContractAmount, parseScVal } from "./utils";

export class QuantXClient {
  private server: SorobanRpc.Server;
  private horizon: Horizon.Server;
  private config: QuantXConfig;
  private networkPassphrase: string;

  constructor(config: QuantXConfig) {
    this.config = config;
    const defaultRpc =
      config.network === "MAINNET"
        ? "https://soroban-rpc.mainnet.stellar.org"
        : "https://soroban-testnet.stellar.org";
    
    // Horizon Fallback URL
    const horizonUrl = 
      config.network === "MAINNET"
        ? "https://horizon.stellar.org"
        : "https://horizon-testnet.stellar.org";

    this.server = new SorobanRpc.Server(config.rpcUrl || defaultRpc);
    this.horizon = new Horizon.Server(horizonUrl);
    this.networkPassphrase =
      config.network === "MAINNET" ? Networks.PUBLIC : Networks.TESTNET;
  }

  /**
   * Helper: Get Account
   */
  private async getAccount() {
    let publicKey = this.config.wallet?.publicKey;

    if (!publicKey && this.config.wallet?.secretKey) {
      try {
        const kp = Keypair.fromSecret(this.config.wallet.secretKey);
        publicKey = kp.publicKey();
      } catch (e) {
        throw new Error("Invalid Secret Key format in configuration");
      }
    }

    if (!publicKey) {
      throw new Error("Public Key (Browser) or Secret Key (Node) required for transaction build.");
    }

    return this.server.getAccount(publicKey);
  }

  /**
   * Helper: Sign and Submit
   */
  private async signAndSubmit(tx: any): Promise<TransactionResult> {
    if (this.config.wallet?.secretKey) {
      const kp = Keypair.fromSecret(this.config.wallet.secretKey);
      tx.sign(kp);
    } else if (this.config.wallet?.signTransaction) {
      const signedXdr = await this.config.wallet.signTransaction(tx.toXDR());
      tx = TransactionBuilder.fromXDR(signedXdr, this.server.serverURL.toString());
    } else {
      throw new Error("No signing method provided");
    }

    const res = await this.server.sendTransaction(tx);
    
    // LOG THE HASH!
    if (res.hash) {
        console.log(`  -> Tx Hash: ${res.hash} (Waiting for confirmation...)`);
    }

    if (res.status !== "PENDING") {
       if (res.status === "ERROR") {
          throw new Error(`Submission Error: ${JSON.stringify(res.errorResult)}`);
       }
    }

    return this.poll(res.hash);
  }

  /**
   * Poll transaction status (Soroban RPC + Horizon Fallback)
   */
  private async poll(hash: string): Promise<TransactionResult> {
    const maxRetries = 120; // 120 * 1s = 120s
    console.log(`[SDK] Polling transaction ${hash}`);

    for(let i=0; i<maxRetries; i++) {
       await new Promise(r => setTimeout(r, 1000)); // Check every 1s
       
       // 1. Try Soroban RPC
       try {
         const tx = await this.server.getTransaction(hash);
         console.log(`[SDK] Soroban Poll ${i}/${maxRetries}: ${tx.status}`);
         
         if (tx.status === "SUCCESS") {
             return { status: "SUCCESS", hash, returnValue: tx.resultMetaXdr }; 
         }
         if (tx.status === "FAILED") {
             return { status: "FAILED", hash, error: `Transaction failed (Soroban): ${JSON.stringify(tx.resultXdr)}` };
         }
       } catch (e: any) {
         // Soroban RPC might 404/Error if not indexed yet
       }

       // 2. Fallback: Try Horizon (Often faster/more reliable for existence)
       if (i % 2 === 0) { // Check Horizon every 2nd second to save rate limits
           try {
               const hzTx = await this.horizon.transactions().transaction(hash).call();
               if (hzTx.successful) {
                   console.log(`[SDK] Found via Horizon! (Success)`);
                   // Horizon doesn't easily give resultMetaXdr in the response, 
                   // but for payments/subscriptions we just need confirmation.
                   return { status: "SUCCESS", hash };
               } else {
                    return { status: "FAILED", hash, error: "Transaction failed (Horizon)" };
               }
           } catch(e) { /* Horizon 404 */ }
       }
    }
    
    console.warn(`[SDK] Transaction confirmation timed out for ${hash}`);
    return { status: "SUCCESS", hash, error: "Confirmation Timed Out (Check Explorer)" };
  }

  /**
   * 1. Create a new subscription
   */
  async subscribe(params: SubscriptionParams): Promise<TransactionResult> {
    const source = await this.getAccount();
    const sourceId = source.accountId();
    
    const isPrepaid = params.subType === 1 || (params.cycles && params.cycles > 0);
    const typeSymbol = isPrepaid ? "Prepaid" : "AutoPay";

    const args = [
      new Address(sourceId).toScVal(),                 
      new Address(params.recipient).toScVal(),         
      new Address(params.token).toScVal(),             
      nativeToScVal(BigInt(toContractAmount(params.amount)), { type: "i128" }), 
      nativeToScVal(params.interval, { type: "u64" }), 
      nativeToScVal(params.cycles || 0, { type: "u64" }), 
      nativeToScVal(typeSymbol, { type: "symbol" }), 
    ];

    return this.invoke("create_payment", args, source);
  }

  /**
   * 2. Approve token allowance
   */
  async approveAllowance(tokenAddress: string, amount?: string): Promise<TransactionResult> {
    const originalContractId = this.config.contractId;
    const tokenContract = new Contract(tokenAddress);
    
    const source = await this.getAccount();
    const sourceId = source.accountId();

    const allowance = amount 
      ? BigInt(toContractAmount(amount))
      : BigInt("9999999999999999999"); 

    const args = [
       nativeToScVal(sourceId, { type: 'address' }),          
       nativeToScVal(originalContractId, { type: 'address' }), 
       nativeToScVal(allowance, { type: "i128" }),            
       nativeToScVal(3110400, { type: "u32" })                
    ];

    const tx = new TransactionBuilder(source, {
      fee: "10000",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(tokenContract.call("approve", ...args))
      .setTimeout(TimeoutInfinite)
      .build();

    // FIX: Use prepareTransaction instead of simulateTransaction
    const preparedTx = await this.server.prepareTransaction(tx);

    return this.signAndSubmit(preparedTx);
  }

  /**
   * 3. Cancel Subscription
   */
  async cancel(id: number | string): Promise<TransactionResult> {
    const source = await this.getAccount();
    const args = [nativeToScVal(BigInt(id), { type: "u64" })];
    return this.invoke("cancel_payment", args, source);
  }

  /**
   * 4. Get Subscription Details
   */
  async getSubscription(id: number | string): Promise<PaymentData | null> {
    const args = [nativeToScVal(BigInt(id), { type: "u64" })];
    const result = await this.read("get_payment", args);
    
    if (!result) return null;

    return {
      id: Number(result.id),
      payer: result.payer.toString(),
      recipient: result.recipient.toString(),
      token: result.token.toString(),
      amount: Number(result.amount),
      amountFormatted: fromContractAmount(result.amount),
      interval: Number(result.interval),
      nextExecution: Number(result.next_execution),
      status: result.status.toString(),
    };
  }

  // --- Internal Helpers ---

  private async invoke(method: string, args: xdr.ScVal[], source: Account): Promise<TransactionResult> {
    const contract = new Contract(this.config.contractId);
    
    const tx = new TransactionBuilder(source, {
      fee: "10000",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(TimeoutInfinite)
      .build();

    // FIX: Use prepareTransaction to add resource data (SorobanTransactionData)
    const preparedTx = await this.server.prepareTransaction(tx);

    return this.signAndSubmit(preparedTx);
  }

  private async read(method: string, args: xdr.ScVal[]): Promise<any> {
    const contract = new Contract(this.config.contractId);
    const dummyKey = Keypair.random();
    const source = new Account(dummyKey.publicKey(), "0");

    const tx = new TransactionBuilder(source, {
        fee: "10000",
        networkPassphrase: this.networkPassphrase,
    })
    .addOperation(contract.call(method, ...args))
    .setTimeout(TimeoutInfinite)
    .build();

    const sim = await this.server.simulateTransaction(tx);
    
    if (SorobanRpc.Api.isSimulationError(sim)) {
        throw new Error(`Read Failed (${method}): ${sim.error}`);
    }

    if(sim.result && sim.result.retval) {
        return parseScVal(sim.result.retval);
    }
    return null;
  }
}