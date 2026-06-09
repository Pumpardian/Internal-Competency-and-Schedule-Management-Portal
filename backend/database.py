from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Config
from models import Base

engine = create_engine(Config.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Создание схемы базы данных (как альтернатива для alembic, в проде не использовать)"""
    Base.metadata.create_all(bind=engine)

def drop_db():
    """Удаление схемы базы данных"""
    Base.metadata.drop_all(bind=engine)