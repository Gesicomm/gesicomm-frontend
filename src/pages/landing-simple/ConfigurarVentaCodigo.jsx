import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader, ArrowRight, ArrowLeft, Search, Check, AlertTriangle, Infinity as InfinityIcon, Tag, Plus, Pencil, X,
  Eye, Home, ShoppingBag, MousePointerClick, Smartphone, Monitor, Maximize2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { ofertaService } from '../../services/ofertaService';
import { comboAdminService } from '../../services/comboAdminService';
import { contentIdPanel, datosRuntimePreview } from './datosRuntime';
import { getMediaUrl } from '../../services/api';
import CodigoPreview from './CodigoPreview';
import { plantillaInicioPara, formatoDeBase, PLANTILLA_PRODUCTO } from './plantillasBaseCodigo';
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

// Antes había tres formatos (Catálogo, Producto estrella, Combos), cada uno
// con su propia página de inicio. Pero todo lo que vende (ofertas, combos,
// recomendados) vive en la ficha, así que se simplificó a una sola decisión:
// dónde entra el cliente. `venta.tipo` se sigue guardando (derivado) para
// las landings y los prompts de antes.
const ENTRADAS = [
  {
    key: 'tienda',
    diagrama: 'catalogo',
    titulo: 'En tu tienda',
    texto: 'Todos los productos con buscador y filtros. Cada uno tiene su ficha con ofertas, combos y recomendados.',
  },
  {
    key: 'producto',
    diagrama: 'producto_unico',
    titulo: 'Directo en un producto',
    texto: 'La landing abre en la ficha del producto principal. Ideal para anuncios: sin un clic de más.',
  },
];

