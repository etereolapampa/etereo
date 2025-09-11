// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});


// Interceptor para agregar JWT en cada request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor para manejar errores de respuesta (token expirado)
api.interceptors.response.use(
  response => response, // Si la respuesta es exitosa, pasarla tal como está
  error => {
    // Si el token expiró o es inválido (401 o 403)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Limpiar token del localStorage
      localStorage.removeItem('token');
      
      // Redirigir al login
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
