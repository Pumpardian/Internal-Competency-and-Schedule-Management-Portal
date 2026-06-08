from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, date

from models import Employee, Skill, EmployeeSkill
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
        raise HTTPException(status_code=404, detail="Employee not found")

    return employee


@app.post("/employees", response_class=JSONResponse)
def add_employee(
    first_name: str = Body(embed=True),
    last_name:  str = Body(embed=True),
    position:   str = Body(embed=True),
    db:     Session = Depends(get_db)
):
    '''Add new employee'''
    
    statement = select(Employee).where(Employee.first_name == first_name &
                                            Employee.last_name == last_name)
    existsing = db.execute(statement).scalar_one_or_none()
    if existsing:
        raise HTTPException(status_code=409, detail="Employee with such name already exists")
    
    employee = Employee(
        first_name = first_name,
        last_name = last_name,
        position = position,
        addition_date = date.today()
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@app.delete("employees/{id}", response_class=JSONResponse)
def delete_employee(
    id: int,
    db: Session = Depends(get_db)
):
    '''Delete employee by id'''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
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
        raise HTTPException(status_code=404, detail="Skill not found")

    return skill


@app.post("/skills", response_class=JSONResponse)
def add_skill(
    name:      str = Body(embed=True),
    category:  str = Body(embed=True),
    db:    Session = Depends(get_db)
):
    '''Add new skill'''
    
    statement = select(Skill).where(Skill.name == name &
                                    Skill.category == category)
    existsing = db.execute(statement).scalar_one_or_none()
    if existsing:
        raise HTTPException(status_code=409, detail="Skill with such name and category already exists")
    
    skill = Skill(
        name = name,
        category = category
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@app.delete("skills/{id}", response_class=JSONResponse)
def delete_skill(
    id: int,
    db: Session = Depends(get_db)
):
    '''Delete skill by id'''

    statement = select(Skill).where(Skill.id == id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    db.delete(skill)
    db.commit()
    return {"message": "Skill has been deleted successfuly"}


@app.get("employees/{id}/skills", response_class=JSONResponse)
def get_employee_skills(
    id: int,
    db: Session = Depends(get_db)
):
    '''Get skills for an employee with id'''

    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employee.skills


@app.post("employees/{id}/skills/{skill_id}")
def add_employee_skill(
    id: int,
    skill_id: int,
    proficiency_level: int = Body(embed=True),
    db:            Session = Depends(get_db)
):
    '''Add skill with proficiency level for employee by employee id and skill id'''
    
    statement = select(Employee).where(Employee.id == id)
    employee = db.execute(statement).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    statement = select(Skill).where(Skill.id == id)
    skill = db.execute(statement).scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    statement = select(EmployeeSkill).where(EmployeeSkill.employee_id == id &
                                            EmployeeSkill.skill_id == skill_id)
    exists = db.execute(statement).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=404, detail="EmployeeSkill already exists")
    
    if not isinstance(proficiency_level, int):
        raise HTTPException(status_code=400, detail="proficiency_level must be an integer")
    if proficiency_level not in range(1, 6):
        raise HTTPException(status_code=422, detail="proficiency_level must be between 0 and 5 (inclusive)")

    employee_skill = EmployeeSkill(
        employee_id = id,
        skill_id = skill_id,
        proficiency_level = proficiency_level
    )
    db.add(employee_skill)
    db.commit()
    db.refresh(employee_skill)
    return employee_skill


@app.patch("employees/{id}/skills/{skill_id}")
def update_employee_skill(
    id: int,
    skill_id: int,
    proficiency_level: int = Body(embed=True),
    db:            Session = Depends(get_db)
):
    '''Update skill proficiency level for employee by employee id and skill id'''
    
    statement = select(EmployeeSkill).where(EmployeeSkill.employee_id == id &
                                            EmployeeSkill.skill_id == skill_id)
    employee_skill = db.execute(statement).scalar_one_or_none()
    if not employee_skill:
        raise HTTPException(status_code=404, detail="EmployeeSkill not found")
    
    if not isinstance(proficiency_level, int):
        raise HTTPException(status_code=400, detail="proficiency_level must be an integer")
    if proficiency_level not in range(1, 6):
        raise HTTPException(status_code=422, detail="proficiency_level must be between 0 and 5 (inclusive)")

    employee_skill.proficiency_level = proficiency_level
    db.commit()
    db.refresh(employee_skill)
    return employee_skill