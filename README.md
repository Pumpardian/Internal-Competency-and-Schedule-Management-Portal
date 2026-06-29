# Internal Competency and Schedule Management Portal

Внутренний портал отдела цифровизации: **матрица компетенций** сотрудников
(тепловая карта уровней владения навыками), **бронирование переговорной**,
**профили** сотрудников и **управление учётными записями** с ролевым доступом.

Весь стек запускается в Docker. Доступны два окружения:
**dev** (хот-релоад фронта и бэка) и **prod** (собранная статика, без релоада).

---

## Содержание

- [Возможности](#возможности)
- [Стек технологий](#стек-технологий)
- [Архитектура](#архитектура)
- [Структура репозитория](#структура-репозитория)
- [Требования](#требования)
- [Переменные окружения](#переменные-окружения)
- [Быстрый старт (dev)](#быстрый-старт-dev)
- [Демо-данные](#демо-данные)
- [Запуск (prod)](#запуск-prod)
- [Аккаунты, роли и права](#аккаунты-роли-и-права)
- [Модель данных](#модель-данных)
- [Страницы интерфейса](#страницы-интерфейса)
- [REST API](#rest-api)
- [Локальная разработка](#локальная-разработка)
- [Тесты](#тесты)
- [Аналитические отчёты](#аналитические-отчёты)
- [Темы и локализация](#темы-и-локализация)
- [Полезные команды Docker](#полезные-команды-docker)
- [Траблшутинг](#траблшутинг)

---

## Возможности

- **Матрица компетенций** — сотрудники × навыки, уровень владения 0–5 в виде
  тепловой карты. Постраничный вывод и по строкам (сотрудники), и по столбцам
  (навыки). Клик по ячейке открывает поповер изменения уровня (при наличии прав).
- **Управление справочниками** — создание/правка/удаление сотрудников и навыков
  прямо из матрицы (модальные окна), назначение и снятие навыков.
- **Бронирование переговорной** — календарь броней на выбранный день; пересечения
  по времени запрещены на уровне БД (GiST `EXCLUDE`).
- **Профили** — карточка сотрудника со списком навыков и уровнями.
- **Аккаунт** — правка своего профиля с подтверждением паролем, смена пароля,
  загрузка фото; просмотр своей роли. Для администратора — смена ролей других
  пользователей и удаление аккаунтов.
- **Ролевой доступ** — `user` / `manager` / `admin`. Интерфейс скрывает
  недоступные действия, бэкенд проверяет права на каждом изменяющем запросе.
- **JWT-авторизация** — пароли хешируются argon2, доступ по Bearer-токену.
- **Экспорт в Excel** — выгрузка справочника сотрудников в `.xlsx` (SheetJS).
- **Тёмная/светлая тема** и локализация (русский, белорусский, английский).
- **Аналитические отчёты** — отдельный модуль строит PDF/PNG по востребованности
  навыков и загрузке переговорной (pandas + matplotlib + seaborn).

## Стек технологий

| Слой | Технологии |
|------|------------|
| Backend | Python, FastAPI, SQLAlchemy, Alembic, Pydantic |
| База данных | PostgreSQL 17 (psycopg2), расширение `btree_gist` |
| Авторизация | JWT (`python-jose`), хеш паролей argon2 (`passlib[argon2]`) |
| Frontend | TypeScript, React 18, Vite 6, axios, xlsx (SheetJS) |
| Тесты | pytest + FastAPI TestClient (бэк); Vitest + Testing Library + jsdom (фронт) |
| Инфраструктура | Docker Compose, nginx (обратный прокси), uvicorn |
| Отчёты | pandas, matplotlib, seaborn |

## Архитектура

```
браузер → http://localhost (nginx, порт 80)
                 ├─ /            → фронтенд (dev: Vite-сервер / prod: собранный SPA)
                 ├─ /api, /docs  → backend (FastAPI)
                 └─ /static/     → файлы (фото сотрудников)
```

nginx — единственная точка входа на порт 80. Backend (8000) и фронт (5173)
наружу не публикуются: к ним обращается только nginx внутри docker-сети
`app_network_dev`. PostgreSQL проброшен на хост как `localhost:5433` (удобно для
локальных тестов и подключения GUI), внутри сети — порт 5432.

## Структура репозитория

```
.
├── docker-compose.yaml          # dev-стек (хот-релоад)
├── docker-compose-prod.yaml     # prod-стек (собранная статика)
├── .env.example                 # переменные для docker-стека
│
├── backend/                     # FastAPI + SQLAlchemy + Alembic
│   ├── main.py                  # сборка приложения, подключение роутеров
│   ├── config.py                # чтение переменных окружения
│   ├── database.py              # движок и сессии SQLAlchemy
│   ├── dependencies.py          # get_db и общие зависимости
│   ├── models.py                # ORM-модели (таблицы)
│   ├── init.py                  # авто-создание ролей, прав, админа при старте
│   ├── seed_demo.py             # наполнение демо-данными
│   ├── middleware/auth.py       # (резерв) middleware авторизации
│   ├── utils/                   # auth.py (JWT/argon2), upload.py (фото)
│   ├── routers/                 # эндпоинты по доменам
│   │   ├── user.py              # регистрация, вход, пользователи, роли, профиль
│   │   ├── employees.py         # сотрудники
│   │   ├── skills.py            # навыки
│   │   ├── employee_skills.py   # уровни владения навыками
│   │   ├── bookings.py          # брони переговорной
│   │   ├── roles.py             # роли (чтение)
│   │   ├── role_permissions.py  # права ролей (чтение)
│   │   └── permissions.py       # права (модуль, в API не смонтирован)
│   ├── report_module/run_report.py  # аналитические PDF/PNG-отчёты
│   ├── alembic/                 # миграции схемы
│   ├── tests/                   # pytest-тесты (отдельная БД portal_test)
│   ├── requirements.txt         # runtime-зависимости
│   └── requirements-dev.txt     # pytest, httpx
│
├── frontend/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx, main.tsx     # корень приложения
│   │   ├── api.ts, types.ts      # axios-клиент и типы
│   │   ├── data.ts, utils.ts     # константы (палитра тепловой карты) и хелперы
│   │   ├── i18n.tsx              # локализация ru/be/en
│   │   ├── password.ts           # проверка надёжности пароля
│   │   ├── exportEmployees.ts    # выгрузка в .xlsx
│   │   ├── styles.css            # все стили + переменные светлой/тёмной темы
│   │   ├── components/           # страницы и UI-компоненты
│   │   ├── hooks/                # useAccess, useBookings, useCompetency,
│   │   │                         #   useProfile, useTheme, useToasts
│   │   └── test/                 # Vitest-тесты
│   ├── nginx.prod.conf          # nginx-конфиг для prod-образа фронта
│   ├── package.json
│   └── vite.config.ts
│
├── nginx/nginx.conf             # dev-прокси (единая точка входа)
└── diagrams/er-diagram.drawio   # ER-диаграмма БД
```

## Требования

- **Docker Desktop** (с Docker Compose).
- Для локального запуска без Docker — Python 3.12+ и Node.js 20+.

## Переменные окружения

### Корневой `.env` (для docker-стека)

Создайте рядом с `docker-compose.yaml` по образцу `.env.example`:

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=postgres

# Подпись JWT. Значения без кавычек — docker env_file передаёт их буквально
# (кавычки вокруг алгоритма сломают выпуск токена).
AUTH_SECRET=замените_на_свой_случайный_секрет
AUTH_ALGORITHM=HS256
```

### `frontend/.env` (для dev)

Берётся из `frontend/.env.example`:

```env
VITE_API_BASE=/api
```

> Адрес относительный, потому что фронт ходит на бэкенд через тот же nginx.
> В прод-сборке `/api` зашивается автоматически. При прямом локальном запуске
> укажите полный адрес, например `http://127.0.0.1:8000/api`.

### `backend/.env` (для локального запуска бэка/тестов вне Docker)

Берётся из `backend/.env.example`:

```env
DATABASE_URL=postgresql://admin:admin@localhost:5433/postgres
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
AUTH_SECRET=замените_на_свой_случайный_секрет
AUTH_ALGORITHM=HS256
```

## Быстрый старт (dev)

```bash
docker compose -f docker-compose.yaml build     # первая сборка образов
docker compose -f docker-compose.yaml up -d
docker compose -f docker-compose.yaml ps        # все Up, postgres — healthy
```

Откройте:

- Приложение — **http://localhost**
- Swagger (документация API) — **http://localhost/docs**

Миграции Alembic применяются автоматически при старте backend. При первом
запуске создаются базовые роли, права и учётная запись администратора
**`admin` / `admin`** (см. `init.py`).

Остановить стек:

```bash
docker compose -f docker-compose.yaml down
```

## Демо-данные

Наполнить БД сотрудниками, навыками, уровнями и бронями (и завести учётку с
ролью каждому сотруднику) — запустите seed внутри контейнера backend:

```bash
docker compose -f docker-compose.yaml exec backend python seed_demo.py
```

Создаётся ~100 сотрудников и навыков, ~1000 уровней владения и демо-брони на
`2026-06-08`. Логины сотрудников — транслит фамилии + номер, пароль у всех
`password`. Роли: «Иванов Иван» (`ivanov1`) — admin, каждый 5-й — manager,
остальные — user.

> seed очищает прежние демо-данные и учётки (кроме системного `admin`).

## Запуск (prod)

Так стек разворачивают на сервере: backend без `--reload` (с воркерами), фронт
собран в минифицированную статику и отдаётся nginx, код вшит в образ.

```bash
docker compose -f docker-compose-prod.yaml build
docker compose -f docker-compose-prod.yaml up -d
```

Прод-стек поднимается под отдельным именем проекта, поэтому его
образы/тома/контейнеры не пересекаются с dev. Адрес тот же — **http://localhost**.

## Аккаунты, роли и права

Три роли создаются автоматически при старте (`init.py`):

| Роль | Доступ |
|------|--------|
| **admin** | Полный доступ: сотрудники, навыки, уровни, брони, смена ролей пользователей, удаление аккаунтов. |
| **manager** | Уровни владения навыками (`employee_skill.*`) и брони (`booking.*`). |
| **user** | Просмотр; в переговорной бронирует только за себя. |

Права (permissions), которые раздаются ролям при инициализации:

```
employee.create / employee.update / employee.delete
skill.create    / skill.update    / skill.delete
employee_skill.create / employee_skill.update / employee_skill.delete
booking.create  / booking.update  / booking.delete
user_role.update
```

- **admin** получает все права.
- **manager** получает `booking.*` и `employee_skill.*`.
- **user** прав не имеет (только чтение и собственные брони по логике роутеров).

Интерфейс скрывает недоступные действия, а backend дополнительно проверяет права
на каждом изменяющем запросе.

## Модель данных

Основные таблицы (`backend/models.py`):

| Таблица | Назначение | Ключевые поля и ограничения |
|---------|------------|------------------------------|
| `employees` | Сотрудники | `first_name`, `last_name`, `position`, `photo_url`, `user_id → users` (1:1, `SET NULL`) |
| `skills` | Навыки | `name` (unique), `category` (enum: language, database, framework, library, tool, other) |
| `employee_skills` | Уровни владения | `employee_id → employees` (CASCADE), `skill_id → skills` (RESTRICT), `level` 0–5, unique(`employee_id`,`skill_id`) |
| `Bookings` | Брони переговорной | `topic`, `start_time`, `end_time`; CHECK `end_time > start_time`; GiST `EXCLUDE` против пересечений |
| `users` | Учётные записи | `username` (unique), `hashed_password` (argon2), `role_id → roles` (RESTRICT) |
| `roles` | Роли | `name` (unique) |
| `permissions` | Права | `name` (unique) |
| `role_permissions` | Связь ролей и прав | unique(`role_id`,`permission_id`) |

> Ограничение `EXCLUDE ... USING gist` для непересекающихся броней требует
> расширения PostgreSQL `btree_gist` — оно включается миграцией Alembic.

ER-диаграмма: `diagrams/er-diagram.drawio`.

## Страницы интерфейса

- **Команда и навыки** (`TeamPage`) — матрица компетенций (тепловая карта),
  пагинация по строкам и столбцам, поповер уровня (`LevelPopover`), модалки
  создания/правки навыков и сотрудников (`EntityModal`), экспорт в Excel.
- **Переговорная** (`RoomPage`) — календарь броней на день, создание/правка
  брони (`BookingModal`).
- **Профиль** (`ProfilePage` / `EmployeeCard`) — карточка сотрудника с навыками.
- **Аккаунт** (`AccountPage`) — свой профиль (правка с подтверждением паролем,
  смена пароля, фото), своя роль; для admin — смена ролей других и удаление.
- **Вход / Регистрация** (`LoginPage` / `RegisterPage`) — с индикатором
  надёжности пароля (`PasswordStrength`).
- **Шапка** (`Header`) — навигация, глобальный поиск сотрудника, переключатели
  языка и темы. Уведомления — всплывающие тосты (`Toasts`).

## REST API

Все маршруты под префиксом `/api`. Полное интерактивное описание — в Swagger по
**`/docs`**. Списки сотрудников/навыков/пользователей постраничные: параметры
`current_page` (по умолчанию 1) и `page_size` (1–20, по умолчанию 10); ответ —
`{ page_size, current_page, total_pages, data: [...] }`.

### Пользователи и авторизация (`user.py`)

| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/api/register` | Регистрация |
| POST | `/api/login` | Вход, возвращает JWT |
| GET | `/api/users` | Список пользователей (постранично) |
| GET | `/api/users/{id}` | Профиль (сотрудник) пользователя |
| GET | `/api/users/{id}/role` | Текущая роль пользователя |
| POST | `/api/users/{id}/role` | Сменить роль (право `user_role.update`) |
| PATCH | `/api/users/{id}/profile` | Правка профиля / пароля / фото |
| DELETE | `/api/user/{id}` | Удалить аккаунт |

### Сотрудники (`employees.py`)

| Метод | Путь | Право |
|-------|------|-------|
| GET | `/api/employees` | — |
| GET | `/api/employees/{id}` | — |
| POST | `/api/employees` | `employee.create` |
| PATCH | `/api/employees/{id}` | `employee.update` |
| DELETE | `/api/employees/{id}` | `employee.delete` |

### Навыки (`skills.py`)

| Метод | Путь | Право |
|-------|------|-------|
| GET | `/api/skills` | — |
| GET | `/api/skills/{id}` | — |
| POST | `/api/skills` | `skill.create` |
| PATCH | `/api/skills/{id}` | `skill.update` |
| DELETE | `/api/skills/{id}` | `skill.delete` |

### Навыки сотрудников (`employee_skills.py`)

| Метод | Путь | Право |
|-------|------|-------|
| GET | `/api/employees/{id}/skills` | — |
| POST | `/api/employees/{employee_id}/skills/{skill_id}` | `employee_skill.create` |
| PATCH | `/api/employees/{employee_id}/skills/{skill_id}` | `employee_skill.update` |
| DELETE | `/api/employees/{employee_id}/skills/{skill_id}` | `employee_skill.delete` |

### Бронирования (`bookings.py`)

| Метод | Путь | Право |
|-------|------|-------|
| GET | `/api/bookings` | — (фильтр по дню `book_date` и др.) |
| POST | `/api/bookings` | `booking.create` |
| PATCH | `/api/bookings/{id}` | `booking.update` |
| DELETE | `/api/bookings/{id}` | `booking.delete` |

### Роли и права (только чтение)

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/roles` | Список ролей |
| GET | `/api/roles/{id}` | Роль по id |
| GET | `/api/roles/{id}/permissions` | Права роли |

## Локальная разработка

### Фронтенд

```bash
cd frontend
npm install
npm run dev          # Vite dev-сервер (порт 5173)
```

Доступные скрипты (`package.json`):

| Скрипт | Действие |
|--------|----------|
| `npm run dev` | dev-сервер Vite (предварительно освобождает порт 5173) |
| `npm run build` | типизация + продакшен-сборка (`tsc -b && vite build`) |
| `npm run preview` | предпросмотр собранной статики |
| `npm run typecheck` | проверка типов без сборки |
| `npm test` | тесты Vitest однократно |
| `npm run test:watch` | тесты в watch-режиме |

При локальном запуске фронта без nginx задайте в `frontend/.env`
полный адрес API, например `VITE_API_BASE=http://127.0.0.1:8000/api`.

### Бэкенд

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate                 # Windows; на *nix: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload              # нужен доступный PostgreSQL (см. backend/.env)
```

## Тесты

### Фронтенд (Vitest + Testing Library, jsdom)

```bash
cd frontend
npm test
```

Тесты лежат в `frontend/src/test/`, работают в jsdom — внешние сервисы не нужны.

### Бэкенд (pytest + FastAPI TestClient)

Интеграционные тесты в `backend/tests/` поднимают схему и ходят в **отдельную
базу `portal_test`** на том же Postgres — рабочую БД не трогают. База
**создаётся автоматически** при первом запуске (см. `conftest.py`). Тестам нужны
те же переменные, что и приложению: `DATABASE_URL`, `AUTH_SECRET`,
`AUTH_ALGORITHM`.

**В контейнере backend** (окружение уже из `.env`):

```bash
docker compose -f docker-compose.yaml exec backend pip install -r requirements-dev.txt
docker compose -f docker-compose.yaml exec backend pytest
```

> `pytest` не входит в runtime-образ, поэтому `requirements-dev.txt` ставится
> отдельно. Установка живёт до пересоздания контейнера.

**Локально** (нужен доступный Postgres; при поднятом dev-стеке он на
`localhost:5433`):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

Запускать строго из каталога `backend/` (там `pytest.ini` с `pythonpath = .`,
без него `import main` в `conftest.py` не находится). В `backend/.env` должны
быть `DATABASE_URL`, `AUTH_SECRET`, `AUTH_ALGORITHM` — иначе при выпуске JWT
тесты упадут с `jose.JWSError`.

## Аналитические отчёты

Модуль `backend/report_module/run_report.py` строит аналитику по данным БД:

- топ востребованных навыков;
- средняя загрузка переговорной.

Результат сохраняется в `reports/` (PDF/PNG). Модуль использует
**pandas, matplotlib, seaborn** — их нет в основном runtime-образе, поэтому для
запуска установите их дополнительно. Запуск:

```bash
cd backend
python -m report_module.run_report
```

## Темы и локализация

- **Тема**: светлая и тёмная. Переключатель 🌙/☀ в шапке, выбор сохраняется в
  `localStorage`. Палитра задана CSS-переменными в `styles.css` (`:root` и
  `[data-theme="dark"]`), включая цвета тепловой карты — в тёмной теме без
  светлых клеток.
- **Языки**: русский, белорусский, английский (`i18n.tsx`). Выбор языка — в шапке.

## Полезные команды Docker

```bash
# логи backend в реальном времени
docker compose -f docker-compose.yaml logs -f backend

# статус контейнеров
docker compose -f docker-compose.yaml ps

# войти в контейнер backend
docker compose -f docker-compose.yaml exec backend bash

# psql к базе разработки
docker compose -f docker-compose.yaml exec postgres-db psql -U admin -d postgres

# полная остановка с удалением томов (сбросит БД)
docker compose -f docker-compose.yaml down -v
```

## Траблшутинг

- **`http://localhost/api/` отдаёт 404** — это нормально: у корня `/api` нет
  маршрута, эндпоинты лежат глубже (`/api/employees`, `/api/login`, …). Проверяйте
  доступность бэка по **`/docs`**.
- **Warning `the attribute version is obsolete`** при `docker compose` — из-за
  строки `version: '3.8'` в compose-файлах. На работу не влияет; можно удалить.
- **JWT-ошибки в тестах (`jose.JWSError`)** — не заданы `AUTH_SECRET` /
  `AUTH_ALGORITHM` в окружении.
- **Фронт не достучался до API при локальном запуске** — на Windows `localhost`
  часто резолвится в IPv6 `::1`, куда uvicorn по умолчанию не слушает. Указывайте
  `127.0.0.1` в `VITE_API_BASE` / `DATABASE_URL`.
- **Порт 5433 занят** — измените проброс порта Postgres в `docker-compose.yaml`
  (секция `ports` сервиса `postgres-db`).
