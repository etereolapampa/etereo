#!/usr/bin/env node
/**
 * Inserta movimientos uno a uno con control de errores.
 * -----------------------------------------------------
 * – Normaliza nombres y hace las búsquedas case–insensitive.
 * – Continúa aunque una fila falle (try/catch por movimiento).
 *
 * Rellena el array `rows` con todas las filas que necesites.
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
dotenv.config();

import Producto   from '../src/models/Producto.js';
import Vendedor   from '../src/models/Vendedor.js';
import Movimiento from '../src/models/Movimiento.js';

/* ───────── helpers robustos ───────── */
const norm = s => s.replace(/\s+/g, ' ').trim();                        // quita duplicados de espacios
const esc  = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');             // escapa regex

const getProductId = async rawName => {
  const name = norm(rawName);                                           // “AROMA MULTIUSO GENERICO”
  const prod = await Producto.findOne({ name: new RegExp(`^${esc(name)}$`, 'i') });
  if (!prod) throw new Error(`Producto no encontrado → “${rawName}”`);
  return prod._id;
};

const getSellerId = async rawFullname => {
  if (/consumidor final/i.test(rawFullname)) return null;               // venta a cliente final
  const fullname = norm(rawFullname).toLowerCase();                     // “andrea alvarez”
  const [name, ...rest] = fullname.split(' ');
  const vend = await Vendedor.findOne({ name, lastname: rest.join(' ') });
  if (!vend) throw new Error(`Vendedora no encontrada → “${rawFullname}”`);
  return vend._id;
};

/* ───────── datos de los movimientos ─────────
   Añade todas las filas que quieras:                     */
