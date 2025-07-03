import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import BarLoyalty from './components/BarLoyalty';
import AdminBarDetail from './components/AdminBarDetail';
import UserManagement from './components/UserManagement';

// Telegram WebApp SDK integration
const tg = window.Telegram?.WebApp;

// Helper functions for bars and points
const BAR_NAMES = {
  1: "Культура",
  2: "Caballitos Mexican Bar", 
  3: "Fonoteca - Listening Bar",
  4: "Tchaikovsky"
};

const getUserBarPoints = (user, barId) => {
  if (!user || !user.barPoints) return 0;
  // Try both string and numeric keys for compatibility
  return user.barPoints[barId.toString()] || user.barPoints[barId] || 0;
};

const getAllUserBarPoints = (user) => {
  if (!user || !user.barPoints) return {};
  return user.barPoints;
};

const getTotalUserPoints = (user) => {
  if (!user || !user.barPoints) return 0;
  const barPoints = getAllUserBarPoints(user);
  return Object.values(barPoints).reduce((total, points) => total + (points || 0), 0);
};

// Mock authentication for development
const mockAuth = {
  user: {
    id: 123456789,
    first_name: "John",
    last_name: "Doe",
    username: "johndoe",
    role: "user"
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/telegram`, {
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
    try {
      // Call real API with mock data to create user in database
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: mockAuth.user.id,
          username: mockAuth.user.username,
          first_name: mockAuth.user.first_name,
          last_name: mockAuth.user.last_name,
          phone_number: "+7 900 123-45-67"
        })
      });

      if (!response.ok) {
        throw new Error('Mock authentication failed');
      }

      const data = await response.json();
      
      // Create user object with proper structure
      const user = {
        id: data.telegram_id,
        first_name: mockAuth.user.first_name,
        last_name: mockAuth.user.last_name,
        username: mockAuth.user.username,
        role: "admin", // First user becomes admin
        balance: 0
      };
      
      setUser(user);
      localStorage.setItem('loyalty_user', JSON.stringify(user));
      localStorage.setItem('loyalty_token', data.session_token);
      
    } catch (err) {
      console.error('Mock auth error:', err);
      throw err;
    }
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
      if (!token || !user) return;

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/me`, {
        headers: {
          'x-telegram-id': user.id.toString(),
          'x-session-token': token
        }
      });

      if (response.ok) {
        const userData = await response.json();
        const updatedUser = { 
          ...user, 
          balance: userData.balance,
          barPoints: userData.barPoints || {}
        };
        setUser(updatedUser);
        localStorage.setItem('loyalty_user', JSON.stringify(updatedUser));
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
          <>
            <Route path="/admin" element={<AdminPage user={user} onLogout={logout} onToggleRole={toggleRole} />} />
            <Route path="/admin/bar/:barId" element={<AdminBarDetail user={user} />} />
            <Route path="/admin/users" element={<UserManagement user={user} />} />
          </>
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
  const [barsData, setBarsData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
    loadBarsData();
  }, []);

  const loadBarsData = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/bars`);
      if (response.ok) {
        const barsArray = await response.json();
        const barsMap = {};
        barsArray.forEach(bar => {
          barsMap[bar.barId] = bar;
        });
        setBarsData(barsMap);
      }
    } catch (error) {
      console.error('Error loading bars data:', error);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('loyalty_token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/user/stats`, {
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

  // Создаем массив баров с обновленными данными из БД
  const bars = [
    {
      id: 1,
      name: "Культура",
      address: "Ульяновск, Ленина, 15",
      image: barsData[1]?.image || "/images/bars/kultura.jpg"
    },
    {
      id: 2,
      name: "Caballitos Mexican Bar", 
      address: "Ульяновск, Дворцовая, 8",
      image: barsData[2]?.image || "/images/bars/cabalitos.jpg"
    },
    {
      id: 3,
      name: "Fonoteca - Listening Bar",
      address: "Ульяновск, Карла Маркса, 20", 
      image: barsData[3]?.image || "/images/bars/fonoteka.jpg"
    },
    {
      id: 4,
      name: "Tchaikovsky",
      address: "Ульяновск, Советская, 25",
      image: barsData[4]?.image || "/images/bars/tchaykovsky.jpg"
    }
  ];

  return (
    <div className="main-container">
      {/* Top Navigation */}
      <div className="top-navigation">
        <div className="user-info-top">
          <span>Привет, {user.first_name}!</span>
          <span>{getTotalUserPoints(user)} pts</span>
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
          
          <div className="points-display">
            <span className="points-label">Баллы по заведениям:</span>
            <div className="bars-points-list">
              {Object.entries(BAR_NAMES).map(([barId, barName]) => (
                <div key={barId} className="bar-points-item">
                  <span className="bar-name">{barName}:</span>
                  <span className="bar-points">{getUserBarPoints(user, barId)}</span>
                </div>
              ))}
            </div>
            <div className="total-points-summary">
              <span className="points-label">Общий итог:</span>
              <span className="points-value">{getTotalUserPoints(user)}</span>
            </div>
            <button onClick={onRefreshPoints} className="refresh-points-btn">↻</button>
          </div>

          <div className="accordion-section faq-section">
            <button 
              className={`accordion-button faq-button ${expandedSection === 'faq' ? 'expanded' : ''}`}
              onClick={() => toggleSection('faq')}
            >
              <span>❓ FAQ</span>
              <span className="accordion-icon">{expandedSection === 'faq' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'faq' && (
              <div className="accordion-content faq-content">
                <div className="faq-item">
                  <h4>Как получить баллы?</h4>
                  <ul>
                    <li>Делайте заказы в наших барах</li>
                    <li>Участвуйте в акциях</li>
                    <li>Приводите друзей</li>
                  </ul>
                </div>
                <div className="faq-item">
                  <h4>Как потратить баллы?</h4>
                  <ul>
                    <li>Скидки на напитки</li>
                    <li>Бесплатные закуски</li>
                    <li>Специальные предложения</li>
                  </ul>
                </div>
              </div>
            )}
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
                      <h4>{bar.name}</h4>
                      <p>{barsData[bar.id]?.description || 'Описание будет добавлено администратором.'}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="bar-info">
                <h3 className="bar-name">{bar.name}</h3>
                <p className="bar-address">{bar.address}</p>
                <div className="bar-user-points">
                  <span className="user-points-label">Ваши баллы:</span>
                  <span className="user-points-value">{getUserBarPoints(user, bar.id)} pts</span>
                </div>
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

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="main-container">
      {/* Top Navigation */}
      <div className="top-navigation">
        <div className="user-info-top">
          <span>Привет, {user.first_name}!</span>
          <span>{getTotalUserPoints(user)} pts</span>
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
          
          <div className="points-display">
            <span className="points-label">Баллы по заведениям:</span>
            <div className="bars-points-list">
              {Object.entries(BAR_NAMES).map(([barId, barName]) => (
                <div key={barId} className="bar-points-item">
                  <span className="bar-name">{barName}:</span>
                  <span className="bar-points">{getUserBarPoints(user, barId)}</span>
                </div>
              ))}
            </div>
            <div className="total-points-summary">
              <span className="points-label">Общий итог:</span>
              <span className="points-value">{getTotalUserPoints(user)}</span>
            </div>
          </div>

          <div className="accordion-section faq-section">
            <button 
              className={`accordion-button faq-button ${expandedSection === 'faq' ? 'expanded' : ''}`}
              onClick={() => toggleSection('faq')}
            >
              <span>❓ FAQ</span>
              <span className="accordion-icon">{expandedSection === 'faq' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'faq' && (
              <div className="accordion-content faq-content">
                <div className="faq-item">
                  <h4>Как получить баллы?</h4>
                  <ul>
                    <li>Делайте заказы в наших барах</li>
                    <li>Участвуйте в акциях</li>
                    <li>Приводите друзей</li>
                  </ul>
                </div>
                <div className="faq-item">
                  <h4>Как потратить баллы?</h4>
                  <ul>
                    <li>Скидки на напитки</li>
                    <li>Бесплатные закуски</li>
                    <li>Специальные предложения</li>
                  </ul>
                </div>
              </div>
            )}
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
                  <span className="field-value total-points">{getTotalUserPoints(user)}</span>
                </div>
              </div>
              
              <div className="profile-bars-breakdown">
                <h3 className="breakdown-title">Баллы по заведениям:</h3>
                <div className="bars-breakdown">
                  {Object.entries(BAR_NAMES).map(([barId, barName]) => (
                    <div key={barId} className="bar-points">
                      <span className="bar-name">{barName}</span>
                      <span className="bar-points-value">{getUserBarPoints(user, barId)} pts</span>
                    </div>
                  ))}
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
  const [barsData, setBarsData] = useState({});
  const navigate = useNavigate();

  const loadBarsData = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/bars`);
      if (response.ok) {
        const barsArray = await response.json();
        const barsMap = {};
        barsArray.forEach(bar => {
          barsMap[bar.barId] = bar;
        });
        setBarsData(barsMap);
      }
    } catch (error) {
      console.error('Error loading bars data:', error);
    }
  };

  React.useEffect(() => {
    loadBarsData();
  }, []);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Создаем массив баров с обновленными данными из БД
  const bars = [
    {
      id: 1,
      name: "Культура",
      address: "Ульяновск, Ленина, 15",
      image: barsData[1]?.image || "/images/bars/kultura.jpg",
      description: "Уютное место с атмосферой искусства и культуры"
    },
    {
      id: 2,
      name: "Caballitos Mexican Bar",
      address: "Ульяновск, Дворцовая, 8", 
      image: barsData[2]?.image || "/images/bars/cabalitos.jpg",
      description: "Мексиканский бар с аутентичными коктейлями"
    },
    {
      id: 3,
      name: "Fonoteca - Listening Bar",
      address: "Ульяновск, Карла Маркса, 20",
      image: barsData[3]?.image || "/images/bars/fonoteka.jpg",
      description: "Музыкальный бар для истинных меломанов"
    },
    {
      id: 4,
      name: "Tchaikovsky",
      address: "Ульяновск, Советская, 25",
      image: barsData[4]?.image || "/images/bars/tchaykovsky.jpg",
      description: "Классический бар с изысканной атмосферой"
    }
  ];

  const handleBarClick = (bar) => {
    navigate(`/admin/bar/${bar.id}`);
  };

  return (
    <div className="main-container">
      {/* Top Navigation */}
      <div className="top-navigation">
        <div className="user-info-top">
          <span>Привет, {user.first_name}!</span>
          <span>{getTotalUserPoints(user)} pts</span>
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
                <li onClick={() => navigate('/admin/users')} style={{ cursor: 'pointer' }}>Пользователи</li>
                <li>Баллы</li>
                <li>Настройки</li>
              </ul>
            )}
          </div>
        </div>

        {/* Main Content - Admin Panel */}
        <div className="main-content">
          <h1 className="page-title">Управление барами</h1>
          
          <div className="bars-grid">
            {bars.map(bar => (
              <div 
                key={bar.id} 
                className="bar-card admin-bar-card" 
                onClick={() => handleBarClick(bar)}
              >
                <div className="bar-image-container">
                  <img src={bar.image} alt={bar.name} className="bar-image" />
                  <div className="admin-overlay">
                    <div className="admin-overlay-content">
                      <span>⚙️</span>
                      <p>Редактировать</p>
                    </div>
                  </div>
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

export default App; 