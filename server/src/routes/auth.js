import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import verifyToken from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await Usuario.findOne({ username: username?.toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña inválidos' });

  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ error: 'Usuario o contraseña inválidos' });

  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token });
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
  res.json({ message: 'Contraseña actualizada' });
});

export default router;
