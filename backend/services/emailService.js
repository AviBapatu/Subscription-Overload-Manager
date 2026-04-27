const nodemailer = require('nodemailer');
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

const SENDER_EMAIL = process.env.GMAIL_USER;
const SENDER_NAME  = 'Subscription Concierge';

/* ─── Gmail SMTP transporter ─────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,   // Gmail App Password (16 chars, no spaces)
    },
});

/* ─── Core send function ─────────────────────────────────────────────────── */
const sendEmail = async (to, subject, htmlContent) => {
    try {
        const info = await transporter.sendMail({
            from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
            to,
            subject,
            html: htmlContent,
            replyTo: SENDER_EMAIL,
        });
        console.log(`[MAIL] ✓ Sent "${subject}" to ${to}. ID: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error(`[MAIL] ✗ Failed to send to ${to}:`, err.message);
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
    sendEmail(to, `Reminder: ${sub.serviceName} renews ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}`, getRenewalAlertHTML(sub, daysUntil));

/**
 * OTP for password reset.
 * @param {string} to
 * @param {string} otp - plain-text 6-digit code
 */
const sendOtpEmail = (to, otp) =>
    sendEmail(to, 'Password Reset Request', getOtpEmailHTML(otp));

/**
 * Free trial ending alert.
 * @param {string} to
 * @param {Object} sub
 * @param {number} daysLeft - days until trial converts to paid
 */
const sendFreeTrialEndingAlert = (to, sub, daysLeft) =>
    sendEmail(to, `⏳ Your ${sub.serviceName} trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, getFreeTrialEndingHTML(sub, daysLeft));

/**
 * Failed payment notification.
 * @param {string} to
 * @param {Object} sub
 */
const sendFailedPaymentAlert = (to, sub) =>
    sendEmail(to, `❌ Payment failed for ${sub.serviceName}`, getFailedPaymentHTML(sub));

/**
 * Price increase notification.
 * @param {string} to
 * @param {Object} sub
 * @param {number} oldPrice
 * @param {number} newPrice
 * @param {string|Date} effectiveDate - when the new price kicks in
 */
const sendPriceIncreaseAlert = (to, sub, oldPrice, newPrice, effectiveDate) =>
    sendEmail(to, `📈 ${sub.serviceName} is increasing its price`, getPriceIncreaseHTML(sub, oldPrice, newPrice, effectiveDate));

/**
 * Sunday weekly digest.
 * @param {string} to
 * @param {string} userName
 * @param {Array}  upcomingSubs - array of sub docs renewing this week
 * @param {number} totalMonthly - total monthly spend across all subs
 */
const sendWeeklySummary = (to, userName, upcomingSubs, totalMonthly) =>
    sendEmail(to, '📊 Your Weekly Subscription Summary', getWeeklySummaryHTML(userName, upcomingSubs, totalMonthly));

/**
 * Budget threshold alert (80% or 100%).
 * @param {string} to
 * @param {string} userName
 * @param {number} spentAmount
 * @param {number} budgetAmount
 * @param {number} percentage - e.g. 80 or 100
 */
const sendBudgetAlert = (to, userName, spentAmount, budgetAmount, percentage) =>
    sendEmail(to, `💰 Budget Alert: You've used ${percentage}% of your limit`, getBudgetAlertHTML(userName, spentAmount, budgetAmount, percentage));

/**
 * New subscription added confirmation.
 * @param {string} to
 * @param {string} userName
 * @param {Object} sub
 */
const sendNewSubscriptionAlert = (to, userName, sub) =>
    sendEmail(to, `✨ New subscription added: ${sub.serviceName}`, getNewSubscriptionHTML(userName, sub));

/**
 * Overdue payment alert.
 * @param {Object} sub - subscription document
 */
const sendOverdueEmail = (sub) => {
    const { getOverdueAlertHTML } = require('../templates/emailTemplates');
    return sendEmail(sub.userEmail, `⚠️ Overdue Alert: ${sub.serviceName}`, getOverdueAlertHTML(sub));
};

/* ─── Exports ─────────────────────────────────────────────────────────────── */
module.exports = {
    sendEmail,
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
