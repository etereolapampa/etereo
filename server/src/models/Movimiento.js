import mongoose from 'mongoose';
import { BRANCHES } from '../constants/branches.js';

const CategorySnapshotSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria'
  },
  name: {
    type: String,
    trim: true
  }
}, { _id: false });

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
  description: { type: String, trim: true },

  /* foto de la categoría al momento del movimiento */
  categorySnapshot: { type: CategorySnapshotSchema, default: null }
}, { _id: false });

const MovimientoSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },   // ⬅ opcional ahora
  quantity: Number,                                                      // ⬅ opcional
  type: { type: String, required: true, enum: ['add', 'sell', 'transfer', 'shortage'] },
  branch: { type: String, required: true, enum: BRANCHES },
  destination: { type: String, enum: BRANCHES },
  date: { type: Date, required: true },
  observations: String,

  /* campos normales de venta simple */
  price: Number,
  total: Number,
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendedor' },
  isFinalConsumer: Boolean,
  categorySnapshot: { type: CategorySnapshotSchema, default: null },

  /* NUEVO: array de productos si es venta múltiple */
  items: [ItemSchema]                 // ← sólo presente cuando se venda +1 producto
});

export default mongoose.model('Movimiento', MovimientoSchema, 'movimientos');
