#!/bin/sh
set -e

# Ждём базу данных
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database at postgres-db:5432..."
    while ! nc -z postgres-db 5432; do
        echo "Still waiting for database..."
        sleep 2
    done
    echo "Database is ready!"

    echo "Running migrations..."
    alembic upgrade head
fi

# Прод: без --reload, несколько воркеров
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
