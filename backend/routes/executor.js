const express = require("express");

const router = express.Router();

// Get executor stats
router.get("/stats", (req, res) => {
  res.json({
    success: true,
    stats: {
      total_executions_24h: 0,
      successful_24h: 0,
      failed_24h: 0,
      success_rate: 0,
      active_payments: 0,
      last_check: new Date().toISOString(),
    },
  });
});

// Get execution history
router.get("/history", (req, res) => {
  res.json({
    success: true,
    history: [],
    message: "History tracking coming soon",
  });
});

// Trigger manual execution
router.post("/trigger/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    res.json({
      success: false,
      message: "Executor not configured. Please set up the executor service.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
