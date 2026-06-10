# Internal Competency and Schedule Management Portal

Внутренний портал управления компетенциями и расписанием. Ветка `alpha`
объединяет серверную часть и клиент: фронтенд работает с матрицей компетенций
бэкенда по REST API (страница «Команда и навыки» использует реальные данные,
а не заглушки).

## Архитектура

```
backend/      — FastAPI + SQLAlchemy + Alembic (PostgreSQL)
frontend/     — TypeScript + React + Vite (бывший mockup)
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

### 1. База данных

```bash
docker compose up -d        # поднимает PostgreSQL (нужен файл .env, см. ниже)
```

`.env` рядом с `docker-compose.yaml` (значения подставьте свои):

```
POSTGRES_USER=portal
POSTGRES_PASSWORD=portal
POSTGRES_DB=portal
```

### 2. Бэкенд

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # пропишите DATABASE_URL (см. пример)
alembic upgrade head        # применить миграции
uvicorn main:app --reload   # http://localhost:8000, Swagger UI: /docs
```

### 3. Фронтенд

```bash
cd frontend
npm install
cp .env.example .env        # при необходимости поменяйте VITE_API_BASE
npm run dev                 # http://localhost:5173
```

CORS на бэкенде по умолчанию разрешает dev-сервер Vite (`localhost:5173`);
изменить можно переменной `CORS_ORIGINS`.

## Ветки

- `main` — основная ветка.
- `alpha` — интеграция бэкенда и клиента (матрица компетенций по API).
- `first_week` — задание первой недели (диаграммы и макет).
- `backend_competency` — разработка серверной части.
