"""
Auth router — GET /auth/me

Validates the Bearer token (via the get_current_user dependency)
and returns the authenticated user's ID and email.

This endpoint is primarily used by the frontend to:
  1. Confirm the session is still valid after page load.
  2. Display the logged-in user's email in the UI.
"""

from fastapi import APIRouter, Depends

from deps import AuthenticatedUser, get_current_user
from models import UserResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def me(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserResponse(
        id=current_user.user_id,
        email=current_user.email,
    )
