import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/BarLoyalty.css';
import BarDetail from './BarDetail';

const BarLoyalty = ({ user, onRefreshUser }) => {
  const [selectedBar, setSelectedBar] = useState(null);
  const { barId } = useParams();
  const navigate = useNavigate();

  // Получаем общий баланс пользователя
  const getUserBalance = () => {
    return user?.balance || 0;
  };

  // Автоматически выбираем бар на основе URL
  useEffect(() => {
    if (barId) {
      const bars = [
        {
          id: 1,
          name: 'Культура',
          image: '/images/bars/kultura.jpg',
          address: 'Ульяновск, ул. Пушкинская, 47'
        },
        {
          id: 2,
          name: 'Cabalitos',
          image: '/images/bars/cabalitos.jpg',
          address: 'Ульяновск, ул. Рубинштейна, 25'
        },
        {
          id: 3,
          name: 'Fonoteca - Listening Bar',
          image: '/images/bars/fonoteka.jpg',
          address: 'Ульяновск, Карла Маркса, 20'
        },
        {
          id: 4,
          name: 'Tchaykovsky',
          image: '/images/bars/tchaykovsky.jpg',
          address: 'Ульяновск, ул. Чайковского, 15'
        }
      ];

      const bar = bars.find(b => b.id === parseInt(barId));
      if (bar) {
        setSelectedBar(bar);
      } else {
        // Если бар не найден, возвращаем на главную
        navigate('/');
      }
    }
  }, [barId, navigate]);

  const handleBackToMain = () => {
    navigate('/');
  };

  // Если нет выбранного бара, перенаправляем на главную
  if (!selectedBar) {
    return (
      <div className="bar-loyalty">
        <div className="bars-header">
          <h1>Загрузка...</h1>
        </div>
      </div>
    );
  }

  // Показываем страницу выбранного бара
  return (
    <BarDetail 
      bar={selectedBar} 
      user={user}
      onBack={handleBackToMain}
      onRefreshUser={onRefreshUser}
    />
  );
};

export default BarLoyalty; 