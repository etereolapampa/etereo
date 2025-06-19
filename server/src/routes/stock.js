// server/src/routes/stock.js
import express from 'express';
import Producto from '../models/Producto.js';
import Movimiento from '../models/Movimiento.js';
import Vendedor from '../models/Vendedor.js';
import { parseDateAR } from '../utils/date.js';


const router = express.Router();

// Función para obtener la fecha actual en Argentina
const getArgentinaDate = () => {
  const date = new Date();
  return date;
};

// Función para formatear fechas en formato argentino
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const SUCURSALES = ["Santa Rosa", "Macachín"];

/**
 * POST /stock/add
 * Body: { productId, quantity, branch, observations }
 */
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity, branch, observations, date } = req.body;
    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || !branch) {
      return res.status(400).json({
        error: 'productId, quantity (int > 0) y branch son obligatorios'
      });
    }

    const product = await Producto.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Ajuste global
    product.stock += quantity;
    await product.save();

    // Registro de movimiento
    const newMovement = new Movimiento({
      productId,
      quantity,
      type: 'add',
      branch,
      date: date?.length === 10 ? parseDateAR(date) : (date || getArgentinaDate()),
      observations: observations || '',
      price: product.price
    });
    await newMovement.save();

    res.json({ product, movement: newMovement });
  } catch (error) {
    console.error('Error al agregar stock:', error);
    res.status(500).json({ error: 'Error al agregar stock' });
  }
});

/**
 * POST /stock/sale
 *  – Venta simple   → body: { productId, quantity, price, total, branch, … }
 *  – Venta múltiple → body: { items:[{ productId, quantity, price }], branch, … }
 */
router.post('/sale', async (req, res) => {
  try {
    /*─────────────────────────
      ¿VIENE items[]?  entonces
      estamos ante una VENTA MÚLTIPLE
    ─────────────────────────*/
    if (Array.isArray(req.body.items) && req.body.items.length) {

      const { items, branch, sellerId, observations = '', date } = req.body;

      if (!branch) return res.status(400).json({ error: 'branch es obligatorio' });

      /* ——— validar vendedor si existe ——— */
      if (sellerId) {
        const sellerOK = await Vendedor.exists({ _id: sellerId });
        if (!sellerOK) return res.status(400).json({ error: 'Vendedor no encontrado' });
      }

      /* ——— recorrer cada producto y validar stock ——— */
      let total = 0;

      console.log('Items recibidos:', items);


      for (const it of items) {
        console.log('Buscando producto', it.productId);

        const prod = await Producto.findById(it.productId);

        console.log('Resultado →', !!prod);


        if (!prod) return res.status(404).json({ error: `Producto ${it.productId} no encontrado` });

        // stock global
        if (prod.stock < it.quantity)
          return res.status(400).json({ error: `Stock global insuficiente para ${prod.name}` });

        // stock en sucursal
        const branchStock = await Movimiento.aggregate([
          { $match: { productId: prod._id, branch } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: [
                    { $eq: ['$type', 'add'] },
                    '$quantity',
                    { $multiply: ['$quantity', -1] }
                  ]
                }
              }
            }
          }
        ]);
        const disponible = branchStock[0]?.total || 0;
        if (disponible < it.quantity)
          return res.status(400).json({ error: `Stock insuficiente en ${branch} para ${prod.name}` });

        /* descontar stock global del producto */
        prod.stock -= it.quantity;
        await prod.save();

        total += it.quantity * it.price;          // acumular $
      }

      /* ——— registrar movimiento único con items[] ——— */
      const newMovement = await Movimiento.create({
        type           : 'sell',
        branch,
        date           : date?.length === 10 ? parseDateAR(date) : (date || getArgentinaDate()),
        sellerId       : sellerId || null,
        isFinalConsumer: !sellerId,
        items,
        total,
        observations
      });

      return res.json({ movement: newMovement, total });
    }

    /*─────────────────────────
      VENTA SIMPLE  (código que ya existía)
    ─────────────────────────*/
    const { productId, quantity, price, total, branch, sellerId, observations, date } = req.body;

    const product = await Producto.findById(productId);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    if (!Number.isInteger(quantity) || quantity <= 0)
      return res.status(400).json({ error: 'quantity (int > 0) es obligatorio' });

    if (!price || price <= 0)  return res.status(400).json({ error: 'price (number > 0) es obligatorio' });
    if (!total || total <= 0)  return res.status(400).json({ error: 'total (number > 0) es obligatorio' });

    if (sellerId) {
      const seller = await Vendedor.findById(sellerId);
      if (!seller) return res.status(400).json({ error: 'Vendedor no encontrado' });
    }

    // stock global
    if (product.stock < quantity)
      return res.status(400).json({ error: 'Stock global insuficiente' });

    // stock sucursal
    const branchStock = await Movimiento.aggregate([
      { $match: { productId: product._id, branch } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'add'] }, '$quantity',
                { $multiply: ['$quantity', -1] }
              ]
            }
          }
        }
      }
    ]);
    const disponible = branchStock[0]?.total || 0;
    if (disponible < quantity)
      return res.status(400).json({ error: `Stock insuficiente en ${branch}` });

    /* descontar stock global */
    product.stock -= quantity;
    await product.save();

    const newMovement = await Movimiento.create({
      productId,
      quantity,
      price: Number(price),
      total: Number(total),
      type : 'sell',
      branch,
      date : date?.length === 10 ? parseDateAR(date) : (date || getArgentinaDate()),
      observations: observations || '',
      sellerId: sellerId || null,
      isFinalConsumer: !sellerId
    });

    res.json({ product, movement: newMovement });

  } catch (error) {
    console.error('Error en /stock/sale:', error);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
});


