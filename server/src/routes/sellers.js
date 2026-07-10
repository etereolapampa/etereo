// server/src/routes/sellers.js
import express from 'express';
import Vendedor from '../models/Vendedor.js';
// requireAdmin removido: todos los usuarios autenticados pueden operar
import { logAction } from '../utils/logger.js';
const router = express.Router();

const normalizeOptionalDni = dni => {
  if (typeof dni !== 'string') return undefined;
  const normalized = dni.trim();
  return normalized || undefined;
};

// Listar sellers (por defecto solo activos).
// NOTA: documentos antiguos podrían no tener el campo isDeleted; los incluimos también.
router.get('/', async (req, res) => {
  try {
    const { includeDeleted } = req.query;
    let filter = {};
    if (!includeDeleted) {
      filter = { $or: [ { isDeleted: false }, { isDeleted: { $exists: false } } ] };
    }
    const vendedores = await Vendedor.find(filter).populate('city');
    res.json(vendedores);
  } catch (error) {
    console.error('Error al obtener vendedores:', error);
    res.status(500).json({ error: 'Error al obtener los vendedores' });
  }
});

// Obtener un seller por ID
router.get('/:id', async (req, res) => {
  try {
    const vendedor = await Vendedor.findById(req.params.id).populate('city');
    if (!vendedor) return res.status(404).json({ error: 'Seller no encontrado' });
    res.json(vendedor);
  } catch (error) {
    console.error('Error al obtener vendedor:', error);
    res.status(500).json({ error: 'Error al obtener el vendedor' });
  }
});

// Crear nuevo seller
router.post('/', async (req, res) => {
  try {
    const { name, lastname, dni, city, phone, bonus, email } = req.body;
    const normalizedDni = normalizeOptionalDni(dni);
    if (!name || !lastname || !city || !phone) {
      return res.status(400).json({ error: 'Nombre, apellido, localidad y teléfono son obligatorios' });
    }
    if (normalizedDni && !/^\d+$/.test(normalizedDni)) {
      return res.status(400).json({ error: 'DNI debe ser solo números' });
    }

    const newVendedor = new Vendedor({
      name,
      lastname,
      dni: normalizedDni,
      city,
      phone: Number(phone),
      bonus: Number(bonus) || 0,
      email
    });

    await newVendedor.save();
    await logAction(req, { action: 'create', entity: 'seller', entityId: newVendedor._id, data: req.body });
    res.status(201).json(newVendedor);
  } catch (error) {
    console.error('Error al crear vendedor:', error);
    res.status(500).json({ error: 'Error al crear el vendedor' });
  }
});

// Modificar seller
router.put('/:id', async (req, res) => {
  try {
    const { name, lastname, dni, city, phone, bonus, email } = req.body;
    const normalizedDni = normalizeOptionalDni(dni);
    if (!name || !lastname || !city || !phone) {
      return res.status(400).json({ error: 'Nombre, apellido, localidad y teléfono son obligatorios' });
    }
    if (normalizedDni && !/^\d+$/.test(normalizedDni)) {
      return res.status(400).json({ error: 'DNI debe ser solo números' });
    }

    const before = await Vendedor.findById(req.params.id).lean();
    const baseUpdate = {
      name,
      lastname,
      city,
      phone: Number(phone),
      bonus: Number(bonus) || 0,
      email
    };

    const update = normalizedDni
      ? { $set: { ...baseUpdate, dni: normalizedDni } }
      : { $set: baseUpdate, $unset: { dni: 1 } };

    const vendedor = await Vendedor.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!vendedor) return res.status(404).json({ error: 'Seller no encontrado' });
    await logAction(req, { action: 'update', entity: 'seller', entityId: vendedor._id, data: { before, after: vendedor } });
    res.json(vendedor);
  } catch (error) {
  console.error('Error al actualizar vendedor:', error);
  res.status(500).json({ error: 'Error al actualizar el vendedor' });
}
});

// Soft delete seller
router.delete('/:id', async (req, res) => {
  try {
    const vendedor = await Vendedor.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!vendedor) return res.status(404).json({ error: 'Seller no encontrado' });
    await logAction(req, { action: 'delete', entity: 'seller', entityId: vendedor._id, data: { softDeleted: true } });
    res.json(vendedor);
  } catch (error) {
    console.error('Error al eliminar (soft) vendedor:', error);
    res.status(500).json({ error: 'Error al eliminar el vendedor' });
  }
});

// Restaurar seller eliminado
router.put('/:id/restore', async (req, res) => {
  try {
    const vendedor = await Vendedor.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!vendedor) return res.status(404).json({ error: 'Seller no encontrado' });
    await logAction(req, { action: 'restore', entity: 'seller', entityId: vendedor._id });
    res.json(vendedor);
  } catch (error) {
    console.error('Error al restaurar vendedor:', error);
    res.status(500).json({ error: 'Error al restaurar el vendedor' });
  }
});

export default router;
