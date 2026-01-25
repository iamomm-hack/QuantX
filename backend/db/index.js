/**
 * Database Layer
 * MongoDB implementation using Mongoose
 */

const mongoose = require("mongoose");

// Import models
const Payment = require("../models/Payment");
const Execution = require("../models/Execution");

let isConnected = false;

/**
 * Initialize database
 */
async function init() {
  if (isConnected) return;

  const mongoUri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quantx";

  try {
    console.log("[DB] Using Mongo URI:", mongoUri);

    await mongoose.connect(mongoUri, { family: 4 });

    isConnected = true;
    console.log("[DB] MongoDB Connected");
  } catch (error) {
    console.error("[DB] MongoDB connection error:", error.message);
    throw error;
  }
}

/**
 * Ensure DB initialized
 */
async function ensureInit() {
  if (!isConnected) {
    await init();
  }
}

/**
 * Get all payments
 */
async function getPayments() {
  await ensureInit();
  return Payment.find({}).lean();
}

/**
 * Get active payments (pending)
 */
async function getActivePayments() {
  await ensureInit();
  return Payment.find({ status: "pending" }).lean();
}

/**
 * Get payment count
 */
async function getPaymentCount() {
  await ensureInit();
  return Payment.countDocuments();
}

/**
 * Get active payment count
 */
async function getActivePaymentCount() {
  await ensureInit();
  return Payment.countDocuments({ status: "pending" });
}

/**
 * Add payment
 */
async function addPayment(paymentId) {
  await ensureInit();

  const existing = await Payment.findOne({ payment_id: paymentId });
  if (existing) return existing.toObject();

  const payment = new Payment({
    payment_id: paymentId,
    status: "pending",
    failures: 0,
    last_checked: new Date(),
  });

  await payment.save();
  return payment.toObject();
}

/**
 * Remove payment
 */
async function removePayment(paymentId) {
  await ensureInit();
  const result = await Payment.deleteOne({ payment_id: paymentId });
  return result.deletedCount > 0;
}

/**
 * Update payment status
 */
async function updatePaymentStatus(paymentId, status) {
  await ensureInit();

  const payment = await Payment.findOneAndUpdate(
    { payment_id: paymentId },
    { status, last_checked: new Date() },
    { new: true },
  );

  return payment ? payment.toObject() : null;
}

/**
 * Record execution
 */
async function recordExecution(paymentId, result) {
  await ensureInit();

  const execution = new Execution({
    payment_id: paymentId,
    success: result.success,
    hash: result.hash || null,
    error: result.error || null,
    timestamp: new Date(),
  });

  await execution.save();

  if (result.success) {
    await Payment.updateOne(
      { payment_id: paymentId },
      { $set: { failures: 0, last_checked: new Date() } },
    );
  } else {
    await Payment.updateOne(
      { payment_id: paymentId },
      { $inc: { failures: 1 }, $set: { last_checked: new Date() } },
    );
  }

  return execution.toObject();
}

/**
 * Execution history
 */
async function getExecutionHistory(limit = 50, paymentId = null) {
  await ensureInit();
  const query = paymentId ? { payment_id: paymentId } : {};
  return Execution.find(query).sort({ timestamp: -1 }).limit(limit).lean();
}

/**
 * Stats 24h
 */
async function getStats24h() {
  await ensureInit();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const executions = await Execution.find({
    timestamp: { $gt: since },
  }).lean();

  const total = executions.length;
  const success = executions.filter((e) => e.success).length;

  return {
    total_executions_24h: total,
    successful_24h: success,
    failed_24h: total - success,
    success_rate: total ? ((success / total) * 100).toFixed(2) : 0,
  };
}

module.exports = {
  init,
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