/**
 * POST /stock/shortage
 * Body: { productId, quantity, branch, observations }
 */
router.post('/shortage', async (req, res) => {
  try {
    const { productId, quantity, branch, observations, date } = req.body;

    const product = await Producto.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Verificar stock en la sucursal
    const branchStock = await Movimiento.aggregate([
      { $match: { productId: product._id, branch } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'add'] },
                '$quantity',
                { $multiply: ['$quantity', -1] }
              ]
            }
          }
        }
      }
    ]);

    const availableStock = branchStock[0]?.total || 0;
    if (availableStock < quantity) {
      return res.status(400).json({ error: `Stock insuficiente en ${branch}` });
    }

    // Ajustar stock global
    product.stock -= quantity;
    await product.save();

    // Registrar movimiento
    const newMovement = new Movimiento({
      productId,
      quantity,
      type: 'shortage',
      branch,
      date: date?.length === 10 ? parseDateAR(date) : (date || getArgentinaDate()),
      observations: observations || '',
      price: product.price
    });
    await newMovement.save();

    res.json({ product, movement: newMovement });
  } catch (error) {
    console.error('Error al registrar faltante:', error);
    res.status(500).json({ error: 'Error al registrar el faltante' });
  }
});

/**
 * POST /stock/transfer
 * Body: { productId, quantity, origin, destination, observations }
 */
router.post('/transfer', async (req, res) => {
  try {
    const { productId, quantity, origin, destination, observations, date } = req.body;

    const product = await Producto.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (!SUCURSALES.includes(origin) || !SUCURSALES.includes(destination) || origin === destination) {
      return res.status(400).json({ error: 'Origen o destino inválidos' });
    }

    // Verificar stock en la sucursal de origen
    const originStock = await Movimiento.aggregate([
      { $match: { productId: product._id, branch: origin } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'add'] },
                '$quantity',
                { $multiply: ['$quantity', -1] }
              ]
            }
          }
        }
      }
    ]);

    const availableStock = originStock[0]?.total || 0;
    if (availableStock < quantity) {
      return res.status(400).json({ error: `Stock insuficiente en ${origin}` });
    }

    // Registrar el movimiento de transferencia
    const newMovement = new Movimiento({
      productId,
      quantity,
      type: 'transfer',
      branch: origin,
      destination,
      date: date?.length === 10 ? parseDateAR(date) : (date || getArgentinaDate()),
      observations: observations || '',
      price: product.price
    });
    await newMovement.save();

    res.json({ product, movement: newMovement });
  } catch (error) {
    console.error('Error al registrar transferencia:', error);
    res.status(500).json({ error: 'Error al registrar la transferencia' });
  }
});

/**
 * GET /stock/movements
 */
router.get('/movements', async (req, res) => {
  try {
    console.log('Buscando movimientos...');

    const movimientos = await Movimiento.find()
      .populate({
        path: 'productId',
        select: 'name price categoryId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      })
      .populate('sellerId', 'name lastname')
      .sort({ date: -1 });

    console.log('Movimientos encontrados:', movimientos.length);

    if (movimientos.length > 0) {
      console.log('Primer movimiento:', {
        _id: movimientos[0]._id,
        type: movimientos[0].type,
        date: movimientos[0].date,
        productId: movimientos[0].productId,
        sellerId: movimientos[0].sellerId
      });
    }

    // Convertir a objetos planos y formatear fechas
    const movimientosFormateados = movimientos.map(m => {
      const movimiento = m.toObject();
      return {
        ...movimiento,
        date: movimiento.date.toISOString() // Enviar la fecha en formato ISO
      };
    });

    res.json(movimientosFormateados);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ error: 'Error al obtener los movimientos' });
  }
});

/**
 * DELETE /stock/movements/:id
 */
router.delete('/movements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const movement = await Movimiento.findById(id);

    if (!movement) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    // Encontrar el producto asociado
    const product = await Producto.findById(movement.productId);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Ajustar el stock según el tipo de movimiento
    if (movement.type === 'add') {
      product.stock -= movement.quantity;
    } else if (movement.type === 'sell' || movement.type === 'transfer' || movement.type === 'shortage') {
      product.stock += movement.quantity;
    }
    await product.save();

    // Eliminar el movimiento
    await Movimiento.findByIdAndDelete(id);

    res.json({ message: 'Movimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    res.status(500).json({ error: 'Error al eliminar el movimiento' });
  }
});

