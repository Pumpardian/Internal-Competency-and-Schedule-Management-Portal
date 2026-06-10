from fastapi import APIRouter, Depends, HTTPException, Body, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from models import Employee, Skill, EmployeeSkill
from dependencies import get_db

router = APIRouter()

@router.get("/employees/{id}/skills", response_class=JSONResponse)
def get_employee_skills(
    id:     int = Path(..., ge=1, examples=[123]),
    db: Session = Depends(get_db)
):
    '''
    Получение навыков сотрудника по его уникальному идентификатору.
        
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


@router.post("/employees/{employee_id}/skills/{skill_id}", response_class=JSONResponse, status_code=201)
def add_employee_skill(
    employee_id: int = Path(..., ge=1, examples=[123]),
    skill_id:    int = Path(..., ge=1, examples=[1]),
    level:       int = Body(embed=True, ge=0, le=5, examples=[3]),
    db:      Session = Depends(get_db)
):
    '''
    Добавление навыка сотрудника.
    
    - **employee_id**: Уникальный идентификатор сотрудника, целочисленного типа (обязательно).
    - **skill_id**: Уникальный идентификатор навыка, целочисленного типа (обязательно).
    - **level**: Уровень владения, целочисленного типа (допустимый диапазон [0; 5]).
    
    Возвращает связную иформацию созданного навыка сотрудника.
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
        employee_id = employee_id,
        skill_id = skill_id,
        level = level
    )
    db.add(employee_skill)
    db.commit()
    db.refresh(employee_skill)
    return employee_skill


@router.patch("/employees/{employee_id}/skills/{skill_id}", response_class=JSONResponse)
def update_employee_skill(
    employee_id: int = Path(..., ge=1, examples=[123]),
    skill_id:    int = Path(..., ge=1, examples=[1]),
    level:       int = Body(embed=True, ge=1, le=5, examples=[4]),
    db:      Session = Depends(get_db)
):
    '''
    Обновление уровнем владения навыка сотрудника.
    
    - **employee_id**: Уникальный идентификатор сотрудника, целочисленного типа (обязательно).
    - **skill_id**: Уникальный идентификатор навыка, целочисленного типа (обязательно).
    - **level**: Уровень владения, целочисленного типа (допустимый диапазон [0; 5]).
    
    Возвращает связную иформацию обновленного навыка сотрудника.
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

    employee_skill.level = level
    db.commit()
    db.refresh(employee_skill)
    return employee_skill