import FitnessProductPage from './fitness/FitnessProductPage';
import TechProductPage from './tech/TechProductPage';
import BeautyProductPage from './beauty/BeautyProductPage';
import BazarProductPage from './bazar/BazarProductPage';
import { resolverFichaBazar } from './bazar/fichaBazar';
import { demoModa } from './moda/demoModa';
import BasicoProductPage from './basico/BasicoProductPage';
import { armarItemFicha as armarItemFitness, fichaDesdeMarketing, resolverFichaFitness } from './fitness/fichaFitness';
import { resolverFichaTech, fichaTechDesdeProducto } from './tech/fichaTech';
import { resolverFichaBeauty, fichaBeautyDesdeProducto } from './beauty/fichaBeauty';
import { resolverFichaBasico, fichaBasicoDesdeProducto } from './basico/fichaBasico';
import { armarItemFicha } from './fichaComun';
import { mapEditorDraftToTemplateData } from '../mapLandingToTemplateData';

/**
 * Contenido de ejemplo para el botón "Ver preview" del selector de
 * templates. Muestra cómo se ve cada template — portada y ficha de
 * producto — antes de crear la landing.
 *
 * Todo entra por donde entraría de verdad (Vista del producto, ofertas,
 * ficha de la landing) y se dibuja con los MISMOS componentes que la
 * landing publicada: lo que se ve en el preview es el template real con
 * datos de mentira, no una captura.
 *
 * Los textos y cifras son de ejemplo. No son defaults: una landing nueva
 * arranca con DEFAULTS_FICHA de cada template, no con esto.
 */

const foto = (semilla, w = 800, h = 800) => `https://picsum.photos/seed/${semilla}/${w}/${h}`;

/* ── Fitness & Suplementos ───────────────────────────────────────── */

// Frascos de muestra que ya viven en public/ (los usa también __DevLienzo).
// Con origen completo: getMediaUrl le pega el dominio del backend a toda
// ruta relativa, y estos archivos los sirve el frontend.
const frasco = (nombre) => `${window.location.origin}/__dev-lienzo/${nombre}.png`;
const FOTOS_FITNESS = [frasco('adelfit'), frasco('adelfit2'), frasco('magnesio')];

const PRODUCTO_FITNESS = {
  nombre: 'AdelFit',
  categoria: 'Suplementos naturales',
  propuesta_valor: 'no las promesas. Una fórmula natural para acompañarte a sentirte mejor todos los días.',
  beneficios: [
    { icono: 'leaf', titulo: 'Fórmula natural', texto: 'Ingredientes seleccionados' },
    { icono: 'sparkles', titulo: 'Bienestar diario', texto: 'Acompaña tus hábitos' },
    { icono: 'check', titulo: 'Digestión ligera', texto: 'Pensado para tu rutina' },
    { icono: 'shield', titulo: 'Calidad cuidada', texto: 'Ingredientes certificados' },
  ],
};

