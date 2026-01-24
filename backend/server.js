const express = require("express");
const cors = require("cors");
const {
  SorobanRpc,
  Contract,
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
} = require("@stellar/stellar-sdk");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Stellar configuration
const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID;
const server = new SorobanRpc.Server(RPC_URL);

// In-memory storage (replace with database in production)
const paymentCache = new Map();
const executionHistory = [];

// ============================================
// API ENDPOINTS
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

// Get all payments for a user
app.get("/api/payments/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { offset = 0, limit = 10 } = req.query;

    // Call contract to get payments
    const contract = new Contract(CONTRACT_ID);

    // Build read-only transaction
    const account = await server.getAccount(address);

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "get_payments_by_payer",
          Address.fromString(address),
          parseInt(offset),
          parseInt(limit),
        ),
      )
      .setTimeout(30)
      .build();

    // Simulate transaction to get result
    const simulated = await server.simulateTransaction(transaction);

    if (simulated.results && simulated.results.length > 0) {
      const payments = simulated.results[0].retval;

      res.json({
        success: true,
        payments: payments || [],
        offset: parseInt(offset),
        limit: parseInt(limit),
      });
    } else {
      res.json({
        success: true,
        payments: [],
        offset: parseInt(offset),
        limit: parseInt(limit),
      });
    }
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get single payment details
app.get("/api/payment/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const contract = new Contract(CONTRACT_ID);

    // For read-only calls, we need any valid account
    // In production, use a dedicated read account
    const keypair = Keypair.random();
    const account = await server.getAccount(keypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("get_payment", parseInt(id)))
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(transaction);

    if (simulated.results && simulated.results.length > 0) {
      const payment = simulated.results[0].retval;

      res.json({
        success: true,
        payment,
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Payment not found",
      });
    }
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get execution history
app.get("/api/executions", (req, res) => {
  const { limit = 50 } = req.query;

  res.json({
    success: true,
    executions: executionHistory.slice(-parseInt(limit)),
    total: executionHistory.length,
  });
});

// Get executor statistics
app.get("/api/stats", (req, res) => {
  const now = Date.now();
  const last24h = executionHistory.filter((e) => now - e.timestamp < 86400000);

  const successful = last24h.filter((e) => e.success).length;
  const failed = last24h.filter((e) => !e.success).length;

  res.json({
    success: true,
    stats: {
      total_executions_24h: last24h.length,
      successful_24h: successful,
      failed_24h: failed,
      success_rate:
        last24h.length > 0
          ? ((successful / last24h.length) * 100).toFixed(2)
          : 0,
      active_payments: paymentCache.size,
      last_check: new Date().toISOString(),
    },
  });
});

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

// Manual trigger endpoint (for testing)
app.post("/api/execute/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!process.env.EXECUTOR_SECRET) {
      return res.status(400).json({
        success: false,
        error: "Executor not configured",
      });
    }

    const executorKeypair = Keypair.fromSecret(process.env.EXECUTOR_SECRET);
    const contract = new Contract(CONTRACT_ID);

    const account = await server.getAccount(executorKeypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("execute_payment", parseInt(paymentId)))
      .setTimeout(30)
      .build();

    transaction.sign(executorKeypair);

    const response = await server.sendTransaction(transaction);

    if (response.status === "PENDING") {
      res.json({
        success: true,
        message: "Execution triggered",
        hash: response.hash,
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Transaction failed",
        response,
      });
    }
  } catch (error) {
    console.error("Error executing payment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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
  console.log(`   GET  /api/payments/:address`);
  console.log(`   GET  /api/payment/:id`);
  console.log(`   GET  /api/executions`);
  console.log(`   GET  /api/stats`);
  console.log(`   POST /api/execute/:paymentId`);
  console.log(`   POST /api/webhook\n`);
});

module.exports = app;
