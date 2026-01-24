/**
 * Scheduler Job
 * Runs executor at fixed intervals
 */

const executorService = require("../services/executor.service");
const { env, isExecutorConfigured } = require("../config/env");

let intervalId = null;
let isActive = false;

/**
 * Start the scheduler
 */
function start() {
  if (isActive) {
    console.log("[Scheduler] Already running");
    return false;
  }

  if (!isExecutorConfigured()) {
    console.warn(
      "[Scheduler] Executor not configured. Set CONTRACT_ID and EXECUTOR_SECRET to enable.",
    );
    return false;
  }

  const intervalMs = env.EXECUTOR_INTERVAL_MS;

  console.log(`[Scheduler] Starting with interval: ${intervalMs}ms`);

  isActive = true;

  // Run immediately
  runExecutor();

  // Then run at intervals
  intervalId = setInterval(runExecutor, intervalMs);

  console.log("[Scheduler] Started successfully");
  return true;
}

/**
 * Stop the scheduler
 */
function stop() {
  if (!isActive) {
    console.log("[Scheduler] Not running");
    return false;
  }

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  isActive = false;
  console.log("[Scheduler] Stopped");
  return true;
}

/**
 * Run executor once
 */
async function runExecutor() {
  const startTime = Date.now();

  try {
    console.log(`[Scheduler] Triggering executor run...`);
    const result = await executorService.run();

    const duration = Date.now() - startTime;
    console.log(`[Scheduler] Executor run completed in ${duration}ms`);

    return result;
  } catch (error) {
    console.error("[Scheduler] Executor run failed:", error.message);
    return { error: error.message };
  }
}

/**
 * Get scheduler status
 */
function getStatus() {
  return {
    isActive,
    intervalMs: env.EXECUTOR_INTERVAL_MS,
    executorConfigured: isExecutorConfigured(),
  };
}

/**
 * Manual trigger (for API)
 */
async function trigger() {
  return await runExecutor();
}

module.exports = {
  start,
  stop,
  trigger,
  getStatus,
};
