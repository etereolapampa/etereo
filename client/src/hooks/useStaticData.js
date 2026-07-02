import { useState, useEffect } from 'react';
import api from '../api';
import { SUCURSALES } from '../constants/branches';

export function useSucursales() {
  return { sucursales: SUCURSALES, loading: false, error: null };
}

export function useLocalidades() {
  const [localidades, setLocalidades] = useState({ localidades: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocalidades = async () => {
      try {
        const data = await api.get('/localities');   // ⬅️  NUEVA ruta
        setLocalidades({ localidades: data.data });      
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar localidades');
      } finally {
        setLoading(false);
      }
    };

    fetchLocalidades();
  }, []);

  return { localidades, loading, error };
} 