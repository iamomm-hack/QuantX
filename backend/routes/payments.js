const express = require("express");
const {
  SorobanRpc,
  Contract,
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
} = require("@stellar/stellar-sdk");

// Import services
const paymentService = require("../services/payment.service");
const executorService = require("../services/executor.service");

const router = express.Router();
const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID;
const server = new SorobanRpc.Server(RPC_URL);

// Get all payments for a user
router.get("/user/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { offset = 0, limit = 10 } = req.query;

    console.log(
      `[Payments] Fetching payments for ${address} (offset: ${offset}, limit: ${limit})`,
    );
    console.log(`[Payments] Using Contract ID: ${CONTRACT_ID}`);

    // Try to get real data from contract
    let payments;
    try {
      payments = await paymentService.getPaymentsByPayer(
        address,
        parseInt(offset),
        parseInt(limit),
      );
      console.log(
        `[Payments] Contract returned ${payments?.length || 0} payments:`,
        payments,
      );
    } catch (contractError) {
      console.error("[Payments] Contract call failed:", contractError.message);
      // Fallback to empty array if contract call fails
      payments = [];
    }

    // Track payments for executor (auto-track on query)
    payments.forEach((p) => {
      if (p.status === "ACTIVE") {
        executorService.trackPayment(p.id);
      }
    });

    res.json({
      success: true,
      payments,
      total: payments.length,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("[Payments] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get single payment
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get real payment from contract
    let payment;
    try {
      payment = await paymentService.getPayment(parseInt(id));
    } catch (contractError) {
      console.error("Contract call failed:", contractError.message);
      return res.status(404).json({
        success: false,
        error: "Payment not found",
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
      });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get payment status
router.get("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;

    // Get real payment status from contract
    let payment;
    try {
      payment = await paymentService.getPayment(parseInt(id));
    } catch (contractError) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
      });
    }

    res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      statusCode: payment.statusCode,
      nextExecution: payment.nextExecution,
      retryCount: payment.retryCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get payment execution history
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    const db = require("../db");

    // Get execution history from local DB
    const history = db.getExecutionHistory(50, parseInt(id));

    res.json({
      success: true,
      paymentId: parseInt(id),
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
