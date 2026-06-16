from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt, ExpiredSignatureError
from config import Config
from datetime import timedelta, datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from typing import Annotated

from models import User, RolePermission, Permission, Employee
from dependencies import get_db

argon2_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="login")

def authenticate_user(username: str, password: str, db: Session):
    """
    Проверяет имя и пароль пользователя на соответсвие данным в базе.
    
    Возвращает пользователя при успехе, иначе возвращает False.
    """

    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user:
        return False
    if not argon2_context.verify(password, user.hashed_password):
        return False
    
    return user

def create_access_token(username: str, user_id: int, expires_timedelta: timedelta):
    """
    Генерирует JWT токен доступа с ограничением по времени действительности.

    Возвращает токен доступа.
    """

    encode = {"user": username, "id": user_id}
    expires = datetime.now() + expires_timedelta

    encode.update({"exp": expires.timestamp()})
    return jwt.encode(encode, Config.AUTH_SECRET, algorithm=Config.AUTH_ALGORITHM)

def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]):
    """
    Декодирует JWT токен и возвращает информацию о пользователе.

    Вызывает ошибку если токен недействителен.
    """
    try:
        payload = jwt.decode(token, Config.AUTH_SECRET, algorithms=[Config.AUTH_ALGORITHM])
        username: str = payload.get("user")
        user_id: int = payload.get("id")

        print(payload)
        user = next(get_db()).execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if username is None or user_id is None or user is None:
            raise HTTPException(
                status_code=401,
                detail="Ошибка при валидации пользователя"
            )
        
        return {"username": username, "id": user_id}
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Токен истек"
        )
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Ошибка при валидации пользователя"
        )


user_dependency = Annotated[dict, Depends(get_current_user)]


def require_permission(permission_name: str):
    """
    Фабрика зависимостей для проверки прав
    """
    async def dependency(
        request: Request,
        current_user: dict = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        if not await check_user_permission(db, current_user["id"], permission_name, request.app.state.admin_role_id):
            raise HTTPException(
                status_code=403, 
                detail=f"Требуется разрешение: {permission_name}"
            )
        return current_user
    return dependency


async def check_user_permission(db: Session, user_id: int, permission_name: str, admin_role_id: int) -> bool:
    """Проверка наличия разрешения у пользователя"""
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        return False
    
    if user.role_id == admin_role_id:
        return True
    
    statement = (
        select(Permission).join(RolePermission).where(
            RolePermission.role_id == user.role_id,
            Permission.name == permission_name
        )
    )
    permission = db.execute(statement).scalar_one_or_none()
    return permission is not None