const TIPOS_OFERTA_RAPIDA = [
  {
    key: 'pack',
    titulo: 'Paquete',
    subtitulo: 'Varias unidades del mismo producto',
    texto: 'Ideal para x2, x3 o reposición. Se muestra en la ficha del producto.',
  },
  {
    key: 'combo',
    titulo: 'Combo',
    subtitulo: 'Productos diferentes juntos',
    texto: 'Para vender un kit armado con precio propio y margen calculado.',
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
const MARCA_CODIGO_INICIAL = 'Escribí acá el HTML de tu landing';

const clave = item => `${item.tipo}:${item.id}`;

function formatearGs(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `Gs ${num.toLocaleString('es-PY', { maximumFractionDigits: 0 })}`;
}

const precioPanel = item => item?.precio_efectivo ?? item?.precio_usuario ?? item?.precio_base ?? item?.precio ?? null;

const normalizarTexto = valor => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

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
  tienda = null, codigos = null,
  // Error del guardado (viene del editor): sin esto, si el servidor
  // rechazaba el guardado, el botón "no hacía nada" a la vista.
  errorGuardado = null,
  // Vuelve a pedir el catálogo (p. ej. después de activar un combo acá).
  onRecargarCatalogo = null,
}) {
  const ventaInicial = inicial?.venta || {};
  const [abrirEn, setAbrirEn] = useState(ventaInicial.abrir_en || (ventaInicial.tipo === 'producto_unico' ? 'producto' : 'tienda'));
  const [combosPrimero, setCombosPrimero] = useState(ventaInicial.combos_primero ?? ventaInicial.tipo === 'combos');
  const tipo = abrirEn === 'producto' ? 'producto_unico' : (combosPrimero ? 'combos' : 'catalogo');
  const [modo, setModo] = useState(ventaInicial.seleccion || 'manual');
  const [categorias, setCategorias] = useState(() => new Set(ventaInicial.categorias || []));
  const [incluirCombos, setIncluirCombos] = useState(ventaInicial.incluir_combos !== false);
  const [manual, setManual] = useState(() => (
    ventaInicial.seleccion && ventaInicial.seleccion !== 'manual' ? [] : (inicial?.seleccion || []).map(clave)
  ));
  const [principal, setPrincipal] = useState(() => (inicial?.seleccion?.[0] ? clave(inicial.seleccion[0]) : null));
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
      siguiente[id] = { etiqueta: '', destacado: false, ...prev[id], ...cambio };
      return siguiente;
    });
  }
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
  const [dispositivo, setDispositivo] = useState('escritorio'); // 'movil' | 'escritorio'
  const [verDetalleError, setVerDetalleError] = useState(false);
  const [previewAmpliada, setPreviewAmpliada] = useState(false);

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

  const todos = useMemo(() => [
    ...(catalogo?.productos || []).map(p => ({ ...p, tipo: 'producto' })),
    ...(catalogo?.combos || []).map(c => ({ ...c, tipo: 'combo' })),
  ], [catalogo]);
  const porClave = useMemo(() => new Map(todos.map(i => [clave(i), i])), [todos]);
  const idsCombosCatalogo = useMemo(() => new Set((catalogo?.combos || []).map(c => Number(c.id))), [catalogo]);

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
  // guarda EN un producto: Productos → ficha → Ofertas). Se separan las de
  // productos de esta landing de las del resto de la tienda.
  const [ofertasDeLanding, ofertasDeOtros] = useMemo(() => {
    const grupos = new Map();
    ofertasConImagen.forEach(o => {
      const id = Number(o.producto_ancla_id);
      if (!grupos.has(id)) grupos.set(id, { producto: o.producto_ancla, ofertas: [] });
      grupos.get(id).ofertas.push(o);
    });
    const todosGrupos = Array.from(grupos.entries());
    return [
      todosGrupos.filter(([id]) => idsProductoEnLanding.has(id)),
      todosGrupos.filter(([id]) => !idsProductoEnLanding.has(id)),
    ];
  }, [ofertasConImagen, idsProductoEnLanding]);
  const [verOtrasOfertas, setVerOtrasOfertas] = useState(false);

  // La configuración tal como quedaría guardada — la usan el preview y el
  // guardado, así lo que se ve es lo que se vende.
  const ventaActual = useMemo(() => ({
    configurado: true,
    tipo,
    seleccion: modo,
    categorias: Array.from(categorias),
    incluir_combos: incluirCombos,
    abrir_en: abrirEn,
    combos_primero: abrirEn === 'tienda' && combosPrimero,
    paquetes: confPaquetes,
    // El producto que abre la landing en "Directo en un producto" (con una
    // regla no hay items guardados que lo pongan primero).
    principal_id: abrirEn === 'producto'
      ? (Number(String(principal || clave(seleccion.find(i => i.tipo === 'producto') || {})).split(':')[1]) || null)
      : null,
    cross_sell: { activo: crossActivo, ofertas: Array.from(ofertasElegidas) },
    recomendados: {
      activo: recoActivo,
      modo: recoModo,
      items: recoItems,
      max: recoMax,
      titulo: recoTitulo,
    },
  }), [tipo, abrirEn, combosPrimero, confPaquetes, principal, seleccion, modo, categorias, incluirCombos, crossActivo, ofertasElegidas, recoActivo, recoModo, recoItems, recoMax, recoTitulo]);

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
      const nuevas = (lista || []).filter(o => !antes.has(Number(o.id)));
      if (!nuevas.length) return;
      setOfertasElegidas(prev => new Set([...prev, ...nuevas.map(o => o.id)]));
      setCrossActivo(true);
      const primera = nuevas[0];
      if (!esRegla) sumarProducto(primera.producto_ancla_id);
      const prod = porClave.get(`producto:${Number(primera.producto_ancla_id)}`);
      if (prod) verOfertaEnFicha(primera, prod);
    });
  }

  function nombreProductoOferta(productoId) {
    const o = (ofertas || []).find(x => Number(x.producto_ancla_id) === Number(productoId));
    return o?.producto_ancla?.nombre || `Producto #${productoId}`;
  }

  // Aunque haya un solo producto en la landing, se pregunta cuál querés
  // editar: así no parece que el sistema eligió el producto por su cuenta.
  function abrirNuevaOferta(tipoOferta = null) {
    setPanelOfertas({ producto: null, estrategia: tipoOferta });
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
    const q = normalizarTexto(busqueda.trim());
    return todos.filter(i => itemPasaFiltroOrigen(i, filtroTipo, usuarioActual)
      && (!q || [i.nombre, i.categoria, nombreProveedorItem(i)].some(valor => normalizarTexto(valor).includes(q))));
  }, [todos, busqueda, filtroTipo, usuarioActual]);

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
  const abreEnFicha = abrirEn === 'producto';
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
    vista: abreEnFicha ? 'producto' : vistaPreview,
    productoId: abreEnFicha && vistaPreview === 'inicio' && seleccion[0]
      ? contentIdPanel(seleccion[0])
      : (productoFicha ? contentIdPanel(productoFicha) : null),
    ofertas: ofertasConImagen,
  }), [productosPreview, tienda, ventaActual, vistaPreview, productoFicha, ofertasConImagen, abreEnFicha, seleccion]);

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

  const resumenProductos = modo === 'todos'
    ? 'Todo el catálogo'
    : `${seleccion.length.toLocaleString('es-PY')} producto${seleccion.length === 1 ? '' : 's'}`;
  const resumenOfertas = !crossActivo || !ofertasElegidas.size
    ? 'Sin ofertas'
    : `${ofertasElegidas.size} oferta${ofertasElegidas.size === 1 ? '' : 's'}`;
  const resumenReco = !recoActivo
    ? 'sin recomendados'
    : (recoModo === 'auto' ? 'recomendados automáticos' : `${recoItems.length} recomendado${recoItems.length === 1 ? '' : 's'} a mano`);

  const propsVistaPrevia = {
    vista: vistaPreview,
    onVista: v => { setVistaPreview(v); setResaltado(null); setAvisoPreview(''); },
    productos: productosPreview,
    productoFicha,
    onProducto: id => { setProductoPreview(id); setResaltado(null); },
    codigo: vistaPreview === 'producto' || abreEnFicha ? codigoFichaPreview : codigoInicioPreview,
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
        <div className="flex-1 xl:flex-none xl:w-[600px] 2xl:w-[680px] min-w-0 overflow-y-auto">
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
              {/* Dónde entra el cliente */}
              <Bloque
                titulo="¿Dónde entra el cliente?"
                ayuda="La ficha de cada producto ya trae todo lo que vende: order bump, upsell, combos y recomendados."
                verDonde={() => verDonde('inicio')}
              >
                <div role="radiogroup" aria-label="Dónde entra el cliente" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ENTRADAS.map(f => {
                    const activo = abrirEn === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => { setAbrirEn(f.key); verDonde('inicio'); }}
                        className={`group text-left rounded-xl border p-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activo ? 'border-accent bg-accent/[0.07]' : 'border-border hover:border-border-strong bg-surface'}`}
                      >
                        <Diagrama tipo={f.diagrama} activo={activo} />
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
                {abrirEn === 'tienda' && (
                  <label className="mt-3 flex items-start gap-2 text-sm text-fg cursor-pointer">
                    <input type="checkbox" checked={combosPrimero} onChange={e => { setCombosPrimero(e.target.checked); verDonde('inicio', 'catalogo'); }} className="w-4 h-4 mt-0.5 accent-primary" />
                    <span>
                      Mostrar los combos primero
                      <span className="block text-xs text-fg-muted">En el catálogo, tus combos aparecen antes que los productos sueltos.</span>
                    </span>
                  </label>
                )}
                {abrirEn === 'producto' && (
                  <p className="mt-3 text-xs text-fg-muted">Elegí cuál es el producto principal abajo, en Productos. Los demás aparecen en su ficha como combos, ofertas o recomendados.</p>
                )}
                {!inicioEsBase && abrirEn === 'tienda' && (
                  <p className="mt-3 text-xs text-fg-muted">
                    Tu inicio ya tiene un diseño propio: esto cambia el orden de los productos, no tu HTML.
                  </p>
                )}
              </Bloque>

              {/* Productos */}
              <Bloque
                titulo="Productos"
                ayuda={MODOS.find(m => m.key === modo)?.ayuda}
                verDonde={() => (abreEnFicha ? verDonde('inicio') : verDonde('inicio', 'catalogo'))}
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

                <CombosSinPublicar
                  idsVisibles={idsCombosCatalogo}
                  onActivado={onRecargarCatalogo}
                  formatoCombos={tipo === 'combos'}
                />

                {modo === 'manual' && (
                  <div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, categoría o proveedor" etiqueta="Buscar productos" />
                      <select
                        value={filtroTipo}
                        onChange={e => setFiltroTipo(e.target.value)}
                        aria-label="Tipo"
                        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
                      >
                        <option value="producto_gesicom">Productos Gesicom</option>
                        <option value="producto_mio">Mis productos</option>
                        <option value="combo_gesicom">Combos Gesicom</option>
                        <option value="combo_mio">Mis combos</option>
                        <option value="todos">Todos</option>
                      </select>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[13px]">
                      <span className="text-fg-muted"><span className="font-mono text-fg">{manual.length}</span> marcados</span>
                      <div className="flex gap-4">
                        <button type="button" onClick={elegirVisibles} className="font-medium text-primary-text hover:underline">
                          Marcar {busqueda ? 'estos' : 'todos'} ({visiblesManual.length})
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
                                  {[item.tipo === 'combo' ? 'Combo' : (item.categoria || 'Sin categoría'), nombreProveedorItem(item)].filter(Boolean).join(' · ')}
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
                    <span className="block text-sm font-medium text-fg mb-1.5">Producto principal (abre la landing)</span>
                    <select
                      value={principal || clave(seleccion[0])}
                      onChange={e => { setPrincipal(e.target.value); verDonde('inicio'); }}
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
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg">Ofertas disponibles para esta landing</p>
                        <p className="mt-1 text-[13px] text-fg-muted">
                          Activá las ofertas que querés mostrar. Para crear o editar, primero elegís el producto que las dispara.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => abrirNuevaOferta()}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover shrink-0"
                      >
                        <Plus size={15} /> Nueva oferta
                      </button>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">Crear directo</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Crear oferta por tipo">
                        {TIPOS_OFERTA_RAPIDA.map(tipoOferta => (
                          <button
                            key={tipoOferta.key}
                            type="button"
                            onClick={() => abrirNuevaOferta(tipoOferta.key)}
                            className="group text-left rounded-xl border border-border bg-surface px-3.5 py-3 transition-colors hover:border-primary/70 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-fg">{tipoOferta.titulo}</span>
                              <ArrowRight size={15} className="text-fg-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary-text" />
                            </span>
                            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-warning">{tipoOferta.subtitulo}</span>
                            <span className="mt-1 block text-[12px] leading-5 text-fg-muted">{tipoOferta.texto}</span>
                          </button>
                        ))}
                      </div>
                    </div>

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
                              onClick={() => abrirNuevaOferta()}
                              className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover"
                            >
                              <Plus size={15} /> Crear primera oferta
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-fg">Productos de esta landing con ofertas</p>
                              <button
                                type="button"
                                onClick={() => abrirNuevaOferta()}
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium text-fg hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                              >
                                <Plus size={15} /> Nueva oferta
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
                ayuda="Una fila «Te puede gustar» al final de la ficha de cada producto."
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
        <aside className="hidden xl:flex flex-1 min-w-0 border-l border-border bg-surface-2 flex-col min-h-0" aria-label="Vista previa">
          {vistaPrevia}
        </aside>
      </div>

      {/* Barra de acción: resumen + seguir, siempre a la vista */}
      <div className="shrink-0 border-t border-border bg-surface px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg truncate">
              {ENTRADAS.find(e => e.key === abrirEn)?.titulo} · <span className="font-mono font-normal">{resumenProductos}</span>
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
          estrategia={panelOfertas.estrategia || null}
          productos={todos.filter(i => i.tipo === 'producto')}
          enLanding={idsProductoEnLanding}
          onElegir={producto => setPanelOfertas(p => ({ ...p, producto }))}
          onCambiarProducto={() => setPanelOfertas(p => ({ ...p, producto: null }))}
          onCerrar={cerrarPanelOfertas}
        />
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
  vista, onVista, productos, productoFicha, onProducto, codigo, datos, resaltado, aviso, inicioEsBase, onNavegar, onComprar,
  dispositivo, onDispositivo, onAmpliar, ampliada, onCerrar,
}) {
  const productosFicha = productos.filter(p => p.tipo === 'producto' || p.tipo === 'combo');
  const [marcoRef, tam] = useTamano();
  const escritorio = dispositivo === 'escritorio';
  const anchoLienzo = escritorio && tam.w ? Math.max(ANCHO_ESCRITORIO, tam.w) : ANCHO_ESCRITORIO;
  const escala = escritorio && tam.w ? Math.min(1, tam.w / anchoLienzo) : 1;

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
          // Ventana de navegador: 1280px como base, pero si el panel es mas
          // ancho el iframe crece con el marco para no dejar una franja vacia.
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
  const activas = ofertas.filter(o => o.estrategia === 'normal' || elegidas.has(o.id)).length;
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
          return (
            <li key={o.id}>
              <label className={`flex items-start gap-3 px-4 py-3 ${fuera ? 'cursor-default' : 'cursor-pointer hover:bg-surface-2'} transition-colors`}>
                {o.estrategia === 'normal' ? (
                  <Check size={16} className="mt-0.5 shrink-0 text-success" aria-label="Siempre visible en la ficha" />
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
                    {{ order_bump: ' · en la ficha y el checkout', upsell: ' · en el carrito', normal: ' · siempre en la ficha, en "Elegí tu oferta"' }[o.estrategia] || ''}
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
              {o.estrategia === 'normal' && !fuera && onCambiarPaquete && (
                <ConfigPaquete conf={confPaquetes[o.id] || {}} onCambiar={cambio => onCambiarPaquete(o.id, cambio)} />
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
function ConfigPaquete({ conf, onCambiar }) {
  const etiqueta = conf.etiqueta || '';
  return (
    <div className="px-4 pb-3 pl-11 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-fg-muted mr-1">Etiqueta</span>
        {ETIQUETAS_SUGERIDAS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => onCambiar({ etiqueta: etiqueta === t ? '' : t })}
            aria-pressed={etiqueta === t}
            className={`h-6 px-2 rounded-full text-[11px] font-medium border ${etiqueta === t ? 'bg-fg text-canvas border-fg' : 'border-border text-fg-muted hover:text-fg'}`}
          >
            {t}
          </button>
        ))}
        <input
          value={etiqueta}
          onChange={e => onCambiar({ etiqueta: e.target.value.slice(0, 24) })}
          placeholder="O escribí la tuya"
          maxLength={24}
          aria-label="Etiqueta del paquete"
          className="h-6 w-36 rounded-md border border-border bg-surface px-2 text-[11px] text-fg"
        />
      </div>
      <label className="flex items-center gap-2 text-[12px] text-fg cursor-pointer">
        <input type="checkbox" checked={!!conf.destacado} onChange={e => onCambiar({ destacado: e.target.checked })} className="w-3.5 h-3.5 accent-primary" />
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
function PanelOfertas({ producto, estrategia = null, productos, enLanding, onElegir, onCambiarProducto, onCerrar }) {
  const [busqueda, setBusqueda] = useState('');
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
              <Suspense fallback={<p className="flex items-center gap-2 text-sm text-fg-muted"><Loader size={14} className="animate-spin" /> Abriendo el editor…</p>}>
                <OfertasProductoTab
                  key={`${producto.id}-${estrategia || ''}`}
                  crearAlAbrir={estrategia}
                  productoId={producto.id}
                  productoNombre={producto.nombre}
                  productoAnclaPrecioBase={Number(precioPanel(producto)) || 0}
                  productoAnclaPrecioCosto={Number(producto.precio_costo) || 0}
                />
              </Suspense>
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
