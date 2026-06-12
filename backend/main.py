from routers import employees, skills, bookings, employee_skills, auth, roles, permissions, role_permissions
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import Config

app = FastAPI()

# Разрешаем запросы фронтенда (dev-сервер Vite). Список источников берётся из
# переменной окружения CORS_ORIGINS (значения через запятую, см. config.py).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in Config.CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/api", tags=["Авторизация"])
app.include_router(employees.router, prefix="/api", tags=["Сотрудники"])
app.include_router(skills.router, prefix="/api", tags=["Навыки"])
app.include_router(employee_skills.router, prefix="/api", tags=["Навыки сотрудников"])
app.include_router(bookings.router, prefix="/api", tags=["Бронирования"])
app.include_router(roles.router, prefix="/api", tags=["Роли"])
app.include_router(permissions.router, prefix="/api", tags=["Права"])
app.include_router(role_permissions.router, prefix="/api", tags=["Права ролей"])