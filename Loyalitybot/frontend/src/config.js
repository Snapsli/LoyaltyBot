// Конфигурация API URL
const config = {
  // В разработке используем прокси на localhost:8000
  // В продакшене используем относительные пути или переменную окружения
  apiUrl: process.env.NODE_ENV === 'production' 
    ? (process.env.REACT_APP_API_URL || '/api')
    : (process.env.REACT_APP_API_URL || 'http://localhost:8001/api')
};

export default config; 