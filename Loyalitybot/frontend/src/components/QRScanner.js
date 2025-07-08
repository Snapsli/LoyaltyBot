// This file will contain the QR Scanner component.
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import '../styles/QRScanner.css';

const QRScanner = ({ bars, onClose }) => {
  const [step, setStep] = useState(2); // Start directly at step 2 (scanning)
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [processResult, setProcessResult] = useState(null);

  const html5QrCodeRef = useRef(null);
  const readerId = "qr-reader"; // ID for the scanner element

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

  const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      try {
        const parsedData = JSON.parse(decodedText);
        
        if (!parsedData.userId || !parsedData.barId || !parsedData.type) {
            throw new Error("Неверный формат QR-кода.");
        }

        if (parsedData.expiresAt && Date.now() > parsedData.expiresAt) {
            throw new Error("Срок действия QR-кода истек.");
        }

        fetchUserName(parsedData.userId);
        setScannedData(parsedData);
        setError(null);
        setStep(3); // Move to confirmation step

      } catch (e) {
        setError(e.message || "Ошибка чтения QR-кода. Это не код системы лояльности.");
        setStep(2); // Go back to scanning
      }
  };

  useEffect(() => {
    // Create instance on mount
    // @ts-ignore
    html5QrCodeRef.current = new Html5Qrcode(readerId);

    // Cleanup function on component unmount
    return () => {
      if (html5QrCodeRef.current) {
        try {
            // @ts-ignore
            if (html5QrCodeRef.current.isScanning) {
                // @ts-ignore
                html5QrCodeRef.current.stop();
            }
            // @ts-ignore
            html5QrCodeRef.current.clear();
        } catch (err) {
            console.error("Failed to clear html5-qrcode on unmount", err);
        }
      }
    };
  }, []);

  useEffect(() => {
    const html5QrCode = html5QrCodeRef.current;
    if (!html5QrCode) return;

    if (step === 2) {
      setError(null); // Clear previous errors
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      html5QrCode.start(
          { facingMode: "environment" }, // prefer back camera
          config,
          qrCodeSuccessCallback
        )
        .catch(err => {
            // Fallback to any camera if environment fails
            html5QrCode.start(
                {}, // any camera
                config,
                qrCodeSuccessCallback
            ).catch(err2 => {
                setError("Не удалось запустить сканер. Проверьте разрешения для камеры.");
            });
        });

    } else { // step is not 2, so we should stop scanning
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => {
            console.error("Failed to stop scanner", err);
        });
      }
    }
  }, [step]);


  const handleBack = () => {
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
    if (error && step !== 2) { // Show general error screen, but not if scanner start fails
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
            {error && <p className="inline-error-message" style={{color: 'red'}}>{error}</p>}
            <div id={readerId} style={{ width: '100%' }}></div>
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