from routers import employees, skills, bookings, employee_skills
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import Config

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in Config.CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(employees.router, prefix="/api", tags=["Сотрудники"])
app.include_router(skills.router, prefix="/api", tags=["Навыки"])
app.include_router(employee_skills.router, prefix="/api", tags=["Навыки сотрудников"])
app.include_router(bookings.router, prefix="/api", tags=["Бронирования"])