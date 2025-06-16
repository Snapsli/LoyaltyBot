import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const AuthCallback = () => {
  const { loginWithTelegramData, loading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const handleTelegramCallback = async () => {
      // Get Telegram auth data from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const authData = {
        id: urlParams.get('id'),
        first_name: urlParams.get('first_name'),
        last_name: urlParams.get('last_name'),
        username: urlParams.get('username'),
        photo_url: urlParams.get('photo_url'),
        auth_date: urlParams.get('auth_date'),
        hash: urlParams.get('hash')
      };

      if (authData.id) {
        // Process login with the received data
        const success = await loginWithTelegramData(authData);
        if (success) {
          navigate('/');
        } else {
          navigate('/auth', { state: { error: 'Authentication failed' } });
        }
      } else {
        navigate('/auth', { state: { error: 'Invalid authentication data' } });
      }
    };

    if (!loading) {
      handleTelegramCallback();
    }
  }, [loading, loginWithTelegramData, navigate]);

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white">
      Авторизация...
    </div>
  );
};

export default AuthCallback; 