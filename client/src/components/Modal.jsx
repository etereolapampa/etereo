// client/src/components/Modal.jsx
import React from 'react';
import { Modal as BsModal, Button } from 'react-bootstrap';

/* ───────── Modal genérico reutilizable ───────── */
export default function Modal({ show, onClose, message, children }) {
  return (
    <BsModal show={show} onHide={onClose} centered>
      <BsModal.Header closeButton>
        <BsModal.Title>Confirmación</BsModal.Title>
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
