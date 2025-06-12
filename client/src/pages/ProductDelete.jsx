// src/pages/ProductDelete.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';

export default function ProductDelete() {
  const { id } = useParams();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(res => setName(res.data.name))
      .catch(() => navigate('/datos'));
  }, [id, navigate]);

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${id}`);
      setModalMessage('Producto eliminado satisfactoriamente');
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    navigate('/datos');
  };

  return (
    <>
      <h2>Eliminar Producto</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <p>¿Seguro que deseas eliminar "{name}"?</p>
      <button onClick={handleDelete} className="btn btn-danger me-2">Eliminar</button>
      <button onClick={() => navigate('/datos')} className="btn btn-secondary">Cancelar</button>

      <Modal 
        show={showModal}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </>
  );
}
