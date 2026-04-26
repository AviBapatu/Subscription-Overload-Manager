const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const Subscription = require('../models/Subscription');
const NotificationLog = require('../models/NotificationLog');
const { getRenewalAlertHTML } = require('../templates/emailTemplates');
const { sendBrevoEmail, sendOverdueEmail } = require('../services/emailService');
const User = require('../models/User');
const { runBackgroundSync } = require('../services/gmailSyncService');

dayjs.extend(utc);
dayjs.extend(timezone);

const runSubscriptionAlerts = async () => {
  console.log('[CRON] Executing hourly subscription alert check...');
  try {
    const today = dayjs().startOf('day').toDate();
    
    // Find all active subscriptions scheduled for an alert today
    const subscriptions = await Subscription.find({ alertDate: today, status: 'ACTIVE' });
    
    for (const sub of subscriptions) {
      const userLocalNow = dayjs().tz(sub.userTimezone || 'UTC');
      
      // Only fire off the dispatch loop during the first hour (00:xx) of the user's localized day
      if (userLocalNow.hour() !== 0) continue;

      if (sub.notifyViaEmail && sub.userEmail) {
        // Idempotency: Have we already sent this exact alert?
        const alreadySent = await NotificationLog.findOne({
          userId: sub.userId,
          subscriptionId: sub._id,
          type: 'EMAIL',
          sentForDate: sub.nextBillingDate
        });

        if (!alreadySent) {
          console.log(`[CRON] Dispatching email alert for ${sub.serviceName} to ${sub.userEmail}...`);
          try {
            const htmlContent = getRenewalAlertHTML(sub);
            await sendBrevoEmail(
              sub.userEmail, 
              `${sub.serviceName} Renewal Alert`, 
              htmlContent
            );
            
            // Record successful delivery
            await NotificationLog.create({
              userId: sub.userId,
              subscriptionId: sub._id,
              type: 'EMAIL',
              sentForDate: sub.nextBillingDate,
              status: 'DELIVERED'
            });
          } catch (err) {
             console.error(`[CRON] Email failure for ${sub.userEmail}:`, err.message);
          }
        }
      }

      // Future webhook or WhatsApp hook could go here safely.
    }
    console.log('[CRON] Subscription alert check completed cleanly.');
  } catch (err) {
    console.error('[CRON] Fatal Error generating alerts:', err);
  }
};


/**
 * Initializes the node-cron scheduler.
 */
const initCronJobs = () => {
    // Schedule renewal alerts (daily check, first hour of user's timezone)
    cron.schedule('0 * * * *', runSubscriptionAlerts);
    
    // Overdue alerts
    cron.schedule('0 * * * *', async () => {
        // 1. Identify overdue subscriptions: (date < today AND status === 'ACTIVE')
        // 2. Filter those already notified: (overdueNotified !== true)
        const overdue = await Subscription.find({
            nextBillingDate: { $lt: new Date() },
            status: 'ACTIVE',
            overdueNotified: { $ne: true }
        });

        for (const sub of overdue) {
            await sendOverdueEmail(sub);
            sub.overdueNotified = true;
            await sub.save();
        }
    });
    
    // Auto Gmail Sync (runs every day at 2:00 AM)
    cron.schedule('0 2 * * *', async () => {
        console.log('[CRON] Starting daily background Gmail sync...');
        try {
            // Find all users who have authorized offline access
            const usersWithSync = await User.find({ googleRefreshToken: { $exists: true, $ne: null } });
            console.log(`[CRON] Found ${usersWithSync.length} users configured for auto-sync.`);

            for (const user of usersWithSync) {
                await runBackgroundSync(user._id);
            }
            console.log('[CRON] Daily background Gmail sync completed.');
        } catch (err) {
            console.error('[CRON] Fatal Error in auto Gmail sync:', err);
        }
    });

    console.log('Node-Cron started: Scheduled [send-subscription-alerts], [overdue-alerts], and [auto-gmail-sync].');
};

module.exports = {
    initCronJobs,
    runSubscriptionAlerts
};
