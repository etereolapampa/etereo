// tools/createCategories.js ---------------------------------
import mongoose from 'mongoose';
import dotenv   from 'dotenv';
dotenv.config();                      // lee MONGODB_URI de .env

const MONGODB_URI = process.env.MONGODB_URI ;

const CategoriaSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { collection: 'categorias' });

const Categoria = mongoose.model('Categoria', CategoriaSchema);

const CATEGORIES = [
  'AROMATIZANTES',
  'DIFUSORES',
  'RINCONES',
  'SANITIZANTE',
  'TEXTILES',
  'VELAS AROMÁTICAS',
  'VELAS MOLDE'
];

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    /* ▸ upsert por si alguna ya existe.
       Cada iteración hace exactamente 1 operación.           */
    for (const name of CATEGORIES) {
      const { upsertedCount } = await Categoria.updateOne(
        { name },                      // filtro
        { $setOnInsert: { name } },    // datos si NO existe
        { upsert: true }               // crea si hace falta
      );
      console.log(`· ${name} ${upsertedCount ? 'creada' : 'ya existía'}`);
    }

  } catch (err) {
    console.error('⚠️  Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('↩︎ Conexión cerrada');
  }
})();
