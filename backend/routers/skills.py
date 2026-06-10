from fastapi import APIRouter, Depends, HTTPException, Body, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from pydantic import BaseModel, Field, field_validator
from typing import List

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

#Эндпоинты
@router.get(
    "/skills", 
    response_class=JSONResponse,
    response_model=List[SkillResponse],
    summary="Получить список всех навыков",
)
def get_skills(
    db: Session = Depends(get_db)
):
    '''
    Получение списка всех навыков.
    
    Возвращает список всех навыков.
    '''

    statement = select(Skill)
    skills = db.execute(statement).scalars().all()
    return skills


@router.get(
    "/skills/{id}", 
    response_class=JSONResponse,
    response_model=SkillResponse,
    summary="Получить навык по уникальному идентификатору",
)
def get_skill(
    id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Получение навыка по его уникальному идентификатору.
    
    Путь запроса:
    - **id**: Уникальный идентификатор навыка, целочисленного типа.
    
    Возвращает навык.
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
)
def add_skill(
    skill_data: SkillCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Добавление нового навыка.

    Тело запроса:
    - **name**: Название навыка (обязательно, 1-100 символов).
    - **category**: Категория навыка (обязательно).

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
)
def update_skill(
    id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    skill_data: SkillCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Обновление навыка.
    
    Путь запроса:
    - **id**: Уникальный идентификатор навыка, целочисленного типа.

    Тело запроса
    - **name**: Новое название навыка (опционально).
    - **category**: Новая категория навыка (опционально).
    
    Возвращает обновленный навык.
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
)
def delete_skill(
    id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет навык с указанным уникальным идентификатором.
    
    Путь запроса:
    - **id**: Уникальный идентификатор навыка, целочисленного типа.
        
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