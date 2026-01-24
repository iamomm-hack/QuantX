/**
 * Signer Utility
 * Manages executor wallet for transaction signing
 */

const { Keypair } = require("@stellar/stellar-sdk");
const { env } = require("../config/env");

let executorKeypair = null;

/**
 * Get or create executor keypair
 */
function getExecutorKeypair() {
  if (!executorKeypair) {
    if (!env.EXECUTOR_SECRET) {
      throw new Error("EXECUTOR_SECRET environment variable is not set");
    }
    executorKeypair = Keypair.fromSecret(env.EXECUTOR_SECRET);
  }
  return executorKeypair;
}

/**
 * Get executor public key
 */
function getExecutorPublicKey() {
  return getExecutorKeypair().publicKey();
}

/**
 * Sign a transaction
 */
function signTransaction(transaction) {
  const keypair = getExecutorKeypair();
  transaction.sign(keypair);
  return transaction;
}

/**
 * Check if executor is configured
 */
function isSignerConfigured() {
  return !!env.EXECUTOR_SECRET;
}

module.exports = {
  getExecutorKeypair,
  getExecutorPublicKey,
  signTransaction,
  isSignerConfigured,
};
