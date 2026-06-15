from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel, Field
from datetime import timedelta
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm

from models import User
from dependencies import get_db
from utils.auth import create_access_token, authenticate_user, argon2_context

router = APIRouter()

#Модели
class RegisterOrLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=30, description="Имя пользователя", examples=["ivan_ivanov"])
    password: str = Field(..., min_length=4, max_length=72, description="Пароль", examples=[1111])

class Token(BaseModel):
    access_token: str = Field(..., description="Токен для доступа")
    token_type: str = Field(..., description="Тип токена")

class RegisterResponse(BaseModel):
    """Модель ответа при регистрации"""
    message: str = Field(..., description="Сообщение об операции", examples=["Пользователь с именем ivan_ivanov успешно зарегистрирован"])


#Эндпоинты
@router.post("/auth",
    response_class=JSONResponse, 
    status_code=201,
    response_model=RegisterResponse,
    summary="Зарегистрировать пользователя",
    responses={
        201: {"description": "Пользователь зарегистрирован", "model": RegisterResponse},
        400: {"description": "Неверные данные"},
        409: {"description": "Пользователь с данным именем уже существует"},
        422: {"description": "Неверный формат данных"}
    }
)
async def create_user(
    register_request: RegisterOrLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    '''
    Создает нового пользователя, хеширует его пароль и сохраняет в базе данных.

    Тело запроса:
    - **username**: Имя пользователя **[string]** (обязательно, 1-30 символов).
    - **password**: Пароль пользователя **[string]** (обязательно).

    Возвращает сообщение об успешной регистрации пользователя.
    '''
    statement = select(User).where(User.username == register_request.username)
    exists = db.execute(statement).scalar_one_or_none()
    if exists:
        raise HTTPException(
            status_code=409,
            detail="Пользователь с данным именем уже существует"
        )
    
    user = User(
        username=register_request.username,
        hashed_password=argon2_context.hash(register_request.password),
        role_id=request.app.state.default_role_id
    )
    db.add(user)
    db.commit()
    return {"message":f"Пользователь с именем {user.username} успешно зарегистрирован"}


@router.post("/auth/token", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    '''
    Аутентифицирует пользователя по его данным.

    Возвращает JWT токен при успешной аутентификации.
    '''

    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Ошибка при валидации пользователя"
        )
    
    username = user.username
    user_id = user.id
    token = create_access_token(username, user_id, timedelta(hours=6))

    return {"access_token": token, "token_type": "Bearer"}