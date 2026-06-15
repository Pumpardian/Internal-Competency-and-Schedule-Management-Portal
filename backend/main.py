from fastapi.concurrency import run_in_threadpool
from routers import employees, skills, bookings, employee_skills, auth, role_permissions
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from middleware.auth import AuthMiddleware
from config import Config
from dependencies import get_db
from init import init
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    user_role_id, admin_role_id, manager_role_id = init()
    app.state.default_role_id = user_role_id
    app.state.admin_role_id = admin_role_id
    app.state.manager_role_id = manager_role_id

    yield

app = FastAPI(
    lifespan=lifespan
)

app.add_middleware(AuthMiddleware)

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

#При расширении проекта может пригодиться, пока хардкод при инициализации
#app.include_router(roles.router, prefix="/api", tags=["Роли"])
#app.include_router(permissions.router, prefix="/api", tags=["Права"])
#app.include_router(role_permissions.router, prefix="/api", tags=["Права ролей"])