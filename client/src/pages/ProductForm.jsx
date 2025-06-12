// src/pages/ProductForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';

export default function ProductForm() {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => setError('No se pudieron cargar las categorías'));
    const preCat = searchParams.get('categoryId');
    if (preCat) setCategoryId(preCat);
    if (isEdit) {
      api.get(`/products/${id}`)
        .then(({ data }) => {
          setName(data.name);
          setCategoryId(data.categoryId);
          setPrice(data.price || '');
        })
        .catch(() => setError('No se pudo cargar el producto'));
    }
  }, [id, isEdit, searchParams]);

  const handlePriceChange = e => {
    // Solo permitir números y un punto decimal
    const value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Evitar múltiples puntos decimales
    const parts = value.split('.');
    if (parts.length > 2) return;
    
    // Limitar a 2 decimales
    if (parts[1] && parts[1].length > 2) return;
    
    setPrice(value);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('El nombre es obligatorio');
    if (!categoryId) return setError('La categoría es obligatoria');
    if (!price) return setError('El precio es obligatorio');
    try {
      const payload = { 
        name, 
        categoryId,
        price: Number(price)
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        setModalMessage('Producto modificado satisfactoriamente');
      } else {
        await api.post('/products', payload);
        setModalMessage('Producto creado satisfactoriamente');
      }
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    navigate('/datos');
  };

  return (
    <>
      <h2>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <br />
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre</label>
          <input
            className="form-control"
            style={{
              maxWidth: '350px',
              width: '100%'
            }}
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Categoría</label>
          <select
            className="form-select"
            style={{
              maxWidth: '350px',
              width: '100%'
            }}
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            required
          >
            <option value="" disabled>Seleccione</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Precio</label>
          <div style={{ position: 'relative', maxWidth: '350px', width: '100%' }}>
            <input
              className="form-control"
              style={{
                paddingLeft: '25px'
              }}
              value={price}
              onChange={handlePriceChange}
              placeholder="0.00"
              required
            />
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
          </div>
        </div>
        <br />
        <button type="submit" className="btn btn-dark me-2">Guardar</button>
        <Link to="/datos" className="btn btn-secondary">Cancelar</Link>
      </form>

      <Modal 
        show={showModal}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </>
  );
}
