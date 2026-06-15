from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt
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
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="auth/token")

def authenticate_user(username: str, password: str, db: Session):
    """
    Проверяет имя и пароль пользователя на соответсвие данным в базе.
    
    Возвращает пользователя при успехе, иначе возвращает False.
    """

    statement = select(User).where(User.username == username)
    user = db.execute(statement).scalar_one_or_none()
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

    encode.update({"expires": expires.isoformat()})
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
        if username is None or user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Ошибка при валидации пользователя"
            )
        
        return {"username": username, "id": user_id}
    
    except jwt.ExpiredSignatureError:
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
        current_user: dict = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        if not await check_user_permission(db, current_user["id"], permission_name):
            raise HTTPException(
                status_code=403, 
                detail=f"Требуется разрешение: {permission_name}"
            )
        return current_user
    return dependency

def require_resource_access(resource_type: str):
    """
    Фабрика зависимостей для проверки доступа к ресурсу.
    """
    async def dependency(
        request: Request,
        db: Session = Depends(get_db),
        resource_id: int = None
    ) -> bool:
        if not hasattr(request.state, 'user') or not request.state.user:
            raise HTTPException(status_code=401, detail="Не авторизован")
        
        has_access = await check_resource_access(
            db, 
            request.state.user["id"], 
            resource_type, 
            resource_id
        )
        if not has_access:
            raise HTTPException(
                status_code=403, 
                detail=f"Нет доступа к {resource_type} с ID {resource_id}"
            )
        
        return True
    return dependency


async def check_user_permission(db: Session, user_id: int, permission_name: str) -> bool:
    """Проверка наличия разрешения у пользователя"""
    statement = select(User).where(User.id == user_id)
    user = db.execute(statement).scalar_one_or_none()
    if not user:
        return False
    
    #Админ роль должна быть с этим id, чтобы каждый раз не делать запрос в бд
    if user.role_id == 2:
        return True
    
    statement = (
        select(Permission).join(RolePermission).where(
            RolePermission.role_id == user.role_id,
            Permission.name == permission_name
        )
    )
    permission = db.execute(statement).scalar_one_or_none()
    return permission is not None

async def check_resource_access(db: Session, user_id: int, resource_type: str, resource_id: int) -> bool:
    """Проверка доступа к конкретному ресурсу"""
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if user.role_id == 1:
        return True
    
    if resource_type == "employee":
        employee = db.execute(
            select(Employee).where(
                Employee.id == resource_id,
                Employee.user_id == user_id
            )
        ).scalar_one_or_none()
        return employee is not None
        
    return False