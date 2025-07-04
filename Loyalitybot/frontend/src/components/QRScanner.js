// This file will contain the QR Scanner component.
import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import '../styles/QRScanner.css';

const QRScanner = ({ bars, onClose }) => {
  const [step, setStep] = useState(2); // Start directly at step 2 (scanning)
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [processResult, setProcessResult] = useState(null);

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

  useEffect(() => {
    if (step !== 2) {
      return;
    }

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 5,
      },
      false // verbose
    );

    const onScanSuccess = (decodedText, decodedResult) => {
      scanner.clear();
      try {
        const parsedData = JSON.parse(decodedText);
        
        // Validation
        if (!parsedData.userId || !parsedData.barId || !parsedData.type) {
            throw new Error("Неверный формат QR-кода.");
        }

        // No longer need to check against selectedBar, as we don't have one at this stage.
        // The backend will handle the logic based on the barId from the QR code.

        if (parsedData.expiresAt && Date.now() > parsedData.expiresAt) {
            throw new Error("Срок действия QR-кода истек.");
        }

        fetchUserName(parsedData.userId); // Fetch user name
        setScannedData(parsedData);
        setError(null);
        setStep(3);

      } catch (e) {
        setError(e.message || "Ошибка чтения QR-кода. Это не код системы лояльности.");
        // Возвращаемся к сканеру, чтобы пользователь мог попробовать еще раз
        setStep(2); 
      }
    };

    const onScanFailure = (error) => {
      // console.warn(`Code scan error = ${error}`);
    };
    
    scanner.render(onScanSuccess, onScanFailure);

    return () => {
        // cleanup function
        if (scanner) {
            scanner.clear().catch(error => {
                console.error("Failed to clear html5-qrcode-scanner.", error);
            });
        }
    };
  }, [step]);

  const handleBack = () => {
    // Since we start at step 2, back always closes the modal
    onClose();
  };

  const handleSpend = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/process-spend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('loyalty_token'),
        },
        body: JSON.stringify({ qrData: scannedData }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ошибка при списании');
      setProcessResult({ success: true, message: result.message });
    } catch (e) {
      setProcessResult({ success: false, message: e.message });
    } finally {
      setIsProcessing(false);
      setStep(4); // Go to final result step
    }
  };

  const handleEarn = async () => {
    if (!purchaseAmount || isNaN(purchaseAmount) || Number(purchaseAmount) <= 0) {
        setError('Введите корректную сумму чека.');
        return;
    }
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/process-earn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('loyalty_token'),
        },
        body: JSON.stringify({ qrData: scannedData, purchaseAmount: Number(purchaseAmount) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ошибка при начислении');
      setProcessResult({ success: true, message: result.message });
    } catch (e) {
      setProcessResult({ success: false, message: e.message });
    } finally {
      setIsProcessing(false);
      setStep(4); // Go to final result step
    }
  };

  const renderContent = () => {
    if (error) {
      return (
          <div className="error-container">
              <h3>Ошибка</h3>
              <p className="error-message">{error}</p>
              <button className="back-button" onClick={() => { setError(null); setStep(2); }}>Попробовать еще раз</button>
          </div>
      )
    }

    switch (step) {
      case 2:
        return (
          <div className="scanner-container">
            <h3>Сканируйте QR-код клиента</h3>
            <div id="qr-reader" style={{ width: '100%' }}></div>
            <p className="scanner-instruction">Наведите камеру на QR-код</p>
          </div>
        );
      case 3:
        if (!scannedData) return null; // Should not happen
        return (
          <div className="confirmation-container">
            <h3>Шаг 2: Подтверждение ({scannedData.type === 'earn' ? 'Начисление' : 'Списание'})</h3>
            <div className="scan-details">
              <p><strong>Заведение:</strong> {scannedData.barName || `Бар #${scannedData.barId}`}</p>
              <p><strong>Клиент:</strong> {userName || 'Загрузка...'}</p>
              {scannedData.type === 'spend' && (
                <>
                  <p><strong>Покупка:</strong> {scannedData.itemName}</p>
                  <p><strong>Стоимость:</strong> {scannedData.itemPrice} баллов</p>
                </>
              )}
              {scannedData.type === 'earn' && (
                <div className="purchase-amount-input">
                  <input
                    type="number"
                    placeholder="Сумма чека в рублях"
                    value={purchaseAmount}
                    onChange={(e) => { setPurchaseAmount(e.target.value); setError(null); }}
                    disabled={isProcessing}
                  />
                </div>
              )}
            </div>
            {error && <p className="inline-error-message">{error}</p>}
            <button 
              className="confirm-button" 
              onClick={scannedData.type === 'earn' ? handleEarn : handleSpend}
              disabled={isProcessing}
            >
              {isProcessing ? 'Обработка...' : `Подтвердить ${scannedData.type === 'earn' ? 'начисление' : 'списание'}`}
            </button>
          </div>
        );
      case 4: // Final result screen
        return (
            <div className={`final-result ${processResult.success ? 'success' : 'error'}`}>
                <h3>{processResult.success ? 'Успешно' : 'Ошибка'}</h3>
                <p>{processResult.message}</p>
                <button className="rescan-button" onClick={() => { setStep(2); setProcessResult(null); }}>Сканировать еще</button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="qr-scanner-overlay" onClick={onClose}>
      <div className="qr-scanner-content" onClick={(e) => e.stopPropagation()}>
        <div className="qr-scanner-header">
          <h2>Сканер QR-кода</h2>
          <button onClick={handleBack} className="back-button">
            {'✕ Закрыть'}
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default QRScanner; 