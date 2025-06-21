// server/src/routes/stock.js
import express   from 'express';
import mongoose  from 'mongoose';

import Producto   from '../models/Producto.js';
import Movimiento from '../models/Movimiento.js';
import Vendedor   from '../models/Vendedor.js';
import { parseDateAR } from '../utils/date.js';

const router = express.Router();

const SUCURSALES = ['Santa Rosa', 'Macachín'];

/* ───────── helpers fecha ───────── */
const getArgentinaDate = () => new Date();
const formatDate = d =>
  d
    ? new Date(d).toLocaleDateString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    : '';

/* =========================================================
   POST /stock/add  (carga de stock)
   ========================================================= */
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity, branch, observations = '', date } = req.body;

    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || !branch) {
      return res
        .status(400)
        .json({ error: 'productId, quantity (int>0) y branch son obligatorios' });
    }

    const product = await Producto.findById(productId);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    product.stock += quantity;
    await product.save();

    const movement = await Movimiento.create({
      productId,
      quantity,
      type: 'add',
      branch,
      date: date?.length === 10 ? parseDateAR(date) : date || getArgentinaDate(),
      observations,
      price: product.price
    });

    res.json({ product, movement });
  } catch (err) {
    console.error('POST /stock/add →', err);
    res.status(500).json({ error: 'Error al agregar stock' });
  }
});

/* =========================================================
   POST /stock/sale  (venta simple o múltiple)
   ========================================================= */
router.post('/sale', async (req, res) => {
  try {
    /* ── venta MÚLTIPLE (items[]) ────────────────────────── */
    if (Array.isArray(req.body.items) && req.body.items.length) {
      const { items, branch, sellerId, observations = '', date } = req.body;
      if (!branch) return res.status(400).json({ error: 'branch es obligatorio' });

      if (sellerId && !(await Vendedor.exists({ _id: sellerId })))
        return res.status(400).json({ error: 'Vendedor no encontrado' });

      let total = 0;
      for (const it of items) {
        const prod = await Producto.findById(it.productId);
        if (!prod) return res.status(404).json({ error: `Producto ${it.productId} no encontrado` });
        if (prod.stock < it.quantity)
          return res.status(400).json({ error: `Stock global insuficiente para ${prod.name}` });

        /* stock sucursal */
        const disponible =
          (
            await Movimiento.aggregate([
              { $match: { productId: prod._id, branch } },
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: {
                      $cond: [{ $eq: ['$type', 'add'] }, '$quantity', { $multiply: ['$quantity', -1] }]
                    }
                  }
                }
              }
            ])
          )[0]?.total || 0;

        if (disponible < it.quantity)
          return res
            .status(400)
            .json({ error: `Stock insuficiente en ${branch} para ${prod.name}` });

        prod.stock -= it.quantity;
        await prod.save();
        total += it.quantity * it.price;
      }

      const movement = await Movimiento.create({
        type: 'sell',
        branch,
        date: date?.length === 10 ? parseDateAR(date) : date || getArgentinaDate(),
        sellerId: sellerId || null,
        isFinalConsumer: !sellerId,
        items,
        total,
        observations
      });

      return res.json({ movement, total });
    }

    /* ── venta SIMPLE ───────────────────────────────────── */
    const {
      productId,
      quantity,
      price,
      total,
      branch,
      sellerId,
      observations = '',
      date
    } = req.body;

    const prod = await Producto.findById(productId);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    if (!branch) return res.status(400).json({ error: 'branch es obligatorio' });
    if (!Number.isInteger(quantity) || quantity <= 0)
      return res.status(400).json({ error: 'quantity (int>0) es obligatorio' });
    if (!price || price <= 0) return res.status(400).json({ error: 'price > 0 obligatorio' });
    if (!total || total <= 0) return res.status(400).json({ error: 'total > 0 obligatorio' });

    if (sellerId && !(await Vendedor.exists({ _id: sellerId })))
      return res.status(400).json({ error: 'Vendedor no encontrado' });

    if (prod.stock < quantity)
      return res.status(400).json({ error: 'Stock global insuficiente' });

    /* stock sucursal */
    const disponible =
      (
        await Movimiento.aggregate([
          { $match: { productId: prod._id, branch } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'add'] }, '$quantity', { $multiply: ['$quantity', -1] }]
                }
              }
            }
          }
        ])
      )[0]?.total || 0;

    if (disponible < quantity)
      return res.status(400).json({ error: `Stock insuficiente en ${branch}` });

    prod.stock -= quantity;
    await prod.save();

    const movement = await Movimiento.create({
      productId,
      quantity,
      price,
      total,
      type: 'sell',
      branch,
      date: date?.length === 10 ? parseDateAR(date) : date || getArgentinaDate(),
      observations,
      sellerId: sellerId || null,
      isFinalConsumer: !sellerId
    });

    res.json({ product: prod, movement });
  } catch (err) {
    console.error('POST /stock/sale →', err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
});

