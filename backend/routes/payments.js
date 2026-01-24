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

const router = express.Router();
const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID;
const server = new SorobanRpc.Server(RPC_URL);

// Get all payments for a user
router.get("/user/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { offset = 0, limit = 10 } = req.query;

    // In production, call contract's get_payments_by_payer
    // For now, return mock data

    const mockPayments = [
      {
        id: 1,
        payer: address,
        recipient: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        amount: 100 * 10000000, // 100 USDC in stroops
        interval: 3600,
        next_execution: Math.floor(Date.now() / 1000) + 1800,
        status: 0, // ACTIVE
        created_at: Math.floor(Date.now() / 1000) - 86400,
      },
    ];

    res.json({
      success: true,
      payments: mockPayments,
      total: mockPayments.length,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
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

    // Mock payment data
    const mockPayment = {
      id: parseInt(id),
      payer: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      recipient: "GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      amount: 100 * 10000000,
      interval: 3600,
      next_execution: Math.floor(Date.now() / 1000) + 1800,
      status: 0,
      created_at: Math.floor(Date.now() / 1000) - 86400,
      retry_count: 0,
    };

    res.json({
      success: true,
      payment: mockPayment,
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

    const statusMap = {
      0: "ACTIVE",
      1: "PAUSED",
      2: "FAILED",
      3: "CANCELLED",
    };

    res.json({
      success: true,
      paymentId: parseInt(id),
      status: statusMap[0],
      statusCode: 0,
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

    // Mock execution history
    const mockHistory = [
      {
        timestamp: Math.floor(Date.now() / 1000) - 3600,
        status: "SUCCESS",
        amount: 100 * 10000000,
        hash: "abc123...",
      },
    ];

    res.json({
      success: true,
      paymentId: parseInt(id),
      history: mockHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
