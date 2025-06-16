import React, { useState } from 'react';
import '../styles/BarLoyalty.css';
import BarDetail from './BarDetail';

const BarLoyalty = ({ user }) => {
  const [selectedBar, setSelectedBar] = useState(null);

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

  const bars = [
    {
      id: 1,
      name: 'Культура',
      image: '/images/bars/kultura.jpg',
      address: 'ул. Пушкинская, 47',
      bonuses: getUserBonusesForBar(1)
    },
    {
      id: 2,
      name: 'Cabalitos',
      image: '/images/bars/cabalitos.jpg',
      address: 'ул. Рубинштейна, 25',
      bonuses: getUserBonusesForBar(2)
    },
    {
      id: 3,
      name: 'Фонотека',
      image: '/images/bars/fonoteka.jpg',
      address: 'Лиговский пр., 74',
      bonuses: getUserBonusesForBar(3)
    },
    {
      id: 4,
      name: 'Tchaykovsky',
      image: '/images/bars/tchaykovsky.jpg',
      address: 'ул. Чайковского, 15',
      bonuses: getUserBonusesForBar(4)
    }
  ];

  const handleBarClick = (bar) => {
    // Добавляем небольшую задержку для лучшего UX на мобильных
    setTimeout(() => {
      setSelectedBar(bar);
    }, 100);
  };

  const handleBackToMain = () => {
    setSelectedBar(null);
  };

  if (selectedBar) {
    return (
      <BarDetail 
        bar={selectedBar} 
        onBack={handleBackToMain}
      />
    );
  }

  return (
    <div className="bar-loyalty">
      <div className="bars-header">
        <h1>Добро пожаловать в наши бары!</h1>
      </div>
      
      <div className="bars-grid">
        {bars.map(bar => (
          <div 
            key={bar.id} 
            className="bar-card"
            onClick={() => handleBarClick(bar)}
          >
            <img 
              src={bar.image} 
              alt={bar.name}
              className="bar-card-image"
              onError={(e) => {
                e.target.src = '/images/bars/placeholder.svg';
              }}
            />
            <div className="bar-card-overlay">
              <h3 className="bar-card-name">{bar.name}</h3>
            </div>
            <div className="bar-bonus-strip">
              <span>Ваши бонусы: {bar.bonuses}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BarLoyalty; 