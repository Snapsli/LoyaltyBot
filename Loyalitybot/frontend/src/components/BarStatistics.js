import React, { useState, useEffect } from 'react';
import '../styles/BarStatistics.css';

const BarStatistics = ({ sessionToken, onBack }) => {
  const [selectedBarId, setSelectedBarId] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const barOptions = [
    { id: '1', name: 'Культура' },
    { id: '2', name: 'Caballitos Mexican Bar' },
    { id: '3', name: 'Fonoteca - Listening Bar' },
    { id: '4', name: 'Tchaikovsky' }
  ];

  useEffect(() => {
    loadStatistics();
  }, [selectedBarId]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || '/api'}/admin/stats/bar/${selectedBarId}?${params.toString()}`,
        {
          headers: {
            'x-session-token': sessionToken
          }
        }
      );

      if (!response.ok) {
        throw new Error('Не удалось загрузить статистику');
      }

      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    loadStatistics();
  };

  const handleFilterReset = () => {
    setStartDate('');
    setEndDate('');
    setFilterType('all');
    setTimeout(() => loadStatistics(), 100);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPoints = (points, type) => {
    const value = Math.abs(points);
    return type === 'earn' ? `+${value}` : `-${value}`;
  };

  return (
    <div className="bar-statistics">
      <div className="stats-header">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>
        <h1>Статистика по барам</h1>
      </div>

      {/* Filters Section */}
      <div className="stats-filters">
        <div className="filter-group">
          <label>Заведение:</label>
          <select 
            value={selectedBarId} 
            onChange={(e) => setSelectedBarId(e.target.value)}
            className="filter-select"
          >
            {barOptions.map(bar => (
              <option key={bar.id} value={bar.id}>
                {bar.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Период с:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Период по:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Тип операций:</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все операции</option>
            <option value="earn">Только начисления</option>
            <option value="spend">Только списания</option>
          </select>
        </div>

        <div className="filter-buttons">
          <button onClick={handleFilterApply} className="apply-filter-btn">
            Применить
          </button>
          <button onClick={handleFilterReset} className="reset-filter-btn">
            Сбросить
          </button>
        </div>
      </div>

      {loading && (
        <div className="stats-loading">
          <p>🔄 Загрузка статистики...</p>
        </div>
      )}

      {error && (
        <div className="stats-error">
          <p>❌ {error}</p>
        </div>
      )}

      {statistics && !loading && (
        <div className="stats-content">
          {/* Summary Cards */}
          <div className="stats-summary">
            <div className="summary-card">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <h3>{statistics.summary.totalTransactions}</h3>
                <p>Всего операций</p>
              </div>
            </div>

            <div className="summary-card earn">
              <div className="card-icon">📈</div>
              <div className="card-content">
                <h3>{statistics.summary.earnCount}</h3>
                <p>Начислений</p>
                <small>+{statistics.summary.totalEarnPoints} баллов</small>
              </div>
            </div>

            <div className="summary-card spend">
              <div className="card-icon">📉</div>
              <div className="card-content">
                <h3>{statistics.summary.spendCount}</h3>
                <p>Списаний</p>
                <small>-{statistics.summary.totalSpendPoints} баллов</small>
              </div>
            </div>

            <div className="summary-card users">
              <div className="card-icon">👥</div>
              <div className="card-content">
                <h3>{statistics.summary.uniqueUsersCount}</h3>
                <p>Уникальных пользователей</p>
              </div>
            </div>
          </div>

          {/* Popular Items */}
          {statistics.popularItems.length > 0 && (
            <div className="stats-section">
              <h2>🏆 Самые популярные товары</h2>
              <div className="popular-items">
                {statistics.popularItems.map((item, index) => (
                  <div key={index} className="popular-item">
                    <div className="item-rank">#{index + 1}</div>
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      <div className="item-stats">
                        <span className="item-count">{item.count} раз</span>
                        <span className="item-points">{item.totalPoints} баллов</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Chart */}
          {statistics.dailyStats.length > 0 && (
            <div className="stats-section">
              <h2>📈 Статистика по дням</h2>
              <div className="daily-chart">
                {statistics.dailyStats.map((day, index) => (
                  <div key={index} className="chart-day">
                    <div className="day-date">
                      {new Date(day.date).toLocaleDateString('ru-RU', { 
                        month: '2-digit', 
                        day: '2-digit' 
                      })}
                    </div>
                    <div className="day-bars">
                      {day.earnCount > 0 && (
                        <div 
                          className="day-bar earn" 
                          style={{
                            height: `${Math.max(10, (day.earnCount / Math.max(...statistics.dailyStats.map(d => Math.max(d.earnCount, d.spendCount)))) * 100)}%`
                          }}
                          title={`Начислений: ${day.earnCount} (+${day.earnPoints} баллов)`}
                        />
                      )}
                      {day.spendCount > 0 && (
                        <div 
                          className="day-bar spend" 
                          style={{
                            height: `${Math.max(10, (day.spendCount / Math.max(...statistics.dailyStats.map(d => Math.max(d.earnCount, d.spendCount)))) * 100)}%`
                          }}
                          title={`Списаний: ${day.spendCount} (-${day.spendPoints} баллов)`}
                        />
                      )}
                    </div>
                    <div className="day-total">
                      {day.earnCount + day.spendCount}
                    </div>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color earn"></div>
                  <span>Начисления</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color spend"></div>
                  <span>Списания</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {statistics.recentTransactions.length > 0 && (
            <div className="stats-section">
              <h2>🕒 Последние операции</h2>
              <div className="recent-transactions">
                {statistics.recentTransactions.map((transaction, index) => (
                  <div key={index} className={`transaction-row ${transaction.type}`}>
                    <div className="transaction-icon">
                      {transaction.type === 'earn' ? '📈' : '📉'}
                    </div>
                    <div className="transaction-details">
                      <span className="transaction-description">
                        {transaction.description}
                      </span>
                      <span className="transaction-date">
                        {formatDate(transaction.timestamp)}
                      </span>
                    </div>
                    <div className={`transaction-points ${transaction.type}`}>
                      {formatPoints(transaction.points, transaction.type)} баллов
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BarStatistics; 