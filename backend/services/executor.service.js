/**
 * Executor Service
 * Core billing engine for executing recurring payments
 */

const sorobanService = require("./soroban.service");
const paymentService = require("./payment.service");
const db = require("../db");
const { sorobanConfig } = require("../config/soroban");

// Execution state
let isRunning = false;
let lastRunTime = null;
let stats = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
  lastError: null,
};

/**
 * Main execution loop
 * Iterates through tracked payments and executes due ones
 */
async function run() {
  if (isRunning) {
    console.log("[Executor] Already running, skipping...");
    return { skipped: true, reason: "already_running" };
  }

  isRunning = true;
  lastRunTime = new Date();

  const results = {
    executed: [],
    failed: [],
    skipped: [],
    timestamp: lastRunTime.toISOString(),
  };

  try {
    console.log(
      `[Executor] Starting execution run at ${lastRunTime.toISOString()}`,
    );

    // Get tracked payments from local DB
    const trackedPayments = await db.getActivePayments();

    if (!trackedPayments || trackedPayments.length === 0) {
      console.log("[Executor] No active payments to process");
      return results;
    }

    console.log(
      `[Executor] Processing ${trackedPayments.length} tracked payments`,
    );

    for (const tracked of trackedPayments) {
      try {
        // Check if payment can be executed
        const canExec = await paymentService.canExecute(tracked.payment_id);

        if (!canExec) {
          results.skipped.push({
            paymentId: tracked.payment_id,
            reason: "not_due",
          });
          continue;
        }

        // Execute payment
        const execResult = await executePayment(tracked.payment_id);

        if (execResult.success) {
          results.executed.push({
            paymentId: tracked.payment_id,
            hash: execResult.hash,
          });

          // Update DB
          await db.recordExecution(tracked.payment_id, {
            success: true,
            hash: execResult.hash,
            timestamp: Date.now(),
          });

          stats.successfulExecutions++;
        } else {
          results.failed.push({
            paymentId: tracked.payment_id,
            error: execResult.error,
          });

          // Update DB with failure
          await db.recordExecution(tracked.payment_id, {
            success: false,
            error: execResult.error,
            timestamp: Date.now(),
          });

          stats.failedExecutions++;
        }

        stats.totalExecutions++;
      } catch (error) {
        console.error(
          `[Executor] Error processing payment ${tracked.payment_id}:`,
          error.message,
        );
        results.failed.push({
          paymentId: tracked.payment_id,
          error: error.message,
        });
        stats.lastError = error.message;
      }
    }

    console.log(
      `[Executor] Run complete: ${results.executed.length} executed, ${results.failed.length} failed, ${results.skipped.length} skipped`,
    );

    return results;
  } catch (error) {
    console.error("[Executor] Fatal error during run:", error.message);
    stats.lastError = error.message;
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Execute a single payment
 */
async function executePayment(paymentId) {
  console.log(`[Executor] Executing payment ${paymentId}...`);

  try {
    // const id = sorobanService.toScVal(paymentId, "u64");
    const result = await sorobanService.callContractWrite(
      "execute_payment",
      paymentId,
    );

    if (result.success) {
      console.log(
        `[Executor] Payment ${paymentId} executed successfully. Hash: ${result.hash}`,
      );
      return {
        success: true,
        hash: result.hash,
        paymentId,
      };
    } else {
      const errorMsg = sorobanService.parseTransactionError(result.error);
      console.error(
        `[Executor] Payment ${paymentId} execution failed: ${errorMsg}`,
      );
      return {
        success: false,
        error: errorMsg,
        paymentId,
      };
    }
  } catch (error) {
    const errorMsg = sorobanService.parseTransactionError(error);
    console.error(
      `[Executor] Payment ${paymentId} execution error: ${errorMsg}`,
    );
    return {
      success: false,
      error: errorMsg,
      paymentId,
    };
  }
}

/**
 * Get executor statistics
 */
async function getStats() {
  return {
    ...stats,
    isRunning,
    lastRunTime: lastRunTime ? lastRunTime.toISOString() : null,
    trackedPayments: await db.getPaymentCount(),
    activePayments: await db.getActivePaymentCount(),
  };
}

/**
 * Track a new payment for execution
 */
async function trackPayment(paymentId) {
  return await db.addPayment(paymentId);
}

/**
 * Stop tracking a payment
 */
async function untrackPayment(paymentId) {
  return await db.removePayment(paymentId);
}

/**
 * Update payment status in tracking
 */
async function updatePaymentStatus(paymentId, status) {
  return await db.updatePaymentStatus(paymentId, status);
}

/**
 * Reset executor stats (for testing)
 */
function resetStats() {
  stats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    lastError: null,
  };
}

module.exports = {
  run,
  executePayment,
  getStats,
  trackPayment,
  untrackPayment,
  updatePaymentStatus,
  resetStats,
};
