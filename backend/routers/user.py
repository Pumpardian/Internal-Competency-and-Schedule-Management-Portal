import json
from fastapi import APIRouter, Depends, HTTPException, Request \
, Body, Path, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from pydantic import BaseModel, Field
from datetime import timedelta
from typing import Annotated, Optional
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime

from models import User, Employee, Role
from routers.employees import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from routers.roles import RoleResponse
from dependencies import get_db
from utils.auth import create_access_token, authenticate_user \
, argon2_context, user_dependency, require_permission
from utils.upload import save_employee_photo, delete_employee_photo

router = APIRouter()

#Модели
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=30, description="Имя пользователя", examples=["ivan_ivanov"])
    password: str = Field(..., min_length=4, max_length=72, description="Пароль", examples=[1111])
    employee_data: Optional[EmployeeCreate] = None

class Token(BaseModel):
    access_token: str = Field(..., description="Токен для доступа")
    token_type: str = Field(..., description="Тип токена")

class RegisterResponse(BaseModel):
    """Модель ответа при регистрации"""
    message: str = Field(..., description="Сообщение об операции", examples=["Пользователь с именем ivan_ivanov успешно зарегистрирован"])

class DeleteUserResponse(BaseModel):
    """Модель ответа при удалении пользователя"""
    message: str = Field(..., description="Сообщение об операции", examples=["Пользователь ivan_ivanov был успешно удален"])

class UserRoleChangeResponse(BaseModel):
    """Модель ответа при изменении роли пользователя"""
    message: str = Field(..., description="Сообщение об операции", examples=["Роль пользователя ivan_ivanov изменена на manager"])

class UserProfileUpdateRequest(BaseModel):
    password: str = Field(..., min_length=4, max_length=72, description="Пароль", examples=[1111])
    new_password: Optional[str] = Field(None, min_length=4, max_length=72, description="Новый пароль", examples=[2222])
    employee_data: Optional[EmployeeUpdate] = None

class UserProfileUpdateResponse(BaseModel):
    """Модель ответа при изменении профиля пользователя"""
    message: str = Field(..., description="Сообщение об операции", examples=["Профиль пользователя ivanov_ivan успешно обновлен"])


#Эндпоинты
@router.post("/register",
    response_class=JSONResponse, 
    status_code=201,
    response_model=RegisterResponse,
    summary="Зарегистрировать пользователя",
    responses={
        201: {"description": "Пользователь зарегистрирован", "model": RegisterResponse},
        400: {"description": "Неверные данные"},
        409: {"description": "Пользователь (сотрудник) с данным именем уже существует"},
        422: {"description": "Неверный формат данных"}
    },
)
async def register(
    request: Request,
    form: str = Form(...),
    photo: Optional[UploadFile] = File(None, description="Фото сотрудника (jpg, png, gif, webp, bmp) до 5 МБ"),
    db: Session = Depends(get_db)
):
    '''
    Создает нового пользователя, хеширует его пароль и сохраняет в базе данных.

    Тело запроса:
    - **username**: Имя пользователя **[string]** (обязательно, 1-30 символов).
    - **password**: Пароль пользователя **[string]** (обязательно).
    - **employee_data**: Данные о сотруднике (опционально):
        - **first_name**: Имя сотрудника, **[string]** (обязательно, 1-100 символов).
        - **last_name**: Фамилия сотрудника **[string]** (обязательно, 1-100 символов).
        - **position**: Должность **[string]** (опционально, до 150 символов).
    - **photo**: Фото **[file]** (опционально, форматы jpg, png, gif, webp, bmp до 5 МБ).
    
    Возвращает сообщение об успешной регистрации пользователя.
    '''

    try:
        request_data = json.loads(form)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Неправильный формат JSON"
        )

    try:
        validated_data = RegisterRequest(**request_data)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Ошибка валидации: {str(e)}"
        )

    statement = select(User).where(User.username == validated_data.username)
    exists = db.execute(statement).scalar_one_or_none()
    if exists:
        raise HTTPException(
            status_code=409,
            detail="Пользователь с данным именем уже существует"
        )
    
    user = User(
        username=validated_data.username,
        hashed_password=argon2_context.hash(validated_data.password),
        role_id=request.app.state.default_role_id
    )
    db.add(user)
    db.flush()

    if validated_data.employee_data:
        statement = select(Employee).where(
            and_(
                Employee.first_name == validated_data.employee_data.first_name,
                Employee.last_name == validated_data.employee_data.last_name
            )
        )
        existing_employee = db.execute(statement).scalar_one_or_none()
        if existing_employee:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Сотрудник с таким именем уже существует"
            )
        
        employee = Employee(
            first_name=validated_data.employee_data.first_name,
            last_name=validated_data.employee_data.last_name,
            position=validated_data.employee_data.position,
            created_at=datetime.now(),
            user_id=user.id
        )

        photo_url = None
        if photo and photo.filename:
            try:
                photo_url = await save_employee_photo(photo)
                employee.photo_url = photo_url
            except HTTPException as e:
                raise e
            
        db.add(employee)

    db.commit()
    return {"message":f"Пользователь с именем {user.username} успешно зарегистрирован"}


