"""
Pydantic request / response models.

Kept in one file for Module 1; split by domain in later modules as needed.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, UUID4


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    email: str


# ── Threads ───────────────────────────────────────────────────────────────────

class ThreadCreate(BaseModel):
    """Body for POST /threads — title is optional; auto-generated if omitted."""
    title: str | None = None


class ThreadResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


# ── Messages ──────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    id: str
    thread_id: str
    user_id: str
    role: Literal["user", "assistant"]
    content: str
    token_count: int | None
    created_at: datetime


class ThreadWithMessages(BaseModel):
    thread: ThreadResponse
    messages: list[MessageResponse]


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    thread_id: str
    content: str
