/**
 * testEmails.js — Manual smoke test for every email type.
 *
 * Usage (from the /backend directory):
 *   node scripts/testEmails.js [your-email@gmail.com]
 *
 * If no email is passed it reads TEST_EMAIL from .env.
 * Connects to MongoDB, fetches a real subscription if one exists,
 * then fires every email template and logs the result.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
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

const User         = require('../models/User');
const Subscription = require('../models/Subscription');

// ─── Target email ─────────────────────────────────────────────────────────────
const TO = process.argv[2] || process.env.TEST_EMAIL;
if (!TO) {
    console.error('❌  Provide a target email: node scripts/testEmails.js you@example.com');
    process.exit(1);
}

// ─── Synthetic test data (used when no real subscription is found) ─────────────
const MOCK_USER = { name: 'Test User', email: TO, timezone: 'Asia/Kolkata' };
const MOCK_SUB = {
    _id: 'test-id',
    serviceName: 'Netflix',
    cost: 649,
    billingCycle: 'MONTHLY',
    category: 'Entertainment',
    nextBillingDate: dayjs().add(3, 'day').toDate(),
    trialEndsAt: dayjs().add(2, 'day').toDate(),
    userEmail: TO,
    status: 'ACTIVE',
};

// ─── Runner ───────────────────────────────────────────────────────────────────
const run = async (label, fn) => {
    process.stdout.write(`  [${label}] Sending... `);
    try {
        await fn();
        console.log('✅  OK');
    } catch (err) {
        console.log(`❌  FAILED — ${err.message}`);
    }
};

(async () => {
    console.log(`\n🔌  Connecting to MongoDB...`);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  Connected\n');

    // Try to find real user + subscription; fall back to mocks
    const realUser = await User.findOne({ email: TO }).lean() || MOCK_USER;
    const realSub  = await Subscription.findOne({ userEmail: TO, status: 'ACTIVE' }).lean() || MOCK_SUB;

    console.log(`📬  Sending test emails to: ${TO}`);
    console.log(`📦  Using subscription: "${realSub.serviceName}" ($${realSub.cost})\n`);
    console.log('─'.repeat(55));

    await run('1. Renewal Alert        ', () => sendRenewalAlert(TO, realSub, 3));
    await run('2. OTP / Password Reset ', () => sendOtpEmail(TO, '482916'));
    await run('3. Free Trial Ending    ', () => sendFreeTrialEndingAlert(TO, realSub, 2));
    await run('4. Failed Payment       ', () => sendFailedPaymentAlert(TO, realSub));
    await run('5. Price Increase       ', () => sendPriceIncreaseAlert(TO, realSub, realSub.cost, realSub.cost + 50, dayjs().add(7, 'day').toDate()));
    await run('6. Weekly Summary       ', () => sendWeeklySummary(TO, realUser.name, [realSub], realSub.cost));
    await run('7. Budget Alert (80%)   ', () => sendBudgetAlert(TO, realUser.name, realSub.cost * 0.8, realSub.cost, 80));
    await run('8. New Subscription     ', () => sendNewSubscriptionAlert(TO, realUser.name, realSub));
    await run('9. Overdue Alert        ', () => sendOverdueEmail({ ...realSub, userEmail: TO }));

    console.log('─'.repeat(55));
    console.log('\n✅  All tests complete. Check your inbox!\n');

    await mongoose.disconnect();
    process.exit(0);
})().catch(err => {
    console.error('\n💥  Unexpected error:', err);
    process.exit(1);
});
