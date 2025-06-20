// utils/movements.js (crealo donde prefieras)
export const isMulti = m => Array.isArray(m.items) && m.items.length > 0;

/** Devuelve todos los productId involucrados en el movimiento */
export const getProductIds = m =>
  isMulti(m) ? m.items.map(it => String(it.productId))         // venta múltiple
             : m.productId ? [String(m.productId._id)] : [];   // simple
