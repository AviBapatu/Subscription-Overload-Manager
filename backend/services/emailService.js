const { BrevoClient } = require('@getbrevo/brevo');
const {
    getRenewalAlertHTML,
    getOtpEmailHTML,
    getFreeTrialEndingHTML,
    getFailedPaymentHTML,
    getPriceIncreaseHTML,
    getWeeklySummaryHTML,
    getBudgetAlertHTML,
    getNewSubscriptionHTML,
} = require('../templates/emailTemplates');

const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'concierge@example.com';

/* ─── Core Brevo dispatch ─────────────────────────────────────────────────── */
const sendBrevoEmail = async (to, subject, htmlContent) => {
    try {
        const data = await client.transactionalEmails.sendTransacEmail({
            subject,
            htmlContent,
            sender: { name: 'Subscription Concierge', email: SENDER_EMAIL },
            to: [{ email: to }],
            replyTo: { email: 'no-reply@example.com', name: 'No Reply' },
        });
        console.log(`[BREVO] ✓ Sent "${subject}" to ${to}. ID: ${data.messageId}`);
        return data;
    } catch (err) {
        console.error(`[BREVO] ✗ Failed to send to ${to}:`, err.response?.text || err.message);
        throw err;
    }
};

/* ─── Typed send helpers ──────────────────────────────────────────────────── */

/**
 * Upcoming renewal reminder.
 * @param {string} to - recipient email
 * @param {Object} sub - subscription document
 * @param {number} daysUntil - days until billing (0 = today, 1 = tomorrow, etc.)
 */
const sendRenewalAlert = (to, sub, daysUntil) =>
    sendBrevoEmail(to, `Reminder: ${sub.serviceName} renews ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}`, getRenewalAlertHTML(sub, daysUntil));

/**
 * OTP for password reset.
 * @param {string} to
 * @param {string} otp - plain-text 6-digit code
 */
const sendOtpEmail = (to, otp) =>
    sendBrevoEmail(to, 'Password Reset Request', getOtpEmailHTML(otp));

/**
 * Free trial ending alert.
 * @param {string} to
 * @param {Object} sub
 * @param {number} daysLeft - days until trial converts to paid
 */
const sendFreeTrialEndingAlert = (to, sub, daysLeft) =>
    sendBrevoEmail(to, `⏳ Your ${sub.serviceName} trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, getFreeTrialEndingHTML(sub, daysLeft));

/**
 * Failed payment notification.
 * @param {string} to
 * @param {Object} sub
 */
const sendFailedPaymentAlert = (to, sub) =>
    sendBrevoEmail(to, `❌ Payment failed for ${sub.serviceName}`, getFailedPaymentHTML(sub));

/**
 * Price increase notification.
 * @param {string} to
 * @param {Object} sub
 * @param {number} oldPrice
 * @param {number} newPrice
 * @param {string|Date} effectiveDate - when the new price kicks in
 */
const sendPriceIncreaseAlert = (to, sub, oldPrice, newPrice, effectiveDate) =>
    sendBrevoEmail(to, `📈 ${sub.serviceName} is increasing its price`, getPriceIncreaseHTML(sub, oldPrice, newPrice, effectiveDate));

/**
 * Sunday weekly digest.
 * @param {string} to
 * @param {string} userName
 * @param {Array}  upcomingSubs - array of sub docs renewing this week
 * @param {number} totalMonthly - total monthly spend across all subs
 */
const sendWeeklySummary = (to, userName, upcomingSubs, totalMonthly) =>
    sendBrevoEmail(to, '📊 Your Weekly Subscription Summary', getWeeklySummaryHTML(userName, upcomingSubs, totalMonthly));

/**
 * Budget threshold alert (80% or 100%).
 * @param {string} to
 * @param {string} userName
 * @param {number} spentAmount
 * @param {number} budgetAmount
 * @param {number} percentage - e.g. 80 or 100
 */
const sendBudgetAlert = (to, userName, spentAmount, budgetAmount, percentage) =>
    sendBrevoEmail(to, `💰 Budget Alert: You've used ${percentage}% of your limit`, getBudgetAlertHTML(userName, spentAmount, budgetAmount, percentage));

/**
 * New subscription added confirmation.
 * @param {string} to
 * @param {string} userName
 * @param {Object} sub
 */
const sendNewSubscriptionAlert = (to, userName, sub) =>
    sendBrevoEmail(to, `✨ New subscription added: ${sub.serviceName}`, getNewSubscriptionHTML(userName, sub));

/**
 * Overdue payment alert.
 * @param {Object} sub - subscription document
 */
const sendOverdueEmail = (sub) => {
    const { getOverdueAlertHTML } = require('../templates/emailTemplates');
    return sendBrevoEmail(sub.userEmail, `⚠️ Overdue Alert: ${sub.serviceName}`, getOverdueAlertHTML(sub));
};

/* ─── Exports ─────────────────────────────────────────────────────────────── */
module.exports = {
    sendBrevoEmail,
    sendOtpEmail,
    sendRenewalAlert,
    sendFreeTrialEndingAlert,
    sendFailedPaymentAlert,
    sendPriceIncreaseAlert,
    sendWeeklySummary,
    sendBudgetAlert,
    sendNewSubscriptionAlert,
    sendOverdueEmail,
};
