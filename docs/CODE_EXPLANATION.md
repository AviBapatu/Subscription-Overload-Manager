# Code & Function Reference — Complete Guide

This document is the complete, cross-referenced technical guide to every significant function in the codebase. It is organized by layer (services → controllers → cron → frontend). For file-level context, see [BACKEND_FILES.md](./BACKEND_FILES.md) and [FRONTEND_FILES.md](./FRONTEND_FILES.md).

---

## Backend Services

---

### `gmailSyncService.js`

#### `getEmailBody(payload)`
```
Input:  Gmail API message payload object (can be deeply nested)
Output: Raw HTML string of the email body, or ''
```
**Logic:** Gmail emails are structured as MIME trees. A message can have a top-level `body`, or be split into `parts` (e.g., text/plain + text/html + attachments). This function recursively walks the tree:
1. If the current node is `text/html` with a `body.data` field → decodes the Base64url string with `Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64')` and returns the HTML.
2. If the node has `parts[]`, it recurses into each part until HTML is found.
3. Returns `''` if no HTML body exists (plain-text only emails).

**Why recursive:** Gmail's MIME structure has no guaranteed depth. Some emails have HTML at depth 1, others at depth 3+ (HTML inside `multipart/alternative` inside `multipart/mixed`). Recursion is the only correct solution.

---

