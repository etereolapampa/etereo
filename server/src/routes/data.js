import express from 'express';
import Localidad from '../models/Localidad.js';
const router = express.Router();

// Ruta para obtener las localidades
router.get('/localidades', async (req, res) => {
  try {
    const localidades = await Localidad.find();
    console.log('Localidades encontradas:', localidades.length);
    res.json({ localidades });
  } catch (error) {
    console.error('Error al obtener localidades:', error);
    res.status(500).json({ error: 'Error al obtener las localidades' });
  }
});

export default router; 