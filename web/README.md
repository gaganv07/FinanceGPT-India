# FinanceGPT India — Web & Vercel Deployment Guide

Official AI Financial Education Assistant grounded exclusively on **Reserve Bank of India (RBI)** and **Securities and Exchange Board of India (SEBI)** educational materials.

- **Developer:** Gagan Gowda BM
- **Registration Number:** 24UG00204
- **Programme:** Bachelor of Computer Applications (BCA)
- **Institution:** Chanakya University
- **Architecture:** Next.js 14 (App Router) + TypeScript + Native Server-Side API Routes + Vercel Deployment

---

## 1. Security & Architecture Overview

### Why Server-Side API Architecture?
In the initial desktop prototype (Streamlit), API keys were entered directly into the browser or stored in client-accessible sessions. In this production deployment:
1. **Zero Client Secrets:** The public user interface never renders an API key input field, developer debugging console, or internal configuration sliders.
2. **Server-Side Mediation (`/api/chat`):** All generative AI calls are routed strictly through Next.js server-side route handlers running on Node.js/Vercel serverless functions.
3. **Protected Variable:** The Google Gemini API key is loaded exclusively from `process.env.GEMINI_API_KEY`. It is **never** prefixed with `NEXT_PUBLIC_` and is never included in JavaScript bundles shipped to client browsers.
4. **Resilient Offline Grounding:** If the server environment variable is unset or upstream cloud APIs experience temporary delays, FinanceGPT automatically falls back to verified excerpts from the local 335-chunk RBI/SEBI knowledge base with citations.

---

## 2. Environment Variables

| Variable Name | Required | Deployment Scope | Purpose |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Recommended | Server-Side Only (`Production`, `Preview`, `Development`) | Authenticates server requests to Google Gemini 2.5 Flash. |

> **IMPORTANT:**
> - Never prefix with `NEXT_PUBLIC_`.
> - Never commit `.env` or `.env.local` to Git. Only `.env.example` is committed.

---

## 3. Local Development (Windows PowerShell)

### Prerequisites
- Node.js v18 or later (tested on Node v24)
- npm v9 or later

### Step 1: Navigate to the `web` directory
```powershell
cd D:\FinanceGPT\web
```

### Step 2: Install dependencies
```powershell
npm install
```

### Step 3: Configure local environment (Optional for AI generation)
Create a `.env.local` file inside `D:\FinanceGPT\web`:
```powershell
Copy-Item .env.example .env.local
```
Edit `.env.local` and paste your key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Step 4: Run unit tests
```powershell
npm test
```

### Step 5: Start the local development server
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 6: Test production build locally
```powershell
npm run build
npm start
```

---

## 4. Deploying to Vercel (Step-by-Step)

### Option A: Using Vercel Dashboard (Recommended for Beginners)

1. **Push your code to GitHub / GitLab / Bitbucket**:
   ```powershell
   git add .
   git commit -m "feat: migrate FinanceGPT India to Vercel Next.js web application"
   git push origin main
   ```

2. **Log into Vercel**:
   Go to [https://vercel.com](https://vercel.com) and log in with your GitHub account.

3. **Import Project**:
   - Click **"Add New..."** → **"Project"**.
   - Select your `FinanceGPT` repository from the list.

4. **Configure Project Settings**:
   - **Framework Preset**: Next.js (automatically detected).
   - **Root Directory**: Click "Edit" and choose `web`. *(Crucial: This tells Vercel where the Next.js app is located while preserving the root Python workspace)*.

5. **Set Environment Variable**:
   - Scroll down to the **Environment Variables** section.
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Paste your Google Gemini API key.
   - Ensure checkboxes for **Production**, **Preview**, and **Development** are checked.
   - Click **Add**.

6. **Deploy**:
   - Click **"Deploy"**.
   - Vercel will build the Next.js app in ~60 seconds and assign a live production URL (e.g., `https://financegpt-india.vercel.app`).

---

### Option B: Using Vercel CLI (From Terminal)

```powershell
# 1. Install Vercel CLI globally (or run via npx)
npx vercel login

# 2. Deploy from the web folder
cd D:\FinanceGPT\web
npx vercel

# 3. Add the secure secret
npx vercel env add GEMINI_API_KEY production

# 4. Deploy to production
npx vercel --prod
```

---

## 5. Automated Verification Checklist

- [x] **Python Tests:** All 32 existing pytest tests in `D:\FinanceGPT\tests` pass.
- [x] **JavaScript/TypeScript Parity Tests:** 13 unit tests in `web/tests/parity.test.js` pass.
- [x] **Zero Leaked Secrets:** Client bundle inspected; `process.env.GEMINI_API_KEY` is inaccessible in browser console or network payloads.
- [x] **Safety Guardrails:** Card numbers, OTPs, and UPI PINs intercepted with immediate warnings.
- [x] **Financial Calculators:** Exact mathematical parity with Python implementation for SI, CI, EMI, Budget, and Inflation.
- [x] **Knowledge Base Grounding:** All 335 chunks and 10 official RBI/SEBI documents preserved and queryable.
