const { dayjs } = require('../helpers/dayjsSetup');
const Subscription = require('../../models/Subscription');
const User = require('../../models/User');
const { sendBudgetAlert } = require('../../services/emailService');
const { toMonthly, alreadySentToday, logDelivery, isInQuietHours } = require('../helpers/notifHelpers');

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 5 — Budget 80% Threshold Alert (runs every hour)
 *  Fires when a user's total active monthly spend >= 80% of their budget cap.
 *  Idempotency enforced via NotificationLog keyed on start-of-month date.
 * ═══════════════════════════════════════════════════════════════════════════ */
const runBudgetAlerts = async () => {
    console.log('[CRON] Checking budget alerts...');
    try {
        const users = await User.find({
            'preferences.budgetAlertAt80': true,
            'preferences.notifyViaEmail': true,
            'preferences.budgetMonthly': { $gt: 0 },
        });

        for (const user of users) {
            if (isInQuietHours(user)) continue;

            const snoozed = user.preferences?.snoozeUntil && dayjs(user.preferences.snoozeUntil).isAfter(dayjs());
            if (snoozed) continue;

            const activeSubs = await Subscription.find({ userId: user._id, status: 'ACTIVE' });
            const spent = activeSubs.reduce((acc, s) => acc + toMonthly(s), 0);
            const budget = user.preferences.budgetMonthly;
            const percentage = Math.round((spent / budget) * 100);

            if (percentage < 80) continue;

            // Deduplicate: one alert per calendar month per user
            const startOfMonth = dayjs().tz(user.timezone || 'UTC').startOf('month').toDate();
            const alreadySentThisMonth = await alreadySentToday(user._id, null, 'BUDGET', startOfMonth);
            if (alreadySentThisMonth) continue;

            try {
                await sendBudgetAlert(user.email, user.name, spent, budget, percentage);
                await logDelivery(user._id, null, 'BUDGET', startOfMonth);
            } catch (err) {
                console.error(`[CRON] Budget alert failed for ${user.email}:`, err.message);
            }
        }
        console.log('[CRON] Budget alert check done.');
    } catch (err) {
        console.error('[CRON] Fatal error in budget alerts:', err);
    }
};

module.exports = { runBudgetAlerts };