const rows = [
  // ────────────  EJEMPLOS ────────────
  {product: 'AROMATIZANTE - MULTIUSO    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-04',price:5000,total:15000,seller: 'Adriana Rolando'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-01-31',price:5000,total:15000,seller: 'Adriana Rolando'},
{product: 'DIFUSOR - Env Plástico 115ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Adriana Rolando'},
{product: 'RINCON - Sahumerios    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Adriana Rolando'},
{product: 'TEXTIL - Sin gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Adriana Rolando'},
{product: 'TEXTIL - Sin gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-05-31',price:5000,total:15000,seller: 'Adriana Rolando'},
{product: 'AROMATIZANTE - MULTIUSO    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-01-31',price:5000,total:15000,seller: 'Agustina Yazmin Sandobal'},
{product: 'VELAS AROMÁTICAS - Roma Rosa    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Agustina Yazmin Sandobal'},
{product: 'SANITIZANTE  - Jabón Liquido    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Agustina Yazmin Sandobal'},
{product: 'TEXTIL - Con gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Agustina Yazmin Sandobal'},
{product: 'VELAS AROMÁTICAS - Frida     Marina',qty: 3,branch: 'Macachín',date: '2025-05-31',price:5000,total:15000,seller: 'Agustina Yazmin Sandobal'},
{product: 'RINCON - Vela lata    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-05-31',price:5000,total:15000,seller: 'Alejandra Soler'},
{product: 'DIFUSOR - Env Plástico 115ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-05-31',price:5000,total:15000,seller: 'Andrea Alvarez'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-05-31',price:5000,total:15000,seller: 'Andrea Giacobbe'},
{product: 'AROMATIZANTE - MULTIUSO    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-06-25',price:5000,total:15000,seller: 'Barbara Sanchez'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Barbara Sanchez'},
{product: 'SANITIZANTE  - Jabón Liquido    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-05-31',price:5000,total:15000,seller: 'Barbara Sanchez'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Belen Davit'},
{product: 'TEXTIL - Con gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Belen Davit'},
{product: 'DIFUSOR - Env Plástico 115ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Carolina Lorca'},
{product: 'AROMATIZANTE - MULTIUSO    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Diana Sonia Hernández'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Diana Sonia Hernández'},
{product: 'DIFUSOR - Env Plástico 115ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-30',price:5000,total:15000,seller: 'Diana Sonia Hernández'},
{product: 'RINCON - Sahumerios    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Diana Sonia Hernández'},
{product: 'TEXTIL - Sin gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-05-31',price:5000,total:15000,seller: 'Diana Sonia Hernández'},
{product: 'DIFUSOR - Env Plástico 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Estefania Villegas'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Fabiana Schmidt'},
{product: 'DIFUSOR - Env Plástico 115ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Fabiana Schmidt'},
{product: 'TEXTIL - Con gatillo 500ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Giulana Paez'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-06-25',price:5000,total:15000,seller: 'Iris Poullion'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Lourdes Bender'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Ludmila Rodriguez'},
{product: 'DIFUSOR - Env Plástico 115ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Ludmila Rodriguez'},
{product: 'DIFUSOR - Vidrio 125ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Ludmila Rodriguez'},
{product: 'TEXTIL - Sin gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-05-31',price:5000,total:15000,seller: 'Ludmila Rodriguez'},
{product: 'AROMATIZANTE - MULTIUSO    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Malvina Acosta'},
{product: 'DIFUSOR - Env Plástico 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Malvina Acosta'},
{product: 'TEXTIL - Sin gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Malvina Acosta'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-01-31',price:5000,total:15000,seller: 'Marcela Otamendi'},
{product: 'DIFUSOR - Env Plástico 115ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Marisol Toledo'},
{product: 'TEXTIL - Con gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Marisol Toledo'},
{product: 'TEXTIL - Sin gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Micaela Miszczuk'},
{product: 'DIFUSOR - Env Plástico 115ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Nadia Bruzzone'},
{product: 'TEXTIL - Con gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Nadia Bruzzone'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-05-31',price:5000,total:15000,seller: 'Natalín Nievas'},
{product: 'TEXTIL - Con gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Natalín Nievas'},
{product: 'TEXTIL - Con gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-01-31',price:5000,total:15000,seller: 'Natalín Nievas'},
{product: 'TEXTIL - Sin gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Natalín Nievas'},
{product: 'RINCON - Sahumerios    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-03-31',price:5000,total:15000,seller: 'Noelia Aleman'},
{product: 'PROMOCION - Box Dia del Padre',qty: 3,branch: 'Macachín',date: '2025-01-31',price:5000,total:15000,seller: 'Norma Pablos'},
{product: 'DIFUSOR - Env Plástico 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Norma Pablos'},
{product: 'RINCON - Sahumerios    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-02-28',price:5000,total:15000,seller: 'Norma Pablos'},
{product: 'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-06-26',price:5000,total:15000,seller: 'Solana Alzugaray'},
{product: 'DIFUSOR - Env Plástico 115ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-04-30',price:5000,total:15000,seller: 'Solana Alzugaray'},
{product: 'DIFUSOR - Vidrio 125ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-06-27',price:5000,total:15000,seller: 'Solana Alzugaray'},
{product: 'AROMATIZANTE - MULTIUSO    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-06-27',price:5000,total:15000,seller: 'Stefania Block'},
{product: 'RINCON - Piedras aromáticas     GENERICO ',qty: 3,branch: 'Macachín',date: '2025-06-27',price:5000,total:15000,seller: 'Stefania Block'},
{product: 'TEXTIL - Sin gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-06-27',price:5000,total:15000,seller: 'Stefania Block'},
{product: 'TEXTIL - Sin gatillo 250ml    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-06-27',price:5000,total:15000,seller: 'Verónica Spada'},
{product: 'VELA DE MOLDE - Gota    GENERICO ',qty: 3,branch: 'Macachín',date: '2025-06-28',price:5000,total:15000,seller: 'Verónica Spada'},

];

/* Cada entrada se convierte en una función async que hace el create() */
const inserts = rows.map((r, idx) => async () => {
  const data = {
    productId : await getProductId(r.product),
    quantity  : r.qty,
    type      : 'sell',
    branch    : r.branch,
    date      : new Date(r.date),
    price     : r.price,
    total     : r.total,
    sellerId  : await getSellerId(r.seller),
    isFinalConsumer : /consumidor final/i.test(r.seller)
  };

  await Movimiento.create(data);
  console.log(`✓ Movimiento #${idx + 1} insertado`);
});

/* ───────── main ───────── */
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🚀  Conectado a MongoDB\n');

    for (const [i, fn] of inserts.entries()) {
      try {
        await fn();                                     // inserta
      } catch (err) {
        console.error(`❌  Movimiento #${i + 1}: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('❌  Error general:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
