import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader, ArrowRight, ArrowLeft, Search, Check, AlertTriangle, Infinity as InfinityIcon, Tag, Plus, Pencil, X,
  Eye, EyeOff, Home, ShoppingBag, MousePointerClick, Smartphone, Monitor, Maximize2, ChevronDown, ChevronUp,
  ChevronsUpDown, ChevronsDownUp,
  Upload, Film, PackagePlus, FileCode2, Tags, CreditCard, RefreshCw, Trash2, ExternalLink, Save, Settings2,
} from 'lucide-react';
import { ofertaService } from '../../services/ofertaService';
import { comboAdminService } from '../../services/comboAdminService';
import CurrencyInput from '../../components/CurrencyInput';
import PrecioAncla, { claveItem, precioDeVenta } from './PrecioAnclaItem';
import PresentacionProducto from './PresentacionProducto';
import { contentIdPanel, datosRuntimePreview, slugCategoria } from './datosRuntime';
import { getMediaUrl } from '../../services/api';
import CodigoPreview from './CodigoPreview';
import { plantillaInicioPara, formatoDeBase, PLANTILLA_PRODUCTO, PLANTILLA_CATALOGO, PLANTILLA_CATEGORIA, PLANTILLA_CHECKOUT, esFichaProductoBase } from './plantillasBaseCodigo';
import { verificarSesion } from '../../utils/auth';
import PhonePreviewShell from './PhonePreviewShell';

// El MISMO editor de ofertas de la ficha de producto (precios, componentes,
// margen, imagen): acá se abre en un panel lateral para crear o editar sin
// salir del paso. Lazy: es pesado y solo se carga si se abre.
// productos.css viaja con él: el editor usa clases (form-group,
// offer-strategy-grid…) que en su ficha original carga ProductForm.
const OfertasProductoTab = lazy(() => Promise.all([
  import('../productos/OfertasProductoTab'),
  import('../productos/productos.css'),
]).then(([modulo]) => modulo));
const ArmarComboPanel = lazy(() => import('./ArmarComboPanel'));

/**
 * El paso intermedio del lienzo en blanco: ANTES de escribir código, qué
 * vende la landing y cómo. Es lo que después alimenta el preview, el
 * runtime (catálogo, recomendados, ventas cruzadas) y los prompts de cada
 * vista — por eso va primero.
 *
 * Tres formas de elegir productos:
 *   - Uno por uno: una lista (LandingItem), hasta MAX_PRODUCTOS_MANUAL.
 *   - Por categoría / Todo el catálogo: una REGLA guardada en
 *     content.venta, sin lista y sin tope. Vende lo que esté en venta hoy y
 *     lo que se cargue mañana (ver LandingService.itemsDelLienzo).
 *
 * Diseño: a la izquierda se configura; a la derecha, la landing en un
 * celular, con la selección y las ofertas reales, que cambia al instante.
 * Cada sección tiene "Ver dónde aparece": lleva la vista previa a la
 * pantalla correcta y resalta la zona. Abajo, una barra fija con el
 * resumen y el botón para seguir.
 */

export const MAX_PRODUCTOS_MANUAL = 500; // = MAX_ITEMS_LIENZO del backend
const MAX_DESTACADOS = 8;

// ISO (UTC, lo que guarda el backend) <-> valor de <input type="datetime-local">
// (hora LOCAL del navegador, sin timezone). new Date(iso) y new Date(valorLocal)
// hacen la conversión correcta en los dos sentidos.
function isoParaInputLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function inputLocalAIso(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function inputLocalEnHoras(horas) {
  const d = new Date(Date.now() + horas * 60 * 60 * 1000);
  return isoParaInputLocal(d.toISOString());
}

const TIPOS_OFERTA_RAPIDA = [
  {
    key: 'pack',
    titulo: 'Oferta por cantidad',
    subtitulo: 'Varias unidades del mismo producto',
    texto: 'Ideal para x2, x3 o reposición. Se muestra en la ficha del producto.',
  },
  {
    key: 'order_bump',
    titulo: 'Order bump',
    subtitulo: 'Extra durante la compra',
    texto: 'Un complemento simple antes de pagar. Usa un solo producto ofrecido.',
  },
  {
    key: 'upsell',
    titulo: 'Upsell',
    subtitulo: 'Oferta posterior',
    texto: 'Se propone después de agregar al carrito, sin cambiar el producto principal.',
  },
];

const LABEL_TIPO_OFERTA_RAPIDA = TIPOS_OFERTA_RAPIDA.reduce((acc, item) => {
  acc[item.key] = item.titulo;
  return acc;
}, {});

const MODOS = [
  { key: 'manual', label: 'Uno por uno', ayuda: 'Marcás exactamente qué productos entran.' },
  { key: 'categoria', label: 'Por categoría', ayuda: 'Entra todo lo que esté en venta en las categorías que elijas, también lo que cargues después.' },
  { key: 'todos', label: 'Todo el catálogo', ayuda: 'Entra todo lo que tengas en venta, sin límite. Ideal para una tienda completa o un marketplace.' },
];

const CANTIDADES_RECO = [2, 3, 4, 6, 8];
// Con catálogos enormes, el preview no necesita más que esto para verse igual.
const MAX_PRODUCTOS_PREVIEW = 120;
const FILTROS_CATALOGO = [
  ['buscador', 'Buscador'], ['categoria', 'Categoría'],
  ['precio', 'Rango de precios'], ['disponibilidad', 'Disponibilidad'], ['promociones', 'Promociones'], ['orden', 'Ordenar productos'],
];
const MARCA_CODIGO_INICIAL = 'Escribí acá el HTML de tu landing';
const TIPOS_SECCION_INICIO = [
  ['categoria', 'Por categoría'],
  ['ofertas', 'Productos con descuento'],
  ['mas_vendidos', 'Más vendidos'],
  ['novedades', 'Nuevos ingresos'],
  ['manual', 'Selección manual'],
];
const TITULOS_SECCION_INICIO = {
  categoria: 'Comprar por categoría',
  ofertas: 'Productos con descuento',
  mas_vendidos: 'Más vendidos',
  novedades: 'Nuevos ingresos',
  manual: 'Colección comercial',
};
const AYUDAS_SECCION_INICIO = {
  categoria: 'Muestra productos de una categoría específica. Elegís la categoría en el selector de abajo.',
  ofertas: 'Muestra automáticamente productos con precio anterior mayor al precio actual. No es el countdown.',
  mas_vendidos: 'Como todavía no usamos estadísticas reales acá, elegís a mano qué productos mostrar.',
  novedades: 'Ordena automáticamente por fecha de creación y muestra los ingresos más recientes.',
  manual: 'Elegís producto por producto exactamente qué aparece en esta vitrina.',
};
const ENLACES_BANNER_INICIO = [
  ['#inicio', 'Inicio'],
  ['#colecciones', 'Colecciones'],
  ['/catalogo', 'Productos'],
  ['#productos-categoria', 'Productos por categoría'],
  ['#confianza', 'Zona de confianza'],
  ['#marca', 'Nuestra marca'],
];
const MENU_PRINCIPAL_DEFAULT = [
  { id: 'inicio', texto: 'Inicio', destino: '#inicio', visible: true },
  { id: 'productos', texto: 'Productos', destino: '/catalogo', visible: true },
  { id: 'colecciones', texto: 'Colecciones', destino: '#colecciones', visible: true },
];
const DESTINOS_MENU_PRINCIPAL = [
  ['#inicio', 'Inicio'],
  ['/catalogo', 'Productos'],
  ['#colecciones', 'Colecciones'],
  ['#productos-categoria', 'Productos por categoría'],
  ['#confianza', 'Zona de confianza'],
  ['#marca', 'Nuestra marca'],
  ['personalizado', 'Personalizado'],
];
const DESTINOS_MENU_VALIDOS = new Set(DESTINOS_MENU_PRINCIPAL.map(([value]) => value).filter(value => value !== 'personalizado'));
const ANUNCIOS_INICIO_DEFAULT = [
  { texto: 'Envío a todo Paraguay', icono: 'truck' },
  { texto: 'Pago seguro', icono: 'lock' },
  { texto: 'Atención personalizada', icono: 'headphones' },
  { texto: 'Cambios y devoluciones', icono: 'rotate' },
];
const CONFIANZA_INICIO_DEFAULT = [
  { icono: '💳', titulo: 'Opciones de pago', texto: 'Consultá los medios de pago disponibles para tu compra.' },
  { icono: '↺', titulo: 'Cambios y devoluciones', texto: 'Conocé las condiciones y los pasos para solicitar un cambio.' },
  { icono: '🚚', titulo: 'Envíos a tu zona', texto: 'Confirmá la cobertura, el costo y el plazo antes de pedir.' },
];
const MARCA_INICIO_DEFAULT = {
  activo: true,
  kicker: 'NUESTRA MARCA',
  titulo: 'Comprá con confianza en nuestra tienda.',
  texto: 'Seleccionamos productos pensados para resolver compras reales, con atención cercana antes y después de cada pedido.',
  badges: ['Atención personalizada', 'Productos seleccionados', 'Compra simple'],
  medios: [],
};

const VISTAS_CODIGO_TIENDA = [
  { key: 'inicio', label: 'Inicio', icono: Home, base: tipo => plantillaInicioPara(tipo) },
  { key: 'catalogo', label: 'Productos', icono: Tags, base: () => PLANTILLA_CATALOGO },
  { key: 'categoria', label: 'Categoría', icono: Tags, base: () => PLANTILLA_CATEGORIA },
  { key: 'producto', label: 'Ficha producto', icono: ShoppingBag, base: () => PLANTILLA_PRODUCTO },
  { key: 'checkout', label: 'Checkout', icono: CreditCard, base: () => PLANTILLA_CHECKOUT },
];

const SECCIONES_CONFIG_TIENDA = [
  ['inicio', 'Inicio', Home, 'inicio'],
  ['categorias', 'Categorías', Tags, 'categoria'],
  ['fichas', 'Vista producto', ShoppingBag, 'producto'],
  ['checkout', 'Checkout', CreditCard, 'checkout'],
  ['ofertas', 'Ofertas', Tag, 'producto'],
  ['combos', 'Combos', PackagePlus, 'inicio'],
];
const VISTAS_PREVIEW_TIENDA = [
  ['inicio', 'Inicio', Home],
  ['categoria', 'Categorías', Tags],
  ['producto', 'Vista producto', ShoppingBag],
  ['checkout', 'Checkout', CreditCard],
];
function seccionConfigDeVista(vista) {
  if (vista === 'producto') return 'fichas';
  if (vista === 'checkout') return 'checkout';
  if (vista === 'categoria' || vista === 'catalogo') return 'categorias';
  return 'inicio';
}

const PARTES_CODIGO = [
  ['html', 'HTML'],
  ['css', 'CSS'],
  ['js', 'JavaScript'],
];

const clave = item => `${item.tipo}:${item.id}`;

class PanelLazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-fg">
        <p className="font-semibold">No se pudo cargar este panel.</p>
        <p className="mt-1 text-fg-muted">Si el servidor de desarrollo acaba de reiniciarse, recargá la pantalla e intentá de nuevo.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover">
          <RefreshCw size={14} /> Recargar
        </button>
      </div>
    );
  }
}

function formatearGs(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `Gs ${num.toLocaleString('es-PY', { maximumFractionDigits: 0 })}`;
}

const precioPanel = item => item?.precio_efectivo ?? item?.precio_usuario ?? item?.precio_base ?? item?.precio ?? null;
const limpiarNumeroPromo = valor => Number(String(valor ?? '').replace(/\D/g, '')) || 0;
const descuentoDesdeAnclaPromo = (precio, ancla) => {
  const antes = limpiarNumeroPromo(ancla);
  const ahora = Number(precio) || 0;
  return antes > ahora && ahora > 0 ? Math.round((1 - ahora / antes) * 100) : '';
};
const precioAnclaPorDescuentoPromo = (precio, pct) => {
  const descuento = Number(String(pct ?? '').replace(',', '.'));
  const actual = Number(precio) || 0;
  if (!Number.isFinite(descuento) || descuento <= 0 || descuento >= 95 || actual <= 0) return '';
  return String(Math.ceil(actual / (1 - descuento / 100)));
};

function imagenPanel(item) {
  const directa = item?.imagen || item?.imagen_url || item?.url_imagen;
  const lista = Array.isArray(item?.imagenes) ? item.imagenes : [];
  const primera = lista.find(img => img?.es_principal) || lista[0];
  return getMediaUrl(directa || primera?.url || primera || '');
}

