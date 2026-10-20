# SMS Transfer & Real-Time Sync Platform

> **System Overview:** A production-grade SMS synchronization platform built with EduTechLab's **"Calm Organic Productivity"** design system and **military-grade AES-256-GCM** encryption. 
> 
> Admins log in to a React web console to monitor connected Android devices and trigger on-demand SMS pulls with granular filters (All, Date Range, Today, or Unsynced/Delta messages) with SIM 1 / SIM 2 dual-slot tagging, deletion, and real-time live synchronization. Mobile users authenticate via Email/Password or One-Click Google OAuth and can also manually push SMS to the server with a single tap. Background pulls are delivered silently via **Firebase Cloud Messaging (FCM) High-Priority Data Messages** with zero battery-draining polling.

---

## Architecture & Technology Stack

| Layer | Component | Technologies |
| :--- | :--- | :--- |
| **Backend API** | `Web/backend` | Node.js 24 • Express.js 4 • MongoDB Atlas (Mongoose 8) • Socket.io 4 • Firebase Admin 13 • Winston • Morgan • Joi • Swagger UI |
| **Admin Console** | `Web/frontend` | React 19 • Vite 6 • Tailwind CSS v4 • Framer Motion 12 • Redux Toolkit • TanStack Query v5 • Formik • Yup • Lucide Icons |
| **Mobile App** | `Flutter/mobile_app` | Flutter 3.44 (Dart 3.12) • AES-256-GCM Cryptography • Android Native Telephony • Dual-SIM SubscriptionManager • Firebase Cloud Messaging • Dio |
| **Security** | End-to-End Cryptography | **AES-256-GCM (AEAD)** • 256-bit Key derived via HKDF-SHA256 • 96-bit unique IV per message • 128-bit Authentication Tag (GMAC) • AAD context binding |

---

## Quick Start (Local Development)

### 1. Backend (Node.js + Express)

```bash
cd Web/backend

# 1. Install dependencies
npm install

# 2. Configure environment (pre-configured in .env)
# Verify MONGODB_URI and JWT_SECRET

# 3. Seed default Super Administrator account
npm run seed

# 4. Start backend server (auto-reloads on file change)
npm run dev
```

- **API Base:** `http://localhost:5000`
- **Swagger Interactive Docs:** `http://localhost:5000/api/docs`
- **Health Check Endpoint:** `http://localhost:5000/api/health`

#### Default Admin Credentials:
- **Email:** `admin@smstransfer.com`
- **Password:** `AdminSecurePassword#2026`

---

### 2. Frontend (React 19 + Vite Admin Dashboard)

```bash
cd Web/frontend

# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev
```

- **Dashboard URL:** `http://localhost:5173`
- Pre-proxies `/api` requests to backend on port `5000`.

---

### 3. Flutter Android Companion App

```bash
cd Flutter/mobile_app

# 1. Fetch dependencies
flutter pub get

# 2. Run on connected Android device or emulator
flutter run
```

---

## Military-Grade AES-256-GCM Cryptographic Core

To guarantee total confidentiality and zero data leaks:
1. **Uniqueness:** Every SMS is encrypted with a unique 96-bit (12-byte) Initialization Vector (`crypto.randomBytes(12)`). Two identical plaintexts produce completely different ciphertexts.
2. **Integrity & Authenticity (AEAD):** In Galois/Counter Mode, a 128-bit (16-byte) Authentication Tag is computed. Any tampering with the ciphertext or metadata causes decryption to immediately fail with an authentication exception.
3. **Context Binding (AAD):** Additional Authenticated Data binds the message to `userId:deviceId`. An encrypted message cannot be replayed or associated with a different device.
4. **Zero Plaintext at Rest:** Plaintext SMS bodies are never stored in MongoDB Atlas or written to terminal logs. Winston automatically redacts 4–8 digit verification codes and phone numbers.

### Verify Cryptography Standalone:
```bash
cd Web/backend
node test-crypto.js
```

---

## Render Free Tier Deployment Guide

### Web Service Settings on Render:
1. **Environment:** Docker
2. **Dockerfile Path:** `./Web/backend/Dockerfile`
3. **Health Check Path:** `/api/health`
4. **Environment Variables:**
   - `NODE_ENV=production`
   - `PORT=10000`
   - `MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/sms_transfer?retryWrites=true&w=majority`
   - `JWT_SECRET=<32_characters_random_key>`
   - `JWT_REFRESH_SECRET=<32_characters_random_key>`
   - `ENCRYPTION_MASTER_KEY=<32_characters_master_secret>`
   - `ADMIN_EMAIL=admin@smstransfer.com`
   - `ADMIN_PASSWORD=<YourSecurePassword>`
   - `FIREBASE_SERVICE_ACCOUNT_JSON=<Raw_or_Base64_JSON_string>`
   - `CORS_ORIGIN=https://your-frontend-domain.vercel.app`

### Keeping Render Free Tier Awake:
Render free web services spin down after 15 minutes of inactivity. To prevent sleep:
- Configure an external cron ping (e.g. [UptimeRobot](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org)) targeting `https://your-render-service.onrender.com/api/health` every **10 minutes**.
- Mobile devices are **not affected** by Render sleeping because Android uses **Firebase Cloud Messaging (FCM)** instead of maintaining persistent sockets.
