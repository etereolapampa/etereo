// client/src/pages/Movements.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Table,
  Form,
  Row,
  Col,
  Button,
  Card
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useSucursales } from '../hooks/useStaticData';
import { FaPlus, FaTrash } from 'react-icons/fa';
import Modal from '../components/Modal';            // ← nuevo
import { todayAR, formatDateAR } from '../utils/date';

const formatDate = formatDateAR;
const initialMonth = todayAR().slice(0, 7);

/* ───────── helper ───────── */
const isMulti = m => Array.isArray(m.items) && m.items.length > 0;

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

  /* ------------ modal “ver detalle venta múltiple” -------------- */
  const [detalle, setDetalle] = useState(null);

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
      .catch(err =>
        setError(err.response?.data?.error || 'Error al cargar los datos')
      )
      .finally(() => setLoading(false));
  }, []);

  /* ========== helpers existentes (getMovementType, getDestination, etc.) ========== */

  /* helper: “2025-06” ➜ “Junio de 2025” */
  /* helper: “2025-06” ➜ “Junio de 2025” */
  const formatMonthDisplay = (yyyymm) => {
    const [year, month] = yyyymm.split('-');
    const date = new Date(year, month - 1);
    const monthName = date.toLocaleString('es-ES', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} de ${year}`;
  };

  /* helper: cambia el mes mostrado */
  const handleMonthChange = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1);

    if (direction === 'prev') date.setMonth(date.getMonth() - 1);
    else date.setMonth(date.getMonth() + 1);

    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setCurrentMonth(`${newYear}-${newMonth}`);
  };

  const getMovementType = movement => {
    if (movement.type === 'add') return 'Carga';
    if (movement.type === 'sell') return 'Venta';
    if (movement.type === 'transfer') return 'Mudanza';
    if (movement.type === 'shortage') return 'Faltante';
    return 'Otro';
  };

  const getDestination = movement => {
    if (movement.type === 'sell') {
      if (movement.sellerId) {
        const seller = sellers.find(s => s._id === movement.sellerId._id);
        return seller
          ? `${seller.name} ${seller.lastname}`
          : 'Vendedor eliminado';
      }
      return movement.destination || 'Consumidor Final';
    }
    if (movement.type === 'transfer') {
      return movement.destination || '-';
    }
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

  const handleEdit = movement => {
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

  /* ==================== RENDER ==================== */

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

      {/* ================= Tabla (desktop) ================= */}
      <div className="d-none d-md-block">
        <Table striped hover responsive>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio / Total</th>
              <th>Sucursal</th>
              <th>Destino</th>
              <th style={{ maxWidth: '200px' }}>Observaciones</th>
              <th style={{ width: '110px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.map(movement => {
              /* helper locales */
              const qty = isMulti(movement)
                ? movement.items.reduce((s, it) => s + it.quantity, 0)
                : movement.quantity;
              const priceOrTotal = isMulti(movement)
                ? `$${movement.total.toFixed(2)}`
                : `$${(
                  Number(movement.price || movement.productId?.price) || 0
                ).toFixed(2)}`;

              return (
                <tr key={movement._id}>
                  <td>{formatDate(movement.date)}</td>
                  <td>{getMovementType(movement)}</td>
                  <td>
                    {movement.productId?.categoryId?.name || (isMulti(movement)
                      ? '–'
                      : 'N/A')}
                  </td>
                  <td>
                    {isMulti(movement)
                      ? 'Venta múltiple'
                      : movement.productId?.name || 'N/A'}
                  </td>
                  <td>{qty}</td>
                  <td>{priceOrTotal}</td>
                  <td>{movement.branch || movement.origin || 'N/A'}</td>
                  <td>{getDestination(movement)}</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                    {movement.observations || '-'}
                  </td>
                  <td>
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
                        title="Eliminar movimiento"
                        onClick={() => handleDelete(movement._id)}
                      >
                        🗑️
                      </Button>
                      {isMulti(movement) && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          title="Ver detalle"
                          onClick={() => setDetalle(movement)}
                        >
                          👁️
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* ================ Vista Cards (mobile) ================ */}
      <div className="d-md-none">
        {filteredMovements.map(movement => {
          const qty = isMulti(movement)
            ? movement.items.reduce((s, it) => s + it.quantity, 0)
            : movement.quantity;
          const priceOrTotal = isMulti(movement)
            ? `$${movement.total.toFixed(2)}`
            : `$${(
              Number(movement.price || movement.productId?.price) || 0
            ).toFixed(2)}`;

          return (
            <Card key={movement._id} className="mb-3 shadow-sm">
              <Card.Body>
                <Card.Text>
                  <strong>Fecha:</strong> {formatDate(movement.date)} <br />
                  <strong>Tipo:</strong> {getMovementType(movement)} <br />
                  {!isMulti(movement) && (
                    <>
                      <strong>Categoría:</strong>{' '}
                      {movement.productId?.categoryId?.name || 'N/A'} <br />
                      <strong>Producto:</strong>{' '}
                      {movement.productId?.name || 'N/A'} <br />
                    </>
                  )}
                  {isMulti(movement) && (
                    <>
                      <strong>Concepto:</strong> Venta múltiple <br />
                    </>
                  )}
                  <strong>Cantidad:</strong> {qty} <br />
                  <strong>{isMulti(movement) ? 'Total' : 'Precio'}:</strong>{' '}
                  {priceOrTotal} <br />
                  <strong>Sucursal:</strong>{' '}
                  {movement.branch || movement.origin || 'N/A'} <br />
                  {getDestination(movement) !== '-' && (
                    <>
                      <strong>Destino:</strong> {getDestination(movement)} <br />
                    </>
                  )}
                  {movement.observations && (
                    <>
                      <strong>Obs.:</strong> {movement.observations} <br />
                    </>
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
                    title="Eliminar movimiento"
                    onClick={() => handleDelete(movement._id)}
                  >
                    🗑️
                  </Button>
                  {isMulti(movement) && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      title="Ver detalle"
                      onClick={() => setDetalle(movement)}
                    >
                      👁️
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* =============== Modal Detalle Venta Múltiple =============== */}
      <Modal
        show={!!detalle}
        onClose={() => setDetalle(null)}
        message={
          detalle && (
            <div>
              <h5>Detalle de venta</h5>
              <ul className="list-group mb-2">
                {detalle.items.map((it, i) => {
                  const prod = products.find(p => p._id === it.productId);
                  return (
                    <li
                      key={i}
                      className="list-group-item d-flex justify-content-between"
                    >
                      <span>{prod ? prod.name : 'Producto eliminado'}</span>
                      <span>
                        {it.quantity} × ${it.price.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="text-end fw-bold">
                Total: ${detalle.total.toFixed(2)}
              </div>
            </div>
          )
        }
      />
    </Container>
  );
}

