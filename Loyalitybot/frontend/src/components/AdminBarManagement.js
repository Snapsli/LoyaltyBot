import React, { useState } from 'react';

function AdminBarManagement({ sessionToken }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const handleCreateBar = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/bars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({ name, address, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Не удалось создать бар');
      }
      
      setMessage(`Бар "${data.name}" успешно создан!`);
      // Очистка формы
      setName('');
      setAddress('');
      setDescription('');

    } catch (error) {
      setMessage(`Ошибка: ${error.message}`);
    }
  };

  return (
    <div className="admin-bar-management">
      <h2>Управление барами</h2>
      <form onSubmit={handleCreateBar}>
        <h3>Создать новый бар</h3>
        <div>
          <label>Название:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Адрес:</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
        <div>
          <label>Описание:</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button type="submit">Создать бар</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default AdminBarManagement; 