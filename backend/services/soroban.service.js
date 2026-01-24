/**
 * Soroban Service
 * Single source of truth for all Stellar/Soroban interactions
 */

const {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
} = require("@stellar/stellar-sdk");

const { sorobanConfig } = require("../config/soroban");
const { getExecutorKeypair, signTransaction } = require("../utils/signer");

// Singleton server instance
let server = null;
let contract = null;

/**
 * Get Soroban RPC server instance
 */
function getServer() {
  if (!server) {
    server = new SorobanRpc.Server(sorobanConfig.rpcUrl);
  }
  return server;
}

/**
 * Get contract instance
 */
function getContract() {
  if (!contract) {
    if (!sorobanConfig.contractId) {
      throw new Error("CONTRACT_ID is not configured");
    }
    contract = new Contract(sorobanConfig.contractId);
  }
  return contract;
}

/**
 * Get network passphrase
 */
function getNetworkPassphrase() {
  return sorobanConfig.networkPassphrase;
}

/**
 * Build a transaction from contract operation
 */
async function buildTransaction(operation, sourcePublicKey) {
  const srv = getServer();
  const account = await srv.getAccount(sourcePublicKey);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(operation)
    .setTimeout(sorobanConfig.defaultTimeout)
    .build();

  return transaction;
}

/**
 * Simulate a transaction
 */
async function simulateTransaction(transaction) {
  const srv = getServer();
  const simResponse = await srv.simulateTransaction(transaction);

  return {
    success: !simResponse.error,
    response: simResponse,
    error: simResponse.error || null,
  };
}

/**
 * Prepare transaction (simulate + assemble)
 */
async function prepareTransaction(transaction) {
  const srv = getServer();
  return await srv.prepareTransaction(transaction);
}

/**
 * Sign and submit transaction
 */
async function signAndSubmit(transaction) {
  const srv = getServer();

  // Sign with executor keypair
  signTransaction(transaction);

  // Submit
  const response = await srv.sendTransaction(transaction);

  if (response.status === "PENDING") {
    // Poll for result
    const result = await pollTransactionStatus(response.hash);
    return {
      success: result.status === "SUCCESS",
      hash: response.hash,
      result,
    };
  }

  return {
    success: false,
    hash: response.hash,
    error: response.errorResult || "Transaction failed to submit",
  };
}

/**
 * Poll transaction status until complete
 */
async function pollTransactionStatus(hash) {
  const srv = getServer();

  for (let i = 0; i < sorobanConfig.maxPollAttempts; i++) {
    await sleep(sorobanConfig.pollIntervalMs);

    try {
      const response = await srv.getTransaction(hash);
      if (response.status !== "NOT_FOUND") {
        return response;
      }
    } catch (error) {
      console.error("Error polling transaction:", error.message);
    }
  }

  throw new Error("Transaction polling timeout");
}

/**
 * Call a read-only contract function
 */
async function callContractRead(functionName, ...args) {
  const srv = getServer();
  const contractInstance = getContract();
  const keypair = getExecutorKeypair();

  const operation = contractInstance.call(functionName, ...args);
  const transaction = await buildTransaction(operation, keypair.publicKey());

  const simResponse = await simulateTransaction(transaction);

  if (!simResponse.success) {
    throw new Error(
      `Contract read failed: ${JSON.stringify(simResponse.error)}`,
    );
  }

  // Parse result
  if (simResponse.response.result) {
    return parseScVal(simResponse.response.result.retval);
  }

  return null;
}

/**
 * Execute a contract function (write)
 */
async function callContractWrite(functionName, ...args) {
  const contractInstance = getContract();
  const keypair = getExecutorKeypair();

  const operation = contractInstance.call(functionName, ...args);
  const transaction = await buildTransaction(operation, keypair.publicKey());

  // Prepare (simulate + assemble)
  const preparedTx = await prepareTransaction(transaction);

  // Sign and submit
  return await signAndSubmit(preparedTx);
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
 * Create Address ScVal
 */
function addressToScVal(address) {
  return Address.fromString(address).toScVal();
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

  // Try to extract error code
  const codeMatch = errorStr.match(/Error\(Contract,\s*#(\d+)\)/);
  if (codeMatch) {
    return mapContractError(parseInt(codeMatch[1]));
  }

  return errorStr;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getServer,
  getContract,
  getNetworkPassphrase,
  buildTransaction,
  simulateTransaction,
  prepareTransaction,
  signAndSubmit,
  pollTransactionStatus,
  callContractRead,
  callContractWrite,
  parseScVal,
  toScVal,
  addressToScVal,
  mapContractError,
  parseTransactionError,
};