/* =========================================================
   POST /stock/shortage  (faltante)
   ========================================================= */
router.post('/shortage', async (req, res) => {
  try {
    const { productId, quantity, branch, observations = '', date } = req.body;

    const prod = await Producto.findById(productId);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    const disponible =
      (
        await Movimiento.aggregate([
          { $match: { productId: prod._id, branch } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'add'] }, '$quantity', { $multiply: ['$quantity', -1] }]
                }
              }
            }
          }
        ])
      )[0]?.total || 0;

    if (disponible < quantity)
      return res.status(400).json({ error: `Stock insuficiente en ${branch}` });

    prod.stock -= quantity;
    await prod.save();

    const movement = await Movimiento.create({
      productId,
      quantity,
      type: 'shortage',
      branch,
      date: date?.length === 10 ? parseDateAR(date) : date || getArgentinaDate(),
      observations,
      price: prod.price
    });

    res.json({ product: prod, movement });
  } catch (err) {
    console.error('POST /stock/shortage →', err);
    res.status(500).json({ error: 'Error al registrar faltante' });
  }
});

/* =========================================================
   POST /stock/transfer  (mudanza)
   ========================================================= */
router.post('/transfer', async (req, res) => {
  try {
    const { productId, quantity, origin, destination, observations = '', date } = req.body;

    const prod = await Producto.findById(productId);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    if (!SUCURSALES.includes(origin) || !SUCURSALES.includes(destination) || origin === destination)
      return res.status(400).json({ error: 'Origen o destino inválidos' });

    const disponible =
      (
        await Movimiento.aggregate([
          { $match: { productId: prod._id, branch: origin } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'add'] }, '$quantity', { $multiply: ['$quantity', -1] }]
                }
              }
            }
          }
        ])
      )[0]?.total || 0;

    if (disponible < quantity)
      return res.status(400).json({ error: `Stock insuficiente en ${origin}` });

    const movement = await Movimiento.create({
      productId,
      quantity,
      type: 'transfer',
      branch: origin,
      destination,
      date: date?.length === 10 ? parseDateAR(date) : date || getArgentinaDate(),
      observations,
      price: prod.price
    });

    res.json({ product: prod, movement });
  } catch (err) {
    console.error('POST /stock/transfer →', err);
    res.status(500).json({ error: 'Error al registrar la transferencia' });
  }
});

/* =========================================================
   GET /stock/movements
   ========================================================= */
router.get('/movements', async (_req, res) => {
  try {
    const movs = await Movimiento.find()
      .populate({
        path: 'productId',
        select: 'name price categoryId',
        populate: { path: 'categoryId', select: 'name' }
      })
      .populate('sellerId', 'name lastname')
      .sort({ date: -1 });

    res.json(
      movs.map(m => ({
        ...m.toObject(),
        date: m.date.toISOString()
      }))
    );
  } catch (err) {
    console.error('GET /stock/movements →', err);
    res.status(500).json({ error: 'Error al obtener los movimientos' });
  }
});

/* =========================================================
   GET /stock/movements/:id
   ========================================================= */
router.get('/movements/:id', async (req, res) => {
  try {
    const m = await Movimiento.findById(req.params.id)
      .populate('productId', 'name price')
      .populate('sellerId', 'name lastname')
      .populate('items.productId', 'name price');   // ← ★ NUEVO

    if (!m) return res.status(404).json({ error: 'Movimiento no encontrado' });

    res.json({ ...m.toObject(), date: formatDate(m.date) });
  } catch (err) {
    console.error('GET /stock/movements/:id →', err);
    res.status(500).json({ error: 'Error al obtener el movimiento' });
  }
});

// ================================================================
// DELETE /stock/movements/:id
// – ahora soporta ventas múltiples (items[]) sin arrojar “Producto no encontrado”
// ================================================================
router.delete('/movements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const movement = await Movimiento.findById(id);

    if (!movement) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    /* ──────────────────────────────────────────────
       1) DEVOLVER STOCK GLOBAL SEGÚN EL TIPO
       ────────────────────────────────────────────── */
    const isMulti = Array.isArray(movement.items) && movement.items.length > 0;

    if (movement.type === 'add') {
      // la carga se revierte restando
      await Producto.findByIdAndUpdate(
        movement.productId,
        { $inc: { stock: -movement.quantity } }
      );

    } else if (movement.type === 'shortage') {
      // faltante ⇒ se devuelve
      await Producto.findByIdAndUpdate(
        movement.productId,
        { $inc: { stock:  movement.quantity } }
      );

    } else if (movement.type === 'transfer') {
      // transferencia: el stock global NO cambia
      /* nada que hacer */

    } else if (movement.type === 'sell') {
      if (isMulti) {
        // 🛒 venta múltiple → devolver cada ítem
        for (const it of movement.items) {
          await Producto.findByIdAndUpdate(
            it.productId,
            { $inc: { stock: it.quantity } }
          );
        }
      } else {
        // 🛒 venta simple
        await Producto.findByIdAndUpdate(
          movement.productId,
          { $inc: { stock: movement.quantity } }
        );
      }
    }

    /* ──────────────────────────────────────────────
       2) ELIMINAR EL MOVIMIENTO
       ────────────────────────────────────────────── */
    await Movimiento.findByIdAndDelete(id);

    res.json({ message: 'Movimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    res.status(500).json({ error: 'Error al eliminar el movimiento' });
  }
});

