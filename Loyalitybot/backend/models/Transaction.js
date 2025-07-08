const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  barId: {
    type: String, // Keep as String to match QR code data
    required: true,
  },
  type: {
    type: String,
    enum: ['earn', 'spend'],
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 