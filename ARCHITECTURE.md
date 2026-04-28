# System Architecture

## Core Design Philosophy
Subscription Overload Manager is built on the MERN stack (MongoDB, Express, React, Node.js). The overarching architectural goal was to create a centralized, automated system that requires minimal manual data entry from the user.

To achieve this, we opted against direct bank integrations (like Plaid) which are expensive, require complex compliance, and often suffer from disconnected bank feeds. Instead, the architecture leverages the **Gmail API** as the source of truth for billing events.

## The Dual-Stage Email Detection Engine

The core innovation of this project is the background email scanner. When the system syncs a user's Gmail inbox, it doesn't blindly pass all emails to an AI (which would be extremely slow and cost-prohibitive). Instead, it uses a highly optimized dual-stage pipeline:

### Stage 1: The Heuristic Filter (`detectionService.js`)
**Why:** To process 90% of standard subscription emails instantly and for free.
**How:**
1. The engine fetches the user's recent emails using the Gmail API query `(invoice OR receipt OR subscription OR payment OR renewal) newer_than:30d`.
2. The HTML body is aggressively stripped into normalized, plain text.
3. The engine uses O(1) early exits to check for known "Tier 1" services (Netflix, Spotify, Amazon). If the service is not mentioned, the logic tree short-circuits instantly.
4. If a service is found, it uses **Context-Aware Proximity Regex** to instantly extract the Indian Rupee (₹) amount and the closest date within 80 characters of a billing keyword (like "renewal"). No loops or string allocations are required.

### Stage 2: The LLM Fallback (`llmService.js`)
**Why:** To catch unstructured or unknown SaaS receipts (e.g., Notion, Figma, obscure web hosts) that pass the heuristic filter's basic billing keyword check but don't match hardcoded parsers.
**How:**
1. If the email contains words like "invoice" or "debited" but isn't Netflix/Amazon/etc., it is sent to **Google Gemini 2.5 Flash**.
2. **Prompt Engineering:** The prompt is highly restricted. Gemini is instructed to output *only* strict JSON conforming to a specific schema (Service Name, Cost, Next Billing Date). Temperature is set to 0 to prevent hallucinations.
3. **Cost Protection:** The pipeline enforces a hard limit (e.g., maximum 5 LLM calls per sync) to prevent runaway API costs if an inbox is flooded with promotional emails.

## Deduplication and Spam Prevention
Because the sync runs daily via cron job (and can be triggered manually), the system requires strict deduplication:
1. **Self-Sent Exclusion:** The system checks the `From` header and skips emails where the user forwarded an email to themselves.
2. **Server Exclusion:** The system skips emails sent by the backend's own notification system (`GMAIL_USER`).
3. **Strong Duplicate Protection:** Before saving a detected subscription, the system performs a case-insensitive regex query on the user's database. If a subscription with that name already exists in an `ACTIVE`, `SUGGESTED`, or `PAUSED` state, the detection is ignored to prevent dashboard spam.

## Background Notification Engine
Instead of checking for renewals instantly when a user logs in, the backend utilizes `node-cron` to wake up every hour.
**Why:** This allows the system to respect user-configured "Quiet Hours" and local timezones.

1. The cron job scans the database for `ACTIVE` subscriptions where the `alertDate` matches the current day.
2. It generates localized, styled HTML emails using `emailTemplates.js`.
3. Emails are dispatched via Nodemailer connected to the server's Gmail SMTP configuration.

## Frontend UI/UX
The frontend is built with React and TailwindCSS, utilizing **React Query** for state management.
**Why React Query?** Subscription data, insights, and charts require complex caching. React Query automatically handles background refetching and invalidation. For example, when the manual "Sync Emails" button finishes its background mutation, React Query automatically invalidates the `['subscriptions']` cache, instantly populating the grid with the newly found services without a page refresh.
