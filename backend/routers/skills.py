from fastapi import APIRouter, Depends, HTTPException, Body, Path, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from pydantic import BaseModel, Field, field_validator
from typing import List
from math import ceil

from models import Skill, skill_categories
from dependencies import get_db

router = APIRouter()

#Модели
class SkillCreateOrUpdate(BaseModel):
    """Модель для создания/изменения нового навыка"""
    name: str = Field(..., min_length=1, max_length=100, description="Название навыка", examples=["Python"])
    category: str = Field(..., description="Категория навыка", examples=["language"])
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Удаляем пробелы и проверяем на пустоту"""
        v = v.strip()
        if not v:
            raise ValueError('Название навыка не может быть пустым')
        return v
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        """Нормализуем категорию: удаляем пробелы и приводим к нижнему регистру"""
        v.strip().lower()
        if v not in skill_categories:
            raise ValueError('Данная категория не существует')
        return v

class SkillResponse(BaseModel):
    """Модель ответа с данными навыка"""
    id: int = Field(..., description="Уникальный идентификатор навыка", examples=[1])
    name: str = Field(..., description="Название навыка", examples=["Python"])
    category: str = Field(..., description="Категория навыка", examples=["language"])
    
    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    """Модель ответа при удалении"""
    message: str = Field(..., description="Сообщение об операции", examples=["Навык был успешно удален"])

class PagenatedSkillResponse(BaseModel):
    """Страничная модель ответа с данными навыков"""
    page_size: int = Field(..., description="Размер страницы", examples=[2])
    current_page: int = Field(..., description="Номер текущей страницы", examples=[1])
    total_pages: int = Field(..., description="Общее количество страниц", examples=[5])
    data: List[SkillResponse] = Field(..., description="Навыки данной строницы",
        examples=[[SkillResponse(id=1, name="Python", category="language"),
                   SkillResponse(id=2, name="MongoDB", category="database")]]
    )

#Эндпоинты
@router.get(
    "/skills", 
    response_class=JSONResponse,
    response_model=PagenatedSkillResponse,
    summary="Получить список всех навыков",
    responses={
        200: {"description": "Страница из списка навыков", "model": PagenatedSkillResponse},
        400: {"description": "Неверные данные"},
    }
)
def get_skills(
    current_page: int = Query(default=1, description="Номер текущей страницы", examples=[2], ge=1),
    page_size: int = Query(default=10, description="Размер страницы (1-20)", examples=[10], ge=1, le=20),
    db: Session = Depends(get_db)
):
    '''
    Получение списка навыков (постранично).

    Параметры запроса (опционально)
    - **current_page**: Номер текущей страницы **[int]**.
    - **page_size**: Размер страницы (1-20) **[int]**.
    
    Возвращает страницу заданного размера из списка всех навыков.
    '''

    total_count = db.scalar(select(func.count(Skill.id)))
    total_pages = ceil(total_count / page_size) if total_count > 0 else 1
    offset = (current_page - 1) * page_size

    statement = select(Skill).offset(offset).limit(page_size)
    skills = db.execute(statement).scalars().all()
    page = PagenatedSkillResponse(
        current_page=current_page,
        page_size=page_size,
        total_pages=total_pages,
        data=skills
    )
    return page


@router.get(
    "/skills/{id}", 
    response_class=JSONResponse,
    response_model=SkillResponse,
    summary="Получить навык по уникальному идентификатору",
    responses={
        200: {"description": "Навык найден", "model": SkillResponse},
        404: {"description": "Навык не найден"},
        422: {"description": "Неверный формат уникального идентификатора"}
    }
)
def get_skill(
    id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Получение навыка по его уникальному идентификатору.
    
    Путь запроса:
    - **id**: Уникальный идентификатор навыка **[int]**.
    
    Возвращает указанный навык.
    '''

    statement = select(Skill).where(Skill.id == id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Навык не найден"
        )
    return skill


@router.post(
    "/skills", 
    response_class=JSONResponse, 
    status_code=201,
    response_model=SkillResponse,
    summary="Добавить новый навык",
    responses={
        201: {"description": "Навык создан", "model": SkillResponse},
        400: {"description": "Неверные данные"},
        409: {"description": "Навык уже существует"},
    }
)
def add_skill(
    skill_data: SkillCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Добавление нового навыка.

    Тело запроса:
    - **name**: Название навыка **[string]** (обязательно, 1-100 символов).
    - **category**: Категория навыка **[string]** (обязательно).

    Возвращает созданный навык с присвоенным уникальным идентификатором.
    '''
    
    statement = select(Skill).where(Skill.name == skill_data.name)
    existing = db.execute(statement).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Навык '{skill_data.name}' уже существует"
        )
    
    try:
        skill = Skill(
            name=skill_data.name,
            category=skill_data.category
        )
        db.add(skill)
        db.commit()
        db.refresh(skill)
        return skill
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch(
    "/skills/{id}",
    response_class=JSONResponse,
    response_model=SkillResponse,
    summary="Обновить навык",
    responses={
        200: {"description": "Навык обновлен", "model": SkillResponse},
        400: {"description": "Неверные данные"},
        404: {"description": "Навык не найден"},
        409: {"description": "Навык уже существует"},
    }
)
def update_skill(
    id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    skill_data: SkillCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Обновление указанного навыка.
    
    Путь запроса:
    - **id**: Уникальный идентификатор навыка **[int]**.

    Тело запроса
    - **name**: Новое название навыка **[string]** (опционально).
    - **category**: Новая категория навыка **[string]** (опционально).
    
    Возвращает навык с обновленными данными.
    '''
    
    statement = select(Skill).where(Skill.id == id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Навык не найден"
        )
    
    if skill_data.name is not None:
        statement = select(Skill).where(
            and_(
                Skill.name == skill_data.name,
                Skill.id != id
            )
        )
        existing = db.execute(statement).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Навык '{skill_data.name}' уже существует"
            )
        skill.name = skill_data.name
    
    if skill_data.category is not None:
        skill.category = skill_data.category
    
    db.commit()
    db.refresh(skill)
    return skill


@router.delete(
    "/skills/{id}", 
    response_class=JSONResponse,
    response_model=DeleteResponse,
    summary="Удалить навык",
    responses={
        200: {"description": "Навык удален", "model": DeleteResponse},
        404: {"description": "Навык не найден"},
    }
)
def delete_skill(
    id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет навык с указанным уникальным идентификатором.
    
    Путь запроса:
    - **id**: Уникальный идентификатор навыка **[int]**.
        
    Возвращает сообщение об успешном удалении навыка.
    '''

    statement = select(Skill).where(Skill.id == id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Навык не найден"
        )
    
    db.delete(skill)
    db.commit()
    return {"message": "Навык был успешно удален"}