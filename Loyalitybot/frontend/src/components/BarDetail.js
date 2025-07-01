import React, { useState } from 'react';
import MenuModal from './MenuModal';
import QRModal from './QRModal';

const BarDetail = ({ bar, user, onBack }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentBonuses, setCurrentBonuses] = useState(bar.bonuses);
  const [expandedSection, setExpandedSection] = useState(null);

  // Функция для подсчета бонусов в конкретном баре
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

  // Подсчет общих бонусов во всех барах
  const getTotalBonuses = () => {
    return getUserBonusesForBar(1) + getUserBonusesForBar(2) + getUserBonusesForBar(3) + getUserBonusesForBar(4);
  };

  const menuItems = {
    1: [ // Культура
      { id: 1, name: 'Авторский коктейль', price: 450, image: '/images/drinks/cocktail-1.jpg' },
      { id: 2, name: 'Крафтовое пиво', price: 320, image: '/images/drinks/beer-1.jpg' },
      { id: 3, name: 'Брускетта', price: 280, image: '/images/drinks/bruschetta-1.jpg' },
      { id: 4, name: 'Десерт дня', price: 380, image: '/images/drinks/dessert-1.jpg' },
      { id: 5, name: 'Кофе с десертом', price: 290, image: '/images/drinks/coffee-1.jpg' },
      { id: 6, name: 'Винтажный виски', price: 520, image: '/images/drinks/whiskey-1.jpg' }
    ],
    2: [ // Cabalitos
      { id: 1, name: 'Мексиканский лукум', price: 450, image: '/images/drinks/mexican-lukum.jpg' },
      { id: 2, name: 'Тапас сет', price: 380, image: '/images/drinks/tapas-1.jpg' },
      { id: 3, name: 'Сангрия красная', price: 410, image: '/images/drinks/sangria-1.jpg' },
      { id: 4, name: 'Паэлья мини', price: 480, image: '/images/drinks/paella-1.jpg' },
      { id: 5, name: 'Чурос с шоколадом', price: 320, image: '/images/drinks/churros-1.jpg' },
      { id: 6, name: 'Текила с лаймом', price: 390, image: '/images/drinks/tequila-1.jpg' }
    ],
    3: [ // Фонотека
      { id: 1, name: 'Виниловый коктейль', price: 420, image: '/images/drinks/vinyl-cocktail.jpg' },
      { id: 2, name: 'Музыкальный сет', price: 380, image: '/images/drinks/music-set.jpg' },
      { id: 3, name: 'Крафтовый бургер', price: 450, image: '/images/drinks/burger-1.jpg' },
      { id: 4, name: 'Винтажный десерт', price: 350, image: '/images/drinks/vintage-dessert.jpg' },
      { id: 5, name: 'Латте с сиропом', price: 280, image: '/images/drinks/latte-1.jpg' },
      { id: 6, name: 'Ретро коктейль', price: 460, image: '/images/drinks/retro-cocktail.jpg' }
    ],
    4: [ // Tchaykovsky
      { id: 1, name: 'Классический мартини', price: 480, image: '/images/drinks/martini-1.jpg' },
      { id: 2, name: 'Икорная закуска', price: 520, image: '/images/drinks/caviar-1.jpg' },
      { id: 3, name: 'Стейк тартар', price: 580, image: '/images/drinks/tartare-1.jpg' },
      { id: 4, name: 'Тирамису', price: 380, image: '/images/drinks/tiramisu-1.jpg' },
      { id: 5, name: 'Эспрессо двойной', price: 260, image: '/images/drinks/espresso-1.jpg' },
      { id: 6, name: 'Царский чай', price: 340, image: '/images/drinks/tea-1.jpg' }
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

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const currentMenuItems = menuItems[bar.id] || [];

  return (
    <div className="main-container">
      {/* Top Navigation */}
      <div className="top-navigation">
        <div className="user-info-top">
          <span>Привет, {user.first_name}!</span>
          <span>{getTotalBonuses()} pts</span>
        </div>
        <div className="nav-buttons">
          <button onClick={onBack} className="profile-btn">
            ← Назад
          </button>
        </div>
      </div>

      <div className="main-container-content">
        {/* Sidebar - такая же как на главной странице */}
        <div className="loyalty-sidebar">
          <div className="sidebar-divider"></div>
          <div className="loyalty-logo">
            <div className="logo-circle">
              <img src="/images/logo.png" alt="Logo" />
            </div>
          </div>
          <h2 className="sidebar-title">Программа лояльности</h2>
          
          <div className="accordion-section">
            <button 
              className={`accordion-button ${expandedSection === 'earn' ? 'expanded' : ''}`}
              onClick={() => toggleSection('earn')}
            >
              <span>Как получить баллы?</span>
              <span className="accordion-icon">{expandedSection === 'earn' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'earn' && (
              <ul className="accordion-content">
                <li>Делайте заказы в наших барах</li>
                <li>Участвуйте в акциях</li>
                <li>Приводите друзей</li>
              </ul>
            )}
          </div>

          <div className="accordion-section">
            <button 
              className={`accordion-button ${expandedSection === 'spend' ? 'expanded' : ''}`}
              onClick={() => toggleSection('spend')}
            >
              <span>Как потратить баллы?</span>
              <span className="accordion-icon">{expandedSection === 'spend' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'spend' && (
              <ul className="accordion-content">
                <li>Скидки на напитки</li>
                <li>Бесплатные закуски</li>
                <li>Специальные предложения</li>
              </ul>
            )}
          </div>

          <div className="points-display">
            <span className="points-label">Ваши баллы:</span>
            <span className="points-value">{getTotalBonuses()}</span>
          </div>
        </div>

        {/* Main Content - информация о баре */}
        <div className="main-content">
          <h1 className="bar-detail-page-title">{bar.name}</h1>
          
          <div className="bar-detail-container">
            <div className="bar-detail-card">
              <div className="bar-detail-image-container">
                <img 
                  src={bar.image} 
                  alt={bar.name}
                  className="bar-detail-card-image"
                  onError={(e) => {
                    e.target.src = '/images/bars/placeholder.svg';
                  }}
                />
              </div>
              <div className="bar-detail-info">
                <p className="bar-detail-address">{bar.address}</p>
                <div className="bar-detail-description">
                  <p>Это место, где современные тренды сочетаются с традиционными европейскими стандартами. Здесь вас ждёт уютная атмосфера, качественная музыка и настоящие напитки.</p>
                </div>
                <div className="bar-detail-bonuses">
                  <span className="bar-bonuses-label">Ваши бонусы: </span>
                  <span className="bar-bonuses-value">{currentBonuses}</span>
                </div>
                <button className="bar-spend-button" onClick={handleSpendBonuses}>
                  Потратить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMenu && (
        <MenuModal
          items={currentMenuItems}
          currentBonuses={currentBonuses}
          onClose={() => setShowMenu(false)}
          onItemClick={handleMenuItemClick}
          barName={bar.name}
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