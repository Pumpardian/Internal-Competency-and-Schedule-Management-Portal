from fastapi import APIRouter, Depends, HTTPException, Body, Path, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from pydantic import BaseModel, Field, field_validator
from typing import List
from math import ceil

from models import Role
from dependencies import get_db

router = APIRouter()

#Модели
class RoleCreateOrUpdate(BaseModel):
    """Модель для создания/изменения новой роли"""
    name: str = Field(..., min_length=1, max_length=100, description="Название роли", examples=["Администратор"])
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Удаляем пробелы и проверяем на пустоту"""
        v = v.strip()
        if not v:
            raise ValueError('Название роли не может быть пустым')
        return v

class RoleResponse(BaseModel):
    """Модель ответа с данными роли"""
    id: int = Field(..., description="Уникальный идентификатор роли", examples=[1])
    name: str = Field(..., description="Название роли", examples=["Администратор"])
    
    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    """Модель ответа при удалении"""
    message: str = Field(..., description="Сообщение об операции", examples=["Роль был успешно удалена"])

class PagenatedRoleResponse(BaseModel):
    """Страничная модель ответа с данными ролей"""
    page_size: int = Field(..., description="Размер страницы", examples=[2])
    current_page: int = Field(..., description="Номер текущей страницы", examples=[1])
    total_pages: int = Field(..., description="Общее количество страниц", examples=[5])
    data: List[RoleResponse] = Field(..., description="Роли данной строницы",
        examples=[[RoleResponse(id=1, name="Администратор"),
                   RoleResponse(id=2, name="Менеджер проекта")]]
    )

#Эндпоинты
@router.get(
    "/roles", 
    response_class=JSONResponse,
    response_model=PagenatedRoleResponse,
    summary="Получить список всех ролей",
    responses={
        200: {"description": "Страница из списка ролей", "model": PagenatedRoleResponse},
        400: {"description": "Неверные данные"},
    }
)
def get_roles(
    current_page: int = Query(default=1, description="Номер текущей страницы", examples=[2], ge=1),
    page_size: int = Query(default=10, description="Размер страницы (1-20)", examples=[10], ge=1, le=20),
    db: Session = Depends(get_db)
):
    '''
    Получение списка ролей (постранично).

    Параметры запроса (опционально)
    - **current_page**: Номер текущей страницы **[int]**.
    - **page_size**: Размер страницы (1-20) **[int]**.
    
    Возвращает страницу заданного размера из списка всех ролей.
    '''

    total_count = db.scalar(select(func.count(Role.id)))
    total_pages = ceil(total_count / page_size) if total_count > 0 else 1
    offset = (current_page - 1) * page_size

    statement = select(Role).offset(offset).limit(page_size)
    roles = db.execute(statement).scalars().all()
    page = PagenatedRoleResponse(
        current_page=current_page,
        page_size=page_size,
        total_pages=total_pages,
        data=roles
    )
    return page


@router.get(
    "/roles/{id}", 
    response_class=JSONResponse,
    response_model=RoleResponse,
    summary="Получить роль по уникальному идентификатору",
    responses={
        200: {"description": "Роль найдена", "model": RoleResponse},
        404: {"description": "Роль не найдена"},
        422: {"description": "Неверный формат уникального идентификатора"}
    }
)
def get_role(
    id: int = Path(..., description="Уникальный идентификатор роли", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Получение роли по ее уникальному идентификатору.
    
    Путь запроса:
    - **id**: Уникальный идентификатор роли **[int]**.
    
    Возвращает указанную роль.
    '''

    statement = select(Role).where(Role.id == id)
    role = db.execute(statement).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Роль не найдена"
        )
    return role


@router.post(
    "/roles", 
    response_class=JSONResponse, 
    status_code=201,
    response_model=RoleResponse,
    summary="Добавить новую роль",
    responses={
        201: {"description": "Роль создана", "model": RoleResponse},
        400: {"description": "Неверные данные"},
        409: {"description": "Роль уже существует"},
    }
)
def add_role(
    role_data: RoleCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Добавление новой роли.

    Тело запроса:
    - **name**: Название роли **[string]** (обязательно, 1-100 символов).

    Возвращает созданную роль с присвоенным уникальным идентификатором.
    '''
    
    statement = select(Role).where(Role.name == role_data.name)
    existing = db.execute(statement).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Роль '{role_data.name}' уже существует"
        )
    
    role = Role(
        name=role_data.name
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.patch(
    "/roles/{id}",
    response_class=JSONResponse,
    response_model=RoleResponse,
    summary="Обновить роль",
    responses={
        200: {"description": "Роль обновлена", "model": RoleResponse},
        400: {"description": "Неверные данные"},
        404: {"description": "Роль не найдена"},
        409: {"description": "Роль уже существует"},
    }
)
def update_skill(
    id: int = Path(..., description="Уникальный идентификатор роли", ge=1, examples=[1]),
    role_data: RoleCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Обновление указанной роли.
    
    Путь запроса:
    - **id**: Уникальный идентификатор роли **[int]**.

    Тело запроса
    - **name**: Новое название роли **[string]**.
    
    Возвращает роль с обновленными данными.
    '''
    
    statement = select(Role).where(Role.id == id)
    role = db.execute(statement).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Роль не найдена"
        )
    
    if role_data.name is not None:
        statement = select(Role).where(
            and_(
                Role.name == Role.name,
                Role.id != id
            )
        )
        existing = db.execute(statement).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Роль '{role_data.name}' уже существует"
            )
        role.name = role_data.name
    
    db.commit()
    db.refresh(role)
    return role


@router.delete(
    "/roles/{id}", 
    response_class=JSONResponse,
    response_model=DeleteResponse,
    summary="Удалить роль",
    responses={
        200: {"description": "Роль удалена", "model": DeleteResponse},
        404: {"description": "Роль не найдена"},
    }
)
def delete_skill(
    id: int = Path(..., description="Уникальный идентификатор роли", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет роль с указанным уникальным идентификатором.
    
    Путь запроса:
    - **id**: Уникальный идентификатор роли **[int]**.
        
    Возвращает сообщение об успешном удалении роли.
    '''

    statement = select(Role).where(Role.id == id)
    role = db.execute(statement).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Роль не найден"
        )
    
    db.delete(role)
    db.commit()
    return {"message": "Роль была успешно удалена"}