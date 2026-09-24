import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader, Save, Trash2, ExternalLink, Eye, EyeOff, Monitor, Tablet, Smartphone,
  PanelLeftClose, PanelLeftOpen, AlertTriangle, RefreshCw, Copy, PackageCheck,
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

/**
 * Editor del modo "Lienzo en blanco": tres campos de código (HTML/CSS/JS)
 * a la izquierda, la landing renderizada a la derecha. Hermano de
 * LandingSimpleEditor — misma barra superior (guardar, publicar, ver,
 * eliminar), mismo servicio, misma fila de Landing — pero acá no hay
 * paneles de contenido: lo que se ve es exactamente lo que el comercio
 * escribió.
 *
 * El preview corre el borrador SIN guardar, dentro del mismo iframe
 * aislado que usa la landing pública (CodigoPreview). Guardar es lo que
 * pasa el código por el sanitizador del servidor, así que puede devolver
 * el código recortado: por eso después de guardar el borrador se
 * reemplaza por lo que respondió el backend y se muestran las
 * advertencias ("te saqué los <script> del HTML").
 */

const TABS = [
  { key: 'html', label: 'HTML', lenguaje: 'html' },
  { key: 'css', label: 'CSS', lenguaje: 'css' },
  { key: 'js', label: 'JavaScript', lenguaje: 'js' },
  { key: 'productos', label: 'Productos', lenguaje: null },
  { key: 'ajustes', label: 'Ajustes', lenguaje: null },
];

const CODIGO_VACIO = { html: '', css: '', js: '' };

const ANCHOS_VIEWPORT = { desktop: '100%', tablet: '768px', mobile: '390px' };

function precioProducto(item) {
  return item?.precio_efectivo ?? item?.precio_usuario ?? item?.precio_total ?? item?.precio_base ?? item?.precio ?? null;
}

function formatearGs(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `Gs ${num.toLocaleString('es-PY', { maximumFractionDigits: 0 })}`;
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizarSeleccionLanding(itemsSeleccionados, catalogo) {
  const productos = new Map((catalogo.productos || []).map(p => [Number(p.id), { ...p, tipo: 'producto' }]));
  const combos = new Map((catalogo.combos || []).map(c => [Number(c.id), { ...c, tipo: 'combo' }]));
  return itemsSeleccionados
    .map(item => {
      const mapa = item.tipo === 'combo' ? combos : productos;
      const base = mapa.get(Number(item.referencia_id));
      return { ...(base || item), tipo: item.tipo, id: Number(item.referencia_id) };
    })
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
      referencia_id: Number(p.referencia_id ?? p.id),
      etiqueta: p.etiqueta || '',
      orden: idx,
      precio_ancla: p.precio_ancla || null,
      envio_incluido: p.envio_incluido === true,
      mostrar_en_inicio: p.mostrar_en_inicio !== false,
    }))
    .filter(p => p.tipo && Number.isFinite(p.referencia_id));
}