// GET /stock/movements/:id
router.get('/movements/:id', async (req, res) => {
  try {
    const movement = await Movimiento.findById(req.params.id)
      .populate('productId', 'name price')
      .populate('sellerId', 'name lastname');

    if (!movement) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    // Formatear la fecha
    const movementFormateado = {
      ...movement.toObject(),
      date: formatDate(movement.date)
    };

    res.json(movementFormateado);
  } catch (error) {
    console.error('Error al obtener movimiento:', error);
    res.status(500).json({ error: 'Error al obtener el movimiento' });
  }
});

// PUT /stock/movements/:id
router.put('/movements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, productId, branch, origin, destination, sellerId, observations, price, total } = req.body;

    const movement = await Movimiento.findById(id);
    if (!movement) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    // Validar que el producto existe
    const product = await Producto.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    // Validar que el vendedor existe si se proporciona
    if (sellerId) {
      const seller = await Vendedor.findById(sellerId);
      if (!seller) {
        return res.status(404).json({ error: 'Vendedor no encontrado' });
      }
    }

    // Actualizar el movimiento
    // Si viene un string YYYY-MM-DD lo convertimos a la “medianoche AR”
    if (date?.length === 10) {
      movement.date = parseDateAR(date);
    } else if (date) {
      movement.date = date;               // ya es un ISO completo
    }
    movement.productId = productId;
    movement.branch = branch || origin;
    movement.destination = destination;
    movement.sellerId = sellerId;
    movement.observations = observations || movement.observations;
    movement.price = price || movement.price;
    movement.total = total || movement.total;

   /* ← NUEVO: permitir sustituir el array de ítems si llega */
   if (req.body.items) movement.items = req.body.items;

    await movement.save();

    res.json(movement);
  } catch (error) {
    console.error('Error al actualizar movimiento:', error);
    res.status(500).json({ error: 'Error al actualizar el movimiento' });
  }
});

// GET /stock
router.get('/', async (req, res) => {
  try {
    // Obtener todos los productos y movimientos desde MongoDB
    const productos = await Producto.find();
    const movimientos = await Movimiento.find();

    const stock = productos.map(product => {
      // Filtrar movimientos de este producto
      const productMovements = movimientos.filter(m => m.productId.toString() === product._id.toString());
      const stockByBranch = {};
      // Inicializar stock en 0 para todas las sucursales
      SUCURSALES.forEach(branch => {
        stockByBranch[branch] = 0;
      });
      // Calcular stock por sucursal
      productMovements.forEach(m => {
        if (m.type === 'add') {
          stockByBranch[m.branch] = (stockByBranch[m.branch] || 0) + m.quantity;
        } else if (m.type === 'sell' || m.type === 'shortage') {
          stockByBranch[m.branch] = (stockByBranch[m.branch] || 0) - m.quantity;
        } else if (m.type === 'transfer') {
          stockByBranch[m.branch] = (stockByBranch[m.branch] || 0) - m.quantity;
          stockByBranch[m.destination] = (stockByBranch[m.destination] || 0) + m.quantity;
        }
      });
      return {
        _id: product._id,
        name: product.name,
        categoryId: product.categoryId,
        stock: product.stock,
        stockByBranch
      };
    });
    res.json(stock);
  } catch (error) {
    console.error('Error al obtener stock:', error);
    res.status(500).json({ error: 'Error al obtener el stock' });
  }
});

/**
 * GET /stats
 */
router.get('/stats', async (req, res) => {
  try {
    const [movementsData, sellersData] = await Promise.all([
      req.readJsonFile(req.dataFiles.movements),
      req.readJsonFile(req.dataFiles.sellers)
    ]);

    if (!movementsData || !sellersData) {
      return res.status(500).json({ error: 'Error al leer los datos' });
    }

    // Filtrar solo movimientos de venta
    const salesMovements = movementsData.movimientos.filter(m =>
      m.type === 'remove' && m.sellerId != null
    );

    // Calcular total de ventas
    const totalSales = salesMovements.reduce((sum, m) => sum + m.quantity, 0);

    // Calcular ventas por vendedor
    const salesBySeller = {};
    salesMovements.forEach(m => {
      const seller = sellersData.vendedores.find(s => s.id === m.sellerId);
      if (seller) {
        const sellerName = `${seller.name} ${seller.lastname}`;
        salesBySeller[sellerName] = (salesBySeller[sellerName] || 0) + m.quantity;
      }
    });

    // Calcular ventas por sucursal
    const salesByBranch = {};
    salesMovements.forEach(m => {
      salesByBranch[m.branch] = (salesByBranch[m.branch] || 0) + m.quantity;
    });

    // Calcular productos más vendidos
    const productSales = {};
    salesMovements.forEach(m => {
      productSales[m.productName] = (productSales[m.productName] || 0) + m.quantity;
    });

    const topProducts = Object.entries(productSales)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      totalSales,
      salesBySeller,
      salesByBranch,
      topProducts
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener las estadísticas' });
  }
});

 

export default router;
