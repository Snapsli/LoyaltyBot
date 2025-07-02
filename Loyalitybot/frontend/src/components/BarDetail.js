import React, { useState } from 'react';
import MenuModal from './MenuModal';

const BarDetail = ({ bar, user, onBack }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(user?.balance || 0);
  const [barData, setBarData] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Получаем общий баланс пользователя
  const getTotalBonuses = () => {
    return currentBalance;
  };

  const handleSpendBonuses = () => {
    setShowMenu(true);
  };

  React.useEffect(() => {
    loadBarData();
  }, [bar.id]);

  const loadBarData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/bars/${bar.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setBarData(data);
        setMenuItems(data.menu || []);
      } else {
        // Если бар не найден в БД, используем данные по умолчанию
        setBarData(bar);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error loading bar data:', error);
      setBarData(bar);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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
          
          <div className="points-display">
            <span className="points-label">Все баллы по заведениям:</span>
            <span className="points-value">{getTotalBonuses()}</span>
          </div>

          <div className="accordion-section faq-section">
            <button 
              className={`accordion-button faq-button ${expandedSection === 'faq' ? 'expanded' : ''}`}
              onClick={() => toggleSection('faq')}
            >
              <span>❓ FAQ</span>
              <span className="accordion-icon">{expandedSection === 'faq' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'faq' && (
              <div className="accordion-content faq-content">
                <div className="faq-item">
                  <h4>Как получить баллы?</h4>
                  <ul>
                    <li>Делайте заказы в наших барах</li>
                    <li>Участвуйте в акциях</li>
                    <li>Приводите друзей</li>
                  </ul>
                </div>
                <div className="faq-item">
                  <h4>Как потратить баллы?</h4>
                  <ul>
                    <li>Скидки на напитки</li>
                    <li>Бесплатные закуски</li>
                    <li>Специальные предложения</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - информация о баре */}
        <div className="main-content">
          <h1 className="bar-detail-page-title">{bar.name}</h1>
          
          <div className="bar-detail-container">
            <div className="bar-detail-card">
              <div className="bar-detail-image-container">
                <img 
                  src={barData?.image || bar.image} 
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
                  {loading ? (
                    <p>Загрузка описания...</p>
                  ) : (
                    <p>{barData?.description || 'Описание бара будет добавлено администратором.'}</p>
                  )}
                </div>
                <div className="bar-detail-bonuses">
                  <span className="bar-bonuses-label">Ваши бонусы: </span>
                  <span className="bar-bonuses-value">{currentBalance}</span>
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
          items={menuItems}
          currentBonuses={currentBalance}
          onClose={() => setShowMenu(false)}
          onItemClick={(item) => {
            // TODO: Реализовать покупку товара
            console.log('Purchasing item:', item);
          }}
          barName={bar.name}
        />
      )}
    </div>
  );
};

export default BarDetail; 