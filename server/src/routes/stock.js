// server/src/routes/stock.js
import express from 'express';
import mongoose from 'mongoose';

import Producto from '../models/Producto.js';
import Movimiento from '../models/Movimiento.js';
import Vendedor from '../models/Vendedor.js';
import { parseDateAR } from '../utils/date.js';

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

/* ╭──────────────────────────────────────────────╮
   │  DEPRECADO: adjustStock / adjustStockBulk     │
   │  Ahora el stock se calcula SIEMPRE de forma   │
   │  dinámica a partir de la totalidad de         │
   │  movimientos. Se dejan como referencia pero   │
   │  NO se usan más.                              │
   ╰──────────────────────────────────────────────╯ */
// eslint-disable-next-line no-unused-vars
const adjustStock = () => {};
// eslint-disable-next-line no-unused-vars
const adjustStockBulk = async () => {};

/* ╭──────────────────────────────────────────────╮
   │  Helpers de stock dinámico                   │
   ╰──────────────────────────────────────────────╯ */
const BRANCHES = ['Santa Rosa', 'Macachín'];

// Calcula el stock por sucursal para un producto dado, opcionalmente excluyendo un movimiento (para edición)
async function computeProductBranchStock(productId, { excludeMovementId } = {}) {
  const query = {
    $and: [
      {
        $or: [
          { productId: productId },
          { 'items.productId': productId }
        ]
      }
    ]
  };
  if (excludeMovementId) {
    query.$and.push({ _id: { $ne: excludeMovementId } });
  }

  const movs = await Movimiento.find(query, {
    type: 1,
    branch: 1,
    destination: 1,
    productId: 1,
    quantity: 1,
    items: 1
  }).lean();

  const byBranch = { 'Santa Rosa': 0, 'Macachín': 0 };

  for (const mov of movs) {
    const { type, branch, destination } = mov;
    const apply = (b, delta) => {
      if (!BRANCHES.includes(b)) return;
      byBranch[b] += delta;
    };

    if (type === 'add') {
      if (mov.productId?.toString() === productId.toString()) apply(branch, mov.quantity);
    } else if (type === 'shortage') {
      if (mov.productId?.toString() === productId.toString()) apply(branch, -mov.quantity);
    } else if (type === 'sell') {
      if (Array.isArray(mov.items) && mov.items.length) {
        for (const it of mov.items) {
          if (it.isDiscount) continue;
            if (it.productId?.toString() === productId.toString()) apply(branch, -it.quantity);
        }
      } else if (mov.productId?.toString() === productId.toString()) {
        apply(branch, -mov.quantity);
      }
    } else if (type === 'transfer') {
      if (mov.productId?.toString() === productId.toString()) {
        apply(branch, -mov.quantity);         // origen
        apply(destination, mov.quantity);     // destino
      }
    }
  }

  return {
    branches: byBranch,
    total: byBranch['Santa Rosa'] + byBranch['Macachín']
  };
}

// Caché en memoria para respuesta de stock dinámico
let STOCK_CACHE = { data: null, ts: 0 };
const STOCK_CACHE_TTL_MS = 15_000; // 15 segundos

// Cálculo optimizado de stock dinámico usando una sola agregación
async function computeAllDynamicStock() {
  const now = Date.now();
  if (STOCK_CACHE.data && (now - STOCK_CACHE.ts) < STOCK_CACHE_TTL_MS) {
    return STOCK_CACHE.data;
  }

  const productos = await Producto.find({}, { name: 1, categoryId: 1, price: 1 }).lean();

  // Movimientos relevantes (solo campos mínimos)
  const movimientos = await Movimiento.find({}, {
    type: 1,
    branch: 1,
    destination: 1,
    productId: 1,
    quantity: 1,
    items: 1
  }).lean();

  const base = new Map(); // productId -> { SR:0, MAC:0 }
  const ensure = (pid) => {
    const key = pid.toString();
    if (!base.has(key)) base.set(key, { 'Santa Rosa': 0, 'Macachín': 0 });
    return base.get(key);
  };

  for (const mov of movimientos) {
    const { type, branch, destination } = mov;
    if (type === 'sell' && Array.isArray(mov.items) && mov.items.length) {
      for (const it of mov.items) {
        if (it.isDiscount) continue;
        const st = ensure(it.productId);
        if (BRANCHES.includes(branch)) st[branch] -= it.quantity;
      }
      continue;
    }
    const pid = mov.productId;
    if (!pid) continue;
    const st = ensure(pid);
    if (type === 'add') {
      if (BRANCHES.includes(branch)) st[branch] += mov.quantity;
    } else if (type === 'shortage') {
      if (BRANCHES.includes(branch)) st[branch] -= mov.quantity;
    } else if (type === 'sell') {
      if (BRANCHES.includes(branch)) st[branch] -= mov.quantity;
    } else if (type === 'transfer') {
      if (BRANCHES.includes(branch)) st[branch] -= mov.quantity; // origen
      if (BRANCHES.includes(destination)) st[destination] += mov.quantity; // destino
    }
  }

  const out = productos.map(p => {
    const st = base.get(p._id.toString()) || { 'Santa Rosa': 0, 'Macachín': 0 };
    return {
      _id: p._id,
      name: p.name,
      categoryId: p.categoryId,
      price: p.price,
      stock: st['Santa Rosa'] + st['Macachín'],
      stockByBranch: {
        'Santa Rosa': st['Santa Rosa'],
        'Macachín': st['Macachín']
      }
    };
  });

  STOCK_CACHE = { data: out, ts: now };
  return out;
}

