import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';

export default function PriceAdjustment() {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('percentage'); // 'percentage' | 'fixed'
  const [percentage, setPercentage] = useState('');
  const [fixedPrice, setFixedPrice] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Cargar categorías
    api.get('/categories')
      .then(res => {
        setCategories(res.data);
        // Si hay categoryId en la URL, seleccionar esa categoría
        const categoryId = searchParams.get('categoryId');
        if (categoryId) {
          const category = res.data.find(c => c._id === categoryId);
          if (category) {
            setSelectedCategory(category._id);
            setCategoryName(category.name);
          }
        }
      })
      .catch(() => setError('Error al cargar las categorías'));
  }, [searchParams]);

  useEffect(() => {
    if (selectedCategory) {
      // Cargar productos de la categoría seleccionada
      api.get(`/products?categoryId=${selectedCategory}`)
        .then(res => {
          setProducts(res.data);
          // Limpiar vista previa cuando cambia la categoría
          setPreview([]);
        })
        .catch(() => setError('Error al cargar los productos'));
    } else {
      setProducts([]);
      setPreview([]);
    }
  }, [selectedCategory]);

  // Actualizar vista previa cuando cambia el tipo de ajuste
  useEffect(() => {
    if (adjustmentType === 'percentage' && percentage) {
      updatePreview('percentage', percentage);
    } else if (adjustmentType === 'fixed' && fixedPrice) {
      updatePreview('fixed', fixedPrice);
    } else {
      setPreview([]);
    }
  }, [adjustmentType]);

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    const category = categories.find(c => c._id === categoryId);
    setCategoryName(category ? category.name : '');
  };

  const handlePercentageChange = (e) => {
    const value = e.target.value.replace(/[^0-9.-]/g, '');
    setPercentage(value);
    updatePreview('percentage', value);
  };

  const handleFixedPriceChange = (e) => {
    const value = e.target.value.replace(/[^0-9.-]/g, '');
    setFixedPrice(value);
    updatePreview('fixed', value);
  };

  const updatePreview = (type, value) => {
    // Solo mostrar vista previa si hay un número válido y productos cargados
    if (value && !isNaN(Number(value)) && products.length > 0 && selectedCategory) {
      const numValue = Number(value);
      const previewData = products
        .filter(product => product.categoryId._id === selectedCategory)
        .map(product => ({
          ...product,
          newPrice: type === 'percentage' 
            ? Number((product.price * (1 + numValue / 100)).toFixed(2))
            : Number((product.price + numValue).toFixed(2)) // suma el monto fijo
        }));
      setPreview(previewData);
    } else {
      setPreview([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        categoryId: selectedCategory,
        adjustmentType
      };

      if (adjustmentType === 'percentage') {
        payload.percentage = Number(percentage);
      } else {
        payload.fixedPrice = Number(fixedPrice);
      }

      await api.post('/products/adjust-prices', payload);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al ajustar los precios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <h2 className="mb-1">Ajuste de Precios por Categoría</h2>
      {categoryName && <h6 className="text-muted mb-4">{categoryName}</h6>}
      
      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            {/* Selector de tipo de ajuste */}
            <Form.Group className="mb-4">
              <Form.Label>Tipo de Ajuste</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check
                  type="radio"
                  id="percentage-type"
                  label="Por Porcentaje"
                  checked={adjustmentType === 'percentage'}
                  onChange={() => {
                    setAdjustmentType('percentage');
                    setPreview([]);
                  }}
                />
                <Form.Check
                  type="radio"
                  id="fixed-type"
                  label="Monto Fijo"
                  checked={adjustmentType === 'fixed'}
                  onChange={() => {
                    setAdjustmentType('fixed');
                    setPreview([]);
                  }}
                />
              </div>
            </Form.Group>

            {/* Ajuste por porcentaje */}
            {adjustmentType === 'percentage' && (
              <Form.Group className="mb-3">
                <Form.Label>Porcentaje de Ajuste</Form.Label>
                <div style={{ position: 'relative', maxWidth: '350px', width: '100%' }}>
                  <Form.Control
                    type="text"
                    value={percentage}
                    onChange={handlePercentageChange}
                    placeholder="Ej: 10 para aumentar 10%, -5 para disminuir 5%"
                    required
                    style={{
                      paddingRight: '25px'
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6c757d'
                    }}
                  >
                    %
                  </span>
                </div>
                <Form.Text className="text-muted">
                  Ingrese un número positivo para aumentar o negativo para disminuir
                </Form.Text>
              </Form.Group>
            )}

            {/* Ajuste por monto fijo */}
            {adjustmentType === 'fixed' && (
              <Form.Group className="mb-3">
                <Form.Label>Monto a Sumar</Form.Label>
                <div style={{ position: 'relative', maxWidth: '350px', width: '100%' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6c757d'
                    }}
                  >
                    $
                  </span>
                  <Form.Control
                    type="text"
                    value={fixedPrice}
                    onChange={handleFixedPriceChange}
                    placeholder="Ej: 100 para sumar $100, -50 para restar $50"
                    required
                    style={{
                      paddingLeft: '25px'
                    }}
                  />
                </div>
                <Form.Text className="text-muted">
                  Este monto se sumará al precio actual de cada producto (use números negativos para restar)
                </Form.Text>
              </Form.Group>
            )}

            <div className="d-flex gap-2">
              <Button 
                variant="dark" 
                type="submit" 
                disabled={
                  loading || 
                  !selectedCategory || 
                  (adjustmentType === 'percentage' && !percentage) ||
                  (adjustmentType === 'fixed' && !fixedPrice)
                }
              >
                {loading ? 'Aplicando...' : 'Aplicar Ajuste'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => window.history.back()}
              >
                Cancelar
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {preview.length > 0 && (
        <Card>
          <Card.Header>
            <h5 className="mb-0">Vista Previa de Cambios</h5>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio Actual</th>
                    <th>Nuevo Precio</th>
                    <th>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map(product => (
                    <tr key={product._id}>
                      <td>{product.name}</td>
                      <td>${product.price.toFixed(2)}</td>
                      <td>${product.newPrice.toFixed(2)}</td>
                      <td className={product.newPrice > product.price ? 'text-success' : 'text-danger'}>
                        ${(product.newPrice - product.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}

      <Modal
        show={showModal}
        message="Los precios han sido actualizados correctamente"
        onClose={() => navigate('/datos')}
      />
    </Container>
  );
} 