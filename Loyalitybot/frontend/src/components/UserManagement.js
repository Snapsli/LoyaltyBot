import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';

// Константы заведений
const BARS = {
  1: { name: 'Культура', color: '#FF6B35' },
  2: { name: 'Caballitos Mexican Bar', color: '#4CAF50' },
  3: { name: 'Fonoteca - Listening Bar', color: '#E53E3E' },
  4: { name: 'Tchaikovsky', color: '#2196F3' }
};

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [pointsAction, setPointsAction] = useState({ userId: null, type: null, points: '', barId: null });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('=== FETCHING USERS ===');
      const response = await fetch(`${config.apiUrl}/users`, {
        headers: {
          'x-session-token': localStorage.getItem('loyalty_token'),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      console.log('Fetched users data:', data);
      console.log('First user barPoints:', data[0]?.barPoints);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handlePointsAction = async (userId, type, points, barId) => {
    try {
      const endpoint = type === 'add' ? 'add-bar-points' : 'remove-bar-points';
      const response = await fetch(`${config.apiUrl}/users/${userId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('loyalty_token'),
        },
        body: JSON.stringify({ 
          points: parseInt(points),
          barId: parseInt(barId)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update points');
      }

      await fetchUsers();
      setPointsAction({ userId: null, type: null, points: '', barId: null });
    } catch (error) {
      console.error('Error updating points:', error);
      alert('Ошибка при обновлении баллов');
    }
  };

  const handleBlockUser = async (userId, isBlocked) => {
    try {
      const response = await fetch(`${config.apiUrl}/users/${userId}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('loyalty_token'),
        },
        body: JSON.stringify({ isBlocked }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user block status');
      }

      await fetchUsers();
    } catch (error) {
      console.error('Error updating user block status:', error);
      alert('Ошибка при блокировке/разблокировке пользователя');
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleUserExpansion = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  // Получить баллы пользователя по заведению
  const getUserBarPoints = (userData, barId) => {
    console.log(`getUserBarPoints called for user ${userData.firstName}, barId ${barId}`);
    console.log('userData.barPoints:', userData.barPoints);
    console.log('userData.barPoints keys:', Object.keys(userData.barPoints || {}));
    console.log('userData.barPoints content:', JSON.stringify(userData.barPoints, null, 2));
    
    if (!userData.barPoints) return 0;
    
    // Пробуем и числовой и строковый ключ
    const barIdStr = String(barId);
    const barIdNum = Number(barId);
    const points = userData.barPoints[barIdStr] || userData.barPoints[barIdNum] || 0;
    
    console.log(`Trying keys: '${barIdStr}' and ${barIdNum}, found values:`, {
      stringKey: userData.barPoints[barIdStr],
      numberKey: userData.barPoints[barIdNum]
    });
    console.log(`Returning ${points} points`);
    return points;
  };

  // Получить общее количество баллов пользователя
  const getTotalUserPoints = (userData) => {
    if (!userData.barPoints) return 0;
    console.log('getTotalUserPoints - userData.barPoints:', userData.barPoints);
    const total = Object.values(userData.barPoints).reduce((sum, points) => sum + (points || 0), 0);
    console.log('Total points calculated:', total);
    return total;
  };

  // Получить название заведения
  const getBarName = (barId) => {
    return BARS[barId]?.name || `Заведение ${barId}`;
  };

  if (loading) {
    return (
      <div className="main-container">
        <div className="admin-panel loading">
          Загрузка пользователей...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-container">
        <div className="admin-panel">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      {/* Top Navigation */}
      <div className="top-navigation">
        <div className="user-info-top">
          <span>Админ: {user.first_name}</span>
          <span>{getTotalUserPoints(user)} pts</span>
        </div>
        <div className="nav-buttons">
          <button onClick={() => navigate('/admin')} className="profile-btn">
            ← Назад к панели
          </button>
          <button onClick={() => navigate('/')} className="profile-btn">
            🏠 Главная
          </button>
        </div>
      </div>

      <div className="main-container-content">
        {/* Sidebar */}
        <div className="loyalty-sidebar admin-sidebar">
          <div className="sidebar-divider"></div>
          <div className="loyalty-logo">
            <div className="logo-circle">
              <img src="/images/logo.png" alt="Logo" />
            </div>
          </div>
          <h2 className="sidebar-title">Панель администратора</h2>
          
          <div className="accordion-section">
            <button 
              className={`accordion-button ${expandedSection === 'stats' ? 'expanded' : ''}`}
              onClick={() => toggleSection('stats')}
            >
              <span>Статистика</span>
              <span className="accordion-icon">{expandedSection === 'stats' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'stats' && (
              <ul className="accordion-content">
                <li>Общая статистика</li>
                <li>По барам</li>
                <li>По пользователям</li>
              </ul>
            )}
          </div>

          <div className="accordion-section">
            <button 
              className={`accordion-button ${expandedSection === 'manage' ? 'expanded' : ''}`}
              onClick={() => toggleSection('manage')}
            >
              <span>Управление</span>
              <span className="accordion-icon">{expandedSection === 'manage' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'manage' && (
              <ul className="accordion-content">
                <li className="active">Пользователи</li>
                <li onClick={() => navigate('/admin/points')} style={{ cursor: 'pointer' }}>Баллы</li>
                <li>Настройки</li>
              </ul>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <h1 className="page-title">Управление пользователями</h1>
          
          <div className="users-management">
            <div className="users-stats">
              <div className="stats-card">
                <h3>Общая статистика</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Всего пользователей:</span>
                    <span className="stat-value">{users.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Активных:</span>
                    <span className="stat-value">{users.filter(u => !u.isBlocked).length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Заблокированных:</span>
                    <span className="stat-value">{users.filter(u => u.isBlocked).length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Администраторов:</span>
                    <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="users-list">
              <h3>Список пользователей</h3>
              {users.map(userData => (
                <div key={userData._id} className="user-item">
                  <div className="user-header" onClick={() => toggleUserExpansion(userData._id)}>
                    <div className="user-basic-info">
                      <div className="user-name">
                        {userData.firstName} {userData.lastName}
                      </div>
                      <div className="user-status">
                        <span className={`status-badge ${userData.isBlocked ? 'blocked' : 'active'}`}>
                          {userData.isBlocked ? 'Заблокирован' : 'Активен'}
                        </span>
                        <span className={`role-badge ${userData.role}`}>
                          {userData.role === 'admin' ? 'Админ' : 'Пользователь'}
                        </span>
                      </div>
                    </div>
                    <div className="user-summary">
                      <div className="user-bars-points">
                        {Object.keys(BARS).map(barId => (
                          <div key={barId} className="bar-points-badge" style={{borderColor: BARS[barId].color}}>
                            <span className="bar-name">{BARS[barId].name}:</span>
                            <span className="bar-points" style={{color: BARS[barId].color}}>
                              {getUserBarPoints(userData, barId)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="expand-icon">
                        {expandedUser === userData._id ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>

                  {expandedUser === userData._id && (
                    <div className="user-details">
                      <div className="user-info-section">
                        <h4>Информация о пользователе</h4>
                        <div className="user-field">
                          <strong>Имя:</strong> <span>{userData.firstName || 'Не указано'}</span>
                        </div>
                        <div className="user-field">
                          <strong>Фамилия:</strong> <span>{userData.lastName || 'Не указано'}</span>
                        </div>
                        <div className="user-field">
                          <strong>Username:</strong> <span>{userData.username || 'Не указано'}</span>
                        </div>
                        <div className="user-field">
                          <strong>Телефон:</strong> <span>{userData.phone || 'Не указано'}</span>
                        </div>
                        <div className="user-field">
                          <strong>Email:</strong> <span>{userData.email || 'Не указано'}</span>
                        </div>
                        <div className="user-field">
                          <strong>Дата регистрации:</strong> <span>{formatDate(userData.createdAt)}</span>
                        </div>
                        <div className="user-field">
                          <strong>Последнее обновление:</strong> <span>{formatDate(userData.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="points-management-section">
                        <h4>Управление баллами по заведениям</h4>
                        
                        {Object.keys(BARS).map(barId => (
                          <div key={barId} className="bar-points-management">
                            <div className="bar-header">
                              <h5 style={{color: BARS[barId].color}}>{BARS[barId].name}</h5>
                              <div className="current-bar-balance">
                                Текущий баланс: <span style={{color: BARS[barId].color}}>{getUserBarPoints(userData, barId)} баллов</span>
                              </div>
                            </div>
                            
                            <div className="points-actions">
                              <div className="points-action-group">
                                <button 
                                  className="points-btn add-points"
                                  onClick={() => setPointsAction({ userId: userData._id, type: 'add', points: '', barId: barId })}
                                >
                                  + Добавить
                                </button>
                                
                                <button 
                                  className="points-btn remove-points"
                                  onClick={() => setPointsAction({ userId: userData._id, type: 'remove', points: '', barId: barId })}
                                >
                                  - Убрать
                                </button>
                              </div>

                              {pointsAction.userId === userData._id && pointsAction.barId === barId && (
                                <div className="points-input-section">
                                  <input
                                    type="number"
                                    value={pointsAction.points}
                                    onChange={(e) => setPointsAction({...pointsAction, points: e.target.value})}
                                    placeholder="Количество баллов"
                                    className="points-input"
                                    min="1"
                                  />
                                  <div className="points-input-buttons">
                                    <button 
                                      className="confirm-btn"
                                      onClick={() => handlePointsAction(pointsAction.userId, pointsAction.type, pointsAction.points, pointsAction.barId)}
                                      disabled={!pointsAction.points || pointsAction.points <= 0}
                                    >
                                      {pointsAction.type === 'add' ? 'Добавить' : 'Убрать'}
                                    </button>
                                    <button 
                                      className="cancel-btn"
                                      onClick={() => setPointsAction({ userId: null, type: null, points: '', barId: null })}
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {getTotalUserPoints(userData) > 0 && (
                          <div className="total-points-display">
                            <strong>Общий баланс: {getTotalUserPoints(userData)} баллов</strong>
                          </div>
                        )}
                      </div>

                      <div className="user-actions-section">
                        <h4>Действия с пользователем</h4>
                        <div className="user-action-buttons">
                          <button 
                            className={`block-btn ${userData.isBlocked ? 'unblock' : 'block'}`}
                            onClick={() => handleBlockUser(userData._id, !userData.isBlocked)}
                          >
                            {userData.isBlocked ? '✓ Разблокировать' : '✗ Заблокировать'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement; 