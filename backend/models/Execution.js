const mongoose = require("mongoose");

const executionSchema = new mongoose.Schema({
  payment_id: {
    type: Number,
    required: true,
    index: true,
  },
  success: {
    type: Boolean,
    required: true,
  },
  hash: {
    type: String,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model("Execution", executionSchema);
