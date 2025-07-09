import React, { useState, useEffect } from 'react';
import '../styles/SbisPanel.css';

const SbisPanel = ({ sessionToken, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportType, setExportType] = useState('sales');
  const [exportFormat, setExportFormat] = useState('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarId, setSelectedBarId] = useState('');
  const [analytics, setAnalytics] = useState(null);

  const exportTypes = [
    { value: 'sales', label: 'Отчет по продажам', description: 'Все транзакции с детализацией' },
    { value: 'financial', label: 'Финансовый отчет', description: 'Доходы и расходы по барам' },
    { value: 'customers', label: 'Отчет по клиентам', description: 'Анализ лояльности клиентов' },
    { value: 'analytics', label: 'Аналитический отчет', description: 'Тренды и прогнозы' }
  ];

  const exportFormats = [
    { value: 'csv', label: 'CSV', description: 'Для Excel и СБИС' },
    { value: 'json', label: 'JSON', description: 'Для интеграции' },
    { value: 'xml', label: 'XML', description: 'Стандартный формат' }
  ];

  const barOptions = [
    { id: '', name: 'Все заведения' },
    { id: '1', name: 'Культура' },
    { id: '2', name: 'Caballitos Mexican Bar' },
    { id: '3', name: 'Fonoteca - Listening Bar' },
    { id: '4', name: 'Tchaikovsky' }
  ];

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || '/api'}/admin/stats/users`,
        {
          headers: {
            'x-session-token': sessionToken
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.append('type', exportType);
      params.append('format', exportFormat);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedBarId) params.append('barId', selectedBarId);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || '/api'}/admin/export/sbis?${params.toString()}`,
        {
          headers: {
            'x-session-token': sessionToken
          }
        }
      );

      if (!response.ok) {
        throw new Error('Ошибка экспорта данных');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'sbis_export';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSbisWebsite = () => {
    window.open('https://sbis.ru/', '_blank');
  };

  const handleSbisApp = () => {
    // Deep link to SBIS app (if available)
    const sbisAppUrl = 'sbis://';
    window.location.href = sbisAppUrl;
  };

  const getExportDescription = () => {
    const type = exportTypes.find(t => t.value === exportType);
    return type ? type.description : '';
  };

  return (
    <div className="sbis-panel">
      <div className="sbis-header">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>
        <h1>📊 СБИС - Система Бизнес Интеграции</h1>
      </div>

      <div className="sbis-content">
        {/* Quick Actions */}
        <div className="sbis-section">
          <h2>🚀 Быстрые действия</h2>
          <div className="quick-actions">
            <button onClick={handleSbisWebsite} className="action-btn website">
              🌐 Открыть сайт СБИС
            </button>
            <button onClick={handleSbisApp} className="action-btn app">
              📱 Открыть приложение СБИС
            </button>
          </div>
        </div>

        {/* Export Configuration */}
        <div className="sbis-section">
          <h2>📤 Экспорт данных для СБИС</h2>
          
          <div className="export-config">
            <div className="config-row">
              <div className="config-group">
                <label>Тип отчета:</label>
                <select 
                  value={exportType} 
                  onChange={(e) => setExportType(e.target.value)}
                  className="config-select"
                >
                  {exportTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <small className="description">{getExportDescription()}</small>
              </div>

              <div className="config-group">
                <label>Формат файла:</label>
                <select 
                  value={exportFormat} 
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="config-select"
                >
                  {exportFormats.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
                <small className="description">
                  {exportFormats.find(f => f.value === exportFormat)?.description}
                </small>
              </div>
            </div>

            <div className="config-row">
              <div className="config-group">
                <label>Заведение:</label>
                <select 
                  value={selectedBarId} 
                  onChange={(e) => setSelectedBarId(e.target.value)}
                  className="config-select"
                >
                  {barOptions.map(bar => (
                    <option key={bar.id} value={bar.id}>
                      {bar.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="config-group">
                <label>Период с:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="config-input"
                />
              </div>

              <div className="config-group">
                <label>Период по:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="config-input"
                />
              </div>
            </div>

            <button 
              onClick={handleExport} 
              disabled={loading}
              className="export-btn"
            >
              {loading ? '🔄 Экспорт...' : '📥 Экспортировать'}
            </button>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {analytics && (
          <div className="sbis-section">
            <h2>📈 Аналитика для СБИС</h2>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="card-icon">👥</div>
                <div className="card-content">
                  <h3>{analytics.summary?.totalUsers || 0}</h3>
                  <p>Всего клиентов</p>
                </div>
              </div>

              <div className="analytics-card">
                <div className="card-icon">💰</div>
                <div className="card-content">
                  <h3>{analytics.summary?.totalPointsInSystem?.toLocaleString() || 0}</h3>
                  <p>Баллов в системе</p>
                </div>
              </div>

              <div className="analytics-card">
                <div className="card-icon">📊</div>
                <div className="card-content">
                  <h3>{analytics.summary?.avgPointsPerUser || 0}</h3>
                  <p>Среднее на клиента</p>
                </div>
              </div>

              <div className="analytics-card">
                <div className="card-icon">🆕</div>
                <div className="card-content">
                  <h3>{analytics.summary?.newUsers || 0}</h3>
                  <p>Новых за 30 дней</p>
                </div>
              </div>
            </div>

            {analytics.barDistribution && analytics.barDistribution.length > 0 && (
              <div className="bar-analytics">
                <h3>📊 Распределение по заведениям</h3>
                <div className="bar-chart">
                  {analytics.barDistribution.map((bar, index) => (
                    <div key={index} className="bar-item">
                      <div className="bar-info">
                        <span className="bar-name">{bar.barName}</span>
                        <span className="bar-stats">
                          {bar.userCount} клиентов • {bar.transactionCount} операций
                        </span>
                      </div>
                      <div className="bar-progress">
                        <div 
                          className="progress-fill"
                          style={{
                            width: `${(bar.userCount / Math.max(...analytics.barDistribution.map(b => b.userCount), 1)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Integration Instructions */}
        <div className="sbis-section">
          <h2>🔗 Инструкция по интеграции</h2>
          
          <div className="integration-steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Получите доступ к API СБИС</h4>
                <p>Обратитесь в СБИС для получения API ключей и документации</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Настройте webhook</h4>
                <p>Создайте endpoint для получения данных от СБИС</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Интегрируйте API</h4>
                <p>Добавьте код для отправки данных в СБИС</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>Тестируйте интеграцию</h4>
                <p>Проверьте корректность передачи данных</p>
              </div>
            </div>
          </div>

          <div className="integration-links">
            <a href="https://sbis.ru/help" target="_blank" rel="noopener noreferrer" className="link-btn">
              📚 Документация СБИС
            </a>
            <a href="https://sbis.ru/api" target="_blank" rel="noopener noreferrer" className="link-btn">
              🔌 API СБИС
            </a>
            <a href="https://sbis.ru/support" target="_blank" rel="noopener noreferrer" className="link-btn">
              🆘 Поддержка
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="sbis-error">
          <p>❌ {error}</p>
        </div>
      )}
    </div>
  );
};

export default SbisPanel; 