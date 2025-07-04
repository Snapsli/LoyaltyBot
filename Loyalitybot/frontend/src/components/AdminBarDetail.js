import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PointsManagement from './PointsManagement';
import UserManagement from './UserManagement';
import '../styles/AdminBarDetail.css';

const AdminBarDetail = ({ user }) => {
  const { barId } = useParams();
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newBarImage, setNewBarImage] = useState(null);
  const [currentBarImage, setCurrentBarImage] = useState('');
  const [bar, setBar] = useState(null);
  const [error, setError] = useState(null);
  
  // Форма добавления меню
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    price: '',
    image: null
  });

  const bars = React.useMemo(() => [
    {
      id: 1,
      name: "Культура",
      address: "Ульяновск, Ленина, 15",
      image: "/images/bars/kultura.jpg",
      description: "Уютное место с атмосферой искусства и культуры"
    },
    {
      id: 2,
      name: "Caballitos Mexican Bar",
      address: "Ульяновск, Дворцовая, 8",
      image: "/images/bars/cabalitos.jpg",
      description: "Мексиканский бар с аутентичными коктейлями"
    },
    {
      id: 3,
      name: "Fonoteca - Listening Bar",
      address: "Ульяновск, Карла Маркса, 20",
      image: "/images/bars/fonoteka.jpg",
      description: "Музыкальный бар для истинных меломанов"
    },
    {
      id: 4,
      name: "Tchaikovsky",
      address: "Ульяновск, Советская, 25",
      image: "/images/bars/tchaykovsky.jpg",
      description: "Классический бар с изысканной атмосферой"
    }
  ], []);

  React.useEffect(() => {
    // Находим бар внутри эффекта чтобы избежать stale closure
    const currentBar = bars.find(b => b.id === parseInt(barId));
    if (!currentBar) return;

    let isMounted = true;

    const loadBarData = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/bars/${barId}`);
        
        if (response.ok && isMounted) {
          const barData = await response.json();
          const desc = barData.description || currentBar?.description || '';
          if (!isEditingDescription && !justSaved) {
            setDescription(desc);
            setOriginalDescription(desc);
          }
          setCurrentBarImage(barData.image || currentBar?.image || '');
          setMenuItems(barData.menu || []);
          setBar(barData);
        } else if (isMounted) {
          // Если бар не найден в БД, используем дефолтное описание
          const desc = currentBar?.description || '';
          if (!isEditingDescription && !justSaved) {
            setDescription(desc);
            setOriginalDescription(desc);
          }
          setCurrentBarImage(currentBar?.image || '');
          setBar(currentBar);
        }
      } catch (error) {
        console.error('Error loading bar data:', error);
        if (isMounted) {
          const desc = currentBar?.description || '';
          if (!isEditingDescription && !justSaved) {
            setDescription(desc);
            setOriginalDescription(desc);
          }
          setCurrentBarImage(currentBar?.image || '');
          setBar(currentBar);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBarData();

    return () => {
      isMounted = false;
    };
  }, [barId, bars, isEditingDescription, justSaved]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSaveDescription = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('loyalty_token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/bars/${barId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify({ description })
      });

      if (response.ok) {
        setIsEditingDescription(false);
        setOriginalDescription(description);
        setJustSaved(true);
        // Сбрасываем флаг через 2 секунды
        setTimeout(() => setJustSaved(false), 2000);
        console.log('Description saved successfully');
      } else {
        const error = await response.json();
        console.error('Error saving description:', error);
        alert('Ошибка при сохранении описания');
      }
    } catch (error) {
      console.error('Error saving description:', error);
      alert('Ошибка при сохранении описания');
    } finally {
      setSaving(false);
    }
  };

  const handleBarImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewBarImage(file);
    }
  };

  const handleSaveBarImage = async () => {
    if (!newBarImage) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('loyalty_token');
      
      const formData = new FormData();
      formData.append('image', newBarImage);

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/bars/${barId}/image`, {
        method: 'PUT',
        headers: {
          'x-session-token': token
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentBarImage(result.image);
        setIsEditingImage(false);
        setNewBarImage(null);
        console.log('Bar image saved successfully');
      } else {
        const error = await response.json();
        console.error('Error saving bar image:', error);
        alert('Ошибка при сохранении изображения');
      }
    } catch (error) {
      console.error('Error saving bar image:', error);
      alert('Ошибка при сохранении изображения');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      alert('Пожалуйста, заполните название и цену');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('loyalty_token');
      
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('name', newMenuItem.name);
      formData.append('price', newMenuItem.price);
      if (newMenuItem.image) {
        formData.append('image', newMenuItem.image);
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/bars/${barId}/menu`, {
        method: 'POST',
        headers: {
          'x-session-token': token
        },
        body: formData
      });

      if (response.ok) {
        const savedItem = await response.json();
        setMenuItems([...menuItems, savedItem]);
        setNewMenuItem({ name: '', price: '', image: null });
        setShowAddMenu(false);
        console.log('Menu item saved successfully');
      } else {
        const error = await response.json();
        console.error('Error saving menu item:', error);
        alert('Ошибка при сохранении блюда');
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Ошибка при сохранении блюда');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setNewMenuItem({ ...newMenuItem, image: file });
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это блюдо?')) {
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('loyalty_token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/menu/${itemId}`, {
        method: 'DELETE',
        headers: {
          'x-session-token': token
        }
      });

      if (response.ok) {
        setMenuItems(menuItems.filter(item => (item._id || item.id) !== itemId));
        console.log('Menu item deleted successfully');
      } else {
        const error = await response.json();
        console.error('Error deleting menu item:', error);
        alert('Ошибка при удалении блюда');
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Ошибка при удалении блюда');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!bar) return <div>Бар не найден.</div>;

  return (
    <div className="admin-bar-detail-container">
      <header className="admin-bar-detail-header">
        <h1>{bar.name}</h1>
        <p>Адрес: {bar.address}</p>
      </header>
      
      <div className="main-container">
        {/* Top Navigation */}
        <div className="top-navigation">
          <div className="user-info-top">
            <span>Админ: {user.first_name}</span>
            <span>Редактирование</span>
          </div>
          <div className="nav-buttons">
            <button onClick={() => navigate('/admin')} className="profile-btn">
              ← Назад к списку
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
                  <li onClick={() => navigate('/admin/points')} style={{ cursor: 'pointer' }}>Баллы</li>
                  <li>Настройки</li>
                </ul>
              )}
            </div>

          </div>

          {/* Main Content */}
          <div className="main-content">
            <h1 className="bar-detail-page-title">Редактирование: {bar.name}</h1>
            
            <div className="bar-detail-container">
              <div className="bar-detail-card">
                <div className="bar-detail-image-container">
                  <img 
                    src={currentBarImage || bar.image} 
                    alt={bar.name}
                    className="bar-detail-card-image"
                  />
                </div>
                
                {/* Редактирование фотографии */}
                <div className="admin-image-section">
                  <div className="admin-section-header">
                    <h3>Фотография бара</h3>
                    {!isEditingImage && (
                      <button 
                        className="edit-btn"
                        onClick={() => setIsEditingImage(true)}
                      >
                        📷 Изменить фото
                      </button>
                    )}
                  </div>
                  
                  {isEditingImage && (
                    <div className="edit-image-form">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBarImageChange}
                        className="image-input"
                      />
                      <div className="edit-actions">
                        <button 
                          className="save-btn" 
                          onClick={handleSaveBarImage}
                          disabled={saving || !newBarImage}
                        >
                          {saving ? 'Сохраняется...' : 'Сохранить'}
                        </button>
                        <button 
                          className="cancel-btn" 
                          onClick={() => {
                            setIsEditingImage(false);
                            setNewBarImage(null);
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bar-detail-info">
                  <p className="bar-detail-address">{bar.address}</p>
                  
                  {/* Редактируемое описание */}
                  <div className="bar-detail-description">
                    <div className="admin-section-header">
                      <h3>Описание бара</h3>
                      {!isEditingDescription && (
                        <button 
                          className="edit-btn"
                          onClick={() => setIsEditingDescription(true)}
                        >
                          ✏️ Редактировать
                        </button>
                      )}
                    </div>
                    
                    {isEditingDescription ? (
                      <div className="edit-description">
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Введите описание бара..."
                          rows={4}
                        />
                        <div className="edit-actions">
                          <button 
                            className="save-btn" 
                            onClick={handleSaveDescription}
                            disabled={saving}
                          >
                            {saving ? 'Сохраняется...' : 'Сохранить'}
                          </button>
                          <button 
                            className="cancel-btn" 
                            onClick={() => {
                              setDescription(originalDescription);
                              setIsEditingDescription(false);
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{description}</p>
                    )}
                  </div>

                  {/* Управление меню */}
                  <div className="admin-menu-section">
                    <div className="admin-section-header">
                      <h3>Меню ({menuItems.length} блюд)</h3>
                      <button 
                        className="add-btn"
                        onClick={() => setShowAddMenu(true)}
                      >
                        ➕ Добавить блюдо
                      </button>
                    </div>
                    
                    {menuItems.length > 0 && (
                      <div className="menu-items-preview">
                        {menuItems.map(item => (
                          <div key={item._id || item.id} className="menu-item-preview">
                            <img src={item.image} alt={item.name} />
                            <div className="menu-item-info">
                              <strong>{item.name}</strong>
                              <span>{item.price} ₽</span>
                            </div>
                            <button 
                              className="delete-item-btn"
                              onClick={() => handleDeleteMenuItem(item._id || item.id)}
                              disabled={saving}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Menu Item Modal */}
      {showAddMenu && (
        <div className="modal-overlay" onClick={() => setShowAddMenu(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Добавить блюдо в {bar.name}</h3>
              <button className="modal-close" onClick={() => setShowAddMenu(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Название блюда:</label>
                <input
                  type="text"
                  value={newMenuItem.name}
                  onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                  placeholder="Введите название блюда..."
                />
              </div>
              <div className="form-group">
                <label>Цена (₽):</label>
                <input
                  type="number"
                  value={newMenuItem.price}
                  onChange={(e) => setNewMenuItem({...newMenuItem, price: e.target.value})}
                  placeholder="Введите цену..."
                />
              </div>
              <div className="form-group">
                <label>Фотография:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <div className="modal-actions">
                <button 
                  className="btn-primary" 
                  onClick={handleAddMenuItem}
                  disabled={saving}
                >
                  {saving ? 'Сохраняется...' : 'Добавить блюдо'}
                </button>
                <button className="btn-secondary" onClick={() => setShowAddMenu(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBarDetail; 