// client/src/pages/MultiSale.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import api from '../api';
import Modal from '../components/Modal';
import { todayAR } from '../utils/date';

export default function MultiSale() {
  /* -------------------------------------------------- hooks & state */
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sellerId = searchParams.get('sellerId') || '';      // viene de /sellers/:id/sale

  const [date, setDate] = useState(todayAR());
  const [branch, setBranch] = useState('');
  const [items, setItems] = useState([
    { product: null, quantity: 1, price: '', suggestions: [], query: '', showSug: false }
  ]);

  const [products, setProducts] = useState([]);
  const [sucursales] = useState(['Santa Rosa', 'Macachín']); // harcodeadas
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  /* -------------------------------------------------- cargar productos */
  useEffect(() => {
    api.get('/products')
      .then(r => setProducts(r.data))
      .catch(() => setError('Error al cargar los productos'));
  }, []);

  /* -------------------------------------------------- helpers */
  const formatNumber = v => (v ? Number(v).toFixed(2) : '');

  /* -------------------------------------------------- handlers */
  // cambia campo en un ítem específico
  const handleItemChange = (idx, key, value) => {
    setItems(items.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  };

  // cuando escribe en el input de búsqueda
  const handleQueryChange = (idx, value) => {
    const filtered = value.trim()
      ? products.filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
      : [];
    setItems(items.map((it, i) =>
      i === idx
        ? { ...it, query: value, suggestions: filtered, showSug: !!filtered.length }
        : it
    ));
  };

  // clic en una sugerencia
  const handleSuggestionClick = (idx, product) => {
    setItems(items.map((it, i) =>
      i === idx
        ? {
            ...it,
            product,
            price: formatNumber(product.price),
            query: product.name,
            suggestions: [],
            showSug: false
          }
        : it
    ));
  };

  // --------- agregar/quitar renglones
  const addRow    = () => setItems([...items, { product: null, quantity: 1, price: '', suggestions: [], query: '', showSug: false }]);
  const removeRow = idx => setItems(items.filter((_, i) => i !== idx));

  /* -------------------------------------------------- submit */
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    // validaciones
    if (!sellerId) return setError('Falta sellerId en la URL');
    if (!branch)   return setError('Selecciona una sucursal');
    if (items.some(it => !it.product)) return setError('Todos los renglones deben tener producto');

    // payload
    const payload = {
      sellerId,
      branch,
      date,
      items: items.map(it => ({
        productId: it.product._id,
        quantity : Number(it.quantity),
        price    : Number(it.price)
      }))
    };

    try {
      await api.post('/stock/sale', payload);          // <- endpoint nuevo con items[]
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la venta');
    }
  };

  /* -------------------------------------------------- render */
  return (
    <>
      <h2>Registrar venta a Vendedora</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <Form onSubmit={handleSubmit}>
        {/* --------- cabecera */}
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
            {sucursales.map(b => <option key={b}>{b}</option>)}
          </Form.Select>
        </Form.Group>

        <hr />

        {/* --------- tabla de ítems */}
        {items.map((it, idx) => (
          <div key={idx} className="d-flex gap-2 align-items-start mb-3" style={{ flexWrap: 'wrap' }}>
            {/* ----- input de búsqueda + sugerencias ----- */}
            <div style={{ position: 'relative', flex: '1 1 250px' }}>
              <Form.Label className="form-label">Producto</Form.Label>
              <Form.Control
                type="text"
                placeholder="Buscar producto..."
                value={it.query}
                onChange={e => handleQueryChange(idx, e.target.value)}
                autoComplete="off"
                required
              />
              {it.showSug && (
                <div className="list-group position-absolute w-100" style={{ zIndex: 2000, maxHeight: 200, overflowY: 'auto' }}>
                  {it.suggestions.map(p => (
                    <button
                      key={p._id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      onClick={() => handleSuggestionClick(idx, p)}
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
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                value={it.quantity}
                onChange={e => handleItemChange(idx, 'quantity', e.target.value.replace(/[^0-9]/g, ''))}
                required
              />
            </div>

            {/* precio unitario */}
            <div style={{ width: 120, position: 'relative' }}>
              <Form.Label>Precio U.</Form.Label>
              <Form.Control
                style={{ paddingLeft: 25 }}
                value={it.price}
                onChange={e => handleItemChange(idx, 'price', e.target.value.replace(/[^0-9.]/g, ''))}
                required
              />
              <span style={{ position: 'absolute', left: 8, top: 34 }}>$</span>
            </div>

            {/* subtotal */}
            <div style={{ width: 120 }}>
              <Form.Label>Subtotal</Form.Label>
              <Form.Control
                plaintext
                readOnly
                value={formatNumber((Number(it.price) || 0) * Number(it.quantity))}
              />
            </div>

            {/* eliminar fila */}
            {items.length > 1 && (
              <Button
                variant="outline-danger"
                title="Eliminar renglón"
                onClick={() => removeRow(idx)}
                style={{ height: 38, alignSelf: 'end' }}
              >
                🗑️
              </Button>
            )}
          </div>
        ))}

        {/* --------- añadir fila */}
        <Button variant="outline-primary" onClick={addRow} className="mb-4">
          + Añadir producto
        </Button>

        {/* --------- totales */}
        <div className="mb-4 fs-5 fw-bold">
          Total neto:&nbsp;$
          {formatNumber(items.reduce((sum, it) =>
            sum + (Number(it.price) || 0) * Number(it.quantity), 0)
          )}
        </div>

        {/* --------- botones */}
        <Button variant="dark" type="submit" className="me-2">Confirmar Venta</Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
      </Form>

      {/* --------- modal éxito */}
      <Modal
        show={showModal}
        message="Venta registrada satisfactoriamente"
        onClose={() => navigate('/movements')}
      />
    </>
  );
}
