// server/src/routes/stock.js
import express from 'express';
import mongoose from 'mongoose';

import Producto from '../models/Producto.js';
import Movimiento from '../models/Movimiento.js';
import Vendedor from '../models/Vendedor.js';
import { parseDateAR } from '../utils/date.js';

import { createCanvas, loadImage } from '@napi-rs/canvas';
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
        { $inc: { stock: movement.quantity } }
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

router.get('/movements/:id/receipt.png', async (req, res) => {
  /* ═════════════════════ 1) DATOS ═════════════════════ */
  const mov = await Movimiento.findById(req.params.id)
    .populate('productId')
    .populate('sellerId')
    .populate('items.productId');

  if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });

  // Normalizar filas ── (venta múltiple o movimiento simple)
  const rows = mov.items?.length
    ? mov.items
    : [{ productId: mov.productId, quantity: mov.quantity, price: mov.price }];

  for (const r of rows) {
    /* producto completo (populate o 2ª query) */
    r._prod = r.productId?.name
      ? r.productId
      : await Producto.findById(r.productId);

    /* precio unitario:  r.price (si lo trae)  ↔  fallback al del producto */
    const unitPrice  = r.price ?? r._prod?.price ?? null;
    r.price          = unitPrice;                 // lo reutilizamos después
    r._subtotal      = (unitPrice ?? 0) * r.quantity;
  }

  const unidades   = rows.reduce((s, r) => s + Number(r.quantity), 0);
  const tipoES     = { add: 'Carga', sell: 'Venta', transfer: 'Mudanza', shortage: 'Faltante' }[mov.type];

  /* ═════════════════════ 2) LAYOUT ═════════════════════ */
  const P         = 40;         // margen horizontal
  const W         = 600;        // ancho total
  const FOOTER    = 60;         // margen inferior adicional

  /* columnas fijas — achicamos la de “Detalle” (NAME_W) */
  const NAME_W    = 300;                      // ← si se superpone, bajar un poco más
  const COL_QTY   = P + NAME_W + 50;          // unidades
  const COL_PUNIT = COL_QTY + 70;             // precio unit.
  const COL_SUBT  = W - P;                    // subtotal

  /* función wrap de texto para nombre de producto */
  const textLines = (ctx, txt, maxW) => {
    const words = txt.split(' ');
    const lines = [];
    let w = '';
    words.forEach(word => {
      const test = w ? `${w} ${word}` : word;
      if (ctx.measureText(test).width > maxW) {
        lines.push(w);
        w = word;
      } else {
        w = test;
      }
    });
    if (w) lines.push(w);
    return lines;
  };

  /* alto dinámico  (22 px por línea de producto) */
  const headerLines = 3 + (mov.destination ? 1 : 0) + (mov.sellerId ? 1 : 0);
  const bonusLine   = mov.sellerId?.bonus ? 1 : 0;
  const obsLine     = mov.observations   ? 1 : 0;

  const prodLines   = (() => {
    // suma las líneas que ocupa cada nombre envuelto
    // necesitamos un ctx temporal solo para el cálculo
    const tmp = createCanvas(1,1).getContext('2d');
    tmp.font = '14px Arial';
    return rows.reduce((s,r)=> s + textLines(tmp,r._prod.name,NAME_W).length, 0);
  })();

  const H = 110 + headerLines*24 +
            30  + 26            +               // separador + “Detalle”
            prodLines*22         +
            6   + 28 +                            // separador detalle
            (24 + 10 + 24) + bonusLine*24 +       // totales brutos + comisión
            3 + 28 + 24           +               // separador + neto
            obsLine * 24 +
            FOOTER;

  /* ═════════════════════ 3) CANVAS ═════════════════════ */
  const c   = createCanvas(W, H);
  const ctx = c.getContext('2d');

  /* ── fondo + cabecera visual ── */
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#212529'; ctx.fillRect(0, 0, W, 70);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center'; ctx.fillText('Comprobante', W/2, 45);

  /* ═════════════════════ 4) ENCABEZADO ═════════════════ */
  ctx.textAlign = 'left'; ctx.fillStyle = '#000'; ctx.font = '14px Arial';
  let y = 110;
  const line = (lbl,val) => { ctx.font='bold 14px Arial'; ctx.fillText(lbl,P,y);
                              ctx.font='14px Arial';      ctx.fillText(val,P+140,y);
                              y+=24; };
  line('Fecha:',    format(mov.date,'dd/MM/yyyy',{ locale: es }));
  line('Tipo:',     tipoES);
  line('Sucursal:', mov.branch || mov.origin);
  if (mov.destination) line('Destino:', mov.destination);
  if (mov.sellerId)    line('Vendedora:', `${mov.sellerId.name} ${mov.sellerId.lastname}`);

  ctx.strokeStyle='#ccc'; ctx.beginPath(); ctx.moveTo(P,y); ctx.lineTo(W-P,y); ctx.stroke();
  y+=30;

  /* ═════════════════════ 5) DETALLE ════════════════════ */
  ctx.font='bold 14px Arial'; ctx.fillText('Detalle',P,y); y+=26;

  ctx.font='14px Arial';

  rows.forEach(r=>{
    const lines = textLines(ctx,r._prod.name,NAME_W);
    ctx.textAlign='left';
    lines.forEach((ln,i)=> {
      ctx.fillText(i===0?`• ${ln}`:`  ${ln}`,P,y+i*22);
    });

    ctx.textAlign='right';
    ctx.fillText(`${r.quantity} u.`,        COL_QTY,  y);
    const unitPrice = r.price;
    ctx.fillText(
      unitPrice!==null ? `$${unitPrice.toFixed(2)}` : '—',
      COL_PUNIT, y
    );
    ctx.fillText(
      unitPrice!==null ? `$${r._subtotal.toFixed(2)}` : '—',
      COL_SUBT,  y
    );

    y += lines.length*22;
  });

  ctx.textAlign='left'; y+=6;
  ctx.beginPath(); ctx.moveTo(P,y); ctx.lineTo(W-P,y); ctx.stroke();
  y+=28;

  /* ═════════════════════ 6) TOTALES ════════════════════ */
  const bonusPct   = mov.sellerId?.bonus || 0;
  const totalBruto = mov.total ?? rows.reduce((s,r)=>s+r._subtotal,0);
  const comision   = totalBruto * bonusPct / 100;
  const neto       = totalBruto - comision;

  const totalLine = (lbl,val,col=COL_SUBT)=>{
    ctx.font='bold 14px Arial'; ctx.textAlign='left'; ctx.fillText(lbl,P,y);
    ctx.textAlign='right';      ctx.fillText(val,col,y); y+=24;
  };

  totalLine('Total unidades:', `${unidades} u.`, COL_QTY);
  y+=10;
  totalLine('Total bruto:', `$${totalBruto.toFixed(2)}`);

  if (bonusPct){
    totalLine(`Comisión (${bonusPct}%):`, `-$${comision.toFixed(2)}`);
  }

  y+=3; ctx.beginPath(); ctx.moveTo(P,y); ctx.lineTo(W-P,y); ctx.stroke();
  y+=28;
  totalLine('Total neto:', `$${neto.toFixed(2)}`);

  /* ═════════════════════ 7) OBSERVACIONES ═══════════════ */
  if (mov.observations){
    y+=24;
    ctx.font='italic 13px Arial'; ctx.textAlign='left';
    ctx.fillText(`Obs.: ${mov.observations}`,P,y);
  }

  /* ═════════════════════ 8) RESPUESTA ═══════════════════ */
  const png = await c.encode('png');
  res.setHeader('Content-Type','image/png');
  res.setHeader('Content-Disposition',`attachment; filename=comprobante_${mov._id}.png`);
  res.end(Buffer.from(png));
});




export default router;
