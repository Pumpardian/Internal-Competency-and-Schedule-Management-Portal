from fastapi import APIRouter, Depends, HTTPException, Body, Path, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from pydantic import BaseModel, Field, field_validator
from typing import List
from math import ceil

from models import Permission
from dependencies import get_db

router = APIRouter()

#Модели
class PermissionCreateOrUpdate(BaseModel):
    """Модель для создания/изменения новой права"""
    name: str = Field(..., min_length=1, max_length=100, description="Название права", examples=["Изменение данных отдела"])
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Удаляем пробелы и проверяем на пустоту"""
        v = v.strip()
        if not v:
            raise ValueError('Название права не может быть пустым')
        return v

class PermissionResponse(BaseModel):
    """Модель ответа с данными права"""
    id: int = Field(..., description="Уникальный идентификатор права", examples=[1])
    name: str = Field(..., description="Название права", examples=["Изменение данных отдела"])
    
    class Config:
        from_attributes = True

class DeletePermissionResponse(BaseModel):
    """Модель ответа при удалении права"""
    message: str = Field(..., description="Сообщение об операции", examples=["Право был успешно удалено"])

class PagenatedPermissionResponse(BaseModel):
    """Страничная модель ответа с данными прав"""
    page_size: int = Field(..., description="Размер страницы", examples=[2])
    current_page: int = Field(..., description="Номер текущей страницы", examples=[1])
    total_pages: int = Field(..., description="Общее количество страниц", examples=[5])
    data: List[PermissionResponse] = Field(..., description="Права данной строницы",
        examples=[[PermissionResponse(id=1, name="Изменение данных отдела"),
                   PermissionResponse(id=2, name="Связь профилей сотрудников с учетными записями")]]
    )

#Эндпоинты
@router.get(
    "/permissions", 
    response_class=JSONResponse,
    response_model=PagenatedPermissionResponse,
    summary="Получить список всех прав",
    responses={
        200: {"description": "Страница из списка прав", "model": PagenatedPermissionResponse},
        400: {"description": "Неверные данные"},
    }
)
def get_permissions(
    current_page: int = Query(default=1, description="Номер текущей страницы", examples=[2], ge=1),
    page_size: int = Query(default=10, description="Размер страницы (1-20)", examples=[10], ge=1, le=20),
    db: Session = Depends(get_db)
):
    '''
    Получение списка прав (постранично).

    Параметры запроса (опционально)
    - **current_page**: Номер текущей страницы **[int]**.
    - **page_size**: Размер страницы (1-20) **[int]**.
    
    Возвращает страницу заданного размера из списка всех прав.
    '''

    total_count = db.scalar(select(func.count(Permission.id)))
    total_pages = ceil(total_count / page_size) if total_count > 0 else 1
    offset = (current_page - 1) * page_size

    statement = select(Permission).offset(offset).limit(page_size)
    permissions = db.execute(statement).scalars().all()
    page = PagenatedPermissionResponse(
        current_page=current_page,
        page_size=page_size,
        total_pages=total_pages,
        data=permissions
    )
    return page


@router.get(
    "/permissions/{id}", 
    response_class=JSONResponse,
    response_model=PermissionResponse,
    summary="Получить право по уникальному идентификатору",
    responses={
        200: {"description": "Право найдено", "model": PermissionResponse},
        404: {"description": "Право не найдено"},
        422: {"description": "Неверный формат уникального идентификатора"}
    }
)
def get_permission(
    id: int = Path(..., description="Уникальный идентификатор права", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Получение права по его уникальному идентификатору.
    
    Путь запроса:
    - **id**: Уникальный идентификатор права **[int]**.
    
    Возвращает указанное право.
    '''

    statement = select(Permission).where(Permission.id == id)
    permission = db.execute(statement).scalar_one_or_none()
    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Право не найдено"
        )
    return permission


@router.post(
    "/permissions", 
    response_class=JSONResponse, 
    status_code=201,
    response_model=PermissionResponse,
    summary="Добавить новое право",
    responses={
        201: {"description": "Право создано", "model": PermissionResponse},
        400: {"description": "Неверные данные"},
        409: {"description": "Право уже существует"},
    }
)
def add_permission(
    permission_data: PermissionCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Добавление нового права.

    Тело запроса:
    - **name**: Название права **[string]** (обязательно, 1-100 символов).

    Возвращает созданное право с присвоенным уникальным идентификатором.
    '''
    
    statement = select(Permission).where(Permission.name == permission_data.name)
    existing = db.execute(statement).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Право '{permission_data.name}' уже существует"
        )
    
    permission = Permission(
        name=permission_data.name
    )
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return permission


@router.patch(
    "/permissions/{id}",
    response_class=JSONResponse,
    response_model=PermissionResponse,
    summary="Обновить право",
    responses={
        200: {"description": "Право обновлено", "model": PermissionResponse},
        400: {"description": "Неверные данные"},
        404: {"description": "Право не найдено"},
        409: {"description": "Право уже существует"},
    }
)
def update_permission(
    id: int = Path(..., description="Уникальный идентификатор права", ge=1, examples=[1]),
    permission_data: PermissionCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Обновление указанного права.
    
    Путь запроса:
    - **id**: Уникальный идентификатор права **[int]**.

    Тело запроса
    - **name**: Новое название права **[string]**.
    
    Возвращает право с обновленными данными.
    '''
    
    statement = select(Permission).where(Permission.id == id)
    permission = db.execute(statement).scalar_one_or_none()
    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Право не найдено"
        )
    
    if permission_data.name is not None:
        statement = select(Permission).where(
            and_(
                Permission.name == Permission.name,
                Permission.id != id
            )
        )
        existing = db.execute(statement).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Право '{permission_data.name}' уже существует"
            )
        permission.name = permission_data.name
    
    db.commit()
    db.refresh(permission)
    return permission


@router.delete(
    "/permissions/{id}", 
    response_class=JSONResponse,
    response_model=DeletePermissionResponse,
    summary="Удалить право",
    responses={
        200: {"description": "Право удалено", "model": DeletePermissionResponse},
        404: {"description": "Право не найдено"},
    }
)
def delete_permission(
    id: int = Path(..., description="Уникальный идентификатор права", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет право с указанным уникальным идентификатором.
    
    Путь запроса:
    - **id**: Уникальный идентификатор права **[int]**.
        
    Возвращает сообщение об успешном удалении права.
    '''

    statement = select(Permission).where(Permission.id == id)
    permission = db.execute(statement).scalar_one_or_none()
    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Право не найдено"
        )
    
    db.delete(permission)
    db.commit()
    return {"message": "Право было успешно удалено"}