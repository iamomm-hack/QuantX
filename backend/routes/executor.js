const express = require("express");
const executorService = require("../services/executor.service");
const paymentService = require("../services/payment.service");
const scheduler = require("../jobs/scheduler.job");
const db = require("../db");

const router = express.Router();

// Get executor stats
router.get("/stats", async (req, res) => {
  try {
    // Get executor service stats
    const serviceStats = executorService.getStats();

    // Get 24h execution stats from DB
    const dbStats = db.getStats24h();

    // Get contract stats
    let contractStats = null;
    try {
      contractStats = await paymentService.getContractStats();
    } catch (e) {
      console.error("Could not fetch contract stats:", e.message);
    }

    // Get scheduler status
    const schedulerStatus = scheduler.getStatus();

    res.json({
      success: true,
      stats: {
        ...dbStats,
        active_payments: serviceStats.activePayments,
        tracked_payments: serviceStats.trackedPayments,
        last_run: serviceStats.lastRunTime,
        is_running: serviceStats.isRunning,
        scheduler_active: schedulerStatus.isActive,
        contract_stats: contractStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get execution history
router.get("/history", (req, res) => {
  try {
    const { limit = 50, payment_id } = req.query;

    const paymentId = payment_id ? parseInt(payment_id) : null;
    const history = db.getExecutionHistory(parseInt(limit), paymentId);

    res.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get tracked payments
router.get("/tracked", (req, res) => {
  try {
    const payments = db.getPayments();

    res.json({
      success: true,
      payments,
      count: payments.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Track a payment for execution
router.post("/track/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;

    const tracked = executorService.trackPayment(parseInt(paymentId));

    res.json({
      success: true,
      message: `Payment ${paymentId} is now being tracked`,
      payment: tracked,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Untrack a payment
router.delete("/track/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;

    const removed = executorService.untrackPayment(parseInt(paymentId));

    res.json({
      success: removed,
      message: removed
        ? `Payment ${paymentId} is no longer being tracked`
        : `Payment ${paymentId} was not being tracked`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Trigger manual execution of a specific payment
router.post("/trigger/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Check if payment can be executed
    const canExec = await paymentService.canExecute(parseInt(paymentId));

    if (!canExec) {
      return res.json({
        success: false,
        message: "Payment is not due for execution",
        paymentId: parseInt(paymentId),
      });
    }

    // Execute the payment
    const result = await executorService.executePayment(parseInt(paymentId));

    res.json({
      success: result.success,
      message: result.success
        ? `Payment ${paymentId} executed successfully`
        : `Payment ${paymentId} execution failed: ${result.error}`,
      hash: result.hash || null,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Trigger full executor run
router.post("/run", async (req, res) => {
  try {
    const result = await scheduler.trigger();

    res.json({
      success: true,
      message: "Executor run completed",
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start scheduler
router.post("/scheduler/start", (req, res) => {
  try {
    const started = scheduler.start();

    res.json({
      success: started,
      message: started
        ? "Scheduler started"
        : "Scheduler already running or not configured",
      status: scheduler.getStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Stop scheduler
router.post("/scheduler/stop", (req, res) => {
  try {
    const stopped = scheduler.stop();

    res.json({
      success: stopped,
      message: stopped ? "Scheduler stopped" : "Scheduler was not running",
      status: scheduler.getStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get scheduler status
router.get("/scheduler/status", (req, res) => {
  res.json({
    success: true,
    status: scheduler.getStatus(),
  });
});

module.exports = router;
