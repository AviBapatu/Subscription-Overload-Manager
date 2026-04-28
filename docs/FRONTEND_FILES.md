# Frontend — File-by-File Explanation

A detailed breakdown of every file in the `/frontend/src` directory, explaining its purpose, what it contains, and why it was built that way.

---

## Root Files

### `main.jsx`
**Purpose:** The React application's entry point.

**What it does:**
- Calls `ReactDOM.createRoot()` to mount the entire app into the `<div id="root">` in `index.html`.
- Wraps the app in `<GoogleOAuthProvider>` (from `@react-oauth/google`) with the `VITE_GOOGLE_CLIENT_ID`. This provides the Google Sign-In context to every component that needs it.
- Wraps in `<QueryClientProvider>` (from `@tanstack/react-query`) to make the React Query client available globally.

**Why:** Putting providers at the very root ensures every component anywhere in the tree can access Google OAuth and React Query without prop drilling.

---

### `App.jsx`
**Purpose:** Defines the client-side routing structure of the application.

**What it does:**
- Uses `BrowserRouter` and `Routes` from `react-router-dom` to declare page-level routes.
- `/` and `/dashboard` render `<Dashboard />`.
- `/subscriptions` renders `<SubscriptionsGrid />`.
- `/profile` renders `<Profile />`.
- `/login` renders `<Login />`.
- Wraps the authenticated routes inside the `<AuthContext.Provider>`, so only logged-in users can access the dashboard, subscriptions, and profile pages.
- Renders `<TopNavBar />` and `<MobileNav />` as persistent layout elements on authenticated pages.

**Why:** React Router keeps navigation client-side (no full page reloads). The layout components (nav bars) are rendered once here rather than repeated in every page component.

---

### `index.css`
**Purpose:** Global CSS containing the design system tokens.

**What it does:** Defines the Material Design 3-inspired color palette using CSS custom properties (variables). Contains tokens like `--color-primary`, `--color-surface-container`, `--color-on-background`. Also defines base font, scrollbar styling, and the `animate-in` utility classes for page transitions.

**Why:** Using CSS variables for all colors means changing the theme (e.g., switching from purple to blue as the primary color) requires editing one file, and the change propagates everywhere instantly.

---

### `App.css`
**Purpose:** Component-level CSS for global UI patterns used across multiple components.

**Contains:** Styles for the glassmorphism card effect, input field animations, modal backdrop blur, and custom scrollbar appearances.

---

## `/lib` — Utilities & Context

### `AuthContext.jsx`
**Purpose:** The global authentication state manager for the entire frontend.

**What it does:**
- Creates a React Context (`AuthContext`) using `createContext`.
- The `AuthProvider` component (which wraps the app in `App.jsx`) uses `useState` to store the current `user` object and `token`.
- On initial load, it reads the JWT from `localStorage` to restore the session automatically.
- Exposes a `login(token, user)` function that saves the token to `localStorage` and updates state.
- Exposes a `logout()` function that clears `localStorage` and resets state.
- Provides a `useAuth()` convenience hook for any component to call.

**Why:** Without this context, every component that needs the user's ID or token would require the data to be passed down as props through many component layers (prop drilling). The context puts this data globally accessible.

---

### `api.js`
**Purpose:** The single, centralized Axios instance for all backend communication.

**What it does:**
- Creates an Axios instance with `baseURL: import.meta.env.VITE_API_URL` (pointing to the Express backend).
- **Request Interceptor:** Before every request, it reads the JWT from `localStorage` and automatically attaches it as `Authorization: Bearer <token>`. This means no individual API function needs to manually set the header.
- **Exported API functions** (used by React Query hooks):
  - `fetchSubscriptions(userId, status?)` — GET subscriptions, optionally filtered.
  - `addSubscription(userId, data)` — POST a new subscription.
  - `updateSubscription(id, data)` — PUT to edit.
  - `updateSubscriptionStatus(id, status)` — PUT to change status.
  - `paySubscription(id)` — PUT mark as paid.
  - `deleteSubscription(id)` — DELETE.
  - `ignoreSubscription(id)` — PATCH to dismiss a suggestion.
  - `fetchStats(userId)` — GET spending stats.
  - `fetchInsights()` — GET dashboard insight counts.
  - `fetchUpcomingTimeline()` — GET payment timeline data.
  - `fetchCategoryBreakdown(userId)` — GET category pie chart data.
  - `fetchSpendingHistory(userId)` — GET 6-month spending history.
  - `triggerManualSync()` — POST to start a Gmail scan on-demand.
  - `setupAutoSync(userId, code)` — POST to configure Gmail sync for the first time.

**Why:** Centralizing all API calls here means that if the backend URL changes, only one file needs updating. The auto-injected authorization header ensures security without repetition.

---

## `/components` — Page-Level Components

### `Login.jsx`
**Purpose:** The authentication page, handling both sign-up and sign-in flows.

