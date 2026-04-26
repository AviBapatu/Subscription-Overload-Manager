require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const { htmlToText } = require('html-to-text');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize OAuth2 client using google.auth.OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Store tokens in memory (just a variable for now)
let userTokens = null;

/**
 * Recursively extracts the HTML body from a Gmail message payload.
 * Falls back to snippet-based detection if HTML is not found.
 */
function getEmailBody(payload) {
  if (!payload) return '';

  // 1. If this part is HTML, decode and return it
  if (payload.mimeType === 'text/html' && payload.body && payload.body.data) {
    const data = payload.body.data;
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  }

  // 2. If it's multipart, recurse through all parts
  if (payload.parts && payload.parts.length > 0) {
    for (const part of payload.parts) {
      const html = getEmailBody(part);
      if (html) return html;
    }
  }

  return '';
}

/**
 * Detects if an email is a subscription from Netflix, Spotify, or Amazon.
 * Logic: Combine from + subject + text and check for service + billing keywords.
 */
/**
 * Detects if an email is a subscription from Netflix, Spotify, or Amazon.
 * Returns both the result and debug signals for understanding the classification.
 */
function detectSubscription(from, content) {
  const services = ['netflix', 'spotify', 'amazon'];
  const foundService = services.find(s => content.includes(s));

  const strongBilling = ['renewal', 'auto-renew', 'subscription', 'membership', 'billed', 'monthly', 'yearly'];
  const weakBilling = ['payment', 'purchase', 'receipt'];
  const genericExclusions = ['order', 'shipped', 'delivery', 'arriving', 'dispatch', 'track package'];

  const hasService = !!foundService;
  const hasStrongBilling = strongBilling.some(k => content.includes(k));
  const hasWeakBilling = weakBilling.some(k => content.includes(k));
  const hasExclusion = genericExclusions.some(k => content.includes(k));

  const debug = { hasService, hasStrongBilling, hasWeakBilling, hasExclusion };

  if (!foundService) {
    return { isSubscription: false, service: null, debug };
  }

  // Handle Amazon specifically (Stricter rules as requested)
  if (foundService === 'amazon') {
    const amazonSubscriptionKeywords = ["prime membership", "amazon prime", "membership renewal", "subscription renewal", "prime renewal"];
    const hasAmazonSubscription = amazonSubscriptionKeywords.some(k => content.includes(k));

    // Add specialized Amazon signals to debug object
    debug.hasAmazonSubscriptionKeyword = hasAmazonSubscription;
    debug.hasAmazonExclusionKeyword = hasExclusion;

    // ✅ Step 1 — Strong Subscription Signal wins ALWAYS
    if (hasAmazonSubscription) {
      return { isSubscription: true, service: "Amazon", debug };
    }

    // ❌ Step 2 — Only reject if NO strong subscription signal is present
    if (hasExclusion) {
      return { isSubscription: false, service: null, debug };
    }

    // Default → not subscription
    return { isSubscription: false, service: null, debug };
  }

  // Handle other services (Netflix, Spotify)
  // 1. Strong Subscription Signal
  if (hasStrongBilling) {
    return {
      isSubscription: true,
      service: foundService.charAt(0).toUpperCase() + foundService.slice(1),
      debug
    };
  }

  // 2. Reject if it's an exclusion OR a weak signal matching a known service
  if (hasExclusion || hasWeakBilling) {
    return { isSubscription: false, service: null, debug };
  }

  // Default
  return { isSubscription: false, service: null, debug };
}

/**
 * Extracts Indian Rupee (₹) amount from text.
 * Only supports INR, ignores other currencies.
 */
function extractINR(cleanText) {
  if (!cleanText) return { amount: null, currency: null };
  // Supports formats like ₹199, ₹1,999, ₹12,999
  const amountMatch = cleanText.match(/₹\s?[\d,]+/);
  const amount = amountMatch ? amountMatch[0].replace(/\s+/g, '') : null;
  const currency = amount ? 'INR' : null;
  return { amount, currency };
}

/**
 * Extracts billing date from text (e.g., "May 10" or "10 May").
 * Prioritizes dates closest to keywords like "next", "renewal", or "billing", 
 * regardless of whether they appear before or after the keyword.
 */
