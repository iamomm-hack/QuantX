/**
 * Soroban Service
 * Single source of truth for all Stellar/Soroban interactions
 * Refactored to use QuantX SDK
 */

const { QuantXClient } = require("quantx-sdk");
const {
  rpc: SorobanRpc,
  nativeToScVal,
  scValToNative,
  Address,
  Networks,
} = require("@stellar/stellar-sdk");

const { sorobanConfig } = require("../config/soroban");
const { getExecutorKeypair } = require("../utils/signer");

// Singleton client instance
let client = null;

/**
 * Get QuantX Client instance
 */
function getClient() {
  if (!client) {
    const keypair = getExecutorKeypair();
    const network =
      sorobanConfig.networkPassphrase === Networks.PUBLIC
        ? "MAINNET"
        : "TESTNET";

    client = new QuantXClient({
      network,
      rpcUrl: sorobanConfig.rpcUrl,
      contractId: sorobanConfig.contractId,
      secretKey: keypair.secret(),
    });
  }
  return client;
}

/**
 * Parse ScVal to native JavaScript value
 */
function parseScVal(scVal) {
  try {
    return scValToNative(scVal);
  } catch (error) {
    console.error("Error parsing ScVal:", error);
    return null;
  }
}

/**
 * Convert native value to ScVal
 */
function toScVal(value, type) {
  return nativeToScVal(value, { type });
}

/**
 * Execute a contract function (write)
 * Adapts to SDK execution
 */
async function callContractWrite(functionName, ...args) {
  const c = getClient();

  // Specific optimization for execute_payment to use the new typed method
  if (functionName === "execute_payment" && args.length > 0) {
    // args[0] might be ScVal or native.
    // Executor passes ScVal (u64).
    // SDK executePayment expects native number/string/bigint.
    // We need to unwrap strictly if it's ScVal, or handle if it's already native?
    // Executor service does: const id = sorobanService.toScVal(paymentId, "u64");
    // We should change Executor to NOT convert, OR unwrap here.
    // Unwrapping ScVal is annoying.

    // BETTER: Use client.invoke directly if we have raw ScVals?
    // But client.invoke expects to be able to call contract.call.
    // If args are ScVals, client.invoke should work IF client.ts is compliant (we fixed executePayment to wrap, but invoke just passes through).
    // If we pass ScVals to invoke, and invoke passes to contract.call, it SHOULD work if we didn't wrap twice.

    // HOWEVER, client.executePayment wraps with nativeToScVal.
    // So if we call client.executePayment, we must pass NATIVE ID.

    try {
      // Parse the ID back to native if it's an ScVal
      let id = args[0];
      if (typeof id === "object" && id._switch) {
        // Simple ScVal check or try parse
        id = scValToNative(id);
      }

      return await c.executePayment(id);
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Fallback for other methods not explicitly typed in SDK or if we prefer raw invoke
  // But `invoke` is private in `client.ts`!
  // We cannot call `client.invoke`.
  // We must expose `invoke` or `call` on the client, or stick to methods.

  return { success: false, error: "Method not supported via SDK yet" };
}

/**
 * Map contract error codes to messages
 */
function mapContractError(errorCode) {
  const errorMap = {
    1: "Not authorized",
    2: "Payment not due",
    3: "Insufficient balance",
    4: "Insufficient allowance",
    5: "Payment inactive",
    6: "Already executed in this ledger",
    7: "Invalid interval",
    8: "Invalid amount",
    9: "Payment not found",
    10: "Invalid total cycles",
    11: "Cannot resume cancelled payment",
    12: "Cannot resume completed payment",
    13: "Already cancelled",
    14: "Refund failed",
    15: "Contract is paused",
    16: "Not admin",
    17: "Invalid token",
    18: "Rate limited",
    19: "Batch too large",
  };

  return errorMap[errorCode] || `Unknown error (${errorCode})`;
}

/**
 * Parse transaction error
 */
function parseTransactionError(error) {
  const errorStr = error.message || error.toString();
  const codeMatch = errorStr.match(/Error\(Contract,\s*#(\d+)\)/);
  if (codeMatch) {
    return mapContractError(parseInt(codeMatch[1]));
  }
  return errorStr;
}

module.exports = {
  getClient,
  callContractWrite,
  parseScVal,
  toScVal,
  parseTransactionError,
};
