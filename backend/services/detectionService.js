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

  // Handle Amazon specifically (Stricter rules to avoid order false positives)
  if (foundService === 'amazon') {
    const amazonSubscriptionKeywords = ["prime membership", "amazon prime", "membership renewal", "subscription renewal", "prime renewal"];
    const hasAmazonSubscription = amazonSubscriptionKeywords.some(k => content.includes(k));

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

    return { isSubscription: false, service: null, debug };
  }

  // Handle Netflix / Spotify
  if (hasStrongBilling) {
    return {
      isSubscription: true,
      service: foundService.charAt(0).toUpperCase() + foundService.slice(1),
      debug
    };
  }

  if (hasExclusion || hasWeakBilling) {
    return { isSubscription: false, service: null, debug };
  }

  return { isSubscription: false, service: null, debug };
}

/**
 * Extracts Indian Rupee (₹) amounts.
 */
function extractINR(text) {
  if (!text) return { amount: null, currency: null };
  const amountMatch = text.match(/₹\s?[\d,]+/);
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

  const lines = text.split('\n');
  const priorityKeywords = ['next', 'renew', 'renewal', 'billing', 'due'];
  
  const dateRegex1 = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{1,2}/gi;
  const dateRegex2 = /\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/gi;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    let kwIndex = -1;
    for (const kw of priorityKeywords) {
      const idx = lowerLine.indexOf(kw);
      if (idx !== -1) { kwIndex = idx; break; }
    }

    if (kwIndex !== -1) {
      const matches = [];
      let m;
      dateRegex1.lastIndex = 0;
      while ((m = dateRegex1.exec(line)) !== null) matches.push({ text: m[0], index: m.index });
      dateRegex2.lastIndex = 0;
      while ((m = dateRegex2.exec(line)) !== null) matches.push({ text: m[0], index: m.index });

      if (matches.length > 0) {
        let closest = matches[0];
        let minDiff = Math.abs(matches[0].index - kwIndex);
        for (let i = 1; i < matches.length; i++) {
          const diff = Math.abs(matches[i].index - kwIndex);
          if (diff < minDiff) { minDiff = diff; closest = matches[i]; }
        }
        return closest.text;
      }
    }
  }

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
