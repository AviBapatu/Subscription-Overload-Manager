# Package Explanation

This document outlines the purpose of each external NPM package used in both the backend and frontend of the Subscription Overload Manager.

## Backend Packages (`/backend/package.json`)

### Core Framework & Server
- **`express`**: The primary web framework used to create REST API endpoints and manage middleware.
- **`cors`**: Middleware to enable Cross-Origin Resource Sharing, allowing the React frontend (running on a different port) to securely communicate with the Express backend.
- **`dotenv`**: Loads environment variables from the `.env` file into `process.env`, keeping API keys and secrets secure.

### Database & Security
- **`mongoose`**: An Object Data Modeling (ODM) library for MongoDB. Used to enforce schemas (`User.js`, `Subscription.js`), manage relationships, and provide a simplified query interface.
- **`bcryptjs`**: Used for securely hashing user passwords before storing them in MongoDB, and comparing hashes during login.
- **`jsonwebtoken` (JWT)**: Generates secure tokens for authenticated user sessions. The token is sent to the frontend upon login and passed back in the `Authorization` header for protected routes.

### Integrations & AI
- **`google-auth-library` & `googleapis`**: The official Google SDKs. Used to verify OAuth logins from the frontend, securely exchange auth codes for refresh tokens, and interact directly with the Gmail API (`gmail.users.messages`).
- **`@google/genai`**: The official Google Gemini SDK. Powers the Stage 2 LLM Fallback engine, sending email text to `gemini-2.5-flash` to extract structured JSON data.
- **`nodemailer`**: A module for sending emails. Used to dispatch renewal alerts, budget warnings, and OTPs via a configured SMTP server (Gmail).

### Utilities & Processing
- **`html-to-text`**: A critical utility for the background sync engine. It takes messy HTML payloads from Gmail and cleanly strips tags, links, and formatting into plain text for the Heuristic and AI engines to parse.
- **`dayjs`**: A lightweight library for date formatting and manipulation. Used extensively to calculate "next billing dates", add days to dates, and handle timezone shifts.
- **`node-cron`**: A task scheduler used to run background jobs. It powers `backend/cron/notifications.js`, waking up the server hourly to check for due subscriptions.

---

## Frontend Packages (`/frontend/package.json`)

### Core Framework & UI
- **`react` & `react-dom`**: The core libraries for building the component-based user interface.
- **`react-router-dom`**: Handles client-side routing, enabling navigation between the Dashboard, Subscriptions, and Profile pages without reloading the browser.
- **`tailwindcss` & `@tailwindcss/vite`**: A utility-first CSS framework used for styling the entire application (glassmorphism, dark mode, responsive grids).

### Data Management & API
- **`@tanstack/react-query`**: An incredibly powerful asynchronous state management library. It caches API responses from the backend, handles loading/error states, and automatically invalidates/refetches data when mutations (like triggering a manual sync) occur.
- **`axios`**: A promise-based HTTP client used in `lib/api.js` to communicate with the Express backend and automatically attach JWT headers via interceptors.

### Components & Auth
- **`@react-oauth/google`**: Provides the Google Login button and handles the initial OAuth flow to get the authentication code needed by the backend.
- **`recharts`**: A composable charting library. Powers the pie charts (Category Breakdown) and line charts (Spending History) in the Analytics Dashboard.
- **`lucide-react`**: Provides clean, modern SVG icons used throughout the dashboard interface.
- **`dayjs`**: Included on the frontend to consistently format display dates (e.g., "May 15, 2026") mirroring the backend's logic.
