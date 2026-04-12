const { BrevoClient } = require('@getbrevo/brevo');
const { getOtpEmailHTML } = require('../templates/emailTemplates');

// Brevo API Configuration
const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

/**
 * Sends a transactional email using the Brevo API.
 * 
 * @param {string} to - The recipient's email address
 * @param {string} subject - The email subject line
 * @param {string} htmlContent - The fully compiled HTML body of the email
 */
const sendBrevoEmail = async (to, subject, htmlContent) => {
  const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'concierge@example.com';
  
  try {
    const data = await client.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent,
      sender: { name: "Subscription Concierge", email: SENDER_EMAIL },
      to: [{ email: to }],
      replyTo: { email: "no-reply@example.com", name: "No Reply" }
    });
    console.log(`[BREVO] Email dispatched successfully to ${to}. ID: ${data.messageId}`);
    return data;
  } catch (err) {
    console.error(`[BREVO] Error sending email to ${to}:`, err.response?.text || err.message);
    throw err;
  }
};

/**
 * Generates and sends an OTP email.
 * 
 * @param {string} to - The recipient's email
 * @param {string} otp - The plain text 6-digit OTP code
 */
const sendOtpEmail = async (to, otp) => {
    const htmlContent = getOtpEmailHTML(otp);
    return sendBrevoEmail(to, 'Password Reset Request', htmlContent);
};

module.exports = {
  sendBrevoEmail,
  sendOtpEmail
};
