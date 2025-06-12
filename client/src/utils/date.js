// utils/date.js
/**
 * Devuelve hoy en formato YYYY-MM-DD (estilo <input type="date">)
 * usando siempre la zona horaria de Argentina.
 */
export function todayAR() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires', // garantiza la zona
  });                                           // sv-SE = “yyyy-MM-dd”
}

/**
 * Convierte cualquier ISO/Date a DD/MM/YYYY en horario argentino.
 */
export function formatDateAR(iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}


