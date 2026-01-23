// src/components/AdminRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!user?.admin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
