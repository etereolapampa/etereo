// server/src/routes/sellers.js
import express from 'express';
import Vendedor from '../models/Vendedor.js';
const router = express.Router();

// Listar sellers (por defecto solo activos).
// NOTA: documentos antiguos podrían no tener el campo isDeleted; los incluimos también.
router.get('/', async (req, res) => {
  try {
    const { includeDeleted } = req.query;
    let filter = {};
    if (!includeDeleted) {
      filter = { $or: [ { isDeleted: false }, { isDeleted: { $exists: false } } ] };
    }
    const vendedores = await Vendedor.find(filter).populate('city');
    res.json(vendedores);
  } catch (error) {
    console.error('Error al obtener vendedores:', error);
    res.status(500).json({ error: 'Error al obtener los vendedores' });
  }
});

// Obtener un seller por ID
router.get('/:id', async (req, res) => {
  try {
    const vendedor = await Vendedor.findById(req.params.id).populate('city');
    if (!vendedor) return res.status(404).json({ error: 'Seller no encontrado' });
    res.json(vendedor);
  } catch (error) {
    console.error('Error al obtener vendedor:', error);
    res.status(500).json({ error: 'Error al obtener el vendedor' });
  }
});

// Crear nuevo seller
router.post('/', async (req, res) => {
  try {
    const { name, lastname, dni, city, phone, bonus, email } = req.body;
    if (!name || !lastname || !dni || !city || !phone) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const newVendedor = new Vendedor({
      name,
      lastname,
      dni,
      city,
      phone: Number(phone),
      bonus: Number(bonus) || 0,
      email
    });

    await newVendedor.save();
    res.status(201).json(newVendedor);
  } catch (error) {
    console.error('Error al crear vendedor:', error);
    res.status(500).json({ error: 'Error al crear el vendedor' });
  }
});

// Modificar seller
router.put('/:id', async (req, res) => {
  try {
    const { name, lastname, dni, city, phone, bonus, email } = req.body;
    if (!name || !lastname || !dni || !city || !phone) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const vendedor = await Vendedor.findByIdAndUpdate(
      req.params.id,
      {
        name,
        lastname,
        dni,
        city,
        phone: Number(phone),
        bonus: Number(bonus) || 0,
        email                       // 👈  añadido
      },
      { new: true }
    );

if (!vendedor) return res.status(404).json({ error: 'Seller no encontrado' });
res.json(vendedor);
  } catch (error) {
  console.error('Error al actualizar vendedor:', error);
  res.status(500).json({ error: 'Error al actualizar el vendedor' });
}
});

// Soft delete seller
router.delete('/:id', async (req, res) => {
  try {
    const vendedor = await Vendedor.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!vendedor) return res.status(404).json({ error: 'Seller no encontrado' });
    res.json(vendedor);
  } catch (error) {
    console.error('Error al eliminar (soft) vendedor:', error);
    res.status(500).json({ error: 'Error al eliminar el vendedor' });
  }
});

// Restaurar seller eliminado
router.put('/:id/restore', async (req, res) => {
  try {
    const vendedor = await Vendedor.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!vendedor) return res.status(404).json({ error: 'Seller no encontrado' });
    res.json(vendedor);
  } catch (error) {
    console.error('Error al restaurar vendedor:', error);
    res.status(500).json({ error: 'Error al restaurar el vendedor' });
  }
});

export default router;
