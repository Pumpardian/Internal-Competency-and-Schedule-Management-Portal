from fastapi import APIRouter, Depends, HTTPException, Body, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from datetime import datetime

from models import Employee
from dependencies import get_db

router = APIRouter()

@router.get("/employees", response_class=JSONResponse)
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


@router.get("/employees/{id}", response_class=JSONResponse)
def get_employee(
    id:     int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    db: Session = Depends(get_db)
):
    '''
    Получение сотрудника по его уникальному идентификатору.

    - **id**: Уникальный идентификатор сотрудника, целочисленного типа.
    
    Возвращает сотрудника.
    '''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Сотрудник не найден"
        )
    return employee


@router.post("/employees", response_class=JSONResponse, status_code=201)
def add_employee(
    first_name: str = Body(embed=True, min_length=1, max_length=100, examples=["Иван"]),
    last_name:  str = Body(embed=True, min_length=1, max_length=100, examples=["Иванов"]),
    position:   str = Body(embed=True, default=None, max_length=150, examples=["Разработчик"]),
    photo_url:  str = Body(embed=True, default=None, description="Ссылка на фото сотрудника", max_length=500, examples=["https://example.com/photo.jpg"]),
    db:     Session = Depends(get_db)
):
    '''
    Добавление нового сотрудника.
    
    - **first_name**: Имя сотрудника (обязательно, 1-100 символов)
    - **last_name**: Фамилия сотрудника (обязательно, 1-100 символов)
    - **position**: Должность (опционально, до 150 символов)
    - **photo_url**: Ссылка на фото (опционально, до 500 символов)
    
    Возвращает созданного сотрудника с присвоенным уникальным идентификатором.
    '''
    first_name = first_name.strip()
    last_name = last_name.strip()
    
    statement = select(Employee).where(
        and_(
            Employee.first_name == first_name,
            Employee.last_name == last_name
        )
    )
    existing_employee = db.execute(statement).scalar_one_or_none()
    
    if existing_employee:
        raise HTTPException(
            status_code=409,
            detail=f"Сотрудник '{last_name} {first_name}' уже существует"
        )
    
    employee = Employee(
        first_name=first_name,
        last_name=last_name,
        position=position.strip() if position else None,
        photo_url=photo_url.strip() if photo_url else None,
        created_at=datetime.now()
    )
    
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.patch("/employees/{id}", response_class=JSONResponse)
def update_employee(
    id: int = Path(..., description="ID сотрудника", ge=1, examples=[123]),
    first_name: str = Body(embed=True, default=None, description="Имя сотрудника", max_length=100),
    last_name:  str = Body(embed=True, default=None, description="Фамилия сотрудника", max_length=100),
    position:   str = Body(embed=True, default=None, description="Должность", max_length=150),
    photo_url:  str = Body(embed=True, default=None, description="Ссылка на фото", max_length=500),
    db:     Session = Depends(get_db)
):
    '''
    Обновляет данные сотрудника.
        
    - **id**: Уникальный идентификатор сотрудника, целочисленного типа.
    - **first_name**: Имя сотрудника (опционально, 1-100 символов)
    - **last_name**: Фамилия сотрудника (опционально, 1-100 символов)
    - **position**: Должность (опционально, до 150 символов)
    - **photo_url**: Ссылка на фото (опционально, до 500 символов)
    
    Возвращает сотрудника с обновленными данными.
    '''
    
    first_name = first_name.strip() if first_name is not None else None
    last_name = last_name.strip() if first_name is not None else None

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Сотрудник не найден"
        )

    conditions = []
    if first_name is not None:
        conditions.append(Employee.first_name == first_name)
    else:
        conditions.append(Employee.first_name == employee.first_name)
    if last_name is not None:
        conditions.append(Employee.last_name == last_name)
    else:
        conditions.append(Employee.last_name == employee.last_name)
    statement = select(Employee).where(
        and_(
            *conditions,
            Employee.id != id
        )
    )
    exists = db.execute(statement).scalar_one_or_none()
    if exists:
        raise HTTPException(
            status_code=409,
            detail=f"Сотрудник '{last_name} {first_name}' уже существует"
        )

    employee.first_name = first_name.strip() if first_name is not None else employee.first_name,
    employee.last_name = last_name.strip() if last_name is not None else employee.last_name,
    employee.position = position.strip() if position is not None else employee.position,
    employee.photo_url = photo_url.strip() if photo_url is not None else employee.photo_url,

    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/employees/{id}", response_class=JSONResponse)
def delete_employee(
    id:     int = Path(..., ge=1, examples=[123]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет сотрудника с указанным уникальным идентификатором.
        
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