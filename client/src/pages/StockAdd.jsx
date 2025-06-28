// src/pages/StockAdd.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import { useSucursales } from '../hooks/useStaticData';
import { todayAR } from '../utils/date';
import { downloadReceipt } from '../utils/receipt';


/* ───────────────── helpers ────────────────── */
/** Convierte 'DD/MM/YYYY' → 'YYYY-MM-DD' (o deja pasar si ya es ISO) */
const toInputDate = (str = '') =>
  str.includes('/')
    ? str.split('/').reverse().map(p => p.padStart(2, '0')).join('-')
    : str.slice(0, 10);                // ‘2025-06-11T…’ → ‘2025-06-11’

/* ───────────────── componente ──────────────── */
export default function StockAdd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sucursales, loading: loadingSucursales, error: errorSucursales } = useSucursales();

  const [date, setDate] = useState(todayAR());
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [branch, setBranch] = useState('');
  const [observations, setObservations] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const isEdit = searchParams.get('edit');

  /* ───────────── cargar movimiento + producto ───────────── */
  useEffect(() => {
    const loadData = async () => {
      try {
        if (isEdit) {
          // ========== MODO EDICIÓN ==========
          const { data: movement } = await api.get(`/stock/movements/${isEdit}`);

          setDate(toInputDate(movement.date));      // 👈 ahora sí aparece en el input
          setQuantity(movement.quantity);
          setBranch(movement.branch);
          setObservations(movement.observations || '');

          // movement.productId viene populateado
          const prodId = movement.productId?._id || movement.productId;
          const { data: productData } = await api.get(`/products/${prodId}`);
          setProduct(productData);
        } else {
          // ========== ALTA NORMAL ==========
          const prodId = searchParams.get('productId');
          if (!prodId) return setError('Falta productId en la URL');

          const { data: productData } = await api.get(`/products/${prodId}`);
          setProduct(productData);
        }
      } catch (e) {
        console.error(e);
        setError('No se pudo cargar el movimiento o el producto');
      }
    };

    loadData();
  }, [isEdit, searchParams]);

  /* ───────────── enviar formulario ───────────── */
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!product) return setError('Producto no encontrado');
    if (!branch) return setError('Selecciona una sucursal');

    const payload = {
      productId: product._id,
      quantity: Number(quantity),
      branch,
      date,
      observations,
      type: 'add'
    };

    try {
      if (isEdit) await api.put(`/stock/movements/${isEdit}`, payload);
      else await api.post('/stock/add', payload);

      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la carga');
    }
  };

  /* ───────────── render ───────────── */
  if (loadingSucursales) return <div>Cargando sucursales...</div>;
  if (errorSucursales) return <div className="alert alert-danger">{errorSucursales}</div>;
  if (!product) return <div className="alert alert-danger">Cargando producto...</div>;

  return (
    <>
      <h2>{isEdit ? 'Editar Carga' : 'Cargar Stock'}</h2>
      <h6 className="text-muted mb-4">{product.name}</h6>
      {error && <div className="alert alert-danger">{error}</div>}

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

        {/* cantidad */}
        <div className="mb-3">
          <label className="form-label">Cantidad</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min="1"
            className="form-control"
            style={{ maxWidth: 350 }}
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
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

        {/* observaciones */}
        <div className="mb-3">
          <label className="form-label">Observaciones</label>
          <textarea
            className="form-control"
            style={{ maxWidth: 350 }}
            value={observations}
            onChange={e => setObservations(e.target.value)}
            rows={2}
            placeholder="Opcional"
          />
        </div>

        <button type="submit" className="btn btn-dark me-2">
          {isEdit ? 'Guardar Cambios' : 'Confirmar Carga'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate(isEdit ? '/movements' : '/stock')}
        >
          Cancelar
        </button>
      </form>

      <Modal>
        show={showModal}
        message={isEdit ? 'Carga actualizada satisfactoriamente' : 'Carga registrada satisfactoriamente'}
        onClose={() => navigate('/stock')}
        <Button variant="primary"
          onClick={() => downloadReceipt(editId || newMovementId)}>
          Descargar comprobante
        </Button>
      </Modal>
    </>
  );
}
