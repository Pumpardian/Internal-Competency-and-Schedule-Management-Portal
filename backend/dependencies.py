from database import SessionLocal
import logging

def get_db():
    """
    Метод для получения сессии базы данных
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_logger():
    """
    Метод для получения стандартного логгера uvicorn
    """
    logger = logging.getLogger("uvicorn")
    
    return logger