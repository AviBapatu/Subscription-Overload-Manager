/**
 * routes/testEmails.js
 *
 * Development-only endpoints to trigger individual email types on-demand.
 * Mount: app.use('/api/test', require('./routes/testEmails'))
 *
 * GET /api/test/emails          — list all available test email types
 * POST /api/test/emails/:type   — fire a specific email type
 *   Body: { to: "you@example.com" }          (required)
 *         + any override fields for that type
 *
 * POST /api/test/cron/:job      — manually trigger a cron job function
 */
const router = require('express').Router();
const dayjs  = require('dayjs');
const {
    sendRenewalAlert,
    sendOtpEmail,
    sendFreeTrialEndingAlert,
    sendFailedPaymentAlert,
    sendPriceIncreaseAlert,
    sendWeeklySummary,
    sendBudgetAlert,
    sendNewSubscriptionAlert,
    sendOverdueEmail,
} = require('../services/emailService');

const {
    runSubscriptionAlerts,
    runOverdueAlerts,
    runFreeTrialAlerts,
    runWeeklySummary: cronWeeklySummary,
    runBudgetAlerts,
    runDailyGmailSync,
} = require('../jobs/scheduler');

const User         = require('../models/User');
const Subscription = require('../models/Subscription');

// ─── Guard: dev/staging only ──────────────────────────────────────────────────
router.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Test routes are disabled in production.' });
    }
    next();
});

// ─── Build a mock sub for a given email address ───────────────────────────────
const buildMockSub = (to) => ({
    _id: 'mock-test-id',
    serviceName: 'Netflix',
    cost: 649,
    billingCycle: 'MONTHLY',
    category: 'Entertainment',
    nextBillingDate: dayjs().add(3, 'day').toDate(),
    trialEndsAt: dayjs().add(2, 'day').toDate(),
    userEmail: to,
    status: 'ACTIVE',
});

// ─── GET /api/test/emails ─────────────────────────────────────────────────────
router.get('/emails', (req, res) => {
    res.json({
        info: 'POST /api/test/emails/:type  with body { "to": "you@example.com" }',
        types: [
            { type: 'renewal',        description: 'Subscription renewal reminder (N days before)' },
            { type: 'otp',            description: 'Password reset OTP (6-digit code)' },
            { type: 'free-trial',     description: 'Free trial ending alert' },
            { type: 'failed-payment', description: 'Failed payment notification' },
            { type: 'price-increase', description: 'Price increase alert' },
            { type: 'weekly-summary', description: 'Sunday weekly digest' },
            { type: 'budget',         description: 'Budget 80% threshold alert' },
            { type: 'new-sub',        description: 'New subscription added confirmation' },
            { type: 'overdue',        description: 'Overdue payment alert' },
            { type: 'all',            description: 'Fire all 9 email types at once' },
        ],
        cronJobs: [
            { job: 'renewal-alerts',   description: 'Run subscription renewal check' },
            { job: 'overdue-alerts',   description: 'Run overdue payment check' },
            { job: 'free-trial-alerts',description: 'Run free trial ending check' },
            { job: 'weekly-summary',   description: 'Run weekly summary dispatch' },
            { job: 'budget-alerts',    description: 'Run budget 80% check' },
            { job: 'gmail-sync',       description: 'Run Gmail auto-sync' },
        ],
    });
});

