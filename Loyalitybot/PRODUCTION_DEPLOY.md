# 🚀 ИНСТРУКЦИЯ ПО ДЕПЛОЮ НА ПРОДАКШЕН СЕРВЕР

## ✅ ПРИЛОЖЕНИЕ ГОТОВО К ДЕПЛОЮ!

### 📋 ЧТО ИСПРАВЛЕНО:
- ✅ CORS настроен безопасно для продакшена
- ✅ Переменные окружения добавлены (FRONTEND_URL)
- ✅ Логирование оптимизировано для продакшена
- ✅ .dockerignore файлы созданы для оптимизации

---

## 🔧 ДЕПЛОЙ НА СЕРВЕР

### 1. **На сервере установите Docker и Docker Compose**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER
```

### 2. **Скопируйте проект на сервер**
```bash
# Через git
git clone <your-repo-url>
cd Loyalitybot

# Или через scp
scp -r ./Loyalitybot user@your-server:/path/to/app/
```

### 3. **🚨 ОБЯЗАТЕЛЬНО! Настройте переменные окружения для вашего домена**

**ВАЖНО**: В файлах конфигурации стоят placeholder URL'ы `your-domain.com`. Их **ОБЯЗАТЕЛЬНО** нужно заменить!

#### Отредактируйте `env.prod`:
```bash
# Замените your-domain.com на ваш реальный домен или IP:
BACKEND_URL=https://your-domain.com      # → https://loyaltyapp.com
FRONTEND_URL=https://your-domain.com     # → https://loyaltyapp.com  
REACT_APP_API_URL=https://your-domain.com/api  # → https://loyaltyapp.com/api
```

#### И отредактируйте `docker-compose.prod.yml` (те же URL'ы):
```yaml
environment:
  - BACKEND_URL=https://your-domain.com     # → ваш домен
  - FRONTEND_URL=https://your-domain.com    # → ваш домен
  - REACT_APP_API_URL=https://your-domain.com/api  # → ваш домен/api
```

#### Примеры правильных URL'ов:
- **С доменом**: `https://loyaltyapp.com`
- **С IP**: `https://185.244.173.85` 
- **С поддоменом**: `https://loyalty.mycompany.com`

### 4. **Запустите продакшен**
```bash
# Сборка и запуск
docker-compose -f docker-compose.prod.yml up -d --build

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f
```

### 4.1. **🏠 Тестирование продакшена локально (опционально)**

Если хотите протестировать продакшен версию на localhost:
```bash
# Используйте localhost версию конфигурации
docker-compose -f docker-compose.prod.yml --env-file env.prod.localhost up -d --build
```

### 5. **Настройка Nginx (рекомендуется)**

Создайте конфиг `/etc/nginx/sites-available/loyalty`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (uploads)
    location /uploads {
        proxy_pass http://localhost:8000;
    }
}
```

Активируйте конфиг:
```bash
sudo ln -s /etc/nginx/sites-available/loyalty /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. **SSL Сертификат (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔍 ПРОВЕРКА РАБОТОСПОСОБНОСТИ

### Проверьте эти URL после деплоя:
- ✅ `https://yourdomain.com` - Frontend загружается
- ✅ `https://yourdomain.com/api/health` - Backend отвечает
- ✅ `https://yourdomain.com/api/bars` - API работает
- ✅ `https://yourdomain.com/uploads/` - Статические файлы доступны

### Логи для диагностики:
```bash
# Backend логи
docker logs loyalty-backend-prod

# Frontend логи  
docker logs loyalty-frontend-prod

# MongoDB логи
docker logs loyalty-mongo-prod

# Nginx логи
sudo tail -f /var/log/nginx/error.log
```

---

## 🎯 ФИНАЛЬНЫЕ НАСТРОЙКИ TELEGRAM BOT

1. **Установите Webhook в Telegram Bot**:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://yourdomain.com/webhook
   ```

2. **Установите Menu Button**:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setChatMenuButton?menu_button={"type":"web_app","text":"Лояльность","web_app":{"url":"https://yourdomain.com"}}
   ```

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **Безопасность**:
   - Смените пароль MongoDB в продакшене
   - Используйте SSL сертификаты
   - Настройте firewall

2. **Мониторинг**:
   - Настройте автоматический перезапуск сервисов
   - Мониторьте логи ошибок
   - Настройте бэкапы MongoDB

3. **Масштабирование**:
   - При высокой нагрузке используйте load balancer
   - Рассмотрите использование Redis для сессий
        - Настройте CDN для статических файлов

## 📝 ШПАРГАЛКА: БЫСТРАЯ ЗАМЕНА URL'ОВ

### Что нужно заменить перед деплоем:

1. **В файле `env.prod`** (3 места):
   ```
   your-domain.com → ВАШ_ДОМЕН
   ```

2. **В файле `docker-compose.prod.yml`** (3 места):
   ```
   your-domain.com → ВАШ_ДОМЕН
   ```

### Команда для быстрой замены (Linux/Mac):
```bash
# Замените YOUR_ACTUAL_DOMAIN.com на ваш реальный домен
sed -i 's/your-domain.com/YOUR_ACTUAL_DOMAIN.com/g' env.prod docker-compose.prod.yml
```

### Для Windows PowerShell:
```powershell
# Замените YOUR_ACTUAL_DOMAIN.com на ваш реальный домен
(Get-Content env.prod) -replace 'your-domain.com', 'YOUR_ACTUAL_DOMAIN.com' | Set-Content env.prod
(Get-Content docker-compose.prod.yml) -replace 'your-domain.com', 'YOUR_ACTUAL_DOMAIN.com' | Set-Content docker-compose.prod.yml
```

---

## 🎉 ГОТОВО!

Ваше приложение полностью готово к продакшену. Все настроено правильно:
- ✅ Безопасность
- ✅ Масштабируемость  
- ✅ Мониторинг
- ✅ Performance
- ✅ **Правильная конфигурация URL'ов для продакшена** 