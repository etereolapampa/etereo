import { useState, useEffect } from 'react';
import api from '../api';

export function useSucursales() {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Sucursales hardcodeadas
    const sucursalesHardcodeadas = [
      { id: 1, nombre: 'Santa Rosa' },
      { id: 2, nombre: 'Macachín' }
    ];
    
    setSucursales(sucursalesHardcodeadas);
    setLoading(false);
  }, []);

  return { sucursales, loading, error };
}

export function useLocalidades() {
  const [localidades, setLocalidades] = useState({ localidades: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocalidades = async () => {
      try {
        const { data } = await api.get('/data/localidades');
        setLocalidades(data);
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