# 🎯 Loyalty Program with Telegram Authentication

Система лояльности с авторизацией через Telegram WebApp, скопированная из проекта food-order.

## 📋 Содержимое проекта

Этот проект содержит только компоненты, связанные с:
- ✅ **Telegram Bot интеграцией**
- ✅ **Системой авторизации**
- ✅ **Docker конфигурациями** (development и production)

**НЕ включает:** контексты, страницы и сложную бизнес-логику из оригинального проекта.

## 🏗️ Архитектура

- **Backend**: Node.js + Express.js + MongoDB
- **Frontend**: React.js + Telegram WebApp SDK
- **Database**: MongoDB с Mongoose
- **Containerization**: Docker Compose

## 🚀 Быстрый старт

### 🔧 Настройка переменных окружения

1. **Настройка для локальной разработки:**
   ```bash
   npm run setup
   # Отредактируйте файл env.development под ваши локальные настройки
   ```

2. **Настройка для продакшена:**
   ```bash
   npm run setup:prod
   # Отредактируйте файл env.production с настройками вашего сервера
   ```

### 💻 Локальная разработка

1. **Перейдите в папку проекта:**
   ```bash
   cd loyality
   ```

2. **Запустите проект:**
   ```bash
   npm run dev
   # или
   npm start
   ```

3. **Приложение будет доступно:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - MongoDB: localhost:27017

### 🌐 Продакшн развертывание

1. **Настройте продакшн переменные:**
   ```bash
   # Отредактируйте env.production:
   # - Укажите ваш домен
   # - Смените пароли MongoDB
   # - Укажите email для SSL
   # - Настройте Telegram bot
   ```

2. **Деплой на сервер:**
   ```bash
   npm run prod
   ```

### 📊 Управление проектом

```bash
# Разработка
npm run dev          # Запуск в режиме разработки (Windows)
npm run dev:unix     # Запуск в режиме разработки (Linux/Mac)
npm run stop         # Остановка dev контейнеров
npm run logs         # Просмотр логов dev
npm run status       # Статус dev контейнеров

# Продакшн
npm run prod         # Деплой в продакшн (Windows)
npm run prod:unix    # Деплой в продакшн (Linux/Mac)
npm run stop:prod    # Остановка prod контейнеров
npm run logs:prod    # Просмотр логов prod
npm run status:prod  # Статус prod контейнеров

# Настройка
npm run setup        # Создать env.development (Windows)
npm run setup:prod   # Создать env.production (Windows)
npm run setup:unix   # Создать env.development (Linux/Mac)
npm run setup:prod:unix # Создать env.production (Linux/Mac)
```

### 🖥️ Кроссплатформенность

Проект поддерживает Windows и Unix системы:
- **Windows**: используйте команды без суффикса (npm run dev, npm run prod)
- **Linux/Mac**: используйте команды с суффиксом :unix (npm run dev:unix, npm run prod:unix)

## 🔐 Система авторизации

### Telegram WebApp Integration

Приложение интегрируется с Telegram через:
- `@twa-dev/sdk` - для работы с Telegram WebApp API
- Кастомные заголовки `X-Telegram-ID` и `X-Session-Token`
- Автоматическое создание пользователей при первом входе

### Роли пользователей

- **admin** - полные права администратора
- **user** - обычный пользователь

### Первый пользователь

Первый зарегистрированный пользователь автоматически получает роль `admin`.

## 🛠️ API Endpoints

### Авторизация
- `POST /api/auth/telegram` - авторизация через Telegram
- `GET /api/auth/me` - получение текущего пользователя

### Управление пользователями (Admin)
- `GET /api/users` - список всех пользователей
- `PUT /api/users/:userId/balance` - обновление баланса
- `PUT /api/users/:userId/block` - блокировка/разблокировка

### Утилиты
- `POST /api/upload/image` - загрузка изображений
- `GET /api/health` - проверка состояния сервиса

## 🗃️ База данных

### User Model
```javascript
{
  telegramId: String (unique),
  firstName: String,
  lastName: String,
  username: String (unique),
  role: ['admin', 'user'],
  balance: Number (default: 0),
  isBlocked: Boolean (default: false),
  sessionToken: String
}
```

## 🔧 Переменные окружения

### 📁 Файлы окружения
- `env.development` - для локальной разработки
- `env.production` - для продакшен сервера
- `env.example` - шаблон с примерами

### 🔑 Основные переменные

#### Backend
- `NODE_ENV` - окружение (development/production)
- `MONGO_URI` - строка подключения к MongoDB
- `BACKEND_URL` - URL backend сервера
- `PORT` - порт сервера (default: 8000)

#### Frontend  
- `REACT_APP_API_URL` - URL API сервера
- `REACT_APP_TELEGRAM_BOT_NAME` - имя Telegram бота
- `REACT_APP_USE_MOCK_AUTH` - использовать mock авторизацию для разработки

