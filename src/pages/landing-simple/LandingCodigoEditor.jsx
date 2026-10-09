import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader, Save, Trash2, ExternalLink, Eye, EyeOff, Monitor, Tablet, Smartphone,
  PanelLeftClose, PanelLeftOpen, AlertTriangle, RefreshCw, Copy, Settings2, Home, ShoppingBag,
  FileCode2, Wand2, Check, FileText, Tags, CreditCard, ChevronRight,
} from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { tiendaService } from '../../services/tiendaService';
import { vitrinaService } from '../../services/vitrinaService';
import { ofertaService } from '../../services/ofertaService';
import CodigoPreview from './CodigoPreview';
import SeccionesPanel from './panels/SeccionesPanel';
import Campo from './CampoTexto';
import PhonePreviewShell from './PhonePreviewShell';
import ConfigurarVentaCodigo, { aplicarReglaVenta } from './ConfigurarVentaCodigo';
import { urlPublicaLanding } from './urlPublicaLanding';
import { datosRuntimePreview, contentIdPanel, PAGINAS_TIENDA } from './datosRuntime';
import { PLANTILLA_PRODUCTO, PLANTILLA_CATALOGO, PLANTILLA_CATEGORIA, PLANTILLA_CHECKOUT, plantillaInicioPara, formatoDeBase, esFichaProductoBase } from './plantillasBaseCodigo';
import { leerItemsPrefill, limpiarItemsPrefill, unirItemsPrefill } from './prefilledLandingItems';
import { armarPromptVista } from './promptsCodigo';
import { conGlobalesHeredados } from './globalesCodigo';
import {
  LABEL_LEGAL_CODIGO,
  PAGINAS_LEGALES_CODIGO,
  esPlantillaLegalGenerica,
  normalizarEstiloPaginaFooter,
  plantillaLegalPara,
} from './plantillasLegalesCodigo';

/**
 * Editor libre. Lo usan tanto el lienzo en blanco como las landings que
 * nacieron con IA: son caminos de creación distintos, pero el motor técnico
 * es el mismo código HTML/CSS/JS.
 *
 * Dos pasos:
 *
 *   1. Configurar venta (ConfigurarVentaCodigo): tipo de venta, productos,
 *      ventas cruzadas y recomendados. Es el paso intermedio: la primera
 *      vez se muestra solo, y después se vuelve con "Configurar venta".
 *   2. Código: dos VISTAS — Inicio y Ficha de producto — cada una con su
 *      HTML/CSS/JS, su prompt para IA y el preview con los productos
 *      reales de la selección.
 *
 * El preview corre el borrador SIN guardar, dentro del mismo iframe y con
 * el mismo runtime que la landing pública (CodigoPreview). Guardar pasa el
 * código por el sanitizador del servidor, así que puede volver recortado:
 * por eso después de guardar el borrador se reemplaza por lo que respondió
 * el backend y se muestran las advertencias.
 */

const TABS = [
  { key: 'secciones', label: 'Secciones', lenguaje: null },
  { key: 'html', label: 'HTML', lenguaje: 'html' },
  { key: 'css', label: 'CSS', lenguaje: 'css' },
  { key: 'js', label: 'JavaScript', lenguaje: 'js' },
  { key: 'prompts', label: 'Prompt IA', lenguaje: null },
  { key: 'ajustes', label: 'Ajustes', lenguaje: null },
];

const EDITORES_LIBRES = [
  { key: 'inicio', vista: 'inicio', label: 'Inicio', alias: 'Homepage', icono: Home },
  { key: 'catalogo', vista: 'catalogo', label: 'Catálogo', icono: Tags },
  { key: 'categoria', vista: 'categoria', label: 'Categoría', icono: Tags },
  { key: 'producto', vista: 'producto', label: 'Ficha producto', icono: ShoppingBag },
  { key: 'checkout', vista: 'checkout', label: 'Checkout', icono: CreditCard },
  { key: 'legal', vista: 'legal', label: 'Footer', icono: FileText },
];

const CODIGO_VACIO = { html: '', css: '', js: '' };
// Ficha propia de un producto: una vista más, con clave "propia:<content_id>".
const PREFIJO_PROPIA = 'propia:';
const clavePropia = contentId => `${PREFIJO_PROPIA}${contentId}`;
const PREFIJO_LEGAL = 'legal:';
const claveLegal = tipo => `${PREFIJO_LEGAL}${tipo}`;

/** content de la landing → códigos del editor (inicio, ficha general y fichas propias). */
function codigosDesdeContent(content, fichaGeneralRespaldo = PLANTILLA_PRODUCTO, tienda = null) {
  const vistas = content?.vistas || {};
  const propias = Object.fromEntries(Object.entries(vistas.productos || {})
    .filter(([, c]) => c?.html)
    .map(([cid, c]) => [clavePropia(cid), { ...CODIGO_VACIO, ...c }]));
  const legales = Object.fromEntries(PAGINAS_LEGALES_CODIGO.map(p => {
    const guardada = vistas.legales?.[p.key];
    return [
      claveLegal(p.key),
      guardada?.html && !esPlantillaLegalGenerica(guardada)
        ? { ...CODIGO_VACIO, ...normalizarEstiloPaginaFooter(guardada) }
        : plantillaLegalPara(p.key, tienda),
    ];
  }));
  return {
    inicio: { ...CODIGO_VACIO, ...(content?.codigo || {}) },
    catalogo: vistas.catalogo?.html ? { ...CODIGO_VACIO, ...vistas.catalogo } : PLANTILLA_CATALOGO,
    producto: vistas.producto?.html && !esFichaProductoBase(vistas.producto.html) ? vistas.producto : fichaGeneralRespaldo,
    categoria: vistas.categoria?.html ? { ...CODIGO_VACIO, ...vistas.categoria } : PLANTILLA_CATEGORIA,
    checkout: vistas.checkout?.html ? { ...CODIGO_VACIO, ...vistas.checkout } : PLANTILLA_CHECKOUT,
    ...propias,
    ...legales,
  };
}
// La base de inicio depende del formato de venta (catálogo, producto
// estrella, combos); la ficha es una sola.
const baseDe = (vista, tipo, legalTipo = 'politica_privacidad', tienda = null) => {
  if (vista === 'producto') return PLANTILLA_PRODUCTO;
  if (vista === 'catalogo') return PLANTILLA_CATALOGO;
  if (vista === 'categoria') return PLANTILLA_CATEGORIA;
  if (vista === 'checkout') return PLANTILLA_CHECKOUT;
  if (vista === 'legal') return plantillaLegalPara(legalTipo, tienda);
  return plantillaInicioPara(tipo);
};
const ANCHOS_VIEWPORT = { desktop: '100%', tablet: '768px', mobile: '390px' };

// El código de arranque que crea el backend (landingSimple.service.js,
// codigoInicial): si sigue intacto al terminar el paso de venta, se cambia
// por la plantilla base, que ya vende.
const MARCA_CODIGO_INICIAL = 'Escribí acá el HTML de tu landing';

/** Items de la landing ({tipo, referencia_id}) → items del catálogo del panel, en el mismo orden. */
export function resolverSeleccion(items, catalogo) {
  const productos = new Map((catalogo?.productos || []).map(p => [Number(p.id), { ...p, tipo: 'producto' }]));
  const combos = new Map((catalogo?.combos || []).map(c => [Number(c.id), { ...c, tipo: 'combo' }]));
  return [...(items || [])]
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map(i => {
      const producto = (i.tipo === 'combo' ? combos : productos).get(Number(i.referencia_id));
      return producto ? { ...producto, etiqueta: i.etiqueta || '', precio_ancla: i.precio_ancla ?? null,
        envio_incluido: i.envio_incluido === true, mostrar_en_inicio: i.mostrar_en_inicio !== false } : null;
    })
    .filter(Boolean);
}

/**
 * Selección → payload de items. Conserva lo que ya tenía cada item en la
 * landing (etiqueta, precio ancla, envío incluido): el paso de venta elige
 * QUÉ productos, no pisa cómo estaban configurados.
 */