**What it does:**
- Renders either a "Login" or "Sign Up" form based on a `isSignup` toggle state.
- **Email/Password flow:** Sends credentials to `/api/users/login` or `/api/users/register`. Stores the returned JWT via `useAuth().login()`.
- **Google OAuth flow:** Uses the `useGoogleLogin` hook from `@react-oauth/google` with `flow: 'auth-code'`. On success, sends the authorization code to the backend's `/api/users/google-login` endpoint. The backend exchanges the code for tokens (getting the refresh token) and returns a JWT.
- **Password Reset:** A sub-flow that renders OTP request, OTP verify, and new password fields in sequence.
- **Animations:** Uses CSS `transition` classes to smoothly animate between form states.

**Why:** The `auth-code` Google flow (as opposed to `implicit`) is deliberately chosen because it's the only flow that provides a `refresh_token`, which is what enables the background Gmail sync to run even when the user is offline.

---

### `Dashboard.jsx`
**Purpose:** The main landing page shown after login.

**What it does:**
- Uses `useQuery` to fetch `fetchInsights()` and `fetchUpcomingTimeline()` from the backend.
- Passes the `insights` data (total monthly spend, active count) to `<HeroSection />`.
- Passes the `timeline` data (overdue, dueSoon, upcoming arrays) to `<PaymentTimeline />`.
- Renders the `<AnalyticsSection />` below the timeline.
- Conditionally renders an **Overdue Payment Banner** at the top if `timeline.overdue.length > 0`, styled in red to draw immediate attention.
- Has a one-time "Enable Gmail Sync" flow that uses `useGoogleLogin` to get an auth code and call `setupAutoSync`.

**Why:** The Dashboard is intentionally read-only (no editing). It is designed to be a command center for quickly seeing what's happening, then navigating to Subscriptions for management.

---

### `SubscriptionsGrid.jsx`
**Purpose:** The primary subscription management screen. The most interactive component.

**State Managed:**
- `statusFilter` — `'ALL'`, `'ACTIVE'`, or `'PENDING'` (maps to `SUGGESTED` in the DB).
- `isModalOpen`, `editingSub`, `formData` — Controls the Add/Edit modal.
- `lastApprovedId` — Tracks the ID of the most recently approved suggestion to render a temporary success animation on that card.
- `isSynced` — Controls the "Synced!" success state on the sync button.

**React Query Mutations:**
- `addMut` — Creates a new subscription via `addSubscription()`. On success, invalidates all subscription-related queries.
- `editMut` — Edits via `updateSubscription()`.
- `statusMut` — Changes status. When status becomes `ACTIVE`, sets `lastApprovedId` and clears it after 5 seconds.
- `ignoreMut` — Dismisses a suggestion.
- `payMut` — Marks as paid.
- `deleteMut` — Deletes.
- `syncMut` — Triggers `triggerManualSync()`. On success, sets `isSynced = true` and resets it to `false` after 3 seconds, providing the in-button feedback without using an `alert()`.

**Rendering:**
- Renders the header with the active count, total monthly cost, the "Sync Emails" button (with 3 states: idle/syncing/synced), and the filter tabs.
- Renders the `<SubscriptionCard />` grid, plus a static "Add Service" CTA tile.
- Shows skeleton loading tiles while `isLoading` is true.
- Shows an empty state message if no subscriptions match the current filter.

---

### `SubscriptionList.jsx`
**Purpose:** An alternative, simpler list-based view of subscriptions.

**What it does:** Fetches all subscriptions and renders them in a vertical list. Each item shows the service name, cost (in ₹), and next billing date. Includes inline "Add New" and "Pay" actions.

---

### `Profile.jsx`
**Purpose:** The user settings page.

**What it does:**
- Uses `useQuery` to load the user's full preferences from `GET /api/users/profile/:userId`.
- Manages `isSending` state for the "Send Test Email" button — provides 3 visual states: idle, "Sending...", "Sent!".
- Passes all data down to `<ProfileSideNav />` and `<SettingsPanels />`.
- On save, calls `PUT /api/users/profile/:userId` with the full updated preferences object.

---

### `TopNavBar.jsx`
**Purpose:** The persistent top navigation bar shown on desktop viewports.

**What it does:**
- Renders the app logo, the main navigation links (Dashboard, Subscriptions, Profile).
- Highlights the active link based on `useLocation()` from React Router.
- Renders a logout button that calls `useAuth().logout()`.

---

### `MobileNav.jsx`
**Purpose:** The bottom tab bar shown on mobile viewports.

**What it does:** A fixed-bottom navigation bar that mirrors the top nav's links, using Material Symbols icons. The active icon uses `FILL: 1` font variation to appear filled/solid while inactive icons use `FILL: 0` for the outlined style.

---

## `/components/dashboard`

