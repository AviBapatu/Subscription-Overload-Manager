const { dayjs, IST_TZ } = require('../helpers/dayjsSetup');
const Subscription = require('../../models/Subscription');
const User = require('../../models/User');
const { sendRenewalAlert } = require('../../services/emailService');
const { alreadySentToday, logDelivery, isInQuietHours } = require('../helpers/notifHelpers');

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 1 — Upcoming Renewal Alerts (runs every hour)
 *  Checks all active subscriptions and fires an email at the user-configured
 *  number of days before the next billing date, respecting quiet hours and
 *  idempotency so the alert is sent at most once per billing cycle checkpoint.
 * ═══════════════════════════════════════════════════════════════════════════ */
const runSubscriptionAlerts = async () => {
    console.log('[CRON] Executing hourly subscription alert check...');
    try {
        const subscriptions = await Subscription.find({ status: 'ACTIVE' });

        for (const sub of subscriptions) {
            if (!sub.nextBillingDate) continue;
            if (!sub.notifyViaEmail || !sub.userEmail) continue;

            const userLocalNow = dayjs().tz(sub.userTimezone || IST_TZ);

            const user = await User.findById(sub.userId).select('preferences timezone');
            if (!user) continue; // Skip orphaned subscriptions (user deleted)

            if (isInQuietHours(user)) continue;
            if (!user?.preferences?.notifUpcomingRenewals) continue;
            if (user?.preferences?.notifYearlyOnly && sub.billingCycle !== 'YEARLY') continue;

            const daysUntil = dayjs(sub.nextBillingDate).startOf('day').diff(userLocalNow.startOf('day'), 'day');
            if (daysUntil < 0) continue; // Past due date

            let shouldAlert = false;
            if (user?.preferences?.multipleReminders) {
                if (daysUntil === 7 && user.preferences.reminderD7) shouldAlert = true;
                else if (daysUntil === 3 && user.preferences.reminderD3) shouldAlert = true;
                else if (daysUntil === 1 && user.preferences.reminderD1) shouldAlert = true;
                else if (daysUntil === 0 && user.preferences.reminderBilling) shouldAlert = true;
            } else {
                const defaultAlertDays = user?.preferences?.alertDaysBefore ?? 3;
                if (daysUntil === defaultAlertDays) shouldAlert = true;
            }

            if (!shouldAlert) continue;

            // Type is unique per billing-date checkpoint — prevents duplicate alerts
            const logType = `RENEWAL_${daysUntil}D`;
            const sent = await alreadySentToday(sub.userId, sub._id, logType, sub.nextBillingDate);
            if (sent) continue;

            try {
                await sendRenewalAlert(sub.userEmail, sub, daysUntil);
                await logDelivery(sub.userId, sub._id, logType, sub.nextBillingDate);
            } catch (err) {
                console.error(`[CRON] Renewal alert failed for ${sub.userEmail}:`, err.message);
            }
        }
        console.log('[CRON] Subscription alert check completed.');
    } catch (err) {
        console.error('[CRON] Fatal error in subscription alerts:', err);
    }
};

module.exports = { runSubscriptionAlerts };
