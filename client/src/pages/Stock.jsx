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

export default function Stock() {
  const navigate = useNavigate();

  /* ───────────── estado ───────────── */
  const [stock,          setStock]          = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productFilter,  setProductFilter]  = useState('');
  const [branchFilter,   setBranchFilter]   = useState('');
  const [stockFilter,    setStockFilter]    = useState('');
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
  const handleBranchChange = (branch) => {
    setBranchFilter(branch);
    if (branch && !stockFilter) setStockFilter('with');
  };
  const toggleStockFilter = (mode) => {
    if (stockFilter === mode) {
      setStockFilter('');
      setBranchFilter('');
    } else {
      setStockFilter(mode);
    }
  };

  const filtered = stock.filter((p) => {
    const catName = categories.find((c) => c._id === p.categoryId)?.name.toLowerCase() || '';
    if (!catName.includes(categoryFilter.toLowerCase())) return false;
    if (!p.name.toLowerCase().includes(productFilter.toLowerCase())) return false;

    if (branchFilter) {
      const branchQty = p.stockByBranch[branchFilter] || 0;
      if (stockFilter === 'with') return branchQty > 0;
      if (stockFilter === 'without') return branchQty === 0;
    } else {
      const hasStock = Object.values(p.stockByBranch).some((q) => q > 0);
      if (stockFilter === 'with') return hasStock;
      if (stockFilter === 'without') return !hasStock;
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
      return branchFilter ? (prod.stockByBranch[branchFilter] || 0) : prod.stock;
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
        <Row className="g-2">
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
          <Col md={4}>
            <Form.Select value={branchFilter} onChange={(e) => handleBranchChange(e.target.value)}>
              <option value="">Todas las sucursales</option>
              {SUCURSALES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2} className="d-flex align-items-center gap-3">
            <Form.Check
              type="checkbox"
              label="Con stock"
              checked={stockFilter === 'with'}
              onChange={() => toggleStockFilter('with')}
            />
            <Form.Check
              type="checkbox"
              label="Sin stock"
              checked={stockFilter === 'without'}
              onChange={() => toggleStockFilter('without')}
            />
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
                  <td>{p.stock}</td>
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
          const hasStock = p.stock > 0;
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
