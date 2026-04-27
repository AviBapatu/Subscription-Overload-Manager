const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const Subscription = require('../models/Subscription');
const NotificationLog = require('../models/NotificationLog');
const { getRenewalAlertHTML } = require('../templates/emailTemplates');
const {
    sendEmail,
    sendOverdueEmail,
    sendFreeTrialEndingAlert,
    sendWeeklySummary,
    sendBudgetAlert,
} = require('../services/emailService');
const User = require('../models/User');
const { runBackgroundSync } = require('../services/gmailSyncService');

dayjs.extend(utc);
dayjs.extend(timezone);

// Indian Standard Time — all cron schedules are expressed in IST
const IST_TZ = 'Asia/Kolkata';

// ─── Helper: compute monthly-equivalent spend for a subscription ──────────────
const toMonthly = (sub) => {
    if (sub.billingCycle === 'YEARLY')  return sub.cost / 12;
    if (sub.billingCycle === 'WEEKLY')  return sub.cost * 4.33;
    return sub.cost; // MONTHLY
};

// ─── Helper: check if a notification was already sent today for this sub ──────
const alreadySentToday = async (userId, subscriptionId, type) => {
    return NotificationLog.findOne({
        userId,
        subscriptionId,
        type,
        sentForDate: dayjs().startOf('day').toDate(),
    });
};

// ─── Helper: log a delivered notification ────────────────────────────────────
const logDelivery = (userId, subscriptionId, type, sentForDate) =>
    NotificationLog.create({ userId, subscriptionId, type, sentForDate, status: 'DELIVERED' });

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 1 — Upcoming Renewal Alerts (runs every hour, fires at midnight local)
 * ═══════════════════════════════════════════════════════════════════════════ */
