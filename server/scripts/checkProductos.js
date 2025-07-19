#!/usr/bin/env node
/**
 * Verifica que cada nombre de producto del arreglo exista en la BD.
 * Resultado: imprime ✅ o ❌ (existe / no existe).
 *
 * Requisitos: npm i mongoose dotenv
 * Variable de entorno esperada: MONGODB_URI
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/* 1) Conexión ------------------------------------------------------------ */
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('❌ Falta MONGODB_URI en .env'); process.exit(1); }

await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 })
  .catch(err => { console.error('❌ Conexión fallida:', err); process.exit(1); });

/* 2) Modelo súper-simple (sólo “name”) ---------------------------------- */
const productSchema = new mongoose.Schema(
  { name: String },
  { collection: 'productos', strict: false }
);
const Producto = mongoose.model('Producto', productSchema);

/* 3) Lista a validar ----------------------------------------------------- */
/*  ─ Agregá tantas líneas como quieras ─  */
const productosParaChequear = [
'	AROMATIZANTE - MULTIUSO    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	DIFUSOR - Env Plástico 115ml    GENERICO 	',
'	RINCON - Sahumerios    GENERICO 	',
'	TEXTIL - Sin gatillo 250ml    GENERICO 	',
'	TEXTIL - Sin gatillo 250ml    GENERICO 	',
'	AROMATIZANTE - MULTIUSO    GENERICO 	',
'	VELAS AROMÁTICAS - Roma Rosa    GENERICO 	',
'	SANITIZANTE  - Jabón Liquido    GENERICO 	',
'	TEXTIL - Con gatillo 250ml    GENERICO 	',
'	VELAS AROMÁTICAS - Frida     Marina	',
'	RINCON - Vela lata    GENERICO 	',
'	DIFUSOR - Env Plástico 115ml    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	AROMATIZANTE - MULTIUSO    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	SANITIZANTE  - Jabón Liquido    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	TEXTIL - Con gatillo 250ml    GENERICO 	',
'	DIFUSOR - Env Plástico 115ml    GENERICO 	',
'	AROMATIZANTE - MULTIUSO    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	DIFUSOR - Env Plástico 115ml    GENERICO 	',
'	RINCON - Sahumerios    GENERICO 	',
'	TEXTIL - Sin gatillo 250ml    GENERICO 	',
'	DIFUSOR - Env Plástico 250ml    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	DIFUSOR - Env Plástico 115ml    GENERICO 	',
'	TEXTIL - Con gatillo 500ml    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	DIFUSOR - Env Plástico 115ml    GENERICO 	',
'	DIFUSOR - Vidrio 125ml    GENERICO 	',
'	TEXTIL - Sin gatillo 250ml    GENERICO 	',
'	AROMATIZANTE - MULTIUSO    GENERICO 	',
'	DIFUSOR - Env Plástico 250ml    GENERICO 	',
'	TEXTIL - Sin gatillo 250ml    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	DIFUSOR - Env Plástico 115ml    GENERICO 	',
'	TEXTIL - Con gatillo 250ml    GENERICO 	',
'	TEXTIL - Sin gatillo 250ml    GENERICO 	',
'	DIFUSOR - Env Plástico 115ml    GENERICO 	',
'	TEXTIL - Con gatillo 250ml    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	TEXTIL - Con gatillo 250ml    GENERICO 	',
'	TEXTIL - Con gatillo 250ml    GENERICO 	',
'	TEXTIL - Sin gatillo 250ml    GENERICO 	',
'	RINCON - Sahumerios    GENERICO 	',
'	PROMOCION - Box Dia del Padre	',
'	DIFUSOR - Env Plástico 250ml    GENERICO 	',
'	RINCON - Sahumerios    GENERICO 	',
'	AROMATIZANTE - MULTIUSO - Repuesto    GENERICO 	',
'	DIFUSOR - Env Plástico 115ml    GENERICO 	',
'	DIFUSOR - Vidrio 125ml    GENERICO 	',
'	AROMATIZANTE - MULTIUSO    GENERICO 	',
'	RINCON - Piedras aromáticas     GENERICO 	',
'	TEXTIL - Sin gatillo 250ml    GENERICO 	',
'	TEXTIL - Sin gatillo 250ml    GENERICO 	',
'	VELA DE MOLDE - Gota    GENERICO 	',
];

/* 4) Loop de verificación ------------------------------------------------ */
console.log('\n— Verificando nombres de producto —\n');
let ok = 0, missing = 0;

for (const [i, rawName] of productosParaChequear.entries()) {
  // Normaliza: colapsa espacios múltiples y recorta
  const nombre = rawName.replace(/\s+/g, ' ').trim();

  const existe = await Producto.exists({ name: new RegExp(`^${nombre}$`, 'i') });

  if (existe) { console.log(`✅ #${i + 1} «${nombre}» existe`); ok++; }
  else        { console.log(`❌ #${i + 1} «${nombre}» NO existe`); missing++; }
}

console.log(`\nResumen → encontrados: ${ok} | faltantes: ${missing}\n`);
await mongoose.disconnect();
process.exit(0);
