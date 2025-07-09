import React, { useState, useEffect } from 'react';
import '../styles/TransactionHistory.css';

const TransactionHistory = ({ userId, barId, barName, onClose }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'earn', 'spend'
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasMore: false
  });

  useEffect(() => {
    fetchTransactions(1, filter);
  }, [barId, filter]);

  const fetchTransactions = async (page = 1, type = 'all') => {
    try {
      setLoading(true);
      setError('');

      const typeParam = type === 'all' ? '' : `&type=${type}`;
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || '/api'}/transactions/history/${barId}?page=${page}&limit=20${typeParam}`,
        {
          headers: {
            'x-session-token': localStorage.getItem('loyalty_token')
          }
        }
      );

      if (!response.ok) {
        throw new Error('Не удалось загрузить историю транзакций');
      }

      const data = await response.json();
      
      if (page === 1) {
        setTransactions(data.transactions);
      } else {
        setTransactions(prev => [...prev, ...data.transactions]);
      }
      
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setTransactions([]);
    setPagination({ currentPage: 1, totalPages: 1, totalCount: 0, hasMore: false });
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchTransactions(pagination.currentPage + 1, filter);
    }
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

  const getTransactionIcon = (type) => {
    return type === 'earn' ? '📈' : '📉';
  };

  const getTransactionColor = (type) => {
    return type === 'earn' ? 'success' : 'spend';
  };

  const formatPoints = (points, type) => {
    const value = Math.abs(points);
    return type === 'earn' ? `+${value}` : `-${value}`;
  };

  return (
    <div className="transaction-history-overlay" onClick={onClose}>
      <div className="transaction-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2>История операций</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="history-info">
          <h3>{barName}</h3>
          <p>Всего операций: {pagination.totalCount}</p>
        </div>

        <div className="history-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            Все операции
          </button>
          <button 
            className={`filter-btn ${filter === 'earn' ? 'active' : ''}`}
            onClick={() => handleFilterChange('earn')}
          >
            📈 Начисления
          </button>
          <button 
            className={`filter-btn ${filter === 'spend' ? 'active' : ''}`}
            onClick={() => handleFilterChange('spend')}
          >
            📉 Списания
          </button>
        </div>

        <div className="history-content">
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
            </div>
          )}

          {!error && transactions.length === 0 && !loading && (
            <div className="empty-history">
              <p>📋 Операций не найдено</p>
              <small>
                {filter === 'all' && 'У вас пока нет операций в этом заведении'}
                {filter === 'earn' && 'У вас пока нет начислений в этом заведении'}
                {filter === 'spend' && 'У вас пока нет списаний в этом заведении'}
              </small>
            </div>
          )}

          <div className="transactions-list">
            {transactions.map((transaction, index) => (
              <div key={`${transaction._id}-${index}`} className={`transaction-item ${getTransactionColor(transaction.type)}`}>
                <div className="transaction-icon">
                  {getTransactionIcon(transaction.type)}
                </div>
                
                <div className="transaction-details">
                  <div className="transaction-main">
                    <span className="transaction-description">
                      {transaction.description}
                    </span>
                    <span className={`transaction-points ${transaction.type}`}>
                      {formatPoints(transaction.points, transaction.type)} баллов
                    </span>
                  </div>
                  <div className="transaction-meta">
                    <span className="transaction-date">
                      {formatDate(transaction.timestamp)}
                    </span>
                    <span className="transaction-type">
                      {transaction.type === 'earn' ? 'Начисление' : 'Списание'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading && (
            <div className="loading">
              <p>🔄 Загрузка...</p>
            </div>
          )}

          {pagination.hasMore && !loading && (
            <div className="load-more">
              <button className="load-more-btn" onClick={loadMore}>
                Загрузить еще
              </button>
              <small>
                Показано {transactions.length} из {pagination.totalCount}
              </small>
            </div>
          )}
        </div>

        <div className="history-footer">
          <button className="close-history-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory; 