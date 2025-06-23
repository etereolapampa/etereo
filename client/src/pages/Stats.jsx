// src/pages/Stats.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Form, Table, Row, Col, Card } from 'react-bootstrap';
import api from '../api';
import { useSucursales } from '../hooks/useStaticData';
import * as XLSX from 'xlsx';

/* ──────────────────────────────────────────────
   Helpers ─ ventas múltiples y utilidades varias
─────────────────────────────────────────────── */
const isMulti = m => Array.isArray(m.items) && m.items.length > 0;

const expandMovements = list =>
  list.flatMap(m =>
    isMulti(m)
      ? m.items.map(it => ({ ...m, _item: it })) // “desarma” la venta múltiple
      : m
  );

const getProdId = m => {
  const pid = m._item ? m._item.productId : m.productId;
  if (!pid) return null;
  return typeof pid === 'object' ? pid._id : pid;
};

const getQty = m => (m._item ? m._item.quantity : m.quantity) || 0;
/* ──────────────────────────────────────────── */

export default function Stats() {
  const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const { sucursales,
    loading: loadingSucursales,
    error: errorSucursales } = useSucursales();

  /* ───────── estado ───────── */
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [stockData, setStockData] = useState([]);

  const [concept, setConcept] = useState('Ventas');
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState('');
  const [product, setProduct] = useState('');
  const [seller, setSeller] = useState('');
  const [branch, setBranch] = useState('');
  const [showFinalConsumer, setShowFinalConsumer] = useState(false);
  const [rowGroup, setRowGroup] = useState('Producto');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ───────── carga inicial ───────── */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [mRes, pRes, cRes, sRes, stockRes] = await Promise.all([
          api.get('/stock/movements'),
          api.get('/products'),
          api.get('/categories'),
          api.get('/sellers'),
          api.get('/stock')
        ]);
        setMovements(mRes.data);
        setProducts(pRes.data);
        setCategories(cRes.data);
        setSellers(sRes.data);
        setStockData(stockRes.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ───────── core: cálculo de tabla + opciones ───────── */
  const { data: tableData, availableOptions } = useMemo(() => {
    /* 1) aplanamos ventas múltiples */
    const flat = expandMovements(movements);

    /* 2) filtrado general */
    const filtered = flat.filter(m => {
      const prodId = getProdId(m);
      if (!prodId) return false;

      const date = new Date(m.date);
      if (date.getFullYear() !== year) return false;

      const productMatch = products.find(p => p._id === prodId);
      const categoryMatch = !category ||
        (productMatch &&
          productMatch.categoryId._id === category);
      const productFilterMatch = !product || prodId === product;
      const sellerMatch = !seller ||
        (m.sellerId && m.sellerId._id === seller);
      const branchMatch = !branch || m.branch === branch;
      const finalConsMatch = !showFinalConsumer || !m.sellerId;

      if (!categoryMatch || !productFilterMatch ||
        !sellerMatch || !branchMatch ||
        !finalConsMatch) return false;

      if (concept === 'Ventas')
        return m.type === 'sell';
      if (concept === 'Faltantes')
        return m.type === 'shortage';

      return false;
    });

    /* 3) opciones disponibles para los selects (según filtrado) */
    const opts = {
      categories: new Set(),
      products: new Set(),
      sellers: new Set(),
      branches: new Set()
    };

    filtered.forEach(m => {
      const prodId = getProdId(m);
      const prod = products.find(p => p._id === prodId);
      if (prod) {
        opts.products.add(prod._id);
        opts.categories.add(prod.categoryId._id);
      }
      if (m.sellerId) opts.sellers.add(m.sellerId._id);
      if (m.branch) opts.branches.add(m.branch);
    });

    /* 4) agrupado   ----------------------------------------- */
    const grouped = {};
    filtered.forEach(m => {
      /* campo clave según rowGroup */
      let key;
      if (rowGroup === 'Producto') {
        const prod = products.find(p => p._id === getProdId(m));
        key = prod?.name || 'Desconocido';
      } else if (rowGroup === 'Vendedor') {
        if (!m.sellerId) key = 'Consumidor Final';
        else {
          const s = sellers.find(s => s._id === m.sellerId._id);
          key = s ? `${s.name} ${s.lastname}` : 'Vendedor eliminado';
        }
      } else if (rowGroup === 'Categoría') {
        const prod = products.find(p => p._id === getProdId(m));
        const cat = categories.find(c => c._id === prod?.categoryId._id);
        key = cat?.name || 'Categoría eliminada';
      } else if (rowGroup === 'Sucursal') {
        key = m.branch || '—';
      }

      if (!grouped[key]) grouped[key] = Array(12).fill(0);
      const monthIdx = new Date(m.date).getMonth(); // 0-11
      grouped[key][monthIdx] += getQty(m);
    });

    /* 5) a tabla + totales */
    const table = Object.entries(grouped).map(([name, months]) => ({
      name,
      months,
      total: months.reduce((s, n) => s + n, 0)
    })).filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total);

    return { data: table, availableOptions: opts };
  }, [
    movements, products, categories, sellers,
    concept, year, category, product, seller,
    branch, showFinalConsumer, rowGroup
  ]);

  /* --------------- exportar a Excel (sin cambios salvo getQty) ---- */
  const exportToExcel = () => {
    /* ========== crear libro ========== */
    const wb = XLSX.utils.book_new();

    /* ───────── 1) Pestaña MOVIMIENTOS ───────── */
    const movHeaders = [
      'Fecha', 'Tipo', 'Categoría', 'Producto',
      'Cantidad', 'Precio U.', 'Total',
      'Sucursal', 'Destino/Vendedor', 'Observaciones'
    ];

    const movRows = movements.map(m => {
      /* helpers ↓ */
      const prod = products.find(p => p._id === m.productId?._id);
      const cat = categories.find(c => c._id === prod?.categoryId?._id);
      const sellerObj = m.sellerId
        ? sellers.find(s => s._id === m.sellerId?._id)
        : null;

      /* destino / vendedor */
      let dest = '-';
      if (m.type === 'transfer') dest = m.destination || '-';
      else if (m.type === 'sell') {
        dest = sellerObj
          ? `${sellerObj.name} ${sellerObj.lastname}`
          : (m.destination || 'Consumidor Final');
      }

      /* nombre tipo legible */
      const tipo = (
        m.type === 'add' ? 'Carga' :
          m.type === 'sell' ? 'Venta' :
            m.type === 'transfer' ? 'Mudanza' :
              m.type === 'shortage' ? 'Faltante' :
                'Otro'
      );

      const fecha = new Date(m.date).toISOString().slice(0, 10);

      return [
        fecha, tipo,
        cat?.name || '-',            // categoría
        prod?.name || '-',           // producto
        m.quantity ??                 // cantidad
        (Array.isArray(m.items) ?               // venta múltiple
          m.items.reduce((s, it) => s + it.quantity, 0) :
          0),
        prod?.price ?? '-',          // precio unitario de referencia
        m.total ?? '-',              // total tal cual se guardó
        m.branch || m.origin || '-', // sucursal
        dest,                        // destino/vendedor
        m.observations || '-'
      ];
    });

    const wsMov = XLSX.utils.aoa_to_sheet([movHeaders, ...movRows]);
    XLSX.utils.book_append_sheet(wb, wsMov, 'Movimientos');

    /* ───────── 2) Pestaña STOCK ───────── */
    const branchNames = sucursales.map(s => s.nombre); // ['Santa Rosa', 'Macachín', …]
    const stockHeaders = [
      'Producto', 'Categoría', 'Stock total', ...branchNames
    ];

    const stockRows = products.map(p => {
      const cat = categories.find(c => c._id === p.categoryId?._id);
      return [
        p.name,
        cat?.name || '-',
        p.stock,
        ...branchNames.map(b => p.stockByBranch?.[b] ?? 0)
      ];
    });

    const wsStock = XLSX.utils.aoa_to_sheet([stockHeaders, ...stockRows]);
    XLSX.utils.book_append_sheet(wb, wsStock, 'Stock');

    /* ───────── 3) Pestaña VENDEDORES ───────── */
    const vendHeaders = [
      'Nombre', 'Apellido', 'DNI', 'Teléfono',
      'Localidad', 'Provincia', 'Bonificación %', 'Email'
    ];

    const vendRows = sellers.map(v => [
      v.name,
      v.lastname,
      v.dni,
      v.phone ?? '-',
      v.city?.name ?? '-',
      v.city?.province ?? '-',
      v.bonus ?? 0,
      v.email ?? '-'
    ]);

    const wsVend = XLSX.utils.aoa_to_sheet([vendHeaders, ...vendRows]);
    XLSX.utils.book_append_sheet(wb, wsVend, 'Vendedores');

    /* ========== descargar ========== */
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `etereo_${today}.xlsx`);
  };


  /* --------------- UI --------------- */
  if (loadingSucursales || loading) {
    return <div>Cargando…</div>;
  }
  if (errorSucursales || error) {
    return <div className="alert alert-danger">{errorSucursales || error}</div>;
  }

  const filteredData = tableData;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Estadísticas</h2>
        <button className="btn btn-success" onClick={exportToExcel}>
          Exportar a Excel
        </button>
      </div>

      {/* --- Filtros principales (idénticos, sólo aprovechan availableOptions) --- */}
      <div className="p-3 rounded mb-4 border"
        style={{ backgroundColor: 'rgba(0,0,0,.05)' }}>
        <h4 className="mb-3">Filtros</h4>
        <Form>
          <Row className="g-2">
            <Col md={3}>
              <Form.Label>Concepto</Form.Label>
              <Form.Select value={concept}
                onChange={e => {
                  setConcept(e.target.value);
                  if (e.target.value === 'Faltantes') {
                    setRowGroup('Producto');
                    setSeller('');
                  }
                }}>
                <option>Ventas</option>
                <option>Faltantes</option>
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Año</Form.Label>
              <Form.Select value={year}
                onChange={e => setYear(Number(e.target.value))}>
                {[2023, 2024, 2025].map(y =>
                  <option key={y}>{y}</option>)}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Categoría</Form.Label>
              <Form.Select value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  setProduct('');
                }}>
                <option value="">Todas</option>
                {categories.filter(c => availableOptions.categories.has(c._id))
                  .map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Producto</Form.Label>
              <Form.Select value={product}
                onChange={e => setProduct(e.target.value)}>
                <option value="">Todos</option>
                {products
                  .filter(p => availableOptions.products.has(p._id) &&
                    (!category || p.categoryId._id === category))
                  .map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Sucursal</Form.Label>
              <Form.Select value={branch}
                onChange={e => setBranch(e.target.value)}>
                <option value="">Todas</option>
                {sucursales
                  .filter(b => availableOptions.branches.has(b.nombre))
                  .map(b => <option key={b.id} value={b.nombre}>{b.nombre}</option>)}
              </Form.Select>
            </Col>

            {concept === 'Ventas' && (
              <>
                <Col md={3}>
                  <Form.Label>Vendedor</Form.Label>
                  <Form.Select value={seller}
                    onChange={e => setSeller(e.target.value)}>
                    <option value="">Todos</option>
                    {sellers.filter(s => availableOptions.sellers.has(s._id))
                      .map(s => <option key={s._id} value={s._id}>
                        {s.name} {s.lastname}
                      </option>)}
                  </Form.Select>
                </Col>
                <Col md={3} className="d-flex align-items-center">
                  <Form.Check type="checkbox"
                    className="mt-4"
                    label="Consumidor Final"
                    checked={showFinalConsumer}
                    onChange={e => {
                      setShowFinalConsumer(e.target.checked);
                      if (e.target.checked) setSeller('');
                    }} />
                </Col>
              </>
            )}
          </Row>
        </Form>
      </div>

      {/* Agrupar por */}
      <Form className="mb-4">
        <Row className="g-2">
          <Col md={3}>
            <Form.Label>Agrupar por</Form.Label>
            <Form.Select value={rowGroup}
              onChange={e => setRowGroup(e.target.value)}>
              <option>Producto</option>
              {concept === 'Ventas' && <option>Vendedor</option>}
              <option>Categoría</option>
              <option>Sucursal</option>
            </Form.Select>
          </Col>
        </Row>
      </Form>

      {/* tabla desktop */}
      <div className="d-none d-md-block">
        <Table striped hover>
          <thead>
            <tr>
              <th>{rowGroup}</th>
              {MONTHS.map(m => <th key={m} className="text-end">{m}</th>)}
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(r => (
              <tr key={r.name}>
                <td>{r.name}</td>
                {r.months.map((q, i) =>
                  <td key={i} className="text-end">{q || '-'}</td>)}
                <td className="text-end fw-bold">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* cards mobile */}
      <div className="d-md-none">
        {filteredData.map(r => (
          <Card key={r.name} className="mb-3 shadow-sm">
            <Card.Body>
              <div className="fw-bold mb-3">{r.name}</div>
              <div className="d-flex flex-wrap gap-2 border-bottom pb-3 mb-3">
                {r.months.map((q, i) => (
                  <div key={i} style={{ minWidth: 60 }} className="text-center">
                    <div className="small text-muted">{MONTHS[i]}</div>
                    <div className="fw-bold">{q || '-'}</div>
                  </div>
                ))}
              </div>
              <div className="fw-bold">Total: {r.total}</div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