const FICHA_FITNESS = {
  urgencia: { minutos: 8, segundos: 12 },
  anuncio: {
    cta_texto: '',
    items: [
      { icono: 'shield', texto: 'Compra 100% segura y garantizada' },
      { icono: 'truck', texto: 'Envío gratis solo hoy' },
      { icono: 'leaf', texto: 'Ingredientes certificados' },
    ],
  },
  hero: {
    titulo: 'Tu rutina de bienestar,',
    titulo_destacado: 'más simple.',
    lead_resaltado: 'Cuidá tu bienestar,',
  },
  compra: {
    cta_texto: '¡Pedí y pagá al recibir!',
    microcopy: 'Envío gratis',
  },
  prueba_social: { activo: true, calificacion: 4.8, resenas_texto: 'basado en +3.000 clientes felices' },
  ofertas: {
    etiqueta_individual: 'Pack Inicio',
    subtitulo_individual: '1 mes de tratamiento',
    badge_individual: 'Bestseller',
    packs: {
      1: { badge: 'Más elegido', subtitulo: '2 meses de tratamiento' },
      2: { badge: 'Mejor valor', subtitulo: '3 meses de tratamiento' },
    },
  },
  garantias: {
    items: [
      { icono: 'shield', titulo: 'Compra segura' },
      { icono: 'leaf', titulo: 'Ingredientes certificados' },
    ],
  },
  como_funciona: {
    activo: true,
    eyebrow: 'Resultados reales',
    pasos: [
      { titulo: 'Primeros días', texto: 'Menos hinchazón' },
      { titulo: '2 semanas', texto: 'Más ligereza' },
      { titulo: '4 semanas', texto: 'Rutina más estable' },
      { titulo: '8 semanas', texto: 'Un cambio que se nota' },
    ],
  },
  ingredientes: {
    activo: true,
    subtitulo: 'Cada ingrediente tiene una función. Así es como esta fórmula trabaja para vos.',
    frase: '“Hacé de tu bienestar una prioridad.”',
    items: [
      { nombre: 'Psyllium', icono: 'leaf', texto: 'Fibra natural que se expande con agua y ayuda a sentir saciedad.' },
      { nombre: 'Espinaca', icono: 'sprout', texto: 'Nutrientes esenciales para acompañar tu rutina diaria.' },
      { nombre: 'Clorofila', icono: 'droplet', texto: 'Un ingrediente vegetal pensado para una fórmula más completa.' },
    ],
  },
  estadisticas: {
    activo: true,
    texto: 'Calidad, transparencia y una experiencia pensada para personas reales.',
    items: [
      { valor: '94%', texto: 'se sintió más liviano' },
      { valor: '91%', texto: 'lo recomendaría' },
      { valor: '93%', texto: 'notó menos apetito' },
      { valor: '90%', texto: 'mejoró su digestión' },
    ],
    nota: 'Cifras de ejemplo.',
  },
  antes_despues: {
    activo: true,
    eyebrow: 'El cambio que todas están viendo',
    subtitulo: 'Historias reales de personas que incorporaron una rutina constante.',
    bloque_titulo: 'Un proceso que se nota',
    texto: 'Los resultados pueden variar según cada persona. Lo importante es acompañar tu bienestar con hábitos sostenibles, alimentación equilibrada y constancia.',
    puntos: ['Menos hinchazón', 'Más ligereza', 'Rutina más estable'],
    // La misma foto en gris y a color: se entiende como antes/después sin
    // mostrar personas de mentira.
    imagen_antes: `${foto('bosque-fit', 400, 480)}?grayscale`,
    imagen_despues: foto('bosque-fit', 400, 480),
  },
  opiniones: {
    activo: true,
    items: [
      { nombre: 'Laura G.', calificacion: 5, comentario: 'Lo tomo hace un mes y me acompaña bien en la rutina. Llegó rápido.', foto: 'https://randomuser.me/api/portraits/women/44.jpg' },
      { nombre: 'Carlos M.', calificacion: 5, comentario: 'Fácil de tomar y la atención por WhatsApp fue excelente.', foto: 'https://randomuser.me/api/portraits/men/32.jpg' },
      { nombre: 'Sofía R.', calificacion: 4, comentario: 'Me gustó que sea natural. Ya pedí el pack de dos meses.', foto: 'https://randomuser.me/api/portraits/women/68.jpg' },
      { nombre: 'Diego A.', calificacion: 5, comentario: 'Pagué al recibir, sin vueltas. Lo recomiendo.', foto: 'https://randomuser.me/api/portraits/men/75.jpg' },
    ],
  },
  comparativa: {
    activo: true,
    subtitulo: 'No todos los suplementos son iguales. Mirá la diferencia.',
    nosotros: 'AdelFit',
    items: [
      { caracteristica: 'Fórmula 100% natural', nosotros: 'Incluido', otros: 'No siempre' },
      { caracteristica: 'Ingredientes seleccionados', nosotros: 'Certificados', otros: 'Variable' },
      { caracteristica: 'Pensado para el bienestar diario', nosotros: 'Sí', otros: 'Depende' },
      { caracteristica: 'Pago al recibir', nosotros: 'Sí', otros: 'No siempre' },
      { caracteristica: 'Atención y seguimiento', nosotros: 'Sí', otros: 'Variable' },
    ],
  },
  cta_final: {
    titulo: 'Bienestar real, todos los días.',
    texto: 'Compra segura · Envío gratis · Pago al recibir',
  },
};

