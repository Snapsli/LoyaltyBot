# Dockerfile для продакшена
FROM node:18-alpine

# Рабочая директория внутри контейнера
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Копируем весь остальной код
COPY . .

# Собираем production-сборку
RUN npm run build

# Установка сервера для раздачи фронта
RUN npm install -g serve

# Открываем порт
EXPOSE 3000

# Запускаем production-сервер
CMD ["serve", "-s", "build", "-l", "3000"] 