import { crearResolver, clonarSeccionResuelta as clonarComun, esObjeto, lista, numeroEntre } from '../fichaComun';
import { URGENCIA_DEFAULT, normalizarUrgencia } from '../contadorUrgencia';
export { ETIQUETA_FUENTE, fuenteDeSeccion, seccionEsPropia } from '../fichaComun';

// Structure is fixed. Copy, imagery and commercial claims belong to the merchant.
export const SECCIONES_MODA = [
  ['urgencia', 'Contador de urgencia', 'landing'],
  ['barra_superior', 'Cinta de beneficios', 'landing'],
  ['migas', 'Ruta de navegación', 'landing'],
  ['hero', 'Título y promesa', 'producto'],
  ['prueba_social', 'Calificación', 'producto'],
  ['precio', 'Precio', 'producto'],
  ['opciones', 'Variantes y paquetes', 'producto'],
  ['compra', 'Compra y notas', 'producto'],
  ['beneficios', 'Franja de beneficios', 'producto'],
  ['historia', 'Historia del producto', 'producto'],
  ['materiales', 'Telas y composición', 'producto'],
  ['looks', 'Ideas para combinar', 'producto'],
  ['guia_talles', 'Guía de talles', 'producto'],
  ['faq', 'Detalles del producto', 'producto'],
  ['resenas', 'Reseñas', 'producto'],
  ['upsells', 'Completá tu look', 'producto'],
  ['garantias', 'Sellos de confianza', 'landing'],
  ['cta_final', 'Pie de la ficha', 'landing'],
].map(([key, label, ambito]) => ({ key, label, ambito, ayuda: `Editá ${label.toLowerCase()} y su visibilidad en la ficha.` }));
export const CLAVES_SECCIONES = SECCIONES_MODA.map(s => s.key);
export const GRUPOS_PANEL_MODA = [
  { key: 'urgencia', label: 'Contador de urgencia', keys: ['urgencia'] },
  { key: 'barra_superior', label: 'Cinta de beneficios', keys: ['barra_superior'] },
  { key: 'encabezado_compra', label: 'Encabezado y compra', keys: ['migas', 'hero', 'prueba_social', 'precio', 'opciones', 'compra'] },
  { key: 'beneficios_historia', label: 'Beneficios e historia', keys: ['beneficios', 'historia'] },
  { key: 'materiales', label: 'Telas y composición', keys: ['materiales'] },
  { key: 'looks', label: 'Ideas para combinar', keys: ['looks'] },
  { key: 'guia_talles', label: 'Guía de talles', keys: ['guia_talles'] },
  { key: 'faq', label: 'Detalles del producto', keys: ['faq'] },
  { key: 'resenas', label: 'Reseñas', keys: ['resenas'] },
  { key: 'cierre', label: 'Complementos y confianza', keys: ['upsells', 'garantias', 'cta_final'] },
].map((g, i) => ({ ...g, numero: i + 1 }));
export const numeroDeSeccion = key => GRUPOS_PANEL_MODA.find(g => g.keys.includes(key))?.numero ?? '';

export const DEFAULTS_MODA = {
  urgencia: { ...URGENCIA_DEFAULT, activo: false, texto: '' },
  barra_superior: { activo: false, animado: true, velocidad: 28, separador: '✦', items: [], cta_texto: '' },
  migas: { activo: true, inicio: 'Inicio' },
  hero: { activo: true, etiqueta: '', eyebrow: '', titulo: '', lead: '' },
  prueba_social: { activo: false, calificacion: 0, resenas_texto: '' },
  precio: { activo: true, mostrar_descuento: true, nota: '' },
  opciones: { activo: true, titulo: 'Elegí tu talle', variantes: {}, titulo_packs: 'Elegí tu opción', etiqueta_individual: '1 unidad', nota_individual: '', packs: {}, texto_ahorro: 'Ahorrás' },
  compra: { activo: true, mostrar_cantidad: true, etiqueta_cantidad: 'Cantidad', cta_texto: 'Agregar al carrito', cta_agregado: 'Agregado al carrito', cta_color: '', notas: [] },
  beneficios: { activo: true, items: [] },
  historia: { activo: false, eyebrow: '', titulo: '', texto: '', puntos: [], imagen: '' },
  materiales: { activo: false, eyebrow: 'Conocé el producto', titulo: 'Telas y composición', titulo_destacado: '', subtitulo: '', color_fondo: '', items: [] },
  looks: { activo: false, eyebrow: 'Ideas para usarlo', titulo: 'Más formas de usarlo', titulo_destacado: '', pasos: [] },
  guia_talles: { activo: false, eyebrow: 'Comprá sin dudas', titulo: 'Tu talle, más fácil.', texto: '', columnas: [], filas: [], enlace_texto: '¿Cuál es el mío?' },
  faq: { activo: true, eyebrow: 'Detalles del producto', titulo: 'Todo lo que necesitás saber.' },
  resenas: { activo: false, eyebrow: 'Reseñas', titulo: 'Así les queda.', items: [] },
  upsells: { activo: true, titulo: 'Completá tu look', cta_texto: 'Agregar' },
  garantias: { activo: false, items: [] },
  cta_final: { activo: true, marca: '', texto: '' },
};
export const LIMITES = {
  barra_superior_items: 6, compra_notas: 4, beneficios_items: 4, historia_puntos: 6,
  materiales_items: 6, looks_pasos: 4, resenas_items: 9, garantias_items: 6,
};

