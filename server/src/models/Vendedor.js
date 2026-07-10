// server/src/models/Vendedor.js

import mongoose from "mongoose";

const VendedorSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  lastname:  { type: String, required: true, trim: true },
  dni:       {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    set: value => {
      if (typeof value !== 'string') return value;
      const normalized = value.trim();
      return normalized || undefined;
    }
  },
  city:      { type: mongoose.Schema.Types.ObjectId, ref: 'Localidad', required: true },
  phone:     { type: Number },
  bonus:     { type: Number },
  /** NUEVO ---------------------------------- */
  email:     {
    type: String,
    lowercase: true,
    trim: true,
    match: /.+@.+\..+/   // validación básica
  },
  // Soft delete flags
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null }
});

export default mongoose.model('Vendedor', VendedorSchema, 'vendedores');

