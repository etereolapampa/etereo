// LocalityDelete.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api   from '../api';
import Modal from '../components/Modal';

export default function LocalityDelete() {
  const { id }   = useParams();
  const nav      = useNavigate();

  const [loc,       setLoc]       = useState(null);
  const [error,     setError]     = useState('');
  const [showModal, setShowModal] = useState(false);

  /* ───── cargar localidad ───── */
  useEffect(() => {
    api.get(`/localities/${id}`)
       .then(({data}) => setLoc(data))
       .catch(() => nav('/localities'));     // si no existe, vuelvo a la lista
  }, [id, nav]);

  /* ───── eliminar ───── */
  const handleDelete = async () => {
    try {
      await api.delete(`/localities/${id}`);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar la localidad');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    nav('/localities');
  };

  /* ───── UI ───── */
  if (!loc) return <div>Cargando…</div>;

  return (
    <>
      <h2>Eliminar Localidad</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <p className="mb-4">
        ¿Seguro que deseas eliminar&nbsp;
        <strong>{loc.name}</strong> ({loc.province})?
      </p>

      <button className="btn btn-danger me-2" onClick={handleDelete}>
        Eliminar
      </button>
      <button className="btn btn-secondary" onClick={() => nav('/localities')}>
        Cancelar
      </button>

      <Modal
        show={showModal}
        message="Localidad eliminada satisfactoriamente"
        onClose={closeModal}
      />
    </>
  );
}
