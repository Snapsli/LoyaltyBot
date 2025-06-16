import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Telegram WebApp SDK integration
const tg = window.Telegram?.WebApp;

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
      <div className="app-container">
        <header className="app-header">
          <h1>🎯 Loyalty Program</h1>
          <div className="user-info">
            <span>Hello, {user.first_name}!</span>
            <button onClick={logout} className="logout-button">Logout</button>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard user={user} onRefreshPoints={refreshPoints} />} />
            <Route path="/profile" element={<Profile user={user} />} />
            {user.role === 'admin' && (
              <Route path="/admin" element={<AdminPanel />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <nav className="app-nav">
          <a href="/" className="nav-item">
            <span>🏠</span>
            <span>Home</span>
          </a>
          <a href="/profile" className="nav-item">
            <span>👤</span>
            <span>Profile</span>
          </a>
          {user.role === 'admin' && (
            <a href="/admin" className="nav-item">
              <span>⚙️</span>
              <span>Admin</span>
            </a>
          )}
        </nav>
      </div>
    </Router>
  );
}

// Dashboard Component
function Dashboard({ user, onRefreshPoints }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

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

  return (
    <div className="dashboard">
      <div className="welcome-card">
        <h2>Welcome back!</h2>
        <p>Track your loyalty points and rewards</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Loyalty Points</h3>
          <p className="stat-value">{user.loyaltyPoints || 0}</p>
          <button onClick={onRefreshPoints} className="refresh-button">
            Refresh
          </button>
        </div>
        
        <div className="stat-card">
          <h3>Member Since</h3>
          <p className="stat-value">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        {stats && (
          <>
            <div className="stat-card">
              <h3>This Month</h3>
              <p className="stat-value">{stats.monthlyPoints || 0}</p>
            </div>
            
            <div className="stat-card">
              <h3>Total Earned</h3>
              <p className="stat-value">{stats.totalEarned || 0}</p>
            </div>
          </>
        )}
      </div>

      <div className="actions-section">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-button">
            🎁 Redeem Rewards
          </button>
          <button className="action-button">
            📊 View History
          </button>
          <button className="action-button">
            🔗 Refer Friends
          </button>
        </div>
      </div>
    </div>
  );
}

// Profile Component
function Profile({ user }) {
  return (
    <div className="profile">
      <h2>Profile</h2>
      <div className="profile-info">
        <div className="profile-field">
          <label>Name:</label>
          <span>{user.first_name} {user.last_name}</span>
        </div>
        <div className="profile-field">
          <label>Username:</label>
          <span>@{user.username}</span>
        </div>
        <div className="profile-field">
          <label>Role:</label>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
        </div>
        <div className="profile-field">
          <label>Telegram ID:</label>
          <span>{user.id}</span>
        </div>
        <div className="profile-field">
          <label>Loyalty Points:</label>
          <span className="points-value">{user.loyaltyPoints || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Admin Panel Component
function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('loyalty_token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'X-Session-Token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-panel loading">Loading users...</div>;
  }

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>
      <div className="users-table">
        <h3>Users ({users.length})</h3>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="table-container">
            {users.map(user => (
              <div key={user._id} className="user-row">
                <div className="user-info">
                  <strong>{user.first_name} {user.last_name}</strong>
                  <span>@{user.username}</span>
                  <span className={`role-badge ${user.role}`}>{user.role}</span>
                </div>
                <div className="user-stats">
                  <span>{user.loyaltyPoints || 0} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 