from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from datetime import datetime

from models import Employee, Skill, EmployeeSkill, skill_categories
from dependencies import get_db
from database import init_db

init_db()

app = FastAPI()


@app.get("/employees", response_class=JSONResponse)
def get_employees(
    db: Session = Depends(get_db)
):
    '''Get all employees'''

    statement = select(Employee)
    employees = db.execute(statement).scalars().all()

    return employees


@app.get("/employees/{id}", response_class=JSONResponse)
def get_employee(
    id: int,
    db: Session = Depends(get_db)
):
    '''Get employee data with skils by id'''

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
    '''Add new employee'''
    
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
        position = position.strip() if position else None,
        photo_url = photo_url.strip() if position else None,
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
    '''Update employee data'''
    
    if first_name is not None and len(first_name.strip()) > 100:
        raise HTTPException(
            status_code=400,
            detail="First name must be less than 100 characters"
        )
    if last_name is not None and len(last_name.strip()) > 100:
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
    
    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
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

    employee.first_name = first_name.strip() if first_name else None,
    employee.last_name = last_name.strip() if last_name else None,
    employee.position = position.strip() if position else None,
    employee.photo_url = photo_url.strip() if position else None,

    db.commit()
    db.refresh(employee)
    return employee


@app.delete("/employees/{id}", response_class=JSONResponse)
def delete_employee(
    id: int,
    db: Session = Depends(get_db)
):
    '''Delete employee by id'''

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
    '''Get all skills'''

    statement = select(Skill)
    skills = db.execute(statement).scalars().all()

    return skills


@app.get("/skills/{id}", response_class=JSONResponse)
def get_skill(
    id: int,
    db: Session = Depends(get_db)
):
    '''Get skill data by id'''

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
    '''Add new skill'''
    
    if not name or not len(name.strip()):
        raise HTTPException(
            status_code=400,
            detail="Skill name cannot be empty"
        )
    if not category or category not in skill_categories:
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
            category = category.strip()
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
    '''Delete skill by id'''

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
    '''Get skills for an employee with id'''

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
    employee_skills = db.execute(statement).scalars().all()

    return employee_skills


@app.post("/employees/{id}/skills/{skill_id}", response_class=JSONResponse, status_code=201)
def add_employee_skill(
    id: int,
    skill_id: int,
    level:  int = Body(embed=True),
    db: Session = Depends(get_db)
):
    '''Add skill with proficiency level for employee by employee id and skill id'''
    
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

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    statement = select(Skill).where(Skill.id == id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Skill not found"
        )

    statement = select(EmployeeSkill).where(
        and_(
            EmployeeSkill.employee_id == id,
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
        employee_id = id,
        skill_id = skill_id,
        level = level
    )
    db.add(employee_skill)
    db.commit()
    db.refresh(employee_skill)
    return employee_skill


@app.patch("/employees/{id}/skills/{skill_id}")
def update_employee_skill(
    id: int,
    skill_id: int,
    level:  int = Body(embed=True),
    db: Session = Depends(get_db)
):
    '''Update skill proficiency level for employee by employee id and skill id'''
    
    if not isinstance(level, int):
        raise HTTPException(
            status_code=400,
            detail="level must be an integer"
        )
    if level not in range(1, 6):
        raise HTTPException(
            status_code=422,
            detail="level must be between 0 and 5 (inclusive)"
        )

    statement = select(EmployeeSkill).where(
        and_(
            EmployeeSkill.employee_id == id,
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