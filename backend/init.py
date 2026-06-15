from sqlalchemy.orm import Session
from models import Role, Permission, RolePermission, User
from dependencies import get_db
from sqlalchemy import select, and_
from utils.auth import argon2_context

def init():
    """Инициализация недостающих данных при старте приложения"""
    user_role_id, admin_role_id, manager_role_id = init_roles()
    init_permissions(admin_role_id, manager_role_id)
    create_admin(admin_role_id)
    return user_role_id, admin_role_id, manager_role_id

def init_roles():
    """Инициализация базовых ролей при старте приложения"""
    
    db: Session = next(get_db())
    default_roles = ["user", "admin", "manager"]
    
    for role_name in default_roles:
        statement = select(Role).where(Role.name == role_name)
        role = db.execute(statement).scalar_one_or_none()
        if not role:
            role = Role(name=role_name)
            db.add(role)
    db.commit()
    
    statement = select(Role).where(Role.name == "user")
    user_role = db.execute(statement).scalar_one_or_none()
    statement = select(Role).where(Role.name == "admin")
    admin_role = db.execute(statement).scalar_one_or_none()
    statement = select(Role).where(Role.name == "manager")
    manager_role = db.execute(statement).scalar_one_or_none()
    
    user_role_id = user_role.id if user_role else 1
    admin_role_id = admin_role.id if admin_role else 2
    manager_role_id = manager_role.id if manager_role else 3
    return user_role_id, admin_role_id, manager_role_id

def init_permissions(admin_role_id: int, manager_role_id: int):
    """Инициализация прав при старте приложения"""
    
    db: Session = next(get_db())
    permissions = [
        "employee.create", "employee.update", "employee.delete",
        "booking.create", "booking.delete",
        "skill.create", "skill.update", "skill.delete",
        "employee_skill.create", "employee_skill.update", "employee_skill.delete",
    ]

    permission_objects: list[Permission] = []
    for permission_name in permissions:
        statement = select(Permission).where(Permission.name == permission_name)
        permission = db.execute(statement).scalar_one_or_none()
        if not permission:
            permission = Permission(name=permission_name)
            db.add(permission)
            db.flush()
        permission_objects.append(permission)
    db.commit()

    for permission in permission_objects:
        statement = select(RolePermission).where(
            and_(
                RolePermission.role_id == admin_role_id,
                RolePermission.permission_id == permission.id
            )
        )
        existing_admin = db.execute(statement).scalar_one_or_none()
        if not existing_admin:
            db.add(RolePermission(role_id=admin_role_id, permission_id=permission.id))
        
        if "booking" in permission.name or "employee_skill" in permission.name:
            statement = select(RolePermission).where(
                and_(
                    RolePermission.role_id == manager_role_id,
                    RolePermission.permission_id == permission.id
                )
            )
            existing_manager = db.execute(statement).scalar_one_or_none()
            if not existing_manager:
                db.add(RolePermission(role_id=manager_role_id, permission_id=permission.id))
    db.commit()

def create_admin(admin_role_id: int):
    """Создает аккаунт админа, если он не существует"""
    db: Session = next(get_db())

    statement = select(User).where(User.username == "admin")
    admin = db.execute(statement).scalar_one_or_none()
    if not admin:
        admin = User(
            username="admin",
            hashed_password=argon2_context.hash("admin"),
            role_id=admin_role_id
        )
        db.flush()
        db.commit()

    if admin.role_id != admin_role_id:
        admin.role_id = admin_role_id
        db.commit() 