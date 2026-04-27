// server/src/routes/products.js
import express from 'express';
import Producto from '../models/Producto.js';
import Categoria from '../models/Categoria.js';
// requireAdmin removido: todos los usuarios autenticados pueden operar
import { logAction } from '../utils/logger.js';
import { calculateAdjustedPrice, normalizePrice } from '../utils/price.js';
const router = express.Router();

// Listar todos los productos
router.get('/', async (req, res) => {
  try {
    const filter = req.query.categoryId ? { categoryId: req.query.categoryId } : {};
    const productos = await Producto.find(filter).populate('categoryId');
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

    const normalizedPrice = normalizePrice(price);
    if (!Number.isFinite(normalizedPrice)) {
      return res.status(400).json({ error: 'Precio inválido' });
    }

    // Validar que la categoría exista
    const categoria = await Categoria.findById(categoryId);
    if (!categoria) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }

    const newProduct = new Producto({
      name,
      categoryId,
      price: normalizedPrice,
      stock: 0
    });

    await newProduct.save();
    await logAction(req, { action: 'create', entity: 'product', entityId: newProduct._id, data: { name, categoryId, price: normalizedPrice } });
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

    const normalizedPrice = normalizePrice(price);
    if (!Number.isFinite(normalizedPrice)) {
      return res.status(400).json({ error: 'Precio inválido' });
    }

    // Validar que la categoría exista
    const categoria = await Categoria.findById(categoryId);
    if (!categoria) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }

    const before = await Producto.findById(req.params.id).lean();
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { name, categoryId, price: normalizedPrice },
      { new: true }
    );

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await logAction(req, { action: 'update', entity: 'product', entityId: producto._id, data: { before, after: producto } });
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
    await logAction(req, { action: 'delete', entity: 'product', entityId: producto._id, data: { deleted: producto } });
    res.json(producto);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

/**
 * POST /products/adjust-prices
 * Body: { categoryId, adjustmentType, percentage?, fixedPrice? }
 */
router.post('/adjust-prices', async (req, res) => {
  const { categoryId, adjustmentType, percentage, fixedPrice } = req.body;

  if (!categoryId || !adjustmentType) {
    return res.status(400).json({ error: 'categoryId y adjustmentType son requeridos' });
  }

  if (adjustmentType === 'percentage' && percentage === undefined) {
    return res.status(400).json({ error: 'percentage es requerido para ajuste por porcentaje' });
  }

  if (adjustmentType === 'fixed' && fixedPrice === undefined) {
    return res.status(400).json({ error: 'fixedPrice es requerido para ajuste por precio fijo' });
  }

  const percentageValue = Number(percentage);
  const fixedPriceValue = Number(fixedPrice);

  if (adjustmentType === 'percentage' && !Number.isFinite(percentageValue)) {
    return res.status(400).json({ error: 'percentage debe ser un número válido' });
  }

  if (adjustmentType === 'fixed' && !Number.isFinite(fixedPriceValue)) {
    return res.status(400).json({ error: 'fixedPrice debe ser un número válido' });
  }

  try {
    // Verificar que la categoría existe y tiene productos
    const productos = await Producto.find({ categoryId });
    if (productos.length === 0) {
      return res.status(400).json({ error: 'No hay productos en esta categoría' });
    }

    const updatePipeline = adjustmentType === 'percentage'
      ? [
          {
            $set: {
              price: {
                $multiply: [
                  {
                    $round: [
                      {
                        $divide: [
                          {
                            $multiply: ['$price', 1 + percentageValue / 100]
                          },
                          100
                        ]
                      },
                      0
                    ]
                  },
                  100
                ]
              }
            }
          }
        ]
      : [
          {
            $set: {
              price: {
                $round: [
                  {
                    $add: ['$price', fixedPriceValue]
                  },
                  0
                ]
              }
            }
          }
        ];

    const updateResult = await Producto.updateMany({ categoryId }, updatePipeline);

    const updatedProducts = await Producto.find({ categoryId }, { name: 1, price: 1, categoryId: 1 }).lean();
    const modifiedCount = updateResult.modifiedCount ?? updatedProducts.length;

    if (adjustmentType === 'percentage') {
      const invalidProduct = updatedProducts.find(producto => {
        const expectedPrice = calculateAdjustedPrice({
          currentPrice: productos.find(item => String(item._id) === String(producto._id))?.price,
          adjustmentType,
          percentage: percentageValue,
          fixedPrice: fixedPriceValue
        });

        return Number.isFinite(expectedPrice) && expectedPrice !== producto.price;
      });

      if (invalidProduct) {
        return res.status(500).json({ error: 'El backend no pudo registrar el redondeo esperado' });
      }
    }

    await logAction(req, {
      action: 'adjust',
      entity: 'product-prices',
      entityId: String(categoryId),
      data: {
        categoryId,
        adjustmentType,
        percentage: adjustmentType === 'percentage' ? percentageValue : undefined,
        fixedPrice: adjustmentType === 'fixed' ? fixedPriceValue : undefined,
        modifiedCount,
        updatedProducts: updatedProducts.map(producto => ({
          ...producto,
          _id: String(producto._id),
          categoryId: String(producto.categoryId)
        }))
      }
    });
    res.json({
      message: 'Precios actualizados correctamente',
      updatedCount: modifiedCount,
      updatedProducts: updatedProducts.map(producto => ({
        ...producto,
        _id: String(producto._id),
        categoryId: String(producto.categoryId)
      })),
      adjustmentType,
      ...(adjustmentType === 'percentage' && { percentage: percentageValue }),
      ...(adjustmentType === 'fixed' && { fixedPrice: fixedPriceValue })
    });
  } catch (error) {
    console.error('Error al ajustar precios:', error);
    res.status(500).json({ error: 'Error al ajustar los precios' });
  }
});

export default router;
