import React, { useState } from 'react';
import '../styles/AddBarModal.css';

function AddBarModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const barData = { name, address, description, image };
    // Пока просто выводим в консоль, логику сохранения добавим позже
    console.log(barData); 
    onSave(barData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Добавить новый бар</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Адрес</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Фотография</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && <img src={imagePreview} alt="Предпросмотр" className="image-preview" />}
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Отмена</button>
            <button type="submit" className="btn-save">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBarModal; 