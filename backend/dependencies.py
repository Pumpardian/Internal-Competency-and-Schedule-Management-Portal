from models import SessionLocal

def get_db():
    '''Dependency to get Database session'''
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()