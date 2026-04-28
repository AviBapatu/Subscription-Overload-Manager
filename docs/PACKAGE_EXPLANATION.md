# NPM Package Reference — Complete Guide

This document explains every external dependency used in both the backend and frontend, including the specific version used, why it was chosen, what it replaces, and exactly where in the codebase it is used.

---

## Backend Packages (`/backend/package.json`)

---

### `express` `^5.2.1`
**Category:** Web Framework

**What it does:** Provides the HTTP server, routing system, and middleware pipeline for the entire backend.

**Why chosen:** The most widely-used Node.js web framework. Express v5 (currently in release candidate) provides native `async/await` error propagation in route handlers — unhandled promise rejections automatically call `next(err)`, eliminating the need for explicit `try/catch` blocks in every controller.

**Used in:**
- `server.js` — `express()`, `app.use()`, `app.listen()`
- `routes/subscriptions.js`, `routes/users.js`, `routes/testEmails.js` — `express.Router()`
- All controllers — `req`, `res` objects

**Alternative considered:** Fastify. Faster raw throughput, but Express has broader ecosystem support and middleware compatibility.

---

### `cors` `^2.8.6`
**Category:** Middleware — Security

**What it does:** Adds `Access-Control-Allow-Origin` headers to responses, allowing the browser to accept responses from a different origin (the frontend on port 5173 talking to the backend on port 5000).

**Why needed:** Browsers enforce the Same-Origin Policy. Without CORS middleware, every API call from the React frontend would be blocked with a `CORS error` in the browser console.

**Used in:** `server.js` as `app.use(cors())`.

**Configuration:** Currently uses the permissive default (allows all origins). In production, this should be locked to `origin: 'https://your-frontend-domain.com'`.

---

### `dotenv` `^17.4.2`
**Category:** Configuration

**What it does:** Reads a `.env` file at startup and loads each line as a `process.env` variable.

**Why needed:** API keys, database URIs, and secrets must never be hardcoded in source code. `dotenv` provides a standard way to inject these values at runtime without exposing them in git.

**Used in:** `server.js` as `require('dotenv').config()` — must be the first line executed before any other module reads from `process.env`.

**Note:** The `.env` file is in `.gitignore`. The repository includes a `.env.example` file documenting which variables are required.

---

### `mongoose` `^9.4.1`
**Category:** Database ORM

**What it does:** Provides schema validation, type casting, query building, and relationship management for MongoDB.

**Why chosen over raw MongoDB driver:**
- **Schema enforcement:** The raw driver has no schema. Mongoose `Schema` definitions catch type errors before bad data reaches the database.
- **Indexes:** Index definitions in `Subscription.js` are automatically applied to MongoDB on startup.
- **Virtuals and middleware:** Mongoose supports `pre/post` save hooks (used for automatic timestamp management via `{ timestamps: true }`).
- **Query builder:** `.find()`, `.findOneAndUpdate()`, `.sort()` have a clean, chainable API.

**Used in:**
- `models/User.js`, `models/Subscription.js`, `models/NotificationLog.js`, `models/OtpToken.js` — schema definitions
- All controllers — `Subscription.find()`, `User.findById()`, etc.
- `server.js` — `mongoose.connect()`

---

### `bcryptjs` `^3.0.3`
**Category:** Security — Password Hashing

**What it does:** Provides one-way password hashing using the bcrypt algorithm and hash comparison for login verification.

**Why bcrypt (not SHA-256 or MD5):**
- bcrypt is intentionally slow (adjustable work factor). This makes brute-force attacks computationally expensive.
- SHA-256 and MD5 are general-purpose hash functions optimized for *speed* — exactly wrong for passwords.
- `bcryptjs` is a pure JavaScript implementation (no native bindings), making it easier to install across all platforms.

**Used in:**
- `controllers/userController.js` — `bcrypt.hash(password, 10)` on registration, `bcrypt.compare(input, hash)` on login and OTP verification.

---

### `jsonwebtoken` `^9.0.3`
**Category:** Authentication — Session Tokens

**What it does:** Generates signed JSON Web Tokens (JWTs) for session authentication and verifies incoming tokens.

**Why JWTs:**
- **Stateless:** The server doesn't need to store session data. The token itself contains the user ID (`{ id: user._id }`).
- **Self-contained:** Can be verified by any server instance without a shared session store, making horizontal scaling trivial.
- **Expirable:** Set to `expiresIn: '7d'`. After 7 days, the frontend must re-authenticate.

