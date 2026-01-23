// client/src/pages/Localities.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  Container, Row, Col, Card, ListGroup,
  Button, Form, Table
} from 'react-bootstrap';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';

// ───── Iconito ▲ / ▼ reutilizable
const SortIcon = ({ active, order }) =>
  active ? (order === 'asc' ? ' ▲' : ' ▼') : null;


export default function Localities() {
  const nav = useNavigate();
  const location = useLocation();
  // Todas las acciones habilitadas para cualquier usuario autenticado

  /* ───────── state ───────── */
  const [localities, setLocalities] = useState([]);
  const [provFilter, setProvFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ───────── load ───────── */
  useEffect(() => {
    api.get('/localities')
       .then(r => setLocalities(r.data))
       .catch(() => setError('Error al cargar localidades'))
       .finally(() => setLoading(false));
  }, [location.key]);

  /* ───────── filtros + orden ───────── */

  /* 🔸 estado de ordenamiento */
  const [sort, setSort] = useState({ field: 'name', order: 'asc' });

  const handleSort = field =>
    setSort(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));

  /* lista filtrada **y** ordenada */
  const filtered = useMemo(() => {
    // 1) aplicamos filtros
    const base = localities.filter(l =>
      (l.province || '')
        .toLowerCase()
        .includes(provFilter.toLowerCase()) &&
      (l.name || '')
        .toLowerCase()
        .includes(nameFilter.toLowerCase())
    );

    // 2) aplicamos orden
    const getValue = loc =>
      sort.field === 'province' ? (loc.province || '') : (loc.name || '');

    return [...base].sort((a, b) => {
      const A = getValue(a).toLowerCase();
      const B = getValue(b).toLowerCase();
      if (A < B) return sort.order === 'asc' ? -1 : 1;
      if (A > B) return sort.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [localities, provFilter, nameFilter, sort]);

  /* ───────── UI ───────── */
  if (loading)  return <div>Cargando…</div>;
  if (error)    return <div className="alert alert-danger">{error}</div>;

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Localidades</h2>

      {/* Botón Alta */}
      <div className="mb-3">
        <Link to="/localities/new" className="btn btn-dark">
          Crear Localidad
        </Link>
      </div>

      {/* Filtros */}
      <Form className="mb-4">
        <Row className="g-2">
          <Col md={4}>
            <Form.Control
              placeholder="Filtrar Provincia…"
              value={provFilter}
              onChange={e => setProvFilter(e.target.value)}
            />
          </Col>
          <Col md={4}>
            <Form.Control
              placeholder="Filtrar Localidad…"
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
            />
          </Col>
        </Row>
      </Form>

      {/* Tabla */}
      <Table striped hover>
        <thead>
          <tr>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('province')}
            >
              Provincia
              <SortIcon active={sort.field === 'province'} order={sort.order} />
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('name')}
            >
              Localidad
              <SortIcon active={sort.field === 'name'} order={sort.order} />
            </th>
            <th style={{ width: 110 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(l => (
            <tr key={l._id}>
              <td>{l.province || '—'}</td>
              <td>{l.name     || '—'}</td>
              <td>
                <div className="d-flex gap-1">
                  <Button
                    size="sm" variant="outline-primary"
                    onClick={() => nav(`/localities/${l._id}/edit`)}
                  >
                    ✏️
                  </Button>
                  <Button
                    size="sm" variant="outline-danger"
                    onClick={() => nav(`/localities/${l._id}/delete`)}
                  >
                    🗑️
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
