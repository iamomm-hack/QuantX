/**
 * Database Layer
 * Lightweight execution tracking using lowdb (JSON file storage)
 */

const fs = require("fs");
const path = require("path");

// Database file path
const DB_PATH = path.join(__dirname, "data.json");

// Default database structure
const defaultData = {
  payments: [],
  executions: [],
  lastUpdated: null,
};

// In-memory database
let db = null;

/**
 * Initialize database
 */
function init() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      db = JSON.parse(data);
    } else {
      db = { ...defaultData };
      save();
    }
    console.log("[DB] Database initialized");
  } catch (error) {
    console.error("[DB] Error initializing database:", error.message);
    db = { ...defaultData };
  }
}

/**
 * Save database to file
 */
function save() {
  try {
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("[DB] Error saving database:", error.message);
  }
}

/**
 * Get all payments
 */
function getPayments() {
  ensureInit();
  return db.payments;
}

/**
 * Get active payments
 */
function getActivePayments() {
  ensureInit();
  return db.payments.filter((p) => p.status === "ACTIVE");
}

/**
 * Get payment count
 */
function getPaymentCount() {
  ensureInit();
  return db.payments.length;
}

/**
 * Get active payment count
 */
function getActivePaymentCount() {
  ensureInit();
  return db.payments.filter((p) => p.status === "ACTIVE").length;
}

/**
 * Add payment to tracking
 */
function addPayment(paymentId) {
  ensureInit();

  const existing = db.payments.find((p) => p.payment_id === paymentId);
  if (existing) {
    return existing;
  }

  const payment = {
    payment_id: paymentId,
    status: "ACTIVE",
    last_checked: null,
    failures: 0,
    last_execution_ledger: 0,
    created_at: new Date().toISOString(),
  };

  db.payments.push(payment);
  save();

  return payment;
}

/**
 * Remove payment from tracking
 */
function removePayment(paymentId) {
  ensureInit();

  const index = db.payments.findIndex((p) => p.payment_id === paymentId);
  if (index > -1) {
    db.payments.splice(index, 1);
    save();
    return true;
  }

  return false;
}

/**
 * Update payment status
 */
function updatePaymentStatus(paymentId, status) {
  ensureInit();

  const payment = db.payments.find((p) => p.payment_id === paymentId);
  if (payment) {
    payment.status = status;
    payment.last_checked = new Date().toISOString();
    save();
    return payment;
  }

  return null;
}

/**
 * Record execution attempt
 */
function recordExecution(paymentId, result) {
  ensureInit();

  const execution = {
    payment_id: paymentId,
    success: result.success,
    hash: result.hash || null,
    error: result.error || null,
    timestamp: new Date().toISOString(),
  };

  db.executions.push(execution);

  // Update payment record
  const payment = db.payments.find((p) => p.payment_id === paymentId);
  if (payment) {
    payment.last_checked = execution.timestamp;
    if (result.success) {
      payment.failures = 0;
    } else {
      payment.failures = (payment.failures || 0) + 1;
    }
  }

  // Keep only last 1000 executions
  if (db.executions.length > 1000) {
    db.executions = db.executions.slice(-1000);
  }

  save();

  return execution;
}

/**
 * Get execution history
 */
function getExecutionHistory(limit = 50, paymentId = null) {
  ensureInit();

  let executions = db.executions;

  if (paymentId) {
    executions = executions.filter((e) => e.payment_id === paymentId);
  }

  return executions.slice(-limit).reverse();
}

/**
 * Get execution stats for last 24 hours
 */
function getStats24h() {
  ensureInit();

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentExecutions = db.executions.filter((e) => e.timestamp > oneDayAgo);

  const total = recentExecutions.length;
  const successful = recentExecutions.filter((e) => e.success).length;
  const failed = total - successful;

  return {
    total_executions_24h: total,
    successful_24h: successful,
    failed_24h: failed,
    success_rate: total > 0 ? ((successful / total) * 100).toFixed(2) : 0,
  };
}

/**
 * Ensure database is initialized
 */
function ensureInit() {
  if (!db) {
    init();
  }
}

// Initialize on module load
init();

module.exports = {
  init,
  save,
  getPayments,
  getActivePayments,
  getPaymentCount,
  getActivePaymentCount,
  addPayment,
  removePayment,
  updatePaymentStatus,
  recordExecution,
  getExecutionHistory,
  getStats24h,
};