**Used in:**
- `controllers/userController.js` — `jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' })` on login/register.
- `middleware/auth.js` — `jwt.verify(token, JWT_SECRET)` on every protected request.

---

### `google-auth-library` `^10.6.2`
**Category:** Google Integration — OAuth

**What it does:** Provides the `OAuth2Client` class for exchanging authorization codes for tokens and verifying Google ID tokens.

**Why needed:** The standard Google OAuth 2.0 flow requires server-side token exchange. This library handles the cryptographic verification of Google's responses and the `getToken()` flow.

**Used in:**
- `controllers/userController.js` — `new OAuth2Client(CLIENT_ID, CLIENT_SECRET, 'postmessage')`, `oAuth2Client.getToken(code)`
- `controllers/subscriptionController.js` — creating `OAuth2Client` for the `setupAutoSync` flow

---

### `googleapis` `^171.4.0`
**Category:** Google Integration — Gmail API

**What it does:** The official Google API client library. Provides typed interfaces to all Google APIs, including the Gmail API used for inbox scanning.

**Why needed:** Required to call `gmail.users.messages.list()` and `gmail.users.messages.get()`. Handles authentication, request signing, and response parsing.

**Used in:**
- `services/gmailSyncService.js` — `const { google } = require('googleapis')`, `google.gmail({ version: 'v1', auth })`, `gmail.users.messages.list()`, `gmail.users.messages.get()`

---

### `@google/genai` `^1.50.1`
**Category:** AI / Machine Learning

**What it does:** The official Google Generative AI (Gemini) SDK for Node.js. Provides access to Gemini models for text generation and structured data extraction.

**Why Gemini 2.5 Flash specifically:**
- **Speed:** Flash is the fastest Gemini model, with typical response times of 1–2 seconds for a short email extraction.
- **Cost:** Flash is ~10x cheaper per token than Gemini Pro.
- **JSON mode:** `responseMimeType: 'application/json'` is natively supported — the model API enforces valid JSON output at the protocol level, not just via prompt instructions. This is more reliable than parsing markdown-wrapped JSON.

**Previously used:** `openai` package targeting `gpt-4o-mini`. Migrated to Gemini for better JSON mode support and to consolidate on Google's ecosystem (since Gmail and OAuth are already Google infrastructure).

**Used in:** `services/llmService.js` — `new GoogleGenAI({ apiKey })`, `ai.models.generateContent()`

---

### `nodemailer` `^8.0.6`
**Category:** Email — SMTP

**What it does:** Sends emails via SMTP. Creates a transport configured with Gmail credentials and dispatches HTML emails.

**Why Gmail SMTP (not SendGrid/Brevo):**
- **No vendor lock-in:** Any Gmail account can be used as the sender.
- **No API key management for a third-party service:** Reduces the number of external dependencies.
- **Free:** Up to 500 emails/day via Gmail's free SMTP, which is sufficient for a personal subscription manager.

**Previously used:** Brevo (formerly Sendinblue). Replaced due to reliability concerns and the desire to eliminate an external service dependency.

**Setup requirement:** Gmail requires an "App Password" (Settings → Security → 2-Step Verification → App Passwords) — a 16-character password specifically for SMTP. The regular account password is rejected by Gmail's SMTP server.

**Used in:** `services/emailService.js` — `nodemailer.createTransport()`, `transporter.sendMail()`

---

### `html-to-text` `^9.0.5`
**Category:** Text Processing

**What it does:** Converts HTML strings to clean, readable plain text by removing tags, formatting links as `[link text](url)`, and converting tables to aligned text.

**Why needed:** Gmail API returns email bodies as raw HTML (with CSS, `<style>` blocks, `<table>` layout, etc.). The heuristic and LLM engines need clean, plain text. Passing raw HTML to the AI would waste tokens on markup and confuse the keyword matching regex.

**Used in:** `services/gmailSyncService.js` — `htmlToText(htmlBody, { wordwrap: 130 })`, followed by further cleanup with URL-stripping regex.

---

### `dayjs` `^1.11.20`
**Category:** Date Utilities

**What it does:** A lightweight (2KB) alternative to Moment.js for date parsing, formatting, arithmetic, and timezone conversion.