@router.post("/login", response_model=Token,
    response_class=JSONResponse, 
    summary="Авторизовать пользователя",
    responses={
        200: {"description": "Пользователь авторизован", "model": Token},
        400: {"description": "Неверные данные"},
        401: {"description": "Ошибка при валидации пользователя"},
        422: {"description": "Неверный формат данных"}
    }
)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    '''
    Аутентифицирует пользователя по его данным.

    Тело формы:
    - **username**: Имя пользователя **[string]** (обязательно).
    - **password**: Пароль пользователя **[string]** (обязательно).

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


@router.delete("/user/{id}",
    response_class=JSONResponse,
    response_model=DeleteUserResponse,
    summary="Удалить пользователя",
    responses={
        200: {"description": "Пользователь удален", "model": DeleteUserResponse},
        400: {"description": "Неверные данные"},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        422: {"description": "Неверный формат данных"}
    }
)
def delete_account(
    request: Request,
    user: user_dependency,
    id: int,
    password: str = Body(..., embed=True, min_length=4, max_length=72, description="Пароль", examples=[1111]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет указанный аккаунт пользователя при правильно введенном пароле и наличии доступа.

    Путь запроса:
    - **id**: Уникальный идентификатор пользователя **[int]**.

    Тело формы:
    - **password**: Пароль пользователя **[string]** (обязательно).

    Возвращает сообщение об успешном удалении аккаунта. 
    '''
    
    user: User = db.execute(select(User).where(User.id == id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )
    
    if not authenticate_user(user.username, password, db) and not user.role_id == request.app.state.admin_role_id:
        raise HTTPException(
            status_code=403,
            detail="Доступ запрещен"
        )
    
    if user.username == "admin":
        raise HTTPException(
            status_code=403,
            detail="Аккаунт администратора по умолчанию не может быть удален"
        )

    if user.employee:
        photo_url = user.employee.photo_url
        db.delete(user.employee)
        if photo_url:
            delete_employee_photo(photo_url)

    db.delete(user)
    db.commit()
    return {"message": f"Пользователь {user.username} успешно удален"}


@router.get(
    "/users/{id}/role", 
    response_class=JSONResponse,
    response_model=RoleResponse,
    summary="Получить роль пользователя",
    responses={
        200: {"description": "Роль получена", "model": RoleResponse},
        401: {"description": "Не авторизован"},
        404: {"description": "Пользователь не найден"}
    }
)
def get_user_role(
    user: user_dependency,
    id: int = Path(..., description="Уникальный идентификатор пользователя", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Получение роли пользователя.
    
    Путь запроса:
    - **id**: Уникальный идентификатор пользователя **[int]**.
    
    Возвращает роль указанного пользователя.
    '''

    statement = select(User).where(User.id == id)
    user: User = db.execute(statement).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )
    
    statement = select(Role).where(Role.id == user.role_id)
    role = db.execute(statement).scalar_one_or_none()
    return role


@router.post(
    "/users/{id}/role", 
    response_class=JSONResponse,
    response_model=UserRoleChangeResponse,
    summary="Изменить роль пользователя",
    responses={
        200: {"description": "Роль изменена", "model": UserRoleChangeResponse},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        404: {"description": "Пользователь (роль) не найден(а)"},
        422: {"description": "Неверный формат уникального идентификатора"}
    }
)
def update_user_role(
    user: dict = Depends(require_permission("user_role.update")),
    id: int = Path(..., description="Уникальный идентификатор пользователя", ge=1, examples=[1]),
    role_id: int = Body(..., description="Уникальный идентификатор роли", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Изменить роль пользователя.
    
    Путь запроса:
    - **id**: Уникальный идентификатор пользователя **[int]**.

    Тело запроса:
    - **role_id**: Уникальный идентификатор роли **[int]** (обязательно).
    
    Возвращает сообщение об успехе изменения роли указанного пользователя.
    '''

    statement = select(User).where(User.id == id)
    user: User = db.execute(statement).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )
    
    statement = select(Role).where(Role.id == role_id)
    role = db.execute(statement).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Роль не найдена"
        )

    user.role_id = role.id
    db.commit()
    return {"message": f"Роль пользователя {user.username} изменена на {role.name}"}


@router.patch(
    "/users/{id}/profile",
    response_class=JSONResponse,
    response_model=UserProfileUpdateResponse,
    summary="Изменить профиль пользователя",
    responses={
        200: {"description": "Профиль изменен", "model": UserProfileUpdateResponse},
        400: {"description": "Неверные данные"},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        404: {"description": "Пользователь не найден"},
        409: {"description": "Сотрудник уже существует"},
        422: {"description": "Неверный формат данных"}
    }
)
async def update_user_profile(
    request: Request,
    user: user_dependency,
    form: str = Form(...),
    photo: Optional[UploadFile] = File(None, description="Фото сотрудника (jpg, png, gif, webp, bmp) до 5 МБ"),
    id: int = Path(..., description="Уникальный идентификатор пользователя", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Изменения профиля пользователя.

    Путь запроса:
    - **id**: Уникальный идентификатор пользователя **[int]**.

    Тело запроса:
    - **employee_data**: Данные профиля сотрудника (все поля опциональны, валидно только при наличии у пользователя профиля сотрудника):
        - **first_name**: Имя сотрудника **[string]** (1-100 символов).
        - **last_name**: Фамилия сотрудника **[string]** (1-100 символов).
        - **position**: Должность **[string]** (до 150 символов).
    - **photo**: Фото **[file]** (опционально, форматы jpg, png, gif, webp, bmp до 5 МБ).
    - **new_password**: Новый пароль (опционально).
    - **password**: Пароль (обязательно).

    Возвращает сообщение об успехе.
    '''

    try:
        request_data = json.loads(form)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Неправильный формат JSON"
        )

    try:
        validated_data = UserProfileUpdateRequest(**request_data)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Ошибка валидации: {str(e)}"
        )

    statement = select(User).where(User.id == id)
    user = db.execute(statement).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )
    
    if not authenticate_user(user.username, validated_data.password, db) and not user.role_id == request.app.state.admin_role_id:
        raise HTTPException(
            status_code=403,
            detail="Доступ запрещен"
        )
    
    if validated_data.new_password:
        if argon2_context.verify(validated_data.new_password, user.hashed_password):
            raise HTTPException(
                status_code=400,
                detail="Новый пароль должен отличаться от текущего"
            )
        
        user.hashed_password = argon2_context.hash(validated_data.new_password)

    if validated_data.employee_data:
        if not user.employee:
            raise HTTPException(
                status_code=404,
                detail="Профиль сотрудника для данного пользователя не существует"
            )

        if validated_data.employee_data.first_name is not None or validated_data.employee_data.last_name is not None:
            new_first_name = validated_data.employee_data.first_name if validated_data.employee_data.first_name is not None else user.employee.first_name
            new_last_name = validated_data.employee_data.last_name if validated_data.employee_data.last_name is not None else user.employee.last_name
            
            statement = select(Employee).where(
                and_(
                    Employee.first_name == new_first_name,
                    Employee.last_name == new_last_name,
                    Employee.id != user.employee.id
                )
            )
            exists = db.execute(statement).scalar_one_or_none()
            if exists:
                raise HTTPException(
                    status_code=409,
                    detail=f"Сотрудник '{new_last_name} {new_first_name}' уже существует"
                )
        
        if validated_data.employee_data.first_name is not None:
            user.employee.first_name = validated_data.employee_data.first_name
        if validated_data.employee_data.last_name is not None:
            user.employee.last_name = validated_data.employee_data.last_name
        if validated_data.employee_data.position is not None:
            user.employee.position = validated_data.employee_data.position

        photo_url = None
        if photo and photo.filename:
            try:
                photo_url = await save_employee_photo(photo)
                old_photo_url = user.employee.photo_url
                user.employee.photo_url = photo_url

                if old_photo_url:
                    delete_employee_photo(old_photo_url)
            except HTTPException as e:
                raise e
    
    db.commit()
    return {"message": f"Профиль пользователя {user.username} успешно обновлен"}


@router.get(
    "/users/{id}",
    response_class=JSONResponse,
    response_model=EmployeeResponse,
    summary="Получить профиль пользователя",
    responses={
        200: {"description": "Профиль изменен", "model": EmployeeResponse},
        401: {"description": "Не авторизован"},
        404: {"description": "Пользователь не найден"},
        422: {"description": "Неверный формат уникального идентификатора"}
    }
)
def get_user_profile(
    user: user_dependency,
    id: int = Path(..., description="Уникальный идентификатор пользователя", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Получение профиля пользователя.

    Путь запроса:
    - **id**: Уникальный идентификатор пользователя **[int]**.

    Возвращает профиль указанного пользователя.
    '''

    user: User = db.execute(select(User).where(User.id == id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )
    
    if not user.employee:
        return {"message": "Пользователь не имеет профиля сотрудника"}

    return user.employee