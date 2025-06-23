import mongoose from 'mongoose';

const PROVINCIAS = [
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán'
];

const LocalidadSchema = new mongoose.Schema({
  province: { type: String, enum: PROVINCIAS, required: true },
  name    : { type: String, required: true, unique: true, trim: true }
});

export { PROVINCIAS };          // lo exportamos para usar en las rutas


export default mongoose.model('Localidad', LocalidadSchema, 'localidades'); 