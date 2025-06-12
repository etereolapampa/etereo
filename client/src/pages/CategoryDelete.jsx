// src/pages/CategoryDelete.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';

export default function CategoryDelete() {
  const { id } = useParams();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/categories/${id}`)
      .then(res => setName(res.data.name))
      .catch(() => nav('/datos'));
  }, [id, nav]);

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${id}`);
      setModalMessage('Categoría eliminada satisfactoriamente');
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    nav('/datos');
  };

  return (
    <>
      <h2>Eliminar Categoría</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <p>¿Seguro que deseas eliminar "{name}"?</p>
      <button onClick={handleDelete} className="btn btn-danger me-2">Eliminar</button>
      <button onClick={() => nav('/datos')} className="btn btn-secondary">Cancelar</button>

      <Modal 
        show={showModal}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </>
  );
}
