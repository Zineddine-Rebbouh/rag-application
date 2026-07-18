"""
LLM service — Groq via OpenAI-compatible SDK + LangSmith tracing.

Design decisions:
- Uses the standard `openai` Python SDK pointed at Groq's base URL.
  Groq is a drop-in compatible endpoint; no Groq-specific SDK needed.
- Every call is wrapped with @traceable from the standalone `langsmith` SDK.
  This gives full prompt/response/token visibility in LangSmith with NO
  LangChain dependency.
- Streaming and non-streaming are separate functions to keep the code clear.
  The router uses stream_chat_response() exclusively; call_groq_once() is
  available for health checks or future non-streaming needs.
"""

import os
from collections.abc import Generator
from typing import Any

from langsmith import traceable
from openai import OpenAI


def _get_client() -> OpenAI:
    """Return an OpenAI SDK client pointed at Groq's base URL."""
    return OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url="https://api.groq.com/openai/v1",
    )


def _get_model() -> str:
    return os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


@traceable(name="groq_chat_stream")
def stream_chat_response(
    messages: list[dict[str, str]],
    thread_id: str,
    user_id: str,
) -> Generator[Any, None, None]:
    """
    Call Groq's Chat Completions endpoint with streaming enabled.

    LangSmith automatically captures:
      - Full messages list (the prompt)
      - Every streamed token (reconstructed into the full response)
      - Token usage (prompt_tokens, completion_tokens)
      - Latency

    The `@traceable` decorator reads LANGCHAIN_TRACING_V2 and LANGSMITH_API_KEY
    from env — if tracing is disabled (LANGCHAIN_TRACING_V2=false), the call
    passes through without any overhead.

    Args:
        messages: The full message list (system + history + new user msg).
        thread_id: Attached as metadata to the LangSmith trace.
        user_id: Attached as metadata to the LangSmith trace.

    Yields:
        OpenAI stream chunks from Groq.
    """
    client = _get_client()
    model = _get_model()

    stream = client.chat.completions.create(
        model=model,
        messages=messages,  # type: ignore[arg-type]
        stream=True,
        stream_options={"include_usage": True},
        # Attach thread/user context as user field for LangSmith metadata
        user=f"thread:{thread_id}|user:{user_id}",
    )

    yield from stream


@traceable(name="groq_chat_once")
def call_groq_once(
    messages: list[dict[str, str]],
    thread_id: str,
    user_id: str,
) -> dict[str, Any]:
    """
    Non-streaming call — returns the full completion at once.
    Used for internal tasks (e.g., auto-generating thread titles).
    """
    client = _get_client()
    model = _get_model()

    response = client.chat.completions.create(
        model=model,
        messages=messages,  # type: ignore[arg-type]
        stream=False,
        max_tokens=100,
        user=f"thread:{thread_id}|user:{user_id}",
    )

    choice = response.choices[0]
    return {
        "content": choice.message.content or "",
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
        },
    }


def generate_thread_title(first_user_message: str) -> str:
    """
    Auto-generate a thread title from the first user message.
    Falls back to a truncated version of the message if the LLM call fails.
    """
    # Simple fallback: first 60 characters, no LLM call needed for a title
    truncated = first_user_message.strip()
    if len(truncated) <= 60:
        return truncated
    return truncated[:57] + "..."