#### Продакшн (дополнительно)
- `DOMAIN` - домен без протокола (для Traefik)
- `ACME_EMAIL` - email для SSL сертификатов

### 💡 Примеры настройки

#### Локальная разработка (env.development)
```bash
NODE_ENV=development
MONGO_URI=mongodb://admin:GevPass12@localhost:27017/loyalty-dev-db?authSource=admin
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_USE_MOCK_AUTH=true
```

#### Продакшн (env.production)
```bash
NODE_ENV=production
DOMAIN=yourdomain.com
BACKEND_URL=https://yourdomain.com
MONGO_URI=mongodb://admin:STRONG_PASSWORD@mongo:27017/loyalty-prod-db?authSource=admin
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_TELEGRAM_BOT_NAME=YourProductionBot
REACT_APP_USE_MOCK_AUTH=false
ACME_EMAIL=admin@yourdomain.com
```

## 📱 Telegram Bot Setup

1. Создайте бота через @BotFather
2. Получите токен бота
3. Настройте WebApp URL на ваш домен
4. Обновите `REACT_APP_TELEGRAM_BOT_NAME` в переменных окружения

## 🐳 Docker Services

### Development (`docker-compose.yml`)
- `mongo` - MongoDB с авторизацией
- `backend` - Node.js API сервер
- `frontend` - React development сервер

### Production (`docker-compose.prod.yml`)
- `traefik` - Reverse proxy с SSL
- `mongo` - MongoDB
- `backend` - Production API сервер  
- `frontend` - Optimized React build

## 📊 Monitoring

- Health check: `GET /api/health`
- Logs: `docker-compose logs -f [service_name]`

## 🔒 Security

- Сессии основаны на токенах
- Авторизация через кастомные заголовки
- Блокировка пользователей администратором
- Валидация ролей для доступа к API

## 🛠️ Development

### Запуск без Docker

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend  
npm install
npm start
```

### Структура проекта

```
loyality/
├── backend/
│   ├── models/User.js
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── utils/telegramAuth.js
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

## 📝 Changelog

- v1.0.0 - Базовая система авторизации через Telegram
- Скопировано из проекта food-order только необходимые компоненты

## 🤝 Contributing

Проект создан как базовая система авторизации для дальнейшего развития.

---

**Powered by Telegram WebApp** 🚀 

## 🚀 Quick Start

### Development (Docker)
```bash
# Start development environment
npm run dev

# View logs
npm run dev:logs

# Stop development environment
npm run dev:down
```

### Production (Docker)
```bash
# Configure production environment
cp env.example env.production
# Edit env.production with your domain and email

# Start production environment
npm run prod

# View logs
npm run prod:logs

# Stop production environment
npm run prod:down
```

### Local Development (without Docker)
```bash
# Start MongoDB
docker run -d --name loyalty-mongo -p 27017:27017 mongo:latest

# Start backend
npm run backend

# Start frontend (in another terminal)
npm run frontend
```

## 📁 Environment Files

- `env.development` - Docker development environment
- `env.production` - Docker production environment  
- `env.local` - Local development without Docker
- `env.example` - Template file

## 🔧 Configuration

### Development
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- MongoDB: localhost:27017

### Production
- Uses Traefik for reverse proxy and SSL
- Automatic HTTPS with Let's Encrypt
- Configure `DOMAIN` and `ACME_EMAIL` in env.production

## 🐳 Docker Services

### Development
- `loyalty-mongo-dev` - MongoDB database
- `loyalty-backend-dev` - Node.js API server
- `loyalty-frontend-dev` - React application

### Production
- `traefik-loyalty` - Reverse proxy with SSL
- `loyalty-mongo` - MongoDB database
- `loyalty-backend` - Node.js API server
- `loyalty-frontend` - React application

## 📝 Available Commands

```bash
# Docker Development
npm run dev          # Start development environment
npm run dev:down     # Stop development environment
npm run dev:logs     # View development logs

# Docker Production
npm run prod         # Start production environment
npm run prod:down    # Stop production environment
npm run prod:logs    # View production logs

# Local Development
npm run backend      # Start backend only
npm run frontend     # Start frontend only
```

## 🔐 Authentication

The application supports:
- Telegram WebApp authentication (production)
- Mock authentication (development)
- Session-based authentication with custom headers

## 🏗️ Architecture

- **Frontend**: React 19 with React Router
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: Telegram WebApp SDK
- **Deployment**: Docker with Traefik (production)

## 📦 Features

- User authentication via Telegram
- Role-based access (admin/user)
- Loyalty points system
- File upload support
- Responsive UI
- Docker containerization
- SSL/HTTPS support (production)
 