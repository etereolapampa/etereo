// LocalityForm.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Form, Button, Alert } from 'react-bootstrap';
import api from '../api';
import { PROVINCIAS } from '../utils/provinces';
import Modal from '../components/Modal';

export default function LocalityForm() {
  const nav          = useNavigate();
  const { id }       = useParams();
  const isEdit       = Boolean(id);

  /* ---------- estado ---------- */
  const [province, setProvince]       = useState('');
  const [provInput, setProvInput]     = useState('');
  const [name, setName]               = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug]         = useState(false);

  const [error, setError]             = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [modalMsg, setModalMsg]       = useState('');

  /* ---------- cargar si edit ---------- */
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/localities/${id}`)
       .then(({data})=>{
          setProvince(data.province);
          setProvInput(data.province);
          setName(data.name);
       })
       .catch(()=> setError('No se pudo cargar la localidad'));
  }, [id, isEdit]);

  /* ---------- helpers ---------- */
  const filterProv = q =>
    PROVINCIAS.filter(p => p.toLowerCase().includes(q.toLowerCase()));

  const handleProvChange = v => {
    setProvInput(v);
    const sugg = v.trim() ? filterProv(v) : [];
    setSuggestions(sugg);
    setShowSug(!!sugg.length);
    if (PROVINCIAS.includes(v)) setProvince(v);
    else setProvince('');
  };

  const chooseProv = p => {
    setProvInput(p);
    setProvince(p);
    setSuggestions([]);
    setShowSug(false);
  };

  /* ---------- submit ---------- */
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!province) return setError('Provincia inválida');
    if (!name.trim()) return setError('El nombre es obligatorio');

    try{
      if (isEdit) {
        await api.put(`/localities/${id}`, { name, province });
        setModalMsg('Localidad modificada satisfactoriamente');
      } else {
        await api.post('/localities', { name, province });
        setModalMsg('Localidad creada satisfactoriamente');
      }
      setShowModal(true);
    }catch(err){
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    nav('/localities');
  };

  /* ---------- UI ---------- */
  return (
    <>
      <h2>{isEdit ? 'Editar Localidad' : 'Nueva Localidad'}</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <br/>

      <Form onSubmit={handleSubmit} autoComplete="off">
        {/* Provincia con autocompletado */}
        <Form.Group className="mb-3" style={{ maxWidth: 350, position:'relative' }}>
          <Form.Label>Provincia</Form.Label>
          <Form.Control
            value={provInput}
            onChange={e => handleProvChange(e.target.value)}
            required
            placeholder="Ej.: La Pampa"
          />
          {showSug && (
            <div className="list-group position-absolute w-100"
                 style={{ zIndex:2000, maxHeight:200, overflowY:'auto' }}>
              {suggestions.map(p=>(
                <button key={p} type="button"
                        className="list-group-item list-group-item-action"
                        onClick={()=>chooseProv(p)}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </Form.Group>

        {/* Nombre localidad */}
        <Form.Group className="mb-4" style={{ maxWidth: 350 }}>
          <Form.Label>Nombre</Form.Label>
          <Form.Control
            value={name}
            onChange={e=>setName(e.target.value)}
            required
            placeholder="Ej.: Santa Rosa"
          />
        </Form.Group>

        <Button type="submit" variant="dark" className="me-2">
          Guardar
        </Button>
        <Link to="/localities" className="btn btn-secondary">Cancelar</Link>
      </Form>

      <Modal
        show={showModal}
        message={modalMsg}
        onClose={closeModal}
      />
    </>
  );
}
