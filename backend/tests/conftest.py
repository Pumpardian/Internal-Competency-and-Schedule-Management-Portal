"""
Общая обвязка для тестов бэкенда.

Тесты ходят в отдельную базу Postgres (portal_test) на том же сервере, что и
dev-БД: модели используют Postgres-специфику (ENUM, TSTZRANGE, ExcludeConstraint),
поэтому SQLite не подходит. Схема создаётся через metadata.create_all, роли/права/
пользователи сидятся вручную, зависимость get_db переопределяется на тестовую
сессию, а app.state.* проставляется напрямую (lifespan приложения не запускается).
"""
import os
from datetime import timedelta

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

import main
from models import Base, Role, Permission, RolePermission, User, Employee
from dependencies import get_db
from utils.auth import argon2_context, create_access_token

# Тестовая БД — та же Postgres, но отдельная база portal_test.
TEST_DATABASE_URL = os.environ["DATABASE_URL"].rsplit("/", 1)[0] + "/portal_test"
engine = create_engine(TEST_DATABASE_URL)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _ensure_test_db():
    """Создаёт базу portal_test, если её ещё нет.

    CREATE DATABASE нельзя выполнять внутри транзакции, поэтому подключаемся к
    «рабочей» базе из DATABASE_URL в режиме AUTOCOMMIT. Так разработчику не нужно
    заводить тестовую базу вручную — достаточно запустить pytest.
    """
    db_name = TEST_DATABASE_URL.rsplit("/", 1)[1]
    admin_engine = create_engine(os.environ["DATABASE_URL"], isolation_level="AUTOCOMMIT")
    try:
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": db_name}
            ).scalar()
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    finally:
        admin_engine.dispose()

PERMISSIONS = [
    "employee.create", "employee.update", "employee.delete",
    "booking.create", "booking.update", "booking.delete",
    "skill.create", "skill.update", "skill.delete",
    "employee_skill.create", "employee_skill.update", "employee_skill.delete",
    "user_role.update",
]


@pytest.fixture(scope="session")
def app_client():
    """Поднимает схему, сидит роли/права/пользователей и отдаёт TestClient."""
    _ensure_test_db()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestSession()
    roles = {}
    for name in ["user", "admin", "manager"]:
        r = Role(name=name)
        db.add(r)
        roles[name] = r
    db.flush()
    # Фиксируем id ролей сразу (после закрытия сессии объекты будут detached).
    role_ids = {name: r.id for name, r in roles.items()}

    perms = {}
    for pname in PERMISSIONS:
        p = Permission(name=pname)
        db.add(p)
        perms[pname] = p
    db.flush()

    for pname, p in perms.items():
        db.add(RolePermission(role_id=role_ids["admin"], permission_id=p.id))
        if "booking" in pname or "employee_skill" in pname:
            db.add(RolePermission(role_id=role_ids["manager"], permission_id=p.id))
    db.flush()

    def make_user(username, role_name):
        u = User(username=username, hashed_password=argon2_context.hash("Passw0rd!"), role_id=role_ids[role_name])
        db.add(u)
        db.flush()
        e = Employee(first_name=username, last_name="Test", user_id=u.id)
        db.add(e)
        db.flush()
        return u.id, e.id

    admin_user, admin_emp = make_user("admin", "admin")
    mgr_user, mgr_emp = make_user("manager1", "manager")
    usr_user, usr_emp = make_user("user1", "user")
    db.commit()

    ids = {
        "admin_user": admin_user, "admin_emp": admin_emp,
        "mgr_user": mgr_user, "mgr_emp": mgr_emp,
        "usr_user": usr_user, "usr_emp": usr_emp,
        "admin_role": role_ids["admin"], "manager_role": role_ids["manager"], "user_role": role_ids["user"],
    }
    db.close()

    # Состояние приложения (обычно ставится в lifespan, который тут не запускается).
    main.app.state.default_role_id = role_ids["user"]
    main.app.state.admin_role_id = role_ids["admin"]
    main.app.state.manager_role_id = role_ids["manager"]

    def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    main.app.dependency_overrides[get_db] = override_get_db

    # Без `with` — реальный lifespan (init) не запускается, dev-БД не трогаем.
    client = TestClient(main.app)
    client.ids = ids
    yield client

    main.app.dependency_overrides.clear()


@pytest.fixture
def headers(app_client):
    """Заголовки Authorization для трёх сидов: admin / manager / user."""
    ids = app_client.ids
    def bearer(username, uid):
        return {"Authorization": f"Bearer {create_access_token(username, uid, timedelta(hours=1))}"}
    return {
        "admin": bearer("admin", ids["admin_user"]),
        "manager": bearer("manager1", ids["mgr_user"]),
        "user": bearer("user1", ids["usr_user"]),
    }


@pytest.fixture(autouse=True)
def clean_db(app_client):
    """Очищает изменяемые таблицы перед каждым тестом (БД общая на сессию).

    Сиды (роли, права, пользователи и их сотрудники) сохраняются: удаляются
    только брони, связи навыков, навыки и созданные в тестах сотрудники
    (у сидов-сотрудников проставлен user_id, у тестовых — нет).
    """
    db = TestSession()
    db.execute(text('DELETE FROM "Bookings"'))
    db.execute(text("DELETE FROM employee_skills"))
    db.execute(text("DELETE FROM skills"))
    db.execute(text("DELETE FROM employees WHERE user_id IS NULL"))
    db.commit()
    db.close()
    yield
