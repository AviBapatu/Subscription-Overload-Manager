/**
 * LLM Fallback Service
 * Uses Google Gemini 2.5 Flash to extract subscription data from emails
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

const { GoogleGenAI } = require('@google/genai');

let ai = null;

// ─── Lazy client ────────────────────────────────────────────────────────────
function getClient() {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return ai;
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
    if (!process.env.GEMINI_API_KEY) {
        console.warn('[LLM] Skipped — GEMINI_API_KEY not configured');
        return null;
    }

    // Part 5: Input safety — cap to 2000 chars to prevent token overload
    const safeText = text.slice(0, 2000);

    const prompt = `Extract subscription details from this email into JSON.
If not a recurring payment or subscription invoice, return {"isSubscription": false}.

RULES:
1. amount: Number only, no symbols.
2. currency: 3-letter ISO code (INR, USD, etc).
3. billingCycle: "MONTHLY", "YEARLY", "WEEKLY", or null.
4. nextBillingDate: "YYYY-MM-DD" or null.
5. Do not guess missing values. Return null if unknown.

SCHEMA:
{
  "isSubscription": boolean,
  "serviceName": string | null,
  "amount": number | null,
  "currency": string | null,
  "billingCycle": string | null,
  "nextBillingDate": string | null,
  "confidence": number // 0.0 to 1.0
}

EMAIL TEXT:
${safeText}`;

    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemma-4-26b-a4b-it',
            contents: prompt,
            config: {
                temperature: 0,
                maxOutputTokens: 300,
                responseMimeType: 'application/json',
            }
        });

        const raw = response.text;
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
