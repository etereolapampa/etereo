// src/app.js (o el entry point de tu backend)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import verifyToken from './middleware/auth.js';
import mongoose from 'mongoose';

import authRouter from './routes/auth.js';
import categoriesRouter from './routes/categories.js';
import productsRouter from './routes/products.js';
import stockRouter from './routes/stock.js';
import sellersRouter from './routes/sellers.js';
import dataRouter from './routes/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 1000, // máximo 1000 requests por IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Configuración de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/BDEtereo';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Rutas
app.use('/auth', authRouter);
app.use('/categories', verifyToken, categoriesRouter);
app.use('/products', verifyToken, productsRouter);
app.use('/stock', verifyToken, stockRouter);
app.use('/sellers', verifyToken, sellersRouter);
app.use('/data', verifyToken, dataRouter);

app.get('/', (_, res) =>
  res.json({ message: 'Etereo API 🟢 funcionando con MongoDB' })
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`)
);