function demoFitness() {
  return {
    Pagina: FitnessProductPage,
    producto: { nombre: PRODUCTO_FITNESS.nombre, precio: 189000, precioAntes: 250000, imagenes: FOTOS_FITNESS },
    ficha: resolverFichaFitness(FICHA_FITNESS, null, fichaDesdeMarketing(PRODUCTO_FITNESS)),
    item: armarItemFitness({
      nombre: PRODUCTO_FITNESS.nombre,
      categoria: PRODUCTO_FITNESS.categoria,
      descripcion: PRODUCTO_FITNESS.propuesta_valor,
      precio: 189000,
      precioAntes: 250000,
      imagenes: FOTOS_FITNESS,
      ofertas: [
        { id: 1, nombre: 'Pack Dúo', estrategia: 'normal', tipo_contenido: 'pack', unidades: 2, precio: 279000, precio_efectivo: 279000 },
        { id: 2, nombre: 'Pack Trío', estrategia: 'normal', tipo_contenido: 'pack', unidades: 3, precio: 349000, precio_efectivo: 349000 },
      ],
      faq: [
        { pregunta: '¿De qué está hecho el producto?', respuesta: 'Una combinación de ingredientes naturales seleccionados para acompañar tus hábitos de bienestar.' },
        { pregunta: '¿Tiene contraindicaciones?', respuesta: 'Consultá siempre con un profesional de la salud antes de comenzar cualquier suplemento.' },
        { pregunta: '¿Cuánto tiempo tarda en hacer efecto?', respuesta: 'La experiencia puede variar. La constancia y una rutina equilibrada son claves para notar cambios.' },
        { pregunta: '¿Puedo tomarlo si no hago ejercicio?', respuesta: 'Sí, está pensado para acompañar tu día a día, con o sin entrenamiento.' },
        { pregunta: '¿Cómo pago? ¿Es seguro?', respuesta: 'Podés pagar al recibir. Tu pedido viaja protegido y con seguimiento.' },
      ],
    }),
    otros: [
      { nombre: 'Colágeno hidrolizado', precio: 159000, imagen: frasco('colageno') },
      { nombre: 'Shaker deportivo', precio: 89000, precioAntes: 110000, imagen: frasco('shaker') },
    ],
  };
}

/* ── Electrónica & Tecnología ────────────────────────────────────── */

function demoTech() {
  const producto = {
    nombre: 'Auriculares inalámbricos ProSound Max',
    categoria: 'Auriculares',
    propuesta_valor: 'Sonido premium. Comodidad extrema. Tecnología de última generación.',
    beneficios: [
      { titulo: 'Sonido Hi-Fi con bajos profundos', texto: 'Audio de alta definición.' },
      { titulo: 'Cancelación activa de ruido', texto: 'Bloquea el ruido externo.' },
      { titulo: 'Hasta 50 horas de batería', texto: 'Reproducción continua.' },
      { titulo: 'Bluetooth 5.3 estable', texto: 'Conexión de última generación.' },
    ],
    confianza: [
      { icono: 'ShieldCheck', texto: 'Garantía 2 años' },
      { icono: 'Truck', texto: 'Envío gratis' },
    ],
    ficha_rubro: 'tecnologia',
    ficha_datos: {
      especificaciones: [
        { clave: 'Conectividad', valor: 'Bluetooth 5.3' },
        { clave: 'Batería', valor: '50 horas de reproducción' },
        { clave: 'Peso', valor: '250 g' },
      ],
      en_la_caja: ['1x Auriculares', '1x Cable USB-C', '1x Estuche de viaje'],
      comparativa: [
        { caracteristica: 'Cancelación de ruido', nosotros: true, otros: false },
        { caracteristica: 'Batería 50 horas', nosotros: true, otros: false },
        { caracteristica: 'Bluetooth 5.3', nosotros: true, otros: true },
      ],
    },
  };
  const imagenes = [foto('a1'), foto('a2'), foto('a3')];
  return {
    Pagina: TechProductPage,
    producto: { nombre: producto.nombre, precio: 1099000, precioAntes: 1465000, imagenes },
    ficha: resolverFichaTech(
      { prueba_social: { activo: true, calificacion: 4.8, resenas_texto: '1.248 reseñas' }, comparativa: { activo: true, nosotros: 'ProSound Max' } },
      { hero: { titulo_destacado: 'ProSound Max' } },
      fichaTechDesdeProducto(producto)
    ),
    item: armarItemFicha({
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.propuesta_valor,
      precio: 1099000,
      precioAntes: 1465000,
      imagenes,
      ofertas: [
        { id: 10, nombre: 'Llevá 2', estrategia: 'normal', tipo_contenido: 'pack', unidades: 2, precio: 1980000, precio_efectivo: 1980000 },
      ],
      faq: [
        { pregunta: '¿Cuánto dura la batería?', respuesta: 'Hasta 50 horas de reproducción y carga rápida por USB-C.' },
        { pregunta: '¿Tiene garantía?', respuesta: 'Garantía oficial de 2 años.' },
      ],
    }),
    otros: [
      { nombre: 'Parlante portátil', precio: 459000, imagen: foto('a4') },
      { nombre: 'Cargador rápido 30W', precio: 129000, imagen: foto('a5') },
    ],
  };
}