/* =========================================================
   PUT /stock/movements/:id  (EDITAR CUALQUIER MOVIMIENTO)
   – Maneja: add | shortage | transfer | venta simple | venta múltiple
   – Devuelve updated movement
   ========================================================= */
router.put('/movements/:id', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const body = { ...req.body }; // clonamos

    const original = await Movimiento.findById(id);
    if (!original) return res.status(404).json({ error: 'Movimiento no encontrado' });

    /* ── 1. REVERTIR STOCK GLOBAL SEGÚN EL MOV ORIGINAL ── */
    const undoStock = async mov => {
      if (mov.type === 'sell') {
        if (mov.items?.length) {
          for (const it of mov.items) {
            await Producto.findByIdAndUpdate(it.productId, { $inc: { stock: it.quantity } });
          }
        } else {
          await Producto.findByIdAndUpdate(mov.productId, { $inc: { stock: mov.quantity } });
        }
      } else if (mov.type === 'add') {
        await Producto.findByIdAndUpdate(mov.productId, { $inc: { stock: -mov.quantity } });
      } else if (mov.type === 'shortage') {
        await Producto.findByIdAndUpdate(mov.productId, { $inc: { stock: mov.quantity } });
      }
      // transfer no modifica stock global
    };
    await undoStock(original);

    /* ── 2. VALIDAR / CALCULAR el NUEVO MOVIMIENTO ─────── */
    // ► venta múltiple
    if (Array.isArray(body.items) && body.items.length) {
      let total = 0;
      for (const it of body.items) {
        const prod = await Producto.findById(it.productId);
        if (!prod) return res.status(404).json({ error: `Producto ${it.productId} no existe` });
        if (prod.stock < it.quantity)
          return res.status(400).json({ error: `Stock global insuficiente para ${prod.name}` });
        prod.stock -= it.quantity;
        await prod.save();
        total += it.quantity * it.price;
      }
      body.total = total;
      body.type = 'sell';
    }
    // ► venta simple, add, shortage, transfer
    else if (body.productId && body.quantity) {
      const prod = await Producto.findById(body.productId);
      if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
      if (prod.stock < body.quantity)
        return res.status(400).json({ error: 'Stock global insuficiente' });
      prod.stock -= body.type === 'add' ? -body.quantity : body.quantity;
      await prod.save();
    }

    /* ── 3. normalizar FECHA ───────────────────────────── */
    if (body.date) {
      body.date =
        body.date.length === 10 ? parseDateAR(body.date) : new Date(body.date);
    }

    /* ── 4. ACTUALIZAR el movimiento ───────────────────── */
    const updated = await Movimiento.findByIdAndUpdate(id, body, { new: true });
    res.json(updated);
  } catch (err) {
    console.error('PUT /stock/movements/:id →', err);
    res.status(500).json({ error: 'Error al actualizar el movimiento' });
  }
});

/* =========================================================
   GET /stock  (stock consolidado por sucursal)
   ========================================================= */
router.get('/', async (_req, res) => {
  try {
    const productos = await Producto.find();
    const movimientos = await Movimiento.find();

    const stock = productos.map(p => {
      const stockByBranch = Object.fromEntries(SUCURSALES.map(b => [b, 0]));

      movimientos
        .filter(m => String(m.productId) === String(p._id))
        .forEach(m => {
          if (m.type === 'add') stockByBranch[m.branch] += m.quantity;
          else if (m.type === 'sell' || m.type === 'shortage')
            stockByBranch[m.branch] -= m.quantity;
          else if (m.type === 'transfer') {
            stockByBranch[m.branch] -= m.quantity;
            stockByBranch[m.destination] += m.quantity;
          }
        });

      return {
        _id: p._id,
        name: p.name,
        categoryId: p.categoryId,
        stock: p.stock,
        stockByBranch
      };
    });

    res.json(stock);
  } catch (err) {
    console.error('GET /stock →', err);
    res.status(500).json({ error: 'Error al obtener el stock' });
  }
});

export default router;
