const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Stellar configuration
const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID;

// In-memory storage (replace with database in production)
const paymentCache = new Map();
const executionHistory = [];

// ============================================
// API ROUTES
// ============================================

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    contractId: CONTRACT_ID,
    rpcUrl: RPC_URL,
  });
});

// Import and use route modules
const paymentsRouter = require("./routes/payments");
const executorRouter = require("./routes/executor");

app.use("/api/payments", paymentsRouter);
app.use("/api/executor", executorRouter);

// Webhook endpoint for notifications (optional)
app.post("/api/webhook", (req, res) => {
  const { event, paymentId, data } = req.body;

  console.log(`📬 Webhook received: ${event} for payment ${paymentId}`);

  // In production, send notifications (email, SMS, etc.)
  // For now, just log

  res.json({
    success: true,
    message: "Webhook received",
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log("🚀 QuantX API Server started");
  console.log(`📡 Listening on port ${PORT}`);
  console.log(`🔗 RPC: ${RPC_URL}`);
  console.log(`📝 Contract: ${CONTRACT_ID}`);
  console.log(`\n📚 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/payments/user/:address`);
  console.log(`   GET  /api/payments/:id`);
  console.log(`   GET  /api/payments/:id/status`);
  console.log(`   GET  /api/payments/:id/history`);
  console.log(`   GET  /api/executor/stats`);
  console.log(`   GET  /api/executor/history`);
  console.log(`   POST /api/executor/trigger/:paymentId`);
  console.log(`   POST /api/webhook\n`);
});

module.exports = app;
