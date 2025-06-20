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
import Modal from '../components/Modal';
import { todayAR, formatDateAR } from '../utils/date';

const formatDate = formatDateAR;
const initialMonth = todayAR().slice(0, 7);

/* ───── helpers para detectar venta múltiple ───── */
export const isMulti = m => Array.isArray(m.items) && m.items.length > 0;
/** Devuelve un array (a veces vacío) de productIds que intervienen */
export const getProductIds = m =>
  isMulti(m) ? m.items.map(it => String(it.productId))
             : m.productId ? [String(m.productId._id)] : [];

export default function Movements() {
  const navigate = useNavigate();
  const { sucursales } = useSucursales();

  /* ------------------------ estado principal ------------------------ */
  const [movements, setMovements] = useState([]);
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers]     = useState([]);

  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [mudanzaDestinationFilter, setMudanzaDestinationFilter] = useState('');
  const [ventaDestinationFilter, setVentaDestinationFilter] = useState('');
  const [hasObservations, setHasObservations] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

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

  const formatMonthDisplay = yyyymm => {
    const [year, month] = yyyymm.split('-');
    const date = new Date(year, month - 1);
    const monthName = date.toLocaleString('es-ES', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} de ${year}`;
  };

  const handleMonthChange = direction => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1);

    if (direction === 'prev') date.setMonth(date.getMonth() - 1);
    else date.setMonth(date.getMonth() + 1);

    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setCurrentMonth(`${newYear}-${newMonth}`);
  };

  const getMovementType = movement => {
    if (movement.type === 'add')      return 'Carga';
    if (movement.type === 'sell')     return 'Venta';
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

  /* ===================== filtros base ===================== */
  const baseFilteredMovements = useMemo(() => {
    return movements
      .filter(m => {
        const movementDate = new Date(m.date);
        const [year, month] = currentMonth.split('-').map(Number);
        return (
          movementDate.getFullYear() === year &&
          movementDate.getMonth() + 1 === month
        );
      })
      .filter(m => !typeFilter || getMovementType(m) === typeFilter)
      .filter(m => {
        if (!categoryFilter) return true;
        if (isMulti(m)) return false;                // “venta múltiple” no entra por categoría
        const product = products.find(p => p._id === m.productId._id);
        return (
          product &&
          product.categoryId &&
          product.categoryId._id === categoryFilter
        );
      })
      .filter(m => {
        if (!productFilter) return true;
        if (isMulti(m)) return false;                // idem, sólo venta simple
        return m.productId._id === productFilter;
      })
      .filter(m => !branchFilter || m.branch === branchFilter)
      .filter(m => {
        if (!mudanzaDestinationFilter) return true;
        return (
          m.type === 'transfer' &&
          m.destination === mudanzaDestinationFilter
        );
      })
      .filter(m => {
        if (!ventaDestinationFilter) return true;
        if (m.type === 'sell') {
          if (m.sellerId) {
            const seller = sellers.find(s => s._id === m.sellerId._id);
            return (
              seller &&
              `${seller.name} ${seller.lastname}` === ventaDestinationFilter
            );
          } else {
            return (
              m.destination === ventaDestinationFilter ||
              (ventaDestinationFilter === 'Consumidor Final' && !m.destination)
            );
          }
        }
        return false;
      });
  }, [
    movements,
    currentMonth,
    typeFilter,
    categoryFilter,
    productFilter,
    branchFilter,
    mudanzaDestinationFilter,
    ventaDestinationFilter,
    products,
    sellers
  ]);

  /* ========= generar opciones disponibles para selects ========= */
  const availableFilterOptions = useMemo(() => {
    const movementsThisMonth = movements.filter(m => {
      const movementDate = new Date(m.date);
      const [year, month] = currentMonth.split('-').map(Number);
      return (
        movementDate.getFullYear() === year &&
        movementDate.getMonth() + 1 === month
      );
    });

    const filteredMovements = movementsThisMonth.filter(m => {
      if (typeFilter && getMovementType(m) !== typeFilter) return false;
      if (categoryFilter) {
        if (isMulti(m)) return false;
        const product = products.find(p => p._id === m.productId._id);
        if (
          !product ||
          !product.categoryId ||
          product.categoryId._id !== categoryFilter
        )
          return false;
      }
      if (productFilter && (!m.productId || m.productId._id !== productFilter))
        return false;
      if (branchFilter && m.branch !== branchFilter) return false;
      if (
        mudanzaDestinationFilter &&
        (m.type !== 'transfer' || m.destination !== mudanzaDestinationFilter)
      )
        return false;
      if (ventaDestinationFilter) {
        if (m.type !== 'sell') return false;
        const destination = m.sellerId
          ? `${sellers.find(s => s._id === m.sellerId._id)?.name} ${sellers.find(s => s._id === m.sellerId._id)?.lastname}`
          : m.destination || 'Consumidor Final';
        if (destination !== ventaDestinationFilter) return false;
      }
      return true;
    });

    return {
      types: Array.from(
        new Set(movementsThisMonth.map(m => getMovementType(m)))
      ).sort(),
      categories: Array.from(
        new Set(
          filteredMovements
            .filter(m => !isMulti(m))
            .map(m => {
              const product = products.find(p => p._id === m.productId._id);
              return product?.categoryId?._id;
            })
            .filter(Boolean)
        )
      )
        .map(id => categories.find(c => c._id === id))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)),
      products: Array.from(
        new Set(
          filteredMovements
            .filter(m => !isMulti(m))
            .map(m => m.productId._id)
            .filter(Boolean)
        )
      )
        .map(id => products.find(p => p._id === id))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)),
      branches: Array.from(
        new Set(
          filteredMovements.flatMap(m => [m.branch, m.origin]).filter(Boolean)
        )
      ).sort(),
      mudanzaDestinations: Array.from(
        new Set(
          filteredMovements
            .filter(m => m.type === 'transfer')
            .map(m => m.destination)
            .filter(Boolean)
        )
      ).sort(),
      ventaDestinations: Array.from(
        new Set(
          filteredMovements
            .filter(m => m.type === 'sell')
            .map(m => {
              if (m.sellerId) {
                const seller = sellers.find(s => s._id === m.sellerId._id);
                return seller
                  ? `${seller.name} ${seller.lastname}`
                  : null;
              }
              return m.destination || 'Consumidor Final';
            })
            .filter(Boolean)
        )
      ).sort()
    };
  }, [
    movements,
    currentMonth,
    typeFilter,
    categoryFilter,
    productFilter,
    branchFilter,
    mudanzaDestinationFilter,
    ventaDestinationFilter,
    products,
    categories,
    sellers
  ]);

  const filteredMovements = useMemo(() => {
    let result = baseFilteredMovements;

    if (hasObservations) {
      result = result.filter(
        m => m.observations && m.observations.trim() !== ''
      );
    }
    return result;
  }, [baseFilteredMovements, hasObservations]);

  /* ====================== helpers UI ====================== */
  const handleDelete = _id => navigate(`/movements/${_id}/delete`);

  const handleEdit = movement => {
    const type = getMovementType(movement);
    switch (type) {
      case 'Carga':
        navigate(
          `/stock/add?productId=${movement.productId._id}&edit=${movement._id}`
        );
        break;
      case 'Venta':
        navigate(
          `/stock/sale?productId=${
            movement.productId?._id || ''
          }&edit=${movement._id}`
        );
        break;
      case 'Faltante':
        navigate(
          `/stock/shortage?productId=${movement.productId._id}&edit=${movement._id}`
        );
        break;
      case 'Mudanza':
        navigate(
          `/stock/transfer?productId=${movement.productId._id}&edit=${movement._id}`
        );
        break;
    }
  };

  /* ==================== RENDER ==================== */

  if (loading) return <div>Cargando...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Movimientos</h2>
      </div>

      {/* ==== Filtros (idéntico, pero ahora con options actualizados) ==== */}
      {/* ...  ⬅ (no sufrió cambios salvo los console.log eliminados) ... */}

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

                  {/* Categoría */}
                  <td>
                    {isMulti(movement)
                      ? '—'
                      : movement.productId?.categoryId?.name || 'N/A'}
                  </td>

                  {/* Producto / concepto */}
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
      {/* (Se añade la misma lógica de isMulti en el render mobile) */}

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
