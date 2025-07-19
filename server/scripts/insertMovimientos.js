#!/usr/bin/env node
/**
 * Inserta movimientos de venta.
 * – Busca la vendedora en Vendedor (campos `name` y `lastname`, minúsculas)
 * – Busca el producto en Producto (campo `name`)
 * – Si ambos existen, crea el Movimiento
 *
 *  Para lanzar:
 *    node ./scripts/insertMovimientos.js
 */

import mongoose from 'mongoose';
import dotenv    from 'dotenv';
dotenv.config();

// ───── models (ajusta la ruta si hace falta) ─────
import Vendedor   from '../src/models/Vendedor.js';
import Producto   from '../src/models/Producto.js';
import Movimiento from '../src/models/Movimiento.js';

// ───── 1) conexión ─────
await mongoose.connect(process.env.MONGODB_URI)
              .then(() => console.log('🚀  Conectado a MongoDB'))
              .catch(err => { console.error('❌  No se pudo conectar:', err); process.exit(1); });

/* ───── 2) registros de ejemplo ─────
   Copia aquí el resto de las filas cuando quieras cargarlas.
*/
const rows = [
  {
    fecha: '2025-04-04',
    sucursal: 'Macachín',
    vendedora: 'Adriana Rolando',
    producto: 'AROMATIZANTE - MULTIUSO    GENERICO',
    cantidad: 3,
    precioUnitario: 5000,
    totalLinea: 15000,
    totalVenta: 256500,
  },
  {
    fecha: '2025-01-31',
    sucursal: 'Macachín',
    vendedora: 'Adriana Rolando',
    producto: 'DIFUSOR - Env Plástico 115ml    GENERICO',
    cantidad: 15,
    precioUnitario: 11000,
    totalLinea: 165000,
    totalVenta: 256500,
  },
  {
    fecha: '2025-05-31',
    sucursal: 'Macachín',
    vendedora: 'Agustina Yazmin Sandobal',
    producto: 'DIFUSOR - Env Plástico 115ml    GENERICO',
    cantidad: 25,
    precioUnitario: 11000,
    totalLinea: 275000,
    totalVenta: 580740,
  },
  {
    fecha: '2025-03-31',
    sucursal: 'Macachín',
    vendedora: 'Consumidor Final Santa Rosa',
    producto: 'SANITIZANTE  - Jabón Liquido    GENERICO',
    cantidad: 1,
    precioUnitario: 3540,
    totalLinea: 3540,
    totalVenta: 3540,
  },
  {
    fecha: '2025-04-30',
    sucursal: 'Macachín',
    vendedora: 'Iris Poullion',
    producto: 'DIFUSOR - Env Labrado 100ml    GENERICO',
    cantidad: 1,
    precioUnitario: 13500,
    totalLinea: 13500,
    totalVenta: 204970,
  },
];

/* ───── 3) helpers ───── */
const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')               // quita tildes
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Dado "Nombre Apellido Apellido2"
 *   -> { name: 'Nombre', lastname: 'Apellido Apellido2' }
 */
const splitFullname = (full) => {
  const parts = full.trim().split(' ');
  return {
    name: parts.shift(),           // primer token
    lastname: parts.join(' '),     // resto
  };
};

/* ───── 4) loop de inserción ───── */
let ok = 0,
  errores = 0;

for (const r of rows) {
  // — Buscar vendedora
  const { name, lastname } = splitFullname(r.vendedora);

  const vendedor = await Vendedor.findOne({
    name: normalize(name),
    lastname: normalize(lastname),
  });

  if (!vendedor) {
    console.warn(`⚠️  Vendedora NO encontrada → ${r.vendedora}`);
    errores++;
    continue;
  }

  // — Buscar producto
  const producto = await Producto.findOne({ name: r.producto });
  if (!producto) {
    console.warn(`⚠️  Producto NO encontrado → ${r.producto}`);
    errores++;
    continue;
  }

  // — Insertar movimiento
  await Movimiento.create({
    fecha: new Date(r.fecha),
    sucursal: r.sucursal,
    vendedor: vendedor._id,
    producto: producto._id,
    cantidad: r.cantidad,
    precioUnitario: r.precioUnitario,
    totalLinea: r.totalLinea,
    totalVenta: r.totalVenta,
  });

  console.log(`✓  Insertado → ${r.vendedora} | ${r.producto}`);
  ok++;
}

console.log(`\n⏹  Resumen → guardados: ${ok} | con problemas: ${errores}`);
await mongoose.disconnect();
