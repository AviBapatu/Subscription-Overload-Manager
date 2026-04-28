# Backend — File-by-File Explanation

A detailed breakdown of every file in the `/backend` directory, explaining its purpose, what it contains, and why it was built that way.

---

## Root Files

### `server.js`
**Purpose:** The application entry point. Everything starts here.

**What it does:**
- Loads environment variables from `.env` via `dotenv`.
- Creates the Express app and applies `cors` middleware (so the React frontend on a different port can communicate with it).
- Mounts all API routers under their respective paths:
  - `/api/subscriptions` → `routes/subscriptions.js`
  - `/api/users` → `routes/users.js`
  - `/api/test` → `routes/testEmails.js`
- Connects to MongoDB via `mongoose.connect()`.
- Starts the background job scheduler from `jobs/scheduler.js`.
- Listens on `process.env.PORT` (default: 5000).

**Why:** Keeps the entry point clean and minimal. All logic lives in dedicated modules.

---

### `clear_db.js`
**Purpose:** A one-off developer utility script.

**What it does:** Connects to MongoDB and drops all subscription documents. Used during development to reset the database to a clean state for testing the sync engine without manually deleting records.

**Why:** Running the Gmail sync repeatedly during testing would accumulate hundreds of duplicate SUGGESTED subscriptions. This script provides a clean reset in one command.

---

## `/models` — Database Schemas

### `User.js`
**Purpose:** Defines the MongoDB schema for a user account.

**Key Fields:**
- `name`, `email`: Basic profile information.
- `password`: Stored as a bcrypt hash (never plaintext).
- `googleRefreshToken`: The long-lived OAuth token saved when a user authorizes Gmail access. This is what enables background syncs to run without the user being online.
- `timezone`: Defaults to `Asia/Kolkata`. Used by the cron jobs to send notifications at the right local time.
- `preferences`: A nested object containing all of the user's notification toggles:
  - `notifyViaEmail` — Master email notification toggle.
  - `alertDaysBefore` — How many days before a renewal to send a reminder.
  - `monthlyBudget` — The user's self-set spending cap in ₹.
  - `budgetAlertThreshold` — The percentage (e.g., 80%) at which to send a budget alert.
  - `notifPriceIncreases`, `budgetAlertOnNew`, etc. — Individual toggles for specific alert types.
- `lastGmailSync`: Timestamp of the last successful Gmail scan, shown in the dashboard.

**Why:** Preferences are stored per-user in the database (not just frontend state) so the backend cron jobs can read them without requiring the user to be logged in.

---

### `Subscription.js`
**Purpose:** Defines the MongoDB schema for a single tracked subscription.

**Key Fields:**
- `userId`: A reference to the `User` document who owns this subscription.
- `serviceName`, `cost`, `billingCycle`: Core subscription data.
- `nextBillingDate`: The date the next payment is due.
- `alertDate`: Pre-computed date for when to send the renewal reminder (e.g., 3 days before `nextBillingDate`). Storing this separately allows extremely fast cron job queries instead of computing it on every hourly run.
- `status`: An enum — `ACTIVE`, `PAUSED`, `CANCELLED`, `SUGGESTED`, `IGNORED`.
  - `SUGGESTED` = Detected by the AI/heuristic engine but not yet confirmed by the user.
  - `IGNORED` = User dismissed the suggestion.
- `source`: `heuristic`, `llm`, or `manual` — tracks how the subscription was discovered.
- `confidence`: A score from 0–1 indicating how confident the detection engine was.
- `emailId`: The Gmail message ID. Used as a unique key to prevent the same email from being processed twice.
- `overdueNotified`, `lastReminderSentAt`, `reminderCount`: Flags to prevent sending duplicate overdue alerts.
- `trialEndsAt`, `trialAlertSent`: Free trial tracking fields.
- `previousCost`: Saved when the cost is updated, enabling price-increase alerts.

**Indexes:** Four compound MongoDB indexes are defined to dramatically speed up the cron job queries (e.g., finding by `alertDate + status` or `overdueNotified + nextBillingDate`).

