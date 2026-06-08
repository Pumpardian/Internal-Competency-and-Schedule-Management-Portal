from models import Base, engine

def init_db():
    """Creates database tables"""
    Base.metadata.create_all(bind=engine)

def drop_db():
    """Deletes database tables"""
    Base.metadata.drop_all(bind=engine)