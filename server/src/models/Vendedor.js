// server/src/models/Vendedor.js

import mongoose from "mongoose";

const VendedorSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  lastname:  { type: String, required: true, trim: true },
  dni:       { type: String, required: true, unique: true, trim: true },
  city:      { type: mongoose.Schema.Types.ObjectId, ref: 'Localidad', required: true },
  phone:     { type: Number },
  bonus:     { type: Number },
  /** NUEVO ---------------------------------- */
  email:     {
    type: String,
    lowercase: true,
    trim: true,
    match: /.+@.+\..+/   // validación básica
  }
});

export default mongoose.model('Vendedor', VendedorSchema);

