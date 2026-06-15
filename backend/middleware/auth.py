from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError

from config import Config

class AuthMiddleware(BaseHTTPMiddleware):
    """Проверяет валидность токена и добавляет user_id в request.state"""
    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            request.state.user = None
            return await call_next(request)
        
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, Config.AUTH_SECRET, algorithms=[Config.AUTH_ALGORITHM])
            request.state.user = {
                "id": payload.get("id"),
                "username": payload.get("user")
            }
        except JWTError:
            request.state.user = None
        
        return await call_next(request)