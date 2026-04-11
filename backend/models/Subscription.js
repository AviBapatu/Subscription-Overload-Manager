const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceName: { type: String, required: true },
    cost: { type: Number, required: true },
    billingCycle: { type: String, enum: ['WEEKLY', 'MONTHLY', 'YEARLY'], required: true },
    category: {
        type: String,
        enum: ['Entertainment', 'Software', 'News', 'Gaming', 'Music', 'Fitness', 'Education', 'Cloud', 'Other'],
        default: 'Other'
    },
    nextBillingDate: { type: Date, required: true },
    alertDate: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CANCELLED'], default: 'ACTIVE' },

    // Denormalized Snapshots for Cron job efficiency
    userEmail: { type: String },
    userPhone: { type: String },
    userTimezone: { type: String },
    notifyViaEmail: { type: Boolean },
    notifyViaWhatsApp: { type: Boolean }
}, { timestamps: true });

// Index for daily cron scan efficiency
SubscriptionSchema.index({ alertDate: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, nextBillingDate: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
