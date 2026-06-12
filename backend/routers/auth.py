from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel, Field
from datetime import timedelta, datetime
from typing import Annotated

from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

from models import User
from dependencies import get_db
from config import Config

router = APIRouter()

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="auth/token")

#Модели
class RegisterOrLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=30, description="Имя пользователя", examples=["ivan_ivanov"])
    password: str = Field(..., min_length=4, description="Пароль", examples=[1111])


class Token(BaseModel):
    access_token: str = Field(..., description="Токен для доступа")
    token_type: str = Field(..., description="Тип токена")


class RegisterResponse(BaseModel):
    """Модель ответа при регистрации"""
    message: str = Field(..., description="Сообщение об операции", examples=["Пользователь с именем ivan_ivanov успешно зарегистрирован"])


#Вспомогательные функции
def authenticate_user(username: str, password: str, db: Session):
    """
    Проверяет имя и пароль пользователя на соответсвие данным в базе.
    
    Возвращает пользователя при успехе, иначе возвращает False.
    """

    statement = select(User).where(User.username == username)
    user = db.execute(statement).scalar_one_or_none()
    if not user:
        return False
    if not bcrypt_context.verify(password, user.hashed_password):
        return False
    
    return user

def create_access_token(username: str, user_id: int, expires_timedelta: timedelta):
    """
    Генерирует JWT токен доступа с ограничением по времени действительности.

    Возвращает токен доступа.
    """

    encode = {"user": username, "id": user_id}
    expires = datetime.now() + expires_timedelta

    encode.update({"expires": expires})
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
    
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Ошибка при валидации пользователя"
        )


#Зависимость для эндпоинтов
user_dependency = Annotated[dict, Depends(get_current_user)]


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
    db: Session = Depends(get_db())
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

    #Есть проблема, что id роли стоит как NOT NULL, но при инициализации проекта
    #может возникнуть случай что пользователь создается раньше роли, надо это как-то обыграть.
    user = User(
        username=register_request.username,
        hashed_password=bcrypt_context.hash(register_request.password),
        role_id=1
    )
    db.add(user)
    db.commit()
    return {"message":f"Пользователь с именем {user.username} успешно зарегистрирован"}


@router.post("/auth/token", response_model=Token)
async def login(
    form_data: Annotated[dict, OAuth2PasswordRequestForm],
    db: Session = Depends(get_db())
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

    return {"access_token": token, "token_type": "bearer"}


#Применяться будет позже. Ниже приведен пример использования:

# @app.get("/", status_code=200)
# async def user(user: user_dependency, db: db_dependency):
#     if user is None:
#         raise HTTPException(status_code=401, detail="")
#     return {"User": user}