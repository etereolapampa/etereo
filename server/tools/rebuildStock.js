/**
 * Recalcula stock y stockByBranch a partir de todos los movimientos.
 *  node tools/rebuildStock.js
 */
import dotenv      from 'dotenv';
import mongoose    from 'mongoose';
import Producto    from '../src/models/Producto.js';
import Movimiento  from '../src/models/Movimiento.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);
console.log('🛠️  Recalculando stock…');

const prods = await Producto.find();                   // cache productos
const emptyMap = () => new Map([['Santa Rosa',0],['Macachín',0]]);

/* 1) ponemos todo a 0 ---------------------------------------------- */
for (const p of prods) {
  p.stock = 0;
  p.stockByBranch = emptyMap();
}

/* 2) procesamos movimiento x movimiento ---------------------------- */
const movs = await Movimiento.find();
for (const m of movs) {
  const apply = (prodId, branch, delta) => {
    const p = prods.find(x => String(x._id) === String(prodId));
    if (!p) return;                                      // (no debería pasar)
    p.stock += delta;
    const cur = p.stockByBranch.get(branch) || 0;
    p.stockByBranch.set(branch, cur + delta);
  };

  const sign = ({ add: +1, shortage: -1, sell: -1, transfer: null })[m.type];
  if (sign === null) {                 // transferencia: restar origen / sumar dest
    apply(m.productId, m.origin,      -m.quantity);
    apply(m.productId, m.destination, +m.quantity);
  } else if (m.items?.length) {        // venta múltiple
    m.items.forEach(it => apply(it.productId, m.branch, sign * it.quantity));
  } else {
    apply(m.productId, m.branch, sign * m.quantity);
  }
}

/* 3) guardamos solamente productos modificados --------------------- */
let updated = 0;
for (const p of prods) {
  await p.save();
  updated++;
}

console.log(`✔️  Stock reconstruido. Productos actualizados: ${updated}`);
await mongoose.connection.close();
process.exit();
