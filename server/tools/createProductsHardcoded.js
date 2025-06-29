// server/tools/createProductsHardcoded.js
import dotenv     from 'dotenv';
import mongoose   from 'mongoose';
import Categoria  from '../src/models/Categoria.js';
import Producto   from '../src/models/Producto.js';

dotenv.config();

/* =========== CONEXIÓN =========== */
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌  Falta MONGODB_URI en el .env');
  process.exit(1);
}
await mongoose.connect(uri);
console.log('✅  MongoDB conectado');

/* =========== DATA BRUTA =========== *
 *  Formato:  RUBRO<TAB>PRODUCTO<TAB>VALOR
 *  (sin la cabecera).  Los TABs son “\t”.
 */
const RAW = `
AROMATIZANTES\tAROMATIZANTE - MULTIUSO    AMADERADO Tíbet\t6380
AROMATIZANTES\tAROMATIZANTE - MULTIUSO    AMADERADO Vainicoco\t6380


`.trim();   //  <-- FIN DATA
/*  (Los “...” del ejemplo son solo para acortar la vista aquí; en tu archivo
    pega *todas* las líneas que me pasaste, una debajo de la otra).          */

// borre casi todos los renglones del raw porque ya no los necesito

/* =========== PARSEO =========== */
const rows = RAW.split('\n').map(l => {
  const [cat, ...rest] = l.split('\t');
  const price = Number(rest.pop().trim()) || 0;
  const name  = rest.join('\t').replace(/\s+/g, ' ').trim();  // normaliza espacios
  return { cat: cat.trim().toUpperCase(), name, price };
});

/* =========== MAPA de categorías =========== */
const catDocs = await Categoria.find().lean();
const catMap  = Object.fromEntries(catDocs.map(c => [c.name.toUpperCase(), c._id]));

/* =========== INSERCIÓN =========== */
let inserted = 0, skipped = 0;

for (const r of rows) {
  const categoryId = catMap[r.cat];
  if (!categoryId) { console.warn('⚠️  Cat no encontrada →', r.cat); skipped++; continue; }

  const exists = await Producto.findOne({ name: new RegExp(`^${r.name}$`, 'i') });
  if (exists) { skipped++; continue; }

  await Producto.create({
    name: r.name,
    categoryId,
    price: r.price,
    stock: 0,
    stockByBranch: { 'Santa Rosa': 0, 'Macachín': 0 }
  });
  inserted++;
}

console.log(`\n✔️  Listo: ${inserted} productos insertados, ${skipped} omitidos`);
await mongoose.connection.close();
