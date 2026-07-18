"""
Threads router — CRUD for conversation threads.

All routes require authentication. The user-scoped Supabase client is used
for every DB operation, so Supabase's RLS policies are enforced on every query
— a user cannot read, update, or delete another user's threads.

Routes:
  GET    /threads               → list user's threads (newest first)
  POST   /threads               → create a new thread
  GET    /threads/{thread_id}   → get thread + all messages
  DELETE /threads/{thread_id}   → delete thread (cascades messages)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from deps import AuthenticatedUser, get_current_user, get_supabase_client_for_user
from models import ThreadCreate, ThreadResponse, ThreadWithMessages, MessageResponse

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── List threads ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[ThreadResponse])
async def list_threads(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Return all threads for the authenticated user, newest first."""
    db = get_supabase_client_for_user(current_user.access_token)
    result = (
        db.table("threads")
        .select("*")
        .eq("user_id", current_user.user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return [_row_to_thread(row) for row in result.data]


# ── Create thread ─────────────────────────────────────────────────────────────

@router.post("", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_thread(
    body: ThreadCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Create a new thread.
    Title is optional at creation time — it will be set automatically
    when the first message is sent (via POST /chat/stream).
    """
    db = get_supabase_client_for_user(current_user.access_token)
    now = _now_iso()
    payload = {
        "user_id": current_user.user_id,
        "title": body.title or "New conversation",
        "created_at": now,
        "updated_at": now,
    }
    result = db.table("threads").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create thread")
    return _row_to_thread(result.data[0])


# ── Get thread + messages ─────────────────────────────────────────────────────

@router.get("/{thread_id}", response_model=ThreadWithMessages)
async def get_thread(
    thread_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Return a thread and all its messages.
    RLS ensures the user can only fetch their own threads.
    Returns 404 if the thread doesn't exist or belongs to another user.
    """
    db = get_supabase_client_for_user(current_user.access_token)

    thread_result = (
        db.table("threads")
        .select("*")
        .eq("id", thread_id)
        .eq("user_id", current_user.user_id)
        .maybe_single()
        .execute()
    )
    if not thread_result.data:
        raise HTTPException(status_code=404, detail="Thread not found")

    messages_result = (
        db.table("messages")
        .select("*")
        .eq("thread_id", thread_id)
        .order("created_at", desc=False)
        .execute()
    )

    return ThreadWithMessages(
        thread=_row_to_thread(thread_result.data),
        messages=[_row_to_message(m) for m in messages_result.data],
    )


# ── Delete thread ─────────────────────────────────────────────────────────────

@router.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Delete a thread and all its messages (CASCADE is set on the FK).
    Returns 404 if the thread doesn't exist or belongs to another user.
    """
    db = get_supabase_client_for_user(current_user.access_token)

    # Verify ownership first (RLS would block this anyway, but gives a clean 404)
    check = (
        db.table("threads")
        .select("id")
        .eq("id", thread_id)
        .eq("user_id", current_user.user_id)
        .maybe_single()
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Thread not found")

    db.table("threads").delete().eq("id", thread_id).execute()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _row_to_thread(row: dict) -> ThreadResponse:
    return ThreadResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        title=row["title"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_message(row: dict) -> MessageResponse:
    return MessageResponse(
        id=str(row["id"]),
        thread_id=str(row["thread_id"]),
        user_id=str(row["user_id"]),
        role=row["role"],
        content=row["content"],
        token_count=row.get("token_count"),
        created_at=row["created_at"],
    )
