// client/src/components/Modal.jsx
import React from 'react';
import { Modal as BsModal, Button } from 'react-bootstrap';

/* ───────── Modal genérico reutilizable ───────── */
export default function Modal({ show, onClose, message, children, variant = 'primary' }) {
  const getTitle = () => {
    switch (variant) {
      case 'danger':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      case 'success':
        return 'Éxito';
      default:
        return 'Confirmación';
    }
  };

  const getHeaderClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-danger text-white';
      case 'warning':
        return 'bg-warning text-dark';
      case 'success':
        return 'bg-success text-white';
      default:
        return '';
    }
  };

  return (
    <BsModal show={show} onHide={onClose} centered>
      <BsModal.Header closeButton className={getHeaderClass()}>
        <BsModal.Title>{getTitle()}</BsModal.Title>
      </BsModal.Header>

      <BsModal.Body>{message}</BsModal.Body>

      <BsModal.Footer className="gap-2">
        {/* ⬇️  cualquier cosa que pasemos como <Modal>…aquí…</Modal> */}
        {children}
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </BsModal.Footer>
    </BsModal>
  );
}
