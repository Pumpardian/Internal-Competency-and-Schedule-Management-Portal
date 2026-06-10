from fastapi import APIRouter, Depends, HTTPException, Body, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from models import Skill
from dependencies import get_db

router = APIRouter()

@router.get("/skills", response_class=JSONResponse)
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


@router.get("/skills/{id}", response_class=JSONResponse)
def get_skill(
    id:     int = Path(..., ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Получение навыка по его id.
        
    - **id**: Уникальный идентификатор навыка, целочисленного типа.
    
    Возвращает объект навыка.
    '''

    statement = select(Skill).where(Skill.id == id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Навык не найден"
        )
    return skill


@router.post("/skills", response_class=JSONResponse, status_code=201)
def add_skill(
    name:     str = Body(embed=True, min_length=1, max_length=100, examples=["Python"]),
    category: str = Body(embed=True, examples=["language"]),
    db:   Session = Depends(get_db)
):
    '''
    Добавление навыка.

    - **name**: Название навыка строчного типа (обязательно, максимальная длина: 100).
    - **category**: Категория навыка, строчного типа (обязательно).

    Возвращает созданный навык.    
    '''
    name = name.strip()

    statement = select(Skill).where(
        and_(
            Skill.name == name,
        )
    )
    existing = db.execute(statement).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Навык '{name}' уже существует"
        )
    
    try:
        skill = Skill(
            name = name,
            category = category.strip().lower()
        )
        db.add(skill)
        db.commit()
        db.refresh(skill)
        return skill
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/skills/{id}", response_class=JSONResponse)
def delete_skill(
    id:     int = Path(..., ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет навык с указанным уникальным идентификатором.
        
    - **id**: Уникальный идентификатор навыка, целочисленного типа.
        
    Сообщение об успешном удалении навыка.
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