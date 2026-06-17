from routers import employees, skills, bookings, employee_skills, user, role_permissions, roles
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import Config
from init import init
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import os


static_dir = os.path.join(os.path.dirname(__file__), "static")
employees_dir = os.path.join(static_dir, "employees")


@asynccontextmanager
async def lifespan(app: FastAPI):
    user_role_id, admin_role_id, manager_role_id = init()
    app.state.default_role_id = user_role_id
    app.state.admin_role_id = admin_role_id
    app.state.manager_role_id = manager_role_id

    os.makedirs(static_dir, exist_ok=True)
    os.makedirs(employees_dir, exist_ok=True)

    yield

app = FastAPI(
    lifespan=lifespan
)


# Монтируем статику, чтобы FastAPI знал, где она лежит (полезно для отдачи HTML)
# 'static' — это URL-префикс, тогда 'app/static' — директория внутри контейнера
app.mount("/static", StaticFiles(directory=static_dir), name="static")


#Не используется, т.к. вместо этого используем OAuth2PasswordBearer, может быть потом пригодится
#app.add_middleware(AuthMiddleware)


# Разрешаем запросы фронтенда (dev-сервер Vite). Список источников берётся из
# переменной окружения CORS_ORIGINS (значения через запятую, см. config.py).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in Config.CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(user.router, prefix="/api", tags=["Пользователи"])
app.include_router(employees.router, prefix="/api", tags=["Сотрудники"])
app.include_router(skills.router, prefix="/api", tags=["Навыки"])
app.include_router(employee_skills.router, prefix="/api", tags=["Навыки сотрудников"])
app.include_router(bookings.router, prefix="/api", tags=["Бронирования"])
app.include_router(role_permissions.router, prefix="/api", tags=["Права ролей"])
app.include_router(roles.router, prefix="/api", tags=["Роли"])