"""
Chat router — POST /chat/stream

The main event: takes a user message, builds context from conversation
history, calls Groq with SSE streaming, persists both messages to DB,
and sends tokens to the client as they arrive.

SSE event format:
  data: {"type": "token",  "content": "<token>"}
  data: {"type": "done",   "usage": {"prompt_tokens": N, "completion_tokens": N}}
  data: {"type": "error",  "message": "<error message>"}

Flow:
  1. Validate auth, verify thread ownership.
  2. Load conversation history from DB.
  3. Insert user message to DB immediately.
  4. Build context (sliding window).
  5. Stream Groq response, yielding SSE tokens to the client.
  6. After stream completes, insert assembled assistant message to DB.
  7. Update thread.updated_at and title (if this is the first message).
"""

import json
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from deps import AuthenticatedUser, get_current_user, get_supabase_client_for_user
from models import ChatRequest
from services.history import build_context, _estimate_tokens
from services.llm import stream_chat_response, generate_thread_title

router = APIRouter()


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Send a user message and stream the assistant response via SSE.

    The EventSourceResponse keeps the HTTP connection open and flushes
    each token as it arrives from Groq, giving the frontend a real-time
    streaming experience.
    """
    db = get_supabase_client_for_user(current_user.access_token)

    # ── 1. Verify thread ownership ────────────────────────────────────────────
    thread_result = (
        db.table("threads")
        .select("id, title, user_id")
        .eq("id", body.thread_id)
        .eq("user_id", current_user.user_id)
        .maybe_single()
        .execute()
    )
    if not thread_result.data:
        raise HTTPException(status_code=404, detail="Thread not found")

    thread = thread_result.data
    is_first_message = (thread["title"] == "New conversation")

    # ── 2. Load history ───────────────────────────────────────────────────────
    history_result = (
        db.table("messages")
        .select("role, content")
        .eq("thread_id", body.thread_id)
        .order("created_at", desc=False)
        .execute()
    )
    history = history_result.data or []

    # ── 3. Persist user message immediately ───────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()
    user_msg_payload = {
        "thread_id": body.thread_id,
        "user_id": current_user.user_id,
        "role": "user",
        "content": body.content,
        "token_count": _estimate_tokens(body.content),
        "created_at": now,
    }
    db.table("messages").insert(user_msg_payload).execute()

    # ── 4. Build context ──────────────────────────────────────────────────────
    messages = build_context(history, body.content)

    # ── 5 & 6. Stream and persist ─────────────────────────────────────────────
    async def event_generator() -> AsyncGenerator[dict, None]:
        assembled = []
        usage_data: dict = {}

        try:
            # stream_chat_response is a sync generator — iterate it directly.
            # In a production app with high concurrency, run_in_executor would
            # be used here; for Module 1 this is fine.
            for chunk in stream_chat_response(
                messages=messages,
                thread_id=body.thread_id,
                user_id=current_user.user_id,
            ):
                # Token chunk
                if chunk.choices and chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    assembled.append(token)
                    yield {
                        "data": json.dumps({"type": "token", "content": token})
                    }

                # Usage chunk (sent at end of stream when include_usage=True)
                if chunk.usage:
                    usage_data = {
                        "prompt_tokens": chunk.usage.prompt_tokens,
                        "completion_tokens": chunk.usage.completion_tokens,
                    }

        except Exception as exc:
            yield {"data": json.dumps({"type": "error", "message": str(exc)})}
            return

        # ── Persist assistant message ─────────────────────────────────────────
        full_response = "".join(assembled)
        assistant_now = datetime.now(timezone.utc).isoformat()
        assistant_msg = {
            "thread_id": body.thread_id,
            "user_id": current_user.user_id,
            "role": "assistant",
            "content": full_response,
            "token_count": usage_data.get("completion_tokens")
            or _estimate_tokens(full_response),
            "created_at": assistant_now,
        }
        db.table("messages").insert(assistant_msg).execute()

        # ── Update thread (updated_at + title if first message) ───────────────
        thread_update: dict = {"updated_at": assistant_now}
        if is_first_message and body.content.strip():
            thread_update["title"] = generate_thread_title(body.content)

        db.table("threads").update(thread_update).eq("id", body.thread_id).execute()

        # ── Send done event ───────────────────────────────────────────────────
        yield {"data": json.dumps({"type": "done", "usage": usage_data})}

    return EventSourceResponse(event_generator())
