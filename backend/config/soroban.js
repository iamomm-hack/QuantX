/**
 * Soroban Configuration
 * Network and contract configuration
 */

const { env } = require("./env");

const networks = {
  TESTNET: {
    rpcUrl: "https://soroban-testnet.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
    explorerUrl: "https://stellar.expert/explorer/testnet",
  },
  MAINNET: {
    rpcUrl: "https://soroban-rpc.mainnet.stellar.gateway.fm",
    passphrase: "Public Global Stellar Network ; September 2015",
    explorerUrl: "https://stellar.expert/explorer/public",
  },
};

const currentNetwork = networks[env.NETWORK] || networks.TESTNET;

const sorobanConfig = {
  // Network
  network: env.NETWORK,
  rpcUrl: env.RPC_URL || currentNetwork.rpcUrl,
  networkPassphrase: env.NETWORK_PASSPHRASE || currentNetwork.passphrase,
  explorerUrl: currentNetwork.explorerUrl,

  // Contract
  contractId: env.CONTRACT_ID,

  // Transaction defaults
  defaultFee: "100",
  defaultTimeout: 30,

  // Retry configuration
  maxRetries: 3,
  retryDelayMs: 2000,

  // Polling configuration
  pollIntervalMs: 1000,
  maxPollAttempts: 30,
};

/**
 * Get explorer URL for transaction
 */
function getTransactionUrl(hash) {
  return `${sorobanConfig.explorerUrl}/tx/${hash}`;
}

/**
 * Get explorer URL for contract
 */
function getContractUrl(contractId) {
  return `${sorobanConfig.explorerUrl}/contract/${contractId || sorobanConfig.contractId}`;
}

module.exports = {
  sorobanConfig,
  networks,
  getTransactionUrl,
  getContractUrl,
};
