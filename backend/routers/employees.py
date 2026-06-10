from fastapi import APIRouter, Depends, HTTPException, Body, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

from models import Employee
from dependencies import get_db

router = APIRouter()

#Модели
class EmployeeCreate(BaseModel):
    """Модель для создания сотрудника"""
    first_name: str = Field(..., min_length=1, max_length=100, description="Имя сотрудника", examples=["Иван"])
    last_name: str = Field(..., min_length=1, max_length=100, description="Фамилия сотрудника", examples=["Иванов"])
    position: Optional[str] = Field(None, max_length=150, description="Должность", examples=["Разработчик"])
    photo_url: Optional[str] = Field(None, max_length=500, description="Ссылка на фото сотрудника", examples=["https://example.com/photo.jpg"])
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def strip_names(cls, v: str) -> str:
        """Удаляем пробелы в начале и конце"""
        return v.strip() if v else v

class EmployeeUpdate(BaseModel):
    """Модель для обновления данных сотрудника (все поля опциональны)"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Имя сотрудника", examples=["Иван"])
    last_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Фамилия сотрудника", examples=["Иванов"])
    position: Optional[str] = Field(None, max_length=150, description="Должность", examples=["Ведущий разработчик"])
    photo_url: Optional[str] = Field(None, max_length=500, description="Ссылка на фото сотрудника", examples=["https://example.com/new_photo.jpg"])
    
    @field_validator('first_name', 'last_name', 'position', 'photo_url')
    @classmethod
    def strip_fields(cls, v: Optional[str]) -> Optional[str]:
        """Удаляем пробелы в начале и конце, если значение не None"""
        return v.strip() if v else v

class EmployeeResponse(BaseModel):
    """Модель ответа с данными сотрудника"""
    id: int = Field(..., description="Уникальный идентификатор сотрудника", examples=[123])
    first_name: str = Field(..., description="Имя сотрудника", examples=["Иван"])
    last_name: str = Field(..., description="Фамилия сотрудника", examples=["Иванов"])
    position: Optional[str] = Field(None, description="Должность", examples=["Разработчик"])
    photo_url: Optional[str] = Field(None, description="Ссылка на фото", examples=["https://example.com/photo.jpg"])
    created_at: datetime = Field(..., description="Дата и время создания записи")
    
    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    """Модель ответа при удалении"""
    message: str = Field(..., description="Сообщение об операции", examples=["Сотрудник успешно удален"])

#Эндпоинты
@router.get(
    "/employees", 
    response_class=JSONResponse,
    response_model=List[EmployeeResponse],
    summary="Получить список всех сотрудников",
)
def get_employees(
    db: Session = Depends(get_db)
):
    '''
    Получение списка всех сотрудников.
    
    Возвращает список сотрудников.
    '''

    statement = select(Employee)
    employees = db.execute(statement).scalars().all()
    return employees


@router.get(
    "/employees/{id}", 
    response_class=JSONResponse,
    response_model=EmployeeResponse,
    summary="Получить сотрудника по уникальному идентификатору",
)
def get_employee(
    id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    db: Session = Depends(get_db)
):
    '''
    Получение сотрудника по его уникальному идентификатору.

    Путь запроса:
    - **id**: Уникальный идентификатор сотрудника, целочисленного типа.
    
    Возвращает указанного сотрудника.
    '''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Сотрудник не найден"
        )
    return employee


@router.post(
    "/employees", 
    response_class=JSONResponse, 
    status_code=201,
    response_model=EmployeeResponse,
    summary="Добавить нового сотрудника",
)
def add_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db)
):
    '''
    Добавление нового сотрудника.
    
    Тело запроса:
    - **first_name**: Имя сотрудника (обязательно, 1-100 символов).
    - **last_name**: Фамилия сотрудника (обязательно, 1-100 символов).
    - **position**: Должность (опционально, до 150 символов).
    - **photo_url**: Ссылка на фото (опционально, до 500 символов).
    
    Возвращает созданного сотрудника с присвоенным уникальным идентификатором.
    '''
    
    statement = select(Employee).where(
        and_(
            Employee.first_name == employee_data.first_name,
            Employee.last_name == employee_data.last_name
        )
    )
    existing_employee = db.execute(statement).scalar_one_or_none()
    if existing_employee:
        raise HTTPException(
            status_code=409,
            detail=f"Сотрудник '{employee_data.last_name} {employee_data.first_name}' уже существует"
        )
    
    employee = Employee(
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        position=employee_data.position,
        photo_url=employee_data.photo_url,
        created_at=datetime.now()
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.patch(
    "/employees/{id}", 
    response_class=JSONResponse,
    response_model=EmployeeResponse,
    summary="Обновить данные сотрудника",
)
def update_employee(
    id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    employee_data: EmployeeUpdate = Body(...),
    db: Session = Depends(get_db)
):
    '''
    Обновляет данные сотрудника.
    
    Путь запроса:
    - **id**: Уникальный идентификатор сотрудника, целочисленного типа.
    
    Тело запроса (все поля опциональны):
    - **first_name**: Имя сотрудника (1-100 символов).
    - **last_name**: Фамилия сотрудника (1-100 символов).
    - **position**: Должность (до 150 символов).
    - **photo_url**: Ссылка на фото (до 500 символов).
    
    Возвращает сотрудника с обновленными данными.
    '''
    
    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Сотрудник не найден"
        )
    
    if employee_data.first_name is not None or employee_data.last_name is not None:
        new_first_name = employee_data.first_name if employee_data.first_name is not None else employee.first_name
        new_last_name = employee_data.last_name if employee_data.last_name is not None else employee.last_name
        
        statement = select(Employee).where(
            and_(
                Employee.first_name == new_first_name,
                Employee.last_name == new_last_name,
                Employee.id != id
            )
        )
        exists = db.execute(statement).scalar_one_or_none()
        if exists:
            raise HTTPException(
                status_code=409,
                detail=f"Сотрудник '{new_last_name} {new_first_name}' уже существует"
            )
    
    if employee_data.first_name is not None:
        employee.first_name = employee_data.first_name
    if employee_data.last_name is not None:
        employee.last_name = employee_data.last_name
    if employee_data.position is not None:
        employee.position = employee_data.position
    if employee_data.photo_url is not None:
        employee.photo_url = employee_data.photo_url
    
    db.commit()
    db.refresh(employee)
    return employee


@router.delete(
    "/employees/{id}", 
    response_class=JSONResponse,
    response_model=DeleteResponse,
    summary="Удалить сотрудника",
)
def delete_employee(
    id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет сотрудника с указанным уникальным идентификатором.
    
    Путь запроса:
    - **id**: Уникальный идентификатор сотрудника, целочисленного типа.
    
    Возвращает сообщение об успешном удалении сотрудника.
    '''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Сотрудник не найден"
        )
    
    db.delete(employee)
    db.commit()
    return {"message": "Сотрудник успешно удален"}