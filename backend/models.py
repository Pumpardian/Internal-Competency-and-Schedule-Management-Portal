from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
from sqlalchemy import Column, Integer, String, URL, Date, DateTime, ForeignKey
import os

#ENGINE
#CHANGE BACKUP ON COMPLETE DOCKER BUILD
DB_CONNECTION_URL = os.getenv('DATABASE_URL', "postgresql://admin:practice2026@localhost:5432/pg") 
engine = create_engine(DB_CONNECTION_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

#MODELS
class Base(DeclarativeBase): pass

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True)
    first_name = Column(String)
    last_name = Column(String)
    position = Column(String)
    photo_url = Column(URL)
    addition_date = Column(Date)

    skills = relationship("Skill", secondary="employee_skills", back_populates="employees")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    category = Column(String)

    employees = relationship("Employee", secondary="employee_skills", back_populates="skills")

class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    employee_id = Column(
        Integer,
        ForeignKey('employees.id', ondelete='CASCADE', onupdate='CASCADE'), 
        primary_key=True)
    skill_id = Column(
        Integer,
        ForeignKey('skills.id', ondelete='CASCADE', onupdate='CASCADE'), 
        primary_key=True)
    proficiency_level = Column(Integer)