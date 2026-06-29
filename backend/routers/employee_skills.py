from fastapi import APIRouter, Depends, HTTPException, Body, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

from models import Employee, Skill, EmployeeSkill
from dependencies import get_db, get_logger
from utils.auth import user_dependency, require_permission

router = APIRouter()

#Модели
class EmployeeSkillResponse(BaseModel):
    """Модель ответа с информацией о навыке сотрудника"""
    id: int = Field(..., description="Уникальный идентификатор навыка", examples=[1])
    name: str = Field(..., description="Название навыка", examples=["Python"])
    category: Optional[str] = Field(None, description="Категория навыка", examples=["language"])
    level: int = Field(..., description="Уровень владения (0-5)", ge=0, le=5, examples=[3])
    
    model_config = ConfigDict(from_attributes = True)

class EmployeeSkillCreateOrUpdate(BaseModel):
    """Модель для добавления/изменения навыка сотруднику"""
    level: int = Field(..., description="Уровень владения навыком", ge=0, le=5, examples=[3])

class EmployeeSkillDetailResponse(BaseModel):
    """Детальная модель ответа с информацией о связи сотрудника и навыка"""
    employee_id: int = Field(..., description="Уникальный идентификатор сотрудника", examples=[123])
    skill_id: int = Field(..., description="Уникальный идентификатор навыка", examples=[1])
    level: int = Field(..., description="Уровень владения", ge=0, le=5, examples=[3])
    
    model_config = ConfigDict(from_attributes = True)

class DeleteEmployeeSkillResponse(BaseModel):
    """Модель ответа при удалении навыка сотрудника"""
    message: str = Field(..., description="Сообщение об операции", examples=["Навык (ID: {skill_id}) успешно удален у сотрудника (ID: {employee_id})"])

#Эндпоинты
@router.get(
    "/employees/{id}/skills", 
    response_class=JSONResponse,
    response_model=List[EmployeeSkillResponse],
    summary="Получить навыки сотрудника",
    responses={
        200: {"description": "Навыки сотрудника", "model": List[EmployeeSkillResponse]},
        401: {"description": "Не авторизован"},
        404: {"description": "Сотрудник не найден"},
    }
)
def get_employee_skills(
    user: user_dependency,
    id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    db: Session = Depends(get_db)
):
    '''
    Получение навыков указанного сотрудника.
    
    Путь запроса:
    - **id**: Уникальный идентификатор сотрудника **[int]**.
    
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
    response_model=EmployeeSkillResponse,
    summary="Добавить навык сотруднику",
    responses={
        201: {"description": "Навык сотрудника создан", "model": EmployeeSkillResponse},
        400: {"description": "Неверные данные"},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        409: {"description": "Навык сотрудника уже существует"},
    }
)
def add_employee_skill(
    employee_id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    skill_id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    skill_data: EmployeeSkillCreateOrUpdate = Body(...),
    user: dict = Depends(require_permission("employee_skill.create")),
    db: Session = Depends(get_db)
):
    '''
    Добавление навыка указанному сотруднику.
    
    Параметры пути:
    - **employee_id**: Уникальный идентификатор сотрудника **[int]** (обязательно).
    - **skill_id**: Уникальный идентификатор навыка **[int]** (обязательно).
    
    Тело запроса:
    - **level**: Уровень владения **[int]** (допустимый диапазон [0; 5]).
    
    Возвращает связную информацию для созданного навыка сотрудника.
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
    get_logger().info(f"Добавлен навык (ID: {skill.id}) с названием {skill.name} и категорией {skill.name} \
                      для сотрудника (ID: {employee.id}) {employee.last_name} {employee.first_name} \
                      с уровнем владения {employee_skill.level}")
    return {
        "id": skill.id,
        "name": skill.name,
        "category": skill.category,
        "level": employee_skill.level
    }


@router.patch(
    "/employees/{employee_id}/skills/{skill_id}", 
    response_class=JSONResponse,
    response_model=EmployeeSkillDetailResponse,
    summary="Обновить уровень навыка сотрудника",
    responses={
        200: {"description": "Навык сотрудника обновлен", "model": EmployeeSkillResponse},
        400: {"description": "Неверные данные"},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        409: {"description": "Навык сотрудника уже существует"},
    }
)
def update_employee_skill(
    employee_id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    skill_id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    skill_data: EmployeeSkillCreateOrUpdate = Body(...),
    user: dict = Depends(require_permission("employee_skill.update")),
    db: Session = Depends(get_db)
):
    '''
    Обновление уровня владения навыком сотрудника.
    
    Параметры пути:
    - **employee_id**: Уникальный идентификатор сотрудника **[int]** (обязательно).
    - **skill_id**: Уникальный идентификатор навыка **[int]** (обязательно).
    
    Тело запроса:
    - **level**: Новый уровень владения **[int]** (допустимый диапазон [0; 5]).
    
    Возвращает связную информацию для обновленного навыка сотрудника.
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

    get_logger().info(f"Обновлен навык (ID: {employee_skill.skill_id}) \
                    для сотрудника (ID: {employee_skill.employee_id}) \
                    с уровня владения {employee_skill.level} на {skill_data.level}")
    employee_skill.level = skill_data.level
    db.commit()
    db.refresh(employee_skill)
    return employee_skill


@router.delete(
    "/employees/{employee_id}/skills/{skill_id}",
    response_class=JSONResponse,
    status_code=200,
    response_model=DeleteEmployeeSkillResponse,
    summary="Удалить навык у сотрудника",
    responses={
        200: {"description": "Навык сотрудника удален", "model": DeleteEmployeeSkillResponse},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        404: {"description": "Навык сотрудника не найден"},
    }
)
def delete_employee_skill(
    employee_id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    skill_id: int = Path(..., description="Уникальный идентификатор навыка", ge=1, examples=[1]),
    user: dict = Depends(require_permission("employee_skill.delete")),
    db: Session = Depends(get_db)
):
    '''
    Удаление навыка у сотрудника.
    
    Параметры пути:
    - **employee_id**: Уникальный идентификатор сотрудника **[int]** (обязательно).
    - **skill_id**: Уникальный идентификатор навыка **[int]** (обязательно).
    
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
    get_logger().info(f"Удален навык (ID: {employee_skill.skill_id}) с \
                      для сотрудника (ID: {employee_skill.employee_id})")
    return {"message": f"Навык (ID: {skill_id}) успешно удален у сотрудника (ID: {employee_id})"}