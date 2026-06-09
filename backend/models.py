from sqlalchemy import create_engine
from sqlalchemy.sql import func
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker, validates
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index \
, CheckConstraint, UniqueConstraint, SmallInteger
from sqlalchemy.dialects.postgresql import ENUM
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

    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    position = Column(String(150), nullable=True)
    photo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = {
        Index("idx_employee_name", "last_name", "first_name")
    }


#ENUM for skill category
skill_categories = [
    "language",
    "database",
    "framework",
    "library",
    "tool",
    "other",
]
enum_skill_category = ENUM(
    skill_categories,
    name="skill_category",
    create_type=True
)

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    category = Column(enum_skill_category, nullable=False)

    @validates('category')
    def validate_category(self, key, category):
        '''Category validation'''
        if category not in skill_categories:
            raise ValueError(f"Invalid category: {category}. Must be one of {skill_categories}")
        return category


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(
        Integer,
        ForeignKey("employees.id", ondelete='CASCADE', onupdate='CASCADE'),
        nullable=False 
    )
    skill_id = Column(
        Integer,
        ForeignKey("skills.id", ondelete='CASCADE', onupdate='CASCADE'), 
        nullable=False
    )
    level = Column(
        SmallInteger,
        CheckConstraint("level BETWEEN 0 AND 5"),
        nullable=False
    )

    __table_args__ = {
        CheckConstraint("level BETWEEN 0 AND 5", name="check_level_range"),
        UniqueConstraint("employee_id", "skill_id", name="unique_employee_skill"),
        Index("idx_employee_skill_employee", "employee_id"),
        Index("idx_employee_skill_skill", "skill_id"),
    }