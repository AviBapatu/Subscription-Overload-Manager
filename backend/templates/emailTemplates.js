const dayjs = require('dayjs');

/**
 * Generates the HTML string for a subscription renewal alert.
 * 
 * @param {Object} sub The subscription document
 * @returns {string} The fully compiled HTML email template
 */
const getRenewalAlertHTML = (sub) => {
    const formattedDate = dayjs(sub.nextBillingDate).format('MMMM D, YYYY');
    const formattedCost = sub.cost.toFixed(2);

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', sans-serif; background: #f0f4f8; margin: 0; padding: 40px; text-align: center; }
          .container { max-width: 600px; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin: 0 auto; }
          .header { color: #1a73e8; margin-top: 0; font-size: 24px; font-weight: 800; }
          .message { font-size: 16px; color: #4a5568; line-height: 1.6; }
          .highlight { font-weight: 700; color: #1a202c; }
          .cost-badge { background: #e8f0fe; color: #1a73e8; padding: 8px 16px; font-size: 20px; font-weight: 900; border-radius: 8px; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="header">Subscription Alert</h2>
          <p class="message">
            Your <span class="highlight">${sub.serviceName}</span> subscription is scheduled to renew on <span class="highlight">${formattedDate}</span>.
          </p>
          <div class="cost-badge">
            $${formattedCost}
          </div>
          <p class="message" style="margin-top: 30px; font-size: 12px; color: #a0aec0;">
            Manage your alerts in the Subscription Overload Manager dashboard.
          </p>
        </div>
      </body>
    </html>
    `;
};

module.exports = {
    getRenewalAlertHTML
};
