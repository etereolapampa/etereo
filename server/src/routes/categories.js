// src/routes/categories.js
import express from 'express';
import Categoria from '../models/Categoria.js';
import Producto from '../models/Producto.js';
const router = express.Router();

// Listar todas las categorías
router.get('/', async (req, res) => {
  try {
    const categorias = await Categoria.find();
    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al obtener las categorías' });
  }
});

// Obtener una categoría por ID
router.get('/:id', async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(categoria);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ error: 'Error al obtener la categoría' });
  }
});

// Crear nueva categoría
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const newCat = new Categoria({ name });
    await newCat.save();
    res.status(201).json(newCat);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
});

// Modificar categoría existente
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const categoria = await Categoria.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(categoria);
  } catch (error) {
    console.error('Error al modificar categoría:', error);
    res.status(500).json({ error: 'Error al modificar la categoría' });
  }
});

// Eliminar categoría
router.delete('/:id', async (req, res) => {
  try {
    // Primero eliminar todos los productos asociados a esta categoría
    await Producto.deleteMany({ categoryId: req.params.id });
    
    // Luego eliminar la categoría
    const categoria = await Categoria.findByIdAndDelete(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada' });
    
    res.json({ 
      message: 'Categoría y productos asociados eliminados correctamente',
      categoria 
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error al eliminar la categoría' });
  }
});

export default router;
