import { dividirCodigoPegado } from './dividirCodigoPegado';
import useArrastreBloques, { moverBloqueEnLista } from './useArrastreBloques';
import './editorWorkspace.css';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader, ArrowRight, ArrowLeft, Search, Check, AlertTriangle, Infinity as InfinityIcon, Tag, Plus, Pencil, X,
  Eye, EyeOff, Home, ShoppingBag, MousePointerClick, Smartphone, Monitor, Maximize2, ChevronDown, ChevronUp,
  ChevronsUpDown, ChevronsDownUp,
  Upload, Film, PackagePlus, FileCode2, Tags, CreditCard, RefreshCw, RotateCcw, Trash2, ExternalLink, Save, Settings2, Copy, Sparkles,
  GripVertical, Lock, Cpu, Terminal,
} from 'lucide-react';
import ConectarMcpPanel from './panels/ConectarMcpPanel';
import { MCP_EDITOR_HABILITADO } from './mcpEditorConfig';
import { ofertaService } from '../../services/ofertaService';
import { productService } from '../../services/productService';
import { comboAdminService } from '../../services/comboAdminService';
import { landingSimpleService } from '../../services/landingSimpleService';
import CurrencyInput from '../../components/CurrencyInput';
import PrecioAncla, { claveItem, precioDeVenta } from './PrecioAnclaItem';
import EdicionConjuntaFichas from './EdicionConjuntaFichas';
import EditorCombosInicio from './EditorCombosInicio';
import PaginasFooterEditor from './PaginasFooterEditor';
import { textoInicialFooter, codigoFooterDesdeTexto } from './paginasFooter';
import { PAGINAS_LEGALES_CODIGO, plantillaLegalPara } from './plantillasLegalesCodigo';
import { normalizarCombosInicio } from './combosInicio';
import PresentacionProducto, { BLOQUES_FICHA_PANEL, ROTULOS_BLOQUES_FICHA, bloqueDeZona, llevarBloqueALaVista } from './PresentacionProducto';
import { usePagoparConectado } from './usePagoparConectado';
import { contentIdPanel, datosRuntimePreview, itemPanelARuntime, presentacionDelProducto, slugCategoria, textosRecomendados, TODAS_CATEGORIAS, PAYMENT_LOGOS_DEFAULT } from './datosRuntime';
import { getMediaUrl } from '../../services/api';
import CodigoPreview from './CodigoPreview';
import FichaComboLienzo from './FichaComboLienzo';
import EditorFichaCombo from './EditorFichaCombo';
import { BLOQUES_COMBO, bloquePadreCombo } from './comboBloques';
import { contenidoCombo, combinarDetalleCombo } from './comboContenido';
import { plantillaInicioPara, formatoDeBase, esBaseIntacta, marcarPersonalizado, marcarFichaPersonalizada, PLANTILLA_PRODUCTO, PLANTILLA_CATALOGO, PLANTILLA_CATEGORIA, PLANTILLA_CHECKOUT, esFichaProductoBase } from './plantillasBaseCodigo';
import { verificarSesion } from '../../utils/auth';
import PhonePreviewShell from './PhonePreviewShell';
import EditorColeccionesInicio from './EditorColeccionesInicio';
import { aplicarCambiosFichas, combinarFichaCompartida } from './fichasEnLote';
import OrganizadorProductos, { BADGES_OFERTA, MAX_PRODUCTOS_CONTADOR, conEtiqueta, sinEtiqueta } from './OrganizadorProductos';
import { conGlobalesHeredados } from './globalesCodigo';
import { extraerFragmentoHtml, reemplazarFragmentoHtml, extraerSeccionCss, reemplazarSeccionCss, bindsDeTiendaPerdidos } from './seccionesCodigo';
import { armarPromptVista } from './promptsCodigo';
import { armarPromptSeccionInicio } from './promptsSeccionInicio';
import { armarPromptFichaProducto, bloquesFichaFaltantes, faltantesFicha } from './promptsFichaProducto';

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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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
const MAX_RECOMENDADOS_MANUALES = Math.max(...CANTIDADES_RECO);
// Con catálogos enormes, el preview no necesita más que esto para verse igual.
const MAX_PRODUCTOS_PREVIEW = 120;