/* =========================================================
   POST /stock/add  (carga de stock)
   ========================================================= */
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity, branch, observations = '', date } = req.body;

    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || !branch)
      return res
        .status(400)
        .json({ error: 'productId, quantity (int>0) y branch son obligatorios' });

    const product = await Producto.findById(productId, { price: 1, name: 1 });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    // No se modifica el producto; sólo se registra el movimiento
    const movement = await Movimiento.create({
      productId,
      quantity,
      type: 'add',
      branch,
      date: date?.length === 10 ? parseDateAR(date) : date || getArgentinaDate(),
      observations,
      price: product.price
    });

    res.json({ movement });
  } catch (err) {
    console.error('POST /stock/add →', err);
    res.status(500).json({ error: 'Error al agregar stock' });
  }
});


// ─── helpers items ─────────────────────────────────────────
const validateItem = async (it) => {
  /* — Descuentos — */
  if (it.isDiscount) {
    if (!it.description?.trim()) throw 'Descuento sin descripción';
    if (typeof it.price !== 'number' || it.price >= 0)
      throw 'El precio del descuento debe ser NEGATIVO';
    if (it.quantity !== 1) throw 'El descuento lleva quantity = 1';
    return null;                               // no necesita más validación
  }

  /* — Ítems reales — */
  if (!mongoose.isValidObjectId(it.productId)) throw 'productId inválido';
  const prod = await Producto.findById(it.productId);
  if (!prod) throw `Producto ${it.productId} no encontrado`;
  if (typeof it.price !== 'number' || it.price <= 0)
    throw 'price inválido';
  if (!Number.isInteger(it.quantity) || it.quantity <= 0)
    throw 'quantity inválida';
  return prod;                                 // lo devolvemos para reutilizar
};
// ───────────────────────────────────────────────────────────




/* =========================================================
   POST /stock/sale  (venta simple o múltiple)
   ========================================================= */
