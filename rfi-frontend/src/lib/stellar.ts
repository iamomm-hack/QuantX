/**
 * Stellar SDK Wrapper with Dynamic Import
 * Fixed for Stellar SDK v14 browser compatibility
 */

let stellarSDK: any = null;

export async function getStellarSDK() {
  if (!stellarSDK) {
    const module = await import("@stellar/stellar-sdk");
    stellarSDK = module.default || module;
    
    console.log("Stellar SDK loaded:", {
      hasContract: !!stellarSDK.Contract,
      hasRpc: !!stellarSDK.rpc,
      hasSorobanRpc: !!stellarSDK.SorobanRpc,
    });
  }
  return stellarSDK;
}

export async function createSorobanServer(rpcUrl: string) {
  const sdk = await getStellarSDK();
  
  // SDK v14 uses rpc.Server
  let Server = null;
  
  if (sdk.rpc && sdk.rpc.Server) {
    Server = sdk.rpc.Server;
  } else if (sdk.SorobanRpc && sdk.SorobanRpc.Server) {
    Server = sdk.SorobanRpc.Server;
  } else if (sdk.Rpc && sdk.Rpc.Server) {
    Server = sdk.Rpc.Server;
  } else if (sdk.Server) {
    Server = sdk.Server;
  }
  
  if (!Server) {
    // Last resort - check all keys
    const keys = Object.keys(sdk);
    console.error("Available SDK keys:", keys);
    throw new Error("RPC Server not found in SDK");
  }
  
  return new Server(rpcUrl);
}

export async function createContract(contractId: string) {
  const sdk = await getStellarSDK();
  return new sdk.Contract(contractId);
}

export async function getNetworks() {
  const sdk = await getStellarSDK();
  return sdk.Networks;
}

export async function getBaseFee() {
  const sdk = await getStellarSDK();
  return sdk.BASE_FEE;
}

export async function createAddress(addressString: string) {
  const sdk = await getStellarSDK();
  return sdk.Address.fromString(addressString);
}

export async function createTransactionBuilder(account: any, options: any) {
  const sdk = await getStellarSDK();
  return new sdk.TransactionBuilder(account, options);
}

export async function nativeToScVal(value: any, options?: any) {
  const sdk = await getStellarSDK();
  return sdk.nativeToScVal(value, options);
}

export async function parseTransactionFromXDR(xdr: string, networkPassphrase: string) {
  const sdk = await getStellarSDK();
  return sdk.TransactionBuilder.fromXDR(xdr, networkPassphrase);
}

// Prepare transaction using server's built-in method
export async function prepareTransaction(server: any, transaction: any) {
  try {
    // Method 1: Use server.prepareTransaction (recommended in SDK v14)
    if (typeof server.prepareTransaction === 'function') {
      console.log("Using server.prepareTransaction...");
      const prepared = await server.prepareTransaction(transaction);
      return prepared;
    }
    
    // Method 2: Manual simulation + assembly
    console.log("Server.prepareTransaction not found, using manual approach...");
    
    const simResponse = await server.simulateTransaction(transaction);
    console.log("Simulation result:", simResponse.error ? "FAILED" : "SUCCESS");
    
    if (simResponse.error) {
      throw new Error(`Simulation failed: ${simResponse.error}`);
    }
    
    if (simResponse.restorePreamble) {
      throw new Error("Transaction requires state restoration");
    }
    
    // Find assembleTransaction function
    const sdk = await getStellarSDK();
    
    // Try different locations for assembleTransaction
    let assembleFn = sdk.assembleTransaction 
      || sdk.rpc?.assembleTransaction 
      || sdk.SorobanRpc?.assembleTransaction
      || sdk.Rpc?.assembleTransaction;
    
    if (assembleFn) {
      console.log("Using assembleTransaction function");
      const assembled = assembleFn(transaction, simResponse);
      return assembled.build();
    }
    
    // Method 3: Build manually using simulation data
    console.log("Assembling manually from simulation data...");
    
    const { transactionData, minResourceFee } = simResponse;
    
    if (!transactionData) {
      throw new Error("No transaction data in simulation response");
    }
    
    // Get the original source account info
    const source = transaction.source;
    const originalFee = parseInt(transaction.fee || "100");
    const newFee = originalFee + parseInt(minResourceFee || "0");
    
    // Rebuild transaction with soroban data
    const operations = transaction.operations;
    if (!operations || operations.length === 0) {
      throw new Error("No operations in transaction");
    }
    
    const builder = new sdk.TransactionBuilder(source, {
      fee: newFee.toString(),
      networkPassphrase: transaction.networkPassphrase,
    });
    
    // Add the operation with updated auth
    const op = operations[0];
    if (simResponse.result && simResponse.result.auth) {
      op.auth = simResponse.result.auth;
    }
    
    builder.addOperation(op);
    builder.setSorobanData(transactionData);
    builder.setTimeout(30);
    
    return builder.build();
    
  } catch (error: any) {
    console.error("PrepareTransaction error:", error);
    throw error;
  }
}
