//  ─────────────────────────────────────────────────────────────
//  ⚠️  Atento: sólo se toca ESTE archivo.  El resto del proyecto
//      queda igual.  (No hay “bloques ocultos” más abajo.)
//  ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Form, Alert } from 'react-bootstrap';
import api from '../api';
import Modal from '../components/Modal';
import { todayAR } from '../utils/date';
import { downloadReceipt } from '../utils/receipt';

const SUCURSALES = ['Santa Rosa', 'Macachín'];

/* ───── helpers ───── */
const fmtNum = v => (v ? Number(v).toFixed(2) : '');
const defaultRow = {
  product: null,
  quantity: 1,
  price: '',
  query: '',
  suggestions: [],
  showSug: false
};
const toInputDate = (str = '') =>
  str.includes('/')
    ? str.split('/').reverse().map(p => p.padStart(2, '0')).join('-')
    : str.slice(0, 10);

/* ───── componente ───── */
export default function SellersMultiSale() {
  /* routing */
  const navigate = useNavigate();
  const { id: sellerIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  /* estado */
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);

  const [date, setDate] = useState(todayAR());
  const [branch, setBranch] = useState('');
  const [items, setItems] = useState(editId ? [] : [defaultRow]);
  const [observations, setObservations] = useState('');

  const [error, setError] = useState('');
  const [newMovementId, setNewMovementId] = useState(null);   // 🆕
  const [showModal, setShowModal] = useState(false);          // 🆕 faltaba

  /* ───────────────────── cargar datos base ─────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [pRes, vRes] = await Promise.all([
          api.get('/products'),
          sellerIdParam
            ? api.get(`/sellers/${sellerIdParam}`)
            : Promise.resolve({ data: null })
        ]);
        setProducts(pRes.data);
        if (vRes.data) setSeller(vRes.data);
      } catch {
        setError('Error al cargar productos o vendedora');
      }
    })();
  }, [sellerIdParam]);

  /* ─────────────────── precargar movimiento (edit) ─────────── */
  useEffect(() => {
    // esperamos a que estén los productos
    if (!editId || products.length === 0) return;

    (async () => {
      try {
        const { data: mv } = await api.get(`/stock/movements/${editId}`);

        setBranch(mv.branch);
        setDate(toInputDate(mv.date));
        setObservations(mv.observations || '');

        /* ⤵⤵⤵  MAPEO items: ahora acepta tanto ObjectId como objeto populateado */
        const mapped = mv.items.map(it => {
          const prodObject =
            typeof it.productId === 'object'              // viene populateado
              ? it.productId
              : products.find(p => p._id === String(it.productId));

          return {
            product: prodObject,
            query: prodObject?.name || '',
            quantity: it.quantity,
            price: fmtNum(it.price),
            suggestions: [],
            showSug: false
          };
        });

        setItems(mapped.length ? mapped : [defaultRow]);
      } catch {
        setError('No se pudo cargar la venta para editar');
      }
    })();
  }, [editId, products]);

  /* ───────── helpers items[] ───────── */
  const updateItem = (idx, data) =>
    setItems(items.map((row, i) => (i === idx ? { ...row, ...data } : row)));

  const handleQueryChange = (idx, q) => {
    const sugg = q.trim()
      ? products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
      : [];
    updateItem(idx, { query: q, suggestions: sugg, showSug: !!sugg.length });
  };

  const chooseProduct = (idx, prod) => {
    updateItem(idx, {
      product: prod,
      query: prod.name,
      price: fmtNum(prod.price),
      suggestions: [],
      showSug: false
    });
  };

  const addRow = () => setItems([...items, defaultRow]);
  const removeRow = idx => setItems(items.filter((_, i) => i !== idx));

  /* ───────── totales ───────── */
  const bruto = items.reduce((s, it) => s + (Number(it.price) || 0) * Number(it.quantity), 0);
  const bonPct = seller?.bonus || 0;
  const bonif = bruto * bonPct / 100;
  const neto = bruto - bonif;
  const totalUnits = items.reduce((s, it) => s + Number(it.quantity), 0);

  /* ───────── submit ───────── */
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!seller?._id) return setError('Falta seleccionar la vendedora');
    if (!branch) return setError('Seleccione la sucursal');
    if (items.some(it => !it.product))
      return setError('Todos los renglones requieren producto');

    const total = items.reduce(
      (s, it) => s + Number(it.quantity) * Number(it.price), 0);

    const payload = {
      type: 'sell',
      branch,
      date,
      sellerId: seller._id,
      isFinalConsumer: false,
      observations,
      total,
      items: items.map(it => ({
        productId: it.product._id,
        quantity: Number(it.quantity),
        price: Number(it.price)
      }))
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
      setError(err.response?.data?.error || 'Error al guardar la venta');
    }
  };

  /* ───────── render ───────── */
  return (
    <>
      <h2>{editId ? 'Editar venta a Vendedora' : 'Registrar venta a Vendedora'}</h2>
      {seller && <h6 className="text-muted mb-3">{seller.name} {seller.lastname}</h6>}

      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {/* ═════ FORM ═════ */}
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
          <Form.Select
            value={branch}
            onChange={e => setBranch(e.target.value)}
            required
          >
            <option value="">Seleccione</option>
            {SUCURSALES.map(b => <option key={b}>{b}</option>)}
          </Form.Select>
        </Form.Group>

        <hr />

        {/* items */}
        {items.map((it, idx) => (
          <div key={idx} className="d-flex gap-2 align-items-start mb-3 flex-wrap">
            {/* producto */}
            <div style={{ position: 'relative', flex: '1 1 250px' }}>
              <Form.Label>Producto</Form.Label>
              <Form.Control
                value={it.query}
                placeholder="Buscar…"
                onChange={e => handleQueryChange(idx, e.target.value)}
                autoComplete="off"
                required
              />
              {it.showSug && (
                <div
                  className="list-group position-absolute w-100"
                  style={{ zIndex: 2000, maxHeight: 200, overflowY: 'auto' }}
                >
                  {it.suggestions.map(p => (
                    <button
                      key={p._id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      onClick={() => chooseProduct(idx, p)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* cantidad */}
            <div style={{ width: 100 }}>
              <Form.Label>Cantidad</Form.Label>
              <Form.Control
                pattern="[0-9]*"
                inputMode="numeric"
                required
                value={it.quantity}
                onChange={e => updateItem(idx, { quantity: e.target.value.replace(/[^0-9]/g, '') })}
              />
            </div>

            {/* precio */}
            <div style={{ width: 120, position: 'relative' }}>
              <Form.Label>Precio U.</Form.Label>
              <Form.Control
                // style={{ paddingLeft: 25 }}
                required
                value={it.price}
                onChange={e => updateItem(idx, { price: e.target.value.replace(/[^0-9.]/g, '') })}
              />
              {/* <span style={{ position: 'absolute', left: 8, top: '55%' }}>$</span> */}
            </div>

            {/* subtotal */}
            <div style={{ width: 120 }}>
              <Form.Label>Subtotal</Form.Label>
              <Form.Control
                plaintext
                readOnly
                value={fmtNum((Number(it.price) || 0) * Number(it.quantity))}
              />
            </div>

            {/* borrar fila */}
            {items.length > 1 && (
              <Button
                variant="outline-danger"
                title="Eliminar"
                style={{ height: 38, alignSelf: 'end' }}
                onClick={() => removeRow(idx)}
              >
                🗑️
              </Button>
            )}
          </div>
        ))}

        <Button variant="outline-primary" onClick={addRow} className="mb-4">
          + Añadir producto
        </Button>

        {/* resumen */}
        <div className="card shadow-sm mb-4" style={{ maxWidth: 350 }}>
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <span>Total unidades:</span><span>{totalUnits}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Total Bruto:</span><span>${fmtNum(bruto)}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Bonificación ({bonPct}%):</span><span>${fmtNum(bonif)}</span>
            </div>
            <hr className="my-2" />
            <div className="d-flex justify-content-between fw-bold">
              <span>Total Neto:</span><span>${fmtNum(neto)}</span>
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
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
      </Form>

      <Modal
        show={showModal}
        message={editId ? 'Venta modificada satisfactoriamente': 'Venta registrada satisfactoriamente'}
        onClose={() => navigate('/movements')}
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
