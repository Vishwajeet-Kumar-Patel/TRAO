# AI Interview Prep Kit — Production Deployment & Architecture Guide

> **Production-grade AI-powered interview preparation platform** with deterministic requirement coverage guarantees, live company intelligence crawling, multi-pass gap closing, active recall practice, and batch evaluation CLI.

---

## 1. Architecture Overview

```text
GitHub Repository
│
├── frontend/ (Next.js 14 App Router)
│   └── Deployed on Vercel (Native Next.js)
│       └── Calls backend via NEXT_PUBLIC_API_URL
│
├── backend/ (Node.js + Express + TypeScript)
│   └── Deployed on Render (Docker Web Service)
│       └── Binds to 0.0.0.0:${PORT:-5000}
│       └── Stateless runtime
│
├── shared/ (@prep-kit/shared)
│   └── Shared TypeScript models, Zod validation schemas & types
│
├── external: MongoDB Atlas (Database-as-a-Service)
├── external: Google Gemini / OpenAI (LLM Provider)
└── cases.json / test_cases.json (Batch Evaluation CLI)
```

---

## 2. Environment Variables Specification

### A. Backend Variables (Render Web Service / Local Backend)

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Set execution environment |
| `PORT` | **Yes** | `5000` (Render sets automatically) | Express server listening port (bound to `0.0.0.0`) |
| `MONGODB_URI` | **Yes** | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/prepkit?retryWrites=true&w=majority` | MongoDB Atlas external connection string |
| `JWT_SECRET` | **Yes** | `min-32-chars-random-secret` | Secret key for signing user authentication tokens |
| `FRONTEND_URL` | **Yes** | `https://<your-vercel-project>.vercel.app` | Whitelisted frontend origin(s) for CORS with credentials |
| `LLM_PROVIDER` | No | `gemini` (or `openai`) | Target LLM provider |
| `LLM_MODEL` | No | `gemini-1.5-flash` | Selected model name |
| `LLM_API_KEY` | **Yes** | `AIzaSy...` | API key for Gemini or OpenAI |
| `ALLOW_LOCALHOST_SSRF` | No | `false` in prod (`true` in dev/eval) | Blocks loopback/private IPs during URL crawling |

### B. Frontend Variables (Vercel Project / Local Frontend)

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://<your-render-backend>.onrender.com/api` | Public backend API URL accessible by the browser |

> ⚠️ **Security Rule:** Never expose `LLM_API_KEY`, `JWT_SECRET`, or `MONGODB_URI` under `NEXT_PUBLIC_*`.

---

## 3. Local Development & Testing

### Option A: Native Node.js Monorepo

```bash
# 1. Install all dependencies across workspaces
npm install

# 2. Configure environment
cp .env.example .env

# 3. Build all workspace packages
npm run build

# 4. Run tests
npm test

# 5. Start dev servers concurrently (Frontend on :3000, Backend on :5000)
npm run dev
```

### Option B: Local Docker Compose (Development & Container Testing Only)

```bash
# Build and start frontend, backend, and local MongoDB
docker compose up --build

# View container logs
docker compose logs -f

# Teardown containers and volumes
docker compose down -v
```

---

## 4. Batch Evaluation CLI

The mandatory evaluation command processes single or multiple interview preparation test cases offline or with live models:

```bash
npm run evaluate -- --input test_cases.json --output test_kits.json
```

**Input Format (`cases.json`):**
```json
[
  {
    "id": "case-01-senior-fullstack",
    "jd": "Senior Full Stack Engineer with React, TypeScript, Node.js, and Distributed Systems experience...",
    "company_url": "https://stripe.com",
    "days": 5
  }
]
```

**Output Document (`kits.json`):** Complies with the full Appendix A JSON schema specification.

---

## 5. Render Deployment Instructions (Backend)

1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`TRAO`).
4. Configure service settings:
   - **Name:** `prepkit-ai-backend`
   - **Language / Runtime:** `Docker`
   - **Dockerfile Path:** `backend/Dockerfile`
   - **Docker Build Context:** `.` (Repository root)
   - **Instance Type:** `Free` or `Starter`
   - **Health Check Path:** `/health`
5. Configure Environment Variables in the Render Dashboard:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `mongodb+srv://<user>:<password>@cluster0.mongodb.net/prepkit?retryWrites=true&w=majority`
   - `JWT_SECRET`: *(Generate a secure random 32+ character string)*
   - `LLM_PROVIDER`: `gemini`
   - `LLM_MODEL`: `gemini-1.5-flash`
   - `LLM_API_KEY`: *(Your Google AI Studio API Key)*
   - `FRONTEND_URL`: `https://<your-vercel-app>.vercel.app`
   - `ALLOW_LOCALHOST_SSRF`: `false`
6. Click **Create Web Service**.
7. Once deployed, test the health endpoint:
   ```bash
   curl -i https://<your-render-app>.onrender.com/health
   # Returns: {"status":"ok","service":"ai-interview-prep-backend"}
   ```

---

## 6. Vercel Deployment Instructions (Frontend)

1. Log into [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project** and import your GitHub repository.
3. Configure project settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build:shared && npm run build:frontend`
   - **Output Directory:** `frontend/.next`
   - **Install Command:** `npm install`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://<your-render-backend>.onrender.com/api`
5. Click **Deploy**.

---

## 7. MongoDB Atlas Setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Under **Database Access**, create an application database user with read/write permissions.
3. Under **Network Access**, add `0.0.0.0/0` (Allow access from anywhere) so Render web instances can connect dynamically.
4. Click **Connect** → **Drivers** → Copy connection string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/interview_prep_kit?retryWrites=true&w=majority`
5. Paste this connection string as `MONGODB_URI` in your Render Environment Variables.

---

## 8. Production Smoke-Test Checklist

- [x] **Backend Health Check:** `GET /health` returns `200 OK` (`{"status":"ok"}`).
- [x] **Database Connectivity Check:** `GET /health/db` returns database status.
- [x] **Frontend Web Interface:** Home, Create Kit, Dashboard, and Practice pages render with responsive UI.
- [x] **Cross-Origin Security:** CORS permits requests from Vercel domain with credentials; blocks unapproved domains.
- [x] **User Authentication:** Registration, Login, Token persistence, and Logout work reliably.
- [x] **Kit Generation Pipeline:** Extraction, Company Crawling, Question Generation, Multi-Pass Coverage Check, and Scheduling execute seamlessly.
- [x] **Section-Level Regeneration:** Preserves user edits while refreshing selected categories.
- [x] **Interactive Practice:** 3D flashcards, confidence rating, and weak spot analysis function smoothly.
- [x] **Batch Evaluation CLI:** `npm run evaluate -- --input test_cases.json --output test_kits.json` executes with 100% case success.
- [x] **SSRF Protection:** Production crawler blocks private and loopback IP spaces.