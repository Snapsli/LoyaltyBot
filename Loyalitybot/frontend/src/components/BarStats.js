import React, { useState, useEffect } from 'react';

const BAR_NAMES = {
  1: "Культура",
  2: "Caballitos Mexican Bar",
  3: "Fonoteca - Listening Bar",
  4: "Tchaikovsky"
};

const BarStats = ({ onBack }) => {
  const [statsData, setStatsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats/bars', {
          headers: { 'x-session-token': localStorage.getItem('loyalty_token') }
        });
        if (!response.ok) throw new Error('Failed to fetch statistics');
        const data = await response.json();
        setStatsData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatDate = (dateString) => new Date(dateString).toLocaleString('ru-RU');

  if (loading) return <div>Загрузка статистики...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div className="stats-container">
      <div className="page-header">
        <h1>Статистика по барам</h1>
        <button onClick={onBack} className="profile-btn">← Назад к заведениям</button>
      </div>

      {statsData.map(({ barId, stats, popularItems, recentTransactions }) => (
        <div key={barId} className="bar-stat-card">
          <h2>{BAR_NAMES[barId]}</h2>
          
          <div className="stat-summary">
            <div><span className="stat-label">Всего покупок:</span> {stats.totalPurchases}</div>
            <div><span className="stat-label">Потрачено баллов:</span> {stats.totalPointsSpent}</div>
            <div><span className="stat-label">Уникальных гостей:</span> {stats.uniqueVisitors}</div>
          </div>

          <h3>Популярные товары (Топ-5)</h3>
          {popularItems.length > 0 ? (
            <ol>{popularItems.map(item => <li key={item.name}>{item.name} ({item.count} раз)</li>)}</ol>
          ) : <p>Нет данных.</p>}

          <h3>Последние транзакции</h3>
          {recentTransactions.length > 0 ? (
            <table>
              <thead><tr><th>Дата</th><th>Гость</th><th>Операция</th><th>Баллы</th></tr></thead>
              <tbody>
                {recentTransactions.map(t => (
                  <tr key={t._id}>
                    <td>{formatDate(t.createdAt)}</td>
                    <td>{t.userId ? `${t.userId.firstName || ''} ${t.userId.lastName || ''}`.trim() : 'N/A'}</td>
                    <td>{t.type === 'spend' ? `Покупка: ${t.itemName}` : 'Начисление'}</td>
                    <td>{t.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p>Нет транзакций.</p>}
        </div>
      ))}
    </div>
  );
};

export default BarStats; 