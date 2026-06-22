FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .

RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

# Код вшиваем в образ (в проде том с кодом не монтируется)
COPY . .

RUN chmod +x /app/entrypoint.prod.sh

ENTRYPOINT ["/app/entrypoint.prod.sh"]