function extractBillingDate(cleanText) {
  if (!cleanText) return null;

  const lines = cleanText.split('\n');
  const priorityKeywords = ['next', 'renew', 'renewal', 'billing', 'due'];
  
  // Regex patterns (global to find all matches in a line)
  const dateRegex1 = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{1,2}/gi;
  const dateRegex2 = /\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/gi;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if any priority keyword is present in the line
    let kwIndex = -1;
    for (const kw of priorityKeywords) {
      const idx = lowerLine.indexOf(kw);
      if (idx !== -1) {
        kwIndex = idx;
        break; // Use the first keyword found in the line
      }
    }

    if (kwIndex !== -1) {
      // Find all date matches in this line
      const matches = [];
      let m;
      
      // Reset lastIndex for global regexes
      dateRegex1.lastIndex = 0;
      while ((m = dateRegex1.exec(line)) !== null) {
        matches.push({ text: m[0], index: m.index });
      }
      
      dateRegex2.lastIndex = 0;
      while ((m = dateRegex2.exec(line)) !== null) {
        matches.push({ text: m[0], index: m.index });
      }

      if (matches.length > 0) {
        // Find the date closest to the keyword index (either before or after)
        let closest = matches[0];
        let minDiff = Math.abs(matches[0].index - kwIndex);

        for (let i = 1; i < matches.length; i++) {
          const diff = Math.abs(matches[i].index - kwIndex);
          if (diff < minDiff) {
            minDiff = diff;
            closest = matches[i];
          }
        }
        return closest.text;
      }
    }
  }

  // 2. Fallback: Return the first date found anywhere in the text
  const fb1 = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{1,2}/i;
  const fb2 = /\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i;
  const match = cleanText.match(fb1) || cleanText.match(fb2);
  return match ? match[0] : null;
}

// ✅ ADD TEST CODE HERE (outside any route)
const testEmails = [
  {
    from: "Netflix <info@netflix.com>",
    subject: "Your monthly subscription has been billed",
    snippet: "Your plan has been renewed",
    cleanText: "Your plan has been renewed. Last payment: April 10. Next billing date: May 10. Amount charged: ₹199."
  },
  {
    from: "Spotify <no-reply@spotify.com>",
    subject: "Your Spotify Premium subscription payment",
    snippet: "Your premium membership renewed",
    cleanText: "Your monthly Spotify Premium subscription billed ₹119. Next billing date: June 5."
  },
  {
    from: "Amazon <no-reply@amazon.com>",
    subject: "Your order has been shipped",
    snippet: "Track your package",
    cleanText: "Your order #123 has been shipped. Delivery date: April 15. View your order details."
  },
  {
    from: "Amazon <no-reply@amazon.com>",
    subject: "Prime membership renewal – order processed",
    snippet: "Your membership continues",
    cleanText: "Your Prime membership renewal was processed. Membership fee: ₹1,499. Your next billing date is June 12."
  }
];

