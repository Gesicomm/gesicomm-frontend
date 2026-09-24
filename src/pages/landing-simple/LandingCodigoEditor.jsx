import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader, Save, Trash2, ExternalLink, Eye, EyeOff, Monitor, Tablet, Smartphone,
  PanelLeftClose, PanelLeftOpen, AlertTriangle, RefreshCw, Copy, Settings2, Home, ShoppingBag,
  FileCode2, Wand2, Check,
} from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { tiendaService } from '../../services/tiendaService';
import { vitrinaService } from '../../services/vitrinaService';
import CodigoPreview from './CodigoPreview';
import { getMediaUrl } from '../../services/api';
import { armarSeccionesSistema, codigoTieneContacto, codigoTieneFooter, codigoTieneProductos } from './seccionesSistemaCodigo';
import { CSS_BUMP_CODIGO } from './bumpCodigo';

// En el editor no hay ofertas cargadas: el marcador del bump se muestra como
// un recuadro que avisa dónde va a aparecer, en vez de quedar invisible.
const CSS_BUMP_EDITOR = `
[data-gesicomm-bump]:empty { display: block; margin: 16px 0; padding: 14px; border-radius: 14px; border: 1.5px dashed color-mix(in srgb, var(--gc-primario, #16a34a) 60%, transparent); font: 600 13px system-ui, sans-serif; opacity: .8; }
[data-gesicomm-bump]:empty::before { content: "Acá se muestra el order bump de este producto (se configura en Mis productos → Ofertas)"; }
`;
import { urlPublicaLanding } from './urlPublicaLanding';
import { datosRuntimePreview, contentIdPanel, PAGINAS_TIENDA } from './datosRuntime';
import { PLANTILLA_PRODUCTO, plantillaInicioPara, formatoDeBase } from './plantillasBaseCodigo';
import { PROMPT_MAESTRO, armarPromptVista } from './promptsCodigo';

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

function bloqueProductosHtml(productos = []) {
  if (!productos.length) return '';
  const cards = productos.map(p => {
    const precio = formatearGs(precioProducto(p));
    return [
      '    <article class="producto-card">',
      p.imagen ? `      <img src="${escaparHtml(p.imagen)}" alt="${escaparHtml(p.nombre)}" />` : '',
      `      <span class="producto-tipo">${p.tipo === 'combo' ? 'Combo' : 'Producto'}</span>`,
      `      <h3>${escaparHtml(p.nombre)}</h3>`,
      p.descripcion ? `      <p>${escaparHtml(p.descripcion)}</p>` : '',
      precio ? `      <strong>${precio}</strong>` : '',
      `      <div data-gesicomm-bump="${p.tipo}:${p.id}"></div>`,
      `      <button class="producto-cta" data-gesicomm-checkout="${p.tipo}:${p.id}">Comprar ahora</button>`,
      '    </article>',
    ].filter(Boolean).join('\n');
  }).join('\n');
  return [
    '<section class="productos" id="productos">',
    '  <div class="productos-header">',
    '    <span>Productos seleccionados</span>',
    '    <h2>Armá tu oferta con estos productos</h2>',
    '    <p>Estos son los productos que elegiste en tu catálogo. Podés cambiar textos, orden y llamadas a la acción.</p>',
    '  </div>',
    '  <div class="productos-grid">',
    cards,
    '  </div>',
    '</section>',
  ].join('\n');
}

function bloqueProductosCss(cssActual = '') {
  // Si el código todavía no define la paleta --gc-*, se la agrega: es lo que
  // lee el carrito de Gesicom para pintarse igual que la landing.
  const paleta = /--gc-primario\s*:/.test(cssActual) ? [] : [
    '',
    ':root {',
    '  --gc-primario: #2563eb;',
    '  --gc-texto-sobre-primario: #ffffff;',
    '  --gc-fondo: #ffffff;',
    '  --gc-texto: #0f172a;',
    '}',
  ];
  return [
    ...paleta,
    '',
    '.productos { padding: 72px 24px; }',
    '.productos-header { max-width: 820px; margin: 0 auto 28px; text-align: center; }',
    '.productos-header span { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--gc-primario); }',
    '.productos-header h2 { margin: 8px 0; font-size: clamp(28px, 4vw, 48px); }',
    '.productos-header p { margin: 0 auto; max-width: 62ch; opacity: .72; }',
    '.productos-grid { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }',
    '.producto-card { display: flex; flex-direction: column; gap: 10px; padding: 18px; border: 1px solid color-mix(in srgb, currentColor 12%, transparent); border-radius: 18px; }',
    '.producto-card img { width: 100%; aspect-ratio: 1 / 1; object-fit: contain; border-radius: 12px; background: #fff; }',
    '.producto-tipo { width: fit-content; padding: 5px 9px; border-radius: 999px; background: color-mix(in srgb, var(--gc-primario) 14%, transparent); color: var(--gc-primario); font-size: 11px; font-weight: 800; }',
    '.producto-card h3 { margin: 0; font-size: 20px; }',
    '.producto-card p { margin: 0; opacity: .72; line-height: 1.5; }',
    '.producto-card strong { margin-top: auto; font-size: 18px; }',
    '.producto-cta { display: inline-flex; justify-content: center; padding: 12px 16px; border: 0; border-radius: 12px; background: var(--gc-primario); color: var(--gc-texto-sobre-primario); font-weight: 800; text-decoration: none; cursor: pointer; }',
  ].join('\n');
}

