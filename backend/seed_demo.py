# -*- coding: utf-8 -*-
"""Наполнение БД демо-данными.

Создаёт 100 сотрудников (каждый — с учётной записью и ролью), 100 навыков и
случайные уровни владения, плюс демо-брони. Пользователи и сотрудники создаются
напрямую в БД (чтобы сразу задать роль, хешировать пароль и связать сотрудника
с учёткой); навыки, уровни и брони — через REST API (требуют токен).

Роли: «Иванов Иван» — admin, каждый пятый — manager, остальные — user.
Учётки: логин = транслит фамилии + индекс, пароль у всех общий (PASSWORD).

Адрес API задаётся через SEED_API_BASE; по умолчанию — локальный бэкенд (удобно
запускать в контейнере: docker exec fastapi-backend-dev python seed_demo.py).
"""
import json
import os
import random
import urllib.parse
import urllib.request
from datetime import datetime

from sqlalchemy import select, text

from database import SessionLocal
from models import User, Employee, Role
from utils.auth import argon2_context

# Роутеры смонтированы под префиксом /api (см. backend/main.py).
BASE = os.getenv("SEED_API_BASE", "http://localhost:8000/api")

# Учётные данные администратора (создаются при старте бэкенда, см. init.py).
ADMIN_USER = os.getenv("SEED_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "admin")

# Общий пароль для всех демо-учёток сотрудников.
PASSWORD = os.getenv("SEED_USER_PASSWORD", "Passw0rd!")

# Воспроизводимость демо-набора.
random.seed(42)

EMPLOYEE_COUNT = 100
SKILL_COUNT = 100
CATEGORIES = ["language", "database", "framework", "library", "tool", "other"]

# Транслитерация кириллицы для логинов.
TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def translit(s: str) -> str:
    return "".join(TRANSLIT.get(ch, ch) for ch in s.lower())


def login() -> str:
    """Логинится администратором и возвращает JWT (эндпоинт ждёт форму OAuth2)."""
    data = urllib.parse.urlencode({"username": ADMIN_USER, "password": ADMIN_PASSWORD}).encode("utf-8")
    req = urllib.request.Request(
        BASE + "/login", data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))["access_token"]


