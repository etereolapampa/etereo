// src/pages/StockShortage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from 'react-bootstrap';           // 🆕  IMPORTA Button
import api from '../api';
import Modal from '../components/Modal';
import { useSucursales } from '../hooks/useStaticData';
import { todayAR } from '../utils/date';
import { downloadReceipt } from '../utils/receipt';

/* helpers */
const toInputDate = (str = '') =>
  str.includes('/')
    ? str.split('/').reverse().map(p => p.padStart(2, '0')).join('-')
    : str.slice(0, 10);

export default function StockShortage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sucursales, loading: loadingSucursales, error: errorSucursales } =
    useSucursales();

  const [date, setDate]             = useState(todayAR());
  const [branch, setBranch]         = useState('');
  const [quantity, setQuantity]     = useState(1);
  const [observations, setObs]      = useState('');
  const [error, setError]           = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [product, setProduct]       = useState(null);
  const [newMovementId, setNewMovementId] = useState(null);   // 🆕  id p/recibo

  const isEdit = searchParams.get('edit');

  /* ───── carga inicial ───── */
  useEffect(() => {
    (async () => {
      try {
        if (isEdit) {
          const { data: mv } = await api.get(`/stock/movements/${isEdit}`);

          setDate(toInputDate(mv.date));
          setBranch(mv.branch);
          setQuantity(mv.quantity);
          setObs(mv.observations || '');

          const prodId = mv.productId?._id || mv.productId;
          // Cambiar a usar /stock para obtener información consistente
          const { data: stockData } = await api.get('/stock');
          const prod = stockData.find(p => p._id === prodId);
          if (!prod) throw new Error('Producto no encontrado');
          setProduct(prod);

          setNewMovementId(isEdit);
        } else {
          const prodId = searchParams.get('productId');
          if (!prodId) return setError('Falta productId en la URL');

          // Cambiar a usar /stock para obtener información consistente
          const { data: stockData } = await api.get('/stock');
          const prod = stockData.find(p => p._id === prodId);
          if (!prod) throw new Error('Producto no encontrado');
          setProduct(prod);
        }
      } catch {
        setError('No se pudo cargar el movimiento o el producto');
      }
    })();
  }, [isEdit, searchParams]);

  /* ───── submit ───── */
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!branch) return setError('Selecciona una sucursal');

    const payload = {
      productId   : product._id,
      quantity    : Number(quantity),
      branch,
      date,
      observations: observations,
      type        : 'shortage'
    };

    try {
      if (isEdit) {
        await api.put(`/stock/movements/${isEdit}`, payload);
        setNewMovementId(isEdit);
      } else {
        const { data } = await api.post('/stock/shortage', payload);
        setNewMovementId(data.movement._id);
      }
      setShowModal(true);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg?.includes('Stock insuficiente')) setError(msg);
      else setError('Error al registrar el faltante');
    }
  };

  /* ───── render ───── */
  if (loadingSucursales) return <div>Cargando sucursales…</div>;
  if (errorSucursales || error)
    return <div className="alert alert-danger">{errorSucursales || error}</div>;
  if (!product) return <div className="alert alert-danger">Cargando producto…</div>;

  return (
    <>
      <h2>{isEdit ? 'Editar Faltante' : 'Registrar Faltante'}</h2>
      <h6 className="text-muted mb-4">{product.name}</h6>

      <form onSubmit={handleSubmit}>
        {/* fecha */}
        <div className="mb-3">
          <label className="form-label">Fecha</label>
          <input
            className="form-control"
            type="date"
            style={{ maxWidth: 350 }}
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* sucursal */}
        <div className="mb-3">
          <label className="form-label">Sucursal</label>
          <select
            className="form-select"
            style={{ maxWidth: 350 }}
            value={branch}
            onChange={e => setBranch(e.target.value)}
            required
          >
            <option value="">Seleccione</option>
            {sucursales.map(b => (
              <option key={b.id} value={b.nombre}>{b.nombre}</option>
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
            onChange={e => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
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
            onChange={e => setObs(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <button type="submit" className="btn btn-danger me-2">
          {isEdit ? 'Guardar Cambios' : 'Confirmar Faltante'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/stock')}
        >
          Cancelar
        </button>
      </form>

      {/* ───── Modal ───── */}
      <Modal
        show={showModal}
        message={
          isEdit
            ? 'Faltante actualizado satisfactoriamente'
            : 'Faltante registrado satisfactoriamente'
        }
        onClose={() => navigate('/stock')}
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
