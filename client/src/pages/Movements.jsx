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
import Modal from '../components/Modal';          // ⬅️  ¡nuevo!
import { useSucursales } from '../hooks/useStaticData';
import { todayAR, formatDateAR } from '../utils/date';
import { isMulti } from '../utils/movements';   // si no la tenías exportada
import { downloadReceipt } from '../utils/receipt';


/** ¿La fila proviene de un ítem con isDiscount === true?  */
const isDiscountRow = m => isMulti(m) && m._item?.isDiscount;

/* ───────────── Helpers globales ───────────── */
const formatDate = formatDateAR;
const initialMonth = todayAR().slice(0, 7); // YYYY-MM

/** Convierte movimientos múltiples en filas individuales. */
const expandMovements = list =>
  list.flatMap(m =>
    isMulti(m) ? m.items.map((it, idx) => ({ ...m, _item: it, _row: idx }))
      : m
  );

/* ───────────── Componente ───────────── */
export default function Movements() {
  const navigate = useNavigate();
  const { sucursales } = useSucursales();

  /* estado ----------------------- */
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
  const [hoverGroup, setHoverGroup] = useState(null);   // ← NUEVO

  const [deleteTarget, setDeleteTarget] = useState(null);   // movimiento a borrar
  const [deleteError, setDeleteError] = useState('');


  /* carga inicial ---------------- */
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
      .catch(e =>
        setError(e.response?.data?.error || 'Error al cargar los datos')
      )
      .finally(() => setLoading(false));
  }, []);

  /* helpers ----------------------- */
  const getMovementType = m => {
    switch (m.type) {
      case 'add': return 'Carga';
      case 'sell': return 'Venta';
      case 'transfer': return 'Mudanza';
      case 'shortage': return 'Faltante';
      default: return 'Otro';
    }
  };

  const getDestination = m => {
    if (m.type === 'sell') {
      if (m.sellerId) {
        const s = sellers.find(x => x._id === m.sellerId._id);
        if (s) {
          const base = `${s.name} ${s.lastname}`;
          return s.isDeleted ? `${base} (Eliminada)` : base;
        }
        // si no está en la lista local pero viene populateado
        if (m.sellerId?.name) {
          const base = `${m.sellerId.name} ${m.sellerId.lastname}`;
          return m.sellerId.isDeleted ? `${base} (Eliminada)` : base;
        }
        return 'Vendedor eliminado';
      }
      return m.destination || 'Consumidor Final';
    }
    if (m.type === 'transfer') return m.destination || '-';
    return '-';
  };

  const formatMonthDisplay = yyyymm => {
    const [y, m] = yyyymm.split('-');
    const date = new Date(y, m - 1);
    const mes = date.toLocaleString('es-ES', { month: 'long' });
    return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${y}`;
  };

  const handleMonthChange = dir => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1);
    d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  /* filtrado base --------------- */
  const baseFilteredMovements = useMemo(() => {
    return expandMovements(movements)
      .filter(m => {
        const d = new Date(m.date);
        const [y, mo] = currentMonth.split('-').map(Number);
        return d.getFullYear() === y && d.getMonth() + 1 === mo;
      })
      .filter(m => !typeFilter || getMovementType(m) === typeFilter)
      .filter(m => {
        if (!categoryFilter) return true;
        if (isMulti(m)) return false;
        const prod = products.find(p => p._id === m.productId._id);
        return prod?.categoryId?._id === categoryFilter;
      })
      .filter(m => {
        if (!productFilter) return true;
        if (isMulti(m)) return false;
        return m.productId._id === productFilter;
      })
      .filter(m => !branchFilter || m.branch === branchFilter)
      .filter(m => {
        if (!mudanzaDestinationFilter) return true;
        return m.type === 'transfer' && m.destination === mudanzaDestinationFilter;
      })
      .filter(m => {
        if (!ventaDestinationFilter) return true;
        if (m.type !== 'sell') return false;
        const dest = m.sellerId
          ? `${sellers.find(s => s._id === m.sellerId._id)?.name} ${sellers.find(s => s._id === m.sellerId._id)?.lastname}`
          : m.destination || 'Consumidor Final';
        return dest === ventaDestinationFilter;
      });
  }, [
    movements, products, sellers,
    currentMonth,
    typeFilter, categoryFilter, productFilter,
    branchFilter, mudanzaDestinationFilter, ventaDestinationFilter
  ]);

  /* opciones disponibles para los selects (idéntico al viejo menú) */
  const availableFilterOptions = useMemo(() => {
    const types = new Set();
    const categoryIds = new Set();
    const productIds = new Set();
    const branchesSet = new Set();
    const mudanzaDestinations = new Set();
    const ventaDestinations = new Set();

    /* recorremos los movimientos ya filtrados por mes + filtros básicos */
    baseFilteredMovements.forEach(m => {
      /* tipo */
      types.add(getMovementType(m));

      /* producto / categoría (ventas múltiples excluidas) */
      if (!isMulti(m) && m.productId) {
        const prod = m.productId;               // ya viene populateado
        productIds.add(prod._id);
        if (prod.categoryId) categoryIds.add(prod.categoryId._id);
      }

      /* sucursales: branch y origin */
      if (m.branch) branchesSet.add(m.branch);
      if (m.origin) branchesSet.add(m.origin);

      /* destinos */
      if (m.type === 'transfer') {
        if (m.destination) mudanzaDestinations.add(m.destination);
      } else if (m.type === 'sell') {
        if (m.sellerId) {
          const s = sellers.find(x => x._id === m.sellerId._id);
          if (s) ventaDestinations.add(`${s.name} ${s.lastname}`);
        } else {
          ventaDestinations.add(m.destination || 'Consumidor Final');
        }
      }
    });

    return {
      types: Array.from(types).sort(),
      categories: categories
        .filter(c => categoryIds.has(c._id))
        .sort((a, b) => a.name.localeCompare(b.name)),
      products: products
        .filter(p => productIds.has(p._id))
        .sort((a, b) => a.name.localeCompare(b.name)),
      branches: Array.from(branchesSet).sort(),
      mudanzaDestinations: Array.from(mudanzaDestinations).sort(),
      ventaDestinations: Array.from(ventaDestinations).sort()
    };
  }, [baseFilteredMovements, categories, products, sellers]);


  const filteredMovements = useMemo(() => {
    if (!hasObservations) return baseFilteredMovements;
    return baseFilteredMovements.filter(m => m.observations?.trim());
  }, [baseFilteredMovements, hasObservations]);

  const mobileMovs = useMemo(
    () => filteredMovements.filter(m => !isMulti(m) || m._row === 0),
    [filteredMovements]
  );

  /* opciones dinámicas ----------- (se mantienen igual) */
  /* … (no se modifican en esta sección para ahorrar espacio) … */

  /* helpers fila expandida ------- */
  const getProduct = m =>
    isMulti(m) ? products.find(p => p._id === m._item.productId)
      : m.productId;

  const getQty = m => isMulti(m) ? m._item.quantity : m.quantity;
  const getPrice = m => isMulti(m) ? m._item.price :
    (m.price ?? m.productId?.price ?? 0);
  // — cálculos de totales desglosados —
  const getBruto = m => 
    isMulti(m)
      ? m.items.reduce((s, it) => s + it.quantity * it.price, 0)
      : getQty(m) * getPrice(m);

  const getComision = m => {
    if (m.type !== 'sell' || !m.sellerId) return 0;
    const b = m.sellerId.bonus;
    if (typeof b !== 'number' || b <= 0) return 0;
    const bruto = getBruto(m);
    return +(bruto * (b / 100)).toFixed(2);
  };

  const getNeto = m => getBruto(m) - getComision(m);

  // — total de la venta completa (mantener compatibilidad) —
  const getTotal = m => getNeto(m);

  /* ─────────────────────────────────────────────────────────
     🔄 2) FUNCIÓN para abrir el modal ( reemplaza al navigate )
  ────────────────────────────────────────────────────────── */
  const handleAskDelete = mov => setDeleteTarget(mov);

  /* ─────────────────────────────────────────────────────────
     🔄 3) CONFIRMAR eliminación
  ────────────────────────────────────────────────────────── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    try {
      await api.delete(`/stock/movements/${deleteTarget._id}`);
      // quitamos de la lista local sin recargar:
      setMovements(prev => prev.filter(m => m._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Error al eliminar');
    }
  };

  /* acciones Editar/Eliminar ----- */
  const handleDelete = id => handleAskDelete(   // 👈  ahora abre modal
    filteredMovements.find(m => m._id === id)
  );

  const handleEdit = m => {
    if (isMulti(m)) {
      const seller = m.sellerId ? m.sellerId._id : '';
      navigate(`/sellers/${seller}/sale?edit=${m._id}`);
      return;
    }
    const type = getMovementType(m);
    const prod = m.productId?._id || '';
    switch (type) {
      case 'Carga': navigate(`/stock/add?productId=${prod}&edit=${m._id}`); break;
      case 'Venta': navigate(`/stock/sale?productId=${prod}&edit=${m._id}`); break;
      case 'Faltante': navigate(`/stock/shortage?productId=${prod}&edit=${m._id}`); break;
      case 'Mudanza': navigate(`/stock/transfer?productId=${prod}&edit=${m._id}`); break;
    }
  };

  /* render ----------------------- */
  if (loading) return <div>Cargando…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  /* índice zebra;  y  clave fija del grupo (= _id) --------------------*/
  let groupIdx = -1;
  let currentParentId = null; // sólo para zebra

  /* ═════════════  Render de datos para el modal  ══════════════ */
  const renderDeleteMsg = mov => {
    if (!mov) return null;

    const isVentaMulti = isMulti(mov);
    const prodLines = isVentaMulti
      ? mov.items.map(it => {
        const prod = products.find(p => p._id === it.productId);
        return `· ${prod?.name || '—'}  —  ${it.quantity} u.`;
      }).join('\n')
      : `· ${getProduct(mov)?.name || '—'}  —  ${getQty(mov)} u.`;

    const vendedor = mov.type === 'sell'
      ? mov.sellerId
        ? `${mov.sellerId.name} ${mov.sellerId.lastname}${mov.sellerId.isDeleted ? ' (Eliminada)' : ''}`
        : (mov.destination || 'Consumidor Final')
      : mov.destination || '—';

    return (
      <>
        <p className="mb-2">
          ¿Seguro que deseas eliminar el siguiente movimiento?
        </p>

        <div style={{ whiteSpace: 'pre-line' }}>
          <strong>Fecha:</strong> {formatDateAR(mov.date)}{'\n'}
          <strong>Tipo: </strong>{getMovementType(mov)}{'\n'}
          <strong>Sucursal:</strong> {mov.branch || mov.origin}{'\n'}
          <strong>Destino / Vendedor:</strong> {vendedor}{'\n'}
          <strong>Producto(s):</strong>{'\n'}{prodLines}
        </div>

        {mov.observations && (
          <p className="mt-2 fst-italic">
            <strong>Obs.:</strong> {mov.observations}
          </p>
        )}

        {deleteError && (
          <div className="alert alert-danger mt-2">{deleteError}</div>
        )}
      </>
    );
  };


  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Movimientos</h2>

      {/* ███ Bloque Filtros – estilo v14 ███ */}
      <div
        className="p-3 rounded mb-4 border"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
      >
        <h4 className="mb-3">Filtros</h4>

        <Form>
          {/* ── 1ª fila: selector de mes ── */}
          <Row className="mb-3">
            <Col md={4}>
              <div className="d-flex align-items-center">
                <Button variant="dark" className="me-2"
                  onClick={() => handleMonthChange('prev')}>
                  ◄
                </Button>

                <Form.Control
                  type="text"
                  readOnly
                  value={formatMonthDisplay(currentMonth)}
                  className="text-center fw-semibold"
                />

                <Button variant="dark" className="ms-2"
                  onClick={() => handleMonthChange('next')}>
                  ►
                </Button>
              </div>
            </Col>
          </Row>

          {/* ── 2ª fila: resto de filtros ── */}
          <Row className="g-2">
            <Col md={2}>
              <Form.Label className="text-muted small">Tipo</Form.Label>
              <Form.Select
                value={typeFilter}
                onChange={e => {
                  setTypeFilter(e.target.value);
                  /* reset dependientes */
                  setCategoryFilter('');
                  setProductFilter('');
                  setBranchFilter('');
                  setMudanzaDestinationFilter('');
                  setVentaDestinationFilter('');
                }}
              >
                <option value="">Todos los tipos</option>
                {availableFilterOptions.types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label className="text-muted small">Categoría</Form.Label>
              <Form.Select
                value={categoryFilter}
                onChange={e => {
                  setCategoryFilter(e.target.value);
                  setProductFilter('');
                  setBranchFilter('');
                  setMudanzaDestinationFilter('');
                  setVentaDestinationFilter('');
                }}
              >
                <option value="">Todas las categorías</option>
                {availableFilterOptions.categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label className="text-muted small">Producto</Form.Label>
              <Form.Select
                value={productFilter}
                onChange={e => {
                  setProductFilter(e.target.value);
                  setBranchFilter('');
                  setMudanzaDestinationFilter('');
                  setVentaDestinationFilter('');
                }}
              >
                <option value="">Todos los productos</option>
                {availableFilterOptions.products.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label className="text-muted small">Sucursal</Form.Label>
              <Form.Select
                value={branchFilter}
                onChange={e => {
                  setBranchFilter(e.target.value);
                  setMudanzaDestinationFilter('');
                  setVentaDestinationFilter('');
                }}
              >
                <option value="">Todas las sucursales</option>
                {availableFilterOptions.branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label className="text-muted small">Destino&nbsp;(Mudanza)</Form.Label>
              <Form.Select
                value={mudanzaDestinationFilter}
                onChange={e => setMudanzaDestinationFilter(e.target.value)}
              >
                <option value="">Todas las mudanzas</option>
                {availableFilterOptions.mudanzaDestinations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label className="text-muted small">Destino&nbsp;(Venta)</Form.Label>
              <Form.Select
                value={ventaDestinationFilter}
                onChange={e => setVentaDestinationFilter(e.target.value)}
              >
                <option value="">Todas las ventas</option>
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


      {/* ███ Tabla Desktop ███ */}
      <div className="d-none d-md-block movements-wrapper">
        <Table className="movements-table">
          <thead>
            <tr>
              <th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Producto</th>
              <th>Cant.</th><th>Precio&nbsp;U.</th><th>Bruto</th><th>Comisión</th><th>Neto</th>
              <th>Sucursal</th><th>Destino</th><th>Observaciones</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.map(m => {
              const isFirst = !isMulti(m) || m._row === 0;
              if (isFirst) {                   // nuevo grupo → cambio zebra
                currentParentId = m._id;
                groupIdx += 1;
              }
              const groupClass = groupIdx % 2 === 0 ? 'group-even' : 'group-odd';
              const span = isMulti(m) ? m.items.length : 1;
              const groupKey = m._id;            // ⭐ el mismo para todo el grupo
              // Evitar recalcular 3 veces la comisión y neto
              const brutoVal = getBruto(m);
              const comVal = getComision(m);
              const netoVal = brutoVal - comVal;
              if (isFirst && comVal > 0) {
                console.log(`[RENDER] mov=${m._id} bruto=${brutoVal} comVal=${comVal} neto=${netoVal}`);
              }

              return (
                <tr
                  key={m._id + (m._row ?? '')}
                  className={`${groupClass} ${hoverGroup === groupKey ? 'group-hover' : ''}`}
                  onMouseEnter={() => setHoverGroup(groupKey)}
                  onMouseLeave={() => setHoverGroup(null)}
                >
                  {isFirst && (
                    <>
                      <td rowSpan={span} className="text-center align-middle nowrap">
                        {formatDate(m.date)}
                      </td>
                      <td rowSpan={span} className="text-center align-middle">
                        {getMovementType(m)}
                      </td>
                    </>
                  )}

                  {/* Producto + categoría */}
                  <td>
                    {isDiscountRow(m) ? 'DESCUENTOS'
                      : getProduct(m)?.categoryId?.name || '—'}
                  </td>
                  <td>
                    {isDiscountRow(m) ? (m._item?.description || 'Descuento')
                      : getProduct(m)?.name || '—'}
                  </td>

                  {/* Cantidad, Precio, Bruto, Comisión, Neto */}
                  <td>{getQty(m)}</td>
                  <td className="nowrap">${getPrice(m).toFixed(2)}</td>
                  {/* 👇  Sólo la primera fila del grupo muestra los TOTALES -rowSpan- */}
                  {isFirst && (
                    <>
                      <td rowSpan={span} className="text-center align-middle nowrap">
                        ${brutoVal.toFixed(2)}
                      </td>
                      <td rowSpan={span} className="text-center align-middle nowrap">
                        {console.log('------------------------------------------------COMISION MANUAL:',comVal)}
                        {comVal > 0 ? `-$${comVal.toFixed(2)}` : '$0.00'}
                      </td>
                      <td rowSpan={span} className="text-center align-middle nowrap">
                        ${netoVal.toFixed(2)}
                      </td>
                    </>
                  )}
                  {isFirst && (
                    <>
                      <td rowSpan={span} className="text-center align-middle">
                        {m.branch || m.origin}
                      </td>
                      <td rowSpan={span} className="text-center align-middle">
                        {getDestination(m)}
                      </td>
                      <td rowSpan={span} className="align-middle" style={{ maxWidth: 200 }}>
                        {m.observations || '—'}
                      </td>
                      <td rowSpan={span} className="align-middle">
                        <div className="d-flex gap-1">
                          <Button size="sm" variant="outline-primary"
                            onClick={() => handleEdit(m)}>✏️</Button>
                          <Button size="sm" variant="outline-danger"
                            onClick={() => handleDelete(m._id)}>🗑️</Button>
                          <Button size="sm" variant="outline-success"
                            title="Descargar comprobante"
                            onClick={() => downloadReceipt(m._id)}>⬇️</Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* ███ Vista Cards (Mobile) ███ */}
      <div className="d-md-none">
        {mobileMovs.map(m => (
          <Card key={m._id} className="mb-3">
            <Card.Header className="d-flex justify-content-between">
              <div>
                <strong>{formatDate(m.date)}</strong><br />
                <small>{getMovementType(m)}</small>
              </div>

              {/* acciones solo una vez por venta */}
              <div className="d-flex gap-1">
                <Button variant="outline-primary" size="sm"
                  onClick={() => handleEdit(m)}>✏️</Button>
                <Button variant="outline-danger" size="sm"
                  onClick={() => handleDelete(m._id)}>🗑️</Button>
                <Button size="sm" variant="outline-success"
                  title="Descargar comprobante"
                  onClick={() => downloadReceipt(m._id)}>⬇️</Button>
              </div>
            </Card.Header>

            <Card.Body>
              {/* ───────────────────────────────
            Si ES venta múltiple → listar
           ─────────────────────────────── */}
              {isMulti(m) ? (
                <>
                  {m.items.map((it, idx) => {
                    if (it.isDiscount) {          // ← NUEVO
                      return (
                        <div key={idx} className={idx ? 'mt-3 pt-2 border-top' : ''}>
                          <div><strong>Producto:</strong> {it.description || 'Descuento'}</div>
                          <div><strong>Categoría:</strong> DESCUENTOS</div>
                          {/* los descuentos siempre llevan quantity 1 */}
                          <div><strong>Precio:</strong> ${it.price.toFixed(2)}</div>
                        </div>
                      );
                    }

                    /* — resto sin cambios — */
                    const prod = products.find(p => p._id === it.productId);
                    return (
                      <div key={idx} className={idx ? 'mt-3 pt-2 border-top' : ''}>
                        <div><strong>Producto:</strong> {prod?.name || '—'}</div>
                        <div><strong>Categoría:</strong> {prod?.categoryId?.name || '—'}</div>
                        <div><strong>Cantidad:</strong> {it.quantity}</div>
                        <div><strong>Precio&nbsp;U.:</strong> ${it.price.toFixed(2)}</div>
                      </div>
                    );
                  })}

                </>
              ) : (
                /* venta simple */
                <>
                  <div><strong>Producto:</strong> {getProduct(m)?.name || '—'}</div>
                  <div><strong>Categoría:</strong> {getProduct(m)?.categoryId?.name || '—'}</div>
                  <div><strong>Cantidad:</strong> {getQty(m)}</div>
                  <div><strong>Precio&nbsp;U.:</strong> ${getPrice(m).toFixed(2)}</div>
                </>
              )}

              {/* totales desglosados solo una vez por movimiento */}
              <div className="fw-bold mt-3">
                <div><strong>Bruto:</strong> ${getBruto(m).toFixed(2)}</div>
                {getComision(m) > 0 && (
                  <div><strong>Comisión:</strong> -${getComision(m).toFixed(2)}</div>
                )}
                <div><strong>Neto:</strong> ${getNeto(m).toFixed(2)}</div>
              </div>

              <div className="mt-2"><strong>Sucursal:</strong> {m.branch || m.origin}</div>
              <div><strong>Destino:</strong> {getDestination(m)}</div>

              {m.observations && (
                <div className="mt-2"><em>{m.observations}</em></div>
              )}
            </Card.Body>
          </Card>
        ))}
      </div>


      {/* ════════════════════════════════════════════════════
       MODAL DE CONFIRMACIÓN
       ════════════════════════════════════════════════════ */}
      <Modal
        show={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        message={renderDeleteMsg(deleteTarget)}
      >
        <Button variant="danger" onClick={confirmDelete}>
          Eliminar
        </Button>
      </Modal>

    </Container>
  );
}
