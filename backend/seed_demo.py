# -*- coding: utf-8 -*-
"""Наполнение БД демо-данными через REST API бэкенда.

Создаёт 100 сотрудников и 100 навыков и случайным образом проставляет уровни
владения — чтобы на фронте было видно постраничную навигацию (пагинацию) и по
строкам (сотрудники), и по столбцам (навыки).

API теперь под авторизацией, поэтому скрипт логинится как admin и шлёт токен.
Создание сотрудника стало multipart (поле form со строкой JSON). Адрес API
задаётся через SEED_API_BASE; по умолчанию — локальный бэкенд (так удобно
запускать прямо в контейнере: docker exec fastapi-backend-dev python seed_demo.py).
"""
import json
import os
import random
import urllib.parse
import urllib.request
import uuid

from sqlalchemy import text

from database import SessionLocal

# Роутеры смонтированы под префиксом /api (см. backend/main.py).
BASE = os.getenv("SEED_API_BASE", "http://localhost:8000/api")

# Учётные данные администратора (создаются при старте бэкенда, см. init.py).
ADMIN_USER = os.getenv("SEED_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "admin")

# Воспроизводимость демо-набора.
random.seed(42)

# Сколько сотрудников и навыков создать.
EMPLOYEE_COUNT = 100
SKILL_COUNT = 100

# Допустимые категории навыков (см. models.skill_categories).
CATEGORIES = ["language", "database", "framework", "library", "tool", "other"]


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


def post_employee(payload, token):
    """Создание сотрудника: эндпоинт ждёт multipart с полем form (строка JSON)."""
    boundary = f"----seed{uuid.uuid4().hex}"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="form"\r\n\r\n'
        f"{json.dumps(payload)}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    req = urllib.request.Request(
        BASE + "/employees", data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


def reset_tables():
    """Очищает таблицы перед заливкой, чтобы не ловить 409 на уже существующих
    записях и получить ровно по 100 сотрудников и навыков."""
    with SessionLocal() as db:
        db.execute(text(
            'TRUNCATE "Bookings", employee_skills, skills, employees RESTART IDENTITY CASCADE'
        ))
        db.commit()


# --- Генерация сотрудников: уникальные пары «имя + фамилия» ------------------
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

# Все уникальные пары (имя, фамилия), берём первые EMPLOYEE_COUNT.
employee_pairs = [(f, l) for l in LAST_NAMES for f in FIRST_NAMES][:EMPLOYEE_COUNT]
employees = [
    (f, l, POSITIONS[i % len(POSITIONS)])
    for i, (f, l) in enumerate(employee_pairs)
]

# --- Генерация навыков: уникальные названия с валидной категорией -----------
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
# Дополняем до SKILL_COUNT синтетическими, но уникальными названиями.
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

emp_ids = [post_employee({"first_name": f, "last_name": l, "position": p}, token)["id"]
           for (f, l, p) in employees]
print(f"Сотрудники: создано {len(emp_ids)}")

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

# Брони переговорной
# На дату по умолчанию календаря (RoomPage) и в его рабочий диапазон 9:00–18:00.
# Время в UTC ("Z"), интервалы не пересекаются (на бэке стоит запрет пересечений).
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
print("Готово.")
