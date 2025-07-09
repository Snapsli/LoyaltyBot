import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import Swal from 'sweetalert2';

const EarnQRModal = ({ userId, barId, barName, onClose }) => {
  const [qrData, setQrData] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 минут
  const [isProcessing, setIsProcessing] = useState(false);
  const [earnResult, setEarnResult] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [barSettings, setBarSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [lastTransactionTimestamp, setLastTransactionTimestamp] = useState(null);
  const pollingRef = useRef(null);

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
            } else {
                // Если транзакций нет, устанавливаем базовое значение
                setLastTransactionTimestamp(0);
            }
        } catch (error) {
            console.error("Не удалось получить последнюю транзакцию:", error);
            setLastTransactionTimestamp(0); // Устанавливаем базовое значение при ошибке
        }
    };
    fetchLastTransaction();
  }, []);

  useEffect(() => {
    // Загружаем настройки каждый раз при открытии модала
    loadBarSettings();
  }, [barId]);

  // Перезагрузка настроек каждые 10 секунд для актуальности
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loadingSettings) {
        loadBarSettings();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [loadingSettings]);

  useEffect(() => {
    if (barSettings) {
      // Генерируем данные для QR-кода накопления только после загрузки настроек
      const earnData = {
        type: 'earn', // тип операции - накопление
        userId: userId,
        barId: barId,
        barName: barName,
        timestamp: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000) // 5 минут
      };

      // Правильное кодирование Unicode-строки в Base64
      const utf8Bytes = new TextEncoder().encode(JSON.stringify(earnData));
      const base64String = btoa(String.fromCharCode(...utf8Bytes));
      setQrData(base64String);
    }
  }, [userId, barId, barName, barSettings]);

  const loadBarSettings = async () => {
    try {
      setLoadingSettings(true);
      
      // Принудительная очистка кэша - добавляем timestamp к URL
      const timestamp = new Date().getTime();
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/points-settings?t=${timestamp}`, {
        headers: {
          'x-session-token': localStorage.getItem('loyalty_token')
        }
      });

      if (response.ok) {
        const allSettings = await response.json();
        const currentBarSettings = allSettings[barId.toString()];
        setBarSettings(currentBarSettings);
        
        // Отладочная информация в development
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Loaded bar settings for bar', barId, ':', currentBarSettings);
          console.log('📊 All settings:', allSettings);
        }
      } else {
        console.error('Failed to load bar settings');
        // Используем настройки по умолчанию
        setBarSettings({ pointsPerRuble: 0.01, minPurchase: 0, isActive: true });
      }
    } catch (error) {
      console.error('Error loading bar settings:', error);
      // Используем настройки по умолчанию
      setBarSettings({ pointsPerRuble: 0.01, minPurchase: 0, isActive: true });
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    // Таймер обратного отсчета
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(pollingRef.current);
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
                      
                      const transactionTime = new Date(latestTransaction.timestamp).getTime();
                      if (transactionTime > lastTransactionTimestamp && latestTransaction.type === 'earn') {
                          clearInterval(pollingRef.current);
                          Swal.fire({
                              title: 'Успешно!',
                              text: `Вам начислено ${latestTransaction.points} баллов!`,
                              icon: 'success',
                              timer: 3000,
                              timerProgressBar: true,
                          }).then(() => {
                            onClose(); 
                          });
                      }
                  }
              } catch (error) {
                  console.error("Ошибка опроса транзакции:", error);
              }
          }, 2000); 
      }
      return () => clearInterval(pollingRef.current);
  }, [lastTransactionTimestamp, onClose]);

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

  const generateNewQR = () => {
    setTimeLeft(300);
    setIsExpired(false);
    setEarnResult(null);
    // Перезагружаем настройки перед генерацией нового QR кода
    loadBarSettings();
    // Сбрасываем и получаем последнюю транзакцию снова
    const fetchLastTransaction = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transactions/latest`, {
                headers: { 'x-session-token': localStorage.getItem('loyalty_token') }
            });
            if (response.ok && response.status !== 204) {
                const data = await response.json();
                setLastTransactionTimestamp(new Date(data.timestamp).getTime());
            } else {
                setLastTransactionTimestamp(0);
            }
        } catch (error) {
            console.error("Не удалось получить последнюю транзакцию:", error);
            setLastTransactionTimestamp(0);
        }
    };
    fetchLastTransaction();
    
    const earnData = {
      type: 'earn',
      userId: userId,
      barId: barId,
      barName: barName,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000)
    };
    // Правильное кодирование Unicode-строки в Base64
    const utf8Bytes = new TextEncoder().encode(JSON.stringify(earnData));
    const base64String = btoa(String.fromCharCode(...utf8Bytes));
    setQrData(base64String);
  };

  const emulateEarnPoints = async () => {
    if (!purchaseAmount || isNaN(purchaseAmount) || Number(purchaseAmount) <= 0) {
      setEarnResult({
        success: false,
        message: 'Введите корректную сумму покупки'
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/dev/emulate-earn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('loyalty_token')
        },
        body: JSON.stringify({
          qrData: qrData,
          purchaseAmount: Number(purchaseAmount)
        })
      });

      const result = await response.json();

      if (response.ok) {
        setEarnResult({
          success: true,
          message: result.message,
          pointsEarned: result.transaction.pointsEarned,
          newTotalPoints: result.newTotalPoints
        });
        
        // Обновляем данные пользователя в localStorage если есть
        const userData = JSON.parse(localStorage.getItem('loyalty_user') || '{}');
        if (userData.barPoints) {
          userData.barPoints[barId.toString()] = result.newTotalPoints;
          localStorage.setItem('loyalty_user', JSON.stringify(userData));
        }
        
        // Закрываем модал через 3 секунды после успешного начисления
        setTimeout(() => {
          onClose();
          // Перезагружаем страницу для обновления баллов
          window.location.reload();
        }, 3000);
      } else {
        setEarnResult({
          success: false,
          message: result.error || 'Ошибка при обработке начисления баллов'
        });
      }
    } catch (error) {
      console.error('Error emulating earn points:', error);
      setEarnResult({
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
          <h2 className="qr-title">QR-код для накопления баллов</h2>
          <button className="qr-close-button" onClick={() => { clearInterval(pollingRef.current); onClose(); }}>✕</button>
        </div>
        
        <div className="qr-item-info">
          <h3 className="qr-item-name">Накопление баллов</h3>
          <p className="qr-bar-name">Заведение: {barName}</p>
          {loadingSettings ? (
            <p className="qr-earn-description">Загрузка настроек...</p>
          ) : barSettings && !barSettings.isActive ? (
            <p className="qr-earn-description" style={{ color: '#dc3545' }}>
              ⚠️ Программа лояльности временно отключена для этого заведения
            </p>
          ) : barSettings ? (
            <div>
              <p className="qr-earn-description">
                Покажите этот QR-код бармену при оплате счета для начисления баллов
              </p>
                                            <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: '8px' }}>
                 <div>Курс: {Math.round(1/barSettings.pointsPerRuble)} ₽ = 1 балл</div>
                 {Number(barSettings.minPurchase) > 0 && (
                   <div>Минимальная сумма: {Number(barSettings.minPurchase)} ₽</div>
                 )}
               </div>
            </div>
          ) : (
            <p className="qr-earn-description">
              Покажите этот QR-код бармену при оплате счета для начисления баллов
            </p>
          )}
        </div>

        <div className="qr-code-container">
          {loadingSettings ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div>Загрузка...</div>
            </div>
          ) : barSettings && !barSettings.isActive ? (
            <div className="qr-expired">
              <div className="expired-icon">⚠️</div>
              <h3 className="expired-title">Программа лояльности отключена</h3>
              <p className="expired-message">
                Накопление баллов для этого заведения временно недоступно
              </p>
            </div>
          ) : !isExpired ? (
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
                Пожалуйста, сгенерируйте новый QR-код для накопления баллов
              </p>
              <button 
                className="generate-new-qr-btn"
                onClick={generateNewQR}
              >
                Сгенерировать новый QR-код
              </button>
            </div>
          )}
        </div>

        {barSettings && barSettings.isActive && (
          <div className="qr-instructions">
            <h4>Инструкция:</h4>
            <ol>
              <li>Покажите этот QR-код бармену</li>
              <li>Оплатите ваш счет</li>
              <li>Бармен отсканирует код для начисления баллов</li>
              <li>Баллы автоматически добавятся на ваш счет!</li>
            </ol>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
              {barSettings ? 
                `1 балл = ${Math.round(1/barSettings.pointsPerRuble)} рублей` : 
                '1 балл = 100 рублей'
              }
              {barSettings && Number(barSettings.minPurchase) > 0 && (
                <><br/>Минимальная сумма покупки: {Number(barSettings.minPurchase)} ₽</>
              )}
            </p>
          </div>
        )}

        {/* Результат начисления */}
        {earnResult && (
          <div className={`purchase-result ${earnResult.success ? 'success' : 'error'}`}>
            <div className="result-icon">
              {earnResult.success ? '✅' : '❌'}
            </div>
            <div className="result-message">{earnResult.message}</div>
            {earnResult.success && (
              <div className="earned-points">
                Начислено баллов: +{earnResult.pointsEarned}<br/>
                Всего баллов в заведении: {earnResult.newTotalPoints}
              </div>
            )}
          </div>
        )}

        {/* Отладочная панель в development */}
        {process.env.NODE_ENV === 'development' && barSettings && (
          <div style={{ 
            background: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '4px', 
            padding: '10px', 
            marginBottom: '15px',
            fontSize: '12px'
          }}>
            <strong>🔧 Debug (настройки бара {barId}):</strong>
            <div>pointsPerRuble: {barSettings.pointsPerRuble}</div>
            <div>minPurchase: {barSettings.minPurchase} (type: {typeof barSettings.minPurchase})</div>
            <div>isActive: {barSettings.isActive ? 'true' : 'false'}</div>
            <div>Курс: {Math.round(1/barSettings.pointsPerRuble)} ₽ = 1 балл</div>
          </div>
        )}

        <div className="qr-actions">
          {/* Кнопки для отладки в development */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ marginBottom: '10px' }}>
              <button 
                onClick={loadBarSettings}
                disabled={loadingSettings}
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '12px', 
                  marginRight: '5px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {loadingSettings ? 'Загрузка...' : '🔄 Обновить'}
              </button>
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/dev/points-settings-debug`);
                    const data = await response.json();
                    console.log('🔍 DEBUG: Server settings state:', data);
                    alert(`Настройки сервера:\n${JSON.stringify(data.currentSettings, null, 2)}`);
                  } catch (error) {
                    console.error('Error fetching debug info:', error);
                  }
                }}
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '12px',
                  background: '#ffc107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔍 Debug сервер
              </button>
            </div>
          )}
          
          {/* Эмуляция только в development */}
          {process.env.NODE_ENV === 'development' && !earnResult && !isExpired && barSettings && barSettings.isActive && (
            <div className="earn-emulation">
              <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Тестирование (только для разработки):</h4>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <input
                  type="number"
                  placeholder="Сумма покупки (₽)"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '150px'
                  }}
                />
                <button
                  className="emulate-purchase-btn"
                  onClick={emulateEarnPoints}
                  disabled={isProcessing}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  {isProcessing ? 'Обработка...' : 'Начислить баллы'}
                </button>
              </div>
            </div>
          )}
          
          <button 
            className="qr-cancel-btn"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default EarnQRModal; 