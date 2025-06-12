// src/pages/Stats.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Form, Table, Row, Col, Card } from 'react-bootstrap';
import api from '../api';
import { useSucursales } from '../hooks/useStaticData';
import * as XLSX from 'xlsx'; // Importar la librería xlsx

export default function Stats() {
  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const { sucursales, loading: loadingSucursales, error: errorSucursales } = useSucursales();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [stockData, setStockData] = useState([]); // Estado para los datos de stock
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [concept, setConcept] = useState('Ventas');
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState('');
  const [product, setProduct] = useState('');
  const [seller, setSeller] = useState('');
  const [branch, setBranch] = useState('');
  const [showFinalConsumer, setShowFinalConsumer] = useState(false);
  const [rowGroup, setRowGroup] = useState('Producto');

  // Función para obtener el tipo de movimiento con nombres amigables
  const getMovementType = (movement) => {
    if (movement.type === 'add') return 'Carga';
    if (movement.type === 'sell') return 'Venta';
    if (movement.type === 'transfer') return 'Mudanza';
    if (movement.type === 'shortage') return 'Faltante';
    return 'Otro';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Hacer las peticiones secuencialmente
        const mRes = await api.get('/stock/movements');
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const pRes = await api.get('/products');
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const cRes = await api.get('/categories');
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const sRes = await api.get('/sellers');
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const stockRes = await api.get('/stock');

        console.log('Movements data:', mRes.data[0]);
        console.log('Products data:', pRes.data[0]);
        console.log('Categories data:', cRes.data[0]);
        console.log('Sellers data:', sRes.data[0]);

      setMovements(mRes.data);
      setProducts(pRes.data);
      setCategories(cRes.data);
      setSellers(sRes.data);
        setStockData(stockRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      setError(err.response?.data?.error || 'Error al cargar los datos');
      } finally {
      setLoading(false);
      }
    };

    fetchData();
  }, []);

  const data = useMemo(() => {
    // Filtrar movimientos por año, tipo y categoría/producto seleccionado
    const filtered = movements.filter(m => {
      const date = new Date(m.date);
      const productMatch = products.find(p => p._id === m.productId._id);
      const categoryMatch = !category || (productMatch && productMatch.categoryId._id === category);
      const productFilterMatch = !product || m.productId._id === product;
      const sellerMatch = !seller || (m.sellerId && m.sellerId._id === seller);
      const branchMatch = !branch || m.branch === branch;
      const finalConsumerMatch = !showFinalConsumer || !m.sellerId;

      // Solo procesar movimientos del año seleccionado
      if (date.getFullYear() !== year) return false;
      
      // Solo procesar si coincide con la categoría y producto seleccionados
      if (!categoryMatch || !productFilterMatch || !sellerMatch || !branchMatch || !finalConsumerMatch) return false;

      // Clasificar el tipo de movimiento
      if (concept === 'Ventas') {
        return m.type === 'sell'; // Solo ventas
      } else if (concept === 'Faltantes') {
        return m.type === 'shortage'; // Solo faltantes
      }
      
      return false;
    });

    // Calcular opciones disponibles para los filtros
    const availableOptions = {
      categories: new Set(),
      products: new Set(),
      sellers: new Set(),
      branches: new Set()
    };

    filtered.forEach(m => {
      const product = products.find(p => p._id === m.productId._id);
      if (product) {
        availableOptions.products.add(product._id);
        const category = categories.find(c => c._id === product.categoryId._id);
        if (category) availableOptions.categories.add(category._id);
      }
      if (m.sellerId) availableOptions.sellers.add(m.sellerId._id);
      if (m.branch) availableOptions.branches.add(m.branch);
    });

    // Agrupar por el campo seleccionado y mes
    const grouped = {};
    filtered.forEach(m => {
      let key;
      if (rowGroup === 'Producto') {
        const p = products.find(p => p._id === m.productId._id);
        key = p?.name || 'Desconocido';
      } else if (rowGroup === 'Vendedor') {
        if (!m.sellerId) {
          key = 'Consumidor Final';
        } else {
          const v = sellers.find(v => v._id === m.sellerId._id);
          console.log('Looking for seller:', { movementId: m._id, sellerId: m.sellerId._id, found: v });
          key = v ? `${v.name} ${v.lastname}` : 'Vendedor eliminado';
        }
      } else if (rowGroup === 'Categoría') {
        const p = products.find(p => p._id === m.productId._id);
        const c = categories.find(c => c._id === p?.categoryId._id);
        key = c?.name || 'Categoría eliminada';
      } else if (rowGroup === 'Sucursal') {
        key = m.branch || 'Desconocida';
      }

      if (!grouped[key]) {
        grouped[key] = Array(12).fill(0);
      }
      // Extraer el mes directamente de la fecha en formato YYYY-MM-DD
      const month = parseInt(m.date.split('-')[1]) - 1;
      grouped[key][month] += m.quantity;
    });

    // Convertir a array y calcular totales
    return {
      data: Object.entries(grouped)
        .map(([name, months]) => ({
          name,
          months,
          total: months.reduce((sum, val) => sum + val, 0)
        }))
        .filter(row => row.total > 0)
        .sort((a, b) => b.total - a.total),
      availableOptions
    };
  }, [movements, products, categories, sellers, year, concept, category, product, rowGroup, sucursales, seller, branch, showFinalConsumer]);

  // Agregar console.log para debug
  console.log('Movements:', movements);
  console.log('Filtered:', movements.filter(m => {
    const date = new Date(m.date);
    const isVenta = m.sellerId != null;
    const isTransferencia = m.destination != null;
    const productMatch = products.find(p => p._id === m.productId._id);
    const categoryMatch = !category || (productMatch && productMatch.categoryId._id === Number(category));
    const productFilterMatch = !product || m.productId._id === Number(product);
    const sellerMatch = !seller || m.sellerId === Number(seller);
    const branchMatch = !branch || m.branch === branch;
    const finalConsumerMatch = !showFinalConsumer || !m.sellerId;

    return date.getFullYear() === year &&
           ((concept === 'Ventas' && isVenta) || 
            (concept === 'Faltantes' && !isVenta && !isTransferencia)) &&
           categoryMatch &&
           productFilterMatch &&
           sellerMatch &&
           branchMatch &&
           finalConsumerMatch;
  }));
  console.log('Data:', data);

  // Función para exportar a Excel
  const exportToExcel = () => {
    // Crear un nuevo libro de trabajo
    const wb = XLSX.utils.book_new();

    // Pestaña Productos
    const productsHeaders = ['Nombre', 'Categoría', 'Precio'];
    const productsData = products.map(p => [
      p.name,
      categories.find(c => c._id === p.categoryId._id)?.name || 'Sin Categoría',
      p.price
    ]);
    const productsWs = XLSX.utils.aoa_to_sheet([productsHeaders, ...productsData]);
    XLSX.utils.book_append_sheet(wb, productsWs, 'Productos');

    // Pestaña Vendedores
    const sellersHeaders = ['Nombre', 'Apellido', 'DNI', 'Teléfono', 'Localidad', 'Bonificación'];
    const sellersData = sellers.map(s => [
      s.name,
      s.lastname,
      s.dni || '-',
      s.phone || '-',
      s.city?.name || '-',
      s.bonus || 0
    ]);
    const sellersWs = XLSX.utils.aoa_to_sheet([sellersHeaders, ...sellersData]);
    XLSX.utils.book_append_sheet(wb, sellersWs, 'Vendedores');

    // Pestaña Stock
    const stockHeaders = ['Producto', 'Categoría', 'Stock Total', ...sucursales.map(b => b.nombre)];
    const stockDataFormatted = products.map(p => {
      const stockInfo = stockData.find(s => s._id === p._id);
      return [
        p.name,
        categories.find(c => c._id === p.categoryId._id)?.name || 'Sin Categoría',
        p.stock,
        ...sucursales.map(branch => {
          return stockInfo?.stockByBranch?.[branch.nombre] || 0;
        })
      ];
    });
    const stockWs = XLSX.utils.aoa_to_sheet([stockHeaders, ...stockDataFormatted]);
    XLSX.utils.book_append_sheet(wb, stockWs, 'Stock');

    // Pestaña Movimientos (usando los movimientos cargados en esta página)
    const movementsHeaders = ['Fecha', 'Tipo', 'Categoría', 'Producto', 'Cantidad', 'Precio', 'Sucursal', 'Destino', 'Vendedor', 'Observaciones'];
    const movementsDataFormatted = movements.map(m => {
      const product = products.find(p => p._id === m.productId._id);
      const category = categories.find(c => c._id === product?.categoryId._id);
      const seller = m.sellerId ? sellers.find(s => s._id === m.sellerId._id) : null;
      let sellerName = '';
      if (m.type === 'sell') {
         if (m.sellerId) {
           sellerName = seller ? `${seller.name} ${seller.lastname}` : 'Vendedor eliminado';
         } else {
           sellerName = m.destination || 'Consumidor Final';
         }
      }

      // Formatear la fecha a YYYY-MM-DD
      const formattedDate = new Date(m.date).toISOString().split('T')[0];

      return [
        formattedDate,
        getMovementType(m),
        category?.name || '-',
        product?.name || '-',
        m.quantity,
        product?.price || '-',
        m.branch || m.origin || '-',
        m.type === 'transfer' ? (m.destination || '-') : '-',
        sellerName || '-',
        m.observations || '-'
      ];
    });
    const movementsWs = XLSX.utils.aoa_to_sheet([movementsHeaders, ...movementsDataFormatted]);
    XLSX.utils.book_append_sheet(wb, movementsWs, 'Movimientos');

    // Escribir el archivo y descargarlo
    XLSX.writeFile(wb, `datos_etereo_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (loadingSucursales || loading) {
    return <div>Cargando...</div>;
  }

  if (errorSucursales || error) {
    return <div className="alert alert-danger">{errorSucursales || error}</div>;
  }

  // Obtener las opciones disponibles para los filtros
  const { availableOptions } = data;
  const filteredData = data.data;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Estadísticas</h2>
        <button className="btn btn-success" onClick={exportToExcel}>Exportar a Excel</button>
      </div>

      <div className="p-3 rounded mb-4 border" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}>
        <h4 className="mb-3">Filtros</h4>
        <Form>
          <Row className="g-2">
            <Col md={3}>
              <Form.Label>Concepto</Form.Label>
              <Form.Select
                value={concept}
                onChange={e => {
                  setConcept(e.target.value);
                  if (e.target.value === 'Faltantes') {
                    setRowGroup('Producto');
                    setSeller('');
                  }
                }}
              >
                <option>Ventas</option>
                <option>Faltantes</option>
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Año</Form.Label>
              <Form.Select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              >
                {[2023, 2024, 2025].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Categoría</Form.Label>
              <Form.Select
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  setProduct('');
                }}
              >
                <option value="">Todas</option>
                {categories
                  .filter(c => availableOptions.categories.has(c._id))
                  .map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Producto</Form.Label>
              <Form.Select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="mb-2"
              >
                <option value="">Todos los productos</option>
                {products
                  .filter(p => 
                    availableOptions.products.has(p._id) && 
                    (!category || p.categoryId._id === category)
                  )
                  .map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Sucursal</Form.Label>
              <Form.Select
                value={branch}
                onChange={e => setBranch(e.target.value)}
              >
                <option value="">Todas</option>
                {sucursales
                  .filter(b => availableOptions.branches.has(b.nombre))
                  .map(b => (
                    <option key={b.id} value={b.nombre}>{b.nombre}</option>
                  ))}
              </Form.Select>
            </Col>

            {concept === 'Ventas' && (
              <>
                <Col md={3}>
                  <Form.Label>Vendedor</Form.Label>
                  <Form.Select
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                    className="mb-2"
                  >
                    <option value="">Todos los vendedores</option>
                    {sellers
                      .filter(s => availableOptions.sellers.has(s._id))
                      .map(s => (
                        <option key={s._id} value={s._id}>{`${s.name} ${s.lastname}`}</option>
                      ))}
                  </Form.Select>
                </Col>
                <Col md={3} className="d-flex align-items-center">
                  <Form.Check
                    type="checkbox"
                    label="Consumidor Final"
                    checked={showFinalConsumer}
                    onChange={e => {
                      setShowFinalConsumer(e.target.checked);
                      if (e.target.checked) {
                        setSeller('');
                      }
                    }}
                    style={{ marginTop: '2rem' }}
                  />
                </Col>
              </>
            )}
          </Row>
        </Form>
      </div>

      <Form className="mb-4">
        <Row className="g-2">
          <Col md={3}>
            <Form.Label>Agrupar por</Form.Label>
            <Form.Select
              value={rowGroup}
              onChange={e => setRowGroup(e.target.value)}
            >
              <option>Producto</option>
              {concept === 'Ventas' && <option>Vendedor</option>}
              <option>Categoría</option>
              <option>Sucursal</option>
            </Form.Select>
          </Col>
        </Row>
      </Form>

      {/* ==== Vista de Tabla (Desktop) ==== */}
      <div className="d-none d-md-block">
        <Table striped hover>
          <thead>
            <tr>
              <th>{rowGroup === 'Localidad' ? 'Destino' : rowGroup}</th>
              {MONTHS.map((month, i) => (
                <th key={i} className="text-end">{month}</th>
              ))}
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, i) => (
              <tr key={i} className="border-bottom">
                <td>{row.name}</td>
                {row.months.map((quantity, j) => (
                  <td key={j} className="text-end">{quantity || '-'}</td>
                ))}
                <td className="text-end fw-bold">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* ==== Vista de Cards (Mobile) ==== */}
      <div className="d-md-none">
        {filteredData.map((row, i) => (
          <Card key={i} className="mb-4 shadow-sm">
            <Card.Body>
              <div className="fw-bold mb-3">{row.name}</div>
              <div className="d-flex flex-wrap gap-2 border-bottom pb-3 mb-3">
                {row.months.map((quantity, j) => (
                  <div key={j} className="text-center" style={{ minWidth: '60px' }}>
                    <div className="small text-muted">{MONTHS[j]}</div>
                    <div className="fw-bold">{quantity || '-'}</div>
                  </div>
                ))}
              </div>
              <div className="text-start fw-bold">Total: {row.total}</div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
