// client/src/pages/StockTransfer.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import { useSucursales } from '../hooks/useStaticData';
import { todayAR, formatDateAR } from '../utils/date';

const today      = todayAR;
const formatDate = formatDateAR;

export default function StockTransfer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sucursales, loading: loadingSucursales, error: errorSucursales } = useSucursales();

  const [date, setDate]                 = useState(today());
  const [sourceBranch, setSourceBranch] = useState('');
  const [destinationBranch, setDestinationBranch] = useState('');
  const [quantity, setQuantity]         = useState(1);
  const [observations, setObservations] = useState('');
  const [error, setError]               = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [product, setProduct]           = useState(null);

  const isEdit = searchParams.get('edit');

  /* helpers */
  const getOtherBranch = branch => (
    sucursales.find(b => b.nombre !== branch)?.nombre || ''
  );

  /* carga inicial */
  useEffect(() => {
    const productIdFromURL = searchParams.get('productId');

    const loadData = async () => {
      try {
        if (isEdit) {
          const { data: movement } = await api.get(`/stock/movements/${isEdit}`);

          setDate(formatDate(movement.date));
          setSourceBranch(movement.origin);
          setDestinationBranch(movement.destination);
          setQuantity(movement.quantity);
          setObservations(movement.observations || '');

          const prodId = movement.productId?._id || movement.productId;
          const { data: prodData } = await api.get(`/products/${prodId}`);
          setProduct(prodData);
        } else if (productIdFromURL) {
          const { data: prodData } = await api.get(`/products/${productIdFromURL}`);
          setProduct(prodData);
        }
      } catch (e) {
        console.error(e);
        setError('No se pudo cargar el movimiento o el producto');
      }
    };

    loadData();
  }, [isEdit, searchParams]);

  /* handlers sucursal */
  const handleSourceChange = branch => {
    setSourceBranch(branch);
    if (branch) setDestinationBranch(getOtherBranch(branch));
  };
  const handleDestinationChange = branch => {
    setDestinationBranch(branch);
    if (branch) setSourceBranch(getOtherBranch(branch));
  };

  /* submit */
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!product)              return setError('Producto no encontrado');
    if (!sourceBranch)         return setError('Selecciona una sucursal de origen');
    if (!destinationBranch)    return setError('Selecciona una sucursal de destino');
    if (sourceBranch === destinationBranch) return setError('Origen y destino no pueden ser iguales');

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
      if (isEdit) await api.put(`/stock/movements/${isEdit}`, payload);
      else        await api.post('/stock/transfer', payload);

      setShowModal(true);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg?.includes('Stock insuficiente')) setError(msg);
      else setError('Error al registrar la transferencia');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    navigate('/stock');
  };

  /* render */
  if (loadingSucursales)       return <div>Cargando sucursales...</div>;
  if (errorSucursales || error) return <div className="alert alert-danger">{errorSucursales || error}</div>;
  if (!product)                return <div className="alert alert-danger">Cargando producto...</div>;

  return (
    <>
      <h2>{isEdit ? 'Editar Transferencia' : 'Registrar Transferencia'}</h2>
      <h6 className="text-muted mb-4">{product.name}</h6>

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
              <option key={b.id} value={b.nombre}>{b.nombre}</option>
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
            onChange={e => setObservations(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <button type="submit" className="btn btn-dark me-2">
          {isEdit ? 'Guardar Cambios' : 'Confirmar Transferencia'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/stock')}>
          Cancelar
        </button>
      </form>

      <Modal
        show={showModal}
        message={isEdit ? 'Transferencia actualizada satisfactoriamente' : 'Transferencia registrada satisfactoriamente'}
        onClose={handleModalClose}
      />
    </>
  );
}
