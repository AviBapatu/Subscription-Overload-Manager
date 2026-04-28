/**
 * controllers/testController.js
 *
 * Development-only controller for manual email and cron-job triggers.
 * All business logic extracted from routes/testEmails.js.
 */

const dayjs = require('dayjs');
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

// ─── Helper: build a mock subscription for a given email address ──────────────
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

// ─── Helper: run an email function and capture success/failure ────────────────
const fire = async (results, label, fn) => {
    try {
        await fn();
        results.push({ email: label, status: 'sent' });
    } catch (err) {
        results.push({ email: label, status: 'failed', error: err.message });
    }
};

// ─────────────────────────────────────────
// GET /api/test/emails
// Returns the list of available email types and cron jobs that can be triggered.
// ─────────────────────────────────────────
exports.listEmailTypes = (req, res) => {
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
            { job: 'renewal-alerts',    description: 'Run subscription renewal check' },
            { job: 'overdue-alerts',    description: 'Run overdue payment check' },
            { job: 'free-trial-alerts', description: 'Run free trial ending check' },
            { job: 'weekly-summary',    description: 'Run weekly summary dispatch' },
            { job: 'budget-alerts',     description: 'Run budget 80% check' },
            { job: 'gmail-sync',        description: 'Run Gmail auto-sync' },
        ],
    });
};

// ─────────────────────────────────────────
// POST /api/test/emails/:type
// Fires a specific email type to the provided address.
// Body: { to: "you@example.com", ...overrideFields }
// ─────────────────────────────────────────
exports.sendTestEmail = async (req, res) => {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: '`to` email is required in the request body.' });

    // Try to find real data for this email; fall back to mock data
    const realUser = await User.findOne({ email: to }).lean();
    const realSub  = await Subscription.findOne({ userEmail: to, status: 'ACTIVE' }).lean();
    const user = realUser || { name: 'Test User', email: to };
    const sub  = realSub  || buildMockSub(to);

    const { type } = req.params;
    const results = [];

    try {
        switch (type) {
            case 'renewal':
                await fire(results, 'renewal', () => sendRenewalAlert(to, sub, req.body.daysUntil ?? 3));
                break;
            case 'otp':
                await fire(results, 'otp', () => sendOtpEmail(to, req.body.otp ?? '482916'));
                break;
            case 'free-trial':
                await fire(results, 'free-trial', () => sendFreeTrialEndingAlert(to, sub, req.body.daysLeft ?? 2));
                break;
            case 'failed-payment':
                await fire(results, 'failed-payment', () => sendFailedPaymentAlert(to, sub));
                break;
            case 'price-increase':
                await fire(results, 'price-increase', () => sendPriceIncreaseAlert(
                    to, sub,
                    req.body.oldPrice ?? sub.cost,
                    req.body.newPrice ?? sub.cost + 50,
                    req.body.effectiveDate ?? dayjs().add(7, 'day').toDate()
                ));
                break;
            case 'weekly-summary':
                await fire(results, 'weekly-summary', () => sendWeeklySummary(to, user.name, [sub], sub.cost));
                break;
            case 'budget':
                await fire(results, 'budget', () => sendBudgetAlert(
                    to, user.name,
                    req.body.spent      ?? sub.cost * 0.85,
                    req.body.budget     ?? sub.cost,
                    req.body.percentage ?? 85
                ));
                break;
            case 'new-sub':
                await fire(results, 'new-sub', () => sendNewSubscriptionAlert(to, user.name, sub));
                break;
            case 'overdue':
                await fire(results, 'overdue', () => sendOverdueEmail({ ...sub, userEmail: to }));
                break;
            case 'all':
                await fire(results, 'renewal',        () => sendRenewalAlert(to, sub, 3));
                await fire(results, 'otp',            () => sendOtpEmail(to, '482916'));
                await fire(results, 'free-trial',     () => sendFreeTrialEndingAlert(to, sub, 2));
                await fire(results, 'failed-payment', () => sendFailedPaymentAlert(to, sub));
                await fire(results, 'price-increase', () => sendPriceIncreaseAlert(to, sub, sub.cost, sub.cost + 50, dayjs().add(7, 'day').toDate()));
                await fire(results, 'weekly-summary', () => sendWeeklySummary(to, user.name, [sub], sub.cost));
                await fire(results, 'budget',         () => sendBudgetAlert(to, user.name, sub.cost * 0.85, sub.cost, 85));
                await fire(results, 'new-sub',        () => sendNewSubscriptionAlert(to, user.name, sub));
                await fire(results, 'overdue',        () => sendOverdueEmail({ ...sub, userEmail: to }));
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
};

// ─────────────────────────────────────────
// POST /api/test/cron/:job
// Manually triggers a named cron job function.
// ─────────────────────────────────────────
exports.triggerCronJob = async (req, res) => {
    const jobMap = {
        'renewal-alerts':    runSubscriptionAlerts,
        'overdue-alerts':    runOverdueAlerts,
        'free-trial-alerts': runFreeTrialAlerts,
        'weekly-summary':    cronWeeklySummary,
        'budget-alerts':     runBudgetAlerts,
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
};
