import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import './../styles/QRScanner.css'; // Мы создадим этот файл в следующем шаге

const QRScanner = ({ bars, onClose }) => {
  const [selectedBarId, setSelectedBarId] = useState('');
  const [selectedBarName, setSelectedBarName] = useState(''); // Состояние для имени бара
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [userName, setUserName] = useState('');

  const handleBarSelect = (barId, barName) => {
    setSelectedBarId(barId);
    setSelectedBarName(barName);
    setError(null); // Сбрасываем ошибки при выборе
  };

  const handleDecode = (result) => {
    console.log('Отсканированные данные:', result);
    try {
      const parsedData = JSON.parse(result);
      
      // Проверка на срок действия QR-кода
      if (parsedData.expiresAt && Date.now() > parsedData.expiresAt) {
        setError('QR-код истек. Попросите клиента сгенерировать новый.');
        setScannedData(null);
        return;
      }

      // Проверка, что QR-код для текущего бара
      if (String(parsedData.barId) !== String(selectedBarId)) {
          setError(`Этот QR-код от другого заведения. (Ожидался ID: ${selectedBarId}, получен: ${parsedData.barId})`);
          setScannedData(null);
          return;
      }

      setScannedData(parsedData);
      setError(null);
      // Получаем имя пользователя после успешного сканирования
      fetchUserName(parsedData.userId);
    } catch (e) {
      console.error("Ошибка парсинга QR-кода:", e);
      setError('Неверный формат QR-кода. Это не код системы лояльности.');
      setScannedData(null);
    }
  };

  const handleError = (error) => {
    console.error('Ошибка камеры:', error);
    if (error?.name === 'NotAllowedError') {
      setError('Доступ к камере заблокирован. Пожалуйста, разрешите доступ в настройках браузера.');
    } else {
      setError('Не удалось получить доступ к камере. Убедитесь, что она не используется другим приложением.');
    }
  };

  const fetchUserName = async (userId) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/user-info/${userId}`, {
            headers: { 'x-session-token': localStorage.getItem('loyalty_token') }
        });
        if (response.ok) {
            const data = await response.json();
            setUserName(data.name);
        } else {
            setUserName('Неизвестный пользователь');
        }
    } catch (e) {
        setUserName('Не удалось загрузить имя');
    }
  };

  const handleSpend = async () => {
    setIsProcessing(true);
    setProcessResult(null);
    try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/process-spend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-token': localStorage.getItem('loyalty_token'),
            },
            body: JSON.stringify({ qrData: scannedData })
        });
        const result = await response.json();
        if (response.ok) {
            setProcessResult({ success: true, message: result.message });
        } else {
            setProcessResult({ success: false, message: result.error || 'Ошибка при списании' });
        }
    } catch (e) {
        setProcessResult({ success: false, message: 'Ошибка сети' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleEarn = async () => {
    if (!purchaseAmount || isNaN(purchaseAmount) || Number(purchaseAmount) <= 0) {
        setError('Введите корректную сумму чека.');
        return;
    }
    setError(null);
    setIsProcessing(true);
    setProcessResult(null);
    try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/process-earn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-token': localStorage.getItem('loyalty_token'),
            },
            body: JSON.stringify({ qrData: scannedData, purchaseAmount: Number(purchaseAmount) })
        });
        const result = await response.json();
        if (response.ok) {
            setProcessResult({ success: true, message: result.message });
        } else {
            setProcessResult({ success: false, message: result.error || 'Ошибка при начислении' });
        }
    } catch (e) {
        setProcessResult({ success: false, message: 'Ошибка сети' });
    } finally {
        setIsProcessing(false);
    }
  };

  const resetScanner = (keepBarSelection = false) => {
    setScannedData(null);
    setError(null);
    setIsProcessing(false);
    setProcessResult(null);
    setPurchaseAmount('');
    setUserName('');
    if (!keepBarSelection) {
      setSelectedBarId('');
      setSelectedBarName('');
    }
  };

  const renderContent = () => {
    if (!selectedBarId) {
      return (
        <div className="bar-selection-container">
          <h3>Выберите заведение</h3>
          <div className="bar-buttons-grid">
            {bars.map(bar => (
              <button 
                key={bar._id} 
                className="bar-select-button"
                onClick={() => handleBarSelect(bar._id, bar.name)}
              >
                {bar.name}
              </button>
            ))}
          </div>
        </div>
      );
    }
    
    if (processResult) {
      return (
          <div className={`final-result ${processResult.success ? 'success' : 'error'}`}>
              <p>{processResult.message}</p>
              <button className="rescan-button" onClick={() => resetScanner(true)}>Сканировать для "{selectedBarName}" еще</button>
          </div>
      );
    }

    if (!scannedData) {
      return (
        <div className="scanner-container">
          <Scanner
            onScan={handleDecode}
            onError={handleError}
            components={{ audio: false, finder: true }}
            styles={{ finder: { borderColor: 'white' } }}
          />
          <p className="scanner-instruction">Наведите камеру на QR-код клиента</p>
        </div>
      );
    }

    if (scannedData.type === 'spend') {
        return (
            <div className="scan-result-container">
                <h3>Подтверждение списания</h3>
                <div className="scan-result-info">
                    <p><strong>Клиент:</strong> {userName || 'Загрузка...'}</p>
                    <p><strong>Покупка:</strong> {scannedData.itemName}</p>
                    <p><strong>Стоимость:</strong> {scannedData.itemPrice} баллов</p>
                </div>
                <div className="scan-actions">
                    <button className="confirm-button" onClick={handleSpend} disabled={isProcessing}>
                        {isProcessing ? 'Обработка...' : 'Подтвердить списание'}
                    </button>
                    <button className="rescan-button" onClick={() => resetScanner(true)} disabled={isProcessing}>Отмена</button>
                </div>
            </div>
        );
    }

    if (scannedData.type === 'earn') {
        return (
            <div className="scan-result-container">
                <h3>Начисление баллов</h3>
                <div className="scan-result-info">
                    <p><strong>Клиент:</strong> {userName || 'Загрузка...'}</p>
                </div>
                <div className="scan-actions">
                    <input
                        type="number"
                        placeholder="Введите сумму чека в рублях"
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                        disabled={isProcessing}
                    />
                    <button className="confirm-button" onClick={handleEarn} disabled={isProcessing}>
                        {isProcessing ? 'Обработка...' : 'Начислить баллы'}
                    </button>
                    <button className="rescan-button" onClick={() => resetScanner(true)} disabled={isProcessing}>Отмена</button>
                </div>
            </div>
        );
    }

    return (
        <div className="scan-result-container">
            <h3>Неизвестный тип QR-кода</h3>
            <button className="rescan-button" onClick={() => resetScanner(true)}>Сканировать еще</button>
        </div>
    );
  };

  return (
    <div className="qr-scanner-overlay" onClick={!isProcessing ? onClose : undefined}>
      <div className="qr-scanner-content" onClick={(e) => e.stopPropagation()}>
        <div className="qr-scanner-header">
          <h2>{selectedBarName ? `Сканер: ${selectedBarName}` : 'Сканер QR-кода'}</h2>
          <button onClick={!isProcessing ? () => resetScanner() : undefined} className="close-button" disabled={isProcessing}>
            {selectedBarId ? '‹ Назад' : '✕'}
          </button>
        </div>
        
        {renderContent()}
        
        {error && <p className="error-message">{error}</p>}
        
      </div>
    </div>
  );
};

export default QRScanner; 