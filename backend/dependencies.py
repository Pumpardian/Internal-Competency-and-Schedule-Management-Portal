from database import SessionLocal

def get_db():
    '''Метод для получения сессии базы данных'''
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()