router.post('/sale', async (req, res) => {
  try {
    /* ────────────── venta MÚLTIPLE ────────────── */
    if (Array.isArray(req.body.items) && req.body.items.length) {
      const { items, branch, sellerId, observations = '', date } = req.body;
      if (!branch) return res.status(400).json({ error: 'branch es obligatorio' });

      if (sellerId && !(await Vendedor.exists({ _id: sellerId })))
        return res.status(400).json({ error: 'Vendedor no encontrado' });

      /* — VALIDAR todos los ítems y separar descuentos — */
      let total = 0;
      for (const it of items) {
        const prod = await validateItem(it);        // ← lanza error si algo falla

        if (it.isDiscount) { // descuentos no afectan stock
          total += it.quantity * it.price;
          continue;
        }

        // Validación dinámica de stock por sucursal
        const dyn = await computeProductBranchStock(it.productId);
        const disponibleSucursal = dyn.branches[branch] || 0;
        if (disponibleSucursal < it.quantity)
          return res.status(400).json({ error: `Stock insuficiente en ${branch} para ${prod.name}` });

        total += it.quantity * it.price;
      }

      /* — crear movimiento — */
      const movement = await Movimiento.create({
        type: 'sell',
        branch,
        date: date?.length === 10 ? parseDateAR(date)
          : date || getArgentinaDate(),
        sellerId: sellerId || null,
        isFinalConsumer: !sellerId,
        items,
        total,
        observations
      });

      return res.json({ movement, total });
    }


    /* ────────────── venta SIMPLE ────────────── */
    let {
      productId,
      quantity,
      price,
      total,
      branch,
      sellerId,
      observations = '',
      date
    } = req.body;

  const prod = await Producto.findById(productId, { price: 1, name: 1 });
  if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    if (!branch) return res.status(400).json({ error: 'branch es obligatorio' });
    if (!Number.isInteger(quantity) || quantity <= 0)
      return res.status(400).json({ error: 'quantity (int>0) es obligatorio' });
    if (!price || price <= 0) return res.status(400).json({ error: 'price > 0 obligatorio' });
    if (!total || total <= 0) return res.status(400).json({ error: 'total > 0 obligatorio' });

    if (sellerId && !(await Vendedor.exists({ _id: sellerId })))
      return res.status(400).json({ error: 'Vendedor no encontrado' });

    // Validación dinámica sucursal
    const dyn = await computeProductBranchStock(productId);
    const disponibleSucursal = dyn.branches[branch] || 0;
    if (disponibleSucursal < quantity)
      return res.status(400).json({ error: `Stock insuficiente en ${branch}` });

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

  res.json({ movement });
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

    const prod = await Producto.findById(productId, { price: 1, name: 1 });
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    const dyn = await computeProductBranchStock(productId);
    const disponible = dyn.branches[branch] || 0;
    if (disponible < quantity)
      return res.status(400).json({
        error: `Stock insuficiente en ${branch}. Disponible: ${disponible}, Solicitado: ${quantity}`
      });

    const movement = await Movimiento.create({
      productId,
      quantity,
      type: 'shortage',
      branch,
      date: date?.length === 10 ? parseDateAR(date) : date || getArgentinaDate(),
      observations,
      price: prod.price
    });

    res.json({ movement });
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

  const prod = await Producto.findById(productId, { price: 1, name: 1 });
  if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    if (!SUCURSALES.includes(origin) || !SUCURSALES.includes(destination) || origin === destination)
      return res.status(400).json({ error: 'Origen o destino inválidos' });

    const dyn = await computeProductBranchStock(productId);
    const disponible = dyn.branches[origin] || 0;
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

  res.json({ movement });
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
      // Importante: incluir bonus para cálculo de comisión
  .populate('sellerId', 'name lastname bonus isDeleted deletedAt')
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
      .populate('items.productId', 'name price'); // ← ★ NUEVO

    if (!m) return res.status(404).json({ error: 'Movimiento no encontrado' });

    res.json({ ...m.toObject(), date: formatDate(m.date) });
  } catch (err) {
    console.error('GET /stock/movements/:id →', err);
    res.status(500).json({ error: 'Error al obtener el movimiento' });
  }
});

/* ================================================================
   DELETE /stock/movements/:id
   ================================================================ */
router.delete('/movements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const movement = await Movimiento.findById(id);
    if (!movement) return res.status(404).json({ error: 'Movimiento no encontrado' });
    await Movimiento.findByIdAndDelete(id);
    res.json({ message: 'Movimiento eliminado (stock dinámico, no se revierte counters)' });
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    res.status(500).json({ error: 'Error al eliminar el movimiento' });
  }
});

/* =========================================================
   PUT /stock/movements/:id (EDITAR)
   ========================================================= */
router.put('/movements/:id', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const body = { ...req.body };
    const original = await Movimiento.findById(id);
    if (!original) return res.status(404).json({ error: 'Movimiento no encontrado' });

    if (Array.isArray(body.items) && body.items.length) {
      let total = 0;
      for (const it of body.items) {
        if (it.isDiscount) { total += it.quantity * it.price; continue; }
        const prod = await Producto.findById(it.productId, { name: 1 });
        if (!prod) return res.status(404).json({ error: `Producto ${it.productId} no existe` });
        const dyn = await computeProductBranchStock(it.productId, { excludeMovementId: original._id });
        const disponible = dyn.branches[body.branch] || 0;
        if (disponible < it.quantity)
          return res.status(400).json({ error: `Stock insuficiente para ${prod.name} en ${body.branch}` });
        total += it.quantity * it.price;
      }
      body.total = total;
      body.type = 'sell';
    } else if (body.productId && body.quantity) {
      const prod = await Producto.findById(body.productId, { name: 1 });
      if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
      const dyn = await computeProductBranchStock(body.productId, { excludeMovementId: original._id });
      const disponible = dyn.branches[body.branch] || 0;
      let needed = body.quantity;
      if (body.type === 'add') {
        // siempre permitido
      } else if (body.type === 'shortage' || body.type === 'sell') {
        if (disponible < needed)
          return res.status(400).json({ error: `Stock insuficiente en ${body.branch}` });
      } else if (body.type === 'transfer') {
        if (disponible < needed)
          return res.status(400).json({ error: `Stock insuficiente (transfer) en ${body.branch}` });
      }
    }

    if (body.date) body.date = body.date.length === 10 ? parseDateAR(body.date) : new Date(body.date);

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
    const dynamic = await computeAllDynamicStock();
    res.json(dynamic);
  } catch (err) {
    console.error('GET /stock →', err);
    res.status(500).json({ error: 'Error al obtener el stock dinámico' });
  }
});

