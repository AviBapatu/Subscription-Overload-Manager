# Code Explanation

This document provides a comprehensive breakdown of the major directories, files, and core functions within the Subscription Overload Manager project.

## Backend Structure (`/backend`)

### `/services`
The core business logic engines of the application.
- **`gmailSyncService.js`**: The orchestrator for email scanning.
  - `syncFromGmail(accessToken, userId)`: Fetches emails from the Gmail API, parses the HTML payload into text, skips self-sent and server-sent emails, and routes the text through the detection pipeline.
  - `runBackgroundSync(userId)`: Fetches a fresh Google OAuth access token using the user's saved refresh token, runs the sync, and saves newly discovered subscriptions to MongoDB while preventing duplicates.
- **`detectionService.js`**: The Stage 1 Heuristic Engine.
  - `detectSubscription(from, content)`: A lightning-fast, regex-based function that short-circuits instantly if known services (Netflix, Amazon) aren't mentioned.
  - `extractBillingDate(text)`: Uses a Context-Aware Proximity Regex to find dates occurring strictly within 80 characters of a billing keyword, eliminating the need for slow array traversals.
- **`llmService.js`**: The Stage 2 AI Engine.
  - `extractSubscriptionWithLLM(text)`: Interfaces with Google Gemini 2.5 Flash via `@google/genai`. Uses a strict, deterministic prompt forcing the model to return JSON conforming to the `Subscription` schema.
- **`emailService.js`**: The Nodemailer SMTP wrapper. Contains functions like `sendRenewalAlert` and `sendBudgetAlert` which dispatch localized HTML emails.

### `/controllers`
Handles HTTP request routing and database interactions.
- **`subscriptionController.js`**: 
  - `getSubscriptions` / `getSubscriptionStats`: Calculates normalized monthly spending and active counts.
  - `triggerManualSync`: An API endpoint triggered by the frontend's "Sync Emails" button, invoking `runBackgroundSync` on-demand.
  - `recordPayment`: Automatically rolls a subscription's billing date forward to the next cycle (weekly/monthly/yearly) when marked as paid.
- **`authController.js`**: Manages Google OAuth flows, JWT generation, and User profile creation.
- **`notificationController.js`**: Handles manual testing endpoints for emails and manages the internal `NotificationLog` database.

### `/models`
Mongoose schemas defining the MongoDB database structure.
- **`Subscription.js`**: Stores subscription metadata, cycles, costs, and the engine source (`heuristic` vs `llm`). Includes denormalized user data for faster cron job execution.
- **`User.js`**: Stores profile data, Google OAuth refresh tokens, and granular notification preferences.
- **`NotificationLog.js`**: Tracks sent emails to prevent spam and enforce idempotency based on the user's local timezone.

### `/cron`
- **`notifications.js`**: Background tasks that wake up hourly to query the database and dispatch emails for renewals and free trial endings.

---

## Frontend Structure (`/frontend/src`)

### `/components`
React components forming the user interface.
- **`SubscriptionsGrid.jsx`**: The primary orchestrator for the Subscriptions tab. It manages React Query data fetching, handles the `isSynced` UI state for manual syncs, and renders individual cards.
- **`SubscriptionList.jsx` / `SubscriptionCard.jsx`**: UI components that display individual subscription data, allowing users to edit, pause, or mark them as paid.
- **`Dashboard.jsx`**: The main landing view. Renders the Overview stats, the Payment Timeline (overdue, due soon), and the Analytics section.
- **`Profile.jsx`**: Manages user settings, budget limits, notification toggles, and allows the user to trigger test emails to verify their SMTP connection.

### `/components/dashboard`
- **`AnalyticsSection.jsx`**: Wraps Recharts components to render the 6-month spending history line chart and the category breakdown pie chart. Hardcoded to display localized currency (₹).

### `/lib`
- **`api.js`**: The Axios wrapper. It automatically intercepts requests to attach the JWT Authorization header. Contains exported functions like `triggerManualSync()` and `updateSubscriptionStatus()` for easy use within React Query mutations.
- **`AuthContext.jsx`**: React Context provider managing global authentication state, logging users in/out, and persisting the JWT in `localStorage`.
