const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceName: { type: String, required: true },
  cost: { type: Number, required: true },
  billingCycle: { type: String, enum: ['WEEKLY', 'MONTHLY', 'YEARLY'], required: true },
  nextBillingDate: { type: Date, required: true },
  alertDate: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CANCELLED'], default: 'ACTIVE' },
  
  // Denormalized Snapshots to avoid populate during Cron job
  userEmail: { type: String },
  userPhone: { type: String },
  userTimezone: { type: String },
  notifyViaEmail: { type: Boolean },
  notifyViaWhatsApp: { type: Boolean }
}, { timestamps: true });

// Required index for the daily cron scan efficiency
SubscriptionSchema.index({ alertDate: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
