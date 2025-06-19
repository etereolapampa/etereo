// client/src/pages/SellersMultiSale.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import api from '../api';
import Modal from '../components/Modal';
import { todayAR } from '../utils/date';

export default function SellersMultiSale() {
    /* ───────────────────────── hooks & state ───────────────────────── */
    const navigate = useNavigate();

    //   👉 viene de …/sellers/:id/sale  **o**  …/stock/sale?sellerId=…
    const { id: sellerId } = useParams();

    const [seller, setSeller] = useState(null);

    const [date, setDate] = useState(todayAR());
    const [branch, setBranch] = useState('');
    const [items, setItems] = useState([
        { product: null, quantity: 1, price: '', query: '', suggestions: [], showSug: false }
    ]);

    const [products, setProducts] = useState([]);
    const SUCURSALES = ['Santa Rosa', 'Macachín'];

    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);

    /* ─────────────────────── cargar datos base ─────────────────────── */
    useEffect(() => {
        api.get('/products')
            .then(r => setProducts(r.data))
            .catch(() => setError('Error al cargar productos'));

        if (sellerId) {
            api.get(`/sellers/${sellerId}`)
                .then(r => setSeller(r.data))
                .catch(() => setError('Vendedora no encontrada'));
        }
    }, [sellerId]);

    /* ────────────────────────── helpers UI ─────────────────────────── */
    const formatNumber = v => (v ? Number(v).toFixed(2) : '');

    // ────── cálculos de totales ──────
    const bruto = items.reduce(
        (s, it) => s + (Number(it.price) || 0) * Number(it.quantity),
        0
    );
    const bonusPct = seller?.bonus || 0;           // % de bonificación
    const bonifMonto = bruto * bonusPct / 100;
    const neto = bruto - bonifMonto;


    /** actualizar un campo dentro de `items[idx]` */
    const updateItem = (idx, data) =>
        setItems(items.map((it, i) => (i === idx ? { ...it, ...data } : it)));

    /* búsqueda / autocompletado */
    const handleQueryChange = (idx, value) => {
        const filtered = value.trim()
            ? products.filter(p =>
                p.name.toLowerCase().includes(value.toLowerCase()))
            : [];
        updateItem(idx, { query: value, suggestions: filtered, showSug: !!filtered.length });
    };

    const handleSuggestionClick = (idx, product) => {
        updateItem(idx, {
            product,
            query: product.name,
            price: formatNumber(product.price),
            suggestions: [],
            showSug: false
        });
    };

    /* agregar / quitar filas */
    const addRow = () =>
        setItems([
            ...items,
            { product: null, quantity: 1, price: '', query: '', suggestions: [], showSug: false }
        ]);

    const removeRow = idx => setItems(items.filter((_, i) => i !== idx));

    /* ─────────────────────────── submit ────────────────────────────── */
    const handleSubmit = async e => {
        e.preventDefault();
        setError('');

        if (!sellerId) return setError('Falta seleccionar la vendedora');
        if (!branch) return setError('Selecciona una sucursal');
        if (items.some(it => !it.product))
            return setError('Todos los renglones deben tener producto');

        const payload = {
            sellerId,
            branch,
            date,
            items: items.map(it => ({
                productId: it.product._id,
                quantity: Number(it.quantity),
                price: Number(it.price)
            }))
        };

        try {
            await api.post('/stock/sale', payload);
            setShowModal(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar la venta');
        }
    };

    /* ─────────────────────────── render ────────────────────────────── */
    return (
        <>
            <h2>Registrar venta a Vendedora</h2>
            {seller && (
                <h6 className="text-muted mb-4">
                    {seller.name} {seller.lastname}
                </h6>
            )}
            {error && <div className="alert alert-danger">{error}</div>}

            <Form onSubmit={handleSubmit}>
                {/* -------- Cabecera -------- */}
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
                        {SUCURSALES.map(b => (
                            <option key={b}>{b}</option>
                        ))}
                    </Form.Select>
                </Form.Group>

                <hr />

                {/* -------- Lista de ítems -------- */}
                {items.map((it, idx) => (
                    <div
                        key={idx}
                        className="d-flex gap-2 align-items-start mb-3 flex-wrap"
                    >
                        {/* producto + autosuggest */}
                        <div style={{ position: 'relative', flex: '1 1 250px' }}>
                            <Form.Label className="form-label">Producto</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Buscar producto…"
                                value={it.query}
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
                                onChange={e =>
                                    updateItem(idx, { quantity: e.target.value.replace(/[^0-9]/g, '') })
                                }
                                required
                            />
                        </div>

                        {/* precio U. */}
                        <div style={{ width: 120, position: 'relative' }}>
                            <Form.Label>Precio U.</Form.Label>
                            <Form.Control
                                style={{ paddingLeft: 25 }}
                                value={it.price}
                                onChange={e =>
                                    updateItem(idx, { price: e.target.value.replace(/[^0-9.]/g, '') })
                                }
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

                <Button variant="outline-primary" onClick={addRow} className="mb-4">
                    + Añadir producto
                </Button>

                {/* ─── Resumen Bruto / Bonificación / Neto ─── */}
                <div className="card shadow-sm mb-4" style={{ maxWidth: 350 }}>
                    <div className="card-body">
                        <div className="d-flex justify-content-between mb-2">
                            <span>Total Bruto:</span>
                            <span>${formatNumber(bruto)}</span>
                        </div>

                        <div className="d-flex justify-content-between mb-2">
                            <span>Bonificación&nbsp;({bonusPct}%):</span>
                            <span>${formatNumber(bonifMonto)}</span>
                        </div>

                        <hr className="my-2" />

                        <div className="d-flex justify-content-between fw-bold">
                            <span>Total Neto:</span>
                            <span>${formatNumber(neto)}</span>
                        </div>
                    </div>
                </div>


                <Button type="submit" variant="dark" className="me-2">
                    Confirmar Venta
                </Button>
                <Button variant="secondary" onClick={() => navigate(-1)}>
                    Cancelar
                </Button>
            </Form>

            <Modal
                show={showModal}
                message="Venta registrada satisfactoriamente"
                onClose={() => navigate('/movements')}
            />
        </>
    );
}
