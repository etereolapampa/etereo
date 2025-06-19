import mongoose from 'mongoose';

/* ─── items para ventas múltiples ────────── */
const ItemSchema = new mongoose.Schema({
  productId : { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  quantity  : { type: Number, required: true },
  price     : { type: Number, required: true }
}, { _id: false });

const MovimientoSchema = new mongoose.Schema({
  productId : { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },   // ⬅ opcional ahora
  quantity  : Number,                                                      // ⬅ opcional
  type      : { type: String, required: true, enum: ['add','sell','transfer','shortage'] },
  branch    : { type: String,  required: true, enum: ['Santa Rosa','Macachín'] },
  destination    : { type: String, enum: ['Santa Rosa','Macachín'] },
  date      : { type: Date, required: true },
  observations   : String,

  /* campos normales de venta simple */
  price     : Number,
  total     : Number,
  sellerId  : { type: mongoose.Schema.Types.ObjectId, ref: 'Vendedor' },
  isFinalConsumer : Boolean,

  /* NUEVO: array de productos si es venta múltiple */
  items     : [ItemSchema]                 // ← sólo presente cuando se venda +1 producto
});

export default mongoose.model('Movimiento', MovimientoSchema, 'movimientos');