/* ── Beauty & Skincare ───────────────────────────────────────────── */

function demoBeauty() {
  const producto = {
    nombre: 'Glow Serum',
    categoria: 'Skincare',
    propuesta_valor: 'El sérum diario para una piel luminosa, hidratada y visiblemente más uniforme.',
    beneficios: [
      { titulo: 'Hidratación intensa', texto: 'Sin sensación pesada' },
      { titulo: 'Glow natural', texto: 'Una piel más despierta' },
      { titulo: 'Fórmula limpia', texto: 'Vegana y cruelty free' },
      { titulo: 'Para todos los días', texto: 'Todo tipo de piel' },
    ],
    ficha_rubro: 'beauty',
    ficha_datos: {
      beneficios_rapidos: ['Mejora la apariencia de la textura', 'Aporta luminosidad sin brillo graso', 'Se puede usar bajo maquillaje'],
      beauty_ingredientes: [
        { icono: 'droplet', nombre: 'Ácido hialurónico', descripcion: 'Atrae y retiene hidratación para una piel más rellena y flexible.' },
        { icono: 'sparkles', nombre: 'Niacinamida 5%', descripcion: 'Ayuda a mejorar la apariencia de poros y tono desigual.' },
        { icono: 'leaf', nombre: 'Centella asiática', descripcion: 'Calma la piel y acompaña su barrera natural.' },
      ],
      beauty_pasos: [
        { titulo: 'Limpiá', descripcion: 'Comenzá con el rostro limpio y seco.' },
        { titulo: 'Aplicá', descripcion: 'Usá 2 o 3 gotas y masajeá suavemente.' },
        { titulo: 'Sellá', descripcion: 'Terminá con tu hidratante y protector solar.' },
      ],
    },
  };
  const imagenes = [frasco('colageno'), frasco('implementa'), frasco('magnesio')];
  return {
    Pagina: BeautyProductPage,
    producto: { nombre: producto.nombre, precio: 189000, precioAntes: 229000, imagenes },
    ficha: resolverFichaBeauty(
      {
        hero: { etiqueta: 'Best seller', eyebrow: 'Luméa skin · Serum facial' },
        historia: {
          activo: true,
          titulo: 'Una fórmula simple para una piel que se siente bien.',
          texto: 'Glow Serum combina activos conocidos y una textura ligera que se integra a tu rutina sin complicarla. No busca tapar tu piel: busca acompañarla.',
        },
        como_funciona: {
          eyebrow: 'Tu ritual en 3 pasos',
          pasos: [
            { icono: 'clock', titulo: 'Limpiá', descripcion: 'Comenzá con el rostro limpio y seco.' },
            { icono: 'droplet', titulo: 'Aplicá', descripcion: 'Usá 2 o 3 gotas y masajeá suavemente.' },
            { icono: 'sun', titulo: 'Sellá', descripcion: 'Terminá con tu hidratante y protector solar.' },
          ],
        },
        ingredientes: { subtitulo: 'Una fórmula corta, transparente y pensada para que sepas exactamente qué estás usando.' },
        opciones: { variantes: { 1: { nota: 'Ideal para probar' }, 2: { nota: 'Mejor valor' } } },
        antes_despues: {
          activo: true,
          // La misma foto en gris y a color: se entiende sin mostrar personas de mentira.
          imagen_antes: `${foto('piel-demo', 900, 530)}?grayscale`,
          imagen_despues: foto('piel-demo', 900, 530),
        },
        resenas: {
          activo: true,
          items: [
            { nombre: 'Sofía', calificacion: 5, comentario: 'La textura es hermosa. Se absorbe rápido y mi piel se ve mucho más luminosa.', detalle: 'Compra verificada' },
            { nombre: 'Valentina', calificacion: 5, comentario: 'Me encanta que no se sienta pegajoso. Ahora es el paso que nunca me salteo.', detalle: 'Compra verificada' },
            { nombre: 'Micaela', calificacion: 5, comentario: 'Lo uso antes del maquillaje y deja la piel muy linda, sin marcar textura.', detalle: 'Compra verificada' },
          ],
        },
      },
      {
        barra_superior: {
          items: [
            { icono: 'truck', texto: 'Envío gratis desde Gs. 150.000' },
            { icono: 'shield', texto: 'Compra 100% segura' },
            { icono: 'check', texto: 'Garantía de satisfacción' },
            { icono: 'heart', texto: 'Fórmulas veganas y cruelty free' },
          ],
        },
        prueba_social: { activo: true, calificacion: 4.9, resenas_texto: '(2.400 reseñas)' },
        precio: { nota: 'Hasta 3 cuotas sin interés · Envío gratis incluido' },
        compra: {
          notas: [
            { icono: 'shield', texto: 'Compra segura y protegida' },
            { icono: 'truck', texto: 'Despachamos en 24 horas' },
            { icono: 'check', texto: 'Garantía de satisfacción' },
          ],
        },
        garantias: {
          items: [
            { icono: 'shield', titulo: 'Compra protegida', texto: 'Tu pago y tus datos están seguros.' },
            { icono: 'truck', titulo: 'Envío rápido', texto: 'Recibí tu pedido en 24 a 72 horas.' },
            { icono: 'heart', titulo: 'Hecho con intención', texto: 'Fórmulas veganas y cruelty free.' },
          ],
        },
        cta_final: { marca: 'Luméa', texto: 'Skincare para volver a vos.' },
      },
      fichaBeautyDesdeProducto(producto)
    ),
    item: armarItemFicha({
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.propuesta_valor,
      precio: 189000,
      precioAntes: 229000,
      imagenes,
      variantes: [
        { id: 1, nombre: '30 ml', precio_efectivo: 189000, stock: 10 },
        { id: 2, nombre: '50 ml', precio_efectivo: 249000, stock: 5 },
      ],
      faq: [
        { pregunta: '¿Cómo se usa?', respuesta: 'Aplicá 2 o 3 gotas sobre rostro y cuello después de limpiar la piel. Usalo por la mañana o por la noche y sellá con tu hidratante.' },
        { pregunta: '¿Es apto para piel sensible?', respuesta: 'La fórmula es vegana y dermatológicamente testeada. Si tu piel es reactiva, recomendamos probar primero en una zona pequeña.' },
        { pregunta: '¿Cuánto dura un frasco?', respuesta: 'Con 2 o 3 gotas por aplicación, el frasco de 30 ml dura aproximadamente 8 semanas.' },
      ],
    }),
    otros: [
      { nombre: 'Crema hidratante', precio: 159000, imagen: frasco('adelfit2') },
      { nombre: 'Limpiador facial', precio: 119000, imagen: frasco('shaker') },
    ],
  };
}

