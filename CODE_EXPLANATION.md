# Extensive Code & Function Explanation

This document provides a deep, function-by-function technical breakdown of the entire Subscription Overload Manager application.

---

## 1. Backend Core Services (`/backend/services`)

### `gmailSyncService.js`
The engine responsible for connecting to Gmail and orchestrating the detection pipeline.
*   **`getEmailBody(payload)`**: 
    *   **Purpose:** A recursive parser that digs into a raw Gmail API response payload.
    *   **Logic:** Checks if a part's `mimeType` is `text/html`. If so, decodes it from `base64`. If the payload has nested `parts` (like an attachment + html body), it recurses until it extracts the raw HTML string.
*   **`syncFromGmail(accessToken, userId)`**: 
    *   **Purpose:** The primary email scanning loop.
    *   **Logic:** 
        1. Instantiates an OAuth2 client with the `accessToken`.
        2. Queries the `gmail.users.messages.list` for 20 recent billing-related emails.
        3. Loops through messages, fetches the full headers, and determines the `Subject` and `From` address.
        4. Skips emails sent by the user (`userEmail`) or the server (`GMAIL_USER`).
        5. Converts HTML to plain text using `html-to-text`.
        6. Passes text to `detectionService.detectSubscription()`.
        7. If heuristic fails, it checks for generic billing keywords. If present, it passes the text to `llmService.extractSubscriptionWithLLM()`, capped at 5 calls per sync to prevent high API costs.
*   **`runBackgroundSync(userId)`**: 
    *   **Purpose:** The wrapper used by cron jobs and the manual sync button.
    *   **Logic:** Looks up the user's `googleRefreshToken` from MongoDB, automatically requests a fresh access token from Google, passes it to `syncFromGmail`, and handles database insertion (while executing the strong `$regex` deduplication check).

### `detectionService.js`
The Stage 1 Heuristic Scanner. Optimized for `O(1)` string matching performance.
*   **`detectSubscription(from, content)`**:
    *   **Logic:** Checks if the text includes 'netflix', 'spotify', or 'amazon'. If false, returns instantly (early exit). If true, it checks for strong billing keywords ('renewal', 'billed'). Amazon has custom, stricter logic to differentiate between "Prime Membership Billed" and regular physical Amazon package orders.
*   **`extractINR(text)`**:
    *   **Logic:** Uses a simple Regex `/₹\s?[\d,.]+/` to find currency. Strips out spaces and returns the raw string `₹499`.
*   **`extractBillingDate(text)`**:
    *   **Logic:** Uses a Context-Aware Proximity Regex. It looks for a billing keyword (like 'renewal') and captures the first date (like 'May 10') that appears strictly within 80 characters *after* that keyword. This completely eliminates slow `for` loops.
*   **`normalizeText(text)`**:
    *   **Logic:** Converts text to lowercase, replaces all multiple spaces/newlines with a single space, and trims it for predictable regex matching.

### `llmService.js`
The Stage 2 AI Fallback Extractor.
*   **`extractSubscriptionWithLLM(text)`**:
    *   **Logic:** Initializes the Google Gemini API (`@google/genai`). Passes the raw email text into a highly rigid, deterministic prompt. The prompt includes `responseMimeType: 'application/json'` and `temperature: 0.0` to force the AI to return exactly three keys: `service`, `amount`, and `nextBillingDate`. Parses the JSON output and returns it to `gmailSyncService`.

### `emailService.js`
The SMTP Dispatcher.
*   **`sendEmail(to, subject, htmlContent)`**: The core Nodemailer wrapper. Sends the HTML email via `process.env.GMAIL_USER`.
*   **Helper Functions** (`sendRenewalAlert`, `sendFreeTrialEndingAlert`, `sendOverdueEmail`, `sendBudgetAlert`): These accept database documents, pass the data into HTML generators located in `emailTemplates.js`, and invoke `sendEmail`.

---

## 2. Backend Controllers (`/backend/controllers`)

### `subscriptionController.js`
*   **`getSubscriptions(req, res)`**: Returns all subscriptions for a user, sorted by billing date.
*   **`getSubscriptionStats(req, res)`**: Calculates the `totalMonthlySpend` by normalizing weekly/yearly costs. Returns counts of Active vs Paused subscriptions.
*   **`getCategoryBreakdown(req, res)`**: Groups all active subscriptions by their `category` field and returns percentages formatted for Recharts.
*   **`createSubscription(req, res)`**: Handles manual insertions. Calculates the `alertDate` (e.g., 3 days before `nextBillingDate`) and fires `sendNewSubscriptionAlert()`.
*   **`updateSubscription(req, res)`**: Handles edits. If the cost increases, it tracks `previousCost` and fires `sendPriceIncreaseAlert()`.
*   **`recordPayment(req, res)`**: The "Mark as Paid" logic. It uses `dayjs` to increment `nextBillingDate` forward by 1 cycle (Week/Month/Year). If the item was massively overdue, it loops the increment until the date is in the future. Resets `overdueNotified` to `false`.
*   **`triggerManualSync(req, res)`**: Receives the frontend manual sync click and invokes `gmailSyncService.runBackgroundSync()`.

### `authController.js`
*   **`googleLogin(req, res)`**: 
    *   **Logic:** Receives an OAuth code from the frontend. Uses `OAuth2Client.getToken()` to get Google profile data. Checks if the user exists in MongoDB. If not, creates them with default preferences (budget alert = 80%). Generates a secure JSON Web Token (JWT) and returns it.

---

## 3. Background Cron Jobs (`/backend/cron`)

### `notifications.js`
*   **`cron.schedule('0 * * * *')`**: Runs exactly at minute 0 of every hour.
*   **Logic Flow:**
    1.  **Renewals:** Queries MongoDB for `ACTIVE` subscriptions where `alertDate` is today. Generates an email and marks `lastReminderSentAt`.
    2.  **Overdue:** Queries for dates in the past where `overdueNotified` is false. Sends the alert and flips the boolean.
    3.  **Idempotency & Timezones:** The cron logic formats dates according to the user's saved `timezone` (default: `Asia/Kolkata`) to ensure they don't receive a "renews today" email while it's physically 11:00 PM the night prior in their country.

---

## 4. Frontend Components (`/frontend/src/components`)

### `SubscriptionsGrid.jsx`
*   **State:** Uses `useState` to track `statusFilter` (ALL/ACTIVE/PENDING), modal states, and `isSynced`.
*   **Queries:** Uses `useQuery` from React Query to fetch `fetchSubscriptions`.
*   **Mutations:** `syncMut` triggers the manual sync. When it completes, it calls `invalidateAll(queryClient)` which automatically causes `fetchSubscriptions` to run again in the background, updating the UI instantly.

### `Dashboard.jsx` & `AnalyticsSection.jsx`
*   **Logic:** `Dashboard` fetches `getInsights()` and `getUpcomingTimeline()`. The timeline splits data into `overdue`, `dueSoon`, and `upcoming` arrays, rendering them with different badge colors (Red/Yellow/Blue).
*   **Analytics:** Extracts `getCategoryBreakdown()` data and passes it to Recharts `<PieChart>` and `<LineChart>`. Tooltips are explicitly formatted to use the `₹` symbol.

### `lib/api.js`
*   **`api.interceptors.request`**: Every time the frontend makes an Axios request, this interceptor pulls the `token` from localStorage and injects it into the `Authorization: Bearer <token>` header, securing the backend.
