from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from datetime import datetime

from models import Employee, Skill, EmployeeSkill, skill_categories
from dependencies import get_db

app = FastAPI()


@app.get("/employees", response_class=JSONResponse)
def get_employees(
    db: Session = Depends(get_db)
):
    '''Получение списка всех сотрудников.
    Не принимает параметров.
    Возвращает список объектов Employee.'''

    statement = select(Employee)
    employees = db.execute(statement).scalars().all()

    return employees


@app.get("/employees/{id}", response_class=JSONResponse)
def get_employee(
    id: int,
    db: Session = Depends(get_db)
):
    '''Получение сотрудника по его id.
    Принимает параметры:
        -id целочисленного типа.
    Возвращает:
        -объект Employee, если существует таковой (код 200).
        -ошибку 404 если сотрудник не найден.'''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return employee


@app.post("/employees", response_class=JSONResponse, status_code=201)
def add_employee(
    first_name: str = Body(embed=True),
    last_name:  str = Body(embed=True),
    position:   str = Body(embed=True, default=None),
    photo_url:  str = Body(embed=True, default=None),
    db:     Session = Depends(get_db)
):
    '''Добавление сотрудника.
    Принимает параметры:
        -first_name строчного типа (максимальная длина: 100).
        -last_name строчного типа (максимальная длина: 100).
        -position строчного типа (максимальная длина: 150).
        -photo_url строчного типа (максимальная длина: 150).
    Возвращает:
        -созданный объект Employee, при успехе (код 201).
        -ошибку 400 если first_name или last_name пустые, или при превышении максимальной длины параметров.
        -ошибку 409 если сотрудник с таким полным именем уже существует.'''
    
    if not first_name or not len(first_name.strip()):
        raise HTTPException(
            status_code=400,
            detail="First name cannot be empty"
        )
    if not last_name or not len(last_name.strip()):
        raise HTTPException(
            status_code=400,
            detail="Last name cannot be empty"
        )
    if len(first_name.strip()) > 100:
        raise HTTPException(
            status_code=400,
            detail="First name must be less than 100 characters"
        )
    if len(last_name.strip()) > 100:
        raise HTTPException(
            status_code=400,
            detail="First name must be less than 100 characters"
        )
    if position is not None and len(position.strip()) > 150:
        raise HTTPException(
            status_code=400,
            detail="Position must be less than 150 characters"
        )
    if photo_url is not None and len(photo_url.strip()) > 500:
        raise HTTPException(
            status_code=400,
            detail="Photo URL must be less than 500 characters"
        )
    
    statement = select(Employee).where(
        and_(
            Employee.first_name == first_name.strip(),
            Employee.last_name == last_name.strip()
        )
    )
    exists = db.execute(statement).scalar_one_or_none()
    if exists:
        raise HTTPException(
            status_code=409,
            detail=f"Employee with name {last_name} {first_name} already exists"
        )

    employee = Employee(
        first_name = first_name.strip(),
        last_name = last_name.strip(),
        position = position.strip() if position is not None else None,
        photo_url = photo_url.strip() if photo_url is not None else None,
        created_at = datetime.now()
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@app.patch("/employees/{id}", response_class=JSONResponse)
def update_employee(
    id: int,
    first_name: str = Body(embed=True, default=None),
    last_name:  str = Body(embed=True, default=None),
    position:   str = Body(embed=True, default=None),
    photo_url:  str = Body(embed=True, default=None),
    db:     Session = Depends(get_db)
):
    '''Обновляет данные сотрудника.
    Принимает параметры:
        -id целочисленного типа.
        -first_name строчного типа (максимальная длина: 100).
        -last_name строчного типа (максимальная длина: 100).
        -position строчного типа (максимальная длина: 150).
        -photo_url строчного типа (максимальная длина: 150).
    Возвращает:
        -обновленный объект Employee, при успехе (код 200).
        -ошибку 400 при превышении максимальной длины параметров.
        -ошибку 409 если сотрудник с таким полным именем уже существует.'''
    
    if first_name is not None and len(first_name.strip()) > 100:
        raise HTTPException(
            status_code=400,
            detail="First name must be less than 100 characters"
        )
    if last_name is not None and len(last_name.strip()) > 100:
        raise HTTPException(
            status_code=400,
            detail="Last name must be less than 100 characters"
        )
    if position is not None and len(position.strip()) > 150:
        raise HTTPException(
            status_code=400,
            detail="Position must be less than 150 characters"
        )
    if photo_url is not None and len(photo_url.strip()) > 500:
        raise HTTPException(
            status_code=400,
            detail="Photo URL must be less than 500 characters"
        )
    
    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    conditions = []
    if first_name is not None:
        conditions.append(Employee.first_name == first_name.strip())
    else:
        conditions.append(Employee.first_name == employee.first_name)
    if last_name is not None:
        conditions.append(Employee.last_name == last_name.strip())
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
            detail=f"Employee with name {last_name} {first_name} already exists"
        )

    employee.first_name = first_name.strip() if first_name is not None else employee.first_name
    employee.last_name = last_name.strip() if last_name is not None else employee.last_name
    employee.position = position.strip() if position is not None else employee.position
    employee.photo_url = photo_url.strip() if photo_url is not None else employee.photo_url

    db.commit()
    db.refresh(employee)
    return employee


@app.delete("/employees/{id}", response_class=JSONResponse)
def delete_employee(
    id: int,
    db: Session = Depends(get_db)
):
    '''Удаляет сотрудника с указанным id из системы.
    Принимает параметры:
        -id целочисленного типа.
    Возвращает:
        -сообщение об успехе (код 200).
        -ошибку 404 если сотрудник с таким id не существует.'''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )
    
    db.delete(employee)
    db.commit()
    return {"message": "Employee has been deleted successfuly"}


