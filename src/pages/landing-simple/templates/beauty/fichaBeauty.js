/**
 * Ficha de producto del template "Beauty & Skin Care" — modelo de datos.
 */

import {
  crearResolver, clonarSeccionResuelta as clonarComun,
  esObjeto, lista, numeroEntre,
} from '../fichaComun';

export { ETIQUETA_FUENTE, fuenteDeSeccion, seccionEsPropia } from '../fichaComun';

export const SECCIONES_BEAUTY = [
  { key: 'barra_superior',  numero: 1,  label: 'Barra superior',            ambito: 'landing',  ayuda: 'Franja fija arriba: envío, garantía y pago.' },
  { key: 'hero',            numero: 2,  label: 'Encabezado',                ambito: 'producto', ayuda: 'Título, propuesta de valor, beneficios y CTA principal.' },
  { key: 'prueba_social',   numero: 3,  label: 'Prueba social',             ambito: 'landing',  ayuda: 'Calificación con estrellas, reseñas y clientes satisfechos.' },
  { key: 'precio',          numero: 4,  label: 'Ofertas y opciones',        ambito: 'producto', ayuda: 'Ofertas, precios y suscripción.' },
  { key: 'beneficios',      numero: 5,  label: 'Beneficios clave',          ambito: 'producto', ayuda: 'Beneficios con ícono y texto corto.' },
  { key: 'ingredientes',    numero: 6,  label: 'Ingredientes premium',      ambito: 'producto', ayuda: 'Lista de ingredientes con sus beneficios. Se cargan en Mis Productos.' },
  { key: 'resultados',      numero: 7,  label: 'Resultados (Antes/Después)',ambito: 'producto', ayuda: 'Testimonios reales de clientas. Se cargan en Mis Productos.' },
  { key: 'como_funciona',   numero: 8,  label: 'Cómo funciona (Pasos)',     ambito: 'producto', ayuda: 'Pasos de uso del producto. Se cargan en Mis Productos.' },
  { key: 'garantias',       numero: 9,  label: 'Garantías y confianza',     ambito: 'landing',  ayuda: 'Garantía, testeo dermatológico y cruelty free.' },
  { key: 'faq',             numero: 10, label: 'Preguntas frecuentes',      ambito: 'producto', ayuda: 'Las preguntas se cargan en la pestaña "Detalles".' },
  { key: 'upsells',         numero: 11, label: 'Complementa tu rutina',     ambito: 'producto', ayuda: 'Los productos se eligen en la pestaña "Relacionados".' },
  { key: 'cta_final',       numero: 12, label: 'Cierre y urgencia',         ambito: 'landing',  ayuda: 'Último llamado a la acción con contador.' },
];

export const CLAVES_SECCIONES = SECCIONES_BEAUTY.map(s => s.key);

export const DEFAULTS_BEAUTY = {
  barra_superior: {
    activo: true,
    items: [
      { icono: 'truck',  texto: 'ENVÍO GRATIS EN TODOS LOS PEDIDOS' },
      { icono: 'shield-check', texto: 'GARANTÍA 60 DÍAS' },
      { icono: 'lock-keyhole', texto: 'PAGO SEGURO SSL' },
    ],
    cta_texto: 'COMPRAR AHORA',
  },

  hero: {
    activo: true,
    eyebrow: 'FÓRMULA AVANZADA',
    etiqueta: 'MÁS VENDIDO',
    titulo: 'Descubre tu mejor versión',
    lead: 'Conoce los beneficios de este producto y transforma tu rutina diaria con ingredientes de alta calidad.',
    caracteristicas: [],
    cta_texto: 'COMPRAR AHORA — ENVÍO GRATIS',
    calificacion_texto: '4.8/5 · 12,847 reseñas verificadas · +25,000 clientas satisfechas'
  },

  prueba_social: {
    activo: true,
    calificacion: 4.8,
    resenas_texto: '12,847 reseñas verificadas',
    clientes_texto: '+25,000 clientas satisfechas',
  },

  precio: {
    activo: true,
    titulo: 'Elige tu oferta especial',
  },

  beneficios: {
    activo: true,
    titulo: 'Beneficios que amarás',
    items: [],
  },

  ingredientes: {
    activo: true,
    titulo: 'Ingredientes premium que marcan la diferencia',
  },

  resultados: {
    activo: true,
    titulo: 'Resultados reales de nuestras clientas',
  },

  como_funciona: {
    activo: true,
    titulo: 'Cómo utilizar este producto',
  },

  garantias: {
    activo: true,
    items: [],
  },

  faq: {
    activo: true,
    titulo: 'Preguntas frecuentes',
  },

  upsells: {
    activo: true,
    titulo: 'Complementa tu rutina y potencia resultados',
  },

  cta_final: {
    activo: true,
    etiqueta: 'OFERTA POR TIEMPO LIMITADO',
    texto: 'NO PIERDAS ESTA OFERTA ESPECIAL',
    subtexto: 'El descuento se aplica automáticamente',
    cta_texto: 'COMPRAR AHORA',
    cta_nota: 'ENVÍO GRATIS',
    contador: { activo: true, dias: 0, horas: 2, minutos: 47, segundos: 39 },
  },
};

