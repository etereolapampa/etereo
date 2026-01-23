export default function requireAdmin(req, res, next) {
  if (!req.user || !req.user.admin) {
    return res.status(403).json({ error: 'Requiere permisos de administrador' });
  }
  next();
}
