# Internal Competency and Schedule Management Portal

Внутренний портал управления компетенциями и расписанием. Ветка `alpha`
объединяет серверную часть и клиент: фронтенд работает с матрицей компетенций
бэкенда по REST API (страница «Команда и навыки» использует реальные данные,
а не заглушки).

## Архитектура

```
backend/      — FastAPI + SQLAlchemy + Alembic (PostgreSQL)
frontend/     — TypeScript + React + Vite (в макете был mockup)
diagrams/     — ER-диаграмма БД
docker-compose.yaml — PostgreSQL для разработки
```

- Бэкенд предоставляет REST API: сотрудники, навыки и уровни владения
  (`/employees`, `/skills`, `/employees/{id}/skills`, …).
- Фронтенд через слой `frontend/src/api.ts` и хук `useCompetency` загружает
  матрицу и сохраняет изменения уровней (POST/PATCH).
- Подсистема «Переговорная» пока работает на локальных данных — серверных
  эндпоинтов бронирования ещё нет.

## Запуск

Порядок важен: **БД → миграции → бэкенд → фронтенд**. Команды ниже для PowerShell.

### 1. База данных (Docker)

Создайте `.env` рядом с `docker-compose.yaml`:

```
POSTGRES_USER=portal
POSTGRES_PASSWORD=portal
POSTGRES_DB=portal
```

```powershell
docker compose up -d        # PostgreSQL на хост-порту 5433 (внутри 5432)
docker ps                   # контейнер postgres-database должен быть Up
```

> **Порт 5433, а не 5432.** Если на уже установлен системный PostgreSQL,
> он обычно занимает 5432 и перехватывает подключения с того же порта. Чтобы не конфликтовать, контейнер на `5433:5432`.

### 2. Бэкенд

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1         
pip install -r requirements.txt
Copy-Item .env.example .env           # затем впишите порт 5433 
alembic upgrade head                  # применить миграции
uvicorn main:app --reload             # http://127.0.0.1:8000, Swagger: /docs
```

`backend/.env`:

```
DATABASE_URL=postgresql+psycopg2://portal:portal@localhost:5433/portal
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3. Фронтенд

```powershell
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

> **Запускайте `npm run dev` именно из папки `frontend`** — иначе корень Vite
> укажет в другой каталог, и сервер будет отдавать 404 на все файлы.

`frontend/.env` (адрес бэкенда):

```
VITE_API_BASE=http://127.0.0.1:8000
```

### Демо-данные (необязательно)

Наполнить БД примерами сотрудников, навыков и уровней (бэк должен быть
запущен):

```powershell
cd backend
.\.venv\Scripts\python.exe seed_demo.py
```

