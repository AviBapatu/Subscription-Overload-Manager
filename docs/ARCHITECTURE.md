# System Architecture — Deep Dive

This document covers every major architectural decision in the Subscription Overload Manager: what was built, why it was chosen over alternatives, and how all the pieces connect.

---

## 1. Stack Overview

| Layer | Technology | Why Chosen |
|---|---|---|
| **Database** | MongoDB (Mongoose) | Flexible schema is ideal for subscription data — different services have different metadata. No rigid table joins needed. |
| **Backend** | Node.js + Express | Non-blocking I/O is perfect for an app that constantly waits on external APIs (Gmail, Gemini, SMTP). |
| **Frontend** | React + Vite | Component model maps cleanly to subscription cards, modals, charts. Vite gives near-instant hot reloads during development. |
| **Styling** | TailwindCSS | Utility classes allow building complex dark-mode glassmorphism UIs without writing custom CSS per component. |
| **AI** | Google Gemini 2.5 Flash | Fastest Gemini model. Low cost. Supports `responseMimeType: 'application/json'` natively — critical for deterministic extraction. |
| **Auth** | Google OAuth 2.0 + JWT | Google OAuth gives access to Gmail (requires the `gmail.readonly` scope). JWT is stateless — no server-side session store needed. |

---

## 2. Why Gmail Instead of Bank Integration?

The initial design considered direct bank integrations (Plaid, Razorpay webhooks, or UPI APIs). These were rejected for three reasons:

1. **Cost:** Plaid charges per connected account per month. For a personal tool, this is economically unviable.
2. **Compliance:** Bank integrations require PCI-DSS compliance reviews, account verification flows, and ongoing regulatory maintenance.
3. **Reliability:** Indian bank feeds (especially UPI) are notoriously unstable and poorly documented in third-party APIs.

**Gmail is the perfect alternative** because:
- Every Indian subscription service (Netflix, Hotstar, Amazon, Notion, Razorpay) sends a receipt or invoice by email.
- The Gmail API is free, extremely reliable, and has a well-documented OAuth flow.
- The `gmail.readonly` scope is the most restrictive scope available — the app cannot read, delete, send, or modify any emails. This is a strong privacy guarantee.

---

## 3. The Dual-Stage Email Detection Pipeline

This is the core innovation. The pipeline is designed to be **fast**, **accurate**, and **cost-efficient**.

```
Raw Gmail Message
       │
       ▼
┌─────────────────────────────────┐
│  Pre-Filter (Skip Self & Server) │  ◄── Instant. Zero cost.
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  HTML → Plain Text Conversion   │  ◄── html-to-text strips tags
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Stage 1: Heuristic Detection   │  ◄── O(1) regex. ~0ms. Free.
│  (detectionService.js)          │
└────────────┬────────────────────┘
             │ No Match
             ▼
┌─────────────────────────────────┐
│  Billing Keyword Pre-Check      │  ◄── Guards the expensive LLM call
│  (invoice, debited, receipt...) │
└────────────┬────────────────────┘
             │ Likely Billing
             ▼
┌─────────────────────────────────┐
│  Stage 2: LLM Extraction        │  ◄── Gemini 2.5 Flash. ~1-2s. Paid.
│  (llmService.js)                │  Max 5 calls per sync.
└─────────────────────────────────┘
```

### Stage 1 — Heuristic Performance Design

The old implementation ran 4 separate `Array.some()` iterations over keyword arrays on every email, regardless of whether the email was relevant. The redesigned version:

- **Early Exit:** Returns immediately if no Tier-1 service name (`netflix`, `spotify`, `amazon`) is found. This eliminates all subsequent checks for ~80% of emails instantly.
- **Amazon Specificity:** Amazon is the trickiest service because users receive both subscription emails ("Prime Membership Renewed") and shopping order emails ("Your package has shipped"). The heuristic has a separate, strict check for Amazon that looks specifically for `prime membership`, `membership renewal`, `prime renewal` to differentiate the two.
- **Proximity Regex for Dates:** Instead of splitting text into lines and running nested `for` loops, a single context-aware regex pattern captures a date within 80 characters of any billing keyword. The V8 regex engine runs this in native C++, making it orders of magnitude faster than a JavaScript loop.

### Stage 2 — LLM Prompt Design

The Gemini prompt is engineered for zero ambiguity:

```
You are a subscription billing data extractor.
Extract ONLY from billing emails.
Return ONLY valid JSON. No explanation. No markdown.
Schema: { "service": string, "amount": number, "nextBillingDate": "YYYY-MM-DD" | null }
If this is not a subscription billing email, return: null
```

Key decisions:
- **`temperature: 0.0`** — Makes the model fully deterministic. The same email always returns the same JSON.
- **`responseMimeType: 'application/json'`** — Forces the model to output valid JSON at the API level (not just via prompt instruction). Eliminates the common problem of Gemini wrapping output in markdown code blocks.
- **`null` for non-billing emails** — The model is explicitly told to return `null` rather than guessing. This is critical for reducing false positives.
- **5-call cap per sync** — Prevents a user with 200 billing emails from incurring a large API bill in one sync.

---

## 4. Authentication Architecture

```
Frontend (Login.jsx)
       │
       │  Google OAuth 'auth-code' flow
       ▼
Google Servers ──► Returns authorization_code
       │
       │  POST /api/users/google-login { code }
       ▼
Backend (userController.js)
       │
       │  OAuth2Client.getToken(code)
       ▼
Google Servers ──► Returns { access_token, refresh_token, id_token }
       │
       ├──► Decode id_token → extract email, name
       ├──► Save refresh_token to User document in MongoDB
       │    (Used later for background syncs without user being online)
       └──► Generate JWT (signed with JWT_SECRET, 7-day expiry)
                   │
                   ▼
            Return JWT to frontend
                   │
                   ▼
       AuthContext.login() → localStorage
```

