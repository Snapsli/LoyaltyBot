import React, { useEffect, useState } from 'react';
import '../styles/BarLoyalty.css';

// Динамический импорт QRCode для избежания ошибок сборки
let QRCode = null;
try {
  QRCode = require('qrcode');
} catch (error) {
  console.warn('QRCode library not available, using fallback');
}

const QRModal = ({ item, onClose, onEmulate }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    // Закрытие по клавише ESC
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    // Генерируем настоящий QR-код
    const generateQRCode = async () => {
      try {
        const qrData = JSON.stringify({
          type: 'BONUS_PAYMENT',
          itemId: item.id,
          itemName: item.name,
          price: item.price,
          timestamp: Date.now(),
          transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`
        });
        
        if (QRCode) {
          const url = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            width: 280
          });
          
          setQrCodeUrl(url);
        } else {
          // Fallback - создаем простой QR-код через онлайн API
          const encodedData = encodeURIComponent(qrData);
          const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodedData}`;
          setQrCodeUrl(fallbackUrl);
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
        // Fallback на случай ошибки
        const simpleData = `Bonus payment: ${item.name} - ${item.price} points`;
        const encodedData = encodeURIComponent(simpleData);
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodedData}`;
        setQrCodeUrl(fallbackUrl);
      }
    };

    generateQRCode();
  }, [item]);

  return (
    <div className="qr-modal" onClick={onClose}>
      <div className="qr-content" onClick={(e) => e.stopPropagation()}>
        <h2>Потратить бонусы</h2>
        <p><strong>{item.name}</strong></p>
        <p>{item.price} бонусов</p>
        
        <div className="qr-code">
          {qrCodeUrl ? (
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div className="qr-loading">
              Генерация QR-кода...
            </div>
          )}
        </div>
        
        <p className="qr-text">Покажите QR бармену</p>
        
        <button className="emulate-button" onClick={onEmulate}>
          Эмулировать
        </button>
      </div>
    </div>
  );
};

export default QRModal; 