/* ────────────────────────────────────────────────────────────
   Helper: dibuja texto con salto de línea automático
───────────────────────────────────────────────────────────── */
function wrapText(ctx, text, x, y, maxWidth) {
  const words = text.split(' ');
  let line = '';

  words.forEach((w, i) => {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line.trimEnd(), x, y);
      y += 22;                       // alto de línea
      line = w + ' ';
    } else {
      line = test;
    }
  });

  ctx.fillText(line.trimEnd(), x, y);
  return y;                          // y de la última línea escrita
}

// util para resolver ruta absoluta
const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '../../assets/LogoEtereo.jpg');

/* lo cargamos UNA sola vez al iniciar el servidor */
const logoPromise = loadImage(LOGO_PATH).catch(err => {
  console.error('No se pudo cargar el logo:', err);
  return null;                       // así evitamos reventar todo
});

router.get('/movements/:id/receipt.png', async (req, res) => {
  try {
    /* ═════════ 1) DATOS ═════════ */
    const mov = await Movimiento.findById(req.params.id)
      .populate('productId')
      .populate('sellerId')
      .populate('items.productId');

    if (!mov)
      return res.status(404).json({ error: 'Movimiento no encontrado' });

    const rows = mov.items?.length
      ? mov.items
      : [{ productId: mov.productId, quantity: mov.quantity, price: mov.price }];

    for (const r of rows) {

      /* ─── Descuento ─────────────────────────── */
      if (r.isDiscount) {
        // aparece como línea aparte (sin producto real)
        r._prod = { name: `Descuento: ${r.description || ''}` };
        r.quantity = 1;
        r._subtotal = r.price;            // ya viene NEGATIVO
        continue;                         // salteamos búsqueda en BD
      }

      /* ─── Producto ─────────────────────────── */
      r._prod = r.productId?.name
        ? r.productId                     // venía populateado
        : await Producto.findById(r.productId);

      const unit = r.price ?? r._prod?.price ?? 0;
      r.price = unit;
      r._subtotal = unit * r.quantity;
    }

    /* ═════════ 2) LAYOUT ═════════ */
    const P = 40, W = 650, HEADER_H = 70, FOOTER = 60; // Ancho aumentado de 600 a 650
    const NAME_W = 280, COL_QTY = P + NAME_W + 40;     // Nombre más angosto, qty más cerca
    const COL_UNIT = COL_QTY + 80, COL_SUBT = W - P - 10; // Más espacio para subtotal

    /* simple wrap de texto */
    const wrap = (ctx, txt, maxW) => {
      const words = txt.split(' ');
      let line = '', lines = [];
      words.forEach(w => {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxW) {
          lines.push(line); line = w;
        } else line = test;
      });
      if (line) lines.push(line);
      return lines;
    };

    /* cuántas líneas usan los productos */
    const meas = createCanvas(1, 1).getContext('2d');
    meas.font = '14px Arial';
    const prodLines = rows.reduce(
      (s, r) => s + wrap(meas, r._prod.name, NAME_W).length, 0
    );

    // Cálculo más detallado de altura para evitar cortes
    const detailHeight = prodLines * 22 + 60; // Productos + margen
    const totalsHeight = 150 + (mov.sellerId?.bonus ? 24 : 0); // Más espacio para totales
    const H = HEADER_H + 110 + detailHeight + totalsHeight + FOOTER + 80; // +80 margen extra
    
    console.log('RECEIPT DEBUG:', {
      HEADER_H,
      prodLines,
      detailHeight,
      totalsHeight,
      FOOTER,
      totalHeight: H,
      itemsCount: rows.length
    });

    /* ═════════ 3) CANVAS ═════════ */
    const c = createCanvas(W, H);
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#212529'; ctx.fillRect(0, 0, W, HEADER_H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center'; ctx.fillText('Comprobante', W / 2, 45);

    /* Marca de agua */
    const logo = await logoPromise;
    if (logo) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, HEADER_H, W, H - HEADER_H); ctx.clip();
      const wmW = Math.min(W * 0.8, 2000);
      const wmH = wmW / (logo.width / logo.height);
      ctx.globalAlpha = 0.08;
      ctx.drawImage(logo, (W - wmW) / 2, (H - wmH) / 2, wmW, wmH);
      ctx.restore();
    }

    /* ═════════ 4) ENCABEZADO ═════════ */
    ctx.textAlign = 'left'; ctx.fillStyle = '#000'; ctx.font = '14px Arial';
    let y = HEADER_H + 40;
    const fld = (l, v) => {
      ctx.font = 'bold 14px Arial'; ctx.fillText(l, P, y);
      ctx.font = '14px Arial'; ctx.fillText(v, P + 140, y);
      y += 24;
    };
    const tipoES = { add: 'Carga', sell: 'Venta', transfer: 'Mudanza', shortage: 'Faltante' }[mov.type];
    fld('Fecha:', format(mov.date, 'dd/MM/yyyy', { locale: es }));
    fld('Tipo:', tipoES);
    fld('Sucursal:', mov.branch || mov.origin);
    if (mov.destination) fld('Destino:', mov.destination);
    if (mov.sellerId) fld('Vendedora:', `${mov.sellerId.name} ${mov.sellerId.lastname}`);

    ctx.strokeStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W - P, y); ctx.stroke();
    y += 30;

    /* ═════════ 5) DETALLE ═════════ */
    ctx.font = 'bold 14px Arial'; ctx.fillText('Detalle', P, y); y += 26;
    ctx.font = '14px Arial';

    rows.forEach(r => {
      const lines = wrap(ctx, r._prod.name, NAME_W);
      lines.forEach((ln, i) => ctx.fillText((i ? '  ' : '• ') + ln, P, y + i * 22));
      ctx.textAlign = 'right';
      ctx.fillText(`${r.quantity} u.`, COL_QTY, y);
      ctx.fillText(`$${r.price.toFixed(2)}`, COL_UNIT, y);
      ctx.fillText(`$${r._subtotal.toFixed(2)}`, COL_SUBT, y);
      ctx.textAlign = 'left';
      y += lines.length * 22;
    });

    ctx.beginPath(); ctx.moveTo(P, y + 6); ctx.lineTo(W - P, y + 6); ctx.stroke();
    y += 34;

    /* ═════════ 6) TOTALES ═════════ */
    const unidades = rows.reduce((s, r) => s + r.quantity, 0);
    const bruto = rows.reduce((s, r) => s + r._subtotal, 0);
    const pct = mov.sellerId?.bonus || 0;
    const comision = bruto * pct / 100;
    const neto = bruto - comision;

    const totalLn = (l, v, col = COL_SUBT) => {
      ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.fillText(l, P, y);
      ctx.textAlign = 'right'; ctx.fillText(v, col, y); y += 24;
    };

    totalLn('Total unidades:', `${unidades} u.`, COL_QTY);
    y += 10;
    totalLn('Total bruto:', `$${bruto.toFixed(2)}`);
    if (pct) totalLn(`Comisión (${pct}%):`, `-$${comision.toFixed(2)}`);
    ctx.beginPath(); ctx.moveTo(P, y + 3); ctx.lineTo(W - P, y + 3); ctx.stroke();
    y += 31;
    totalLn('Total neto:', `$${neto.toFixed(2)}`);
    
    console.log('RECEIPT DEBUG - Final Y position:', y, 'Canvas height:', H, 'Remaining space:', H - y);

    /* ═════════ 7) OBSERVACIONES (DESHABILITADO) ═════════ */
    // Comentado por pedido del cliente
    // if (mov.observations) {
    //   y += 24;
    //   ctx.font = 'italic 13px Arial'; ctx.textAlign = 'left';
    //   ctx.fillText(`Obs.: ${mov.observations}`, P, y);
    // }

    /* ═════════ 8) SALIDA ═════════ */
    const png = await c.encode('png');     // con node‑canvas → c.toBuffer('image/png')
    res.type('png').send(png);

  } catch (err) {
    console.error('❌  /movements/:id/receipt.png →', err);
    res.status(500).json({ error: 'Error generando el comprobante' });
  }
});
/* ───────────────── Fin endpoint recibo ───────────────── */




export default router;
