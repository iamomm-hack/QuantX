/**
 * Environment Configuration
 * Loads and validates all required environment variables
 */

const path = require("path");
const result = require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

if (result.error) {
  console.error("[Config] Error loading .env file:", result.error);
} else {
  console.log("[Config] Loaded .env from:", path.join(__dirname, "../.env"));
}

const env = {
  // Server
  PORT: parseInt(process.env.PORT) || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Stellar Network
  NETWORK: process.env.STELLAR_NETWORK || "TESTNET",
  RPC_URL:
    process.env.STELLAR_RPC_URL ||
    process.env.RPC_URL ||
    "https://soroban-testnet.stellar.org",
  NETWORK_PASSPHRASE:
    process.env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015",

  // Contract
  CONTRACT_ID: process.env.CONTRACT_ID,

  // Executor
  EXECUTOR_SECRET: process.env.EXECUTOR_SECRET,

  // Scheduler
  EXECUTOR_INTERVAL_MS: parseInt(process.env.EXECUTOR_INTERVAL_MS) || 30000, // 30 seconds

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};

/**
 * Validate required environment variables
 */
function validateEnv() {
  const required = ["CONTRACT_ID"];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missing.join(", ")}`,
    );
  }

  // Executor secret is required for execution but not for API
  if (!env.EXECUTOR_SECRET) {
    console.warn(
      "Warning: EXECUTOR_SECRET not set. Executor will not be able to submit transactions.",
    );
  }

  return missing.length === 0;
}

/**
 * Check if executor is configured
 */
function isExecutorConfigured() {
  return !!(env.CONTRACT_ID && env.EXECUTOR_SECRET);
}

module.exports = {
  env,
  validateEnv,
  isExecutorConfigured,
};
