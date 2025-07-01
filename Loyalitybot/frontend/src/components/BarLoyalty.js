import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/BarLoyalty.css';
import BarDetail from './BarDetail';

const BarLoyalty = ({ user }) => {
  const [selectedBar, setSelectedBar] = useState(null);
  const { barId } = useParams();
  const navigate = useNavigate();

  // Симулируем различные бонусы пользователя для каждого бара
  const getUserBonusesForBar = (barId) => {
    const baseBonus = user?.loyaltyPoints || 500; // Базовые 500 бонусов для тестов
    const bonusMultipliers = {
      1: 1.2,   // Культура - 600 бонусов
      2: 0.8,   // Cabalitos - 400 бонусов  
      3: 1.5,   // Фонотека - 750 бонусов
      4: 0.6    // Tchaykovsky - 300 бонусов
    };
    return Math.floor(baseBonus * (bonusMultipliers[barId] || 1));
  };

  // Автоматически выбираем бар на основе URL
  useEffect(() => {
    if (barId) {
      const bars = [
        {
          id: 1,
          name: 'Культура',
          image: '/images/bars/kultura.jpg',
          address: 'Ульяновск, ул. Пушкинская, 47',
          bonuses: getUserBonusesForBar(1)
        },
        {
          id: 2,
          name: 'Cabalitos',
          image: '/images/bars/cabalitos.jpg',
          address: 'Ульяновск, ул. Рубинштейна, 25',
          bonuses: getUserBonusesForBar(2)
        },
        {
          id: 3,
          name: 'Fonoteca - Listening Bar',
          image: '/images/bars/fonoteka.jpg',
          address: 'Ульяновск, Карла Маркса, 20',
          bonuses: getUserBonusesForBar(3)
        },
        {
          id: 4,
          name: 'Tchaykovsky',
          image: '/images/bars/tchaykovsky.jpg',
          address: 'Ульяновск, ул. Чайковского, 15',
          bonuses: getUserBonusesForBar(4)
        }
      ];

      const bar = bars.find(b => b.id === parseInt(barId));
      if (bar) {
        setSelectedBar(bar);
      } else {
        // Если бар не найден, возвращаем на главную
        navigate('/');
      }
    }
  }, [barId, navigate, user?.loyaltyPoints]);

  const handleBackToMain = () => {
    navigate('/');
  };

  // Если нет выбранного бара, перенаправляем на главную
  if (!selectedBar) {
    return (
      <div className="bar-loyalty">
        <div className="bars-header">
          <h1>Загрузка...</h1>
        </div>
      </div>
    );
  }

  // Показываем страницу выбранного бара
  return (
    <BarDetail 
      bar={selectedBar} 
      user={user}
      onBack={handleBackToMain}
    />
  );
};

export default BarLoyalty; 