function normalizar(key, s) {
  const base = { ...s, activo: s.activo !== false };
  if (key === 'urgencia') return normalizarUrgencia(base);
  if (key === 'barra_superior') base.velocidad = numeroEntre(base.velocidad, 8, 120, 28);
  if (key === 'prueba_social') base.calificacion = numeroEntre(base.calificacion, 0, 5, 0);
  if (key === 'opciones') {
    base.variantes = esObjeto(base.variantes) ? base.variantes : {};
    base.packs = esObjeto(base.packs) ? base.packs : {};
  }
  const campo = key === 'compra' ? 'notas' : key === 'historia' ? 'puntos' : key === 'looks' ? 'pasos' : 'items';
  if (campo in DEFAULTS_MODA[key]) {
    base[campo] = lista(base[campo], LIMITES[`${key}_${campo}`] || 6).filter(x =>
      key === 'historia' ? typeof x === 'string' : esObjeto(x));
  }
  if (key === 'resenas') base.items = base.items.map(x => ({ ...x, calificacion: numeroEntre(x.calificacion, 0, 5, 0) }));
  if (key === 'guia_talles') {
    base.columnas = lista(base.columnas, 8).filter(x => typeof x === 'string');
    base.filas = lista(base.filas, 30).filter(Array.isArray).map(row => row.slice(0, 8).map(x => typeof x === 'string' || typeof x === 'number' ? String(x) : ''));
  }
  if (key === 'materiales' && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(base.color_fondo || '')) base.color_fondo = DEFAULTS_MODA.materiales.color_fondo;
  return base;
}
export const resolverFichaModa = crearResolver({ defaults: DEFAULTS_MODA, claves: CLAVES_SECCIONES, normalizar });
export const clonarSeccionResuelta = (ficha, key) => clonarComun(ficha, key, DEFAULTS_MODA);

// The same adapter serves Mis Productos, the landing editor and public pages.
export function fichaModaDesdeProducto(producto) {
  if (!esObjeto(producto)) return {};
  const d = esObjeto(producto.ficha_datos) ? producto.ficha_datos : {};
  const ficha = {};
  if (producto.faq_titulo?.trim()) ficha.faq = { titulo: producto.faq_titulo.trim() };
  if (producto.propuesta_valor?.trim()) ficha.hero = { lead: producto.propuesta_valor.trim() };
  if (d.cta_principal_texto?.trim()) ficha.compra = { cta_texto: d.cta_principal_texto.trim() };
  const beneficios = lista(producto.beneficios).filter(b => b?.titulo?.trim());
  if (beneficios.length) ficha.beneficios = { items: beneficios };
  const confianza = lista(producto.confianza).filter(c => c?.texto?.trim());
  const iconos = { ShieldCheck: 'shield', Truck: 'truck', RotateCcw: 'rotate', Headphones: 'headphones', CheckCircle2: 'badge', Star: 'star' };
  if (confianza.length) ficha.garantias = { activo: true, items: confianza.map(c => ({ icono: iconos[c.icono] || c.icono || 'shield', titulo: c.texto, texto: '' })) };
  const puntos = lista(d.beneficios_rapidos).filter(x => typeof x === 'string' && x.trim());
  if (puntos.length) ficha.historia = { activo: true, puntos };
  // Product-owned fields override landing defaults, but remain overridable per landing.
  if (esObjeto(d.moda_ficha)) {
    for (const key of CLAVES_SECCIONES) if (esObjeto(d.moda_ficha[key])) ficha[key] = { ...ficha[key], ...d.moda_ficha[key] };
  }
  return ficha;
}
