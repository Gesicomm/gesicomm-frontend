import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader, Save, Trash2, ExternalLink, Eye, EyeOff, Monitor, Tablet, Smartphone,
  PanelLeftClose, PanelLeftOpen, AlertTriangle, RefreshCw, Copy, Settings2, Home, ShoppingBag,
  FileCode2, Wand2, Check, Bot, X, Send, Loader2,
} from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { tiendaService } from '../../services/tiendaService';
import { vitrinaService } from '../../services/vitrinaService';
import { ofertaService } from '../../services/ofertaService';
import CodigoPreview from './CodigoPreview';
import PhonePreviewShell from './PhonePreviewShell';
import ConfigurarVentaCodigo, { aplicarReglaVenta } from './ConfigurarVentaCodigo';
import { urlPublicaLanding } from './urlPublicaLanding';
import { datosRuntimePreview, contentIdPanel, PAGINAS_TIENDA } from './datosRuntime';
import { PLANTILLA_PRODUCTO, plantillaInicioPara, formatoDeBase } from './plantillasBaseCodigo';
import { armarPromptVista } from './promptsCodigo';

/**
 * Editor del modo "Lienzo en blanco". Dos pasos:
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
  { key: 'html', label: 'HTML', lenguaje: 'html' },
  { key: 'css', label: 'CSS', lenguaje: 'css' },
  { key: 'js', label: 'JavaScript', lenguaje: 'js' },
  { key: 'prompts', label: 'Prompt IA', lenguaje: null },
  { key: 'ajustes', label: 'Ajustes', lenguaje: null },
];

const VISTAS = [
  { key: 'inicio', label: 'Inicio', icono: Home },
  { key: 'producto', label: 'Ficha de producto', icono: ShoppingBag },
];

const CODIGO_VACIO = { html: '', css: '', js: '' };
// Ficha propia de un producto: una vista más, con clave "propia:<content_id>".
const PREFIJO_PROPIA = 'propia:';
const clavePropia = contentId => `${PREFIJO_PROPIA}${contentId}`;

/** content de la landing → códigos del editor (inicio, ficha general y fichas propias). */
function codigosDesdeContent(content, fichaGeneralRespaldo = PLANTILLA_PRODUCTO) {
  const vistas = content?.vistas || {};
  const propias = Object.fromEntries(Object.entries(vistas.productos || {})
    .filter(([, c]) => c?.html)
    .map(([cid, c]) => [clavePropia(cid), { ...CODIGO_VACIO, ...c }]));
  return {
    inicio: { ...CODIGO_VACIO, ...(content?.codigo || {}) },
    producto: vistas.producto?.html ? vistas.producto : fichaGeneralRespaldo,
    ...propias,
  };
}
// La base de inicio depende del formato de venta (catálogo, producto
// estrella, combos); la ficha es una sola.
const baseDe = (vista, tipo) => (vista === 'producto' ? PLANTILLA_PRODUCTO : plantillaInicioPara(tipo));
const ANCHOS_VIEWPORT = { desktop: '100%', tablet: '768px', mobile: '390px' };

// El código de arranque que crea el backend (landingSimple.service.js,
// codigoInicial): si sigue intacto al terminar el paso de venta, se cambia
// por la plantilla base, que ya vende.
const MARCA_CODIGO_INICIAL = 'Escribí acá el HTML de tu landing';

/** Items de la landing ({tipo, referencia_id}) → items del catálogo del panel, en el mismo orden. */
function resolverSeleccion(items, catalogo) {
  const productos = new Map((catalogo?.productos || []).map(p => [Number(p.id), { ...p, tipo: 'producto' }]));
  const combos = new Map((catalogo?.combos || []).map(c => [Number(c.id), { ...c, tipo: 'combo' }]));
  return [...(items || [])]
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map(i => (i.tipo === 'combo' ? combos : productos).get(Number(i.referencia_id)))
    .filter(Boolean);
}

/**
 * Selección → payload de items. Conserva lo que ya tenía cada item en la
 * landing (etiqueta, precio ancla, envío incluido): el paso de venta elige
 * QUÉ productos, no pisa cómo estaban configurados.
 */
