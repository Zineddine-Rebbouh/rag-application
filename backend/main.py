"""
FastAPI application entrypoint.
All user-data routes enforce auth via the JWT dependency in deps.py.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers import auth, threads, chat  # noqa: E402 — after load_dotenv


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Validate required env vars on startup so we fail fast.
    required = [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "GROQ_API_KEY",
        "LANGSMITH_API_KEY",
    ]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {missing}")
    yield


app = FastAPI(
    title="RAG Application — Module 1",
    description="Agentic codebase/docs assistant — app shell",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(threads.router, prefix="/threads", tags=["threads"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": "0.1.0"}
