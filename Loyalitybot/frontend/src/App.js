import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import BarLoyalty from './components/BarLoyalty';

// Telegram WebApp SDK integration
const tg = window.Telegram?.WebApp;

// Mock authentication for development
const mockAuth = {
  user: {
    id: 123456789,
    first_name: "John",
    last_name: "Doe",
    username: "johndoe",
    role: "user",
    loyaltyPoints: 500 // Добавляем тестовые бонусы
  },
  token: "mock_session_token_12345"
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize Telegram WebApp
      if (tg) {
        tg.ready();
        tg.expand();
        tg.disableVerticalSwipes();
        
        // Set theme
        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
        document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
      }

      // Check authentication
      await checkAuth();
    } catch (err) {
      console.error('App initialization error:', err);
      setError('Failed to initialize app');
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      // Check if we have stored auth
      const storedUser = localStorage.getItem('loyalty_user');
      const storedToken = localStorage.getItem('loyalty_token');
      
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        return;
      }

      // Try Telegram authentication
      if (tg?.initDataUnsafe?.user) {
        await authenticateWithTelegram();
      } else if (process.env.NODE_ENV === 'development') {
        // Use mock auth in development
        await authenticateWithMock();
      } else {
        throw new Error('No authentication method available');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Authentication failed');
    }
  };

  const authenticateWithTelegram = async () => {
    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initData: tg.initData,
          user: tg.initDataUnsafe.user
        })
      });

      if (!response.ok) {
        throw new Error('Telegram authentication failed');
      }

      const data = await response.json();
      setUser(data.user);
      
      // Store auth data
      localStorage.setItem('loyalty_user', JSON.stringify(data.user));
      localStorage.setItem('loyalty_token', data.token);
      
    } catch (err) {
      console.error('Telegram auth error:', err);
      throw err;
    }
  };

  const authenticateWithMock = async () => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setUser(mockAuth.user);
    localStorage.setItem('loyalty_user', JSON.stringify(mockAuth.user));
    localStorage.setItem('loyalty_token', mockAuth.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('loyalty_user');
    localStorage.removeItem('loyalty_token');
    
    if (tg) {
      tg.close();
    }
  };

  const refreshPoints = async () => {
    try {
      const token = localStorage.getItem('loyalty_token');
      if (!token) return;

      const response = await fetch('/api/user/profile', {
        headers: {
          'X-Telegram-ID': user.id.toString(),
          'X-Session-Token': token
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(prev => ({ ...prev, loyaltyPoints: userData.loyaltyPoints }));
        localStorage.setItem('loyalty_user', JSON.stringify({ ...user, loyaltyPoints: userData.loyaltyPoints }));
      }
    } catch (err) {
      console.error('Error refreshing points:', err);
    }
  };

  // Development helper: toggle role between user and admin
  const toggleRole = () => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const updatedUser = { ...user, role: newRole };
    
    setUser(updatedUser);
    localStorage.setItem('loyalty_user', JSON.stringify(updatedUser));
  };

  if (loading) {
    return (
      <div className="app-container loading">
        <div className="loading-spinner"></div>
        <p>Loading Loyalty App...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container error">
        <div className="error-message">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container login">
        <div className="login-form">
          <h1>🎯 Loyalty Program</h1>
          <p>Welcome! Please authenticate to access your loyalty account.</p>
          <button 
            onClick={checkAuth}
            className="login-button"
          >
            {tg ? 'Connect Telegram' : 'Login (Development)'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage user={user} onRefreshPoints={refreshPoints} onLogout={logout} onToggleRole={toggleRole} />} />
        <Route path="/bars/:barId" element={<BarLoyalty user={user} />} />
        <Route path="/profile" element={<ProfilePage user={user} onLogout={logout} onToggleRole={toggleRole} />} />
        {user.role === 'admin' && (
          <Route path="/admin" element={<AdminPage user={user} onLogout={logout} onToggleRole={toggleRole} />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

// Main Page Component (Dashboard)
function MainPage({ user, onRefreshPoints, onLogout, onToggleRole }) {
  const [stats, setStats] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  // Функция для подсчета бонусов в конкретном баре
  const getUserBonusesForBar = (barId) => {
    const baseBonus = user?.loyaltyPoints || 500; // Базовые 500 бонусов для тестов
    const bonusMultipliers = {
      1: 1.2,   // Культура - 600 бонусов
      2: 0.8,   // Cabalitos - 400 бонусов  
      3: 1.5,   // Фонотека - 750 бонусов
      4: 0.6    // Tchaykovsky - 300 бонусов
    };
    return Math.floor(baseBonus * (bonusMultipliers[barId] || 1));
  };

  // Подсчет общих бонусов во всех барах
  const getTotalBonuses = () => {
    return getUserBonusesForBar(1) + getUserBonusesForBar(2) + getUserBonusesForBar(3) + getUserBonusesForBar(4);
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('loyalty_token');
      const response = await fetch('/api/user/stats', {
        headers: {
          'X-Telegram-ID': user.id.toString(),
          'X-Session-Token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const goToBar = (barId) => {
    navigate(`/bars/${barId}`);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const bars = [
    {
      id: 1,
      name: "Культура",
      address: "Ульяновск, Ленина, 15",
      image: "/images/bars/kultura.jpg"
    },
    {
      id: 2,
      name: "Caballitos Mexican Bar",
      address: "Ульяновск, Дворцовая, 8",
      image: "/images/bars/cabalitos.jpg"
    },
    {
      id: 3,
      name: "Fonoteca - Listening Bar",
      address: "Ульяновск, Карла Маркса, 20",
      image: "/images/bars/fonoteka.jpg"
    },
    {
      id: 4,
      name: "Tchaikovsky",
      address: "Ульяновск, Советская, 25",
      image: "/images/bars/tchaykovsky.jpg"
    }
  ];

  return (
    <div className="main-container">
      {/* Top Navigation */}
      <div className="top-navigation">
        <div className="user-info-top">
          <span>Привет, {user.first_name}!</span>
          <span>{getTotalBonuses()} pts</span>
        </div>
        <div className="nav-buttons">
          <button onClick={() => navigate('/profile')} className="profile-btn">
            👤 Профиль
          </button>
          {user.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="admin-btn">
              ⚙️ Админ
            </button>
          )}
          {process.env.NODE_ENV === 'development' && (
            <button onClick={onToggleRole} className="dev-role-btn">
              🔄 {user.role === 'admin' ? 'User' : 'Admin'}
            </button>
          )}
          <button onClick={onLogout} className="logout-btn">
            Выйти
          </button>
        </div>
      </div>

      <div className="main-container-content">
        {/* Sidebar */}
        <div className="loyalty-sidebar">
          <div className="sidebar-divider"></div>
          <div className="loyalty-logo">
            <div className="logo-circle">
              <img src="/images/logo.png" alt="Logo" />
            </div>
          </div>
          <h2 className="sidebar-title">Программа лояльности</h2>
          
          <div className="accordion-section">
            <button 
              className={`accordion-button ${expandedSection === 'earn' ? 'expanded' : ''}`}
              onClick={() => toggleSection('earn')}
            >
              <span>Как получить баллы?</span>
              <span className="accordion-icon">{expandedSection === 'earn' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'earn' && (
              <ul className="accordion-content">
                <li>Делайте заказы в наших барах</li>
                <li>Участвуйте в акциях</li>
                <li>Приводите друзей</li>
              </ul>
            )}
          </div>

          <div className="accordion-section">
            <button 
              className={`accordion-button ${expandedSection === 'spend' ? 'expanded' : ''}`}
              onClick={() => toggleSection('spend')}
            >
              <span>Как потратить баллы?</span>
              <span className="accordion-icon">{expandedSection === 'spend' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'spend' && (
              <ul className="accordion-content">
                <li>Скидки на напитки</li>
                <li>Бесплатные закуски</li>
                <li>Специальные предложения</li>
              </ul>
            )}
          </div>

          <div className="points-display">
            <span className="points-label">Ваши баллы:</span>
            <span className="points-value">{getTotalBonuses()}</span>
            <button onClick={onRefreshPoints} className="refresh-points-btn">↻</button>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <h1 className="page-title">Наши бары</h1>
          
                  <div className="bars-grid">
          {bars.map(bar => (
            <div 
              key={bar.id} 
              className="bar-card" 
              onClick={() => goToBar(bar.id)}
              onMouseEnter={() => setHoveredBar(bar.id)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div className="bar-image-container">
                <img src={bar.image} alt={bar.name} className="bar-image" />
                {hoveredBar === bar.id && (
                  <div className="bar-description-overlay">
                    <div className="bar-description-content">
                      <h4>Описание бара</h4>
                      <p>Здесь будет детальное описание атмосферы, особенностей меню и уникальных предложений этого заведения. Пока что это заглушка.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="bar-info">
                <h3 className="bar-name">{bar.name}</h3>
                <p className="bar-address">{bar.address}</p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}

// Profile Page Component (New Design)
function ProfilePage({ user, onLogout, onToggleRole }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const navigate = useNavigate();

  // Функция для подсчета бонусов в конкретном баре
  const getUserBonusesForBar = (barId) => {
    const baseBonus = user?.loyaltyPoints || 500; // Базовые 500 бонусов для тестов
    const bonusMultipliers = {
      1: 1.2,   // Культура - 600 бонусов
      2: 0.8,   // Cabalitos - 400 бонусов  
      3: 1.5,   // Фонотека - 750 бонусов
      4: 0.6    // Tchaykovsky - 300 бонусов
    };
    return Math.floor(baseBonus * (bonusMultipliers[barId] || 1));
  };

  // Подсчет общих бонусов во всех барах
  const getTotalBonuses = () => {
    return getUserBonusesForBar(1) + getUserBonusesForBar(2) + getUserBonusesForBar(3) + getUserBonusesForBar(4);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="main-container">
      {/* Top Navigation */}
      <div className="top-navigation">
        <div className="user-info-top">
          <span>Привет, {user.first_name}!</span>
          <span>{getTotalBonuses()} pts</span>
        </div>
        <div className="nav-buttons">
          <button onClick={() => navigate('/')} className="profile-btn">
            🏠 Главная
          </button>
          {user.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="admin-btn">
              ⚙️ Админ
            </button>
          )}
          {process.env.NODE_ENV === 'development' && (
            <button onClick={onToggleRole} className="dev-role-btn">
              🔄 {user.role === 'admin' ? 'User' : 'Admin'}
            </button>
          )}
          <button onClick={onLogout} className="logout-btn">
            Выйти
          </button>
        </div>
      </div>

      <div className="main-container-content">
        {/* Sidebar */}
        <div className="loyalty-sidebar">
          <div className="sidebar-divider"></div>
          <div className="loyalty-logo">
            <div className="logo-circle">
              <img src="/images/logo.png" alt="Logo" />
            </div>
          </div>
          <h2 className="sidebar-title">Программа лояльности</h2>
          
          <div className="accordion-section">
            <button 
              className={`accordion-button ${expandedSection === 'earn' ? 'expanded' : ''}`}
              onClick={() => toggleSection('earn')}
            >
              <span>Как получить баллы?</span>
              <span className="accordion-icon">{expandedSection === 'earn' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'earn' && (
              <ul className="accordion-content">
                <li>Делайте заказы в наших барах</li>
                <li>Участвуйте в акциях</li>
                <li>Приводите друзей</li>
              </ul>
            )}
          </div>

          <div className="accordion-section">
            <button 
              className={`accordion-button ${expandedSection === 'spend' ? 'expanded' : ''}`}
              onClick={() => toggleSection('spend')}
            >
              <span>Как потратить баллы?</span>
              <span className="accordion-icon">{expandedSection === 'spend' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'spend' && (
              <ul className="accordion-content">
                <li>Скидки на напитки</li>
                <li>Бесплатные закуски</li>
                <li>Специальные предложения</li>
              </ul>
            )}
          </div>

          <div className="points-display">
            <span className="points-label">Ваши баллы:</span>
            <span className="points-value">{getTotalBonuses()}</span>
          </div>
        </div>

        {/* Main Content - Profile Info */}
        <div className="main-content">
          <h1 className="page-title">Мой профиль</h1>
          
          <div className="profile-container">
            <div className="profile-card">
              <div className="profile-avatar">
                <div className="avatar-circle">
                  <span className="avatar-initials">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </span>
                </div>
              </div>
              
              <div className="profile-details">
                <div className="profile-field">
                  <span className="field-label">Имя:</span>
                  <span className="field-value">{user.first_name} {user.last_name}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Username:</span>
                  <span className="field-value">@{user.username}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Телефон:</span>
                  <span className="field-value">{user.phone || 'Не указан'}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Роль:</span>
                  <span className={`field-value role-badge ${user.role}`}>{user.role === 'admin' ? 'Администратор' : 'Пользователь'}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Telegram ID:</span>
                  <span className="field-value">{user.id}</span>
                </div>
                
                <div className="profile-field highlight">
                  <span className="field-label">Общие баллы:</span>
                  <span className="field-value total-points">{getTotalBonuses()}</span>
                </div>
              </div>
              
              <div className="profile-bars-breakdown">
                <h3 className="breakdown-title">Баллы по барам:</h3>
                <div className="bars-breakdown">
                  <div className="bar-points">
                    <span className="bar-name">Культура:</span>
                    <span className="bar-points-value">{getUserBonusesForBar(1)}</span>
                  </div>
                  <div className="bar-points">
                    <span className="bar-name">Cabalitos:</span>
                    <span className="bar-points-value">{getUserBonusesForBar(2)}</span>
                  </div>
                  <div className="bar-points">
                    <span className="bar-name">Фонотека:</span>
                    <span className="bar-points-value">{getUserBonusesForBar(3)}</span>
                  </div>
                  <div className="bar-points">
                    <span className="bar-name">Tchaykovsky:</span>
                    <span className="bar-points-value">{getUserBonusesForBar(4)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Page Component (New Design)
function AdminPage({ user, onLogout, onToggleRole }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const navigate = useNavigate();

  // Функция для подсчета бонусов в конкретном баре
  const getUserBonusesForBar = (barId) => {
    const baseBonus = user?.loyaltyPoints || 500; // Базовые 500 бонусов для тестов
    const bonusMultipliers = {
      1: 1.2,   // Культура - 600 бонусов
      2: 0.8,   // Cabalitos - 400 бонусов  
      3: 1.5,   // Фонотека - 750 бонусов
      4: 0.6    // Tchaykovsky - 300 бонусов
    };
    return Math.floor(baseBonus * (bonusMultipliers[barId] || 1));
  };

  // Подсчет общих бонусов во всех барах
  const getTotalBonuses = () => {
    return getUserBonusesForBar(1) + getUserBonusesForBar(2) + getUserBonusesForBar(3) + getUserBonusesForBar(4);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="main-container">
      {/* Top Navigation */}
      <div className="top-navigation">
        <div className="user-info-top">
          <span>Привет, {user.first_name}!</span>
          <span>{getTotalBonuses()} pts</span>
        </div>
                 <div className="nav-buttons">
           <button onClick={() => navigate('/')} className="profile-btn">
             🏠 Главная
           </button>
           <button onClick={() => navigate('/profile')} className="profile-btn">
             👤 Профиль
           </button>
           {process.env.NODE_ENV === 'development' && (
             <button onClick={onToggleRole} className="dev-role-btn">
               🔄 {user.role === 'admin' ? 'User' : 'Admin'}
             </button>
           )}
           <button onClick={onLogout} className="logout-btn">
             Выйти
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
                <li>Пользователи</li>
                <li>Баллы</li>
                <li>Настройки</li>
              </ul>
            )}
          </div>

          <div className="points-display admin-total">
            <span className="points-label">Всего пользователей:</span>
            <span className="points-value">-</span>
          </div>
        </div>

        {/* Main Content - Admin Panel */}
        <div className="main-content">
          <h1 className="page-title">Администрирование</h1>
          
          <div className="admin-container">
            <div className="admin-card">
              <div className="admin-welcome">
                <h2 className="admin-title">Добро пожаловать в панель администратора!</h2>
                <p className="admin-description">
                  Здесь вы сможете управлять пользователями, просматривать статистику, 
                  настраивать систему лояльности и многое другое.
                </p>
              </div>
              
              <div className="admin-placeholder">
                <div className="placeholder-icon">⚙️</div>
                <h3 className="placeholder-title">Панель в разработке</h3>
                <p className="placeholder-text">
                  Функционал администрирования будет добавлен в ближайшее время.
                  Пока что используйте кнопки навигации для переключения между разделами.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 