function seleccionAItems(seleccion, itemsPrevios = []) {
  const previos = new Map(itemsPrevios.map(i => [`${i.tipo}:${Number(i.referencia_id)}`, i]));
  return seleccion.map((p, idx) => {
    const previo = previos.get(`${p.tipo}:${Number(p.id)}`) || {};
    return {
      tipo: p.tipo,
      referencia_id: Number(p.id),
      etiqueta: previo.etiqueta || '',
      orden: idx,
      precio_ancla: previo.precio_ancla || null,
      envio_incluido: previo.envio_incluido === true,
      mostrar_en_inicio: previo.mostrar_en_inicio !== false,
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

export default function LandingCodigoEditor({ landingInicial, onEliminada }) {
  const { id: idParam } = useParams();
  const id = landingInicial?.id ?? idParam;
  const navigate = useNavigate();

  const [landing, setLanding] = useState(landingInicial || null);
  const [tienda, setTienda] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [cargando, setCargando] = useState(!landingInicial);
  const [paso, setPaso] = useState(landingInicial?.content?.venta?.configurado ? 'codigo' : 'venta');
  const [venta, setVenta] = useState(landingInicial?.content?.venta || null);
  const [seleccion, setSeleccion] = useState([]);
  const [vista, setVista] = useState('inicio');
  const [codigos, setCodigos] = useState(() => codigosDesdeContent(landingInicial?.content));
  // Fichas propias que se volvieron a la general (se mandan como null al guardar).
  const [propiasBorradas, setPropiasBorradas] = useState(() => new Set());
  const [ajustes, setAjustes] = useState({ titulo: '', seo_titulo: '', seo_descripcion: '' });
  const [tab, setTab] = useState('html');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [erroresDetalle, setErroresDetalle] = useState([]);
  const [advertencias, setAdvertencias] = useState([]);
  const [aviso, setAviso] = useState('');
  const [errorRuntime, setErrorRuntime] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [viewportMode, setViewportMode] = useState('desktop');
  const [productoPreviewId, setProductoPreviewId] = useState(null);
  const [sinGuardar, setSinGuardar] = useState(false);
  // Order bumps / upsells de la tienda: sin esto la ficha del preview nunca
  // mostraba ofertas, aunque estuvieran creadas y marcadas en la venta.
  const [ofertasTienda, setOfertasTienda] = useState([]);

  // Asistente IA del editor: sigue la conversación que arrancó el wizard
  // (ver AILandingWizard), pero SOBRE esta misma landing — "hacela más
  // minimalista", "cambiá los colores" — en vez de tener que volver a
  // /landing y perder esta landing para armar una nueva desde cero.
  const [asistenteAbierto, setAsistenteAbierto] = useState(false);
  const [promptIA, setPromptIA] = useState('');
  const [regenerando, setRegenerando] = useState(false);
  const [errorIA, setErrorIA] = useState('');

  // El preview se repinta con un borrador aparte y con retardo: recargar
  // el iframe en cada tecla hace que la landing parpadee sin parar y
  // reinicia el JS del comercio a mitad de una frase.
  const [codigosPreview, setCodigosPreview] = useState(codigos);
  const temporizador = useRef(null);

  useEffect(() => {
    let activo = true;
    // Los productos que llegaron preelegidos desde la vitrina ya los guardó
    // crearLienzoBlanco() como items de la landing: acá solo se limpia la
    // marca para que no se cuele en la próxima landing.
    try { sessionStorage.removeItem('gesicomm:prefilledLandingItems'); } catch (e) { /* sin storage */ }
    Promise.all([
      landingInicial ? Promise.resolve(landingInicial) : landingSimpleService.obtener(id),
      tiendaService.obtener().catch(() => null),
      vitrinaService.catalogo().catch(() => ({ productos: [], combos: [] })),
    ]).then(([l, t, cat]) => {
      if (!activo) return;
      const inicial = codigosDesdeContent(l.content);
      setLanding(l);
      setTienda(t);
      setCatalogo(cat);
      // Con una regla (todos / por categoría) no hay items guardados: la
      // selección del preview y de los prompts se calcula con la regla.
      setSeleccion(aplicarReglaVenta(cat, l.content?.venta) ?? resolverSeleccion(l.items, cat));
      setVenta(l.content?.venta || null);
      setPaso(l.content?.venta?.configurado ? 'codigo' : 'venta');
      setCodigos(inicial);
      setCodigosPreview(inicial);
      setAjustes({
        titulo: l.titulo || '',
        seo_titulo: l.seo_titulo || '',
        seo_descripcion: l.seo_descripcion || '',
      });
      setCargando(false);
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

  // Qué se edita: el inicio, la ficha general o la ficha propia del producto
  // elegido en la ficha (si tiene). Todo lo de abajo trabaja sobre esta clave.
  const productoFichaId = vista === 'producto' ? (productoPreviewId || (seleccion[0] ? contentIdPanel(seleccion[0]) : null)) : null;
  const claveVista = productoFichaId && codigos[clavePropia(productoFichaId)] ? clavePropia(productoFichaId) : vista;
  const esPropia = claveVista.startsWith(PREFIJO_PROPIA);
  const nombreProductoFicha = seleccion.find(p => contentIdPanel(p) === productoFichaId)?.nombre || '';

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
    setCodigos(prev => ({ ...prev, [claveVista]: { ...prev[claveVista], [clave]: valor } }));
    setAviso('');
    setSinGuardar(true);
  }

  // El iframe se remonta al refrescar (key nueva) — es la forma de volver
  // a correr el JS del comercio sin tocar el código.
  const [generacion, setGeneracion] = useState(0);
  const alErrorRuntime = useCallback((mensaje) => setErrorRuntime(mensaje), []);

  async function guardar(extra = {}) {
    const ventaAGuardar = extra.venta ?? venta;
    // Items que se guardan: la lista manual. Con una regla, ninguno (el
    // backend resuelve los productos con la regla, sin tope).
    const esRegla = ['todos', 'categoria'].includes(ventaAGuardar?.seleccion);
    const itemsAGuardar = extra.items ?? (esRegla ? [] : seleccion);
    const codigosAGuardar = extra.codigos ?? codigos;
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
          producto: codigosAGuardar.producto,
          productos: {
            ...Object.fromEntries([...propiasBorradas].map(cid => [cid, null])),
            ...Object.fromEntries(Object.entries(codigosAGuardar)
              .filter(([k]) => k.startsWith(PREFIJO_PROPIA))
              .map(([k, c]) => [k.slice(PREFIJO_PROPIA.length), c])),
          },
        },
        ...(ventaAGuardar ? { venta: ventaAGuardar } : {}),
        items: seleccionAItems(itemsAGuardar, landing?.items),
      });
      const guardados = codigosDesdeContent(actualizada.content, codigosAGuardar.producto);
      setPropiasBorradas(new Set());
      setLanding(actualizada);
      setVenta(actualizada.content?.venta || ventaAGuardar);
      setCodigos(guardados);
      setCodigosPreview(guardados);
      setAdvertencias(actualizada.codigo_advertencias || []);
      setAviso('Cambios guardados.');
      setSinGuardar(false);
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

  // A qué vista le habla el Asistente IA: la que está abierta en el editor
  // ahora mismo. Antes esto SIEMPRE tocaba "Inicio" sin importar qué
  // pidiera el comercio — pedir "agregame la vista por productos" mientras
  // se miraba Inicio terminaba reescribiendo Inicio, porque no había forma
  // de apuntar a la ficha. Con una ficha PROPIA abierta, el asistente edita
  // SOLO esa ficha (nunca la general ni la de otro producto) — así cada
  // producto puede tener un diseño distinto ("este termo estilo outdoor",
  // "este auricular tech futurista").
  const targetIA = esPropia ? 'producto_especifico' : vista === 'producto' ? 'producto' : 'inicio';
  const nombreTargetIA = esPropia
    ? `la ficha propia de "${nombreProductoFicha}"`
    : targetIA === 'producto' ? 'la ficha de producto (general)' : 'el "Inicio"';

  // Le pide a la IA que edite la vista actual de esta landing (mismo id,
  // mismo slug, mismos productos configurados) con un prompt nuevo. El RAG
  // recibe el código actual y edita sobre eso — si el resultado pierde
  // demasiado (menos atributos data-gesicomm-*, sin botón de compra, mucho
  // más corto) el backend lo rechaza (con un intento de corrección
  // automática antes de mostrar el error).
  async function regenerarConIA() {
    const texto = promptIA.trim();
    if (texto.length < 5) {
      setErrorIA('Escribí una descripción de al menos 5 caracteres.');
      return;
    }
    const codigoActual = codigos[claveVista];
    if (
      codigoActual?.html?.trim()
      && !window.confirm(`La IA va a editar ${nombreTargetIA} de esta landing con tu pedido, conservando lo que no tenga que ver con él. ¿Seguir?`)
    ) {
      return;
    }
    setRegenerando(true);
    setErrorIA('');
    try {
      const actualizada = await landingSimpleService.regenerarConIA(id, texto, targetIA, esPropia ? productoFichaId : null);
      const guardados = codigosDesdeContent(actualizada.content, codigos.producto);
      setLanding(actualizada);
      setCodigos(guardados);
      setCodigosPreview(guardados);
      setAjustes(a => ({
        titulo: actualizada.titulo || a.titulo,
        seo_titulo: actualizada.seo_titulo || a.seo_titulo,
        seo_descripcion: actualizada.seo_descripcion || a.seo_descripcion,
      }));
      setAdvertencias(actualizada.codigo_advertencias || []);
      setAviso(`La IA editó ${nombreTargetIA} de tu landing — ya está guardado. Revisá el preview.`);
      setSinGuardar(false);
      setPromptIA('');
      setTab('html');
    } catch (err) {
      const data = err?.response?.data;
      const detalle = Array.isArray(data?.errores) && data.errores.length ? ` ${data.errores.join(' ')}` : '';
      setErrorIA((data?.message || (err?.response ? `el servidor respondió ${err.response.status}` : 'no hay conexión con el servidor.')) + detalle);
    } finally {
      setRegenerando(false);
    }
  }

  async function confirmarVenta({ venta: nuevaVenta, seleccion: nuevaSeleccion, items: nuevosItems }) {
    // Con el código de arranque intacto, el inicio pasa a ser la página base
    // del formato elegido (la misma que mostró la vista previa). Si ya era la
    // base de OTRO formato, se cambia también, pero preguntando: puede tener
    // retoques del comercio.
    const baseActual = formatoDeBase(codigos.inicio.html);
    const codigoInicialIntacto = !codigos.inicio.html.trim() || codigos.inicio.html.includes(MARCA_CODIGO_INICIAL);
    // Hay un solo inicio base (la tienda). Uno de los formatos viejos
    // (Producto estrella / Combos) se ofrece cambiar, preguntando. Si la
    // landing abre directo en un producto, el inicio no se muestra: no se toca.
    const cambiaFormatoBase = !!baseActual && baseActual !== 'catalogo' && nuevaVenta.abrir_en !== 'producto'
      && window.confirm('Tu inicio tiene el diseño de un formato anterior. ¿Reemplazarlo por la tienda? Se pierden los cambios que le hayas hecho al HTML de inicio.');
    const usarBase = codigoInicialIntacto || cambiaFormatoBase;
    const nuevosCodigos = usarBase ? { ...codigos, inicio: plantillaInicioPara(nuevaVenta.tipo) } : codigos;
    setSeleccion(nuevaSeleccion);
    setVenta(nuevaVenta);
    setCodigos(nuevosCodigos);
    const ok = await guardar({ venta: nuevaVenta, items: nuevosItems, codigos: nuevosCodigos });
    if (ok) {
      setPaso('codigo');
      setTab(usarBase ? 'prompts' : 'html');
      if (usarBase) setAviso('Listo: cargamos la página base del formato. Copiá el prompt o editala directo.');
    }
  }

  async function cambiarEstado(activo) {
    setError('');
    try {
      const actualizada = await landingSimpleService.cambiarEstado(id, activo);
      setLanding(prev => ({ ...prev, activo: actualizada.activo }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cambiar el estado.');
    }
  }

  // Volver a la pantalla de "¿Cómo querés armar tu landing?": la landing de
  // código recién creada se borra (todavía no tiene nada) y /landing, sin
  // landings, muestra el selector de modo.
  // "Volver" desde el paso de venta. Con la landing ya configurada, vuelve a
  // su editor. Recién creada (sin configurar), el editor solo tendría el
  // código de arranque: la vuelta atrás que tiene sentido es la pantalla de
  // "¿Cómo querés armar tu landing?". La landing en blanco se borra —
  // todavía no tiene nada — y sin landings /landing muestra ese selector.
  function volverDesdeVenta() {
    if (venta?.configurado) { setPaso('codigo'); return; }
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

  function cargarBase() {
    const actual = codigos[claveVista];
    const tieneAlgo = actual.html.trim() || actual.css.trim() || actual.js.trim();
    if (tieneAlgo && !window.confirm('Esto reemplaza el HTML, CSS y JS de esta vista por el código base. ¿Seguir?')) return;
    setCodigos(prev => ({ ...prev, [claveVista]: baseDe(vista, venta?.tipo) }));
    setSinGuardar(true);
    setAviso('Código base cargado. Guardá para publicarlo.');
  }

  function aplicarRespuestaIa(bloques) {
    setCodigos(prev => ({ ...prev, [claveVista]: { ...prev[claveVista], ...bloques } }));
    setSinGuardar(true);
    setTab('html');
    setAviso(`Código aplicado a ${esPropia ? `la ficha de "${nombreProductoFicha}"` : vista === 'producto' ? 'la ficha general' : 'el inicio'}. Revisá el preview y guardá.`);
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
    venta,
    vista,
    productoId: productoPreviewId,
    ofertas: ofertasTienda,
  }), [seleccion, tienda, venta, vista, productoPreviewId, ofertasTienda]);

  const nombrePorId = useMemo(
    () => new Map(seleccion.map(p => [contentIdPanel(p), p.nombre])),
    [seleccion],
  );

  // Clics del runtime dentro del preview: no hay carrito en el editor, así
  // que se explica qué pasaría y la navegación cambia de vista acá mismo.
  const alCheckoutPreview = useCallback((p) => {
    const nombre = nombrePorId.get(p?.producto) || 'el producto';
    setAviso(`Preview: en la landing publicada esto ${p?.abrir === false ? 'agrega' : 'agrega y abre el carrito con'} "${nombre}".`);
  }, [nombrePorId]);
  const alNavegarPreview = useCallback((p) => {
    if (p?.destino === 'pagina') {
      setAviso(`Preview: en la landing publicada este link abre «${PAGINAS_TIENDA[p.pagina] || p.pagina}».`);
      return;
    }
    if (p?.destino === 'producto') {
      setVista('producto');
      setProductoPreviewId(p.producto);
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

  if (paso === 'venta') {
    return (
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        onRecargarCatalogo={() => vitrinaService.catalogo().then(setCatalogo)}
        inicial={{ venta, seleccion }}
        guardando={guardando}
        onConfirmar={confirmarVenta}
        onVolver={volverDesdeVenta}
        errorGuardado={error ? { mensaje: error, detalles: erroresDetalle } : null}
        onCambiarModo={venta?.configurado ? null : () => cambiarDeModo()}
        tienda={tienda}
        codigos={codigos}
      />
    );
  }

  const tabActiva = TABS.find(t => t.key === tab);
  const codigoVista = codigos[claveVista];
  // Ficha guardada antes de que existieran los bloques de ofertas: las
  // ofertas marcadas nunca iban a tener dónde aparecer, sin ningún aviso.
  const ofertasMarcadas = venta?.cross_sell?.activo !== false && (venta?.cross_sell?.ofertas || []).length > 0;
  const fichaSinOfertas = ofertasMarcadas
    && codigos.producto.html.trim()
    && !/data-gesicomm-(lista=["']ofertas|bump)/.test(codigos.producto.html);

  return (
    <div className="flex flex-col h-full relative">
      <div className="h-14 border-b border-fg/10 shrink-0 flex items-center justify-between px-5 gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="flex items-center gap-1.5 p-2 -ml-2 text-fg/50 hover:text-fg transition-colors text-xs font-semibold bg-fg/5 rounded-lg px-3"
            title={sidebarVisible ? 'Ocultar editor de código' : 'Mostrar editor de código'}
          >
            {sidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span className="hidden sm:inline">{sidebarVisible ? 'Ocultar código' : 'Mostrar código'}</span>
          </button>
          <button
            type="button"
            onClick={() => setAsistenteAbierto(v => !v)}
            className={`flex items-center gap-1.5 p-2 text-xs font-semibold rounded-lg px-3 transition-colors ${asistenteAbierto ? 'bg-primary text-white' : 'bg-fg/5 text-fg/50 hover:text-fg'}`}
            title="Seguir hablando con la IA sobre esta landing"
          >
            <Bot size={16} />
            <span className="hidden sm:inline">Asistente IA</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">{landing?.titulo || 'Landing en blanco'}</h1>
            {/* Se muestra la URL real a la que lleva "Ver": en local es la
                de este mismo entorno, no la de producción. */}
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-fg/50 hover:text-fg/80">
              {publicUrl.startsWith('http') ? publicUrl.replace(/^https?:\/\//, '') : `${window.location.host}${publicUrl}`}
              <ExternalLink size={10} />
              {!landing?.activo && <span className="ml-1 text-amber-400/80">(sin publicar)</span>}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-fg/5 rounded-lg p-0.5 border border-fg/10">
            {VISTAS.map(v => {
              const Icono = v.icono;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVista(v.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${vista === v.key ? 'bg-fg text-canvas' : 'text-fg/50 hover:text-fg'}`}
                >
                  <Icono size={13} /> <span className="hidden lg:inline">{v.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setPaso('venta')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg"
            title="Tipo de venta, productos, ventas cruzadas y recomendados"
          >
            <Settings2 size={13} /> <span className="hidden md:inline">Configurar venta</span>
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
          <div className="w-[46%] max-w-[720px] min-w-[320px] shrink-0 border-r border-fg/10 flex flex-col min-h-0">
            <div className="flex items-center gap-1 p-2 border-b border-fg/10">
              {TABS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors ${tab === t.key ? 'bg-fg text-canvas' : 'text-fg/50 hover:bg-fg/10'}`}
                >
                  {t.label}
                </button>
              ))}
              <span className="ml-auto pr-1 text-[11px] text-fg/40">
                Editando: <strong className="text-fg/70">{esPropia ? `Ficha de ${nombreProductoFicha}` : vista === 'producto' ? 'Ficha general' : 'Inicio'}</strong>
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
              <div className="flex-1 min-h-0 flex flex-col">
                <textarea
                  key={`${claveVista}-${tab}`}
                  value={codigoVista[tabActiva.lenguaje] || ''}
                  onChange={e => escribir(tabActiva.lenguaje, e.target.value)}
                  onKeyDown={e => alTeclear(e, tabActiva.lenguaje)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder={PLACEHOLDERS[tabActiva.lenguaje]}
                  className="flex-1 min-h-0 w-full resize-none bg-black/40 text-fg/90 font-mono text-[12.5px] leading-[1.6] p-4 outline-none placeholder:text-fg/25"
                />
                <div className="px-4 py-2 border-t border-fg/10 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-fg/35">{AYUDAS[tabActiva.lenguaje]}</p>
                  <button
                    type="button"
                    onClick={cargarBase}
                    className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg/80"
                    title="Reemplaza esta vista por el código base de Gesicomm"
                  >
                    <FileCode2 size={12} /> Código base
                  </button>
                </div>
              </div>
            ) : tab === 'prompts' ? (
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
              <span className="text-[11px] text-fg/35 shrink-0">Vista previa · {vista === 'producto' ? 'Ficha' : 'Inicio'}</span>
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
          <div className="flex-1 min-h-0 flex justify-center overflow-hidden">
            {viewportMode === 'mobile' ? (
              <PhonePreviewShell className="p-4">
                <CodigoPreview
                  key={`${generacion}-${viewportMode}-${claveVista}`}
                  codigo={codigosPreview[claveVista] || codigosPreview[vista]}
                  titulo={ajustes.seo_titulo || ajustes.titulo}
                  datos={datosPreview}
                  onError={alErrorRuntime}
                  onCheckout={alCheckoutPreview}
                  onNavegar={alNavegarPreview}
                  onEvento={alEventoPreview}
                />
              </PhonePreviewShell>
            ) : (
              <div style={{ width: ANCHOS_VIEWPORT[viewportMode], maxWidth: '100%', height: '100%' }}>
                <CodigoPreview
                  key={`${generacion}-${viewportMode}-${claveVista}`}
                  codigo={codigosPreview[claveVista] || codigosPreview[vista]}
                  titulo={ajustes.seo_titulo || ajustes.titulo}
                  datos={datosPreview}
                  onError={alErrorRuntime}
                  onCheckout={alCheckoutPreview}
                  onNavegar={alNavegarPreview}
                  onEvento={alEventoPreview}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {asistenteAbierto && (
        <div className="absolute bottom-4 right-4 z-20 w-[380px] max-w-[calc(100vw-2rem)] bg-surface border border-fg/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-fg/10 bg-fg/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-fg truncate">Asistente IA</p>
                <p className="text-[11px] text-fg/50 truncate">Le pide cambios a {nombreTargetIA}</p>
              </div>
            </div>
            <button type="button" onClick={() => setAsistenteAbierto(false)} className="p-1.5 rounded-lg hover:bg-fg/10 text-fg/40 hover:text-fg shrink-0" title="Cerrar">
              <X size={15} />
            </button>
          </div>
          <div className="p-3 space-y-2.5">
            <p className="text-xs text-fg/55 leading-relaxed">
              {esPropia ? (
                <>Edita <strong className="text-fg/75">solo la ficha de "{nombreProductoFicha}"</strong> — los demás productos no se tocan. Ej: "estilo outdoor premium", "look tech futurista".</>
              ) : (
                <>Pedile un ajuste puntual ("agregá una sección de beneficios", "hacela más minimalista") — edita <strong className="text-fg/75">{nombreTargetIA}</strong> conservando el resto. Para {vista === 'inicio' ? 'la ficha de producto' : 'el inicio'}, cambiá de vista arriba primero.</>
              )}
            </p>
            {errorIA && <p className="text-xs text-danger">{errorIA}</p>}
            <form
              onSubmit={e => { e.preventDefault(); regenerarConIA(); }}
              className="relative flex items-end gap-2"
            >
              <textarea
                value={promptIA}
                onChange={e => setPromptIA(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); regenerarConIA(); }
                }}
                rows={2}
                disabled={regenerando}
                placeholder={esPropia ? 'Ej: estilo outdoor premium, tonos tierra...' : 'Ej: agregá una sección de beneficios...'}
                className="flex-1 resize-none bg-fg/5 border border-fg/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-fg disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={regenerando || promptIA.trim().length < 5}
                className="shrink-0 p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                title={`Editar ${nombreTargetIA} con este prompt`}
              >
                {regenerando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>
      )}
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

  const nombreVista = vista === 'producto' ? 'la ficha de producto' : 'el inicio';

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
          <li>Revisá el preview y guardá. Repetí con la otra vista (arriba: Inicio / Ficha).</li>
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
        Incluir el código base (la IA parte de algo que ya funciona)
      </label>

      <div>
        {/* Un solo prompt para copiar. Había también "Solo las reglas" (el
            maestro suelto), pero sin la tienda, sus colores, el logo ni los
            productos la IA no sabía qué armar: el completo ya trae esas reglas. */}
        <div className="rounded-xl border border-fg/25 bg-fg/5 p-3 flex flex-col mb-3">
          <p className="text-sm font-semibold text-fg">Prompt {vista === 'producto' ? 'de la ficha' : 'del inicio'}</p>
          <p className="text-xs text-fg/60 mt-1">
            Todo en uno: las reglas de Gesicomm + tu tienda (nombre, colores, logo) + tus {seleccion.length} producto{seleccion.length === 1 ? '' : 's'} + lo que tiene que tener {nombreVista}{incluirBase ? ' + el código base' : ''}. Pegalo en un chat nuevo y la IA ya sabe todo.
          </p>
          <button
            type="button"
            onClick={() => copiar(prompt, 'vista')}
            className="mt-2.5 self-start inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-fg text-canvas hover:bg-fg-muted"
          >
            {copiado === 'vista' ? <Check size={13} /> : <Copy size={13} />} {copiado === 'vista' ? 'Copiado' : `Copiar prompt ${vista === 'producto' ? 'de la ficha' : 'del inicio'}`}
          </button>
        </div>
        <span className="block text-xs font-semibold text-fg/70 mb-2">
          Así queda el prompt completo {vista === 'producto' ? 'de la ficha' : 'del inicio'}
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

function Campo({ etiqueta, ayuda, valor, onChange, multilinea }) {
  const Elemento = multilinea ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-fg/70 mb-1">{etiqueta}</span>
      <Elemento
        value={valor}
        onChange={e => onChange(e.target.value)}
        rows={multilinea ? 3 : undefined}
        className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-fg/30"
      />
      {ayuda && <span className="block mt-1 text-[11px] text-fg/35">{ayuda}</span>}
    </label>
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