#### `syncFromGmail(accessToken, userId)`
```
Input:  Short-lived Google access_token, userId string
Output: Array of detected subscription objects (suggestions[])
```
**Step-by-step:**
1. Creates `google.auth.OAuth2` client and sets the access token credentials.
2. Queries `gmail.users.messages.list` with `userId: 'me'` and `maxResults: 20`, filtering via `q: '(invoice OR receipt OR subscription OR payment OR renewal) newer_than:30d'`. This server-side filter means Google does the heavy lifting — only relevant emails ever hit our code.
3. Fetches the user from MongoDB to read their email address for self-sent filtering.
4. For each message, fetches full message with `format: 'full'`.
5. **Self-sent skip:** Compares `From` header to user's email. If match → `continue`.
6. **Server-sent skip:** Compares `From` header to `process.env.GMAIL_USER`. If match → `continue`. (Prevents the app's own renewal alerts from being re-detected as new subscriptions.)
7. Calls `getEmailBody()` → passes to `html-to-text` → aggressively strips URLs, collapses whitespace.
8. Calls `detectionService.normalizeText()` on the combined `subject + body + snippet`.
9. Calls `detectionService.detectSubscription()`. If `isSubscription: true`:
   - Calls `extractINR()` for the amount.
   - Calls `extractBillingDate()` for the next billing date.
   - Pushes a `SUGGESTED` subscription object to `suggestions[]`.
10. If heuristic returns false, checks a broad billing keyword list (expanded to include `razorpay`, `paytm`, `upi`, `auto-debit`). If an email passes this check and `llmCalls < 5`, calls the LLM. Increments `llmCalls`.
11. Returns `suggestions[]`.

**The `MAX_LLM_CALLS = 5` guard:** Without this, a user who has 50 subscription services would trigger 50 Gemini API calls in a single sync, creating a large unexpected cost. The cap ensures a predictable maximum cost per sync.

---

#### `runBackgroundSync(userId)`
```
Input:  userId string (from cron or manual trigger)
Output: void (saves results directly to MongoDB)
```
**Step-by-step:**
1. Fetches the user from MongoDB. If no `googleRefreshToken` is saved → logs and exits. (This happens when the user signed up via email/password and never linked Gmail.)
2. Creates a new `OAuth2Client` with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. Calls `auth.getAccessToken()` — this silently exchanges the refresh token for a fresh short-lived access token. No user interaction required.
4. Calls `syncFromGmail(token, userId)` to get `detected[]`.
5. Updates `user.lastGmailSync = new Date()` and saves.
6. For each detected item:
   - **Email ID dedup:** `Subscription.findOne({ emailId: item.emailId })`. Skips if found.
   - **Service name dedup:** `Subscription.findOne({ userId, serviceName: { $regex: /^ServiceName$/i }, status: { $in: ['ACTIVE', 'SUGGESTED', 'PAUSED'] } })`. Skips if found.
   - Validates `serviceName`, `amount` (must be > 0), and `nextBillingDate` (must parse to a valid Date).
   - Saves a new `Subscription` document with `status: 'SUGGESTED'` and copies user notification preferences from the `User` document (denormalized for cron job efficiency).

---

### `detectionService.js`

#### `detectSubscription(from, content)`
```
Input:  from (email From header string), content (normalized plain text)
Output: { isSubscription: boolean, service: string|null, debug: object }
```
**Logic:**
1. Checks if `content` contains any of `['netflix', 'spotify', 'amazon']`.
2. **Early exit (performance optimization):** If none found, returns `{ isSubscription: false }` immediately. This short-circuits all further processing for the vast majority of emails.
3. **Amazon branch:** If `amazon` is found, checks for Amazon-specific subscription keywords: `['prime membership', 'amazon prime', 'membership renewal', 'subscription renewal', 'prime renewal']`. Returns `true` only if one of these is found. This prevents Amazon order confirmation emails from being falsely detected.
4. **Netflix/Spotify branch:** Checks for strong billing keywords: `['renewal', 'auto-renew', 'subscription', 'membership', 'billed', 'monthly', 'yearly']`. Returns `true` if any are found.
5. Returns `false` if no billing keywords are found even though the service name was mentioned.

**The `debug` object:** Contains boolean flags for each check (`hasService`, `hasStrongBilling`, `hasExclusion`). This is passed through to the saved `Subscription` document, giving developers a way to trace exactly why an email was or wasn't detected during troubleshooting.

---

#### `extractINR(text)`
```
Input:  Normalized plain text string
Output: { amount: string|null, currency: 'INR'|null }
```
**Logic:** Applies `/₹\s?[\d,.]+/` regex. Returns the first match (e.g., `₹499.00`). The caller (`gmailSyncService`) strips the `₹` and commas before converting to a float: `parseFloat(amount.replace(/₹|,/g, ''))`.

**Why return a string instead of a number?** Returning the raw match preserves the original formatting (e.g., `₹1,499.00`). Converting to float happens at the save site where we have full control over the format.

---

#### `extractBillingDate(text)`
```
Input:  Normalized plain text string
Output: Date string (e.g., 'May 10') or null
```
**Logic:**
1. **Priority match:** Applies a context-aware proximity regex: `/(?:next|renew|renewal|billing|due).{0,80}?(Month Day|Day Month)/i`. The `.{0,80}?` is a *lazy* quantifier — it captures the *closest* date within 80 characters of a billing keyword. This is a single regex pass, O(n) in text length.
2. **Fallback:** If no contextual match, applies two simpler regexes for `Month Day` and `Day Month` patterns and returns the first match anywhere in the text.
3. Returns `null` if no date is found. The caller defaults to `new Date()` (today) in this case.

**Why the lazy quantifier `.{0,80}?` matters:** The greedy alternative `.{0,80}` would match up to 80 chars and then look for a date. The lazy version finds the *nearest* date to the keyword. For an email that says "Your renewal is on May 10. Offer valid until December 31.", the lazy match correctly returns May 10, not December 31.

---

#### `normalizeText(text)`
```
Input:  Any string (could be HTML artifacts, mixed case, multiple spaces)
Output: Lowercase, single-spaced, trimmed string
```
**Logic:** `text.toLowerCase().replace(/\s+/g, ' ').trim()`. All keyword matching in `detectSubscription` relies on lowercase inputs — this function is the mandatory pre-processor that makes that possible.

---

### `llmService.js`

#### `extractSubscriptionWithLLM(text)`
```
Input:  Normalized plain text of a billing email
Output: { service: string, amount: number, nextBillingDate: string } or null
```
**Logic:**
1. Initializes `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`.
2. Selects `model: 'gemini-2.5-flash'`. Flash is ~10x cheaper and ~3x faster than Pro, which is important here since we call this up to 5 times per sync.
3. Constructs a prompt that:
   - Defines the AI's role as a pure extractor (not a chatbot).
   - Provides the exact JSON schema to return.
   - Instructs it to return `null` if the email is not a subscription billing email.
   - Lists strict rules: don't infer, don't guess service names from unrelated content, don't hallucinate dates.
4. Sets `generationConfig: { responseMimeType: 'application/json', temperature: 0.0 }`.
5. Calls `model.generateContent(prompt)` and parses `response.text()` as JSON.
6. Validates the result has a `service` field before returning. Returns `null` on any error or invalid output.

**Why `temperature: 0.0`:** LLMs are probabilistic by nature. Temperature controls randomness. At `0.0`, the model always selects the highest-probability token at each step, making outputs fully reproducible. The same email always returns the same JSON. This is critical for a data extraction tool — unpredictable outputs would create phantom subscriptions.

---

### `emailService.js`

#### `sendEmail(to, subject, htmlContent)`
```
Input:  recipient email, subject line, rendered HTML string
Output: Nodemailer info object (contains messageId)
```
**Logic:** Creates a Nodemailer transport using `service: 'gmail'` with `GMAIL_USER` and `GMAIL_APP_PASSWORD`. Calls `transporter.sendMail()`. Logs the message ID on success. Throws on failure (callers wrap in try/catch).

**Why Gmail App Password and not OAuth for SMTP?** Nodemailer supports OAuth2 SMTP, but it requires maintaining a separate refresh token lifecycle specifically for sending. Gmail App Password is simpler for a server-side sender — it never expires unless the user revokes it, and setup requires no OAuth flow.

#### Alert Helper Functions

Each helper follows the same pattern:
```
sendXxxAlert(to, sub, ...extraParams)
  → gets HTML from emailTemplates.getXxxHTML(sub, ...extraParams)
  → calls sendEmail(to, subject, html)
```

| Function | Subject line generated | Template function |
|---|---|---|
| `sendRenewalAlert` | "Reminder: Netflix renews in 3 days" | `getRenewalAlertHTML` |
| `sendOtpEmail` | "Password Reset Request" | `getOtpEmailHTML` |
| `sendFreeTrialEndingAlert` | "Your Spotify trial ends in 2 days" | `getFreeTrialEndingHTML` |
| `sendFailedPaymentAlert` | "Payment failed for Netflix" | `getFailedPaymentHTML` |
| `sendPriceIncreaseAlert` | "Netflix is increasing its price" | `getPriceIncreaseHTML` |
| `sendWeeklySummary` | "Your Weekly Subscription Summary" | `getWeeklySummaryHTML` |
| `sendBudgetAlert` | "Budget Alert: You've used 80% of your limit" | `getBudgetAlertHTML` |
| `sendNewSubscriptionAlert` | "New subscription added: Spotify" | `getNewSubscriptionHTML` |
| `sendOverdueEmail` | "Overdue Alert: Netflix" | `getOverdueAlertHTML` |

---

## Backend Controllers

---

### `subscriptionController.js`

#### `getSubscriptions(req, res)`
Queries `Subscription.find({ userId, ...statusFilter }).sort({ nextBillingDate: 1 })`. Status filter is applied if the `?status=` query parameter is present. Results sorted ascending by billing date (soonest first).

#### `getSubscriptionStats(req, res)`
Normalizes all billing cycles to monthly:
- `WEEKLY`: `cost × 4.33` (average weeks per month)
- `MONTHLY`: `cost × 1`
- `YEARLY`: `cost ÷ 12`

Returns: `monthlySpend`, `activeCount`, `pausedCount`, `cancelledCount`, `upcoming7DayCost`, `lastGmailSync`, `mostExpensive`.

#### `getSpendingHistory(req, res)`
Builds the last 6 months by iterating backward with `dayjs().subtract(i, 'month')`. For each month, sums subscriptions that were created before the month's end date and are not cancelled. This gives a timeline of "what you were paying each month."

#### `getCategoryBreakdown(req, res)`
Groups active subscriptions into category buckets (`Entertainment`, `Software`, etc.), calculates each bucket's percentage of total monthly spend, and sorts by value descending. Formatted for Recharts `<PieChart>`.

#### `createSubscription(req, res)`
1. Validates user exists.
2. Reads `alertDaysBefore` from user preferences (default: 3).
3. Computes `alertDate = dayjs(nextBillingDate).subtract(alertDays, 'day').startOf('day')`.
4. Saves new `Subscription` document.
5. If `user.preferences.budgetAlertOnNew && notifyViaEmail` → fires `sendNewSubscriptionAlert` asynchronously (`.catch()` so it doesn't fail the response).

#### `updateSubscription(req, res)`
1. Finds the subscription and reads `oldCost`.
2. Updates fields. Recalculates `alertDate` if `nextBillingDate` changed.
3. If `cost > oldCost` → saves `previousCost = oldCost` and fires `sendPriceIncreaseAlert` asynchronously.

#### `recordPayment(req, res)`
1. Reads current `nextBillingDate`.
2. Adds 1 billing cycle using `dayjs`.
3. **Overdue catch-up loop:** `while (nextDate.isBefore(now, 'day')) { add 1 cycle }`. This handles the case where a subscription has been overdue for months — it jumps the date forward to the next future occurrence rather than adding just one period.
4. Saves the new date.
5. Resets `overdueNotified = false`, `lastReminderSentAt = null`, `reminderCount = 0`. These resets are critical — without them, the cron job would never send a reminder for the newly rolled-forward date.

#### `triggerManualSync(req, res)`
Reads `userId` from `req.user` (set by `auth.js` JWT middleware). Calls `gmailSyncService.runBackgroundSync(userId)`. Returns `{ message: 'Manual sync complete' }`.

#### `getInsights(req, res)`
Returns high-level counts (overdue, due soon, upcoming) for the Dashboard hero. Sets `Cache-Control: no-store` to prevent browsers from caching stale counts.

#### `getUpcomingTimeline(req, res)`
Fetches all active subscriptions and splits them into three sorted arrays:
- `overdue`: `nextBillingDate < today` — sorted most-recently-missed first.
- `dueSoon`: `today <= nextBillingDate <= today + 3 days` — sorted soonest first.
- `upcoming`: everything else — sorted soonest first.

---

### `userController.js`

#### `googleLogin(req, res)`
1. Receives `{ code }` from the frontend Google OAuth flow.
2. Creates `OAuth2Client` with `redirect_uri: 'postmessage'` (required for the `auth-code` frontend flow).
3. Calls `oAuth2Client.getToken(code)` → gets `{ access_token, refresh_token, id_token }`.
4. Decodes `id_token` (using `google-auth-library` `verifyIdToken`) to get `email`, `name`, `picture`.
5. `User.findOneAndUpdate({ email }, { ...profileData }, { upsert: true })` — creates the user if new, updates if returning.
6. Saves `refresh_token` if provided. (Google only sends it on the *first* authorization. Subsequent logins omit it unless the user re-grants access.)
7. Signs a JWT with `{ id: user._id }` and `expiresIn: '7d'`. Returns it.

#### `requestOtp(req, res)`
1. Generates a 6-digit OTP with `Math.floor(100000 + Math.random() * 900000)`.
2. Hashes it with `bcrypt.hash(otp, 10)`.
3. Deletes any existing OTP for this email (enforces one-at-a-time).
4. Saves new `OtpToken` document with `expiresAt: Date.now() + 10 * 60 * 1000` (10 minutes).
5. Sends the plain OTP to the user's email via `sendOtpEmail`.

#### `resetPassword(req, res)`
1. Finds the `OtpToken` by email and checks `expiresAt > Date.now()`.
2. Calls `bcrypt.compare(plainOtp, hashedOtp)` to verify.
3. If valid: hashes the new password, updates the user, deletes the `OtpToken`.

---

## Cron Task Functions

---

### `renewalAlerts.js` — Main task function
```
For each ACTIVE subscription where alertDate = today (user's timezone):
  1. Check NotificationLog: skip if renewal alert already sent today
  2. sendRenewalAlert(user.email, sub, daysUntil)
  3. Write NotificationLog entry
  4. Update sub.lastReminderSentAt and sub.reminderCount++
```

### `overdueAlerts.js` — Main task function
```
For each ACTIVE subscription where nextBillingDate < today AND overdueNotified = false:
  1. sendOverdueEmail(sub)
  2. Set sub.overdueNotified = true (prevents repeat)
```

### `freeTrialAlerts.js` — Main task function
```
For each ACTIVE subscription where trialEndsAt is within 3 days AND trialAlertSent = false:
  1. sendFreeTrialEndingAlert(user.email, sub, daysLeft)
  2. Set sub.trialAlertSent = true
```

### `budgetAlerts.js` — Main task function
```
For each user with monthlyBudget set:
  1. Sum all ACTIVE subscription costs for this month
  2. Calculate percentage = currentSpend / monthlyBudget * 100
  3. If percentage >= 80 and no '80%' alert sent this month:
     → sendBudgetAlert(..., 80)
     → log in NotificationLog
  4. If percentage >= 100 and no '100%' alert sent this month:
     → sendBudgetAlert(..., 100)
     → log in NotificationLog
```

### `weeklySummary.js` — Main task function
```
Runs every Sunday at 9 AM (user's timezone):
  1. Find all users with notifyViaEmail = true
  2. Fetch subscriptions renewing in next 7 days
  3. sendWeeklySummary(user.email, user.name, upcomingSubs, totalMonthly)
```

---

## Frontend Functions

---

### `AuthContext.jsx`

#### `AuthProvider` component
Wraps the entire app. On mount, reads `localStorage.getItem('token')` and `localStorage.getItem('user')`. If both exist, restores the session into React state (auto-login on page refresh).

#### `login(token, userData)`
Sets `token` and `user` state. Writes both to `localStorage`. After this call, all Axios requests will automatically include the JWT (via the interceptor in `api.js`).

#### `logout()`
Clears `token` and `user` state. Removes both from `localStorage`. Navigates to `/login` via `useNavigate`.

#### `useAuth()`
A convenience hook: `return useContext(AuthContext)`. Any component can call `const { user, userId, login, logout } = useAuth()`.

---

### `api.js`

#### Axios interceptor
```js
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```
This runs before *every* API call. No individual function needs to manually set the auth header.

#### Key API functions

| Function | HTTP Method + Path | Returns |
|---|---|---|
| `fetchSubscriptions(userId, status?)` | GET `/subscriptions/:userId?status=` | `Subscription[]` |
| `fetchStats(userId)` | GET `/subscriptions/:userId/stats` | Stats object |
| `fetchInsights()` | GET `/subscriptions/insights` | Insight counts |
| `fetchUpcomingTimeline()` | GET `/subscriptions/upcoming` | Timeline object |
| `fetchCategoryBreakdown(userId)` | GET `/subscriptions/:userId/category-breakdown` | Category array |
| `fetchSpendingHistory(userId)` | GET `/subscriptions/:userId/spending-history` | Monthly array |
| `addSubscription(userId, data)` | POST `/subscriptions/` | New Subscription |
| `updateSubscription(id, data)` | PUT `/subscriptions/:id` | Updated Subscription |
| `updateSubscriptionStatus(id, status)` | PUT `/subscriptions/:id/status` | Updated Subscription |
| `paySubscription(id)` | PUT `/subscriptions/:id/pay` | Updated Subscription |
| `deleteSubscription(id)` | DELETE `/subscriptions/:id` | Deleted doc |
| `ignoreSubscription(id)` | PATCH `/subscriptions/:id/ignore` | Updated doc |
| `triggerManualSync()` | POST `/subscriptions/sync-manual` | `{ message }` |
| `setupAutoSync(userId, code)` | POST `/subscriptions/auto-setup` | Saved subs |

---

### `SubscriptionsGrid.jsx` — Key Logic

#### `invalidateAll(queryClient)`
```js
const SUB_QUERIES = ['subscriptions', 'insights', 'stats', 'upcomingTimeline'];
const invalidateAll = (qc) => SUB_QUERIES.forEach(k => qc.invalidateQueries([k]));
```
Called in `onSuccess` of every mutation. Forces all cached subscription data to be re-fetched from the backend immediately.

#### `syncMut` mutation
Uses `useMutation` with `triggerManualSync`. On success:
1. `invalidateAll()` — refreshes the subscription grid.
2. `setIsSynced(true)` — changes button to green "Synced! ✓".
3. `setTimeout(() => setIsSynced(false), 3000)` — resets button after 3 seconds.

Error handling: shows `alert()` with the error message (simple, not disruptive, since sync errors are rare).

#### `statusMut` mutation
After a status change, if the new status is `'ACTIVE'` (user approved a suggestion):
1. Sets `lastApprovedId` to the subscription's ID.
2. Clears it after 5 seconds with `setTimeout`.
The `SubscriptionCard` reads `lastApprovedId` to show a temporary "Just Approved! ✓" animation on that specific card.

---

### `Dashboard.jsx` — Key Logic

#### Overdue Banner rendering
```jsx
{timeline?.overdue?.length > 0 && (
  <div className="...red banner...">
    You have {overdue.length} subscriptions that need immediate attention.
  </div>
)}
```
The banner is conditionally rendered based on live `useQuery` data — it appears instantly when the page loads if there are overdue subscriptions, and disappears automatically once the user marks them as paid (because `invalidateAll` triggers a refetch).

#### Gmail Sync Setup (one-time flow)
Uses `useGoogleLogin({ flow: 'auth-code', scope: 'https://www.googleapis.com/auth/gmail.readonly' })`. On success, receives `code` and calls `setupAutoSync(userId, code)`. The backend exchanges this code for a refresh token (which is stored), then runs an immediate sync.

---

### `AnalyticsSection.jsx` — Chart Rendering

#### Y-Axis formatter (Line Chart)
```jsx
tickFormatter={(value) => `₹${value}`}
```
Converts raw numbers from the backend into localized currency display on the chart axis.

#### Tooltip formatter (both charts)
```jsx
formatter={(value) => [`₹${value.toFixed(2)}`, 'Spend']}
```
Ensures the hover tooltip always shows `₹` instead of the default bare number.
