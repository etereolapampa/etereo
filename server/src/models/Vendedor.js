import mongoose from 'mongoose';

const VendedorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lastname: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  city: { type: mongoose.Schema.Types.ObjectId, ref: 'Localidad', required: true },
  phone: { type: Number },
  bonus: { type: Number }
});

export default mongoose.model('Vendedor', VendedorSchema, 'vendedores'); 