# Internal Competency and Schedule Management Portal

Внутренний портал управления компетенциями и расписанием. Ветка `dev`
объединяет серверную часть и клиент: фронтенд работает с матрицей компетенций
бэкенда по REST API (страница «Команда и навыки» использует реальные данные,
а не заглушки).

## Архитектура

```
backend/      — FastAPI + SQLAlchemy + Alembic (PostgreSQL)
frontend/     — TypeScript + React + Vite
diagrams/     — ER-диаграмма БД
docker-compose.yaml — PostgreSQL для разработки
```

- Бэкенд предоставляет REST API под префиксом `/api`; маршруты разбиты по
  роутерам в `backend/routers/` (сотрудники, навыки, навыки сотрудников,
  бронирования). Интерактивная документация — Swagger по адресу `/docs`.
- Основные ресурсы: `/api/employees`, `/api/skills`,
  `/api/employees/{id}/skills`, `/api/bookings`.
- Список сотрудников постраничный: `GET /api/employees` принимает
  `current_page` (по умолчанию 1) и `page_size` (1–20, по умолчанию 10), а
  возвращает объект `{ page_size, current_page, total_pages, data: [...] }`.
- Фронтенд через слой `frontend/src/api.ts` (клиент на axios) и хук
  `useCompetency` загружает матрицу и сохраняет изменения уровней (POST/PATCH).
- Подсистема «Переговорная»: на бэкенде эндпоинты бронирования уже есть
  (`/api/bookings`), но клиент пока работает на локальных данных — интеграция
  ещё не подключена.

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

### 2. Бэкенд

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env           # затем проверьте порт 5433 и CORS
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

`frontend/.env` (адрес бэкенда — обязательно с префиксом `/api`):

```
VITE_API_BASE=http://127.0.0.1:8000/api
```

### Демо-данные (необязательно)

Наполнить БД примерами сотрудников, навыков и уровней (бэк должен быть
запущен):

```powershell
cd backend
.\.venv\Scripts\python.exe seed_demo.py
```
