# RAG Application — Module 1

Production-grade agentic RAG application shell. Module 1 delivers:

- ✅ Supabase Auth (email + password)
- ✅ Full chat loop with conversation history persisted in Postgres
- ✅ SSE streaming from FastAPI → React (token-by-token)
- ✅ LangSmith tracing on every Groq call
- ✅ Row-Level Security enforced on all user tables from day 1

> **Note:** No retrieval/RAG yet — that's Module 2.

---

## Prerequisites

- Node.js ≥ 18 (tested on v22)
- Python ≥ 3.11
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Groq](https://console.groq.com) API key
- A [LangSmith](https://smith.langchain.com) account + API key

---

## 1. Clone & configure environment variables

```bash
# Copy and fill in the root .env (used by backend)
cp .env.example backend/.env

# Copy and fill in the frontend .env
cp frontend/.env.example frontend/.env.local
```

Edit `backend/.env` with your real values. Get them from:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Project Settings → API → JWT Settings |
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `GROQ_MODEL` | Verify at https://console.groq.com/docs/models (default: `llama-3.3-70b-versatile`) |
| `LANGSMITH_API_KEY` | https://smith.langchain.com → Settings → API Keys |

Edit `frontend/.env.local` with your Supabase URL and anon key.

---

## 2. Run the database migration

1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor** → **New Query**
3. Paste the contents of [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql)
4. Click **Run**

This creates the `threads` and `messages` tables with RLS policies.

---

## 3. Start the backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health` should return `{"status":"ok","version":"0.1.0"}`.

---

## 4. Start the frontend

```bash
cd frontend
npm install   # (skip if already done)
npm run dev
```

Open http://localhost:5173

---

## 5. Manual verification checklist

### ✅ M1 — Health check
```bash
curl http://localhost:8000/health
# → {"status":"ok","version":"0.1.0"}
```

### ✅ M2 — Auth
1. Open http://localhost:5173
2. Click "Sign up", create an account with email + password
3. Check your email for a confirmation link and click it
4. Sign back in — you should reach the main chat UI

### ✅ M3 — Thread creation
1. Click **New Chat** in the sidebar
2. You should see a new entry appear in the sidebar
3. Open Supabase Dashboard → Table Editor → `threads` — your row should be there

### ✅ M4/M5 — Streaming chat
1. Select a thread, type a message, press Enter
2. You should see the typing indicator (dots), then tokens streaming in word-by-word
3. Open Supabase → Table Editor → `messages` — both user and assistant rows should be there

### ✅ M6 — LangSmith tracing
1. After sending a message, open https://smith.langchain.com
2. Go to your project (`rag-application-module1`)
3. You should see a trace named `groq_chat_stream` with:
   - Full prompt and response
   - Token counts (prompt_tokens + completion_tokens)
   - Latency in milliseconds

### ✅ M7 — Persistence across sessions
1. Close the browser tab entirely
2. Reopen http://localhost:5173 and sign in again
3. Your threads and messages should all still be there

---

## 6. Verifying Row-Level Security (RLS)

### Method A — Supabase SQL Editor (quick)

In Supabase SQL Editor, run:

```sql
-- Simulate a different user by passing a fake JWT claim
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "00000000-0000-0000-0000-000000000000"}';
SELECT * FROM public.threads;
-- Should return 0 rows (the fake user has no threads)
```

### Method B — Second browser profile

1. Open an incognito window (or a different browser)
2. Sign up with a **different email address**
3. Sign in as user 2 — you should see **zero threads** from user 1
4. Create a thread as user 2, send a message
5. Switch back to user 1 — user 2's threads are not visible

---

## Project Structure

```
rag-application/
├── backend/                  # FastAPI backend
│   ├── main.py               # App entrypoint
│   ├── deps.py               # JWT auth dependency
│   ├── models.py             # Pydantic models
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py           # GET /auth/me
│   │   ├── threads.py        # CRUD /threads
│   │   └── chat.py           # POST /chat/stream (SSE)
│   └── services/
│       ├── history.py        # Sliding window context builder
│       └── llm.py            # Groq + LangSmith tracing
├── frontend/                 # React + Vite + Tailwind
│   └── src/
│       ├── components/       # UI components
│       ├── hooks/            # useAuth, useThreads, useChat
│       ├── lib/              # Supabase client + API helper
│       └── types.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example              # Root env template (for backend)
└── README.md
```

---

## Architecture notes

| Decision | Rationale |
|---|---|
| Conversation history owned by our backend | Full control over what goes into RAG context in Module 2 |
| User JWT used for all DB calls (not service role) | RLS enforced at DB level on every request |
| Sliding window (6k tokens) for context | Simple, deterministic, leaves large buffer in 128k context |
| Raw OpenAI SDK → Groq | No LangChain dependency; full visibility into every call |
| `langsmith` standalone SDK + `@traceable` | Tracing without any framework coupling |
