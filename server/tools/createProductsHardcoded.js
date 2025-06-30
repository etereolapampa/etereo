// server/tools/createProductsHardcoded.js
import dotenv     from 'dotenv';
import mongoose   from 'mongoose';
import Categoria  from '../src/models/Categoria.js';
import Producto   from '../src/models/Producto.js';

dotenv.config();

/* =========== CONEXIÓN =========== */
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌  Falta MONGODB_URI en el .env');
  process.exit(1);
}
await mongoose.connect(uri);
console.log('✅  MongoDB conectado');

/* =========== DATA BRUTA =========== *
 *  Formato:  RUBRO<TAB>PRODUCTO<TAB>VALOR
 *  (sin la cabecera).  Los TABs son “\t”.
 */
const RAW = `
AROMATIZANTES\tAROMATIZANTE - MULTIUSO    AMADERADO Tíbet\t6380
AROMATIZANTES\tAROMATIZANTE - MULTIUSO    AMADERADO Vainicoco\t6380
AROMATIZANTES\tAROMATIZANTE - MULTIUSO    FLORAL Lavanda\t6380
AROMATIZANTES\tAROMATIZANTE - MULTIUSO    FRUTAL Cítrica\t6380
AROMATIZANTES\tAROMATIZANTE - MULTIUSO    FRUTAL Pera, pepino y manzana\t6380
AROMATIZANTES\tAROMATIZANTE - MULTIUSO    GENERICO \t6380
AROMATIZANTES\tAROMATIZANTE - MULTIUSO - Repuesto    AMADERADO Tíbet\t5830
AROMATIZANTES\tAROMATIZANTE - MULTIUSO - Repuesto    AMADERADO Vainicoco\t5830
AROMATIZANTES\tAROMATIZANTE - MULTIUSO - Repuesto    FLORAL Lavanda\t5830
AROMATIZANTES\tAROMATIZANTE - MULTIUSO - Repuesto    FRUTAL Cítrica\t5830
AROMATIZANTES\tAROMATIZANTE - MULTIUSO - Repuesto    FRUTAL Pera, pepino y manzana\t5830
AROMATIZANTES\tAROMATIZANTE - MULTIUSO - Repuesto    GENERICO \t5830
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    AMADERADO Bombón suizo\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    AMADERADO Tíbet\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    AMADERADO Vainicoco\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FLORAL Lavanda\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FLORAL Pear glacé\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FLORAL Petit enfant\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FRUTAL Chicle globo\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FRUTAL Cítrica\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FRUTAL Frambuesa\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FRUTAL Limón y jengibre\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FRUTAL Mora y frambuesa\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FRUTAL Naranja y pimienta\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    FRUTAL Pera, pepino y manzana\t21560
DIFUSORES\tDIFUSOR - Env Cuadrado 200ml    GENERICO \t21560
DIFUSORES\tDIFUSOR - Env Labrado 100ml    AMADERADO Bombón suizo\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    AMADERADO Tíbet\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    AMADERADO Vainicoco\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FLORAL Lavanda\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FLORAL Pear glacé\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FLORAL Petit enfant\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FRUTAL Chicle globo\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FRUTAL Cítrica\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FRUTAL Frambuesa\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FRUTAL Limón y jengibre\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FRUTAL Mora y frambuesa\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FRUTAL Naranja y pimienta\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    FRUTAL Pera, pepino y manzana\t17380
DIFUSORES\tDIFUSOR - Env Labrado 100ml    GENERICO \t17380
DIFUSORES\tDIFUSOR - Env Plástico 115ml    AMADERADO Bombón suizo\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    AMADERADO Tíbet\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    AMADERADO Vainicoco\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FLORAL Lavanda\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FLORAL Pear glacé\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FLORAL Petit enfant\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FRUTAL Chicle globo\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FRUTAL Cítrica\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FRUTAL Frambuesa\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FRUTAL Limón y jengibre\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FRUTAL Mora y frambuesa\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FRUTAL Naranja y pimienta\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    FRUTAL Pera, pepino y manzana\t8525
DIFUSORES\tDIFUSOR - Env Plástico 115ml    GENERICO \t8525
DIFUSORES\tDIFUSOR - Env Plástico 250ml    AMADERADO Bombón suizo\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    AMADERADO Tíbet\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    AMADERADO Vainicoco\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FLORAL Lavanda\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FLORAL Pear glacé\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FLORAL Petit enfant\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FRUTAL Chicle globo\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FRUTAL Cítrica\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FRUTAL Frambuesa\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FRUTAL Limón y jengibre\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FRUTAL Mora y frambuesa\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FRUTAL Naranja y pimienta\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    FRUTAL Pera, pepino y manzana\t13750
DIFUSORES\tDIFUSOR - Env Plástico 250ml    GENERICO \t13750
DIFUSORES\tDIFUSOR - Florero negro     GENERICO \t34210
DIFUSORES\tDIFUSOR - Vasija    GENERICO \t34210
DIFUSORES\tDIFUSOR - Vidrio 125ml    AMADERADO Bombón suizo\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    AMADERADO Tíbet\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    AMADERADO Vainicoco\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FLORAL Lavanda\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FLORAL Pear glacé\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FLORAL Petit enfant\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FRUTAL Chicle globo\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FRUTAL Cítrica\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FRUTAL Frambuesa\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FRUTAL Limón y jengibre\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FRUTAL Mora y frambuesa\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FRUTAL Naranja y pimienta\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    FRUTAL Pera, pepino y manzana\t10450
DIFUSORES\tDIFUSOR - Vidrio 125ml    GENERICO \t10450
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    AMADERADO Bombón suizo\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    AMADERADO Tíbet\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    AMADERADO Vainicoco\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FLORAL Lavanda\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FLORAL Pear glacé\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FLORAL Petit enfant\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FRUTAL Chicle globo\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FRUTAL Cítrica\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FRUTAL Frambuesa\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FRUTAL Limón y jengibre\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FRUTAL Mora y frambuesa\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FRUTAL Naranja y pimienta\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    FRUTAL Pera, pepino y manzana\t21340
DIFUSORES\tDIFUSOR - Vidrio Ámbar 150ml    GENERICO \t21340
RINCONES\tRINCON - Apaga Vela    \t2640
RINCONES\tRINCON - Bolsas Aromáticas    \t3190
RINCONES\tRINCON - Bolsas Aromáticas    Cítrica\t3190
RINCONES\tRINCON - Flor ondulada tela    \t4290
RINCONES\tRINCON - Flor recta tela    \t3850
RINCONES\tRINCON - Flor con mecha   \t6600
RINCONES\tRINCON - Pack de Negras x 6und   \t5940
RINCONES\tRINCON - Piedras aromáticas     FLORAL Pettit Enfant\t5060
RINCONES\tRINCON - Piedras aromáticas     GENERICO \t5060
RINCONES\tRINCON - Sahumerios    AMADERADO Almendras\t0
RINCONES\tRINCON - Sahumerios    AMADERADO Incienso\t0
RINCONES\tRINCON - Sahumerios    AMADERADO Maderas de Oriente\t0
RINCONES\tRINCON - Sahumerios    AMADERADO Mirra\t0
RINCONES\tRINCON - Sahumerios    AMADERADO Palo santo\t0
RINCONES\tRINCON - Sahumerios    AMADERADO Sándalo\t0
RINCONES\tRINCON - Sahumerios    FLORAL Lavanda\t0
RINCONES\tRINCON - Sahumerios    FLORAL Lilas  \t0
RINCONES\tRINCON - Sahumerios    FLORAL Nardo\t0
RINCONES\tRINCON - Sahumerios    FLORAL Patchouli\t0
RINCONES\tRINCON - Sahumerios    FLORAL Rosas\t0
RINCONES\tRINCON - Sahumerios    FRUTAL Frutos del Bosque  \t0
RINCONES\tRINCON - Sahumerios    GENERICO \t0
RINCONES\tRINCON - Sahumerios    MIX 8 Frutos del bosque, Incienso, Palo santo, Mirra\t3190
RINCONES\tRINCON - Sahumerios    MIX 8 Lavanda, Nardo, Rosas y Patchouli\t3190
RINCONES\tRINCON - Sahumerios    MIX 8 Lilas, Almendras, Mad de Oriente, Sándalo\t3190
RINCONES\tRINCON - Sales Aromáticas     Ace\t5940
RINCONES\tRINCON - Sales Aromáticas    GENERICO \t5940
RINCONES\tRINCON - Varillas    GENERICO \t0
RINCONES\tRINCON - Vela lata     Marina\t4290
RINCONES\tRINCON - Vela lata    AMADERADO Vainilla Especiada\t4290
RINCONES\tRINCON - Vela lata    FLORAL Flores Blancas\t4290
RINCONES\tRINCON - Vela lata    FLORAL Lavanda y Vainilla\t4290
RINCONES\tRINCON - Vela lata    FLORAL Nardo\t4290
RINCONES\tRINCON - Vela lata    FLORAL Rosa Negra\t4290
RINCONES\tRINCON - Vela lata    FRUTAL Banana Caramelo\t4290
RINCONES\tRINCON - Vela lata    FRUTAL Frutos rojos\t4290
RINCONES\tRINCON - Vela lata    FRUTAL Limón \t4290
RINCONES\tRINCON - Vela lata    FRUTAL Verbena \t4290
RINCONES\tRINCON - Vela lata    GENERICO \t4290
SANITIZANTE \tSANITIZANTE  - Holders    \t2970
SANITIZANTE \tSANITIZANTE  - Jabón Liquido     Ace\t5450
SANITIZANTE \tSANITIZANTE  - Jabón Liquido    GENERICO \t5450
TEXTILES\tTEXTIL - Con gatillo 250ml    AMADERADO Ámbar y sándalo\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    AMADERADO Tíbet\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    AMADERADO Vainicoco\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    AMADERADO Vainilla caramelo\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Arpege\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Bouquet\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Colonia Johnson\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Coniglio\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Filippo\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Flores blancas\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Fresias\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Fresias y rosas\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Lavanda\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Loto\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Nardo\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Pear glacé\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Peras y flores blancas\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Petit enfant\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Pure seduction\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FLORAL Reina de la noche\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Chicle globo\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Cítrica\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Frambuesa\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Frutos rojos\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Limón y jengibre\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Melón\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Mora y frambuesa\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Naranja y pimienta\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Tropical mix\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Verbena cítrica\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    FRUTAL Wanam\t7040
TEXTILES\tTEXTIL - Con gatillo 250ml    GENERICO \t7040
TEXTILES\tTEXTIL - Con gatillo 500ml    AMADERADO Ámbar y sándalo\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    AMADERADO Tíbet\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    AMADERADO Vainicoco\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    AMADERADO Vainilla caramelo\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Arpege\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Bouquet\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Colonia Johnson\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Coniglio\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Filippo\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Flores blancas\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Fresias\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Fresias y rosas\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Lavanda\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Loto\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Nardo\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Pear glacé\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Peras y flores blancas\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Petit enfant\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Pure seduction\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FLORAL Reina de la noche\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Chicle globo\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Cítrica\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Frambuesa\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Frutos rojos\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Limón y jengibre\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Mora y frambuesa\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Naranja y pimienta\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Tropical mix\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Verbena cítrica\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    FRUTAL Wanam\t12100
TEXTILES\tTEXTIL - Con gatillo 500ml    GENERICO \t12100
TEXTILES\tTEXTIL - Sin gatillo 250ml    AMADERADO Ámbar y sándalo\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    AMADERADO Tíbet\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    AMADERADO Vainicoco\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    AMADERADO Vainilla caramelo\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Arpege\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Bouquet\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Colonia Johnson\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Coniglio\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Filippo\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Flores blancas\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Fresias\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Fresias y rosas\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Lavanda\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Loto\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Nardo\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Pear glacé\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Peras y flores blancas\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Petit enfant\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Pure seduction\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FLORAL Reina de la noche\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Chicle globo\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Cítrica\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Frambuesa\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Frutos rojos\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Limón y jengibre\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Melón\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Mora y frambuesa\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Naranja y pimienta\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Tropical mix\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Verbena cítrica\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    FRUTAL Wanam\t7040
TEXTILES\tTEXTIL - Sin gatillo 250ml    GENERICO \t7040
TEXTILES\tTEXTIL - Sin gatillo 500ml    AMADERADO Ámbar y sándalo\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    AMADERADO Tíbet\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    AMADERADO Vainicoco\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    AMADERADO Vainilla caramelo\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Arpege\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Bouquet\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Colonia Johnson\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Coniglio\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Filippo\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Flores blancas\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Fresias\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Fresias y rosas\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Lavanda\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Loto\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Nardo\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Pear glacé\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Peras y flores blancas\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Petit enfant\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Pure seduction\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FLORAL Reina de la noche\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Chicle globo\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Cítrica\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Frambuesa\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Frutos rojos\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Limón y jengibre\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Mora y frambuesa\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Naranja y pimienta\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Tropical mix\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Verbena cítrica\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    FRUTAL Wanam\t11220
TEXTILES\tTEXTIL - Sin gatillo 500ml    GENERICO \t11220
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia     Marina\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    AMADERADO Sándalo\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    AMADERADO Vainilla Especiada\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    FLORAL Flores Blancas\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    FLORAL Lavanda\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    FLORAL Nardo\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    FLORAL Rosa Negra\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    FRUTAL Banana Caramelo\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    FRUTAL Frutos Rojos\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    FRUTAL Limón \t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Camelia    FRUTAL Verbena\t14080
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara     Marina\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    AMADERADO Sándalo\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    AMADERADO Vainilla Especiada\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    FLORAL Flores Blancas\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    FLORAL Lavanda\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    FLORAL Nardo\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    FLORAL Rosa Negra\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    FRUTAL Banana Caramelo\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    FRUTAL Frutos Rojos\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    FRUTAL Limón \t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Chiara    FRUTAL Verbena\t8140
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila     Marina\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    AMADERADO Sándalo\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    AMADERADO Vainilla Especiada\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    FLORAL Flores Blancas\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    FLORAL Lavanda\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    FLORAL Nardo\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    FLORAL Rosa Negra\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    FRUTAL Banana Caramelo\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    FRUTAL Frutos Rojos\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    FRUTAL Limón \t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Lila    FRUTAL Verbena\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa     Marina\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    AMADERADO Sándalo\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    AMADERADO Vainilla Especiada\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    FLORAL Flores Blancas\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    FLORAL Lavanda\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    FLORAL Nardo\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    FLORAL Rosa Negra\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    FRUTAL Banana Caramelo\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    FRUTAL Frutos Rojos\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    FRUTAL Limón \t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Cloe Rosa    FRUTAL Verbena\t20570
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g     Marina\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    AMADERADO Sándalo\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    AMADERADO Vainilla Especiada\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    FLORAL Flores Blancas\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    FLORAL Lavanda\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    FLORAL Nardo\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    FLORAL Rosa Negra\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    FRUTAL Banana Caramelo\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    FRUTAL Frutos Rojos\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    FRUTAL Limón \t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 160g    FRUTAL Verbena\t13860
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g     Marina\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    AMADERADO Sándalo\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    AMADERADO Vainilla Especiada\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    FLORAL Flores Blancas\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    FLORAL Lavanda\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    FLORAL Nardo\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    FLORAL Rosa Negra\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    FRUTAL Banana Caramelo\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    FRUTAL Frutos Rojos\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    FRUTAL Limón \t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Fedra 80g    FRUTAL Verbena\t9680
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida     Marina\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    AMADERADO Sándalo\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    AMADERADO Vainilla Especiada\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    FLORAL Flores Blancas\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    FLORAL Lavanda\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    FLORAL Nardo\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    FLORAL Rosa Negra\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    FRUTAL Banana Caramelo\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    FRUTAL Frutos Rojos\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    FRUTAL Limón \t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Frida    FRUTAL Verbena\t14850
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea     Marina\t0
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    AMADERADO Sándalo\t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    AMADERADO Vainilla Especiada\t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    FLORAL Flores Blancas\t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    FLORAL Lavanda\t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    FLORAL Nardo\t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    FLORAL Rosa Negra\t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    FRUTAL Banana Caramelo\t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    FRUTAL Frutos Rojos\t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    FRUTAL Limón \t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Galilea    FRUTAL Verbena\t7260
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz     Marina\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    AMADERADO Sándalo\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    AMADERADO Vainilla Especiada\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    FLORAL Flores Blancas\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    FLORAL Lavanda\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    FLORAL Nardo\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    FLORAL Rosa Negra\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    FRUTAL Banana Caramelo\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    FRUTAL Frutos Rojos\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    FRUTAL Limón \t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Luz    FRUTAL Verbena\t6930
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia     Marina\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    AMADERADO Sándalo\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    AMADERADO Vainilla Especiada\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    FLORAL Flores Blancas\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    FLORAL Lavanda\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    FLORAL Nardo\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    FLORAL Rosa Negra\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    FRUTAL Banana Caramelo\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    FRUTAL Frutos Rojos\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    FRUTAL Limón \t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Magnolia    FRUTAL Verbena\t24200
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g     Marina\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    AMADERADO Sándalo\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    AMADERADO Vainilla Especiada\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    FLORAL Flores Blancas\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    FLORAL Lavanda\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    FLORAL Nardo\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    FLORAL Rosa Negra\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    FRUTAL Banana Caramelo\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    FRUTAL Frutos Rojos\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    FRUTAL Limón \t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 1200g    FRUTAL Verbena\t37950
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g     Marina\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    AMADERADO Sándalo\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    AMADERADO Vainilla Especiada\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    FLORAL Flores Blancas\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    FLORAL Lavanda\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    FLORAL Nardo\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    FLORAL Rosa Negra\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    FRUTAL Banana Caramelo\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    FRUTAL Frutos Rojos\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    FRUTAL Limón \t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Penélope 600g    FRUTAL Verbena\t27940
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra     Marina\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    AMADERADO Sándalo\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    AMADERADO Vainilla Especiada\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    FLORAL Flores Blancas\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    FLORAL Lavanda\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    FLORAL Nardo\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    FLORAL Rosa Negra\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    FRUTAL Banana Caramelo\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    FRUTAL Frutos Rojos\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    FRUTAL Limón \t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Negra    FRUTAL Verbena\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa     Marina\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    AMADERADO Sándalo\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    AMADERADO Vainilla Especiada\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    FLORAL Flores Blancas\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    FLORAL Lavanda\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    FLORAL Nardo\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    FLORAL Rosa Negra\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    FRUTAL Banana Caramelo\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    FRUTAL Frutos Rojos\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    FRUTAL Limón \t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    FRUTAL Verbena\t18480
VELAS AROMÁTICAS\tVELAS AROMÁTICAS - Roma Rosa    GENERICO \t18480
VELAS MOLDE\tVELA DE MOLDE - Buda    GENERICO \t0
VELAS MOLDE\tVELA DE MOLDE - Burbuja    GENERICO \t0
VELAS MOLDE\tVELA DE MOLDE - Esfera con rosas    GENERICO \t0
VELAS MOLDE\tVELA DE MOLDE - Gota    GENERICO \t0
VELAS MOLDE\tVELA DE MOLDE - Rosa    GENERICO \t0
`.trim();   //  <-- FIN DATA
/*  (Los “...” del ejemplo son solo para acortar la vista aquí; en tu archivo
    pega *todas* las líneas que me pasaste, una debajo de la otra).          */

