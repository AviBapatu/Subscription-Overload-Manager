const cron = require('node-cron');
const { IST_TZ } = require('./helpers/dayjsSetup');

// ─── Job imports ──────────────────────────────────────────────────────────────
const { runSubscriptionAlerts } = require('./tasks/renewalAlerts');
const { runOverdueAlerts }      = require('./tasks/overdueAlerts');
const { runFreeTrialAlerts }    = require('./tasks/freeTrialAlerts');
const { runWeeklySummary }      = require('./tasks/weeklySummary');
const { runBudgetAlerts }       = require('./tasks/budgetAlerts');
const { runDailyGmailSync }     = require('./tasks/gmailSync');

/* ═══════════════════════════════════════════════════════════════════════════
 *  Bootstrap — register all cron jobs
 *  All times are in IST (Asia/Kolkata).
 * ═══════════════════════════════════════════════════════════════════════════ */
const initCronJobs = () => {
    // JOB 1 — Renewal alerts (every hour)
    cron.schedule('0 * * * *', runSubscriptionAlerts, { timezone: IST_TZ });

    // JOB 2 — Overdue alerts (every hour)
    cron.schedule('0 * * * *', runOverdueAlerts, { timezone: IST_TZ });

    // JOB 3 — Free trial ending alerts (every hour)
    cron.schedule('0 * * * *', runFreeTrialAlerts, { timezone: IST_TZ });

    // JOB 4 — Weekly summary digest (every hour, self-guards to Sunday only)
    cron.schedule('0 * * * *', runWeeklySummary, { timezone: IST_TZ });

    // JOB 5 — Budget 80% threshold alert (every hour)
    cron.schedule('0 * * * *', runBudgetAlerts, { timezone: IST_TZ });

    // JOB 6 — Auto Gmail sync (daily at 02:00 IST)
    cron.schedule('0 2 * * *', runDailyGmailSync, { timezone: IST_TZ });

    console.log('[CRON] Started 6 jobs: 5 hourly polling jobs (with Quiet Hours protection) and 1 daily gmail-sync.');
};

module.exports = {
    initCronJobs,
    // Individual job runners exposed for manual triggering via test/cron routes
    runSubscriptionAlerts,
    runOverdueAlerts,
    runFreeTrialAlerts,
    runWeeklySummary,
    runBudgetAlerts,
    runDailyGmailSync,
};
