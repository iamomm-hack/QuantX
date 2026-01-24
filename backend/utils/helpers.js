// Format Stellar address for display
function formatAddress(address, startChars = 4, endChars = 4) {
  if (!address || address.length < startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// Convert stroops to USDC
function stroopsToUsdc(stroops) {
  return stroops / 10000000;
}

// Convert USDC to stroops
function usdcToStroops(usdc) {
  return Math.floor(usdc * 10000000);
}

// Format interval in human-readable format
function formatInterval(seconds) {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
}

// Format timestamp
function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

// Get payment status label
function getStatusLabel(statusCode) {
  const statusMap = {
    0: "ACTIVE",
    1: "PAUSED",
    2: "FAILED",
    3: "CANCELLED",
  };
  return statusMap[statusCode] || "UNKNOWN";
}

// Parse error code from contract
function parseContractError(error) {
  const errorMsg = error.message || error.toString();

  const errorMap = {
    1: "Unauthorized: You are not the payment creator",
    2: "Payment not yet due for execution",
    3: "Insufficient balance in payer account",
    4: "Insufficient allowance - please approve contract spending",
    5: "Payment is not active (paused, failed, or cancelled)",
    6: "Payment already executed in this ledger",
    7: "Invalid interval: must be at least 60 seconds",
    8: "Invalid amount: must be greater than 0",
  };

  // Try to extract error code
  const match = errorMsg.match(/ERR_\w+|Error\s+(\d+)/i);
  if (match) {
    const code =
      parseInt(match[1]) ||
      Object.keys(errorMap).find((key) => errorMsg.includes(`ERR_${key}`));
    return errorMap[code] || errorMsg;
  }

  return errorMsg;
}

// Validate Stellar address
function isValidStellarAddress(address) {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Stellar addresses start with G and are 56 characters long
  return /^G[A-Z2-7]{55}$/.test(address);
}

// Calculate next execution time
function calculateNextExecution(lastExecution, interval) {
  return lastExecution + interval;
}

// Check if payment is due
function isPaymentDue(nextExecution) {
  const now = Math.floor(Date.now() / 1000);
  return now >= nextExecution;
}

module.exports = {
  formatAddress,
  stroopsToUsdc,
  usdcToStroops,
  formatInterval,
  formatTimestamp,
  getStatusLabel,
  parseContractError,
  isValidStellarAddress,
  calculateNextExecution,
  isPaymentDue,
};
