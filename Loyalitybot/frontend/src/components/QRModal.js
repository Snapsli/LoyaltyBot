import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

const QRModal = ({ userId, barId, barName, itemId, itemName, itemPrice, onClose }) => {
  const [qrData, setQrData] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 минут

  useEffect(() => {
    // Генерируем данные для QR-кода
    const purchaseData = {
      userId: userId,
      barId: barId,
      itemId: itemId,
      itemName: itemName,
      itemPrice: itemPrice,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 минут
    };

    setQrData(JSON.stringify(purchaseData));
  }, [userId, barId, itemId, itemName, itemPrice]);

  useEffect(() => {
    // Таймер обратного отсчета
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Закрытие по ESC
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="qr-header">
          <h2 className="qr-title">QR-код для покупки</h2>
          <button className="qr-close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="qr-item-info">
          <h3 className="qr-item-name">{itemName}</h3>
          <p className="qr-item-price">{itemPrice} баллов</p>
          <p className="qr-bar-name">Заведение: {barName}</p>
        </div>

        <div className="qr-code-container">
          {!isExpired ? (
            <>
              <QRCode
                value={qrData}
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
              <div className="qr-timer">
                <span className="timer-label">QR-код действителен:</span>
                <span className={`timer-value ${timeLeft < 60 ? 'warning' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </>
          ) : (
            <div className="qr-expired">
              <div className="expired-icon">⏰</div>
              <h3 className="expired-title">QR-код истек</h3>
              <p className="expired-message">
                Пожалуйста, сгенерируйте новый QR-код для покупки
              </p>
              <button 
                className="generate-new-qr-btn"
                onClick={() => {
                  setTimeLeft(300);
                  setIsExpired(false);
                  const purchaseData = {
                    userId: userId,
                    barId: barId,
                    itemId: itemId,
                    itemName: itemName,
                    itemPrice: itemPrice,
                    timestamp: Date.now(),
                    expiresAt: Date.now() + (5 * 60 * 1000)
                  };
                  setQrData(JSON.stringify(purchaseData));
                }}
              >
                Сгенерировать новый QR-код
              </button>
            </div>
          )}
        </div>

        <div className="qr-instructions">
          <h4>Инструкция:</h4>
          <ol>
            <li>Покажите этот QR-код бармену</li>
            <li>Бармен отсканирует код своим устройством</li>
            <li>Баллы спишутся автоматически</li>
            <li>Получите свой заказ!</li>
          </ol>
        </div>

        <div className="qr-actions">
          <button className="qr-cancel-btn" onClick={onClose}>
            Отменить
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal; 