### `HeroSection.jsx`
**Purpose:** The top section of the Dashboard showing key financial summary metrics.

**What it renders:**
- Total monthly spend in ₹.
- A "ring chart" (CSS-drawn donut) with segments for Active, Paused, and Cancelled subscriptions.
- The "Most Expensive" subscription callout card.
- "Upcoming 7-Day Cost" metric.

---

### `PaymentTimeline.jsx`
**Purpose:** The payment schedule view on the Dashboard.

**What it renders:**
- An "Overdue" section (red badges) for subscriptions past their billing date.
- A "Due Soon" section (amber badges) for subscriptions due within 3 days.
- An "Upcoming" section (blue badges) for everything else.
- Each item shows the service name, amount, and how many days away the payment is.

---

### `AnalyticsSection.jsx`
**Purpose:** The charts and spending analysis section.

**What it renders:**
- A **Line Chart** (Recharts `<LineChart>`) showing the last 6 months of total monthly spending. The Y-axis formatter and tooltip explicitly prepend the `₹` symbol.
- A **Pie Chart** (Recharts `<PieChart>`) showing the current month's spending broken down by category (Entertainment, Software, Fitness, etc.).

---

### `HeroSection/ui.jsx`
**Purpose:** Shared UI primitives for the dashboard section.

**Contains:** The `<StatCard />` component (a glassmorphism card with an icon, label, and value) used by `HeroSection` and `AnalyticsSection` for consistent styling. Also contains the `<PieChartWidget />` wrapper.

---

### `PrivacyBanner.jsx`
**Purpose:** A small informational banner shown when the user first enables Gmail sync.

**What it renders:** A notice explaining that the app only reads billing-related emails (invoices, receipts, renewals) and does not read personal messages. Builds user trust around the sensitive Gmail permission.

---

## `/components/subscriptions`

### `SubscriptionCard.jsx`
**Purpose:** The individual card UI for a single subscription in the grid.

**What it renders:**
- Service name, category badge, cost (₹), billing cycle, and next billing date.
- Status badge (Active, Paused, Suggested, etc.) with color coding.
- Action buttons: Edit, Change Status, Mark as Paid, Ignore, Delete.
- For `SUGGESTED` subscriptions: displays the "Accept" and "Ignore" buttons prominently instead of the full management menu.
- A "Just Approved!" success animation when `lastApprovedId` matches this card's `_id`.

---

### `SubscriptionModal.jsx`
**Purpose:** The Add/Edit modal form for manually creating or editing subscriptions.

**What it renders:**
- Form fields: Service Name, Cost (₹), Billing Cycle (Weekly/Monthly/Yearly), Category (dropdown), Next Billing Date.
- A "Free Trial" toggle. When enabled, shows an additional "Trial Ends Date" picker.
- Submit and Cancel buttons with `isPending` loading state while the mutation is in flight.

---

### `constants.js`
**Purpose:** Shared static data used across the subscription components.

**Contains:**
- `CATEGORIES` array — The list of all available categories (Entertainment, Software, Gaming, etc.) used to populate the category dropdown in the modal.
- `BILLING_CYCLES` array — `WEEKLY`, `MONTHLY`, `YEARLY` with display labels.

**Why:** Centralizing these prevents the same array from being defined multiple times in different components. If a new category needs to be added, it is changed here and updates everywhere.

---

## `/components/profile`

### `SettingsPanels.jsx`
**Purpose:** The large, multi-section settings UI.

**What it renders:**
- **Notification Preferences:** Toggle rows for each notification type (renewal reminders, overdue alerts, free trial warnings, price increases, weekly summary).
- **Quiet Hours:** Inputs to set a start and end time where notifications should not be sent.
- **Budget Settings:** An input to set the monthly budget cap, and a toggle for the 80% threshold alert.
- **Gmail Sync Status:** Shows the `lastGmailSync` timestamp.
- **Test Email Button:** Calls `sendTestNotification()`. The button has 3 visual states managed by `isSending` prop from `Profile.jsx`: idle (`Send Test Email`), loading (`Sending...` with spinner), success (`Sent ✓`).
- **Danger Zone:** "Delete Account" button that requires typing "DELETE" to confirm before calling the delete API.

---

### `ProfileSideNav.jsx`
**Purpose:** A vertical sidebar navigation within the Profile page.

**What it renders:** Links to scroll to different sections of the `SettingsPanels` (Notifications, Budget, Sync, Danger Zone). Highlights the active section as the user scrolls using an `IntersectionObserver`.

---

### `profile/ui.jsx`
**Purpose:** Shared UI primitives specific to the Profile section.

**Contains:**
- `<PrefRow />` — A reusable row layout component with a title, subtitle, and a right-side slot (used for toggle switches).
- `<Toggle />` — A styled CSS toggle switch component.
- `<DeleteAccountModal />` — The confirmation dialog for account deletion, including the "type DELETE to confirm" input validation.
