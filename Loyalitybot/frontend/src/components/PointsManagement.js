import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Helper functions для баров
const BAR_NAMES = {
  1: "Культура",
  2: "Caballitos Mexican Bar", 
  3: "Fonoteca - Listening Bar",
  4: "Tchaikovsky"
};

const PointsManagement = ({ user, onLogout, onToggleRole }) => {
  const [pointsSettings, setPointsSettings] = useState({});
  const [editingBar, setEditingBar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPointsSettings();
  }, []);

  const loadPointsSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/points-settings`, {
        headers: {
          'x-session-token': localStorage.getItem('loyalty_token')
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPointsSettings(data);
      } else {
        // Если настроек нет, используем значения по умолчанию
        const defaultSettings = {};
        Object.keys(BAR_NAMES).forEach(barId => {
          defaultSettings[barId] = {
            pointsPerRuble: 0.01, // 1 балл за 100 рублей
            minPurchase: 0,
            isActive: true
          };
        });
        setPointsSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading points settings:', error);
      // Используем значения по умолчанию при ошибке
      const defaultSettings = {};
      Object.keys(BAR_NAMES).forEach(barId => {
        defaultSettings[barId] = {
          pointsPerRuble: 0.01,
          minPurchase: 0,
          isActive: true
        };
      });
      setPointsSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (barId, newSettings) => {
    try {
      setSaving(true);
      
      console.log('📤 Sending settings to backend for bar', barId, ':', newSettings);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/points-settings/${barId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('loyalty_token')
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend response:', result);
        
        setPointsSettings(prev => ({
          ...prev,
          [barId]: newSettings
        }));
        setEditingBar(null);
      } else {
        console.error('❌ Failed to save settings, response:', response.status);
        alert('Ошибка при сохранении настроек');
      }
    } catch (error) {
      console.error('Error saving points settings:', error);
      alert('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatPointsRate = (pointsPerRuble) => {
    const rublesPer1Point = 1 / pointsPerRuble;
    return `${rublesPer1Point.toFixed(0)} ₽ = 1 балл`;
  };

  if (loading) {
    return (
      <div className="main-container">
        <div className="loading-container">
          <p>Загрузка настроек начисления баллов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      {/* Top Navigation */}
      <div className="top-navigation">
        <div className="user-info-top">
          <span>Привет, {user.first_name}!</span>
        </div>
        <div className="nav-buttons">
          <button onClick={() => navigate('/admin')} className="profile-btn">
            ← Назад к админ-панели
          </button>
          <button onClick={() => navigate('/')} className="profile-btn">
            🏠 Главная
          </button>
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
          <h2 className="sidebar-title">Управление баллами</h2>
          
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
                <li style={{ fontWeight: 'bold', color: '#2481cc' }}>Баллы</li>
                <li>Настройки</li>
              </ul>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <h1 className="page-title">Настройки начисления баллов</h1>
          <p className="page-subtitle">
            Управляйте правилами начисления баллов для каждого заведения
          </p>
          
          <div className="points-settings-grid">
            {Object.entries(BAR_NAMES).map(([barId, barName]) => {
              const settings = pointsSettings[barId] || { pointsPerRuble: 0.01, minPurchase: 0, isActive: true };
              const isEditing = editingBar === barId;
              
              return (
                <div key={barId} className="points-settings-card">
                  <div className="card-header">
                    <h3 className="bar-name">{barName}</h3>
                    <div className="status-indicator">
                      <span className={`status-dot ${settings.isActive ? 'active' : 'inactive'}`}></span>
                      <span className="status-text">
                        {settings.isActive ? 'Активно' : 'Неактивно'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-content">
                    {isEditing ? (
                      <EditingForm
                        barId={barId}
                        settings={settings}
                        onSave={(newSettings) => handleSaveSettings(barId, newSettings)}
                        onCancel={() => setEditingBar(null)}
                        saving={saving}
                      />
                    ) : (
                      <ViewMode
                        settings={settings}
                        formatPointsRate={formatPointsRate}
                        onEdit={() => setEditingBar(barId)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент для просмотра настроек
const ViewMode = ({ settings, formatPointsRate, onEdit }) => (
  <>
    <div className="setting-row">
      <span className="setting-label">Курс обмена:</span>
      <span className="setting-value">{formatPointsRate(settings.pointsPerRuble)}</span>
    </div>
    <div className="setting-row">
      <span className="setting-label">Мин. покупка:</span>
      <span className="setting-value">{settings.minPurchase} ₽</span>
    </div>
    <div className="card-actions">
      <button className="edit-btn" onClick={onEdit}>
        ✏️ Редактировать
      </button>
    </div>
  </>
);

// Компонент для редактирования настроек
const EditingForm = ({ barId, settings, onSave, onCancel, saving }) => {
  const [rublesPer1Point, setRublesPer1Point] = useState(1 / settings.pointsPerRuble);
  const [minPurchase, setMinPurchase] = useState(settings.minPurchase);
  const [isActive, setIsActive] = useState(settings.isActive);

  const handleSave = () => {
    const newSettings = {
      pointsPerRuble: 1 / rublesPer1Point,
      minPurchase: parseFloat(minPurchase) || 0,
      isActive
    };
    
    console.log('🔧 Admin saving settings for bar', barId);
    console.log('  - rublesPer1Point:', rublesPer1Point);
    console.log('  - calculated pointsPerRuble:', newSettings.pointsPerRuble);
    console.log('  - minPurchase:', newSettings.minPurchase);
    console.log('  - isActive:', newSettings.isActive);
    
    onSave(newSettings);
  };

  return (
    <>
      <div className="form-group">
        <label>Рублей за 1 балл:</label>
        <input
          type="number"
          value={rublesPer1Point}
          onChange={(e) => setRublesPer1Point(parseFloat(e.target.value) || 1)}
          min="1"
          step="1"
        />
        <small>Например: 100 = 1 балл за каждые 100 рублей</small>
      </div>
      
      <div className="form-group">
        <label>Минимальная покупка (₽):</label>
        <input
          type="number"
          value={minPurchase}
          onChange={(e) => setMinPurchase(e.target.value)}
          min="0"
          step="0.01"
        />
        <small>Баллы начисляются только при покупке от этой суммы</small>
      </div>
      
      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Начисление активно
        </label>
      </div>
      
      <div className="card-actions">
        <button 
          className="save-btn" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Сохраняется...' : 'Сохранить'}
        </button>
        <button 
          className="cancel-btn" 
          onClick={onCancel}
          disabled={saving}
        >
          Отмена
        </button>
      </div>
    </>
  );
};

export default PointsManagement; 