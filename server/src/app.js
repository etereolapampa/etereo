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
import localitiesRouter from './routes/localities.js';


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

// Configuración de conexión a MongoDB (arranque diferido)
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no definido en variables de entorno (.env)');
  process.exit(1);
}

// Sanitizar para log (ocultar credenciales)
const redactUri = uri => {
  try {
    const u = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    return `${u.protocol.startsWith('https') ? 'mongodb+srv://' : 'mongodb://'}${u.host}${u.pathname}`;
  } catch {
    return 'URI no parseable';
  }
};

mongoose.connection.on('connected', () => console.log('✅ MongoDB conectado')); 
mongoose.connection.on('error', err => console.error('❌ MongoDB error:', err.message));
mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB desconectado'));

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 Conexión Mongo cerrada por SIGINT');
  process.exit(0);
});

async function start() {
  console.log('Intentando conectar a MongoDB:', redactUri(MONGODB_URI));
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      // useUnifiedTopology / useNewUrlParser ya no necesarios en Mongoose >=6
      retryWrites: true
    });
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`🚀 Servidor escuchando en puerto ${PORT}`));
  } catch (err) {
    console.error('❌ No se pudo establecer conexión con MongoDB:', err.message);
    console.error('Reintentando en 5s...');
    setTimeout(start, 5000);
  }
}

start();

// Rutas
app.use('/auth', authRouter);
app.use('/categories', verifyToken, categoriesRouter);
app.use('/products', verifyToken, productsRouter);
app.use('/stock', verifyToken, stockRouter);
app.use('/sellers', verifyToken, sellersRouter);
app.use('/data', verifyToken, dataRouter);
app.use('/localities', verifyToken, localitiesRouter);


app.get('/', (_, res) =>
  res.json({ message: 'Etereo API 🟢 funcionando con MongoDB' })
);

// Nota: el listen ahora se ejecuta dentro de start() tras conectar.
