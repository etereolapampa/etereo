import mongoose from 'mongoose';

const ProductoSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  stock:       { type: Number, required: true, default: 0 },
  categoryId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true },

  /*  ⇨  Renombrado: era branchStock  */
  stockByBranch: {
    type: Map,
    of: Number,
    default: new Map()
  }
});

export default mongoose.model('Producto', ProductoSchema, 'productos');
