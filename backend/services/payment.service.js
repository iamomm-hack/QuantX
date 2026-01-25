/**
 * Payment Service
 * Handles payment data retrieval from contract
 */

const sorobanService = require("./soroban.service");
const {
  stroopsToUsdc,
  getStatusLabel,
  formatInterval,
} = require("../utils/helpers");

// Status code mapping
const STATUS_MAP = {
  0: "ACTIVE",
  1: "PAUSED",
  2: "FAILED",
  3: "CANCELLED",
  4: "COMPLETED",
};

// Subscription type mapping
const SUB_TYPE_MAP = {
  0: "AutoPay",
  1: "Prepaid",
};

/**
 * Get single payment by ID
 */
async function getPayment(paymentId) {
  try {
    const id = sorobanService.toScVal(paymentId, "u64");
    const result = await sorobanService.callContractRead("get_payment", id);

    if (!result) {
      return null;
    }

    // console.log("Raw payment data from contract:", result);
    return formatPayment(result);
  } catch (error) {
    console.error(`Error fetching payment ${paymentId}:`, error.message);
    throw error;
  }
}

/**
 * Get payments by payer address
 */
async function getPaymentsByPayer(payerAddress, offset = 0, limit = 10) {
  try {
    const payer = sorobanService.addressToScVal(payerAddress);
    const offsetVal = sorobanService.toScVal(offset, "u32");
    const limitVal = sorobanService.toScVal(limit, "u32");

    const result = await sorobanService.callContractRead(
      "get_payments_by_payer",
      payer,
      offsetVal,
      limitVal,
    );

    if (!result || !Array.isArray(result)) {
      return [];
    }

    // console.log("Raw payments list from contract:", result);
    return result.map(formatPayment);
  } catch (error) {
    console.error(
      `Error fetching payments for ${payerAddress}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Check if payment can be executed
 */
async function canExecute(paymentId) {
  try {
    const id = sorobanService.toScVal(paymentId, "u64");
    const result = await sorobanService.callContractRead("can_execute", id);
    return result === true;
  } catch (error) {
    console.error(
      `Error checking can_execute for ${paymentId}:`,
      error.message,
    );
    return false;
  }
}

/**
 * Get contract statistics
 */
async function getContractStats() {
  try {
    const result = await sorobanService.callContractRead("get_stats");

    if (!result || !Array.isArray(result)) {
      return null;
    }

    const [totalPayments, totalExecutions, totalFailures, paused] = result;

    return {
      totalPayments: Number(totalPayments),
      totalExecutions: Number(totalExecutions),
      totalFailures: Number(totalFailures),
      paused: Boolean(paused),
    };
  } catch (error) {
    console.error("Error fetching contract stats:", error.message);
    return null;
  }
}

/**
 * Safely convert timestamp to ISO date
 */
function safeDate(timestamp) {
  try {
    const ts = Number(timestamp);
    if (!ts || isNaN(ts) || ts <= 0) return null;
    return new Date(ts * 1000).toISOString();
  } catch (e) {
    return null;
  }
}

/**
 * Format payment data for API response
 */
function formatPayment(payment) {
  if (!payment) return null;

  // Handle Soroban Enum variants (e.g. ['Active'])
  let statusStr = "UNKNOWN";
  let statusCode = payment.status;

  if (Array.isArray(payment.status) && payment.status.length > 0) {
    statusStr = payment.status[0].toUpperCase();
    statusCode = payment.status[0]; // Use the string value
  } else if (typeof payment.status === "string") {
    statusStr = payment.status.toUpperCase();
  } else {
    statusStr = STATUS_MAP[payment.status] || "UNKNOWN";
  }

  return {
    id: Number(payment.id),
    payer: payment.payer,
    recipient: payment.recipient,
    token: payment.token,
    amount: Number(payment.amount),
    amountFormatted: stroopsToUsdc(Number(payment.amount)),
    interval: Number(payment.interval),
    intervalFormatted: formatInterval(Number(payment.interval)),
    nextExecution: Number(payment.next_execution),
    nextExecutionDate: safeDate(payment.next_execution),
    lastExecutionLedger: Number(payment.last_execution_ledger),
    status: statusStr,
    statusCode: statusCode,
    retryCount: Number(payment.retry_count),
    createdAt: Number(payment.created_at),
    createdAtDate: safeDate(payment.created_at),
    subType: SUB_TYPE_MAP[payment.sub_type] || "Unknown",
    subTypeCode: payment.sub_type,
    totalCycles: Number(payment.total_cycles),
    paidCycles: Number(payment.paid_cycles),
    prepaidBalance: Number(payment.prepaid_balance),
    prepaidBalanceFormatted: stroopsToUsdc(Number(payment.prepaid_balance)),
  };
}

/**
 * Check if payment is due for execution
 */
function isPaymentDue(payment) {
  const now = Math.floor(Date.now() / 1000);
  return payment.status === "ACTIVE" && now >= payment.nextExecution;
}

module.exports = {
  getPayment,
  getPaymentsByPayer,
  canExecute,
  getContractStats,
  formatPayment,
  isPaymentDue,
  STATUS_MAP,
  SUB_TYPE_MAP,
};