/* ── Básico ──────────────────────────────────────────────────────── */

function demoBasico() {
  const producto = {
    nombre: 'Organizador modular de escritorio',
    categoria: 'Oficina',
    propuesta_valor: 'Todo en su lugar, en un diseño simple que se adapta a tu espacio.',
    beneficios: [
      { titulo: 'Calidad superior', texto: 'Materiales seleccionados', icono: 'star' },
      { titulo: 'Fácil de usar', texto: 'Se arma en minutos', icono: 'check' },
      { titulo: 'Compra segura', texto: 'Garantía incluida', icono: 'shield' },
    ],
    confianza: [
      { icono: 'ShieldCheck', texto: 'Garantía 30 días' },
      { icono: 'Truck', texto: 'Envío a todo el país' },
    ],
  };
  const imagenes = [foto('org1'), foto('org2'), foto('org3')];
  return {
    Pagina: BasicoProductPage,
    producto: { nombre: producto.nombre, precio: 259000, precioAntes: 329000, imagenes },
    ficha: resolverFichaBasico(
      { hero: { titulo: 'La solución simple para', titulo_destacado: 'ordenar tu día.' } },
      { prueba_social: { activo: true, calificacion: 4.8, resenas_texto: '2.847 reseñas' } },
      fichaBasicoDesdeProducto(producto)
    ),
    item: armarItemFicha({
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.propuesta_valor,
      precio: 259000,
      precioAntes: 329000,
      imagenes,
      ofertas: [
        { id: 41, nombre: '3 unidades', estrategia: 'normal', tipo_contenido: 'pack', unidades: 3, precio: 690000, precio_efectivo: 690000 },
      ],
      faq: [
        { pregunta: '¿Cuánto tarda en llegar?', respuesta: 'Entre 2 y 5 días hábiles, con seguimiento.' },
        { pregunta: '¿Puedo devolverlo?', respuesta: 'Sí, tenés 30 días para pedir un cambio.' },
      ],
    }),
    otros: [
      { nombre: 'Lámpara de escritorio', precio: 189000, imagen: foto('acc1') },
      { nombre: 'Soporte para notebook', precio: 149000, imagen: foto('acc2') },
    ],
  };
}

