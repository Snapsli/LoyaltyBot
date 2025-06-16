import React, { useState } from 'react';

const PhoneInput = ({ onPhoneSubmit, isLoading = false }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const validatePhone = (phoneNumber) => {
    // Убираем все символы кроме цифр и +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Проверяем формат: должен начинаться с + и содержать от 10 до 15 цифр
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(cleaned);
  };

  const formatPhone = (value) => {
    // Убираем все символы кроме цифр и +
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Если нет +, добавляем его в начало
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.replace(/^\+/, '');
    }
    
    return cleaned;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      setError('Введите номер телефона');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Введите корректный номер телефона в формате +7XXXXXXXXXX');
      return;
    }

    onPhoneSubmit(phone);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Добро пожаловать!
          </h2>
          <p className="text-gray-600">
            Для продолжения введите ваш номер телефона
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Номер телефона
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+7 (XXX) XXX-XX-XX"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Проверяем...' : 'Продолжить'}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Ваш номер телефона будет использован для программы лояльности
        </div>
      </div>
    </div>
  );
};

export default PhoneInput; 