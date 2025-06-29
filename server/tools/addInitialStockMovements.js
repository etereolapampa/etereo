// server/tools/addInitialStockMovements.js
import dotenv      from 'dotenv';
import mongoose    from 'mongoose';
import Producto    from '../src/models/Producto.js';
import Movimiento  from '../src/models/Movimiento.js';   // ← asegúrate de que exista

dotenv.config();

/* ============ CONEXIÓN ============ */
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌  Falta MONGODB_URI en el .env');
  process.exit(1);
}
await mongoose.connect(uri);
console.log('✅  MongoDB conectado');

/* ============ DATA ============ *
 * Formato:  PRODUCTO<TAB>MACACHÍN<TAB>SANTA ROSA<TAB>TOTAL
 *           (el 4.º valor se ignora).
 * Usa  \t  como separador explícito.
 */
const RAW = `
AROMATIZANTE - MULTIUSO    AMADERADO Tíbet\t19\t10\t29
AROMATIZANTE - MULTIUSO    AMADERADO Vainicoco\t10\t10\t20
AROMATIZANTE - MULTIUSO    FLORAL Lavanda\t\t6\t6

`.trim();   //  ← coloca AQUÍ todas las demás líneas tal cual …

// borre casi todos los renglones del raw porque ya no los necesito

/* ============ PARSEO ============ */
const rows = RAW.split('\n').map(l => {
  const parts = l.split('\t');          // separamos por el TAB real
  const name  = parts[0].replace(/\s+/g, ' ').trim();   // normaliza espacios
  const mac   = Number(parts[1] || 0);
  const sr    = Number(parts[2] || 0);
  return { name, mac, sr };
});

/* ============ INSERCIÓN DE MOVIMIENTOS ============ */
const fecha   = new Date('2024-12-31T00:00:00.000Z');
let inserted  = 0;
let notFound  = 0;

for (const r of rows) {
  const prod = await Producto.findOne({ name: new RegExp(`^${r.name}$`, 'i') });
  if (!prod) {                       // no se encontró el producto
    console.warn('⚠️  Producto NO hallado →', r.name);
    notFound++;
    continue;
  }

  // 1) Macachín
  if (r.mac > 0) {
    await Movimiento.create({
      productId : prod._id,
      branch    : 'Macachín',
      type      : 'add',
      quantity  : r.mac,
      date      : fecha
    });
    inserted++;
  }

  // 2) Santa Rosa
  if (r.sr > 0) {
    await Movimiento.create({
      productId : prod._id,
      branch    : 'Santa Rosa',
      type      : 'add',
      quantity  : r.sr,
      date      : fecha
    });
    inserted++;
  }
}

console.log(`\n✔️  Listo: ${inserted} movimientos insertados – ${notFound} productos no encontrados`);
await mongoose.connection.close();