// Los content_id que la configuración nombra. Espejo de
// LandingService.contentIdsReferidosLienzo (backend): lo que la página tiene
// que poder pintar aunque no caiga en el primer lote.
function contentIdsReferidosVenta(venta = {}) {
  const ids = new Set();
  const lista = v => (Array.isArray(v) ? v : []);
  const sumar = (v) => {
    const id = typeof v === 'string' ? v.trim() : (v && typeof v === 'object' ? String(v.id || v.content_id || '').trim() : '');
    if (id) ids.add(id);
  };
  const inicio = venta.inicio || venta.inicio_comercial || {};
  if (Number(venta.principal_id) > 0) sumar(`producto-${Number(venta.principal_id)}`);
  lista(venta.destacados).forEach(sumar);
  lista(inicio.secciones).forEach(s => lista(s?.productos).forEach(sumar));
  lista(inicio.productos_categoria?.items).forEach(sumar);
  lista(inicio.combos?.items).forEach(sumar);
  [venta.urgencia?.producto_id, venta.prueba_social?.producto_id].forEach(sumar);
  lista(venta.urgencia?.productos).forEach(sumar);
  lista(venta.recomendados?.items).forEach(sumar);
  lista(venta.checkout_recomendados?.items).forEach(sumar);
  return ids;
}
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
  ['#testimonios', 'Testimonios'],
];
const MENU_PRINCIPAL_DEFAULT = [
  { id: 'inicio', texto: 'Inicio', destino: '#inicio', visible: true },
  { id: 'productos', texto: 'Productos', destino: '/catalogo', visible: true },
];
const ENCABEZADO_INICIO_DEFAULT = {
  mostrar_logo: true,
  mostrar_nombre: true,
  logo_tamano: 76,
  logo_rotacion: 0,
  logo_posicion: 'izquierda',
  variante: 'normal',
  variante_mobile: null,
};
// 'normal': encabezado en su propio contenedor, separado del banner.
// 'embebido': encabezado transparente superpuesto al banner (sin separación
// visual) — comparte este campo con la barra de anuncios y el banner porque
// los tres se componen juntos, no se elige por separado.
const VARIANTES_ENCABEZADO = ['normal', 'embebido'];
const DESTINOS_MENU_PRINCIPAL = [
  ['#inicio', 'Inicio'],
  ['/catalogo', 'Productos'],
  ['#ofertas', 'Ofertas'],
  ['#colecciones', 'Colecciones'],
  ['#productos-categoria', 'Productos por categoría'],
  ['#confianza', 'Zona de confianza'],
  ['#marca', 'Nuestra marca'],
  ['#testimonios', 'Testimonios'],
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
// Compatibilidad con los nombres guardados por el selector anterior. Los
// valores Unicode se conservan completos, incluidos ZWJ y tonos de piel.
function emojiConfianzaInicio(icono) {
  const antiguos = { shield: '🛡️', card: '💳', truck: '🚚', rotate: '↺', badge: '🏅', heart: '❤️', leaf: '🌿', headphones: '🎧', package: '📦', clock: '⏱️', gift: '🎁', star: '⭐', lock: '🔒', whatsapp: '💬', mail: '✉️', location: '📍', cash: '💵' };
  return Object.prototype.hasOwnProperty.call(antiguos, icono) ? antiguos[icono] : icono || '';
}
const MARCA_INICIO_DEFAULT = {
  activo: true,
  kicker: 'NUESTRA MARCA',
  titulo: 'Comprá con confianza en nuestra tienda.',
  texto: 'Seleccionamos productos pensados para resolver compras reales, con atención cercana antes y después de cada pedido.',
  badges: ['Atención personalizada', 'Productos seleccionados', 'Compra simple'],
  medios: [],
};
const TESTIMONIOS_INICIO_DEFAULT = {
  kicker: 'Opiniones',
  titulo: 'Clientes que ya compraron.',
  subtitulo: '',
  items: [],
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

function limitarNumero(valor, min, max, fallback) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
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

// Medidas recomendadas por tamaño de banner (RF-GEN-01/02) — el aspect-ratio
// real que usa el CSS (estilosInicioCodigo.js) sale de estos mismos pares,
// para no tener los números duplicados y desincronizados entre editor y CSS.
// `null` ("sin elegir") es el tamaño LEGADO: una landing vieja que nunca tocó
// este selector sigue con su alto fijo de siempre (310px) — no se le asume
// "mediano" ni se le cambia el aspecto sin que el comercio lo elija.
const TAMANOS_BANNER = {
  pequeno: { etiqueta: 'Pequeño', ayuda: 'Compacto — promociones puntuales', desktop: { w: 1920, h: 450 }, mobile: { w: 750, h: 500 } },
  mediano: { etiqueta: 'Mediano', ayuda: 'Equilibrado — el recomendado para la mayoría', desktop: { w: 1920, h: 650 }, mobile: { w: 750, h: 800 } },
  grande: { etiqueta: 'Grande', ayuda: 'Impactante — campañas y lanzamientos', desktop: { w: 1920, h: 850 }, mobile: { w: 750, h: 1050 } },
};
const POSICIONES_IMAGEN = [
  ['left top', 'Arriba izq.'], ['center top', 'Arriba centro'], ['right top', 'Arriba der.'],
  ['left center', 'Centro izq.'], ['center center', 'Centro'], ['right center', 'Centro der.'],
  ['left bottom', 'Abajo izq.'], ['center bottom', 'Abajo centro'], ['right bottom', 'Abajo der.'],
];

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
    posicion_desktop: 'center center',
    posicion_mobile: 'center center',
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

// El menú es lo que cargó el comercio y nada más (ver menuPrincipal en
// runtimeGesicomm.js). El default solo se propone a una tienda que nunca
// tuvo menú; si lo vació, queda vacío salvo "Inicio", que es lo único que
// se garantiza. Antes un menú vacío volvía al default y "Productos"
// reaparecía al recargar el editor.
const esLinkInicioMenu = item => ['/', '#inicio', ''].includes(String(item?.destino || ''));

function normalizarMenuPrincipal(menu) {
  const fuente = Array.isArray(menu) ? menu : MENU_PRINCIPAL_DEFAULT;
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
  return normalizados.some(esLinkInicioMenu) ? normalizados : [MENU_PRINCIPAL_DEFAULT[0], ...normalizados];
}

function normalizarEncabezadoInicio(encabezado = {}) {
  return {
    mostrar_logo: encabezado.mostrar_logo !== false,
    mostrar_nombre: encabezado.mostrar_nombre !== false,
    logo_tamano: encabezado.logo_tamano == null || encabezado.logo_tamano === ''
      ? ENCABEZADO_INICIO_DEFAULT.logo_tamano
      : limitarNumero(encabezado.logo_tamano, 28, 128, ENCABEZADO_INICIO_DEFAULT.logo_tamano),
    logo_rotacion: limitarNumero(encabezado.logo_rotacion, -180, 180, ENCABEZADO_INICIO_DEFAULT.logo_rotacion),
    logo_posicion: encabezado.logo_posicion === 'centro' ? 'centro' : ENCABEZADO_INICIO_DEFAULT.logo_posicion,
    variante: VARIANTES_ENCABEZADO.includes(encabezado.variante) ? encabezado.variante : ENCABEZADO_INICIO_DEFAULT.variante,
    // null = hereda la variante de escritorio; no es un tercer valor del
    // selector, es la ausencia de override (ver EditorMenuPrincipal).
    variante_mobile: VARIANTES_ENCABEZADO.includes(encabezado.variante_mobile) ? encabezado.variante_mobile : null,
  };
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
    encabezado: actual.encabezado || legado.encabezado,
  };
}

// Bloques del body del Inicio que el comercio puede reordenar/ocultar — ver
// EditorBloquesInicio más abajo y aplicarBloquesInicio en runtimeGesicomm.js
// (el espejo del lado del runtime). "Menú" no está: vive en el header fijo,
// no tiene una posición en la página que mover.
const TIPOS_BLOQUE_INICIO = [
  'anuncios', 'banner', 'productos_categoria', 'combos', 'ofertas_urgencia', 'confianza', 'testimonios', 'marca', 'colecciones',
];
const ETIQUETAS_BLOQUE_INICIO = {
  anuncios: 'Barra de anuncios',
  banner: 'Banner principal',
  categorias: 'Categorías visuales',
  productos_categoria: 'Productos',
  destacados: 'Productos destacados',
  confianza: 'Zona de confianza',
  testimonios: 'Testimonios',
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
  'anuncios', 'banner', 'productos_categoria', 'combos', 'ofertas_urgencia', 'confianza', 'testimonios', 'marca', 'colecciones',
].map(tipo => ({ tipo, visible: true }));

// La barra de anuncios va siempre arriba de todo (junto al encabezado, que
// tampoco se mueve): no se arrastra y se ordena primera aunque una landing
// vieja la haya guardado más abajo.
const BLOQUE_INICIO_FIJO = 'anuncios';

function normalizarBloquesInicio(bloques) {
  const guardados = Array.isArray(bloques) ? bloques.filter(b => b && TIPOS_BLOQUE_INICIO.includes(b.tipo)) : [];
  if (!guardados.length) return BLOQUES_INICIO_DEFAULT;
  const vistos = new Set(guardados.map(b => b.tipo));
  // Si la base agregó un tipo de bloque nuevo después de que esta landing ya
  // guardó su lista, aparece al final (visible) en vez de desaparecer.
  const faltantes = TIPOS_BLOQUE_INICIO.filter(t => !vistos.has(t)).map(tipo => ({ tipo, visible: true }));
  const todos = [...guardados.map(b => ({ tipo: b.tipo, visible: b.visible !== false })), ...faltantes.filter(b => b.tipo !== 'combos')];
  if (!vistos.has('combos')) {
    const despuesDeProductos = todos.findIndex(b => b.tipo === 'productos_categoria') + 1;
    todos.splice(despuesDeProductos || 1, 0, { tipo: 'combos', visible: true });
  }
  return [...todos.filter(b => b.tipo === BLOQUE_INICIO_FIJO), ...todos.filter(b => b.tipo !== BLOQUE_INICIO_FIJO)];
}

function normalizarInicioComercial(inicio = {}, categorias = []) {
  const primeraCategoria = categorias[0]?.[0] || '';
  const bannersGuardados = Array.isArray(inicio.banners)
    ? inicio.banners.map((b, idx) => ({
      id: b.id || `banner-${idx + 1}`,
      activo: b.activo !== false,
      titulo: b.titulo || '',
      subtitulo: b.subtitulo || '',
      etiqueta: b.etiqueta || '',
      cta_texto: b.cta_texto ?? 'Ver productos',
      enlace: b.enlace || '/catalogo',
      imagen: b.imagen || '',
      tipo_medio: b.tipo_medio || inferirTipoMedio(b.imagen || ''),
      // Override de responsive (RF-GEN-02): vacío/true = usa la imagen y la
      // visibilidad de escritorio, no se duplica el resto del contenido.
      imagen_mobile: b.imagen_mobile || '',
      activo_mobile: b.activo_mobile !== false,
      // Posición independiente por dispositivo: una foto puede necesitar el
      // rostro a la derecha en escritorio y centrado en celular.
      posicion_desktop: POSICIONES_IMAGEN.some(([v]) => v === b.posicion_desktop) ? b.posicion_desktop : 'center center',
      posicion_mobile: POSICIONES_IMAGEN.some(([v]) => v === b.posicion_mobile) ? b.posicion_mobile : 'center center',
    }))
    : [];
  // Landing nueva sin banners guardados: arranca con uno de ejemplo en vez
  // de vacío, para que el bloque no se vea "roto" antes de personalizarlo.
  const banners = bannersGuardados.length ? bannersGuardados : [crearBannerInicio()];
  const bannersIntermedios = Array.isArray(inicio.banners_intermedios)
    ? inicio.banners_intermedios.map((b, idx) => ({
      id: b.id || `banner-medio-${idx + 1}`,
      activo: b.activo !== false,
      titulo: b.titulo || '',
      subtitulo: b.subtitulo || '',
      etiqueta: b.etiqueta || '',
      cta_texto: b.cta_texto ?? 'Ver ofertas',
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
  const testimoniosConfig = inicio.testimonios && typeof inicio.testimonios === 'object' ? inicio.testimonios : {};
  const tieneAnunciosGuardados = Array.isArray(inicio.anuncios);
  const anuncios = tieneAnunciosGuardados
    ? inicio.anuncios.map(it => (typeof it === 'string' ? { texto: it, icono: '' } : { texto: it?.texto || '', icono: it?.icono || '' }))
    : [];
  const anunciosConTexto = anuncios.filter(it => String(it.texto || '').trim());
  const confianza = Array.isArray(inicio.confianza)
    ? inicio.confianza.map(it => ({ icono: emojiConfianzaInicio(it?.icono), titulo: it?.titulo || '', texto: it?.texto || '' }))
    : [];
  const confianzaConTexto = confianza.filter(it => String(it.titulo || it.texto || '').trim());
  const testimoniosItems = Array.isArray(testimoniosConfig.items)
    ? testimoniosConfig.items.map((it, idx) => ({
      id: it?.id || `testimonio-${idx + 1}`,
      nombre: it?.nombre || '',
      detalle: it?.detalle || '',
      comentario: it?.comentario || it?.texto || '',
      foto: it?.foto || it?.imagen || '',
      calificacion: limitarNumero(it?.calificacion, 1, 5, 5),
    }))
    : [];
  return {
    encabezado: normalizarEncabezadoInicio(inicio.encabezado),
    menu_links: normalizarMenuPrincipal(inicio.menu_links),
    menu_categorias: inicio.menu_categorias !== false,
    categorias: Array.isArray(inicio.categorias) ? inicio.categorias : [],
    banners,
    // null = tamaño legado (alto fijo de siempre) — ver TAMANOS_BANNER. No
    // se le asume "mediano" a una landing vieja que nunca tocó el selector.
    banner_tamano: Object.prototype.hasOwnProperty.call(TAMANOS_BANNER, inicio.banner_tamano) ? inicio.banner_tamano : null,
    banners_intermedios: bannersIntermedios,
    secciones: secciones.length ? secciones : [
      crearSeccionInicio('categoria', primeraCategoria),
    ],
    bloques: normalizarBloquesInicio(inicio.bloques),
    // Acepta el string suelto que guardaban las landings de antes del
    // selector de ícono (ver limpiarAnuncioInicio, backend).
    anuncios: tieneAnunciosGuardados ? anunciosConTexto : ANUNCIOS_INICIO_DEFAULT,
    confianza: confianzaConTexto.length ? confianzaConTexto : CONFIANZA_INICIO_DEFAULT,
    confianza_estilo: ['tarjetas', 'destacada'].includes(inicio.confianza_estilo) ? inicio.confianza_estilo : 'compacta',
    productos_categoria: {
      activo: productosCategoria.activo === true,
      mostrar_combos: productosCategoria.mostrar_combos !== false,
      titulo: productosCategoria.titulo || '',
      kicker: productosCategoria.kicker || '',
      subtitulo: productosCategoria.subtitulo || '',
      items: Array.isArray(productosCategoria.items) ? productosCategoria.items : [],
      limite: Number(productosCategoria.limite) > 0 ? Number(productosCategoria.limite) : 8,
      columnas: Math.max(1, Math.min(8, Math.floor(Number(productosCategoria.columnas) || 4))),
      formato: productosCategoria.formato === 'carrusel' ? 'carrusel' : 'filas',
    },
    combos: normalizarCombosInicio(inicio.combos),
    marca: {
      activo: marca.activo !== false,
      kicker: marca.kicker || MARCA_INICIO_DEFAULT.kicker,
      titulo: marca.titulo || MARCA_INICIO_DEFAULT.titulo,
      texto: marca.texto || MARCA_INICIO_DEFAULT.texto,
      badges: Array.isArray(marca.badges) && marca.badges.some(b => String(b || '').trim()) ? marca.badges : MARCA_INICIO_DEFAULT.badges,
      medios: Array.isArray(marca.medios) ? marca.medios : MARCA_INICIO_DEFAULT.medios,
    },
    testimonios: {
      kicker: testimoniosConfig.kicker || TESTIMONIOS_INICIO_DEFAULT.kicker,
      titulo: testimoniosConfig.titulo || TESTIMONIOS_INICIO_DEFAULT.titulo,
      subtitulo: testimoniosConfig.subtitulo || '',
      activo: testimoniosConfig.activo === true,
      items: testimoniosItems,
    },
    // Bloque "Colecciones": null = la landing nunca lo configuró y se ve
    // como siempre (categorías, tope del HTML). Ver normalizarColecciones.
    colecciones: normalizarColeccionesInicio(inicio.colecciones),
  };
}

// Espejo de limpiarColeccionesInicio (backend).
function normalizarColeccionesInicio(c) {
  if (!c || typeof c !== 'object') return null;
  return {
    modo: c.modo === 'colecciones' ? 'colecciones' : 'categorias',
    ...(typeof c.titulo === 'string' ? { titulo: c.titulo } : {}),
    ...(typeof c.subtitulo === 'string' ? { subtitulo: c.subtitulo } : {}),
    ...(c.imagenes && typeof c.imagenes === 'object' ? { imagenes: c.imagenes } : {}),
    items: Array.isArray(c.items) ? c.items.filter(v => typeof v === 'string' && v.trim()).slice(0, 24) : [],
    columnas: Math.max(1, Math.min(6, Math.floor(Number(c.columnas) || 4))),
    limite: Math.max(1, Math.min(24, Math.floor(Number(c.limite) || 4))),
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
  catalogo, inicial, onConfirmar, onCambiarModo, guardando, cargarOfertas = cargarOfertasTienda,
  tienda = null, landing = null, codigos = null, onCambiarCodigo = null, onRestaurarCodigo = null, onSubirImagen = null,
  disenoPendienteIA = false,
  onDesbloquearInicio = null,
  // Error del guardado (viene del editor): sin esto, si el servidor
  // rechazaba el guardado, el botón "no hacía nada" a la vista.
  errorGuardado = null,
  // Vuelve a pedir el catálogo (p. ej. después de activar un combo acá).
  onRecargarCatalogo = null,
  // Precios tachados que esta landing ya tiene guardados, por item:
  // { "producto:12": 250000 }. Viven en landing_items, no en el producto.
  anclasIniciales = {},
  // Acciones de la landing ya guardada (null hasta que "venta" esté
  // configurada): publicar, eliminar, y abrir el editor de código crudo
  // (HTML/CSS/JS, Secciones, Footer) para quien lo necesite. Guardar no
  // viene de afuera: hay un solo botón y siempre guarda todo (confirmar).
  publicUrl = null,
  landingActiva = false,
  onPublicar = null,
  onEliminar = null,
  onAbrirCodigo = null,
}) {
  const ventaInicial = inicial?.venta || {};
  const limiteProductosManual = Number(landing?.limites?.items_manual) || MAX_PRODUCTOS_MANUAL;
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
  const [desbloqueadoManual, setDesbloqueadoManual] = useState(false);
  const [confirmarResetInicio, setConfirmarResetInicio] = useState(false);
  const [avisoResetInicio, setAvisoResetInicio] = useState('');

  const esGeneradoIa = Boolean(
    landing?.content?.generado_por_ia ||
    landing?.content?.origen === 'mcp' ||
    landing?.content?.bloques_inicio_bloqueados ||
    landing?.content?.codigo?.generado_por_mcp ||
    codigos?.inicio?.generado_por_mcp
  );
  const bloquesInicioBloqueados = MCP_EDITOR_HABILITADO && esGeneradoIa && !desbloqueadoManual
    && landing?.content?.bloques_inicio_bloqueados !== false;

  function resetearPaginaInicio() {
    const base = plantillaInicioPara(tipo);
    setDesbloqueadoManual(true);
    setConfirmarResetInicio(false);
    if (onRestaurarCodigo) {
      onRestaurarCodigo('inicio');
    }
    if (onCambiarCodigo) {
      onCambiarCodigo('inicio', 'html', base.html);
      onCambiarCodigo('inicio', 'css', base.css || '');
      onCambiarCodigo('inicio', 'js', base.js || '');
    }
    setAvisoResetInicio('Página de Inicio reseteada a la plantilla por defecto. Todos los bloques estándar están desbloqueados para editar.');
  }

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
  }])), ...presentacionGuardada(ventaInicial.presentacion_productos) }));
  const [fichaCompartida, setFichaCompartida] = useState(() => ventaInicial.ficha_compartida || {});
  const [todasLasFichas, setTodasLasFichas] = useState(false);
  const [seleccionMultipleFichas, setSeleccionMultipleFichas] = useState(false);
  const [fichasMarcadas, setFichasMarcadas] = useState(() => new Set());
  const [filtrosCatalogo, setFiltrosCatalogo] = useState(() => ventaInicial.catalogo_filtros || {});
  const [paymentLogosCatalogo, setPaymentLogosCatalogo] = useState(PAYMENT_LOGOS_DEFAULT);
  const [pagoLogos, setPagoLogos] = useState(() => {
    if (Array.isArray(ventaInicial.payment_logos)) {
      return {
        ...Object.fromEntries(PAYMENT_LOGOS_DEFAULT.map(logo => [logo.clave, false])),
        ...Object.fromEntries(ventaInicial.payment_logos.map(logo => [logo.clave, logo.activo !== false])),
      };
    }
    const legacy = ventaInicial.pago_logos || {};
    const tieneLegacy = legacy && typeof legacy === 'object' && Object.keys(legacy).length > 0;
    return Object.fromEntries(PAYMENT_LOGOS_DEFAULT.map(logo => [
      logo.clave,
      tieneLegacy ? (Object.prototype.hasOwnProperty.call(legacy, logo.grupo) && legacy[logo.grupo] !== false) : true,
    ]));
  });
  useEffect(() => {
    let vivo = true;
    landingSimpleService.listarPaymentLogos()
      .then(logos => {
        if (!vivo || !Array.isArray(logos) || !logos.length) return;
        setPaymentLogosCatalogo(logos);
        setPagoLogos(prev => ({
          ...Object.fromEntries(logos.map(logo => [logo.clave,
            Object.prototype.hasOwnProperty.call(prev, logo.clave)
              ? prev[logo.clave] !== false
              : Array.isArray(ventaInicial.payment_logos)
                ? ventaInicial.payment_logos.some(guardado => guardado.clave === logo.clave && guardado.activo !== false)
                : true,
          ])),
          ...prev,
        }));
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  const productosSoloDesdeProductos = false;
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
  // Lo que se ve en la ficha es lo que está escrito acá: sin texto, o con
  // "Mostrar" destildado, ese renglón no se dibuja (ver textosRecomendados).
  const [recoTitulo, setRecoTitulo] = useState(() => textosRecomendados(ventaInicial.recomendados).titulo);
  const [recoKicker, setRecoKicker] = useState(() => textosRecomendados(ventaInicial.recomendados).kicker);
  const [recoSubtitulo, setRecoSubtitulo] = useState(() => textosRecomendados(ventaInicial.recomendados).subtitulo);
  const [recoCta, setRecoCta] = useState(() => textosRecomendados(ventaInicial.recomendados).cta_texto);
  const [recoMostrar, setRecoMostrar] = useState(() => textosRecomendados(ventaInicial.recomendados).mostrar);
  const checkoutRecoInicial = ventaInicial.checkout_recomendados || {};
  const [checkoutRecoActivo, setCheckoutRecoActivo] = useState(checkoutRecoInicial.activo !== false);
  const [checkoutRecoItems, setCheckoutRecoItems] = useState(() => (
    Array.isArray(checkoutRecoInicial.items)
      ? checkoutRecoInicial.items.map(item => (typeof item === 'object' ? (item.id || item.content_id || item.contentId) : item)).filter(Boolean)
      : []
  ));
  const [checkoutRecoMax, setCheckoutRecoMax] = useState(checkoutRecoInicial.max || 4);
  const [checkoutRecoTitulo, setCheckoutRecoTitulo] = useState(checkoutRecoInicial.mostrar?.titulo === false ? '' : (checkoutRecoInicial.titulo || 'También te puede interesar'));
  const [checkoutRecoKicker, setCheckoutRecoKicker] = useState(checkoutRecoInicial.mostrar?.kicker === false ? '' : (checkoutRecoInicial.kicker || 'Antes de cerrar'));
  const [checkoutRecoSubtitulo, setCheckoutRecoSubtitulo] = useState(checkoutRecoInicial.subtitulo || '');
  const [checkoutRecoCta, setCheckoutRecoCta] = useState(checkoutRecoInicial.mostrar?.cta === false ? '' : (checkoutRecoInicial.cta_texto || 'Agregar'));
  const [checkoutRecoPreciosAntes, setCheckoutRecoPreciosAntes] = useState(() => (
    checkoutRecoInicial.precio_antes && typeof checkoutRecoInicial.precio_antes === 'object'
      ? checkoutRecoInicial.precio_antes
      : {}
  ));

  // Countdown de oferta y estadísticas: pueden ser datos reales confirmados
  // o contenido de ejemplo/generado por IA. Si quedan sin confirmar, publicar
  // pide una aceptación explícita; no bloquea ni inventa una fecha demo.
  const [urgenciaActiva, setUrgenciaActiva] = useState(ventaInicial.urgencia?.activo !== false);
  const [urgenciaFinAt, setUrgenciaFinAt] = useState(() => isoParaInputLocal(ventaInicial.urgencia?.fin_at));
  const [urgenciaProductoId, setUrgenciaProductoId] = useState(ventaInicial.urgencia?.producto_id || '');
  const [urgenciaConfirmar, setUrgenciaConfirmar] = useState(ventaInicial.urgencia?.estado === 'confirmado');
  // Con "renovar cada visita", el runtime ignora fin_at y cuenta esta
  // duración desde que cada visitante entra a la página (se renueva sola).
  const [urgenciaRenovar, setUrgenciaRenovar] = useState(!!ventaInicial.urgencia?.renovar_cada_visita);
  const [urgenciaDuracionHoras, setUrgenciaDuracionHoras] = useState(ventaInicial.urgencia?.duracion_horas ?? 2);
  const [urgenciaDuracionMinutos, setUrgenciaDuracionMinutos] = useState(ventaInicial.urgencia?.duracion_minutos ?? 0);
  const [urgenciaDuracionSegundos, setUrgenciaDuracionSegundos] = useState(ventaInicial.urgencia?.duracion_segundos ?? 0);
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
  const [modoPreview, setModoPreview] = useState('venta');
  const [paginaLegal, setPaginaLegal] = useState('politica_privacidad');
  const esPaginaLegal = modoPreview === 'legales';
  const [filtroPreview, setFiltroPreview] = useState(null);
  const [productoPreview, setProductoPreview] = useState(null); // content_id
  const [comboBloqueActivo, setComboBloqueActivo] = useState(null);
  const [comboBloquePedido, setComboBloquePedido] = useState(null);
  const [resaltado, setResaltado] = useState(null); // { lista, n }
  const [avisoPreview, setAvisoPreview] = useState('');
  const [previewMovil, setPreviewMovil] = useState(false);
  const [dispositivo, setDispositivo] = useState('escritorio'); // 'movil' | 'escritorio'
  const [verDetalleError, setVerDetalleError] = useState(false);
  const [previewAmpliada, setPreviewAmpliada] = useState(false);
  // Paneles ocultos: sin "Configurar tienda" ni la cabecera de la vista
  // previa (pantallas, producto, avisos); queda solo la landing a todo el
  // ancho para verla sin ruido. Se vuelve con el mismo botón.
  const [panelesOcultos, setPanelesOcultos] = useState(false);
  const [seccionConfig, setSeccionConfig] = useState('inicio'); // 'inicio' | 'categorias' | 'fichas' | 'checkout' | 'ofertas' | 'combos'
  const [categoriaPreview, setCategoriaPreview] = useState('');
  const [productoEditando, setProductoEditando] = useState(null); // content_id
  const [promoEditando, setPromoEditando] = useState(null); // content_id
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

  const recargarLandingDesdeServidor = useCallback(async () => {
    if (!landing?.id || !onCambiarCodigo) return;
    try {
      const actualizada = await landingSimpleService.obtener(landing.id);
      if (actualizada?.content?.codigo) {
        onCambiarCodigo('inicio', 'html', actualizada.content.codigo.html || '');
        onCambiarCodigo('inicio', 'css', actualizada.content.codigo.css || '');
        onCambiarCodigo('inicio', 'js', actualizada.content.codigo.js || '');
      }
      const vistas = actualizada?.content?.vistas || {};
      Object.keys(vistas).forEach(vk => {
        if (vk === 'productos') {
          Object.entries(vistas.productos || {}).forEach(([cid, c]) => {
            onCambiarCodigo(`propia:${cid}`, 'html', c?.html || '');
            onCambiarCodigo(`propia:${cid}`, 'css', c?.css || '');
            onCambiarCodigo(`propia:${cid}`, 'js', c?.js || '');
          });
        } else if (vk === 'legales') {
          Object.entries(vistas.legales || {}).forEach(([tipo, codigo]) => {
            for (const parte of ['html', 'css', 'js']) onCambiarCodigo(`legal:${tipo}`, parte, codigo?.[parte] || '');
          });
        } else {
          onCambiarCodigo(vk, 'html', vistas[vk]?.html || '');
          onCambiarCodigo(vk, 'css', vistas[vk]?.css || '');
          onCambiarCodigo(vk, 'js', vistas[vk]?.js || '');
        }
      });
      setAvisoPreview('Vista previa sincronizada con los cambios de Claude / Codex.');
    } catch {
      setError('No se pudo sincronizar la landing desde el servidor.');
    }
  }, [landing?.id, onCambiarCodigo]);

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
  const excedeManual = !esRegla && seleccion.length > limiteProductosManual;
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
  // Toda la selección de la landing por content_id (sin tope): los buscadores
  // paginados (Productos, destacados, recomendados…) muestran solo esta lista.
  const itemsLandingPorContentId = useMemo(() => {
    const mapa = new Map();
    seleccion.forEach(i => mapa.set(contentIdPanel(i), i));
    return mapa;
  }, [seleccion]);
  const destacadosValidos = useMemo(
    () => destacados.filter(id => itemsLandingPorContentId.has(id)).slice(0, MAX_DESTACADOS),
    [destacados, itemsLandingPorContentId],
  );
  // El catálogo del panel viene liviano: sin beneficios, garantías, opiniones
  // ni preguntas del producto. Se piden a demanda para la ficha que se ve o
  // se edita, así los bloques arrancan con lo cargado en Productos (ej. el
  // JSON de la IA) y no con los textos de ejemplo. Van DEBAJO de lo que la
  // landing pisa, y no entran en `seleccion`: no se guardan con la landing.
  const [fichasProducto, setFichasProducto] = useState({});
  const [cargandoCombosInicio, setCargandoCombosInicio] = useState({});
  const [erroresCombosInicio, setErroresCombosInicio] = useState({});
  const fichasPedidas = useRef(new Set());
  const pedirFichaProducto = useCallback((item) => {
    if (!item || fichasPedidas.current.has(claveItem(item))) return;
    fichasPedidas.current.add(claveItem(item));
    if (item.tipo === 'combo') {
      setCargandoCombosInicio(prev => ({ ...prev, [claveItem(item)]: true }));
      setErroresCombosInicio(prev => ({ ...prev, [claveItem(item)]: false }));
      Promise.resolve().then(() => comboAdminService.obtener(item.id))
        .then(p => { if (!p) throw new Error('No se recibió el detalle del combo.'); setFichasProducto(prev => ({ ...prev, [claveItem(item)]: contenidoCombo(p) })); })
        .catch(() => { fichasPedidas.current.delete(claveItem(item)); setErroresCombosInicio(prev => ({ ...prev, [claveItem(item)]: true })); })
        .finally(() => setCargandoCombosInicio(prev => ({ ...prev, [claveItem(item)]: false })));
      return;
    }
    Promise.resolve()
      .then(() => Promise.all([productService.detalle(item.id), productService.faq(item.id).catch(() => [])]))
      .then(([p, faq]) => setFichasProducto(prev => ({ ...prev, [claveItem(item)]: {
        propuesta_valor: p?.propuesta_valor || null,
        sobre_este_producto: p?.sobre_este_producto || null,
        beneficios: Array.isArray(p?.beneficios) ? p.beneficios : [],
        confianza: Array.isArray(p?.confianza) ? p.confianza : [],
        ficha_datos: p?.ficha_datos || {},
        faq: (Array.isArray(faq) ? faq : []).map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta })),
      } })))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (seccionConfig !== 'inicio' || inicioComercial.bloques.find(b => b.tipo === 'combos')?.visible === false) return;
    const cfg = inicioComercial.combos;
    const ids = new Set(cfg.items);
    seleccion.filter(i => i.tipo === 'combo' && (cfg.modo !== 'manual' || ids.has(contentIdPanel(i))))
      .slice(0, Math.min(48, Math.max(8, cfg.limite))).forEach(item => {
        if (!contenidoCombo(item).productos_combo.length) pedirFichaProducto(item);
      });
  }, [seccionConfig, seleccion, inicioComercial.combos, inicioComercial.bloques, pedirFichaProducto]);
  const candidatosDatosProducto = useMemo(() => {
    const base = seleccion;
    return base.map(i => {
      const ficha = fichasProducto[claveItem(i)];
      if (i.tipo === 'combo') return { ...combinarDetalleCombo(i, ficha), content_id: contentIdPanel(i) };
      const delProducto = { ...ficha, ...presentacionDelProducto(ficha?.ficha_datos) };
      // Un texto que la landing guardó vacío no pisa el del producto: la
      // ficha publicada también cae al del producto en ese caso.
      const propio = Object.fromEntries(Object.entries({ ...i, ...presentacion[claveItem(i)] })
        .filter(([campo, valor]) => (valor !== '' && valor != null) || !(campo in delProducto)));
      const compartidos = combinarFichaCompartida(i.tipo === 'producto' ? fichaCompartida : null, presentacion[claveItem(i)] || {});
      return { ...delProducto, ...propio, ...compartidos, content_id: contentIdPanel(i) };
    });
  }, [seleccion, presentacion, fichasProducto, fichaCompartida]);
  const candidatosCombosInicio = useMemo(() => {
    const elegidos = new Map(candidatosDatosProducto.filter(i => i.tipo === 'combo').map(i => [Number(i.id), i]));
    return catalogoActual.combos.map(c => {
      const item = elegidos.get(Number(c.id)) || combinarDetalleCombo({ ...c, tipo: 'combo' }, fichasProducto[`combo:${c.id}`]);
      return { ...item, en_landing: elegidos.has(Number(c.id)), puede_incluir: !esRegla || modo === 'todos' || categorias.has(item.categoria) };
    }).filter(i => i.mostrar_en_inicio !== false);
  }, [catalogoActual.combos, candidatosDatosProducto, fichasProducto, esRegla, modo, categorias]);
  // Colecciones de la landing (etiquetas), con cuántos productos tiene cada
  // una; "Oferta" entra sola si hay productos con descuento, como en el
  // runtime (etiquetasDisponiblesCatalogo).
  const coleccionesLandingDisponibles = useMemo(() => {
    const conteo = new Map();
    const sumar = (nombre) => {
      const ya = [...conteo.keys()].find(k => normalizarTexto(k) === normalizarTexto(nombre));
      conteo.set(ya || nombre, (conteo.get(ya || nombre) || 0) + 1);
    };
    candidatosDatosProducto.forEach((i) => {
      const etiquetas = String(i.etiqueta || '').split(',').map(t => t.trim()).filter(Boolean);
      etiquetas.forEach(sumar);
      const precio = Number(precioDeVenta(i)) || Number(precioPanel(i)) || 0;
      const ancla = Number(i.precio_ancla ?? i.precio_tachado) || 0;
      if (ancla > precio && precio > 0 && !etiquetas.some(t => normalizarTexto(t) === 'oferta')) sumar('Oferta');
    });
    return [...conteo.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [candidatosDatosProducto]);
  const productoConfigActual = useMemo(
    () => candidatosDatosProducto.find(i => i.content_id === productoEditando) || null,
    [candidatosDatosProducto, productoEditando],
  );
  const categoriaPreviewEsTodas = !categoriaPreview;
  const resolverContentIdProducto = useCallback((id) => {
    const buscado = String(id || '');
    if (!buscado) return '';
    const encontrado = candidatosDatosProducto.find(i => {
      const contentId = String(i.content_id || contentIdPanel(i));
      return contentId === buscado
        || String(i.id) === buscado
        || String(i.slug || '') === buscado
        || `${i.tipo}:${i.id}` === buscado
        || `${i.tipo}:${i.referencia_id}` === buscado
        || `${i.tipo}-${i.referencia_id}` === buscado;
    });
    return encontrado ? (encontrado.content_id || contentIdPanel(encontrado)) : buscado;
  }, [candidatosDatosProducto]);
  const productoPromoEditando = useMemo(
    () => candidatosDatosProducto.find(i => i.content_id === promoEditando) || null,
    [candidatosDatosProducto, promoEditando],
  );
  const seleccionarProductoConfig = useCallback((contentId) => {
    if (/^combo-\d+$/.test(String(contentId))) setSeleccionMultipleFichas(false);
    setProductoEditando(contentId);
    setSeccionConfig('fichas');
    setVistaPreview('producto');
    setProductoPreview(contentId);
    setAvisoPreview('');
    setResaltado(null);
  }, []);
  const abrirPromoProducto = useCallback((contentId, vista = 'catalogo') => {
    setPromoEditando(contentId);
    setProductoEditando(contentId);
    setVistaPreview(vista);
    setProductoPreview(contentId);
    setAvisoPreview('');
    setResaltado(null);
  }, []);
  const idsDatosProducto = useMemo(
    () => new Set(candidatosDatosProducto.map(i => i.content_id)),
    [candidatosDatosProducto],
  );
  // Los mismos candidatos indexados para los buscadores paginados de la ficha
  // y de promos: esta lista define sus opciones disponibles.
  const datosProductoPorContentId = useMemo(
    () => new Map(candidatosDatosProducto.map(i => [i.content_id, i])),
    [candidatosDatosProducto],
  );
  const datosEdicionMultiple = useMemo(() => new Map(
    candidatosDatosProducto.filter(i => i.tipo === 'producto').map(i => [i.content_id, i]),
  ), [candidatosDatosProducto]);
  const datosProductoConCombos = candidatosDatosProducto.some(i => i.tipo !== 'producto');
  const fichasElegidas = candidatosDatosProducto.filter(i => i.tipo === 'producto' && (todasLasFichas || fichasMarcadas.has(i.content_id)));
  const editandoGrupo = seleccionMultipleFichas && fichasElegidas.length > 1;
  function alternarFichaSeleccionada(contentId) {
    if (!seleccionMultipleFichas) { seleccionarProductoConfig(contentId); return; }
    const siguientes = new Set(fichasElegidas.map(i => i.content_id));
    if (siguientes.has(contentId)) siguientes.delete(contentId); else siguientes.add(contentId);
    setTodasLasFichas(false);
    setFichasMarcadas(siguientes);
    const referencia = siguientes.has(contentId) ? contentId : (siguientes.has(productoEditando) ? productoEditando : [...siguientes][0]);
    seleccionarProductoConfig(referencia || null);
  }
  function cambiarFichaSeleccionada(campo, valor) {
    if (!productoConfigActual) return;
    if (!editandoGrupo) { cambiarPresentacion(productoConfigActual, campo, valor); return; }
    if (!['ficha_bloques', 'confianza', 'metodos_pago', 'payment_logos'].includes(campo)) return;
    const cambios = { [campo]: valor };
    const resultado = aplicarCambiosFichas({
      compartida: fichaCompartida, presentaciones: presentacion,
      cambios, todos: todasLasFichas && !datosProductoConCombos, claves: fichasElegidas.map(claveItem),
    });
    setFichaCompartida(resultado.compartida);
    setPresentacion(resultado.presentaciones);
  }
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

  function quitarManual(item) {
    const k = clave(item);
    setModo('manual');
    setManual(seleccion.filter(actual => clave(actual) !== k).map(clave));
    if (principal === k) setPrincipal(null);
    setAvisoPreview('Producto quitado de esta página de venta. No se eliminó del catálogo.');
    setResaltado(null);
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

  // Organizar productos (pestaña Categorías): marcar varios de una. Ver
  // OrganizadorProductos.jsx — todo cae en lo que la landing ya guarda.
  function aplicarOfertaMasiva(items, { pct, badge, finAt, titulo }) {
    if (pct) {
      setAnclas(prev => {
        const siguiente = { ...prev };
        items.forEach(item => {
          const ancla = precioAnclaPorDescuentoPromo(Number(precioDeVenta(item)) || Number(precioPanel(item)) || 0, pct);
          if (ancla) siguiente[claveItem(item)] = ancla;
        });
        return siguiente;
      });
    }
    setPresentacion(prev => {
      const siguiente = { ...prev };
      items.forEach(item => { siguiente[claveItem(item)] = { ...prev[claveItem(item)], insignia_principal: badge || '' }; });
      return siguiente;
    });
    if (finAt) {
      const ids = items.map(i => i.content_id || contentIdPanel(i));
      setUrgenciaActiva(true);
      setUrgenciaProductos(prev => [...prev, ...ids.filter(id => !prev.includes(id))].slice(0, MAX_PRODUCTOS_CONTADOR));
      setUrgenciaFinAt(finAt);
      // Lo eligió el comercio recién, con fecha concreta: es real.
      setUrgenciaConfirmar(true);
      if (titulo) setUrgenciaTitulo(titulo);
    }
    setVistaPreview('categoria');
    setAvisoPreview(`${items.length} producto${items.length === 1 ? '' : 's'} en oferta.`);
    setResaltado(null);
  }

  // Descuento REAL con vigencia (Organizar productos → "Descuento real"):
  // a diferencia de aplicarOfertaMasiva (ancla, solo local hasta Guardar),
  // esto pega directo al producto en el servidor — es un precio que se
  // cobra de verdad, no tiene sentido dejarlo en un borrador sin guardar.
  async function aplicarDescuentoRealMasivo(items, { pct, finAt }) {
    const ids = items.filter(i => i.tipo !== 'combo').map(i => i.id);
    if (!ids.length) return;
    await productService.descuentoMasivo(ids, { pct, finAt });
    await onRecargarCatalogo?.();
    setAvisoPreview(pct
      ? `Descuento real aplicado a ${ids.length} producto${ids.length === 1 ? '' : 's'} hasta ${new Date(finAt).toLocaleString('es-PY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
      : `Descuento real quitado de ${ids.length} producto${ids.length === 1 ? '' : 's'}.`);
  }

  // Quitar partes de la oferta/colección de varios productos (barra de
  // acciones o la × de cada marca en Organizar productos).
  //   descuento: sin precio tachado EN ESTA LANDING. Si el producto trae uno
  //     propio del catálogo, vaciar el de la landing lo hacía volver (el
  //     runtime cae a precio_tachado): se fija igual al precio, que no se
  //     muestra como descuento.
  //   badge: solo el que puso una oferta ("Nuevo" o uno propio queda), salvo
  //     que se pida quitar el badge explícitamente.
  //   colecciones: 'todas' o lista de nombres. "Oferta" como etiqueta también
  //     cuenta como oferta para el catálogo, así que quitar la oferta la saca.
  function limpiarMasivo(items, { descuento = false, contador = false, badge = false, badgeOferta = false, colecciones = null } = {}) {
    const ids = new Set(items.map(i => i.content_id || contentIdPanel(i)));
    if (descuento) {
      setAnclas(prev => {
        const siguiente = { ...prev };
        items.forEach(item => {
          const precio = Number(precioDeVenta(item)) || Number(precioPanel(item)) || 0;
          siguiente[claveItem(item)] = Number(item.precio_tachado) > precio && precio > 0 ? String(precio) : '';
        });
        return siguiente;
      });
    }
    if (badge || badgeOferta || colecciones || descuento) {
      setPresentacion(prev => {
        const siguiente = { ...prev };
        items.forEach(item => {
          const k = claveItem(item);
          const cambio = {};
          const insignia = prev[k]?.insignia_principal ?? item.insignia_principal ?? '';
          if (badge || (badgeOferta && BADGES_OFERTA.includes(insignia))) cambio.insignia_principal = '';
          let etiqueta = prev[k]?.etiqueta ?? item.etiqueta ?? '';
          if (colecciones === 'todas') etiqueta = '';
          else if (Array.isArray(colecciones)) colecciones.forEach(n => { etiqueta = sinEtiqueta(etiqueta, n); });
          if (descuento) etiqueta = sinEtiqueta(etiqueta, 'Oferta');
          cambio.etiqueta = etiqueta;
          siguiente[k] = { ...prev[k], ...cambio };
        });
        return siguiente;
      });
    }
    if (contador) setUrgenciaProductos(prev => prev.filter(id => !ids.has(id)));
    setVistaPreview('categoria');
    setAvisoPreview(`Cambios quitados de ${items.length} producto${items.length === 1 ? '' : 's'}.`);
    setResaltado(null);
  }

  function coleccionMasiva(items, nombre, quitar) {
    setPresentacion(prev => {
      const siguiente = { ...prev };
      items.forEach(item => {
        const k = claveItem(item);
        const actual = prev[k]?.etiqueta ?? item.etiqueta ?? '';
        siguiente[k] = { ...prev[k], etiqueta: quitar ? sinEtiqueta(actual, nombre) : conEtiqueta(actual, nombre) };
      });
      return siguiente;
    });
    setVistaPreview('categoria');
    setAvisoPreview(quitar
      ? `${items.length} producto${items.length === 1 ? '' : 's'} fuera de “${nombre}”.`
      : `${items.length} producto${items.length === 1 ? '' : 's'} en “${nombre}”.`);
    setResaltado(null);
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
  function cambiarEncabezado(cambio) {
    setInicioComercial(prev => ({
      ...prev,
      encabezado: normalizarEncabezadoInicio({ ...(prev.encabezado || {}), ...cambio }),
    }));
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
  function cambiarBannerTamano(tamano) {
    setInicioComercial(prev => ({ ...prev, banner_tamano: tamano }));
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
  // Arrastrar y soltar: `desde`/`hasta` son posiciones dentro de los bloques
  // MOVIBLES. La barra de anuncios queda siempre primera (y el encabezado y
  // el footer no están en esta lista: son fijos).
  function reordenarBloqueInicio(desde, hasta) {
    setInicioComercial(prev => {
      const fijos = prev.bloques.filter(b => b.tipo === BLOQUE_INICIO_FIJO);
      const movibles = prev.bloques.filter(b => b.tipo !== BLOQUE_INICIO_FIJO);
      if (desde === hasta || desde < 0 || hasta < 0 || desde >= movibles.length || hasta >= movibles.length) return prev;
      const [movido] = movibles.splice(desde, 1);
      movibles.splice(hasta, 0, movido);
      return { ...prev, bloques: [...fijos, ...movibles] };
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

  // ─── Testimonios del inicio ────────────────────────────────────────────
  function cambiarTestimoniosInicio(cambio) {
    setInicioComercial(prev => ({ ...prev, testimonios: { ...prev.testimonios, ...cambio } }));
  }
  function cambiarTestimonioInicio(id, cambio) {
    setInicioComercial(prev => ({
      ...prev,
      testimonios: {
        ...prev.testimonios,
        items: (prev.testimonios?.items || []).map(item => (item.id === id ? { ...item, ...cambio } : item)),
      },
    }));
  }
  function agregarTestimonioInicio() {
    setInicioComercial(prev => ({
      ...prev,
      testimonios: {
        ...prev.testimonios,
        items: [
          ...(prev.testimonios?.items || []),
          { id: uidComercial('testimonio'), nombre: '', detalle: '', comentario: '', foto: '', calificacion: 5 },
        ].slice(0, 8),
      },
    }));
    verDonde('inicio', 'testimonios_inicio');
  }
  function quitarTestimonioInicio(id) {
    setInicioComercial(prev => ({
      ...prev,
      testimonios: { ...prev.testimonios, items: (prev.testimonios?.items || []).filter(item => item.id !== id) },
    }));
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
  const recomendadosElegidos = useMemo(() => {
    const porId = new Map(candidatosReco.map(i => [i.content_id, i]));
    return recoItems.map(id => porId.get(id)).filter(Boolean);
  }, [candidatosReco, recoItems]);
  const idsCandidatosReco = useMemo(
    () => new Set(candidatosReco.map(i => i.content_id)),
    [candidatosReco],
  );
  const recoItemsValidos = useMemo(
    () => recoItems.filter(id => idsCandidatosReco.has(id)).slice(0, MAX_RECOMENDADOS_MANUALES),
    [recoItems, idsCandidatosReco],
  );
  useEffect(() => {
    if (recoItemsValidos.length !== recoItems.length) setRecoItems(recoItemsValidos);
  }, [recoItems, recoItemsValidos]);
  const checkoutRecoItemsValidos = useMemo(
    () => checkoutRecoItems.filter(id => idsCandidatosReco.has(id)).slice(0, MAX_RECOMENDADOS_MANUALES),
    [checkoutRecoItems, idsCandidatosReco],
  );
  useEffect(() => {
    if (checkoutRecoItemsValidos.length !== checkoutRecoItems.length) setCheckoutRecoItems(checkoutRecoItemsValidos);
  }, [checkoutRecoItems, checkoutRecoItemsValidos]);
  const checkoutRecoElegidos = useMemo(() => {
    const porId = new Map(candidatosReco.map(i => [i.content_id, i]));
    return checkoutRecoItemsValidos.map(id => porId.get(id)).filter(Boolean);
  }, [candidatosReco, checkoutRecoItemsValidos]);
  // Los dos se eligen con el buscador paginado: la vista previa se queda en
  // la pantalla donde aparecen y resalta la sección.
  function alternarRecomendado(contentId) {
    setRecoItems(prev => {
      if (prev.includes(contentId)) return prev.filter(x => x !== contentId);
      if (prev.length >= MAX_RECOMENDADOS_MANUALES) return prev;
      return [...prev, contentId];
    });
    setVistaPreview('producto');
    setAvisoPreview('');
    setResaltado({ lista: 'recomendados', n: 0 });
  }
  function alternarCheckoutReco(contentId) {
    setCheckoutRecoItems(prev => {
      if (prev.includes(contentId)) return prev.filter(x => x !== contentId);
      if (prev.length >= MAX_RECOMENDADOS_MANUALES) return prev;
      return [...prev, contentId];
    });
    setVistaPreview('checkout');
    setAvisoPreview('');
    setResaltado({ lista: 'checkout_recomendados', n: Date.now() });
  }
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
    // A diferencia de "marca" (arriba), acá no se apaga sin contenido: el
    // encabezado por defecto ("Opiniones" / "Clientes que ya compraron.")
    // tiene que verse siempre que el bloque esté en "Mostrar", vacío, para
    // que el comercio sepa que ahí va a cargar sus testimonios.
    testimonios: {
      ...inicioComercial.testimonios,
      activo: true,
      items: (inicioComercial.testimonios?.items || [])
        .filter(it => it && (it.nombre || it.comentario || it.foto))
        .slice(0, 8),
    },
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
    ...(Object.keys(fichaCompartida).length ? { ficha_compartida: fichaCompartida } : {}),
    presentacion_productos: Object.fromEntries(Object.entries(presentacion).map(([key, value]) => [key, {
      v: 2,
      ...Object.fromEntries(CAMPOS_TEXTO_FICHA.filter(campo => value[campo] != null).map(campo => [campo, value[campo]])),
      ...(value.ficha_bloques && typeof value.ficha_bloques === 'object' ? { ficha_bloques: value.ficha_bloques } : {}),
      ...(value.codigo_bloques && typeof value.codigo_bloques === 'object' ? { codigo_bloques: value.codigo_bloques } : {}),
      ...(value.ficha_combo && typeof value.ficha_combo === 'object' ? { ficha_combo: value.ficha_combo } : {}),
      ...(Array.isArray(value.textos_ocultos) ? { textos_ocultos: value.textos_ocultos } : {}),
      ...(Array.isArray(value.ficha_orden_mobile) ? { ficha_orden_mobile: value.ficha_orden_mobile } : {}),
      ...(Array.isArray(value.imagenes_landing) ? { imagenes_landing: value.imagenes_landing } : {}),
      ...(Array.isArray(value.beneficios) ? { beneficios: value.beneficios.filter(b => b && (b.titulo || b.texto)).slice(0, 8) } : {}),
      ...(Array.isArray(value.confianza) ? { confianza: value.confianza.filter(c => c && (c.icono || c.titulo || c.texto)).slice(0, 6) } : {}),
      ...(Array.isArray(value.botones_pago) ? { botones_pago: value.botones_pago.filter(b => b && (b.label || b.tipo || b.valor)).slice(0, 4) } : {}),
      ...(Array.isArray(value.payment_logos) ? { payment_logos: value.payment_logos.slice(0, 100) } : {}),
      ...(Array.isArray(value.metodos_pago) ? { metodos_pago: value.metodos_pago.filter(m => m && (m.texto || m.label)).slice(0, 8) } : {}),
      ...(Array.isArray(value.incluye_pedido) ? { incluye_pedido: value.incluye_pedido.filter(i => i && (i.texto || i.titulo)).slice(0, 8) } : {}),
      ...(Array.isArray(value.botones_contacto) ? { botones_contacto: value.botones_contacto.filter(b => b && (b.label || b.tipo || b.valor)).slice(0, 4) } : {}),
      ...(Array.isArray(value.opiniones) ? { opiniones: value.opiniones.filter(o => o && (o.nombre || o.comentario)).slice(0, 6) } : {}),
      ...(Array.isArray(value.preguntas) ? { preguntas: value.preguntas.filter(p => p && (p.pregunta || p.respuesta)).slice(0, 10) } : {}),
    }]).filter(([, value]) => Object.keys(value).some(key => key !== 'v'))),
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
      mostrar: recoMostrar,
    },
    checkout_recomendados: {
      activo: checkoutRecoActivo,
      items: checkoutRecoItemsValidos,
      max: checkoutRecoMax,
      titulo: checkoutRecoTitulo,
      kicker: checkoutRecoKicker,
      subtitulo: checkoutRecoSubtitulo,
      cta_texto: checkoutRecoCta,
      mostrar: { kicker: !!checkoutRecoKicker.trim(), titulo: !!checkoutRecoTitulo.trim(), subtitulo: !!checkoutRecoSubtitulo.trim(), cta: !!checkoutRecoCta.trim() },
      precio_antes: Object.fromEntries(
        Object.entries(checkoutRecoPreciosAntes || {})
          .filter(([id, valor]) => checkoutRecoItemsValidos.includes(id) && (Number(String(valor).replace(/\D/g, '')) || 0) > 0)
          .map(([id, valor]) => [id, Number(String(valor).replace(/\D/g, '')) || 0]),
      ),
    },
    urgencia: {
      activo: urgenciaActiva,
      fin_at: inputLocalAIso(urgenciaFinAt),
      producto_id: urgenciaProductosValidos.length ? null : (urgenciaProductoValido || null),
      productos: urgenciaProductosValidos,
      estado: urgenciaConfirmar || urgenciaRenovar ? 'confirmado' : 'demo',
      renovar_cada_visita: urgenciaRenovar,
      duracion_horas: Number(urgenciaDuracionHoras) || 0,
      duracion_minutos: Number(urgenciaDuracionMinutos) || 0,
      duracion_segundos: Number(urgenciaDuracionSegundos) || 0,
      titulo: urgenciaTitulo,
      texto: urgenciaTexto,
      cta_texto: urgenciaCta,
    },
    prueba_social: { activo: pruebaSocialActiva, producto_id: pruebaSocialProductoValido || null, items: pruebaSocialItems },
    pago_logos: pagoLogos,
    payment_logos: paymentLogosCatalogo
      .filter(logo => pagoLogos[logo.clave] !== false)
      .map(logo => ({
        clave: logo.clave,
        grupo: logo.grupo,
        nombre: logo.nombre,
        logo_url: logo.logo_url || logo.imagen,
        imagen: logo.logo_url || logo.imagen,
        orden: logo.orden || 0,
      })),
  }), [
    tipo, abrirEn, combosPrimero, destacadosValidos, inicioActual, confPaquetes, filtrosCatalogo, presentacion, fichaCompartida, principal, seleccion, modo, categorias, incluirCombos,
    crossActivo, ofertasElegidas, recoActivo, recoModo, recoItemsValidos, recoMax, recoTitulo, recoKicker, recoSubtitulo, recoCta, recoMostrar,
    checkoutRecoActivo, checkoutRecoItemsValidos, checkoutRecoMax, checkoutRecoTitulo, checkoutRecoKicker, checkoutRecoSubtitulo, checkoutRecoCta, checkoutRecoPreciosAntes,
    urgenciaActiva, urgenciaFinAt, urgenciaProductoValido, urgenciaProductosValidos, urgenciaConfirmar, urgenciaRenovar, urgenciaDuracionHoras, urgenciaDuracionMinutos, urgenciaDuracionSegundos, urgenciaTitulo, urgenciaTexto, urgenciaCta, pruebaSocialActiva, pruebaSocialProductoValido, pruebaSocialItems,
    pagoLogos, paymentLogosCatalogo,
  ]);

  // La ficha del producto que se está editando, resuelta con la MISMA función
  // que usan la vista previa y la tienda publicada. Cada bloque del panel
  // muestra exactamente el texto que sale en la página —el del producto, el
  // propio de esta landing o el de respaldo— y no una copia calculada aparte
  // (antes los beneficios, la descripción o las reseñas del producto se veían
  // en la página pero el bloque aparecía vacío o con textos de ejemplo).
  const fichaEfectiva = useMemo(() => {
    const base = seleccion.find(i => contentIdPanel(i) === productoEditando);
    if (!base) return null;
    return itemPanelARuntime({ ...fichasProducto[claveItem(base)], ...base }, [], () => null, ventaActual);
  }, [seleccion, productoEditando, fichasProducto, ventaActual]);

  // Conservar filas vacías mientras se escriben: el DTO de la preview las filtra.
  const fichaPropiaEdicion = productoConfigActual ? combinarFichaCompartida(
    productoConfigActual.tipo === 'producto' ? fichaCompartida : null, presentacion[claveItem(productoConfigActual)] || {},
  ) : {};
  const fichaGrupoEdicion = { ...fichaEfectiva, ...Object.fromEntries(
    ['confianza', 'metodos_pago', 'payment_logos'].filter(c => Array.isArray(fichaPropiaEdicion[c])).map(c => [c, fichaPropiaEdicion[c]]),
  ) };

  function alternarOferta(oferta) {
    setOfertasElegidas(prev => {
      const copia = new Set(prev);
      if (copia.has(oferta.id)) copia.delete(oferta.id); else copia.add(oferta.id);
      return copia;
    });
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
    setPanelOfertas({ producto: null, estrategia: 'combo', modo: 'combo' });
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
  const inicioEsBase = !esGeneradoIa && (!codigos?.inicio?.html?.trim()
    || codigos.inicio.html.includes(MARCA_CODIGO_INICIAL)
    || esBaseIntacta(codigos.inicio.html));
  const abreEnFicha = abrirEn === 'producto';
  const codigoInicioPreview = inicioEsBase ? plantillaInicioPara(tipo) : codigos.inicio;
  const codigoCatalogoPreview = conGlobalesHeredados(codigos?.catalogo?.html ? codigos.catalogo : PLANTILLA_CATALOGO, codigoInicioPreview);
  const codigoCategoriaPreview = conGlobalesHeredados(codigos?.categoria?.html ? codigos.categoria : PLANTILLA_CATEGORIA, codigoInicioPreview);
  const codigoFichaPreview = conGlobalesHeredados(
    esFichaProductoBase(codigos?.producto?.html) ? PLANTILLA_PRODUCTO : codigos.producto,
    codigoInicioPreview,
  );
  const codigoCheckoutPreview = conGlobalesHeredados(codigos?.checkout?.html ? codigos.checkout : PLANTILLA_CHECKOUT, codigoInicioPreview);
  const codigoLegalActual = codigos?.[`legal:${paginaLegal}`] || landing?.content?.vistas?.legales?.[paginaLegal] || plantillaLegalPara(paginaLegal, tienda);
  const textoLegalActual = useMemo(() => textoInicialFooter(paginaLegal, tienda, codigoLegalActual), [paginaLegal, codigoLegalActual.html, tienda]);
  function editarTextoLegal(html) {
    const codigo = codigoFooterDesdeTexto(paginaLegal, html, tienda);
    for (const parte of ['html', 'css', 'js']) onCambiarCodigo?.(`legal:${paginaLegal}`, parte, codigo[parte]);
  }
  const codigoPreviewActual = esPaginaLegal ? codigoLegalActual : abreEnFicha || vistaPreview === 'producto'
    ? codigoFichaPreview
    : vistaPreview === 'catalogo'
      ? codigoCatalogoPreview
      : vistaPreview === 'categoria'
        ? codigoCategoriaPreview
        : vistaPreview === 'checkout'
          ? codigoCheckoutPreview
          : codigoInicioPreview;

  // Los primeros MAX_PRODUCTOS_PREVIEW y, además, los que la configuración
  // nombra (productos por categoría, destacados, vitrinas…) aunque estén más
  // abajo en la lista — igual que primeraPaginaLienzo en el backend. Sin
  // esto, un producto elegido en "Productos" que cae después del corte no
  // aparecía en la vista previa (ni su categoría en las pestañas).
  // Los combos también viajan siempre para que el buscador y su pestaña
  // funcionen aunque estén después del recorte de productos.
  // También el de la ficha que se está mirando: se elige con el buscador
  // paginado y puede ser cualquiera del catálogo.
  const productosPreview = useMemo(() => {
    const referidos = contentIdsReferidosVenta(ventaActual);
    const enFicha = resolverContentIdProducto(productoPreview);
    const lista = seleccion.filter((i, idx) => i.tipo === 'combo' || idx < MAX_PRODUCTOS_PREVIEW
      || referidos.has(contentIdPanel(i)) || referidos.has(`${i.tipo}-${i.id}`)
      || (enFicha && contentIdPanel(i) === enFicha));
    return lista.map(i => i.tipo === 'combo' ? combinarDetalleCombo(i, fichasProducto[claveItem(i)])
      : (fichasProducto[claveItem(i)] ? { ...fichasProducto[claveItem(i)], ...i } : i));
  }, [seleccion, fichasProducto, ventaActual, productoPreview, resolverContentIdProducto]);
  const productoFicha = useMemo(() => {
    const productosSolos = productosPreview.filter(p => p.tipo === 'producto');
    const contentId = resolverContentIdProducto(productoPreview);
    return productosPreview.find(p => contentIdPanel(p) === contentId) || productosSolos[0] || productosPreview[0] || null;
  }, [productosPreview, productoPreview, resolverContentIdProducto]);
  const fichaEnPreview = abreEnFicha || vistaPreview === 'producto' ? productoFicha : null;
  useEffect(() => {
    pedirFichaProducto(productoConfigActual);
    pedirFichaProducto(fichaEnPreview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoConfigActual?.id, productoConfigActual?.tipo, fichaEnPreview?.id, fichaEnPreview?.tipo, pedirFichaProducto]);

  const pagoparConectado = usePagoparConectado();
  const rotulosInicio = useMemo(() => {
    if (bloquesInicioBloqueados) return {};
    const bloques = inicioComercial.bloques;
    const orden = [
      ...bloques.filter(b => b.tipo === BLOQUE_INICIO_FIJO),
      { tipo: 'encabezado' },
      ...bloques.filter(b => b.tipo !== BLOQUE_INICIO_FIJO),
    ];
    return Object.fromEntries(orden.map((b, i) => [b.tipo, `${i + 1} · ${b.tipo === 'encabezado' ? 'Encabezado' : ETIQUETAS_BLOQUE_INICIO[b.tipo] || b.tipo}`]));
  }, [inicioComercial.bloques, bloquesInicioBloqueados]);
  const datosPreview = useMemo(() => datosRuntimePreview({
    productos: productosPreview,
    productosCategorias: seleccion,
    tienda,
    landing,
    venta: ventaActual,
    vista: abreEnFicha ? 'producto' : vistaPreview,
    categoria: vistaPreview === 'categoria' ? (categoriaPreview ? categoriaPreviewValida : TODAS_CATEGORIAS) : null,
    productoId: abreEnFicha && vistaPreview === 'inicio' && seleccion[0]
      ? contentIdPanel(seleccion[0])
      : (productoFicha ? contentIdPanel(productoFicha) : null),
    ofertas: ofertasConImagen,
    pagoparConectado,
    bloquesEditor: ROTULOS_BLOQUES_FICHA,
    bloquesInicioEditor: rotulosInicio,
    filtro: filtroPreview,
  }), [productosPreview, tienda, landing, ventaActual, vistaPreview, categoriaPreviewValida, productoFicha, ofertasConImagen, abreEnFicha, seleccion, pagoparConectado, rotulosInicio, filtroPreview]);

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

  // Clic sobre un bloque de la ficha en la vista previa: abre ese bloque en
  // el panel, para el producto que se está viendo.
  const [bloqueFichaAbierto, setBloqueFichaAbierto] = useState(null); // { clave, n }
  const [bloqueInicioAbierto, setBloqueInicioAbierto] = useState(null);
  const alBloquePreview = useCallback((zona) => {
    if (vistaPreview === 'inicio' && !abreEnFicha) {
      if (!rotulosInicio[zona]) return;
      setPanelesOcultos(false);
      setPreviewMovil(false);
      setPreviewAmpliada(false);
      setSeccionConfig('inicio');
      setBloqueInicioAbierto({ clave: zona === 'encabezado' ? '__menu__' : zona, n: Date.now() });
      return;
    }
    if (productoFicha?.tipo === 'combo' && bloquePadreCombo(zona)) {
      setPanelesOcultos(false); setPreviewMovil(false); setPreviewAmpliada(false);
      setSeccionConfig('fichas'); setSeleccionMultipleFichas(false);
      setProductoEditando(contentIdPanel(productoFicha));
      setComboBloqueActivo(zona); setComboBloquePedido({ clave: zona, n: Date.now() });
      return;
    }
    const clave = bloqueDeZona(zona);
    const contentId = productoFicha ? contentIdPanel(productoFicha) : null;
    if (!clave || !contentId) return;
    // El panel tiene que quedar a la vista: se cierran la vista previa a
    // pantalla completa y la del celular, que lo tapan.
    setPanelesOcultos(false);
    setPreviewMovil(false);
    setPreviewAmpliada(false);
    setSeccionConfig('fichas');
    setProductoEditando(contentId);
    setProductoPreview(contentId);
    setBloqueFichaAbierto({ clave, n: Date.now() });
  }, [productoFicha, vistaPreview, abreEnFicha, rotulosInicio]);

  const alNavegarPreview = useCallback((p) => {
    const legalDestino = p?.destino === 'pagina' && PAGINAS_LEGALES_CODIGO.find(pagina => pagina.ruta === p.pagina || pagina.key === p.pagina);
    if (legalDestino) {
      setPaginaLegal(legalDestino.key); setModoPreview('legales'); setResaltado(null); setAvisoPreview('');
      return;
    }
    setModoPreview('venta');
    if (p?.destino === 'producto') {
      const contentId = resolverContentIdProducto(p.producto);
      setVistaPreview('producto');
      setSeccionConfig('fichas');
      setProductoEditando(contentId);
      setProductoPreview(contentId);
      setResaltado(null);
    }
    else if (p?.destino === 'inicio') { setVistaPreview('inicio'); setSeccionConfig('inicio'); setResaltado(null); setFiltroPreview(null); }
    else if (p?.destino === 'categoria') { setVistaPreview('categoria'); setSeccionConfig('categorias'); setCategoriaPreview(p.categoria || ''); setResaltado(null); }
    else if (p?.destino === 'catalogo') { setVistaPreview('categoria'); setSeccionConfig('categorias'); setCategoriaPreview(''); setResaltado(null); }
    else if (p?.destino === 'checkout') { setVistaPreview('checkout'); setSeccionConfig('checkout'); setResaltado(null); }
    else if (p?.destino === 'pagina' && p.pagina === 'catalogo') {
      setVistaPreview(p?.filtro?.etiqueta || p?.filtro?.tipo ? 'catalogo' : 'categoria');
      setFiltroPreview(p?.filtro || null);
      setSeccionConfig('categorias');
      setResaltado(null);
      setCategoriaPreview('');
      if (p?.filtro?.etiqueta) setAvisoPreview(`En la tienda publicada abre el catálogo filtrado por ${p.filtro.etiqueta}.`);
      else if (p?.filtro?.tipo === 'combo') setAvisoPreview('Catálogo filtrado: solo combos.');
    }
    else if (p?.destino === 'pagina' && p.pagina === 'checkout') { setVistaPreview('checkout'); setSeccionConfig('checkout'); setResaltado(null); }
  }, [resolverContentIdProducto]);
  const alComprarPreview = useCallback((p) => {
    setAvisoPreview(p?.checkout_directo
      ? 'En la tienda publicada, abre el checkout con pago anticipado seleccionado. El descuento se retira si el cliente elige pago contra entrega.'
      : p?.oferta
      ? 'En la landing publicada, esto agrega la oferta al carrito.'
      : 'En la landing publicada, esto agrega el producto y abre el carrito.');
  }, []);
  const alCarritoPreview = useCallback(() => {
    setAvisoPreview('En la landing publicada, esto abre el carrito.');
  }, []);

  // Lo que impide guardar, dicho como qué falta hacer.
  const bloqueo = (() => {
    if (urgenciaActiva && urgenciaRenovar && !(Number(urgenciaDuracionHoras) * 3600 + Number(urgenciaDuracionMinutos) * 60 + Number(urgenciaDuracionSegundos) > 0)) return 'La duración de la oferta debe ser mayor que cero.';
    if (urgenciaActiva && !urgenciaRenovar && urgenciaProductosValidos.length && !inputLocalAIso(urgenciaFinAt)) return 'Elegí una fecha y hora de fin para la oferta, o activá la renovación en cada visita.';
    if (modo === 'categoria' && !categorias.size) return 'Elegí al menos una categoría.';
    if (excedeManual) return `Esta landing tiene más de ${limiteProductosManual} productos. Reducí la selección desde Productos.`;
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
        checkout_recomendados: { ...ventaActual.checkout_recomendados, items: checkoutRecoItems.filter(id => idsSeleccion.has(id)) },
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
        ...(urgenciaConfirmar || urgenciaRenovar ? { urgencia: true } : {}),
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
  // Cada texto de la sección con su "Mostrar": destildado u vacío, no sale.
  const campoTextoReco = (clave, titulo, valor, onValor, { max, area = false, ejemplo, ancho = '' }) => {
    const visible = recoMostrar[clave] !== false;
    const clases = `w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary ${area ? 'py-2' : 'h-10'} ${visible ? '' : 'opacity-50'}`;
    const comunes = { value: valor, onChange: e => onValor(e.target.value), maxLength: max, placeholder: `Ej: ${ejemplo}`, 'aria-label': titulo, className: clases };
    return (
      <div key={clave} className={ancho}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-fg">{titulo}</span>
          <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-fg-muted">
            <input
              type="checkbox"
              className="accent-primary"
              checked={visible}
              onChange={e => setRecoMostrar(prev => ({ ...prev, [clave]: e.target.checked }))}
              aria-label={`Mostrar ${titulo.toLowerCase()}`}
            />
            Mostrar
          </label>
        </div>
        {area ? <textarea rows={2} {...comunes} /> : <input {...comunes} />}
        {visible && !String(valor || '').trim() && <p className="mt-1 text-xs text-fg-muted">Vacío: no se muestra en la ficha.</p>}
      </div>
    );
  };
  const camposTextoReco = [
    campoTextoReco('kicker', 'Rótulo superior', recoKicker, setRecoKicker, { max: 50, ejemplo: 'Te puede gustar' }),
    campoTextoReco('titulo', 'Título de la sección', recoTitulo, setRecoTitulo, { max: 80, ejemplo: 'Productos recomendados' }),
    campoTextoReco('subtitulo', 'Subtítulo', recoSubtitulo, setRecoSubtitulo, { max: 180, area: true, ejemplo: 'Elegí complementos para seguir comprando.', ancho: 'sm:col-span-2' }),
    campoTextoReco('cta', 'Texto del botón', recoCta, setRecoCta, { max: 40, ejemplo: 'Agregar' }),
  ];
  const bloqueRecomendadosFicha = recoActivo ? (
    <div className="space-y-4">
      <button
        type="button"
        onClick={verRecomendados}
        className="text-xs font-medium text-primary-text hover:underline"
      >
        Ver dónde aparece
      </button>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {camposTextoReco}
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
            onClick={() => setRecoModo(k)}
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
                <p className="text-xs text-fg-muted">Buscá y tocá los productos que querés recomendar ({recoItemsValidos.length} de hasta {MAX_RECOMENDADOS_MANUALES}).</p>
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
            </div>
            <SelectorProductosPaginado
              elegidos={recoItemsValidos}
              enLanding={itemsLandingPorContentId}
              incluirCombos={incluirCombos}
              maximo={MAX_RECOMENDADOS_MANUALES}
              onAlternar={alternarRecomendado}
            />
            {recomendadosElegidos.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-surface">
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-fg">Precio tachado de recomendados</p>
                  <p className="mt-0.5 text-xs text-fg-muted">Opcional. Se guarda para ese producto en esta landing.</p>
                </div>
                <ul className="divide-y divide-border">
                  {recomendadosElegidos.map(item => (
                    <li key={item.content_id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Miniatura item={item} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-fg">{item.nombre}</span>
                          <span className="block text-xs text-fg-muted tabular-nums">{formatearGs(precioDeVenta(item))}</span>
                        </span>
                      </span>
                      <PrecioAncla
                        id={`ancla-reco-${claveItem(item)}`}
                        venta={precioDeVenta(item)}
                        valor={anclas[claveItem(item)] ?? ''}
                        onCambiar={v => setAnclas(prev => ({ ...prev, [claveItem(item)]: v }))}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      )}
    </div>
  ) : (
    <p className="text-sm text-fg-muted">Activá “Mostrar” para configurar productos recomendados en la ficha.</p>
  );

  const propsVistaPrevia = {
    modo: modoPreview,
    onModo: setModoPreview,
    paginaLegal,
    onPaginaLegal: setPaginaLegal,
    vista: esPaginaLegal ? `legal:${paginaLegal}` : vistaPreview,
    onVista: v => { setVistaPreview(v); setFiltroPreview(null); setSeccionConfig(seccionConfigDeVista(v)); if (v === 'categoria') setCategoriaPreview(''); setResaltado(null); setAvisoPreview(''); },
    productos: productosPreview,
    productoFicha,
    onProducto: id => { seleccionarProductoConfig(id); setResaltado(null); },
    codigo: codigoPreviewActual,
    codigoInicio: codigoInicioPreview,
    datos: esPaginaLegal ? { ...datosPreview, vista: 'legal' } : datosPreview,
    content: { ...landing?.content, venta: ventaActual },
    comboBloqueActivo,
    onComboActivo: setComboBloqueActivo,
    resaltado: esPaginaLegal ? null : resaltado,
    aviso: esPaginaLegal ? 'Editá el texto a la izquierda. Los cambios se ven acá y se publican al guardar.' : avisoPreview,
    inicioEsBase,
    disenoPendienteIA,
    onNavegar: alNavegarPreview,
    onComprar: alComprarPreview,
    onCarrito: alCarritoPreview,
    onBloque: alBloquePreview,
    dispositivo,
    onDispositivo: setDispositivo,
  };
  const vistaPrevia = <VistaPrevia {...propsVistaPrevia} compacta onAmpliar={() => setPreviewAmpliada(true)} />;

  return (
    <div className="ecommerce-builder h-full min-h-0 w-full overflow-hidden flex flex-col bg-canvas">
      {/* Barra superior: siempre a la vista, con las acciones de la landing
          ya guardada. Reemplaza al antiguo editor de código como pantalla
          de entrada — esas acciones (publicar, guardar, eliminar) vivían
          ahí y ahora viven acá. */}
      {/* Sin "Volver": mandaba a /landing, que con una landing existente
          redirige de vuelta acá — el botón no hacía nada. */}
      <div hidden={panelesOcultos} className="ecommerce-builder-toolbar shrink-0 border-b border-border bg-surface px-4 md:px-6 py-2.5 flex items-center justify-end gap-3">
        <div className="ecommerce-save-context mr-auto min-w-0 text-sm text-fg-muted" role="note" aria-label="Alcance del guardado">
          <strong className="text-fg">{landingActiva ? 'Publicado' : 'Sin publicar'}</strong>
          <span className="block">{landingActiva ? 'Guardar actualiza la tienda publicada.' : 'Guardar conserva los cambios; Publicar habilita el acceso público.'}</span>
          {(landing?.updatedAt || landing?.updated_at) && <span className="block">Último guardado: {new Date(landing.updatedAt || landing.updated_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion' })}</span>}
        </div>
        <div className="ecommerce-builder-actions flex items-center gap-1.5">
          {(onAbrirCodigo || MCP_EDITOR_HABILITADO || onEliminar) && <details className="ecommerce-editor-tools" onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}>
            <summary>Herramientas</summary>
            <div className="ecommerce-editor-tools-menu">
          {onAbrirCodigo && (
            <button
              type="button"
              onClick={onAbrirCodigo}
              title="Código avanzado: HTML/CSS/JS, Secciones, Footer y Prompt IA"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              <Settings2 size={14} /> <span>Código avanzado</span>
            </button>
          )}
          {MCP_EDITOR_HABILITADO && <button
            type="button"
            onClick={e => { e.currentTarget.closest('details').open = false; setPanelesOcultos(false); setSeccionConfig(s => s === 'mcp' ? 'inicio' : 'mcp'); }}
            title="Conectar con Claude o Codex mediante MCP (Model Context Protocol)"
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
              seccionConfig === 'mcp'
                ? 'bg-primary text-primary-fg shadow-sm'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
            }`}
          >
            <Cpu size={14} className={seccionConfig === 'mcp' ? 'text-primary-fg' : 'text-primary-text'} />
            <span>Conectar MCP</span>
          </button>}
          {onEliminar && <button type="button" onClick={e => { e.currentTarget.closest('details').open = false; onEliminar(); }} className="ecommerce-delete-page"><Trash2 size={16} aria-hidden="true" /> Eliminar página</button>}
            </div>
          </details>}
          {publicUrl && (
            <a
              href={publicUrl} target="_blank" rel="noreferrer"
              title="Abrir la página publicada en una pestaña nueva"
              className="ecommerce-public-page inline-flex items-center gap-2 px-3 rounded-lg border border-border text-fg hover:bg-surface-2"
            >
              <ExternalLink size={16} aria-hidden="true" /> Ver página publicada
            </a>
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
          {/* Único botón de guardar: guarda la configuración entera (venta,
              productos, precios, código). Antes había otro abajo y este de
              arriba guardaba solo el código, sin los cambios del formulario. */}
          <button
            type="button"
            onClick={confirmar}
            disabled={guardando || !!bloqueo || subidasPendientes > 0}
            title={bloqueo || undefined}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold bg-primary text-primary-fg hover:bg-primary-hover disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {guardando ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
            {disenoPendienteIA ? 'Generar landing con IA' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="ecommerce-editor-context">
        <div role="group" aria-label="Modo del editor" className="ecommerce-mode-switch">
          <button type="button" aria-pressed={!panelesOcultos} onClick={() => setPanelesOcultos(false)}>Editar</button>
          <button type="button" aria-pressed={panelesOcultos} onClick={() => setPanelesOcultos(true)}>Vista previa</button>
        </div>
        <label className="ecommerce-page-context"><span>Página</span>
          <select aria-label="Página de la tienda" value={esPaginaLegal ? `legal:${paginaLegal}` : vistaPreview === 'catalogo' ? 'categoria' : vistaPreview} onChange={e => {
            const destino = e.target.value;
            if (destino.startsWith('legal:')) { setModoPreview('legales'); setPaginaLegal(destino.slice(6)); }
            else { setModoPreview('venta'); propsVistaPrevia.onVista(destino); }
          }}>
            {VISTAS_PREVIEW_TIENDA.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            <optgroup label="Páginas legales">{PAGINAS_LEGALES_CODIGO.map(p => <option key={p.key} value={`legal:${p.key}`}>{p.label}</option>)}</optgroup>
          </select>
        </label>
        <div role="radiogroup" aria-label="Dispositivo" className="ecommerce-device-switch">
          {[['movil', 'Celular', Smartphone], ['escritorio', 'Escritorio', Monitor]].map(([key, label, Icono]) => <button key={key} type="button" role="radio" aria-checked={dispositivo === key} onClick={() => setDispositivo(key)}><Icono size={16} aria-hidden="true" />{label}</button>)}
        </div>
      </div>
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex">
        {/* Configuración: oculta, no desmontada, para no perder lo que se
            está editando (formularios abiertos, borradores). */}
        <div hidden={panelesOcultos} className="ecommerce-builder-config relative flex-1 min-w-0 overflow-y-auto overscroll-contain">
          <div className="max-w-[720px] mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-10">
            {esPaginaLegal && <section aria-label="Editar páginas legales">
              <h1 className="text-2xl font-bold text-fg mb-2">Páginas del footer</h1>
              <p className="text-sm text-fg-muted mb-6">Editá las políticas y la información de contacto que aparecen al pie de esta tienda.</p>
              <PaginasFooterEditor tipo={paginaLegal} onTipo={setPaginaLegal} contenido={textoLegalActual} onEditar={editarTextoLegal} onSubirImagen={onSubirImagen} onEstadoSubida={subiendo => setSubidasPendientes(n => n + (subiendo ? 1 : -1))} disabled={guardando || !onCambiarCodigo} />
            </section>}
            <div hidden={esPaginaLegal}>
            <header className="mb-7">
              <div className="flex items-center gap-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">Landing HTML</p>
                {MCP_EDITOR_HABILITADO && esGeneradoIa && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary-text uppercase tracking-wide">
                    <Sparkles size={11} /> Generada con IA (MCP)
                  </span>
                )}
              </div>
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
                      if (key === 'categorias') setCategoriaPreview('');
                      if (key === 'fichas') {
                        const primero = productoEditando || candidatosDatosProducto[0]?.content_id || null;
                        if (primero) { seleccionarProductoConfig(primero); }
                        else { setVistaPreview('producto'); setAvisoPreview('Elegí un producto para configurar su ficha.'); setResaltado(null); }
                        return;
                      }
                      if (key === 'ofertas') {
                        setVistaPreview('checkout');
                        setAvisoPreview('Las ofertas se configuran acá: podés crear order bumps, upsells o paquetes por cantidad.');
                        setResaltado(null);
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
                    titulo="Elegí el producto que vas a editar"
                    ayuda={seleccionMultipleFichas ? "Seleccioná los productos a los que querés aplicar cambios comunes." : "Elegí un producto para editar sus bloques."}
                  >
                    {candidatosDatosProducto.length === 0 ? (
                      <p className="text-sm text-fg-muted">Agregá productos desde Productos para configurar sus fichas.</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2" role="group" aria-label="Tipo de edición de productos">
                          {[false, true].map(varios => <button key={String(varios)} type="button" aria-pressed={seleccionMultipleFichas === varios}
                            disabled={varios && datosEdicionMultiple.size === 0}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${seleccionMultipleFichas === varios ? 'border-primary bg-primary/10 text-primary-text' : 'border-border text-fg-muted'}`}
                            onClick={() => {
                              const referencia = varios && productoConfigActual?.tipo === 'combo'
                                ? datosEdicionMultiple.values().next().value : productoConfigActual;
                              setSeleccionMultipleFichas(varios); setTodasLasFichas(false);
                              setFichasMarcadas(new Set(referencia ? [referencia.content_id] : []));
                              if (varios && referencia) seleccionarProductoConfig(referencia.content_id);
                            }}>
                            {varios ? 'Editar varios o todos' : 'Editar un producto'}
                          </button>)}
                        </div>
                        {seleccionMultipleFichas && <label className="flex items-center gap-2 text-sm font-medium text-fg">
                          <input type="checkbox" checked={todasLasFichas} onChange={e => {
                            setTodasLasFichas(e.target.checked); setFichasMarcadas(new Set());
                            if (e.target.checked && !productoConfigActual) seleccionarProductoConfig(candidatosDatosProducto[0]?.content_id || null);
                          }} className="accent-primary" />
                          Seleccionar todos ({datosEdicionMultiple.size})
                        </label>}
                        <div>
                          <p className="block text-sm font-medium text-fg mb-1.5">
                            {seleccionMultipleFichas ? `${fichasElegidas.length} ${fichasElegidas.length === 1 ? "producto seleccionado" : "productos seleccionados"}` : `Producto a editar${productoConfigActual ? `: ${productoConfigActual.nombre}` : ''}`}
                          </p>
                          <SelectorProductosPaginado
                            elegidos={seleccionMultipleFichas ? fichasElegidas.map(i => i.content_id) : (productoConfigActual ? [productoConfigActual.content_id] : [])}
                            enLanding={seleccionMultipleFichas ? datosEdicionMultiple : datosProductoPorContentId}
                            incluirCombos={datosProductoConCombos}
                            mostrarElegidos={false}
                            onAlternar={alternarFichaSeleccionada}
                          />
                        </div>
                        <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
                          <p className="text-xs font-semibold text-fg">{editandoGrupo ? `Los cambios se aplican a ${fichasElegidas.length} productos` : 'Ahora editás solo este producto'}</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{editandoGrupo
                            ? `Podés editar confianza y medios de pago, o mostrar y ocultar bloques. La preview muestra ${productoConfigActual?.nombre || 'un producto de referencia'}.`
                            : 'Imágenes, reseñas, textos, beneficios, compra, pagos, opiniones y recomendaciones quedan separados de los otros productos.'}</p>
                          {todasLasFichas && <p className="mt-1 text-xs text-fg-muted">La selección abarca todo el catálogo, no solo esta página, y los ajustes comunes también se aplican a los productos nuevos.</p>}
                        </div>
                      </div>
                    )}
                  </Bloque>

                  {editandoGrupo ? (
                    <EdicionConjuntaFichas cantidad={fichasElegidas.length} referencia={fichaGrupoEdicion}
                      fichas={fichasElegidas.map(i => itemPanelARuntime({ ...fichasProducto[claveItem(i)], ...i }, [], () => null, ventaActual))}
                      onCambiar={cambiarFichaSeleccionada} paymentLogosCatalogo={paymentLogosCatalogo} onSubirImagen={onSubirImagen ? subirImagenLanding : null} />
                  ) : productoConfigActual && (!seleccionMultipleFichas || fichasElegidas.length > 0) ? (
                    <Bloque
                      titulo={productoConfigActual.nombre}
                      ayuda={productoConfigActual.tipo === 'combo' ? 'Presentación del combo, imágenes, ahorro por productos y visibilidad de sus bloques.' : 'Presentación comercial, precio ancla, badges, imágenes y visibilidad de esta ficha.'}
                      verDonde={() => seleccionarProductoConfig(productoConfigActual.content_id)}
                    >
                      {productoConfigActual.tipo === 'combo' ? <EditorFichaCombo
                        key={productoConfigActual.content_id} item={productoConfigActual}
                        content={{ ...landing?.content, venta: ventaActual }} codigoInicio={codigoInicioPreview} tienda={tienda}
                        onCambiar={cambiarFichaSeleccionada} pedido={comboBloquePedido}
                        activo={comboBloqueActivo} onActivo={setComboBloqueActivo}
                        onSubirImagen={onSubirImagen ? subirImagenLanding : null}
                        onGlobal={key => {
                          setSeccionConfig('inicio'); setVistaPreview('inicio'); setComboBloqueActivo(null);
                          setBloqueInicioAbierto({ clave: key === 'encabezado_tienda' ? '__menu__' : key === 'pie' ? 'contacto' : 'anuncios', n: Date.now() });
                        }}
                      /> : <PresentacionProducto item={productoConfigActual} ancla={anclas[claveItem(productoConfigActual)] ?? ''}
                        onAncla={v => setAnclas(prev => ({ ...prev, [claveItem(productoConfigActual)]: v }))}
                        onCambiar={cambiarFichaSeleccionada}
                        propio={combinarFichaCompartida(productoConfigActual.tipo === 'producto' ? fichaCompartida : null, presentacion[claveItem(productoConfigActual)] || {})}
                        codigoFicha={codigoFichaPreview}
                        cantidadSeleccionada={1}
                        efectivo={fichaEfectiva}
                        bloqueAbierto={bloqueFichaAbierto}
                        pagoLogos={Object.fromEntries(paymentLogosCatalogo.map(l => [l.clave, (fichaEfectiva?.payment_logos || []).some(p => p.clave === l.clave)]))}
                        pagoparConectado={pagoparConectado}
                        paymentLogosCatalogo={paymentLogosCatalogo}
                        onPagoLogosChange={(clave, activo) => cambiarPresentacion(productoConfigActual, 'payment_logos', paymentLogosCatalogo.filter(l => l.clave === clave ? activo : (fichaEfectiva?.payment_logos || []).some(p => p.clave === l.clave)))}
                        bloqueRecomendados={bloqueRecomendadosFicha}
                        recomendadosActivo={recoActivo}
                        resumenRecomendados={resumenReco}
                        onRecomendadosVisible={setRecoActivo}
                        destacado={destacadosValidos.includes(productoConfigActual.content_id)} onDestacar={() => alternarDestacado(productoConfigActual.content_id)}
                        tienda={tienda} onSubirImagen={onSubirImagen ? subirImagenLanding : null} {...propsOfertaProducto(productoConfigActual)} inicialmenteAbierto />}
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
                ayuda={bloquesInicioBloqueados ? "Esta landing tiene diseño único generado con IA (MCP). Los bloques estándar están bloqueados para proteger tu diseño." : "Todo lo que se ve en el homepage se edita acá, bloque por bloque: abrí uno para cambiar su contenido, reordená o mostrá/ocultá con los controles de la derecha."}
                verDonde={() => verDonde('inicio', null)}
              >
                {bloquesInicioBloqueados ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-primary-text">
                      <Lock size={15} />
                      <span>Bloques estándar bloqueados (Generada con IA / MCP)</span>
                    </div>
                    <p className="text-fg-muted text-xs leading-relaxed">
                      Esta homepage fue diseñada a medida mediante el MCP de Gesicomm. Los bloques rígidos de la plantilla inicial están bloqueados para proteger tu diseño y evitar sobreescrituras accidentales.
                    </p>
                    <p className="text-xs text-fg-muted/80">
                      💡 Para modificar o reorganizar elementos, editalo en el código HTML o pedile cambios directamente a la IA conectada al MCP (Claude Desktop, Cursor o cualquier cliente compatible).
                    </p>
                    <div className="pt-2 border-t border-primary/15 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => { setDesbloqueadoManual(true); onDesbloquearInicio?.(); }}
                        className="inline-flex items-center gap-1.5 self-start h-8 px-3 rounded-lg border border-border bg-surface text-xs font-semibold text-fg hover:border-border-strong"
                      >
                        <Lock size={13} /> Desbloquear de todas formas (conservando el diseño)
                      </button>
                      <p className="text-[11px] text-fg-muted leading-relaxed">
                        Vas a poder editar los bloques estándar sin perder el HTML que armó el MCP. Ojo: si después le pedís otro cambio a la IA conectada por MCP, puede volver a pisar lo que edites acá.
                      </p>
                      <p className="text-xs text-fg-muted">
                        ¿Preferís volver a la plantilla estándar para editar sus bloques y funcionalidades?
                      </p>
                      {confirmarResetInicio ? (
                        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 space-y-2">
                          <p className="text-xs font-semibold text-danger">
                            ¿Confirmás resetear la página a la plantilla por defecto?
                          </p>
                          <p className="text-[11px] text-fg-muted leading-relaxed">
                            Se desbloquearán todos los bloques estándar para que puedas reorganizarlos y configurarlos visualmente, reemplazando el diseño personalizado actual de Inicio.
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={resetearPaginaInicio}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-danger text-danger-fg text-xs font-semibold hover:bg-danger-hover"
                            >
                              <RotateCcw size={13} /> Sí, resetear página
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmarResetInicio(false)}
                              className="h-8 px-3 rounded-lg border border-border bg-surface text-xs font-semibold text-fg-muted hover:text-fg"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmarResetInicio(true)}
                          className="inline-flex items-center gap-1.5 self-start h-8 px-3 rounded-lg border border-primary/30 bg-surface text-xs font-semibold text-primary hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <RotateCcw size={13} /> Resetear página a plantilla por defecto
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {avisoResetInicio && (
                      <div className="mb-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success flex items-center justify-between">
                        <span>{avisoResetInicio}</span>
                        <button type="button" onClick={() => setAvisoResetInicio('')} className="text-success hover:opacity-75">×</button>
                      </div>
                    )}
                    {!inicioEsBase && onRestaurarCodigo && (
                      <div className="mb-3 flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-2/40">
                        <span className="text-xs text-fg-muted">El código de Inicio tiene personalizaciones.</span>
                        {confirmarResetInicio ? (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={resetearPaginaInicio} className="h-7 px-2.5 rounded bg-danger text-danger-fg text-xs font-semibold">Sí, resetear</button>
                            <button type="button" onClick={() => setConfirmarResetInicio(false)} className="h-7 px-2 rounded border border-border text-xs text-fg-muted">Cancelar</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setConfirmarResetInicio(true)} className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
                            <RotateCcw size={12} /> Resetear a plantilla por defecto
                          </button>
                        )}
                      </div>
                    )}
                    <EditorBloquesInicio
                  bloqueAbierto={bloqueInicioAbierto}
                  bloques={inicioComercial.bloques}
                  onReordenar={reordenarBloqueInicio}
                  onAlternar={alternarBloqueInicio}
                  codigoInicio={codigoInicioPreview}
                  onCambiarCodigo={onCambiarCodigo}
                  tienda={tienda}
                  venta={ventaActual}
                  productos={seleccion}
                  menuPanel={(
                    <EditorMenuPrincipal
                      encabezado={inicioComercial.encabezado}
                      items={inicioComercial.menu_links || []}
                      categorias={categoriasInicioDisponibles}
                      tienda={tienda}
                      dispositivo={dispositivo}
                      onCambiarEncabezado={cambiarEncabezado}
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
                        variante={normalizarEncabezadoInicio(inicioComercial.encabezado).variante}
                        onCambiar={cambiarAnuncio}
                        onAgregar={agregarAnuncio}
                        onQuitar={quitarAnuncio}
                      />
                    ),
                    banner: (
                      <EditorBannersInicio
                        banners={inicioComercial.banners}
                        categorias={categoriasInicioDisponibles}
                        variante={normalizarEncabezadoInicio(inicioComercial.encabezado).variante}
                        tamano={inicioComercial.banner_tamano}
                        onCambiarTamano={cambiarBannerTamano}
                        dispositivo={dispositivo}
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
                        enLanding={itemsLandingPorContentId}
                        incluirCombos={incluirCombos}
                        onCambiar={cambiarProductosCategoria}
                        onAlternarItem={alternarItemProductosCategoria}
                      />
                    ),
                    combos: (
                      <EditorCombosInicio config={inicioComercial.combos}
                        combos={candidatosCombosInicio}
                        onAgregarCombo={combo => {
                          if (esRegla) setIncluirCombos(true);
                          else setManual(prev => prev.includes(`combo:${combo.id}`) ? prev : [...prev, `combo:${combo.id}`]);
                        }}
                        onCambiar={cambio => setInicioComercial(prev => ({ ...prev, combos: normalizarCombosInicio({ ...prev.combos, ...cambio }) }))}
                        onAdministrar={() => { setSeccionConfig('combos'); setResaltado(null); }}
                        cargando={cargandoCombosInicio} errores={erroresCombosInicio}
                        onReintentar={combo => { fichasPedidas.current.delete(claveItem(combo)); pedirFichaProducto(combo); }} />
                    ),
                    confianza: (
                      <EditorConfianzaInicio
                        items={inicioComercial.confianza}
                        estilo={inicioComercial.confianza_estilo}
                        onEstilo={confianza_estilo => setInicioComercial(prev => ({ ...prev, confianza_estilo }))}
                        onCambiar={cambiarConfianza}
                      />
                    ),
                    testimonios: (
                      <EditorTestimoniosInicio
                        testimonios={inicioComercial.testimonios}
                        onCambiar={cambiarTestimoniosInicio}
                        onCambiarItem={cambiarTestimonioInicio}
                        onAgregar={agregarTestimonioInicio}
                        onQuitar={quitarTestimonioInicio}
                        onSubir={onSubirImagen ? subirImagenLanding : null}
                      />
                    ),
                    colecciones: (
                      <EditorColeccionesInicio
                        config={inicioComercial.colecciones}
                        onSubir={onSubirImagen ? subirImagenLanding : null}
                        categorias={categoriasInicioDisponibles}
                        colecciones={coleccionesLandingDisponibles}
                        onCambiar={c => cambiarInicio('colecciones', c)}
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
                        enLanding={itemsLandingPorContentId}
                        incluirCombos={incluirCombos}
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
                              renovar={urgenciaRenovar}
                              duracionHoras={urgenciaDuracionHoras}
                              duracionMinutos={urgenciaDuracionMinutos}
                              duracionSegundos={urgenciaDuracionSegundos}
                              onTitulo={setUrgenciaTitulo}
                              onTexto={setUrgenciaTexto}
                              onCta={setUrgenciaCta}
                              onFinAt={cambiarUrgenciaFinAt}
                              onConfirmar={setUrgenciaConfirmar}
                              onRenovar={setUrgenciaRenovar}
                              onDuracionHoras={setUrgenciaDuracionHoras}
                              onDuracionMinutos={setUrgenciaDuracionMinutos}
                              onDuracionSegundos={setUrgenciaDuracionSegundos}
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
                </>
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
                      productosPorContentId={datosProductoPorContentId}
                      incluirCombos={datosProductoConCombos}
                      productoEditando={productoConfigActual}
                      ofertasSeleccionadas={urgenciaProductosValidos}
                      anclas={anclas}
                      ofertaFinAt={urgenciaFinAt}
                      ofertaTitulo={urgenciaTitulo}
                      ofertaTexto={urgenciaTexto}
                      ofertaCta={urgenciaCta}
                      onEditar={contentId => abrirPromoProducto(contentId, 'catalogo')}
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
                <Bloque
                  titulo="Organizar productos"
                  ayuda="Marcá varios productos y ponelos en oferta (con descuento, badge y contador) o en una colección como “Ofertas del día”. Elegir una categoría también cambia la vista previa."
                  verDonde={() => verDonde('categoria', null)}
                >
                  <OrganizadorProductos
                    productos={candidatosDatosProducto}
                    enContador={urgenciaProductosValidos}
                    contadorFinAt={urgenciaActiva ? urgenciaFinAt : ''}
                    contadorTitulo={urgenciaTitulo}
                    categoriaActiva={categoriaPreviewEsTodas ? '' : categoriaPreviewValida}
                    onCategoria={(cat) => {
                      setCategoriaPreview(cat);
                      setVistaPreview('categoria');
                      setAvisoPreview(cat ? `Preview de categoría: ${cat}.` : 'Preview de todas las categorías.');
                      setResaltado(null);
                    }}
                    onAplicarOferta={aplicarOfertaMasiva}
                    onAplicarDescuentoReal={onRecargarCatalogo ? aplicarDescuentoRealMasivo : undefined}
                    onLimpiar={limpiarMasivo}
                    onColeccion={coleccionMasiva}
                    onEditar={contentId => abrirPromoProducto(contentId, 'categoria')}
                    onDespublicar={item => {
                      quitarManual(item);
                      setVistaPreview('categoria');
                    }}
                  />
                </Bloque>
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
                        onClick={() => {
                          setCheckoutRecoActivo(true);
                          verDonde('checkout', 'checkout_recomendados');
                        }}
                        className="rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-left hover:border-border-strong"
                      >
                        <span className="block text-sm font-semibold text-fg">Productos recomendados</span>
                        <span className="mt-1 block text-xs text-fg-muted">
                          Elegí uno o varios productos para ofrecerlos en el checkout.
                        </span>
                        <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary-text">
                          {checkoutRecoItemsValidos.length || 'Auto'} seleccionado{checkoutRecoItemsValidos.length === 1 ? '' : 's'}
                        </span>
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

                    <div className="mt-4 rounded-xl border border-border bg-surface-2/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-fg">Recomendados del checkout</p>
                          <p className="mt-1 text-[13px] text-fg-muted">
                            Esta selección solo afecta el carrusel “También te puede interesar” del checkout.
                          </p>
                        </div>
                        <Interruptor
                          activo={checkoutRecoActivo}
                          onChange={setCheckoutRecoActivo}
                          etiqueta="Mostrar recomendados en checkout"
                        />
                      </div>

                      {checkoutRecoActivo && (
                        <div className="mt-4 space-y-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label>
                              <span className="block text-sm font-medium text-fg mb-1.5">Rótulo superior</span>
                              <input
                                value={checkoutRecoKicker}
                                onChange={e => setCheckoutRecoKicker(e.target.value)}
                                maxLength={50}
                                placeholder="Sin rótulo superior"
                                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                              />
                            </label>
                            <label>
                              <span className="block text-sm font-medium text-fg mb-1.5">Título</span>
                              <input
                                value={checkoutRecoTitulo}
                                onChange={e => setCheckoutRecoTitulo(e.target.value)}
                                maxLength={80}
                                placeholder="Sin título"
                                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                              />
                            </label>
                            <label className="sm:col-span-2">
                              <span className="block text-sm font-medium text-fg mb-1.5">Subtítulo</span>
                              <textarea
                                value={checkoutRecoSubtitulo}
                                onChange={e => setCheckoutRecoSubtitulo(e.target.value)}
                                maxLength={180}
                                rows={2}
                                placeholder="Sin subtítulo"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                              />
                            </label>
                            <label>
                              <span className="block text-sm font-medium text-fg mb-1.5">Texto del botón</span>
                              <input
                                value={checkoutRecoCta}
                                onChange={e => setCheckoutRecoCta(e.target.value)}
                                maxLength={40}
                                placeholder="Sin botón"
                                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                              />
                            </label>
                            <div>
                              <span id="checkout-reco-cantidad" className="block text-sm font-medium text-fg mb-1.5">Cuántos mostrar</span>
                              <div role="radiogroup" aria-labelledby="checkout-reco-cantidad" className="inline-flex rounded-lg bg-surface p-1">
                                {CANTIDADES_RECO.map(n => (
                                  <button
                                    key={n}
                                    type="button"
                                    role="radio"
                                    aria-checked={checkoutRecoMax === n}
                                    onClick={() => setCheckoutRecoMax(n)}
                                    className={`w-9 h-8 rounded-md font-mono text-sm transition-colors ${checkoutRecoMax === n ? 'bg-surface-2 text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {candidatosReco.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-border-strong px-4 py-6 text-center text-sm text-fg-muted">
                              Primero agregá productos a la landing.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs text-fg-muted">
                                    Tocá los productos que querés mostrar ({checkoutRecoItemsValidos.length} de hasta {MAX_RECOMENDADOS_MANUALES}).
                                  </p>
                                  {checkoutRecoItemsValidos.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCheckoutRecoItems([]);
                                        setCheckoutRecoPreciosAntes({});
                                        verDonde('checkout', 'checkout_recomendados');
                                      }}
                                      className="shrink-0 text-xs font-medium text-fg-muted hover:text-fg"
                                    >
                                      Limpiar selección
                                    </button>
                                  )}
                                </div>
                              </div>
                              <SelectorProductosPaginado
                                elegidos={checkoutRecoItemsValidos}
                                enLanding={itemsLandingPorContentId}
                                incluirCombos={false}
                                maximo={MAX_RECOMENDADOS_MANUALES}
                                onAlternar={alternarCheckoutReco}
                              />
                              {checkoutRecoElegidos.length > 0 && (
                                <div className="rounded-xl border border-border bg-surface">
                                  <div className="px-3 py-2.5 border-b border-border">
                                    <p className="text-sm font-semibold text-fg">Descuento visible en checkout</p>
                                    <p className="mt-0.5 text-xs text-fg-muted">Opcional. Se muestra como precio tachado solo en este carrusel.</p>
                                  </div>
                                  <ul className="divide-y divide-border">
                                    {checkoutRecoElegidos.map(item => (
                                      <li key={item.content_id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                                        <span className="flex min-w-0 items-center gap-2.5">
                                          <Miniatura item={item} />
                                          <span className="min-w-0">
                                            <span className="block truncate text-sm text-fg">{item.nombre}</span>
                                            <span className="block text-xs text-fg-muted tabular-nums">{formatearGs(precioDeVenta(item))}</span>
                                          </span>
                                        </span>
                                        <PrecioAncla
                                          id={`checkout-reco-ancla-${item.content_id}`}
                                          venta={precioDeVenta(item)}
                                          valor={checkoutRecoPreciosAntes[item.content_id] ?? ''}
                                          onCambiar={v => {
                                            setCheckoutRecoPreciosAntes(prev => ({ ...prev, [item.content_id]: v }));
                                            setVistaPreview('checkout');
                                            setResaltado({ lista: 'checkout_recomendados', n: Date.now() });
                                          }}
                                        />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
                                onCambiarPaquete={cambiarPaquete}
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
                          <button key={contentIdPanel(combo)} type="button"
                            aria-label={`Ver combo ${combo.nombre}`}
                            onClick={() => {
                              seleccionarProductoConfig(contentIdPanel(combo));
                              setComboBloqueActivo('hero');
                              setComboBloquePedido({ clave: 'hero', n: Date.now() });
                              setPreviewMovil(typeof window !== 'undefined' && window.innerWidth < 1280);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2">
                            <Miniatura item={combo} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-fg truncate">{combo.nombre}</span>
                              <span className="block text-xs text-fg-muted">Combo activo en esta landing</span>
                            </span>
                            <span className="font-mono text-xs text-fg tabular-nums">{formatearGs(precioPanel(combo))}</span>
                            <ChevronDown size={15} className="-rotate-90 shrink-0 text-fg-muted" aria-hidden="true" />
                          </button>
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

              {false && seccionConfig === 'fichas' && (
                <>
              {/* Recomendados */}
              <Bloque
                titulo="9. Productos recomendados"
                ayuda="Último bloque de la ficha, igual para todos los productos: título, subtítulo, cantidad y qué productos recomendar."
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
                          onClick={() => setRecoModo(k)}
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
                              <p className="text-xs text-fg-muted">Buscá y tocá los productos que querés recomendar ({recoItemsValidos.length} de hasta {MAX_RECOMENDADOS_MANUALES}).</p>
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
                          </div>
                          <SelectorProductosPaginado
                            elegidos={recoItemsValidos}
                            enLanding={itemsLandingPorContentId}
                            incluirCombos={incluirCombos}
                            maximo={MAX_RECOMENDADOS_MANUALES}
                            onAlternar={alternarRecomendado}
                          />
                          {recomendadosElegidos.length > 0 && (
                            <div className="mt-4 rounded-xl border border-border bg-surface">
                              <div className="px-3 py-2.5 border-b border-border">
                                <p className="text-sm font-semibold text-fg">Precio tachado de recomendados</p>
                                <p className="mt-0.5 text-xs text-fg-muted">Opcional. Se guarda para ese producto en esta landing.</p>
                              </div>
                              <ul className="divide-y divide-border">
                                {recomendadosElegidos.map(item => (
                                  <li key={item.content_id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                                    <span className="flex min-w-0 items-center gap-2.5">
                                      <Miniatura item={item} />
                                      <span className="min-w-0">
                                        <span className="block truncate text-sm text-fg">{item.nombre}</span>
                                        <span className="block text-xs text-fg-muted tabular-nums">{formatearGs(precioDeVenta(item))}</span>
                                      </span>
                                    </span>
                                    <PrecioAncla
                                      id={`ancla-reco-${claveItem(item)}`}
                                      venta={precioDeVenta(item)}
                                      valor={anclas[claveItem(item)] ?? ''}
                                      onCambiar={v => setAnclas(prev => ({ ...prev, [claveItem(item)]: v }))}
                                    />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {camposTextoReco}
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

              {MCP_EDITOR_HABILITADO && seccionConfig === 'mcp' ? (
                <Bloque
                  titulo="Conexión MCP con Claude & Codex"
                  ayuda="Conectá tu asistente inteligente directamente a tu tienda y landing por Model Context Protocol."
                >
                  <ConectarMcpPanel
                    tienda={tienda}
                    landing={landing}
                    onSincronizar={recargarLandingDesdeServidor}
                  />
                </Bloque>
              ) : seccionConfig === 'fichas' && onCambiarCodigo ? (
                <Bloque
                  titulo="Instrucciones para la IA"
                  ayuda="Cambiá el diseño de la ficha con ChatGPT, Claude o Gemini, sin tocar código. Vale para la ficha de todos los productos de esta tienda."
                >
                  <InstruccionesIaFicha
                    codigos={codigos}
                    onCambiarCodigo={onCambiarCodigo}
                    onRestaurarCodigo={onRestaurarCodigo}
                    tienda={tienda}
                    venta={ventaActual}
                    productos={seleccion}
                    producto={productoConfigActual}
                  />
                </Bloque>
              ) : (
              <Bloque
                titulo="Código avanzado"
                ayuda="Copiá el prompt maestro para la IA y pegá abajo el código completo de tu página."
              >
                <InstruccionesIaPagina
                  codigos={codigos}
                  tipo={tipo}
                  tienda={tienda}
                  venta={ventaActual}
                  productos={seleccion}
                  vistaInicial={vistaPreview}
                  onCambiarCodigo={onCambiarCodigo}
                  onRestaurarCodigo={onRestaurarCodigo}
                  onResetearInicio={resetearPaginaInicio}
                  landing={landing}
                  onRecargarLanding={recargarLandingDesdeServidor}
                />
              </Bloque>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* Vista previa (escritorio ancho; con los paneles ocultos, en
            cualquier ancho y sin su cabecera) */}
        <aside className={`${panelesOcultos ? 'flex' : 'hidden xl:flex border-l border-border'} flex-1 min-w-0 bg-surface-2 flex-col min-h-0`} aria-label="Vista previa">
          {panelesOcultos ? <VistaPrevia {...propsVistaPrevia} soloLienzo /> : vistaPrevia}
        </aside>
      </div>

      {/* Barra de resumen: con los paneles ocultos solo aparece si hay un error */}
      <div hidden={panelesOcultos && !errorGuardado && !error} className="shrink-0 border-t border-border bg-surface px-4 md:px-6 py-3">
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

      {productoPromoEditando && (
        <PromoCatalogoModal
          item={productoPromoEditando}
          ancla={anclas[claveItem(productoPromoEditando)] ?? ''}
          ofertaActiva={urgenciaProductosValidos.includes(productoPromoEditando.content_id)}
          ofertaFinAt={urgenciaFinAt}
          ofertaTitulo={urgenciaTitulo}
          ofertaTexto={urgenciaTexto}
          ofertaCta={urgenciaCta}
          onAncla={v => setAnclas(prev => ({ ...prev, [claveItem(productoPromoEditando)]: v }))}
          onCambiar={(campo, valor) => cambiarPresentacion(productoPromoEditando, campo, valor)}
          onAlternarOferta={() => {
            const activa = urgenciaProductosValidos.includes(productoPromoEditando.content_id);
            if (activa) quitarOfertaCatalogo(productoPromoEditando.content_id);
            else activarOfertaCatalogo(productoPromoEditando.content_id);
            if (!activa && urgenciaFinAt) setUrgenciaConfirmar(true);
          }}
          onOfertaFinAt={valor => {
            activarOfertaCatalogo(productoPromoEditando.content_id);
            cambiarUrgenciaFinAt(valor);
            setUrgenciaConfirmar(!!valor);
          }}
          onOfertaTitulo={setUrgenciaTitulo}
          onOfertaTexto={setUrgenciaTexto}
          onOfertaCta={setUrgenciaCta}
          onCerrar={() => setPromoEditando(null)}
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


export function InstruccionesIaPagina({ codigos, tipo, tienda, venta, productos, vistaInicial = 'inicio', onCambiarCodigo, onRestaurarCodigo = null, onResetearInicio = null, landing = null, onRecargarLanding = null }) {
  const [metodoIa, setMetodoIa] = useState('hibrido'); // 'hibrido' | 'mcp'
  const [vistaKey, setVistaKey] = useState(() => VISTAS_CODIGO_TIENDA.some(v => v.key === vistaInicial) ? vistaInicial : 'inicio');
  const [pegado, setPegado] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmarReset, setConfirmarReset] = useState(false);
  const vistaActual = VISTAS_CODIGO_TIENDA.find(v => v.key === vistaInicial) || VISTAS_CODIGO_TIENDA[0];
  // Seguir el contexto de edición salvo que haya código pegado pendiente.
  // En ese caso se conserva el texto y se advierte el destino explícitamente.
  useEffect(() => {
    if (!pegado.trim()) {
      setVistaKey(VISTAS_CODIGO_TIENDA.some(v => v.key === vistaInicial) ? vistaInicial : 'inicio');
      setCopiado(false);
      setError('');
      setAviso('');
    }
    // Solo el cambio de vista dispara la sincronización, no la escritura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaInicial]);
  const vista = VISTAS_CODIGO_TIENDA.find(v => v.key === vistaKey);
  const codigo = codigos?.[vistaKey] || vista.base(tipo);
  const esBase = useMemo(() => {
    if (!codigo?.html?.trim()) return true;
    if (vistaKey === 'inicio') return esBaseIntacta(codigo.html);
    if (vistaKey === 'producto') return esFichaProductoBase(codigo.html);
    return false;
  }, [codigo?.html, vistaKey]);
  const prompt = useMemo(() => armarPromptVista(vistaKey, {
    tienda, venta, productos, base: codigo, documentoCompleto: true,
  }), [vistaKey, tienda, venta, productos, codigo]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado(true);
      setError('');
    } catch {
      setError('No se pudo copiar. Podés seleccionar el prompt maestro de la guía y copiarlo manualmente.');
    }
  }

  function aplicar() {
    const dividido = dividirCodigoPegado(pegado);
    if (!dividido.html?.trim()) {
      setError('Pegá el código completo de la página, con su HTML y CSS dentro de <style>.');
      return;
    }
    const html = vistaKey === 'producto'
      ? marcarFichaPersonalizada(dividido.html)
      : marcarPersonalizado(dividido.html);
    onCambiarCodigo(vistaKey, 'html', html);
    onCambiarCodigo(vistaKey, 'css', dividido.css ?? '');
    onCambiarCodigo(vistaKey, 'js', dividido.js ?? '');
    setPegado('');
    setError('');
    setAviso(`El diseño de ${vista.label} ya está aplicado en la vista previa. Guardá para publicarlo.`);
  }

  return (
    <div className="space-y-4">
      {/* Selector de Método IA: Híbrido vs MCP */}
      {MCP_EDITOR_HABILITADO && <div className="flex rounded-xl border border-border bg-surface-2/60 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMetodoIa('hibrido')}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            metodoIa === 'hibrido'
              ? 'bg-surface text-fg shadow-sm'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          Copiar / Pegar (Híbrido)
        </button>
        <button
          type="button"
          onClick={() => setMetodoIa('mcp')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            metodoIa === 'mcp'
              ? 'bg-primary text-primary-fg shadow-sm'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Cpu size={13} /> Conectar MCP (Claude / Codex)
        </button>
      </div>}

      {MCP_EDITOR_HABILITADO && metodoIa === 'mcp' ? (
        <ConectarMcpPanel
          tienda={tienda}
          landing={landing}
          onSincronizar={onRecargarLanding}
        />
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="ia-pagina-vista" className="block text-sm font-semibold text-fg">Página a diseñar</label>
            <select id="ia-pagina-vista" value={vistaKey} onChange={e => {
              setVistaKey(e.target.value); setPegado(''); setCopiado(false); setError(''); setAviso('');
            }} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg">
              {VISTAS_CODIGO_TIENDA.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
            {vistaKey !== vistaActual.key && <p className="rounded-lg border border-warning/40 p-3 text-fg" role="note" aria-label="Destino de código diferente">Estás viendo {vistaActual.label}. Este código se aplicará a {vista.label}. Revisá la página a diseñar antes de aplicar.</p>}
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
            <p className="text-sm font-semibold text-fg">1 · Instrucciones para la IA · Prompt maestro</p>
            <p className="text-[13px] leading-relaxed text-fg-muted">
              La guía explica toda la lógica comercial de Gesicomm: productos y precios reales, banners, categorías, vitrinas, ofertas, combos, recomendados, carrito, checkout y seguimiento de ventas. Incluye la configuración de tu tienda y el diseño actual de esta página.
            </p>
            <p className="text-[13px] leading-relaxed text-fg-muted">
              Copiá las instrucciones en ChatGPT, Claude o Gemini y contale cómo querés el diseño. La IA debe devolverte un único HTML completo con el CSS incluido dentro de &lt;style&gt;. Copiá toda su respuesta y pegala abajo.
            </p>
            <button type="button" onClick={copiar} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 text-sm font-semibold text-fg hover:border-border-strong">
              {copiado ? <Check size={15} /> : <Copy size={15} />}{copiado ? 'Instrucciones copiadas' : 'Copiar prompt maestro'}
            </button>
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-fg-muted">Ver guía completa y prompt maestro</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface p-3 text-xs text-fg">{prompt}</pre>
            </details>
          </div>
          <div className="space-y-2">
            <label htmlFor="ia-pagina-respuesta" className="block text-sm font-semibold text-fg">2 · Pegá acá el código completo de la IA</label>
            <p className="text-xs text-fg-muted">Un solo campo para todo el HTML y CSS. Si incluye JavaScript, pegalo también en la misma respuesta.</p>
            <textarea id="ia-pagina-respuesta" value={pegado} onChange={e => { setPegado(e.target.value); setError(''); setAviso(''); }}
              rows={6} spellCheck={false} placeholder="Pegá acá la respuesta completa de la IA (HTML con CSS incluido)"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg outline-none focus:border-primary" />
            <button type="button" onClick={aplicar} disabled={!pegado.trim() || !onCambiarCodigo}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-fg disabled:opacity-45">
              <Sparkles size={15} /> Aplicar a {vista.label}
            </button>
          </div>
          {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
          {aviso && <p role="status" className="text-[13px] text-success">{aviso}</p>}

          {(!esBase || vistaKey === 'inicio') && (onRestaurarCodigo || onResetearInicio) && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <span className="text-xs text-fg-muted">¿Querés volver a la plantilla por defecto?</span>
              {confirmarReset ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (vistaKey === 'inicio' && onResetearInicio) {
                        onResetearInicio();
                      } else if (onRestaurarCodigo) {
                        onRestaurarCodigo(vistaKey);
                      }
                      setConfirmarReset(false);
                      setAviso(`La página ${vista.label} volvió a la plantilla base. Guardá para publicarla.`);
                    }}
                    className="h-8 px-3 rounded-lg bg-danger text-danger-fg text-xs font-semibold"
                  >
                    Sí, resetear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarReset(false)}
                    className="h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg-muted hover:text-fg"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarReset(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg-muted hover:text-fg"
                >
                  <RotateCcw size={13} /> Resetear a plantilla por defecto
                </button>
              )}
            </div>
          )}
        </>
      )}
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
  const [nodo, setNodo] = useState(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  // El observador vive en un efecto atado al nodo y no en la ref: con
  // StrictMode el desmontaje simulado lo desconectaba y la ref no volvía a
  // correr, así que la vista quedaba con la medida vieja (franja en blanco
  // al ocultar los paneles o al redimensionar).
  useEffect(() => {
    if (!nodo) return undefined;
    const medir = () => setTam(prev => (
      prev.w === nodo.clientWidth && prev.h === nodo.clientHeight ? prev : { w: nodo.clientWidth, h: nodo.clientHeight }
    ));
    medir();
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    observador?.observe(nodo);
    // Respaldo: al pasar de oculto (pantalla chica) a visible, no todos los
    // navegadores avisan por ResizeObserver y la vista quedaba en blanco.
    window.addEventListener('resize', medir);
    return () => { observador?.disconnect(); window.removeEventListener('resize', medir); };
  }, [nodo]);
  return [setNodo, tam];
}

// Textos de la ficha que se guardan por producto. Va SOLO lo que el comercio
// tocó (ficha v2): ausente = vale el texto del producto; vacío = lo borró y no
// se muestra. Ver presentacionComercial (datosRuntime.js).
const CAMPOS_TEXTO_FICHA = ['titulo_comercial', 'mensaje_comercial', 'propuesta_valor', 'insignia_principal', 'insignia_secundaria', 'cta_texto', 'cta_descuento_pct', 'agregar_carrito_texto', 'resenas_texto', 'resenas_calificacion', 'beneficios_kicker', 'beneficios_titulo', 'beneficios_subtitulo', 'urgencia_kicker', 'urgencia_titulo', 'urgencia_texto', 'urgencia_horas', 'urgencia_minutos', 'urgencia_segundos', 'opiniones_kicker', 'opiniones_titulo', 'opiniones_subtitulo', 'preguntas_kicker', 'preguntas_titulo', 'preguntas_subtitulo'];

// Las fichas guardadas antes de la v2 traen '' en todos los textos que nunca
// se tocaron: no son "vaciados" y se descartan, para que siga valiendo el
// texto del producto.
function presentacionGuardada(fichas) {
  return Object.fromEntries(Object.entries(fichas || {}).map(([clave, ficha]) => [clave, ficha?.v === 2
    ? ficha
    : Object.fromEntries(Object.entries(ficha || {}).filter(([, valor]) => valor !== ''))]));
}

/**
 * La landing con la selección y las ofertas reales, en celular o en
 * escritorio. Usa el mismo iframe y el mismo runtime que la landing
 * publicada. Escritorio = la página a 1280px de ancho, achicada para entrar
 * en el lugar disponible (como se ve en una notebook, en miniatura).
 */
function VistaPrevia({
  modo = 'venta', onModo, paginaLegal, onPaginaLegal,
  vista, onVista, productos, productoFicha, onProducto, codigo, codigoInicio, datos, content, comboBloqueActivo, onComboActivo, resaltado, aviso, inicioEsBase, onNavegar, onComprar, onCarrito, onBloque,
  dispositivo, onDispositivo, onAmpliar, ampliada, onCerrar, disenoPendienteIA = false,
  // Solo la landing, sin la cabecera (paneles ocultos): el dispositivo se
  // elige desde la barra superior y se navega con los links de la página.
  soloLienzo = false, compacta = false,
}) {
  const productosFicha = productos.filter(p => p.tipo === 'producto' || p.tipo === 'combo');
  const vistaSeleccionada = vista === 'catalogo' ? 'categoria' : vista;
  const [marcoRef, tam] = useTamano();
  const escritorio = dispositivo === 'escritorio';
  const anchoLienzo = Math.max(ANCHO_ESCRITORIO, tam.w);
  const escala = escritorio && tam.w ? Math.min(1, tam.w / anchoLienzo) : 1;

  const iframe = datos?.vista === 'producto' && productoFicha?.tipo === 'combo' ? (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <FichaComboLienzo item={productoFicha} runtime={datos.producto} content={content} tienda={datos.tienda}
        preview isMobile={!escritorio} onComprar={onComprar} onVolver={() => onNavegar({ destino: 'inicio' })}
        bloqueActivo={comboBloqueActivo} onBloque={onBloque} onActivo={onComboActivo}
        codigoInicio={codigoInicio} datos={datos} onNavegar={onNavegar} onCarrito={onCarrito} />
    </div>
  ) : (
    <CodigoPreview
      key={`${vista}-${dispositivo}`}
      codigo={codigo}
      titulo="Vista previa"
      datos={datos}
      previewDevice={dispositivo === 'movil' ? 'mobile' : 'desktop'}
      resaltar={resaltado}
      onNavegar={onNavegar}
      onCheckout={onComprar}
      onCarrito={onCarrito}
      onBloque={onBloque}
    />
  );

  return (
    <>
      {(compacta || soloLienzo) && <div className="ecommerce-preview-summary">
        <span>{escritorio ? `Escritorio · ${Math.round(anchoLienzo)} px · ${Math.round(escala * 100)} %` : 'Celular · 390 px'}</span>
        {!soloLienzo && <button type="button" onClick={onAmpliar}><Maximize2 size={16} aria-hidden="true" />Ampliar vista previa</button>}
      </div>}
      {!soloLienzo && !compacta && (
      <div className={`px-4 pt-4 pb-3 space-y-3 shrink-0 ${ampliada ? 'border-b border-border bg-surface' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <select aria-label="Contenido de vista previa" value={modo} onChange={e => onModo?.(e.target.value)} className="min-w-0 h-9 max-w-[220px] rounded-lg border border-border bg-surface px-2 text-sm font-semibold text-fg">
            <option value="venta">Vista previa de venta</option><option value="legales">Páginas legales</option>
          </select>
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
          {modo === 'legales' ? <select aria-label="Página legal en vista previa" value={paginaLegal} onChange={e => onPaginaLegal?.(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg">
            {PAGINAS_LEGALES_CODIGO.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select> : <div role="tablist" aria-label="Pantalla" className={`flex rounded-lg bg-surface p-1 border border-border ${ampliada ? 'sm:w-80' : ''}`}>
            {VISTAS_PREVIEW_TIENDA.map(([k, label, Icono]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={vistaSeleccionada === k}
                onClick={() => onVista(k)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[13px] font-medium transition-colors ${vistaSeleccionada === k ? 'bg-surface-2 text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
              >
                <Icono size={14} /> {k === 'producto' && productoFicha?.tipo === 'combo' ? 'Vista combo' : label}
              </button>
            ))}
          </div>}
          {modo !== 'legales' && vista === 'producto' && productosFicha.length > 0 && (
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
              : (vista === 'inicio' && !inicioEsBase ? 'Mostrando tu diseño actual.' : 'Así se ve la tienda con lo que configuraste.')}
        </p>
      </div>
      )}

      <div className={`flex-1 min-h-0 min-w-0 flex justify-center ${soloLienzo ? '' : ampliada ? 'p-4 md:p-6' : 'px-4 pb-4'}`}>
        {productos.length === 0 && modo !== 'legales' ? (
          <div className="w-full max-w-[390px] rounded-[28px] border border-dashed border-border-strong flex items-center justify-center p-8 text-center text-sm text-fg-muted">
            Elegí productos y los vas a ver acá.
          </div>
        ) : escritorio ? (
          // En marcos angostos se simula un escritorio de 1280 px. Si hay
          // más espacio, el viewport crece y la página adapta su propio layout.
          <div className={`ecommerce-desktop-preview w-full h-full min-w-0 flex flex-col overflow-hidden bg-surface ${soloLienzo ? '' : 'rounded-xl border border-border-strong shadow-xl'}`}>
            {!soloLienzo && <div className="h-7 shrink-0 flex items-center gap-1.5 px-3 bg-surface border-b border-border" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
            </div>}
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

function EditorMedioBanner({ banner, tamano = 'mediano', dispositivo = 'escritorio', onCambiar, onSubir }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [avisoProporcion, setAvisoProporcion] = useState('');
  const esMovil = dispositivo === 'movil';
  const campoImagen = esMovil ? 'imagen_mobile' : 'imagen';
  const campoPosicion = esMovil ? 'posicion_mobile' : 'posicion_desktop';
  // Sin imagen propia de celular, el campo queda vacío a propósito (hereda
  // la de escritorio en el runtime) — mostramos esa herencia acá también.
  const medio = esMovil ? (banner.imagen_mobile || banner.imagen || '') : (banner.imagen || '');
  const heredaDeEscritorio = esMovil && !banner.imagen_mobile;
  const tipo = banner.tipo_medio || inferirTipoMedio(medio);
  const esVideo = tipo === 'video';
  const esGif = tipo === 'gif';
  const recomendado = (TAMANOS_BANNER[tamano] || TAMANOS_BANNER.mediano)[esMovil ? 'mobile' : 'desktop'];
  const accept = esVideo ? 'video/mp4,video/webm,video/ogg' : esGif ? 'image/gif' : 'image/jpeg,image/png,image/webp';
  const ayudaMedio = esVideo
    ? 'Subí un MP4/WEBM liviano o pegá una URL directa al video.'
    : esGif
      ? 'Subí un GIF optimizado o pegá una URL pública.'
      : 'Subí JPG, PNG o WEBP, o pegá una URL pública.';
  const uploadLabel = subiendo ? 'Subiendo...' : esVideo ? 'Subir video' : esGif ? 'Subir GIF' : 'Subir imagen';

  // Validación no bloqueante: si la proporción de la imagen se aleja mucho
  // de la recomendada para este tamaño/dispositivo, avisa pero no impide
  // guardar — la decisión final es del comercio.
  useEffect(() => {
    setAvisoProporcion('');
    if (esVideo || esGif || !medio) return;
    const img = new window.Image();
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const real = img.naturalWidth / img.naturalHeight;
      const ideal = recomendado.w / recomendado.h;
      if (Math.abs(real / ideal - 1) > 0.18) {
        setAvisoProporcion(`La imagen es ${img.naturalWidth}×${img.naturalHeight}px — bastante distinta a lo recomendado (${recomendado.w}×${recomendado.h}). Puede recortarse más de lo esperado.`);
      }
    };
    img.src = getMediaUrl(medio);
    return () => { img.onload = null; };
  }, [medio, recomendado.w, recomendado.h, esVideo, esGif]);

  async function alElegir(event) {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo || !onSubir) return;
    setError('');
    setSubiendo(true);
    try {
      const url = await onSubir(archivo);
      onCambiar({ [campoImagen]: url, tipo_medio: tipoMedioDeArchivo(archivo) });
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
          <p className="text-xs font-semibold text-fg">Medio del banner{esMovil ? ' (celular)' : ''}</p>
          <p className="text-[11px] text-fg-muted">{heredaDeEscritorio ? 'Sin imagen propia: usa la de escritorio.' : ayudaMedio}</p>
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
        {!esMovil && (
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
        )}
        <div className={esMovil ? 'sm:col-span-2' : ''}>
          <CampoTexto
            label={esMovil ? 'URL de la imagen en celular' : 'URL del medio'}
            value={esMovil ? (banner.imagen_mobile || '') : medio}
            onChange={v => onCambiar({ [campoImagen]: v, ...(esMovil ? {} : { tipo_medio: inferirTipoMedio(v) || tipo }) })}
            placeholder={esMovil ? 'Vacío = usa la misma imagen que escritorio' : (tipo === 'video' ? 'https://.../banner.mp4 o https://.../banner.webm' : 'https://... o /uploads/banner.gif')}
            maxLength={320}
          />
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-primary/[0.06] px-3 py-2 text-[11px] leading-relaxed text-fg-muted">
        Imagen recomendada: <strong className="text-fg">{recomendado.w} × {recomendado.h} px</strong> ({TAMANOS_BANNER[tamano]?.etiqueta || 'Mediano'}, {esMovil ? 'celular' : 'escritorio'}). Mantené el texto importante centrado y evitá ponerlo muy cerca de los bordes.
      </div>
      {avisoProporcion && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-warning">
          <AlertTriangle size={13} className="mt-px shrink-0" /> {avisoProporcion}
        </p>
      )}
      {medio && (
        <>
          <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface-2">
            {tipo === 'video'
              ? <video src={getMediaUrl(medio)} className="h-28 w-full object-cover" style={{ objectPosition: banner[campoPosicion] }} muted playsInline loop controls />
              : <img src={getMediaUrl(medio)} alt="" className="h-28 w-full object-cover" style={{ objectPosition: banner[campoPosicion] }} />}
          </div>
          <div className="mt-2">
            <span className="block text-[11px] font-medium text-fg-muted mb-1">Posición de la imagen ({esMovil ? 'celular' : 'escritorio'})</span>
            <div className="grid w-24 grid-cols-3 gap-1">
              {POSICIONES_IMAGEN.map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  title={etiqueta}
                  aria-label={etiqueta}
                  aria-pressed={banner[campoPosicion] === valor}
                  onClick={() => onCambiar({ [campoPosicion]: valor })}
                  className={`h-7 w-7 rounded border ${banner[campoPosicion] === valor ? 'border-primary bg-primary' : 'border-border bg-surface hover:border-border-strong'}`}
                />
              ))}
            </div>
          </div>
        </>
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

function EditorBannersInicio({ banners, categorias = [], variante, tamano, onCambiarTamano, dispositivo = 'escritorio', onAgregar, onCambiar, onQuitar, onMover, onSubir }) {
  const [colapsados, setColapsados] = useState({});
  const esMovil = dispositivo === 'movil';
  function alternar(id) {
    setColapsados(prev => ({ ...prev, [id]: !prev[id] }));
  }
  return (
    <div className="space-y-3">
      {variante === 'embebido' && (
        <p className="text-xs text-fg-muted">Estilo: <strong>Encabezado embebido</strong> — se cambia en el panel de Encabezado.</p>
      )}
      {onCambiarTamano && (
      <div className="rounded-xl border border-border bg-surface-2/50 p-3">
        <p className="text-sm font-semibold text-fg">Tamaño del banner principal</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">Elegí cuánto espacio ocupa el banner en tu tienda.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Object.entries(TAMANOS_BANNER).map(([valor, info]) => (
            <button
              key={valor}
              type="button"
              onClick={() => onCambiarTamano(valor)}
              aria-pressed={tamano === valor}
              className={`rounded-lg border p-3 text-left transition-colors ${tamano === valor ? 'border-primary bg-primary/[0.06]' : 'border-border bg-surface hover:border-border-strong'}`}
            >
              {/* Miniatura proporcional al aspect-ratio de escritorio de cada tamaño. */}
              <div className="mb-2 w-full rounded border border-border bg-surface-2" style={{ aspectRatio: `${info.desktop.w} / ${info.desktop.h}` }} />
              <span className="block text-sm font-semibold text-fg">
                {info.etiqueta}
                {valor === 'mediano' && <span className="ml-1 text-[10px] font-normal text-fg-muted">(recomendado)</span>}
              </span>
              <span className="mt-0.5 block text-xs text-fg-muted">{info.ayuda}</span>
            </button>
          ))}
        </div>
        {!tamano && (
          <p className="mt-2 text-[11px] text-fg-muted">Sin elegir, el banner mantiene el alto de siempre (no se le cambia el aspecto solo).</p>
        )}
        {variante === 'embebido' && tamano === 'pequeno' && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-warning">
            <AlertTriangle size={13} className="mt-px shrink-0" /> Banner pequeño + encabezado embebido puede quedar justo de espacio en pantallas chicas — revisá la vista previa en celular.
          </p>
        )}
      </div>
      )}
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
              <EditorMedioBanner banner={banner} tamano={tamano} dispositivo={dispositivo} onCambiar={cambio => onCambiar(banner.id, cambio)} onSubir={onSubir} />
              {esMovil && (
                <label className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-fg">
                  <input
                    type="checkbox"
                    checked={banner.activo_mobile !== false}
                    onChange={e => onCambiar(banner.id, { activo_mobile: e.target.checked })}
                    className="accent-primary"
                  />
                  Mostrar este banner en celular
                </label>
              )}
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
function FilaBloqueInicio({ numero, etiqueta, tipo, visible, fijo = false, arrastre = null, onAlternar, panel, abierto, onAbrir }) {
  const tienePanel = !!panel;
  // Comparte el arrastre de producto y combo. Solo el asa inicia el gesto;
  // los campos del panel siguen permitiendo seleccionar y editar texto.
  const { filaProps, manijaProps, arrastrando, bloqueado, fueraDeGrupo, recienMovido, posicion } = arrastre || {};
  return (
    <div
      {...(filaProps || {})}
      data-bloque-inicio={tipo} data-arrastrando={arrastrando || undefined} style={{ order: posicion }}
      className={`rounded-xl border bg-surface transition-[box-shadow,opacity,border-color] duration-200 ${arrastrando ? 'border-dashed border-primary bg-primary/5 opacity-60' : bloqueado ? 'border-border' : fueraDeGrupo ? 'border-border opacity-40' : recienMovido ? 'border-primary ring-4 ring-primary/25' : abierto ? 'border-primary ring-2 ring-primary/30' : visible === false ? 'border-border bg-surface-2/40 opacity-70' : 'border-border'}`}
    >
      <div data-inicio-cabecera className="flex items-center gap-2 p-2.5">
        {!fijo && arrastre ? (
          <span
            {...(manijaProps || {})}
            className="touch-none select-none inline-flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-fg-muted hover:text-fg active:cursor-grabbing"
            aria-label={`Arrastrar ${etiqueta} para cambiar su lugar`}
            title="Arrastrá para mover"
          >
            <GripVertical size={15} />
          </span>
        ) : (
          <span className="inline-flex h-8 w-6 shrink-0 items-center justify-center text-fg-muted/60" title={fijo ? 'Fijo: no se mueve' : undefined}>
            {fijo && <Lock size={13} />}
          </span>
        )}
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
          {bloqueado ? <span title="Bloque fijo: no se puede soltar acá" aria-label="Destino bloqueado" className="shrink-0 text-xs text-fg-muted"><Lock size={13} /></span> : fijo && <span className="text-[11px] font-medium text-fg-muted">Fijo</span>}
          {tienePanel && (
            <button type="button" onClick={() => onAbrir(abierto ? null : numero)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs font-semibold text-fg-muted hover:text-fg" aria-expanded={abierto} aria-label={`${abierto ? 'Contraer' : 'Expandir'} ${etiqueta}`}>
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
export function EditorBloquesInicio({ bloques, onReordenar, onAlternar, paneles = {}, menuPanel, codigoInicio, onCambiarCodigo, tienda, venta, productos, bloqueAbierto = null }) {
  // El bloque abierto se recuerda por tipo, no por posición: al arrastrar
  // otro bloque, el que está abierto sigue abierto.
  const [abierto, setAbierto] = useState(null);
  const listaRef = useRef(null);
  useEffect(() => {
    if (!bloqueAbierto?.clave) return;
    setAbierto(bloqueAbierto.clave);
    const frame = requestAnimationFrame(() => {
      const fila = Array.from(listaRef.current?.querySelectorAll('[data-bloque-inicio]') || [])
        .find(el => el.dataset.bloqueInicio === bloqueAbierto.clave);
      if (fila) llevarBloqueALaVista(fila);
    });
    return () => cancelAnimationFrame(frame);
  }, [bloqueAbierto]);
  const anuncios = bloques.find(b => b.tipo === BLOQUE_INICIO_FIJO) || null;
  const movibles = bloques.filter(b => b.tipo !== BLOQUE_INICIO_FIJO);
  const fijosArriba = [...(anuncios ? [anuncios] : []), { tipo: '__menu__' }];
  const orden = [...fijosArriba.map(b => b.tipo), ...movibles.map(b => b.tipo), '__footer__'];
  const { listaBloquesRef, arrastre, recienMovido, ordenVisible, controlArrastre, dentroDeLista } = useArrastreBloques({
    orden, grupo: clave => movibles.some(b => b.tipo === clave) ? 'contenido' : null,
    mover: moverBloqueEnLista, atributo: 'data-bloque-inicio', selectorCabecera: '[data-inicio-cabecera]', tipo: 'application/x-gesicomm-inicio',
    describirLimite: () => 'Movelo entre los bloques de contenido, después de Encabezado y antes de Footer. Barra de anuncios, Encabezado y Footer quedan fijos.',
    onGuardar: (nuevo, origen) => onReordenar(movibles.findIndex(b => b.tipo === origen), nuevo.filter(k => movibles.some(b => b.tipo === k)).indexOf(origen)),
  });
  const controles = clave => ({
    posicion: ordenVisible.indexOf(clave), arrastrando: arrastre?.origen === clave,
    bloqueado: arrastre?.bloqueado === clave, fueraDeGrupo: !!arrastre && !movibles.some(b => b.tipo === clave),
    recienMovido: recienMovido === clave,
    manijaProps: { draggable: true, ...controlArrastre.puntero(clave),
      onDragStart: e => controlArrastre.empezar(clave, e), onDragEnd: controlArrastre.terminar },
    filaProps: { onDragOver: e => controlArrastre.sobre(clave, e), onDrop: controlArrastre.soltar },
  });

  function renderFila(b, numero) {
    const esMenu = b.tipo === '__menu__';
    const tipoSeccion = esMenu ? 'encabezado' : b.tipo;
        const panelCompleto = codigoInicio ? (
          <div className="space-y-3">
            {esMenu ? menuPanel : paneles[b.tipo]}
            <EditorCodigoSeccion
              tipo={tipoSeccion}
              codigoInicio={codigoInicio}
              onCambiarCodigo={onCambiarCodigo}
              tienda={tienda}
              venta={venta}
              productos={productos}
            />
          </div>
        ) : (esMenu ? menuPanel : paneles[b.tipo]);
    return (
      <FilaBloqueInicio
        key={b.tipo}
        tipo={b.tipo}
        numero={numero}
        etiqueta={esMenu ? 'Encabezado' : (ETIQUETAS_BLOQUE_INICIO[b.tipo] || b.tipo)}
        visible={esMenu ? undefined : b.visible}
        fijo={!movibles.some(v => v.tipo === b.tipo)}
        arrastre={controles(b.tipo)}
        onAlternar={esMenu ? null : () => onAlternar(b.tipo)}
        panel={panelCompleto}
        abierto={abierto === b.tipo}
        onAbrir={valor => setAbierto(valor === null ? null : b.tipo)}
      />
    );
  }

  return (
    <div ref={el => { listaRef.current = el; listaBloquesRef.current = el; }} className="flex flex-col gap-2" onDragOver={dentroDeLista} onDrop={controlArrastre.soltar}>
      <p style={{ order: -2 }} className="text-xs leading-relaxed text-fg-muted">Podés mover los bloques de contenido entre Encabezado y Footer. <span className="font-semibold">Barra de anuncios, Encabezado y Footer quedan fijos.</span></p>
      <span role="status" className="sr-only" style={{ order: -1 }}>{arrastre ? arrastre.bloqueado ? 'Bloqueado: este bloque es fijo. Soltá entre Encabezado y Footer.' : 'Moviendo un bloque de contenido. Los demás se desplazan para mostrar su nueva posición.' : ''}</span>
      {fijosArriba.map((b, idx) => renderFila(b, idx + 1))}
      {movibles.map((b, idx) => renderFila(b, fijosArriba.length + idx + 1))}
      <FilaBloqueInicio tipo="__footer__" numero={fijosArriba.length + movibles.length + 1} etiqueta="Footer" fijo arrastre={controles('__footer__')} />
    </div>
  );
}

// "Instrucciones para la IA" de Vista producto: el mismo flujo que el diseño
// de cada sección del Inicio (EditorCodigoSeccion), pero para la ficha entera
// y sin mostrar código. El comercio copia el prompt maestro de la ficha
// (promptsFichaProducto.js: estructura, bloques del panel y motor comercial),
// la IA le pregunta qué quiere y devuelve HTML/CSS/JS, y al pegarlo acá
// reemplaza la ficha. Queda marcada como propia: si no, se la tomaba por la
// base y la vista previa, el guardado y la página publicada volvían a la
// plantilla (ver esFichaProductoBase).
export function InstruccionesIaFicha({ codigos, onCambiarCodigo, onRestaurarCodigo, tienda, venta, productos, producto }) {
  const esBase = esFichaProductoBase(codigos?.producto?.html);
  const actual = esBase ? PLANTILLA_PRODUCTO : codigos.producto;
  const [pegado, setPegado] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmarBase, setConfirmarBase] = useState(false);

  function copiarInstrucciones() {
    const prompt = armarPromptFichaProducto({ tienda, venta, productos, producto, base: actual });
    navigator.clipboard?.writeText(prompt).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }).catch(() => setError('No se pudo copiar. Probá de nuevo.'));
  }

  function aplicar() {
    const dividido = dividirCodigoPegado(pegado);
    if (!dividido.html && !dividido.css && !dividido.js) {
      setError('No encontramos código en lo que pegaste. Pegá la respuesta completa de la IA, con sus bloques html, css y js.');
      return;
    }
    if (dividido.html) {
      const faltan = faltantesFicha(dividido.html);
      if (faltan.length) {
        setError(`A la ficha nueva le falta ${faltan.join(', ')}. Pedile a la IA que lo agregue y volvé a pegar la respuesta.`);
        return;
      }
    }
    setError('');
    const html = marcarFichaPersonalizada(dividido.html ?? actual.html);
    onCambiarCodigo('producto', 'html', html);
    onCambiarCodigo('producto', 'css', dividido.css ?? actual.css ?? '');
    onCambiarCodigo('producto', 'js', dividido.js ?? actual.js ?? '');
    const sinConexion = bloquesFichaFaltantes(html, BLOQUES_FICHA_PANEL.map(b => b.clave))
      .map(clave => BLOQUES_FICHA_PANEL.find(b => b.clave === clave))
      .map(b => `${b.numero} · ${b.titulo}`);
    // Una IA que devuelve solo "lo que cambió" deja la ficha sin estilos.
    const cssCorto = dividido.css !== undefined && dividido.css.trim().length < 2500;
    setAviso([
      'Listo: la vista previa ya muestra la ficha nueva.',
      sinConexion.length && `Ojo: estos bloques ya no están conectados al panel (no se pueden ocultar, ordenar ni marcar): ${sinConexion.join(', ')}. Si los querés, pedile a la IA que conserve su data-gesicomm-ficha-bloque.`,
      cssCorto && 'El CSS que devolvió la IA es muy corto: si la ficha se ve sin estilos, pedile el CSS completo de la ficha, no solo lo que cambió.',
      'Guardá para publicarla.',
    ].filter(Boolean).join(' '));
    setPegado('');
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-2/60 px-4 py-3">
        <p className="text-sm font-semibold text-fg">{esBase ? 'Tu ficha usa el diseño base de Gesicomm' : 'Tu ficha tiene un diseño propio'}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
          Las instrucciones le explican a la IA cómo está armada la ficha, qué hace cada bloque de este panel y el motor comercial (precio, oferta, order bump, paquetes, botones de compra). Lo que cargás en los bloques de arriba sigue funcionando con el diseño nuevo.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">1 · Copiá las instrucciones</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copiarInstrucciones}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-surface border border-border text-sm font-semibold text-fg hover:border-border-strong"
          >
            {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? 'Instrucciones copiadas' : 'Copiar instrucciones para la IA'}
          </button>
        </div>
        <p className="text-[12px] leading-relaxed text-fg-muted">Pegalas en ChatGPT, Claude o Gemini. La IA te va a preguntar qué querés cambiar y cómo lo querés ver antes de generar nada: respondele ahí (podés subir una imagen de referencia). Si tu IA convierte el texto en un archivo adjunto, está bien.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="ia-ficha-respuesta" className="block text-xs font-semibold uppercase tracking-wide text-fg-muted">2 · Pegá la respuesta de la IA</label>
        <textarea
          id="ia-ficha-respuesta"
          value={pegado}
          onChange={e => { setPegado(e.target.value); setError(''); setAviso(''); }}
          rows={5}
          spellCheck={false}
          placeholder="Pegá acá la respuesta completa de la IA (los bloques html, css y js)"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-fg outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={aplicar}
          disabled={!pegado.trim()}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-fg text-sm font-semibold disabled:opacity-45"
        >
          <Sparkles size={15} /> Aplicar a la ficha
        </button>
      </div>

      {error && <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}</p>}
      {aviso && <p role="status" className="text-[13px] text-success">{aviso}</p>}

      {!esBase && onRestaurarCodigo && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {confirmarBase ? (
            <>
              <span className="text-[13px] text-fg">¿Volver al diseño base? Se pierde el diseño propio de la ficha.</span>
              <button type="button" onClick={() => { onRestaurarCodigo('producto'); setConfirmarBase(false); setAviso('La ficha volvió al diseño base. Guardá para publicarla.'); }} className="h-8 px-3 rounded-lg bg-danger text-danger-fg text-xs font-semibold">Sí, volver</button>
              <button type="button" onClick={() => setConfirmarBase(false)} className="h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg-muted hover:text-fg">Cancelar</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmarBase(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg-muted hover:text-fg">
              <RefreshCw size={13} /> Volver al diseño base
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Mini-editor de código (HTML/CSS) de UNA sola sección de Inicio, con el
// mismo flujo de copiar/pegar que "Código avanzado" (InstruccionesIaPagina)
// pero scoped a esta sección nomás — ver seccionesCodigo.js y
// promptsSeccionInicio.js. No depende de ninguna IA conectada: arma un
// prompt de texto para copiar y pegar en ChatGPT/Claude/Gemini, igual que
// ya hace promptsCodigo.js para la página completa.
function EditorCodigoSeccion({ tipo, codigoInicio, onCambiarCodigo, tienda, venta, productos }) {
  const [abierto, setAbierto] = useState(false);
  const fragmentoHtml = useMemo(() => extraerFragmentoHtml(codigoInicio.html, tipo), [codigoInicio.html, tipo]);
  const seccionCss = useMemo(() => extraerSeccionCss(codigoInicio.css, tipo), [codigoInicio.css, tipo]);
  const [htmlDraft, setHtmlDraft] = useState(fragmentoHtml);
  const [cssDraft, setCssDraft] = useState(seccionCss);
  const [pegado, setPegado] = useState('');
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => { setHtmlDraft(fragmentoHtml); }, [fragmentoHtml]);
  useEffect(() => { setCssDraft(seccionCss); }, [seccionCss]);

  function aplicar(nuevoHtmlFrag, nuevoCssFrag) {
    const perdidos = bindsDeTiendaPerdidos(fragmentoHtml, nuevoHtmlFrag);
    if (perdidos.length) {
      setError(`Esto borra datos de tu tienda que no se pueden perder (${perdidos.join(', ')}). Pedile a la IA que los mantenga y volvé a pegar.`);
      return false;
    }
    if (!fragmentoHtml) {
      setError(`No se encontró el bloque "${tipo}" en el código actual — no se puede reemplazar.`);
      return false;
    }
    setError('');
    // Marcado como personalizado: sin esto el inicio seguía contando como
    // "base", la vista previa mostraba la plantilla limpia y al guardar se
    // pisaba lo que devolvió la IA.
    onCambiarCodigo?.('inicio', 'html', marcarPersonalizado(reemplazarFragmentoHtml(codigoInicio.html, tipo, nuevoHtmlFrag)));
    onCambiarCodigo?.('inicio', 'css', reemplazarSeccionCss(codigoInicio.css, tipo, nuevoCssFrag));
    // El JS que se estaba viendo (el de la base, si el inicio era base) pasa
    // a ser el del inicio guardado: si no, al dejar de ser "base" perdía los
    // carruseles y contadores de la plantilla.
    onCambiarCodigo?.('inicio', 'js', codigoInicio.js || '');
    return true;
  }

  function copiarPrompt() {
    const prompt = armarPromptSeccionInicio(tipo, {
      tienda, venta, productos,
      base: { html: fragmentoHtml, css: seccionCss, js: '' },
    });
    navigator.clipboard?.writeText(prompt).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }).catch(() => {});
  }

  function aplicarPegado() {
    const dividido = dividirCodigoPegado(pegado);
    const nuevoHtml = dividido.html ?? htmlDraft;
    const nuevoCss = dividido.css ?? cssDraft;
    const ok = aplicar(nuevoHtml, nuevoCss);
    if (ok) {
      setHtmlDraft(nuevoHtml);
      setCssDraft(nuevoCss);
      setPegado('');
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-xs font-semibold text-fg-muted hover:text-fg"
      >
        <FileCode2 size={13} /> Diseño (código) de esta sección
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-fg"><FileCode2 size={13} /> Diseño (código) de esta sección</p>
        <button type="button" onClick={() => setAbierto(false)} className="text-xs text-fg-muted hover:text-fg">Cerrar</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copiarPrompt}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface border border-border text-xs font-semibold text-fg hover:border-border-strong"
        >
          {copiado ? <Check size={13} /> : <FileCode2 size={13} />} {copiado ? 'Prompt copiado' : 'Copiar prompt para IA'}
        </button>
        <span className="text-[11px] text-fg-muted">Pegalo en ChatGPT, Claude o Gemini y contale qué querés cambiar y cómo lo querés ver. Podés sumar una imagen de referencia. Copiá la respuesta completa y pegala abajo.</span>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold text-fg-muted">Pegá el HTML completo de esta sección</label>
        <textarea
          value={pegado}
          onChange={e => setPegado(e.target.value)}
          rows={4}
          placeholder="Pegá acá la respuesta completa de la IA, con el CSS incluido dentro de <style>"
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-mono text-fg outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={aplicarPegado}
          disabled={!pegado.trim()}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-fg text-xs font-semibold disabled:opacity-45"
        >
          Aplicar a esta sección
        </button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-fg-muted">HTML de la sección</label>
          <textarea
            value={htmlDraft}
            onChange={e => setHtmlDraft(e.target.value)}
            onBlur={() => aplicar(htmlDraft, cssDraft)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-mono text-fg outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-fg-muted">CSS de la sección</label>
          <textarea
            value={cssDraft}
            onChange={e => setCssDraft(e.target.value)}
            onBlur={() => aplicar(htmlDraft, cssDraft)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-mono text-fg outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}

function EditorAnuncios({ anuncios, variante, onCambiar, onAgregar, onQuitar }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-fg-muted">La franja que se mueve arriba del todo. Si no agregás ninguno, se muestran unos de ejemplo. Sin elegir ícono, se van ciclando unos genéricos.</p>
      {variante === 'embebido' && (
        <p className="text-xs text-fg-muted">Estilo: <strong>Encabezado embebido</strong> — se cambia en el panel de Encabezado.</p>
      )}
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
function EditorConfianzaInicio({ items, onCambiar, estilo, onEstilo }) {
  const slots = Array.from({ length: 3 }, (_, i) => items?.[i] || CONFIANZA_INICIO_DEFAULT[i] || { icono: '', titulo: '', texto: '' });
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-fg-muted">Presentación de confianza
        <select className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg" value={estilo || 'compacta'} onChange={e => onEstilo(e.target.value)}>
          <option value="compacta">Barra horizontal compacta</option><option value="tarjetas">Tarjetas individuales</option><option value="destacada">Sección destacada</option>
        </select>
      </label>
      <p className="text-xs text-fg-muted">Escribí o pegá cualquier emoji, también combinaciones. Se muestra arriba del título, con detalles en el color de tu tienda. Describí solo las condiciones que ofrecés.</p>
      {slots.map((it, idx) => (
        <div key={idx} className="grid grid-cols-1 sm:grid-cols-[110px_1fr_1fr] gap-2 rounded-lg border border-border p-2.5">
          <div className="space-y-2">
            <span aria-hidden="true" className="flex min-h-12 w-fit min-w-12 items-center justify-center rounded-xl bg-primary/10 px-2 text-2xl" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{it.icono}</span>
            <label className="block text-xs text-fg-muted">Emoji<input type="text" aria-label={`Emoji del beneficio ${idx + 1}`} className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-2 text-lg text-fg" value={it.icono} onChange={e => onCambiar(idx, { icono: e.target.value })} placeholder="Pegá un emoji" /></label>
          </div>
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

function EditorTestimoniosInicio({ testimonios, onCambiar, onCambiarItem, onAgregar, onQuitar, onSubir }) {
  const items = testimonios?.items || [];
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">Se muestra en la homepage solo cuando cargás al menos una opinión real. Podés sumar foto, nombre, estrellas y el comentario.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CampoTexto label="Rótulo" value={testimonios?.kicker || ''} onChange={v => onCambiar({ kicker: v })} placeholder="Opiniones" maxLength={40} />
        <CampoTexto label="Título" value={testimonios?.titulo || ''} onChange={v => onCambiar({ titulo: v })} placeholder="Clientes que ya compraron." maxLength={100} />
        <div className="sm:col-span-2">
          <CampoTexto label="Subtítulo" value={testimonios?.subtitulo || ''} onChange={v => onCambiar({ subtitulo: v })} placeholder="Comentarios reales de personas que confiaron en tu tienda." maxLength={180} />
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <EditorTestimonioInicio
            key={item.id || idx}
            item={item}
            numero={idx + 1}
            onCambiar={cambio => onCambiarItem(item.id, cambio)}
            onQuitar={() => onQuitar(item.id)}
            onSubir={onSubir}
          />
        ))}
        {items.length < 8 && (
          <button type="button" onClick={onAgregar} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border text-sm font-semibold text-fg hover:border-border-strong">
            <Plus size={15} /> Agregar testimonio
          </button>
        )}
      </div>
    </div>
  );
}

function EditorTestimonioInicio({ item, numero, onCambiar, onQuitar, onSubir }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const foto = getMediaUrl(item.foto || '');

  async function alElegir(event) {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo || !onSubir) return;
    setError('');
    setSubiendo(true);
    try {
      const url = await onSubir(archivo);
      onCambiar({ foto: url });
    } catch {
      setError('No se pudo subir la foto. Probá con JPG, PNG o WEBP.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-fg">Testimonio {numero}</p>
        <button type="button" onClick={onQuitar} className="h-8 px-2.5 rounded-lg border border-border text-xs font-medium text-danger hover:bg-danger/[0.06]">Quitar</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[112px_1fr]">
        <div className="space-y-2">
          <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-border bg-surface-2">
            {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-semibold text-fg-muted">Foto</span>}
          </div>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-fg hover:border-border-strong">
            {subiendo ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />}
            Subir
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={!onSubir || subiendo} onChange={alElegir} />
          </label>
          {error && <p className="text-[11px] text-danger">{error}</p>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoTexto label="Nombre" value={item.nombre || ''} onChange={v => onCambiar({ nombre: v })} placeholder="María López" maxLength={60} />
          <CampoTexto label="Detalle" value={item.detalle || ''} onChange={v => onCambiar({ detalle: v })} placeholder="Compra verificada" maxLength={80} />
          <label className="block">
            <span className="block text-xs font-medium text-fg-muted mb-1">Estrellas</span>
            <select
              value={item.calificacion || 5}
              onChange={e => onCambiar({ calificacion: Number(e.target.value) })}
              className="w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
            >
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} estrella{n === 1 ? '' : 's'}</option>)}
            </select>
          </label>
          <CampoTexto label="URL de foto" value={item.foto || ''} onChange={v => onCambiar({ foto: v })} placeholder="https://..." maxLength={320} />
          <div className="sm:col-span-2">
            <CampoTexto label="Qué dijo" value={item.comentario || ''} onChange={v => onCambiar({ comentario: v })} placeholder="Llegó rápido y el producto era tal cual la descripción." maxLength={360} multiline />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorProductosCategoria({ config, enLanding, incluirCombos, onCambiar, onAlternarItem }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">Por defecto se muestran todos los productos, agrupados por categoría. Elegí productos abajo solo si querés mostrar una selección puntual en vez de todo el catálogo.</p>
      <label className="flex items-center gap-2 text-sm text-fg">
        <input type="checkbox" checked={config.mostrar_combos !== false} onChange={e => onCambiar({ mostrar_combos: e.target.checked })} className="accent-primary" />
        Mostrar combos
      </label>
      <p className="text-xs text-fg-muted">Incluye los combos activos de esta landing y agrega la pestaña Combos para encontrarlos.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CampoTexto label="Rótulo (kicker)" value={config.kicker} onChange={v => onCambiar({ kicker: v })} placeholder="PRODUCTOS" maxLength={40} />
        <CampoTexto label="Título" value={config.titulo} onChange={v => onCambiar({ titulo: v })} placeholder="Productos seleccionados" maxLength={100} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-medium text-fg-muted mb-1">Mostrar productos como</span>
          <select value={config.formato || 'filas'} onChange={e => onCambiar({ formato: e.target.value })}
            className="w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary">
            <option value="filas">Filas</option>
            <option value="carrusel">Carrusel</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-fg-muted mb-1">{config.formato === 'carrusel' ? 'Productos a la vista (escritorio)' : 'Productos por fila (escritorio)'}</span>
          <select value={config.columnas || 4} onChange={e => onCambiar({ columnas: Number(e.target.value) })}
            className="w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-fg-muted mb-1">Total de productos visibles</span>
          <input
            type="number" min="1" max="48" value={config.limite}
            onChange={e => onCambiar({ limite: Math.max(1, Math.min(48, Math.floor(Number(e.target.value) || 8))) })}
            className="w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
          />
        </label>
      </div>
      <p className="text-xs text-fg-muted">{config.formato === 'carrusel'
        ? 'Una fila horizontal: deslizá o usá las flechas para ver los demás productos. En tablet y móvil se muestran menos tarjetas a la vez.'
        : `Hasta ${Math.ceil((config.limite || 8) / (config.columnas || 4))} filas en escritorio, según los productos disponibles. En tablet y móvil se muestran menos columnas para facilitar la lectura.`}</p>
      <CampoTexto label="Subtítulo" value={config.subtitulo} onChange={v => onCambiar({ subtitulo: v })} placeholder="Explorá nuestra selección" maxLength={160} />
      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">Elegí qué productos entran (se agrupan solos por categoría)</p>
        <SelectorProductosPaginado
          elegidos={config.items || []}
          enLanding={enLanding}
          incluirCombos={incluirCombos}
          onAlternar={onAlternarItem}
        />
      </div>
    </div>
  );
}

const POR_PAGINA_SELECTOR = 10;

// La selección completa ya está cargada en enLanding (sin el recorte del
// preview). Buscar, filtrar y paginar esa selección evita consultar el
// catálogo general y mostrar productos que esta landing no vende.
// Lo reusan todos los selectores de productos del editor (destacados,
// recomendados, ficha, promos, ofertas); `maximo` bloquea sumar más elegidos
// y `mostrarElegidos={false}` saca los chips cuando se elige de a uno.
function SelectorProductosPaginado({ elegidos, enLanding, incluirCombos, onAlternar, maximo = Infinity, mostrarElegidos = true }) {
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      const limpio = texto.trim();
      setBusqueda((prev) => {
        if (prev !== limpio) setPagina(1);
        return limpio;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [texto]);

  const candidatos = useMemo(() => Array.from(enLanding, ([content_id, item]) => ({ ...item, content_id }))
    .filter(item => incluirCombos || item.tipo !== 'combo')
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { numeric: true })), [enLanding, incluirCombos]);
  const categorias = useMemo(() => [...new Set(candidatos.map(item => item.categoria).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es')), [candidatos]);
  const filtrados = useMemo(() => candidatos.filter(item =>
    (!categoria || item.categoria === categoria)
    && (!busqueda || String(item.nombre || '').toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')))), [candidatos, categoria, busqueda]);
  const totalPages = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA_SELECTOR));
  const paginaActual = Math.min(pagina, totalPages);
  const resultado = {
    items: filtrados.slice((paginaActual - 1) * POR_PAGINA_SELECTOR, paginaActual * POR_PAGINA_SELECTOR),
    total: filtrados.length, totalPages, categorias,
  };
  useEffect(() => { if (pagina !== paginaActual) setPagina(paginaActual); }, [pagina, paginaActual]);
  useEffect(() => { if (categoria && !categorias.includes(categoria)) { setCategoria(''); setPagina(1); } }, [categoria, categorias]);

  const elegidosVisibles = elegidos.filter(id => enLanding.has(id));
  const elegidosSet = new Set(elegidosVisibles);
  const lleno = elegidosVisibles.length >= maximo;
  return (
    <div className="space-y-2">
      {mostrarElegidos && elegidosVisibles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {elegidosVisibles.map((id) => {
            const item = enLanding.get(id);
            return (
              <span key={id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent bg-accent/[0.08] py-0.5 pl-2.5 pr-1 text-xs text-fg">
                <span className="truncate">{item?.nombre || id}</span>
                <button type="button" onClick={() => onAlternar(id)} aria-label={`Quitar ${item?.nombre || id}`}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-full hover:bg-surface-2">
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2">
        <label className="relative block">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar producto"
            className="w-full h-9 rounded-lg border border-border bg-surface-2 pl-8 pr-3 text-sm text-fg outline-none focus:border-primary"
          />
        </label>
        <select value={categoria} onChange={e => { setCategoria(e.target.value); setPagina(1); }}
          className="w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary">
          <option value="">Todas las categorías</option>
          {resultado.categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {resultado.items.length === 0 ? (
        <p className="text-sm text-fg-muted">No hay productos que coincidan.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {resultado.items.map((i) => {
            const contentId = i.content_id;
            const elegido = elegidosSet.has(contentId);
            const bloqueado = !elegido && lleno;
            const imagen = getMediaUrl(i.imagen);
            return (
              <button
                key={contentId}
                type="button"
                aria-pressed={elegido}
                disabled={bloqueado}
                title={bloqueado ? `Ya elegiste el máximo de ${maximo}` : undefined}
                onClick={() => onAlternar(contentId)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${elegido ? 'border-accent bg-accent/[0.08]' : 'border-border hover:border-border-strong hover:bg-surface-2'}`}
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
      <div className="flex items-center justify-between gap-2 text-xs text-fg-muted">
        <span>{`${resultado.total} producto${resultado.total === 1 ? '' : 's'}`}</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Página anterior" disabled={paginaActual <= 1} onClick={() => setPagina(Math.max(1, paginaActual - 1))}
            className="h-8 rounded-lg border border-border px-2.5 text-fg disabled:opacity-40">
            <ArrowLeft size={13} />
          </button>
          <span>Página {paginaActual} de {resultado.totalPages}</span>
          <button type="button" aria-label="Página siguiente" disabled={paginaActual >= resultado.totalPages} onClick={() => setPagina(paginaActual + 1)}
            className="h-8 rounded-lg border border-border px-2.5 text-fg disabled:opacity-40">
            <ArrowRight size={13} />
          </button>
        </div>
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

function EditorMenuPrincipal({ encabezado, items, categorias = [], tienda, dispositivo = 'escritorio', onCambiarEncabezado, onAgregar, onCambiar, onQuitar, onMover }) {
  const cfg = normalizarEncabezadoInicio(encabezado);
  const esMovil = dispositivo === 'movil';
  const logo = getMediaUrl(tienda?.logo || tienda?.logo_imagen || tienda?.logo_url || '');
  const nombre = tienda?.nombre || 'Tu tienda';
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
  // En escritorio se edita "variante"; en móvil se edita "variante_mobile",
  // que es un override opcional (null = hereda la de escritorio) — por eso
  // acá sí hay una tercera opción ("Igual que escritorio") y en el selector
  // de escritorio no.
  const variante = esMovil ? (cfg.variante_mobile || cfg.variante) : cfg.variante;
  const heredaDeEscritorio = esMovil && !cfg.variante_mobile;
  const cambiarVariante = valor => onCambiarEncabezado(esMovil ? { variante_mobile: valor } : { variante: valor });
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface-2/50 p-3">
        <p className="text-sm font-semibold text-fg">Estilo del encabezado{esMovil ? ' (celular)' : ''}</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          {esMovil
            ? 'Por defecto usa el mismo estilo que escritorio. Elegí uno acá solo si en celular querés que se vea distinto.'
            : 'Define cómo se componen juntos el encabezado, la barra de anuncios y el banner principal.'}
        </p>
        <div className={`mt-3 grid grid-cols-1 gap-2 ${esMovil ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {esMovil && (
            <button
              type="button"
              onClick={() => onCambiarEncabezado({ variante_mobile: null })}
              aria-pressed={heredaDeEscritorio}
              className={`rounded-lg border p-3 text-left transition-colors ${heredaDeEscritorio ? 'border-primary bg-primary/[0.06]' : 'border-border bg-surface hover:border-border-strong'}`}
            >
              <span className="block text-sm font-semibold text-fg">Igual que escritorio</span>
              <span className="mt-0.5 block text-xs text-fg-muted">Hereda la variante de arriba, sin override propio.</span>
            </button>
          )}
          {[
            { valor: 'normal', titulo: 'Encabezado separado', texto: 'El menú va en su propio contenedor, arriba del banner.' },
            { valor: 'embebido', titulo: 'Encabezado embebido', texto: 'El menú se superpone, transparente, sobre la foto del banner.' },
          ].map(opcion => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => cambiarVariante(opcion.valor)}
              aria-pressed={!heredaDeEscritorio && variante === opcion.valor}
              className={`rounded-lg border p-3 text-left transition-colors ${!heredaDeEscritorio && variante === opcion.valor ? 'border-primary bg-primary/[0.06]' : 'border-border bg-surface hover:border-border-strong'}`}
            >
              <span className="block text-sm font-semibold text-fg">{opcion.titulo}</span>
              <span className="mt-0.5 block text-xs text-fg-muted">{opcion.texto}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface-2/50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-fg">Marca del encabezado</p>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">El logo queda junto al nombre de la tienda en la barra superior.</p>
          </div>
          <div className={`flex min-w-[150px] items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 ${cfg.logo_posicion === 'centro' ? 'flex-col text-center' : ''}`}>
            {cfg.mostrar_logo && (logo ? (
              <img
                src={logo}
                alt=""
                className="shrink-0 object-contain"
                style={{
                  width: cfg.logo_tamano,
                  height: cfg.logo_tamano,
                  transform: `rotate(${cfg.logo_rotacion}deg)`,
                }}
              />
            ) : (
              <span
                className="grid shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-primary-fg"
                style={{
                  width: cfg.logo_tamano,
                  height: cfg.logo_tamano,
                  transform: `rotate(${cfg.logo_rotacion}deg)`,
                }}
              >
                {nombre.slice(0, 1).toUpperCase()}
              </span>
            ))}
            {cfg.mostrar_nombre && <span className="truncate text-sm font-black text-fg">{nombre}</span>}
            {!cfg.mostrar_logo && !cfg.mostrar_nombre && (
              <span className="text-xs font-medium text-fg-muted">Marca oculta</span>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <button
            type="button"
            role="switch"
            aria-checked={cfg.mostrar_logo}
            onClick={() => onCambiarEncabezado({ mostrar_logo: !cfg.mostrar_logo })}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-fg">Mostrar logo</span>
              <span className="block text-xs text-fg-muted">Oculta o muestra solo el logo del encabezado.</span>
            </span>
            <span className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${cfg.mostrar_logo ? 'bg-success' : 'bg-border-strong'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all ${cfg.mostrar_logo ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.mostrar_nombre}
            onClick={() => onCambiarEncabezado({ mostrar_nombre: !cfg.mostrar_nombre })}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-fg">Mostrar nombre</span>
              <span className="block text-xs text-fg-muted">Oculta o muestra solo el nombre de la tienda.</span>
            </span>
            <span className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${cfg.mostrar_nombre ? 'bg-success' : 'bg-border-strong'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all ${cfg.mostrar_nombre ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="block text-xs font-medium text-fg-muted mb-1">Tamaño del logo</span>
            <input
              type="range"
              min="28"
              max="128"
              value={cfg.logo_tamano}
              onChange={e => onCambiarEncabezado({ logo_tamano: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <span className="mt-1 block text-[11px] text-fg-muted">{cfg.logo_tamano}px</span>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-fg-muted mb-1">Rotación</span>
            <input
              type="range"
              min="-45"
              max="45"
              value={cfg.logo_rotacion}
              onChange={e => onCambiarEncabezado({ logo_rotacion: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <span className="mt-1 block text-[11px] text-fg-muted">{cfg.logo_rotacion}°</span>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-fg-muted mb-1">Posición</span>
            <select
              value={cfg.logo_posicion}
              onChange={e => onCambiarEncabezado({ logo_posicion: e.target.value })}
              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
            >
              <option value="izquierda">Logo a la izquierda</option>
              <option value="centro">Logo centrado arriba</option>
            </select>
          </label>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-sm font-semibold text-fg">Links del menú</p>
        <p className="mt-1 text-xs text-fg-muted">Estos links aparecen a la derecha de la marca.</p>
      </div>
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
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-surface shadow transition-all ${item.visible !== false ? 'left-[22px]' : 'left-0.5'}`} />
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
      <button type="button" onClick={onAgregar} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">
        <Plus size={16} /> Agregar link
      </button>
    </div>
  );
}

function EditorProductosDestacados({ enLanding, incluirCombos, destacadosValidos, seleccionLength, onAlternar, onVer }) {
  if (seleccionLength === 0) {
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
      <SelectorProductosPaginado
        elegidos={destacadosValidos}
        enLanding={enLanding}
        incluirCombos={incluirCombos}
        maximo={MAX_DESTACADOS}
        onAlternar={(contentId) => {
          onAlternar(contentId);
          onVer();
        }}
      />
    </div>
  );
}

function EditorPromosCatalogo({
  productos,
  productosPorContentId,
  incluirCombos,
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
  onDespublicar,
}) {
  // Se elige con el buscador paginado; abajo quedan a mano el que se está
  // editando y los que ya tienen countdown.
  const productosVisibles = useMemo(() => {
    const ids = [productoEditando?.content_id, ...ofertasSeleccionadas].filter(Boolean);
    return [...new Set(ids)].map(id => productosPorContentId.get(id)).filter(Boolean);
  }, [productoEditando, ofertasSeleccionadas, productosPorContentId]);
  if (!productos.length) {
    return <p className="text-sm text-fg-muted">Primero elegí productos para la landing o usá una regla de catálogo.</p>;
  }
  return (
    <div className="space-y-3">
      <SelectorProductosPaginado
        elegidos={productoEditando ? [productoEditando.content_id] : []}
        enLanding={productosPorContentId}
        incluirCombos={incluirCombos}
        mostrarElegidos={false}
        onAlternar={onEditar}
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {productosVisibles.map(item => {
          const contentId = item.content_id || contentIdPanel(item);
          const precio = Number(precioDeVenta(item)) || Number(precioPanel(item)) || 0;
          const ancla = Number(item.precio_ancla ?? item.precio_tachado) || 0;
          const descuento = ancla > precio && precio > 0 ? Math.round((1 - precio / ancla) * 100) : 0;
          const editando = productoEditando?.content_id === contentId;
          const enOferta = ofertasSeleccionadas.includes(contentId);
          return (
            <div key={contentId} className={`rounded-xl border p-3 ${editando ? 'border-primary bg-primary/[0.05]' : 'border-border bg-surface-2/40'}`}>
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
              <div className={`mt-3 grid grid-cols-1 gap-2 ${onDespublicar ? 'sm:grid-cols-2' : ''}`}>
                {enOferta && (
                  <span className={`inline-flex h-8 items-center justify-center rounded-lg border border-success/30 bg-success/10 px-3 text-xs font-semibold text-success ${onDespublicar ? 'sm:col-span-2' : ''}`}>
                    Countdown activo
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onEditar(contentId)}
                  className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors ${editando ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg hover:border-border-strong'}`}
                >
                  Editar promo
                </button>
                {onDespublicar && (
                  <button
                    type="button"
                    onClick={() => onDespublicar(item)}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-danger/30 bg-surface px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/[0.08]"
                  >
                    <X size={13} /> Despublicar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PromoCatalogoModal(props) {
  const { item, onCerrar } = props;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-fg/55 px-4 py-6" role="dialog" aria-modal="true" aria-label={`Editar promo de ${item?.nombre || 'producto'}`}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">Promo del producto</p>
            <h2 className="mt-1 truncate text-lg font-bold text-fg">{item?.titulo_comercial || item?.nombre || 'Producto'}</h2>
            <p className="mt-1 text-sm text-fg-muted">{item?.categoria || 'Sin categoría'}</p>
          </div>
          <button type="button" onClick={onCerrar} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-fg-muted hover:border-border-strong hover:text-fg" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto p-5">
          <EditorPromoCatalogoProducto {...props} />
        </div>
        <div className="flex justify-end border-t border-border px-5 py-4">
          <button type="button" onClick={onCerrar} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-fg hover:bg-primary-hover">
            Listo
          </button>
        </div>
      </div>
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
          maxLength={50}
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
            onChange={e => onOfertaFinAt(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
          />
          {!ofertaActiva && <span className="mt-1 block text-[11px] text-fg-muted">Al cargar una fecha se activa para este producto.</span>}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 p-4" role="dialog" aria-modal="true" onClick={onCerrar}>
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

export function EditorUrgenciaInicio({ titulo, texto, cta, finAt, confirmar, renovar, duracionHoras, duracionMinutos, duracionSegundos, onTitulo, onTexto, onCta, onFinAt, onConfirmar, onRenovar, onDuracionHoras, onDuracionMinutos, onDuracionSegundos }) {
  function fijarHoras(horas) {
    onFinAt(inputLocalEnHoras(horas));
    onDuracionHoras(horas);
    onDuracionMinutos(0);
    onDuracionSegundos(0);
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <CampoTexto label="Título del bloque" value={titulo} onChange={onTitulo} placeholder="Ofertas que terminan pronto" maxLength={80} />
      <CampoTexto label="Texto del CTA" value={cta} onChange={onCta} placeholder="Ver todos" maxLength={40} />
      <div className="sm:col-span-2"><CampoTexto label="Mensaje" value={texto} onChange={onTexto} placeholder="Aprovechá antes de que se agoten" maxLength={160} /></div>
      <label className="sm:col-span-2 flex items-center gap-2 text-sm text-fg">
        <input type="checkbox" checked={renovar} onChange={e => onRenovar(e.target.checked)} className="accent-primary" />
        Renovar sola en cada visita (en vez de una fecha fija para todos)
      </label>
      <p className="sm:col-span-2 text-[11px] leading-relaxed text-fg-muted">
        Con esta opción activa, cada visita inicia la duración completa y, al llegar a cero, la oferta y su descuento se renuevan automáticamente. El ciclo continúa hasta que desactives esta opción.
        {' '}Si la dejás desmarcada, la oferta dura únicamente hasta la fecha y hora de fin, iguales para todas las visitas. Al vencer, se quitan el descuento, el precio tachado y la etiqueta de oferta de los productos incluidos; dejan de aparecer en Ofertas y se oculta la sección de oferta flash. Los productos siguen disponibles en el catálogo.
      </p>
      {renovar ? (
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-medium text-fg-muted">Duración por visita</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Horas', duracionHoras, onDuracionHoras, 999],
              ['Minutos', duracionMinutos, onDuracionMinutos, 59],
              ['Segundos', duracionSegundos, onDuracionSegundos, 59],
            ].map(([label, valor, cambiar, max]) => (
              <label key={label} className="block">
                <span className="mb-1 block text-xs text-fg-muted">{label}</span>
                <input type="number" min={0} max={max} step={1} value={valor}
                  onChange={e => cambiar(e.target.value === '' ? '' : Math.min(max, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
                  className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary" />
              </label>
            ))}
          </div>
          {!(Number(duracionHoras) * 3600 + Number(duracionMinutos) * 60 + Number(duracionSegundos) > 0) && (
            <p role="alert" className="mt-1 text-xs text-red-600">Ingresá una duración mayor que cero.</p>
          )}
        </div>
      ) : (
        <>
          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-fg-muted mb-1">Fecha fin</span>
            <input
              type="datetime-local"
              step={1}
              value={finAt}
              onInput={e => onFinAt(e.currentTarget.value)}
              onChange={e => onFinAt(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
            />
          </label>
          <div className="sm:col-span-2 rounded-xl border border-border bg-surface-2/60 p-3">
            <p className="text-xs font-semibold text-fg">Duración rápida</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">Podés cargar una fecha exacta arriba o fijar el contador desde ahora.</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                ['Horas', duracionHoras, onDuracionHoras, 999],
                ['Minutos', duracionMinutos, onDuracionMinutos, 59],
                ['Segundos', duracionSegundos, onDuracionSegundos, 59],
              ].map(([label, valor, cambiar, max]) => (
                <label key={label} className="block">
                  <span className="mb-1 block text-xs text-fg-muted">{label}</span>
                  <input type="number" min={0} max={max} step={1} value={valor}
                    onChange={e => cambiar(e.target.value === '' ? '' : Math.min(max, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary" />
                </label>
              ))}
            </div>
            <button type="button"
              disabled={!(Number(duracionHoras) * 3600 + Number(duracionMinutos) * 60 + Number(duracionSegundos) > 0)}
              onClick={() => onFinAt(inputLocalEnHoras(Number(duracionHoras) + Number(duracionMinutos) / 60 + Number(duracionSegundos) / 3600))}
              className="mt-2 h-8 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-fg disabled:opacity-50">
              Aplicar duración desde ahora
            </button>
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
            Es la misma fecha para todas las visitas. Al llegar a esa fecha y hora, la oferta termina automáticamente y no se renueva. Si desactivás la renovación con una fecha fin ya vencida, la oferta termina de inmediato.
          </p>
        </>
      )}
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
  const [armandoCombo, setArmandoCombo] = useState(false);
  const tipoElegido = LABEL_TIPO_OFERTA_RAPIDA[estrategia] || null;

  useEffect(() => {
    // Con el formulario de una oferta abierto (modal del editor), Escape no
    // cierra el panel entero: se perdería lo que se estaba cargando.
    const alTeclear = e => { if (e.key === 'Escape' && !document.querySelector('.modal-overlay')) onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  // El producto se elige con el buscador paginado; solo se puede ofertar uno
  // de los que vende la landing (`productos`).
  const productosPorContentId = useMemo(
    () => new Map(productos.filter(p => enLanding.has(Number(p.id))).map(p => [contentIdPanel(p), p])),
    [productos, enLanding],
  );

  if ((producto && (estrategia === 'combo' || armandoCombo)) || (!producto && estrategia === 'combo' && permitirCombo)) {
    return (
      <PanelLazyErrorBoundary resetKey={`combo-${producto?.id || 'nuevo'}-${armandoCombo}-${estrategia || ''}`}>
        <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-canvas" role="status">Abriendo el armador de combos…</div>}>
          <ArmarComboPanel productos={productos} principalInicial={producto || null} landingPreview={landingPreview} onCerrar={onCerrar} onCreado={nuevo => {
            if (onComboCreado) return onComboCreado(nuevo);
            else onCerrar();
          }} />
        </Suspense>
      </PanelLazyErrorBoundary>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Ofertas">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-brand-ink/40 cursor-default" />
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
              <SelectorProductosPaginado
                elegidos={[]}
                enLanding={productosPorContentId}
                incluirCombos={false}
                mostrarElegidos={false}
                onAlternar={(contentId) => {
                  const elegido = productosPorContentId.get(contentId);
                  if (elegido) onElegir(elegido);
                }}
              />
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
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all ${activo ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

function Miniatura({ item }) {
  const src = item.imagen ? getMediaUrl(item.imagen) : null;
  return src
    ? <img src={src} alt="" className="w-10 h-10 rounded-lg object-cover bg-surface-2 shrink-0" loading="lazy" />
    : <span className="w-10 h-10 rounded-lg bg-surface-2 shrink-0" />;
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


