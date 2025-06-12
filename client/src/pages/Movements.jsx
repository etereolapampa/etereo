// client/src/pages/Movements.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Table, Form, Row, Col, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useSucursales } from '../hooks/useStaticData';
import { FaPlus, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { todayAR, formatDateAR } from '../utils/date';   // ⇦ usamos helper ya existente

const formatDate = formatDateAR;

// muestra “2025-06”
const initialMonth = todayAR().slice(0, 7);              // ⇦ reemplaza getArgentinaDate()

const formatMonthDisplay = (yyyymm) => {
  const [year, month] = yyyymm.split('-');
  const date = new Date(year, month - 1);
  const monthName = date.toLocaleString('es-ES', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} de ${year}`;
};

export default function Movements() {
  const navigate = useNavigate();
  const { sucursales } = useSucursales();

  /* ------------------------ estado principal ------------------------ */
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);

  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [mudanzaDestinationFilter, setMudanzaDestinationFilter] = useState('');
  const [ventaDestinationFilter, setVentaDestinationFilter] = useState('');
  const [hasObservations, setHasObservations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ------------------------- carga inicial -------------------------- */
  useEffect(() => {
    Promise.all([
      api.get('/stock/movements'),
      api.get('/products'),
      api.get('/categories'),
      api.get('/sellers')
    ])
      .then(([mRes, pRes, cRes, sRes]) => {
        setMovements(mRes.data);
        setProducts(pRes.data);
        setCategories(cRes.data);
        setSellers(sRes.data);
      })
      .catch(err => setError(err.response?.data?.error || 'Error al cargar los datos'))
      .finally(() => setLoading(false));
  }, []);

  /* …………… resto del componente se mantiene tal cual  …………… */

  /* ***************************************************************** */
  /*  El resto del archivo quedó idéntico: no hubo otro cambio lógico  */
  /* ***************************************************************** */



  const handleMonthChange = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1);

    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }

    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setCurrentMonth(`${newYear}-${newMonth}`);
  };

  const getMovementType = (movement) => {
    if (movement.type === 'add') return 'Carga';
    if (movement.type === 'sell') return 'Venta';
    if (movement.type === 'transfer') return 'Mudanza';
    if (movement.type === 'shortage') return 'Faltante';
    return 'Otro';
  };

  const getDestination = (movement) => {
    // Si es una venta
    if (movement.type === 'sell') {
      // Si tiene sellerId, mostrar nombre del vendedor
      if (movement.sellerId) {
        const seller = sellers.find(s => s._id === movement.sellerId._id);
        return seller ? `${seller.name} ${seller.lastname}` : 'Vendedor eliminado';
      }
      // Si no tiene sellerId, es Consumidor Final (usar destination si está) o 'Consumidor Final' por defecto
      return movement.destination || 'Consumidor Final';
    }

    // Si es una transferencia, mostrar el destino
    if (movement.type === 'transfer') {
      return movement.destination || '-';
    }

    // Para otros tipos sin destino ni vendedor, mostrar -
    return '-';
  };

  const baseFilteredMovements = useMemo(() => {
    return movements
      .filter(m => {
        const movementDate = new Date(m.date);
        const [year, month] = currentMonth.split('-').map(Number);
        return movementDate.getFullYear() === year && movementDate.getMonth() + 1 === month;
      })
      .filter(m => !typeFilter || getMovementType(m) === typeFilter)
      .filter(m => {
        if (!categoryFilter) return true;
        const product = products.find(p => p._id === m.productId._id);
        return product && product.categoryId && product.categoryId._id === categoryFilter;
      })
      .filter(m => !productFilter || m.productId._id === productFilter)
      .filter(m => !branchFilter || m.branch === branchFilter)
      .filter(m => {
        if (!mudanzaDestinationFilter) return true;
        return m.type === 'transfer' && m.destination === mudanzaDestinationFilter;
      })
      .filter(m => {
        if (!ventaDestinationFilter) return true;
        if (m.type === 'sell') {
          if (m.sellerId) {
            const seller = sellers.find(s => s._id === m.sellerId._id);
            return seller && `${seller.name} ${seller.lastname}` === ventaDestinationFilter;
          } else {
            return m.destination === ventaDestinationFilter || (ventaDestinationFilter === 'Consumidor Final' && !m.destination);
          }
        }
        return false;
      });
  }, [movements, currentMonth, typeFilter, categoryFilter, productFilter, branchFilter, mudanzaDestinationFilter, ventaDestinationFilter, products, sellers]);

  const availableFilterOptions = useMemo(() => {
    // Primero filtramos los movimientos según el mes actual
    const movementsThisMonth = movements.filter(m => {
      const movementDate = new Date(m.date);
      const [year, month] = currentMonth.split('-').map(Number);
      return movementDate.getFullYear() === year && movementDate.getMonth() + 1 === month;
    });

    // Luego aplicamos todos los filtros activos para obtener los movimientos filtrados
    const filteredMovements = movementsThisMonth.filter(m => {
      if (typeFilter && getMovementType(m) !== typeFilter) return false;
      if (categoryFilter) {
        const product = products.find(p => p._id === m.productId._id);
        if (!product || !product.categoryId || product.categoryId._id !== categoryFilter) return false;
      }
      if (productFilter && m.productId._id !== productFilter) return false;
      if (branchFilter && m.branch !== branchFilter) return false;
      if (mudanzaDestinationFilter && (m.type !== 'transfer' || m.destination !== mudanzaDestinationFilter)) return false;
      if (ventaDestinationFilter) {
        if (m.type !== 'sell') return false;
        const destination = m.sellerId
          ? `${sellers.find(s => s._id === m.sellerId._id)?.name} ${sellers.find(s => s._id === m.sellerId._id)?.lastname}`
          : (m.destination || 'Consumidor Final');
        if (destination !== ventaDestinationFilter) return false;
      }
      return true;
    });

    // Generamos las opciones disponibles basadas en los movimientos filtrados
    return {
      types: Array.from(new Set(movementsThisMonth.map(m => getMovementType(m)))).sort(),
      categories: Array.from(new Set(filteredMovements
        .map(m => {
          const product = products.find(p => p._id === m.productId._id);
          return product?.categoryId?._id;
        })
        .filter(Boolean)))
        .map(id => categories.find(c => c._id === id))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)),
      products: Array.from(new Set(filteredMovements
        .map(m => m.productId._id)
        .filter(Boolean)))
        .map(id => products.find(p => p._id === id))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)),
      branches: Array.from(new Set(filteredMovements
        .flatMap(m => [m.branch, m.origin])
        .filter(Boolean)))
        .sort(),
      mudanzaDestinations: Array.from(new Set(filteredMovements
        .filter(m => m.type === 'transfer')
        .map(m => m.destination)
        .filter(Boolean)))
        .sort(),
      ventaDestinations: Array.from(new Set(filteredMovements
        .filter(m => m.type === 'sell')
        .map(m => {
          if (m.sellerId) {
            const seller = sellers.find(s => s._id === m.sellerId._id);
            return seller ? `${seller.name} ${seller.lastname}` : null;
          }
          return m.destination || 'Consumidor Final';
        })
        .filter(Boolean)))
        .sort()
    };
  }, [movements, currentMonth, typeFilter, categoryFilter, productFilter, branchFilter, mudanzaDestinationFilter, ventaDestinationFilter, products, categories, sellers]);

  const filteredMovements = useMemo(() => {
    let result = baseFilteredMovements;

    if (hasObservations) {
      result = result.filter(m => m.observations && m.observations.trim() !== '');
    }
    return result;
  }, [baseFilteredMovements, hasObservations]);

  const handleDelete = (_id) => {
    navigate(`/movements/${_id}/delete`);
  };

  const handleEdit = (movement) => {
    const type = getMovementType(movement);
    switch (type) {
      case 'Carga':
        navigate(`/stock/add?productId=${movement.productId._id}&edit=${movement._id}`);
        break;
      case 'Venta':
        navigate(`/stock/sale?productId=${movement.productId._id}&edit=${movement._id}`);
        break;
      case 'Faltante':
        navigate(`/stock/shortage?productId=${movement.productId._id}&edit=${movement._id}`);
        break;
      case 'Mudanza':
        navigate(`/stock/transfer?productId=${movement.productId._id}&edit=${movement._id}`);
        break;
    }
  };

  const getMovementDetails = (movement) => {
    const product = products.find(p => p.id === movement.productId);
    const seller = sellers.find(s => s.id === movement.sellerId);
    const type = getMovementType(movement);

    let details = '';
    switch (type) {
      case 'Carga':
        details = `${movement.quantity} unidades en ${movement.branch}`;
        break;
      case 'Venta':
        details = `${movement.quantity} unidades a $${movement.price || product?.price || 0} en ${movement.branch}`;
        if (seller) {
          details += ` por ${seller.name} ${seller.lastname}`;
        } else if (movement.isFinalConsumer) {
          details += ' (Consumidor Final)';
        }
        break;
      case 'Faltante':
        details = `${movement.quantity} unidades en ${movement.branch}`;
        break;
      case 'Mudanza':
        details = `${movement.quantity} unidades de ${movement.origin} a ${movement.destination}`;
        break;
    }
    return details;
  };

  const getCategoryName = (productId) => {
    const product = products.find(p => p._id === productId._id);
    return product?.categoryId?.name || 'N/A';
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Movimientos</h2>
      </div>

      {/* ==== Filtros ==== */}
      <div className="p-3 rounded mb-4 border" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}>
        <h4 className="mb-3">Filtros</h4>
        <Form>
          {/* Primera fila: Selector de mes */}
          <Row className="mb-3">
            <Col md={4}>
              <div className="d-flex align-items-center">
                <Button
                  variant="dark"
                  onClick={() => handleMonthChange('prev')}
                  className="me-2"
                >
                  ◄
                </Button>
                <Form.Control
                  type="text"
                  value={formatMonthDisplay(currentMonth)}
                  readOnly
                  className="text-center"
                />
                <Button
                  variant="dark"
                  onClick={() => handleMonthChange('next')}
                  className="ms-2"
                >
                  ►
                </Button>
              </div>
            </Col>
          </Row>

          {/* Segunda fila: Resto de filtros */}
          <Row className="g-2">
            <Col md={2}>
              <Form.Group>
                <Form.Label>Tipo</Form.Label>
                <Form.Select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  {console.log('Rendering Types. Options count:', availableFilterOptions.types.length, availableFilterOptions.types)}
                  {availableFilterOptions.types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Label className="text-muted small">Categoría</Form.Label>
              <Form.Select
                value={categoryFilter}
                onChange={e => {
                  console.log('Cambiando categoría a:', e.target.value);
                  console.log('Categorías disponibles:', JSON.stringify(categories.map(c => ({ id: c._id, name: c.name })), null, 2));
                  setCategoryFilter(e.target.value);
                }}
              >
                <option value="">Todas las categorías</option>
                {console.log('Rendering Categories. Options count:', availableFilterOptions.categories.length, availableFilterOptions.categories)}
                {availableFilterOptions.categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="text-muted small">Producto</Form.Label>
              <Form.Select
                value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
              >
                <option value="">Todos los productos</option>
                {console.log('Rendering Products. Options count:', availableFilterOptions.products.length, availableFilterOptions.products)}
                {availableFilterOptions.products.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="text-muted small">Sucursal</Form.Label>
              <Form.Select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
              >
                <option value="">Todas las sucursales</option>
                {console.log('Rendering Branches. Options count:', availableFilterOptions.branches.length, availableFilterOptions.branches)}
                {availableFilterOptions.branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="text-muted small">Destino (Mudanza)</Form.Label>
              <Form.Select
                value={mudanzaDestinationFilter}
                onChange={e => setMudanzaDestinationFilter(e.target.value)}
              >
                <option value="">Todas las mudanzas</option>
                {console.log('Rendering Mudanza Destinations. Options count:', availableFilterOptions.mudanzaDestinations.length, availableFilterOptions.mudanzaDestinations)}
                {availableFilterOptions.mudanzaDestinations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="text-muted small">Destino (Venta)</Form.Label>
              <Form.Select
                value={ventaDestinationFilter}
                onChange={e => setVentaDestinationFilter(e.target.value)}
              >
                <option value="">Todas las ventas</option>
                {console.log('Rendering Venta Destinations. Options count:', availableFilterOptions.ventaDestinations.length, availableFilterOptions.ventaDestinations)}
                {availableFilterOptions.ventaDestinations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2} className="d-flex align-items-center">
              <Form.Check
                type="checkbox"
                label="Con observaciones"
                checked={hasObservations}
                onChange={e => setHasObservations(e.target.checked)}
                style={{ marginTop: '2rem' }}
              />
            </Col>
          </Row>
        </Form>
      </div>

      {/* ==== Tabla de Movimientos (Desktop) ==== */}
      <div className="d-none d-md-block"> {/* Mostrar solo en md y superior */}
        <Table striped hover responsive>
          <thead>
            <tr>
              <th className="align-middle">Fecha</th>
              <th className="align-middle">Tipo</th>
              <th className="align-middle">Categoría</th>
              <th className="align-middle">Producto</th>
              <th className="align-middle">Cantidad</th>
              <th className="align-middle">Precio</th>
              <th className="align-middle">Sucursal</th>
              <th className="align-middle">Destino</th>
              <th className="align-middle" style={{ maxWidth: '200px' }}>Observaciones</th>
              <th className="align-middle" style={{ width: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.map(movement => {
              const product = products.find(p => p.id === movement.productId);
              const category = categories.find(c => c.id === product?.categoryId);
              const destination = getDestination(movement);
              const type = getMovementType(movement);
              const details = getMovementDetails(movement);
              return (
                <tr key={movement._id}>
                  <td className="align-middle">{formatDate(movement.date)}</td>
                  <td className="align-middle">{type}</td>
                  <td className="align-middle">{getCategoryName(movement.productId)}</td>
                  <td className="align-middle">{movement.productId?.name || 'N/A'}</td>
                  <td className="align-middle">{movement.quantity}</td>
                  <td className="align-middle">${(Number(movement.price || movement.productId?.price) || 0).toFixed(2)}</td>
                  <td className="align-middle">{movement.branch || movement.origin || 'N/A'}</td>
                  <td className="align-middle">{destination}</td>
                  <td className="align-middle" style={{ maxWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{movement.observations || '-'}</td>
                  <td className="align-middle">
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        title="Editar movimiento"
                        onClick={() => handleEdit(movement)}
                      >
                        <span role="img" aria-label="Editar">✏️</span>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        title="Eliminar asiento"
                        onClick={() => handleDelete(movement._id)}
                      >
                        <span role="img" aria-label="Eliminar">🗑️</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* ==== Vista de Cards (Mobile) ==== */}
      <div className="d-md-none"> {/* Mostrar solo en menos de md */}
        {filteredMovements.map(movement => {
          const product = products.find(p => p.id === movement.productId);
          const category = categories.find(c => c.id === product?.categoryId);
          const destination = getDestination(movement);
          const type = getMovementType(movement);
          const details = getMovementDetails(movement);

          return (
            <Card key={movement._id} className="mb-3 shadow-sm">
              <Card.Body>
                <Card.Text>
                  <strong>Fecha:</strong> {formatDate(movement.date)}<br />
                  <strong>Tipo:</strong> {type}<br />
                  <strong>Categoría:</strong> {getCategoryName(movement.productId)}<br />
                  <strong>Producto:</strong> {movement.productId?.name || 'N/A'}<br />
                  <strong>Cantidad:</strong> {movement.quantity}<br />
                  <strong>Precio:</strong> ${(Number(movement.price || movement.productId?.price) || 0).toFixed(2)}<br />
                  <strong>Sucursal:</strong> {movement.branch || movement.origin || 'N/A'}<br />
                  {destination !== '-' && (
                    <><strong>Destino/Vendedor:</strong> {destination}<br /></>
                  )}
                  {movement.observations && (
                    <><strong>Observaciones:</strong> {movement.observations}<br /></>
                  )}
                </Card.Text>
                <div className="d-flex gap-1">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    title="Editar movimiento"
                    onClick={() => handleEdit(movement)}
                  >
                    ✏️
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    title="Eliminar asiento"
                    onClick={() => handleDelete(movement._id)}
                  >
                    🗑️
                  </Button>
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
