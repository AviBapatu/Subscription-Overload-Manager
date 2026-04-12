const dayjs = require('dayjs');

/* ─── Shared layout wrapper ──────────────────────────────────────────────────
 *  All templates use this base for a consistent brand look.
 *  Accent color is the blue #4A6BFF matching the app's primary token.
 * ─────────────────────────────────────────────────────────────────────────── */
const wrap = (accentColor, iconEmoji, title, bodyHTML) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #F0F4F8; padding: 40px 16px; color: #1A1F2C; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .brand   { text-align: center; margin-bottom: 24px; }
    .brand-name { font-size: 14px; font-weight: 700; letter-spacing: 0.08em;
                  color: #5A6376; text-transform: uppercase; }
    .card    { background: #ffffff; border-radius: 20px;
               box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden; }
    .header  { background: ${accentColor}; padding: 36px 40px 32px; text-align: center; }
    .icon    { font-size: 40px; margin-bottom: 16px; display: block; }
    .title   { font-size: 22px; font-weight: 800; color: #ffffff;
               letter-spacing: -0.02em; line-height: 1.3; }
    .body    { padding: 32px 40px; }
    .footer  { background: #F8F9FA; border-top: 1px solid #E9ECF5;
               padding: 20px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #8E95A4; line-height: 1.6; }
    .footer a { color: #4A6BFF; text-decoration: none; }
    .btn     { display: inline-block; margin-top: 24px; padding: 14px 32px;
               background: ${accentColor}; color: #ffffff; font-weight: 700;
               font-size: 14px; border-radius: 50px; text-decoration: none;
               letter-spacing: 0.02em; }
    .badge   { display: inline-block; background: #EEF0F8; border-radius: 12px;
               padding: 12px 20px; margin: 16px 0; }
    .badge-amount { font-size: 30px; font-weight: 900; color: ${accentColor};
                    letter-spacing: -0.02em; }
    .badge-label  { font-size: 12px; color: #5A6376; font-weight: 600;
                    text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
    .meta-row   { display: flex; justify-content: space-between; align-items: center;
                  padding: 12px 0; border-bottom: 1px solid #F0F4F8; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { font-size: 13px; color: #5A6376; font-weight: 600; }
    .meta-value { font-size: 13px; color: #1A1F2C; font-weight: 700; }
    .otp-box    { text-align: center; background: #EEF0F8; border-radius: 16px;
                  padding: 24px; margin: 20px 0; }
    .otp-code   { font-size: 40px; font-weight: 900; letter-spacing: 8px;
                  color: ${accentColor}; font-variant-numeric: tabular-nums; }
    .tag        { display: inline-block; padding: 4px 12px; border-radius: 50px;
                  font-size: 12px; font-weight: 700; background: #EEF0F8; color: #5A6376; }
    p  { font-size: 15px; color: #5A6376; line-height: 1.7; }
    h3 { font-size: 16px; font-weight: 700; color: #1A1F2C; margin-bottom: 4px; }
    .chip-row   { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .chip       { background: #EEF0F8; border-radius: 50px; padding: 6px 14px;
                  font-size: 13px; font-weight: 600; color: #1A1F2C; }
    .chip.warn  { background: #FFF3CD; color: #856404; }
    .chip.danger{ background: #FFE8E8; color: #C0392B; }
    .chip.green { background: #E8F8F0; color: #1A7A4A; }
    .divider    { border: none; border-top: 1px solid #F0F4F8; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="brand"><span class="brand-name">Subscription Concierge</span></div>
    <div class="card">
      <div class="header">
        <span class="icon">${iconEmoji}</span>
        <div class="title">${title}</div>
      </div>
      <div class="body">${bodyHTML}</div>
      <div class="footer">
        <p>
          You're receiving this because you enabled alerts in your
          <a href="#">Subscription Concierge</a> account.<br/>
          <a href="#">Manage Preferences</a> &nbsp;·&nbsp; <a href="#">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

/* ───────────────────────────────────────────────────────────────────────────
 *  1. RENEWAL ALERT — sent N days before next billing date
 * ─────────────────────────────────────────────────────────────────────────── */
const getRenewalAlertHTML = (sub, daysUntil = null) => {
    const formattedDate = dayjs(sub.nextBillingDate).format('MMMM D, YYYY');
    const dayLabel = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;

    const body = `
    <h3>Heads up — ${sub.serviceName} renews ${dayLabel}</h3>
    <p style="margin-top:8px;">Your <strong>${sub.serviceName}</strong> subscription is set to renew on <strong>${formattedDate}</strong>. Make sure your payment method is up to date.</p>
    <div class="badge" style="text-align:center; width:100%;">
      <div class="badge-amount">$${sub.cost.toFixed(2)}</div>
      <div class="badge-label">${sub.billingCycle || 'Monthly'} charge</div>
    </div>
    <hr class="divider"/>
    <div class="meta-row"><span class="meta-label">Service</span><span class="meta-value">${sub.serviceName}</span></div>
    <div class="meta-row"><span class="meta-label">Category</span><span class="meta-value">${sub.category || 'Uncategorized'}</span></div>
    <div class="meta-row"><span class="meta-label">Next Billing</span><span class="meta-value">${formattedDate}</span></div>
    <div class="meta-row"><span class="meta-label">Amount</span><span class="meta-value">$${sub.cost.toFixed(2)}</span></div>
    <div style="text-align:center;">
      <a class="btn" href="#">View in Dashboard →</a>
    </div>`;

    return wrap('#4A6BFF', '🔔', `${sub.serviceName} Renews ${dayLabel}`, body);
};

/* ───────────────────────────────────────────────────────────────────────────
 *  2. OTP / PASSWORD RESET
 * ─────────────────────────────────────────────────────────────────────────── */
const getOtpEmailHTML = (otp) => {
    const body = `
    <p>We received a request to reset the password for your account. Use the code below — it expires in <strong>10 minutes</strong>.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <p style="margin-top:8px; font-size:12px;">One-time code — do not share</p>
    </div>
    <p style="font-size:13px; color:#8E95A4;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>`;

    return wrap('#4A6BFF', '🔐', 'Password Reset Request', body);
};

/* ───────────────────────────────────────────────────────────────────────────
 *  3. FREE TRIAL ENDING — sent before trial converts to paid
 * ─────────────────────────────────────────────────────────────────────────── */
const getFreeTrialEndingHTML = (sub, daysLeft) => {
    const formattedDate = dayjs(sub.nextBillingDate).format('MMMM D, YYYY');

    const body = `
    <h3>Your ${sub.serviceName} free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</h3>
    <p style="margin-top:8px;">After <strong>${formattedDate}</strong>, you'll automatically be charged unless you cancel.</p>
    <div class="badge" style="text-align:center; width:100%;">
      <div class="badge-amount">$${sub.cost.toFixed(2)}</div>
      <div class="badge-label">First charge after trial</div>
    </div>
    <hr class="divider"/>
    <div class="meta-row"><span class="meta-label">Service</span><span class="meta-value">${sub.serviceName}</span></div>
    <div class="meta-row"><span class="meta-label">Trial Ends</span><span class="meta-value">${formattedDate}</span></div>
    <div class="meta-row"><span class="meta-label">Post-trial cost</span><span class="meta-value">$${sub.cost.toFixed(2)} / ${sub.billingCycle || 'month'}</span></div>
    <div class="chip-row">
      <span class="chip warn">⏳ Trial ending soon</span>
      <span class="chip">${sub.category || 'Subscription'}</span>
    </div>
    <div style="text-align:center;">
      <a class="btn" href="#" style="background:#F59E0B;">Review Before Charge →</a>
    </div>`;

    return wrap('#F59E0B', '⏳', `Trial Ending: ${sub.serviceName}`, body);
};

/* ───────────────────────────────────────────────────────────────────────────
 *  4. FAILED PAYMENT
 * ─────────────────────────────────────────────────────────────────────────── */
const getFailedPaymentHTML = (sub) => {
    const formattedDate = dayjs(sub.nextBillingDate).format('MMMM D, YYYY');

    const body = `
    <h3>Payment failed for ${sub.serviceName}</h3>
    <p style="margin-top:8px;">We attempted to charge <strong>$${sub.cost.toFixed(2)}</strong> for your ${sub.serviceName} subscription on <strong>${formattedDate}</strong> but the payment was declined.</p>
    <div class="badge" style="text-align:center; width:100%; background:#FFE8E8;">
      <div class="badge-amount" style="color:#C0392B;">$${sub.cost.toFixed(2)}</div>
      <div class="badge-label" style="color:#C0392B;">Payment failed</div>
    </div>
    <hr class="divider"/>
    <p style="font-size:13px;">Common causes: expired card, insufficient funds, or billing address mismatch. Update your payment method to avoid service interruption.</p>
    <div class="chip-row">
      <span class="chip danger">❌ Payment declined</span>
      <span class="chip">${sub.serviceName}</span>
    </div>
    <div style="text-align:center;">
      <a class="btn" href="#" style="background:#E74C3C;">Update Payment Method →</a>
    </div>`;

    return wrap('#E74C3C', '❌', 'Payment Failed', body);
};

/* ───────────────────────────────────────────────────────────────────────────
 *  5. PRICE INCREASE ALERT
 * ─────────────────────────────────────────────────────────────────────────── */
const getPriceIncreaseHTML = (sub, oldPrice, newPrice, effectiveDate) => {
    const diff = (newPrice - oldPrice).toFixed(2);
    const fmtDate = dayjs(effectiveDate).format('MMMM D, YYYY');

    const body = `
    <h3>${sub.serviceName} is increasing its price</h3>
    <p style="margin-top:8px;">Starting <strong>${fmtDate}</strong>, your ${sub.serviceName} plan will cost more. Here's what's changing:</p>
    <hr class="divider"/>
    <div class="meta-row"><span class="meta-label">Current Price</span><span class="meta-value" style="color:#1A7A4A;">$${parseFloat(oldPrice).toFixed(2)} / mo</span></div>
    <div class="meta-row"><span class="meta-label">New Price</span><span class="meta-value" style="color:#C0392B;">$${parseFloat(newPrice).toFixed(2)} / mo</span></div>
    <div class="meta-row"><span class="meta-label">Increase</span><span class="meta-value">+$${diff} / mo</span></div>
    <div class="meta-row"><span class="meta-label">Effective Date</span><span class="meta-value">${fmtDate}</span></div>
    <div class="chip-row">
      <span class="chip warn">📈 Price change</span>
      <span class="chip">${sub.category || 'Subscription'}</span>
    </div>
    <div style="text-align:center;">
      <a class="btn" href="#" style="background:#4A6BFF;">Review Subscription →</a>
    </div>`;

    return wrap('#4A6BFF', '📈', `Price Increase: ${sub.serviceName}`, body);
};

/* ───────────────────────────────────────────────────────────────────────────
 *  6. WEEKLY SUMMARY — list of upcoming charges for the week
 * ─────────────────────────────────────────────────────────────────────────── */
const getWeeklySummaryHTML = (userName, upcomingSubs, totalMonthly) => {
    const rows = upcomingSubs.map(sub => `
      <div class="meta-row">
        <span class="meta-label">${sub.serviceName} <span class="tag">${dayjs(sub.nextBillingDate).format('MMM D')}</span></span>
        <span class="meta-value">$${sub.cost.toFixed(2)}</span>
      </div>`).join('');

    const totalUpcoming = upcomingSubs.reduce((s, sub) => s + sub.cost, 0).toFixed(2);

    const body = `
    <h3>Hi ${userName || 'there'}, here's your weekly digest 👋</h3>
    <p style="margin-top:8px;">You have <strong>${upcomingSubs.length} subscription${upcomingSubs.length !== 1 ? 's' : ''}</strong> renewing this week, totalling <strong>$${totalUpcoming}</strong>.</p>
    <hr class="divider"/>
    ${rows}
    <hr class="divider"/>
    <div class="meta-row">
      <span class="meta-label" style="font-size:14px;">Total monthly spend</span>
      <span class="meta-value" style="font-size:16px; color:#4A6BFF;">$${totalMonthly.toFixed(2)}</span>
    </div>
    <div style="text-align:center;">
      <a class="btn" href="#">View Full Dashboard →</a>
    </div>`;

    return wrap('#4A6BFF', '📊', 'Your Weekly Subscription Summary', body);
};

/* ───────────────────────────────────────────────────────────────────────────
 *  7. BUDGET ALERT — when spend hits 80% of monthly cap
 * ─────────────────────────────────────────────────────────────────────────── */
const getBudgetAlertHTML = (userName, spentAmount, budgetAmount, percentage) => {
    const remaining = (budgetAmount - spentAmount).toFixed(2);
    const barColor = percentage >= 100 ? '#E74C3C' : percentage >= 80 ? '#F59E0B' : '#4A6BFF';

    const body = `
    <h3>You've reached ${percentage}% of your budget, ${userName || 'there'}</h3>
    <p style="margin-top:8px;">Your subscriptions have used <strong>$${spentAmount.toFixed(2)}</strong> of your <strong>$${budgetAmount.toFixed(2)}</strong> monthly cap.</p>
    <div style="margin:20px 0; background:#EEF0F8; border-radius:50px; height:12px; overflow:hidden;">
      <div style="width:${Math.min(percentage,100)}%; height:100%; background:${barColor}; border-radius:50px; transition:width 0.4s;"></div>
    </div>
    <div class="meta-row"><span class="meta-label">Spent</span><span class="meta-value" style="color:${barColor};">$${spentAmount.toFixed(2)}</span></div>
    <div class="meta-row"><span class="meta-label">Budget</span><span class="meta-value">$${budgetAmount.toFixed(2)}</span></div>
    <div class="meta-row"><span class="meta-label">Remaining</span><span class="meta-value" style="color:#1A7A4A;">$${remaining}</span></div>
    <div class="chip-row">
      <span class="chip ${percentage >= 100 ? 'danger' : 'warn'}">${percentage >= 100 ? '🔴 Over budget' : '🟡 Approaching limit'}</span>
    </div>
    <div style="text-align:center;">
      <a class="btn" href="#" style="background:${barColor};">Review Spending →</a>
    </div>`;

    return wrap(barColor, percentage >= 100 ? '🔴' : '💰', `Budget ${percentage >= 100 ? 'Exceeded' : 'Alert'}: ${percentage}% Used`, body);
};

/* ───────────────────────────────────────────────────────────────────────────
 *  8. NEW SUBSCRIPTION ADDED
 * ─────────────────────────────────────────────────────────────────────────── */
const getNewSubscriptionHTML = (userName, sub) => {
    const formattedDate = dayjs(sub.nextBillingDate).format('MMMM D, YYYY');

    const body = `
    <h3>New subscription added to your account</h3>
    <p style="margin-top:8px;">Hi ${userName || 'there'}, a new subscription was just added. If this wasn't you, review your account immediately.</p>
    <div class="badge" style="text-align:center; width:100%;">
      <div class="badge-amount">$${sub.cost.toFixed(2)}</div>
      <div class="badge-label">${sub.billingCycle || 'Monthly'}</div>
    </div>
    <hr class="divider"/>
    <div class="meta-row"><span class="meta-label">Service</span><span class="meta-value">${sub.serviceName}</span></div>
    <div class="meta-row"><span class="meta-label">Category</span><span class="meta-value">${sub.category || 'Uncategorized'}</span></div>
    <div class="meta-row"><span class="meta-label">First Billing</span><span class="meta-value">${formattedDate}</span></div>
    <div class="meta-row"><span class="meta-label">Amount</span><span class="meta-value">$${sub.cost.toFixed(2)} / ${sub.billingCycle || 'month'}</span></div>
    <div class="chip-row">
      <span class="chip green">✅ Active</span>
      <span class="chip">${sub.category || 'General'}</span>
    </div>
    <div style="text-align:center;">
      <a class="btn" href="#">View in Dashboard →</a>
    </div>`;

    return wrap('#4A6BFF', '✨', `New Subscription: ${sub.serviceName}`, body);
};

/* ─── Exports ──────────────────────────────────────────────────────────────── */
module.exports = {
    getRenewalAlertHTML,
    getOtpEmailHTML,
    getFreeTrialEndingHTML,
    getFailedPaymentHTML,
    getPriceIncreaseHTML,
    getWeeklySummaryHTML,
    getBudgetAlertHTML,
    getNewSubscriptionHTML,
};