@app.get("/skills", response_class=JSONResponse)
def get_skills(
    db: Session = Depends(get_db)
):
    '''Получение списка всех навыков.
    Не принимает параметров.
    Возвращает список объектов Skill.'''

    statement = select(Skill)
    skills = db.execute(statement).scalars().all()

    return skills


@app.get("/skills/{id}", response_class=JSONResponse)
def get_skill(
    id: int,
    db: Session = Depends(get_db)
):
    '''Получение навыка по его id.
    Принимает параметры:
        -id целочисленного типа.
    Возвращает:
        -объект Skill, если существует таковой (код 200).
        -ошибку 404 если навык не найден.'''

    statement = select(Skill).where(Skill.id == id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Skill not found"
        )

    return skill


@app.post("/skills", response_class=JSONResponse, status_code=201)
def add_skill(
    name:      str = Body(embed=True),
    category:  str = Body(embed=True),
    db:    Session = Depends(get_db)
):
    '''Добавление навыка.
    Принимает параметры:
        -name строчного типа (максимальная длина: 100).
        -category строчного типа.
    Возвращает:
        -созданный объект Skill, при успехе (код 201).
        -ошибку 400 если name или category пустые, или при превышении максимальной длины параметров (или неверном имени категории).
        -ошибку 409 если навык с таким названием уже существует.'''
    
    if not name or not len(name.strip()):
        raise HTTPException(
            status_code=400,
            detail="Skill name cannot be empty"
        )
    if not category or category.strip().lower() not in skill_categories:
        raise HTTPException(
            status_code=400,
            detail="Invalid category"
        )

    statement = select(Skill).where(
        and_(
            Skill.name == name.strip(),
        )
    )
    existing = db.execute(statement).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Skill with name {name.strip()} already exists"
        )
    
    try:
        skill = Skill(
            name = name.strip(),
            category = category.strip().lower()
        )
        db.add(skill)
        db.commit()
        db.refresh(skill)
        return skill
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/skills/{id}", response_class=JSONResponse)
def delete_skill(
    id: int,
    db: Session = Depends(get_db)
):
    '''Удаляет навык с указанным id из системы.
    Принимает параметры:
        -id целочисленного типа.
    Возвращает:
        -сообщение об успехе (код 200).
        -ошибку 404 если навык с таким id не существует.'''

    statement = select(Skill).where(Skill.id == id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Skill not found"
        )
    
    db.delete(skill)
    db.commit()
    return {"message": "Skill has been deleted successfuly"}


@app.get("/employees/{id}/skills", response_class=JSONResponse)
def get_employee_skills(
    id: int,
    db: Session = Depends(get_db)
):
    '''Получение навыков сотрудника по его id.
    Принимает параметры:
        -id целочисленного типа.
    Возвращает:
        -список объектов Skill c дополнительным полем уровня владения (код 200).
        -ошибку 404 если сотрудник не найден.'''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
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


@app.post("/employees/{employee_id}/skills/{skill_id}", response_class=JSONResponse, status_code=201)
def add_employee_skill(
    employee_id: int,
    skill_id: int,
    level:  int = Body(embed=True),
    db: Session = Depends(get_db)
):
    '''Добавление навыка сотрудника.
    Принимает параметры:
        -employee_id целочисленного типа.
        -skill_id целочисленного типа.
        -level целочисленного типа (допустимый диапазон [0; 5]).
    Возвращает:
        -созданный объект навыка сотрудника, при успехе (код 201).
        -ошибку 400 при неверном типе параметра.
        -ошибку 404 если указанные сотрудник либо навык не найдены.
        -ошибку 409 если сотрудник уже имеет указанный навык.
        -ошибку 422 при неверном диапазоне параметра уровня владения.'''
    
    if not isinstance(level, int):
        raise HTTPException(
            status_code=400,
            detail="level must be an integer"
        )
    if level not in range(0, 6):
        raise HTTPException(
            status_code=422,
            detail="level must be between 0 and 5 (inclusive)"
        )

    statement = select(Employee).where(Employee.id == employee_id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    statement = select(Skill).where(Skill.id == skill_id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Skill not found"
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
            status_code=404,
            detail="Employee skill already exists"
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


@app.patch("/employees/{employee_id}/skills/{skill_id}")
def update_employee_skill(
    employee_id: int,
    skill_id: int,
    level:  int = Body(embed=True),
    db: Session = Depends(get_db)
):
    '''Обновления уровня владения навыка сотрудника.
    Принимает параметры:
        -employee_id целочисленного типа.
        -skill_id целочисленного типа.
        -level целочисленного типа (допустимый диапазон [0; 5]).
    Возвращает:
        -обновленный объект навыка сотрудника, при успехе (код 200).
        -ошибку 400 при неверном типе параметра.
        -ошибку 404 если указанные сотрудник либо навык не найдены.
        -ошибку 422 при неверном диапазоне параметра уровня владения.'''
    
    if not isinstance(level, int):
        raise HTTPException(
            status_code=400,
            detail="level must be an integer"
        )
    if level not in range(0, 6):
        raise HTTPException(
            status_code=422,
            detail="level must be between 0 and 5 (inclusive)"
        )

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
            detail="Employee skill not found"
        )

    employee_skill.level = level
    db.commit()
    db.refresh(employee_skill)
    return employee_skill