const runSubscriptionAlerts = async () => {
    console.log('[CRON] Executing hourly subscription alert check...');
    try {
        const today = dayjs().startOf('day').toDate();
        const subscriptions = await Subscription.find({ alertDate: today, status: 'ACTIVE' });

        for (const sub of subscriptions) {
            const userLocalNow = dayjs().tz(sub.userTimezone || IST_TZ);
            if (userLocalNow.hour() !== 0) continue;

            if (!sub.notifyViaEmail || !sub.userEmail) continue;

            // Enforce user notification preferences for Upcoming Renewals
            const user = await User.findById(sub.userId).select('preferences');
            if (!user?.preferences?.notifUpcomingRenewals) continue;
            
            // If user only wants yearly renewals, ignore monthly/weekly
            if (user?.preferences?.notifYearlyOnly && sub.billingCycle !== 'YEARLY') continue;

            const sent = await alreadySentToday(sub.userId, sub._id, 'EMAIL');
            if (sent) continue;

            try {
                const htmlContent = getRenewalAlertHTML(sub);
                await sendEmail(sub.userEmail, `${sub.serviceName} Renewal Alert`, htmlContent);
                await logDelivery(sub.userId, sub._id, 'EMAIL', today);
            } catch (err) {
                console.error(`[CRON] Renewal alert failed for ${sub.userEmail}:`, err.message);
            }
        }
        console.log('[CRON] Subscription alert check completed.');
    } catch (err) {
        console.error('[CRON] Fatal error in subscription alerts:', err);
    }
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 2 — Overdue Payment Alerts (runs every hour, one-shot per subscription)
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
                // Check if user has opted out of Failed Payment / Overdue alerts
                const user = await User.findById(sub.userId).select('preferences');
                if (user?.preferences && user.preferences.notifFailedPayments === false) {
                    continue; // Skip alerting, but keep overdueNotified false so if they toggle it on, they get it
                }

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

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 3 — Free Trial Ending Alerts (runs daily at 9 AM UTC)
 *  Finds subscriptions whose trialEndsAt is within the next 3 days.
 * ═══════════════════════════════════════════════════════════════════════════ */
const runFreeTrialAlerts = async () => {
    console.log('[CRON] Checking free trial endings...');
    try {
        const now = dayjs();
        const in3Days = now.add(3, 'day').endOf('day').toDate();

        const trials = await Subscription.find({
            trialEndsAt: { $gte: now.toDate(), $lte: in3Days },
            status: 'ACTIVE',
            trialAlertSent: { $ne: true },
        });

        for (const sub of trials) {
            if (!sub.notifyViaEmail || !sub.userEmail) continue;

            // Check user preference
            const user = await User.findById(sub.userId).select('preferences');
            if (!user?.preferences?.notifFreeTrialEnding) continue;

            const daysLeft = dayjs(sub.trialEndsAt).diff(now, 'day');
            try {
                await sendFreeTrialEndingAlert(sub.userEmail, sub, daysLeft);
                sub.trialAlertSent = true;
                await sub.save();
            } catch (err) {
                console.error(`[CRON] Free trial alert failed for ${sub.userEmail}:`, err.message);
            }
        }
        console.log(`[CRON] Free trial check done.`);
    } catch (err) {
        console.error('[CRON] Fatal error in free trial alerts:', err);
    }
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 4 — Weekly Summary (runs every Sunday at 8 AM UTC)
 *  Sends users a digest of subscriptions renewing in the next 7 days.
 * ═══════════════════════════════════════════════════════════════════════════ */
const runWeeklySummary = async () => {
    console.log('[CRON] Sending weekly summaries...');
    try {
        const users = await User.find({ 'preferences.weeklySummary': true, 'preferences.notifyViaEmail': true });

        const in7Days = dayjs().add(7, 'day').endOf('day').toDate();

        for (const user of users) {
            // Check quiet hours (skip if currently in quiet window)
            if (isInQuietHours(user)) continue;

            const upcomingSubs = await Subscription.find({
                userId: user._id,
                status: 'ACTIVE',
                nextBillingDate: { $gte: new Date(), $lte: in7Days },
            });

            const allActive = await Subscription.find({ userId: user._id, status: 'ACTIVE' });
            const totalMonthly = allActive.reduce((acc, s) => acc + toMonthly(s), 0);

            try {
                await sendWeeklySummary(user.email, user.name, upcomingSubs, totalMonthly);
                await NotificationLog.create({
                    userId: user._id,
                    type: 'WEEKLY_SUMMARY',
                    sentForDate: dayjs().startOf('week').toDate(),
                    status: 'DELIVERED',
                });
            } catch (err) {
                console.error(`[CRON] Weekly summary failed for ${user.email}:`, err.message);
            }
        }
        console.log('[CRON] Weekly summaries sent.');
    } catch (err) {
        console.error('[CRON] Fatal error in weekly summaries:', err);
    }
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 5 — Budget Alerts (runs daily at 10 AM UTC)
 *  Fires when a user's active monthly spend crosses 80% of their budget cap.
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
            const snoozed = user.preferences?.snoozeUntil && dayjs(user.preferences.snoozeUntil).isAfter(dayjs());
            if (snoozed) continue;

            const activeSubs = await Subscription.find({ userId: user._id, status: 'ACTIVE' });
            const spent = activeSubs.reduce((acc, s) => acc + toMonthly(s), 0);
            const budget = user.preferences.budgetMonthly;
            const percentage = Math.round((spent / budget) * 100);

            if (percentage < 80) continue;

            // Idempotency: only send once per calendar month
            const alreadySentThisMonth = await NotificationLog.findOne({
                userId: user._id,
                type: 'BUDGET',
                sentForDate: {
                    $gte: dayjs().startOf('month').toDate(),
                    $lte: dayjs().endOf('month').toDate(),
                },
            });
            if (alreadySentThisMonth) continue;

            try {
                await sendBudgetAlert(user.email, user.name, spent, budget, percentage);
                await NotificationLog.create({
                    userId: user._id,
                    type: 'BUDGET',
                    sentForDate: new Date(),
                    status: 'DELIVERED',
                });
            } catch (err) {
                console.error(`[CRON] Budget alert failed for ${user.email}:`, err.message);
            }
        }
        console.log('[CRON] Budget alert check done.');
    } catch (err) {
        console.error('[CRON] Fatal error in budget alerts:', err);
    }
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 6 — Daily Gmail Auto-Sync (runs at 2 AM UTC)
 * ═══════════════════════════════════════════════════════════════════════════ */
const runDailyGmailSync = async () => {
    console.log('[CRON] Starting daily background Gmail sync...');
    try {
        const usersWithSync = await User.find({ googleRefreshToken: { $exists: true, $ne: null } });
        console.log(`[CRON] Found ${usersWithSync.length} users configured for auto-sync.`);

        for (const user of usersWithSync) {
            await runBackgroundSync(user._id);
        }
        console.log('[CRON] Daily background Gmail sync completed.');
    } catch (err) {
        console.error('[CRON] Fatal error in auto Gmail sync:', err);
    }
};

/* ─── Quiet hours guard ──────────────────────────────────────────────────────
 *  Returns true if the current UTC time falls within the user's quiet window.
 * ─────────────────────────────────────────────────────────────────────────── */
const isInQuietHours = (user) => {
    if (!user.preferences?.quietHoursEnabled) return false;
    const start = user.preferences.quietHoursStart || '22:00';
    const end   = user.preferences.quietHoursEnd   || '08:00';
    const now   = dayjs().tz(user.timezone || 'UTC').format('HH:mm');
    // Handle overnight windows (e.g. 22:00 → 08:00)
    if (start > end) return now >= start || now < end;
    return now >= start && now < end;
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Bootstrap — register all cron jobs
 * ═══════════════════════════════════════════════════════════════════════════ */
const initCronJobs = () => {
    // JOB 1 — Renewal alerts (every hour; fires only at midnight IST)
    cron.schedule('0 * * * *', runSubscriptionAlerts, { timezone: IST_TZ });

    // JOB 2 — Overdue alerts (every hour)
    cron.schedule('0 * * * *', runOverdueAlerts, { timezone: IST_TZ });

    // JOB 3 — Free trial ending alerts (daily at 09:00 IST)
    cron.schedule('0 9 * * *', runFreeTrialAlerts, { timezone: IST_TZ });

    // JOB 4 — Weekly summary digest (every Sunday at 08:00 IST)
    cron.schedule('0 8 * * 0', runWeeklySummary, { timezone: IST_TZ });

    // JOB 5 — Budget 80% threshold alert (daily at 10:00 IST)
    cron.schedule('0 10 * * *', runBudgetAlerts, { timezone: IST_TZ });

    // JOB 6 — Auto Gmail sync (daily at 02:00 IST)
    cron.schedule('0 2 * * *', runDailyGmailSync, { timezone: IST_TZ });

    console.log(`[CRON] Started 6 jobs in ${IST_TZ}: renewal-alerts, overdue-alerts, free-trial-alerts, weekly-summary, budget-alerts, gmail-sync.`);
};

module.exports = {
    initCronJobs,
    runSubscriptionAlerts,
    runOverdueAlerts,
    runFreeTrialAlerts,
    runWeeklySummary,
    runBudgetAlerts,
    runDailyGmailSync,
};
