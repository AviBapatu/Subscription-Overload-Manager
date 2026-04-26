const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceName: { type: String, required: true },
    cost: { type: Number, required: true },
    billingCycle: { type: String, enum: ['WEEKLY', 'MONTHLY', 'YEARLY'], default: 'MONTHLY' },
    category: {
        type: String,
        enum: ['Entertainment', 'Software', 'News', 'Gaming', 'Music', 'Fitness', 'Education', 'Cloud', 'Other'],
        default: 'Other'
    },
    nextBillingDate: { type: Date, required: true },
    alertDate: { type: Date }, // Optional for suggested subs
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CANCELLED', 'SUGGESTED', 'IGNORED'], default: 'ACTIVE' },
    
    // Engine Metadata
    confidence: { type: Number, default: 1.0 },
    detectedService: { type: String },
    emailId: { type: String }, // For Gmail de-duplication
    syncedAt: { type: Date, default: Date.now }, // Discover timestamp
    source: { type: String, enum: ['heuristic', 'llm', 'manual'], default: 'manual' }, // Detection origin

    // Denormalized Snapshots for Cron job efficiency
    userEmail: { type: String },
    userPhone: { type: String },
    userTimezone: { type: String },
    notifyViaEmail: { type: Boolean, default: true },
    notifyViaWhatsApp: { type: Boolean },
    overdueNotified: { type: Boolean, default: false },
    lastReminderSentAt: { type: Date },
    reminderCount: { type: Number, default: 0 },

    // Free trial support
    trialEndsAt: { type: Date, default: null },        // set if this is a free trial
    trialAlertSent: { type: Boolean, default: false }, // prevent duplicate trial alerts

    // Price change tracking
    previousCost: { type: Number, default: null }      // set when cost is updated
}, { timestamps: true });

// Index for daily cron scan efficiency
SubscriptionSchema.index({ alertDate: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, nextBillingDate: 1 });
SubscriptionSchema.index({ status: 1, overdueNotified: 1, nextBillingDate: 1 });
SubscriptionSchema.index({ userEmail: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
