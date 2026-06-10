# -*- coding: utf-8 -*-
"""Наполнение БД демо-данными через REST API бэкенда."""
import json
import urllib.request

BASE = "http://127.0.0.1:8000"


def post(path, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


employees = [
    ("Иван", "Иванов", "Backend-разработчик"),
    ("Анна", "Петрова", "Frontend-разработчик"),
    ("Пётр", "Сидоров", "DevOps-инженер"),
    ("Мария", "Кузнецова", "Системный аналитик"),
    ("Алексей", "Смирнов", "Тимлид"),
]

skills = [
    ("Python", "language"),
    ("TypeScript", "language"),
    ("SQL", "language"),
    ("PostgreSQL", "database"),
    ("FastAPI", "framework"),
    ("React", "library"),
    ("Docker", "tool"),
    ("Git", "tool"),
]

# Матрица уровней владения: emp_index -> {skill_index: level} (0..5)
matrix = {
    0: {0: 5, 2: 4, 3: 4, 4: 5, 6: 3, 7: 4},          # Иванов — backend
    1: {1: 5, 5: 5, 2: 2, 7: 4},                       # Петрова — frontend
    2: {0: 3, 3: 3, 6: 5, 7: 5},                       # Сидоров — devops
    3: {2: 4, 3: 4, 7: 2},                             # Кузнецова — аналитик
    4: {0: 4, 1: 4, 4: 4, 5: 4, 6: 4, 7: 5},          # Смирнов — тимлид
}

emp_ids = [post("/employees", {"first_name": f, "last_name": l, "position": p})["id"]
           for (f, l, p) in employees]
print("Сотрудники:", emp_ids)

skill_ids = [post("/skills", {"name": n, "category": c})["id"] for (n, c) in skills]
print("Навыки:", skill_ids)

count = 0
for ei, levels in matrix.items():
    for si, lvl in levels.items():
        post(f"/employees/{emp_ids[ei]}/skills/{skill_ids[si]}", {"level": lvl})
        count += 1
print("Назначений уровней:", count)
print("Готово.")
