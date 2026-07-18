"""
Context window management — sliding window strategy.

Algorithm:
  1. Load messages from DB ordered oldest → newest.
  2. Token budget = CONTEXT_WINDOW_TOKENS env var (default 6000).
  3. Always reserve space for: system prompt + new user message.
  4. Walk from newest → oldest, adding messages until budget is hit.
  5. Return the selected messages in chronological order (oldest first).

Token estimation:
  len(text) // 4  — fast, good enough for truncation decisions.
  Error margin is well within llama-3.3-70b-versatile's 128k context window.
"""

import os
from typing import TypedDict


SYSTEM_PROMPT = """You are a helpful assistant for a codebase and documentation explorer.
You answer questions clearly and concisely. When referencing code, use markdown code blocks.
You do not make up information — if you don't know, say so."""


class Message(TypedDict):
    role: str   # "user" | "assistant" | "system"
    content: str


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: 1 token ≈ 4 characters."""
    return max(1, len(text) // 4)


def build_context(
    history: list[dict],  # rows from DB: [{role, content}, ...]
    new_user_message: str,
    system_prompt: str = SYSTEM_PROMPT,
) -> list[Message]:
    """
    Build the message list to send to the LLM.

    Args:
        history: Previous messages from the DB (oldest first).
        new_user_message: The new message the user just typed.
        system_prompt: The system instructions (always included first).

    Returns:
        A list of {role, content} dicts ready to send to Groq.
    """
    budget = int(os.getenv("CONTEXT_WINDOW_TOKENS", "6000"))

    # Reserve budget for system prompt + new user message
    system_tokens = _estimate_tokens(system_prompt)
    new_msg_tokens = _estimate_tokens(new_user_message)
    remaining = budget - system_tokens - new_msg_tokens

    # Walk history newest → oldest, accumulate until budget is exhausted
    selected: list[dict] = []
    for msg in reversed(history):
        msg_tokens = _estimate_tokens(msg["content"])
        if remaining - msg_tokens < 0:
            break  # Stop here — oldest messages are dropped
        selected.append(msg)
        remaining -= msg_tokens

    # Reverse back to chronological order
    selected.reverse()

    messages: list[Message] = [
        {"role": "system", "content": system_prompt},
        *[{"role": m["role"], "content": m["content"]} for m in selected],
        {"role": "user", "content": new_user_message},
    ]

    return messages
