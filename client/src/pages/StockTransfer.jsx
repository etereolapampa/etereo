// src/pages/StockTransfer.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from 'react-bootstrap';          // 🆕
import api from '../api';
import Modal from '../components/Modal';
import { useSucursales } from '../hooks/useStaticData';
import { todayAR } from '../utils/date';
import { downloadReceipt } from '../utils/receipt';

/* helpers */
const toInputDate = str =>
  str.includes('/')
    ? str.split('/').reverse().map(p => p.padStart(2, '0')).join('-')
    : str.slice(0, 10);

export default function StockTransfer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    sucursales,
    loading: loadingSucursales,
    error: errorSucursales
  } = useSucursales();

  const [date, setDate] = useState(todayAR());
  const [sourceBranch, setSourceBranch] = useState('');
  const [destinationBranch, setDestinationBranch] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [product, setProduct] = useState(null);
  const [newMovementId, setNewMovementId] = useState(null);   // 🆕

  const isEdit = searchParams.get('edit');

  /* ───── helpers sucursal ───── */
  const getOtherBranch = branch =>
    sucursales.find(b => b.nombre !== branch)?.nombre || '';

  /* ───── carga inicial ───── */
  useEffect(() => {
    (async () => {
      try {
        if (isEdit) {
          const { data: mv } = await api.get(`/stock/movements/${isEdit}`);

          setDate(toInputDate(mv.date));
          setSourceBranch(mv.origin);
          setDestinationBranch(mv.destination);
          setQuantity(mv.quantity);
          setObservations(mv.observations || '');

          const prodId = mv.productId?._id || mv.productId;
          const { data: prod } = await api.get(`/products/${prodId}`);
          setProduct(prod);

          setNewMovementId(isEdit);               // para el recibo
        } else {
          const prodId = searchParams.get('productId');
          if (!prodId) return setError('Falta productId en la URL');

          const { data: prod } = await api.get(`/products/${prodId}`);
          setProduct(prod);
        }
      } catch {
        setError('No se pudo cargar el movimiento o el producto');
      }
    })();
  }, [isEdit, searchParams, sucursales]);

  /* ───── handlers sucursal ───── */
  const handleSourceChange = branch => {
    setSourceBranch(branch);
    if (branch) setDestinationBranch(getOtherBranch(branch));
  };
  const handleDestinationChange = branch => {
    setDestinationBranch(branch);
    if (branch) setSourceBranch(getOtherBranch(branch));
  };

  /* ───── submit ───── */
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!product) return setError('Producto no encontrado');
    if (!sourceBranch) return setError('Selecciona una sucursal de origen');
    if (!destinationBranch)
      return setError('Selecciona una sucursal de destino');
    if (sourceBranch === destinationBranch)
      return setError('Origen y destino no pueden ser iguales');

    const payload = {
      productId  : product._id,
      quantity   : Number(quantity),
      origin     : sourceBranch,
      destination: destinationBranch,
      date,
      observations,
      type       : 'transfer'
    };

    try {
      if (isEdit) {
        await api.put(`/stock/movements/${isEdit}`, payload);
        setNewMovementId(isEdit);
      } else {
        const { data } = await api.post('/stock/transfer', payload);
        setNewMovementId(data.movement._id);     // ⬅ viene del backend
      }
      setShowModal(true);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg?.includes('Stock insuficiente')) setError(msg);
      else setError('Error al registrar la transferencia');
    }
  };

  /* ───── UI ───── */
  if (loadingSucursales) return <div>Cargando sucursales…</div>;
  if (errorSucursales || error)
    return (
      <div className="alert alert-danger">{errorSucursales || error}</div>
    );
  if (!product) return <div className="alert alert-danger">Cargando producto…</div>;

  return (
    <>
      <h2>{isEdit ? 'Editar Transferencia' : 'Registrar Transferencia'}</h2>
      <h6 className="text-muted mb-4">{product.name}</h6>

      {/* ===== form ===== */}
      <form onSubmit={handleSubmit}>
        {/* fecha */}
        <div className="mb-3">
          <label className="form-label">Fecha</label>
          <input
            type="date"
            className="form-control"
            style={{ maxWidth: 350 }}
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* origen */}
        <div className="mb-3">
          <label className="form-label">Sucursal de Origen</label>
          <select
            className="form-select"
            style={{ maxWidth: 350 }}
            value={sourceBranch}
            onChange={e => handleSourceChange(e.target.value)}
            required
          >
            <option value="">Seleccione</option>
            {sucursales.map(b => (
              <option key={b.id} value={b.nombre}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* destino */}
        <div className="mb-3">
          <label className="form-label">Sucursal de Destino</label>
          <select
            className="form-select"
            style={{ maxWidth: 350 }}
            value={destinationBranch}
            onChange={e => handleDestinationChange(e.target.value)}
            required
          >
            <option value="">Seleccione</option>
            {sucursales.map(b => (
              <option key={b.id} value={b.nombre}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* cantidad */}
        <div className="mb-3">
          <label className="form-label">Cantidad</label>
          <input
            className="form-control"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            style={{ maxWidth: 350 }}
            value={quantity}
            onChange={e =>
              setQuantity(e.target.value.replace(/[^0-9]/g, ''))
            }
            required
          />
        </div>

        {/* observaciones */}
        <div className="mb-3">
          <label className="form-label">Observaciones</label>
          <textarea
            className="form-control"
            style={{ maxWidth: 350 }}
            rows={2}
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <button type="submit" className="btn btn-dark me-2">
          {isEdit ? 'Guardar Cambios' : 'Confirmar Transferencia'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/stock')}
        >
          Cancelar
        </button>
      </form>

      {/* ===== Modal ===== */}
      <Modal
        show={showModal}
        message={
          isEdit
            ? 'Transferencia actualizada satisfactoriamente'
            : 'Transferencia registrada satisfactoriamente'
        }
        onClose={handleModalClose}
      >
        <Button
          variant="primary"
          onClick={() => downloadReceipt(newMovementId)}
          disabled={!newMovementId}
        >
          Descargar comprobante
        </Button>
      </Modal>
    </>
  );
}