const normalizarTexto = valor => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const uidComercial = prefijo => `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function crearBannerInicio() {
  return {
    id: uidComercial('banner'),
    activo: true,
    titulo: 'Nueva campaña promocional',
    subtitulo: 'Mostrá una oferta, colección o beneficio importante.',
    etiqueta: 'Promo',
    cta_texto: 'Ver productos',
    enlace: '/catalogo',
    imagen: '',
    tipo_medio: 'imagen',
  };
}
function crearBannerIntermedio() {
  return {
    ...crearBannerInicio(),
    id: uidComercial('banner-medio'),
    titulo: 'Renová tu cocina',
    subtitulo: 'Productos seleccionados con precios especiales.',
    etiqueta: 'Campaña',
    cta_texto: 'Ver ofertas',
    enlace: '#ofertas',
  };
}

function crearSeccionInicio(tipo = 'categoria', categoria = '') {
  return {
    id: uidComercial('seccion'),
    activo: true,
    tipo,
    titulo: TITULOS_SECCION_INICIO[tipo] || 'Sección comercial',
    subtitulo: tipo === 'categoria' && categoria ? `Productos de ${categoria}` : '',
    categoria: tipo === 'categoria' ? categoria : '',
    productos: [],
    limite: 4,
  };
}

function normalizarMenuPrincipal(menu = []) {
  const fuente = Array.isArray(menu) && menu.length ? menu : MENU_PRINCIPAL_DEFAULT;
  const normalizados = fuente
    .map((item, idx) => {
      const destino = item.destino || item.href || item.enlace || MENU_PRINCIPAL_DEFAULT[idx]?.destino || '#inicio';
      if (String(destino || '').startsWith('#') && !DESTINOS_MENU_VALIDOS.has(destino)) return null;
      return {
        id: item.id || `menu-${idx + 1}`,
        texto: item.texto || item.label || MENU_PRINCIPAL_DEFAULT[idx]?.texto || 'Menú',
        destino,
        visible: item.visible !== false,
      };
    })
    .filter(Boolean);
  return normalizados.length ? normalizados : MENU_PRINCIPAL_DEFAULT;
}

function inicioComercialDesdeVenta(venta = {}) {
  const legado = venta.inicio_comercial && typeof venta.inicio_comercial === 'object' ? venta.inicio_comercial : {};
  const actual = venta.inicio && typeof venta.inicio === 'object' ? venta.inicio : {};
  return {
    ...legado,
    ...actual,
    categorias: Array.isArray(actual.categorias) ? actual.categorias : legado.categorias,
    banners: Array.isArray(actual.banners) ? actual.banners : legado.banners,
    banners_intermedios: Array.isArray(actual.banners_intermedios) ? actual.banners_intermedios : legado.banners_intermedios,
    secciones: Array.isArray(actual.secciones) ? actual.secciones : legado.secciones,
    menu_links: Array.isArray(actual.menu_links) ? actual.menu_links : legado.menu_links,
  };
}

// Bloques del body del Inicio que el comercio puede reordenar/ocultar — ver
// EditorBloquesInicio más abajo y aplicarBloquesInicio en runtimeGesicomm.js
// (el espejo del lado del runtime). "Menú" no está: vive en el header fijo,
// no tiene una posición en la página que mover.
const TIPOS_BLOQUE_INICIO = [
  'anuncios', 'banner', 'productos_categoria', 'ofertas_urgencia', 'confianza', 'marca', 'colecciones',
];
const ETIQUETAS_BLOQUE_INICIO = {
  anuncios: 'Barra de anuncios',
  banner: 'Banner principal',
  categorias: 'Categorías visuales',
  productos_categoria: 'Productos por categoría',
  destacados: 'Productos destacados',
  confianza: 'Zona de confianza',
  marca: 'Nuestra marca',
  banner_intermedio: 'Banner intermedio',
  secciones_inicio: 'Vitrinas opcionales',
  mas_vendidos: 'Más vendidos',
  ofertas_urgencia: 'Oferta flash con countdown',
  ofertas_catalogo: 'Ofertas del catálogo',
  novedades: 'Novedades',
  combos: 'Combos y packs',
  colecciones: 'Colecciones',
  preguntas: 'Preguntas frecuentes',
  contacto: 'Formulario de contacto',
};
// Orden simple por defecto para una landing nueva: lo que el comercio pidió
// ver primero, visible; el resto (lo que ya traía la base) queda apagado
// pero disponible por si lo quiere prender después.
const BLOQUES_INICIO_DEFAULT = [
  'anuncios', 'banner', 'productos_categoria', 'ofertas_urgencia', 'confianza', 'marca', 'colecciones',
].map(tipo => ({ tipo, visible: true }));

function normalizarBloquesInicio(bloques) {
  const guardados = Array.isArray(bloques) ? bloques.filter(b => b && TIPOS_BLOQUE_INICIO.includes(b.tipo)) : [];
  if (!guardados.length) return BLOQUES_INICIO_DEFAULT;
  const vistos = new Set(guardados.map(b => b.tipo));
  // Si la base agregó un tipo de bloque nuevo después de que esta landing ya
  // guardó su lista, aparece al final (visible) en vez de desaparecer.
  const faltantes = TIPOS_BLOQUE_INICIO.filter(t => !vistos.has(t)).map(tipo => ({ tipo, visible: true }));
  return [...guardados.map(b => ({ tipo: b.tipo, visible: b.visible !== false })), ...faltantes];
}

function normalizarInicioComercial(inicio = {}, categorias = []) {
  const primeraCategoria = categorias[0]?.[0] || '';
  const banners = Array.isArray(inicio.banners)
    ? inicio.banners.map((b, idx) => ({
      id: b.id || `banner-${idx + 1}`,
      activo: b.activo !== false,
      titulo: b.titulo || '',
      subtitulo: b.subtitulo || '',
      etiqueta: b.etiqueta || '',
      cta_texto: b.cta_texto || 'Ver productos',
      enlace: b.enlace || '/catalogo',
      imagen: b.imagen || '',
      tipo_medio: b.tipo_medio || inferirTipoMedio(b.imagen || ''),
    }))
    : [];
  const bannersIntermedios = Array.isArray(inicio.banners_intermedios)
    ? inicio.banners_intermedios.map((b, idx) => ({
      id: b.id || `banner-medio-${idx + 1}`,
      activo: b.activo !== false,
      titulo: b.titulo || '',
      subtitulo: b.subtitulo || '',
      etiqueta: b.etiqueta || '',
      cta_texto: b.cta_texto || 'Ver ofertas',
      enlace: b.enlace || '#ofertas',
      imagen: b.imagen || '',
      tipo_medio: b.tipo_medio || inferirTipoMedio(b.imagen || ''),
    }))
    : [];
  const secciones = Array.isArray(inicio.secciones)
    ? inicio.secciones.map((s, idx) => ({
      id: s.id || `seccion-${idx + 1}`,
      activo: s.activo !== false,
      tipo: s.tipo || 'categoria',
      titulo: s.titulo || TITULOS_SECCION_INICIO[s.tipo] || 'Sección comercial',
      subtitulo: s.subtitulo || '',
      categoria: s.categoria || '',
      productos: Array.isArray(s.productos) ? s.productos : [],
      limite: Number(s.limite) > 0 ? Number(s.limite) : 4,
    }))
    : [];
  const productosCategoria = inicio.productos_categoria && typeof inicio.productos_categoria === 'object' ? inicio.productos_categoria : {};
  const marca = inicio.marca && typeof inicio.marca === 'object' ? inicio.marca : {};
  const anuncios = Array.isArray(inicio.anuncios)
    ? inicio.anuncios.map(it => (typeof it === 'string' ? { texto: it, icono: '' } : { texto: it?.texto || '', icono: it?.icono || '' }))
    : [];
  const anunciosConTexto = anuncios.filter(it => String(it.texto || '').trim());
  const confianza = Array.isArray(inicio.confianza)
    ? inicio.confianza.map(it => ({ icono: it?.icono || '', titulo: it?.titulo || '', texto: it?.texto || '' }))
    : [];
  const confianzaConTexto = confianza.filter(it => String(it.titulo || it.texto || '').trim());
  return {
    menu_links: normalizarMenuPrincipal(inicio.menu_links),
    menu_categorias: inicio.menu_categorias !== false,
    categorias: Array.isArray(inicio.categorias) ? inicio.categorias : [],
    banners,
    banners_intermedios: bannersIntermedios,
    secciones: secciones.length ? secciones : [
      crearSeccionInicio('categoria', primeraCategoria),
    ],
    bloques: normalizarBloquesInicio(inicio.bloques),
    // Acepta el string suelto que guardaban las landings de antes del
    // selector de ícono (ver limpiarAnuncioInicio, backend).
    anuncios: anunciosConTexto.length ? anunciosConTexto : ANUNCIOS_INICIO_DEFAULT,
    confianza: confianzaConTexto.length ? confianzaConTexto : CONFIANZA_INICIO_DEFAULT,
    productos_categoria: {
      activo: productosCategoria.activo === true,
      titulo: productosCategoria.titulo || '',
      kicker: productosCategoria.kicker || '',
      subtitulo: productosCategoria.subtitulo || '',
      items: Array.isArray(productosCategoria.items) ? productosCategoria.items : [],
      limite: Number(productosCategoria.limite) > 0 ? Number(productosCategoria.limite) : 8,
    },
    marca: {
      activo: marca.activo !== false,
      kicker: marca.kicker || MARCA_INICIO_DEFAULT.kicker,
      titulo: marca.titulo || MARCA_INICIO_DEFAULT.titulo,
      texto: marca.texto || MARCA_INICIO_DEFAULT.texto,
      badges: Array.isArray(marca.badges) && marca.badges.some(b => String(b || '').trim()) ? marca.badges : MARCA_INICIO_DEFAULT.badges,
      medios: Array.isArray(marca.medios) ? marca.medios : MARCA_INICIO_DEFAULT.medios,
    },
  };
}

function inferirTipoMedio(valor = '') {
  const limpio = String(valor || '').split('?')[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(limpio)) return 'video';
  if (/\.gif$/.test(limpio)) return 'gif';
  return 'imagen';
}

function tipoMedioDeArchivo(archivo) {
  if (!archivo) return 'imagen';
  if (archivo.type?.startsWith('video/')) return 'video';
  if (archivo.type === 'image/gif' || /\.gif$/i.test(archivo.name || '')) return 'gif';
  return 'imagen';
}

const nombreProveedorItem = item => (typeof item?.proveedor === 'string' ? item.proveedor : item?.proveedor?.nombre) || '';

function itemEsPropio(item, usuarioActual) {
  return !!usuarioActual && item?.creado_por != null && Number(item.creado_por) === Number(usuarioActual.id);
}

function itemPasaFiltroOrigen(item, filtro, usuarioActual) {
  const propio = itemEsPropio(item, usuarioActual);
  const gesicom = !propio;
  if (filtro === 'todos') return true;
  if (filtro === 'producto_gesicom') return item.tipo === 'producto' && gesicom;
  if (filtro === 'producto_mio') return item.tipo === 'producto' && propio;
  if (filtro === 'combo_gesicom') return item.tipo === 'combo' && gesicom;
  if (filtro === 'combo_mio') return item.tipo === 'combo' && propio;
  return true;
}

/**
 * Los productos del catálogo del panel que vende una regla de venta — el
 * mismo criterio que aplica el backend, para que el preview y los prompts
 * muestren lo que la landing va a vender. null si la venta es manual.
 */
export function aplicarReglaVenta(catalogo, venta) {
  if (!venta || !['todos', 'categoria'].includes(venta.seleccion)) return null;
  const categorias = new Set(venta.categorias || []);
  const productos = (catalogo?.productos || []).map(p => ({ ...p, tipo: 'producto' }));
  const combos = venta.incluir_combos === false ? [] : (catalogo?.combos || []).map(c => ({ ...c, tipo: 'combo' }));
  const pasa = i => venta.seleccion === 'todos' || categorias.has(i.categoria);
  const p = productos.filter(pasa);
  const c = combos.filter(pasa);
  return venta.tipo === 'combos' ? [...c, ...p] : [...p, ...c];
}

// Paquetes ('normal': "Llevá 3") incluidos: se crean y se ven acá también.
const cargarOfertasTienda = () => ofertaService.listarTodas({ estrategias: ['order_bump', 'upsell', 'normal'] });

export default function ConfigurarVentaCodigo({
  catalogo, inicial, onConfirmar, onVolver, onCambiarModo, guardando, cargarOfertas = cargarOfertasTienda,
  tienda = null, codigos = null, onCambiarCodigo = null, onRestaurarCodigo = null, onSubirImagen = null,
  disenoPendienteIA = false,
  // Error del guardado (viene del editor): sin esto, si el servidor
  // rechazaba el guardado, el botón "no hacía nada" a la vista.
  errorGuardado = null,
  // Vuelve a pedir el catálogo (p. ej. después de activar un combo acá).
  onRecargarCatalogo = null,
  // Precios tachados que esta landing ya tiene guardados, por item:
  // { "producto:12": 250000 }. Viven en landing_items, no en el producto.
  anclasIniciales = {},
  // Acciones de la landing ya guardada (null hasta que "venta" esté
  // configurada): publicar, eliminar, guardar sin pasar por "confirmar", y
  // abrir el editor de código crudo (HTML/CSS/JS, Secciones, Footer) para
  // quien lo necesite — este asistente ya no es el único lugar, pero sigue
  // siendo la puerta de entrada.
  publicUrl = null,
  landingActiva = false,
  onPublicar = null,
  onEliminar = null,
  onGuardarRapido = null,
  sinGuardar = false,
  onAbrirCodigo = null,
}) {
  const ventaInicial = inicial?.venta || {};
  const [subidasPendientes, setSubidasPendientes] = useState(0);
  async function subirImagenLanding(archivo) {
    setSubidasPendientes(n => n + 1);
    try { return await onSubirImagen(archivo); }
    finally { setSubidasPendientes(n => n - 1); }
  }
  const [abrirEn] = useState(ventaInicial.abrir_en || (ventaInicial.tipo === 'producto_unico' ? 'producto' : 'tienda'));
  const [combosPrimero] = useState(ventaInicial.combos_primero ?? ventaInicial.tipo === 'combos');
  const tipo = abrirEn === 'producto' ? 'producto_unico' : (combosPrimero ? 'combos' : 'catalogo');
  const [modo, setModo] = useState(ventaInicial.seleccion || 'manual');
  const [categorias, setCategorias] = useState(() => new Set(ventaInicial.categorias || []));
  const [incluirCombos, setIncluirCombos] = useState(ventaInicial.incluir_combos !== false);
  const [manual, setManual] = useState(() => (
    ventaInicial.seleccion && ventaInicial.seleccion !== 'manual' ? [] : (inicial?.seleccion || []).map(clave)
  ));
  const [principal, setPrincipal] = useState(() => (inicial?.seleccion?.[0] ? clave(inicial.seleccion[0]) : null));
  const [destacados, setDestacados] = useState(() => ventaInicial.destacados || []);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaCategoria, setBusquedaCategoria] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('producto_gesicom');
  const [usuarioActual, setUsuarioActual] = useState(null);

  const [crossActivo, setCrossActivo] = useState(ventaInicial.cross_sell?.activo !== false);
  const [ofertasElegidas, setOfertasElegidas] = useState(() => new Set(ventaInicial.cross_sell?.ofertas || []));
  // Paquetes: etiqueta de cada uno ("Más elegido"…) y cuál se destaca.
  const [confPaquetes, setConfPaquetes] = useState(() => ventaInicial.paquetes || {});
  function cambiarPaquete(id, cambio) {
    setConfPaquetes(prev => {
      const siguiente = { ...prev };
      // Un solo destacado: marcar uno desmarca los demás.
      if (cambio.destacado) Object.keys(siguiente).forEach(k => { siguiente[k] = { ...siguiente[k], destacado: false }; });
      siguiente[id] = { etiqueta: '', destacado: false, activo: true, ...prev[id], ...cambio };
      if (siguiente[id].activo === false) siguiente[id].destacado = false;
      return siguiente;
    });
  }
  const [ofertas, setOfertas] = useState(null); // null = cargando
  const [errorOfertas, setErrorOfertas] = useState('');
  // Panel de ofertas: null cerrado · { producto: null } eligiendo producto ·
  // { producto } editando las ofertas de ese producto.
  const [panelOfertas, setPanelOfertas] = useState(null);
  const [anclas, setAnclas] = useState(() => ({
    ...Object.fromEntries((inicial?.seleccion || []).filter(i => i.precio_ancla != null).map(i => [claveItem(i), String(i.precio_ancla)])),
    ...anclasIniciales,
  }));
  const [presentacion, setPresentacion] = useState(() => ({ ...Object.fromEntries((inicial?.seleccion || []).map(i => [claveItem(i), {
    etiqueta: i.etiqueta || '', mostrar_en_inicio: i.mostrar_en_inicio !== false, envio_incluido: i.envio_incluido === true,
  }])), ...ventaInicial.presentacion_productos }));
  const [filtrosCatalogo, setFiltrosCatalogo] = useState(() => ventaInicial.catalogo_filtros || {});
  // Logos de medios de pago en la ficha: de la tienda entera (no por
  // producto), el comercio elige cuáles mostrar. `!== false` porque una
  // landing vieja sin este campo tiene que seguir mostrando los tres.
  const [pagoLogos, setPagoLogos] = useState(() => ({
    tarjetas: ventaInicial.pago_logos?.tarjetas !== false,
    bocas: ventaInicial.pago_logos?.bocas !== false,
    billetera: ventaInicial.pago_logos?.billetera !== false,
  }));
  function alternarPagoLogo(clave) {
    setPagoLogos(prev => ({ ...prev, [clave]: !prev[clave] }));
  }
  const productosSoloDesdeProductos = true;
  function cambiarPresentacion(item, campo, valor) {
    setPresentacion(prev => ({ ...prev, [claveItem(item)]: { ...prev[claveItem(item)], [campo]: valor } }));
  }
  function moverProducto(item, direccion) {
    if (productosSoloDesdeProductos) return;
    setManual(prev => {
      const siguiente = [...prev];
      const desde = siguiente.indexOf(claveItem(item));
      const hasta = desde + direccion;
      if (desde < 0 || hasta < 0 || hasta >= siguiente.length) return prev;
      [siguiente[desde], siguiente[hasta]] = [siguiente[hasta], siguiente[desde]];
      return siguiente;
    });
  }

  const [recoActivo, setRecoActivo] = useState(ventaInicial.recomendados?.activo !== false);
  const [recoModo, setRecoModo] = useState(ventaInicial.recomendados?.modo || 'auto');
  const [recoItems, setRecoItems] = useState(ventaInicial.recomendados?.items || []);
  const [recoMax, setRecoMax] = useState(ventaInicial.recomendados?.max || 4);
  const [recoTitulo, setRecoTitulo] = useState(ventaInicial.recomendados?.titulo || '');
  const [recoKicker, setRecoKicker] = useState(ventaInicial.recomendados?.kicker || '');
  const [recoSubtitulo, setRecoSubtitulo] = useState(ventaInicial.recomendados?.subtitulo || '');
  const [recoCta, setRecoCta] = useState(ventaInicial.recomendados?.cta_texto || '');
  const [recoBusqueda, setRecoBusqueda] = useState('');
  const [recoCategoria, setRecoCategoria] = useState('');

  // Countdown de oferta y estadísticas: pueden ser datos reales confirmados
  // o contenido de ejemplo/generado por IA. Si quedan sin confirmar, publicar
  // pide una aceptación explícita; no bloquea ni inventa una fecha demo.
  const [urgenciaActiva, setUrgenciaActiva] = useState(ventaInicial.urgencia?.activo === true);
  const [urgenciaFinAt, setUrgenciaFinAt] = useState(() => isoParaInputLocal(ventaInicial.urgencia?.fin_at));
  const [urgenciaProductoId, setUrgenciaProductoId] = useState(ventaInicial.urgencia?.producto_id || '');
  const [urgenciaConfirmar, setUrgenciaConfirmar] = useState(ventaInicial.urgencia?.estado === 'confirmado');
  const [urgenciaTitulo, setUrgenciaTitulo] = useState(ventaInicial.urgencia?.titulo || 'Ofertas que terminan pronto');
  const [urgenciaTexto, setUrgenciaTexto] = useState(ventaInicial.urgencia?.texto || 'Aprovechá antes de que se agoten');
  const [urgenciaCta, setUrgenciaCta] = useState(ventaInicial.urgencia?.cta_texto || 'Ver todos');
  const [urgenciaProductos, setUrgenciaProductos] = useState(() => (
    Array.isArray(ventaInicial.urgencia?.productos) ? ventaInicial.urgencia.productos : []
  ));
  const [productoOfertaEditandoId, setProductoOfertaEditandoId] = useState('');
  function cambiarUrgenciaFinAt(valor) {
    setUrgenciaFinAt(valor);
    setUrgenciaConfirmar(false); // editar la fecha vuelve a pedir confirmación
  }

  const [pruebaSocialActiva, setPruebaSocialActiva] = useState(ventaInicial.prueba_social?.activo === true);
  const [pruebaSocialItems, setPruebaSocialItems] = useState(ventaInicial.prueba_social?.items || []);
  const [pruebaSocialProductoId, setPruebaSocialProductoId] = useState(ventaInicial.prueba_social?.producto_id || '');
  const [pruebaSocialConfirmar, setPruebaSocialConfirmar] = useState(ventaInicial.prueba_social?.estado === 'confirmado');
  function cambiarStatItem(idx, campo, valor) {
    setPruebaSocialItems(prev => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
    setPruebaSocialConfirmar(false); // editar las cifras vuelve a pedir confirmación
  }
  function agregarStatItem() {
    if (pruebaSocialItems.length >= 8) return;
    setPruebaSocialItems(prev => [...prev, { valor: '', etiqueta: '' }]);
    setPruebaSocialConfirmar(false);
  }
  function quitarStatItem(idx) {
    setPruebaSocialItems(prev => prev.filter((_, i) => i !== idx));
    setPruebaSocialConfirmar(false);
  }
  const [error, setError] = useState('');

  // Vista previa
  const [vistaPreview, setVistaPreview] = useState('inicio');
  const [productoPreview, setProductoPreview] = useState(null); // content_id
  const [resaltado, setResaltado] = useState(null); // { lista, n }
  const [avisoPreview, setAvisoPreview] = useState('');
  const [previewMovil, setPreviewMovil] = useState(false);
  const [dispositivo, setDispositivo] = useState('escritorio'); // 'movil' | 'escritorio'
  const [verDetalleError, setVerDetalleError] = useState(false);
  const [previewAmpliada, setPreviewAmpliada] = useState(false);
  const [seccionConfig, setSeccionConfig] = useState('inicio'); // 'inicio' | 'categorias' | 'fichas' | 'checkout' | 'ofertas' | 'combos'
  const [codigoModal, setCodigoModal] = useState(null);
  const [categoriaPreview, setCategoriaPreview] = useState('');
  const [productoEditando, setProductoEditando] = useState(null); // content_id
  const [inicioComercial, setInicioComercial] = useState(() => normalizarInicioComercial(inicioComercialDesdeVenta(ventaInicial)));

  // Todas las order bump / upsell activas de la tienda, de entrada: antes se
  // buscaban solo en los productos ya elegidos, así que con la selección
  // vacía la sección decía "no hay ofertas" aunque las hubiera.
  const recargarOfertas = useCallback(() => {
    setErrorOfertas('');
    return cargarOfertas()
      .then(lista => {
        const limpia = Array.isArray(lista) ? lista : [];
        setOfertas(limpia);
        return limpia;
      })
      .catch(() => {
        setOfertas(prev => prev || []);
        setErrorOfertas('No se pudieron cargar tus ofertas. Recargá la página para intentar de nuevo.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { recargarOfertas(); }, [recargarOfertas]);
  useEffect(() => {
    verificarSesion().then(setUsuarioActual).catch(() => setUsuarioActual(null));
  }, []);

  const [combosCreados, setCombosCreados] = useState([]);
  const catalogoActual = useMemo(() => ({ ...catalogo, combos: Array.from(new Map([
    ...(catalogo?.combos || []), ...combosCreados,
  ].map(c => [Number(c.id), c])).values()) }), [catalogo, combosCreados]);
  const todos = useMemo(() => [
    ...(catalogoActual.productos || []).map(p => ({ ...p, tipo: 'producto' })),
    ...catalogoActual.combos.map(c => ({ ...c, tipo: 'combo' })),
  ], [catalogoActual]);
  const porClave = useMemo(() => new Map(todos.map(i => [clave(i), i])), [todos]);
  const idsCombosCatalogo = useMemo(() => new Set(catalogoActual.combos.map(c => Number(c.id))), [catalogoActual]);

  const categoriasDisponibles = useMemo(() => {
    const conteo = new Map();
    todos.forEach(i => { if (i.categoria) conteo.set(i.categoria, (conteo.get(i.categoria) || 0) + 1); });
    return Array.from(conteo.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [todos]);

  const categoriasVisibles = useMemo(() => {
    const q = busquedaCategoria.trim().toLowerCase();
    return q ? categoriasDisponibles.filter(([cat]) => cat.toLowerCase().includes(q)) : categoriasDisponibles;
  }, [categoriasDisponibles, busquedaCategoria]);

  const esRegla = modo === 'todos' || modo === 'categoria';

  // Lo que vende la landing, en orden: el principal primero (producto
  // estrella), después el resto.
  const seleccion = useMemo(() => {
    let lista = esRegla
      ? aplicarReglaVenta(catalogoActual, { seleccion: modo, categorias: Array.from(categorias), incluir_combos: incluirCombos, tipo })
      : manual.map(k => porClave.get(k)).filter(Boolean);
    if (!esRegla && tipo === 'combos') {
      lista = [...lista.filter(i => i.tipo === 'combo'), ...lista.filter(i => i.tipo !== 'combo')];
    }
    if (tipo === 'producto_unico' && principal) {
      const p = lista.find(i => clave(i) === principal);
      if (p) lista = [p, ...lista.filter(i => i !== p)];
    }
    return lista.map(i => ({ ...i, ...presentacion[claveItem(i)],
      precio_ancla: Object.prototype.hasOwnProperty.call(anclas, claveItem(i)) ? (Number(anclas[claveItem(i)]) || null) : (i.precio_ancla ?? null),
    }));
  }, [esRegla, catalogoActual, modo, categorias, incluirCombos, tipo, manual, porClave, principal, presentacion, anclas]);

  const excedeManual = !esRegla && seleccion.length > MAX_PRODUCTOS_MANUAL;
  const categoriasLandingDisponibles = useMemo(() => {
    const conteo = new Map();
    seleccion.forEach(i => { if (i.categoria) conteo.set(i.categoria, (conteo.get(i.categoria) || 0) + 1); });
    return Array.from(conteo.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [seleccion]);
  const categoriaPreviewValida = useMemo(() => {
    const disponibles = new Set(categoriasLandingDisponibles.map(([cat]) => cat));
    return disponibles.has(categoriaPreview) ? categoriaPreview : (categoriasLandingDisponibles[0]?.[0] || '');
  }, [categoriasLandingDisponibles, categoriaPreview]);
  const categoriasInicioDisponibles = useMemo(() => {
    const conteo = new Map();
    seleccion.forEach(i => {
      if (i.mostrar_en_inicio === false || !i.categoria) return;
      conteo.set(i.categoria, (conteo.get(i.categoria) || 0) + 1);
    });
    return Array.from(conteo.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [seleccion]);

  useEffect(() => {
    const primera = categoriasInicioDisponibles[0]?.[0] || '';
    const permitidas = new Set(categoriasInicioDisponibles.map(([cat]) => cat));
    setInicioComercial(prev => {
      let cambio = false;
      const categoriasActuales = prev.categorias || [];
      const categoriasValidas = categoriasActuales.filter(cat => permitidas.has(cat));
      if (categoriasValidas.length !== categoriasActuales.length) cambio = true;
      const secciones = prev.secciones.map(s => {
        if (s.tipo !== 'categoria') return s;
        if (s.categoria && permitidas.has(s.categoria)) return s;
        if (!primera) return s;
        cambio = true;
        return { ...s, categoria: primera, subtitulo: s.subtitulo || `Productos de ${primera}` };
      });
      return cambio ? { ...prev, categorias: categoriasValidas, secciones } : prev;
    });
  }, [categoriasInicioDisponibles]);

  const idsProductoEnLanding = useMemo(
    () => new Set(seleccion.filter(i => i.tipo === 'producto').map(i => Number(i.id))),
    [seleccion],
  );
  const candidatosDestacados = useMemo(
    () => seleccion.slice(0, 300).map(i => ({ ...i, content_id: contentIdPanel(i) })),
    [seleccion],
  );
  const idsCandidatosDestacados = useMemo(
    () => new Set(candidatosDestacados.map(i => i.content_id)),
    [candidatosDestacados],
  );
  const destacadosValidos = useMemo(
    () => destacados.filter(id => idsCandidatosDestacados.has(id)).slice(0, MAX_DESTACADOS),
    [destacados, idsCandidatosDestacados],
  );
  const candidatosDatosProducto = useMemo(() => {
    const productos = seleccion.filter(i => i.tipo === 'producto');
    const base = productos.length ? productos : seleccion;
    return base.slice(0, 300).map(i => ({ ...i, ...(presentacion[claveItem(i)] || {}), content_id: contentIdPanel(i) }));
  }, [seleccion, presentacion]);
  const productoConfigActual = useMemo(
    () => candidatosDatosProducto.find(i => i.content_id === productoEditando) || null,
    [candidatosDatosProducto, productoEditando],
  );
  const seleccionarProductoConfig = useCallback((contentId) => {
    setProductoEditando(contentId);
    setSeccionConfig('fichas');
    setVistaPreview('producto');
    setProductoPreview(contentId);
    setAvisoPreview('');
    setResaltado(null);
  }, []);
  const idsDatosProducto = useMemo(
    () => new Set(candidatosDatosProducto.map(i => i.content_id)),
    [candidatosDatosProducto],
  );
  const urgenciaProductoValido = idsDatosProducto.has(urgenciaProductoId)
    ? urgenciaProductoId
    : (candidatosDatosProducto[0]?.content_id || '');
  const pruebaSocialProductoValido = idsDatosProducto.has(pruebaSocialProductoId)
    ? pruebaSocialProductoId
    : (candidatosDatosProducto[0]?.content_id || '');
  function alternarDestacado(contentId) {
    setDestacados(prev => {
      const ya = prev.includes(contentId);
      if (ya) return prev.filter(id => id !== contentId);
      return [...prev, contentId].slice(0, MAX_DESTACADOS);
    });
  }

  function activarOfertaCatalogo(contentId) {
    setUrgenciaActiva(true);
    setUrgenciaProductos(prev => {
      if (prev.includes(contentId)) return prev;
      setProductoOfertaEditandoId(contentId);
      return [...prev, contentId].slice(0, 12);
    });
    setUrgenciaProductoId(prev => prev || contentId);
    setAvisoPreview('');
  }

  function quitarOfertaCatalogo(contentId) {
    setUrgenciaProductos(prev => prev.filter(id => id !== contentId));
    setAvisoPreview('');
  }

  function alternarOfertaCatalogo(contentId) {
    if (urgenciaProductos.includes(contentId)) {
      quitarOfertaCatalogo(contentId);
    } else {
      activarOfertaCatalogo(contentId);
    }
  }

  function propsOfertaProducto(item) {
    const contentId = item?.content_id || contentIdPanel(item || {});
    return {
      ofertaActiva: urgenciaProductosValidos.includes(contentId),
      onAlternarOferta: () => alternarOfertaCatalogo(contentId),
      ofertaFinAt: urgenciaFinAt,
      onOfertaFinAt: cambiarUrgenciaFinAt,
    };
  }

  function alternarFiltroCatalogo(filtro) {
    setFiltrosCatalogo(prev => ({ ...prev, [filtro]: prev?.[filtro] === false }));
    verDonde('catalogo', null);
  }

  function cambiarInicio(campo, valor) {
    setInicioComercial(prev => ({ ...prev, [campo]: valor }));
  }
  function cambiarMenuPrincipal(id, cambio) {
    setInicioComercial(prev => ({
      ...prev,
      menu_links: (prev.menu_links || []).map(item => (item.id === id ? { ...item, ...cambio } : item)),
    }));
  }
  function agregarMenuPrincipal() {
    setInicioComercial(prev => ({
      ...prev,
      menu_links: [
        ...(prev.menu_links || []),
        { id: uidComercial('menu'), texto: 'Nuevo link', destino: '#inicio', visible: true },
      ],
    }));
  }
  function quitarMenuPrincipal(id) {
    setInicioComercial(prev => ({
      ...prev,
      menu_links: (prev.menu_links || []).filter(item => item.id !== id),
    }));
  }
  function moverMenuPrincipal(id, dir) {
    setInicioComercial(prev => {
      const menu = [...(prev.menu_links || [])];
      const idx = menu.findIndex(item => item.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= menu.length) return prev;
      [menu[idx], menu[next]] = [menu[next], menu[idx]];
      return { ...prev, menu_links: menu };
    });
  }
  function cambiarBanner(id, cambio) {
    setInicioComercial(prev => ({
      ...prev,
      banners: prev.banners.map(b => (b.id === id ? { ...b, ...cambio } : b)),
    }));
  }
  function agregarBanner() {
    setInicioComercial(prev => ({ ...prev, banners: [...prev.banners, crearBannerInicio()] }));
    verDonde('inicio', 'banners_inicio');
  }
  function quitarBanner(id) {
    setInicioComercial(prev => ({ ...prev, banners: prev.banners.filter(b => b.id !== id) }));
  }
  function moverBanner(id, dir) {
    setInicioComercial(prev => {
      const banners = [...prev.banners];
      const idx = banners.findIndex(b => b.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= banners.length) return prev;
      [banners[idx], banners[next]] = [banners[next], banners[idx]];
      return { ...prev, banners };
    });
  }
  function cambiarBannerIntermedio(id, cambio) {
    setInicioComercial(prev => ({
      ...prev,
      banners_intermedios: (prev.banners_intermedios || []).map(b => (b.id === id ? { ...b, ...cambio } : b)),
    }));
  }
  function agregarBannerIntermedio() {
    setInicioComercial(prev => ({
      ...prev,
      banners_intermedios: [...(prev.banners_intermedios || []), crearBannerIntermedio()],
    }));
    verDonde('inicio', 'banners_intermedios');
  }
  function quitarBannerIntermedio(id) {
    setInicioComercial(prev => ({
      ...prev,
      banners_intermedios: (prev.banners_intermedios || []).filter(b => b.id !== id),
    }));
  }
  function moverBannerIntermedio(id, dir) {
    setInicioComercial(prev => {
      const banners = [...(prev.banners_intermedios || [])];
      const idx = banners.findIndex(b => b.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= banners.length) return prev;
      [banners[idx], banners[next]] = [banners[next], banners[idx]];
      return { ...prev, banners_intermedios: banners };
    });
  }
  function cambiarSeccionInicio(id, cambio) {
    setInicioComercial(prev => ({
      ...prev,
      secciones: prev.secciones.map(s => (s.id === id ? { ...s, ...cambio } : s)),
    }));
  }
  function agregarSeccionInicio(tipo = 'categoria') {
    const categoria = tipo === 'categoria' ? (categoriasInicioDisponibles[0]?.[0] || '') : '';
    setInicioComercial(prev => ({ ...prev, secciones: [...prev.secciones, crearSeccionInicio(tipo, categoria)] }));
    verDonde('inicio', 'secciones_inicio');
  }
  function quitarSeccionInicio(id) {
    setInicioComercial(prev => ({ ...prev, secciones: prev.secciones.filter(s => s.id !== id) }));
  }
  function moverSeccionInicio(id, dir) {
    setInicioComercial(prev => {
      const secciones = [...prev.secciones];
      const idx = secciones.findIndex(s => s.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= secciones.length) return prev;
      [secciones[idx], secciones[next]] = [secciones[next], secciones[idx]];
      return { ...prev, secciones };
    });
  }
  function alternarProductoSeccion(id, contentId) {
    setInicioComercial(prev => ({
      ...prev,
      secciones: prev.secciones.map(s => {
        if (s.id !== id) return s;
        const productosSeccion = s.productos || [];
        return {
          ...s,
          productos: productosSeccion.includes(contentId)
            ? productosSeccion.filter(p => p !== contentId)
            : [...productosSeccion, contentId].slice(0, 12),
        };
      }),
    }));
  }

  // ─── Bloques del Inicio (orden + mostrar/ocultar) ──────────────────────
  function moverBloqueInicio(tipo, dir) {
    setInicioComercial(prev => {
      const bloques = [...prev.bloques];
      const idx = bloques.findIndex(b => b.tipo === tipo);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= bloques.length) return prev;
      [bloques[idx], bloques[next]] = [bloques[next], bloques[idx]];
      return { ...prev, bloques };
    });
  }
  function alternarBloqueInicio(tipo) {
    setInicioComercial(prev => ({
      ...prev,
      bloques: prev.bloques.map(b => (b.tipo === tipo ? { ...b, visible: !b.visible } : b)),
    }));
  }

  // ─── Anuncios (barra de confianza de arriba) ───────────────────────────
  function cambiarAnuncio(idx, cambio) {
    setInicioComercial(prev => {
      const anuncios = [...(prev.anuncios || [])];
      anuncios[idx] = { ...anuncios[idx], ...cambio };
      return { ...prev, anuncios };
    });
  }
  function agregarAnuncio() {
    setInicioComercial(prev => ({ ...prev, anuncios: [...(prev.anuncios || []), { texto: '', icono: '' }].slice(0, 8) }));
  }
  function quitarAnuncio(idx) {
    setInicioComercial(prev => ({ ...prev, anuncios: (prev.anuncios || []).filter((_, i) => i !== idx) }));
  }

  // ─── Zona de confianza (siempre 3 tarjetas) ────────────────────────────
  function cambiarConfianza(idx, cambio) {
    setInicioComercial(prev => {
      const base = Array.from({ length: 3 }, (_, i) => prev.confianza?.[i] || CONFIANZA_INICIO_DEFAULT[i] || { icono: '', titulo: '', texto: '' });
      base[idx] = { ...base[idx], ...cambio };
      return { ...prev, confianza: base };
    });
  }

  // ─── Nuestra marca ──────────────────────────────────────────────────────
  function cambiarMarca(cambio) {
    setInicioComercial(prev => ({ ...prev, marca: { ...prev.marca, ...cambio } }));
  }
  function cambiarBadgeMarca(idx, texto) {
    setInicioComercial(prev => {
      const badges = [...(prev.marca.badges || [])];
      badges[idx] = texto;
      return { ...prev, marca: { ...prev.marca, badges } };
    });
  }
  function agregarBadgeMarca() {
    setInicioComercial(prev => ({ ...prev, marca: { ...prev.marca, badges: [...(prev.marca.badges || []), ''].slice(0, 6) } }));
  }
  function quitarBadgeMarca(idx) {
    setInicioComercial(prev => ({ ...prev, marca: { ...prev.marca, badges: (prev.marca.badges || []).filter((_, i) => i !== idx) } }));
  }
  // Un solo medio (imagen/gif o video) a la vez: alcanza para esta sección
  // chica y evita un carrusel propio solo para "Nuestra marca".
  function cambiarMedioMarca(medio) {
    setInicioComercial(prev => ({ ...prev, marca: { ...prev.marca, medios: medio ? [medio] : [] } }));
  }

  // ─── Productos por categoría ────────────────────────────────────────────
  function cambiarProductosCategoria(cambio) {
    setInicioComercial(prev => ({ ...prev, productos_categoria: { ...prev.productos_categoria, ...cambio } }));
  }
  function alternarItemProductosCategoria(contentId) {
    setInicioComercial(prev => {
      const items = prev.productos_categoria.items || [];
      return {
        ...prev,
        productos_categoria: {
          ...prev.productos_categoria,
          items: items.includes(contentId) ? items.filter(i => i !== contentId) : [...items, contentId].slice(0, 48),
        },
      };
    });
  }

  // Oferta sin foto propia → la del producto que ofrece (o la del mismo
  // producto, si es un pack). Es lo que hace la landing publicada con
  // producto_complementario; sin esto la vista previa mostraba el bump sin
  // imagen y no se parecía a lo que ve el cliente.
  const ofertasConImagen = useMemo(() => (ofertas || []).map(o => {
    if (o.imagen_url) return o;
    const componente = (o.componentes || []).find(c => Number(c.producto_id) !== Number(o.producto_ancla_id))
      || (o.componentes || [])[0];
    const prod = porClave.get(`producto:${Number(componente?.producto_id ?? o.producto_ancla_id)}`)
      || porClave.get(`producto:${Number(o.producto_ancla_id)}`);
    return prod?.imagen ? { ...o, imagen_url: prod.imagen } : o;
  }), [ofertas, porClave]);

  // Ofertas agrupadas por el producto al que pertenecen (cada oferta se
  // guarda EN un producto: Productos → ficha → Ofertas). En este lienzo solo
  // se muestran las de productos que ya forman parte de la landing.
  const ofertasDeLanding = useMemo(() => {
    const grupos = new Map();
    ofertasConImagen.forEach(o => {
      const id = Number(o.producto_ancla_id);
      if (!grupos.has(id)) grupos.set(id, { producto: o.producto_ancla, ofertas: [] });
      grupos.get(id).ofertas.push(o);
    });
    return Array.from(grupos.entries()).filter(([id]) => idsProductoEnLanding.has(id));
  }, [ofertasConImagen, idsProductoEnLanding]);

  const candidatosReco = useMemo(
    () => seleccion.map(i => ({ ...i, content_id: contentIdPanel(i) })),
    [seleccion],
  );
  const categoriasRecoDisponibles = useMemo(() => (
    [...new Set(candidatosReco.map(i => i.categoria).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'))
  ), [candidatosReco]);
  const candidatosRecoFiltrados = useMemo(() => {
    const q = recoBusqueda.trim().toLowerCase();
    const filtrados = candidatosReco.filter(i => {
      if (recoCategoria && i.categoria !== recoCategoria) return false;
      if (!q) return true;
      const texto = [
        i.nombre,
        i.titulo_comercial,
        i.categoria,
        i.marca,
        i.sku,
        i.codigo,
      ].filter(Boolean).join(' ').toLowerCase();
      return texto.includes(q);
    });
    return filtrados.slice(0, 80);
  }, [candidatosReco, recoBusqueda, recoCategoria]);
  const totalCandidatosRecoFiltrados = useMemo(() => {
    const q = recoBusqueda.trim().toLowerCase();
    return candidatosReco.filter(i => {
      if (recoCategoria && i.categoria !== recoCategoria) return false;
      if (!q) return true;
      return [
        i.nombre,
        i.titulo_comercial,
        i.categoria,
        i.marca,
        i.sku,
        i.codigo,
      ].filter(Boolean).join(' ').toLowerCase().includes(q);
    }).length;
  }, [candidatosReco, recoBusqueda, recoCategoria]);
  const idsCandidatosReco = useMemo(
    () => new Set(candidatosReco.map(i => i.content_id)),
    [candidatosReco],
  );
  const recoItemsValidos = useMemo(
    () => recoItems.filter(id => idsCandidatosReco.has(id)).slice(0, 12),
    [recoItems, idsCandidatosReco],
  );
  useEffect(() => {
    if (recoItemsValidos.length !== recoItems.length) setRecoItems(recoItemsValidos);
  }, [recoItems, recoItemsValidos]);
  const candidatosOfertaLimitada = useMemo(
    () => candidatosReco.filter(i => i.mostrar_en_inicio !== false),
    [candidatosReco],
  );
  const idsCandidatosOfertaLimitada = useMemo(
    () => new Set(candidatosOfertaLimitada.map(i => i.content_id)),
    [candidatosOfertaLimitada],
  );
  const urgenciaProductosValidos = useMemo(
    () => urgenciaProductos.filter(id => idsCandidatosOfertaLimitada.has(id)),
    [urgenciaProductos, idsCandidatosOfertaLimitada],
  );
  useEffect(() => {
    if (urgenciaProductosValidos.length !== urgenciaProductos.length) setUrgenciaProductos(urgenciaProductosValidos);
  }, [urgenciaProductos, urgenciaProductosValidos]);
  const productoOfertaEditando = useMemo(
    () => candidatosOfertaLimitada.find(i => i.content_id === productoOfertaEditandoId)
      || candidatosOfertaLimitada.find(i => urgenciaProductosValidos.includes(i.content_id))
      || candidatosOfertaLimitada[0]
      || null,
    [candidatosOfertaLimitada, productoOfertaEditandoId, urgenciaProductosValidos],
  );

  function alternarProductoUrgencia(contentId) {
    setUrgenciaProductos(prev => {
      const ya = prev.includes(contentId);
      if (ya) return prev.filter(id => id !== contentId);
      setProductoOfertaEditandoId(contentId);
      return [...prev, contentId].slice(0, 12);
    });
    setUrgenciaProductoId(prev => prev || contentId);
    verDonde('inicio', 'productos_ofertas');
  }

  // La configuración tal como quedaría guardada — la usan el preview y el
  // guardado, así lo que se ve es lo que se vende.
  const inicioActual = useMemo(() => ({
    ...inicioComercial,
    banners: inicioComercial.banners.filter(b => b.activo !== false && (b.titulo || b.subtitulo || b.imagen)),
    banners_intermedios: (inicioComercial.banners_intermedios || []).filter(b => b.activo !== false && (b.titulo || b.subtitulo || b.imagen)),
    secciones: inicioComercial.secciones.filter(s => s.activo !== false && s.titulo),
    anuncios: (inicioComercial.anuncios || [])
      .map(it => ({ texto: (it?.texto || '').trim(), icono: it?.icono || '' }))
      .filter(it => it.texto),
    confianza: (inicioComercial.confianza || []).filter(it => it && (it.titulo || it.texto)).slice(0, 3),
    // "activo" ya no es un interruptor manual: se prende solo con contenido
    // real, mismo criterio que los banners de arriba — así no hay dos
    // controles (el "Mostrar" del bloque + uno adentro) para lo mismo.
    marca: { ...inicioComercial.marca, activo: !!(inicioComercial.marca.titulo || inicioComercial.marca.texto || inicioComercial.marca.medios?.length) },
    productos_categoria: { ...inicioComercial.productos_categoria, activo: (inicioComercial.productos_categoria.items || []).length > 0 },
  }), [inicioComercial]);

  const ventaActual = useMemo(() => ({
    configurado: true,
    tipo,
    seleccion: modo,
    categorias: Array.from(categorias),
    incluir_combos: incluirCombos,
    abrir_en: abrirEn,
    combos_primero: abrirEn === 'tienda' && combosPrimero,
    destacados: destacadosValidos,
    inicio: inicioActual,
    inicio_comercial: inicioActual,
    paquetes: confPaquetes,
    catalogo_filtros: filtrosCatalogo,
    presentacion_productos: Object.fromEntries(Object.entries(presentacion).slice(0, 500).map(([key, value]) => [key, {
      ...Object.fromEntries(['titulo_comercial', 'mensaje_comercial', 'insignia_principal', 'insignia_secundaria', 'cta_texto', 'agregar_carrito_texto', 'resenas_texto', 'beneficios_kicker', 'beneficios_titulo', 'beneficios_subtitulo', 'urgencia_kicker', 'urgencia_titulo', 'urgencia_texto', 'opiniones_kicker', 'opiniones_titulo', 'opiniones_subtitulo', 'preguntas_kicker', 'preguntas_titulo', 'preguntas_subtitulo'].map(campo => [campo, value[campo] || ''])),
      ...(value.ficha_bloques && typeof value.ficha_bloques === 'object' ? { ficha_bloques: value.ficha_bloques } : {}),
      ...(Array.isArray(value.imagenes_landing) ? { imagenes_landing: value.imagenes_landing } : {}),
      ...(Array.isArray(value.beneficios) ? { beneficios: value.beneficios.filter(b => b && (b.titulo || b.texto)).slice(0, 8) } : {}),
      ...(Array.isArray(value.botones_pago) ? { botones_pago: value.botones_pago.filter(b => b && (b.label || b.tipo || b.valor)).slice(0, 4) } : {}),
      ...(Array.isArray(value.metodos_pago) ? { metodos_pago: value.metodos_pago.filter(m => m && (m.texto || m.label)).slice(0, 8) } : {}),
      ...(Array.isArray(value.incluye_pedido) ? { incluye_pedido: value.incluye_pedido.filter(i => i && (i.texto || i.titulo)).slice(0, 8) } : {}),
      ...(Array.isArray(value.botones_contacto) ? { botones_contacto: value.botones_contacto.filter(b => b && (b.label || b.tipo || b.valor)).slice(0, 4) } : {}),
      ...(Array.isArray(value.opiniones) ? { opiniones: value.opiniones.filter(o => o && (o.nombre || o.comentario)).slice(0, 6) } : {}),
      ...(Array.isArray(value.preguntas) ? { preguntas: value.preguntas.filter(p => p && (p.pregunta || p.respuesta)).slice(0, 10) } : {}),
    }])),
    // El producto que abre la landing en "Directo en un producto" (con una
    // regla no hay items guardados que lo pongan primero).
    principal_id: abrirEn === 'producto'
      ? (Number(String(principal || clave(seleccion.find(i => i.tipo === 'producto') || {})).split(':')[1]) || null)
      : null,
    cross_sell: { activo: crossActivo, ofertas: Array.from(ofertasElegidas) },
    recomendados: {
      activo: recoActivo,
      modo: recoModo,
      items: recoItemsValidos,
      max: recoMax,
      titulo: recoTitulo,
      kicker: recoKicker,
      subtitulo: recoSubtitulo,
      cta_texto: recoCta,
    },
    urgencia: {
      activo: urgenciaActiva,
      fin_at: inputLocalAIso(urgenciaFinAt),
      producto_id: urgenciaProductosValidos.length ? null : (urgenciaProductoValido || null),
      productos: urgenciaProductosValidos,
      estado: urgenciaConfirmar ? 'confirmado' : 'demo',
      titulo: urgenciaTitulo,
      texto: urgenciaTexto,
      cta_texto: urgenciaCta,
    },
    prueba_social: { activo: pruebaSocialActiva, producto_id: pruebaSocialProductoValido || null, items: pruebaSocialItems },
    pago_logos: pagoLogos,
  }), [
    tipo, abrirEn, combosPrimero, destacadosValidos, inicioActual, confPaquetes, filtrosCatalogo, presentacion, principal, seleccion, modo, categorias, incluirCombos,
    crossActivo, ofertasElegidas, recoActivo, recoModo, recoItemsValidos, recoMax, recoTitulo,
    urgenciaActiva, urgenciaFinAt, urgenciaProductoValido, urgenciaProductosValidos, urgenciaConfirmar, urgenciaTitulo, urgenciaTexto, urgenciaCta, pruebaSocialActiva, pruebaSocialProductoValido, pruebaSocialItems,
    pagoLogos,
  ]);

  function alternarOferta(oferta) {
    const elegida = ofertasElegidas.has(oferta.id);
    setOfertasElegidas(prev => {
      const copia = new Set(prev);
      if (elegida) copia.delete(oferta.id); else copia.add(oferta.id);
      return copia;
    });
    if (!elegida) {
      const prod = porClave.get(`producto:${Number(oferta.producto_ancla_id)}`);
      if (prod) verOfertaEnFicha(oferta, prod);
    }
  }

  // Al cerrar el panel se vuelve a pedir la lista: lo creado o editado ahí
  // aparece acá sin recargar la página.
  // Lo que se crea desde este panel queda MARCADO para esta landing: antes
  // había que volver a tildarlo en la lista y, si no, no aparecía en la
  // ficha ni en el carrito (una landing configurada solo muestra lo marcado).
  function cerrarPanelOfertas() {
    const antes = new Set((ofertas || []).map(o => Number(o.id)));
    setPanelOfertas(null);
    recargarOfertas().then(lista => {
      const nuevas = (lista || []).filter(o => !antes.has(Number(o.id)) && idsProductoEnLanding.has(Number(o.producto_ancla_id)));
      if (!nuevas.length) return;
      setOfertasElegidas(prev => new Set([...prev, ...nuevas.map(o => o.id)]));
      setCrossActivo(true);
      const primera = nuevas[0];
      const prod = porClave.get(`producto:${Number(primera.producto_ancla_id)}`);
      if (prod) verOfertaEnFicha(primera, prod);
    });
  }

  function nombreProductoOferta(productoId) {
    const o = (ofertas || []).find(x => Number(x.producto_ancla_id) === Number(productoId));
    return o?.producto_ancla?.nombre || `Producto #${productoId}`;
  }

  function abrirNuevaOferta(tipoOferta = null) {
    const hayProductos = seleccion.some(i => i.tipo === 'producto');
    if (!hayProductos) {
      setError('Primero elegí al menos un producto para configurar sus ofertas.');
      return;
    }
    // Sin producto: PanelOfertas abre su propio buscador/selector (ver
    // `producto ? ... : <Buscador/>` más abajo) — nunca se adivina el
    // producto por el visitante, se lo pregunta.
    setPanelOfertas({ producto: null, estrategia: tipoOferta });
  }

  function abrirNuevoCombo() {
    const producto = seleccion.find(i => i.tipo === 'producto');
    if (!producto) {
      setError('Primero elegí al menos un producto principal para armar un combo.');
      return;
    }
    setPanelOfertas({ producto, estrategia: 'combo', modo: 'combo' });
  }

  function comboCreado(nuevo) {
    setPanelOfertas(null);
    // Los borradores quedan en Mis combos, fuera de la venta de la landing.
    if (nuevo.estado !== 'ACTIVO') return;
    const item = nuevo;
    setCombosCreados(prev => [...prev.filter(c => Number(c.id) !== Number(item.id)), item]);
    if (esRegla) {
      setIncluirCombos(true);
      if (modo === 'categoria') setCategorias(prev => new Set([...prev, item.categoria]));
    } else {
      setManual(prev => [...new Set([...prev, clave(item)])]);
    }
    // La lista local ya permite previsualizarlo aunque el catálogo tarde en recargar.
    onRecargarCatalogo?.()?.catch?.(() => {});
    setVistaPreview('inicio');
  }

  function abrirOfertasDe(productoId) {
    const producto = porClave.get(`producto:${Number(productoId)}`)
      || { id: Number(productoId), tipo: 'producto', nombre: nombreProductoOferta(productoId) };
    setPanelOfertas({ producto });
  }

  function alternarManual(item) {
    if (productosSoloDesdeProductos) return;
    const k = clave(item);
    setManual(prev => (prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]));
    if (tipo === 'producto_unico' && !principal) setPrincipal(k);
  }

  function alternarCategoria(cat) {
    if (productosSoloDesdeProductos) return;
    setCategorias(prev => {
      const copia = new Set(prev);
      if (copia.has(cat)) copia.delete(cat); else copia.add(cat);
      return copia;
    });
  }

  const visiblesManual = useMemo(() => {
    const q = normalizarTexto(busqueda.trim());
    return todos.filter(i => itemPasaFiltroOrigen(i, filtroTipo, usuarioActual)
      && (!q || [i.nombre, i.categoria, nombreProveedorItem(i)].some(valor => normalizarTexto(valor).includes(q))));
  }, [todos, busqueda, filtroTipo, usuarioActual]);

  function elegirVisibles() {
    if (productosSoloDesdeProductos) return;
    setManual(prev => {
      const set = new Set(prev);
      visiblesManual.forEach(i => set.add(clave(i)));
      return Array.from(set);
    });
  }

  // ─── Vista previa ──────────────────────────────────────────────────────
  // Si el inicio todavía es una página base (o el código de arranque), la
  // vista previa usa la base del formato elegido: cambiar de formato cambia
  // la página. Si ya tiene diseño propio, se muestra ese diseño.
  const inicioEsBase = !codigos?.inicio?.html?.trim()
    || codigos.inicio.html.includes(MARCA_CODIGO_INICIAL)
    || !!formatoDeBase(codigos.inicio.html);
  const abreEnFicha = abrirEn === 'producto';
  const codigoInicioPreview = inicioEsBase ? plantillaInicioPara(tipo) : codigos.inicio;
  const codigoCatalogoPreview = codigos?.catalogo?.html ? codigos.catalogo : PLANTILLA_CATALOGO;
  const codigoCategoriaPreview = codigos?.categoria?.html ? codigos.categoria : PLANTILLA_CATEGORIA;
  const codigoFichaPreview = esFichaProductoBase(codigos?.producto?.html) ? PLANTILLA_PRODUCTO : codigos.producto;
  const codigoCheckoutPreview = codigos?.checkout?.html ? codigos.checkout : PLANTILLA_CHECKOUT;
  const codigoPreviewActual = abreEnFicha || vistaPreview === 'producto'
    ? codigoFichaPreview
    : vistaPreview === 'catalogo'
      ? codigoCatalogoPreview
      : vistaPreview === 'categoria'
        ? codigoCategoriaPreview
        : vistaPreview === 'checkout'
          ? codigoCheckoutPreview
          : codigoInicioPreview;

  const productosPreview = useMemo(() => seleccion.slice(0, MAX_PRODUCTOS_PREVIEW), [seleccion]);
  const productoFicha = useMemo(() => {
    const productosSolos = productosPreview.filter(p => p.tipo === 'producto');
    return productosPreview.find(p => contentIdPanel(p) === productoPreview) || productosSolos[0] || productosPreview[0] || null;
  }, [productosPreview, productoPreview]);

  const datosPreview = useMemo(() => datosRuntimePreview({
    productos: productosPreview,
    tienda,
    venta: ventaActual,
    vista: abreEnFicha ? 'producto' : vistaPreview,
    categoria: vistaPreview === 'categoria' ? categoriaPreviewValida : null,
    productoId: abreEnFicha && vistaPreview === 'inicio' && seleccion[0]
      ? contentIdPanel(seleccion[0])
      : (productoFicha ? contentIdPanel(productoFicha) : null),
    ofertas: ofertasConImagen,
  }), [productosPreview, tienda, ventaActual, vistaPreview, categoriaPreviewValida, productoFicha, ofertasConImagen, abreEnFicha, seleccion]);

  // Dónde se ve cada tipo de oferta en la ficha (para resaltarla en la vista previa).
  function verOfertaEnFicha(oferta, producto) {
    if (oferta.estrategia === 'upsell') {
      verDonde('producto', null, contentIdPanel(producto));
      setAvisoPreview('El upsell no va en la ficha: aparece en el carrito, después de agregar el producto.');
      return;
    }
    verDonde('producto', oferta.estrategia === 'normal' ? 'paquetes' : 'ofertas_bump', contentIdPanel(producto));
  }

  function verDonde(vista, lista = null, productoId = null) {
    setVistaPreview(vista);
    setSeccionConfig(seccionConfigDeVista(vista));
    if (productoId) setProductoPreview(productoId);
    setAvisoPreview('');
    setResaltado(lista ? { lista, n: Date.now() } : null);
    setPreviewMovil(prev => prev || (typeof window !== 'undefined' && window.innerWidth < 1280));
  }

  function verOfertas() {
    // La ficha de un producto de la landing que tenga ofertas visibles.
    const conOfertas = seleccion.find(p => p.tipo === 'producto'
      && (ofertas || []).some(o => Number(o.producto_ancla_id) === Number(p.id) && ofertasElegidas.has(o.id)));
    if (!conOfertas) {
      verDonde('producto', null);
      setAvisoPreview('Todavía no marcaste ninguna oferta. Marcá una y la vas a ver acá, debajo del botón de compra.');
      return;
    }
    verDonde('producto', 'ofertas_bump', contentIdPanel(conOfertas));
  }

  function verRecomendados() {
    verDonde('producto', 'recomendados');
  }

  const alNavegarPreview = useCallback((p) => {
    if (p?.destino === 'producto') { setVistaPreview('producto'); setSeccionConfig('fichas'); setProductoPreview(p.producto); setResaltado(null); }
    else if (p?.destino === 'inicio') { setVistaPreview('inicio'); setSeccionConfig('inicio'); setResaltado(null); }
    else if (p?.destino === 'categoria') { setVistaPreview('categoria'); setSeccionConfig('categorias'); if (p.categoria) setCategoriaPreview(p.categoria); setResaltado(null); }
    else if (p?.destino === 'catalogo') { setVistaPreview('categoria'); setSeccionConfig('categorias'); setResaltado(null); }
    else if (p?.destino === 'checkout') { setVistaPreview('checkout'); setSeccionConfig('checkout'); setResaltado(null); }
    else if (p?.destino === 'pagina' && p.pagina === 'catalogo') {
      setVistaPreview(p?.filtro?.etiqueta ? 'catalogo' : 'categoria');
      setSeccionConfig('categorias');
      setResaltado(null);
      if (p?.filtro?.etiqueta) setAvisoPreview(`En la tienda publicada abre el catálogo filtrado por ${p.filtro.etiqueta}.`);
    }
    else if (p?.destino === 'pagina' && p.pagina === 'checkout') { setVistaPreview('checkout'); setSeccionConfig('checkout'); setResaltado(null); }
    else if (p?.destino === 'pagina') setAvisoPreview('Ese link abre una página de la tienda (legales o contacto).');
  }, []);
  const alComprarPreview = useCallback((p) => {
    setAvisoPreview(p?.oferta
      ? 'En la landing publicada, esto agrega la oferta al carrito.'
      : 'En la landing publicada, esto agrega el producto y abre el carrito.');
  }, []);
  const alCarritoPreview = useCallback(() => {
    setAvisoPreview('En la landing publicada, esto abre el carrito.');
  }, []);

  // Lo que impide guardar, dicho como qué falta hacer.
  const bloqueo = (() => {
    if (modo === 'categoria' && !categorias.size) return 'Elegí al menos una categoría.';
    if (!seleccion.length) return 'Agregá productos desde Productos para configurar esta landing.';
    if (excedeManual) return `Esta landing tiene más de ${MAX_PRODUCTOS_MANUAL} productos. Reducí la selección desde Productos.`;
    if (esRegla && seleccion.filter(i => i.precio_ancla != null || i.etiqueta || i.envio_incluido || i.mostrar_en_inicio === false || i.cta_texto || i.urgencia_texto || i.titulo_comercial || i.mensaje_comercial || i.insignia_principal || i.insignia_secundaria).length > MAX_PRODUCTOS_MANUAL) return `Podés personalizar hasta ${MAX_PRODUCTOS_MANUAL} productos; el resto sigue entrando con la configuración del catálogo.`;
    return null;
  })();

  async function confirmar() {
    if (subidasPendientes) return;
    setError('');
    if (bloqueo) {
      setError(bloqueo);
      return;
    }
    const idsSeleccion = new Set(candidatosReco.map(i => i.content_id));
    await onConfirmar({
      venta: {
        ...ventaActual,
        // Solo productos de la landing: uno de afuera se vería en la ficha
        // pero el checkout lo rechazaría.
        recomendados: { ...ventaActual.recomendados, items: recoItems.filter(id => idsSeleccion.has(id)) },
      },
      seleccion,
      // En una regla estos items son ajustes de presentación, no una lista
      // cerrada: los productos nuevos siguen entrando automáticamente.
      items: esRegla ? seleccion.filter(i => i.precio_ancla != null || i.etiqueta || i.envio_incluido || i.mostrar_en_inicio === false || i.cta_texto || i.urgencia_texto || i.titulo_comercial || i.mensaje_comercial || i.insignia_principal || i.insignia_secundaria) : seleccion,
      // Estado "confirmado" para urgencia/prueba_social: solo si el checkbox
      // de confirmación está tildado EN ESTE guardado — cualquier edición de
      // la fecha o de las cifras lo destilda solo (ver cambiarUrgenciaFinAt/
      // cambiarStatItem). El backend es quien realmente lo persiste así.
      confirmaciones: {
        ...(urgenciaConfirmar ? { urgencia: true } : {}),
        ...(pruebaSocialConfirmar ? { prueba_social: true } : {}),
      },
    });
  }

  if (!catalogo) {
    return (
      <div className="flex items-center justify-center gap-2 text-fg-muted p-16">
        <Loader size={18} className="animate-spin" /> Cargando tu catálogo…
      </div>
    );
  }

  const resumenProductos = `${seleccion.length.toLocaleString('es-PY')} producto${seleccion.length === 1 ? '' : 's'}`;
  const resumenOfertas = !crossActivo || !ofertasElegidas.size
    ? 'Sin ofertas'
    : `${ofertasElegidas.size} oferta${ofertasElegidas.size === 1 ? '' : 's'}`;
  const resumenReco = !recoActivo
    ? 'sin recomendados'
    : (recoModo === 'auto' ? 'recomendados automáticos' : `${recoItems.length} recomendado${recoItems.length === 1 ? '' : 's'} a mano`);
  const estadisticasConfirmables = pruebaSocialItems.some(it => String(it.valor || '').trim() && String(it.etiqueta || '').trim());

  const propsVistaPrevia = {
    vista: vistaPreview,
    onVista: v => { setVistaPreview(v); setSeccionConfig(seccionConfigDeVista(v)); setResaltado(null); setAvisoPreview(''); },
    productos: productosPreview,
    productoFicha,
    onProducto: id => { setProductoPreview(id); setResaltado(null); },
    codigo: codigoPreviewActual,
    datos: datosPreview,
    resaltado,
    aviso: avisoPreview,
    inicioEsBase,
    disenoPendienteIA,
    onNavegar: alNavegarPreview,
    onComprar: alComprarPreview,
    onCarrito: alCarritoPreview,
    dispositivo,
    onDispositivo: setDispositivo,
  };
  const vistaPrevia = <VistaPrevia {...propsVistaPrevia} onAmpliar={() => setPreviewAmpliada(true)} />;

  return (
    <div className="h-full min-h-0 w-full overflow-hidden flex flex-col bg-canvas">
      {/* Barra superior: siempre a la vista, con las acciones de la landing
          ya guardada. Reemplaza al antiguo editor de código como pantalla
          de entrada — esas acciones (publicar, guardar, eliminar) vivían
          ahí y ahora viven acá. */}
      <div className="shrink-0 border-b border-border bg-surface px-4 md:px-6 py-2.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <ArrowLeft size={15} /> Volver
        </button>
        <div className="flex items-center gap-1.5">
          {onAbrirCodigo && (
            <button
              type="button"
              onClick={onAbrirCodigo}
              title="Código avanzado: HTML/CSS/JS, Secciones, Footer y Prompt IA"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              <Settings2 size={14} /> <span className="hidden sm:inline">Código avanzado</span>
            </button>
          )}
          {publicUrl && (
            <a
              href={publicUrl} target="_blank" rel="noreferrer"
              title="Ver landing pública"
              className="p-2 rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              <ExternalLink size={16} />
            </a>
          )}
          {onEliminar && (
            <button type="button" onClick={onEliminar} title="Eliminar landing" className="p-2 rounded-lg text-fg-muted hover:bg-danger/10 hover:text-danger">
              <Trash2 size={16} />
            </button>
          )}
          {onPublicar && (
            <button
              type="button"
              onClick={onPublicar}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-surface-2 text-fg hover:bg-border"
            >
              {landingActiva ? <><EyeOff size={14} /> Despublicar</> : <><Eye size={14} /> Publicar</>}
            </button>
          )}
          {onGuardarRapido && (
            <button
              type="button"
              onClick={onGuardarRapido}
              disabled={guardando}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold bg-fg text-canvas hover:bg-fg-muted disabled:opacity-50"
            >
              {guardando ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
              Guardar{sinGuardar ? ' •' : ''}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex">
        {/* Configuración */}
        <div className="flex-1 xl:flex-none xl:w-[600px] 2xl:w-[680px] min-w-0 overflow-y-auto overscroll-contain">
          <div className="max-w-[720px] mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-10">
            <header className="mb-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">Landing HTML · paso 1 de 2</p>
              <h1 className="mt-2 text-[28px] md:text-[32px] leading-tight font-bold tracking-tight text-fg">Configurar tienda</h1>
              <p className="mt-2 text-[15px] text-fg-muted">
                Ajustá qué se ve en el inicio, cómo se presentan las fichas y qué ofertas reales tendrá la tienda.
              </p>
              <div role="tablist" aria-label="Área de configuración" className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl border border-border bg-surface-2 p-1">
                {SECCIONES_CONFIG_TIENDA.map(([key, label, Icono, vistaDestino]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={seccionConfig === key}
                    onClick={() => {
                      setSeccionConfig(key);
                      if (key === 'categorias' && categoriaPreviewValida) setCategoriaPreview(categoriaPreviewValida);
                      if (key === 'fichas') {
                        const primero = productoEditando || candidatosDatosProducto[0]?.content_id || null;
                        if (primero) { seleccionarProductoConfig(primero); }
                        else { setVistaPreview('producto'); setAvisoPreview('Elegí un producto para configurar su ficha.'); setResaltado(null); }
                        return;
                      }
                      if (key === 'ofertas') {
                        verOfertas();
                        return;
                      }
                      if (key === 'combos') {
                        setVistaPreview('inicio');
                        setAvisoPreview('Los combos aparecen como packs o vitrinas cuando están activos y sumados a la landing.');
                        setResaltado(null);
                        return;
                      }
                      verDonde(vistaDestino, null);
                    }}
                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors ${seccionConfig === key ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                  >
                    <Icono size={15} /> <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </header>

            <div className="space-y-5">
              {seccionConfig === 'fichas' && (
                <>
                  <Bloque
                    titulo="1. Elegí el producto que vas a editar"
                    ayuda="La ficha se edita de a un producto: elegís uno, el panel de abajo cambia a esa ficha y la preview salta al producto seleccionado."
                  >
                    {candidatosDatosProducto.length === 0 ? (
                      <p className="text-sm text-fg-muted">Agregá productos desde Productos para configurar sus fichas.</p>
                    ) : (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="block text-sm font-medium text-fg mb-1.5">Producto a editar</span>
                          <select
                            value={productoConfigActual?.content_id || ''}
                            onChange={e => seleccionarProductoConfig(e.target.value)}
                            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-fg outline-none focus:border-primary"
                          >
                            <option value="" disabled>Seleccioná un producto</option>
                            {candidatosDatosProducto.map(item => <option key={item.content_id} value={item.content_id}>{item.nombre}</option>)}
                          </select>
                        </label>
                        <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
                          <p className="text-xs font-semibold text-fg">Ahora editás solo este producto</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">Imágenes, reseñas, textos, beneficios, compra, pagos, opiniones y recomendaciones quedan separados de los otros productos.</p>
                        </div>
                      </div>
                    )}
                  </Bloque>

                  {productoConfigActual ? (
                    <Bloque
                      titulo={productoConfigActual.nombre}
                      ayuda="Presentación comercial, precio ancla, badges, imágenes y visibilidad de esta ficha."
                      verDonde={() => seleccionarProductoConfig(productoConfigActual.content_id)}
                    >
                      <PresentacionProducto item={productoConfigActual} ancla={anclas[claveItem(productoConfigActual)] ?? ''}
                        onAncla={v => setAnclas(prev => ({ ...prev, [claveItem(productoConfigActual)]: v }))}
                        onCambiar={(campo, valor) => cambiarPresentacion(productoConfigActual, campo, valor)}
                        destacado={destacadosValidos.includes(productoConfigActual.content_id)} onDestacar={() => alternarDestacado(productoConfigActual.content_id)}
                        tienda={tienda} onSubirImagen={onSubirImagen ? subirImagenLanding : null} {...propsOfertaProducto(productoConfigActual)} inicialmenteAbierto />
                    </Bloque>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-6 text-center">
                      <p className="text-sm font-semibold text-fg">Elegí un producto para editar su ficha.</p>
                      <p className="mt-1 text-sm text-fg-muted">Hasta que elijas uno, esta área solo lista los productos disponibles.</p>
                    </div>
                  )}
                </>
              )}

              {seccionConfig === 'inicio' && (
                <>
              <Bloque
                titulo="Inicio"
                ayuda="Configurá solo lo que afecta al homepage de esta tienda."
                verDonde={() => verDonde('inicio', null)}
              >
                <div className="mb-3 rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
                  <p className="text-xs font-semibold text-fg">Orden real de la homepage</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
                    Lo definís vos en "Bloques del Inicio", abajo: reordená, mostrá u ocultá cada sección. El Menú vive siempre en el header y no se mueve.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => verDonde('inicio', 'productos_destacados')}
                    className="rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-left hover:border-border-strong"
                  >
                    <span className="block text-sm font-semibold text-fg">Productos destacados</span>
                    <span className="mt-1 block text-xs text-fg-muted">{destacadosValidos.length || Math.min(4, seleccion.length)} producto{(destacadosValidos.length || Math.min(4, seleccion.length)) === 1 ? '' : 's'} en portada.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeccionConfig('fichas')}
                    className="rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-left hover:border-border-strong"
                  >
                    <span className="block text-sm font-semibold text-fg">Presentación de productos</span>
                    <span className="mt-1 block text-xs text-fg-muted">Editá título, badge, CTA o imágenes desde la ficha de cada producto.</span>
                  </button>
                </div>
              </Bloque>

              <Bloque
                titulo="Bloques del Inicio"
                ayuda="Todo lo que se ve en el homepage se edita acá, bloque por bloque: abrí uno para cambiar su contenido, reordená o mostrá/ocultá con los controles de la derecha."
                verDonde={() => verDonde('inicio', null)}
              >
                <EditorBloquesInicio
                  bloques={inicioComercial.bloques}
                  onMover={moverBloqueInicio}
                  onAlternar={alternarBloqueInicio}
                  menuPanel={(
                    <EditorMenuPrincipal
                      items={inicioComercial.menu_links || []}
                      categorias={categoriasInicioDisponibles}
                      onAgregar={agregarMenuPrincipal}
                      onCambiar={cambiarMenuPrincipal}
                      onQuitar={quitarMenuPrincipal}
                      onMover={moverMenuPrincipal}
                    />
                  )}
                  paneles={{
                    anuncios: (
                      <EditorAnuncios
                        anuncios={inicioComercial.anuncios}
                        onCambiar={cambiarAnuncio}
                        onAgregar={agregarAnuncio}
                        onQuitar={quitarAnuncio}
                      />
                    ),
                    banner: (
                      <EditorBannersInicio
                        banners={inicioComercial.banners}
                        categorias={categoriasInicioDisponibles}
                        onAgregar={agregarBanner}
                        onCambiar={cambiarBanner}
                        onQuitar={quitarBanner}
                        onMover={moverBanner}
                        onSubir={onSubirImagen ? subirImagenLanding : null}
                      />
                    ),
                    productos_categoria: (
                      <EditorProductosCategoria
                        config={inicioComercial.productos_categoria}
                        candidatos={candidatosDestacados}
                        onCambiar={cambiarProductosCategoria}
                        onAlternarItem={alternarItemProductosCategoria}
                      />
                    ),
                    confianza: (
                      <EditorConfianzaInicio
                        items={inicioComercial.confianza}
                        onCambiar={cambiarConfianza}
                      />
                    ),
                    marca: (
                      <EditorMarcaInicio
                        marca={inicioComercial.marca}
                        onCambiar={cambiarMarca}
                        onCambiarBadge={cambiarBadgeMarca}
                        onAgregarBadge={agregarBadgeMarca}
                        onQuitarBadge={quitarBadgeMarca}
                        onCambiarMedio={cambiarMedioMarca}
                        onSubir={onSubirImagen ? subirImagenLanding : null}
                      />
                    ),
                    categorias: (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-fg">
                          <input type="checkbox" checked={inicioComercial.menu_categorias} onChange={e => cambiarInicio('menu_categorias', e.target.checked)} className="accent-primary" />
                          Mostrar también en el menú de categorías del header
                        </label>
                        {inicioComercial.menu_categorias && (
                          <EditorCategoriasInicio
                            categorias={categoriasInicioDisponibles}
                            seleccionadas={inicioComercial.categorias}
                            onCambiar={cats => cambiarInicio('categorias', cats)}
                          />
                        )}
                      </div>
                    ),
                    destacados: (
                      <EditorProductosDestacados
                        candidatosDestacados={candidatosDestacados}
                        destacadosValidos={destacadosValidos}
                        seleccionLength={seleccion.length}
                        onAlternar={alternarDestacado}
                        onVer={() => verDonde('inicio', 'productos_destacados')}
                      />
                    ),
                    banner_intermedio: (
                      <EditorBannersInicio
                        banners={inicioComercial.banners_intermedios || []}
                        categorias={categoriasInicioDisponibles}
                        onAgregar={agregarBannerIntermedio}
                        onCambiar={cambiarBannerIntermedio}
                        onQuitar={quitarBannerIntermedio}
                        onMover={moverBannerIntermedio}
                        onSubir={onSubirImagen ? subirImagenLanding : null}
                      />
                    ),
                    secciones_inicio: (
                      <EditorSeccionesInicio
                        secciones={inicioComercial.secciones}
                        categorias={categoriasInicioDisponibles}
                        productos={candidatosReco}
                        onAgregar={agregarSeccionInicio}
                        onCambiar={cambiarSeccionInicio}
                        onQuitar={quitarSeccionInicio}
                        onMover={moverSeccionInicio}
                        onAlternarProducto={alternarProductoSeccion}
                      />
                    ),
                    ofertas_urgencia: (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-fg">
                          <input type="checkbox" checked={urgenciaActiva} onChange={e => setUrgenciaActiva(e.target.checked)} className="accent-primary" />
                          Activar la cuenta regresiva (también se usa en las fichas de producto)
                        </label>
                        {urgenciaActiva && (
                          <>
                            <EditorUrgenciaInicio
                              titulo={urgenciaTitulo}
                              texto={urgenciaTexto}
                              cta={urgenciaCta}
                              finAt={urgenciaFinAt}
                              confirmar={urgenciaConfirmar}
                              onTitulo={setUrgenciaTitulo}
                              onTexto={setUrgenciaTexto}
                              onCta={setUrgenciaCta}
                              onFinAt={cambiarUrgenciaFinAt}
                              onConfirmar={setUrgenciaConfirmar}
                            />
                            <EditorProductosOfertaLimitada
                              productos={candidatosOfertaLimitada}
                              seleccionados={urgenciaProductosValidos}
                              productoEditando={productoOfertaEditando}
                              onAlternar={alternarProductoUrgencia}
                              onEditar={setProductoOfertaEditandoId}
                              anclas={anclas}
                              onAncla={(item, v) => setAnclas(prev => ({ ...prev, [claveItem(item)]: v }))}
                              onCambiarPromo={cambiarPresentacion}
                            />
                          </>
                        )}
                      </div>
                    ),
                  }}
                />
              </Bloque>

              <Bloque
                titulo="Presentación de productos en inicio"
                ayuda="Resumen rápido. Si necesitás editar un producto, abrís su ficha dedicada."
              >
                {seleccion.length === 0 ? (
                  <p className="text-sm text-fg-muted">Agregá productos desde Productos para verlos acá.</p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {seleccion.slice(0, 10).map(item => (
                      <div key={claveItem(item)} className="flex items-center gap-3 bg-surface-2/40 px-3 py-2.5">
                        <Miniatura item={item} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg">{item.titulo_comercial || item.nombre}</p>
                          <p className="text-xs text-fg-muted tabular-nums">{formatearGs(precioDeVenta(item)) || 'Sin precio'}{item.insignia_principal ? ` · ${item.insignia_principal}` : ''}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => seleccionarProductoConfig(contentIdPanel(item))}
                          className="shrink-0 text-xs font-semibold text-primary-text hover:underline"
                        >
                          Editar →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Bloque>
                </>
              )}

              {seccionConfig === 'catalogo' && (
                <>
                  <Bloque
                    titulo="Productos"
                    ayuda="Configurá la página donde se navegan todos los productos. La vista usa los productos reales y se puede editar como página propia."
                    verDonde={() => verDonde('catalogo', null)}
                  >
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border bg-surface-2/60 px-4 py-3">
                        <p className="text-sm font-semibold text-fg">Filtros visibles</p>
                        <p className="mt-1 text-[13px] text-fg-muted">Activá solo los controles que querés mostrar en la página de catálogo.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {FILTROS_CATALOGO.map(([key, label]) => (
                          <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg">
                            <span>{label}</span>
                            <input
                              type="checkbox"
                              checked={filtrosCatalogo?.[key] !== false}
                              onChange={() => alternarFiltroCatalogo(key)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </Bloque>

                  <Bloque
                    titulo="Promos y descuentos del catálogo"
                    ayuda="Editá solo precio anterior, % de descuento, badges, etiquetas y countdown de los productos que aparecen en el catálogo."
                    verDonde={() => verDonde('catalogo', null)}
                  >
                    <EditorPromosCatalogo
                      productos={candidatosDatosProducto}
                      productoEditando={productoConfigActual}
                      ofertasSeleccionadas={urgenciaProductosValidos}
                      anclas={anclas}
                      ofertaFinAt={urgenciaFinAt}
                      ofertaTitulo={urgenciaTitulo}
                      ofertaTexto={urgenciaTexto}
                      ofertaCta={urgenciaCta}
                      onEditar={contentId => {
                        setProductoEditando(contentId);
                        setVistaPreview('catalogo');
                        setProductoPreview(contentId);
                        setAvisoPreview('');
                        setResaltado(null);
                      }}
                      onAncla={(item, valor) => {
                        setAnclas(prev => ({ ...prev, [claveItem(item)]: valor }));
                        setVistaPreview('catalogo');
                        setProductoPreview(item.content_id);
                        setAvisoPreview('');
                        setResaltado(null);
                      }}
                      onCambiar={(item, campo, valor) => cambiarPresentacion(item, campo, valor)}
                      onOfertaFinAt={cambiarUrgenciaFinAt}
                      onOfertaTitulo={setUrgenciaTitulo}
                      onOfertaTexto={setUrgenciaTexto}
                      onOfertaCta={setUrgenciaCta}
                      onAlternarOferta={contentId => {
                        activarOfertaCatalogo(contentId);
                        setVistaPreview('catalogo');
                        setResaltado(null);
                      }}
                      onQuitarOferta={quitarOfertaCatalogo}
                    />
                  </Bloque>
                </>
              )}

              {seccionConfig === 'categorias' && (
                <>
                  <Bloque
                    titulo="Categorías"
                    ayuda="La página de categoría toma las categorías reales de esta landing. Desde acá podés previsualizar cómo se ve cada entrada."
                    verDonde={() => verDonde('categoria', null)}
                  >
                    {categoriasLandingDisponibles.length === 0 ? (
                      <p className="text-sm text-fg-muted">Esta landing todavía no tiene productos con categoría.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                        {categoriasLandingDisponibles.map(([cat, count]) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => { setCategoriaPreview(cat); setVistaPreview('categoria'); setAvisoPreview(`Preview de categoría: ${cat}.`); setResaltado(null); }}
                            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-left hover:border-border-strong"
                          >
                            <span className="block text-sm font-semibold text-fg truncate">{cat}</span>
                            <span className="block text-xs text-fg-muted">{count} producto{count === 1 ? '' : 's'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </Bloque>
                </>
              )}

              {seccionConfig === 'checkout' && (
                <>
                  <Bloque
                    titulo="Checkout"
                    ayuda="Configuración visual y comercial de la página final de compra. Las ofertas de checkout se siguen gestionando por producto."
                    verDonde={() => verDonde('checkout', null)}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => abrirNuevaOferta('order_bump')}
                        className="rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-left hover:border-border-strong"
                      >
                        <span className="block text-sm font-semibold text-fg">Agregar producto recomendado</span>
                        <span className="mt-1 block text-xs text-fg-muted">Un order bump: elegís el producto y armás la oferta que se ofrece antes de pagar.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeccionConfig('ofertas')}
                        className="rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-left hover:border-border-strong"
                      >
                        <span className="block text-sm font-semibold text-fg">Ofertas de checkout</span>
                        <span className="mt-1 block text-xs text-fg-muted">Order bumps y upsells se editan desde Ofertas.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => verDonde('checkout', null)}
                        className="rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-left hover:border-border-strong"
                      >
                        <span className="block text-sm font-semibold text-fg">Vista de pago</span>
                        <span className="mt-1 block text-xs text-fg-muted">Previsualizá la pantalla completa antes de guardar.</span>
                      </button>
                    </div>

                    <div className="mt-4 rounded-xl border border-border bg-surface-2/60 px-4 py-3.5">
                      <p className="text-sm font-semibold text-fg">Logos de medios de pago en la ficha</p>
                      <p className="mt-1 text-[13px] text-fg-muted">Se muestran junto al botón de compra, antes de confirmar. Elegí cuáles mostrar.</p>
                      <div className="mt-3 space-y-2.5">
                        {[
                          ['tarjetas', 'Tarjetas de crédito', 'Visa, Mastercard, Pago Móvil'],
                          ['bocas', 'Bocas de cobranza', 'Aquí Pago, Pago Express, Practipago, Infonet Cobranzas'],
                          ['billetera', 'Billetera electrónica', 'Tigo Money, Billetera Personal'],
                        ].map(([clave, label, detalle]) => (
                          <div key={clave} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-fg">{label}</p>
                              <p className="text-xs text-fg-muted truncate">{detalle}</p>
                            </div>
                            <Interruptor activo={pagoLogos[clave]} onChange={() => alternarPagoLogo(clave)} etiqueta={`Mostrar ${label}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Bloque>
                </>
              )}

              {seccionConfig === 'ofertas' && (
                <>
              <Bloque
                titulo="Ofertas"
                ayuda="Vista general de las ofertas configuradas. Cada oferta se edita en su propio panel, sin dejar todos los controles abiertos."
                verDonde={verOfertas}
              >
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg">{ofertasElegidas.size} oferta{ofertasElegidas.size === 1 ? '' : 's'} activa{ofertasElegidas.size === 1 ? '' : 's'}</p>
                        <p className="mt-1 text-[13px] text-fg-muted">
                          Las ofertas se guardan por producto. Si una oferta está activa, aparece en la landing; si no existe ninguna, esta zona queda apagada de facto.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => abrirNuevaOferta()}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover"
                      >
                        <Plus size={15} /> Crear oferta
                      </button>
                    </div>

                    <div className="rounded-lg border border-border bg-surface-2/60 px-3.5 py-2.5 text-[13px] text-fg-muted">
                      <span className="font-semibold text-fg">Regla de este lienzo:</span>{' '}
                      cada oferta se guarda y se edita por producto. Si necesitás ofertar otro producto, primero agregalo desde Productos.
                    </div>

                    {errorOfertas && <p className="text-sm text-danger">{errorOfertas}</p>}
                    {ofertas === null ? (
                      <p className="flex items-center gap-2 text-sm text-fg-muted"><Loader size={14} className="animate-spin" /> Buscando tus ofertas…</p>
                    ) : (
                      <>
                        {ofertasDeLanding.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border-strong px-5 py-6 text-center">
                            <Tag size={20} className="mx-auto text-fg-muted" />
                            <p className="mt-2 text-sm font-medium text-fg">Ningún producto de esta landing tiene ofertas todavía</p>
                            <p className="mt-1 text-[13px] text-fg-muted">Abrí la ficha comercial de un producto y configurá sus paquetes, order bumps o upsells.</p>
                            <button
                              type="button"
                              onClick={() => abrirNuevaOferta()}
                              className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover"
                            >
                              <Plus size={15} /> Configurar primera oferta
                            </button>
                          </div>
                        ) : (
                          <>
                            {ofertasDeLanding.map(([productoId, grupo]) => (
                              <GrupoOfertas
                                key={productoId}
                                producto={porClave.get(`producto:${productoId}`) || grupo.producto}
                                nombre={grupo.producto?.nombre || `Producto #${productoId}`}
                                ofertas={grupo.ofertas}
                                elegidas={ofertasElegidas}
                                onAlternar={alternarOferta}
                                onGestionar={() => abrirOfertasDe(productoId)}
                                confPaquetes={confPaquetes}
                                onCambiarPaquete={(id, cambio) => {
                                  cambiarPaquete(id, cambio);
                                  const prod = porClave.get(`producto:${productoId}`);
                                  if (prod) verDonde('producto', 'paquetes', contentIdPanel(prod));
                                }}
                              />
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
              </Bloque>
                </>
              )}

              {seccionConfig === 'combos' && (
                <>
              <Bloque
                titulo="Combos"
                ayuda="Los combos son packs comerciales, no descuentos sueltos. Elegís un producto principal y armás el conjunto con precio propio."
              >
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg">Crear combo desde un producto principal</p>
                        <p className="mt-1 text-[13px] text-fg-muted">
                          El combo queda como pack/vista propia. Después lo activás y lo sumás a la landing como cualquier producto vendible.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={abrirNuevoCombo}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover"
                      >
                        <PackagePlus size={15} /> Crear combo
                      </button>
                    </div>

                    {seleccion.filter(i => i.tipo === 'combo').length > 0 ? (
                      <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
                        {seleccion.filter(i => i.tipo === 'combo').map(combo => (
                          <div key={contentIdPanel(combo)} className="flex items-center gap-3 px-3 py-2.5">
                            <Miniatura item={combo} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-fg truncate">{combo.nombre}</span>
                              <span className="block text-xs text-fg-muted">Combo activo en esta landing</span>
                            </span>
                            <span className="font-mono text-xs text-fg tabular-nums">{formatearGs(precioPanel(combo))}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border-strong px-5 py-6 text-center">
                        <PackagePlus size={20} className="mx-auto text-fg-muted" />
                        <p className="mt-2 text-sm font-medium text-fg">Todavía no hay combos en esta landing</p>
                        <p className="mt-1 text-[13px] text-fg-muted">Creá uno desde un producto principal o activá un combo existente.</p>
                      </div>
                    )}

                    <CombosSinPublicar
                      idsVisibles={idsCombosCatalogo}
                      formatoCombos
                      onActivado={async () => {
                        await onRecargarCatalogo?.();
                      }}
                    />
                  </div>
              </Bloque>
                </>
              )}

              {seccionConfig === 'fichas' && (
                <>
              {/* Recomendados */}
              <Bloque
                titulo="8. Productos recomendados"
                ayuda="Ultimo bloque de la ficha: titulo, subtitulo, cantidad y productos recomendados."
                interruptor={{ activo: recoActivo, onChange: setRecoActivo, etiqueta: 'Mostrar productos recomendados' }}
                verDonde={recoActivo ? verRecomendados : null}
              >
                {recoActivo && (
                  <div className="space-y-4">
                    <div role="radiogroup" aria-label="Cómo elegir los recomendados" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        ['auto', 'Automático', 'En cada ficha, otros productos de su misma categoría.'],
                        ['manual', 'Elegidos por vos', 'Los mismos productos en todas las fichas.'],
                      ].map(([k, titulo, texto]) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={recoModo === k}
                          onClick={() => { setRecoModo(k); verRecomendados(); }}
                          className={`text-left rounded-lg border px-3.5 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${recoModo === k ? 'border-accent bg-accent/[0.07]' : 'border-border hover:border-border-strong'}`}
                        >
                          <span className="block text-sm font-medium text-fg">{titulo}</span>
                          <span className="block text-xs text-fg-muted">{texto}</span>
                        </button>
                      ))}
                    </div>

                    {recoModo === 'manual' && (
                      candidatosReco.length === 0 ? (
                        <p className="text-sm text-fg-muted">Primero elegí los productos de la landing.</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs text-fg-muted">Buscá y tocá los productos que querés recomendar ({recoItemsValidos.length} de hasta 12).</p>
                              {recoItemsValidos.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => { setRecoItems([]); verRecomendados(); }}
                                  className="shrink-0 text-xs font-medium text-fg-muted hover:text-fg"
                                >
                                  Limpiar selección
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                              <label className="relative block">
                                <span className="sr-only">Buscar productos recomendados</span>
                                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                                <input
                                  value={recoBusqueda}
                                  onChange={e => setRecoBusqueda(e.target.value)}
                                  placeholder="Buscar por producto, SKU, marca o categoría"
                                  className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                                />
                              </label>
                              <label className="block">
                                <span className="sr-only">Filtrar por categoría</span>
                                <select
                                  value={recoCategoria}
                                  onChange={e => setRecoCategoria(e.target.value)}
                                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
                                >
                                  <option value="">Todas las categorías</option>
                                  {categoriasRecoDisponibles.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                              </label>
                            </div>
                            {(recoBusqueda || recoCategoria) && (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-xs text-fg-muted">
                                <span>
                                  {totalCandidatosRecoFiltrados.toLocaleString('es-PY')} resultado{totalCandidatosRecoFiltrados === 1 ? '' : 's'}
                                  {totalCandidatosRecoFiltrados > candidatosRecoFiltrados.length ? ` · mostrando primeros ${candidatosRecoFiltrados.length}` : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { setRecoBusqueda(''); setRecoCategoria(''); }}
                                  className="font-medium text-primary-text hover:underline"
                                >
                                  Limpiar filtros
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="grid max-h-[440px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                            {candidatosRecoFiltrados.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-fg-muted sm:col-span-2">
                                No encontramos productos con esos filtros.
                              </div>
                            ) : candidatosRecoFiltrados.map(i => {
                              const elegido = recoItems.includes(i.content_id);
                              const precio = Number(precioDeVenta(i)) || Number(precioPanel(i)) || 0;
                              const anclaKey = claveItem(i);
                              const img = imagenPanel(i);
                              return (
                                <div
                                  key={i.content_id}
                                  className={`rounded-xl border p-2.5 transition-colors ${elegido ? 'border-accent bg-accent/[0.07] shadow-sm' : 'border-border bg-surface hover:border-border-strong'}`}
                                >
                                  <button
                                    type="button"
                                    aria-pressed={elegido}
                                    onClick={() => {
                                      setRecoItems(prev => (elegido ? prev.filter(x => x !== i.content_id) : [...prev, i.content_id].slice(0, 12)));
                                      setVistaPreview('producto');
                                      setProductoPreview(i.content_id);
                                      setAvisoPreview('');
                                      setResaltado({ lista: 'recomendados', n: 0 });
                                    }}
                                    className="flex w-full items-start gap-3 text-left"
                                  >
                                    <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                                      {img
                                        ? <img src={img} alt="" className="h-full w-full object-contain" loading="lazy" />
                                        : <ShoppingBag size={20} className="text-fg-subtle" />}
                                      <span className={`absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border text-[11px] ${elegido ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-fg-subtle'}`}>
                                        {elegido ? <Check size={13} /> : null}
                                      </span>
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="line-clamp-2 text-sm font-semibold leading-snug text-fg">{i.titulo_comercial || i.nombre}</span>
                                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
                                        <span className="font-mono font-semibold text-fg">{formatearGs(precio) || 'Sin precio'}</span>
                                        {Number(i.precio_ancla) > precio && <span className="font-mono text-fg-muted line-through">{formatearGs(i.precio_ancla)}</span>}
                                      </span>
                                      <span className="mt-1 block truncate text-[11px] text-fg-muted">{i.tipo === 'combo' ? 'Combo' : (i.categoria || 'Producto')}</span>
                                    </span>
                                  </button>
                                  <PrecioAncla
                                    venta={precio}
                                    valor={anclas[anclaKey] ?? ''}
                                    onCambiar={v => {
                                      setAnclas(prev => ({ ...prev, [anclaKey]: v }));
                                      setVistaPreview('producto');
                                      setProductoPreview(i.content_id);
                                      setAvisoPreview('');
                                      setResaltado({ lista: 'recomendados', n: 0 });
                                    }}
                                    id={`reco-ancla-${i.content_id}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label>
                        <span className="block text-sm font-medium text-fg mb-1.5">Rótulo superior</span>
                        <input
                          value={recoKicker}
                          onChange={e => setRecoKicker(e.target.value)}
                          maxLength={50}
                          placeholder="Te puede gustar"
                          className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                        />
                      </label>
                      <label>
                        <span className="block text-sm font-medium text-fg mb-1.5">Título de la sección</span>
                        <input
                          value={recoTitulo}
                          onChange={e => setRecoTitulo(e.target.value)}
                          maxLength={80}
                          placeholder="Productos recomendados"
                          className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="block text-sm font-medium text-fg mb-1.5">Subtítulo</span>
                        <textarea
                          value={recoSubtitulo}
                          onChange={e => setRecoSubtitulo(e.target.value)}
                          maxLength={180}
                          rows={2}
                          placeholder="Elegí alternativas o complementos para que el cliente siga comprando."
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                        />
                      </label>
                      <label>
                        <span className="block text-sm font-medium text-fg mb-1.5">Texto del botón</span>
                        <input
                          value={recoCta}
                          onChange={e => setRecoCta(e.target.value)}
                          maxLength={40}
                          placeholder="Agregar"
                          className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                        />
                      </label>
                      <div>
                        <span id="reco-cantidad" className="block text-sm font-medium text-fg mb-1.5">Cuántos mostrar</span>
                        <div role="radiogroup" aria-labelledby="reco-cantidad" className="inline-flex rounded-lg bg-surface-2 p-1">
                          {CANTIDADES_RECO.map(n => (
                            <button
                              key={n}
                              type="button"
                              role="radio"
                              aria-checked={recoMax === n}
                              onClick={() => setRecoMax(n)}
                              className={`w-9 h-8 rounded-md font-mono text-sm transition-colors ${recoMax === n ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Bloque>

                </>
              )}

              <Bloque
                titulo="Código avanzado"
                ayuda="HTML, CSS y JavaScript quedan guardados acá abajo. Abrilo solo cuando quieras pegar código generado por ChatGPT."
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">Editor libre de páginas</p>
                    <p className="mt-1 text-[13px] text-fg-muted">Inicio, catálogo, categoría, ficha producto y checkout en un cuadro chico con scroll.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCodigoModal({ vista: vistaPreview === 'producto' || vistaPreview === 'catalogo' || vistaPreview === 'categoria' || vistaPreview === 'checkout' ? vistaPreview : 'inicio', parte: 'todo' })}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-surface border border-border text-sm font-semibold text-fg hover:border-border-strong"
                  >
                    <FileCode2 size={15} /> Editar código
                  </button>
                </div>
              </Bloque>
            </div>
          </div>
        </div>

        {/* Vista previa (escritorio ancho) */}
        <aside className="hidden xl:flex flex-1 min-w-0 border-l border-border bg-surface-2 flex-col min-h-0" aria-label="Vista previa">
          {vistaPrevia}
        </aside>
      </div>

      {/* Barra de acción: resumen + seguir, siempre a la vista */}
      <div className="shrink-0 border-t border-border bg-surface px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg truncate">
              Inventario de la landing · <span className="font-mono font-normal">{resumenProductos}</span>
            </p>
            {errorGuardado ? (
              <div className="text-xs text-danger">
                <p className="font-semibold">
                  No se pudo guardar: {errorGuardado.mensaje}
                  {errorGuardado.detalles?.length > 0 && (
                    <button type="button" onClick={() => setVerDetalleError(v => !v)} className="ml-2 underline font-normal">
                      {verDetalleError ? 'Ocultar detalle' : 'Ver por qué'}
                    </button>
                  )}
                </p>
                {verDetalleError && (
                  <ul className="mt-1 list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                    {errorGuardado.detalles.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                )}
              </div>
            ) : (
              <p className={`text-xs truncate ${error ? 'text-danger' : bloqueo ? 'text-warning' : 'text-fg-muted'}`}>
                {error || bloqueo || `${resumenOfertas} · ${resumenReco}.`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPreviewMovil(true)}
            className="xl:hidden inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg border border-border text-sm font-medium text-fg hover:border-border-strong"
          >
            <Eye size={15} /> Vista previa
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={guardando || !!bloqueo || subidasPendientes > 0}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-fg text-sm font-semibold transition-colors hover:bg-primary-hover disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {guardando && <Loader size={15} className="animate-spin" />}
            {disenoPendienteIA ? 'Generar landing con IA' : 'Guardar y armar el diseño'}
            {!guardando && <ArrowRight size={15} />}
          </button>
        </div>
      </div>

      {/* Vista previa (pantallas angostas): a pantalla completa */}
      {previewMovil && (
        <div className="xl:hidden fixed inset-0 z-40 bg-surface-2 flex flex-col" role="dialog" aria-modal="true" aria-label="Vista previa">
          <div className="flex justify-end px-3 pt-3">
            <button type="button" onClick={() => setPreviewMovil(false)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface border border-border text-sm font-medium text-fg">
              <X size={15} /> Cerrar vista previa
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">{vistaPrevia}</div>
        </div>
      )}

      {codigoModal && (
        <CodigoAvanzadoModal
          modal={codigoModal}
          onModal={setCodigoModal}
          codigos={codigos}
          tipo={tipo}
          onCambiar={onCambiarCodigo}
          onRestaurar={onRestaurarCodigo}
          onCerrar={() => setCodigoModal(null)}
        />
      )}

      {previewAmpliada && (
        <div className="fixed inset-0 z-50 bg-surface-2 flex flex-col" role="dialog" aria-modal="true" aria-label="Vista previa ampliada">
          <VistaPrevia {...propsVistaPrevia} ampliada onCerrar={() => setPreviewAmpliada(false)} />
        </div>
      )}

      {panelOfertas && (
        <PanelOfertas
          producto={panelOfertas.producto}
          estrategia={panelOfertas.estrategia || null}
          productos={seleccion.filter(i => i.tipo === 'producto')}
          enLanding={idsProductoEnLanding}
          onElegir={producto => setPanelOfertas(p => ({ ...p, producto }))}
          onCambiarProducto={() => setPanelOfertas(p => ({ ...p, producto: null }))}
          onCerrar={cerrarPanelOfertas}
          onComboCreado={comboCreado}
          permitirCombo={panelOfertas.modo === 'combo'}
          landingPreview={{ codigos, tienda, venta: ventaActual, productos: seleccion, ofertas: ofertasConImagen }}
        />
      )}
    </div>
  );
}

function dividirCodigoPegado(texto) {
  const fuente = String(texto || '');
  const salida = {};
  const bloques = /```(html|htm|xml|css|js|javascript)?[^\n]*\n([\s\S]*?)```/gi;
  let match;
  while ((match = bloques.exec(fuente))) {
    const lang = String(match[1] || '').toLowerCase();
    const cuerpo = match[2].replace(/\s+$/, '');
    if (['html', 'htm', 'xml', ''].includes(lang) && salida.html === undefined) salida.html = cuerpo;
    if (lang === 'css' && salida.css === undefined) salida.css = cuerpo;
    if (['js', 'javascript'].includes(lang) && salida.js === undefined) salida.js = cuerpo;
  }
  if (Object.keys(salida).length) return salida;

  let html = fuente.trim();
  const estilos = [];
  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    estilos.push(css.trim());
    return '';
  });
  const scripts = [];
  html = html.replace(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (_, js) => {
    scripts.push(js.trim());
    return '';
  });
  if (estilos.length) salida.css = estilos.join('\n\n');
  if (scripts.length) salida.js = scripts.join('\n\n');
  if (/<[a-z!][\s\S]*>/i.test(html)) salida.html = html.trim();
  return salida;
}

function CodigoAvanzadoModal({ modal, onModal, codigos, tipo, onCambiar, onRestaurar, onCerrar }) {
  const vista = VISTAS_CODIGO_TIENDA.find(v => v.key === modal?.vista) || VISTAS_CODIGO_TIENDA[0];
  const parte = modal?.parte || 'todo';
  const codigo = codigos?.[vista.key] || vista.base(tipo);
  const valor = codigo?.[parte] || '';
  const valorTodo = modal?.pegado ?? ['html', 'css', 'js']
    .filter(key => codigo?.[key])
    .map(key => `\`\`\`${key}\n${codigo[key]}\n\`\`\``)
    .join('\n\n');
  const cambiarTexto = texto => {
    if (parte === 'todo') {
      onModal({ ...modal, pegado: texto, parte: 'todo', vista: vista.key });
      const dividido = dividirCodigoPegado(texto);
      Object.entries(dividido).forEach(([key, value]) => onCambiar?.(vista.key, key, value));
      return;
    }
    onCambiar?.(vista.key, parte, texto);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3 py-6" role="dialog" aria-modal="true" aria-label="Editar código avanzado">
      <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-fg"><FileCode2 size={15} /> Código avanzado</p>
            <p className="mt-0.5 text-xs text-fg-muted truncate">Pegá HTML, CSS o JavaScript de ChatGPT y revisá la preview antes de guardar.</p>
          </div>
          <button type="button" onClick={onCerrar} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg" aria-label="Cerrar editor de código">
            <X size={15} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="border-b border-border bg-surface-2/60 p-3 md:border-b-0 md:border-r">
            <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
              {VISTAS_CODIGO_TIENDA.map(item => {
                const Icono = item.icono;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onModal({ vista: item.key, parte })}
                    className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${vista.key === item.key ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                  >
                    <Icono size={14} /> <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div role="tablist" aria-label="Parte del código" className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
                {PARTES_CODIGO.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={parte === key}
                    onClick={() => onModal({ vista: vista.key, parte: key })}
                    className={`h-8 rounded-md px-3 text-xs font-semibold ${parte === key ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onRestaurar?.(vista.key)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-fg-muted hover:text-fg"
              >
                <RefreshCw size={13} /> Base
              </button>
            </div>
            <textarea
              value={valor}
              onChange={e => onCambiar?.(vista.key, parte, e.target.value)}
              spellCheck={false}
              className="h-72 min-h-0 w-full resize-none overflow-auto rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs leading-relaxed text-fg outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
// Ancho real de una pantalla de escritorio: la vista previa de escritorio
// renderiza la landing a este ancho y la achica para que entre.
const ANCHO_ESCRITORIO = 1280;

/**
 * Tamaño de un elemento, al vuelo (para escalar la vista de escritorio).
 * Ref de callback y no useRef: el marco de escritorio aparece recién al
 * elegir "Escritorio", y un efecto de montaje ya no lo vería.
 */
function useTamano() {
  const observador = useRef(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const ref = useCallback((nodo) => {
    observador.current?.disconnect();
    observador.current = null;
    if (!nodo) return;
    const medir = () => setTam({ w: nodo.clientWidth, h: nodo.clientHeight });
    medir();
    if (typeof ResizeObserver !== 'undefined') {
      observador.current = new ResizeObserver(medir);
      observador.current.observe(nodo);
    }
    // Respaldo: al pasar de oculto (pantalla chica) a visible, no todos los
    // navegadores avisan por ResizeObserver y la vista quedaba en blanco.
    const alRedimensionar = () => medir();
    window.addEventListener('resize', alRedimensionar);
    const desconectar = observador.current?.disconnect.bind(observador.current);
    observador.current = { disconnect: () => { desconectar?.(); window.removeEventListener('resize', alRedimensionar); } };
  }, []);
  useEffect(() => () => observador.current?.disconnect(), []);
  return [ref, tam];
}

/**
 * La landing con la selección y las ofertas reales, en celular o en
 * escritorio. Usa el mismo iframe y el mismo runtime que la landing
 * publicada. Escritorio = la página a 1280px de ancho, achicada para entrar
 * en el lugar disponible (como se ve en una notebook, en miniatura).
 */
function VistaPrevia({
  vista, onVista, productos, productoFicha, onProducto, codigo, datos, resaltado, aviso, inicioEsBase, onNavegar, onComprar, onCarrito,
  dispositivo, onDispositivo, onAmpliar, ampliada, onCerrar, disenoPendienteIA = false,
}) {
  const productosFicha = productos.filter(p => p.tipo === 'producto' || p.tipo === 'combo');
  const [marcoRef, tam] = useTamano();
  const escritorio = dispositivo === 'escritorio';
  const anchoLienzo = ANCHO_ESCRITORIO;
  const escala = escritorio && tam.w ? Math.min(1, tam.w / anchoLienzo) : 1;

  const iframe = (
    <CodigoPreview
      key={`${vista}-${dispositivo}`}
      codigo={codigo}
      titulo="Vista previa"
      datos={datos}
      resaltar={resaltado}
      onNavegar={onNavegar}
      onCheckout={onComprar}
      onCarrito={onCarrito}
    />
  );

  return (
    <>
      <div className={`px-4 pt-4 pb-3 space-y-3 shrink-0 ${ampliada ? 'border-b border-border bg-surface' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-fg">Vista previa</p>
          <div className="flex items-center gap-1.5">
            <div role="radiogroup" aria-label="Dispositivo" className="flex rounded-lg bg-surface p-0.5 border border-border">
              {[['movil', 'Celular', Smartphone], ['escritorio', 'Escritorio', Monitor]].map(([k, label, Icono]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={dispositivo === k}
                  onClick={() => onDispositivo(k)}
                  title={label}
                  className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition-colors ${dispositivo === k ? 'bg-surface-2 text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                >
                  <Icono size={13} /> <span className={ampliada ? '' : 'sr-only xl:not-sr-only'}>{label}</span>
                </button>
              ))}
            </div>
            {ampliada ? (
              <button type="button" onClick={onCerrar} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-fg text-xs font-semibold hover:bg-primary-hover">
                <X size={14} /> Cerrar
              </button>
            ) : (
              <button type="button" onClick={onAmpliar} title="Ver más grande" aria-label="Ampliar vista previa" className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-surface text-fg-muted hover:text-fg">
                <Maximize2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div className={`flex flex-col ${ampliada ? 'sm:flex-row' : ''} gap-2`}>
          <div role="tablist" aria-label="Pantalla" className={`flex rounded-lg bg-surface p-1 border border-border ${ampliada ? 'sm:w-80' : ''}`}>
            {VISTAS_PREVIEW_TIENDA.map(([k, label, Icono]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={vista === k}
                onClick={() => onVista(k)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[13px] font-medium transition-colors ${vista === k ? 'bg-surface-2 text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
              >
                <Icono size={14} /> {label}
              </button>
            ))}
          </div>
          {vista === 'producto' && productosFicha.length > 0 && (
            <select
              value={productoFicha ? contentIdPanel(productoFicha) : ''}
              onChange={e => onProducto(e.target.value)}
              aria-label="Producto de la ficha"
              className={`h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-fg ${ampliada ? 'sm:w-96' : 'w-full'}`}
            >
              {productosFicha.map(p => <option key={contentIdPanel(p)} value={contentIdPanel(p)}>{p.nombre}</option>)}
            </select>
          )}
        </div>
        <p className="flex items-start gap-1.5 text-[11px] text-fg-muted min-h-[16px]">
          {aviso
            ? <><MousePointerClick size={12} className="mt-px shrink-0 text-accent-text" /> {aviso}</>
            : disenoPendienteIA
              ? 'Vista previa comercial. Al guardar, la IA genera el HTML final con esta venta.'
              : (vista === 'inicio' && !inicioEsBase ? 'Mostrando tu diseño actual.' : 'Diseño base: en el paso 2 lo cambiás a tu gusto.')}
        </p>
      </div>

      <div className={`flex-1 min-h-0 flex justify-center ${ampliada ? 'p-4 md:p-6' : 'px-4 pb-4'}`}>
        {productos.length === 0 ? (
          <div className="w-full max-w-[390px] rounded-[28px] border border-dashed border-border-strong flex items-center justify-center p-8 text-center text-sm text-fg-muted">
            Elegí productos y los vas a ver acá.
          </div>
        ) : escritorio ? (
          // Ventana de navegador: 1280px como base, centrada y escalada.
          // No se estira a paneles más anchos porque muchas landings tienen
          // layout de escritorio con ancho máximo; forzarlas dejaba una
          // plancha blanca a la derecha que parecía código roto.
          <div className="w-full max-w-[1280px] h-full flex flex-col rounded-xl border border-border-strong overflow-hidden bg-white shadow-xl">
            <div className="h-7 shrink-0 flex items-center gap-1.5 px-3 bg-surface border-b border-border" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
            </div>
            <div ref={marcoRef} className="flex-1 min-h-0 relative overflow-hidden">
              {tam.w > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: anchoLienzo,
                    height: tam.h / escala,
                    transform: `scale(${escala})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {iframe}
                </div>
              )}
            </div>
          </div>
        ) : (
          <PhonePreviewShell>
            {iframe}
          </PhonePreviewShell>
        )}
      </div>
    </>
  );
}

/** "Ofrece: …" — qué se suma al aceptar la oferta, dicho en criollo. */
function queOfrece(oferta) {
  const comps = oferta.componentes || [];
  if (oferta.tipo_contenido === 'pack') {
    const unidades = comps[0]?.cantidad;
    return unidades ? `${unidades} unidades del mismo producto` : 'más unidades del mismo producto';
  }
  const nombres = comps
    .filter(c => Number(c.producto_id) !== Number(oferta.producto_ancla_id))
    .map(c => `${c.cantidad > 1 ? `${c.cantidad} × ` : ''}${c.producto?.nombre || 'otro producto'}`);
  return nombres.length ? nombres.join(' + ') : 'sin productos cargados';
}

// Referencias de precio del order bump (ver la investigación citada en la
// respuesta al comercio): SamCart recomienda que cueste entre el 20% y el
// 40% del producto principal, con el precio anterior tachado.
const BUMP_MIN = 0.2;
const BUMP_MAX = 0.4;

/** "Cuesta el 30% de este producto" + si está en la franja que más se toma. */
/**
 * Por qué una oferta marcada NO va a aparecer en la landing, o null si se
 * ve. Son las mismas reglas que aplican la landing publicada (backend:
 * vigencia; frontend: ofertaCheckoutPublicable) — antes la oferta
 * desaparecía sin ningún aviso.
 */
export function motivoOfertaOculta(oferta, hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' })) {
  const desde = oferta.fecha_inicio ? String(oferta.fecha_inicio).slice(0, 10) : null;
  const hasta = oferta.fecha_fin ? String(oferta.fecha_fin).slice(0, 10) : null;
  if (desde && hoy < desde) return `Empieza el ${desde.split('-').reverse().join('/')}: hasta entonces no se muestra.`;
  if (hasta && hoy > hasta) return `Venció el ${hasta.split('-').reverse().join('/')}: cambiá la fecha de fin para que vuelva a verse.`;
  if (!(oferta.componentes || []).length) return 'No tiene producto para sumar: elegí qué producto ofrece.';
  const normal = Number(oferta.precio_normal) || 0;
  const promo = oferta.precio_order_bump != null ? Number(oferta.precio_order_bump) : null;
  const final = promo ?? normal;
  if (!(final > 0)) return 'No tiene precio: cargá el precio con la oferta.';
  if (normal > 0 && final > normal) return 'El precio con la oferta es mayor que el normal: bajalo para que se muestre.';
  return null;
}

function CampoTexto({ label, value, onChange, placeholder, maxLength = 120, multiline = false }) {
  const Elemento = multiline ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="block text-xs font-medium text-fg-muted mb-1">{label}</span>
      <Elemento
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={multiline ? 3 : undefined}
        className={`w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary ${multiline ? 'py-2 resize-vertical' : 'h-9'}`}
      />
    </label>
  );
}

function BotonesOrden({ primero, ultimo, onSubir, onBajar, onQuitar, labelQuitar = 'Quitar' }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={onSubir} disabled={primero} className="h-8 w-8 rounded-lg border border-border text-fg-muted hover:text-fg disabled:opacity-35" aria-label="Subir">
        <ChevronUp size={15} className="mx-auto" />
      </button>
      <button type="button" onClick={onBajar} disabled={ultimo} className="h-8 w-8 rounded-lg border border-border text-fg-muted hover:text-fg disabled:opacity-35" aria-label="Bajar">
        <ChevronDown size={15} className="mx-auto" />
      </button>
      <button type="button" onClick={onQuitar} className="h-8 px-2.5 rounded-lg border border-border text-xs font-medium text-danger hover:bg-danger/[0.06]">
        {labelQuitar}
      </button>
    </div>
  );
}

function EditorMedioBanner({ banner, onCambiar, onSubir }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const medio = banner.imagen || '';
  const tipo = banner.tipo_medio || inferirTipoMedio(medio);
  const esVideo = tipo === 'video';
  const esGif = tipo === 'gif';
  const accept = esVideo ? 'video/mp4,video/webm,video/ogg' : esGif ? 'image/gif' : 'image/jpeg,image/png,image/webp';
  const ayudaMedio = esVideo
    ? 'Subí un MP4/WEBM liviano o pegá una URL directa al video.'
    : esGif
      ? 'Subí un GIF optimizado o pegá una URL pública.'
      : 'Subí JPG, PNG o WEBP, o pegá una URL pública.';
  const uploadLabel = subiendo ? 'Subiendo...' : esVideo ? 'Subir video' : esGif ? 'Subir GIF' : 'Subir imagen';

  async function alElegir(event) {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo || !onSubir) return;
    setError('');
    setSubiendo(true);
    try {
      const url = await onSubir(archivo);
      onCambiar({ imagen: url, tipo_medio: tipoMedioDeArchivo(archivo) });
    } catch {
      setError('No se pudo subir el archivo. Probá con JPG, PNG, WEBP, GIF, MP4 o WEBM.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="sm:col-span-2 rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-fg">Medio del banner</p>
          <p className="text-[11px] text-fg-muted">{ayudaMedio}</p>
        </div>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-fg hover:border-border-strong">
          {subiendo ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploadLabel}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={!onSubir || subiendo}
            onChange={alElegir}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
        <label className="block">
          <span className="block text-xs font-medium text-fg-muted mb-1">Tipo</span>
          <select
            value={tipo}
            onChange={e => onCambiar({ tipo_medio: e.target.value })}
            className="w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
          >
            <option value="imagen">Imagen</option>
            <option value="gif">GIF</option>
            <option value="video">Video</option>
          </select>
        </label>
        <CampoTexto
          label="URL del medio"
          value={medio}
          onChange={v => onCambiar({ imagen: v, tipo_medio: inferirTipoMedio(v) || tipo })}
          placeholder={tipo === 'video' ? 'https://.../banner.mp4 o https://.../banner.webm' : 'https://... o /uploads/banner.gif'}
          maxLength={320}
        />
      </div>
      <div className="mt-3 rounded-lg bg-primary/[0.06] px-3 py-2 text-[11px] leading-relaxed text-fg-muted">
        Tamaño recomendado: <strong className="text-fg">1660 × 720 px</strong>. Mantené el texto importante centrado y evitá ponerlo muy cerca de los bordes, porque en móvil puede recortarse.
      </div>
      {medio && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface-2">
          {tipo === 'video'
            ? <video src={getMediaUrl(medio)} className="h-28 w-full object-cover" muted playsInline loop controls />
            : <img src={getMediaUrl(medio)} alt="" className="h-28 w-full object-cover" />}
        </div>
      )}
      {!onSubir && <p className="mt-2 text-[11px] text-fg-muted">La subida directa no está disponible en esta vista; pegá una URL pública.</p>}
      {error && <p className="mt-2 text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
}

function SelectorEnlaceBanner({ value, onChange, categorias = [] }) {
  const esAtajo = ENLACES_BANNER_INICIO.some(([href]) => href === value);
  const categoriasLista = categorias.map(([cat]) => cat).filter(Boolean);
  const categoriaActual = categoriasLista.find(cat => value === `/categoria/${slugCategoria(cat)}`) || '';
  const esCategoria = !!categoriaActual;
  return (
    <div className="sm:col-span-2 rounded-xl border border-border bg-surface p-3">
      <p className="mb-2 text-xs font-semibold text-fg">Destino del botón</p>
      <div className="flex flex-wrap gap-2">
        {ENLACES_BANNER_INICIO.map(([href, label]) => (
          <button
            key={href}
            type="button"
            onClick={() => onChange(href)}
            className={`h-8 rounded-lg border px-3 text-xs font-semibold ${value === href ? 'border-primary bg-primary text-primary-fg' : 'border-border text-fg-muted hover:text-fg'}`}
          >
            {label}
          </button>
        ))}
        {categoriasLista.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(`/categoria/${slugCategoria(categoriaActual || categoriasLista[0])}`)}
            className={`h-8 rounded-lg border px-3 text-xs font-semibold ${esCategoria ? 'border-primary bg-primary text-primary-fg' : 'border-border text-fg-muted hover:text-fg'}`}
          >
            Categoría específica
          </button>
        )}
        <button
          type="button"
          onClick={() => { if (esAtajo || esCategoria) onChange(''); }}
          className={`h-8 rounded-lg border px-3 text-xs font-semibold ${!esAtajo && !esCategoria ? 'border-primary bg-primary text-primary-fg' : 'border-border text-fg-muted hover:text-fg'}`}
        >
          Personalizado
        </button>
      </div>
      {esCategoria && categoriasLista.length > 0 && (
        <select
          value={categoriaActual}
          onChange={e => onChange(`/categoria/${slugCategoria(e.target.value)}`)}
          className="mt-2 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
        >
          {categoriasLista.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      )}
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Ej: #ofertas, /catalogo o https://..."
        className="mt-2 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
      />
      <p className="mt-1 text-[11px] text-fg-muted">Los destinos con # llevan a una sección de esta misma landing.</p>
    </div>
  );
}

function EditorBannersInicio({ banners, categorias = [], onAgregar, onCambiar, onQuitar, onMover, onSubir }) {
  const [colapsados, setColapsados] = useState({});
  function alternar(id) {
    setColapsados(prev => ({ ...prev, [id]: !prev[id] }));
  }
  return (
    <div className="space-y-3">
      {banners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center">
          <p className="text-sm font-semibold text-fg">Todavía no hay banners promocionales.</p>
          <p className="mt-1 text-sm text-fg-muted">Agregá uno para campañas, descuentos, envío gratis o colecciones.</p>
        </div>
      ) : banners.map((banner, idx) => {
        const colapsado = !!colapsados[banner.id];
        const tituloResumen = banner.titulo || banner.etiqueta || `Banner ${idx + 1}`;
        const medioResumen = banner.tipo_medio === 'video' ? 'Video' : banner.tipo_medio === 'gif' ? 'GIF' : 'Imagen';
        return (
        <div key={banner.id} className="rounded-xl border border-border bg-surface-2/40 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <label className="flex items-center gap-2 text-sm font-semibold text-fg">
                <input type="checkbox" checked={banner.activo !== false} onChange={e => onCambiar(banner.id, { activo: e.target.checked })} className="accent-primary" />
                Banner {idx + 1}
              </label>
              {colapsado && (
                <p className="mt-1 truncate text-xs text-fg-muted">
                  {tituloResumen} · {medioResumen}{banner.cta_texto ? ` · ${banner.cta_texto}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => alternar(banner.id)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-fg-muted hover:text-fg"
                aria-expanded={!colapsado}
              >
                {colapsado ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
                {colapsado ? 'Agrandar' : 'Minimizar'}
              </button>
              <BotonesOrden
                primero={idx === 0}
                ultimo={idx === banners.length - 1}
                onSubir={() => onMover(banner.id, -1)}
                onBajar={() => onMover(banner.id, 1)}
                onQuitar={() => onQuitar(banner.id)}
              />
            </div>
          </div>
          {!colapsado && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CampoTexto label="Etiqueta" value={banner.etiqueta} onChange={v => onCambiar(banner.id, { etiqueta: v })} placeholder="Semana de cocina" maxLength={40} />
              <CampoTexto label="CTA" value={banner.cta_texto} onChange={v => onCambiar(banner.id, { cta_texto: v })} placeholder="Ver ofertas" maxLength={40} />
              <div className="sm:col-span-2"><CampoTexto label="Título" value={banner.titulo} onChange={v => onCambiar(banner.id, { titulo: v })} placeholder="Renová tu cocina" maxLength={90} /></div>
              <div className="sm:col-span-2"><CampoTexto label="Subtítulo" value={banner.subtitulo} onChange={v => onCambiar(banner.id, { subtitulo: v })} placeholder="Productos seleccionados con precios especiales" maxLength={160} /></div>
              <SelectorEnlaceBanner value={banner.enlace} categorias={categorias} onChange={v => onCambiar(banner.id, { enlace: v })} />
              <EditorMedioBanner banner={banner} onCambiar={cambio => onCambiar(banner.id, cambio)} onSubir={onSubir} />
            </div>
          )}
        </div>
        );
      })}
      <button type="button" onClick={onAgregar} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover">
        <Plus size={15} /> Agregar banner
      </button>
    </div>
  );
}

// Lista única de bloques del body del Inicio: orden + mostrar/ocultar. Cada
// bloque configurable (anuncios, productos por categoría, confianza, marca)
// se expande para mostrar su propio panel (`paneles[tipo]`); el resto
// (categorías, destacados, colecciones…) solo se puede prender/apagar y
// reordenar — su contenido se configura en el bloque de abajo que ya
// existía para eso (Categorías visuales, Productos destacados, etc.).
// Fila de un bloque — con o sin control de orden/visibilidad (el Menú no
// tiene ninguno de los dos: vive fijo en el header).
function FilaBloqueInicio({ numero, etiqueta, visible, primero, ultimo, onMover, onAlternar, panel, abierto, onAbrir }) {
  const tienePanel = !!panel;
  const puedeMoverse = !!onMover;
  return (
    <div className={`rounded-xl border ${visible === false ? 'border-border bg-surface-2/40 opacity-70' : 'border-border'}`}>
      <div className="flex items-center gap-2 p-2.5">
        <span className="w-5 shrink-0 text-center text-xs font-mono text-fg-muted">{numero}</span>
        <button
          type="button"
          onClick={() => tienePanel && onAbrir(abierto ? null : numero)}
          disabled={!tienePanel}
          className={`min-w-0 flex-1 text-left text-sm font-medium text-fg ${tienePanel ? 'hover:underline' : ''}`}
        >
          {etiqueta}
        </button>
        {onAlternar && (
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted">
            <input type="checkbox" checked={visible} onChange={onAlternar} className="accent-primary" />
            Mostrar
          </label>
        )}
        <div className="flex items-center gap-1">
          {puedeMoverse && (
            <>
              <button type="button" onClick={() => onMover(-1)} disabled={primero} className="h-8 w-8 rounded-lg border border-border text-fg-muted hover:text-fg disabled:opacity-35" aria-label="Subir bloque">
                <ChevronUp size={14} className="mx-auto" />
              </button>
              <button type="button" onClick={() => onMover(1)} disabled={ultimo} className="h-8 w-8 rounded-lg border border-border text-fg-muted hover:text-fg disabled:opacity-35" aria-label="Bajar bloque">
                <ChevronDown size={14} className="mx-auto" />
              </button>
            </>
          )}
          {tienePanel && (
            <button type="button" onClick={() => onAbrir(abierto ? null : numero)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs font-semibold text-fg-muted hover:text-fg" aria-expanded={abierto}>
              {abierto ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
            </button>
          )}
        </div>
      </div>
      {abierto && tienePanel && <div className="border-t border-border p-3.5">{panel}</div>}
    </div>
  );
}

// Todo lo que afecta al Inicio se edita DESDE ACÁ, por bloque — nada
// duplicado en paneles sueltos más abajo. El Menú entra como bloque 2, fijo
// (vive en el header: no se reordena ni se oculta), el resto sale de
// `bloques` (venta.inicio.bloques) con su orden y su "Mostrar".
function EditorBloquesInicio({ bloques, onMover, onAlternar, paneles = {}, menuPanel }) {
  const [abierto, setAbierto] = useState(null);
  const filas = [bloques[0], { tipo: '__menu__' }, ...bloques.slice(1)];
  return (
    <div className="space-y-2">
      {filas.map((b, idx) => {
        const esMenu = b.tipo === '__menu__';
        const idxReal = esMenu ? -1 : (idx === 0 ? 0 : idx - 1);
        return (
          <FilaBloqueInicio
            key={b.tipo}
            numero={idx + 1}
            etiqueta={esMenu ? 'Menú principal' : (ETIQUETAS_BLOQUE_INICIO[b.tipo] || b.tipo)}
            visible={esMenu ? undefined : b.visible}
            primero={idxReal === 0}
            ultimo={idxReal === bloques.length - 1}
            onMover={esMenu ? null : dir => onMover(b.tipo, dir)}
            onAlternar={esMenu ? null : () => onAlternar(b.tipo)}
            panel={esMenu ? menuPanel : paneles[b.tipo]}
            abierto={abierto === idx + 1}
            onAbrir={setAbierto}
          />
        );
      })}
    </div>
  );
}

function EditorAnuncios({ anuncios, onCambiar, onAgregar, onQuitar }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-fg-muted">La franja que se mueve arriba del todo. Si no agregás ninguno, se muestran unos de ejemplo. Sin elegir ícono, se van ciclando unos genéricos.</p>
      {(anuncios || []).map((it, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select
            value={it.icono || ''}
            onChange={e => onCambiar(idx, { icono: e.target.value })}
            aria-label="Ícono del anuncio"
            className="h-9 w-32 shrink-0 rounded-lg border border-border bg-surface-2 px-2 text-sm text-fg outline-none focus:border-primary"
          >
            <option value="">Automático</option>
            {ICONOS_CONFIANZA.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <CampoTexto value={it.texto} onChange={v => onCambiar(idx, { texto: v })} placeholder="Envío a todo Paraguay" maxLength={80} />
          <button type="button" onClick={() => onQuitar(idx)} className="h-9 px-2.5 rounded-lg border border-border text-xs font-medium text-danger hover:bg-danger/[0.06]">Quitar</button>
        </div>
      ))}
      {(anuncios || []).length < 8 && (
        <button type="button" onClick={onAgregar} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border text-sm font-semibold text-fg hover:border-border-strong">
          <Plus size={15} /> Agregar anuncio
        </button>
      )}
    </div>
  );
}

const ICONOS_CONFIANZA = [
  ['shield', 'Escudo'], ['card', 'Tarjeta'], ['truck', 'Envío'], ['rotate', 'Cambio'], ['badge', 'Garantía'],
  ['heart', 'Cuidado'], ['leaf', 'Natural'], ['headphones', 'Soporte'], ['package', 'Paquete'], ['clock', 'Tiempo'],
  ['gift', 'Regalo'], ['star', 'Destacado'], ['lock', 'Seguridad'], ['whatsapp', 'WhatsApp'], ['mail', 'Email'],
  ['location', 'Ubicación'], ['cash', 'Efectivo'],
];
function EditorConfianzaInicio({ items, onCambiar }) {
  const slots = Array.from({ length: 3 }, (_, i) => items?.[i] || CONFIANZA_INICIO_DEFAULT[i] || { icono: '', titulo: '', texto: '' });
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">Siempre 3 tarjetas. Ya vienen cargadas: podés cambiar el texto y escribir el ícono libremente, como emoji o nombre de ícono.</p>
      {slots.map((it, idx) => (
        <div key={idx} className="grid grid-cols-1 sm:grid-cols-[110px_1fr_1fr] gap-2 rounded-lg border border-border p-2.5">
          <CampoTexto label="Ícono" value={it.icono} onChange={v => onCambiar(idx, { icono: v })} placeholder="🚚 o fa-truck" maxLength={40} />
          <CampoTexto label="Título" value={it.titulo} onChange={v => onCambiar(idx, { titulo: v })} placeholder="Opciones de pago" maxLength={60} />
          <CampoTexto label="Texto" value={it.texto} onChange={v => onCambiar(idx, { texto: v })} placeholder="Consultá los medios disponibles" maxLength={120} />
        </div>
      ))}
    </div>
  );
}

function EditorMarcaInicio({ marca, onCambiar, onCambiarBadge, onAgregarBadge, onQuitarBadge, onCambiarMedio, onSubir }) {
  const medio = marca.medios?.[0] || null;
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">Se muestra sola apenas cargues un título, un texto o una foto. Sin nada de eso, queda oculta aunque "Mostrar" esté tildado arriba.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CampoTexto label="Rótulo (kicker)" value={marca.kicker} onChange={v => onCambiar({ kicker: v })} placeholder="CONOCÉ NUESTRA MARCA" maxLength={40} />
        <CampoTexto label="Título" value={marca.titulo} onChange={v => onCambiar({ titulo: v })} placeholder="Lo cotidiano puede ser más simple." maxLength={100} />
        <div className="sm:col-span-2"><CampoTexto label="Texto" value={marca.texto} onChange={v => onCambiar({ texto: v })} placeholder="Contá qué hace distinta a tu marca." maxLength={600} multiline /></div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">Badges (chips cortos)</p>
        <div className="space-y-2">
          {(marca.badges || []).map((texto, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CampoTexto value={texto} onChange={v => onCambiarBadge(idx, v)} placeholder="Simplicidad" maxLength={30} />
              <button type="button" onClick={() => onQuitarBadge(idx)} className="h-9 px-2.5 rounded-lg border border-border text-xs font-medium text-danger hover:bg-danger/[0.06]">Quitar</button>
            </div>
          ))}
          {(marca.badges || []).length < 6 && (
            <button type="button" onClick={onAgregarBadge} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg hover:border-border-strong">
              <Plus size={13} /> Agregar badge
            </button>
          )}
        </div>
      </div>
      <EditorMedioBanner
        banner={{ imagen: medio?.url || '', tipo_medio: medio?.tipo || 'imagen' }}
        onCambiar={cambio => onCambiarMedio({ url: cambio.imagen ?? (medio?.url || ''), tipo: cambio.tipo_medio ?? (medio?.tipo || 'imagen') })}
        onSubir={onSubir}
      />
    </div>
  );
}

function EditorProductosCategoria({ config, candidatos, onCambiar, onAlternarItem }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">Se muestra sola apenas elijas al menos un producto abajo. Sin productos, queda oculta aunque "Mostrar" esté tildado arriba.</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_110px] gap-3">
        <CampoTexto label="Rótulo (kicker)" value={config.kicker} onChange={v => onCambiar({ kicker: v })} placeholder="PRODUCTOS" maxLength={40} />
        <CampoTexto label="Título" value={config.titulo} onChange={v => onCambiar({ titulo: v })} placeholder="Productos seleccionados" maxLength={100} />
        <label className="block">
          <span className="block text-xs font-medium text-fg-muted mb-1">Cantidad</span>
          <input
            type="number" min="1" max="48" value={config.limite}
            onChange={e => onCambiar({ limite: Math.max(1, Math.min(48, Number(e.target.value) || 8)) })}
            className="w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
          />
        </label>
      </div>
      <CampoTexto label="Subtítulo" value={config.subtitulo} onChange={v => onCambiar({ subtitulo: v })} placeholder="Explorá nuestra selección" maxLength={160} />
      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">Elegí qué productos entran (se agrupan solos por categoría)</p>
        {candidatos.length === 0 ? (
          <p className="text-sm text-fg-muted">Primero elegí los productos de la landing.</p>
        ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {candidatos.map(i => {
                  const elegido = (config.items || []).includes(i.content_id);
                  const imagen = getMediaUrl(i.imagen);
                  return (
                    <button
                      key={i.content_id}
                      type="button"
                      aria-pressed={elegido}
                      onClick={() => onAlternarItem(i.content_id)}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${elegido ? 'border-accent bg-accent/[0.08]' : 'border-border hover:border-border-strong hover:bg-surface-2'}`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                        {imagen ? <img src={imagen} alt="" className="h-full w-full object-contain" /> : <ShoppingBag size={16} className="text-fg-muted" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{i.nombre}</span>
                        <span className="block truncate text-xs text-fg-muted">{i.categoria || 'Sin categoría'}</span>
                      </span>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${elegido ? 'border-accent bg-accent text-accent-fg' : 'border-border'}`}>
                        {elegido && <Check size={13} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
    </div>
  );
}

function EditorCategoriasInicio({ categorias, seleccionadas, onCambiar }) {
  const seleccion = new Set(seleccionadas || []);
  function alternar(cat) {
    const siguiente = new Set(seleccion);
    if (siguiente.has(cat)) siguiente.delete(cat); else siguiente.add(cat);
    onCambiar(Array.from(siguiente));
  }
  if (!categorias.length) return <p className="text-sm text-fg-muted">No hay categorías en los productos seleccionados.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-fg-muted">Si no marcás ninguna, se muestran las primeras categorías detectadas automáticamente.</p>
      <div className="flex flex-wrap gap-2">
        {categorias.map(([cat, count]) => (
          <button
            key={cat}
            type="button"
            aria-pressed={seleccion.has(cat)}
            onClick={() => alternar(cat)}
            className={`h-8 rounded-full border px-3 text-xs font-medium ${seleccion.has(cat) ? 'border-primary bg-primary text-primary-fg' : 'border-border text-fg-muted hover:text-fg'}`}
          >
            {cat} · {count}
          </button>
        ))}
      </div>
    </div>
  );
}

function EditorMenuPrincipal({ items, categorias = [], onAgregar, onCambiar, onQuitar, onMover }) {
  const categoriasLista = categorias.map(([cat]) => cat).filter(Boolean);
  const destinoDe = item => {
    if (categoriasLista.some(cat => item.destino === `/categoria/${slugCategoria(cat)}`)) return 'categoria';
    return DESTINOS_MENU_PRINCIPAL.some(([value]) => value === item.destino) ? item.destino : 'personalizado';
  };
  const cambiarDestino = (item, destino) => {
    if (destino === 'categoria') {
      onCambiar(item.id, { destino: `/categoria/${slugCategoria(categoriasLista[0] || '')}` });
      return;
    }
    onCambiar(item.id, { destino });
  };
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {(items || []).map((item, idx) => {
          const tipoDestino = destinoDe(item);
          const categoriaActual = categoriasLista.find(cat => item.destino === `/categoria/${slugCategoria(cat)}`) || categoriasLista[0] || '';
          return (
            <div key={item.id} className="rounded-xl border border-border bg-surface-2/50 p-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.visible !== false}
                  onClick={() => onCambiar(item.id, { visible: item.visible === false })}
                  className={`mt-1 relative shrink-0 w-10 h-5 rounded-full transition-colors ${item.visible !== false ? 'bg-success' : 'bg-border-strong'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${item.visible !== false ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
                <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
                  <CampoTexto label="Texto" value={item.texto} onChange={v => onCambiar(item.id, { texto: v })} placeholder="Productos" maxLength={32} />
                  <label className="block">
                    <span className="block text-xs font-medium text-fg-muted mb-1">Destino</span>
                    <select
                      value={tipoDestino}
                      onChange={e => cambiarDestino(item, e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
                    >
                      {DESTINOS_MENU_PRINCIPAL.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                      {categoriasLista.length > 0 && <option value="categoria">Categoría específica</option>}
                    </select>
                  </label>
                  {tipoDestino === 'categoria' && (
                    <label className="block md:col-span-2">
                      <span className="block text-xs font-medium text-fg-muted mb-1">Categoría</span>
                      <select
                        value={categoriaActual}
                        onChange={e => onCambiar(item.id, { destino: `/categoria/${slugCategoria(e.target.value)}` })}
                        className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
                      >
                        {categoriasLista.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </label>
                  )}
                  {tipoDestino === 'personalizado' && (
                    <CampoTexto label="URL o sección" value={item.destino} onChange={v => onCambiar(item.id, { destino: v })} placeholder="#mi-seccion o https://..." maxLength={120} />
                  )}
                </div>
                <BotonesOrden
                  primero={idx === 0}
                  ultimo={idx === items.length - 1}
                  onSubir={() => onMover(item.id, -1)}
                  onBajar={() => onMover(item.id, 1)}
                  onQuitar={() => onQuitar(item.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={onAgregar} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
        <Plus size={16} /> Agregar link
      </button>
    </div>
  );
}

function EditorProductosDestacados({ candidatosDestacados, destacadosValidos, seleccionLength, onAlternar, onVer }) {
  if (candidatosDestacados.length === 0) {
    return <p className="text-sm text-fg-muted">Primero elegí los productos de la landing.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/60 px-3.5 py-2.5 text-[13px] text-fg-muted">
        <Check size={15} className="mt-0.5 shrink-0 text-accent-text" />
        <p>
          Marcá hasta {MAX_DESTACADOS}. Ahora hay {destacadosValidos.length || Math.min(4, seleccionLength)} producto{(destacadosValidos.length || Math.min(4, seleccionLength)) === 1 ? '' : 's'} en portada.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {candidatosDestacados.map(i => {
          const elegido = destacadosValidos.includes(i.content_id);
          const imagen = getMediaUrl(i.imagen);
          return (
            <button
              key={i.content_id}
              type="button"
              aria-pressed={elegido}
              onClick={() => {
                onAlternar(i.content_id);
                onVer();
              }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${elegido ? 'border-accent bg-accent/[0.08]' : 'border-border hover:border-border-strong hover:bg-surface-2'}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                {imagen ? <img src={imagen} alt="" className="h-full w-full object-contain" /> : <ShoppingBag size={16} className="text-fg-muted" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{i.nombre}</span>
                <span className="block truncate text-xs text-fg-muted">{i.categoria || 'Sin categoría'}</span>
              </span>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${elegido ? 'border-accent bg-accent text-accent-fg' : 'border-border'}`}>
                {elegido && <Check size={13} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditorPromosCatalogo({
  productos,
  productoEditando,
  ofertasSeleccionadas,
  anclas,
  ofertaFinAt,
  ofertaTitulo,
  ofertaTexto,
  ofertaCta,
  onEditar,
  onAncla,
  onCambiar,
  onAlternarOferta,
  onQuitarOferta,
  onOfertaFinAt,
  onOfertaTitulo,
  onOfertaTexto,
  onOfertaCta,
}) {
  if (!productos.length) {
    return <p className="text-sm text-fg-muted">Primero elegí productos para la landing o usá una regla de catálogo.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {productos.slice(0, 24).map(item => {
          const contentId = item.content_id || contentIdPanel(item);
          const precio = Number(precioDeVenta(item)) || Number(precioPanel(item)) || 0;
          const ancla = Number(item.precio_ancla ?? item.precio_tachado) || 0;
          const descuento = ancla > precio && precio > 0 ? Math.round((1 - precio / ancla) * 100) : 0;
          const editando = productoEditando?.content_id === contentId;
          const enOferta = ofertasSeleccionadas.includes(contentId);
          return (
            <React.Fragment key={contentId}>
              <div className={`rounded-xl border p-3 ${editando ? 'border-primary bg-primary/[0.05]' : 'border-border bg-surface-2/40'}`}>
                <button type="button" onClick={() => onEditar(contentId)} className="flex w-full items-center gap-3 text-left">
                  <Miniatura item={item} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{item.titulo_comercial || item.nombre}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-fg">{formatearGs(precio) || 'Sin precio'}</span>
                      {ancla > precio && <span className="font-mono text-fg-muted line-through">{formatearGs(ancla)}</span>}
                      {descuento > 0 && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">-{descuento}%</span>}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-fg-muted">{item.categoria || 'Sin categoría'}</span>
                  </span>
                </button>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg">
                    <span>Usar en oferta con fecha de fin</span>
                    <input
                      type="checkbox"
                      checked={enOferta}
                      onChange={e => (e.target.checked ? onAlternarOferta(contentId) : onQuitarOferta(contentId))}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => onEditar(contentId)}
                    className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors ${editando ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg hover:border-border-strong'}`}
                  >
                    {editando ? 'Editando promo' : 'Editar precio, descuento y badges'}
                  </button>
                </div>
              </div>
              {editando && (
                <div className="md:col-span-2">
                  <EditorPromoCatalogoProducto
                    item={productoEditando}
                    ancla={anclas[claveItem(productoEditando)] ?? ''}
                    ofertaActiva={enOferta}
                    ofertaFinAt={ofertaFinAt}
                    ofertaTitulo={ofertaTitulo}
                    ofertaTexto={ofertaTexto}
                    ofertaCta={ofertaCta}
                    onAncla={v => onAncla(productoEditando, v)}
                    onCambiar={(campo, valor) => onCambiar(productoEditando, campo, valor)}
                    onAlternarOferta={() => (enOferta ? onQuitarOferta(contentId) : onAlternarOferta(contentId))}
                    onOfertaFinAt={onOfertaFinAt}
                    onOfertaTitulo={onOfertaTitulo}
                    onOfertaTexto={onOfertaTexto}
                    onOfertaCta={onOfertaCta}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {productos.length > 24 && <p className="text-xs text-fg-muted">Mostrando los primeros 24 productos configurables. Los demás siguen usando su precio y datos del catálogo.</p>}
      {!productoEditando && (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-sm text-fg-muted">Elegí un producto para editar su promoción.</p>
      )}
    </div>
  );
}

function EditorPromoCatalogoProducto({
  item,
  ancla,
  ofertaActiva,
  ofertaFinAt,
  ofertaTitulo,
  ofertaTexto,
  ofertaCta,
  onAncla,
  onCambiar,
  onAlternarOferta,
  onOfertaFinAt,
  onOfertaTitulo,
  onOfertaTexto,
  onOfertaCta,
}) {
  const precio = Number(precioDeVenta(item)) || Number(precioPanel(item)) || 0;
  const descuento = descuentoDesdeAnclaPromo(precio, ancla);
  const precioAntes = limpiarNumeroPromo(ancla);
  const ahorro = precioAntes > precio ? precioAntes - precio : 0;

  return (
    <div className="space-y-4 rounded-xl border border-primary/40 bg-surface p-4 shadow-sm">
      <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
        <p className="text-sm font-semibold text-fg">Editás solo la promo del catálogo.</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          Estos datos afectan cómo se ve el producto en grillas, ofertas y filtros. La ficha completa se edita desde “Fichas de producto”.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-xs text-fg-muted">
          Precio anterior
          <CurrencyInput
            aria-label="Precio ancla"
            inputMode="numeric"
            value={ancla ?? ''}
            onChange={v => onAncla(v == null ? '' : String(v))}
            placeholder="Opcional"
            className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg tabular-nums outline-none focus:border-primary"
          />
        </label>
        <label className="block text-xs text-fg-muted">
          % de descuento
          <input
            aria-label="% de descuento"
            inputMode="numeric"
            value={descuento}
            placeholder="Ej: 25"
            className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
            onChange={e => onAncla(precioAnclaPorDescuentoPromo(precio, e.target.value))}
          />
        </label>
        <label className="block text-xs text-fg-muted">
          Badge
          <input
            aria-label="Insignia principal"
            value={item.insignia_principal || ''}
            maxLength={40}
            placeholder={descuento ? 'Oferta' : 'Hot sale'}
            className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
            onChange={e => onCambiar('insignia_principal', e.target.value)}
          />
        </label>
      </div>

      <label className="block text-xs text-fg-muted">
        Etiquetas para filtrar (separadas por coma)
        <input
          aria-label="Etiquetas para filtrar (separadas por coma)"
          value={item.etiqueta || ''}
          maxLength={140}
          placeholder="Oferta, Flash sale, Envío gratis"
          className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
          onChange={e => onCambiar('etiqueta', e.target.value)}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface-2/40 p-3 sm:grid-cols-[1fr_220px]">
        <label className="flex items-center gap-2 text-sm font-medium text-fg">
          <input
            type="checkbox"
            checked={ofertaActiva}
            onChange={onAlternarOferta}
            className="accent-primary"
          />
          Activar countdown para esta promo
        </label>
        <label className="block text-xs text-fg-muted">
          Fecha fin de oferta
          <input
            aria-label="Fecha fin de oferta"
            type="datetime-local"
            value={ofertaFinAt || ''}
            disabled={!ofertaActiva}
            onChange={e => onOfertaFinAt(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary disabled:opacity-50"
          />
        </label>
        {ofertaActiva && (
          <div className="sm:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-xs text-fg-muted">
              Título del countdown
              <input
                aria-label="Título del countdown"
                value={ofertaTitulo || ''}
                maxLength={80}
                placeholder="Esta oferta termina pronto"
                onChange={e => onOfertaTitulo(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
              />
            </label>
            <label className="block text-xs text-fg-muted">
              Texto persuasivo
              <input
                aria-label="Texto persuasivo del countdown"
                value={ofertaTexto || ''}
                maxLength={140}
                placeholder="Aprovechá antes de que vuelva a su precio normal."
                onChange={e => onOfertaTexto(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
              />
            </label>
            <label className="block text-xs text-fg-muted md:col-span-2">
              Texto del botón “Ver todos”
              <input
                aria-label="Texto del botón Ver todos"
                value={ofertaCta || ''}
                maxLength={40}
                placeholder="Ver ofertas"
                onChange={e => onOfertaCta(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
              />
            </label>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3 text-xs text-fg-muted">
        <span className="font-semibold text-fg">Preview comercial:</span>{' '}
        {formatearGs(precio) || 'Sin precio'}
        {precioAntes > precio ? ` · antes ${formatearGs(precioAntes)} · ${descuento}% OFF` : ' · sin precio anterior'}
        {ahorro > 0 ? ` · ahorro ${formatearGs(ahorro)}` : ''}
      </div>
    </div>
  );
}

function EditorSeccionesInicio({ secciones, categorias, productos, onAgregar, onCambiar, onQuitar, onMover, onAlternarProducto }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3 text-xs text-fg-muted">
        <p className="font-semibold text-fg">Dónde aparecen</p>
        <p className="mt-1">Estas vitrinas se muestran debajo de categorías y destacados, antes de “Más vendidos” y del catálogo completo. Si querés elegir productos exactos, usá “Selección manual”.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TIPOS_SECCION_INICIO.map(([tipo, label]) => (
          <button key={tipo} type="button" onClick={() => onAgregar(tipo)} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg hover:border-border-strong">
            <Plus size={13} /> {label}
          </button>
        ))}
      </div>
      {secciones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-sm text-fg-muted">Agregá una sección comercial para ordenar la home.</p>
      ) : secciones.map((seccion, idx) => (
        <div key={seccion.id} className="rounded-xl border border-border bg-surface-2/40 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-fg">
              <input type="checkbox" checked={seccion.activo !== false} onChange={e => onCambiar(seccion.id, { activo: e.target.checked })} className="accent-primary" />
              Sección {idx + 1}
            </label>
            <BotonesOrden
              primero={idx === 0}
              ultimo={idx === secciones.length - 1}
              onSubir={() => onMover(seccion.id, -1)}
              onBajar={() => onMover(seccion.id, 1)}
              onQuitar={() => onQuitar(seccion.id)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-fg-muted mb-1">Tipo</span>
              <select
                value={seccion.tipo}
                onChange={e => onCambiar(seccion.id, {
                  tipo: e.target.value,
                  titulo: TITULOS_SECCION_INICIO[e.target.value] || seccion.titulo,
                  subtitulo: e.target.value === 'categoria' && seccion.categoria ? `Productos de ${seccion.categoria}` : seccion.subtitulo,
                })}
                className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
              >
                {TIPOS_SECCION_INICIO.map(([tipo, label]) => <option key={tipo} value={tipo}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-fg-muted mb-1">Cantidad</span>
              <input
                type="number"
                min="1"
                max="12"
                value={seccion.limite || 4}
                onChange={e => onCambiar(seccion.id, { limite: Math.max(1, Math.min(12, Number(e.target.value) || 4)) })}
                className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
              />
            </label>
            <CampoTexto label="Título" value={seccion.titulo} onChange={v => onCambiar(seccion.id, { titulo: v })} placeholder="Más vendidos" maxLength={80} />
            <CampoTexto label="Subtítulo" value={seccion.subtitulo} onChange={v => onCambiar(seccion.id, { subtitulo: v })} placeholder="Una frase corta para orientar" maxLength={140} />
            <p className="sm:col-span-2 rounded-lg bg-surface px-3 py-2 text-[11px] leading-relaxed text-fg-muted">
              {AYUDAS_SECCION_INICIO[seccion.tipo] || 'Esta vitrina agrega una fila extra de productos en la homepage.'}
            </p>
            {seccion.tipo === 'categoria' && (
              <label className="block sm:col-span-2">
                <span className="block text-xs font-medium text-fg-muted mb-1">Categoría</span>
                <select
                  value={seccion.categoria || ''}
                  onChange={e => onCambiar(seccion.id, {
                    categoria: e.target.value,
                    subtitulo: e.target.value ? `Productos de ${e.target.value}` : seccion.subtitulo,
                  })}
                  className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
                >
                  <option value="">Elegí una categoría</option>
                  {categorias.map(([cat, count]) => <option key={cat} value={cat}>{cat} ({count})</option>)}
                </select>
              </label>
            )}
          </div>
          {seccion.tipo === 'manual' || seccion.tipo === 'mas_vendidos' ? (
            <div className="mt-3">
              <p className="mb-2 text-xs text-fg-muted">
                {seccion.tipo === 'mas_vendidos'
                  ? 'Sin estadísticas de ventas, esta vitrina se cura a mano para no inventar datos.'
                  : 'Elegí exactamente qué productos aparecen en esta colección.'}
              </p>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-surface p-2">
                {productos.map(p => {
                  const elegido = (seccion.productos || []).includes(p.content_id);
                  return (
                    <label key={p.content_id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
                      <input type="checkbox" checked={elegido} onChange={() => onAlternarProducto(seccion.id, p.content_id)} className="accent-primary" />
                      <Miniatura item={p} />
                      <span className="min-w-0 flex-1 truncate text-fg">{p.nombre}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EditorProductosOfertaLimitada({ productos, seleccionados, productoEditando, onAlternar, onEditar, anclas, onAncla, onCambiarPromo }) {
  const elegidos = new Set(seleccionados || []);
  const [modalId, setModalId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const productoModal = modalId && productoEditando?.content_id === modalId ? productoEditando : null;

  function abrirEditor(contentId) {
    onEditar(contentId);
    setModalId(contentId);
    if (!elegidos.has(contentId)) onAlternar(contentId); // editar la promo implica sumarlo a esta oferta
  }

  const productosFiltrados = busqueda.trim()
    ? productos.filter(p => (p.titulo_comercial || p.nombre || '').toLowerCase().includes(busqueda.trim().toLowerCase()))
    : productos;

  return (
    <div className="sm:col-span-2 mt-3 space-y-3 rounded-xl border border-border bg-surface-2/40 p-3">
      <div>
        <p className="text-xs font-semibold text-fg">Productos de esta oferta</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
          Marcá qué productos van al bloque con countdown. Para que aparezcan, deben tener precio anterior mayor al precio actual.
        </p>
      </div>
      {productos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong px-3 py-3 text-sm text-fg-muted">
          Primero agregá productos a la landing.
        </p>
      ) : (
        <>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre..."
              className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
            {productosFiltrados.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-strong px-3 py-3 text-sm text-fg-muted">
                Ningún producto coincide con “{busqueda}”.
              </p>
            ) : productosFiltrados.map(item => {
              const contentId = item.content_id || contentIdPanel(item);
              const elegido = elegidos.has(contentId);
              const precio = Number(precioDeVenta(item)) || 0;
              const antes = Number(item.precio_ancla ?? item.precio_tachado) || 0;
              const descuento = antes > precio && precio > 0 ? Math.round((1 - precio / antes) * 100) : 0;
              return (
                <div key={contentId} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={elegido}
                      onChange={() => onAlternar(contentId)}
                      aria-label={`Mostrar ${item.nombre} en ofertas que terminan pronto`}
                      className="accent-primary"
                    />
                    <Miniatura item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{item.titulo_comercial || item.nombre}</p>
                      <p className="text-xs text-fg-muted tabular-nums">
                        {formatearGs(precio) || 'Sin precio'}
                        {antes > 0 ? ` · antes ${formatearGs(antes)}` : ' · sin precio anterior'}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${descuento > 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {descuento > 0 ? `-${descuento}%` : 'Falta descuento'}
                    </span>
                    <button
                      type="button"
                      onClick={() => abrirEditor(contentId)}
                      className="shrink-0 text-xs font-semibold text-primary-text hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {productoModal && (
        <ModalPromoOferta
          item={productoModal}
          ancla={anclas[claveItem(productoModal)] ?? ''}
          onAncla={v => onAncla(productoModal, v)}
          onCambiar={(campo, valor) => onCambiarPromo(productoModal, campo, valor)}
          onCerrar={() => setModalId(null)}
        />
      )}
    </div>
  );
}

function ModalPromoOferta({ item, ancla, onAncla, onCambiar, onCerrar }) {
  const precio = Number(precioDeVenta(item)) || Number(precioPanel(item)) || 0;
  const descuento = descuentoDesdeAnclaPromo(precio, ancla);
  const precioAntes = limpiarNumeroPromo(ancla);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={onCerrar}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-surface p-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Miniatura item={item} />
            <div className="min-w-0">
              <p className="text-xs text-fg-muted">Editando la oferta de</p>
              <p className="truncate text-sm font-semibold text-fg">{item.titulo_comercial || item.nombre}</p>
            </div>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="shrink-0 rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <CampoTexto
            label="Título comercial"
            value={item.titulo_comercial}
            onChange={v => onCambiar('titulo_comercial', v)}
            placeholder={item.nombre}
            maxLength={90}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-fg-muted">
              Precio anterior
              <CurrencyInput
                aria-label="Precio anterior"
                inputMode="numeric"
                value={ancla ?? ''}
                onChange={v => onAncla(v == null ? '' : String(v))}
                placeholder="Opcional"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg tabular-nums outline-none focus:border-primary"
              />
            </label>
            <label className="block text-xs text-fg-muted">
              % de descuento
              <input
                aria-label="% de descuento"
                inputMode="numeric"
                value={descuento}
                placeholder="Ej: 25"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
                onChange={e => onAncla(precioAnclaPorDescuentoPromo(precio, e.target.value))}
              />
            </label>
          </div>
          <label className="block text-xs text-fg-muted">
            Badge
            <input
              aria-label="Insignia principal"
              value={item.insignia_principal || ''}
              maxLength={40}
              placeholder={descuento ? 'Oferta' : 'Hot sale'}
              className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
              onChange={e => onCambiar('insignia_principal', e.target.value)}
            />
          </label>
          <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3 text-xs text-fg-muted">
            <span className="font-semibold text-fg">Preview:</span>{' '}
            {formatearGs(precio) || 'Sin precio'}
            {precioAntes > precio ? ` · antes ${formatearGs(precioAntes)} · ${descuento}% OFF` : ' · sin precio anterior'}
          </div>
        </div>

        <button
          type="button"
          onClick={onCerrar}
          className="mt-4 h-9 w-full rounded-lg bg-primary text-sm font-semibold text-primary-fg hover:bg-primary-hover"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

function EditorUrgenciaInicio({ titulo, texto, cta, finAt, confirmar, onTitulo, onTexto, onCta, onFinAt, onConfirmar }) {
  function fijarHoras(horas) {
    onFinAt(inputLocalEnHoras(horas));
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <CampoTexto label="Título del bloque" value={titulo} onChange={onTitulo} placeholder="Ofertas que terminan pronto" maxLength={80} />
      <CampoTexto label="Texto del CTA" value={cta} onChange={onCta} placeholder="Ver todos" maxLength={40} />
      <div className="sm:col-span-2"><CampoTexto label="Mensaje" value={texto} onChange={onTexto} placeholder="Aprovechá antes de que se agoten" maxLength={160} /></div>
      <label className="block sm:col-span-2">
        <span className="block text-xs font-medium text-fg-muted mb-1">Fecha fin</span>
        <input
          type="datetime-local"
          value={finAt}
          onChange={e => onFinAt(e.target.value)}
          className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
        />
      </label>
      <div className="sm:col-span-2 rounded-xl border border-border bg-surface-2/60 p-3">
        <p className="text-xs font-semibold text-fg">Duración rápida</p>
        <p className="mt-0.5 text-[11px] text-fg-muted">Podés cargar una fecha exacta arriba o fijar el contador desde ahora.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            [2, '2 horas'],
            [7, '7 horas'],
            [24, '24 horas'],
          ].map(([horas, label]) => (
            <button
              key={horas}
              type="button"
              onClick={() => fijarHoras(horas)}
              className="h-8 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-fg hover:border-border-strong"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className="sm:col-span-2 flex items-center gap-2 text-sm text-fg">
        <input type="checkbox" checked={confirmar} disabled={!finAt} onChange={e => onConfirmar(e.target.checked)} className="accent-primary" />
        Fecha real confirmada
      </label>
      <p className="sm:col-span-2 text-[11px] leading-relaxed text-fg-muted">
        Esta sección muestra solo productos con oferta real, es decir, con precio anterior mayor al precio actual. Si no hay ofertas, no se publica vacía.
      </p>
    </div>
  );
}

function consejoPrecioBump(oferta, precioProducto) {
  const precio = Number(oferta.precio_order_bump ?? oferta.precio_normal) || 0;
  if (oferta.estrategia !== 'order_bump' || !precio || !precioProducto) return null;
  const ratio = precio / precioProducto;
  const pct = Math.round(ratio * 100);
  if (ratio < BUMP_MIN) return { ok: true, texto: `Cuesta el ${pct}% de este producto: se suma casi sin pensarlo.` };
  if (ratio <= BUMP_MAX) return { ok: true, texto: `Cuesta el ${pct}% de este producto: justo en la franja que más se acepta (20 a 40%).` };
  return { ok: false, texto: `Cuesta el ${pct}% de este producto. Los order bumps que más se aceptan cuestan entre el 20 y el 40%: probá bajarlo o ofrecer algo más chico.` };
}

/**
 * Un producto y sus ofertas: qué ofrece cada una, dónde aparece y a qué
 * precio. Marcar = mostrar en esta landing.
 */
function GrupoOfertas({ producto, nombre, ofertas, elegidas, onAlternar, onGestionar, onSumar, fuera, confPaquetes = {}, onCambiarPaquete = null }) {
  const [abierto, setAbierto] = useState(true);
  const precioProducto = Number(precioPanel(producto)) || 0;
  const bumpsMarcados = ofertas.filter(o => o.estrategia === 'order_bump' && elegidas.has(o.id)).length;
  const paqueteActivo = (oferta) => confPaquetes[oferta.id]?.activo !== false;
  const activas = ofertas.filter(o => (o.estrategia === 'normal' ? paqueteActivo(o) : elegidas.has(o.id))).length;
  const idLista = `grupo-ofertas-${producto?.id || nombre}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  return (
    <div className={`rounded-xl border border-border overflow-hidden ${fuera ? 'opacity-80' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-2">
        {producto && <Miniatura item={producto} />}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-fg-muted">Cuando compran</p>
          <p className="text-sm font-semibold text-fg truncate">{nombre}</p>
          {!abierto && (
            <p className="mt-0.5 text-[11px] text-fg-muted">
              {ofertas.length} oferta{ofertas.length === 1 ? '' : 's'} · {activas} activa{activas === 1 ? '' : 's'} en esta landing
            </p>
          )}
        </div>
        {onSumar && (
          <button type="button" onClick={onSumar} className="text-xs font-semibold text-primary-text hover:underline shrink-0">
            Sumar el producto
          </button>
        )}
        <button
          type="button"
          onClick={() => setAbierto(v => !v)}
          aria-expanded={abierto}
          aria-controls={idLista}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border bg-surface text-xs font-medium text-fg-muted hover:text-fg hover:border-border-strong shrink-0"
        >
          {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {abierto ? 'Minimizar' : 'Expandir'}
        </button>
        <button
          type="button"
          onClick={onGestionar}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border bg-surface text-xs font-medium text-fg hover:border-border-strong shrink-0"
        >
          <Pencil size={12} /> Agregar o editar
        </button>
      </div>
      {abierto && !fuera && bumpsMarcados > 1 && (
        <p className="px-4 py-2 text-[11px] text-warning bg-warning/[0.07] border-t border-border">
          Marcaste {bumpsMarcados} order bumps para este producto. Una sola oferta fuerte suele rendir más que varias: dejá la más relevante.
        </p>
      )}
      {abierto && <ul id={idLista} className="divide-y divide-border">
        {ofertas.map(o => {
          const precio = o.precio_order_bump ?? o.precio_normal;
          const antes = o.precio_order_bump != null && Number(o.precio_normal) > Number(o.precio_order_bump) ? o.precio_normal : null;
          const esPaquete = o.estrategia === 'normal';
          const paqueteEstaActivo = !esPaquete || paqueteActivo(o);
          return (
            <li key={o.id}>
              <label className={`flex items-start gap-3 px-4 py-3 ${fuera ? 'cursor-default' : 'cursor-pointer hover:bg-surface-2'} ${paqueteEstaActivo ? '' : 'opacity-60'} transition-colors`}>
                {esPaquete ? (
                  <input
                    type="checkbox"
                    checked={paqueteEstaActivo}
                    disabled={fuera}
                    onChange={e => onCambiarPaquete?.(o.id, { activo: e.target.checked })}
                    aria-label={`Mostrar paquete ${o.nombre} en esta landing`}
                    className="w-4 h-4 mt-0.5 accent-primary shrink-0"
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={elegidas.has(o.id)}
                    disabled={fuera}
                    onChange={() => onAlternar?.(o)}
                    aria-label={`Mostrar ${o.nombre} en esta landing`}
                    className="w-4 h-4 mt-0.5 accent-primary shrink-0"
                  />
                )}
                {o.imagen_url
                  ? <img src={getMediaUrl(o.imagen_url)} alt="" className="w-11 h-11 rounded-lg object-cover bg-surface-2 shrink-0" loading="lazy" />
                  : <span className="w-11 h-11 rounded-lg bg-surface-2 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-fg">{o.nombre}</span>
                  <span className="block text-xs text-fg-muted mt-0.5">
                    <span className="font-medium text-fg/80">{{ order_bump: 'Order bump', upsell: 'Upsell', normal: 'Paquete' }[o.estrategia] || 'Oferta'}</span>
                    {esPaquete
                      ? (paqueteEstaActivo ? ' · en la ficha, en "Elegí tu oferta"' : ' · oculto en esta landing')
                      : ({ order_bump: ' · en la ficha y el checkout', upsell: ' · en el carrito' }[o.estrategia] || '')}
                  </span>
                  <span className="block text-xs text-fg-muted">Ofrece: {queOfrece(o)}</span>
                  {(() => {
                    const motivo = motivoOfertaOculta(o);
                    return motivo && (
                      <span className="block text-[11px] mt-1 text-danger">No se va a ver: {motivo}</span>
                    );
                  })()}
                  {!fuera && (() => {
                    const consejo = consejoPrecioBump(o, precioProducto);
                    return consejo && (
                      <span className={`block text-[11px] mt-1 ${consejo.ok ? 'text-success' : 'text-warning'}`}>{consejo.texto}</span>
                    );
                  })()}
                </span>
                <span className="text-right shrink-0">
                  <span className="block font-mono text-xs text-fg tabular-nums">{formatearGs(precio)}</span>
                  {antes && <span className="block font-mono text-[11px] text-fg-muted line-through tabular-nums">{formatearGs(antes)}</span>}
                </span>
              </label>
              {esPaquete && !fuera && onCambiarPaquete && (
                <ConfigPaquete conf={confPaquetes[o.id] || {}} activo={paqueteEstaActivo} onCambiar={cambio => onCambiarPaquete(o.id, cambio)} />
              )}
            </li>
          );
        })}
      </ul>}
    </div>
  );
}

/**
 * Combos que existen pero no se pueden vender: un combo nuevo nace en
 * BORRADOR y el catálogo solo trae los ACTIVOS (y con su producto base
 * activo). Antes simplemente no aparecían y no había forma de saber por qué.
 */
function CombosSinPublicar({ idsVisibles, onActivado, formatoCombos }) {
  const [combos, setCombos] = useState([]);
  const [activando, setActivando] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => comboAdminService.listar()
    .then(lista => setCombos(Array.isArray(lista) ? lista : []))
    .catch(() => setCombos([])), []);
  useEffect(() => { cargar(); }, [cargar]);

  const ocultos = combos.filter(c => !idsVisibles.has(Number(c.id)));
  if (!ocultos.length) {
    return formatoCombos && idsVisibles.size === 0 ? (
      <p className="mb-4 rounded-xl border border-dashed border-border px-4 py-3 text-[13px] text-fg-muted">
        Todavía no tenés combos. Crealos en{' '}
        <a href="/combos" target="_blank" rel="noopener noreferrer" className="font-medium text-primary-text hover:underline">Combos</a>
        {' '}y volvé a esta pantalla: aparecen solos.
      </p>
    ) : null;
  }

  async function activar(combo) {
    setError('');
    setActivando(combo.id);
    try {
      await comboAdminService.cambiarEstado(combo.id, 'ACTIVO');
      await Promise.all([cargar(), onActivado?.()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo activar el combo.');
    } finally {
      setActivando(null);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-warning/40 bg-warning/[0.06] px-4 py-3">
      <p className="text-[13px] font-semibold text-fg">
        {ocultos.length === 1 ? 'Tenés 1 combo que no aparece acá' : `Tenés ${ocultos.length} combos que no aparecen acá`}
      </p>
      <p className="text-xs text-fg-muted mt-0.5">Solo se pueden vender los combos activos. Activalo y aparece en la lista para sumarlo a la landing (con su propia ficha).</p>
      <ul className="mt-2 divide-y divide-border">
        {ocultos.map(c => {
          const borrador = c.estado === 'BORRADOR';
          const activo = c.estado === 'ACTIVO';
          return (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-fg truncate">{c.nombre}</span>
                <span className="block text-xs text-fg-muted">
                  {activo
                    ? `Activo, pero no entra al catálogo: revisá que su producto base${c.producto_padre?.nombre ? ` (${c.producto_padre.nombre})` : ''} esté activo`
                    : borrador ? 'Borrador: nunca se activó' : 'Desactivado'}
                </span>
              </span>
              {activo ? (
                <a href="/productos" target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-primary-text hover:underline">Ver producto</a>
              ) : (
                <button
                  type="button"
                  onClick={() => activar(c)}
                  disabled={activando === c.id}
                  className="shrink-0 h-8 px-3 rounded-lg bg-fg text-canvas text-xs font-semibold disabled:opacity-60"
                >
                  {activando === c.id ? 'Activando…' : 'Activar'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

const ETIQUETAS_SUGERIDAS = ['Más elegido', 'Mayor ahorro', 'Recomendado', 'Ideal para 1 mes'];

/**
 * Cómo se presenta un paquete en "Elegí tu oferta": su etiqueta (editable,
 * con sugerencias) y si es el destacado (arranca elegido y lleva la
 * etiqueta llena). "Más elegido" es una afirmación del comercio: ponela
 * cuando sea verdad.
 */
function ConfigPaquete({ conf, activo = true, onCambiar }) {
  const etiqueta = conf.etiqueta || '';
  return (
    <div className="px-4 pb-3 pl-11 space-y-2">
      <div className={`flex flex-wrap items-center gap-1.5 ${activo ? '' : 'opacity-50'}`}>
        <span className="text-[11px] font-medium text-fg-muted mr-1">Etiqueta</span>
        {ETIQUETAS_SUGERIDAS.map(t => (
          <button
            key={t}
            type="button"
            disabled={!activo}
            onClick={() => onCambiar({ etiqueta: etiqueta === t ? '' : t })}
            aria-pressed={etiqueta === t}
            className={`h-6 px-2 rounded-full text-[11px] font-medium border ${etiqueta === t ? 'bg-fg text-canvas border-fg' : 'border-border text-fg-muted hover:text-fg'} disabled:cursor-not-allowed disabled:hover:text-fg-muted`}
          >
            {t}
          </button>
        ))}
        <input
          value={etiqueta}
          disabled={!activo}
          onChange={e => onCambiar({ etiqueta: e.target.value.slice(0, 24) })}
          placeholder="O escribí la tuya"
          maxLength={24}
          aria-label="Etiqueta del paquete"
          className="h-6 w-36 rounded-md border border-border bg-surface px-2 text-[11px] text-fg"
        />
      </div>
      <label className={`flex items-center gap-2 text-[12px] text-fg ${activo ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
        <input type="checkbox" checked={!!conf.destacado} disabled={!activo} onChange={e => onCambiar({ destacado: e.target.checked })} className="w-3.5 h-3.5 accent-primary" />
        Destacar este paquete <span className="text-fg-muted">(arranca elegido y resalta su etiqueta)</span>
      </label>
    </div>
  );
}

/**
 * Lo que la landing va a vender HOY con la regla elegida (por categoría o
 * todo el catálogo), producto por producto. Sin esto, marcar categorías era
 * adivinar qué entraba.
 */
function ProductosIncluidos({ lista, vacio }) {
  const [q, setQ] = useState('');
  const [limite, setLimite] = useState(60);
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? lista.filter(i => i.nombre?.toLowerCase().includes(t) || i.categoria?.toLowerCase().includes(t)) : lista;
  }, [lista, q]);

  return (
    <div className="mt-4 rounded-xl border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <p className="text-sm font-medium text-fg">
          Entran hoy <span className="font-mono">{lista.length.toLocaleString('es-PY')}</span> producto{lista.length === 1 ? '' : 's'}
        </p>
        {lista.length > 8 && (
          <div className="sm:w-64"><Buscador valor={q} onChange={v => { setQ(v); setLimite(60); }} placeholder="Buscar entre estos" etiqueta="Buscar entre los productos incluidos" /></div>
        )}
      </div>
      {lista.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">{vacio}</p>
      ) : (
        <ul className="max-h-[260px] overflow-y-auto divide-y divide-border">
          {filtrados.length === 0 && <li className="px-4 py-5 text-center text-sm text-fg-muted">Ninguno coincide con “{q}”.</li>}
          {filtrados.slice(0, limite).map(item => (
            <li key={clave(item)} className="flex items-center gap-3 px-4 py-2">
              <Miniatura item={item} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-fg truncate">{item.nombre}</span>
                <span className="block text-xs text-fg-muted truncate">{item.tipo === 'combo' ? 'Combo' : (item.categoria || 'Sin categoría')}</span>
              </span>
              <span className="font-mono text-xs text-fg-muted tabular-nums">{formatearGs(precioPanel(item))}</span>
            </li>
          ))}
          {filtrados.length > limite && (
            <li className="px-4 py-2.5 text-center">
              <button type="button" onClick={() => setLimite(l => l + 100)} className="text-sm font-medium text-primary-text hover:underline">
                Ver {Math.min(100, filtrados.length - limite)} más de {filtrados.length - limite}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Panel lateral para crear y editar order bumps / upsells sin salir del
 * paso. Primero se elige el producto (una oferta siempre pertenece a uno:
 * se ofrece cuando ese producto está en la compra); después se abre el
 * editor de ofertas de ese producto, el mismo de su ficha.
 */
// Lo usa también el paso de ofertas del wizard de IA (PasoOfertas): es el
// mismo editor real de la ficha de producto, así una oferta creada desde la
// IA es idéntica a una creada desde Productos.
export function PanelOfertas({ producto, estrategia = null, productos, enLanding, onElegir, onCambiarProducto, onCerrar, onComboCreado, landingPreview = null, permitirCombo = false }) {
  const [busqueda, setBusqueda] = useState('');
  const [armandoCombo, setArmandoCombo] = useState(false);
  const tipoElegido = LABEL_TIPO_OFERTA_RAPIDA[estrategia] || null;

  useEffect(() => {
    // Con el formulario de una oferta abierto (modal del editor), Escape no
    // cierra el panel entero: se perdería lo que se estaba cargando.
    const alTeclear = e => { if (e.key === 'Escape' && !document.querySelector('.modal-overlay')) onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q ? productos.filter(p => p.nombre?.toLowerCase().includes(q)) : productos;
    // Los de esta landing primero: son los que tiene sentido ofertar.
    return [...lista].sort((a, b) => Number(enLanding.has(Number(b.id))) - Number(enLanding.has(Number(a.id))));
  }, [productos, busqueda, enLanding]);

  if (producto && (estrategia === 'combo' || armandoCombo)) {
    return (
      <PanelLazyErrorBoundary resetKey={`combo-${producto.id}-${armandoCombo}-${estrategia || ''}`}>
        <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-canvas" role="status">Abriendo el armador de combos…</div>}>
          <ArmarComboPanel productos={productos} principalInicial={producto} landingPreview={landingPreview} onCerrar={onCerrar} onCreado={nuevo => {
            if (onComboCreado) return onComboCreado(nuevo);
            else onCerrar();
          }} />
        </Suspense>
      </PanelLazyErrorBoundary>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Ofertas">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-black/40 cursor-default" />
      <div className={`relative w-full ${producto ? 'max-w-4xl' : 'max-w-3xl'} h-full bg-canvas border-l border-border shadow-2xl flex flex-col`}>
        <div className="flex items-center justify-between gap-3 px-5 md:px-6 h-16 border-b border-border bg-surface shrink-0">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">Ofertas en la compra</p>
            <p className="text-[15px] font-semibold text-fg truncate">
              {producto
                ? `${tipoElegido ? `${tipoElegido} de ` : 'Ofertas de '}${producto.nombre}`
                : tipoElegido ? `Crear ${tipoElegido}: elegí el producto` : 'Elegí el producto a editar'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {producto && (
              <button type="button" onClick={onCambiarProducto} className="h-9 px-3 rounded-lg text-sm font-medium text-fg-muted hover:text-fg hover:bg-surface-2">
                Otro producto
              </button>
            )}
            <button type="button" onClick={onCerrar} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover">
              <Check size={15} /> Listo
            </button>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {producto ? (
            <div className="p-4 md:p-6">
              <PanelLazyErrorBoundary resetKey={`ofertas-${producto.id}-${estrategia || ''}`}>
                <Suspense fallback={<p className="flex items-center gap-2 text-sm text-fg-muted"><Loader size={14} className="animate-spin" /> Abriendo el editor…</p>}>
                  <OfertasProductoTab
                    key={`${producto.id}-${estrategia || ''}`}
                    crearAlAbrir={estrategia}
                    onCrearCombo={permitirCombo ? () => setArmandoCombo(true) : null}
                    productoId={producto.id}
                    productoNombre={producto.nombre}
                    productoAnclaPrecioBase={Number(precioPanel(producto)) || 0}
                    productoAnclaPrecioCosto={Number(producto.precio_costo) || 0}
                  />
                </Suspense>
              </PanelLazyErrorBoundary>
            </div>
          ) : (
            <div className="p-5 md:p-6">
              <p className="text-sm text-fg-muted mb-3">
                {estrategia === 'pack' ? 'Elegí el producto al que pertenece el paquete. Ejemplo: AdelFit x2 o x3.'
                  : estrategia === 'combo' ? 'Elegí el producto principal que dispara este combo. Después sumás los productos del kit.'
                    : estrategia === 'order_bump' ? 'Elegí el producto principal donde se va a mostrar el order bump.'
                      : estrategia === 'upsell' ? 'Elegí el producto principal que dispara el upsell.'
                        : 'Elegí qué producto querés editar. Las ofertas se muestran cuando el cliente compra ese producto.'}
              </p>
              <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar producto" etiqueta="Buscar producto" />
              <ul className="mt-3 rounded-xl border border-border divide-y divide-border bg-surface">
                {visibles.length === 0 && <li className="px-4 py-6 text-center text-sm text-fg-muted">Ningún producto coincide con “{busqueda}”.</li>}
                {visibles.slice(0, 200).map(p => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onElegir(p)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <Miniatura item={p} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-fg truncate">{p.nombre}</span>
                        <span className="block text-xs text-fg-muted">{p.categoria || 'Sin categoría'}</span>
                      </span>
                      {enLanding.has(Number(p.id)) && <span className="text-[11px] font-medium text-success shrink-0">En esta landing</span>}
                      <ArrowRight size={15} className="text-fg-muted shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Bloque({ titulo, ayuda, interruptor, verDonde, children }) {
  const apagado = interruptor && !interruptor.activo;
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
      <div className={`flex items-start justify-between gap-4 ${apagado ? '' : 'mb-4'}`}>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-fg">{titulo}</h2>
          {ayuda && <p className="mt-1 text-sm text-fg-muted">{ayuda}</p>}
          {verDonde && (
            <button
              type="button"
              onClick={verDonde}
              className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-primary-text hover:underline"
            >
              <Eye size={13} /> Ver dónde aparece
            </button>
          )}
        </div>
        {interruptor && <Interruptor {...interruptor} />}
      </div>
      {children}
    </section>
  );
}

function Interruptor({ activo, onChange, etiqueta }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onChange(!activo)}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activo ? 'bg-success' : 'bg-border-strong'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${activo ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

function Buscador({ valor, onChange, placeholder, etiqueta }) {
  return (
    <label className="flex-1 flex items-center gap-2 h-10 rounded-lg border border-border bg-surface px-3 focus-within:border-primary">
      <Search size={15} className="text-fg-muted shrink-0" />
      <input
        type="search"
        value={valor}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={etiqueta}
        className="flex-1 min-w-0 bg-transparent text-sm text-fg placeholder:text-fg-muted/70 outline-none"
      />
    </label>
  );
}

function Miniatura({ item }) {
  const src = item.imagen ? getMediaUrl(item.imagen) : null;
  return src
    ? <img src={src} alt="" className="w-10 h-10 rounded-lg object-cover bg-surface-2 shrink-0" loading="lazy" />
    : <span className="w-10 h-10 rounded-lg bg-surface-2 shrink-0" />;
}











