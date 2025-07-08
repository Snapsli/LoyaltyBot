const express = require('express');
const router = express.Router();
const Bar = require('../models/Bar');
const authMiddleware = require('../middleware/authMiddleware'); // Предполагаем, что есть middleware для аутентификации

// GET /api/bars - Получить все бары
router.get('/', async (req, res) => {
  try {
    const bars = await Bar.find({});
    res.json(bars);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка на сервере' });
  }
});

// POST /api/bars - Создать новый бар (только для админов)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  try {
    const { name, address, description, image } = req.body;
    
    // Простая валидация
    if (!name || !address) {
      return res.status(400).json({ message: 'Название и адрес обязательны' });
    }

    const newBar = new Bar({
      name,
      address,
      description,
      image: image || '/images/bars/placeholder.svg' // Изображение по умолчанию
    });

    const savedBar = await newBar.save();
    res.status(201).json(savedBar);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании бара', error });
  }
});

// Тут будут другие ручки: PUT, DELETE и т.д.

module.exports = router; 