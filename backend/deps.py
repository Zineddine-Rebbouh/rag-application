"""
FastAPI dependencies — shared across all authenticated routes.

The auth pattern:
  1. Client sends: Authorization: Bearer <supabase_access_token>
  2. We call supabase.auth.get_user(token) which validates the JWT
     against Supabase's auth server and returns the user object.
  3. We attach user_id + the raw token to the request.

Using the user's own JWT (not service role key) for all DB operations
means Supabase enforces RLS on every query automatically.
"""

import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

_bearer = HTTPBearer()


@dataclass
class AuthenticatedUser:
    user_id: str
    email: str
    access_token: str
    """Raw JWT — pass this to create a user-scoped Supabase client."""


def get_supabase_client_for_user(access_token: str) -> Client:
    """
    Returns a Supabase client that authenticates as the signed-in user.
    All queries through this client are subject to RLS policies.
    """
    url = os.environ["SUPABASE_URL"]
    anon_key = os.environ["SUPABASE_ANON_KEY"]
    client = create_client(url, anon_key)
    # Set the session so PostgREST sends the user's JWT → RLS is enforced
    client.auth.set_session(access_token, "")
    return client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> AuthenticatedUser:
    """
    FastAPI dependency — validates the Bearer token and returns the user.
    Raises 401 if the token is missing, expired, or invalid.
    """
    token = credentials.credentials

    # Use the anon key to initialise the client for token verification
    url = os.environ["SUPABASE_URL"]
    anon_key = os.environ["SUPABASE_ANON_KEY"]
    client = create_client(url, anon_key)

    try:
        response = client.auth.get_user(token)
        user = response.user
        if user is None:
            raise ValueError("No user in response")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return AuthenticatedUser(
        user_id=str(user.id),
        email=user.email or "",
        access_token=token,
    )
