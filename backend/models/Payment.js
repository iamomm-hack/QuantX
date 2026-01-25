const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  payment_id: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["ACTIVE", "PAUSED", "CANCELLED", "COMPLETED", "FAILED", "pending"],
    default: "ACTIVE",
  },
  last_checked: {
    type: Date,
    default: null,
  },
  failures: {
    type: Number,
    default: 0,
  },
  last_execution_ledger: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Payment", paymentSchema);