---

### `NotificationLog.js`
**Purpose:** A simple audit log for every email sent by the system.

**Key Fields:**
- `userId`, `subscriptionId`: Links the log entry to the relevant documents.
- `type`: The category of email (e.g., `renewal`, `overdue`, `trial`).
- `sentAt`: Timestamp of delivery.

**Why:** This log is the backbone of **idempotency**. Before sending any reminder, the cron tasks query this log to check if an email of the same `type` for the same `subscriptionId` was already sent today (in the user's local timezone). If so, it skips the send. This prevents users from being spammed with duplicate alerts if the cron runs multiple times.

---

### `OtpToken.js`
**Purpose:** Stores temporary One-Time Passwords for password reset flows.

**Key Fields:**
- `email`, `otp` (hashed), `expiresAt`.

**Why:** OTPs expire after a short window (e.g., 10 minutes). Storing them in MongoDB with a TTL index means they are automatically deleted and cannot be replayed.

---

## `/routes` — API Route Definitions

### `subscriptions.js`
**Purpose:** Defines all HTTP endpoints for subscription management.

**Key Routes:**
- `GET /:userId` — Get all subscriptions for a user.
- `GET /:userId/stats` — Get spending stats (monthly total, active count).
- `POST /` — Manually create a new subscription.
- `PUT /:id` — Edit an existing subscription's details.
- `PUT /:id/pay` — Mark a subscription as paid (rolls date forward).
- `PUT /:id/status` — Change status (ACTIVE/PAUSED/CANCELLED).
- `PATCH /:id/ignore` — Dismiss a SUGGESTED subscription.
- `DELETE /:id` — Permanently delete a subscription.
- `POST /sync-gmail` — Sync using a provided access token.
- `POST /auto-setup` — Exchange an auth code for a refresh token and sync immediately.
- `POST /sync-manual` — Trigger an on-demand sync for the logged-in user.
- `GET /insights` — Get overdue/due-soon counts for the dashboard.
- `GET /upcoming` — Get the full payment timeline.

**Security:** All routes are wrapped with `router.use(auth)` middleware. A `router.param('userId')` guard also verifies the logged-in user's ID matches the `userId` in the URL, preventing cross-user data access.

---

### `users.js`
**Purpose:** Endpoints for user authentication and profile management.

**Key Routes:**
- `POST /register` — Create a new email/password account.
- `POST /login` — Login and receive a JWT.
- `POST /google-login` — Exchange a Google OAuth code for a JWT.
- `GET /profile/:userId` — Get the user's profile and preferences.
- `PUT /profile/:userId` — Update preferences, budget, and timezone.
- `POST /request-otp`, `POST /verify-otp`, `POST /reset-password` — The full password reset flow.
- `DELETE /:userId` — Permanently delete a user and all their data.

---

### `testEmails.js`
**Purpose:** A protected endpoint for testing the notification system manually.

**Key Routes:**
- `POST /send-test` — Sends a test notification email to the logged-in user's email address. Used by the "Send Test Email" button on the Profile/Settings page.

**Why:** This gives users a way to verify that their SMTP configuration is working without waiting for an actual renewal to occur.

---

## `/middleware`

### `auth.js`
**Purpose:** A JWT verification middleware that protects all sensitive routes.

**How it works:**
1. Reads the `Authorization: Bearer <token>` header from the incoming request.
2. Verifies the token signature using `jsonwebtoken.verify()` with the `JWT_SECRET`.
3. If valid, attaches the decoded payload (containing `userId`) to `req.user` and calls `next()`.
4. If invalid or missing, returns a `401 Unauthorized` response immediately.

**Why:** Every route that touches user data is mounted behind this middleware. It ensures that anonymous requests can never read or modify subscription data.

---

## `/controllers`

### `subscriptionController.js`
**Purpose:** The largest file in the backend. Handles all subscription-related business logic.

**Key Functions:**
- `getSubscriptions`: Queries MongoDB filtered by `userId` and optional `status`. Results are sorted by `nextBillingDate` ascending.
- `getSubscriptionStats`: Calculates `totalMonthlySpend` by normalizing all billing cycles — WEEKLY × 4.33 and YEARLY ÷ 12 — to a comparable monthly figure.
- `getCategoryBreakdown`: Groups subscriptions by `category` field (Entertainment, Software, etc.), calculates each category's monthly total and percentage of the overall spend. Returns data formatted for Recharts.
- `getSpendingHistory`: Builds the last 6 months of data by iterating backward through months and summing all subscriptions that were active before each month's end date.
- `createSubscription`: Validates input, creates the document, and pre-computes the `alertDate` field automatically. Fires `sendNewSubscriptionAlert` if the user has that preference enabled.
- `updateSubscription`: Saves changes to a subscription. If the `cost` field increases, it records the `previousCost` and fires `sendPriceIncreaseAlert`.
- `recordPayment`: The "Mark as Paid" function. Uses `dayjs` to add exactly 1 cycle (week/month/year) to `nextBillingDate`. If the date was massively overdue, it loops forward until the date reaches the future. Resets `overdueNotified` and `reminderCount` to prevent stale notification state.
- `updateSubscriptionStatus`: Simple status change. Validates against the allowed enum values.
- `ignoreSubscription`: Sets status to `IGNORED` so the subscription disappears from the pending suggestions list.
- `deleteSubscription`: Hard-deletes from MongoDB.
- `syncFromGmail`: Called with a user-provided access token. Runs the full detection pipeline and saves new subscriptions with full deduplication.
- `triggerManualSync`: Called by the frontend's "Sync Emails" button. Extracts the `userId` from `req.user` (the JWT payload) and calls `gmailSyncService.runBackgroundSync()`.
- `getInsights`: Returns high-level summary counts (overdue, due soon, upcoming) for the Dashboard hero section.
- `getUpcomingTimeline`: Returns the full sorted list of subscriptions split into `overdue`, `dueSoon`, and `upcoming` buckets for the Payment Timeline component.

---

### `userController.js`
**Purpose:** Handles all user auth and profile logic.

**Key Functions:**
- `register`: Hashes the password with `bcryptjs`, saves the user, and returns a JWT.
- `login`: Finds the user by email, uses `bcrypt.compare()` to verify the password, and returns a JWT.
- `googleLogin`: Receives an auth code from the Google OAuth flow, uses `OAuth2Client.getToken()` to verify it with Google's servers, extracts the email/name from the ID token, upserts the user in MongoDB, saves the `refreshToken` for future background syncs, and returns a JWT.
- `getProfile` / `updateProfile`: Reads and saves the user's preferences, budget settings, and timezone.
- `requestOtp`: Generates a 6-digit OTP, hashes it, saves it to `OtpToken` with a 10-minute expiry, and sends the OTP email.
- `resetPassword`: Verifies the OTP is valid and not expired, then saves the new hashed password.
- `deleteAccount`: Deletes the user document and all their associated `Subscription` documents in a single operation.

---

### `testController.js`
**Purpose:** Contains the logic for the developer/user testing tools.

**Key Functions:**
- `sendTestNotification`: Finds the user, constructs a sample subscription object, and calls `emailService.sendRenewalAlert()`. Returns a success/failure status that the frontend uses to update the button state.

---

## `/services`

### `gmailSyncService.js`
**Purpose:** The primary email scanning engine.

**`getEmailBody(payload)`**
- Recursively walks the Gmail API's `payload` object tree.
- Checks if a node has `mimeType: 'text/html'` and a `body.data` field.
- If found, decodes the Base64url-encoded string using `Buffer.from()` and returns the raw HTML.
- If the current node has nested `parts` (multi-part emails), it recurses into each part until it finds HTML.

**`syncFromGmail(accessToken, userId)`**
- Instantiates a Google OAuth2 client with the `accessToken`.
- Queries Gmail for 20 recent emails matching `(invoice OR receipt OR subscription OR payment OR renewal) newer_than:30d`.
- For each email: fetches full headers, extracts `Subject` and `From`.
- Skips the email if `From` matches the user's own email (self-sent skip).
- Skips the email if `From` matches `process.env.GMAIL_USER` (server notification skip).
- Converts HTML body to normalized plain text using `html-to-text`, then strips all URLs and collapses whitespace.
- Calls `detectionService.detectSubscription()` (Stage 1 Heuristic).
- If heuristic fails, checks for generic billing keywords. If found, calls `llmService.extractSubscriptionWithLLM()` (Stage 2 AI), limited to 5 LLM calls per sync run.
- Collects all matched subscriptions into a `suggestions[]` array and returns it.

**`runBackgroundSync(userId)`**
- Retrieves the user from MongoDB. Exits early if no `googleRefreshToken` is saved.
- Creates a new `OAuth2Client` and uses `auth.getAccessToken()` to silently exchange the refresh token for a fresh access token.
- Calls `syncFromGmail()` with the fresh token.
- For each detected subscription:
  - Checks if the `emailId` already exists in the database.
  - Performs a **strong case-insensitive service name check**: `serviceName: { $regex: /^Netflix$/i, status: { $in: ['ACTIVE', 'SUGGESTED', 'PAUSED'] } }`.
  - If either check triggers, skips the item (deduplication).
  - Otherwise, saves the new `SUGGESTED` subscription document.

---

### `detectionService.js`
**Purpose:** The Stage 1 Heuristic Engine. Zero-cost, near-instantaneous email classification.

**`detectSubscription(from, content)`**
- Checks if the normalized email content contains any Tier-1 service names: `netflix`, `spotify`, `amazon`. Returns false immediately (early exit) if none are found — this is the key performance optimization.
- If `amazon` is found, applies a strict secondary check for Amazon-specific subscription keywords (`prime membership`, `membership renewal`) to avoid false positives from shopping order emails.
- For Netflix/Spotify, checks for strong billing keywords: `renewal`, `auto-renew`, `subscription`, `membership`, `billed`, `monthly`, `yearly`. Returns `isSubscription: true` with the service name if found.

**`extractINR(text)`**
- Applies the regex `/₹\s?[\d,.]+/` to find the first Indian Rupee amount in the email.
- Returns the raw match (e.g., `₹499.00`) and the currency string `'INR'`.

**`extractBillingDate(text)`**
- Uses a single context-aware proximity regex: `/(?:next|renew|renewal|billing|due).{0,80}?(Month Day|Day Month)/i`.
- This finds a date that appears within 80 characters after a billing keyword. This replaced an older slow implementation that split the text into lines and ran `for` loops.
- Falls back to matching the first date anywhere in the text if no contextual match is found.

**`normalizeText(text)`**
- Converts to lowercase, collapses multiple whitespace to a single space, and trims. Ensures consistent matching across all regex patterns.

---

### `llmService.js`
**Purpose:** The Stage 2 AI Fallback Engine for unrecognized subscription emails.

**`extractSubscriptionWithLLM(text)`**
- Initializes the `@google/genai` client with `process.env.GEMINI_API_KEY`.
- Targets the `gemma-4-26b-a4b-it` model — chosen for its extremely fast response time and low cost compared to Pro models.
- The prompt is highly rigid:
  - Instructs Gemini to act as an extraction engine, not a conversational agent.
  - Provides the exact JSON schema it must output: `{ "service": string, "amount": number, "nextBillingDate": "YYYY-MM-DD" }`.
  - Sets `responseMimeType: 'application/json'` to force the model to output only parseable JSON with no markdown wrappers.
  - `temperature: 0.0` eliminates randomness, making outputs fully deterministic.
  - Strict rules: return `null` if the email is not a subscription billing email (prevents hallucination).
- Parses and returns the JSON result, or returns `null` if extraction fails.

---

### `emailService.js`
**Purpose:** The SMTP email dispatcher. All outgoing emails go through this file.

**`sendEmail(to, subject, htmlContent)`**
- The core Nodemailer wrapper. Creates a transport using `process.env.GMAIL_USER` and `process.env.GMAIL_APP_PASSWORD` (a 16-character Gmail App Password, not the regular account password).
- Sends the email and logs the message ID on success.

**Typed Helpers** (all call `sendEmail` with pre-rendered HTML from `emailTemplates.js`):
- `sendRenewalAlert(to, sub, daysUntil)` — Renewal reminder.
- `sendOtpEmail(to, otp)` — Password reset OTP.
- `sendFreeTrialEndingAlert(to, sub, daysLeft)` — Free trial warning.
- `sendFailedPaymentAlert(to, sub)` — Payment failure notice.
- `sendPriceIncreaseAlert(to, sub, oldPrice, newPrice, effectiveDate)` — Price hike notification.
- `sendWeeklySummary(to, userName, upcomingSubs, totalMonthly)` — Sunday digest.
- `sendBudgetAlert(to, userName, spentAmount, budgetAmount, percentage)` — Budget threshold warning.
- `sendNewSubscriptionAlert(to, userName, sub)` — Confirmation when a new subscription is added manually.
- `sendOverdueEmail(sub)` — Payment overdue alert.

---

## `/templates`

### `emailTemplates.js`
**Purpose:** All HTML email templates in one file. Returns styled HTML strings for each notification type.

**Why:** Centralizing all templates here makes it easy to update the branding, fonts, or color scheme of every outgoing email in one place. Each function (e.g., `getRenewalAlertHTML(sub, daysUntil)`) takes data objects as parameters and injects them into the HTML using template literals, returning the final email-ready HTML string.

---

## `/jobs` — Background Task Scheduler

### `scheduler.js`
**Purpose:** Starts all cron jobs when the server boots.

**What it does:** Imports each task file from `/jobs/tasks/` and schedules them with `node-cron`. All tasks run on the `0 * * * *` schedule (the top of every hour), except the weekly summary which runs on a specific day and time.

**Why hourly instead of once per day?** Running hourly allows the system to correctly respect each user's individual `quietHoursStart` and `quietHoursEnd` preferences. If a user has quiet hours from 10 PM to 8 AM, an hourly job can check the current time in the user's timezone and skip sending — something a midnight-only cron cannot do.

---

### `/jobs/tasks/renewalAlerts.js`
**Purpose:** Sends renewal reminder emails.

**Logic:**
1. Queries for `ACTIVE` subscriptions where `alertDate` falls on today (in the user's local timezone).
2. Checks `NotificationLog` to confirm no renewal alert has already been sent today for this subscription.
3. Sends the renewal email and writes a record to `NotificationLog`.

---

### `/jobs/tasks/overdueAlerts.js`
**Purpose:** Sends payment overdue alerts.

**Logic:**
1. Queries for `ACTIVE` subscriptions where `nextBillingDate` is in the past and `overdueNotified` is `false`.
2. Sends the overdue email and sets `overdueNotified = true` on the document, preventing repeat alerts.

---

### `/jobs/tasks/freeTrialAlerts.js`
**Purpose:** Warns users when a free trial is about to convert to paid.

**Logic:** Queries for subscriptions where `trialEndsAt` is within the next 3 days and `trialAlertSent` is `false`. Sends the alert and sets `trialAlertSent = true`.

---

### `/jobs/tasks/budgetAlerts.js`
**Purpose:** Sends a warning when the user's monthly spending reaches 80% or 100% of their budget.

**Logic:** For each user who has a `monthlyBudget` set, sums the current monthly spend and compares it to the threshold. Uses `NotificationLog` to avoid sending duplicate budget alerts for the same threshold in the same month.

---

### `/jobs/tasks/weeklySummary.js`
**Purpose:** Sends a weekly digest email every Sunday.

**Logic:** Finds all users with `notifyViaEmail` enabled, fetches their upcoming subscriptions for the next 7 days, and fires `sendWeeklySummary()`.

---

### `/jobs/tasks/gmailSync.js`
**Purpose:** Runs the automated daily Gmail sync for all users.

**Logic:** Queries for all users who have a `googleRefreshToken` saved and calls `gmailSyncService.runBackgroundSync(userId)` for each one.
