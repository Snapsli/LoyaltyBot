import React, { useState, useEffect } from 'react';
import '../styles/UserStatistics.css';

const UserStatistics = ({ sessionToken, onBack }) => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarId, setSelectedBarId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('totalPoints');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const barOptions = [
    { id: '', name: 'Все заведения' },
    { id: '1', name: 'Культура' },
    { id: '2', name: 'Caballitos Mexican Bar' },
    { id: '3', name: 'Fonoteca - Listening Bar' },
    { id: '4', name: 'Tchaikovsky' }
  ];

  const sortOptions = [
    { value: 'totalPoints', label: 'По баллам' },
    { value: 'activity', label: 'По активности' },
    { value: 'recent', label: 'По недавней активности' },
    { value: 'earned', label: 'По заработанным баллам' },
    { value: 'spent', label: 'По потраченным баллам' },
    { value: 'created', label: 'По дате регистрации' }
  ];

  useEffect(() => {
    loadStatistics();
  }, [currentPage]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedBarId) params.append('barId', selectedBarId);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || '/api'}/admin/stats/users?${params.toString()}`,
        {
          headers: {
            'x-session-token': sessionToken
          }
        }
      );

      if (!response.ok) {
        throw new Error('Не удалось загрузить статистику пользователей');
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
    setCurrentPage(1);
    loadStatistics();
  };

  const handleFilterReset = () => {
    setStartDate('');
    setEndDate('');
    setSelectedBarId('');
    setSearchQuery('');
    setSortBy('totalPoints');
    setSortOrder('desc');
    setCurrentPage(1);
    setTimeout(() => loadStatistics(), 100);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getActivityLevel = (recentActivity) => {
    if (recentActivity >= 10) return { level: 'high', label: 'Высокая', color: '#28a745' };
    if (recentActivity >= 3) return { level: 'medium', label: 'Средняя', color: '#ffc107' };
    if (recentActivity > 0) return { level: 'low', label: 'Низкая', color: '#fd7e14' };
    return { level: 'none', label: 'Неактивен', color: '#6c757d' };
  };

  const getStatusBadge = (user) => {
    if (!user.isActive) return { text: 'Заблокирован', color: '#dc3545' };
    if (user.role === 'admin') return { text: 'Администратор', color: '#007bff' };
    return { text: 'Активен', color: '#28a745' };
  };

  return (
    <div className="user-statistics">
      <div className="stats-header">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>
        <h1>Статистика по пользователям</h1>
      </div>

      {/* Filters Section */}
      <div className="stats-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Поиск:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Имя, телефон, username..."
              className="filter-input search-input"
            />
          </div>

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
            <label>Сортировка:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Порядок:</label>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value)}
              className="filter-select"
            >
              <option value="desc">По убыванию</option>
              <option value="asc">По возрастанию</option>
            </select>
          </div>
        </div>

        <div className="filter-row">
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

          <div className="filter-buttons">
            <button onClick={handleFilterApply} className="apply-filter-btn">
              Применить
            </button>
            <button onClick={handleFilterReset} className="reset-filter-btn">
              Сбросить
            </button>
          </div>
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
              <div className="card-icon">👥</div>
              <div className="card-content">
                <h3>{statistics.summary.totalUsers}</h3>
                <p>Всего пользователей</p>
              </div>
            </div>

            <div className="summary-card active">
              <div className="card-icon">✅</div>
              <div className="card-content">
                <h3>{statistics.summary.activeUsers}</h3>
                <p>Активных</p>
                <small>{Math.round((statistics.summary.activeUsers / statistics.summary.totalUsers) * 100)}% от общего числа</small>
              </div>
            </div>

            <div className="summary-card blocked">
              <div className="card-icon">🚫</div>
              <div className="card-content">
                <h3>{statistics.summary.blockedUsers}</h3>
                <p>Заблокированных</p>
              </div>
            </div>

            <div className="summary-card new">
              <div className="card-icon">🆕</div>
              <div className="card-content">
                <h3>{statistics.summary.newUsers}</h3>
                <p>Новых за 30 дней</p>
              </div>
            </div>

            <div className="summary-card points">
              <div className="card-icon">🎯</div>
              <div className="card-content">
                <h3>{statistics.summary.totalPointsInSystem.toLocaleString()}</h3>
                <p>Баллов в системе</p>
                <small>Среднее: {statistics.summary.avgPointsPerUser} на пользователя</small>
              </div>
            </div>
          </div>

          {/* Registration Trends Chart */}
          {statistics.registrationTrends.length > 0 && (
            <div className="stats-section">
              <h2>📈 Регистрации за последние 14 дней</h2>
              <div className="registration-chart">
                {statistics.registrationTrends.map((day, index) => (
                  <div key={index} className="chart-day">
                    <div className="day-date">
                      {new Date(day.date).toLocaleDateString('ru-RU', { 
                        month: '2-digit', 
                        day: '2-digit' 
                      })}
                    </div>
                    <div 
                      className="day-bar registration" 
                      style={{
                        height: `${Math.max(10, (day.count / Math.max(...statistics.registrationTrends.map(d => d.count), 1)) * 80)}px`
                      }}
                      title={`Регистраций: ${day.count}`}
                    />
                    <div className="day-count">{day.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bar Distribution */}
          {statistics.barDistribution.length > 0 && (
            <div className="stats-section">
              <h2>🏢 Распределение по заведениям</h2>
              <div className="bar-distribution">
                {statistics.barDistribution.map((bar, index) => (
                  <div key={index} className="distribution-item">
                    <div className="bar-info">
                      <span className="bar-name">{bar.barName}</span>
                      <div className="bar-stats">
                        <span className="user-count">{bar.userCount} пользователей</span>
                        <span className="transaction-count">{bar.transactionCount} операций</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{
                          width: `${(bar.userCount / Math.max(...statistics.barDistribution.map(b => b.userCount), 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="stats-section">
            <h2>👤 Список пользователей</h2>
            
            {statistics.users.length === 0 ? (
              <div className="empty-users">
                <p>👤 Пользователи не найдены</p>
                <small>Попробуйте изменить фильтры поиска</small>
              </div>
            ) : (
              <>
                <div className="users-list">
                  {statistics.users.map((user, index) => {
                    const activity = getActivityLevel(user.recentActivity);
                    const status = getStatusBadge(user);
                    
                    return (
                      <div key={index} className="user-item">
                        <div className="user-header">
                          <div className="user-basic-info">
                            <div className="user-name">
                              <span className="name">{user.first_name} {user.last_name}</span>
                              {user.username && <span className="username">@{user.username}</span>}
                            </div>
                            <div className="user-contact">
                              {user.phone_number && <span className="phone">{user.phone_number}</span>}
                            </div>
                          </div>
                          
                          <div className="user-badges">
                            <span className="status-badge" style={{ backgroundColor: status.color }}>
                              {status.text}
                            </span>
                            <span className="activity-badge" style={{ backgroundColor: activity.color }}>
                              {activity.label}
                            </span>
                          </div>
                        </div>

                        <div className="user-stats-grid">
                          <div className="stat-item">
                            <span className="stat-label">Текущие баллы:</span>
                            <span className="stat-value">{user.currentPoints || 0}</span>
                          </div>
                          
                          <div className="stat-item">
                            <span className="stat-label">Всего операций:</span>
                            <span className="stat-value">{user.totalTransactions}</span>
                          </div>
                          
                          <div className="stat-item">
                            <span className="stat-label">Заработано:</span>
                            <span className="stat-value earn">+{user.totalEarnPoints}</span>
                          </div>
                          
                          <div className="stat-item">
                            <span className="stat-label">Потрачено:</span>
                            <span className="stat-value spend">-{user.totalSpendPoints}</span>
                          </div>
                          
                          <div className="stat-item">
                            <span className="stat-label">Активность (30 дней):</span>
                            <span className="stat-value">{user.recentActivity} операций</span>
                          </div>
                          
                          <div className="stat-item">
                            <span className="stat-label">Дата регистрации:</span>
                            <span className="stat-value">{formatDate(user.createdAt)}</span>
                          </div>
                        </div>

                        {user.mostActiveBar && (
                          <div className="user-favorite-bar">
                            <span className="favorite-label">Любимое заведение:</span>
                            <span className="favorite-bar">
                              {user.mostActiveBar.barName} ({user.mostActiveBar.transactionCount} операций)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {statistics.pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      className="page-btn"
                      disabled={statistics.pagination.currentPage === 1}
                      onClick={() => handlePageChange(statistics.pagination.currentPage - 1)}
                    >
                      ← Назад
                    </button>
                    
                    <span className="page-info">
                      Страница {statistics.pagination.currentPage} из {statistics.pagination.totalPages}
                      <small>({statistics.pagination.totalCount} всего)</small>
                    </span>
                    
                    <button 
                      className="page-btn"
                      disabled={!statistics.pagination.hasMore}
                      onClick={() => handlePageChange(statistics.pagination.currentPage + 1)}
                    >
                      Вперед →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStatistics; 