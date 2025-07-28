// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      nav('/');
    } catch (err) {
      console.error('Error completo:', err);
      console.error('Respuesta del servidor:', err.response?.data);
      setError(err.response?.data?.error || 'Error de conexión');
    }
  };

  return (
    <div className="vh-100 d-flex justify-content-center align-items-center bg-light" style={{display: 'flex', flexDirection: 'column'}}>
      <div className="card shadow-sm" style={{ width: '380px' }}>
        <div className="card-body">
          <h2 className="card-title text-center mb-4">Iniciar sesión</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <input
                className="form-control"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Contraseña</label>
              <input
                className="form-control"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-dark w-100">
              Entrar
            </button>
            <br />
            <br />
          </form>

        </div>

      </div>
      <div className="text-center small text-muted">
        <br />
        <br />        
        <a href="https://www.instagram.com/enssoldig/" style={{ textDecoration: 'none', color: 'unset' }}>© Desarrollado por ENS Soluciones Digitales</a>
      </div>
    </div>
  );
}
