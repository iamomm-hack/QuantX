const express = require("express");
const PaymentExecutor = require("../executor/executor");

const router = express.Router();
let executorInstance = null;

// Initialize executor
function initExecutor() {
  if (!executorInstance) {
    executorInstance = new PaymentExecutor();
    executorInstance.start();
  }
  return executorInstance;
}

// Get executor stats
router.get("/stats", (req, res) => {
  const executor = initExecutor();
  const stats = executor.getStats();

  res.json({
    success: true,
    stats,
  });
});

// Get execution history
router.get("/history", (req, res) => {
  // In production, fetch from database
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
    const executor = initExecutor();

    const result = await executor.executePayment({ id: parseInt(paymentId) });

    res.json({
      success: result,
      message: result
        ? "Payment executed successfully"
        : "Payment execution failed",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
