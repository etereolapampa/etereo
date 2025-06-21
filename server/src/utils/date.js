// server/src/utils/date.js
/**
 * Parsea una fecha 'YYYY-MM-DD' y devuelve un objeto Date
 * apuntando a la medianoche de Argentina (UTC-3).
 *
 * Ej.: '2025-06-11'  →  Wed Jun 11 2025 03:00:00 GMT+0000
 */
export function parseDateAR (iso) {
  // admite "YYYY-MM-DD"  →  genera 00:00 hs en horario ARG (UTC-3)
  if (!iso?.match(/^\d{4}-\d{2}-\d{2}$/)) return new Date(iso); // fallback
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0)); // 00 hs AR = 03 UTC
}

/* helpers opcionales – no indispensables para el back  */
export function todayAR () {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires', // yyyy-MM-dd
  });
}

export function formatDateAR (iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}
