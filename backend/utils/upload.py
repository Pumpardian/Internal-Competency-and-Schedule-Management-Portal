import uuid
from fastapi import HTTPException, UploadFile
import os

STATIC_DIR = "static"
EMPLOYEES_PHOTO_DIR = os.path.join(STATIC_DIR, "employees")
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

async def save_employee_photo(file: UploadFile) -> str:
    """
    Сохраняет фото сотрудника и возвращает URL-путь

    Возвращает путь к сохраненному файлу
    """

    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый формат файла. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    file_size = 0
    chunk_size = 1024 * 1024  # 1 МБ
    max_size = 5 * 1024 * 1024  # 5 МБ
    
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(EMPLOYEES_PHOTO_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(chunk_size):
                file_size += len(chunk)
                if file_size > max_size:
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=400,
                        detail=f"Размер файла превышает {max_size // (1024 * 1024)} МБ"
                    )
                buffer.write(chunk)
        
        return f"/static/employees/{unique_filename}"
        
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при сохранении файла: {str(e)}"
        )
    
def delete_employee_photo(photo_url: str) -> bool:
    """
    Удаляет физический файл фото сотрудника.
    
    Возвращает True, если файл удален или не существовал, False если ошибка.
    """
    if not photo_url:
        return True
    
    filename = os.path.basename(photo_url)
    file_path = os.path.join(EMPLOYEES_PHOTO_DIR, filename)
    
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return True
    except Exception as e:
        print(f"Ошибка при удалении фото {file_path}: {e}")
        return False