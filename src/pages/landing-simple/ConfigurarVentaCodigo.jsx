import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader, ArrowRight, ArrowLeft, Search, Check, AlertTriangle, Infinity as InfinityIcon, Tag, Plus, Pencil, X,
  Eye, Home, ShoppingBag, MousePointerClick, Smartphone, Monitor, Maximize2,
} from 'lucide-react';
import { ofertaService } from '../../services/ofertaService';
import { contentIdPanel, datosRuntimePreview } from './datosRuntime';
import { getMediaUrl } from '../../services/api';
import CodigoPreview from './CodigoPreview';
import { plantillaInicioPara, formatoDeBase, PLANTILLA_PRODUCTO } from './plantillasBaseCodigo';

// El MISMO editor de ofertas de la ficha de producto (precios, componentes,
// margen, imagen): acá se abre en un panel lateral para crear o editar sin
// salir del paso. Lazy: es pesado y solo se carga si se abre.
// productos.css viaja con él: el editor usa clases (form-group,
// offer-strategy-grid…) que en su ficha original carga ProductForm.
const OfertasProductoTab = lazy(() => Promise.all([
  import('../productos/OfertasProductoTab'),
  import('../productos/productos.css'),
]).then(([modulo]) => modulo));

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

const FORMATOS = [
  {
    key: 'catalogo',
    titulo: 'Catálogo',
    texto: 'Una tienda: todos tus productos con buscador, filtros y una ficha para cada uno.',
  },
  {
    key: 'producto_unico',
    titulo: 'Producto estrella',
    texto: 'Una página de venta larga para un solo producto, con compra en un toque.',
  },
  {
    key: 'combos',
    titulo: 'Combos',
    texto: 'Tus packs primero, mostrando qué incluye cada uno y cuánto se ahorra.',
  },
];

const MODOS = [
  { key: 'manual', label: 'Uno por uno', ayuda: 'Marcás exactamente qué productos entran.' },
  { key: 'categoria', label: 'Por categoría', ayuda: 'Entra todo lo que esté en venta en las categorías que elijas, también lo que cargues después.' },
  { key: 'todos', label: 'Todo el catálogo', ayuda: 'Entra todo lo que tengas en venta, sin límite. Ideal para una tienda completa o un marketplace.' },
];

const CANTIDADES_RECO = [2, 3, 4, 6, 8];
// Con catálogos enormes, el preview no necesita más que esto para verse igual.
const MAX_PRODUCTOS_PREVIEW = 120;
const MARCA_CODIGO_INICIAL = 'Escribí acá el HTML de tu landing';

const clave = item => `${item.tipo}:${item.id}`;

function formatearGs(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `Gs ${num.toLocaleString('es-PY', { maximumFractionDigits: 0 })}`;
}

const precioPanel = item => item?.precio_efectivo ?? item?.precio_usuario ?? item?.precio_base ?? item?.precio ?? null;

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

const cargarOfertasTienda = () => ofertaService.listarTodas({ estrategias: ['order_bump', 'upsell'] });

