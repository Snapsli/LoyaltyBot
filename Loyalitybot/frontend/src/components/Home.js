import '../App.css';
import { useUser } from '../context/UserContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { UserCircleIcon, ShieldCheckIcon, ArrowRightOnRectangleIcon, CogIcon } from '@heroicons/react/24/outline';

const Home = () => {
    const { user, loading: userLoading, isAuthenticated, isTelegramApp, logout, authFetch } = useUser();
    const navigate = useNavigate();

    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [errorUsers, setErrorUsers] = useState(null);
    const [updatingRoleId, setUpdatingRoleId] = useState(null);
    const [updateRoleError, setUpdateRoleError] = useState(null);

    useEffect(() => {
        if (isTelegramApp) {
            WebApp.ready();
            WebApp.expand();
        } else if (!userLoading && !isAuthenticated) {
            navigate('/auth');
        }
    }, [userLoading, isAuthenticated, isTelegramApp, navigate]);

    useEffect(() => {
        if (isAuthenticated) {
            const fetchUsers = async () => {
                setLoadingUsers(true);
                setErrorUsers(null);
                try {
                    const data = await authFetch('/users');
                    setUsersList(data || []);
                } catch (error) {
                    console.error("Failed to fetch users:", error);
                    setErrorUsers('Не удалось загрузить список пользователей.');
                } finally {
                    setLoadingUsers(false);
                }
            };
            fetchUsers();
        }
    }, [isAuthenticated, authFetch]);

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const handleRoleChange = async (userId, newRole) => {
        if (!userId || !newRole) return;
        if (user?.id === userId && newRole !== 'admin') {
          alert("Вы не можете лишить себя прав администратора.");
          return;
        }

        setUpdatingRoleId(userId);
        setUpdateRoleError(null);

        try {
            await authFetch(`/users/${userId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole }),
            });

            setUsersList(currentUsers => 
                currentUsers.map(u => 
                    u.id === userId ? { ...u, role: newRole } : u
                )
            );

        } catch (error) {
            console.error("Failed to update role:", error);
            setUpdateRoleError(`Не удалось изменить роль: ${error.message || 'ошибка сервера'}`);
        } finally {
            setUpdatingRoleId(null);
        }
    };

    const isLoading = userLoading || loadingUsers;

    if (isLoading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-white">
                <CogIcon className="h-12 w-12 animate-spin mr-3" />
                Загрузка...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-gray-200 p-4 md:p-8">
            <div className="w-full max-w-6xl mx-auto p-6 md:p-8 space-y-8 bg-gray-800 bg-opacity-80 backdrop-filter backdrop-blur-sm rounded-xl shadow-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 pb-4 border-b border-gray-700">
                    <h1 className="text-3xl font-bold text-white">
                        Добро пожаловать, {user?.first_name || 'User'}!
                    </h1>
                    {isAuthenticated && (
                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition ease-in-out duration-150"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            <span>Выйти</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {user && user.role === 'admin' && (
                      <div className="bg-gradient-to-r from-blue-800 to-indigo-800 p-6 rounded-lg shadow-lg flex items-start gap-4">
                        <ShieldCheckIcon className="h-8 w-8 text-blue-300 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="text-xl font-semibold mb-2 text-white">Панель администратора</h3>
                          <p className="text-blue-100">Управление пользователями и системными настройками.</p>
                        </div>
                      </div>
                    )}
                    {user && user.role === 'user' && (
                      <div className="bg-gradient-to-r from-green-800 to-teal-800 p-6 rounded-lg shadow-lg flex items-start gap-4">
                         <UserCircleIcon className="h-8 w-8 text-green-300 flex-shrink-0 mt-1" />
                         <div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Пользовательская панель</h3>
                            <p className="text-green-100">Ваши основные функции и данные.</p>
                        </div>
                      </div>
                    )}
                     {user && user.role !== 'admin' && (
                        <div className="md:col-start-2"></div>
                     )}
                </div>
                
                <h2 className="text-2xl font-semibold mb-6 text-white">Список пользователей</h2>
                {updateRoleError && <p className="text-red-400 bg-red-900 bg-opacity-50 p-3 rounded-md text-center mb-4">{updateRoleError}</p>}
                {errorUsers && !loadingUsers && <p className="text-yellow-400 bg-yellow-900 bg-opacity-50 p-3 rounded-md text-center mb-4">{errorUsers}</p>}
                
                <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-md">
                    <table className="min-w-full table-auto text-left text-sm font-light text-gray-300">
                        <thead className="bg-gray-700 border-b border-gray-600 text-xs text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th scope="col" className="px-6 py-3">ID</th>
                                <th scope="col" className="px-6 py-3">Username</th>
                                <th scope="col" className="px-6 py-3">Имя</th>
                                <th scope="col" className="px-6 py-3">Фамилия</th>
                                <th scope="col" className="px-6 py-3">Дата создания</th>
                                <th scope="col" className="px-6 py-3">Роль</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {usersList.length > 0 ? (
                                usersList.map((usr, index) => (
                                    <tr 
                                      key={usr.id || usr.telegramId} 
                                      className={`transition duration-150 ease-in-out ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800 bg-opacity-50'} ${user?.role === 'admin' ? 'hover:bg-gray-700' : ''} ${updatingRoleId === usr.id ? 'opacity-60 animate-pulse' : ''}`
                                      }
                                    >
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-400 font-mono text-xs">{usr.id || usr.telegramId}</td>
                                        <td className="whitespace-nowrap px-6 py-4 font-medium text-white">{usr.username}</td>
                                        <td className="whitespace-nowrap px-6 py-4">{usr.firstName || '-'}</td>
                                        <td className="whitespace-nowrap px-6 py-4">{usr.lastName || '-'}</td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 font-medium">
                                            {user?.role === 'admin' ? (
                                                <select 
                                                    value={usr.role}
                                                    onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                                                    disabled={updatingRoleId === usr.id}
                                                    className={`w-full max-w-[120px] bg-gray-700 border border-gray-600 text-white text-xs rounded-md p-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ease-in-out duration-150 ${updatingRoleId === usr.id ? 'cursor-not-allowed opacity-70' : 'hover:border-gray-500'}`}
                                                >
                                                    <option value="user">Пользователь</option>
                                                    <option value="admin">Админ</option>
                                                </select>
                                            ) : (
                                                usr.role === 'admin' ? 
                                                  <span className="px-2.5 py-0.5 bg-indigo-600 text-indigo-100 rounded-full text-xs font-semibold tracking-wide">Админ</span> : 
                                                  <span className="px-2.5 py-0.5 bg-gray-600 text-gray-100 rounded-full text-xs font-semibold tracking-wide">Пользователь</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-6 text-gray-500 italic">
                                        {loadingUsers ? 'Загрузка пользователей...' : 'Пользователи не найдены.'} 
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Home;