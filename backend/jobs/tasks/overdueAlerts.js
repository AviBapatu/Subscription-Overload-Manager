const Subscription = require('../../models/Subscription');
const User = require('../../models/User');
const { sendOverdueEmail } = require('../../services/emailService');
const { isInQuietHours } = require('../helpers/notifHelpers');

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 2 — Overdue Payment Alerts (runs every hour, one-shot per subscription)
 *  Finds subscriptions past their billing date that haven't been notified yet.
 *  Uses the `overdueNotified` flag on the subscription document as the guard.
 * ═══════════════════════════════════════════════════════════════════════════ */
const runOverdueAlerts = async () => {
    try {
        const overdue = await Subscription.find({
            nextBillingDate: { $lt: new Date() },
            status: 'ACTIVE',
            overdueNotified: { $ne: true },
        });

        for (const sub of overdue) {
            try {
                const user = await User.findById(sub.userId).select('preferences timezone');
                if (!user) continue; // Skip orphaned subscriptions (user deleted)

                if (isInQuietHours(user)) continue;

                // Respect user preference — keep flag false so they get it if they opt back in
                if (user?.preferences && user.preferences.notifFailedPayments === false) continue;

                await sendOverdueEmail(sub);
                sub.overdueNotified = true;
                await sub.save();
            } catch (err) {
                console.error(`[CRON] Overdue alert failed for ${sub.userEmail}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[CRON] Fatal error in overdue alerts:', err);
    }
};

module.exports = { runOverdueAlerts };