**Why dayjs over `Date`:**
- Native JS `Date` has extremely poor ergonomics for arithmetic (`nextBillingDate + 1 month` is several lines of error-prone code).
- `dayjs().add(1, 'month')` is readable, correct, and handles edge cases like month-end dates.
- The `dayjs-plugin-timezone` + `dayjs-plugin-utc` plugins enable correct timezone-aware comparisons in the cron jobs.

**Used in:**
- `controllers/subscriptionController.js` — date arithmetic in `recordPayment`, `createSubscription`, `getSpendingHistory`
- `jobs/tasks/*.js` — timezone-aware date comparisons

---

### `node-cron` `^4.2.1`
**Category:** Task Scheduling

**What it does:** Runs JavaScript functions on a schedule defined by a cron expression (e.g., `'0 * * * *'` = top of every hour).

**Why chosen:** The simplest possible scheduler for a Node.js server. Requires no external infrastructure (no Redis, no message queue). The cron expressions are the industry-standard format.

**Used in:** `jobs/scheduler.js` — `cron.schedule('0 * * * *', taskFunction)`

---

### `nodemon` `^3.1.14` (devDependency)
**Category:** Development Tool

**What it does:** Watches the backend source files and automatically restarts the Node.js server when a file changes.

**Why needed:** Without nodemon, developers would need to manually kill and restart `node server.js` after every code change during development. This dramatically reduces the feedback loop.

**Used via:** `npm run dev` → `nodemon server.js`

---

## Frontend Packages (`/frontend/package.json`)

---

### `react` `^19.2.4` & `react-dom` `^19.2.4`
**Category:** UI Framework

**What it does:** React is the component model and virtual DOM diffing engine. `react-dom` provides the browser renderer (`ReactDOM.createRoot()`).

**Why React:**
- Component-based architecture maps perfectly to this app's UI (each subscription card is a self-contained component with its own state).
- The massive ecosystem (React Query, React Router, etc.) provides all the tools needed without framework lock-in.
- React 19 brings improvements to concurrent rendering, which smooths UI transitions during data fetches.

---

### `vite` `^8.0.4` (devDependency)
**Category:** Build Tool / Dev Server

**What it does:** Ultra-fast development server using native ES modules (no bundling during dev). Production builds use Rollup for optimal chunking.

**Why Vite over Create React App:**
- CRA is officially deprecated. Vite is the community-recommended replacement.
- Native ESM dev server starts in milliseconds regardless of project size.
- Supports `import.meta.env` for environment variables natively.

---

### `react-router-dom` `^7.14.0`
**Category:** Client-Side Routing

**What it does:** Enables navigation between pages (Dashboard, Subscriptions, Profile) without full page reloads. Provides `<Routes>`, `<Route>`, `<Link>`, `useNavigate()`, `useLocation()`.

**Why client-side routing:** The app is a Single Page Application (SPA). Server-side routing would reload the entire React tree on every navigation, destroying cached query data and causing visible page flashes.

**Used in:** `App.jsx` (route definitions), `TopNavBar.jsx` and `MobileNav.jsx` (navigation links with active state detection via `useLocation()`).

---

### `@tanstack/react-query` `^5.97.0`
**Category:** Server State Management

**What it does:** Manages the lifecycle of asynchronous data fetching — caching, background refetching, stale-time configuration, and mutation callbacks.

**Why not Redux or Zustand:**
- Redux and Zustand are designed for *client* state (UI toggles, form values).
- Subscription data is *server* state — it lives in MongoDB and can change due to background cron jobs without the frontend knowing.
- React Query automatically handles: cache invalidation, `isLoading` / `isError` states, automatic background refetches on window focus, and optimistic updates.

**Key patterns used:**
- `useQuery({ queryKey, queryFn })` — for all data reads (subscriptions, stats, insights).
- `useMutation({ mutationFn, onSuccess })` — for all data writes (add, edit, pay, sync).
- `queryClient.invalidateQueries([key])` — to mark cached data as stale and trigger immediate refetch after mutations.

**Used in:** `SubscriptionsGrid.jsx`, `Dashboard.jsx`, `Profile.jsx`, `SubscriptionList.jsx`.

---

### `axios` `^1.15.2`
**Category:** HTTP Client

**What it does:** A promise-based HTTP client with a clean API, automatic JSON parsing, and request/response interceptors.

