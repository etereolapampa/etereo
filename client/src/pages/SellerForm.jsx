// src/pages/SellerForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import { useLocalidades } from '../hooks/useStaticData';

export default function SellerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { localidades, loading: loadingLocalidades, error: errorLocalidades } = useLocalidades();
  const [form, setForm] = useState({
    name: '',
    lastname: '',
    dni: '',
    city: '',
    phone: '',
    bonus: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Cargar vendedor si estamos en modo edición
  useEffect(() => {
    if (id && !loadingLocalidades) {
      const fetchSeller = async () => {
        try {
          const response = await api.get(`/sellers/${id}`);
          const vendedorData = response.data;
          setForm(vendedorData);

          // Si el vendedor tiene una localidad, buscar su nombre
          if (vendedorData.city && localidades.localidades.length > 0) {
            const localidadEncontrada = localidades.localidades.find(loc => loc._id === vendedorData.city._id);
            if (localidadEncontrada) {
              setCityInput(localidadEncontrada.name);
            }
          }
        } catch (error) {
          console.error('Error:', error);
          setError('Error al cargar el vendedor');
        }
      };
      fetchSeller();
    }
  }, [id, loadingLocalidades, localidades.localidades]);

  const handleChange = key => e => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'city') {
      setCityInput(value);
      if (value.trim() === '') {
        setSuggestions([]);
        setShowSuggestions(false);
      } else {
        const filtered = (localidades.localidades || [])
          .filter(loc => loc.name.toLowerCase().includes(value.toLowerCase()));
        setSuggestions(filtered);
        setShowSuggestions(true);
      }
    }
  };

  const handleBonusChange = e => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(value) || 0;

    if (numValue > 100) {
      setError('Ingrese una bonificación válida (máximo 100%)');
      return;
    }

    setError('');
    setForm(prev => ({ ...prev, bonus: value }));
  };

  const handleSuggestionClick = (suggestion) => {
    setForm(prev => ({ ...prev, city: suggestion._id }));
    setCityInput(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const { name, lastname, dni, city, phone, bonus } = form;
    if (!name.trim() || !lastname.trim()) {
      setError('Nombre y Apellido son obligatorios');
      return;
    }
    if (!/^\d+$/.test(dni)) {
      setError('DNI debe ser solo números');
      return;
    }
    if (!localidades.localidades.some(loc => loc._id === city)) {
      setError('Localidad inválida');
      return;
    }
    if (!/^\d+$/.test(phone)) {
      setError('Teléfono debe ser solo números');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)){
      setError('Correo inválido');
      return;
    }
    try {
      if (id) {
        await api.put(`/sellers/${id}`, form);
        setModalMessage('Vendedor modificado satisfactoriamente');
      } else {
        await api.post('/sellers', form);
        setModalMessage('Vendedor creado satisfactoriamente');
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

  if (loadingLocalidades) {
    return <div>Cargando localidades...</div>;
  }

  if (errorLocalidades) {
    return <div className="alert alert-danger">{errorLocalidades}</div>;
  }

  return (
    <>
      <h2>{id ? 'Modificar Vendedor' : 'Crear Vendedor'}</h2>
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
            value={form.name}
            onChange={handleChange('name')}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Apellido</label>
          <input
            className="form-control"
            style={{
              maxWidth: '350px',
              width: '100%'
            }}
            value={form.lastname}
            onChange={handleChange('lastname')}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">DNI</label>
          <input
            className="form-control"
            style={{
              maxWidth: '350px',
              width: '100%'
            }}
            value={form.dni}
            onChange={handleChange('dni')}
            required
            pattern="[0-9]*"
            inputMode="numeric"
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Localidad</label>
          <input
            className="form-control"
            style={{
              maxWidth: '350px',
              width: '100%'
            }}
            value={cityInput}
            onChange={handleChange('city')}
            required
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="list-group"
              style={{
                position: 'absolute',
                zIndex: 1000,
                maxWidth: '350px',
                width: '100%',
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="list-group-item list-group-item-action"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Teléfono</label>
          <input
            className="form-control"
            style={{
              maxWidth: '350px',
              width: '100%'
            }}
            value={form.phone}
            onChange={handleChange('phone')}
            required
            pattern="[0-9]*"
            inputMode="numeric"
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Bonificación (%)</label>
          <input
            className="form-control"
            style={{
              maxWidth: '350px',
              width: '100%'
            }}
            value={form.bonus}
            onChange={handleBonusChange}
            pattern="[0-9]*"
            inputMode="numeric"
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Correo</label>
          <input
            type="email"
            className="form-control"
            style={{ maxWidth: '350px', width: '100%' }}
            value={form.email}
            onChange={handleChange('email')}
            placeholder="ejemplo@correo.com"
          />
        </div>


        <button type="submit" className="btn btn-dark">
          {id ? 'Modificar' : 'Guardar'}
        </button>
        <Link to="/datos" className="btn btn-secondary ms-2">
          Cancelar
        </Link>
      </form>
      <Modal
        show={showModal}
        onClose={handleModalClose}
        title="Éxito"
        message={modalMessage}
      />
    </>
  );
}
