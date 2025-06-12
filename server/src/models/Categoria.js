import mongoose from 'mongoose';

const CategoriaSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

export default mongoose.model('Categoria', CategoriaSchema, 'categorias'); 