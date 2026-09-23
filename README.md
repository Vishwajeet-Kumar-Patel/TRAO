# TRAO — AI Interview Prep Kit

> **Production-quality AI-powered interview preparation engine** with deterministic coverage guarantees, company research crawling, multi-pass gap closing, and active recall practice.

---

## 🚀 Features

- **Company Crawler** — Safely crawls target company engineering blogs, careers pages, and public docs to build a structured company brief
- **Requirement Extraction** — Parses job descriptions into structured must-have / nice-to-have requirements
- **Multi-Pass Coverage Engine** — Deterministically verifies 100% must-have requirement coverage; runs a second generation pass to close any gaps
- **Interview Questions** — Categorized (Technical, Behavioral, Culture Fit, System Design), with difficulty ratings
- **Flashcard System** — Active recall cards with 3D flip animation, confidence tracking, and weak-spot analytics
- **Deterministic Study Schedule** — Day-by-day prep plan allocated within the deadline
- **Section Regeneration** — Re-generate any section while preserving manually edited and pinned items
- **Batch Evaluation CLI** — `npm run evaluate` accepts JSON input, processes multiple roles in parallel

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (falls back to in-memory store) |
| LLM | Google Gemini 1.5 Flash / OpenAI GPT-4o-mini |
| Auth | JWT (HTTP header bearer tokens) |
| Monorepo | npm workspaces |

---

## 📂 Project Structure

```
TRAO/
├── shared/          # Shared TypeScript types, Zod schemas, utilities
├── backend/         # Express API server, pipeline, crawler, coverage engine
├── frontend/        # Next.js web application
├── package.json     # Workspace root
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (optional — falls back to in-memory store)

### Install
```bash
npm install
```

### Configure
Copy `backend/.env.example` to `backend/.env` and fill in your API key:

```env
# Google Gemini (recommended)
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
LLM_API_KEY=your_gemini_api_key_here

# OR OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your_openai_api_key_here
```

Get a free Gemini key at: https://aistudio.google.com/app/apikey

### Run
```bash
# Start both backend + frontend dev servers
npm run dev:backend   # http://localhost:5000
npm run dev:frontend  # http://localhost:3000
```

### Batch Evaluation CLI
```bash
npm run evaluate -- --input path/to/cases.json --output results.json
```

Input format:
```json
[
  {
    "id": "role-01",
    "jd": "Senior Full Stack Engineer with React and Node.js...",
    "company_url": "https://stripe.com",
    "days": 5
  }
]
```

---

## 🧪 Tests

```bash
npm test                           # Run all tests
npm --prefix backend run test      # Backend only (11 suites)
npm --prefix shared run test       # Shared schema validation (7 suites)
```

---

## 🔐 Security

- SSRF protection: crawler blocks private/loopback IP ranges in production
- JWT authentication on all protected routes
- Input validation via Zod schemas on both client and server

---

## 📄 License

MIT