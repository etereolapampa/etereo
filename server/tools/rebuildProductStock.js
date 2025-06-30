// tools/rebuildProductStock.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Producto from '../src/models/Producto.js';
import Movimiento from '../src/models/Movimiento.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);
console.log('🔄 reconstruyendo stock…');

const sucursales = ['Macachín', 'Santa Rosa'];   // ajusta si tienes más

for await (const prod of Producto.find()) {
  const nuevoStock = {};

  for (const branch of sucursales) {
    const [{ qty = 0 } = {}] = await Movimiento.aggregate([
      { $match: { productId: prod._id, branch } },
      { $group: {
          _id: null,
          qty: { $sum: {
            $cond: [
              { $in: ['$type', ['add', 'transfer']] },  // entradas
              '$quantity',
              { $multiply: ['$quantity', -1] }          // salidas (venta, shortage…)
            ]
          }}
        }
      }
    ]);

    nuevoStock[branch] = qty;
  }

  await Producto.updateOne({ _id: prod._id }, { $set: { stock: nuevoStock } });
  console.log(`${prod.name} ⇒`, nuevoStock);
}

console.log('✅ stock reconstruido');
await mongoose.disconnect();
