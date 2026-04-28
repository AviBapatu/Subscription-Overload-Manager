const { dayjs } = require('../helpers/dayjsSetup');
const Subscription = require('../../models/Subscription');
const User = require('../../models/User');
const { sendFreeTrialEndingAlert } = require('../../services/emailService');
const { isInQuietHours } = require('../helpers/notifHelpers');

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 3 — Free Trial Ending Alerts (runs every hour)
 *  Finds subscriptions whose trial ends within the next 3 days and fires a
 *  one-shot alert via the `trialAlertSent` flag on the subscription document.
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

            const user = await User.findById(sub.userId).select('preferences timezone');
            if (!user?.preferences?.notifFreeTrialEnding) continue;
            if (isInQuietHours(user)) continue;

            const daysLeft = dayjs(sub.trialEndsAt).diff(now, 'day');
            try {
                await sendFreeTrialEndingAlert(sub.userEmail, sub, daysLeft);
                sub.trialAlertSent = true;
                await sub.save();
            } catch (err) {
                console.error(`[CRON] Free trial alert failed for ${sub.userEmail}:`, err.message);
            }
        }
        console.log('[CRON] Free trial check done.');
    } catch (err) {
        console.error('[CRON] Fatal error in free trial alerts:', err);
    }
};

module.exports = { runFreeTrialAlerts };
