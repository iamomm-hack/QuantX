const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import config, db, scheduler
const { env, validateEnv, isExecutorConfigured } = require("./config/env");
const db = require("./db");
const scheduler = require("./jobs/scheduler.job");

const app = express();
const PORT = env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Stellar configuration
const RPC_URL = env.RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = env.CONTRACT_ID;

// Validate environment
validateEnv();

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
    executorConfigured: isExecutorConfigured(),
    schedulerActive: scheduler.getStatus().isActive,
  });
});

// Import and use route modules
const paymentsRouter = require("./routes/payments");
const executorRouter = require("./routes/executor");

app.use("/api/payments", paymentsRouter);
app.use("/api/executor", executorRouter);

// Webhook endpoint
app.post("/api/webhook", (req, res) => {
  const { event, paymentId } = req.body;

  console.log(`Webhook received: ${event} for payment ${paymentId}`);

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
// START SERVER (DB → SERVER → SCHEDULER)
// ============================================

async function startServer() {
  try {
    // 1️⃣ Connect MongoDB
    await db.init();

    // 2️⃣ Start HTTP server
    app.listen(PORT, () => {
      console.log("========================================");
      console.log("   QuantX API Server Started");
      console.log("========================================");
      console.log(`Port: ${PORT}`);
      console.log(`RPC: ${RPC_URL}`);
      console.log(`Contract: ${CONTRACT_ID}`);
      console.log(`Executor Configured: ${isExecutorConfigured()}`);
      console.log("");
      console.log("Endpoints:");
      console.log("   GET  /health");
      console.log("   GET  /api/payments/user/:address");
      console.log("   GET  /api/payments/:id");
      console.log("   GET  /api/payments/:id/status");
      console.log("   GET  /api/payments/:id/history");
      console.log("   GET  /api/executor/stats");
      console.log("   GET  /api/executor/history");
      console.log("   GET  /api/executor/tracked");
      console.log("   POST /api/executor/trigger/:paymentId");
      console.log("   POST /api/executor/run");
      console.log("   POST /api/executor/scheduler/start");
      console.log("   GET  /api/executor/scheduler/status");
      console.log("   POST /api/webhook");
      console.log("========================================");

      // 3️⃣ Start scheduler only after DB + server
      if (isExecutorConfigured()) {
        console.log("[Server] Executor configured. Starting scheduler...");
        scheduler.start();
      } else {
        console.log(
          "[Server] Executor not configured. Scheduler not started.",
        );
      }
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
