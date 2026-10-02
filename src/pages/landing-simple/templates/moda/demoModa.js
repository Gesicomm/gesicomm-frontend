import ModaProductPage from './ModaProductPage';
import { resolverFichaModa } from './fichaModa';
import { armarItemFicha } from '../fichaComun';

// Only the template selector and development preview consume this sample.
export function demoModa() {
  const imagen = `${typeof window !== 'undefined' ? window.location.origin : ''}/templates/moda/fashion-editorial.svg`;
  const producto = { nombre: 'Blazer Forma', categoria: 'Sastrería', precio: 389000, imagen, imagenes: [imagen] };
  return {
    Pagina: ModaProductPage,
    producto,
    otros: [{ nombre: 'Denim recto', precio: 249000, imagen }, { nombre: 'Camisa blanca', precio: 189000, imagen }],
    ficha: resolverFichaModa({
      barra_superior: { activo: true, items: [{ texto: 'Nueva colección · Ejemplo', icono: 'star' }, { texto: 'Cambios hasta 30 días · Ejemplo', icono: 'rotate' }] },
      hero: { etiqueta: 'El esencial', eyebrow: 'Sastrería · Modo Norte', lead: 'Una estructura liviana que eleva cualquier look. Hombros suaves, caída limpia y el largo justo.' },
      prueba_social: { activo: true, calificacion: 4.9, resenas_texto: '248 reseñas de ejemplo' },
      precio: { nota: 'Hasta 3 cuotas sin interés · Condición de ejemplo' },
      compra: { notas: [{ icono: 'truck', texto: 'Envío gratis desde Gs. 300.000 · Ejemplo' }, { icono: 'check', texto: 'Cambios por 30 días · Ejemplo' }] },
      beneficios: { items: [{ titulo: 'Calce versátil', texto: 'Para combinar a tu manera' }, { titulo: 'Telas elegidas', texto: 'Composición en la ficha' }, { titulo: 'Talles reales', texto: 'Consultá la guía' }] },
      historia: { activo: true, titulo: 'Vestite como te sentís.', texto: 'Prendas versátiles, telas que se sienten bien y cortes pensados para acompañar tu ritmo.', puntos: ['Una prenda, muchos looks', 'Caída limpia', 'Detalles cuidados'], imagen },
      materiales: { activo: true, eyebrow: 'La diferencia está en la tela', titulo: 'Sentí la calidad.', subtitulo: 'Elegimos materiales por cómo caen y se sienten.', items: [{ nombre: 'Gabardina liviana', descripcion: '97% algodón · 3% elastano · Datos de ejemplo' }, { nombre: 'Lino lavado', descripcion: 'Respirable · Textura natural' }, { nombre: 'Denim comfort', descripcion: 'Calce flexible' }] },
      looks: { activo: true, eyebrow: 'La colección', titulo: 'Pocas prendas.', titulo_destacado: 'Muchas formas.', pasos: [{ titulo: 'La sastrería', descripcion: 'Cortes precisos para todos los días.', imagen }, { titulo: 'Denim esencial', descripcion: 'El calce que vuelve siempre.', imagen }, { titulo: 'Texturas suaves', descripcion: 'Capas livianas.', imagen }] },
      guia_talles: { activo: true, texto: 'Medidas de ejemplo en cm. Medí una prenda que te quede bien y compará.', columnas: ['Talle', 'Busto', 'Cintura', 'Cadera'], filas: [['XS', '82–86', '62–66', '88–92'], ['S', '86–90', '66–70', '92–96'], ['M', '90–94', '70–74', '96–100'], ['L', '94–100', '74–80', '100–106']] },
      resenas: { activo: true, titulo: 'Se nota cuando te queda bien.', items: [{ nombre: 'Sofía', calificacion: 5, comentario: 'El blazer tiene una caída increíble.', detalle: 'Reseña de ejemplo' }, { nombre: 'Vale', calificacion: 5, comentario: 'Lo uso para trabajar y para salir.', detalle: 'Reseña de ejemplo' }, { nombre: 'Agus', calificacion: 5, comentario: 'La tela y los detalles me encantaron.', detalle: 'Reseña de ejemplo' }] },
      cta_final: { marca: 'Modo Norte', texto: 'Ropa para moverte a tu manera.' },
    }, null, null),
    item: armarItemFicha({ ...producto, descripcion: 'Un esencial de sastrería para todos los días.',
      variantes: [{ id: 11, nombre: 'XS', stock: 3, precio_efectivo: 389000 }, { id: 12, nombre: 'S', stock: 5, precio_efectivo: 389000 }, { id: 13, nombre: 'M', stock: 6, precio_efectivo: 389000 }, { id: 14, nombre: 'L', stock: 0, precio_efectivo: 389000 }],
      faq: [{ pregunta: '¿Cómo elijo mi talle?', respuesta: 'Consultá la guía de talles junto al selector.' }, { pregunta: '¿Cuándo recibo mi pedido?', respuesta: 'El comercio carga acá sus plazos de entrega.' }, { pregunta: '¿Puedo cambiarlo?', respuesta: 'El comercio define acá sus condiciones de cambio.' }],
    }),
  };
}
