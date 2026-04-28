# Documentation

This folder contains the complete technical documentation for the **Subscription Overload Manager**.

> **New to this codebase?** Start with the project [README](../README.md), then read in the order below.

---

| File | What It Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, pipeline diagrams, all technical decisions and why they were made |
| [BACKEND_FILES.md](./BACKEND_FILES.md) | Every backend file explained — purpose, functions, parameters, and logic |
| [FRONTEND_FILES.md](./FRONTEND_FILES.md) | Every frontend file explained — components, state, hooks, and rendering |
| [CODE_EXPLANATION.md](./CODE_EXPLANATION.md) | Deep function-by-function reference with signatures, step-by-step logic, and code examples |
| [PACKAGE_EXPLANATION.md](./PACKAGE_EXPLANATION.md) | Every NPM dependency — version, purpose, alternatives considered, and where it is used |

---

## Quick Reference

### Key Backend Files
| File | Purpose |
|---|---|
| `backend/server.js` | Entry point — Express, DB connect, start scheduler |
| `backend/jobs/scheduler.js` | Starts all hourly background cron tasks |
| `backend/middleware/auth.js` | JWT guard for all protected routes |
| `backend/services/gmailSyncService.js` | Gmail scan pipeline orchestrator |
| `backend/services/detectionService.js` | Stage 1: Heuristic email classifier (fast, free) |
| `backend/services/llmService.js` | Stage 2: Gemini AI extractor (for unknown services) |
| `backend/services/emailService.js` | SMTP dispatcher for all outgoing notifications |

### Key Frontend Files
| File | Purpose |
|---|---|
| `frontend/src/main.jsx` | React entry point — mounts providers |
| `frontend/src/App.jsx` | Route definitions |
| `frontend/src/lib/AuthContext.jsx` | Global auth state (JWT, user object, login/logout) |
| `frontend/src/lib/api.js` | Axios client — auto-injects JWT on every request |
| `frontend/src/components/SubscriptionsGrid.jsx` | Main subscription management UI with sync button |
| `frontend/src/components/Dashboard.jsx` | Overview, analytics, and payment timeline |

### Environment Variables
| Variable | Side | Purpose |
|---|---|---|
| `MONGODB_URI` | Backend | MongoDB connection string |
| `JWT_SECRET` | Backend | Signs and verifies auth tokens |
| `GOOGLE_CLIENT_ID` | Backend + Frontend | Google OAuth app ID |
| `GOOGLE_CLIENT_SECRET` | Backend | Google OAuth secret (backend only) |
| `GEMINI_API_KEY` | Backend | Google Gemini AI access |
| `GMAIL_USER` | Backend | SMTP sender email (`yourapp@gmail.com`) |
| `GMAIL_APP_PASSWORD` | Backend | Gmail App Password (16 chars, not account password) |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Google OAuth client for login button |
| `VITE_API_URL` | Frontend | URL of the Express backend |