export function seleccionAItems(seleccion, itemsPrevios = []) {
  const previos = new Map(itemsPrevios.map(i => [`${i.tipo}:${Number(i.referencia_id)}`, i]));
  return seleccion.map((p, idx) => {
    const previo = previos.get(`${p.tipo}:${Number(p.id)}`) || {};
    return {
      tipo: p.tipo,
      referencia_id: Number(p.id),
      etiqueta: p.etiqueta ?? previo.etiqueta ?? '',
      orden: idx,
      // El panel de venta ahora puede cargarlo; si no vino, se conserva el
      // que ya tenía la landing.
      precio_ancla: Object.prototype.hasOwnProperty.call(p, 'precio_ancla') ? p.precio_ancla : (previo.precio_ancla ?? null),
      envio_incluido: p.envio_incluido ?? previo.envio_incluido ?? false,
      mostrar_en_inicio: p.mostrar_en_inicio ?? previo.mostrar_en_inicio ?? true,
    };
  });
}

/**
 * Lo que devuelve una IA: tres bloques ```html / ```css / ```js. Si viene
 * una página entera en un solo bloque, va toda al HTML y el guardado la
 * reparte (ver separarDocumentoCompleto en el backend).
 */
export function extraerBloques(texto) {
  const salida = {};
  const re = /```(\w+)?[^\n]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(String(texto || '')))) {
    const lenguaje = (m[1] || '').toLowerCase();
    const cuerpo = m[2].replace(/\s+$/, '');
    if (['html', 'xml', 'htm'].includes(lenguaje) && salida.html === undefined) salida.html = cuerpo;
    else if (lenguaje === 'css' && salida.css === undefined) salida.css = cuerpo;
    else if (['js', 'javascript'].includes(lenguaje) && salida.js === undefined) salida.js = cuerpo;
  }
  if (!Object.keys(salida).length && /<[a-z!]/i.test(texto || '')) salida.html = String(texto).trim();
  return salida;
}

const RE_AVISOS_IA_LANDING = [
  /experiencias?\s+mostradas?/i,
  /no\s+corresponden\s+necesariamente/i,
  /resultados?\s+individuales?\s+pueden\s+variar/i,
  /resultados?\s+pueden\s+variar\s+seg[uú]n\s+cada\s+persona/i,
];

function esAvisoIaLanding(texto) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  return limpio.length > 0
    && limpio.length <= 1200
    && RE_AVISOS_IA_LANDING.some(re => re.test(limpio));
}

export function limpiarAvisosIaHtml(html) {
  const texto = String(html || '');
  if (!RE_AVISOS_IA_LANDING.some(re => re.test(texto))) return texto;
  if (typeof DOMParser === 'undefined') return texto;
  const doc = new DOMParser().parseFromString(`<body>${texto}</body>`, 'text/html');
  [...doc.body.querySelectorAll('*')].forEach(el => {
    if (!el.isConnected || !esAvisoIaLanding(el.textContent)) return;
    let candidato = el;
    let actual = el;
    while (actual.parentElement && actual.parentElement !== doc.body && esAvisoIaLanding(actual.parentElement.textContent)) {
      candidato = actual.parentElement;
      actual = actual.parentElement;
    }
    candidato.remove();
  });
  return doc.body.innerHTML.trim();
}

function creationSourceDe(landing) {
  const content = landing?.content || {};
  const explicita = content.creation_source || content.creationSource || content.origen;
  if (explicita) return explicita;
  // Compatibilidad: antes no existian editor_type/creation_source. Solo en
  // esas landings viejas usamos design_context como pista de que nacieron o
  // fueron editadas con IA. En landings nuevas, creation_source manda.
  if (content.editor_type || content.editorType) return 'blank';
  const vistas = content.vistas || {};
  const fichasPropias = Object.values(vistas.productos || {});
  const tieneHuellaIA = content.codigo?.design_context
    || vistas.producto?.design_context
    || fichasPropias.some(c => c?.design_context);
  return tieneHuellaIA ? 'ai_detected' : 'blank';
}

export default function LandingCodigoEditor({ landingInicial, onEliminada }) {
  const { id: idParam } = useParams();
  const id = landingInicial?.id ?? idParam;
  const navigate = useNavigate();

  const [landing, setLanding] = useState(landingInicial || null);
  const [tienda, setTienda] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [cargando, setCargando] = useState(true);
  // "Configurar tienda" es la única puerta de entrada al lienzo en blanco:
  // el editor de código crudo (paso 'codigo') solo se abre a pedido, desde
  // el botón "Código avanzado" de ese asistente.
  const [paso, setPaso] = useState('venta');
  const [venta, setVenta] = useState(landingInicial?.content?.venta || null);
  const [seleccion, setSeleccion] = useState([]);
  const [vista, setVistaBase] = useState('inicio');
  const [editorActivo, setEditorActivo] = useState('inicio');
  const [paginaLegal, setPaginaLegal] = useState(PAGINAS_LEGALES_CODIGO[0].key);
  const [codigos, setCodigos] = useState(() => codigosDesdeContent(landingInicial?.content));
  // Fichas propias que se volvieron a la general (se mandan como null al guardar).
  const [propiasBorradas, setPropiasBorradas] = useState(() => new Set());
  const [ajustes, setAjustes] = useState({ titulo: '', seo_titulo: '', seo_descripcion: '' });
  const [tab, setTab] = useState('html');
  const [guardando, setGuardando] = useState(false);
  const [actualizandoBloques, setActualizandoBloques] = useState(false);
  const [error, setError] = useState('');
  const [erroresDetalle, setErroresDetalle] = useState([]);
  const [advertencias, setAdvertencias] = useState([]);
  const [aviso, setAviso] = useState('');
  const [confirmacionPublicacionIA, setConfirmacionPublicacionIA] = useState(null);
  const [errorRuntime, setErrorRuntime] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [viewportMode, setViewportMode] = useState('desktop');
  const [productoPreviewId, setProductoPreviewId] = useState(null);
  const [sinGuardar, setSinGuardar] = useState(false);
  // Order bumps / upsells de la tienda: sin esto la ficha del preview nunca
  // mostraba ofertas, aunque estuvieran creadas y marcadas en la venta.
  const [ofertasTienda, setOfertasTienda] = useState([]);

  // El preview se repinta con un borrador aparte y con retardo: recargar
  // el iframe en cada tecla hace que la landing parpadee sin parar y
  // reinicia el JS del comercio a mitad de una frase.
  const [codigosPreview, setCodigosPreview] = useState(codigos);
  const temporizador = useRef(null);

  useEffect(() => {
    let activo = true;
    // El panel inicializa su selección al montarse: esperar al catálogo
    // incluso cuando EditorSegunModo ya nos entregó la landing.
    setCargando(true);
    Promise.all([
      landingInicial ? Promise.resolve(landingInicial) : landingSimpleService.obtener(id),
      tiendaService.obtener().catch(() => null),
      vitrinaService.catalogo(),
    ]).then(([l, t, cat]) => {
      if (!activo) return;
      const inicial = codigosDesdeContent(l.content, PLANTILLA_PRODUCTO, t || l?.tienda || null);
      setLanding(l);
      setTienda(t);
      setCatalogo(cat);
      // Con una regla (todos / por categoría) no hay items guardados: la
      // selección del preview y de los prompts se calcula con la regla.
      const prefilled = leerItemsPrefill();
      const regla = aplicarReglaVenta(cat, l.content?.venta);
      const seleccionActual = regla
        ? resolverSeleccion(regla.map((p, orden) => ({ tipo: p.tipo, referencia_id: p.id, orden,
          ...(l.items || []).find(i => i.tipo === p.tipo && Number(i.referencia_id) === Number(p.id)) })), cat)
        : resolverSeleccion(l.items, cat);
      const seleccionInicial = prefilled.length
        ? resolverSeleccion(unirItemsPrefill(seleccionAItems(seleccionActual, l.items), prefilled), cat)
        : seleccionActual;
      setSeleccion(seleccionInicial);
      // Al llegar del catálogo se revisa la selección manual antes de guardar.
      setVenta(prefilled.length ? { ...l.content?.venta, seleccion: 'manual' } : l.content?.venta || null);
      setPaso('venta');
      if (prefilled.length) setSinGuardar(true);
      setCodigos(inicial);
      setCodigosPreview(inicial);
      setAjustes({
        titulo: l.titulo || '',
        seo_titulo: l.seo_titulo || '',
        seo_descripcion: l.seo_descripcion || '',
      });
      setCargando(false);
      limpiarItemsPrefill();
    }).catch(() => {
      if (activo) { setError('No se pudo cargar la landing.'); setCargando(false); }
    });
    return () => { activo = false; };
  }, [id, landingInicial]);

  useEffect(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setErrorRuntime('');
      setCodigosPreview(codigos);
    }, 600);
    return () => clearTimeout(temporizador.current);
  }, [codigos]);

  useEffect(() => {
    if (vista === 'legal' && tab === 'prompts') setTab('html');
  }, [vista, tab]);

  const setVista = useCallback((siguiente) => {
    setVistaBase(siguiente);
    setEditorActivo(siguiente === 'legal' ? 'legal' : siguiente);
  }, []);

  const seleccionarEditorLibre = useCallback((editor) => {
    setVistaBase(editor.vista);
    setEditorActivo(editor.key);
  }, []);

  // Qué se edita: el inicio, la ficha general o la ficha propia del producto
  // elegido en la ficha (si tiene). Todo lo de abajo trabaja sobre esta clave.
  const productoFichaId = vista === 'producto' ? (productoPreviewId || (seleccion[0] ? contentIdPanel(seleccion[0]) : null)) : null;
  const claveVista = vista === 'legal'
    ? claveLegal(paginaLegal)
    : productoFichaId && codigos[clavePropia(productoFichaId)] ? clavePropia(productoFichaId) : vista;
  const esPropia = claveVista.startsWith(PREFIJO_PROPIA);
  const esLegal = vista === 'legal';
  const nombrePaginaLegal = LABEL_LEGAL_CODIGO[paginaLegal] || 'Página legal';
  const nombreProductoFicha = seleccion.find(p => contentIdPanel(p) === productoFichaId)?.nombre || '';
  const editorActual = EDITORES_LIBRES.find(e => e.key === editorActivo) || EDITORES_LIBRES[1];
  const nombreEditorActual = esLegal ? nombrePaginaLegal : `${editorActual.label}${editorActual.alias ? ` / ${editorActual.alias}` : ''}`;
  const nombreEdicion = esPropia
    ? `Ficha de ${nombreProductoFicha}`
    : esLegal ? nombrePaginaLegal
      : editorActivo === 'producto' ? 'Ficha producto'
        : editorActivo === 'catalogo' ? 'Catálogo'
          : editorActivo === 'categoria' ? 'Categoría'
            : editorActivo === 'checkout' ? 'Checkout'
              : nombreEditorActual;

  function crearFichaPropia() {
    if (!productoFichaId) return;
    setCodigos(prev => ({ ...prev, [clavePropia(productoFichaId)]: { ...prev.producto } }));
    setPropiasBorradas(prev => { const c = new Set(prev); c.delete(productoFichaId); return c; });
    setSinGuardar(true);
    setAviso(`Ficha propia de "${nombreProductoFicha}": arranca como una copia de la general. Lo que cambies acá (a mano o con el prompt) es solo para este producto.`);
  }
  function volverAFichaGeneral() {
    if (!productoFichaId || !window.confirm(`¿Borrar la ficha propia de "${nombreProductoFicha}"? Va a usar la ficha general, como los demás productos.`)) return;
    setCodigos(prev => { const c = { ...prev }; delete c[clavePropia(productoFichaId)]; return c; });
    setPropiasBorradas(prev => new Set(prev).add(productoFichaId));
    setSinGuardar(true);
    setAviso(`"${nombreProductoFicha}" vuelve a usar la ficha general. Guardá para publicarlo.`);
  }

  function escribir(clave, valor) {
    const valorSeguro = clave === 'html' && !esLegal ? limpiarAvisosIaHtml(valor) : valor;
    setCodigos(prev => ({ ...prev, [claveVista]: { ...prev[claveVista], [clave]: valorSeguro } }));
    setAviso('');
    setSinGuardar(true);
  }

  // El iframe se remonta al refrescar (key nueva) — es la forma de volver
  // a correr el JS del comercio sin tocar el código.
  const [generacion, setGeneracion] = useState(0);
  const alErrorRuntime = useCallback((mensaje) => setErrorRuntime(mensaje), []);

  async function guardar(extra = {}) {
    const ventaAGuardar = extra.venta ?? venta;
    // Una selección manual guarda la lista. Una regla guarda solo los
    // ajustes por producto; el backend sigue resolviendo todo el catálogo.
    const esRegla = ['todos', 'categoria'].includes(ventaAGuardar?.seleccion);
    const itemsAGuardar = extra.items ?? (esRegla
      ? seleccion.filter(p => p.precio_ancla != null || p.etiqueta || p.envio_incluido || p.mostrar_en_inicio === false)
      : seleccion);
    const codigosAGuardar = extra.codigos ?? codigos;
    const legalesAGuardar = Object.fromEntries(PAGINAS_LEGALES_CODIGO.map(p => [
      p.key,
      codigosAGuardar[claveLegal(p.key)] || plantillaLegalPara(p.key, tienda),
    ]));
    setGuardando(true);
    setError('');
    setErroresDetalle([]);
    setAdvertencias([]);
    try {
      const actualizada = await landingSimpleService.actualizar(id, {
        titulo: ajustes.titulo,
        seo_titulo: ajustes.seo_titulo,
        seo_descripcion: ajustes.seo_descripcion,
        codigo: codigosAGuardar.inicio,
        vistas: {
          catalogo: codigosAGuardar.catalogo,
          producto: codigosAGuardar.producto,
          categoria: codigosAGuardar.categoria,
          checkout: codigosAGuardar.checkout,
          legales: legalesAGuardar,
          productos: {
            ...Object.fromEntries([...propiasBorradas].map(cid => [cid, null])),
            ...Object.fromEntries(Object.entries(codigosAGuardar)
              .filter(([k]) => k.startsWith(PREFIJO_PROPIA))
              .map(([k, c]) => [k.slice(PREFIJO_PROPIA.length), c])),
          },
        },
        ...(ventaAGuardar ? { venta: ventaAGuardar } : {}),
        // Única puerta hacia venta.urgencia/prueba_social "confirmado" (ver
        // landingSimple.service.js): separado de `venta` a propósito, así un
        // guardado normal (editar la fecha) nunca confirma por accidente.
        ...(extra.confirmaciones ? { confirmaciones: extra.confirmaciones } : {}),
        items: seleccionAItems(itemsAGuardar, landing?.items),
      });
      const guardados = codigosDesdeContent(actualizada.content, codigosAGuardar.producto, tienda);
      setPropiasBorradas(new Set());
      setLanding(actualizada);
      setVenta(actualizada.content?.venta || ventaAGuardar);
      setCodigos(guardados);
      setCodigosPreview(guardados);
      setAdvertencias(actualizada.codigo_advertencias || []);
      setAviso('Cambios guardados.');
      setSinGuardar(false);
      setSidebarVisible(false);
      return true;
    } catch (err) {
      const data = err?.response?.data;
      // Sin respuesta del servidor (caído, reiniciando) no hay data: se
      // muestra el motivo real en vez de un "no se pudo" mudo.
      setError(data?.message || (err?.response ? `el servidor respondió ${err.response.status}` : 'no hay conexión con el servidor. ¿Está levantado el backend?'));
      setErroresDetalle(data?.errores || []);
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarVenta({ venta: nuevaVenta, seleccion: nuevaSeleccion, items: nuevosItems, confirmaciones }) {
    // Con el código de arranque intacto, el inicio pasa a ser la página base
    // del formato elegido (la misma que mostró la vista previa). Si ya era la
    // base de OTRO formato, se cambia también, pero preguntando: puede tener
    // retoques del comercio.
    const htmlInicioActual = codigos.inicio?.html || '';
    const baseActual = formatoDeBase(htmlInicioActual);
    const codigoInicialIntacto = !htmlInicioActual.trim() || htmlInicioActual.includes(MARCA_CODIGO_INICIAL);
    const inicioConfigurado = nuevaVenta.inicio || nuevaVenta.inicio_comercial || {};
    const faltanSlotsBanners =
      (Array.isArray(inicioConfigurado.banners) && inicioConfigurado.banners.length > 0
        && !/data-gesicomm-lista=["']banners_inicio["']/.test(htmlInicioActual)) ||
      (Array.isArray(inicioConfigurado.banners_intermedios) && inicioConfigurado.banners_intermedios.length > 0
        && !/data-gesicomm-lista=["']banners_intermedios["']/.test(htmlInicioActual));
    // La vista previa de Configurar tienda reemplaza cualquier base Gesicomm
    // por la base actual. Al confirmar, guardamos esa misma base para no volver
    // al HTML/CSS viejo que podía seguir persistido en el editor libre.
    const usarBase = (codigoInicialIntacto || !!baseActual || faltanSlotsBanners) && nuevaVenta.abrir_en !== 'producto';
    const usarFichaBase = esFichaProductoBase(codigos.producto?.html);
    const nuevosCodigos = {
      ...codigos,
      ...(usarBase ? { inicio: plantillaInicioPara(nuevaVenta.tipo) } : {}),
      ...(usarFichaBase ? { producto: PLANTILLA_PRODUCTO } : {}),
    };
    setSeleccion(nuevaSeleccion);
    setVenta(nuevaVenta);
    setCodigos(nuevosCodigos);
    const ok = await guardar({ venta: nuevaVenta, items: nuevosItems, codigos: nuevosCodigos, confirmaciones });
    if (ok) {
      setTab((usarBase || usarFichaBase) ? 'prompts' : 'html');
      setAviso((usarBase || usarFichaBase)
        ? 'Listo: actualizamos la base de inicio/ficha para que el diseño guardado coincida con la vista previa.'
        : 'Diseño guardado.');
    }
  }

  // Mismo criterio que AICodeValidator.detectarBloquesSinConfirmar en el
  // backend (landingSimple.service.js): esto evita publicar por accidente.
  // Ya no bloquea; abre una confirmación explícita antes de publicar.
  function advertenciasDePublicacionIA() {
    const htmls = Object.entries(codigos || {})
      .map(([k, c]) => (k === 'inicio' || k === 'producto' || k.startsWith(PREFIJO_PROPIA)) ? c?.html : null)
      .filter(Boolean)
      .join('\n');
    const pendientes = [];
    if (/data-gesicomm-countdown(?!-parte)/.test(htmls)) {
      const u = venta?.urgencia;
      if (!u?.activo || !u?.fin_at || u?.estado !== 'confirmado') pendientes.push('urgencia');
    }
    if (/data-gesicomm-lista=["']estadisticas["']/.test(htmls)) {
      const p = venta?.prueba_social;
      if (!p?.activo || !Array.isArray(p?.items) || !p.items.length || p?.estado !== 'confirmado') pendientes.push('prueba_social');
    }
    return pendientes;
  }

  async function cambiarEstado(activo, opciones = {}) {
    setError('');
    if (activo && !opciones.aceptarContenidoIA) {
      const pendientes = advertenciasDePublicacionIA();
      if (pendientes.length) {
        setConfirmacionPublicacionIA({ pendientes });
        return;
      }
    }
    try {
      const actualizada = await landingSimpleService.cambiarEstado(id, activo, {
        aceptarContenidoIA: opciones.aceptarContenidoIA,
      });
      setLanding(prev => ({ ...prev, activo: actualizada.activo }));
      setConfirmacionPublicacionIA(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cambiar el estado.');
    }
  }

  function irAConfigurarDatosReales() {
    setConfirmacionPublicacionIA(null);
    setPaso('venta');
  }

  // Volver a la pantalla de "¿Cómo querés armar tu landing?": la landing de
  // código recién creada se borra (todavía no tiene nada) y /landing, sin
  // landings, muestra el selector de modo.
  // "Volver" desde "Configurar tienda", que ahora es la única pantalla de
  // este editor. Con la landing ya configurada no hay a dónde "volver"
  // dentro del editor: se sale a la lista de landings. Recién creada (sin
  // configurar), el editor solo tendría el código de arranque: la vuelta
  // atrás que tiene sentido es la pantalla de "¿Cómo querés armar tu
  // landing?". La landing en blanco se borra — todavía no tiene nada — y
  // sin landings /landing muestra ese selector.
  function volverDesdeVenta() {
    if (venta?.configurado) { navigate('/landing', { replace: true }); return; }
    const intacta = !codigos.inicio.html.trim() || codigos.inicio.html.includes(MARCA_CODIGO_INICIAL);
    cambiarDeModo({ preguntar: !intacta });
  }

  async function cambiarDeModo({ preguntar = true } = {}) {
    if (preguntar && !window.confirm('Se va a borrar esta landing en blanco para que puedas elegir cómo armarla. ¿Seguir?')) return;
    try {
      await landingSimpleService.eliminar(id);
      navigate('/landing', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo volver al selector de modo.');
    }
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar esta landing? Se pierde todo el código escrito y no se puede deshacer.')) return;
    try {
      await landingSimpleService.eliminar(id);
      if (onEliminada) onEliminada();
      else navigate('/landing', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar la landing.');
    }
  }

  /**
   * Pone el bloque de venta canónico en las fichas de esta landing. Las
   * generadas antes de que existiera quedaron con el markup del modelo: el
   * order bump como un renglón de texto sin foto ni precio anterior. No
   * regenera con IA —eso tarda minutos y cambiaría el diseño—, solo cambia
   * el contenido de esos dos bloques.
   */
  async function actualizarBloquesVenta() {
    setActualizandoBloques(true);
    setError('');
    try {
      const r = await landingSimpleService.actualizarBloquesVenta(id);
      if (!r.actualizadas) {
        setAviso(r.message || 'No había bloques de order bump ni de paquetes para actualizar.');
        return;
      }
      const guardados = codigosDesdeContent(r.landing.content, codigos.producto, tienda?.nombre || 'Tu tienda');
      setLanding(r.landing);
      setCodigos(guardados);
      setCodigosPreview(guardados);
      setAviso(`Listo: ${r.actualizadas} ficha${r.actualizadas === 1 ? '' : 's'} con el bloque de venta actualizado.`);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron actualizar los bloques de venta.');
    } finally {
      setActualizandoBloques(false);
    }
  }

  function cargarBase() {
    const actual = codigos[claveVista];
    const tieneAlgo = actual.html.trim() || actual.css.trim() || actual.js.trim();
    if (tieneAlgo && !window.confirm('Esto reemplaza el HTML, CSS y JS de esta vista por el código base. ¿Seguir?')) return;
    setCodigos(prev => ({ ...prev, [claveVista]: baseDe(vista, venta?.tipo, paginaLegal, tienda) }));
    setSinGuardar(true);
    setAviso('Código base cargado. Guardá para publicarlo.');
  }

  function aplicarRespuestaIa(bloques) {
    const limpios = bloques.html ? { ...bloques, html: limpiarAvisosIaHtml(bloques.html) } : bloques;
    setCodigos(prev => ({ ...prev, [claveVista]: { ...prev[claveVista], ...limpios } }));
    setSinGuardar(true);
    setTab('html');
    setAviso(`Código aplicado a ${esPropia ? `la ficha de "${nombreProductoFicha}"` : esLegal ? nombrePaginaLegal : vista === 'producto' ? 'la ficha general' : 'el inicio'}. Revisá el preview y guardá.`);
  }

  // Tab dentro del textarea indenta en vez de saltar al control siguiente:
  // sin esto es imposible escribir código con el teclado.
  function alTeclear(e, clave) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.target;
    const { selectionStart: ini, selectionEnd: fin, value } = el;
    const nuevo = `${value.slice(0, ini)}  ${value.slice(fin)}`;
    escribir(clave, nuevo);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = ini + 2; });
  }

  const publicUrl = useMemo(() => urlPublicaLanding(tienda, landing), [tienda, landing]);
  const creationSource = creationSourceDe(landing);
  const esGeneradaIA = creationSource === 'ai' || creationSource === 'ai_detected';
  const etiquetaEditor = creationSource === 'ai_detected' ? 'Con IA' : esGeneradaIA ? 'Generada con IA' : 'Editor libre';
  const accionVenta = venta?.configurado ? 'Configuración de venta' : 'Configurar venta';

  // Se piden al entrar al paso de código (también al volver de "Configurar
  // venta", donde se pueden crear o editar ofertas).
  useEffect(() => {
    if (paso !== 'codigo') return;
    let vivo = true;
    // 'normal' son los paquetes (x2, x3): sin ellos la lista "paquetes"
    // ("Elegí tu oferta") salía siempre vacía en el preview aunque el
    // producto tuviera paquetes cargados y elegidos para esta landing.
    ofertaService.listarTodas({ estrategias: ['normal', 'order_bump', 'upsell'] })
      .then(lista => { if (vivo) setOfertasTienda(Array.isArray(lista) ? lista : []); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [paso]);

  const datosPreview = useMemo(() => datosRuntimePreview({
    productos: seleccion,
    tienda,
    landing,
    venta,
    vista,
    productoId: productoPreviewId,
    ofertas: ofertasTienda,
  }), [seleccion, tienda, landing, venta, vista, productoPreviewId, ofertasTienda]);
  const codigoPreviewCrudo = codigosPreview[claveVista] || codigosPreview[vista];
  const codigoInicioPreview = codigosPreview.inicio?.html ? codigosPreview.inicio : plantillaInicioPara(venta?.tipo);
  const codigoPreviewHeredado = ['catalogo', 'categoria', 'checkout', 'producto'].includes(vista)
    ? conGlobalesHeredados(codigoPreviewCrudo, codigoInicioPreview)
    : codigoPreviewCrudo;

  const nombrePorId = useMemo(
    () => new Map(seleccion.map(p => [contentIdPanel(p), p.nombre])),
    [seleccion],
  );

  // Precios tachados que ya tiene guardados esta landing, con la misma clave
  // que usa el panel: así al reabrir "Configurar venta" aparecen cargados.
  const anclasGuardadas = useMemo(() => Object.fromEntries(
    (landing?.items || [])
      .filter(i => i.precio_ancla != null)
      .map(i => [`${i.tipo}:${Number(i.referencia_id)}`, String(i.precio_ancla)]),
  ), [landing]);

  // Clics del runtime dentro del preview: no hay carrito en el editor, así
  // que se explica qué pasaría y la navegación cambia de vista acá mismo.
  const alCheckoutPreview = useCallback((p) => {
    const nombre = nombrePorId.get(p?.producto) || 'el producto';
    setAviso(`Preview: en la landing publicada esto ${p?.abrir === false ? 'agrega' : 'agrega y abre el carrito con'} "${nombre}".`);
  }, [nombrePorId]);
  const alCarritoPreview = useCallback(() => {
    setAviso('Preview: en la landing publicada esto abre el carrito.');
  }, []);
  const alNavegarPreview = useCallback((p) => {
    if (p?.destino === 'pagina') {
      if (p.pagina === 'checkout') {
        setVista('checkout');
        return;
      }
      if (p.pagina === 'catalogo') {
        setVista('catalogo');
        return;
      }
      setAviso(`Preview: en la landing publicada este link abre «${PAGINAS_TIENDA[p.pagina] || p.pagina}».`);
      return;
    }
    if (p?.destino === 'producto') {
      setVista('producto');
      setProductoPreviewId(p.producto);
    } else if (p?.destino === 'categoria') {
      setVista('categoria');
      setAviso(`Preview: vista de categoría "${p.categoria}".`);
    } else if (p?.destino === 'checkout') {
      setVista('checkout');
    } else if (p?.destino === 'catalogo') {
      setVista('catalogo');
    } else {
      setVista('inicio');
    }
  }, []);
  const alEventoPreview = useCallback((p) => {
    setAviso(`Preview: se registraría el evento "${p?.nombre}".`);
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 text-fg/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando...
      </div>
    );
  }

  if (!catalogo) {
    return <div role="alert" className="p-8 text-danger">{error || 'No se pudo cargar el catálogo.'}</div>;
  }

  if (paso === 'venta') {
    return (
      <div className="relative h-full">
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        onRecargarCatalogo={() => vitrinaService.catalogo().then(setCatalogo)}
        inicial={{ venta, seleccion }}
        anclasIniciales={anclasGuardadas}
        guardando={guardando}
        onConfirmar={confirmarVenta}
        onVolver={volverDesdeVenta}
        errorGuardado={error ? { mensaje: error, detalles: erroresDetalle } : null}
        onCambiarModo={venta?.configurado ? null : () => cambiarDeModo()}
        tienda={tienda}
        landing={landing}
        // Acciones de la landing ya guardada: solo tienen sentido una vez
        // configurada (recién creada, "Publicar"/"Eliminar" todavía no
        // aplican a nada guardado).
        publicUrl={venta?.configurado ? publicUrl : null}
        landingActiva={landing?.activo}
        onPublicar={venta?.configurado ? () => cambiarEstado(!landing?.activo) : null}
        onEliminar={venta?.configurado ? eliminar : null}
        onGuardarRapido={venta?.configurado ? () => guardar() : null}
        sinGuardar={sinGuardar}
        // Editor de código crudo (HTML/CSS/JS, Secciones, Footer, Prompt IA):
        // pantalla vieja, dejada de usar a pedido del comercio — se oculta
        // el único acceso (el botón "Código avanzado" de acá abajo) pero el
        // componente y la ruta siguen en el repo por si hace falta volver.
        onAbrirCodigo={null}
        codigos={codigos}
        onCambiarCodigo={(vistaCodigo, parte, valor) => {
          const valorSeguro = parte === 'html' ? limpiarAvisosIaHtml(valor) : valor;
          setCodigos(prev => ({ ...prev, [vistaCodigo]: { ...CODIGO_VACIO, ...(prev[vistaCodigo] || {}), [parte]: valorSeguro } }));
          setSinGuardar(true);
          setAviso('Código actualizado desde Configurar tienda. Guardá para publicarlo.');
        }}
        onRestaurarCodigo={(vistaCodigo) => {
          setCodigos(prev => ({ ...prev, [vistaCodigo]: baseDe(vistaCodigo, venta?.tipo, paginaLegal, tienda) }));
          setSinGuardar(true);
          setAviso('Vista restaurada a la base. Guardá para publicarlo.');
        }}
        onSubirImagen={async archivo => {
          const form = new FormData();
          form.append('imagen', archivo);
          const { url } = await landingSimpleService.subirImagenFicha(idParam, form);
          if (!url) throw new Error('No se recibió la imagen subida.');
          return url;
        }}
      />
      {confirmacionPublicacionIA && (
        <ConfirmacionPublicacionIAModal
          pendientes={confirmacionPublicacionIA.pendientes}
          onCancelar={irAConfigurarDatosReales}
          onAceptar={() => cambiarEstado(true, { aceptarContenidoIA: true })}
        />
      )}
      </div>
    );
  }

  const tabActiva = TABS.find(t => t.key === tab);
  // "Secciones" edita por bloques la estructura fija de INICIO_HTML
  // (hero, banner, categorías) — no tiene sentido en la ficha de producto
  // ni en las páginas legales, que son HTML libre sin esa estructura.
  const tabsVisibles = (esLegal ? TABS.filter(t => t.key !== 'prompts') : TABS)
    .filter(t => t.key !== 'secciones' || (vista === 'inicio' && !esLegal));
  const codigoVista = codigos[claveVista] || CODIGO_VACIO;
  // Ficha guardada antes de que existieran los bloques de ofertas: las
  // ofertas marcadas nunca iban a tener dónde aparecer, sin ningún aviso.
  const ofertasMarcadas = venta?.cross_sell?.activo !== false && (venta?.cross_sell?.ofertas || []).length > 0;
  const fichaSinOfertas = ofertasMarcadas
    && codigos.producto.html.trim()
    && !/data-gesicomm-(lista=["']ofertas|bump)/.test(codigos.producto.html);

  return (
    <div className="flex flex-col h-full relative">
      <div className="min-h-14 border-b border-fg/10 shrink-0 flex items-center justify-between px-5 py-2 gap-3">
        <div className="flex items-center gap-3 min-w-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="flex items-center gap-1.5 p-2 -ml-2 text-fg/50 hover:text-fg transition-colors text-xs font-semibold bg-fg/5 rounded-lg px-3"
            title={sidebarVisible ? 'Ocultar editor de código' : 'Mostrar editor de código'}
          >
            {sidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span className="hidden sm:inline">{sidebarVisible ? 'Ocultar código' : 'Mostrar código'}</span>
          </button>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-fg/10 bg-fg/[0.04] p-1 shadow-sm">
            {EDITORES_LIBRES.map((v, index) => {
              const Icono = v.icono;
              const activo = editorActivo === v.key;
              return (
                <React.Fragment key={v.key}>
                  {index > 0 && (
                    <ChevronRight size={13} className="shrink-0 text-fg/25" aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    onClick={() => seleccionarEditorLibre(v)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${activo ? 'bg-fg text-canvas shadow-sm' : 'text-fg/55 hover:bg-fg/10 hover:text-fg'}`}
                    title={v.vista === 'inicio' && v.key !== 'inicio' ? `${v.label} usa el editor de Inicio` : `Editar ${v.label}${v.alias ? ` (${v.alias})` : ''}`}
                  >
                    <Icono size={13} />
                    <span>{v.label}</span>
                    {v.alias && <span className={`hidden text-[10px] font-semibold xl:inline ${activo ? 'text-canvas/65' : 'text-fg/35'}`}>/{v.alias}</span>}
                  </button>
                </React.Fragment>
              );
            })}
            {vista === 'legal' && (
              <select
                value={paginaLegal}
                onChange={e => setPaginaLegal(e.target.value)}
                className="ml-1 max-w-[170px] rounded-lg border border-fg/10 bg-surface px-2 py-1.5 text-xs text-fg"
                title="Seleccionar página del footer"
              >
                {PAGINAS_LEGALES_CODIGO.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-bold truncate">{landing?.titulo || (esGeneradaIA ? 'Landing generada con IA' : 'Lienzo en blanco')}</h1>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${esGeneradaIA ? 'bg-primary/15 text-primary' : 'bg-fg/10 text-fg/55'}`}>
                {etiquetaEditor}
              </span>
            </div>
            {/* Se muestra la URL real a la que lleva "Ver": en local es la
                de este mismo entorno, no la de producción. */}
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-fg/50 hover:text-fg/80">
              {publicUrl.startsWith('http') ? publicUrl.replace(/^https?:\/\//, '') : `${window.location.host}${publicUrl}`}
              <ExternalLink size={10} />
              {!landing?.activo && <span className="ml-1 text-amber-400/80">(sin publicar)</span>}
            </a>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setPaso('venta')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg"
            title="Tipo de venta, productos, ventas cruzadas y recomendados"
          >
            <Settings2 size={13} /> <span className="hidden md:inline">{accionVenta}</span>
          </button>
          <div className="flex items-center bg-fg/5 rounded-lg p-0.5 border border-fg/10">
            {[['desktop', Monitor, 'Desktop'], ['tablet', Tablet, 'Tablet'], ['mobile', Smartphone, 'Mobile']].map(([modo, Icono, titulo]) => (
              <button
                key={modo}
                type="button"
                onClick={() => setViewportMode(modo)}
                className={`p-1.5 rounded transition-colors ${viewportMode === modo ? 'bg-fg text-canvas' : 'text-fg/50 hover:text-fg'}`}
                title={titulo}
              >
                <Icono size={14} />
              </button>
            ))}
          </div>
          <button type="button" onClick={eliminar} className="p-2 rounded-lg hover:bg-red-500/10 text-fg/40 hover:text-red-400" title="Eliminar landing">
            <Trash2 size={16} />
          </button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-fg/10 text-fg/40 hover:text-fg" title="Ver landing pública">
            <ExternalLink size={16} />
          </a>
          <button
            type="button"
            onClick={() => cambiarEstado(!landing?.activo)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg"
          >
            {landing?.activo ? <><EyeOff size={13} /> Despublicar</> : <><Eye size={13} /> Publicar</>}
          </button>
          <button
            type="button"
            onClick={() => guardar()}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-fg text-canvas hover:bg-fg-muted disabled:opacity-50"
          >
            {guardando ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar{sinGuardar ? ' •' : ''}
          </button>
        </div>
      </div>

      {aviso && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">{aviso}</div>
      )}

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/40 text-fg text-sm">
          <p className="font-semibold text-danger">{error}</p>
          {erroresDetalle.length > 0 && (
            <ul className="mt-1.5 list-disc pl-5 space-y-0.5 text-fg/85">
              {erroresDetalle.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {advertencias.length > 0 && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-warning/10 border border-warning/40 text-fg text-sm">
          <p className="font-semibold flex items-center gap-1.5"><AlertTriangle size={14} className="text-warning" /> Se guardó, pero con cambios</p>
          <ul className="mt-1.5 list-disc pl-5 space-y-0.5 text-fg/80">
            {advertencias.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {sidebarVisible && (
          <div className="w-[360px] max-w-[42vw] min-w-[300px] shrink-0 border-r border-fg/10 flex flex-col min-h-0">
            <div className="flex items-center gap-1 p-2 border-b border-fg/10 overflow-x-auto">
              {tabsVisibles.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 rounded-md font-semibold transition-colors ${t.lenguaje ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[10.5px]'} ${tab === t.key ? 'bg-fg text-canvas' : 'text-fg/50 hover:bg-fg/10'}`}
                >
                  {t.label}
                </button>
              ))}
              <span className="ml-auto shrink-0 pr-1 text-[10.5px] text-fg/40">
                Editando: <strong className="text-fg/70">{nombreEdicion}</strong>
              </span>
            </div>

            {vista === 'producto' && seleccion.length > 0 && (
              <div className="px-3 py-2.5 border-b border-fg/10 bg-fg/[0.03] space-y-2">
                <label className="flex items-center gap-2 text-[11px] text-fg/60">
                  <span className="shrink-0 font-semibold">Ficha de</span>
                  <select
                    value={productoFichaId || ''}
                    onChange={e => setProductoPreviewId(e.target.value)}
                    className="min-w-0 flex-1 bg-fg/5 border border-fg/10 rounded px-2 py-1 text-[12px] text-fg"
                  >
                    {seleccion.map(p => (
                      <option key={contentIdPanel(p)} value={contentIdPanel(p)}>
                        {codigos[clavePropia(contentIdPanel(p))] ? '★ ' : ''}{p.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <div role="radiogroup" aria-label="Diseño de esta ficha" className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button" role="radio" aria-checked={!esPropia}
                    onClick={() => { if (esPropia) volverAFichaGeneral(); }}
                    className={`text-left rounded-lg border px-2.5 py-1.5 ${!esPropia ? 'border-fg/40 bg-fg/10' : 'border-fg/10 hover:border-fg/25'}`}
                  >
                    <span className="block text-[12px] font-semibold text-fg">Ficha general</span>
                    <span className="block text-[10.5px] text-fg/50">La misma para todos los productos</span>
                  </button>
                  <button
                    type="button" role="radio" aria-checked={esPropia}
                    onClick={() => { if (!esPropia) crearFichaPropia(); }}
                    className={`text-left rounded-lg border px-2.5 py-1.5 ${esPropia ? 'border-fg/40 bg-fg/10' : 'border-fg/10 hover:border-fg/25'}`}
                  >
                    <span className="block text-[12px] font-semibold text-fg">Propia de este producto</span>
                    <span className="block text-[10.5px] text-fg/50">Su propio HTML y su propio prompt</span>
                  </button>
                </div>
              </div>
            )}

            {tabActiva?.lenguaje ? (
              <div className="shrink-0 border-b border-fg/10 bg-black/20">
                <textarea
                  key={`${claveVista}-${tab}`}
                  value={codigoVista[tabActiva.lenguaje] || ''}
                  onChange={e => escribir(tabActiva.lenguaje, e.target.value)}
                  onKeyDown={e => alTeclear(e, tabActiva.lenguaje)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder={PLACEHOLDERS[tabActiva.lenguaje]}
                  className="h-[230px] max-h-[34vh] min-h-[150px] w-full resize-y overflow-y-auto bg-black/40 text-fg/90 font-mono text-[12px] leading-[1.55] p-3 outline-none placeholder:text-fg/25"
                />
                <div className="px-3 py-2 border-t border-fg/10 flex flex-col gap-2">
                  <p className="text-[10.5px] text-fg/35 leading-snug">{AYUDAS[tabActiva.lenguaje]}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {(vista === 'producto' || esPropia) && (
                      <button
                        type="button"
                        onClick={actualizarBloquesVenta}
                        disabled={actualizandoBloques}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-fg/10 px-2.5 py-1.5 text-[11px] font-semibold text-fg/80 hover:bg-fg/15 disabled:opacity-50"
                        title="Reemplaza el order bump y los paquetes de las fichas por el bloque de Gesicomm: con foto, precio anterior y ahorro"
                      >
                        {actualizandoBloques ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Actualizar bloques de venta
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={cargarBase}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg/80"
                      title="Reemplaza esta vista por el código base de Gesicomm"
                    >
                      <FileCode2 size={12} /> Código base
                    </button>
                  </div>
                </div>
              </div>
            ) : tab === 'secciones' ? (
              <SeccionesPanel html={codigoVista.html || ''} onCambiarHtml={nuevoHtml => escribir('html', nuevoHtml)} />
            ) : tab === 'prompts' && !esLegal ? (
              <PanelPrompts
                vista={vista}
                fichaDe={esPropia ? seleccion.find(p => contentIdPanel(p) === productoFichaId) : null}
                tienda={tienda}
                venta={venta}
                seleccion={seleccion}
                onAplicar={aplicarRespuestaIa}
                onError={setError}
                onElegirProductos={() => setPaso('venta')}
              />
            ) : (
              <div className="p-5 space-y-4 overflow-y-auto">
                <Campo
                  etiqueta="Nombre de la landing"
                  ayuda="Solo lo ves vos, en el panel."
                  valor={ajustes.titulo}
                  onChange={v => { setAjustes(a => ({ ...a, titulo: v })); setAviso(''); setSinGuardar(true); }}
                />
                <Campo
                  etiqueta="Título para Google y redes"
                  ayuda="Lo que se lee en la pestaña del navegador y al compartir el link. En cada ficha se usa el nombre del producto."
                  valor={ajustes.seo_titulo}
                  onChange={v => { setAjustes(a => ({ ...a, seo_titulo: v })); setAviso(''); setSinGuardar(true); }}
                />
                <Campo
                  etiqueta="Descripción para Google y redes"
                  ayuda="Dos líneas que resuman la oferta."
                  valor={ajustes.seo_descripcion}
                  onChange={v => { setAjustes(a => ({ ...a, seo_descripcion: v })); setAviso(''); setSinGuardar(true); }}
                  multilinea
                />
                <div className="pt-2 border-t border-fg/10 text-[11px] text-fg/40 leading-relaxed space-y-2">
                  <p>
                    Tu código corre aislado: no puede leer la sesión de la tienda ni mandar datos a otros servidores. Por eso
                    el JavaScript no admite <code className="text-fg/60">fetch</code>, <code className="text-fg/60">localStorage</code> ni <code className="text-fg/60">document.cookie</code>.
                  </p>
                  <p>
                    Las ventas de esta landing entran a Pedidos con el origen de la landing y la campaña (UTM), y
                    cuentan en el dashboard y los reportes como cualquier otra venta web.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col bg-neutral-900/40">
          <div className="h-9 shrink-0 border-b border-fg/10 flex items-center justify-between px-3 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] text-fg/35 shrink-0">Vista previa · {nombreEditorActual}</span>
              {vista === 'producto' && seleccion.length > 0 && (
                <select
                  value={datosPreview.producto?.id || ''}
                  onChange={e => setProductoPreviewId(e.target.value)}
                  className="min-w-0 max-w-[260px] bg-fg/5 border border-fg/10 rounded px-2 py-0.5 text-[11px] text-fg"
                  title="Producto que se muestra en el preview de la ficha"
                >
                  {seleccion.map(p => <option key={contentIdPanel(p)} value={contentIdPanel(p)}>{p.nombre}</option>)}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              {errorRuntime && (
                <span className="text-[11px] text-red-300 truncate max-w-[420px]" title={errorRuntime}>
                  Error en tu JavaScript: {errorRuntime}
                </span>
              )}
              <button
                type="button"
                onClick={() => { setErrorRuntime(''); setGeneracion(g => g + 1); }}
                className="p-1.5 rounded hover:bg-fg/10 text-fg/40 hover:text-fg"
                title="Volver a ejecutar"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
          {vista === 'producto' && (
            <p className="px-3 py-1.5 text-[11px] text-fg/40 border-b border-fg/10">
              {esPropia
                ? `Ficha propia de ${nombreProductoFicha}: solo este producto se ve así. Los demás usan la ficha general.`
                : 'Ficha general: la usan todos los productos que no tienen ficha propia (★).'} Las variantes aparecen solo en la landing publicada.
            </p>
          )}
          {vista === 'inicio' && venta?.abrir_en === 'producto' && (
            <div className="px-3 py-2 text-[12px] text-amber-200 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
              <AlertTriangle size={14} className="shrink-0" />
              <span className="flex-1">
                Esta landing abre directo en la ficha de {seleccion.find(p => p.tipo === 'producto')?.nombre || 'tu producto principal'}: este inicio no se muestra. Diseñá la ficha.
              </span>
              <button type="button" onClick={() => setVista('producto')} className="shrink-0 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 font-semibold">
                Ir a la ficha
              </button>
            </div>
          )}
          {vista === 'producto' && fichaSinOfertas && (
            <div className="px-3 py-2 text-[12px] text-amber-200 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
              <AlertTriangle size={14} className="shrink-0" />
              <span className="flex-1">
                Tu ficha no tiene lugar para order bump, así que esa oferta no se ve antes de comprar. Cargá la ficha base o agregá <code>data-gesicomm-lista="ofertas_bump"</code> arriba del botón principal. Los upsells no van en la ficha: Gesicomm los muestra como etapa del checkout.
              </span>
              <button type="button" onClick={cargarBase} className="shrink-0 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 font-semibold">
                Usar la ficha base
              </button>
            </div>
          )}
          {esLegal && (
            <p className="px-3 py-1.5 text-[11px] text-fg/40 border-b border-fg/10">
              Esta página se publica desde los enlaces del footer de la tienda. Editá el texto real en HTML y guardá para actualizarla.
            </p>
          )}
          <div className="flex-1 min-h-0 flex justify-center overflow-hidden">
            {viewportMode === 'mobile' ? (
              <PhonePreviewShell className="p-4">
                <CodigoPreview
                  key={`${generacion}-${viewportMode}-${claveVista}`}
                  codigo={codigoPreviewHeredado}
                  titulo={ajustes.seo_titulo || ajustes.titulo}
                  datos={datosPreview}
                  typography={landing?.typography?.resolved || tienda?.typography}
                  previewDevice="mobile"
                  onError={alErrorRuntime}
                  onCheckout={alCheckoutPreview}
                  onCarrito={alCarritoPreview}
                  onNavegar={alNavegarPreview}
                  onEvento={alEventoPreview}
                />
              </PhonePreviewShell>
            ) : (
              <div style={{ width: ANCHOS_VIEWPORT[viewportMode], maxWidth: '100%', height: '100%' }}>
                <CodigoPreview
                  key={`${generacion}-${viewportMode}-${claveVista}`}
                  codigo={codigoPreviewHeredado}
                  titulo={ajustes.seo_titulo || ajustes.titulo}
                  datos={datosPreview}
                  typography={landing?.typography?.resolved || tienda?.typography}
                  previewDevice={viewportMode}
                  onError={alErrorRuntime}
                  onCheckout={alCheckoutPreview}
                  onCarrito={alCarritoPreview}
                  onNavegar={alNavegarPreview}
                  onEvento={alEventoPreview}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmacionPublicacionIA && (
        <ConfirmacionPublicacionIAModal
          pendientes={confirmacionPublicacionIA.pendientes}
          onCancelar={irAConfigurarDatosReales}
          onAceptar={() => cambiarEstado(true, { aceptarContenidoIA: true })}
        />
      )}

    </div>
  );
}

/**
 * Aviso antes de publicar una landing que todavía tiene countdown o
 * estadísticas generados por la IA sin confirmar como datos reales (ver
 * advertenciasDePublicacionIA). Vive aparte para poder mostrarse tanto desde
 * el editor de código como desde el paso "venta" (Configurar venta /
 * Categorías), que renderiza una vista completamente distinta.
 */
function ConfirmacionPublicacionIAModal({ pendientes, onCancelar, onAceptar }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-2xl border border-fg/15 bg-surface shadow-2xl">
        <div className="flex items-start gap-3 border-b border-fg/10 p-4">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-300">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-fg">Contenido generado con IA</p>
            <p className="mt-1 text-sm leading-relaxed text-fg/65">
              Esta landing usa {pendientes.includes('urgencia') && pendientes.includes('prueba_social')
                ? 'countdown y estadísticas'
                : pendientes.includes('urgencia') ? 'countdown' : 'estadísticas'} sin confirmar como datos reales.
            </p>
          </div>
        </div>
        <div className="space-y-3 p-4 text-sm leading-relaxed text-fg/70">
          <p>
            Revisá que esa información sea verdadera antes de usarla en anuncios o en la página pública. Publicar datos falsos o no comprobados puede traerte problemas con políticas de anuncios y normas de defensa del consumidor.
          </p>
          <p className="font-semibold text-fg">
            Podés publicar igual si aceptás que estás al tanto de lo que implica.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-fg/10 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex justify-center rounded-xl border border-fg/15 px-4 py-2 text-sm font-semibold text-fg/75 hover:bg-fg/10"
          >
            Cancelar y cargar datos reales
          </button>
          <button
            type="button"
            onClick={onAceptar}
            className="inline-flex justify-center rounded-xl bg-fg px-4 py-2 text-sm font-semibold text-canvas hover:bg-fg-muted"
          >
            Aceptar, estoy al tanto
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelPrompts({ vista, fichaDe = null, tienda, venta, seleccion, onAplicar, onError, onElegirProductos }) {
  const [estilo, setEstilo] = useState('');
  const [incluirBase, setIncluirBase] = useState(true);
  const [copiado, setCopiado] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [errorRespuesta, setErrorRespuesta] = useState('');

  const prompt = useMemo(() => armarPromptVista(vista, {
    tienda,
    venta,
    // Ficha propia: el prompt es SOLO de ese producto.
    productos: fichaDe ? [fichaDe] : seleccion,
    fichaDe,
    estilo,
    base: incluirBase ? baseDe(vista, venta?.tipo) : null,
  }), [vista, fichaDe, tienda, venta, seleccion, estilo, incluirBase]);

  async function copiar(texto, cual) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado(''), 1800);
    } catch (e) {
      onError('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    }
  }

  function aplicar() {
    const bloques = extraerBloques(respuesta);
    if (!Object.keys(bloques).length) {
      setErrorRespuesta('No encontré bloques de código. Pegá la respuesta completa, con los ```html, ```css y ```js.');
      return;
    }
    setErrorRespuesta('');
    onAplicar(bloques);
    setRespuesta('');
  }

  const vistasPrompt = {
    inicio: { nombre: 'el inicio', corto: 'del inicio', titulo: 'Prompt del inicio' },
    producto: { nombre: 'la ficha de producto', corto: 'de la ficha', titulo: 'Prompt de la ficha' },
    categoria: { nombre: 'la vista de categoría', corto: 'de categoría', titulo: 'Prompt de categoría' },
    checkout: { nombre: 'el checkout', corto: 'del checkout', titulo: 'Prompt del checkout' },
  };
  const infoVista = vistasPrompt[vista] || vistasPrompt.inicio;
  const nombreVista = infoVista.nombre;

  const modoSeleccion = venta?.seleccion === 'todos'
    ? 'Todo el catálogo'
    : venta?.seleccion === 'categoria' ? `Por categoría (${(venta.categorias || []).length})` : 'Elegidos uno por uno';

  return (
    <div className="p-5 space-y-5 overflow-y-auto">
      {/* Qué productos van en el prompt y en la landing. Se cambian en
          "Configurar venta" — el mismo lugar desde donde se venden. */}
      <div className="rounded-xl border border-fg/10 bg-fg/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">
              {seleccion.length === 0 ? 'Todavía no hay productos en esta landing' : `${seleccion.length} producto${seleccion.length === 1 ? '' : 's'} en esta landing`}
            </p>
            <p className="text-xs text-fg/50 mt-0.5">{modoSeleccion}</p>
          </div>
          <button
            type="button"
            onClick={onElegirProductos}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-fg text-canvas hover:bg-fg-muted"
          >
            {seleccion.length === 0 ? 'Elegir productos' : 'Cambiar productos'}
          </button>
        </div>
        {seleccion.length > 0 && (
          <ul className="mt-3 max-h-40 overflow-y-auto space-y-1">
            {seleccion.slice(0, 50).map(p => (
              <li key={`${p.tipo}:${p.id}`} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-fg/75">{p.nombre}</span>
                <span className="shrink-0 text-fg/40">{p.tipo === 'combo' ? 'Combo' : (p.categoria || '')}</span>
              </li>
            ))}
            {seleccion.length > 50 && <li className="text-xs text-fg/40">y {seleccion.length - 50} más</li>}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-fg/10 bg-fg/5 p-4">
        <p className="text-xs font-semibold text-fg/45 uppercase tracking-wide">Paso a paso</p>
        <ol className="mt-2 text-sm text-fg/65 space-y-1 list-decimal pl-4">
          <li>Copiá el prompt de {nombreVista} y pegalo en ChatGPT, Claude o Gemini.</li>
          <li>Pegá la respuesta abajo y tocá “Aplicar”.</li>
          <li>Revisá el preview y guardá. Podés repetirlo en cada vista: Inicio, Ficha, Categoría o Checkout.</li>
        </ol>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold text-fg/70 mb-1">Estilo que querés (opcional)</span>
        <textarea
          value={estilo}
          onChange={e => setEstilo(e.target.value)}
          rows={3}
          placeholder="Ej.: minimalista y premium, fondo crema, tipografía serif para los títulos, acento verde oliva."
          className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-fg/30"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-fg/70">
        <input type="checkbox" checked={incluirBase} onChange={e => setIncluirBase(e.target.checked)} />
        Incluir referencia del código base (estructura que ya funciona)
      </label>

      <div>
        {/* Un solo prompt para copiar. Había también "Solo las reglas" (el
            maestro suelto), pero sin la tienda, sus colores, el logo ni los
            productos la IA no sabía qué armar: el completo ya trae esas reglas. */}
        <div className="rounded-xl border border-fg/25 bg-fg/5 p-3 flex flex-col mb-3">
          <p className="text-sm font-semibold text-fg">{infoVista.titulo}</p>
          <p className="text-xs text-fg/60 mt-1">
            Todo en uno: reglas de Gesicomm + tu tienda (nombre, colores, logo) + tus {seleccion.length} producto{seleccion.length === 1 ? '' : 's'} + lo que tiene que tener {nombreVista}{incluirBase ? ' + una referencia compacta del código base' : ''}. Pegalo en un chat nuevo y la IA ya sabe qué armar sin perderse entre bloques enormes.
          </p>
          <button
            type="button"
            onClick={() => copiar(prompt, 'vista')}
            className="mt-2.5 self-start inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-fg text-canvas hover:bg-fg-muted"
          >
            {copiado === 'vista' ? <Check size={13} /> : <Copy size={13} />} {copiado === 'vista' ? 'Copiado' : `Copiar prompt ${infoVista.corto}`}
          </button>
        </div>
        <span className="block text-xs font-semibold text-fg/70 mb-2">
          Así queda el prompt completo {infoVista.corto}
        </span>
        <textarea
          value={prompt}
          readOnly
          rows={12}
          className="w-full resize-y bg-black/40 border border-fg/10 rounded-lg p-3 text-xs leading-relaxed text-fg/75 outline-none font-mono"
        />
      </div>

      <div>
        <span className="block text-xs font-semibold text-fg/70 mb-2">Respuesta de la IA</span>
        <textarea
          value={respuesta}
          onChange={e => setRespuesta(e.target.value)}
          rows={7}
          placeholder="Pegá acá la respuesta completa (con los bloques ```html, ```css y ```js)."
          className="w-full resize-y bg-black/40 border border-fg/10 rounded-lg p-3 text-xs leading-relaxed text-fg/80 outline-none font-mono"
        />
        {errorRespuesta && <p className="mt-1.5 text-xs text-danger">{errorRespuesta}</p>}
        <button
          type="button"
          onClick={aplicar}
          disabled={!respuesta.trim()}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-fg text-canvas hover:bg-fg-muted disabled:opacity-40"
        >
          <Wand2 size={13} /> Aplicar a {nombreVista}
        </button>
      </div>
    </div>
  );
}

const PLACEHOLDERS = {
  html: '<section class="hero">\n  <h1>Tu titular</h1>\n</section>',
  css: '.hero {\n  padding: 80px 24px;\n}',
  js: "document.querySelector('.cta')?.addEventListener('click', () => {\n  // ...\n});",
};

const AYUDAS = {
  html: 'Podés pegar una página completa: al guardar, su <style> y su <script> se mueven solos a las otras pestañas.',
  css: 'Se inyecta en un <style> propio. @import no está permitido: la IA declara Google Fonts como recurso y Gesicomm las carga en el <head>.',
  js: 'Corre después del runtime de Gesicomm (window.Gesicomm). Sin fetch, localStorage ni acceso a la ventana contenedora.',
};

