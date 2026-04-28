const { google } = require('googleapis');
const { htmlToText } = require('html-to-text');
const detectionService = require('./detectionService');
const { extractSubscriptionWithLLM } = require('./llmService');

/**
 * Recursively extracts the HTML body from a Gmail message payload.
 */
function getEmailBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/html' && payload.body && payload.body.data) {
    const data = payload.body.data;
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  }
  if (payload.parts && payload.parts.length > 0) {
    for (const part of payload.parts) {
      const html = getEmailBody(part);
      if (html) return html;
    }
  }
  return '';
}

/**
 * Syncs subscriptions from Gmail for a given access token.
 */
async function syncFromGmail(accessToken, userId) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth });

  // 1. Fetch matching messages
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 20,
    q: '(invoice OR receipt OR subscription OR payment OR renewal) newer_than:30d'
  });

  const messages = listResponse.data.messages || [];
  const suggestions = [];

  // Part 4: Per-sync LLM rate limit — max 5 LLM calls per Gmail scan
  // Prevents runaway API costs if inbox has many billing emails
  let llmCalls = 0;
  const MAX_LLM_CALLS = 5;

  const User = require('../models/User');
  const user = await User.findById(userId);
  const userEmailStr = user?.email?.toLowerCase() || '';

  for (const msg of messages) {
    const msgDetails = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full'
    });

    const payload = msgDetails.data.payload;
    const headers = payload.headers;
    const snippet = msgDetails.data.snippet || '';
    
    let subject = 'No Subject';
    let from = 'Unknown Sender';
    for (const header of headers) {
      if (header.name.toLowerCase() === 'subject') subject = header.value;
      if (header.name.toLowerCase() === 'from') from = header.value;
    }

    // SKIP emails sent by the user themselves
    if (userEmailStr && from.toLowerCase().includes(userEmailStr)) {
      console.log(`[SCAN] SKIP (sent by self): "${subject}"`);
      continue;
    }

    // Debug: confirm each email entering the pipeline
    console.log(`[SCAN] Processing email: "${subject}" | from: ${from}`);

    // 2. Extract and Clean Text
    let rawText = '';
    const htmlBody = getEmailBody(payload);
    if (htmlBody) {
      const text = htmlToText(htmlBody, { wordwrap: 130 });
      rawText = text
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\[https?:\/\/[^\]]+\]/g, '')
        .replace(/\n\s*\n/g, '\n')
        .replace(/[^\S\r\n]+/g, ' ')
        .trim();
    }

    // 3. Normalize for parsing
    const fullText = detectionService.normalizeText(`${subject} ${rawText} ${snippet}`);

    // 4. Run Detection
    const { isSubscription, service, debug } = detectionService.detectSubscription(from, fullText);

    if (isSubscription) {
      const { amount, currency } = detectionService.extractINR(fullText);
      const nextBillingDate = detectionService.extractBillingDate(fullText);

      suggestions.push({
        userId,
        emailId: msg.id,
        serviceName: service,
        cost: amount ? parseFloat(amount.replace(/₹|,/g, '')) : 0,
        currency: currency || 'INR',
        billingCycle: 'MONTHLY',
        nextBillingDate: nextBillingDate || new Date(),
        status: 'SUGGESTED',
        confidence: 0.9,
        source: 'heuristic',
        debug,
        emailSubject: subject,
        emailSnippet: snippet
      });
      console.log(`[HEURISTIC] Matched: "${service}" | subject: "${subject}"`);

    } else {
      // ── LLM Fallback: run only if email looks billing-related ──────────────
      //
      // EXPANDED keyword list — covers Notion, Dropbox, Razorpay, generic SaaS,
      // Indian payment gateways and UPI confirmation emails.
      const billingKeywords = [
        'subscription', 'invoice', 'receipt', 'renewal', 'renew',
        'monthly', 'yearly', 'annual', 'payment', 'billed', 'billing',
        'charge', 'charged', 'membership', 'plan', 'plan renewed',
        'auto-debit', 'auto debit', 'deducted', 'debited', 'transaction',
        'razorpay', 'paytm', 'upi', 'order confirmed'
      ];
      const isLikelyBilling = billingKeywords.some(kw => fullText.includes(kw));

      console.log(`[SCAN] Heuristic: no match | isLikelyBilling: ${isLikelyBilling} | subject: "${subject}"`);

      if (isLikelyBilling) {
        // Rate limit check — skip LLM if cap reached
        if (llmCalls >= MAX_LLM_CALLS) {
          console.warn(`[LLM] Rate limit reached (${MAX_LLM_CALLS}/sync) — skipping email ${msg.id}`);
        } else {
          try {
            llmCalls++;
            console.log("👉 Calling LLM...");
            const llmResult = await extractSubscriptionWithLLM(fullText);
            console.log("LLM RESULT:", llmResult);

            if (llmResult && llmResult.service) {
              const suggestion = {
                userId,
                emailId: msg.id,
                serviceName: llmResult.service.trim(),
                service: llmResult.service.trim(),
                cost: Number(llmResult.amount) || 0,
                billingCycle: 'MONTHLY',
                nextBillingDate: llmResult.nextBillingDate ? new Date(llmResult.nextBillingDate) : new Date(),
                status: "SUGGESTED",
                source: "llm",
                confidence: typeof llmResult.confidence === 'number' ? llmResult.confidence : 0.7,
                debug: { ...debug, llm: true },
                emailSubject: subject,
                emailSnippet: snippet
              };

              suggestions.push(suggestion);
              console.log("✅ Added LLM suggestion:", suggestion.serviceName);
            } else {
              console.log(`[LLM] No usable result for: "${subject}"`);
            }
          } catch (llmErr) {
            console.error(`[LLM] Failed for email ${msg.id}:`, llmErr.message);
          }
        }
      } else {
        console.log(`[SCAN] SKIP (not billing-related): "${subject}"`);
      }
    }
  }

  console.log("TOTAL SUGGESTIONS:", suggestions.length);
  return suggestions;
}

