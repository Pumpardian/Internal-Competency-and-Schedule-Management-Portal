from sqlalchemy.sql import func
from sqlalchemy.orm import DeclarativeBase, validates, relationship
from sqlalchemy import Column, Integer, String, ForeignKey, Index \
, CheckConstraint, UniqueConstraint, SmallInteger, TIMESTAMP, Boolean
from sqlalchemy.dialects.postgresql import ENUM, TSTZRANGE, ExcludeConstraint

#Модели
class Base(DeclarativeBase): pass

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    position = Column(String(150), nullable=True)
    photo_url = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete='SET NULL', onupdate='CASCADE'),
        unique=True,
        nullable=True
    )
    
    user = relationship("User", back_populates="employee")

    __table_args__ = (
        Index("idx_employee_name", "last_name", "first_name"),
    )


#Перечисление для навыков категории
skill_categories = [
    "language",
    "database",
    "framework",
    "library",
    "tool",
    "other",
]
enum_skill_category = ENUM(
    *skill_categories,
    name="skill_category",
    create_type=True
)

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), unique=True, nullable=False)
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

    __table_args__ = (
        CheckConstraint("level BETWEEN 0 AND 5", name="check_level_range"),
        UniqueConstraint("employee_id", "skill_id", name="unique_employee_skill"),
        Index("idx_employee_skill_employee", "employee_id"),
        Index("idx_employee_skill_skill", "skill_id"),
    )


class Booking(Base):
    __tablename__ = "Bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(
        Integer,
        ForeignKey("employees.id", ondelete='CASCADE', onupdate='CASCADE'),
        nullable=False
    )
    topic = Column(String(255), nullable=False)
    start_time = Column(TIMESTAMP(timezone=True), nullable=False)
    end_time = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="check_time_flow"),
        ExcludeConstraint(
            (func.tstzrange(start_time, end_time), "&&"),
            using="gist",
            name="exclude_overlapping_bookings"
        ),
        Index("idx_booking_start_time", "start_time"),
        Index("idx_booking_employee_id", "employee_id"),
    )


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(
        Integer,
        ForeignKey("roles.id", ondelete='CASCADE', onupdate='CASCADE'),
        nullable=False
    )
    permission_id = Column(
        Integer,
        ForeignKey("permissions.id", ondelete='CASCADE', onupdate='CASCADE'),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="unique_role_permission"),
        Index("idx_role_permission_role", "role_id"),
        Index("idx_role_permission_permission", "permission_id")
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(30), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role_id = Column(
        Integer,
        ForeignKey("roles.id", ondelete='RESTRICT', onupdate='CASCADE'),
        nullable=False
    )

    employee = relationship("Employee", back_populates="user", uselist=False)

    __table_args__ = (
        Index("idx_user_username", "username"),
    )