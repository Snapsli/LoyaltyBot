import React, { useState } from 'react';

const LoginPage = ({ onTelegramAuth, onClassicAuth, loading }) => {
  const [showClassicForm, setShowClassicForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classicLoading, setClassicLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClassicSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setClassicLoading(true);

    try {
      await onClassicAuth(email, password);
    } catch (err) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setClassicLoading(false);
    }
  };

  const handleTelegramAuth = async () => {
    try {
      await onTelegramAuth();
    } catch (err) {
      setError(err.message || 'Ошибка авторизации через Telegram');
    }
  };

  if (showClassicForm) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2>Вход в админ панель</h2>
          
          <form onSubmit={handleClassicSubmit} className="classic-login-form">
            <div className="form-group">
              <label htmlFor="email">Email/Логин:</label>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Пароль:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Введите пароль"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="button-group">
              <button 
                type="submit" 
                disabled={classicLoading}
                className="login-btn primary"
              >
                {classicLoading ? 'Входим...' : 'Войти'}
              </button>
              
              <button 
                type="button" 
                onClick={() => setShowClassicForm(false)}
                className="login-btn secondary"
              >
                Назад
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Loyalty Bot</h2>
        <p>Выберите способ входа:</p>
        
        <div className="auth-options">
          <button 
            onClick={handleTelegramAuth}
            disabled={loading}
            className="login-btn telegram"
          >
            {loading ? 'Подключаемся...' : '📱 Войти через Telegram'}
          </button>
          
          <button 
            onClick={() => setShowClassicForm(true)}
            className="login-btn classic"
          >
            🔑 Войти с логином и паролем
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="login-info">
          <small>
            Для администраторов: используйте логин и пароль<br/>
            Для пользователей: войдите через Telegram
          </small>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 