import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const Auth = () => {
  const { isAuthenticated, loading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated, redirect immediately
    if (isAuthenticated && !loading) {
      navigate('/');
      return; // Exit the effect early
    }

    let script = null; // Define script variable scope
    const container = document.getElementById('telegram-login-container');

    // Only initialize the widget if not authenticated, not loading, and container exists
    if (!isAuthenticated && !loading && container) {
      script = document.createElement('script'); // Assign to the scoped variable
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', process.env.REACT_APP_TELEGRAM_BOT_NAME || 'your_bot_name');
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '8');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-userpic', 'true');
      script.setAttribute('data-auth-url', `${window.location.origin}/auth/callback`);
      script.async = true;

      container.appendChild(script);
    }

    return () => {
      // Ensure script and container exist before trying to remove
      if (script && container && container.contains(script)) {
        container.removeChild(script);
      }
    };
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-800 text-white">
        Загрузка...
      </div>
    );
  }

  // Render login form only if not loading (redirect handles the authenticated case)
  if (!loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-800 text-white p-4">
        <div className="max-w-md w-full bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm p-6 rounded-xl shadow-xl">
          <h1 className="text-3xl font-bold text-center mb-8">Войти</h1>
          <p className="text-center mb-8">Для доступа к приложению, пожалуйста, авторизуйтесь через Telegram</p>
          <div id="telegram-login-container" className="flex justify-center mb-4"></div>
        </div>
      </div>
    );
  }

  // Return null or loading indicator if still loading (optional, handled above)
  return null;
};

export default Auth; 