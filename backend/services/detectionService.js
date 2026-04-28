/**
 * Detection Service
 * Logic for identifying subscriptions from plain text and extracting billing details.
 */

/**
 * Detects if an email content matches a supported subscription service.
 * Supports: Netflix, Spotify, Amazon (with strict order/shipping filtering).
 */
function detectSubscription(from, content) {
  const services = ['netflix', 'spotify', 'amazon'];
  const foundService = services.find(s => content.includes(s));

  // Early exit: Skip all heavy keyword matching if no supported service is found
  if (!foundService) {
    return { isSubscription: false, service: null, debug: { hasService: false } };
  }

  const genericExclusions = ['order', 'shipped', 'delivery', 'arriving', 'dispatch', 'track package'];
  const hasExclusion = genericExclusions.some(k => content.includes(k));

  const debug = { hasService: true, hasExclusion };

  // Handle Amazon specifically (Stricter rules to avoid order false positives)
  if (foundService === 'amazon') {
    const amazonSubscriptionKeywords = ["prime membership", "amazon prime", "membership renewal", "subscription renewal", "prime renewal"];
    const hasAmazonSubscription = amazonSubscriptionKeywords.some(k => content.includes(k));

    debug.hasAmazonSubscriptionKeyword = hasAmazonSubscription;

    // ✅ Step 1 — Strong Subscription Signal wins ALWAYS
    if (hasAmazonSubscription) return { isSubscription: true, service: "Amazon", debug };
    
    return { isSubscription: false, service: null, debug };
  }

  // Handle Netflix / Spotify
  const strongBilling = ['renewal', 'auto-renew', 'subscription', 'membership', 'billed', 'monthly', 'yearly'];
  const hasStrongBilling = strongBilling.some(k => content.includes(k));
  debug.hasStrongBilling = hasStrongBilling;

  if (hasStrongBilling) {
    return {
      isSubscription: true,
      service: foundService.charAt(0).toUpperCase() + foundService.slice(1),
      debug
    };
  }

  return { isSubscription: false, service: null, debug };
}

/**
 * Extracts Indian Rupee (₹) amounts.
 */
function extractINR(text) {
  if (!text) return { amount: null, currency: null };
  const amountMatch = text.match(/₹\s?[\d,.]+/);
  const amount = amountMatch ? amountMatch[0].replace(/\s+/g, '') : null;
  const currency = amount ? 'INR' : null;
  return { amount, currency };
}

/**
 * Extracts billing dates (e.g., "May 10").
 * Prioritizes dates near keywords like "next", "renewal".
 */
function extractBillingDate(text) {
  if (!text) return null;

  // Extremely fast context-aware regex: looks for a date within 80 characters AFTER a billing keyword
  const priorityRegex = /(?:next|renew|renewal|billing|due).{0,80}?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{1,2}|\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)/i;
  
  const matchContext = text.match(priorityRegex);
  if (matchContext) return matchContext[1];

  // Fallback: Just grab the first date seen
  const fb1 = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{1,2}/i;
  const fb2 = /\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i;
  
  const match = text.match(fb1) || text.match(fb2);
  return match ? match[0] : null;
}

/**
 * Basic text normalization for keyword matching.
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  detectSubscription,
  extractINR,
  extractBillingDate,
  normalizeText
};
