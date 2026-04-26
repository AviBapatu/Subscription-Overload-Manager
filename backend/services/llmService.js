/**
 * LLM Fallback Service
 * Uses OpenAI GPT-4o-mini to extract subscription data from emails
 * that pass the heuristic filter but don't match any known service parsers.
 *
 * Hardening layers:
 *   1. Robust JSON extraction (brace-finding + fence stripping)
 *   2. Date normalization (midnight-anchored, consistent with classification system)
 *   3. Strict field validation (type checks, NaN guards, enum whitelist)
 *   4. API key guard (fail-fast with clear warning)
 *   5. Input size cap (2000 chars — prevents token overload)
 *   6. Trace logging (service / amount / date — never full email body)
 */

const OpenAI = require('openai');

let client = null;

// ─── Lazy client ────────────────────────────────────────────────────────────
function getClient() {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
}

// ─── Part 1: Robust JSON extractor ───────────────────────────────────────────
// Finds the first complete {...} block even when model adds preamble/postamble
function extractJsonBlock(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
}

// ─── Part 2: Date normalisation (midnight-anchored) ──────────────────────────
// Aligns with the classification system which uses setHours(0,0,0,0) for all comparisons
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Extracts subscription details from email text using LLM.
 *
 * Returns null if:
 *   - OPENAI_API_KEY is missing
 *   - LLM returns unparseable / invalid output
 *   - No service name could be confidently identified
 *
 * @param {string} text - Normalized email body + subject
 * @returns {Promise<{service, amount, currency, billingCycle, nextBillingDate}|null>}
 */
async function extractSubscriptionWithLLM(text) {
    // Part 4: API key safety — fail fast, don't confuse the caller
    if (!process.env.OPENAI_API_KEY) {
        console.warn('[LLM] Skipped — OPENAI_API_KEY not configured');
        return null;
    }

    // Part 5: Input safety — cap to 2000 chars to prevent token overload
    const safeText = text.slice(0, 2000);

    const prompt = `You are a strict and reliable data extraction engine.

Your task is to analyze an email and determine whether it represents a paid subscription, renewal, invoice, or recurring payment. If it does, extract structured subscription data.

You must prioritize accuracy over completeness.

-------------------------
STRICT RULES:
-------------------------
- Return ONLY valid JSON (no explanation, no text outside JSON)
- Do NOT guess or infer missing values
- If a field is unclear or not explicitly present, return null
- Amount must be a number only (no symbols like ₹, $, etc.)
- Currency must be a 3-letter ISO code (INR, USD, EUR, etc.)
- Dates must be in YYYY-MM-DD format if clearly available, otherwise null
- If the email is NOT clearly related to a subscription or recurring payment, return:
  { "isSubscription": false }

-------------------------
OUTPUT FORMAT:
-------------------------
{
  "isSubscription": boolean,
  "serviceName": string or null,
  "amount": number or null,
  "currency": string or null,
  "billingCycle": "monthly" | "yearly" | "weekly" | "unknown" | null,
  "nextBillingDate": string (YYYY-MM-DD) or null,
  "confidence": number (0 to 1)
}

-------------------------
DETECTION GUIDELINES:
-------------------------
Mark isSubscription = true ONLY if there is clear evidence of:
- recurring payment
- subscription renewal
- billing cycle (monthly/yearly/etc.)
- or a known subscription service (Netflix, Spotify, etc.)

Indicators include words like:
"subscription", "invoice", "receipt", "payment", "renewal", "billing"

If it is a one-time purchase, promotional email, or unrelated message → isSubscription = false

-------------------------
EXTRACTION RULES:
-------------------------
- serviceName: Identify the brand/service (e.g., Netflix, Spotify)
- amount: Extract only if clearly mentioned (e.g., 499, 9.99)
- currency: Detect from symbol or context (₹ → INR, $ → USD)
- billingCycle:
  - "monthly" if phrases like "per month", "monthly"
  - "yearly" if "annual", "per year"
  - "weekly" if mentioned
  - otherwise "unknown"
- nextBillingDate: Extract ONLY if explicitly mentioned

-------------------------
CONFIDENCE SCORING:
-------------------------
Assign a confidence score between 0 and 1 based on clarity:
- High confidence (~0.8–1.0): service + amount + recurring context clearly present
- Medium (~0.5–0.7): partial info but likely subscription
- Low (~0.2–0.4): weak signals, unclear structure

-------------------------
EMAIL INPUT:
-------------------------
${safeText}

-------------------------
FINAL INSTRUCTION:
-------------------------
Return ONLY valid JSON. No explanations. No extra text.`;

    try {
        const openai = getClient();
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            max_tokens: 300
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw) {
            console.warn('[LLM] Empty response from model');
            return null;
        }

        // Part 1: Strip ALL markdown fence variants first
        const stripped = raw
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

        // Part 1: Extract the first valid JSON block from the cleaned text
        const jsonText = extractJsonBlock(stripped);
        if (!jsonText) {
            console.warn('[LLM] No JSON block found in response');
            return null;
        }

        // Part 1: Crash-safe parse
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (parseErr) {
            console.warn('[LLM] JSON parse failed. Block was:', jsonText);
            return null;
        }

        // Part 5: Fail-safe — must be a plain object
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            console.warn('[LLM] Invalid result shape — skipped');
            return null;
        }

        if (parsed.isSubscription === false) {
            console.log('[LLM] Email is not a subscription');
            return null;
        }

        const svc = parsed.serviceName || parsed.service;
        if (!svc || typeof svc !== 'string' || !svc.trim()) {
            console.warn('[LLM] No valid service name — skipped');
            return null;
        }
        
        parsed.service = svc.trim(); // Ensure it maps to what gmailSyncService expects

        // Validate amount: must be a non-negative number (or null)
        if (parsed.amount !== null && parsed.amount !== undefined) {
            const numAmount = Number(parsed.amount);
            if (isNaN(numAmount) || numAmount < 0) {
                console.warn('[LLM] Invalid amount "' + parsed.amount + '" — set to null');
                parsed.amount = null;
            } else {
                parsed.amount = numAmount;
            }
        }

        // Part 2: Normalise date to midnight-anchored Date object (matches classification system)
        parsed.nextBillingDate = normalizeDate(parsed.nextBillingDate);

        // Normalise billingCycle to accepted enum values
        const validCycles = ['MONTHLY', 'YEARLY', 'WEEKLY'];
        if (parsed.billingCycle) {
            const upper = String(parsed.billingCycle).toUpperCase();
            parsed.billingCycle = validCycles.includes(upper) ? upper : null;
        }

        // Force currency
        parsed.currency = 'INR';

        // Part 6: Lightweight trace log — never log full email body
        console.log(
            '[LLM] Extracted: "' + parsed.service.trim() + '"' +
            ' | amount: ' + (parsed.amount !== null && parsed.amount !== undefined ? parsed.amount : '?') +
            ' | cycle: ' + (parsed.billingCycle || '?') +
            ' | next: ' + (parsed.nextBillingDate ? parsed.nextBillingDate.toISOString().split('T')[0] : '?')
        );

        return parsed;

    } catch (err) {
        console.error('[LLM] Extraction error:', err.message);
        return null;
    }
}

module.exports = { extractSubscriptionWithLLM };
