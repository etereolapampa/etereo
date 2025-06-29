// client/src/pages/StockSale.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';     // 🆕  Button
import api from '../api';
import Modal from '../components/Modal';
import { useSucursales } from '../hooks/useStaticData';
import { todayAR, formatDateAR } from '../utils/date';
import { downloadReceipt } from '../utils/receipt';


const today = todayAR;
const formatDate = formatDateAR;

/** Convierte 'DD/MM/YYYY' → 'YYYY-MM-DD'  (o deja pasar si ya es ISO) */
const toInputDate = (str = '') =>
  str.includes('/')
    ? str.split('/').reverse().map(p => p.padStart(2, '0')).join('-')
    : str.slice(0, 10);


export default function StockSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sucursales, loading: loadingSucursales, error: errorSucursales } = useSucursales();

  /* -------------------- estado -------------------- */
  const [saleType, setSaleType] = useState('seller');   // 'seller' | 'final'
  const [date, setDate] = useState(today());
  const [seller, setSeller] = useState('');
  const [branch, setBranch] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [total, setTotal] = useState('');
  const [observations, setObservations] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newMovementId, setNewMovementId] = useState(null);   // 🆕

  const [sellers, setSellers] = useState([]);
  const [product, setProduct] = useState(null);

  const isEdit = searchParams.get('edit');

  /* ---------------- helpers ---------------- */
  const formatNumber = (v = '') => (v ? Number(v).toFixed(2) : '');

  /* --------------- carga inicial ------------ */
  useEffect(() => {
    const productIdFromURL = searchParams.get('productId');

    const loadData = async () => {
      try {
        // --- Vendedores ---
        const sellersRes = await api.get('/sellers');
        setSellers(sellersRes.data);

        // --- Producto + movimiento (si edita) ---
        if (isEdit) {
          const { data: movement } = await api.get(`/stock/movements/${isEdit}`);

          // movement.productId puede venir populateado
          const prodId = movement.productId?._id || movement.productId;
          const { data: prodData } = await api.get(`/products/${prodId}`);
          setProduct(prodData);

          /* precargar valores del movimiento */
          setDate(toInputDate(movement.date));        // ✅ YYYY-MM-DD para el input
          setQuantity(movement.quantity);
          setPrice(formatNumber(movement.price));
          setTotal(formatNumber(movement.total));
          setBranch(movement.branch);
          setObservations(movement.observations || '');
          setSaleType(movement.sellerId ? 'seller' : 'final');
          setSeller(movement.sellerId?._id || '');        // string o ''
        } else if (productIdFromURL) {
          const { data: prodData } = await api.get(`/products/${productIdFromURL}`);
          setProduct(prodData);
          setPrice(formatNumber(prodData.price));
          setTotal(formatNumber(prodData.price));
        }
      } catch (e) {
        console.error(e);
        setError('No se pudieron cargar los datos');
      }
    };

    loadData();
  }, [isEdit, searchParams]);

  /* ------------- handlers numéricos ------------- */
  const handlePriceChange = e => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setPrice(value);
  };
  const handlePriceBlur = () => {
    if (price && quantity) {
      const newTotal = Number(price) * Number(quantity);
      setTotal(formatNumber(newTotal));
      setPrice(formatNumber(price));
    }
  };
  const handleTotalChange = e => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setTotal(value);
  };
  const handleTotalBlur = () => {
    if (total && quantity) {
      const newPrice = Number(total) / Number(quantity);
      setPrice(formatNumber(newPrice));
      setTotal(formatNumber(total));
    }
  };
  const handleQuantityChange = e => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setQuantity(value);
  };
  const handleQuantityBlur = () => {
    if (price && quantity) {
      const newTotal = Number(price) * Number(quantity);
      setTotal(formatNumber(newTotal));
    }
  };

  /* --------------- submit ---------------- */
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!product) return setError('Producto no encontrado');
    if (!branch) return setError('Selecciona una sucursal');
    if (saleType === 'seller' && !seller) return setError('Selecciona un vendedor');

    const payload = {
      productId: product._id,
      quantity: Number(quantity),
      price: Number(price),
      total: Number(total),
      branch,
      date,
      observations,
      type: 'sell',
      sellerId: saleType === 'seller' ? seller : null,
      isFinalConsumer: saleType === 'final'
    };

    try {
      if (isEdit) {
        await api.put(`/stock/movements/${isEdit}`, payload);
        setNewMovementId(isEdit);
      } else {
        const { data } = await api.post('/stock/sale', payload);
        setNewMovementId(data.movement._id);  // ← el backend responde { movement }
      }

      setShowModal(true);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg?.includes('Stock insuficiente')) setError(msg);
      else setError('Error al registrar la venta');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    navigate('/stock');
  };

  /* --------------- render ---------------- */
  if (loadingSucursales) return <div>Cargando sucursales...</div>;
  if (errorSucursales || error) return <div className="alert alert-danger">{errorSucursales || error}</div>;
  if (!product) return <div className="alert alert-danger">Cargando producto...</div>;

  return (
    <>
      <h2>{isEdit ? 'Editar Venta' : 'Registrar Venta'}</h2>
      <h6 className="text-muted mb-4">{product.name}</h6>

      {/* ===== form ===== */}
      <div className="row">
        <div className="col-md-6">
          <form onSubmit={handleSubmit}>
            {/* tipo venta */}
            <div className="mb-3">
              <label className="form-label">Tipo de Venta</label>
              <div className="d-flex gap-4">
                <Form.Check
                  type="radio"
                  name="saleType"
                  id="seller"
                  label="Vendedor"
                  value="seller"
                  checked={saleType === 'seller'}
                  onChange={e => setSaleType(e.target.value)}
                />
                <Form.Check
                  type="radio"
                  name="saleType"
                  id="final"
                  label="Consumidor Final"
                  value="final"
                  checked={saleType === 'final'}
                  onChange={e => setSaleType(e.target.value)}
                />
              </div>
            </div>

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

            {/* vendedor */}
            {saleType === 'seller' && (
              <div className="mb-3">
                <label className="form-label">Vendedor</label>
                <select
                  className="form-select"
                  style={{ maxWidth: 350 }}
                  value={seller}
                  onChange={e => setSeller(e.target.value)}
                  required
                >
                  <option value="">Seleccione</option>
                  {sellers.map(s => (
                    <option key={s._id} value={s._id}>{s.name} {s.lastname}</option>
                  ))}
                </select>
              </div>
            )}

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
                onChange={handleQuantityChange}
                onBlur={handleQuantityBlur}
                required
              />
            </div>

            {/* precio unitario */}
            <div className="mb-3">
              <label className="form-label">Precio Unitario</label>
              <div style={{ position: 'relative', maxWidth: 350 }}>
                <input
                  className="form-control"
                  style={{ paddingLeft: '25px' }}
                  value={price}
                  onChange={handlePriceChange}
                  onBlur={handlePriceBlur}
                  required
                />
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }}>$</span>
              </div>
            </div>

            {/* total */}
            <div className="mb-3">
              <label className="form-label">Total</label>
              <div style={{ position: 'relative', maxWidth: 350 }}>
                <input
                  className="form-control"
                  style={{ paddingLeft: '25px' }}
                  value={total}
                  onChange={handleTotalChange}
                  onBlur={handleTotalBlur}
                  required
                />
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }}>$</span>
              </div>
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
              {isEdit ? 'Guardar Cambios' : 'Confirmar Venta'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/stock')}>
              Cancelar
            </button>
          </form>
        </div>

        {/* ===== Detalle ===== */}
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center border-bottom border-2 border-secondary">
              <strong>Detalle de la Venta</strong>
            </div>
            <div className="card-body">
              {quantity ? (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Precio Unitario:</span>
                    <span>${(Number(price) || 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Cantidad:</span>
                    <span>{quantity}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Total Bruto:</span>
                    <span>${((Number(price) || 0) * Number(quantity)).toFixed(2)}</span>
                  </div>

                  {/* bonificación */}
                  {saleType === 'seller' && seller && (() => {
                    const sel = sellers.find(s => s._id === seller);
                    const bonus = sel?.bonus || 0;
                    const bruto = (Number(price) || 0) * Number(quantity);
                    const bonif = bruto * bonus / 100;
                    const neto = bruto - bonif;
                    return (
                      <>
                        <div className="d-flex justify-content-between mb-2">
                          <span>Bonificación ({bonus}%):</span>
                          <span>${bonif.toFixed(2)}</span>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between fw-bold">
                          <span>Total Neto:</span>
                          <span>${neto.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}

                  {saleType === 'final' && (
                    <>
                      <hr />
                      <div className="d-flex justify-content-between fw-bold">
                        <span>Total Neto:</span>
                        <span>${((Number(price) || 0) * Number(quantity)).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center text-muted">
                  Ingrese una cantidad para ver el detalle
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={showModal}
        message={isEdit ? 'Venta actualizada satisfactoriamente'
                        : 'Venta registrada satisfactoriamente'}
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
