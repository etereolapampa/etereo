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
            filteredCats.map(cat => (
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
                  {filteredProds
                    .filter(p => p.categoryId && p.categoryId._id === cat._id)
                    .map(prod => (
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
                  {!prodFilter.trim() && filteredProds.filter(p => p.categoryId && p.categoryId._id === cat._id).length === 0 && (
                    <ListGroup.Item className="text-muted">
                      Sin productos en esta categoría
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </Card>
            ))
          )}
        </Col>

        {/* === Vendedores === */}
        <Col lg={4}>
          <h2 className="mb-4">Datos: Vendedores</h2>

          <div className="mb-3">
            <Link to="/sellers/new" className="btn btn-dark">
              Crear Vendedor
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
          ) : filteredSellers.map(seller => (
            <Card key={seller._id} className="mb-3 shadow-sm">
              <Card.Header className="d-flex justify-content-between align-items-center border-bottom border-2 border-secondary">
                <strong>{seller.name} {seller.lastname}</strong>
                <div>
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
                </div>
              </Card.Header>
              <ListGroup variant="flush">
                <ListGroup.Item>DNI: {seller.dni}</ListGroup.Item>
                <ListGroup.Item>Localidad: {seller.city?.name || 'Sin localidad'}</ListGroup.Item>
                <ListGroup.Item>Teléfono: {seller.phone}</ListGroup.Item>
                <ListGroup.Item>Bonificación: {seller.bonus || '0'}%</ListGroup.Item>
              </ListGroup>
            </Card>
          ))}
        </Col>
      </Row>
    </Container>
  );
}
