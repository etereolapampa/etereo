// server/tools/addInitialStockMovements.js
import dotenv     from 'dotenv';
import mongoose   from 'mongoose';
import Producto   from '../src/models/Producto.js';
import Movimiento from '../src/models/Movimiento.js';

dotenv.config();

/* =========================================================
   1) CONEXIÓN
   ========================================================= */
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌  Falta MONGODB_URI en el .env');
  process.exit(1);
}
await mongoose.connect(uri);
console.log('✅  MongoDB conectado');

/* =========================================================
   2) Pega tu TXT completo debajo de RAW
   ─ Formato:  PRODUCTO<TAB>MACACHÍN<TAB>SANTA ROSA<TAB>TOTAL
   ========================================================= */
const RAW = `
AROMATIZANTE - MULTIUSO    AMADERADO Tíbet\t14\t15\t29
AROMATIZANTE - MULTIUSO    AMADERADO Vainicoco\t11\t12\t23
AROMATIZANTE - MULTIUSO    FLORAL Lavanda\t11\t12\t23
AROMATIZANTE - MULTIUSO    FRUTAL Cítrica\t16\t15\t31
AROMATIZANTE - MULTIUSO    FRUTAL Pera, pepino y manzana\t12\t15\t27
AROMATIZANTE - MULTIUSO    GENERICO \t0\t0\t0
AROMATIZANTE - MULTIUSO - Repuesto    AMADERADO Tíbet\t13\t15\t28
AROMATIZANTE - MULTIUSO - Repuesto    AMADERADO Vainicoco\t13\t12\t25
AROMATIZANTE - MULTIUSO - Repuesto    FLORAL Lavanda\t16\t12\t28
AROMATIZANTE - MULTIUSO - Repuesto    FRUTAL Cítrica\t21\t15\t36
AROMATIZANTE - MULTIUSO - Repuesto    FRUTAL Pera, pepino y manzana\t2\t15\t17
AROMATIZANTE - MULTIUSO - Repuesto    GENERICO \t0\t0\t0
DIFUSOR - Env Cuadrado 200ml    AMADERADO Bombón suizo\t0\t0\t0
DIFUSOR - Env Cuadrado 200ml    AMADERADO Tíbet\t0\t0\t0
DIFUSOR - Env Cuadrado 200ml    AMADERADO Vainicoco\t2\t0\t2
DIFUSOR - Env Cuadrado 200ml    FLORAL Lavanda\t0\t1\t1
DIFUSOR - Env Cuadrado 200ml    FLORAL Pear glacé\t0\t1\t1
DIFUSOR - Env Cuadrado 200ml    FLORAL Petit enfant\t0\t1\t1
DIFUSOR - Env Cuadrado 200ml    FRUTAL Chicle globo\t0\t0\t0
DIFUSOR - Env Cuadrado 200ml    FRUTAL Cítrica\t0\t0\t0
DIFUSOR - Env Cuadrado 200ml    FRUTAL Frambuesa\t0\t0\t0
DIFUSOR - Env Cuadrado 200ml    FRUTAL Limón y jengibre\t0\t0\t0
DIFUSOR - Env Cuadrado 200ml    FRUTAL Mora y frambuesa\t0\t0\t0
DIFUSOR - Env Cuadrado 200ml    FRUTAL Naranja y pimienta\t0\t0\t0
DIFUSOR - Env Cuadrado 200ml    FRUTAL Pera, pepino y manzana\t0\t1\t1
DIFUSOR - Env Cuadrado 200ml    GENERICO \t0\t0\t0
DIFUSOR - Env Labrado 100ml    AMADERADO Bombón suizo\t0\t0\t0
DIFUSOR - Env Labrado 100ml    AMADERADO Tíbet\t0\t1\t1
DIFUSOR - Env Labrado 100ml    AMADERADO Vainicoco\t0\t0\t0
DIFUSOR - Env Labrado 100ml    FLORAL Lavanda\t2\t1\t3
DIFUSOR - Env Labrado 100ml    FLORAL Pear glacé\t0\t1\t1
DIFUSOR - Env Labrado 100ml    FLORAL Petit enfant\t0\t1\t1
DIFUSOR - Env Labrado 100ml    FRUTAL Chicle globo\t0\t1\t1
DIFUSOR - Env Labrado 100ml    FRUTAL Cítrica\t0\t0\t0
DIFUSOR - Env Labrado 100ml    FRUTAL Frambuesa\t0\t1\t1
DIFUSOR - Env Labrado 100ml    FRUTAL Limón y jengibre\t1\t1\t2
DIFUSOR - Env Labrado 100ml    FRUTAL Mora y frambuesa\t2\t1\t3
DIFUSOR - Env Labrado 100ml    FRUTAL Naranja y pimienta\t0\t0\t0
DIFUSOR - Env Labrado 100ml    FRUTAL Pera, pepino y manzana\t0\t1\t1
DIFUSOR - Env Labrado 100ml    GENERICO \t0\t0\t0
DIFUSOR - Env Plástico 115ml    AMADERADO Bombón suizo\t13\t13\t26
DIFUSOR - Env Plástico 115ml    AMADERADO Tíbet\t23\t10\t33
DIFUSOR - Env Plástico 115ml    AMADERADO Vainicoco\t14\t13\t27
DIFUSOR - Env Plástico 115ml    FLORAL Lavanda\t30\t20\t50
DIFUSOR - Env Plástico 115ml    FLORAL Pear glacé\t6\t4\t10
DIFUSOR - Env Plástico 115ml    FLORAL Petit enfant\t30\t10\t40
DIFUSOR - Env Plástico 115ml    FRUTAL Chicle globo\t39\t18\t57
DIFUSOR - Env Plástico 115ml    FRUTAL Cítrica\t14\t13\t27
DIFUSOR - Env Plástico 115ml    FRUTAL Frambuesa\t4\t0\t4
DIFUSOR - Env Plástico 115ml    FRUTAL Limón y jengibre\t10\t10\t20
DIFUSOR - Env Plástico 115ml    FRUTAL Mora y frambuesa\t13\t12\t25
DIFUSOR - Env Plástico 115ml    FRUTAL Naranja y pimienta\t14\t13\t27
DIFUSOR - Env Plástico 115ml    FRUTAL Pera, pepino y manzana\t36\t20\t56
DIFUSOR - Env Plástico 115ml    GENERICO \t0\t0\t0
DIFUSOR - Env Plástico 250ml    AMADERADO Bombón suizo\t6\t6\t12
DIFUSOR - Env Plástico 250ml    AMADERADO Tíbet\t0\t0\t0
DIFUSOR - Env Plástico 250ml    AMADERADO Vainicoco\t16\t8\t24
DIFUSOR - Env Plástico 250ml    FLORAL Lavanda\t9\t10\t19
DIFUSOR - Env Plástico 250ml    FLORAL Pear glacé\t9\t10\t19
DIFUSOR - Env Plástico 250ml    FLORAL Petit enfant\t2\t4\t6
DIFUSOR - Env Plástico 250ml    FRUTAL Chicle globo\t3\t2\t5
DIFUSOR - Env Plástico 250ml    FRUTAL Cítrica\t20\t0\t20
DIFUSOR - Env Plástico 250ml    FRUTAL Frambuesa\t2\t1\t3
DIFUSOR - Env Plástico 250ml    FRUTAL Limón y jengibre\t4\t6\t10
DIFUSOR - Env Plástico 250ml    FRUTAL Mora y frambuesa\t10\t4\t14
DIFUSOR - Env Plástico 250ml    FRUTAL Naranja y pimienta\t19\t10\t29
DIFUSOR - Env Plástico 250ml    FRUTAL Pera, pepino y manzana\t14\t10\t24
DIFUSOR - Env Plástico 250ml    GENERICO \t0\t0\t0
DIFUSOR - Florero negro     GENERICO \t3\t3\t6
DIFUSOR - Vasija    GENERICO \t2\t2\t4
DIFUSOR - Vidrio 125ml    AMADERADO Bombón suizo\t3\t1\t4
DIFUSOR - Vidrio 125ml    AMADERADO Tíbet\t2\t1\t3
DIFUSOR - Vidrio 125ml    AMADERADO Vainicoco\t0\t1\t1
DIFUSOR - Vidrio 125ml    FLORAL Lavanda\t0\t0\t0
DIFUSOR - Vidrio 125ml    FLORAL Pear glacé\t2\t1\t3
DIFUSOR - Vidrio 125ml    FLORAL Petit enfant\t0\t0\t0
DIFUSOR - Vidrio 125ml    FRUTAL Chicle globo\t0\t0\t0
DIFUSOR - Vidrio 125ml    FRUTAL Cítrica\t2\t1\t3
DIFUSOR - Vidrio 125ml    FRUTAL Frambuesa\t0\t0\t0
DIFUSOR - Vidrio 125ml    FRUTAL Limón y jengibre\t0\t0\t0
DIFUSOR - Vidrio 125ml    FRUTAL Mora y frambuesa\t1\t0\t1
DIFUSOR - Vidrio 125ml    FRUTAL Naranja y pimienta\t0\t1\t1
DIFUSOR - Vidrio 125ml    FRUTAL Pera, pepino y manzana\t2\t1\t3
DIFUSOR - Vidrio 125ml    GENERICO \t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    AMADERADO Bombón suizo\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    AMADERADO Tíbet\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    AMADERADO Vainicoco\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    FLORAL Lavanda\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    FLORAL Pear glacé\t1\t0\t1
DIFUSOR - Vidrio Ámbar 150ml    FLORAL Petit enfant\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    FRUTAL Chicle globo\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    FRUTAL Cítrica\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    FRUTAL Frambuesa\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    FRUTAL Limón y jengibre\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    FRUTAL Mora y frambuesa\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    FRUTAL Naranja y pimienta\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    FRUTAL Pera, pepino y manzana\t0\t0\t0
DIFUSOR - Vidrio Ámbar 150ml    GENERICO \t0\t0\t0
RINCON - Apaga Vela    \t5\t13\t18
RINCON - Bolsas Aromáticas    \t0\t0\t0
RINCON - Bolsas Aromáticas    Cítrica\t14\t10\t24
RINCON - Flor ondulada tela    \t0\t5\t5
RINCON - Flor recta tela    \t12\t12\t24
RINCON - Flor con mecha   \t4\t6\t10
RINCON - Pack de Negras x 6und   \t29\t12\t41
RINCON - Piedras aromáticas     FLORAL Pettit Enfant\t29\t20\t49
RINCON - Piedras aromáticas     GENERICO \t0\t0\t0
RINCON - Sahumerios    AMADERADO Almendras\t0\t100\t100
RINCON - Sahumerios    AMADERADO Incienso\t0\t100\t100
RINCON - Sahumerios    AMADERADO Maderas de Oriente\t0\t100\t100
RINCON - Sahumerios    AMADERADO Mirra\t0\t100\t100
RINCON - Sahumerios    AMADERADO Palo santo\t0\t100\t100
RINCON - Sahumerios    AMADERADO Sándalo\t0\t100\t100
RINCON - Sahumerios    FLORAL Lavanda\t0\t100\t100
RINCON - Sahumerios    FLORAL Lilas  \t0\t100\t100
RINCON - Sahumerios    FLORAL Nardo\t64\t100\t164
RINCON - Sahumerios    FLORAL Patchouli\t65\t100\t165
RINCON - Sahumerios    FLORAL Rosas\t44\t100\t144
RINCON - Sahumerios    FRUTAL Frutos del Bosque  \t0\t100\t100
RINCON - Sahumerios    GENERICO \t0\t0\t0
RINCON - Sahumerios    MIX 8 Frutos del bosque, Incienso, Palo santo, Mirra\t7\t0\t7
RINCON - Sahumerios    MIX 8 Lavanda, Nardo, Rosas y Patchouli\t13\t0\t13
RINCON - Sahumerios    MIX 8 Lilas, Almendras, Mad de Oriente, Sándalo\t0\t0\t0
RINCON - Sales Aromáticas     Ace\t19\t10\t29
RINCON - Sales Aromáticas    GENERICO \t0\t0\t0
RINCON - Varillas    GENERICO \t0\t0\t0
RINCON - Vela lata     Marina\t7\t7\t14
RINCON - Vela lata    AMADERADO Vainilla Especiada\t0\t0\t0
RINCON - Vela lata    FLORAL Flores Blancas\t2\t0\t2
RINCON - Vela lata    FLORAL Lavanda y Vainilla\t4\t4\t8
RINCON - Vela lata    FLORAL Nardo\t2\t0\t2
RINCON - Vela lata    FLORAL Rosa Negra\t1\t0\t1
RINCON - Vela lata    FRUTAL Banana Caramelo\t1\t5\t6
RINCON - Vela lata    FRUTAL Frutos rojos\t6\t6\t12
RINCON - Vela lata    FRUTAL Limón \t6\t5\t11
RINCON - Vela lata    FRUTAL Verbena \t4\t5\t9
RINCON - Vela lata    GENERICO \t0\t0\t0
SANITIZANTE  - Holders    \t9\t6\t15
SANITIZANTE  - Jabón Liquido     Ace\t38\t0\t38
SANITIZANTE  - Jabón Liquido    GENERICO \t0\t0\t0
TEXTIL - Con gatillo 250ml    AMADERADO Ámbar y sándalo\t14\t10\t24
TEXTIL - Con gatillo 250ml    AMADERADO Tíbet\t16\t10\t26
TEXTIL - Con gatillo 250ml    AMADERADO Vainicoco\t4\t10\t14
TEXTIL - Con gatillo 250ml    AMADERADO Vainilla caramelo\t27\t10\t37
TEXTIL - Con gatillo 250ml    FLORAL Arpege\t5\t10\t15
TEXTIL - Con gatillo 250ml    FLORAL Bouquet\t0\t6\t6
TEXTIL - Con gatillo 250ml    FLORAL Colonia Johnson\t44\t10\t54
TEXTIL - Con gatillo 250ml    FLORAL Coniglio\t41\t10\t51
TEXTIL - Con gatillo 250ml    FLORAL Filippo\t33\t10\t43
TEXTIL - Con gatillo 250ml    FLORAL Flores blancas\t26\t10\t36
TEXTIL - Con gatillo 250ml    FLORAL Fresias\t57\t10\t67
TEXTIL - Con gatillo 250ml    FLORAL Fresias y rosas\t34\t10\t44
TEXTIL - Con gatillo 250ml    FLORAL Lavanda\t10\t10\t20
TEXTIL - Con gatillo 250ml    FLORAL Loto\t2\t10\t12
TEXTIL - Con gatillo 250ml    FLORAL Nardo\t7\t10\t17
TEXTIL - Con gatillo 250ml    FLORAL Pear glacé\t14\t10\t24
TEXTIL - Con gatillo 250ml    FLORAL Peras y flores blancas\t11\t10\t21
TEXTIL - Con gatillo 250ml    FLORAL Petit enfant\t47\t10\t57
TEXTIL - Con gatillo 250ml    FLORAL Pure seduction\t75\t10\t85
TEXTIL - Con gatillo 250ml    FLORAL Reina de la noche\t3\t10\t13
TEXTIL - Con gatillo 250ml    FRUTAL Chicle globo\t10\t10\t20
TEXTIL - Con gatillo 250ml    FRUTAL Cítrica\t6\t10\t16
TEXTIL - Con gatillo 250ml    FRUTAL Frambuesa\t5\t10\t15
TEXTIL - Con gatillo 250ml    FRUTAL Frutos rojos\t2\t10\t12
TEXTIL - Con gatillo 250ml    FRUTAL Limón y jengibre\t65\t10\t75
TEXTIL - Con gatillo 250ml    FRUTAL Melón\t29\t10\t39
TEXTIL - Con gatillo 250ml    FRUTAL Mora y frambuesa\t64\t10\t74
TEXTIL - Con gatillo 250ml    FRUTAL Naranja y pimienta\t4\t10\t14
TEXTIL - Con gatillo 250ml    FRUTAL Tropical mix\t8\t10\t18
TEXTIL - Con gatillo 250ml    FRUTAL Verbena cítrica\t35\t10\t45
TEXTIL - Con gatillo 250ml    FRUTAL Wanam\t24\t10\t34
TEXTIL - Con gatillo 250ml    GENERICO \t0\t0\t0
TEXTIL - Con gatillo 500ml    AMADERADO Ámbar y sándalo\t4\t4\t8
TEXTIL - Con gatillo 500ml    AMADERADO Tíbet\t11\t4\t15
TEXTIL - Con gatillo 500ml    AMADERADO Vainicoco\t4\t4\t8
TEXTIL - Con gatillo 500ml    AMADERADO Vainilla caramelo\t3\t3\t6
TEXTIL - Con gatillo 500ml    FLORAL Arpege\t4\t0\t4
TEXTIL - Con gatillo 500ml    FLORAL Bouquet\t0\t0\t0
TEXTIL - Con gatillo 500ml    FLORAL Colonia Johnson\t14\t4\t18
TEXTIL - Con gatillo 500ml    FLORAL Coniglio\t2\t4\t6
TEXTIL - Con gatillo 500ml    FLORAL Filippo\t2\t4\t6
TEXTIL - Con gatillo 500ml    FLORAL Flores blancas\t10\t4\t14
TEXTIL - Con gatillo 500ml    FLORAL Fresias\t16\t4\t20
TEXTIL - Con gatillo 500ml    FLORAL Fresias y rosas\t8\t4\t12
TEXTIL - Con gatillo 500ml    FLORAL Lavanda\t9\t4\t13
TEXTIL - Con gatillo 500ml    FLORAL Loto\t0\t0\t0
TEXTIL - Con gatillo 500ml    FLORAL Nardo\t9\t4\t13
TEXTIL - Con gatillo 500ml    FLORAL Pear glacé\t10\t4\t14
TEXTIL - Con gatillo 500ml    FLORAL Peras y flores blancas\t7\t4\t11
TEXTIL - Con gatillo 500ml    FLORAL Petit enfant\t2\t0\t2
TEXTIL - Con gatillo 500ml    FLORAL Pure seduction\t8\t4\t12
TEXTIL - Con gatillo 500ml    FLORAL Reina de la noche\t0\t0\t0
TEXTIL - Con gatillo 500ml    FRUTAL Chicle globo\t2\t0\t2
TEXTIL - Con gatillo 500ml    FRUTAL Cítrica\t4\t4\t8
TEXTIL - Con gatillo 500ml    FRUTAL Frambuesa\t2\t4\t6
TEXTIL - Con gatillo 500ml    FRUTAL Frutos rojos\t5\t4\t9
TEXTIL - Con gatillo 500ml    FRUTAL Limón y jengibre\t8\t4\t12
TEXTIL - Con gatillo 500ml    FRUTAL Mora y frambuesa\t11\t4\t15
TEXTIL - Con gatillo 500ml    FRUTAL Naranja y pimienta\t0\t0\t0
TEXTIL - Con gatillo 500ml    FRUTAL Tropical mix\t6\t4\t10
TEXTIL - Con gatillo 500ml    FRUTAL Verbena cítrica\t0\t0\t0
TEXTIL - Con gatillo 500ml    FRUTAL Wanam\t0\t0\t0
TEXTIL - Con gatillo 500ml    GENERICO \t0\t0\t0
TEXTIL - Sin gatillo 250ml    AMADERADO Ámbar y sándalo\t0\t0\t0
TEXTIL - Sin gatillo 250ml    AMADERADO Tíbet\t5\t0\t5
TEXTIL - Sin gatillo 250ml    AMADERADO Vainicoco\t0\t0\t0
TEXTIL - Sin gatillo 250ml    AMADERADO Vainilla caramelo\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Arpege\t2\t0\t2
TEXTIL - Sin gatillo 250ml    FLORAL Bouquet\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Colonia Johnson\t2\t0\t2
TEXTIL - Sin gatillo 250ml    FLORAL Coniglio\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Filippo\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Flores blancas\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Fresias\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Fresias y rosas\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Lavanda\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Loto\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Nardo\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Pear glacé\t21\t0\t21
TEXTIL - Sin gatillo 250ml    FLORAL Peras y flores blancas\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Petit enfant\t16\t0\t16
TEXTIL - Sin gatillo 250ml    FLORAL Pure seduction\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FLORAL Reina de la noche\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FRUTAL Chicle globo\t4\t0\t4
TEXTIL - Sin gatillo 250ml    FRUTAL Cítrica\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FRUTAL Frambuesa\t4\t0\t4
TEXTIL - Sin gatillo 250ml    FRUTAL Frutos rojos\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FRUTAL Limón y jengibre\t4\t0\t4
TEXTIL - Sin gatillo 250ml    FRUTAL Melón\t4\t0\t4
TEXTIL - Sin gatillo 250ml    FRUTAL Mora y frambuesa\t5\t0\t5
TEXTIL - Sin gatillo 250ml    FRUTAL Naranja y pimienta\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FRUTAL Tropical mix\t0\t0\t0
TEXTIL - Sin gatillo 250ml    FRUTAL Verbena cítrica\t6\t0\t6
TEXTIL - Sin gatillo 250ml    FRUTAL Wanam\t2\t0\t2
TEXTIL - Sin gatillo 250ml    GENERICO \t0\t0\t0
TEXTIL - Sin gatillo 500ml    AMADERADO Ámbar y sándalo\t0\t0\t0
TEXTIL - Sin gatillo 500ml    AMADERADO Tíbet\t0\t0\t0
TEXTIL - Sin gatillo 500ml    AMADERADO Vainicoco\t0\t0\t0
TEXTIL - Sin gatillo 500ml    AMADERADO Vainilla caramelo\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Arpege\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Bouquet\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Colonia Johnson\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Coniglio\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Filippo\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Flores blancas\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Fresias\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Fresias y rosas\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Lavanda\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Loto\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Nardo\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Pear glacé\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Peras y flores blancas\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Petit enfant\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Pure seduction\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FLORAL Reina de la noche\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Chicle globo\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Cítrica\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Frambuesa\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Frutos rojos\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Limón y jengibre\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Mora y frambuesa\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Naranja y pimienta\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Tropical mix\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Verbena cítrica\t0\t0\t0
TEXTIL - Sin gatillo 500ml    FRUTAL Wanam\t0\t0\t0
TEXTIL - Sin gatillo 500ml    GENERICO \t0\t0\t0
VELAS AROMÁTICAS - Camelia     Marina\t1\t1\t2
VELAS AROMÁTICAS - Camelia    AMADERADO Sándalo\t0\t0\t0
VELAS AROMÁTICAS - Camelia    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Camelia    FLORAL Flores Blancas\t1\t1\t2
VELAS AROMÁTICAS - Camelia    FLORAL Lavanda\t2\t1\t3
VELAS AROMÁTICAS - Camelia    FLORAL Nardo\t1\t1\t2
VELAS AROMÁTICAS - Camelia    FLORAL Rosa Negra\t0\t0\t0
VELAS AROMÁTICAS - Camelia    FRUTAL Banana Caramelo\t1\t1\t2
VELAS AROMÁTICAS - Camelia    FRUTAL Frutos Rojos\t0\t0\t0
VELAS AROMÁTICAS - Camelia    FRUTAL Limón \t0\t0\t0
VELAS AROMÁTICAS - Camelia    FRUTAL Verbena\t2\t1\t3
VELAS AROMÁTICAS - Chiara     Marina\t0\t1\t1
VELAS AROMÁTICAS - Chiara    AMADERADO Sándalo\t1\t0\t1
VELAS AROMÁTICAS - Chiara    AMADERADO Vainilla Especiada\t1\t1\t2
VELAS AROMÁTICAS - Chiara    FLORAL Flores Blancas\t1\t0\t1
VELAS AROMÁTICAS - Chiara    FLORAL Lavanda\t1\t0\t1
VELAS AROMÁTICAS - Chiara    FLORAL Nardo\t1\t0\t1
VELAS AROMÁTICAS - Chiara    FLORAL Rosa Negra\t0\t0\t0
VELAS AROMÁTICAS - Chiara    FRUTAL Banana Caramelo\t2\t1\t3
VELAS AROMÁTICAS - Chiara    FRUTAL Frutos Rojos\t0\t1\t1
VELAS AROMÁTICAS - Chiara    FRUTAL Limón \t1\t1\t2
VELAS AROMÁTICAS - Chiara    FRUTAL Verbena\t1\t0\t1
VELAS AROMÁTICAS - Cloe Lila     Marina\t0\t0\t0
VELAS AROMÁTICAS - Cloe Lila    AMADERADO Sándalo\t0\t0\t0
VELAS AROMÁTICAS - Cloe Lila    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Cloe Lila    FLORAL Flores Blancas\t0\t1\t1
VELAS AROMÁTICAS - Cloe Lila    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Cloe Lila    FLORAL Nardo\t1\t0\t1
VELAS AROMÁTICAS - Cloe Lila    FLORAL Rosa Negra\t0\t1\t1
VELAS AROMÁTICAS - Cloe Lila    FRUTAL Banana Caramelo\t1\t1\t2
VELAS AROMÁTICAS - Cloe Lila    FRUTAL Frutos Rojos\t0\t0\t0
VELAS AROMÁTICAS - Cloe Lila    FRUTAL Limón \t1\t1\t2
VELAS AROMÁTICAS - Cloe Lila    FRUTAL Verbena\t1\t0\t1
VELAS AROMÁTICAS - Cloe Rosa     Marina\t0\t0\t0
VELAS AROMÁTICAS - Cloe Rosa    AMADERADO Sándalo\t0\t0\t0
VELAS AROMÁTICAS - Cloe Rosa    AMADERADO Vainilla Especiada\t0\t1\t1
VELAS AROMÁTICAS - Cloe Rosa    FLORAL Flores Blancas\t1\t0\t1
VELAS AROMÁTICAS - Cloe Rosa    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Cloe Rosa    FLORAL Nardo\t0\t1\t1
VELAS AROMÁTICAS - Cloe Rosa    FLORAL Rosa Negra\t1\t0\t1
VELAS AROMÁTICAS - Cloe Rosa    FRUTAL Banana Caramelo\t1\t0\t1
VELAS AROMÁTICAS - Cloe Rosa    FRUTAL Frutos Rojos\t0\t0\t0
VELAS AROMÁTICAS - Cloe Rosa    FRUTAL Limón \t1\t1\t2
VELAS AROMÁTICAS - Cloe Rosa    FRUTAL Verbena\t2\t1\t3
VELAS AROMÁTICAS - Fedra 160g     Marina\t0\t0\t0
VELAS AROMÁTICAS - Fedra 160g    AMADERADO Sándalo\t0\t1\t1
VELAS AROMÁTICAS - Fedra 160g    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Fedra 160g    FLORAL Flores Blancas\t0\t0\t0
VELAS AROMÁTICAS - Fedra 160g    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Fedra 160g    FLORAL Nardo\t0\t0\t0
VELAS AROMÁTICAS - Fedra 160g    FLORAL Rosa Negra\t0\t0\t0
VELAS AROMÁTICAS - Fedra 160g    FRUTAL Banana Caramelo\t1\t0\t1
VELAS AROMÁTICAS - Fedra 160g    FRUTAL Frutos Rojos\t1\t0\t1
VELAS AROMÁTICAS - Fedra 160g    FRUTAL Limón \t0\t0\t0
VELAS AROMÁTICAS - Fedra 160g    FRUTAL Verbena\t0\t1\t1
VELAS AROMÁTICAS - Fedra 80g     Marina\t1\t0\t1
VELAS AROMÁTICAS - Fedra 80g    AMADERADO Sándalo\t0\t0\t0
VELAS AROMÁTICAS - Fedra 80g    AMADERADO Vainilla Especiada\t2\t1\t3
VELAS AROMÁTICAS - Fedra 80g    FLORAL Flores Blancas\t0\t1\t1
VELAS AROMÁTICAS - Fedra 80g    FLORAL Lavanda\t1\t1\t2
VELAS AROMÁTICAS - Fedra 80g    FLORAL Nardo\t0\t0\t0
VELAS AROMÁTICAS - Fedra 80g    FLORAL Rosa Negra\t0\t0\t0
VELAS AROMÁTICAS - Fedra 80g    FRUTAL Banana Caramelo\t0\t1\t1
VELAS AROMÁTICAS - Fedra 80g    FRUTAL Frutos Rojos\t0\t1\t1
VELAS AROMÁTICAS - Fedra 80g    FRUTAL Limón \t1\t0\t1
VELAS AROMÁTICAS - Fedra 80g    FRUTAL Verbena\t0\t0\t0
VELAS AROMÁTICAS - Frida     Marina\t0\t0\t0
VELAS AROMÁTICAS - Frida    AMADERADO Sándalo\t1\t0\t1
VELAS AROMÁTICAS - Frida    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Frida    FLORAL Flores Blancas\t0\t1\t1
VELAS AROMÁTICAS - Frida    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Frida    FLORAL Nardo\t0\t0\t0
VELAS AROMÁTICAS - Frida    FLORAL Rosa Negra\t0\t1\t1
VELAS AROMÁTICAS - Frida    FRUTAL Banana Caramelo\t1\t0\t1
VELAS AROMÁTICAS - Frida    FRUTAL Frutos Rojos\t1\t1\t2
VELAS AROMÁTICAS - Frida    FRUTAL Limón \t0\t0\t0
VELAS AROMÁTICAS - Frida    FRUTAL Verbena\t0\t0\t0
VELAS AROMÁTICAS - Galilea     Marina\t0\t0\t0
VELAS AROMÁTICAS - Galilea    AMADERADO Sándalo\t1\t0\t1
VELAS AROMÁTICAS - Galilea    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Galilea    FLORAL Flores Blancas\t1\t2\t3
VELAS AROMÁTICAS - Galilea    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Galilea    FLORAL Nardo\t0\t0\t0
VELAS AROMÁTICAS - Galilea    FLORAL Rosa Negra\t0\t0\t0
VELAS AROMÁTICAS - Galilea    FRUTAL Banana Caramelo\t0\t0\t0
VELAS AROMÁTICAS - Galilea    FRUTAL Frutos Rojos\t0\t0\t0
VELAS AROMÁTICAS - Galilea    FRUTAL Limón \t0\t0\t0
VELAS AROMÁTICAS - Galilea    FRUTAL Verbena\t0\t0\t0
VELAS AROMÁTICAS - Luz     Marina\t1\t1\t2
VELAS AROMÁTICAS - Luz    AMADERADO Sándalo\t0\t0\t0
VELAS AROMÁTICAS - Luz    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Luz    FLORAL Flores Blancas\t1\t1\t2
VELAS AROMÁTICAS - Luz    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Luz    FLORAL Nardo\t0\t1\t1
VELAS AROMÁTICAS - Luz    FLORAL Rosa Negra\t0\t1\t1
VELAS AROMÁTICAS - Luz    FRUTAL Banana Caramelo\t0\t1\t1
VELAS AROMÁTICAS - Luz    FRUTAL Frutos Rojos\t0\t0\t0
VELAS AROMÁTICAS - Luz    FRUTAL Limón \t1\t1\t2
VELAS AROMÁTICAS - Luz    FRUTAL Verbena\t0\t0\t0
VELAS AROMÁTICAS - Magnolia     Marina\t1\t0\t1
VELAS AROMÁTICAS - Magnolia    AMADERADO Sándalo\t1\t0\t1
VELAS AROMÁTICAS - Magnolia    AMADERADO Vainilla Especiada\t2\t0\t2
VELAS AROMÁTICAS - Magnolia    FLORAL Flores Blancas\t0\t1\t1
VELAS AROMÁTICAS - Magnolia    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Magnolia    FLORAL Nardo\t0\t0\t0
VELAS AROMÁTICAS - Magnolia    FLORAL Rosa Negra\t0\t0\t0
VELAS AROMÁTICAS - Magnolia    FRUTAL Banana Caramelo\t1\t1\t2
VELAS AROMÁTICAS - Magnolia    FRUTAL Frutos Rojos\t0\t1\t1
VELAS AROMÁTICAS - Magnolia    FRUTAL Limón \t2\t1\t3
VELAS AROMÁTICAS - Magnolia    FRUTAL Verbena\t0\t0\t0
VELAS AROMÁTICAS - Penélope 1200g     Marina\t0\t1\t1
VELAS AROMÁTICAS - Penélope 1200g    AMADERADO Sándalo\t0\t0\t0
VELAS AROMÁTICAS - Penélope 1200g    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Penélope 1200g    FLORAL Flores Blancas\t0\t0\t0
VELAS AROMÁTICAS - Penélope 1200g    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Penélope 1200g    FLORAL Nardo\t0\t0\t0
VELAS AROMÁTICAS - Penélope 1200g    FLORAL Rosa Negra\t1\t0\t1
VELAS AROMÁTICAS - Penélope 1200g    FRUTAL Banana Caramelo\t0\t0\t0
VELAS AROMÁTICAS - Penélope 1200g    FRUTAL Frutos Rojos\t0\t0\t0
VELAS AROMÁTICAS - Penélope 1200g    FRUTAL Limón \t0\t1\t1
VELAS AROMÁTICAS - Penélope 1200g    FRUTAL Verbena\t0\t0\t0
VELAS AROMÁTICAS - Penélope 600g     Marina\t0\t1\t1
VELAS AROMÁTICAS - Penélope 600g    AMADERADO Sándalo\t0\t0\t0
VELAS AROMÁTICAS - Penélope 600g    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Penélope 600g    FLORAL Flores Blancas\t0\t0\t0
VELAS AROMÁTICAS - Penélope 600g    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Penélope 600g    FLORAL Nardo\t0\t0\t0
VELAS AROMÁTICAS - Penélope 600g    FLORAL Rosa Negra\t0\t0\t0
VELAS AROMÁTICAS - Penélope 600g    FRUTAL Banana Caramelo\t1\t1\t2
VELAS AROMÁTICAS - Penélope 600g    FRUTAL Frutos Rojos\t1\t0\t1
VELAS AROMÁTICAS - Penélope 600g    FRUTAL Limón \t0\t0\t0
VELAS AROMÁTICAS - Penélope 600g    FRUTAL Verbena\t1\t0\t1
VELAS AROMÁTICAS - Roma Negra     Marina\t0\t0\t0
VELAS AROMÁTICAS - Roma Negra    AMADERADO Sándalo\t0\t0\t0
VELAS AROMÁTICAS - Roma Negra    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Roma Negra    FLORAL Flores Blancas\t1\t0\t1
VELAS AROMÁTICAS - Roma Negra    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Roma Negra    FLORAL Nardo\t0\t0\t0
VELAS AROMÁTICAS - Roma Negra    FLORAL Rosa Negra\t0\t1\t1
VELAS AROMÁTICAS - Roma Negra    FRUTAL Banana Caramelo\t0\t1\t1
VELAS AROMÁTICAS - Roma Negra    FRUTAL Frutos Rojos\t0\t0\t0
VELAS AROMÁTICAS - Roma Negra    FRUTAL Limón \t1\t0\t1
VELAS AROMÁTICAS - Roma Negra    FRUTAL Verbena\t0\t1\t1
VELAS AROMÁTICAS - Roma Rosa     Marina\t0\t0\t0
VELAS AROMÁTICAS - Roma Rosa    AMADERADO Sándalo\t0\t0\t0
VELAS AROMÁTICAS - Roma Rosa    AMADERADO Vainilla Especiada\t0\t0\t0
VELAS AROMÁTICAS - Roma Rosa    FLORAL Flores Blancas\t0\t1\t1
VELAS AROMÁTICAS - Roma Rosa    FLORAL Lavanda\t0\t0\t0
VELAS AROMÁTICAS - Roma Rosa    FLORAL Nardo\t0\t0\t0
VELAS AROMÁTICAS - Roma Rosa    FLORAL Rosa Negra\t0\t1\t1
VELAS AROMÁTICAS - Roma Rosa    FRUTAL Banana Caramelo\t1\t0\t1
VELAS AROMÁTICAS - Roma Rosa    FRUTAL Frutos Rojos\t0\t0\t0
VELAS AROMÁTICAS - Roma Rosa    FRUTAL Limón \t0\t1\t1
VELAS AROMÁTICAS - Roma Rosa    FRUTAL Verbena\t1\t0\t1
VELAS AROMÁTICAS - Roma Rosa    GENERICO \t0\t0\t0
VELA DE MOLDE - Buda    GENERICO \t3\t7\t10
VELA DE MOLDE - Burbuja    GENERICO \t4\t4\t8
VELA DE MOLDE - Esfera con rosas    GENERICO \t2\t7\t9
VELA DE MOLDE - Gota    GENERICO \t5\t5\t10
VELA DE MOLDE - Rosa    GENERICO \t4\t6\t10
`.trim();

