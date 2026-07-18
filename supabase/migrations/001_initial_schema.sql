-- ============================================================
-- Migration: 001_initial_schema
-- Module 1 — RAG Application: App Shell + Chat + Observability
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
-- pgcrypto provides gen_random_uuid() — enabled by default on Supabase
-- but explicit is better than implicit.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ── threads ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.threads (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL DEFAULT 'New conversation',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user queries (sidebar load)
CREATE INDEX IF NOT EXISTS threads_user_id_updated_at_idx
    ON public.threads (user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

-- SELECT: users see only their own threads
CREATE POLICY "threads_select_own"
    ON public.threads
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: users can only insert rows where user_id = their own id
CREATE POLICY "threads_insert_own"
    ON public.threads
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can only update their own threads
CREATE POLICY "threads_update_own"
    ON public.threads
    FOR UPDATE
    USING (auth.uid() = user_id);

-- DELETE: users can only delete their own threads
CREATE POLICY "threads_delete_own"
    ON public.threads
    FOR DELETE
    USING (auth.uid() = user_id);


-- ── messages ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id   UUID        NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content     TEXT        NOT NULL,
    token_count INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast message loading within a thread
CREATE INDEX IF NOT EXISTS messages_thread_id_created_at_idx
    ON public.messages (thread_id, created_at ASC);

-- user_id index for RLS policy evaluation performance
CREATE INDEX IF NOT EXISTS messages_user_id_idx
    ON public.messages (user_id);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: users see only their own messages
-- Note: user_id is denormalized on messages so this is a single-column check
-- (no join to threads needed, which keeps RLS evaluation fast).
CREATE POLICY "messages_select_own"
    ON public.messages
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: users can only insert messages with their own user_id
CREATE POLICY "messages_insert_own"
    ON public.messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies on messages — conversation history is immutable.
-- If you need message editing in a future module, add policies then.


-- ============================================================
-- Verification queries — run these after migration to confirm setup.
-- They should all return 0 rows (tables empty) and no errors.
-- ============================================================

-- SELECT * FROM public.threads LIMIT 5;
-- SELECT * FROM public.messages LIMIT 5;

-- To verify RLS from SQL Editor (as anon role):
-- SET LOCAL role TO authenticated;
-- SET LOCAL "request.jwt.claims" TO '{"sub": "some-other-user-uuid"}';
-- SELECT * FROM public.threads;  -- Should return 0 rows
