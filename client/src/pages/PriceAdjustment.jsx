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
  const [percentage, setPercentage] = useState('');
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
        .then(res => setProducts(res.data))
        .catch(() => setError('Error al cargar los productos'));
    } else {
      setProducts([]);
    }
  }, [selectedCategory]);

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    const category = categories.find(c => c._id === categoryId);
    setCategoryName(category ? category.name : '');
  };

  const handlePercentageChange = (e) => {
    const value = e.target.value.replace(/[^0-9.-]/g, '');
    setPercentage(value);
    
    // Solo mostrar vista previa si hay un número válido (con o sin signo)
    if (value && value !== '-' && !isNaN(Number(value)) && products.length > 0) {
      const percentageValue = Number(value);
      // Solo mostrar vista previa de los productos de la categoría seleccionada
      const previewData = products
        .filter(product => product.categoryId._id === selectedCategory)
        .map(product => ({
          ...product,
          newPrice: Number((product.price * (1 + percentageValue / 100)).toFixed(2))
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
      await api.post('/products/adjust-prices', {
        categoryId: selectedCategory,
        percentage: Number(percentage)
      });
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

            <div className="d-flex gap-2">
              <Button 
                variant="dark" 
                type="submit" 
                disabled={loading || !selectedCategory || !percentage}
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