export default function LandingCodigoEditor({ landingInicial, onEliminada }) {
  const { id: idParam } = useParams();
  const id = landingInicial?.id ?? idParam;
  const navigate = useNavigate();

  const [landing, setLanding] = useState(landingInicial || null);
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(!landingInicial);
  const [codigo, setCodigo] = useState(landingInicial?.content?.codigo || CODIGO_VACIO);
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
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [promptCopiado, setPromptCopiado] = useState(false);

  // El preview se repinta con un borrador aparte y con retardo: recargar
  // el iframe en cada tecla hace que la landing parpadee sin parar y
  // reinicia el JS del comercio a mitad de una frase.
  const [codigoPreview, setCodigoPreview] = useState(landingInicial?.content?.codigo || CODIGO_VACIO);
  const temporizador = useRef(null);

  useEffect(() => {
    let activo = true;
    Promise.all([
      landingInicial ? Promise.resolve(landingInicial) : landingSimpleService.obtener(id),
      tiendaService.obtener().catch(() => null),
    ]).then(([l, t]) => {
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
      setCodigo(inicialConProductos);
      setCodigoPreview(inicialConProductos);
      setProductosSeleccionados(productosPrefill);
      setAjustes({
        titulo: l.titulo || '',
        seo_titulo: l.seo_titulo || '',
        seo_descripcion: l.seo_descripcion || '',
      });
      setTienda(t);
      if (productosPrefill.length) {
        setTab('productos');
        setAviso('Productos seleccionados cargados en el lienzo. Revisá el prompt y guardá cuando esté listo.');
      }
      setCargando(false);
      if (productosPrefill.length) {
        vitrinaService.catalogo()
          .then(catalogo => {
            if (!activo) return;
            const enriquecidos = normalizarSeleccionLanding(prefilledItems, catalogo);
            setProductosSeleccionados(enriquecidos);
          })
          .catch(() => {});
      }
    }).catch(() => {
      if (activo) { setError('No se pudo cargar la landing.'); setCargando(false); }
    });
    return () => { activo = false; };
  }, [id, landingInicial]);

  useEffect(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setErrorRuntime('');
      setCodigoPreview(codigo);
    }, 600);
    return () => clearTimeout(temporizador.current);
  }, [codigo]);

  function escribir(clave, valor) {
    setCodigo(prev => ({ ...prev, [clave]: valor }));
    setAviso('');
  }

  // El iframe se remonta al refrescar (key nueva) — es la forma de volver
  // a correr el JS del comercio sin tocar el código.
  const [generacion, setGeneracion] = useState(0);
  const alErrorRuntime = useCallback((mensaje) => setErrorRuntime(mensaje), []);

  async function guardar() {
    setGuardando(true);
    setError('');
    setErroresDetalle([]);
    setAdvertencias([]);
    try {
      const actualizada = await landingSimpleService.actualizar(id, {
        titulo: ajustes.titulo,
        seo_titulo: ajustes.seo_titulo,
        seo_descripcion: ajustes.seo_descripcion,
        codigo,
        items: productosAItemsLanding(productosSeleccionados),
      });
      const guardado = { ...CODIGO_VACIO, ...(actualizada.content?.codigo || {}) };
      setLanding(actualizada);
      setCodigo(guardado);
      setCodigoPreview(guardado);
      setAdvertencias(actualizada.codigo_advertencias || []);
      setAviso('Cambios guardados.');
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.message || 'No se pudo guardar.');
      setErroresDetalle(data?.errores || []);
    } finally {
      setGuardando(false);
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

  const tabActiva = TABS.find(t => t.key === tab);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b border-fg/10 shrink-0 flex items-center justify-between px-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="flex items-center gap-1.5 p-2 -ml-2 text-fg/50 hover:text-fg transition-colors text-xs font-semibold bg-fg/5 rounded-lg px-3"
            title={sidebarVisible ? 'Ocultar editor de código' : 'Mostrar editor de código'}
          >
            {sidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span className="hidden sm:inline">{sidebarVisible ? 'Ocultar código' : 'Mostrar código'}</span>
          </button>
          <div>
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
          <div className="flex items-center bg-fg/5 rounded-lg p-0.5 mr-2 border border-fg/10">
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
          {aviso && <span className="text-xs text-emerald-400">{aviso}</span>}
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
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-fg text-canvas hover:bg-fg-muted disabled:opacity-50"
          >
            {guardando ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>

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
            <div className="flex gap-1 p-2 border-b border-fg/10">
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
            </div>

            {tabActiva?.lenguaje ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <textarea
                  key={tab}
                  value={codigo[tabActiva.lenguaje] || ''}
                  onChange={e => escribir(tabActiva.lenguaje, e.target.value)}
                  onKeyDown={e => alTeclear(e, tabActiva.lenguaje)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder={PLACEHOLDERS[tabActiva.lenguaje]}
                  className="flex-1 min-h-0 w-full resize-none bg-black/40 text-fg/90 font-mono text-[12.5px] leading-[1.6] p-4 outline-none placeholder:text-fg/25"
                />
                <p className="px-4 py-2 border-t border-fg/10 text-[11px] text-fg/35">
                  {AYUDAS[tabActiva.lenguaje]}
                </p>
              </div>
            ) : tab === 'productos' ? (
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="rounded-xl border border-fg/10 bg-fg/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-fg/45 uppercase tracking-wide">Contexto para IA</p>
                      <h2 className="text-base font-bold text-fg mt-1">Productos seleccionados</h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-fg/10 text-fg/70">
                      <PackageCheck size={13} /> {productosSeleccionados.length}
                    </span>
                  </div>
                  <p className="text-sm text-fg/50 mt-3">
                    Este prompt incluye los productos que elegiste en la vitrina. Pegalo en ChatGPT y pedile el estilo que quieras; después traé los bloques HTML, CSS y JavaScript a las pestañas del editor.
                  </p>
                </div>

                {productosSeleccionados.length > 0 ? (
                  <div className="space-y-2">
                    {productosSeleccionados.map(p => (
                      <div key={`${p.tipo}:${p.id}`} className="rounded-lg border border-fg/10 bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-fg">{p.nombre}</p>
                            <p className="text-xs text-fg/45">{p.tipo === 'combo' ? 'Combo' : 'Producto'}{p.categoria ? ` · ${p.categoria}` : ''}</p>
                          </div>
                          {formatearGs(precioProducto(p)) && <span className="text-xs font-bold text-fg/70">{formatearGs(precioProducto(p))}</span>}
                        </div>
                        {p.descripcion && <p className="text-xs text-fg/45 mt-2 line-clamp-2">{p.descripcion}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-fg/15 p-4 text-sm text-fg/45">
                    No llegaron productos desde la vitrina. Volvé a Mi catálogo, seleccioná uno o más productos y tocá “Generar mi landing”.
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-semibold text-fg/70">Prompt para ChatGPT</span>
                    <button
                      type="button"
                      onClick={copiarPromptProductos}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-fg text-canvas hover:bg-fg-muted"
                    >
                      <Copy size={13} /> {promptCopiado ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <textarea
                    value={promptProductos}
                    readOnly
                    rows={14}
                    className="w-full resize-y bg-black/40 border border-fg/10 rounded-lg p-3 text-xs leading-relaxed text-fg/75 outline-none font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4 overflow-y-auto">
                <Campo
                  etiqueta="Nombre de la landing"
                  ayuda="Solo lo ves vos, en el panel."
                  valor={ajustes.titulo}
                  onChange={v => { setAjustes(a => ({ ...a, titulo: v })); setAviso(''); }}
                />
                <Campo
                  etiqueta="Título para Google y redes"
                  ayuda="Lo que se lee en la pestaña del navegador y al compartir el link."
                  valor={ajustes.seo_titulo}
                  onChange={v => { setAjustes(a => ({ ...a, seo_titulo: v })); setAviso(''); }}
                />
                <Campo
                  etiqueta="Descripción para Google y redes"
                  ayuda="Dos líneas que resuman la oferta."
                  valor={ajustes.seo_descripcion}
                  onChange={v => { setAjustes(a => ({ ...a, seo_descripcion: v })); setAviso(''); }}
                  multilinea
                />
                <div className="pt-2 border-t border-fg/10 text-[11px] text-fg/40 leading-relaxed">
                  Tu código corre aislado: no puede leer la sesión de la tienda ni
                  mandar datos a otros servidores. Por eso el JavaScript no admite
                  <code className="mx-1 text-fg/60">fetch</code>,
                  <code className="mx-1 text-fg/60">localStorage</code> ni
                  <code className="mx-1 text-fg/60">document.cookie</code>.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col bg-neutral-900/40">
          <div className="h-9 shrink-0 border-b border-fg/10 flex items-center justify-between px-3">
            <span className="text-[11px] text-fg/35">Vista previa en vivo</span>
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
          <div className="flex-1 min-h-0 flex justify-center overflow-hidden">
            <div style={{ width: ANCHOS_VIEWPORT[viewportMode], maxWidth: '100%', height: '100%' }}>
              <CodigoPreview
                key={`${generacion}-${viewportMode}`}
                codigo={codigoPreview}
                titulo={ajustes.seo_titulo || ajustes.titulo}
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
  js: 'Corre al final del body, dentro del iframe aislado. Sin fetch, localStorage ni acceso a la ventana contenedora.',
};
