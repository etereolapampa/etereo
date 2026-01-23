import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import verifyToken from '../middleware/auth.js';
import { logAction } from '../utils/logger.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await Usuario.findOne({ username: username?.toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña inválidos' });

  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ error: 'Usuario o contraseña inválidos' });

  // Bootstrap: si no hay ningún admin aún, promover a este usuario
  const adminCount = await Usuario.countDocuments({ admin: true });
  if (adminCount === 0 && !user.admin) {
    await Usuario.findByIdAndUpdate(user._id, { admin: true });
    user.admin = true;
  }

  await Usuario.findByIdAndUpdate(user._id, { lastLogin: new Date() });

  // Generar token JWT
  const payload = {
    id: String(user._id),
    username: user.username,
    name: user.name || user.username,
    lastname: user.lastname || '',
    admin: !!user.admin
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m' });
  await logAction(req, { action: 'login', entity: 'user', entityId: user._id, data: { username: user.username } });
  res.json({ token, user: payload });
});

// Cambiar username
router.patch('/me/username', verifyToken, async (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username requerido' });

  const exists = await Usuario.findOne({ username: username.toLowerCase() });
  if (exists && String(exists._id) !== req.user.id)
    return res.status(409).json({ error: 'Ya existe ese usuario' });

  const user = await Usuario.findByIdAndUpdate(
    req.user.id,
    { username: username.toLowerCase() },
    { new: true }
  );
  res.json({ message: 'Usuario actualizado', user: { username: user.username } });
});

// Cambiar contraseña
router.patch('/me/password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Faltan campos' });

  const user = await Usuario.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const ok = await user.comparePassword(currentPassword);
  if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

  user.password = newPassword; // el hook la hashea
  await user.save();
  await logAction(req, { action: 'password-change', entity: 'user', entityId: user._id });
  res.json({ message: 'Contraseña actualizada' });
});

// Devolver usuario actual
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const out = {
      id: String(user._id),
      username: user.username,
      name: user.name || user.username,
      lastname: user.lastname || '',
      admin: !!user.admin,
      lastLogin: user.lastLogin || null
    };
    res.json({ user: out });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
});

export default router;
