# Subscription Overload Manager

## Overview
Subscription Overload Manager is a powerful, centralized platform designed to help users track, manage, and optimize their recurring expenses. By linking a Google account, the system automatically scans your inbox to detect billing emails, extracts subscription details (Service Name, Cost, and Billing Cycle), and aggregates them into a highly visual dashboard. 

## Key Features
- **Centralized Tracking:** View all your active, paused, and upcoming subscriptions in a single grid.
- **Gmail Auto-Sync Engine:** Securely scans your inbox for receipts and invoices, utilizing a highly optimized Heuristic Engine and Google Gemini AI to accurately extract subscription data.
- **Automated Alerts:** Receive localized email notifications for upcoming renewals, free trial expirations, and budget warnings.
- **Expense Analytics:** A comprehensive dashboard featuring monthly spend calculations, category breakdowns, and a dynamic 6-month spending history chart.
- **Smart Deduplication:** Advanced logic to prevent duplicate entries and ignore emails sent by the server or the user themselves.

## Tech Stack
- **Frontend:** React, Vite, TailwindCSS, React Query, Recharts, Google OAuth
- **Backend:** Node.js, Express, MongoDB, Mongoose, Node Cron, Nodemailer
- **AI Integration:** Google Gemini 2.5 Flash (`@google/genai`)

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas URI)
- Google Cloud Console Project (with Gmail API enabled and OAuth Credentials)
- Google Gemini API Key

### 2. Backend Configuration
Navigate to the `backend` directory and create a `.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GEMINI_API_KEY=your_google_gemini_api_key
GMAIL_USER=your_server_email_address@gmail.com
GMAIL_APP_PASSWORD=your_16_char_gmail_app_password
```
Install dependencies and run:
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend Configuration
Navigate to the `frontend` directory and create a `.env` file:
```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```
Install dependencies and run:
```bash
cd frontend
npm install
npm run dev
```

## Documentation
- [Architecture Details](ARCHITECTURE.md)
- [Code Structure & Functions](CODE_EXPLANATION.md)
- [NPM Packages](PACKAGE_EXPLANATION.md)
