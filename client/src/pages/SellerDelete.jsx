// src/pages/SellerDelete.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';

export default function SellerDelete() {
  const { id } = useParams();
  const [seller, setSeller] = useState({ name: '', lastname: '' });
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/sellers/${id}`)
      .then(res => setSeller(res.data))
      .catch(() => nav('/datos'));
  }, [id, nav]);

  const handleDelete = async () => {
    try {
      await api.delete(`/sellers/${id}`);
      setModalMessage('Vendedor eliminado satisfactoriamente');
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
      <h2>Eliminar Vendedor</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <p>¿Seguro que deseas eliminar a "{seller.name} {seller.lastname}"?</p>
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