def post(path, payload, token):
    """POST с JSON-телом и токеном (навыки, уровни, брони)."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


def reset_tables():
    """Очищает демо-данные и учётки сотрудников (кроме системного admin)."""
    with SessionLocal() as db:
        db.execute(text(
            'TRUNCATE "Bookings", employee_skills, skills, employees RESTART IDENTITY CASCADE'
        ))
        db.execute(text("DELETE FROM users WHERE username != :admin"), {"admin": ADMIN_USER})
        db.commit()


# --- Данные сотрудников: уникальные пары «имя + фамилия» ---------------------
FIRST_NAMES = [
    "Иван", "Анна", "Пётр", "Мария", "Алексей", "Ольга", "Дмитрий", "Елена",
    "Сергей", "Наталья", "Андрей", "Татьяна", "Михаил", "Екатерина",
]
LAST_NAMES = [
    "Иванов", "Петров", "Сидоров", "Кузнецов", "Смирнов", "Попов", "Соколов",
    "Лебедев", "Козлов", "Новиков", "Морозов", "Волков", "Соловьёв", "Васильев",
]
POSITIONS = [
    "Backend-разработчик", "Frontend-разработчик", "DevOps-инженер",
    "Системный аналитик", "Тимлид", "QA-инженер", "Data-инженер",
    "UX-дизайнер", "Продакт-менеджер", "SRE-инженер",
]

employee_pairs = [(f, l) for l in LAST_NAMES for f in FIRST_NAMES][:EMPLOYEE_COUNT]
employees = [
    (f, l, POSITIONS[i % len(POSITIONS)])
    for i, (f, l) in enumerate(employee_pairs)
]


def role_for(index: int) -> str:
    """Иванов Иван (первый) — admin, каждый пятый — manager, остальные — user."""
    if index == 0:
        return "admin"
    if index % 5 == 0:
        return "manager"
    return "user"


def create_users_and_employees() -> list[int]:
    """Создаёт учётку + сотрудника для каждой записи и возвращает id сотрудников."""
    emp_ids: list[int] = []
    with SessionLocal() as db:
        roles = {r.name: r.id for r in db.execute(select(Role)).scalars().all()}
        password_hash = argon2_context.hash(PASSWORD)
        used = set()
        for i, (first, last, position) in enumerate(employees):
            # Уникальный логин: транслит фамилии + порядковый номер.
            username = f"{translit(last)}{i + 1}"
            while username in used:
                username += "x"
            used.add(username)

            user = User(username=username, hashed_password=password_hash, role_id=roles[role_for(i)])
            db.add(user)
            db.flush()

            employee = Employee(
                first_name=first, last_name=last, position=position,
                created_at=datetime.now(), user_id=user.id,
            )
            db.add(employee)
            db.flush()
            emp_ids.append(employee.id)
        db.commit()
    return emp_ids


# --- Навыки: уникальные названия с валидной категорией ----------------------
BASE_SKILLS = [
    ("Python", "language"), ("TypeScript", "language"), ("JavaScript", "language"),
    ("SQL", "language"), ("Go", "language"), ("Rust", "language"), ("Java", "language"),
    ("C#", "language"), ("Kotlin", "language"), ("Swift", "language"),
    ("PostgreSQL", "database"), ("MySQL", "database"), ("MongoDB", "database"),
    ("Redis", "database"), ("ClickHouse", "database"), ("Elasticsearch", "database"),
    ("FastAPI", "framework"), ("Django", "framework"), ("Flask", "framework"),
    ("Spring", "framework"), ("Express", "framework"), ("NestJS", "framework"),
    ("React", "library"), ("Vue", "library"), ("Angular", "library"),
    ("Redux", "library"), ("pandas", "library"), ("NumPy", "library"),
    ("Docker", "tool"), ("Kubernetes", "tool"), ("Git", "tool"), ("Terraform", "tool"),
    ("Ansible", "tool"), ("Nginx", "tool"), ("Grafana", "tool"), ("Prometheus", "tool"),
    ("Kafka", "tool"), ("RabbitMQ", "tool"), ("Jenkins", "tool"), ("GitLab CI", "tool"),
]
skills = list(BASE_SKILLS)
i = 1
while len(skills) < SKILL_COUNT:
    skills.append((f"Технология {i}", CATEGORIES[i % len(CATEGORIES)]))
    i += 1
skills = skills[:SKILL_COUNT]

# Отправка на сервер
token = login()
print("Авторизация: ок.")

reset_tables()
print("Таблицы очищены.")

emp_ids = create_users_and_employees()
print(f"Сотрудники и учётки: создано {len(emp_ids)} (Иванов Иван — admin, каждый 5-й — manager)")

skill_ids = [post("/skills", {"name": n, "category": c}, token)["id"] for (n, c) in skills]
print(f"Навыки: создано {len(skill_ids)}")

# Каждому сотруднику случайный набор навыков (5–15) со случайным уровнем 1–5.
count = 0
for eid in emp_ids:
    chosen = random.sample(skill_ids, k=random.randint(5, 15))
    for sid in chosen:
        post(f"/employees/{eid}/skills/{sid}", {"level": random.randint(1, 5)}, token)
        count += 1
print(f"Назначений уровней: {count}")

# Брони переговорной на дату по умолчанию календаря (RoomPage), 9:00–18:00 UTC.
BOOK_DATE = "2026-06-08"
bookings = [
    (0, "Дейли команды", "09:00", "09:30"),
    (4, "Ревью архитектуры", "10:00", "11:00"),
    (2, "Интервью кандидата", "11:30", "12:30"),
    (3, "Планирование спринта", "13:00", "14:30"),
    (8, "Синк с продактом", "15:00", "16:00"),
    (1, "Ретроспектива", "16:30", "17:30"),
]
for emp_index, topic, start, end in bookings:
    post("/bookings", {
        "employee_id": emp_ids[emp_index],
        "topic": topic,
        "start_time": f"{BOOK_DATE}T{start}:00Z",
        "end_time": f"{BOOK_DATE}T{end}:00Z",
    }, token)
print(f"Броней: создано {len(bookings)} на {BOOK_DATE}")
print(f"Готово. Учётки сотрудников: логин = транслит фамилии + номер, пароль = {PASSWORD!r}.")
print(f"Админ-сотрудник «Иванов Иван»: логин {translit(employees[0][1])}1 / {PASSWORD!r}.")