**Why `auth-code` flow instead of `implicit` flow?**

The `implicit` Google OAuth flow returns an `access_token` directly to the frontend. This token expires in 1 hour and cannot be refreshed without the user re-logging in.

The `auth-code` flow is the only way to obtain a `refresh_token`. The `refresh_token` is permanent (until the user revokes access) and can be used server-side to silently request fresh access tokens, enabling automated background Gmail syncs at any time.

---

## 5. Background Notification System

### Why Hourly Polling Instead of Event-Driven?

An event-driven approach (e.g., a webhook that fires when a billing date passes) would require an always-on message queue (like Redis + Bull or AWS SQS). For a self-hosted Node.js app, `node-cron` running hourly is simpler, reliable, and has no infrastructure cost.

### Idempotency — Preventing Duplicate Emails

The cron runs every hour. Without idempotency controls, a user would receive a renewal reminder 24 times in a day. Two mechanisms prevent this:

1. **`NotificationLog`:** Before sending any email, the cron task queries this collection to check if the same notification `type` for the same `subscriptionId` was already sent today (in the user's timezone). If yes, it skips.
2. **Boolean flags:** `overdueNotified` on the `Subscription` model is a hard boolean. Once set to `true`, the overdue alert for that subscription will never fire again until the user marks it as paid (which resets the flag).

### Timezone Handling

All users are stored with a `timezone` field (default: `Asia/Kolkata`). The cron job uses `dayjs` with timezone plugins to format "today's date" in the user's local timezone before querying the database. This ensures:
- A user in IST (UTC+5:30) gets their 9 AM reminder at 9 AM IST, not 3:30 AM UTC.
- Quiet hours logic correctly compares the current time in the user's timezone.

---

## 6. Deduplication Strategy

Deduplication is layered — each layer catches a different type of duplicate:

| Layer | Check | What It Catches |
|---|---|---|
| **Pre-Scan Filter** | `from` header vs `userEmail` | User forwarded an email to themselves |
| **Pre-Scan Filter** | `from` header vs `GMAIL_USER` | Server's own notification emails (renewal reminders, etc.) |
| **Email ID Check** | `emailId` field in MongoDB | The exact same Gmail message processed twice |
| **Service Name Check** | Case-insensitive `$regex` on `serviceName` | Same service with a different cost/date (e.g., a price increase) |

The service name check intentionally ignores the amount and date. This is deliberate: if Netflix increases their price, the email would pass a cost-based deduplication check (different amount = not a dup) and create a ghost duplicate. By checking only the service name across `ACTIVE`, `SUGGESTED`, and `PAUSED` statuses, any existing Netflix entry blocks a new one from being created.

---

## 7. Frontend State Management

### Why React Query Instead of Redux or Context?

Subscription data is **server state** — it lives in MongoDB and is modified by both the user and the backend cron jobs. Redux and Context are built for **client state** (UI toggles, form values). React Query is specifically designed for server state:

| Concern | Redux/Context | React Query |
|---|---|---|
| Caching API responses | Manual | Automatic |
| Re-fetching on window focus | Manual | Automatic |
| Invalidating stale data after mutations | Manual | `queryClient.invalidateQueries()` |
| Loading/error states | Manual reducers | Built-in `isLoading`, `isError` |
| Background refetches | Not built-in | Automatic |

### Cache Invalidation Pattern

All subscription-related queries share a centralized invalidation helper:

```js
const SUB_QUERIES = ['subscriptions', 'insights', 'stats', 'upcomingTimeline'];
const invalidateAll = (qc) => SUB_QUERIES.forEach(k => qc.invalidateQueries([k]));
```

This is called in the `onSuccess` callback of every mutation. It forces React Query to immediately refetch all related data from the backend, ensuring the Dashboard, Analytics, and Subscription Grid are always in sync after any change.

---

## 8. API Security Model

Every route that touches user data is protected by two layers:

1. **`auth.js` middleware:** Verifies the JWT on every request. Attaches `req.user = { id: userId }` if valid.
2. **`router.param('userId')` guard:** For routes with a `userId` URL parameter, validates that `req.user.id === userId`. This prevents a logged-in user from querying or modifying another user's subscriptions by simply changing the ID in the URL.

---

## 9. Data Flow: Manual Sync Button

```
User clicks "Sync Emails"
       │
       ▼
syncMut.mutate()  [SubscriptionsGrid.jsx]
       │
       ▼
POST /api/subscriptions/sync-manual  [api.js with JWT header]
       │
       ▼
auth.js middleware → verifies JWT → attaches req.user
       │
       ▼
triggerManualSync(req, res)  [subscriptionController.js]
       │
       ▼
gmailSyncService.runBackgroundSync(userId)
       │
       ├──► Google OAuth → get fresh access_token
       ├──► syncFromGmail(token, userId)
       │         ├──► Gmail API → fetch 20 emails
       │         ├──► Per email: skip self/server, convert HTML, detect
       │         │         ├──► Heuristic match → extract ₹ + date
       │         │         └──► LLM fallback → Gemini JSON
       │         └──► Return suggestions[]
       ├──► Dedup check (emailId + serviceName regex)
       └──► Save new SUGGESTED subscriptions to MongoDB
       │
       ▼
res.json({ message: 'Manual sync complete' })
       │
       ▼
onSuccess callback → invalidateAll(queryClient)
       │
       ▼
React Query refetches subscriptions → Grid updates
       │
       ▼
setIsSynced(true) → Button shows "Synced! ✓" for 3 seconds
