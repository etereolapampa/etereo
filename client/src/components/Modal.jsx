import React from 'react';
import { Modal as BootstrapModal, Button } from 'react-bootstrap';

export default function Modal({ show, message, onClose }) {
  return (
    <BootstrapModal show={show} onHide={onClose} centered>
      <BootstrapModal.Header closeButton>
        <BootstrapModal.Title>Confirmación</BootstrapModal.Title>
      </BootstrapModal.Header>
      <BootstrapModal.Body>{message}</BootstrapModal.Body>
      <BootstrapModal.Footer>
        <Button variant="dark" onClick={onClose}>
          Cerrar
        </Button>
      </BootstrapModal.Footer>
    </BootstrapModal>
  );
} 