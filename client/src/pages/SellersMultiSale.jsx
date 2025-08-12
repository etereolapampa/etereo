//  SellersMultiSale.jsx
//  ─────────────────────────────────────────────────────────────
//  Componente para registrar / editar ventas de “vendedoras”
//  con renglones de Producto y Descuento.
//  ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Form, Alert, Card } from 'react-bootstrap';
import api from '../api';
import Modal from '../components/Modal';
import { todayAR } from '../utils/date';
import { downloadReceipt } from '../utils/receipt';

const SUCURSALES = ['Santa Rosa', 'Macachín'];

/* ───── helpers ───── */
const fmtNum = v => (v ? Number(v).toFixed(2) : '');
const toInputDate = str =>
  str && str.includes('/')
    ? str.split('/').reverse().map(p => p.padStart(2, '0')).join('-')
    : (str || '').slice(0, 10);

// estado inicial para el constructor (“draft”)
const emptyDraft = {
  mode: 'product',      // 'product' | 'discount'
  product: null,
  query: '',
  description: '',
  quantity: '',
  price: ''
};

/* ───── componente ───── */
export default function SellersMultiSale() {
  /* routing */
  const navigate = useNavigate();
  const { id: sellerIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');          // ?edit=<movementId>

  /* ───────── estado base ───────── */
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);

  const [branch, setBranch] = useState('');
  const [date, setDate] = useState(todayAR());
  const [rows, setRows] = useState([]);             // renglones definitivos
  const [draft, setDraft] = useState(emptyDraft);   // constructor
  const [suggestions, setSuggestions] = useState([]); // para el autocompletar
  const [observations, setObservations] = useState('');

  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [newMovementId, setNewMovementId] = useState(null);

  /* ───────────────────── cargar datos base ─────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [prodRes, vendRes] = await Promise.all([
          api.get('/stock'), // Cambiado de '/products' a '/stock'
          sellerIdParam ? api.get(`/sellers/${sellerIdParam}`) : Promise.resolve({ data: null })
        ]);
        setProducts(prodRes.data);
        if (vendRes.data) setSeller(vendRes.data);
      } catch {
        setError('Error al cargar productos o vendedora');
      }
    })();
  }, [sellerIdParam]);

  /* ───────────── precargar venta en modo edición ───────────── */
  useEffect(() => {
    if (!editId || products.length === 0) return;   // esperamos productos

    (async () => {
      try {
        const { data: mv } = await api.get(`/stock/movements/${editId}`);

        setBranch(mv.branch);
        setDate(toInputDate(mv.date));
        setObservations(mv.observations || '');

        const mapped = mv.items.map(it => {
          if (it.isDiscount) {
            return {
              mode: 'discount',
              description: it.description || '',
              quantity: 1,
              price: fmtNum(it.price)          // negativo
            };
          }
          // producto populateado o solo id
          const prod =
            typeof it.productId === 'object'
              ? it.productId
              : products.find(p => p._id === String(it.productId));

          return {
            mode: 'product',
            product: prod,
            query: prod?.name || '',
            quantity: it.quantity,
            price: fmtNum(it.price)
          };
        });

        setRows(mapped);
      } catch {
        setError('No se pudo cargar la venta para editar');
      }
    })();
  }, [editId, products]);

  /* ───────── helpers del constructor (draft) ───────── */
  const setMode = mode => setDraft({ ...emptyDraft, mode });

  const setDraftField = field => value =>
    setDraft(d => ({ ...d, [field]: value }));

  /** Helper para mostrar errores en modal */
  const showError = (message) => {
    setError(message);
    setShowErrorModal(true);
  };

  /** Añade el draft a rows después de validar */
  const addDraftToRows = () => {
    if (draft.mode === 'product') {
      if (!draft.product) return showError('Seleccione un producto');
      if (!draft.quantity) return showError('Ingrese cantidad');
      if (!draft.price) return showError('Ingrese precio');
      
      // Validar stock disponible en la sucursal seleccionada
      if (branch && draft.product.stockByBranch) {
        const availableStock = draft.product.stockByBranch[branch] || 0;
        const requestedQuantity = Number(draft.quantity);
        
        if (availableStock < requestedQuantity) {
          return showError(
            `Stock insuficiente para "${draft.product.name}" en ${branch}. ` +
            `Disponible: ${availableStock}, Solicitado: ${requestedQuantity}`
          );
        }
      }
      
      // Verificar que el producto existe y tiene stock general
      if (!draft.product.stockByBranch || Object.values(draft.product.stockByBranch).every(stock => stock === 0)) {
        return showError(`El producto "${draft.product.name}" no tiene stock disponible en ninguna sucursal`);
      }
    } else {
      if (!draft.description.trim()) return showError('Descripción obligatoria');
      if (!draft.price || Number(draft.price) >= 0)
        return showError('El monto del descuento debe ser negativo');
    }
    setRows(r => [...r, draft]);
    setDraft(emptyDraft);
    setSuggestions([]);
    setError('');
  };

  const removeRow = idx => setRows(r => r.filter((_, i) => i !== idx));

  /** autocompletar productos */
  const handleQueryChange = q => {
    setDraftField('query')(q);
    setDraftField('product')(null);
    const sugg = q.trim()
      ? products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
      : [];
    setSuggestions(sugg);
  };

  const chooseProduct = prod => {
    setDraft({
      ...draft,
      product: prod,
      query: prod.name,
      price: fmtNum(prod.price)
    });
    setSuggestions([]);
  };

  /* ───────── cálculos ───────── */
  const bruto = rows
    .filter(r => r.mode === 'product')
    .reduce((s, r) => s + r.quantity * r.price, 0);

  const descTotal = rows
    .filter(r => r.mode === 'discount')
    .reduce((s, r) => s + Number(r.price), 0);   // ya es negativo

  const subtotal = bruto + descTotal;            // ⬅️ descuento aplicado al Bruto
  const bonPct = seller?.bonus || 0;
  const bonif = subtotal * bonPct / 100;      // % sobre el subtotal
  const neto = subtotal - bonif;

  const totalUnits = rows                         // ⬅️ RESTAURAR ESTA LÍNEA
    .filter(r => r.mode === 'product')
    .reduce((s, r) => s + Number(r.quantity), 0);

  /* ───────────── submit ───────────── */
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!seller?._id) return showError('Falta seleccionar la vendedora');
    if (!branch) return showError('Seleccione la sucursal');
    if (rows.every(r => r.mode !== 'product'))
      return showError('Agregue al menos un producto');

    const payload = {
      branch,
      date,
      sellerId: seller._id,
      isFinalConsumer: false,
      observations,
      total: neto,
      items: rows.map(r =>
        r.mode === 'product'
          ? {
            productId: r.product._id,
            quantity: Number(r.quantity),
            price: Number(r.price)
          }
          : {
            isDiscount: true,
            description: r.description.trim(),
            quantity: 1,
            price: Number(r.price)
          }
      )
    };

    try {
      if (editId) {
        await api.put(`/stock/movements/${editId}`, payload);
        setNewMovementId(editId);
      } else {
        const { data } = await api.post('/stock/sale', payload);
        setNewMovementId(data.movement._id);
      }
      setShowModal(true);
    } catch (err) {
      showError(err.response?.data?.error || 'Error al guardar la venta');
    }
  };

  /* ──────────── render ──────────── */
  return (
    <>
      <h2>{editId ? 'Editar venta a Vendedora' : 'Registrar venta a Vendedora'}</h2>
      {seller && (
        <h6 className="text-muted mb-3">
          {seller.name} {seller.lastname}
        </h6>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ═════════ FORM ═════════ */}
      <Form onSubmit={handleSubmit}>
        {/* cabecera */}
        <Form.Group className="mb-3" style={{ maxWidth: 350 }}>
          <Form.Label>Fecha</Form.Label>
          <Form.Control
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" style={{ maxWidth: 350 }}>
          <Form.Label>Sucursal</Form.Label>
          <Form.Select value={branch} onChange={e => setBranch(e.target.value)} required>
            <option value="">Seleccione</option>
            {SUCURSALES.map(b => (
              <option key={b}>{b}</option>
            ))}
          </Form.Select>
        </Form.Group>

        <hr />

        {/* lista de renglones */}
        {rows.length === 0 ? (
          <p className="text-muted">Aún no añadiste renglones.</p>
        ) : (
          rows.map((r, idx) => (
            <div key={idx} className="d-flex gap-3 align-items-center mb-2 flex-wrap">
              {r.mode === 'product' ? (
                <>
                  <span style={{ minWidth: 200 }}>{r.product?.name}</span>
                  <span>{r.quantity} u.</span>
                  <span>${fmtNum(r.price)}</span>
                  <span className="fw-bold">${fmtNum(r.quantity * r.price)}</span>
                </>
              ) : (
                <>
                  <span style={{ minWidth: 200 }}>Descuento: {r.description}</span>
                  <span className="text-danger fw-bold">${fmtNum(r.price)}</span>
                </>
              )}
              <Button
                size="sm"
                variant="outline-danger"
                onClick={() => removeRow(idx)}
                title="Eliminar"
              >
                🗑️
              </Button>
            </div>
          ))
        )}

        {/* ───────── Constructor (draft) ───────── */}
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex gap-3 mb-3">
              <Form.Check
                type="radio"
                id="modoProd"
                label="Producto"
                checked={draft.mode === 'product'}
                onChange={() => setMode('product')}
              />
              <Form.Check
                type="radio"
                id="modoDesc"
                label="Descuento"
                checked={draft.mode === 'discount'}
                onChange={() => setMode('discount')}
              />
            </div>

            {/* mode = PRODUCT */}
            {draft.mode === 'product' && (
              <div className="d-flex gap-3 flex-wrap align-items-end">
                {/* buscador */}
                <div style={{ position: 'relative', flex: '2 1 250px' }}>
                  <Form.Label>Producto</Form.Label>
                  <Form.Control
                    value={draft.query}
                    placeholder="Buscar…"
                    autoComplete="off"
                    onChange={e => handleQueryChange(e.target.value)}
                  />
                  {suggestions.length > 0 && (
                    <div
                      className="list-group position-absolute w-100"
                      style={{ zIndex: 2000, maxHeight: 200, overflowY: 'auto' }}
                    >
                      {suggestions.map(p => {
                        const branchStock = branch && p.stockByBranch ? p.stockByBranch[branch] || 0 : null;
                        const totalStock = p.stockByBranch ? Object.values(p.stockByBranch).reduce((sum, stock) => sum + stock, 0) : 0;
                        const hasStock = branchStock !== null ? branchStock > 0 : totalStock > 0;
                        
                        return (
                          <button
                            key={p._id}
                            type="button"
                            className={`list-group-item list-group-item-action d-flex justify-content-between ${!hasStock ? 'text-muted bg-light' : ''}`}
                            onClick={() => chooseProduct(p)}
                          >
                            <span>{p.name}</span>
                            <small className={hasStock ? "text-muted" : "text-danger fw-bold"}>
                              {branchStock !== null 
                                ? `Stock en ${branch}: ${branchStock}` 
                                : `Stock total: ${totalStock}`}
                              {!hasStock && ' ⚠️ SIN STOCK'}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ width: 100 }}>
                  <Form.Label>Cant.</Form.Label>
                  <Form.Control
                    value={draft.quantity}
                    onChange={e =>
                      setDraftField('quantity')(e.target.value.replace(/[^0-9]/g, ''))
                    }
                  />
                </div>

                <div style={{ width: 120 }}>
                  <Form.Label>Precio U.</Form.Label>
                  <Form.Control
                    value={draft.price}
                    onChange={e =>
                      setDraftField('price')(e.target.value.replace(/[^0-9.]/g, ''))
                    }
                  />
                </div>
              </div>
            )}

            {/* mode = DISCOUNT */}
            {draft.mode === 'discount' && (
              <div className="d-flex gap-3 flex-wrap align-items-end">
                <div style={{ flex: '2 1 250px' }}>
                  <Form.Label>Descripción</Form.Label>
                  <Form.Control
                    value={draft.description}
                    onChange={e => setDraftField('description')(e.target.value)}
                  />
                </div>
                <div style={{ width: 120 }}>
                  <Form.Label>Monto $</Form.Label>
                  <Form.Control
                    value={draft.price}
                    onChange={e =>
                      setDraftField('price')(e.target.value.replace(/[^0-9.-]/g, ''))
                    }
                    placeholder="-100"
                  />
                </div>
              </div>
            )}

            <Button variant="dark" className="mt-3" onClick={addDraftToRows}>
              Añadir
            </Button>
          </Card.Body>
        </Card>

        {/* resumen */}
        <div className="card shadow-sm mb-4" style={{ maxWidth: 350 }}>
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <span>Total unidades:</span>
              <span>{totalUnits}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Subtotal (con desc.):</span>
              <span>${fmtNum(subtotal)}</span>
            </div>

            <div className="d-flex justify-content-between mb-2">
              <span>Bonificación ({bonPct}%):</span>
              <span>${fmtNum(bonif)}</span>
            </div>
            <hr className="my-2" />
            <div className="d-flex justify-content-between fw-bold">
              <span>Total Neto:</span>
              <span>${fmtNum(neto)}</span>
            </div>
          </div>
        </div>

        {/* observaciones */}
        <Form.Group className="mb-4" style={{ maxWidth: 500 }}>
          <Form.Label>Observaciones</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder="Opcional"
          />
        </Form.Group>

        {/* botones */}
        <Button type="submit" variant="dark" className="me-2">
          {editId ? 'Guardar cambios' : 'Confirmar venta'}
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
      </Form>

      {/* modal OK */}
      <Modal
        show={showModal}
        message={
          editId
            ? 'Venta modificada satisfactoriamente'
            : 'Venta registrada satisfactoriamente'
        }
        onClose={() => navigate('/movements')}
      >
        <Button
          variant="primary"
          disabled={!newMovementId}
          onClick={() => downloadReceipt(newMovementId)}
        >
          Descargar comprobante
        </Button>
      </Modal>

      {/* modal ERROR */}
      <Modal
        show={showErrorModal}
        message={error}
        onClose={() => {
          setShowErrorModal(false);
          setError('');
        }}
        variant="danger"
      >
        <Button
          variant="danger"
          onClick={() => {
            setShowErrorModal(false);
            setError('');
          }}
        >
          Entendido
        </Button>
      </Modal>
    </>
  );
}
