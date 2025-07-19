// server/tools/addInitialStockMovements.js
import dotenv     from 'dotenv';
import mongoose   from 'mongoose';
import Producto   from '../src/models/Producto.js';
import Movimiento from '../src/models/Movimiento.js';

dotenv.config();

/* =========================================================
   1) CONEXIÓN
   ========================================================= */
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌  Falta MONGODB_URI en el .env');
  process.exit(1);
}
await mongoose.connect(uri);
console.log('✅  MongoDB conectado');

/* =========================================================
   2) Pega tu TXT completo debajo de RAW
   ─ Formato:  PRODUCTO<TAB>MACACHÍN<TAB>SANTA ROSA<TAB>TOTAL
   ========================================================= */
const RAW = `
AROMATIZANTE - MULTIUSO    AMADERADO Tíbet\t14\t15\t29
AROMATIZANTE - MULTIUSO    AMADERADO Vainicoco\t11\t12\t23
AROMATIZANTE - MULTIUSO    FLORAL Lavanda\t11\t12\t23
AROMATIZANTE - MULTIUSO    FRUTAL Cítrica\t16\t15\t31
`.trim();

/* =========================================================
   3) PARSEO
   ========================================================= */
const rows = RAW.split('\n').map(l => {
  const [name, mac, sr] = l.split('\t');
  return {
    name: name.replace(/\s+/g, ' ').trim(),
    mac:  Number(mac || 0),
    sr:   Number(sr  || 0)
  };
});

/* =========================================================
   4) INSERCIÓN
   ========================================================= */
const fecha      = new Date('2024-12-31T00:00:00.000Z');
let insertedMovs = 0;
let notFound     = 0;

for (const r of rows) {
  const prod = await Producto.findOne({ name: new RegExp(`^${r.name}$`, 'i') });

  if (!prod) {
    console.warn('⚠️  Producto NO hallado →', r.name);
    notFound++;
    continue;
  }

  /* ---------- actualizamos stocks del producto ---------- */
  const beforeMac = prod.stockMacachin ?? 0;
  const beforeSR  = prod.stockSantaRosa ?? 0;

  if (r.mac + r.sr > 0) {
    prod.stockMacachin = beforeMac + r.mac;
    prod.stockSantaRosa = beforeSR + r.sr;
    prod.stock = (prod.stock ?? 0) + r.mac + r.sr;
    await prod.save();
  }

  /* ---------- creamos movimientos por sucursal ---------- */
  try {
    if (r.mac > 0) {
      await Movimiento.create({
        productId : prod._id,
        branch    : 'Macachín',
        type      : 'add',
        quantity  : r.mac,
        date      : fecha
      });
      console.log(`➕  Macachín   | ${r.mac.toString().padStart(4)} u. | ${r.name}`);
      insertedMovs++;
    }

    if (r.sr > 0) {
      await Movimiento.create({
        productId : prod._id,
        branch    : 'Santa Rosa',
        type      : 'add',
        quantity  : r.sr,
        date      : fecha
      });
      console.log(`➕  Santa Rosa | ${r.sr.toString().padStart(4)} u. | ${r.name}`);
      insertedMovs++;
    }
  } catch (err) {
    console.error('💥  Error al insertar movimiento de', r.name, '→', err.message);
  }
}

/* =========================================================
   5) RESUMEN
   ========================================================= */
console.log(
  `\n✔️  Terminado: ${insertedMovs} movimientos insertados – ${notFound} productos no encontrados`
);
await mongoose.connection.close();
console.log('🔌  Conexión cerrada');
