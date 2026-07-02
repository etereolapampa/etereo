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
import { useSucursales } from '../hooks/useStaticData';

// ─── suma las existencias de todas las sucursales ───
const totalFromBranches = prod =>
  Object.values(prod.stockByBranch || {}).reduce((s, n) => s + n, 0);

export default function Stock() {
  const navigate = useNavigate();
  const {
    sucursales,
    loading: loadingSucursales,
    error: errorSucursales
  } = useSucursales();
  const branchNames = sucursales.map(({ nombre }) => nombre);
  const buildStockFilters = () =>
    Object.fromEntries(
      branchNames.flatMap(branch => [
        [`${branch}_with`, false],
        [`${branch}_without`, false]
      ])
    );

  /* ───────────── estado ───────────── */
  const [stock,          setStock]          = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productFilter,  setProductFilter]  = useState('');
  const [stockFilters,   setStockFilters]   = useState(buildStockFilters);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [sort,           setSort]           = useState({ field: 'name', order: 'asc' });

  useEffect(() => {
    setStockFilters(prev => ({
      ...buildStockFilters(),
      ...prev
    }));
  }, [sucursales]);

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

    // Si hay filtros activos, verificar condiciones
    const activeFilters = Object.entries(stockFilters).filter(([_, active]) => active);
    
    if (activeFilters.length === 0) {
      return true; // No hay filtros activos, mostrar todo
    }

    // Verificar cada filtro activo
    for (const [filterKey, _] of activeFilters) {
      const suffix = filterKey.endsWith('_without') ? '_without' : '_with';
      const branch = filterKey.slice(0, -suffix.length);
      const type = suffix === '_without' ? 'without' : 'with';
      const branchStock = p.stockByBranch?.[branch] || 0;
      
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
    if (branchNames.includes(sort.field)) {
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
  if (loadingSucursales || loading) return <div>Cargando…</div>;
  if (errorSucursales || error)   return <div className="alert alert-danger">{errorSucursales || error}</div>;

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Stock</h2>

      {/* ███ Filtros ███ */}
      <Form className="mb-3">
        <Row className="mb-4">
          <Col xs={12}>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-4">
              {branchNames.map(branch => (
                <div key={branch} className="text-center" style={{ minWidth: 180 }}>
                  <div className="fw-bold mb-3">{branch}</div>
                  <div className="d-flex justify-content-center gap-4 flex-wrap">
                    <Form.Check
                      type="checkbox"
                      label="Con stock"
                      checked={stockFilters[`${branch}_with`] || false}
                      onChange={() => handleStockFilterChange(branch, 'with')}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Sin stock"
                      checked={stockFilters[`${branch}_without`] || false}
                      onChange={() => handleStockFilterChange(branch, 'without')}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Col>
        </Row>

        <Row className="g-3 mb-2">
          <Col md={6} lg={5}>
            <Form.Control
              placeholder="Buscar categoría..."
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </Col>
          <Col md={6} lg={5}>
            <Form.Control
              placeholder="Buscar producto..."
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
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

              {branchNames.map((b) => (
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
                  {branchNames.map((b) => (
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
                {branchNames.map((b) => (
                  <ListGroup.Item key={b} className="d-flex justify-content-between">
                    <span>{b}</span>
                    <span>{p.stockByBranch[b] || 0}</span>
                  </ListGroup.Item>
                ))}
                <ListGroup.Item className="d-flex justify-content-between fw-bold">
                  <span>Total</span>
                  <span>{totalFromBranches(p)}</span>
                </ListGroup.Item>
              </ListGroup>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