export default function ConfigurarVentaCodigo({
  catalogo, inicial, onConfirmar, onVolver, onCambiarModo, guardando, cargarOfertas = cargarOfertasTienda,
  tienda = null, codigos = null,
}) {
  const ventaInicial = inicial?.venta || {};
  const [tipo, setTipo] = useState(ventaInicial.tipo || 'catalogo');
  const [modo, setModo] = useState(ventaInicial.seleccion || 'manual');
  const [categorias, setCategorias] = useState(() => new Set(ventaInicial.categorias || []));
  const [incluirCombos, setIncluirCombos] = useState(ventaInicial.incluir_combos !== false);
  const [manual, setManual] = useState(() => (
    ventaInicial.seleccion && ventaInicial.seleccion !== 'manual' ? [] : (inicial?.seleccion || []).map(clave)
  ));
  const [principal, setPrincipal] = useState(() => (inicial?.seleccion?.[0] ? clave(inicial.seleccion[0]) : null));
  const [busqueda, setBusqueda] = useState('');
  const [busquedaCategoria, setBusquedaCategoria] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const [crossActivo, setCrossActivo] = useState(ventaInicial.cross_sell?.activo !== false);
  const [ofertasElegidas, setOfertasElegidas] = useState(() => new Set(ventaInicial.cross_sell?.ofertas || []));
  const [ofertas, setOfertas] = useState(null); // null = cargando
  const [errorOfertas, setErrorOfertas] = useState('');
  // Panel de ofertas: null cerrado · { producto: null } eligiendo producto ·
  // { producto } editando las ofertas de ese producto.
  const [panelOfertas, setPanelOfertas] = useState(null);

  const [recoActivo, setRecoActivo] = useState(ventaInicial.recomendados?.activo !== false);
  const [recoModo, setRecoModo] = useState(ventaInicial.recomendados?.modo || 'auto');
  const [recoItems, setRecoItems] = useState(ventaInicial.recomendados?.items || []);
  const [recoMax, setRecoMax] = useState(ventaInicial.recomendados?.max || 4);
  const [recoTitulo, setRecoTitulo] = useState(ventaInicial.recomendados?.titulo || '');
  const [error, setError] = useState('');

  // Vista previa
  const [vistaPreview, setVistaPreview] = useState('inicio');
  const [productoPreview, setProductoPreview] = useState(null); // content_id
  const [resaltado, setResaltado] = useState(null); // { lista, n }
  const [avisoPreview, setAvisoPreview] = useState('');
  const [previewMovil, setPreviewMovil] = useState(false);
  const [dispositivo, setDispositivo] = useState('movil'); // 'movil' | 'escritorio'
  const [previewAmpliada, setPreviewAmpliada] = useState(false);

  // Todas las order bump / upsell activas de la tienda, de entrada: antes se
  // buscaban solo en los productos ya elegidos, así que con la selección
  // vacía la sección decía "no hay ofertas" aunque las hubiera.
  const recargarOfertas = useCallback(() => {
    setErrorOfertas('');
    return cargarOfertas()
      .then(lista => setOfertas(Array.isArray(lista) ? lista : []))
      .catch(() => {
        setOfertas(prev => prev || []);
        setErrorOfertas('No se pudieron cargar tus ofertas. Recargá la página para intentar de nuevo.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { recargarOfertas(); }, [recargarOfertas]);

  const todos = useMemo(() => [
    ...(catalogo?.productos || []).map(p => ({ ...p, tipo: 'producto' })),
    ...(catalogo?.combos || []).map(c => ({ ...c, tipo: 'combo' })),
  ], [catalogo]);
  const porClave = useMemo(() => new Map(todos.map(i => [clave(i), i])), [todos]);

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
      ? aplicarReglaVenta(catalogo, { seleccion: modo, categorias: Array.from(categorias), incluir_combos: incluirCombos, tipo })
      : manual.map(k => porClave.get(k)).filter(Boolean);
    if (!esRegla && tipo === 'combos') {
      lista = [...lista.filter(i => i.tipo === 'combo'), ...lista.filter(i => i.tipo !== 'combo')];
    }
    if (tipo === 'producto_unico' && principal) {
      const p = lista.find(i => clave(i) === principal);
      if (p) lista = [p, ...lista.filter(i => i !== p)];
    }
    return lista;
  }, [esRegla, catalogo, modo, categorias, incluirCombos, tipo, manual, porClave, principal]);

  const excedeManual = !esRegla && seleccion.length > MAX_PRODUCTOS_MANUAL;
  const idsProductoEnLanding = useMemo(
    () => new Set(seleccion.filter(i => i.tipo === 'producto').map(i => Number(i.id))),
    [seleccion],
  );

  // Ofertas agrupadas por el producto al que pertenecen (cada oferta se
  // guarda EN un producto: Productos → ficha → Ofertas). Se separan las de
  // productos de esta landing de las del resto de la tienda.
  const [ofertasDeLanding, ofertasDeOtros] = useMemo(() => {
    const grupos = new Map();
    (ofertas || []).forEach(o => {
      const id = Number(o.producto_ancla_id);
      if (!grupos.has(id)) grupos.set(id, { producto: o.producto_ancla, ofertas: [] });
      grupos.get(id).ofertas.push(o);
    });
    const todosGrupos = Array.from(grupos.entries());
    return [
      todosGrupos.filter(([id]) => idsProductoEnLanding.has(id)),
      todosGrupos.filter(([id]) => !idsProductoEnLanding.has(id)),
    ];
  }, [ofertas, idsProductoEnLanding]);
  const [verOtrasOfertas, setVerOtrasOfertas] = useState(false);

  // La configuración tal como quedaría guardada — la usan el preview y el
  // guardado, así lo que se ve es lo que se vende.
  const ventaActual = useMemo(() => ({
    configurado: true,
    tipo,
    seleccion: modo,
    categorias: Array.from(categorias),
    incluir_combos: incluirCombos,
    cross_sell: { activo: crossActivo, ofertas: Array.from(ofertasElegidas) },
    recomendados: {
      activo: recoActivo,
      modo: recoModo,
      items: recoItems,
      max: recoMax,
      titulo: recoTitulo,
    },
  }), [tipo, modo, categorias, incluirCombos, crossActivo, ofertasElegidas, recoActivo, recoModo, recoItems, recoMax, recoTitulo]);

  function sumarProducto(productoId) {
    const k = `producto:${Number(productoId)}`;
    if (porClave.has(k)) setManual(prev => (prev.includes(k) ? prev : [...prev, k]));
  }

  function alternarOferta(oferta) {
    const elegida = ofertasElegidas.has(oferta.id);
    setOfertasElegidas(prev => {
      const copia = new Set(prev);
      if (elegida) copia.delete(oferta.id); else copia.add(oferta.id);
      return copia;
    });
    // Una oferta se muestra en la ficha y el carrito de SU producto: si ese
    // producto no está en la landing, nunca aparecería. Uno por uno se suma
    // solo; con una regla, esas ofertas quedan en "otros productos".
    if (!elegida && !esRegla) sumarProducto(oferta.producto_ancla_id);
    // Y se muestra en la vista previa, en la ficha de ese producto.
    if (!elegida) {
      const prod = porClave.get(`producto:${Number(oferta.producto_ancla_id)}`);
      if (prod) verDonde('producto', 'ofertas', contentIdPanel(prod));
    }
  }

  // Al cerrar el panel se vuelve a pedir la lista: lo creado o editado ahí
  // aparece acá sin recargar la página.
  function cerrarPanelOfertas() {
    setPanelOfertas(null);
    recargarOfertas();
  }

  function nombreProductoOferta(productoId) {
    const o = (ofertas || []).find(x => Number(x.producto_ancla_id) === Number(productoId));
    return o?.producto_ancla?.nombre || `Producto #${productoId}`;
  }

  function abrirOfertasDe(productoId) {
    const producto = porClave.get(`producto:${Number(productoId)}`)
      || { id: Number(productoId), tipo: 'producto', nombre: nombreProductoOferta(productoId) };
    setPanelOfertas({ producto });
  }

  const candidatosReco = useMemo(
    () => seleccion.slice(0, 300).map(i => ({ ...i, content_id: contentIdPanel(i) })),
    [seleccion],
  );

  function alternarManual(item) {
    const k = clave(item);
    setManual(prev => (prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]));
    if (tipo === 'producto_unico' && !principal) setPrincipal(k);
  }

  function alternarCategoria(cat) {
    setCategorias(prev => {
      const copia = new Set(prev);
      if (copia.has(cat)) copia.delete(cat); else copia.add(cat);
      return copia;
    });
  }

  const visiblesManual = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return todos.filter(i => (filtroTipo === 'todos' || i.tipo === filtroTipo)
      && (!q || i.nombre?.toLowerCase().includes(q) || i.categoria?.toLowerCase().includes(q)));
  }, [todos, busqueda, filtroTipo]);

  function elegirVisibles() {
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
  const codigoInicioPreview = inicioEsBase ? plantillaInicioPara(tipo) : codigos.inicio;
  const codigoFichaPreview = codigos?.producto?.html ? codigos.producto : PLANTILLA_PRODUCTO;

  const productosPreview = useMemo(() => seleccion.slice(0, MAX_PRODUCTOS_PREVIEW), [seleccion]);
  const productoFicha = useMemo(() => {
    const productosSolos = productosPreview.filter(p => p.tipo === 'producto');
    return productosPreview.find(p => contentIdPanel(p) === productoPreview) || productosSolos[0] || productosPreview[0] || null;
  }, [productosPreview, productoPreview]);

  const datosPreview = useMemo(() => datosRuntimePreview({
    productos: productosPreview,
    tienda,
    venta: ventaActual,
    vista: vistaPreview,
    productoId: productoFicha ? contentIdPanel(productoFicha) : null,
    ofertas: ofertas || [],
  }), [productosPreview, tienda, ventaActual, vistaPreview, productoFicha, ofertas]);

  function verDonde(vista, lista = null, productoId = null) {
    setVistaPreview(vista);
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
    verDonde('producto', 'ofertas', contentIdPanel(conOfertas));
  }

  function verRecomendados() {
    if (tipo === 'producto_unico') verDonde('inicio', 'recomendados');
    else verDonde('producto', 'recomendados');
  }

  const alNavegarPreview = useCallback((p) => {
    if (p?.destino === 'producto') { setVistaPreview('producto'); setProductoPreview(p.producto); setResaltado(null); }
    else if (p?.destino === 'inicio') { setVistaPreview('inicio'); setResaltado(null); }
    else if (p?.destino === 'pagina') setAvisoPreview('Ese link abre una página de la tienda (legales o contacto).');
  }, []);
  const alComprarPreview = useCallback((p) => {
    setAvisoPreview(p?.oferta
      ? 'En la landing publicada, esto agrega la oferta al carrito.'
      : 'En la landing publicada, esto agrega el producto y abre el carrito.');
  }, []);

  // Lo que impide guardar, dicho como qué falta hacer.
  const bloqueo = (() => {
    if (modo === 'categoria' && !categorias.size) return 'Elegí al menos una categoría.';
    if (!seleccion.length) return modo === 'manual' ? 'Marcá al menos un producto.' : 'Esta selección no tiene productos en venta.';
    if (excedeManual) return `Uno por uno admite hasta ${MAX_PRODUCTOS_MANUAL}. Para más, usá “Todo el catálogo”.`;
    if (tipo === 'combos' && !seleccion.some(i => i.tipo === 'combo')) return 'El formato Combos necesita al menos un combo en la selección.';
    return null;
  })();

  async function confirmar() {
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
      // Con una regla no hay lista: el backend resuelve los productos.
      items: esRegla ? [] : seleccion,
    });
  }

  if (!catalogo) {
    return (
      <div className="flex items-center justify-center gap-2 text-fg-muted p-16">
        <Loader size={18} className="animate-spin" /> Cargando tu catálogo…
      </div>
    );
  }

  const formato = FORMATOS.find(f => f.key === tipo);
  const resumenProductos = modo === 'todos'
    ? 'Todo el catálogo'
    : `${seleccion.length.toLocaleString('es-PY')} producto${seleccion.length === 1 ? '' : 's'}`;
  const resumenOfertas = !crossActivo || !ofertasElegidas.size
    ? 'sin ofertas'
    : `${ofertasElegidas.size} oferta${ofertasElegidas.size === 1 ? '' : 's'}`;
  const resumenReco = !recoActivo ? 'sin recomendados' : (recoModo === 'auto' ? 'recomendados automáticos' : `${recoItems.length} recomendados`);

  const propsVistaPrevia = {
    vista: vistaPreview,
    onVista: v => { setVistaPreview(v); setResaltado(null); setAvisoPreview(''); },
    productos: productosPreview,
    productoFicha,
    onProducto: id => { setProductoPreview(id); setResaltado(null); },
    codigo: vistaPreview === 'producto' ? codigoFichaPreview : codigoInicioPreview,
    datos: datosPreview,
    resaltado,
    aviso: avisoPreview,
    inicioEsBase,
    onNavegar: alNavegarPreview,
    onComprar: alComprarPreview,
    dispositivo,
    onDispositivo: setDispositivo,
  };
  const vistaPrevia = <VistaPrevia {...propsVistaPrevia} onAmpliar={() => setPreviewAmpliada(true)} />;

  return (
    <div className="h-full flex flex-col bg-canvas">
      <div className="flex-1 min-h-0 flex">
        {/* Configuración */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-10">
            <header className="mb-7">
              <button
                type="button"
                onClick={onVolver}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <ArrowLeft size={15} /> Volver
              </button>
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">Landing HTML · paso 1 de 2</p>
              <h1 className="mt-2 text-[28px] md:text-[32px] leading-tight font-bold tracking-tight text-fg">¿Qué vas a vender?</h1>
              <p className="mt-2 text-[15px] text-fg-muted">
                Todo lo que elegís acá se ve al instante en la vista previa. En el paso 2 cambiás el diseño, a mano o con IA.
              </p>
            </header>

            <div className="space-y-5">
              {/* Formato */}
              <Bloque
                titulo="Formato"
                ayuda="Cambia cómo se arma la página de inicio. Probá cada uno y mirá la vista previa."
                verDonde={() => verDonde('inicio')}
              >
                <div role="radiogroup" aria-label="Formato de venta" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FORMATOS.map(f => {
                    const activo = tipo === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => { setTipo(f.key); verDonde('inicio'); }}
                        className={`group text-left rounded-xl border p-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activo ? 'border-accent bg-accent/[0.07]' : 'border-border hover:border-border-strong bg-surface'}`}
                      >
                        <Diagrama tipo={f.key} activo={activo} />
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="font-semibold text-fg">{f.titulo}</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${activo ? 'border-accent bg-accent' : 'border-border-strong'}`}>
                            {activo && <Check size={11} strokeWidth={3} className="text-accent-fg" />}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] leading-snug text-fg-muted">{f.texto}</p>
                      </button>
                    );
                  })}
                </div>
                {!inicioEsBase && (
                  <p className="mt-3 text-xs text-fg-muted">
                    Tu inicio ya tiene un diseño propio: el formato cambia el orden de los productos y lo que se le pide a la IA, no tu HTML.
                  </p>
                )}
              </Bloque>

              {/* Productos */}
              <Bloque
                titulo="Productos"
                ayuda={MODOS.find(m => m.key === modo)?.ayuda}
                verDonde={() => verDonde('inicio', tipo === 'combos' ? 'combos' : (tipo === 'producto_unico' ? 'productos' : 'catalogo'))}
              >
                <div role="tablist" aria-label="Cómo elegir los productos" className="flex w-full sm:w-auto sm:inline-flex rounded-lg bg-surface-2 p-1 mb-4">
                  {MODOS.map(m => (
                    <button
                      key={m.key}
                      type="button"
                      role="tab"
                      aria-selected={modo === m.key}
                      onClick={() => setModo(m.key)}
                      className={`flex-1 sm:flex-none px-3.5 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${modo === m.key ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {modo === 'manual' && (
                  <div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o categoría" etiqueta="Buscar productos" />
                      <select
                        value={filtroTipo}
                        onChange={e => setFiltroTipo(e.target.value)}
                        aria-label="Tipo"
                        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
                      >
                        <option value="todos">Productos y combos</option>
                        <option value="producto">Solo productos</option>
                        <option value="combo">Solo combos</option>
                      </select>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[13px]">
                      <span className="text-fg-muted"><span className="font-mono text-fg">{manual.length}</span> marcados</span>
                      <div className="flex gap-4">
                        <button type="button" onClick={elegirVisibles} className="font-medium text-primary-text hover:underline">
                          Marcar {busqueda || filtroTipo !== 'todos' ? 'estos' : 'todos'} ({visiblesManual.length})
                        </button>
                        {manual.length > 0 && (
                          <button type="button" onClick={() => setManual([])} className="font-medium text-fg-muted hover:text-fg">Desmarcar todo</button>
                        )}
                      </div>
                    </div>
                    <ul className="mt-2 max-h-[340px] overflow-y-auto rounded-xl border border-border divide-y divide-border">
                      {visiblesManual.length === 0 && (
                        <li className="px-4 py-6 text-sm text-fg-muted text-center">Ningún producto coincide con “{busqueda}”.</li>
                      )}
                      {visiblesManual.map(item => {
                        const k = clave(item);
                        const elegido = manual.includes(k);
                        return (
                          <li key={k}>
                            <label className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${elegido ? 'bg-accent/[0.06]' : 'hover:bg-surface-2'}`}>
                              <input type="checkbox" checked={elegido} onChange={() => alternarManual(item)} className="w-4 h-4 accent-primary shrink-0" />
                              <Miniatura item={item} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm text-fg truncate">{item.nombre}</span>
                                <span className="block text-xs text-fg-muted truncate">
                                  {item.tipo === 'combo' ? 'Combo' : (item.categoria || 'Sin categoría')}
                                </span>
                              </span>
                              <span className="font-mono text-xs text-fg-muted tabular-nums">{formatearGs(precioPanel(item))}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {modo === 'categoria' && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Buscador valor={busquedaCategoria} onChange={setBusquedaCategoria} placeholder="Buscar categoría" etiqueta="Buscar categoría" />
                      <div className="flex gap-4 text-[13px] sm:ml-2 shrink-0">
                        <button type="button" onClick={() => setCategorias(new Set(categoriasDisponibles.map(([c]) => c)))} className="font-medium text-primary-text hover:underline">Todas</button>
                        <button type="button" onClick={() => setCategorias(new Set())} className="font-medium text-fg-muted hover:text-fg">Ninguna</button>
                      </div>
                    </div>
                    {categoriasDisponibles.length === 0 ? (
                      <p className="mt-3 text-sm text-fg-muted">Tus productos todavía no tienen categorías. Asignalas en Productos o usá “Uno por uno”.</p>
                    ) : (
                      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 max-h-[300px] overflow-y-auto rounded-xl border border-border px-3 py-1">
                        {categoriasVisibles.map(([cat, n]) => (
                          <li key={cat}>
                            <label className="flex items-center gap-3 py-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={categorias.has(cat)} onChange={() => alternarCategoria(cat)} className="w-4 h-4 accent-primary shrink-0" />
                              <span className={`flex-1 truncate ${categorias.has(cat) ? 'text-fg font-medium' : 'text-fg-muted'}`}>{cat}</span>
                              <span className="font-mono text-xs text-fg-muted tabular-nums">{n}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {esRegla && (
                  <>
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
                      <p className="flex items-start gap-2 text-[13px] text-fg-muted">
                        <InfinityIcon size={16} className="mt-0.5 shrink-0 text-accent-text" />
                        Sin límite y siempre al día: si mañana cargás un producto {modo === 'categoria' ? 'en estas categorías' : 'nuevo'}, aparece solo.
                      </p>
                      <label className="flex items-start gap-2 text-sm text-fg shrink-0 cursor-pointer sm:max-w-[220px]">
                        <input type="checkbox" checked={incluirCombos} onChange={e => setIncluirCombos(e.target.checked)} className="w-4 h-4 mt-0.5 accent-primary" />
                        <span>
                          Incluir combos
                          <span className="block text-xs text-fg-muted">Suma también tus combos{modo === 'categoria' ? ' de esas categorías' : ''}.</span>
                        </span>
                      </label>
                    </div>
                    <ProductosIncluidos lista={seleccion} vacio={modo === 'categoria' && !categorias.size ? 'Marcá una o más categorías para ver qué productos entran.' : 'Ningún producto en venta coincide con esta selección.'} />
                  </>
                )}

                {tipo === 'producto_unico' && seleccion.length > 0 && (
                  <label className="mt-4 block">
                    <span className="block text-sm font-medium text-fg mb-1.5">Producto estrella</span>
                    <select
                      value={principal || clave(seleccion[0])}
                      onChange={e => { setPrincipal(e.target.value); verDonde('inicio', 'productos'); }}
                      className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
                    >
                      {seleccion.slice(0, 300).map(i => <option key={clave(i)} value={clave(i)}>{i.nombre}</option>)}
                    </select>
                    <span className="block mt-1.5 text-xs text-fg-muted">Es el que venden todos los botones de la página. Los demás aparecen abajo, como complemento.</span>
                  </label>
                )}
              </Bloque>

              {/* Ofertas */}
              <Bloque
                titulo="Ofertas en la compra"
                ayuda="Cuando alguien compra un producto de esta landing, le ofrecés algo más."
                interruptor={{ activo: crossActivo, onChange: setCrossActivo, etiqueta: 'Mostrar ofertas en la compra' }}
                verDonde={crossActivo ? verOfertas : null}
              >
                {crossActivo && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Concepto
                        titulo="Order bump"
                        texto="Una casilla en la ficha y el checkout: «Sumá el canasto por Gs 63.000». Se acepta con un toque."
                      />
                      <Concepto
                        titulo="Upsell"
                        texto="Una sugerencia en el carrito cuando el producto ya está agregado: «¿Lo querés con el kit?»."
                      />
                    </div>
                    <p className="text-xs text-fg-muted">
                      ¿Cross sell (venta cruzada)? Es ofrecer <em>otro</em> producto: se arma como order bump o como upsell.
                    </p>

                    <div className="rounded-lg border border-border bg-surface-2/60 px-3.5 py-2.5 text-[13px] text-fg-muted">
                      <span className="font-semibold text-fg">¿De dónde salen?</span>{' '}
                      Cada oferta se guarda en un producto (la ves también en Productos → ficha del producto → Ofertas).
                      Si tus productos ya tenían ofertas, aparecen acá abajo. <span className="text-fg">En esta landing solo se muestran las que marques.</span>
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
                            <p className="mt-1 text-[13px] text-fg-muted">Elegís el producto, qué le ofrecés y a qué precio.</p>
                            <button
                              type="button"
                              onClick={() => setPanelOfertas({ producto: null })}
                              className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover"
                            >
                              <Plus size={15} /> Crear una oferta
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-fg">Productos de esta landing con ofertas</p>
                              <button
                                type="button"
                                onClick={() => setPanelOfertas({ producto: null })}
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium text-fg hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                              >
                                <Plus size={15} /> Oferta para otro producto
                              </button>
                            </div>
                            {ofertasDeLanding.map(([productoId, grupo]) => (
                              <GrupoOfertas
                                key={productoId}
                                producto={porClave.get(`producto:${productoId}`) || grupo.producto}
                                nombre={grupo.producto?.nombre || `Producto #${productoId}`}
                                ofertas={grupo.ofertas}
                                elegidas={ofertasElegidas}
                                onAlternar={alternarOferta}
                                onGestionar={() => abrirOfertasDe(productoId)}
                              />
                            ))}
                          </>
                        )}

                        {ofertasDeOtros.length > 0 && (
                          <div className="rounded-xl border border-border">
                            <button
                              type="button"
                              onClick={() => setVerOtrasOfertas(v => !v)}
                              aria-expanded={verOtrasOfertas}
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm text-fg-muted hover:text-fg"
                            >
                              <span>
                                Ofertas de otros productos de tu tienda <span className="font-mono">({ofertasDeOtros.reduce((n, [, g]) => n + g.ofertas.length, 0)})</span>
                              </span>
                              <span className="text-xs">{verOtrasOfertas ? 'Ocultar' : 'Ver'}</span>
                            </button>
                            {verOtrasOfertas && (
                              <div className="px-3 pb-3 space-y-3">
                                <p className="px-1 text-xs text-fg-muted">
                                  Sus productos no están en esta landing, así que no se muestran.
                                  {!esRegla && ' Si sumás el producto, podés usar sus ofertas.'}
                                </p>
                                {ofertasDeOtros.map(([productoId, grupo]) => (
                                  <GrupoOfertas
                                    key={productoId}
                                    producto={porClave.get(`producto:${productoId}`) || grupo.producto}
                                    nombre={grupo.producto?.nombre || `Producto #${productoId}`}
                                    ofertas={grupo.ofertas}
                                    elegidas={ofertasElegidas}
                                    fuera
                                    onSumar={!esRegla && porClave.has(`producto:${productoId}`) ? () => sumarProducto(productoId) : null}
                                    onGestionar={() => abrirOfertasDe(productoId)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Bloque>

              {/* Recomendados */}
              <Bloque
                titulo="Productos recomendados"
                ayuda={tipo === 'producto_unico'
                  ? 'Una fila de complementos debajo del producto estrella.'
                  : 'Una fila «Te puede gustar» al final de la ficha de cada producto.'}
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
                        <div>
                          <p className="text-xs text-fg-muted mb-2">Tocá los que querés recomendar ({recoItems.length} de hasta 12):</p>
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {candidatosReco.map(i => {
                              const elegido = recoItems.includes(i.content_id);
                              return (
                                <button
                                  key={i.content_id}
                                  type="button"
                                  aria-pressed={elegido}
                                  onClick={() => {
                                    setRecoItems(prev => (elegido ? prev.filter(x => x !== i.content_id) : [...prev, i.content_id].slice(0, 12)));
                                    verRecomendados();
                                  }}
                                  className={`px-3 py-1.5 rounded-full border text-[13px] transition-colors ${elegido ? 'border-accent bg-accent text-accent-fg font-medium' : 'border-border text-fg-muted hover:text-fg hover:border-border-strong'}`}
                                >
                                  {i.nombre}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
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
                      <label className="flex-1">
                        <span className="block text-sm font-medium text-fg mb-1.5">Título de la sección</span>
                        <input
                          value={recoTitulo}
                          onChange={e => setRecoTitulo(e.target.value)}
                          maxLength={80}
                          placeholder="Te puede gustar"
                          className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted/70 outline-none focus:border-primary"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </Bloque>

              {onCambiarModo && (
                <p className="text-[13px] text-fg-muted px-1">
                  ¿Preferís no escribir código?{' '}
                  <button type="button" onClick={onCambiarModo} className="font-medium text-primary-text hover:underline">
                    Usar una plantilla en su lugar
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Vista previa (escritorio ancho) */}
        <aside className="hidden xl:flex w-[460px] shrink-0 border-l border-border bg-surface-2 flex-col min-h-0" aria-label="Vista previa">
          {vistaPrevia}
        </aside>
      </div>

      {/* Barra de acción: resumen + seguir, siempre a la vista */}
      <div className="shrink-0 border-t border-border bg-surface px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg truncate">
              {formato?.titulo} · <span className="font-mono font-normal">{resumenProductos}</span>
            </p>
            <p className={`text-xs truncate ${error ? 'text-danger' : bloqueo ? 'text-warning' : 'text-fg-muted'}`}>
              {error || bloqueo || `Con ${resumenOfertas} y ${resumenReco}.`}
            </p>
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
            disabled={guardando || !!bloqueo}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-fg text-sm font-semibold transition-colors hover:bg-primary-hover disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {guardando && <Loader size={15} className="animate-spin" />}
            Guardar y armar el diseño
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

      {previewAmpliada && (
        <div className="fixed inset-0 z-50 bg-surface-2 flex flex-col" role="dialog" aria-modal="true" aria-label="Vista previa ampliada">
          <VistaPrevia {...propsVistaPrevia} ampliada onCerrar={() => setPreviewAmpliada(false)} />
        </div>
      )}

      {panelOfertas && (
        <PanelOfertas
          producto={panelOfertas.producto}
          productos={todos.filter(i => i.tipo === 'producto')}
          enLanding={idsProductoEnLanding}
          onElegir={producto => setPanelOfertas({ producto })}
          onCambiarProducto={() => setPanelOfertas({ producto: null })}
          onCerrar={cerrarPanelOfertas}
        />
      )}
    </div>
  );
}

// Ancho real de una pantalla de escritorio: la vista previa de escritorio
// renderiza la landing a este ancho y la achica para que entre.
const ANCHO_ESCRITORIO = 1280;
const ANCHO_MOVIL = 390;

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
  vista, onVista, productos, productoFicha, onProducto, codigo, datos, resaltado, aviso, inicioEsBase, onNavegar, onComprar,
  dispositivo, onDispositivo, onAmpliar, ampliada, onCerrar,
}) {
  const productosFicha = productos.filter(p => p.tipo === 'producto' || p.tipo === 'combo');
  const [marcoRef, tam] = useTamano();
  const escritorio = dispositivo === 'escritorio';
  const escala = escritorio && tam.w ? Math.min(1, tam.w / ANCHO_ESCRITORIO) : 1;

  const iframe = (
    <CodigoPreview
      key={`${vista}-${dispositivo}`}
      codigo={codigo}
      titulo="Vista previa"
      datos={resaltado?.lista ? { ...datos, resaltar: resaltado.lista } : datos}
      resaltar={resaltado}
      onNavegar={onNavegar}
      onCheckout={onComprar}
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
            {[['inicio', 'Inicio', Home], ['producto', 'Ficha de producto', ShoppingBag]].map(([k, label, Icono]) => (
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
            : (vista === 'inicio' && !inicioEsBase ? 'Mostrando tu diseño actual.' : 'Diseño base: en el paso 2 lo cambiás a tu gusto.')}
        </p>
      </div>

      <div className={`flex-1 min-h-0 flex justify-center ${ampliada ? 'p-4 md:p-6' : 'px-4 pb-4'}`}>
        {productos.length === 0 ? (
          <div className="w-full max-w-[390px] rounded-[28px] border border-dashed border-border-strong flex items-center justify-center p-8 text-center text-sm text-fg-muted">
            Elegí productos y los vas a ver acá.
          </div>
        ) : escritorio ? (
          // Ventana de navegador: la página a 1280px, achicada al ancho disponible.
          <div className="w-full h-full flex flex-col rounded-xl border border-border-strong overflow-hidden bg-white shadow-xl">
            <div className="h-7 shrink-0 flex items-center gap-1.5 px-3 bg-surface border-b border-border" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
              <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
            </div>
            <div ref={marcoRef} className="flex-1 min-h-0 relative overflow-hidden">
              {tam.w > 0 && (
                <div
                  style={{
                    width: ANCHO_ESCRITORIO,
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
          <div
            className="w-full h-full rounded-[28px] border-[6px] border-fg/85 overflow-hidden bg-white shadow-xl"
            style={{ maxWidth: ANCHO_MOVIL + 12 }}
          >
            {iframe}
          </div>
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
function GrupoOfertas({ producto, nombre, ofertas, elegidas, onAlternar, onGestionar, onSumar, fuera }) {
  const precioProducto = Number(precioPanel(producto)) || 0;
  const bumpsMarcados = ofertas.filter(o => o.estrategia === 'order_bump' && elegidas.has(o.id)).length;
  return (
    <div className={`rounded-xl border border-border overflow-hidden ${fuera ? 'opacity-80' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-2">
        {producto && <Miniatura item={producto} />}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-fg-muted">Cuando compran</p>
          <p className="text-sm font-semibold text-fg truncate">{nombre}</p>
        </div>
        {onSumar && (
          <button type="button" onClick={onSumar} className="text-xs font-semibold text-primary-text hover:underline shrink-0">
            Sumar el producto
          </button>
        )}
        <button
          type="button"
          onClick={onGestionar}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border bg-surface text-xs font-medium text-fg hover:border-border-strong shrink-0"
        >
          <Pencil size={12} /> Agregar o editar
        </button>
      </div>
      {!fuera && bumpsMarcados > 1 && (
        <p className="px-4 py-2 text-[11px] text-warning bg-warning/[0.07] border-t border-border">
          Marcaste {bumpsMarcados} order bumps para este producto. Una sola oferta fuerte suele rendir más que varias: dejá la más relevante.
        </p>
      )}
      <ul className="divide-y divide-border">
        {ofertas.map(o => {
          const precio = o.precio_order_bump ?? o.precio_normal;
          const antes = o.precio_order_bump != null && Number(o.precio_normal) > Number(o.precio_order_bump) ? o.precio_normal : null;
          return (
            <li key={o.id}>
              <label className={`flex items-start gap-3 px-4 py-3 ${fuera ? 'cursor-default' : 'cursor-pointer hover:bg-surface-2'} transition-colors`}>
                <input
                  type="checkbox"
                  checked={elegidas.has(o.id)}
                  disabled={fuera}
                  onChange={() => onAlternar?.(o)}
                  aria-label={`Mostrar ${o.nombre} en esta landing`}
                  className="w-4 h-4 mt-0.5 accent-primary shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-fg">{o.nombre}</span>
                  <span className="block text-xs text-fg-muted mt-0.5">
                    <span className="font-medium text-fg/80">{o.estrategia === 'order_bump' ? 'Order bump' : 'Upsell'}</span>
                    {o.estrategia === 'order_bump' ? ' · en la ficha y el checkout' : ' · en el carrito'}
                  </span>
                  <span className="block text-xs text-fg-muted">Ofrece: {queOfrece(o)}</span>
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Concepto({ titulo, texto }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3.5 py-2.5">
      <p className="text-[13px] font-semibold text-fg">{titulo}</p>
      <p className="text-xs text-fg-muted mt-0.5 leading-snug">{texto}</p>
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
function PanelOfertas({ producto, productos, enLanding, onElegir, onCambiarProducto, onCerrar }) {
  const [busqueda, setBusqueda] = useState('');

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

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Ofertas">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-black/40 cursor-default" />
      <div className="relative w-full max-w-4xl h-full bg-canvas border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 md:px-6 h-16 border-b border-border bg-surface shrink-0">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">Ofertas en la compra</p>
            <p className="text-[15px] font-semibold text-fg truncate">{producto ? `Cuando compran ${producto.nombre}` : '¿Con qué producto se ofrece?'}</p>
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
              <Suspense fallback={<p className="flex items-center gap-2 text-sm text-fg-muted"><Loader size={14} className="animate-spin" /> Abriendo el editor…</p>}>
                <OfertasProductoTab
                  productoId={producto.id}
                  productoNombre={producto.nombre}
                  productoAnclaPrecioBase={Number(precioPanel(producto)) || 0}
                  productoAnclaPrecioCosto={Number(producto.precio_costo) || 0}
                />
              </Suspense>
            </div>
          ) : (
            <div className="p-5 md:p-6 max-w-2xl">
              <p className="text-sm text-fg-muted mb-3">
                Elegí el producto que dispara la oferta: cuando alguien lo compre, le vas a ofrecer algo más.
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

/**
 * Dibujo mínimo de cada formato: se entiende la diferencia entre
 * "catálogo", "producto estrella" y "combos" antes de leer el texto.
 */
function Diagrama({ tipo, activo }) {
  const bloque = activo ? 'bg-accent/70' : 'bg-border-strong';
  const suave = activo ? 'bg-accent/30' : 'bg-border';
  return (
    <div className="h-16 rounded-lg bg-surface-2 p-2.5" aria-hidden="true">
      {tipo === 'catalogo' && (
        <div className="grid grid-cols-4 gap-1.5 h-full">
          {Array.from({ length: 8 }).map((_, i) => <span key={i} className={`rounded-sm ${i < 3 ? bloque : suave}`} />)}
        </div>
      )}
      {tipo === 'producto_unico' && (
        <div className="flex gap-2 h-full">
          <span className={`w-1/2 rounded-sm ${bloque}`} />
          <span className="flex-1 flex flex-col gap-1.5 justify-center">
            <span className={`h-1.5 w-full rounded-full ${suave}`} />
            <span className={`h-1.5 w-3/4 rounded-full ${suave}`} />
            <span className={`h-2.5 w-1/2 rounded-full ${bloque}`} />
          </span>
        </div>
      )}
      {tipo === 'combos' && (
        <div className="relative h-full">
          <span className={`absolute left-[18%] top-0 w-[38%] h-[80%] rounded-sm ${suave}`} />
          <span className={`absolute left-[30%] top-[10%] w-[38%] h-[80%] rounded-sm ${suave} opacity-80`} />
          <span className={`absolute left-[42%] top-[20%] w-[38%] h-[80%] rounded-sm ${bloque}`} />
        </div>
      )}
    </div>
  );
}