export const LIMITES = {
  barra_superior_items: 3,
  hero_caracteristicas: 6,
  beneficios_items: 5,
  garantias_items: 5,
};

const CONTADOR_DEFAULT = DEFAULTS_BEAUTY.cta_final.contador;

function normalizarContador(valor) {
  return { ...CONTADOR_DEFAULT, ...(esObjeto(valor) ? valor : {}) };
}

function normalizarSeccion(key, s) {
  const base = { ...s, activo: s.activo !== false };
  switch (key) {
    case 'barra_superior':
      return { ...base, items: lista(base.items, LIMITES.barra_superior_items) };
    case 'hero':
      return { ...base, caracteristicas: lista(base.caracteristicas, LIMITES.hero_caracteristicas) };
    case 'prueba_social':
      return { ...base, calificacion: numeroEntre(base.calificacion, 1, 5, 4.8) };
    case 'beneficios':
      return { ...base, items: lista(base.items, LIMITES.beneficios_items) };
    case 'garantias':
      return { ...base, items: lista(base.items, LIMITES.garantias_items) };
    case 'precio':
      return { ...base };
    case 'cta_final':
      return { ...base, contador: normalizarContador(base.contador) };
    default:
      return base;
  }
}

export const resolverFichaBeauty = crearResolver({ defaults: DEFAULTS_BEAUTY, claves: CLAVES_SECCIONES, normalizar: normalizarSeccion });

export function clonarFichaBeauty(fichaResuelta, key) {
  return clonarComun(fichaResuelta, key, DEFAULTS_BEAUTY);
}

export function fichaBeautyDesdeProducto(producto) {
  if (!producto) return {};
  const ficha = {};

  const nombre = (producto.nombre || '').trim();
  const descripcion = (producto.descripcion || '').trim();
  const beneficios = (producto.beneficios || []).filter(b => b?.titulo?.trim());
  const confianza = (producto.confianza || []).filter(c => c?.texto?.trim());
  const promesa = (producto.propuesta_valor || '').trim();
  const sobre = (producto.sobre_este_producto || '').trim();

  if (nombre || promesa || sobre || beneficios.length || descripcion) {
    ficha.hero = {};
    if (nombre) ficha.hero.eyebrow = nombre.toUpperCase();
    if (promesa) ficha.hero.titulo = promesa;
    else if (nombre) ficha.hero.titulo = nombre;
    
    if (sobre) ficha.hero.lead = sobre;
    else if (descripcion) ficha.hero.lead = descripcion;

    if (beneficios.length) ficha.hero.caracteristicas = beneficios.map(b => b.titulo.trim());
  }

  if (beneficios.length) {
    ficha.beneficios = {
      items: beneficios.map(b => ({
        icono: b.icono || 'sparkles',
        titulo: b.titulo.trim(),
        descripcion: (b.texto || '').trim(),
      })),
    };
  }

  if (confianza.length) {
    ficha.garantias = {
      items: confianza.map(c => ({
        icono: '✦',
        titulo: c.texto.trim(),
        descripcion: '',
      })),
    };
  }

  return ficha;
}
