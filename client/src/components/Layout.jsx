// src/components/Layout.jsx
import React from 'react';
import { Nav } from 'react-bootstrap';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const handleLogout = () => {
    // Limpiar todo el estado de la sesión
    localStorage.clear();
    // Limpiar cualquier estado en memoria
    sessionStorage.clear();
    // Forzar una recarga completa de la página
    window.location.replace('/login');
  };

  // Detectar ruta para decidir si la vista debe ser full-width
  const location = useLocation();
  const fullWidthPaths = ['/movements']; // se pueden agregar más rutas si hace falta
  const isFullWidthPage = fullWidthPaths.some(p => location.pathname.startsWith(p));

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <NavLink className="navbar-brand" to="/datos">Etereo</NavLink>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {[
                { to: '/datos', label: 'Datos' },
                { to: '/stock', label: 'Stock' },
                { to: '/movements', label: 'Movimientos' },
                { to: '/stats', label: 'Estadísticas' },
              ].map(item => (
                <li className="nav-item" key={item.to}>
                  <NavLink className="nav-link" to={item.to}>{item.label}</NavLink>
                </li>
              ))}
              <li className="nav-item">
                <span className="nav-link" style={{ cursor: 'pointer' }} onClick={handleLogout}>Cerrar sesión</span>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <div className={`${isFullWidthPage ? 'container-fluid px-3' : 'container'} my-4`}>
        <Outlet />
      </div>
    </>
  );
}
