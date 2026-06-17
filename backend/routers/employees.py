import json
from fastapi import APIRouter, Depends, Form, HTTPException, Body \
, Path, Query, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from math import ceil

from utils.upload import save_employee_photo, delete_employee_photo
from models import Employee
from dependencies import get_db
from utils.auth import user_dependency, require_permission

router = APIRouter()

#Модели
class EmployeeCreate(BaseModel):
    """Модель для создания сотрудника"""
    first_name: str = Field(..., min_length=1, max_length=100, description="Имя сотрудника", examples=["Иван"])
    last_name: str = Field(..., min_length=1, max_length=100, description="Фамилия сотрудника", examples=["Иванов"])
    position: Optional[str] = Field(None, max_length=150, description="Должность", examples=["Разработчик"])
    #photo_url: Optional[str] = Field(None, max_length=500, description="Ссылка на фото сотрудника", examples=["https://example.com/photo.jpg"])
    
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
    #photo_url: Optional[str] = Field(None, max_length=500, description="Ссылка на фото сотрудника", examples=["https://example.com/new_photo.jpg"])
    
    @field_validator('first_name', 'last_name', 'position')
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

class DeleteEmployeeResponse(BaseModel):
    """Модель ответа при удалении сотрудника"""
    message: str = Field(..., description="Сообщение об операции", examples=["Сотрудник успешно удален"])

class PagenatedEmployeeResponse(BaseModel):
    """Страничная модель ответа с данными сотрудников"""
    page_size: int = Field(..., description="Размер страницы", examples=[2])
    current_page: int = Field(..., description="Номер текущей страницы", examples=[1])
    total_pages: int = Field(..., description="Общее количество страниц", examples=[5])
    data: List[EmployeeResponse] = Field(..., description="Сотрудники данной строницы",
        examples=[[EmployeeResponse(id=1, first_name="Иван", last_name="Иванов",
                                    position="Менеджер проекта", photo_url="https://example.com/photo.jpg",
                                    created_at="2026-06-11T15:00:00"),
                   EmployeeResponse(id=2, first_name="Петр", last_name="Петров",
                                    position="Тестировщиц", photo_url="https://example.com/photo2.jpg",
                                    created_at="2026-06-11T16:00:00")]]
    )

#Эндпоинты
@router.get(
    "/employees", 
    response_class=JSONResponse,
    response_model=PagenatedEmployeeResponse,
    summary="Получить список всех сотрудников",
    responses={
        200: {"description": "Страница из списка сотрудников", "model": PagenatedEmployeeResponse},
        400: {"description": "Неверные данные"},
        401: {"description": "Не авторизован"},
    }
)
def get_employees(
    user: user_dependency,
    current_page: int = Query(default=1, description="Номер текущей страницы", examples=[2], ge=1),
    page_size: int = Query(default=10, description="Размер страницы (1-20)", examples=[10], ge=1, le=20),
    db: Session = Depends(get_db)
):
    '''
    Получение списка сотрудников (постранично).

    Параметры запроса (опционально)
    - **current_page**: Номер текущей страницы **[int]**.
    - **page_size**: Размер страницы (1-20) **[int]**.
    
    Возвращает список сотрудников.
    '''

    total_count = db.scalar(select(func.count(Employee.id)))
    total_pages = ceil(total_count / page_size) if total_count > 0 else 1
    offset = (current_page - 1) * page_size

    statement = select(Employee).offset(offset).limit(page_size)
    employees = db.execute(statement).scalars().all()
    page = PagenatedEmployeeResponse(
        current_page=current_page,
        page_size=page_size,
        total_pages=total_pages,
        data=employees
    )
    return page


