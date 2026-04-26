const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null }, // null for user-level alerts (budget, weekly)
  type:           { type: String, enum: ['EMAIL', 'WHATSAPP', 'BUDGET', 'WEEKLY_SUMMARY'], required: true },
  sentForDate:    { type: Date, required: true },
  sentAt:         { type: Date, default: Date.now },
  status:         { type: String, default: 'DELIVERED' }
});

// Idempotency guard — compound unique index
// subscriptionId is sparse so null values don't collide across user-level logs
NotificationLogSchema.index(
  { userId: 1, subscriptionId: 1, type: 1, sentForDate: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