function demoBazar() {
  const imagen = `${typeof window !== 'undefined' ? window.location.origin : ''}/templates/bazar/manta-ambiente.svg`;
  const producto = { nombre: 'Manta Nórdica', categoria: 'Textiles', precio: 249000, precioAntes: 299000, imagen, imagenes: [imagen] };
  return {
    Pagina: BazarProductPage,
    producto,
    otros: [{ nombre: 'Funda de almohadón', precio: 89000, imagen }, { nombre: 'Set de textiles', precio: 449000, imagen }],
    ficha: resolverFichaBazar({
      barra_superior: { activo: true, items: [{ icono: 'truck', texto: 'Envío gratis desde Gs. 250.000' }, { icono: 'rotate', texto: 'Cambios fáciles' }, { icono: 'shield', texto: 'Compra segura' }] },
      hero: { etiqueta: 'Edición limitada', eyebrow: 'Textiles · Bazar Jobar', lead: 'Textura, abrigo y ese detalle que transforma cualquier rincón.' },
      prueba_social: { activo: true, calificacion: 4.8, resenas_texto: '186 reseñas de ejemplo' },
      precio: { nota: 'Hasta 3 cuotas sin interés · Condiciones de ejemplo' },
      opciones: { titulo: 'Elegí tu color', etiqueta_individual: '1 manta', packs: { 51: { nota: 'Pack dúo' } } },
      compra: { notas: [{ icono: 'check', texto: '130 × 180 cm' }, { icono: 'check', texto: 'Algodón lavado' }] },
      beneficios: { items: [{ titulo: 'Medidas reales', texto: '130 × 180 cm' }, { titulo: 'Material', texto: 'Algodón lavado' }, { titulo: 'Cambios simples', texto: 'Hasta 30 días' }, { titulo: 'Diseño atemporal', texto: 'Combina con todo' }] },
      historia: { activo: true, eyebrow: 'El detalle que cambia el espacio', titulo: 'Tu casa también puede sentirse.', texto: 'Una manta elegida suma textura, color y una sensación de hogar. Pensada para tu sofá, tu cama y tus momentos de pausa.', imagen, puntos: ['Tejido suave', 'Se adapta a tu ambiente', 'Terminación cuidada'] },
      materiales: { activo: true, titulo: 'Hecha para usarla', titulo_destacado: 'todos los días.', items: [{ nombre: 'Algodón lavado', descripcion: 'Suave al tacto, respirable y con caída natural.' }, { nombre: 'Color con carácter', descripcion: 'Terracota cálido para sumar profundidad al espacio.' }, { nombre: 'Terminación cuidada', descripcion: 'Bordes prolijos y costuras reforzadas.' }] },
      ambientes: { activo: true, titulo: 'Una pieza,', titulo_destacado: 'tres ambientes.', pasos: [{ titulo: 'En el sofá', descripcion: 'Para tardes de película.', imagen }, { titulo: 'En el dormitorio', descripcion: 'Un extra de textura.', imagen }, { titulo: 'En tu rincón', descripcion: 'El toque final.', imagen }] },
      medidas: { activo: true, texto: '130 × 180 cm', items: ['Sofá de 2 cuerpos', 'Pie de cama', 'Sillón individual'] },
      resenas: { activo: true, items: [{ nombre: 'Camila', calificacion: 5, comentario: 'El color es precioso y la textura se siente suave.', detalle: 'Reseña de ejemplo' }, { nombre: 'Martina', calificacion: 5, comentario: 'Quedó perfecta en mi sofá.', detalle: 'Reseña de ejemplo' }, { nombre: 'Florencia', calificacion: 5, comentario: 'El toque que buscaba para mi rincón.', detalle: 'Reseña de ejemplo' }] },
      cta_final: { marca: 'Bazar Jobar', texto: 'Objetos para vivir bonito.' },
    }, null, null),
    item: armarItemFicha({ ...producto, descripcion: 'Textura y abrigo para tu hogar.',
      variantes: [{ id: 1, nombre: 'Terracota', stock: 20, precio_efectivo: 249000 }, { id: 2, nombre: 'Arena', stock: 15, precio_efectivo: 249000 }, { id: 3, nombre: 'Oliva', stock: 8, precio_efectivo: 249000 }],
      ofertas: [{ id: 51, nombre: 'Pack Dúo', estrategia: 'normal', tipo_contenido: 'pack', unidades: 2, precio: 449000, imagen }],
      faq: [{ pregunta: '¿Qué medidas tiene?', respuesta: 'La manta de ejemplo mide 130 × 180 cm.' }, { pregunta: '¿Cómo se lava?', respuesta: 'Lavado delicado con agua fría. Seguí las instrucciones del producto.' }, { pregunta: '¿Cuándo recibo mi pedido?', respuesta: 'El comercio carga acá sus plazos de entrega.' }],
    }),
  };
}

