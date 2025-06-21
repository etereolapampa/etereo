import React, { useState, useEffect } from 'react';
import { Container, Button, Card } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import { formatDateAR } from '../utils/date.js';


export default function MovementDelete() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movement, setMovement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const fetchMovement = async () => {
      try {
        const response = await api.get(`/stock/movements/${id}`);
        setMovement(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar el movimiento');
        setLoading(false);
      }
    };

    fetchMovement();
  }, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/stock/movements/${id}`);
      setModalMessage('Movimiento eliminado exitosamente');
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar el movimiento');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    navigate('/movements');
  };

  const formatDate = formatDateAR;


  if (loading) return <div>Cargando...</div>;
  if (error) return <div className="text-danger">{error}</div>;
  if (!movement) return <div>Movimiento no encontrado</div>;

  const getMovementType = (type, origin, destination, sellerId) => {
    if (type === 'add') return 'Carga';
    if (type === 'transfer') return 'Mudanza';
    if (type === 'remove' && sellerId) return 'Venta';
    return 'Faltante';
  };

  // helper: ¿es venta múltiple?
  const isMulti = m => Array.isArray(m.items) && m.items.length > 0;

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Eliminar Movimiento</h2>
      <Card className="mb-4" border="0">
        <Card.Body className="ps-0">
          <Card.Title className="mb-4">¿Estás seguro que deseas eliminar el siguiente movimiento?</Card.Title>
          <Card.Text className="mb-4">
            <strong>Fecha:</strong> {formatDate(movement.date)}<br />
            <strong>Tipo:</strong> {getMovementType(movement.type, movement.origin, movement.destination, movement.sellerId)}<br />
            {isMulti(movement) ? (
              <>
                <strong>Productos:</strong>
                <ul className="mt-2">
                  {movement.items.map(it => (
                    <li key={it._id}>
                      {it.productId?.name || 'Producto eliminado'} — Cant: {it.quantity}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <strong>Producto:</strong> {movement.product?.name || '—'}<br />
                <strong>Cantidad:</strong> {movement.quantity}<br />
              </>
            )}
            <strong>Sucursal:</strong> {movement.branch || movement.origin}<br />
            {movement.destination && <><strong>Destino:</strong> {movement.destination}<br /></>}
            {movement.seller && <><strong>Vendedor:</strong> {movement.seller.name} {movement.seller.lastname}<br /></>}
            {movement.observations && <><strong>Observaciones:</strong> {movement.observations}</>}
          </Card.Text>
          <div className="d-flex gap-2">
            <Button variant="danger" onClick={handleDelete}>
              Eliminar
            </Button>
            <Button variant="secondary" onClick={() => navigate('/movements')}>
              Cancelar
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Modal
        show={showModal}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </Container>
  );
} 