// client/src/pages/Stock.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  ListGroup,
  Button,
  Form,
  Table
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const SUCURSALES = ['Santa Rosa', 'Macachín'];

// ─── suma las existencias de todas las sucursales ───
const totalFromBranches = prod =>
  Object.values(prod.stockByBranch || {}).reduce((s, n) => s + n, 0);

export default function Stock() {
  const navigate = useNavigate();

  /* ───────────── estado ───────────── */
  const [stock,          setStock]          = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productFilter,  setProductFilter]  = useState('');
  const [stockFilters,   setStockFilters]   = useState({
    'Santa Rosa_with': false,
    'Santa Rosa_without': false,
    'Macachín_with': false,
    'Macachín_without': false
  });
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [sort,           setSort]           = useState({ field: 'name', order: 'asc' });

  /* ───────────── carga ───────────── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stockRes, catRes] = await Promise.all([
          api.get('/stock'),
          api.get('/categories')
        ]);
        setStock(stockRes.data);
        setCategories(catRes.data);
      } catch (e) {
        console.error(e);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ───────────── filtros ───────────── */
  const handleStockFilterChange = (branch, type) => {
    const key = `${branch}_${type}`;
    setStockFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filtered = stock.filter((p) => {
    const catName = categories.find((c) => c._id === p.categoryId)?.name.toLowerCase() || '';
    if (!catName.includes(categoryFilter.toLowerCase())) return false;
    if (!p.name.toLowerCase().includes(productFilter.toLowerCase())) return false;

    // Verificar filtros de stock por sucursal
    const santaRosaStock = p.stockByBranch['Santa Rosa'] || 0;
    const macachinStock = p.stockByBranch['Macachín'] || 0;

    // Si hay filtros activos, verificar condiciones
    const activeFilters = Object.entries(stockFilters).filter(([_, active]) => active);
    
    if (activeFilters.length === 0) {
      return true; // No hay filtros activos, mostrar todo
    }

    // Verificar cada filtro activo
    for (const [filterKey, _] of activeFilters) {
      const [branch, type] = filterKey.split('_');
      const branchStock = branch === 'Santa Rosa' ? santaRosaStock : macachinStock;
      
      if (type === 'with' && branchStock === 0) {
        return false; // Necesita stock pero no lo tiene
      }
      if (type === 'without' && branchStock > 0) {
        return false; // Necesita no tener stock pero lo tiene
      }
    }

    return true;
  });

  /* ───────────── ordenamiento ───────────── */
  const handleSort = (field) =>
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));

  const getSortValue = (prod) => {
    if (sort.field === 'category') {
      return categories.find((c) => c._id === prod.categoryId)?.name || '';
    }
    if (sort.field === 'stock') {
      return totalFromBranches(prod);
    }
    if (SUCURSALES.includes(sort.field)) {
      return prod.stockByBranch[sort.field] || 0;
    }
    return prod.name;
  };

  const sorted = [...filtered].sort((a, b) => {
    let A = getSortValue(a);
    let B = getSortValue(b);
    if (typeof A === 'string') {
      A = A.toLowerCase();
      B = B.toLowerCase();
    }
    if (A < B) return sort.order === 'asc' ? -1 : 1;
    if (A > B) return sort.order === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ active, order }) =>
    active ? (order === 'asc' ? ' ▲' : ' ▼') : null;

  /* ───────────── UI ───────────── */
  if (loading) return <div>Cargando…</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Stock</h2>

      {/* ███ Filtros ███ */}
      <Form className="mb-3">
        <Row className="g-2 align-items-end">
          <Col md={3}>
            <Form.Control
              placeholder="Buscar categoría…"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </Col>
          <Col md={3}>
            <Form.Control
              placeholder="Buscar producto…"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            />
          </Col>
          <Col md={6}>
            <Row className="g-2">
              <Col md={6}>
                <div className="p-2">
                  <div className="fw-bold mb-2 text-center">Santa Rosa</div>
                  <div className="d-flex gap-3 justify-content-center">
                    <Form.Check
                      type="checkbox"
                      label="Con stock"
                      checked={stockFilters['Santa Rosa_with']}
                      onChange={() => handleStockFilterChange('Santa Rosa', 'with')}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Sin stock"
                      checked={stockFilters['Santa Rosa_without']}
                      onChange={() => handleStockFilterChange('Santa Rosa', 'without')}
                    />
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div className="p-2">
                  <div className="fw-bold mb-2 text-center">Macachín</div>
                  <div className="d-flex gap-3 justify-content-center">
                    <Form.Check
                      type="checkbox"
                      label="Con stock"
                      checked={stockFilters['Macachín_with']}
                      onChange={() => handleStockFilterChange('Macachín', 'with')}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Sin stock"
                      checked={stockFilters['Macachín_without']}
                      onChange={() => handleStockFilterChange('Macachín', 'without')}
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Form>

      {/* ███ Tabla Desktop ███ */}
      <div className="d-none d-md-block">
        <Table striped hover>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('category')}>
                Categoría
                <SortIcon active={sort.field === 'category'} order={sort.order} />
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                Producto
                <SortIcon active={sort.field === 'name'} order={sort.order} />
              </th>

              {SUCURSALES.map((b) => (
                <th
                  key={b}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort(b)}
                >
                  {b}
                  <SortIcon active={sort.field === b} order={sort.order} />
                </th>
              ))}

              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('stock')}>
                Total
                <SortIcon active={sort.field === 'stock'} order={sort.order} />
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const cat = categories.find((c) => c._id === p.categoryId);
              const hasStock = p.stock > 0;
              return (
                <tr key={p._id}>
                  <td>{cat?.name}</td>
                  <td>{p.name}</td>
                  {SUCURSALES.map((b) => (
                    <td key={b}>{p.stockByBranch[b] || 0}</td>
                  ))}
                  <td>{totalFromBranches(p)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => navigate(`/stock/add?productId=${p._id}`)}
                      >
                        ➕
                      </Button>
                      {hasStock && (
                        <>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => navigate(`/stock/sale?productId=${p._id}`)}
                          >
                            🛒
                          </Button>
                          <Button
                            variant="outline-warning"
                            size="sm"
                            onClick={() => navigate(`/stock/transfer?productId=${p._id}`)}
                          >
                            🚚
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => navigate(`/stock/shortage?productId=${p._id}`)}
                          >
                            ❌
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* ███ Cards Mobile ███ */}
      <div className="d-md-none">
        {sorted.map((p) => {
          const cat = categories.find((c) => c._id === p.categoryId);
          const hasStock = totalFromBranches(p) > 0;
          return (
            <Card key={p._id} className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">{p.name}</h5>
                  <small className="text-muted">{cat?.name}</small>
                </div>
                <div className="d-flex gap-1">
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => navigate(`/stock/add?productId=${p._id}`)}
                  >
                    ➕
                  </Button>
                  {hasStock && (
                    <>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate(`/stock/sale?productId=${p._id}`)}
                      >
                        🛒
                      </Button>
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() => navigate(`/stock/transfer?productId=${p._id}`)}
                      >
                        🚚
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => navigate(`/stock/shortage?productId=${p._id}`)}
                      >
                        ❌
                      </Button>
                    </>
                  )}
                </div>
              </Card.Header>
              <ListGroup variant="flush">
                {SUCURSALES.map((b) => (
                  <ListGroup.Item key={b} className="d-flex justify-content-between">
                    <span>{b}</span>
                    <span>{p.stockByBranch[b] || 0}</span>
                  </ListGroup.Item>
                ))}
                <ListGroup.Item className="d-flex justify-content-between fw-bold">
                  <span>Total</span>
                  <span>{p.stock}</span>
                </ListGroup.Item>
              </ListGroup>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
