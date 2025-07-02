# 🎯 Loyalty Program with Telegram Authentication

Система лояльности с авторизацией через Telegram WebApp. Баллы и меню добавляются администратором вручную за реальные покупки.

## 📋 Содержимое проекта

Этот проект содержит:
- ✅ **Telegram Bot интеграцию**
- ✅ **Систему авторизации**
- ✅ **Ручное управление балансом** (только администратор)
- ✅ **Базовую структуру баров**
- ✅ **Docker конфигурации** (development и production)

**Особенности:** Баллы начисляются только администратором вручную. Меню и возможности трат будут добавляться по мере необходимости.

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
   cd Loyalitybot
   ```

2. **Запустите с Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Приложение будет доступно:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8001/api
   - MongoDB: localhost:27018

4. **Остановка:**
   ```bash
   docker-compose down
   ```

### 🌐 Продакшн развертывание

1. **Настройте продакшн переменные в `env.prod`:**
   - Смените пароли MongoDB
   - Укажите правильный домен
   - Настройте Telegram bot

2. **Деплой на сервер:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Приложение будет доступно:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - MongoDB: localhost:27017

4. **Остановка продакшена:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

### 📊 Управление проектом

```bash
# Разработка
docker-compose up -d                    # Запуск dev окружения
docker-compose down                     # Остановка dev окружения
docker-compose logs                     # Просмотр логов
docker-compose logs -f backend          # Логи только backend с отслеживанием
docker-compose ps                       # Статус контейнеров

# Продакшн
docker-compose -f docker-compose.prod.yml up -d     # Запуск продакшена
docker-compose -f docker-compose.prod.yml down      # Остановка продакшена
docker-compose -f docker-compose.prod.yml logs      # Логи продакшена
docker-compose -f docker-compose.prod.yml ps        # Статус продакшен контейнеров

# Перезапуск отдельных сервисов
docker-compose restart backend         # Перезапуск только backend
docker-compose restart frontend        # Перезапуск только frontend

# Очистка
docker-compose down -v                  # Остановка с удалением volumes
docker system prune                     # Очистка неиспользуемых Docker объектов
```

### 🖥️ Инициализация данных

Данные баров автоматически инициализируются при запуске backend контейнера. Для ручной инициализации:

```bash
# Подключиться к backend контейнеру
docker-compose exec backend npm run init-bars
```

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

### Управление барами
- `GET /api/bars` - получение всех баров с меню
- `GET /api/bars/:barId` - получение конкретного бара с меню
- `PUT /api/bars/:barId` - обновление описания бара (Admin)
- `POST /api/bars/:barId/menu` - добавление пункта меню (Admin)
- `DELETE /api/menu/:itemId` - удаление пункта меню (Admin)

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

### Bar Model
```javascript
{
  barId: Number (unique),
  name: String,
  address: String,
  image: String,
  description: String
}
```

### MenuItem Model
```javascript
{
  barId: Number,
  name: String,
  price: Number,
  image: String,
  isActive: Boolean (default: true)
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

#### Локальная разработка (env.dev)
```bash
NODE_ENV=development
PORT=8000
MONGO_URI=mongodb://admin:GevPass12@mongo:27017/loyalty-dev-db?authSource=admin
BACKEND_URL=http://localhost:8001
REACT_APP_API_URL=http://localhost:8001/api
REACT_APP_TELEGRAM_BOT_NAME=Loyalty_bot
REACT_APP_USE_MOCK_AUTH=true
```

#### Продакшн (env.prod)
```bash
NODE_ENV=production
PORT=8000
MONGO_URI=mongodb://admin:GevPass12@mongo:27017/loyalty-prod-db?authSource=admin
BACKEND_URL=http://localhost:8000
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_TELEGRAM_BOT_NAME=Loyalty_bot
REACT_APP_USE_MOCK_AUTH=false
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
 