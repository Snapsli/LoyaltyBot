import React, { useState } from 'react';
import MenuModal from './MenuModal';
import QRModal from './QRModal';
import EarnQRModal from './EarnQRModal';

// Helper functions for bars and points (same as in App.js)
const BAR_NAMES = {
  1: "Культура",
  2: "Caballitos Mexican Bar", 
  3: "Fonoteca - Listening Bar",
  4: "Tchaikovsky"
};

const getUserBarPoints = (user, barId) => {
  if (!user || !user.barPoints) return 0;
  // Try both string and numeric keys for compatibility
  return user.barPoints[barId.toString()] || user.barPoints[barId] || 0;
};

const getTotalUserPoints = (user) => {
  if (!user || !user.barPoints) return 0;
  const barPoints = user.barPoints;
  return Object.values(barPoints).reduce((total, points) => total + (points || 0), 0);
};

const BarDetail = ({ bar, user, onBack, onRefreshUser }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEarnQRModal, setShowEarnQRModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [barData, setBarData] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Получаем баллы пользователя для этого бара
  const getCurrentBarPoints = () => {
    return getUserBarPoints(user, bar.id);
  };

  const handleSpendBonuses = () => {
    setShowMenu(true);
  };

  const handleEarnBonuses = () => {
    setShowEarnQRModal(true);
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowMenu(false);
    setShowQRModal(true);
  };

  const handleCloseQR = () => {
    setShowQRModal(false);
    setSelectedItem(null);
    if (onRefreshUser) onRefreshUser();
  };

  const handleCloseEarnQR = () => {
    setShowEarnQRModal(false);
    if (onRefreshUser) onRefreshUser();
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
          <span>{getTotalUserPoints(user)} pts</span>
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
            <span className="points-label">Баллы по заведениям:</span>
            <div className="bars-points-list">
              {Object.entries(BAR_NAMES).map(([barId, barName]) => (
                <div key={barId} className="bar-points-item">
                  <span className="bar-name">{barName}:</span>
                  <span className="bar-points">{getUserBarPoints(user, barId)}</span>
                </div>
              ))}
            </div>
            <div className="total-points-summary">
              <span className="points-label">Общий итог:</span>
              <span className="points-value">{getTotalUserPoints(user)}</span>
            </div>
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
                  <span className="bar-bonuses-label">Ваши бонусы в {bar.name}: </span>
                  <span className="bar-bonuses-value">{getCurrentBarPoints()}</span>
                </div>
                <div className="bar-action-buttons">
                  <button className="bar-spend-button" onClick={handleSpendBonuses}>
                    Потратить
                  </button>
                  <button className="bar-earn-button" onClick={handleEarnBonuses}>
                    Копить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMenu && (
        <MenuModal
          items={menuItems}
          currentBonuses={getCurrentBarPoints()}
          onClose={() => setShowMenu(false)}
          onItemClick={handleItemClick}
          barName={bar.name}
        />
      )}

      {showQRModal && selectedItem && (
        <QRModal
          userId={user._id || user.id}
          barId={bar.id}
          barName={bar.name}
          itemId={selectedItem._id || selectedItem.id}
          itemName={selectedItem.name}
          itemPrice={selectedItem.price}
          onClose={handleCloseQR}
        />
      )}

      {showEarnQRModal && (
        <EarnQRModal
          userId={user._id || user.id}
          barId={bar.id}
          barName={bar.name}
          onClose={handleCloseEarnQR}
        />
      )}
    </div>
  );
};

export default BarDetail; 