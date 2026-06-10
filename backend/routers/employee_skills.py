from fastapi import APIRouter, Depends, HTTPException, Body, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from pydantic import BaseModel, Field
from typing import List, Optional

from models import Employee, Skill, EmployeeSkill
from dependencies import get_db

router = APIRouter()

#Модели
class EmployeeSkillResponse(BaseModel):
    """Модель ответа с информацией о навыке сотрудника"""
    id: int = Field(..., description="Уникальный идентификатор навыка", examples=[1])
    name: str = Field(..., description="Название навыка", examples=["Python"])
    category: Optional[str] = Field(None, description="Категория навыка", examples=["language"])
    level: int = Field(..., description="Уровень владения (0-5)", ge=0, le=5, examples=[3])
    
    class Config:
        from_attributes = True

class EmployeeSkillCreateOrUpdate(BaseModel):
    """Модель для добавления/изменения навыка сотруднику"""
    level: int = Field(..., description="Уровень владения навыком", ge=0, le=5, examples=[3])

class EmployeeSkillDetailResponse(BaseModel):
    """Детальная модель ответа с информацией о связи сотрудника и навыка"""
    employee_id: int = Field(..., description="Уникальный идентификатор сотрудника", examples=[123])
    skill_id: int = Field(..., description="Уникальный идентификатор навыка", examples=[1])
    level: int = Field(..., description="Уровень владения", ge=0, le=5, examples=[3])
    
    class Config:
        from_attributes = True

#Эндпоинты
@router.get(
    "/employees/{id}/skills", 
    response_class=JSONResponse,
    response_model=List[EmployeeSkillResponse],
    summary="Получить навыки сотрудника",
)
def get_employee_skills(
    id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    db: Session = Depends(get_db)
):
    '''
    Получение навыков сотрудника по его уникальному идентификатору.
    
    Путь запроса:
    - **id**: Уникальный идентификатор сотрудника, целочисленного типа.
    
    Возвращает список навыков сотрудника.
    '''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Сотрудник не найден"
        )
    
    statement = select(
        Skill.id,
        Skill.name,
        Skill.category,
        EmployeeSkill.level    
    ).join(
        EmployeeSkill, EmployeeSkill.skill_id == Skill.id
    ).where(
        EmployeeSkill.employee_id == id
    ).order_by(
        Skill.name,
        Skill.category
    )
    employee_skills = db.execute(statement).all()
    return [
        {
            "id": skill.id,
            "name": skill.name,
            "category": skill.category,
            "level": skill.level
        }
        for skill in employee_skills
    ]


@router.post(
    "/employees/{employee_id}/skills/{skill_id}", 
    response_class=JSONResponse, 
    status_code=201,
    response_model=EmployeeSkillDetailResponse,
    summary="Добавить навык сотруднику",
)
def add_employee_skill(
    employee_id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    skill_id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    skill_data: EmployeeSkillCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Добавление навыка сотруднику.
    
    Параметры пути:
    - **employee_id**: Уникальный идентификатор сотрудника, целочисленного типа (обязательно).
    - **skill_id**: Уникальный идентификатор навыка, целочисленного типа (обязательно).
    
    Тело запроса:
    - **level**: Уровень владения, целочисленного типа (допустимый диапазон [0; 5]).
    
    Возвращает связную информацию созданного навыка сотрудника.
    '''
    
    statement = select(Employee).where(Employee.id == employee_id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Сотрудник не найден"
        )

    statement = select(Skill).where(Skill.id == skill_id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Навык не найден"
        )

    statement = select(EmployeeSkill).where(
        and_(
            EmployeeSkill.employee_id == employee_id,
            EmployeeSkill.skill_id == skill_id
        )
    )
    exists = db.execute(statement).scalar_one_or_none()
    if exists:
        raise HTTPException(
            status_code=409,
            detail="Сотрудник уже имеет данный навык"
        )

    employee_skill = EmployeeSkill(
        employee_id=employee_id,
        skill_id=skill_id,
        level=skill_data.level
    )
    db.add(employee_skill)
    db.commit()
    db.refresh(employee_skill)
    return employee_skill


@router.patch(
    "/employees/{employee_id}/skills/{skill_id}", 
    response_class=JSONResponse,
    response_model=EmployeeSkillDetailResponse,
    summary="Обновить уровень навыка сотрудника",
)
def update_employee_skill(
    employee_id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    skill_id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    skill_data: EmployeeSkillCreateOrUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Обновление уровня владения навыком сотрудника.
    
    Параметры пути:
    - **employee_id**: Уникальный идентификатор сотрудника, целочисленного типа (обязательно).
    - **skill_id**: Уникальный идентификатор навыка, целочисленного типа (обязательно).
    
    Тело запроса:
    - **level**: Новый уровень владения, целочисленного типа (допустимый диапазон [0; 5]).
    
    Возвращает связную информацию обновленного навыка сотрудника.
    '''
    
    statement = select(EmployeeSkill).where(
        and_(
            EmployeeSkill.employee_id == employee_id,
            EmployeeSkill.skill_id == skill_id
        )
    )
    employee_skill = db.execute(statement).scalar_one_or_none()
    if not employee_skill:
        raise HTTPException(
            status_code=404,
            detail="Навык сотрудника не найден"
        )

    employee_skill.level = skill_data.level
    db.commit()
    db.refresh(employee_skill)
    return employee_skill


@router.delete(
    "/employees/{employee_id}/skills/{skill_id}",
    response_class=JSONResponse,
    status_code=200,
    response_model=dict,
    summary="Удалить навык у сотрудника",
)
def delete_employee_skill(
    employee_id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    skill_id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Удаление навыка у сотрудника.
    
    Параметры пути:
    - **employee_id**: Уникальный идентификатор сотрудника, целочисленного типа (обязательно).
    - **skill_id**: Уникальный идентификатор навыка, целочисленного типа (обязательно).
    
    Возвращает сообщение об успешном удалении навыка у сотрудника.
    '''
    
    statement = select(EmployeeSkill).where(
        and_(
            EmployeeSkill.employee_id == employee_id,
            EmployeeSkill.skill_id == skill_id
        )
    )
    employee_skill = db.execute(statement).scalar_one_or_none()
    if not employee_skill:
        raise HTTPException(
            status_code=404,
            detail="Навык сотрудника не найден"
        )
    
    db.delete(employee_skill)
    db.commit()
    return {"message": f"Навык (ID: {skill_id}) успешно удален у сотрудника (ID: {employee_id})"}