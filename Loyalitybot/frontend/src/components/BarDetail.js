import React, { useState } from 'react';
import '../styles/BarLoyalty.css';
import MenuModal from './MenuModal';
import QRModal from './QRModal';

const BarDetail = ({ bar, onBack }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentBonuses, setCurrentBonuses] = useState(bar.bonuses);

  const menuItems = {
    1: [ // Культура
      { id: 1, name: 'Авторский коктейль', price: 150 },
      { id: 2, name: 'Крафтовое пиво', price: 100 },
      { id: 3, name: 'Брускетта', price: 80 },
      { id: 4, name: 'Десерт дня', price: 120 },
      { id: 5, name: 'Кофе с десертом', price: 90 }
    ],
    2: [ // Cabalitos
      { id: 1, name: 'Мохито классический', price: 120 },
      { id: 2, name: 'Тапас сет', price: 200 },
      { id: 3, name: 'Сангрия', price: 160 },
      { id: 4, name: 'Паэлья мини', price: 180 },
      { id: 5, name: 'Чурос с шоколадом', price: 70 }
    ],
    3: [ // Фонотека
      { id: 1, name: 'Виниловый коктейль', price: 140 },
      { id: 2, name: 'Музыкальный сет закусок', price: 220 },
      { id: 3, name: 'Крафтовый бургер', price: 190 },
      { id: 4, name: 'Винтажный десерт', price: 110 },
      { id: 5, name: 'Латте с сиропом', price: 85 }
    ],
    4: [ // Tchaykovsky
      { id: 1, name: 'Классический мартини', price: 130 },
      { id: 2, name: 'Икорная закуска', price: 250 },
      { id: 3, name: 'Стейк тартар', price: 280 },
      { id: 4, name: 'Тирамису', price: 95 },
      { id: 5, name: 'Эспрессо двойной', price: 60 }
    ]
  };

  const handleSpendBonuses = () => {
    setShowMenu(true);
  };

  const handleMenuItemClick = (item) => {
    if (currentBonuses >= item.price) {
      // Добавляем тактильную обратную связь на мобильных
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setSelectedItem(item);
      setShowMenu(false);
      setTimeout(() => {
        setShowQR(true);
      }, 200);
    }
  };

  const handleEmulate = () => {
    // Добавляем вибрацию для подтверждения на мобильных
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    setCurrentBonuses(prev => prev - selectedItem.price);
    setShowQR(false);
    setSelectedItem(null);
  };

  const currentMenuItems = menuItems[bar.id] || [];

  return (
    <div className="bar-detail">
      <div className="bar-detail-header">
        <img 
          src={bar.image} 
          alt={bar.name}
          className="bar-detail-image"
          onError={(e) => {
            e.target.src = '/images/bars/placeholder.svg';
          }}
        />
        <div className="bar-detail-overlay">
          <button className="back-button" onClick={onBack}>
            ←
          </button>
          <h1 className="bar-detail-title">{bar.name}</h1>
        </div>
      </div>

      <div className="bar-detail-content">
        <p className="bar-address">{bar.address}</p>
        
        <div className="bonus-section">
          <div className="bonus-title">Ваши бонусы</div>
          <div className="bonus-amount">{currentBonuses}</div>
          <button className="spend-button" onClick={handleSpendBonuses}>
            Потратить бонусы
          </button>
        </div>
      </div>

      {showMenu && (
        <MenuModal
          items={currentMenuItems}
          currentBonuses={currentBonuses}
          onClose={() => setShowMenu(false)}
          onItemClick={handleMenuItemClick}
        />
      )}

      {showQR && selectedItem && (
        <QRModal
          item={selectedItem}
          onClose={() => setShowQR(false)}
          onEmulate={handleEmulate}
        />
      )}
    </div>
  );
};

export default BarDetail; 