function armarPromptProductos(productos = [], tienda) {
  const nombre = tienda?.nombre || 'mi tienda';
  const detalle = productos.map((p, idx) => [
    `${idx + 1}. ${p.nombre}`,
    `Tipo: ${p.tipo === 'combo' ? 'combo' : 'producto'}`,
    p.categoria ? `Categoría: ${p.categoria}` : null,
    formatearGs(precioProducto(p)) ? `Precio: ${formatearGs(precioProducto(p))}` : null,
    p.descripcion ? `Descripción: ${p.descripcion}` : null,
    p.imagen ? `Imagen: ${p.imagen}` : null,
    p.productos_incluidos?.length ? `Incluye: ${p.productos_incluidos.join(', ')}` : null,
  ].filter(Boolean).join('\n')).join('\n\n');
  return [
    `Quiero crear una landing en HTML, CSS y JavaScript para ${nombre}.`,
    'Usá los productos seleccionados de abajo como contenido principal de la oferta.',
    'La landing debe tener hero, sección de beneficios, detalle de los productos, prueba social y FAQ.',
    '',
    'COLORES (obligatorio): definí la paleta con estas variables CSS exactas en :root y usalas en todo el CSS.',
    'El carrito y el checkout de Gesicom leen estas variables para pintarse con los mismos colores de la landing:',
    ':root {',
    '  --gc-primario: #xxxxxx;              /* botones de compra y acentos */',
    '  --gc-texto-sobre-primario: #xxxxxx;  /* texto encima de --gc-primario, con buen contraste */',
    '  --gc-fondo: #xxxxxx;                 /* fondo principal de la página (color sólido) */',
    '  --gc-texto: #xxxxxx;                 /* texto principal sobre --gc-fondo */',
    '}',
    'Poné también background: var(--gc-fondo) y color: var(--gc-texto) en el body. Podés agregar otras variables propias, pero estas cuatro tienen que existir con estos nombres.',
    '',
    'CHECKOUT: cada botón de compra debe usar data-gesicomm-checkout="producto:ID" o data-gesicomm-checkout="combo:ID". Ese botón abre el carrito real de Gesicom (datos de entrega, PagoPar, order bump, upsell y cross-sell).',
    'ORDER BUMP: justo arriba del botón de compra de cada producto poné <div data-gesicomm-bump="producto:ID"></div> (vacío). Gesicom dibuja ahí la oferta configurada con su precio, ahorro e imagen, y el botón pasa a mostrar el total ("Comprar ahora · Gs 160.000"). NO armes el order bump a mano con un checkbox: no estaría conectado al pedido.',
    'CANTIDAD (opcional): si ponés un selector de cantidad, usá <input type="number" min="1" value="1" data-gesicomm-cantidad-de="producto:ID">.',
    'No armes carrito, formulario de compra, upsells ni cupones en el HTML: el checkout de Gesicom los muestra solo, con las ofertas configuradas en cada producto.',
    '',
    'CONTACTO Y FOOTER: no los incluyas. Gesicom agrega al final la sección de contacto con las redes sociales de la tienda y el footer con los enlaces legales, con los colores de la landing.',
    '',
    'No uses fetch, localStorage, cookies, scripts externos ni dependencias externas.',
    '',
    'Productos seleccionados:',
    detalle || 'Sin productos seleccionados.',
  ].join('\n');
}