const DEMOS = {
  'fitness-suplementos': demoFitness,
  'tech-electronica': demoTech,
  'beauty-skincare': demoBeauty,
  'basico': demoBasico,
  'bazar-hogar': demoBazar,
  'moda-indumentaria': demoModa,
};

/**
 * @returns {null | {
 *   Pagina, item, ficha,      // la ficha de producto, lista para dibujar
 *   tienda,                   // datos de la portada (forma de mapEditorDraftToTemplateData)
 * }}
 */
export function demoDeTemplate(slug) {
  const armar = DEMOS[slug];
  if (!armar) return null;
  const demo = armar();

  // La portada se arma con el mismo mapeo que usa el editor, a partir de un
  // "borrador" y un catálogo de mentira: el producto principal y dos más.
  const catalogo = [demo.producto, ...demo.otros].map((p, i) => ({
    id: i + 1,
    slug: `demo-${i + 1}`,
    nombre: p.nombre,
    precio_efectivo: p.precio,
    precio_tachado: p.precioAntes || null,
    imagen: (p.imagenes || [p.imagen])[0],
    imagenes: p.imagenes || [p.imagen],
  }));
  const tienda = mapEditorDraftToTemplateData({
    titulo: 'Tu comercio',
    banner_titulo: 'Así se ve tu tienda',
    banner_subtitulo: 'Contenido de ejemplo: todo esto lo cambiás desde el armador.',
    banner_boton_texto: 'Ver productos',
    items: catalogo.map(c => ({ tipo: 'producto', referencia_id: c.id })),
    faq: demo.item.faq,
    beneficios: (demo.ficha.beneficios?.items || []).slice(0, 3),
  }, { productos: catalogo, combos: [] });

  if (slug === 'bazar-hogar') {
    tienda.nombreComercio = 'Bazar Jobar';
    tienda.hero.titulo = 'Objetos para vivir bonito.';
    tienda.hero.imagen = demo.producto.imagen;
    tienda.tema = { fondo: '#FBFAF7', texto: '#292722', acento: '#A95843' };
  }
  if (slug === 'moda-indumentaria') {
    tienda.nombreComercio = 'Modo Norte';
    tienda.hero.titulo = 'Vestite como\nte sentís.';
    tienda.hero.subtitulo = 'Prendas versátiles, telas que se sienten bien y cortes pensados para acompañar tu ritmo.';
    tienda.hero.ctaTexto = 'Ver la colección';
    tienda.hero.imagen = demo.producto.imagen;
    tienda.productosTitulo = 'Pocas prendas.\nMuchas formas.';
    tienda.contenidoAdicional = { titulo: 'Sentí la calidad.', texto: 'Cada prenda cuenta su composición y sus cuidados en la ficha de producto.' };
    tienda.tema = { fondo: '#FBFAF7', texto: '#171615', acento: '#E4513D' };
  }
  return { Pagina: demo.Pagina, item: demo.item, ficha: demo.ficha, tienda };
}