// borre casi todos los renglones del raw porque ya no los necesito

/* =========== PARSEO =========== */
const rows = RAW.split('\n').map(l => {
  const [cat, ...rest] = l.split('\t');
  const price = Number(rest.pop().trim()) || 0;
  const name  = rest.join('\t').replace(/\s+/g, ' ').trim();  // normaliza espacios
  return { cat: cat.trim().toUpperCase(), name, price };
});

/* =========== MAPA de categorías =========== */
const catDocs = await Categoria.find().lean();
const catMap  = Object.fromEntries(catDocs.map(c => [c.name.toUpperCase(), c._id]));

/* =========== INSERCIÓN =========== */
let inserted = 0, skipped = 0;

for (const r of rows) {
  const categoryId = catMap[r.cat];
  if (!categoryId) { console.warn('⚠️  Cat no encontrada →', r.cat); skipped++; continue; }

  const exists = await Producto.findOne({ name: new RegExp(`^${r.name}$`, 'i') });
  if (exists) { skipped++; continue; }

  await Producto.create({
    name: r.name,
    categoryId,
    price: r.price,
    stock: 0,
    stockByBranch: { 'Santa Rosa': 0, 'Macachín': 0 }
  });
  inserted++;
}

console.log(`\n✔️  Listo: ${inserted} productos insertados, ${skipped} omitidos`);
await mongoose.connection.close();
