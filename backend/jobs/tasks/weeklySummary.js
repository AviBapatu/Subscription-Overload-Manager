const { dayjs } = require('../helpers/dayjsSetup');
const Subscription = require('../../models/Subscription');
const User = require('../../models/User');
const { sendWeeklySummary } = require('../../services/emailService');
const { toMonthly, alreadySentToday, logDelivery, isInQuietHours } = require('../helpers/notifHelpers');

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 4 — Weekly Summary Digest (runs every hour, triggers on Sunday only)
 *  Sends users a digest of subscriptions renewing in the next 7 days.
 *  Idempotency is enforced via NotificationLog keyed on start-of-week date.
 * ═══════════════════════════════════════════════════════════════════════════ */
const runWeeklySummary = async () => {
    console.log('[CRON] Sending weekly summaries...');
    try {
        const users = await User.find({
            'preferences.weeklySummary': true,
            'preferences.notifyViaEmail': true,
        });

        const in7Days = dayjs().add(7, 'day').endOf('day').toDate();

        for (const user of users) {
            const userTz = user.timezone || 'UTC';

            // Only fire on Sunday in the user's local timezone
            if (dayjs().tz(userTz).day() !== 0) continue;

            if (isInQuietHours(user)) continue;

            // Deduplicate: one summary per week per user
            const startOfWeek = dayjs().tz(userTz).startOf('week').toDate();
            const alreadySent = await alreadySentToday(user._id, null, 'WEEKLY_SUMMARY', startOfWeek);
            if (alreadySent) continue;

            const upcomingSubs = await Subscription.find({
                userId: user._id,
                status: 'ACTIVE',
                nextBillingDate: { $gte: new Date(), $lte: in7Days },
            });

            const allActive = await Subscription.find({ userId: user._id, status: 'ACTIVE' });
            const totalMonthly = allActive.reduce((acc, s) => acc + toMonthly(s), 0);

            try {
                await sendWeeklySummary(user.email, user.name, upcomingSubs, totalMonthly);
                await logDelivery(user._id, null, 'WEEKLY_SUMMARY', startOfWeek);
            } catch (err) {
                console.error(`[CRON] Weekly summary failed for ${user.email}:`, err.message);
            }
        }
        console.log('[CRON] Weekly summaries sent.');
    } catch (err) {
        console.error('[CRON] Fatal error in weekly summaries:', err);
    }
};

module.exports = { runWeeklySummary };
