const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { getBarPointsSettings } = require('../utils/pointsSettings');

// --- Логика настроек баллов (скопировано из index.js для инкапсуляции) ---

// --- Маршруты админа ---

// Middleware для проверки роли администратора (уже импортирован)
// const requireAdmin = (req, res, next) => { ... };

// Маршрут для получения информации о пользователе (для отображения имени в сканере)
router.get('/user-info/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({ name: user.firstName || user.username || 'Без имени' });
    } catch (error) {
        console.error('Ошибка при получении информации о пользователе:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Маршрут для обработки списания баллов (сканирование QR-кода админом)
// Путь будет /api/admin/process-spend
router.post('/process-spend', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData || !qrData.userId || !qrData.barId || !qrData.itemId || !qrData.itemPrice) {
            return res.status(400).json({ error: "Неполные данные в QR-коде" });
        }

        if (qrData.expiresAt && Date.now() > qrData.expiresAt) {
            return res.status(400).json({ error: "Срок действия QR-кода истек" });
        }

        const user = await User.findById(qrData.userId);
        if (!user) {
            return res.status(404).json({ error: "Клиент не найден" });
        }

        // Убедимся, что у пользователя есть поле barPoints
        if (!user.barPoints) {
            user.barPoints = new Map();
        }

        const barIdStr = qrData.barId.toString();
        const currentPoints = user.barPoints.get(barIdStr) || 0;

        if (currentPoints < qrData.itemPrice) {
            return res.status(400).json({ error: `Недостаточно баллов. У клиента ${currentPoints}, нужно ${qrData.itemPrice}` });
        }

        // Списание баллов
        const newPoints = currentPoints - qrData.itemPrice;
        
        const updatedBarPoints = new Map(user.barPoints);
        updatedBarPoints.set(barIdStr, newPoints);
        user.barPoints = updatedBarPoints;

        await user.save();
        
        // Создаем и сохраняем транзакцию
        const transaction = new Transaction({
            userId: qrData.userId,
            barId: qrData.barId,
            type: 'spend',
            points: -qrData.itemPrice,
            description: `Списание за "${qrData.itemName || 'товар'}"`
        });
        await transaction.save();

        res.json({
            success: true,
            message: `Списание ${qrData.itemPrice} баллов у клиента ${user.firstName} прошло успешно.`,
            newBalance: newPoints
        });

    } catch (error) {
        console.error('Ошибка при обработке списания:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера при обработке списания' });
    }
});

// Маршрут для обработки начисления баллов
router.post('/process-earn', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { qrData, purchaseAmount } = req.body;

        if (!qrData || !purchaseAmount || isNaN(purchaseAmount) || Number(purchaseAmount) <= 0) {
            return res.status(400).json({ error: "Неверные данные для начисления" });
        }

        const user = await User.findById(qrData.userId);
        if (!user) {
            return res.status(404).json({ error: "Клиент не найден" });
        }
        
        const barSettings = getBarPointsSettings(qrData.barId);
        
        if (!barSettings.isActive) {
            return res.status(400).json({ error: `Программа лояльности в этом заведении временно отключена.` });
        }

        if (Number(purchaseAmount) < barSettings.minPurchase) {
            return res.status(400).json({ error: `Минимальная сумма для начисления: ${barSettings.minPurchase} ₽` });
        }

        const pointsEarned = Math.floor(Number(purchaseAmount) * barSettings.pointsPerRuble);

        if (pointsEarned <= 0) {
            return res.status(400).json({ error: "Сумма покупки слишком мала для начисления баллов" });
        }

        if (!user.barPoints) {
            user.barPoints = new Map();
        }
        
        const barIdStr = qrData.barId.toString();
        const currentPoints = user.barPoints.get(barIdStr) || 0;
        const newPoints = currentPoints + pointsEarned;
        
        const updatedBarPoints = new Map(user.barPoints);
        updatedBarPoints.set(barIdStr, newPoints);
        user.barPoints = updatedBarPoints;

        await user.save();
        
        // Создаем и сохраняем транзакцию
        const transaction = new Transaction({
            userId: qrData.userId,
            barId: qrData.barId,
            type: 'earn',
            points: pointsEarned,
            description: `Начисление за покупку на ${purchaseAmount} ₽`
        });
        await transaction.save();

        res.json({
            success: true,
            message: `Начислено ${pointsEarned} баллов клиенту ${user.firstName}.`,
            newBalance: newPoints
        });

    } catch (error) {
        console.error('Ошибка при обработке начисления:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера при обработке начисления' });
    }
});

module.exports = router; 