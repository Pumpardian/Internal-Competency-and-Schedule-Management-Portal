from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field, field_validator
from typing import List

from models import Booking
from dependencies import get_db
from utils.auth import user_dependency, require_permission

router = APIRouter()

#Модели
class BookingCreate(BaseModel):
    """Модель для создания бронирования"""
    employee_id: int = Field(..., gt=0, description="Уникальный идентификатор сотрудника", examples=[123])
    topic: str = Field(..., min_length=1, max_length=255, description="Тема бронирования", examples=["Совещание по проекту"])
    start_time: datetime = Field(..., description="Время начала", examples=["2026-06-16T10:00:00"])
    end_time: datetime = Field(..., description="Время окончания", examples=["2026-06-16T11:00:00"])
    
    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, v: datetime, info) -> datetime:
        """Валидация: время окончания должно быть позже времени начала"""
        start_time = info.data.get('start_time')
        if start_time and v <= start_time:
            raise ValueError('Время окончания должно быть позже времени начала')
        return v

class BookingResponse(BaseModel):
    """Модель ответа с данными бронирования"""
    id: int = Field(..., description="Уникальный идентификатор брони", examples=[1])
    employee_id: int = Field(..., description="Уникальный идентификатор сотрудника", examples=[123])
    topic: str = Field(..., description="Тема бронирования", examples=["Совещание по проекту"])
    start_time: datetime = Field(..., description="Время начала", examples=["2024-01-15T10:00:00"])
    end_time: datetime = Field(..., description="Время окончания", examples=["2024-01-15T11:00:00"])
    
    class Config:
        from_attributes = True

class DeleteBookingResponse(BaseModel):
    """Модель ответа при удалении брони"""
    message: str = Field(..., description="Сообщение об операции", examples=["Бронь успешно удалена"])

#Эндпоинты
@router.get(
    "/bookings", 
    response_class=JSONResponse,
    response_model=List[BookingResponse],
    summary="Получить список броней",
    responses={
        200: {"description": "Список брони", "model": List[BookingResponse]},
        401: {"description": "Не авторизован"},
    }
)
def get_bookings(
    user: user_dependency,
    book_date: date = Query(
        default=date.today(), 
        description="Дата в формате YYYY-MM-DD",
        examples=["2026-06-10"]
    ),
    db: Session = Depends(get_db)
):
    '''
    Получение списка броней за указанный день.
    
    Параметры запроса:
    - **book_date**: Дата в формате YYYY-MM-DD **[date]** (опционально, по умолчанию текущая дата).

    Возвращает список броней на указанную дату.    
    '''
    
    statement = select(Booking).where(
        Booking.start_time >= book_date,
        Booking.start_time < book_date + timedelta(days=1)
    )
    bookings = db.execute(statement).scalars().all()
    return bookings


@router.post(
    "/bookings", 
    response_class=JSONResponse, 
    status_code=201,
    response_model=BookingResponse,
    summary="Создать бронь",
    responses={
        201: {"description": "Бронь создана", "model": BookingResponse},
        400: {"description": "Неверные данные"},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        409: {"description": "Бронь пересекается с существующей"},
        422: {"description": "Неверный формат данных"}
    }
)
def create_booking(
    booking_data: BookingCreate,
    user: dict = Depends(require_permission("booking.create")),
    db: Session = Depends(get_db)
):
    '''
    Создание новой брони на указанный период времени.
    
    Тело запроса:
    - **employee_id**: Уникальный идентификатор сотрудника **[int]** (обязательно, >0).
    - **topic**: Тема бронирования **[string]** (обязательно, 1-255 символов).
    - **start_time**: Время начала в формате YYYY-MM-DDThh:mm:ss **[datetime]** (обязательно).
    - **end_time**: Время окончания в формате YYYY-MM-DDThh:mm:ss **[datetime]** (обязательно, должно быть позже start_time).
    
    Возвращает созданную бронь с присвоенным уникальным идентификатором.
    '''
    
    statement = select(Booking).where(
        and_(
            Booking.start_time < booking_data.end_time,
            Booking.end_time > booking_data.start_time
        )
    )
    overlapping = db.execute(statement).scalar_one_or_none()
    if overlapping:
        raise HTTPException(
            status_code=409,
            detail=f"Указанный временной диапазон пересекается с '{overlapping.topic}' [{overlapping.start_time} - {overlapping.end_time}]"
        )
    
    booking = Booking(
        employee_id=booking_data.employee_id,
        topic=booking_data.topic,
        start_time=booking_data.start_time,
        end_time=booking_data.end_time
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.delete(
    "/bookings/{id}", 
    response_class=JSONResponse,
    response_model=DeleteBookingResponse,
    summary="Удалить бронирование",
    responses={
        200: {"description": "Бронь удалена", "model": DeleteBookingResponse},
        401: {"description": "Не авторизован"},
        403: {"description": "Недостаточно прав доступа"},
        404: {"description": "Бронь не найдена"},
        422: {"description": "Неверный формат уникального идентификатора"}
    }
)
def delete_booking(
    user: dict = Depends(require_permission("booking.delete")),
    id: int = Path(..., description="Уникальный идентификатор брони", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет указанную бронь.
    
    Путь запроса:
    - **id**: Уникальный идентификатор брони **[int]**.
    
    Возвращает сообщение об успешном удалении брони.
    '''

    statement = select(Booking).where(Booking.id == id)
    booking = db.execute(statement).scalar_one_or_none()
    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Бронь не найдена"
        )
    
    db.delete(booking)
    db.commit()
    return {"message": "Бронь успешно удалена"}