const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  type: { type: String, enum: ['EMAIL', 'WHATSAPP'], required: true },
  sentForDate: { type: Date, required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, default: 'DELIVERED' }
});

// Idempotency Guard - Compound unique index
NotificationLogSchema.index({ userId: 1, subscriptionId: 1, type: 1, sentForDate: 1 }, { unique: true });

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
