import React, { useEffect } from 'react';
import '../styles/BarLoyalty.css';

const MenuModal = ({ items, currentBonuses, onClose, onItemClick }) => {
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
    <div className="menu-modal" onClick={onClose}>
      <div className="menu-content" onClick={(e) => e.stopPropagation()}>
        <div className="menu-header">
          <h2 className="menu-title">Меню</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="menu-items">
          {items.map(item => (
            <div
              key={item.id}
              className={`menu-item ${currentBonuses < item.price ? 'insufficient-funds' : ''}`}
              onClick={() => currentBonuses >= item.price && onItemClick(item)}
            >
              <div className="menu-item-name">{item.name}</div>
              <div className="menu-item-price">{item.price} бонусов</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuModal; 