**Why over `fetch`:**
- `fetch` requires manual `res.json()` calls and doesn't throw on 4xx/5xx responses.
- Axios **automatically** throws errors on non-2xx responses, which React Query catches correctly.
- Axios **interceptors** allow JWT injection in one place rather than in every fetch call.

**Used in:** `lib/api.js` — the central Axios instance with the JWT interceptor.

---

### `@react-oauth/google` `^0.13.5`
**Category:** Google OAuth

**What it does:** Wraps the Google Identity Services JavaScript library in React hooks and components. Provides `<GoogleOAuthProvider>`, `useGoogleLogin()`, and `GoogleLogin` button component.

**Why `flow: 'auth-code'`:** The application uses the `auth-code` flow rather than `implicit` or `token` flow. The `auth-code` flow is the **only** flow that returns a `refresh_token` from Google. This refresh token is what enables background Gmail syncs to run indefinitely without the user being logged in.

**Used in:**
- `main.jsx` — `<GoogleOAuthProvider clientId={...}>`
- `Login.jsx` — `useGoogleLogin({ flow: 'auth-code', onSuccess, scope })`
- `Dashboard.jsx` — `useGoogleLogin` for Gmail sync setup

---

### `recharts` `^3.8.1`
**Category:** Data Visualization

**What it does:** A composable charting library built on D3 and React. Provides `<LineChart>`, `<PieChart>`, `<BarChart>`, `<Tooltip>`, `<Legend>`, etc.

**Why Recharts over Chart.js:**
- Recharts components are native React components — they respond to React state changes and re-render naturally.
- Chart.js requires `useRef` and imperative `chart.update()` calls, which breaks the declarative React model.
- Recharts supports custom tooltips as JSX components, which we use to format the `₹` currency display.

**Used in:** `components/dashboard/AnalyticsSection.jsx` — spending history line chart and category breakdown pie chart.

---

### `lucide-react` `^1.8.0`
**Category:** Icon Library

**What it does:** Provides clean, consistent SVG icons as React components.

**Used in:** Various dashboard and card components for visual hierarchy (trend arrows, warning icons, etc.).

---

### `dayjs` `^1.11.20`
**Category:** Date Utilities (Frontend)

**Why included on both frontend and backend:** The frontend needs to format dates for display (e.g., "renews May 10, 2026") and for date input pre-population in the subscription form. Using the same library on both sides ensures consistent date formatting behavior.

**Used in:** `SubscriptionsGrid.jsx` (default date calculation for new subscriptions), `SubscriptionCard.jsx` (date display formatting).

---

### `tailwindcss` `^4.2.2` & `@tailwindcss/vite` `^4.2.2`
**Category:** CSS Framework

**What it does:** A utility-first CSS framework. Rather than writing CSS classes, you compose styles directly in JSX using utility classes like `bg-primary`, `rounded-full`, `flex`, `gap-4`.

**Why Tailwind v4:** Uses a CSS-native configuration (via `@theme` in CSS) instead of `tailwind.config.js`. The `@tailwindcss/vite` plugin integrates directly with Vite's build pipeline for extremely fast CSS compilation.

**Design system:** All color tokens (e.g., `--color-primary`, `--color-surface-container`) are defined as CSS custom properties in `index.css` and referenced by Tailwind classes throughout the app. This enables the glassmorphism dark-mode aesthetic while remaining easily themeable.

---

### `dotenv` `^17.4.2` (Frontend devDependency)
**Category:** Configuration

**Note:** On the frontend, Vite handles environment variables natively via `import.meta.env.VITE_*`. The `dotenv` package listed in frontend dependencies is rarely used directly — Vite's built-in env handling is the primary mechanism. All frontend env variables must be prefixed with `VITE_` to be exposed to client-side code.

---

## Dev Dependencies Summary

| Package | Side | Purpose |
|---|---|---|
| `nodemon` | Backend | Auto-restarts server on file change |
| `vite` | Frontend | Dev server + production bundler |
| `@vitejs/plugin-react` | Frontend | Babel transforms for JSX |
| `eslint` + plugins | Frontend | Code quality linting |
| `autoprefixer` + `postcss` | Frontend | Adds vendor CSS prefixes for browser compatibility |
| `@types/react` | Frontend | TypeScript type hints for React (used by IDEs even in JS projects) |
