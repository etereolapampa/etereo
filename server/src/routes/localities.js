import express from 'express';
import Localidad, { PROVINCIAS } from '../models/Localidad.js';
// requireAdmin removido: todos los usuarios autenticados pueden operar
import { logAction } from '../utils/logger.js';

const router = express.Router();

/* --- listar --- */
router.get('/', async (_req, res) => {
  const locs = await Localidad.find().sort({ province: 1, name: 1 });
  res.json(locs);
});

/* --- una --- */
router.get('/:id', async (req, res) => {
  const loc = await Localidad.findById(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Localidad no encontrada' });
  res.json(loc);
});

/* --- crear --- */
router.post('/', async (req, res) => {
  const { name, province } = req.body;
  if (!name || !province) return res.status(400).json({ error: 'Faltan datos' });
  if (!PROVINCIAS.includes(province))
    return res.status(400).json({ error: 'Provincia inválida' });

  const loc = await Localidad.create({ name, province });
  await logAction(req, { action: 'create', entity: 'locality', entityId: loc._id, data: { name, province } });
  res.status(201).json(loc);
});

/* --- editar --- */
router.put('/:id', async (req, res) => {
  const { name, province } = req.body;
  if (!name || !province) return res.status(400).json({ error: 'Faltan datos' });
  const before = await Localidad.findById(req.params.id).lean();
  const loc = await Localidad.findByIdAndUpdate(
    req.params.id,
    { name, province },
    { new: true }
  );
  if (!loc) return res.status(404).json({ error: 'Localidad no encontrada' });
  await logAction(req, { action: 'update', entity: 'locality', entityId: loc._id, data: { before, after: loc } });
  res.json(loc);
});

/* --- borrar --- */
router.delete('/:id', async (req, res) => {
  const loc = await Localidad.findByIdAndDelete(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Localidad no encontrada' });
  await logAction(req, { action: 'delete', entity: 'locality', entityId: loc._id, data: { deleted: loc } });
  res.json(loc);
});

export default router;
