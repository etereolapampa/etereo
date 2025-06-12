// src/pages/Stock.jsx
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
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const SUCURSALES = ["Santa Rosa", "Macachín"];

export default function Stock() {
  const navigate = useNavigate();
  const [stock, setStock] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [stockFilter, setStockFilter] = useState(''); // 'with' o 'without' o ''
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stockRes, categoriesRes] = await Promise.all([
          api.get('/stock'),
          api.get('/categories')
        ]);
        console.log('Stock data received:', stockRes.data);
        setStock(stockRes.data);
        setCategories(categoriesRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Manejar cambio de sucursal
  const handleBranchChange = (branch) => {
    setBranchFilter(branch);
    // Si se selecciona una sucursal, activar "Con stock" por defecto
    if (branch && !stockFilter) {
      setStockFilter('with');
    }
  };

  // Manejar cambio de filtro de stock
  const handleStockFilterChange = (filter) => {
    if (filter === stockFilter) {
      // Si se hace clic en el filtro activo, desactivarlo
      setStockFilter('');
      // Si se desactivan ambos filtros, resetear la sucursal
      setBranchFilter('');
    } else {
      // Si se hace clic en un filtro inactivo, activarlo
      setStockFilter(filter);
    }
  };

  // Aplica filtros en el orden: categoría → producto → stock → sucursal
  const filtered = stock.filter(p => {
    // 1. Filtro por categoría
    const catName = categories.find(c => c._id === p.categoryId)?.name.toLowerCase() || '';
    if (!catName.includes(categoryFilter.toLowerCase())) {
      return false;
    }

    // 2. Filtro por nombre de producto
    if (!p.name.toLowerCase().includes(productFilter.toLowerCase())) {
      return false;
    }

    // 3. Filtro por stock y sucursal
    if (branchFilter) {
      // Si hay sucursal seleccionada, usar el stock de esa sucursal
      const branchStock = p.stockByBranch[branchFilter] || 0;
      if (stockFilter === 'with') {
        return branchStock > 0;
      }
      if (stockFilter === 'without') {
        return branchStock === 0;
      }
    } else {
      // Si no hay sucursal seleccionada, verificar stock en todas las sucursales
      if (stockFilter === 'with') {
        // Producto tiene stock en al menos una sucursal
        return Object.values(p.stockByBranch).some(stock => stock > 0);
      }
      if (stockFilter === 'without') {
        // Producto no tiene stock en ninguna sucursal
        return Object.values(p.stockByBranch).every(stock => stock === 0);
      }
    }

    return true;
  });

  // Debug: mostrar productos filtrados
  console.log('Filtered products:', filtered.map(p => ({
    name: p.name,
    branchStock: branchFilter ? p.stockByBranch[branchFilter] : p.stock,
    stockFilter,
    branchFilter
  })));

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Stock</h2>

      {/* ==== Controles de filtro ==== */}
      <Form className="mb-3">
        <Row className="g-2">
          <Col md={3}>
            <Form.Control
              placeholder="Buscar categoría..."
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            />
          </Col>

          <Col md={3}>
            <Form.Control
              placeholder="Buscar producto..."
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
            />
          </Col>

          <Col md={4}>
            <Form.Select
              value={branchFilter}
              onChange={e => handleBranchChange(e.target.value)}
            >
              <option value="">Todas las sucursales</option>
              {SUCURSALES.map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2} className="d-flex align-items-center gap-3">
            <Form.Check
              type="checkbox"
              label="Con stock"
              checked={stockFilter === 'with'}
              onChange={() => handleStockFilterChange('with')}
            />
            <Form.Check
              type="checkbox"
              label="Sin stock"
              checked={stockFilter === 'without'}
              onChange={() => handleStockFilterChange('without')}
            />
          </Col>
        </Row>
      </Form>

      {/* ==== Vista de Tabla (Desktop) ==== */}
      <div className="d-none d-md-block">
        <Table striped hover>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Producto</th>
              {SUCURSALES.map(b => (
                <th key={b}>{b}</th>
              ))}
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const category = categories.find(c => c._id === p.categoryId);
              const hasStock = p.stock > 0;
              return (
                <tr key={p._id}>
                  <td>{category?.name}</td>
                  <td>{p.name}</td>
                  {SUCURSALES.map(b => (
                    <td key={b}>{p.stockByBranch[b] || 0}</td>
                  ))}
                  <td>{p.stock}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-success"
                        size="sm"
                        title="➕ Cargar stock"
                        onClick={() => navigate(`/stock/add?productId=${p._id}`)}
                      >
                        <span role="img" aria-label="Cargar">➕</span>
                      </Button>

                      {hasStock && (
                        <>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            title="🛒 Registrar venta"
                            onClick={() => navigate(`/stock/sale?productId=${p._id}`)}
                          >
                            <span role="img" aria-label="Venta">🛒</span>
                          </Button>

                          <Button
                            variant="outline-warning"
                            size="sm"
                            title="🚚 Mudanza de stock"
                            onClick={() => navigate(`/stock/transfer?productId=${p._id}`)}
                          >
                            <span role="img" aria-label="Mudanza">🚚</span>
                          </Button>

                          <Button
                            variant="outline-danger"
                            size="sm"
                            title="❌ Registrar faltante"
                            onClick={() => navigate(`/stock/shortage?productId=${p._id}`)}
                          >
                            <span role="img" aria-label="Faltante">❌</span>
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

      {/* ==== Vista de Cards (Mobile) ==== */}
      <div className="d-md-none">
        {filtered.map(p => {
          const category = categories.find(c => c._id === p.categoryId);
          const hasStock = p.stock > 0;
          return (
            <Card key={p._id} className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">{p.name}</h5>
                  <small className="text-muted">{category?.name}</small>
                </div>
                <div className="d-flex gap-1">
                  <Button
                    variant="outline-success"
                    size="sm"
                    title="➕ Cargar stock"
                    onClick={() => navigate(`/stock/add?productId=${p._id}`)}
                  >
                    <span role="img" aria-label="Cargar">➕</span>
                  </Button>

                  {hasStock && (
                    <>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        title="🛒 Registrar venta"
                        onClick={() => navigate(`/stock/sale?productId=${p._id}`)}
                      >
                        <span role="img" aria-label="Venta">🛒</span>
                      </Button>

                      <Button
                        variant="outline-warning"
                        size="sm"
                        title="🚚 Mudanza de stock"
                        onClick={() => navigate(`/stock/transfer?productId=${p._id}`)}
                      >
                        <span role="img" aria-label="Mudanza">🚚</span>
                      </Button>

                      <Button
                        variant="outline-danger"
                        size="sm"
                        title="❌ Registrar faltante"
                        onClick={() => navigate(`/stock/shortage?productId=${p._id}`)}
                      >
                        <span role="img" aria-label="Faltante">❌</span>
                      </Button>
                    </>
                  )}
                </div>
              </Card.Header>
              <ListGroup variant="flush">
                {SUCURSALES.map(b => (
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