// ─── POST /api/test/emails/:type ──────────────────────────────────────────────
router.post('/emails/:type', async (req, res) => {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: '`to` email is required in the request body.' });

    // Try to find real data for this email address; fall back to mocks
    const realUser = await User.findOne({ email: to }).lean();
    const realSub  = await Subscription.findOne({ userEmail: to, status: 'ACTIVE' }).lean();
    const user = realUser || { name: 'Test User', email: to };
    const sub  = realSub  || buildMockSub(to);

    const { type } = req.params;
    const results = [];

    const fire = async (label, fn) => {
        try {
            await fn();
            results.push({ email: label, status: 'sent' });
        } catch (err) {
            results.push({ email: label, status: 'failed', error: err.message });
        }
    };

    try {
        switch (type) {
            case 'renewal':
                await fire('renewal', () => sendRenewalAlert(to, sub, req.body.daysUntil ?? 3));
                break;
            case 'otp':
                await fire('otp', () => sendOtpEmail(to, req.body.otp ?? '482916'));
                break;
            case 'free-trial':
                await fire('free-trial', () => sendFreeTrialEndingAlert(to, sub, req.body.daysLeft ?? 2));
                break;
            case 'failed-payment':
                await fire('failed-payment', () => sendFailedPaymentAlert(to, sub));
                break;
            case 'price-increase':
                await fire('price-increase', () => sendPriceIncreaseAlert(
                    to, sub,
                    req.body.oldPrice ?? sub.cost,
                    req.body.newPrice ?? sub.cost + 50,
                    req.body.effectiveDate ?? dayjs().add(7, 'day').toDate()
                ));
                break;
            case 'weekly-summary':
                await fire('weekly-summary', () => sendWeeklySummary(to, user.name, [sub], sub.cost));
                break;
            case 'budget':
                await fire('budget', () => sendBudgetAlert(
                    to, user.name,
                    req.body.spent ?? sub.cost * 0.85,
                    req.body.budget ?? sub.cost,
                    req.body.percentage ?? 85
                ));
                break;
            case 'new-sub':
                await fire('new-sub', () => sendNewSubscriptionAlert(to, user.name, sub));
                break;
            case 'overdue':
                await fire('overdue', () => sendOverdueEmail({ ...sub, userEmail: to }));
                break;
            case 'all':
                await fire('renewal',        () => sendRenewalAlert(to, sub, 3));
                await fire('otp',            () => sendOtpEmail(to, '482916'));
                await fire('free-trial',     () => sendFreeTrialEndingAlert(to, sub, 2));
                await fire('failed-payment', () => sendFailedPaymentAlert(to, sub));
                await fire('price-increase', () => sendPriceIncreaseAlert(to, sub, sub.cost, sub.cost + 50, dayjs().add(7, 'day').toDate()));
                await fire('weekly-summary', () => sendWeeklySummary(to, user.name, [sub], sub.cost));
                await fire('budget',         () => sendBudgetAlert(to, user.name, sub.cost * 0.85, sub.cost, 85));
                await fire('new-sub',        () => sendNewSubscriptionAlert(to, user.name, sub));
                await fire('overdue',        () => sendOverdueEmail({ ...sub, userEmail: to }));
                break;
            default:
                return res.status(400).json({ error: `Unknown type "${type}". GET /api/test/emails for the list.` });
        }

        const allOk = results.every(r => r.status === 'sent');
        res.status(allOk ? 200 : 207).json({
            to,
            usingRealData: !!realSub,
            results,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/test/cron/:job — manually trigger a cron job ──────────────────
router.post('/cron/:job', async (req, res) => {
    const jobMap = {
        'renewal-alerts':    runSubscriptionAlerts,
        'overdue-alerts':    runOverdueAlerts,
        'free-trial-alerts': runFreeTrialAlerts,
        'weekly-summary':    cronWeeklySummary,
        'budget-alerts':     runBudgetAlerts,
        // gmail-sync is async and heavy, expose only on explicit request
        'gmail-sync':        runDailyGmailSync,
    };

    const fn = jobMap[req.params.job];
    if (!fn) {
        return res.status(400).json({
            error: `Unknown job "${req.params.job}".`,
            available: Object.keys(jobMap),
        });
    }

    console.log(`[TEST] Manually triggering cron job: ${req.params.job}`);
    try {
        await fn();
        res.json({ job: req.params.job, status: 'completed' });
    } catch (err) {
        res.status(500).json({ job: req.params.job, status: 'failed', error: err.message });
    }
});

module.exports = router;
