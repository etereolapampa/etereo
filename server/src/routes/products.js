// server/src/routes/products.js
import express from 'express';
import Producto from '../models/Producto.js';
import Categoria from '../models/Categoria.js';
const router = express.Router();

// Listar todos los productos
router.get('/', async (req, res) => {
  try {
    const productos = await Producto.find().populate('categoryId');
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
});

// Obtener un producto por ID
router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id).populate('categoryId');
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// Crear nuevo producto
router.post('/', async (req, res) => {
  try {
    const { name, categoryId, price } = req.body;
    if (!name || !categoryId || !price) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Validar que la categoría exista
    const categoria = await Categoria.findById(categoryId);
    if (!categoria) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }

    const newProduct = new Producto({
      name,
      categoryId,
      price: Number(price),
      stock: 0
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

// Modificar producto existente
router.put('/:id', async (req, res) => {
  try {
    const { name, categoryId, price } = req.body;
    if (!name || !categoryId || !price) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Validar que la categoría exista
    const categoria = await Categoria.findById(categoryId);
    if (!categoria) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }

    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { name, categoryId, price: Number(price) },
      { new: true }
    );

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

// Eliminar producto
router.delete('/:id', async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

/**
 * POST /products/adjust-prices
 * Body: { categoryId, percentage }
 */
router.post('/adjust-prices', async (req, res) => {
  const { categoryId, percentage } = req.body;

  if (!categoryId || percentage === undefined) {
    return res.status(400).json({ error: 'categoryId y percentage son requeridos' });
  }

  try {
    // Verificar que la categoría existe y tiene productos
    const productos = await Producto.find({ categoryId });
    if (productos.length === 0) {
      return res.status(400).json({ error: 'No hay productos en esta categoría' });
    }

    // Actualizar solo los productos de la categoría seleccionada
    const updatedProducts = await Producto.updateMany(
      { categoryId },
      { $mul: { price: (1 + percentage / 100) } }
    );

    res.json({
      message: 'Precios actualizados correctamente',
      updatedCount: updatedProducts.modifiedCount
    });
  } catch (error) {
    console.error('Error al ajustar precios:', error);
    res.status(500).json({ error: 'Error al ajustar los precios' });
  }
});

export default router;
