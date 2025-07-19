#!/usr/bin/env node
/**
 * getIds.js
 * ------------------------------------------------------------------
 * Busca _id de Vendedoras y Productos y los imprime como CSV
 * (separador “;”, perfecto para pegar en Excel o Google Sheets).
 *
 * Requisitos:
 *   - Variable de entorno MONGODB_URI en .env
 *   - Models Producto.js y Vendedor.js ya existentes en tu proyecto
 *
 * Añadí / quitá nombres en los arrays «vendedoras» y «productos».
 * ------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
dotenv.config();

import Producto from '../src/models/Producto.js';
import Vendedor from '../src/models/Vendedor.js';

/* ───── LISTAS A CONSULTAR ───── */
const vendedoras = [
'Adriana Rolando',
'Agustina Yazmin Sandobal',
'Alejandra Soler',
'Andrea Alvarez',
'Andrea Giacobbe',
'Barbara Sanchez',
'Belen Davit',
'Carolina Lorca',
'Consumidor Final Santa Rosa',
'Diana Sonia Hernández',
'Estefania Villegas',
'Fabiana Schmidt',
'Giulana Paez',
'Iris Poullion',
'Lourdes Bender',
'Ludmila Rodriguez',
'Malvina Acosta',
'Marcela Otamendi',
'Marisol Toledo',
'Micaela Miszczuk',
'Nadia Bruzzone',
'Natalín Nievas',
'Noelia Aleman',
'Norma Pablos',
'Silvana Quarleri',
'Solana Alzugaray',
'Stefania Block',
'Verónica Spada'
];

const productos = [
'AROMATIZANTE - MULTIUSO    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'DIFUSOR - Env Plástico 115ml    GENERICO ',
'RINCON - Sahumerios    GENERICO ',
'TEXTIL - Sin gatillo 250ml    GENERICO ',
'TEXTIL - Sin gatillo 250ml    GENERICO ',
'AROMATIZANTE - MULTIUSO    GENERICO ',
'VELAS AROMÁTICAS - Roma Rosa    GENERICO ',
'SANITIZANTE  - Jabón Liquido    GENERICO ',
'TEXTIL - Con gatillo 250ml    GENERICO ',
'VELAS AROMÁTICAS - Frida     Marina',
'RINCON - Vela lata    GENERICO ',
'DIFUSOR - Env Plástico 115ml    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'AROMATIZANTE - MULTIUSO    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'SANITIZANTE  - Jabón Liquido    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'TEXTIL - Con gatillo 250ml    GENERICO ',
'DIFUSOR - Env Plástico 115ml    GENERICO ',
'AROMATIZANTE - MULTIUSO    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'DIFUSOR - Env Plástico 115ml    GENERICO ',
'RINCON - Sahumerios    GENERICO ',
'TEXTIL - Sin gatillo 250ml    GENERICO ',
'DIFUSOR - Env Plástico 250ml    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'DIFUSOR - Env Plástico 115ml    GENERICO ',
'TEXTIL - Con gatillo 500ml    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'DIFUSOR - Env Plástico 115ml    GENERICO ',
'DIFUSOR - Vidrio 125ml    GENERICO ',
'TEXTIL - Sin gatillo 250ml    GENERICO ',
'AROMATIZANTE - MULTIUSO    GENERICO ',
'DIFUSOR - Env Plástico 250ml    GENERICO ',
'TEXTIL - Sin gatillo 250ml    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'DIFUSOR - Env Plástico 115ml    GENERICO ',
'TEXTIL - Con gatillo 250ml    GENERICO ',
'TEXTIL - Sin gatillo 250ml    GENERICO ',
'DIFUSOR - Env Plástico 115ml    GENERICO ',
'TEXTIL - Con gatillo 250ml    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'TEXTIL - Con gatillo 250ml    GENERICO ',
'TEXTIL - Con gatillo 250ml    GENERICO ',
'TEXTIL - Sin gatillo 250ml    GENERICO ',
'RINCON - Sahumerios    GENERICO ',
'PROMOCION - Box Dia del Padre',
'DIFUSOR - Env Plástico 250ml    GENERICO ',
'RINCON - Sahumerios    GENERICO ',
'AROMATIZANTE - MULTIUSO - Repuesto    GENERICO ',
'DIFUSOR - Env Plástico 115ml    GENERICO ',
'DIFUSOR - Vidrio 125ml    GENERICO ',
'AROMATIZANTE - MULTIUSO    GENERICO ',
'RINCON - Piedras aromáticas     GENERICO ',
'TEXTIL - Sin gatillo 250ml    GENERICO ',
'TEXTIL - Sin gatillo 250ml    GENERICO ',
'VELA DE MOLDE - Gota    GENERICO '

];

/* ───── HELPERS ───── */
const findSellerId = async fullName => {
  if (/consumidor final/i.test(fullName)) return null;       // se maneja aparte
  const [name, ...rest] = fullName.trim().split(/\s+/);
  const v = await Vendedor.findOne({
    name:      name.toLowerCase(),
    lastname:  rest.join(' ').toLowerCase()
  });
  return v?._id || null;
};

const findProductId = async name => {
  const normal = name.replace(/\s+/g, ' ').trim();           // colapsa espacios
  const p = await Producto.findOne({ name: new RegExp(`^${normal}$`, 'i') });
  return p?._id || null;
};

/* ───── MAIN ───── */
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🗂  Vendedoras (nombre;id)');
  for (const n of vendedoras) {
    const id = await findSellerId(n);
    console.log(`${n};${id ?? 'NO ENCONTRADA'}`);
  }

  console.log('\n📦  Productos (nombre;id)');
  for (const n of productos) {
    const id = await findProductId(n);
    console.log(`${n};${id ?? 'NO ENCONTRADO'}`);
  }

  await mongoose.disconnect();
  process.exit(0);
})();
