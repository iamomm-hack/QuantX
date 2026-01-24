const {
  SorobanRpc,
  Keypair,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  xdr,
} = require("@stellar/stellar-sdk");
const EventEmitter = require("events");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID;
const EXECUTOR_SECRET = process.env.EXECUTOR_SECRET;

const server = new SorobanRpc.Server(RPC_URL);
const executorKeypair = Keypair.fromSecret(EXECUTOR_SECRET);

// Execution configuration
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

class PaymentExecutor extends EventEmitter {
  constructor() {
    super();
    this.contract = new Contract(CONTRACT_ID);
    this.activePayments = new Map();
    this.executionQueue = [];
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      lastCheckTime: null,
    };
  }

  async start() {
    console.log("QuantX Executor started");
    console.log(`RPC: ${RPC_URL}`);
    console.log(`Contract: ${CONTRACT_ID}`);
    console.log(`Executor: ${executorKeypair.publicKey()}`);
    console.log(`Check interval: ${CHECK_INTERVAL}ms\n`);

    // Initial check
    await this.checkAndExecutePayments();

    // Set up periodic checks
    setInterval(() => this.checkAndExecutePayments(), CHECK_INTERVAL);

    // Set up stats logging
    setInterval(() => this.logStats(), 60000); // Every minute
  }

  async checkAndExecutePayments() {
    try {
      const timestamp = new Date().toISOString();
      this.stats.lastCheckTime = timestamp;

      console.log(`[${timestamp}] Checking for due payments...`);

      // Get active payments from contract
      const duePayments = await this.getDuePayments();

      if (duePayments.length === 0) {
        console.log(`[${timestamp}] No payments due\n`);
        return;
      }

      console.log(`[${timestamp}] Found ${duePayments.length} due payment(s)`);

      // Execute each due payment
      for (const payment of duePayments) {
        await this.executePayment(payment);
      }

      console.log("");
    } catch (error) {
      console.error("Error in check cycle:", error.message);
      this.emit("error", error);
    }
  }

  async getDuePayments() {
    try {
      // In production, this would query the contract for active payments
      // For now, we'll return a mock list
      //
      // The actual implementation would:
      // 1. Call get_all_active_payments() or similar
      // 2. Filter by next_execution <= current_time
      // 3. Return payment objects

      // Mock implementation - replace with actual contract call
      const mockPayments = [];

      // Example of how to query (uncomment when contract supports it):
      /*
      const account = await server.getAccount(executorKeypair.publicKey());
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(this.contract.call('get_due_payments'))
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);
      if (simulated.results && simulated.results.length > 0) {
        return simulated.results[0].retval;
      }
      */

      return mockPayments;
    } catch (error) {
      console.error("Error fetching due payments:", error.message);
      return [];
    }
  }

  async executePayment(payment) {
    const paymentId = payment.id || payment;

    try {
      console.log(`Executing payment ${paymentId}...`);

      const account = await server.getAccount(executorKeypair.publicKey());

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(this.contract.call("execute_payment", paymentId))
        .setTimeout(30)
        .build();

      transaction.sign(executorKeypair);

      // Submit transaction
      const response = await server.sendTransaction(transaction);

      if (response.status === "PENDING") {
        // Wait for confirmation
        const result = await this.pollTransactionStatus(response.hash);

        if (result.status === "SUCCESS") {
          console.log(`Payment ${paymentId} executed successfully`);

          this.stats.totalExecutions++;
          this.stats.successfulExecutions++;

          this.emit("execution_success", {
            paymentId,
            hash: response.hash,
            timestamp: new Date().toISOString(),
          });

          return true;
        } else {
          throw new Error(`Transaction failed: ${result.status}`);
        }
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error executing payment ${paymentId}:`, error.message);

      this.stats.totalExecutions++;
      this.stats.failedExecutions++;

      // Handle specific errors
      this.handleExecutionError(paymentId, error);

      this.emit("execution_failed", {
        paymentId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return false;
    }
  }

  handleExecutionError(paymentId, error) {
    const errorMsg = error.message;

    if (errorMsg.includes("ERR_NOT_DUE")) {
      console.log(`Payment ${paymentId} not yet due`);
    } else if (errorMsg.includes("ERR_INSUFFICIENT_BALANCE")) {
      console.log(`Payment ${paymentId} - insufficient balance`);
      this.emit("insufficient_balance", { paymentId });
    } else if (errorMsg.includes("ERR_INSUFFICIENT_ALLOWANCE")) {
      console.log(`Payment ${paymentId} - insufficient allowance`);
      this.emit("insufficient_allowance", { paymentId });
    } else if (errorMsg.includes("ERR_ALREADY_EXECUTED")) {
      console.log(`Payment ${paymentId} already executed`);
    } else if (errorMsg.includes("ERR_PAYMENT_INACTIVE")) {
      console.log(`Payment ${paymentId} is inactive`);
    } else {
      console.log(`Payment ${paymentId} - unknown error: ${errorMsg}`);
    }
  }

  async pollTransactionStatus(hash, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const response = await server.getTransaction(hash);
        if (response.status !== "NOT_FOUND") {
          return response;
        }
      } catch (error) {
        console.error("Error polling transaction:", error.message);
      }
    }
    throw new Error("Transaction timeout");
  }

  logStats() {
    const successRate =
      this.stats.totalExecutions > 0
        ? (
            (this.stats.successfulExecutions / this.stats.totalExecutions) *
            100
          ).toFixed(2)
        : 0;

    console.log("\nExecutor Statistics:");
    console.log(`   Total executions: ${this.stats.totalExecutions}`);
    console.log(`   Successful: ${this.stats.successfulExecutions}`);
    console.log(`   Failed: ${this.stats.failedExecutions}`);
    console.log(`   Success rate: ${successRate}%`);
    console.log(`   Last check: ${this.stats.lastCheckTime}\n`);
  }

  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.totalExecutions > 0
          ? (
              (this.stats.successfulExecutions / this.stats.totalExecutions) *
              100
            ).toFixed(2)
          : 0,
    };
  }
}

// Export for use in API server
module.exports = PaymentExecutor;

// Run standalone if executed directly
if (require.main === module) {
  const executor = new PaymentExecutor();

  // Event listeners
  executor.on("execution_success", (data) => {
    console.log(`Event: Payment ${data.paymentId} executed successfully`);
  });

  executor.on("execution_failed", (data) => {
    console.log(`Event: Payment ${data.paymentId} failed - ${data.error}`);
  });

  executor.on("insufficient_balance", (data) => {
    console.log(`Event: Payment ${data.paymentId} - user needs to add funds`);
    // In production: send notification to user
  });

  executor.on("insufficient_allowance", (data) => {
    console.log(
      `Event: Payment ${data.paymentId} - user needs to approve allowance`,
    );
    // In production: send notification to user
  });

  executor.on("error", (error) => {
    console.error("Event: Executor error -", error.message);
  });

  // Start executor
  executor.start().catch(console.error);

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down executor...");
    executor.logStats();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nShutting down executor...");
    executor.logStats();
    process.exit(0);
  });
}
