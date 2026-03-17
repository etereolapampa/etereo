// src/pages/Datos.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  ListGroup,
  Button,
  Form,
  ListGroupItem
} from 'react-bootstrap';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../api';

export default function Datos() {
  const nav = useNavigate();
  const location = useLocation();
  // Todas las acciones habilitadas para cualquier usuario autenticado
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);

  const [catFilter, setCatFilter] = useState('');
  const [prodFilter, setProdFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data));
    api.get('/products').then(r => setProducts(r.data));
    api.get('/sellers').then(r => setSellers(r.data));
  }, [location.key]);

  const filteredProds = useMemo(
    () => products.filter(p =>
      p.name.toLowerCase().includes(prodFilter.toLowerCase())
    ),
    [products, prodFilter]
  );

  const filteredCats = useMemo(
    () => {
      // Si hay filtro de productos, solo mostrar categorías que tengan productos que coincidan
      if (prodFilter.trim()) {
        return categories.filter(cat =>
          cat.name.toLowerCase().includes(catFilter.toLowerCase()) &&
          filteredProds.some(p => p.categoryId && p.categoryId._id === cat._id)
        );
      }
      // Si no hay filtro de productos, mostrar todas las categorías
      return categories.filter(cat =>
        cat.name.toLowerCase().includes(catFilter.toLowerCase())
      );
    },
    [categories, catFilter, prodFilter, filteredProds]
  );

  const filteredSellers = useMemo(
    () => sellers.filter(s =>
      `${s.name} ${s.lastname}`.toLowerCase().includes(sellerFilter.toLowerCase())
    ),
    [sellers, sellerFilter]
  );

  const collator = useMemo(
    () => new Intl.Collator('es', { sensitivity: 'base', numeric: true }),
    []
  );

  const sortedFilteredCats = useMemo(
    () => [...filteredCats].sort((a, b) => collator.compare(a.name || '', b.name || '')),
    [filteredCats, collator]
  );

  const sortedFilteredProds = useMemo(
    () => [...filteredProds].sort((a, b) => collator.compare(a.name || '', b.name || '')),
    [filteredProds, collator]
  );

  const productsByCategory = useMemo(
    () => sortedFilteredProds.reduce((acc, prod) => {
      const categoryId = prod.categoryId?._id;
      if (!categoryId) return acc;
      if (!acc[categoryId]) acc[categoryId] = [];
      acc[categoryId].push(prod);
      return acc;
    }, {}),
    [sortedFilteredProds]
  );

  const activeSellers = filteredSellers.filter(s => !s.isDeleted);
  const deletedSellers = filteredSellers.filter(s => s.isDeleted);

  const [showDeleted, setShowDeleted] = useState(false);

  const restoreSeller = async (id) => {
    await api.put(`/sellers/${id}/restore`);
    const updated = await api.get('/sellers?includeDeleted=1');
    setSellers(updated.data);
  };

  return (
    <Container fluid className="py-4">
      <Row>
        {/* === Categorías & Productos === */}
        <Col lg={8}>
          <h2 className="mb-4">Datos: Categorías & Productos</h2>

          <div className="mb-3">
            <Link to="/categories/new" className="btn btn-dark me-2">
              Crear Categoría
            </Link>
            <Link to="/products/new" className="btn btn-dark">
              Crear Producto
            </Link>
          </div>

          <Form className="mb-4">
            <Row>
              <Col md={6} className="mb-2">
                <Form.Control
                  placeholder="Filtrar Categoría..."
                  value={catFilter}
                  onChange={e => setCatFilter(e.target.value)}
                />
              </Col>
              <Col md={6}>
                <Form.Control
                  placeholder="Filtrar Producto..."
                  value={prodFilter}
                  onChange={e => setProdFilter(e.target.value)}
                />
              </Col>
            </Row>
          </Form>

          {prodFilter.trim() && filteredProds.length === 0 ? (
            <div className="alert alert-info">
              Sin productos que coincidan con el filtro
            </div>
          ) : filteredCats.length === 0 ? (
            <div className="alert alert-info">
              Sin categorías que coincidan con los filtros
            </div>
          ) : (
            sortedFilteredCats.map(cat => {
              const catProducts = productsByCategory[cat._id] || [];
              return (
              <Card key={cat._id} className="mb-4 shadow-sm">
                <Card.Header className="d-flex justify-content-between align-items-center border-bottom border-2 border-secondary">
                  <strong>{cat.name}</strong>
                  <div>
                    <Button
                      title="Ajustar precios de categoría"
                      variant="outline-secondary"
                      size="sm"
                      className="me-2"
                      onClick={() => nav(`/stock/price-adjustment?categoryId=${cat._id}`)}
                    >
                      💰
                    </Button>
                    <Button
                      title="Editar categoría"
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => nav(`/categories/${cat._id}/edit`)}
                    >
                      ✏️
                    </Button>
                    <Button
                      title="Eliminar categoría"
                      variant="outline-danger"
                      size="sm"
                      onClick={() => nav(`/categories/${cat._id}/delete`)}
                    >
                      🗑️
                    </Button>
                  </div>
                </Card.Header>
                <ListGroup variant="flush">
                  {catProducts.map(prod => (
                      <ListGroup.Item
                        key={prod._id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div>
                          {prod.name}
                          <small className="text-muted d-block">${prod.price || '0.00'}</small>
                        </div>
                        <div>
                          <Button
                            title="Editar producto"
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => nav(`/products/${prod._id}/edit`)}
                          >
                            ✏️
                          </Button>
                          <Button
                            title="Eliminar producto"
                            variant="outline-danger"
                            size="sm"
                            onClick={() => nav(`/products/${prod._id}/delete`)}
                          >
                            🗑️
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))}
                  {!prodFilter.trim() && catProducts.length === 0 && (
                    <ListGroup.Item className="text-muted">
                      Sin productos en esta categoría
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </Card>
              );
            })
          )}
        </Col>

        {/* === Vendedores === */}
        <Col lg={4}>
          <h2 className="mb-4">Datos: Vendedores</h2>

          <div className="mb-3 d-flex gap-2 flex-wrap">
            <Link to="/sellers/new" className="btn btn-dark">
              Crear Vendedor
            </Link>
            <Link to="/localities" className="btn btn-primary">
              Localidades
            </Link>
          </div>


          <Form.Control
            className="mb-4"
            placeholder="Filtrar Vendedor..."
            value={sellerFilter}
            onChange={e => setSellerFilter(e.target.value)}
          />

          {sellerFilter.trim() && filteredSellers.length === 0 ? (
            <div className="alert alert-info">
              Sin vendedores que coincidan con el filtro
            </div>
          ) : (
            <>
              {activeSellers.map(seller => (
                <Card key={seller._id} className="mb-3 shadow-sm">
                  <Card.Header className="d-flex justify-content-between align-items-center border-bottom border-2 border-secondary">
                    <strong>{seller.name} {seller.lastname}</strong>
                    <div>
                      <Button
                        title="Registrar venta"
                        variant="outline-success"
                        size="sm"
                        className="me-2"
                        onClick={() => nav(`/sellers/${seller._id}/sale`)}
                      >
                        🛒
                      </Button>
                      <>
                        <Button
                          title="Editar vendedor"
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => nav(`/sellers/${seller._id}/edit`)}
                        >
                          ✏️
                        </Button>
                        <Button
                          title="Eliminar vendedor"
                          variant="outline-danger"
                          size="sm"
                          onClick={() => nav(`/sellers/${seller._id}/delete`)}
                        >
                          🗑️
                        </Button>
                      </>
                    </div>
                  </Card.Header>
                  <ListGroup variant="flush">
                    <ListGroup.Item>DNI: {seller.dni}</ListGroup.Item>
                    <ListGroup.Item>Localidad: {seller.city?.name || 'Sin localidad'}</ListGroup.Item>
                    <ListGroup.Item>Teléfono: {seller.phone}</ListGroup.Item>
                    <ListGroup.Item>Bonificación: {seller.bonus || '0'}%</ListGroup.Item>
                    <ListGroup.Item>Correo: {seller.email || '-'}</ListGroup.Item>
                  </ListGroup>
                </Card>
              ))}

              {/* Bloque de Eliminados */}
              {deletedSellers.length > 0 && (
                <Card className="mt-4 border-danger">
                  <Card.Header className="d-flex justify-content-between align-items-center bg-danger text-white">
                    <strong>Vendedoras Eliminadas ({deletedSellers.length})</strong>
                    <Button
                      size="sm"
                      variant="light"
                      onClick={() => setShowDeleted(s => !s)}
                    >
                      {showDeleted ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </Card.Header>
                  {showDeleted && (
                    <ListGroup variant="flush">
                      {deletedSellers.map(seller => (
                        <ListGroup.Item key={seller._id} className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{seller.name} {seller.lastname}</strong>
                            <small className="text-muted d-block">Eliminada</small>
                          </div>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              title="Restaurar"
                              onClick={() => restoreSeller(seller._id)}
                            >
                              ♻️
                            </Button>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card>
              )}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}
