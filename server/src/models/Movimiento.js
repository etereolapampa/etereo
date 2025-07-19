import mongoose from 'mongoose';

/* ─── items para ventas múltiples ────────── */
const ItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    /* solo es obligatorio cuando NO es descuento */
    required: function () { return !this.isDiscount; }
  },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  /* NUEVO — si true el backend no intenta tocar stock  */
  isDiscount: { type: Boolean, default: false },

  /* para descuentos necesitamos mostrar un texto */
  description: { type: String, trim: true }
}, { _id: false });

const MovimientoSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },   // ⬅ opcional ahora
  quantity: Number,                                                      // ⬅ opcional
  type: { type: String, required: true, enum: ['add', 'sell', 'transfer', 'shortage'] },
  branch: { type: String, required: true, enum: ['Santa Rosa', 'Macachín'] },
  destination: { type: String, enum: ['Santa Rosa', 'Macachín'] },
  date: { type: Date, required: true },
  observations: String,

  /* campos normales de venta simple */
  price: Number,
  total: Number,
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendedor' },
  isFinalConsumer: Boolean,

  /* NUEVO: array de productos si es venta múltiple */
  items: [ItemSchema]                 // ← sólo presente cuando se venda +1 producto
});

export default mongoose.model('Movimiento', MovimientoSchema, 'movimientos');