function productosAItemsLanding(productos = []) {
  return productos
    .map((p, idx) => ({
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
  const [codigos, setCodigos] = useState(() => ({
    inicio: { ...CODIGO_VACIO, ...(landingInicial?.content?.codigo || {}) },
    producto: landingInicial?.content?.vistas?.producto?.html ? landingInicial.content.vistas.producto : PLANTILLA_PRODUCTO,
  }));
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
      let prefilledItems = [];
      try {
        const stored = sessionStorage.getItem('gesicomm:prefilledLandingItems');
        if (stored) {
          prefilledItems = JSON.parse(stored);
          sessionStorage.removeItem('gesicomm:prefilledLandingItems');
        }
      } catch (e) {}
      const productosPrefill = normalizarSeleccionLanding(prefilledItems, { productos: [], combos: [] });
      const inicial = { ...CODIGO_VACIO, ...(l.content?.codigo || {}) };
      const inicialConProductos = productosPrefill.length ? {
        // Contacto y footer ya no se pegan acá: los agrega Gesicom solo, con
        // los datos de la tienda (ver seccionesSistemaCodigo.js).
        html: inicial.html.includes('id="productos"') ? inicial.html : `${inicial.html}\n\n${bloqueProductosHtml(productosPrefill)}`,
        css: inicial.css.includes('.productos') ? inicial.css : `${inicial.css}\n${bloqueProductosCss(inicial.css)}`,
        js: inicial.js,
      } : inicial;
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

  function escribir(clave, valor) {
    setCodigos(prev => ({ ...prev, [vista]: { ...prev[vista], [clave]: valor } }));
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
        vistas: { producto: codigosAGuardar.producto },
        ...(ventaAGuardar ? { venta: ventaAGuardar } : {}),
        items: seleccionAItems(itemsAGuardar, landing?.items),
      });
      const guardados = {
        inicio: { ...CODIGO_VACIO, ...(actualizada.content?.codigo || {}) },
        producto: actualizada.content?.vistas?.producto?.html ? actualizada.content.vistas.producto : codigosAGuardar.producto,
      };
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
      setError(data?.message || 'No se pudo guardar.');
      setErroresDetalle(data?.errores || []);
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarVenta({ venta: nuevaVenta, seleccion: nuevaSeleccion, items: nuevosItems }) {
    // Con el código de arranque intacto, el inicio pasa a ser la página base
    // del formato elegido (la misma que mostró la vista previa). Si ya era la
    // base de OTRO formato, se cambia también, pero preguntando: puede tener
    // retoques del comercio.
    const baseActual = formatoDeBase(codigos.inicio.html);
    const codigoInicialIntacto = !codigos.inicio.html.trim() || codigos.inicio.html.includes(MARCA_CODIGO_INICIAL);
    const cambiaFormatoBase = !!baseActual && baseActual !== nuevaVenta.tipo
      && window.confirm('Cambiaste el formato. ¿Reemplazar la página de inicio por la base del formato nuevo? Se pierden los cambios que le hayas hecho al HTML de inicio.');
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
    const actual = codigos[vista];
    const tieneAlgo = actual.html.trim() || actual.css.trim() || actual.js.trim();
    if (tieneAlgo && !window.confirm('Esto reemplaza el HTML, CSS y JS de esta vista por el código base. ¿Seguir?')) return;
    setCodigos(prev => ({ ...prev, [vista]: baseDe(vista, venta?.tipo) }));
    setSinGuardar(true);
    setAviso('Código base cargado. Guardá para publicarlo.');
  }

  function aplicarRespuestaIa(bloques) {
    setCodigos(prev => ({ ...prev, [vista]: { ...prev[vista], ...bloques } }));
    setSinGuardar(true);
    setTab('html');
    setAviso(`Código aplicado a ${vista === 'producto' ? 'la ficha de producto' : 'el inicio'}. Revisá el preview y guardá.`);
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

  // Mismas secciones automáticas (productos/contacto/footer) que agrega la
  // landing pública, para que el preview no mienta. El contacto sale de la
  // landing y, lo que falte, de Configurar tienda — igual que el DTO público.
  const extrasPreview = useMemo(() => {
    const campo = k => landing?.[`contacto_${k}`] || tienda?.[k] || '';
    const contacto = Object.fromEntries(
      ['whatsapp', 'telefono', 'email', 'direccion', 'ciudad', 'pais', 'horarios', 'instagram', 'facebook', 'tiktok', 'youtube', 'twitter']
        .map(k => [k, campo(k)])
    );
    const secciones = armarSeccionesSistema({
      mostrarProductos: !codigoTieneProductos(codigoPreview),
      mostrarContacto: !codigoTieneContacto(codigoPreview),
      mostrarFooter: !codigoTieneFooter(codigoPreview),
      productos: productosSeleccionados.map(p => ({
        tipo: p.tipo,
        referencia_id: p.referencia_id ?? p.id,
        nombre: p.nombre,
        precio: precioProducto(p),
        imagen: p.imagen ? getMediaUrl(p.imagen) : null,
      })),
      contacto,
      nombreComercio: ajustes.titulo || tienda?.nombre || 'Tu tienda',
      acento: tienda?.color_primario || null,
    });
    return { ...secciones, css: `${secciones.css}\n${CSS_BUMP_CODIGO}\n${CSS_BUMP_EDITOR}` };
  }, [landing, tienda, productosSeleccionados, codigoPreview, ajustes.titulo]);
  const promptProductos = useMemo(
    () => armarPromptProductos(productosSeleccionados, tienda),
    [productosSeleccionados, tienda],
  );

  async function copiarPromptProductos() {
    try {
      await navigator.clipboard.writeText(promptProductos);
      setPromptCopiado(true);
      setTimeout(() => setPromptCopiado(false), 1800);
    } catch (e) {
      setError('No se pudo copiar el prompt. Seleccionalo manualmente desde la pestaña Productos.');
    }
  }

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
        inicial={{ venta, seleccion }}
        guardando={guardando}
        onConfirmar={confirmarVenta}
        onVolver={volverDesdeVenta}
        onCambiarModo={venta?.configurado ? null : () => cambiarDeModo()}
        tienda={tienda}
        codigos={codigos}
      />
    );
  }

  const tabActiva = TABS.find(t => t.key === tab);
  const codigoVista = codigos[vista];

  return (
    <div className="flex flex-col h-full">
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
                Editando: <strong className="text-fg/70">{vista === 'producto' ? 'Ficha de producto' : 'Inicio'}</strong>
              </span>
            </div>

            {tabActiva?.lenguaje ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <textarea
                  key={`${vista}-${tab}`}
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
              Una sola ficha para todos los productos. En el preview no hay variantes ni ofertas: en la landing publicada salen las reales de cada producto.
            </p>
          )}
          <div className="flex-1 min-h-0 flex justify-center overflow-hidden">
            <div style={{ width: ANCHOS_VIEWPORT[viewportMode], maxWidth: '100%', height: '100%' }}>
              <CodigoPreview
                key={`${generacion}-${viewportMode}-${vista}`}
                codigo={codigosPreview[vista]}
                titulo={ajustes.seo_titulo || ajustes.titulo}
                datos={datosPreview}
                onError={alErrorRuntime}
                extras={extrasPreview}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelPrompts({ vista, tienda, venta, seleccion, onAplicar, onError, onElegirProductos }) {
  const [estilo, setEstilo] = useState('');
  const [incluirBase, setIncluirBase] = useState(true);
  const [copiado, setCopiado] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [errorRespuesta, setErrorRespuesta] = useState('');

  const prompt = useMemo(() => armarPromptVista(vista, {
    tienda,
    venta,
    productos: seleccion,
    estilo,
    base: incluirBase ? baseDe(vista, venta?.tipo) : null,
  }), [vista, tienda, venta, seleccion, estilo, incluirBase]);

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
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-semibold text-fg/70">
            Prompt de {nombreVista} · {seleccion.length} producto{seleccion.length === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copiar(PROMPT_MAESTRO, 'maestro')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg"
              title="Solo las reglas y el contrato, sin productos ni vista: sirve como instrucción fija de un GPT o proyecto"
            >
              {copiado === 'maestro' ? <Check size={13} /> : <Copy size={13} />} Maestro
            </button>
            <button
              type="button"
              onClick={() => copiar(prompt, 'vista')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-fg text-canvas hover:bg-fg-muted"
            >
              {copiado === 'vista' ? <Check size={13} /> : <Copy size={13} />} {copiado === 'vista' ? 'Copiado' : 'Copiar prompt'}
            </button>
          </div>
        </div>
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
  css: 'Se inyecta en un <style> propio. @import no está permitido: usá <link> en el HTML o @font-face.',
  js: 'Corre después del runtime de Gesicomm (window.Gesicomm). Sin fetch, localStorage ni acceso a la ventana contenedora.',
};
