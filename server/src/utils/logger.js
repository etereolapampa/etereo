import Log from '../models/Log.js';

function redact(obj) {
  try {
    if (!obj || typeof obj !== 'object') return obj;
    const visit = v => {
      if (Array.isArray(v)) return v.map(visit);
      if (v && typeof v === 'object') {
        const out = {};
        for (const [k, val] of Object.entries(v)) {
          if (['password', 'newPassword', 'currentPassword'].includes(k)) {
            out[k] = '[REDACTED]';
          } else {
            out[k] = visit(val);
          }
        }
        return out;
      }
      return v;
    };
    return visit(obj);
  } catch {
    return undefined;
  }
}

export async function logAction(req, { action, entity, entityId, data }) {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString();
    const user = req.user || {};
    await Log.create({
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      user: {
        id: user.id || user.userId || undefined,
        username: user.username,
        name: user.name,
        lastname: user.lastname,
        admin: !!user.admin
      },
      ip,
      data: redact(data)
    });
  } catch (err) {
    // No romper el flujo si falla el log
    console.error('LogAction error:', err?.message || err);
  }
}
