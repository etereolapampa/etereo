import { Router } from 'express';
import Usuario from '../models/Usuario.js';
// requireAdmin removido: todos los usuarios autenticados pueden operar
import { logAction } from '../utils/logger.js';

const router = Router();

// Listar usuarios (cualquier usuario autenticado)
router.get('/', async (_req, res) => {
  const users = await Usuario.find({}, { username: 1, name: 1, lastname: 1, admin: 1, lastLogin: 1 }).lean();
  res.json(users.map(u => ({
    id: String(u._id),
    username: u.username,
    name: u.name,
    lastname: u.lastname,
    admin: !!u.admin,
    lastLogin: u.lastLogin || null
  })));
});

// Crear usuario (solo admin)
router.post('/', async (req, res) => {
  const { username, password, name, lastname, admin } = req.body;
  if (!username?.trim() || !password || !name?.trim() || !lastname?.trim()) {
    return res.status(400).json({ error: 'username, password, name y lastname son requeridos' });
  }
  const exists = await Usuario.findOne({ username: username.toLowerCase() });
  if (exists) return res.status(409).json({ error: 'Ya existe ese usuario' });

  const u = await Usuario.create({
    username: username.toLowerCase(),
    password,
    name: name.trim(),
    lastname: lastname.trim(),
    admin: !!admin
  });
  await logAction(req, { action: 'create', entity: 'user', entityId: u._id, data: { username: u.username, admin: !!u.admin } });
  res.status(201).json({
    id: String(u._id),
    username: u.username,
    name: u.name,
    lastname: u.lastname,
    admin: !!u.admin
  });
});

// Editar usuario (solo admin)
router.put('/:id', async (req, res) => {
  const { username, name, lastname, admin, password } = req.body;
  const update = {};
  if (username) update.username = username.toLowerCase();
  if (name) update.name = name.trim();
  if (lastname) update.lastname = lastname.trim();
  if (typeof admin === 'boolean') update.admin = admin;
  const user = await Usuario.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (username && username.toLowerCase() !== user.username) {
    const exists = await Usuario.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Ya existe ese usuario' });
  }
  // Si cambia password, usar hook de save
  if (password) user.password = password;
  Object.assign(user, update);
  await user.save();
  await logAction(req, { action: 'update', entity: 'user', entityId: user._id, data: { ...update, username: user.username } });
  res.json({
    id: String(user._id),
    username: user.username,
    name: user.name,
    lastname: user.lastname,
    admin: !!user.admin
  });
});

// Borrar usuario (solo admin)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (req.user.id === id) return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });

  const u = await Usuario.findById(id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Evitar dejar el sistema sin administradores
  if (u.admin) {
    const admins = await Usuario.countDocuments({ admin: true, _id: { $ne: id } });
    if (admins === 0) return res.status(400).json({ error: 'Debe quedar al menos un administrador' });
  }

  await Usuario.findByIdAndDelete(id);
  await logAction(req, { action: 'delete', entity: 'user', entityId: id });
  res.json({ message: 'Usuario eliminado' });
});

export default router;