testEmails.forEach(email => {
  // Normalize text before processing
  const fullTextForParsing = `${email.subject} ${email.cleanText} ${email.snippet}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  
  const { isSubscription, service } = detectSubscription(email.from, fullTextForParsing);
  const { amount, currency } = extractINR(fullTextForParsing);
  const nextBillingDate = extractBillingDate(fullTextForParsing);

  console.log("-------------------");
  console.log("FROM:", email.from);
  console.log("DETECTED SERVICE:", service);
  console.log("IS SUBSCRIPTION:", isSubscription);
  console.log("AMOUNT:", amount || "Not found");
  console.log("CURRENCY:", currency || "N/A");
  console.log("BILLING DATE:", nextBillingDate || "Not found");
});

// GET /auth/google
app.get('/auth/google', (req, res) => {
  // Generate Google OAuth URL
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    prompt: 'consent'
  });
  
  // Redirect user to this URL
  res.redirect(url);
});

// GET /auth/google/callback
app.get('/auth/google/callback', async (req, res) => {
  // Get "code" from query params
  const { code } = req.query;
  
  // Handle missing code
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing from the query string' });
  }

  try {
    // Exchange code for tokens using oauth2Client.getToken(code)
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Scopes received:", tokens.scope);
    
    // Store tokens in memory
    userTokens = tokens;
    
    // Set credentials using oauth2Client.setCredentials()
    oauth2Client.setCredentials(userTokens);
    
    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Fetch emails with subscription-related query from the last 30 days
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      q: '(invoice OR receipt OR subscription OR payment OR renewal) newer_than:30d'
    });

    const messages = response.data.messages || [];
    const formattedEmails = [];

    // For each message
    for (const msg of messages) {
      // Fetch full message content
      const msgDetails = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });

      const payload = msgDetails.data.payload;
      const headers = payload.headers;
      
      let subject = 'No Subject';
      let from = 'Unknown Sender';
      
      // Extract Subject and From (from headers)
      for (const header of headers) {
        if (header.name.toLowerCase() === 'subject') subject = header.value;
        if (header.name.toLowerCase() === 'from') from = header.value;
      }
      
      // Extract Snippet (API provided summary)
      const snippet = msgDetails.data.snippet || '';

      // Extract and Clean Full Text
      let rawCleanText = '';
      let refinedText = '';
      try {
        const htmlBody = getEmailBody(payload);
        if (htmlBody) {
          const rawText = htmlToText(htmlBody, { wordwrap: 130 });
          
          // 1. Basic Cleaning (Full readable text)
          rawCleanText = rawText
            .replace(/https?:\/\/[^\s]+/g, '')        // Remove URLs
            .replace(/\[https?:\/\/[^\]]+\]/g, '')    // Remove image links [https://...]
            .replace(/\n\s*\n/g, '\n')                // Replace multiple newlines with single
            .replace(/[^\S\r\n]+/g, ' ')              // Replace multiple spaces with single (keep newlines)
            .trim();

          // 2. Refinement Step (Filtered for detection)
          const lines = rawCleanText.split('\n');
          const services = ['netflix', 'spotify', 'amazon'];
          const strongBilling = ['subscription', 'renewal', 'membership', 'billed', 'monthly', 'yearly'];
          const genericExclusions = ['application fee', 'exam fee', 'registration fee'];

          const filteredLines = lines.filter(line => {
            const trimmedLine = line.trim();
            const lowerLine = trimmedLine.toLowerCase();
            
            // Basic quality checks
            if (trimmedLine.length < 5) return false;
            if (genericExclusions.some(ge => lowerLine.includes(ge))) return false;

            const hasService = services.some(s => lowerLine.includes(s));
            const hasStrong = strongBilling.some(sb => lowerLine.includes(sb));
            const hasWeak = lowerLine.includes('payment');

            // Logic: Line must contain a Service AND (Strong Billing OR "payment")
            return hasService && (hasStrong || hasWeak);
          });

          refinedText = filteredLines.length > 0 ? filteredLines.join('\n') : rawCleanText;
        }
      } catch (err) {
        console.error(`Error extracting text for message ${msg.id}:`, err.message);
      }

      // 3. Normalization before detection and parsing
      const fullTextForParsing = `${subject} ${rawCleanText} ${snippet}`
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

      // Detection Logic - uses normalized text
      const { isSubscription, service, debug } = detectSubscription(from, fullTextForParsing);

      // Temporary Debug Logs
      console.log("-------------------");
      console.log("EMAIL SUBJECT:", subject);
      console.log("DETECTED SERVICE:", service);
      console.log("IS SUBSCRIPTION:", isSubscription);

      // Amount and Billing Date Extraction - Use normalized text
      const { amount, currency } = extractINR(fullTextForParsing);
      const nextBillingDate = extractBillingDate(fullTextForParsing);

      formattedEmails.push({
        from,
        subject,
        snippet,
        cleanText: rawCleanText || snippet, // Full cleaned version
        refinedText: refinedText || snippet, // Filtered version
        amount,
        currency,
        nextBillingDate,
        isSubscription,
        service,
        confidence: isSubscription ? 0.9 : null, // High confidence for known parser
        status: isSubscription ? "suggested" : null, // Prepared for user Accept/Ignore
        debug // For understanding why an email was classified
      });
    }

    // Output Logic: Filter only subscriptions by default, show all if ?all=true
    const showAll = req.query.all === 'true';
    if (showAll) {
      return res.json(formattedEmails);
    }

    const onlySubscriptions = formattedEmails.filter(email => email.isSubscription === true);
    res.json(onlySubscriptions);

  } catch (error) {
    // Handle token errors and log errors clearly
    console.error('Error during OAuth callback or Gmail API fetch:', error.message);
    res.status(500).json({ error: 'Failed to process Google OAuth callback', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Gmail API server is running on http://localhost:${PORT}`);
  console.log(`To start the flow, go to: http://localhost:${PORT}/auth/google`);
});
