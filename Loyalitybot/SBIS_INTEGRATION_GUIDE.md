# 🔗 Инструкция по интеграции с API СБИС

## 📋 Содержание
1. [Подготовка к интеграции](#подготовка-к-интеграции)
2. [Получение доступа к API](#получение-доступа-к-api)
3. [Настройка webhook](#настройка-webhook)
4. [Интеграция API](#интеграция-api)
5. [Тестирование](#тестирование)
6. [Примеры кода](#примеры-кода)

---

## 🚀 Подготовка к интеграции

### Что нужно иметь:
- ✅ Аккаунт в СБИС
- ✅ Документация API СБИС
- ✅ API ключи (получить у СБИС)
- ✅ SSL сертификат для webhook
- ✅ Публичный IP или домен

### Технические требования:
- Node.js 14+ 
- MongoDB
- HTTPS endpoint
- Логирование запросов

---

## 🔑 Получение доступа к API

### Шаг 1: Обращение в СБИС
```bash
# Контакты для получения API доступа:
📧 Email: api@sbis.ru
📞 Телефон: +7 (495) 123-45-67
🌐 Сайт: https://sbis.ru/api
```

### Шаг 2: Регистрация приложения
1. Зайдите на https://sbis.ru/developer
2. Создайте новое приложение
3. Получите API ключи:
   - `SBIS_API_KEY` - основной ключ
   - `SBIS_SECRET` - секретный ключ
   - `SBIS_WEBHOOK_URL` - URL для webhook

### Шаг 3: Настройка разрешений
```json
{
  "permissions": [
    "read_transactions",
    "write_reports", 
    "read_customers",
    "write_analytics"
  ],
  "webhook_events": [
    "transaction.created",
    "customer.updated",
    "report.generated"
  ]
}
```

---

## 🔗 Настройка webhook

### Создание endpoint для получения данных от СБИС:

```javascript
// backend/routes/sbisWebhook.js
const express = require('express');
const router = express.Router();

// Верификация webhook от СБИС
const verifySbisWebhook = (req, res, next) => {
  const signature = req.headers['x-sbis-signature'];
  const payload = JSON.stringify(req.body);
  
  // Проверка подписи
  const expectedSignature = crypto
    .createHmac('sha256', process.env.SBIS_SECRET)
    .update(payload)
    .digest('hex');
    
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
};

// Обработка событий от СБИС
router.post('/webhook/sbis', verifySbisWebhook, async (req, res) => {
  try {
    const { event, data } = req.body;
    
    switch (event) {
      case 'transaction.created':
        await handleSbisTransaction(data);
        break;
        
      case 'customer.updated':
        await handleSbisCustomer(data);
        break;
        
      case 'report.generated':
        await handleSbisReport(data);
        break;
        
      default:
        console.log('Unknown event:', event);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

### Добавление в основной файл:
```javascript
// backend/index.js
const sbisWebhook = require('./routes/sbisWebhook');
app.use('/api', sbisWebhook);
```

---

## 🔌 Интеграция API

### 1. Отправка данных в СБИС

```javascript
// backend/utils/sbisApi.js
const axios = require('axios');

class SbisApi {
  constructor() {
    this.baseURL = 'https://api.sbis.ru/v1';
    this.apiKey = process.env.SBIS_API_KEY;
    this.secret = process.env.SBIS_SECRET;
  }

  // Отправка отчета в СБИС
  async sendReport(reportData) {
    try {
      const response = await axios.post(`${this.baseURL}/reports`, {
        type: 'loyalty_report',
        data: reportData,
        format: 'json'
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('SBIS API error:', error);
      throw error;
    }
  }

  // Синхронизация транзакций
  async syncTransactions(transactions) {
    try {
      const response = await axios.post(`${this.baseURL}/transactions/sync`, {
        transactions: transactions.map(t => ({
          id: t._id.toString(),
          amount: Math.abs(t.points),
          type: t.type === 'earn' ? 'credit' : 'debit',
          description: t.description,
          timestamp: t.timestamp,
          customer_id: t.userId.toString(),
          location_id: t.barId
        }))
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('SBIS sync error:', error);
      throw error;
    }
  }

  // Получение данных из СБИС
  async getSbisData(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params
      });
      
      return response.data;
    } catch (error) {
      console.error('SBIS GET error:', error);
      throw error;
    }
  }
}

module.exports = new SbisApi();
```

### 2. Автоматическая синхронизация

```javascript
// backend/jobs/sbisSync.js
const cron = require('node-cron');
const SbisApi = require('../utils/sbisApi');
const Transaction = require('../models/Transaction');

// Синхронизация каждый час
cron.schedule('0 * * * *', async () => {
  try {
    console.log('Starting SBIS sync...');
    
    // Получаем новые транзакции
    const newTransactions = await Transaction.find({
      syncedToSbis: { $ne: true }
    }).populate('userId');
    
    if (newTransactions.length > 0) {
      // Отправляем в СБИС
      await SbisApi.syncTransactions(newTransactions);
      
      // Помечаем как синхронизированные
      await Transaction.updateMany(
        { _id: { $in: newTransactions.map(t => t._id) } },
        { syncedToSbis: true }
      );
      
      console.log(`Synced ${newTransactions.length} transactions to SBIS`);
    }
  } catch (error) {
    console.error('SBIS sync job error:', error);
  }
});
```

### 3. Добавление в основной файл:

```javascript
// backend/index.js
require('./jobs/sbisSync'); // Запуск синхронизации
```

---

## 🧪 Тестирование

### 1. Тестовые данные

```javascript
// test/sbis.test.js
const SbisApi = require('../utils/sbisApi');

describe('SBIS API Integration', () => {
  test('should send report to SBIS', async () => {
    const testData = {
      period: '2024-01-01 to 2024-01-31',
      total_transactions: 150,
      total_revenue: 50000,
      customers_count: 45
    };
    
    const result = await SbisApi.sendReport(testData);
    expect(result.success).toBe(true);
  });
  
  test('should sync transactions', async () => {
    const testTransactions = [
      {
        _id: 'test_id_1',
        points: 100,
        type: 'earn',
        description: 'Test transaction',
        timestamp: new Date(),
        userId: 'user_id_1',
        barId: '1'
      }
    ];
    
    const result = await SbisApi.syncTransactions(testTransactions);
    expect(result.synced_count).toBe(1);
  });
});
```

### 2. Проверка webhook

```bash
# Тестирование webhook с помощью curl
curl -X POST http://your-domain.com/api/webhook/sbis \
  -H "Content-Type: application/json" \
  -H "x-sbis-signature: test_signature" \
  -d '{
    "event": "transaction.created",
    "data": {
      "transaction_id": "test_123",
      "amount": 100,
      "customer_id": "customer_456"
    }
  }'
```

---

## 🔧 Переменные окружения

Добавьте в `.env`:

```bash
# SBIS API Configuration
SBIS_API_KEY=your_api_key_here
SBIS_SECRET=your_secret_here
SBIS_WEBHOOK_URL=https://your-domain.com/api/webhook/sbis
SBIS_BASE_URL=https://api.sbis.ru/v1

# SSL Configuration (для webhook)
SSL_CERT_PATH=/path/to/certificate.crt
SSL_KEY_PATH=/path/to/private.key
```

---

## 📊 Мониторинг интеграции

### Логирование:

```javascript
// backend/utils/sbisLogger.js
const winston = require('winston');

const sbisLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/sbis-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/sbis-combined.log' })
  ]
});

module.exports = sbisLogger;
```

### Метрики:

```javascript
// backend/utils/sbisMetrics.js
const sbisMetrics = {
  syncSuccess: 0,
  syncErrors: 0,
  webhookEvents: 0,
  apiCalls: 0
};

module.exports = sbisMetrics;
```

---

## 🚨 Обработка ошибок

```javascript
// backend/utils/sbisErrorHandler.js
class SbisErrorHandler {
  static async handleApiError(error, context) {
    console.error(`SBIS API Error in ${context}:`, error);
    
    // Уведомление администратора
    if (error.response?.status >= 500) {
      await this.notifyAdmin(error, context);
    }
    
    // Повторная попытка для временных ошибок
    if (error.response?.status === 429 || error.response?.status >= 500) {
      await this.retryOperation(context);
    }
  }
  
  static async notifyAdmin(error, context) {
    // Отправка уведомления администратору
    console.log(`Admin notification: SBIS error in ${context}`);
  }
  
  static async retryOperation(context) {
    // Логика повторных попыток
    console.log(`Retrying SBIS operation: ${context}`);
  }
}

module.exports = SbisErrorHandler;
```

---

## 📞 Поддержка

### Контакты СБИС:
- 📧 **Email**: api-support@sbis.ru
- 📞 **Телефон**: +7 (495) 123-45-67
- 💬 **Чат**: https://sbis.ru/support/chat
- 📚 **Документация**: https://sbis.ru/api/docs

### Полезные ссылки:
- 🌐 **Сайт СБИС**: https://sbis.ru
- 🔌 **API Portal**: https://api.sbis.ru
- 📖 **Документация**: https://sbis.ru/help
- 🆘 **Поддержка**: https://sbis.ru/support

---

## ✅ Чек-лист готовности

- [ ] Получены API ключи от СБИС
- [ ] Настроен SSL сертификат
- [ ] Создан webhook endpoint
- [ ] Протестирована отправка данных
- [ ] Настроено логирование
- [ ] Добавлена обработка ошибок
- [ ] Настроены метрики
- [ ] Протестирована интеграция
- [ ] Документированы процессы
- [ ] Обучен персонал

---

## 🎯 Следующие шаги

1. **Получите доступ к API СБИС** - обратитесь в СБИС
2. **Настройте webhook** - создайте endpoint для получения данных
3. **Интегрируйте API** - добавьте код для отправки данных
4. **Протестируйте** - проверьте корректность работы
5. **Запустите в продакшн** - мониторьте и оптимизируйте

---

*Последнее обновление: 2024-01-15*
*Версия документа: 1.0* 