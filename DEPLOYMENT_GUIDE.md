# Deployment Guide: Deploying SMS Gateway to Render

This repository is configured for zero-friction deployment on [Render](https://render.com).

---

## ⚡ Option 1: 1-Click Render Blueprint (Recommended)

Render Blueprints use the [`render.yaml`](./render.yaml) file in the root of this repository to automatically provision both the **Backend Web Service** and the **Frontend Static Site**, while auto-linking their URLs and generating cryptographic secrets.

### Step 1: Push your latest changes to GitHub
Ensure you have committed and pushed the latest files (including `render.yaml`, `.gitignore`, and the updated frontend/backend code) to your GitHub repository:
```bash
git add .
git commit -m "Configure Render Blueprint deployment and custom UI"
git push origin main
```

### Step 2: Create a Blueprint Instance on Render
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** (top right) and select **Blueprint**.
3. Connect your GitHub repository (`SMS-Transfer`).
4. Render will detect `render.yaml` and list two resources:
   - `sms-transfer-backend` (Web Service)
   - `sms-transfer-frontend` (Static Site)
5. Under **Environment Variables**, provide:
   - **`MONGODB_URI`**: Your MongoDB Atlas connection string (e.g. `mongodb+srv://user:pass@cluster0.mongodb.net/sms_gateway?retryWrites=true&w=majority`).
   - **`FIREBASE_SERVICE_ACCOUNT_JSON`**: The raw contents of your `firebase-service-account.json` (or base64 encoded).
6. Click **Apply**.
7. Render will build and deploy both services!

---

## 🛠️ Option 2: Manual Deployment via Render Dashboard

If you prefer to configure each service manually in the Render dashboard:

### Part A: Deploy the Node.js Backend (Web Service)
1. Go to [Render Dashboard](https://dashboard.render.com) > **New +** > **Web Service**.
2. Select your GitHub repository.
3. Configure the settings:
   - **Name**: `sms-transfer-backend`
   - **Root Directory**: `Web/backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. In **Advanced** > **Health Check Path**: set `/api/health`.
5. In **Environment Variables**, add:
   | Key | Value / Notes |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `MONGODB_URI` | *Your MongoDB Atlas connection URI* |
   | `JWT_SECRET` | *32+ character random string* |
   | `JWT_EXPIRES_IN` | `1d` |
   | `JWT_REFRESH_SECRET` | *32+ character random string* |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `ENCRYPTION_MASTER_KEY` | *32+ character random string* |
   | `ADMIN_EMAIL` | `admin@sms.com` |
   | `ADMIN_PASSWORD` | `Admin@1234` |
   | `ADMIN_NAME` | `Super Administrator` |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | *Paste contents of firebase-service-account.json* |
   | `CORS_ORIGIN` | `*` (or your frontend Render URL) |
6. Click **Create Web Service**.
7. Once deployed, note down your backend URL (e.g. `https://sms-transfer-backend.onrender.com`).

---

### Part B: Deploy the React Admin Panel (Static Site)
1. Go to [Render Dashboard](https://dashboard.render.com) > **New +** > **Static Site**.
2. Select your GitHub repository.
3. Configure the settings:
   - **Name**: `sms-transfer-frontend`
   - **Root Directory**: `Web/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. In **Redirects / Rewrites**:
   - Add a rewrite rule:
     - **Type**: `Rewrite`
     - **Source**: `/*`
     - **Destination**: `/index.html`
   *(This ensures React Router works on page refreshes without 404 errors)*
5. In **Environment Variables**:
   - `VITE_API_BASE_URL`: `https://sms-transfer-backend.onrender.com` *(your backend service URL from Part A)*
6. Click **Create Static Site**.

---

## ⚠️ Important Production Checklist

### 1. MongoDB Atlas Network Access
Render services use dynamic IP addresses. In your MongoDB Atlas console:
1. Go to **Network Access**.
2. Click **Add IP Address**.
3. Choose **Allow Access from Anywhere** (`0.0.0.0/0`) so Render can connect to your database.

### 2. Firebase Service Account JSON
To pass your Firebase credentials securely as an environment variable without committing the file to git:
- **Option 1 (Raw JSON)**: Open `firebase-service-account.json`, copy the entire text, and paste it directly into `FIREBASE_SERVICE_ACCOUNT_JSON` in the Render environment variable field.
- **Option 2 (Base64)**: Run this in PowerShell to copy a compact base64 string:
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("Web\backend\firebase-service-account.json")) | Set-Clipboard
  ```
  Then paste it into `FIREBASE_SERVICE_ACCOUNT_JSON`. The backend automatically decodes it!

### 3. Connect the Flutter Mobile App to Production
In [`Flutter/mobile_app/lib/services/api_client.dart`](./Flutter/mobile_app/lib/services/api_client.dart), change the default server URL:
```dart
static String baseUrl = 'https://sms-transfer-backend.onrender.com/api/v1';
```
Then build the release APK:
```bash
cd Flutter/mobile_app
flutter build apk --release
```
The APK will be located at `build/app/outputs/flutter-apk/app-release.apk`.