/**
 * Automatically fetch a fresh access token using a refresh token and run sync.
 */
async function runBackgroundSync(userId) {
  const User = require('../models/User');
  const Subscription = require('../models/Subscription');
  const user = await User.findById(userId);

  if (!user || !user.googleRefreshToken) {
    console.log(`[BACKGROUND SYNC] Skipped for user ${userId} - No refresh token.`);
    return;
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID?.trim(),
      process.env.GOOGLE_CLIENT_SECRET?.trim()
    );

    auth.setCredentials({ refresh_token: user.googleRefreshToken });
    
    // This automatically fetches a new access token
    const { token } = await auth.getAccessToken();

    if (!token) {
      console.log(`[BACKGROUND SYNC] Failed to get access token for user ${userId}`);
      return;
    }

    console.log(`[BACKGROUND SYNC] Running sync for user ${userId}...`);
    const detected = await syncFromGmail(token, userId);

    user.lastGmailSync = new Date();
    await user.save();

    let newCount = 0;
    for (const item of detected) {
        if (item.emailId) {
            const existsByEmail = await Subscription.findOne({ emailId: item.emailId });
            if (existsByEmail) continue;
        }

        const serviceName = item.serviceName || item.service;
        if (!serviceName || typeof serviceName !== "string") continue;

        const amount = Number(item.cost || item.amount);
        if (isNaN(amount) || amount <= 0) continue;

        const date = new Date(item.nextBillingDate);
        if (isNaN(date.getTime())) continue;

        // 2. Strong Duplicate Protection (Service Name check)
        const exists = await Subscription.findOne({
            userId,
            serviceName: { $regex: new RegExp(`^${serviceName.trim()}$`, 'i') },
            status: { $in: ['ACTIVE', 'SUGGESTED', 'PAUSED'] }
        });

        if (exists) continue;

        const sub = new Subscription({
            ...item,
            userId,
            serviceName: serviceName,
            cost: amount,
            nextBillingDate: date,
            status: "SUGGESTED",
            userEmail: user.email,
            userPhone: user.phoneNumber,
            userTimezone: user.timezone,
            notifyViaEmail: user.preferences?.notifyViaEmail,
            notifyViaWhatsApp: user.preferences?.notifyViaWhatsApp
        });

        await sub.save();
        newCount++;
    }

    console.log(`[BACKGROUND SYNC] Finished for user ${userId}. Added ${newCount} new subscriptions.`);
  } catch (err) {
    console.error(`[BACKGROUND SYNC] Error for user ${userId}:`, err.message);
  }
}

module.exports = {
  syncFromGmail,
  runBackgroundSync
};
