#!/usr/bin/env node
/**
 * Valida que los nombres (nombre + apellido juntos) suministrados
 * existan en la colección `vendedores`.
 *
 * ▸ No modifica la base.
 * ▸ No crea modelos nuevos.
 * ▸ Toma los docs existentes, concatena name + lastName y arma
 *   dos variantes:  "Nombre Apellido"  y  "Apellido Nombre".
 *
 * Salida:
 *   ✓ OK          | coincidió
 *   ⚠️ NO EXISTE   | no se encontró
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
dotenv.config();

/* ───────── 1) Conexión ───────── */
await mongoose.connect(process.env.MONGODB_URI)
              .catch(err => { console.error('❌ Conexión fallida:', err); process.exit(1); });

/* ───────── 2) Traer modelos ya definidos ───────── */
import '../src/models/Vendedor.js';          // ajustá según tu estructura
const Vendedor = mongoose.model('Vendedor'); // usa el nombre real del modelo

/* ───────── 3) Lista de nombres a verificar ───────── */
const nombresEntrada = [
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

/* ───────── 4) Preparo las “llaves” de búsqueda ───────── */
const normalizar = str =>
  str
    .toLowerCase()
    .normalize('NFD')                // quita tildes
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const docs = await Vendedor.find({}, { name: 1, lastname: 1 }).lean();

/* Creo un Set con todas las combinaciones posibles */
const setFullnames = new Set();

for (const { name = '', lastname = '' } of docs) {
  const n = name.trim();
  const l = lastname.trim();

  if (!n && !l) continue;          // omitir registros vacíos

  setFullnames.add(normalizar(`${n} ${l}`)); // Nombre Apellido
  setFullnames.add(normalizar(`${l} ${n}`)); // Apellido Nombre
}

/* ───────── 5) Validación ───────── */
console.log('\n— Validando vendedoras (fullname) —');

let ok = 0, ko = 0;

for (const raw of nombresEntrada) {
  const candidato = normalizar(raw);
  if (setFullnames.has(candidato)) {
    console.log(`✓  OK          | ${raw}`);
    ok++;
  } else {
    console.warn(`⚠️  NO EXISTE   | ${raw}`);
    ko++;
  }
}

console.log(`\n⏹  Resumen → encontradas: ${ok} | faltantes: ${ko}`);
await mongoose.disconnect();
process.exit(0);