@router.get(
    "/employees/{id}", 
    response_class=JSONResponse,
    response_model=EmployeeResponse,
    summary="Получить сотрудника по уникальному идентификатору",
    responses={
        200: {"description": "Сотрудник найден", "model": EmployeeResponse},
        401: {"description": "Не авторизован"},
        404: {"description": "Сотрудник не найден"},
    }
)
def get_employee(
    user: user_dependency,
    id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    db: Session = Depends(get_db)
):
    '''
    Возвращает детальную информацию о конкретном сотруднике.

    Путь запроса:
    - **id**: Уникальный идентификатор сотрудника **[int]**.
    
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
    responses={
        201: {"description": "Сотрудник создан", "model": EmployeeResponse},
        400: {"description": "Неверные данные"},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        409: {"description": "Сотрудник уже существует"},
        500: {"description": "Ошибка сервера"}
    }
)
async def add_employee(
    form: str = Form(...),
    photo: Optional[UploadFile] = File(None, description="Фото сотрудника (jpg, png, gif, webp, bmp) до 5 МБ"),
    user: dict = Depends(require_permission("employee.create")),
    db: Session = Depends(get_db)
):
    '''
    Добавление нового сотрудника.
    
    Тело запроса:
    - **first_name**: Имя сотрудника, **[string]** (обязательно, 1-100 символов).
    - **last_name**: Фамилия сотрудника **[string]** (обязательно, 1-100 символов).
    - **position**: Должность **[string]** (опционально, до 150 символов).
    - **photo_url**: Фото **[file]** (опционально, форматы: jpg, png, gif, webp, bmp до 5 МБ).
    
    Возвращает созданного сотрудника с присвоенным уникальным идентификатором.
    '''
    
    try:
        request_data = json.loads(form)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Неправильный формат JSON"
        )

    try:
        validated_data = EmployeeCreate(**request_data)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Ошибка валидации: {str(e)}"
        )
    
    statement = select(Employee).where(
        and_(
            Employee.first_name == validated_data.first_name,
            Employee.last_name == validated_data.last_name
        )
    )
    existing_employee = db.execute(statement).scalar_one_or_none()
    if existing_employee:
        raise HTTPException(
            status_code=409,
            detail=f"Сотрудник '{validated_data.last_name} {validated_data.first_name}' уже существует"
        )
    
    employee = Employee(
        first_name=validated_data.first_name,
        last_name=validated_data.last_name,
        position=validated_data.position,
        created_at=datetime.now()
    )

    photo_url = None
    if photo and photo.filename:
        try:
            photo_url = await save_employee_photo(photo)
            employee.photo_url = photo_url
        except HTTPException as e:
            raise e

    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.patch(
    "/employees/{id}", 
    response_class=JSONResponse,
    response_model=EmployeeResponse,
    summary="Обновить данные сотрудника",
    responses={
        200: {"description": "Сотрудник обновлен", "model": EmployeeResponse},
        400: {"description": "Неверные данные"},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        404: {"description": "Сотрудник не найден"},
        409: {"description": "Сотрудник уже существует"},
    }
)
async def update_employee(
    id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    form: str = Form(...),
    photo: Optional[UploadFile] = File(None, description="Фото сотрудника (jpg, png, gif, webp, bmp) до 5 МБ"),
    user: dict = Depends(require_permission("employee.update")),
    db: Session = Depends(get_db)
):
    '''
    Обновляет данные сотрудника.
    
    Путь запроса:
    - **id**: Уникальный идентификатор сотрудника **[int]**.
    
    Тело запроса (все поля опциональны):
    - **first_name**: Имя сотрудника **[string]** (1-100 символов).
    - **last_name**: Фамилия сотрудника **[string]** (1-100 символов).
    - **position**: Должность **[string]** (до 150 символов).
    - **photo**: Фото **[file]** (форматы jpg, png, gif, webp, bmp до 5 МБ).
    
    Возвращает сотрудника с обновленными данными.
    '''
    
    try:
        request_data = json.loads(form)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Неправильный формат JSON"
        )

    try:
        validated_data = EmployeeUpdate(**request_data)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Ошибка валидации: {str(e)}"
        )

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Сотрудник не найден"
        )
    
    if validated_data.first_name is not None or validated_data.last_name is not None:
        new_first_name = validated_data.first_name if validated_data.first_name is not None else employee.first_name
        new_last_name = validated_data.last_name if validated_data.last_name is not None else employee.last_name
        
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
    
    if validated_data.first_name is not None:
        employee.first_name = validated_data.first_name
    if validated_data.last_name is not None:
        employee.last_name = validated_data.last_name
    if validated_data.position is not None:
        employee.position = validated_data.position
    
    photo_url = None
    if photo and photo.filename:
        try:
            photo_url = await save_employee_photo(photo)
            old_photo_url = employee.photo_url
            employee.photo_url = photo_url
            if old_photo_url:
                delete_employee_photo(old_photo_url)
        except HTTPException as e:
            raise e
    
    db.commit()
    db.refresh(employee)
    return employee


@router.delete(
    "/employees/{id}", 
    response_class=JSONResponse,
    response_model=DeleteEmployeeResponse,
    summary="Удалить сотрудника",
    responses={
        200: {"description": "Сотрудник удален", "model": DeleteEmployeeResponse},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        404: {"description": "Сотрудник не найден"},
    }
)
def delete_employee(
    id: int = Path(..., description="Уникальный идентификатор сотрудника", ge=1, examples=[123]),
    user: dict = Depends(require_permission("employee.delete")),
    db: Session = Depends(get_db)
):
    '''
    Удаляет указанного сотрудника.
    
    Путь запроса:
    - **id**: Уникальный идентификатор сотрудника **[int]**.
    
    Возвращает сообщение об успешном удалении сотрудника.
    '''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Сотрудник не найден"
        )
    
    photo_url = employee.photo_url
    db.delete(employee)
    db.commit()

    if photo_url:
        delete_employee_photo(photo_url)

    return {"message": "Сотрудник успешно удален"}