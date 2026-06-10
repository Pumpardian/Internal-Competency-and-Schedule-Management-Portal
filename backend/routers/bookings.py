from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from datetime import datetime, date, timedelta

from models import Booking
from dependencies import get_db

router = APIRouter()

@router.get("/bookings", response_class=JSONResponse)
def get_bookings(
    book_date: date = Query(default=date.today(), examples=["2026-06-10"]),
    db:     Session = Depends(get_db)
):
    '''
    Получение списка броней за указанный день.
        
    - **book_date**: Дата в формате YYYY-MM-DD (опционально, по умолчанию текущая дата).

    Возвращает список броней на указанную дату.    
    '''
    
    statement = select(Booking).where(
        Booking.start_time >= book_date,
        Booking.start_time < book_date + timedelta(days=1)
    )
    bookings = db.execute(statement).scalars().all()

    return bookings


@router.post("/bookings", response_class=JSONResponse, status_code=201)
def create_booking(
    employee_id:     int = Body(embed=True, gt=0, examples=[123]),
    topic:           str = Body(embed=True, min_length=1, max_length=255, examples=["Совещание по проекту"]),
    start_time: datetime = Body(embed=True, examples=["2024-01-15T10:00:00"]),
    end_time:   datetime = Body(embed=True, examples=["2024-01-15T11:00:00"]),
    db:          Session = Depends(get_db)
):
    '''
    Создание нового бронирования на указанный период времени.
    
    - **employee_id**: Уникальный идентификатор сотрудника, целочисленного типа (обязательно).
    - **topic**: Тема бронирования, строкового типа (обязательно, максимальная длина: 255).
    - **start_time**: Время начала, временного формата (обязательно).
    - **end_time**: Время окончания, временного формата (обязательно).
    
    Возвращает созданную бронь.
    '''
    
    if start_time > end_time:
        raise HTTPException(
            status_code=400,
            detail="Время окончания должно быть позже времени начала"
        )
    
    statement = select(Booking).where(
        and_(
            Booking.start_time < end_time,
            Booking.end_time > start_time
        )
    )
    overlapping = db.execute(statement).scalar_one_or_none()
    if overlapping:
        raise HTTPException(
            status_code=409,
            detail=f"Указанный временной диапазон пересекается с '{overlapping.topic}' [{overlapping.start_time} - {overlapping.end_time}]"
        )
    
    booking = Booking(
        employee_id = employee_id,
        topic = topic,
        start_time = start_time,
        end_time = end_time
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.delete("/bookings/{id}", response_class=JSONResponse)
def delete_booking(
    id:     int = Path(..., description="Уникальный идентификатор брони", ge=1, examples=[1]),
    db: Session = Depends(get_db)
):
    '''
    Удаляет бронь с указанным уникальным идентификатором.
    
    - **id**: Уникальный идентификатор брони, целочисленного типа.
    
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