// server/src/utils/date.js
/**
 * Parsea una fecha 'YYYY-MM-DD' y devuelve un objeto Date
 * apuntando a la medianoche de Argentina (UTC-3).
 *
 * Ej.: '2025-06-11'  →  Wed Jun 11 2025 03:00:00 GMT+0000
 */
export function parseDateAR (dateString = '') {
  const [y, m, d] = dateString.split('-').map(Number);
  // midnight en Argentina = 03:00 UTC
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
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
