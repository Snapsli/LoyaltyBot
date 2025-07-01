import React, { useEffect } from 'react';

const MenuModal = ({ items, currentBonuses, onClose, onItemClick, barName }) => {
  useEffect(() => {
    // Закрытие по клавише ESC на мобильных клавиатурах
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div className="menu-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="menu-header">
          <h1 className="menu-title">{barName}</h1>
          <button className="menu-close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="menu-bonuses-info">
          <span className="menu-bonuses-text">Ваши бонусы: {currentBonuses}</span>
        </div>
        
        <div className="menu-items-grid">
          {items.map(item => (
            <div key={item.id} className="menu-item-card">
              <div className="menu-item-image-container">
                <img 
                  src='/images/drinks/tapas-1.jpg.png'
                  alt={item.name}
                  className="menu-item-image"
                  onError={(e) => {
                    e.target.src = '/images/drinks/placeholder-drink.svg';
                  }}
                />
              </div>
              <div className="menu-item-info">
                <h3 className="menu-item-name">{item.name}</h3>
                <div className="menu-item-price">{item.price} баллов</div>
                <button 
                  className={`menu-item-button ${currentBonuses < item.price ? 'insufficient-funds' : ''}`}
                  onClick={() => currentBonuses >= item.price && onItemClick(item)}
                  disabled={currentBonuses < item.price}
                >
                  Потратить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuModal; 