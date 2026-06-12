from fastapi import APIRouter, Depends, HTTPException, Body, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from pydantic import BaseModel, Field
from typing import List

from models import Role, Permission, RolePermission
from dependencies import get_db

router = APIRouter()

#Модели
class RolePermissionResponse(BaseModel):
    """Модель ответа с информацией о праве роли"""
    id: int = Field(..., description="Уникальный идентификатор роли", examples=[1])
    name: str = Field(..., description="Название права", examples=["Изменение данных отдела"])
    
    class Config:
        from_attributes = True

class RolePermissionDetailResponse(BaseModel):
    """Детальная модель ответа с информацией о связи роли и права"""
    employee_id: int = Field(..., description="Уникальный идентификатор роли", examples=[123])
    skill_id: int = Field(..., description="Уникальный идентификатор права", examples=[1])
    
    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    """Модель ответа при удалении"""
    message: str = Field(..., description="Сообщение об операции", examples=["Право (ID: {permission_id}) успешно удалено у роли (ID: {role_id})"])

#Эндпоинты
@router.get(
    "/roles/{id}/permissions", 
    response_class=JSONResponse,
    response_model=List[RolePermissionResponse],
    summary="Получить права роли",
    responses={
        200: {"description": "Права роли", "model": List[RolePermissionResponse]},
        404: {"description": "Сотрудник не найден"},
    }
)
def get_role_permissions(
    id: int = Path(..., description="Уникальный идентификатор роли", ge=1, examples=[123]),
    db: Session = Depends(get_db)
):
    '''
    Получение прав указанной роли.
    
    Путь запроса:
    - **id**: Уникальный идентификатор роли **[int]**.
    
    Возвращает список прав роли.
    '''

    statement = select(Role).where(Role.id == id)
    role = db.execute(statement).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Роль не найдена"
        )
    
    statement = select(
        Permission.id,
        Permission.name,
    ).join(
        RolePermission, RolePermission.permission_id == Permission.id
    ).where(
        RolePermission.role_id == id
    ).order_by(
        Permission.name,
    )
    role_permissions = db.execute(statement).all()
    return [
        {
            "id": permission.id,
            "name": permission.name,
        }
        for permission in role_permissions
    ]


@router.post(
    "/roles/{role_id}/permissions/{permission_id}", 
    response_class=JSONResponse, 
    status_code=201,
    response_model=RolePermissionDetailResponse,
    summary="Добавить право роли",
    responses={
        201: {"description": "Право роли создано", "model": RolePermissionResponse},
        400: {"description": "Неверные данные"},
        409: {"description": "Право роли уже существует"},
    }
)
def add_role_permission(
    role_id: int = Path(..., description="Уникальный идентификатор роли", ge=1, examples=[123]),
    permission_id: int = Path(..., description="Уникальный идентификатор права", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Добавление права указанной роли.
    
    Параметры пути:
    - **role_id**: Уникальный идентификатор роли **[int]** (обязательно).
    - **permission_id**: Уникальный идентификатор права **[int]** (обязательно).
    
    Возвращает связную информацию для созданного права роли.
    '''
    
    statement = select(Role).where(Role.id == role_id)
    role = db.execute(statement).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Роль не найдена"
        )

    statement = select(Permission).where(Permission.id == permission_id)
    permission = db.execute(statement).scalar_one_or_none()
    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Право не найдено"
        )

    statement = select(RolePermission).where(
        and_(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id
        )
    )
    exists = db.execute(statement).scalar_one_or_none()
    if exists:
        raise HTTPException(
            status_code=409,
            detail="Роль уже имеет данное право"
        )

    role_permission = RolePermission(
        role_id=role_id,
        permission_id=permission_id
    )
    db.add(role_permission)
    db.commit()
    db.refresh(role_permission)
    return {
        "id": permission.id,
        "name": permission.name,
    }


@router.delete(
    "/roles/{role_id}/permissions/{permission_id}",
    response_class=JSONResponse,
    status_code=200,
    response_model=DeleteResponse,
    summary="Удалить право у роли",
    responses={
        200: {"description": "Право роли удалено", "model": DeleteResponse},
        404: {"description": "Право роли не найдено"},
    }
)
def delete_role_permission(
    role_id: int = Path(..., description="Уникальный идентификатор роли", ge=1, examples=[123]),
    permission_id: int = Path(..., description="Уникальный идентификатор права", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Удаление права у роли.
    
    Параметры пути:
    - **role_id**: Уникальный идентификатор роли **[int]** (обязательно).
    - **permission_id**: Уникальный идентификатор права **[int]** (обязательно).
    
    Возвращает сообщение об успешном удалении права у роли.
    '''
    
    statement = select(RolePermission).where(
        and_(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id
        )
    )
    role_permission = db.execute(statement).scalar_one_or_none()
    if not role_permission:
        raise HTTPException(
            status_code=404,
            detail="Право роли не найдено"
        )
    
    db.delete(role_permission)
    db.commit()
    return {"message": f"Право (ID: {permission_id}) успешно удалено у роли (ID: {role_id})"}