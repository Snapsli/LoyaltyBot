// backend/utils/pointsSettings.js

// Настройки по умолчанию
const defaultPointsSettings = {
  '1': { pointsPerRuble: 0.01, minPurchase: 0, isActive: true }, // 100р = 1 балл
  '2': { pointsPerRuble: 0.01, minPurchase: 0, isActive: true },
  '3': { pointsPerRuble: 0.01, minPurchase: 0, isActive: true },
  '4': { pointsPerRuble: 0.01, minPurchase: 0, isActive: true }
};

// Переменная для хранения настроек в памяти. Экспортируем для отладки.
let pointsSettings = { ...defaultPointsSettings };

// Функция для получения настроек для бара (с учетом дефолтных)
const getBarPointsSettings = (barId) => {
  const barIdStr = String(barId);
  return pointsSettings[barIdStr] || defaultPointsSettings[barIdStr];
};

// Функция для обновления настроек для бара
const updateBarPointsSettings = (barId, newSettings) => {
  pointsSettings[String(barId)] = { ...getBarPointsSettings(barId), ...newSettings };
  return pointsSettings[String(barId)];
};

module.exports = {
    pointsSettings,
    getBarPointsSettings,
    updateBarPointsSettings
}; 