import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import Swal from 'sweetalert2';

const QRModal = ({ userId, barId, barName, itemId, itemName, itemPrice, onClose }) => {
  const [qrData, setQrData] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 минут
  const [lastTransactionTimestamp, setLastTransactionTimestamp] = useState(null);
  const pollingRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);

  useEffect(() => {
    // Получаем временную метку последней транзакции ПЕРЕД генерацией QR
    const fetchLastTransaction = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transactions/latest`, {
                headers: { 'x-session-token': localStorage.getItem('loyalty_token') }
            });
            if (response.ok && response.status !== 204) {
                const data = await response.json();
                setLastTransactionTimestamp(new Date(data.timestamp).getTime());
            }
        } catch (error) {
            console.error("Не удалось получить последнюю транзакцию:", error);
        }
    };
    fetchLastTransaction();
  }, []);

  useEffect(() => {
    // Генерируем данные для QR-кода
    const purchaseData = {
      type: 'spend', // тип операции - списание
      userId: userId,
      barId: barId,
      barName: barName,
      itemId: itemId,
      itemName: itemName,
      itemPrice: itemPrice,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 минут
    };

    // Правильное кодирование Unicode-строки в Base64
    const utf8Bytes = new TextEncoder().encode(JSON.stringify(purchaseData));
    const base64String = btoa(String.fromCharCode(...utf8Bytes));
    setQrData(base64String);
  }, [userId, barId, barName, itemId, itemName, itemPrice]);

  useEffect(() => {
    // Таймер обратного отсчета
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(pollingRef.current); // Останавливаем опрос при истечении
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Запускаем опрос только когда у нас есть временная метка
    if (lastTransactionTimestamp) {
        pollingRef.current = setInterval(async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transactions/latest`, {
                    headers: { 'x-session-token': localStorage.getItem('loyalty_token') }
                });

                if (response.ok && response.status !== 204) {
                    const latestTransaction = await response.json();
                    // Проверяем, что это новая транзакция списания
                    const transactionTime = new Date(latestTransaction.timestamp).getTime();
                    if (transactionTime > lastTransactionTimestamp && latestTransaction.type === 'spend') {
                        clearInterval(pollingRef.current);
                        Swal.fire({
                            title: 'Успешно!',
                            text: `Ваши баллы списаны, получите "${itemName}"`,
                            icon: 'success',
                            timer: 3000,
                            timerProgressBar: true,
                        }).then(() => {
                            onClose(); // Закрываем модальное окно ПОСЛЕ уведомления
                        });
                    }
                }
            } catch (error) {
                console.error("Ошибка опроса транзакции:", error);
            }
        }, 2000); // Опрос каждые 2 секунды
    }
    return () => clearInterval(pollingRef.current);
  }, [lastTransactionTimestamp, itemName, onClose]);

  useEffect(() => {
    // Закрытие по ESC
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearInterval(pollingRef.current);
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

  const emulatePurchase = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/dev/emulate-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('loyalty_token')
        },
        body: JSON.stringify({
          qrData: qrData
        })
      });

      const result = await response.json();

      if (response.ok) {
        setPurchaseResult({
          success: true,
          message: result.message,
          remainingPoints: result.remainingPoints
        });
        
        // Обновляем данные пользователя в localStorage если есть
        const userData = JSON.parse(localStorage.getItem('loyalty_user') || '{}');
        if (userData.barPoints) {
          userData.barPoints[barId.toString()] = result.remainingPoints;
          localStorage.setItem('loyalty_user', JSON.stringify(userData));
        }
        
        // Закрываем модал через 3 секунды после успешной покупки
        setTimeout(() => {
          onClose();
          // Перезагружаем страницу для обновления баллов
          window.location.reload();
        }, 3000);
      } else {
        setPurchaseResult({
          success: false,
          message: result.error || 'Ошибка при обработке покупки'
        });
      }
    } catch (error) {
      console.error('Error emulating purchase:', error);
      setPurchaseResult({
        success: false,
        message: 'Ошибка соединения с сервером'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="qr-header">
          <h2 className="qr-title">QR-код для покупки</h2>
          <button className="qr-close-button" onClick={() => { clearInterval(pollingRef.current); onClose(); }}>✕</button>
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
                    type: 'spend', // тип операции - списание
                    userId: userId,
                    barId: barId,
                    barName: barName,
                    itemId: itemId,
                    itemName: itemName,
                    itemPrice: itemPrice,
                    timestamp: Date.now(),
                    expiresAt: Date.now() + (5 * 60 * 1000)
                  };
                  // Правильное кодирование Unicode-строки в Base64
                  const utf8Bytes = new TextEncoder().encode(JSON.stringify(purchaseData));
                  const base64String = btoa(String.fromCharCode(...utf8Bytes));
                  setQrData(base64String);
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

        {/* Результат покупки */}
        {purchaseResult && (
          <div className={`purchase-result ${purchaseResult.success ? 'success' : 'error'}`}>
            <div className="result-icon">
              {purchaseResult.success ? '✅' : '❌'}
            </div>
            <div className="result-message">{purchaseResult.message}</div>
            {purchaseResult.success && (
              <div className="remaining-points">
                Осталось баллов: {purchaseResult.remainingPoints}
              </div>
            )}
          </div>
        )}

        <div className="qr-actions">
          {/* Кнопка эмуляции только в development */}
          {process.env.NODE_ENV === 'development' && !purchaseResult && !isExpired && (
            <button 
              className="emulate-purchase-btn" 
              onClick={emulatePurchase}
              disabled={isProcessing}
            >
              {isProcessing ? 'Обрабатываем...' : '🤖 Эмулировать покупку'}
            </button>
          )}
          
          <button 
            className="qr-cancel-btn" 
            onClick={() => { clearInterval(pollingRef.current); onClose(); }}
            disabled={isProcessing}
          >
            {purchaseResult?.success ? 'Закрыть' : 'Отменить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal; 