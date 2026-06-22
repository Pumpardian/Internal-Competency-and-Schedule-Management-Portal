# Сборка SPA
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# В проде фронт ходит на бэкенд через тот же nginx — относительный путь /api
ENV VITE_API_BASE=/api
RUN npm run build

# Отдача статики через nginx + проксирование API
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.prod.conf /etc/nginx/nginx.conf

EXPOSE 80