/* =========================================================
   3) PARSEO
   ========================================================= */
const rows = RAW.split('\n').map(l => {
  const [name, mac, sr] = l.split('\t');
  return {
    name: name.replace(/\s+/g, ' ').trim(),
    mac:  Number(mac || 0),
    sr:   Number(sr  || 0)
  };
});

/* =========================================================
   4) INSERCIÓN
   ========================================================= */
const fecha      = new Date('2024-12-31T00:00:00.000Z');
let insertedMovs = 0;
let notFound     = 0;

for (const r of rows) {
  const prod = await Producto.findOne({ name: new RegExp(`^${r.name}$`, 'i') });

  if (!prod) {
    console.warn('⚠️  Producto NO hallado →', r.name);
    notFound++;
    continue;
  }

  /* ---------- actualizamos stocks del producto ---------- */
  const beforeMac = prod.stockMacachin ?? 0;
  const beforeSR  = prod.stockSantaRosa ?? 0;

  if (r.mac + r.sr > 0) {
    prod.stockMacachin = beforeMac + r.mac;
    prod.stockSantaRosa = beforeSR + r.sr;
    prod.stock = (prod.stock ?? 0) + r.mac + r.sr;
    await prod.save();
  }

  /* ---------- creamos movimientos por sucursal ---------- */
  try {
    if (r.mac > 0) {
      await Movimiento.create({
        productId : prod._id,
        branch    : 'Macachín',
        type      : 'add',
        quantity  : r.mac,
        date      : fecha
      });
      console.log(`➕  Macachín   | ${r.mac.toString().padStart(4)} u. | ${r.name}`);
      insertedMovs++;
    }

    if (r.sr > 0) {
      await Movimiento.create({
        productId : prod._id,
        branch    : 'Santa Rosa',
        type      : 'add',
        quantity  : r.sr,
        date      : fecha
      });
      console.log(`➕  Santa Rosa | ${r.sr.toString().padStart(4)} u. | ${r.name}`);
      insertedMovs++;
    }
  } catch (err) {
    console.error('💥  Error al insertar movimiento de', r.name, '→', err.message);
  }
}

/* =========================================================
   5) RESUMEN
   ========================================================= */
console.log(
  `\n✔️  Terminado: ${insertedMovs} movimientos insertados – ${notFound} productos no encontrados`
);
await mongoose.connection.close();
console.log('🔌  Conexión cerrada');
