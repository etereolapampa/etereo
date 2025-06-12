// src/pages/CategoryForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';

export default function CategoryForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.get(`/categories/${id}`)
        .then(res => setName(res.data.name))
        .catch(() => setError('No se pudo cargar la categoría'));
    }
  }, [id, isEdit]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      if (isEdit) {
        await api.put(`/categories/${id}`, { name });
        setModalMessage('Categoría actualizada satisfactoriamente');
      } else {
        await api.post('/categories', { name });
        setModalMessage('Categoría creada satisfactoriamente');
      }
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la categoría');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    nav('/datos');
  };

  return (
    <>
      <h2>{isEdit ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <br />
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre</label>
          <input
            className="form-control"
            style={{
              maxWidth: '350px',
              width: '100%'
            }}
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <br />
        <button type="submit" className="btn btn-dark me-2">Guardar</button>
        <button type="button" className="btn btn-secondary" onClick={() => nav('/datos')}>Cancelar</button>
      </form>

      <Modal 
        show={showModal}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </>
  );
}
