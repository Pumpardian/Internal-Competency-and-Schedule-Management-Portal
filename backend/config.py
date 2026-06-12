import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Настройки приложения, читаются из переменных окружения (.env)."""

    # URL подключения к PostgreSQL для SQLAlchemy и Alembic.
    DATABASE_URL = os.getenv('DATABASE_URL')

    # Источники, которым разрешён CORS, задаются в .env через запятую.
    # split превращает строку в список адресов - для CORSMiddleware
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '').split(',')

    AUTH_SECRET = os.getenv('AUTH_SECRET')

    AUTH_ALGORITHM = os.getenv('AUTH_ALGORITHM')