import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Save, Loader, AlertCircle, Check, ExternalLink,
  Power, PowerOff, CircleAlert, Monitor, Tablet, Smartphone, Trash2,
  PanelLeft, PanelRight
} from 'lucide-react';
import { landingService } from '../../services/landingService';
import { vitrinaService } from '../../services/vitrinaService';
import { tiendaService } from '../../services/tiendaService';
import { productService } from '../../services/productService';
import { getMediaUrl } from '../../services/api';
import ProductPicker from './ProductPicker';
import LandingPreview from './LandingPreview';
import EstadisticasPanel from './EstadisticasPanel';
import PasoContenido from './PasoContenido';

import InspectorGlobal from './InspectorGlobal';
import InspectorSeccion from './InspectorSeccion';
import SidebarSecciones from './SidebarSecciones';
import SelectorSecciones from './SelectorSecciones';
import LandingTemplatePicker from './LandingTemplatePicker';
import { VALORES_DEFECTO_POR_TIPO, getSeccionesBase, getSeccionesCatalogo, getSeccionesContacto, getSeccionesLegal, getSeccionesProducto } from './BloquesSchema';
import { FooterProvider } from '../../page-builder/blocks/footer-builder/FooterContext';
import FooterInspectorPanel from '../../page-builder/blocks/footer-builder/FooterInspectorPanel';

function seccionesDefaultPorRol(tipoPagina) {
  if (tipoPagina === 'catalogo') return getSeccionesCatalogo();
  if (tipoPagina === 'contacto') return getSeccionesContacto();
  if (TIPOS_SIN_CATALOGO.has(tipoPagina)) return getSeccionesLegal(tipoPagina);
  return getSeccionesBase();
}
import { BlockRegistry } from '../../page-builder/core/BlockRegistry';

import ConfirmDialog from '../../components/ConfirmDialog';
import '../vitrina/vitrina.css';
import './landing.css';

const MAX_ITEMS = 40;
const TIPOS_SIN_CATALOGO = new Set([
  'contacto',
  'politica_privacidad',
  'politica_reembolso',
  'terminos_servicio',
  'politica_envio',
  'aviso_legal',
]);

const ORDEN_PAGINAS_FIJAS = {
  inicio: 0,
  catalogo: 1,
  contacto: 2,
  politica_privacidad: 3,
  politica_reembolso: 4,
  terminos_servicio: 5,
  politica_envio: 6,
  aviso_legal: 7,
};

const SECCIONES_BASE = [
  { tipo: 'header', nombre_interno: 'Header', activo: true, fijo: true },
  { tipo: 'announcement_bar', nombre_interno: 'Barra superior', activo: false, contenido: { texto: 'Recibelo en 24hs!' } },
  { tipo: 'hero', nombre_interno: 'Inicio', activo: true, fijo: true },
  { tipo: 'beneficios', nombre_interno: 'Beneficios', activo: true },
  { tipo: 'categorias', nombre_interno: 'Categorias', activo: true },
  { tipo: 'destacados', nombre_interno: 'Destacados', activo: true },
  { tipo: 'banner', nombre_interno: 'Banner', activo: true },
  { tipo: 'productos', nombre_interno: 'Productos', activo: true, fijo: true },
  { tipo: 'texto', nombre_interno: 'Texto libre', activo: false, contenido: { titulo: 'Nueva seccion', texto: 'Contale algo importante a tus clientes.' } },
  { tipo: 'como_funciona', nombre_interno: 'Como funciona', activo: false, contenido: { titulo: 'Como funciona', pasos: ['Elegis tus productos', 'Completas tus datos', 'Coordinamos la entrega'] } },
  { tipo: 'testimonios', nombre_interno: 'Opiniones', activo: true },
  { tipo: 'faq', nombre_interno: 'Preguntas frecuentes', activo: true },
  { tipo: 'redes_sociales', nombre_interno: 'Redes sociales', activo: false, contenido: { titulo: 'Seguinos', instagram: '', facebook: '', tiktok: '' } },
  { tipo: 'footer', nombre_interno: 'Footer', activo: true, fijo: true },
];

const FORM_INICIAL = {
  nombre: '',
  titulo: '',
  descripcion: '',
  content: {},
  mostrar_filtro_categoria: true,
  mostrar_filtro_marca: true,
  mostrar_filtro_etiqueta: true,
  mostrar_buscador: true,
  mostrar_orden_precio: true,
  mostrar_banner: false,
  banner_titulo: '',
  banner_subtitulo: '',
  banner_boton_texto: '',
  banner_boton_link: '',
  tema_modo: 'oscuro',
  color_primario: '',
  color_fondo: '',
  color_texto: '',
  color_tarjeta: '',
  radio_bordes: 'mediano',
  fuente: 'outfit',
  typography: { mode: 'inherit' },
  mostrar_whatsapp: true,
  whatsapp_incluir_precio: false,
  whatsapp_incluir_url: false,
  mostrar_testimonios: false,
  mostrar_faq: false,
  checkout_redirigir_whatsapp: true,
  seo_titulo: '',
  seo_descripcion: '',
  seo_keywords: '',
};

function claveItem(tipo, id) {
  return `${tipo}:${id}`;
}

function linkBannerValido(link) {
  const limpio = link.trim();
  return !limpio || /^https?:\/\//i.test(limpio) || limpio.startsWith('/');
}

function seccionesDefaultProducto() {
  return getSeccionesProducto().map((s, idx) => ({
    ...s,
    id: `base-producto-${s.tipo}-${idx}`,
    orden: idx,
    nombre_interno: s.nombre_interno || (
      s.tipo === 'announcement_bar' ? 'Barra superior'
        : s.tipo === 'product_detail' ? 'Detalle de Producto'
          : s.tipo === 'testimonios' ? 'Opiniones'
            : s.tipo === 'productos_recomendados' ? 'Productos recomendados'
              : s.tipo === 'footer' ? 'Footer'
                : s.tipo === 'header' ? 'Header'
                  : s.tipo
    ),
    config: s.config || {},
    contenido: s.contenido || {},
  }));
}

function completarSeccionesProducto(secciones = [], fuenteLanding = []) {
  const heredables = new Map((fuenteLanding || [])
    .filter(s => ['announcement_bar', 'header', 'footer'].includes(s.tipo))
    .map(s => [s.tipo, s]));
  const aplicarHerencia = (s) => {
    const heredada = heredables.get(s.tipo);
    return heredada
      ? { ...s, ...heredada, page_type: 'product', id: s.id, stable_id: null, orden: s.orden }
      : s;
  };

  if (!secciones.length) secciones = seccionesDefaultProducto().map(aplicarHerencia);

  const existentes = new Set(secciones.map(s => s.tipo));
  const faltantes = seccionesDefaultProducto()
    .filter(s => !existentes.has(s.tipo))
    .map(aplicarHerencia);
  if (!faltantes.length) return secciones;

  const insertarAntesDeFooter = secciones.findIndex(s => s.tipo === 'footer');
  const base = [...secciones];
  const posicion = insertarAntesDeFooter >= 0 ? insertarAntesDeFooter : base.length;
  base.splice(posicion, 0, ...faltantes.map((s, i) => ({ ...s, id: `${s.id}-missing-${i}` })));
  return base.map((s, idx) => ({ ...s, orden: idx }));
}

const TIPOS_HEREDABLES_TIENDA = new Set(['announcement_bar', 'header', 'footer']);

function completarSeccionesPagina(tipoPagina, secciones = [], fuenteInicio = []) {
  const defaults = seccionesDefaultPorRol(tipoPagina).map((s, idx) => ({
    ...s,
    id: `base-${tipoPagina || 'landing'}-${s.tipo}-${idx}`,
    orden: idx,
    nombre_interno: s.nombre_interno || (
      s.tipo === 'announcement_bar' ? 'Barra superior'
        : s.tipo === 'header' ? 'Header'
          : s.tipo === 'footer' ? 'Footer'
            : s.tipo === 'productos' ? 'Productos'
              : s.tipo
    ),
    config: s.config || {},
    contenido: s.contenido || {},
  }));
  const heredables = new Map((fuenteInicio || [])
    .filter(s => TIPOS_HEREDABLES_TIENDA.has(s.tipo))
    .map(s => [s.tipo, s]));
  const existentes = new Map((secciones || []).map(s => [s.tipo, s]));
  const tiposDefault = new Set(defaults.map(s => s.tipo));

  const resultado = defaults.map((def) => {
    const actual = existentes.get(def.tipo) || def;
    const heredada = heredables.get(def.tipo);
    if (!heredada) return actual;
    return {
      ...actual,
      ...heredada,
      page_type: 'landing',
      id: actual.id,
      stable_id: actual.stable_id,
      orden: actual.orden,
    };
  });

  const extras = (secciones || []).filter(s => !tiposDefault.has(s.tipo));
  const indiceFooter = resultado.findIndex(s => s.tipo === 'footer');
  const destino = indiceFooter >= 0 ? indiceFooter : resultado.length;
  resultado.splice(destino, 0, ...extras);
  return resultado.map((s, idx) => ({ ...s, orden: idx }));
}

function tiempoRelativo(fecha) {
  if (!fecha) return null;
  const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

export default function LandingEditor() {
  const { id, productoId } = useParams();
  const esEdicion = !!id;
  // Modo producto: no se edita ninguna Landing — se edita el diseño propio
  // de UN producto (ver landing.service.js obtenerSeccionesProducto/
  // guardarSeccionesProducto). Reutiliza toda esta pantalla (sidebar,
  // inspector, preview) porque son genéricos sobre documentModel.pages.*,
  // pero carga/guarda por un camino totalmente distinto — nunca toca
  // /mis-landings/:id.
  const esModoProducto = !!productoId;
  const navigate = useNavigate();

  const [form, setForm] = useState(FORM_INICIAL);
  const [leftTab, setLeftTab] = useState('secciones'); // 'secciones' o 'checkout'
  const [seleccion, setSeleccion] = useState(new Map()); // clave -> { tipo, referencia_id, etiqueta }
  // Testimonios/FAQ se guardan en bloque junto con el resto del form (ver
  // armarPayload) — igual que `seleccion`, no tienen persistencia propia
  // fila por fila hasta el próximo Guardar.
  const [testimonios, setTestimonios] = useState([]); // [{ nombre, foto, calificacion, comentario }]
  const [faqs, setFaqs] = useState([]); // [{ pregunta, respuesta }]
  const [documentModel, setDocumentModel] = useState(() => ({
    pages: {
      landing: { sections: getSeccionesBase().map((s, idx) => ({ ...s, id: s.id || `base-${s.tipo}-${idx}`, orden: idx })) },
      producto: { sections: [] }
    }
  }));
  
  const [subiendoFotoTestimonio, setSubiendoFotoTestimonio] = useState(null); // índice de la fila, o null
  const [catalogo, setCatalogo] = useState({ productos: [], combos: [] });
  const [tienda, setTienda] = useState(null);
  const [landing, setLanding] = useState(null); // metadatos del registro guardado
  // Solo en modo producto: id de la landing "Inicio" de la tienda, usado
  // como host de subida de imágenes de sección (POST /mis-landings/:id/
  // seccion-imagen exige un landing_id para el chequeo de pertenencia,
  // pero la imagen en sí no queda atada a esa landing — ver
  // handleUploadSeccionImagen). El producto en sí no tiene una landing
  // propia a la que colgarle esto.
  const [inicioLandingId, setInicioLandingId] = useState(null);
  const [plantillaElegida, setPlantillaElegida] = useState(null); // id de la plantilla elegida al crear, null hasta elegir

  const [seccionSeleccionadaId, setSeccionSeleccionadaId] = useState(null);
  // "Visualizar checkout" (ProductDetailInspector.jsx) — fuerza a la
  // preview a mostrar el formulario de "Comprar ahora" abierto, para
  // revisar tarjetas de precio/order bump sin depender de clickear un
  // botón que en la preview no es interactivo.
  const [previewCheckoutAbierto, setPreviewCheckoutAbierto] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [viewportMode, setViewportMode] = useState('desktop');
  const [sidebarTab, setSidebarTab] = useState('sections'); // 'sections' | 'theme'
  const [viewMode, setViewMode] = useState(esModoProducto ? 'producto' : 'landing'); // 'landing' | 'producto'

  // Si el usuario navega desde /mi-landing a /mi-landing/producto/:id, React reutiliza el
  // componente LandingEditor y el useState original de viewMode no se re-evalúa, dejándolo
  // trabado en 'landing'. Este efecto fuerza el sincronismo.
  useEffect(() => {
    setViewMode(esModoProducto ? 'producto' : 'landing');
  }, [esModoProducto]);

  const secciones = documentModel.pages[viewMode]?.sections || [];
  
  const setSecciones = useCallback((updater) => {
    setDocumentModel(prev => {
      const currentSections = prev.pages[viewMode]?.sections || [];
      const newSections = typeof updater === 'function' ? updater(currentSections) : updater;
      return {
        ...prev,
        pages: {
          ...prev.pages,
          [viewMode]: {
            ...prev.pages[viewMode],
            sections: newSections
          }
        }
      };
    });
  }, [viewMode]);

  const handleActualizarSeccion = useCallback((id, updates) => {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    setSucio(true);
  }, [setSecciones]);

  const handleDuplicarSeccion = useCallback((id) => {
    setSecciones(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copia = {
        ...original,
        id: `temp-${Date.now()}`,
        stable_id: Math.random().toString(36).substr(2, 9),
        // If it was a fixed section, the copy cannot be fixed
        fijo: false,
      };
      const nuevas = [...prev];
      nuevas.splice(idx + 1, 0, copia);
      // Re-indexar orden
      return nuevas.map((s, i) => ({ ...s, orden: i }));
    });
    setSucio(true);
  }, [setSecciones]);

  const handleToggleVisible = useCallback((id) => {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, activo: !s.activo } : s));
    setSucio(true);
  }, [setSecciones]);

  const handleEliminarSeccion = useCallback((id) => {
    setSecciones(prev => prev.filter(s => s.id !== id));
    if (seccionSeleccionadaId === id) setSeccionSeleccionadaId(null);
    setSucio(true);
  }, [seccionSeleccionadaId, setSecciones]);

  const handleReordenarSeccion = useCallback((fromIndex, toIndex) => {
    setSecciones(prev => {
      const nuevas = [...prev];
      const [movida] = nuevas.splice(fromIndex, 1);
      nuevas.splice(toIndex, 0, movida);
      return nuevas;
    });
    setSucio(true);
  }, [setSecciones]);

  const handleMoverSeccion = useCallback((id, offset) => {
    setSecciones(prev => {
      const fromIndex = prev.findIndex(s => s.id === id);
      if (fromIndex === -1) return prev;
      const toIndex = fromIndex + offset;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      
      const nuevas = [...prev];
      const [movida] = nuevas.splice(fromIndex, 1);
      nuevas.splice(toIndex, 0, movida);
      return nuevas;
    });
    setSucio(true);
  }, [setSecciones]);

  // Cuando el usuario toca el botón "al lado" de una sección, se guarda acá
  // su id y se abre el MISMO selector de secciones. Al elegir el tipo,
  // handleAgregarSeccion mira este valor para decidir si la nueva sección va
  // al final (flujo normal) o emparejada en fila con esta.
  const [agregarAlLadoDe, setAgregarAlLadoDe] = useState(null);

  const handleAgregarAlLado = useCallback((seccionId) => {
    setAgregarAlLadoDe(seccionId);
    setSelectorAbierto(true);
  }, []);

  const handleAgregarSeccion = useCallback((tipo, templateStr) => {
    const defaults = VALORES_DEFECTO_POR_TIPO[tipo] || { template: 'standard', config: {}, contenido: {} };
    const finalTemplate = templateStr || defaults.template;

    const blockDef = BlockRegistry.resolve(tipo);
    const nuevaSeccion = {
      id: `temp-${Date.now()}`,
      stable_id: Math.random().toString(36).substr(2, 9),
      tipo,
      schema_version: blockDef?.schemaVersion || 1,
      template: finalTemplate,
      nombre_interno: tipo,
      activo: true,
      config: { ...defaults.config },
      contenido: { ...defaults.contenido },
    };

    if (agregarAlLadoDe) {
      // Fila de 2 columnas: la nueva sección se inserta JUSTO DESPUÉS de la
      // sección destino y ambas comparten un fila_id. Siguen siendo dos
      // secciones independientes en la lista, cada una con su inspector —
      // fila_id solo le dice al renderer que van lado a lado (ver
      // PageRenderer.jsx). Máximo 2 por fila.
      const filaId = `fila-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setSecciones(prev => {
        const idx = prev.findIndex(s => s.id === agregarAlLadoDe);
        if (idx === -1) return [...prev, nuevaSeccion];
        const objetivo = { ...prev[idx], config: { ...prev[idx].config, fila_id: filaId } };
        const nueva = { ...nuevaSeccion, config: { ...nuevaSeccion.config, fila_id: filaId } };
        const copia = [...prev];
        copia.splice(idx, 1, objetivo, nueva);
        return copia;
      });
      setAgregarAlLadoDe(null);
    } else {
      setSecciones(prev => [...prev, nuevaSeccion]);
    }

    setSelectorAbierto(false);
    setSeccionSeleccionadaId(nuevaSeccion.id);
    setSucio(true);
  }, [setSecciones, agregarAlLadoDe]);

  /** Saca una sección de su fila — la deja sola a ancho completo otra vez. */
  const handleSacarDeFila = useCallback((seccionId) => {
    setSecciones(prev => {
      const objetivo = prev.find(s => s.id === seccionId);
      const filaId = objetivo?.config?.fila_id;
      if (!filaId) return prev;
      // Si la fila queda con una sola sección, esa también pierde el fila_id
      // (una fila de uno no es una fila).
      const enLaFila = prev.filter(s => s.config?.fila_id === filaId);
      const idsALimpiar = new Set(enLaFila.length <= 2 ? enLaFila.map(s => s.id) : [seccionId]);
      return prev.map(s => {
        if (!idsALimpiar.has(s.id)) return s;
        const { fila_id, ...restoConfig } = s.config || {};
        return { ...s, config: restoConfig };
      });
    });
    setSucio(true);
  }, [setSecciones]);

  const [previewVisible, setPreviewVisible] = useState(true);
  const [sucio, setSucio] = useState(false);

  // ResizeObserver for desktop scaling
  const containerRef = useRef(null);
  const [desktopScale, setDesktopScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        // Si el contenedor mide menos de 1440px, achicamos la vista de desktop
        // con un tope máximo de escala 1 para monitores muy anchos.
        const newScale = Math.min(width / 1440, 1);
        setDesktopScale(newScale);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [subiendoBanner, setSubiendoBanner] = useState(false);
  const [subiendoSeoImagen, setSubiendoSeoImagen] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [confirmDespublicar, setConfirmDespublicar] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(false);

  // Estados para ocultar sidebars
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Tabs Inicio/Catálogo/Contacto — independiente de `cargar()` (esa carga
  // SOLO la página actual por :id) porque necesitamos la lista de las 3
  // para poder saltar de una a otra sin ir y volver a MiLandingEntry.
  const [paginas, setPaginas] = useState([]);
  useEffect(() => {
    if (esModoProducto) return; // no hay tabs de página en modo producto
    let activo = true;
    landingService.paginas()
      .then(p => { if (activo) setPaginas(p); })
      .catch(() => {}); // no crítico: si falla, simplemente no se ven los tabs
    return () => { activo = false; };
  }, [id, esModoProducto]);

  function cambiarPagina(paginaId) {
    if (String(paginaId) === String(id)) return;
    if (sucio && !window.confirm('Tenés cambios sin guardar en esta página. ¿Salir igual?')) return;
    navigate(`/mi-landing/${paginaId}`);
  }

  // Clic directo sobre un producto en la preview (sección "Productos"/
  // "Destacados") → va a SU diseño propio, donde viven las tarjetas de
  // precio y el order bump (ver ProductDetailInspector.jsx). No hace
  // falta pasar por Productos → editar → Diseño de página.
  function irAEditarProducto(productoId) {
    if (!productoId) return;
    if (sucio && !window.confirm('Tenés cambios sin guardar en esta página. ¿Salir igual?')) return;
    navigate(`/mi-landing/producto/${productoId}`);
  }

  const actualizarPrecioCatalogo = useCallback((tipo, itemId, precio) => {
    const campo = tipo === 'combo' ? 'combos' : 'productos';
    setCatalogo(prev => ({
      ...prev,
      [campo]: (prev?.[campo] || []).map(item =>
        String(item.id) === String(itemId)
          ? { ...item, precio_usuario: precio, precio_efectivo: precio }
          : item
      ),
    }));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [datosCatalogo, datosTienda] = await Promise.all([
        vitrinaService.catalogo(),
        tiendaService.obtener(),
      ]);
      setTienda(datosTienda);

      if (esModoProducto) {
        let seccionesInicioParaProducto = [];
        // El producto editado va primero en itemsPreview: es lo que usa
        // LandingPreview.jsx como mockItem del bloque product_detail
        // cuando no hay uno seleccionado explícitamente (ver
        // renderContextValue ahí) — así la vista previa muestra ESTE
        // producto, no uno cualquiera del catálogo.
        const productos = [...(datosCatalogo.productos || [])];
        const idx = productos.findIndex(p => String(p.id) === String(productoId));
        if (idx >= 0) {
          if (idx > 0) productos.unshift(productos.splice(idx, 1)[0]);
        } else if (productoId) {
          try {
            const pActual = await productService.obtener(productoId);
            productos.unshift(pActual);
          } catch (err) {
            console.error('Error al obtener el producto editado', err);
          }
        }
        setCatalogo({ ...datosCatalogo, productos });

        // Tema completo de Inicio (no solo color_primario/secundario de
        // Tienda) — mismo criterio que Catálogo/Contacto (ver
        // asegurarPaginasFijas en el backend): la vista previa de esta
        // página tiene que verse igual que el resto del sitio, no con los
        // defaults del formulario vacío.
        try {
          const paginasSitio = await landingService.paginas();
          const inicio = paginasSitio.find(p => p.tipo_pagina === 'inicio');
          if (inicio) {
            setInicioLandingId(inicio.id);
            const detalleInicio = await landingService.obtener(inicio.id);
            seccionesInicioParaProducto = (detalleInicio.secciones || [])
              .filter(s => !s.page_type || s.page_type === 'landing')
              .sort((a, b) => a.orden - b.orden)
              .map((s, idx2) => BlockRegistry.migrate({
                id: String(s.id || `loaded-inicio-${s.tipo}-${idx2}`),
                stable_id: s.stable_id,
                tipo: s.tipo,
                schema_version: s.schema_version,
                nombre_interno: s.nombre_interno || s.tipo,
                activo: s.activo !== false,
                orden: idx2,
                config: s.config || s.config_json || {},
                contenido: s.contenido || s.contenido_json || {},
              }));
            setForm(prev => ({
              ...prev,
              tema_modo: detalleInicio.tema_modo || prev.tema_modo,
              color_primario: detalleInicio.color_primario || '',
              color_fondo: detalleInicio.color_fondo || '',
              color_texto: detalleInicio.color_texto || '',
              color_tarjeta: detalleInicio.color_tarjeta || '',
              radio_bordes: detalleInicio.radio_bordes || prev.radio_bordes,
              fuente: detalleInicio.fuente || prev.fuente,
              typography: detalleInicio.typography || prev.typography,
            }));
          }
        } catch { /* no crítico: la preview cae a los defaults del form */ }

        const guardadas = await landingService.obtenerSeccionesProducto(productoId);
        const secciones = completarSeccionesProducto(guardadas.length > 0
          ? guardadas.sort((a, b) => a.orden - b.orden).map((s, idx2) => BlockRegistry.migrate({
              id: String(s.id || `loaded-prod-${s.tipo}-${idx2}`),
              stable_id: s.stable_id,
              tipo: s.tipo,
              schema_version: s.schema_version,
              nombre_interno: s.nombre_interno || s.tipo,
              activo: s.activo !== false,
              orden: idx2,
              config: s.config || s.config_json || {},
              contenido: s.contenido || s.contenido_json || {},
            }))
          : seccionesDefaultProducto(), seccionesInicioParaProducto);
        setDocumentModel({ pages: { landing: { sections: [] }, producto: { sections: secciones } } });
        setSucio(false);
        setCargando(false);
        return;
      }

      setCatalogo(datosCatalogo);

      if (esEdicion) {
        const guardada = await landingService.obtener(id);
        setLanding(guardada);
        setForm({
          nombre: guardada.nombre || '',
          titulo: guardada.titulo || '',
          descripcion: guardada.descripcion || '',
          mostrar_filtro_categoria: guardada.mostrar_filtro_categoria,
          mostrar_filtro_marca: guardada.mostrar_filtro_marca,
          mostrar_filtro_etiqueta: guardada.mostrar_filtro_etiqueta,
          mostrar_buscador: guardada.mostrar_buscador,
          mostrar_orden_precio: guardada.mostrar_orden_precio,
          mostrar_banner: !!guardada.mostrar_banner,
          banner_titulo: guardada.banner_titulo || '',
          banner_subtitulo: guardada.banner_subtitulo || '',
          banner_boton_texto: guardada.banner_boton_texto || '',
          banner_boton_link: guardada.banner_boton_link || '',
          tema_modo: guardada.tema_modo || 'oscuro',
          color_primario: guardada.color_primario || '',
          color_fondo: guardada.color_fondo || '',
          color_texto: guardada.color_texto || '',
          color_tarjeta: guardada.color_tarjeta || '',
          radio_bordes: guardada.radio_bordes || 'mediano',
          fuente: guardada.fuente || 'outfit',
          typography: guardada.typography || { mode: 'inherit' },
          mostrar_whatsapp: guardada.mostrar_whatsapp !== false,
          whatsapp_incluir_precio: !!guardada.whatsapp_incluir_precio,
          whatsapp_incluir_url: !!guardada.whatsapp_incluir_url,
          mostrar_testimonios: !!guardada.mostrar_testimonios,
          mostrar_faq: !!guardada.mostrar_faq,
          checkout_redirigir_whatsapp: guardada.checkout_redirigir_whatsapp !== false,
          seo_titulo: guardada.seo_titulo || '',
          seo_descripcion: guardada.seo_descripcion || '',
          seo_keywords: guardada.seo_keywords || '',
          content: guardada.content || {},
        });
        // Ya vienen ordenados por "orden" (ver include en landing.service.js
        // obtener()) — se copian los campos editables nada más, sin
        // arrastrar id/landing_id/timestamps que no hace falta mandar de
        // vuelta (armarPayload reconstruye el orden por índice).
        
        // MAPEO DE SECCIONES (CON MIGRACION DE LEGACY)
        let hasOldData = false;
        let loadedSecciones = [];
        let loadedSeccionesProducto = [];
        let seccionesInicioParaPagina = [];
        if (guardada.tipo_pagina !== 'inicio') {
          try {
            const paginasSitio = await landingService.paginas();
            const inicio = paginasSitio.find(p => p.tipo_pagina === 'inicio');
            if (inicio?.id && String(inicio.id) !== String(guardada.id)) {
              const detalleInicio = await landingService.obtener(inicio.id);
              seccionesInicioParaPagina = (detalleInicio.secciones || [])
                .filter(s => !s.page_type || s.page_type === 'landing')
                .sort((a, b) => a.orden - b.orden)
                .map((s, idx2) => BlockRegistry.migrate({
                  id: String(s.id || `loaded-inicio-${s.tipo}-${idx2}`),
                  stable_id: s.stable_id,
                  tipo: s.tipo,
                  schema_version: s.schema_version,
                  nombre_interno: s.nombre_interno || s.tipo,
                  activo: s.activo !== false,
                  orden: idx2,
                  config: s.config || s.config_json || {},
                  contenido: s.contenido || s.contenido_json || {},
                }));
            }
          } catch { /* no crítico: usa los defaults propios de la página */ }
        }
        
        if (Array.isArray(guardada.secciones) && guardada.secciones.length > 0) {
          const basePorTipo = new Map(getSeccionesBase().map(s => [s.tipo, s]));
          
          // MAPEO DE SECCIONES LANDING
          loadedSecciones = guardada.secciones
            .filter(s => !s.page_type || s.page_type === 'landing')
            .sort((a, b) => a.orden - b.orden)
            .map((s, idx) => BlockRegistry.migrate({
              ...(basePorTipo.get(s.tipo) || {}),
              id: String(s.id || `loaded-${s.tipo}-${idx}`),
              stable_id: s.stable_id,
              tipo: s.tipo,
              schema_version: s.schema_version,
              nombre_interno: s.nombre_interno || basePorTipo.get(s.tipo)?.nombre_interno || s.tipo,
              activo: s.activo !== false,
              orden: idx,
              config: s.config || s.config_json || {},
              contenido: s.contenido || s.contenido_json || {},
            }));

          // MAPEO DE SECCIONES PRODUCTO
          const prodSecs = guardada.secciones.filter(s => s.page_type === 'product');
          if (prodSecs.length > 0) {
            loadedSeccionesProducto = prodSecs
              .sort((a, b) => a.orden - b.orden)
              .map((s, idx) => BlockRegistry.migrate({
                ...(basePorTipo.get(s.tipo) || {}),
                id: String(s.id || `loaded-prod-${s.tipo}-${idx}`),
                stable_id: s.stable_id,
                tipo: s.tipo,
                schema_version: s.schema_version,
                nombre_interno: s.nombre_interno || basePorTipo.get(s.tipo)?.nombre_interno || s.tipo,
                activo: s.activo !== false,
                orden: idx,
                config: s.config || s.config_json || {},
                contenido: s.contenido || s.contenido_json || {},
              }));
          }
        } 
        
        if (loadedSecciones.length === 0) {
          loadedSecciones = seccionesDefaultPorRol(guardada.tipo_pagina).map((s, idx) => ({ ...s, id: `base-${s.tipo}-${idx}`, orden: idx }));
        }
        loadedSecciones = completarSeccionesPagina(guardada.tipo_pagina, loadedSecciones, seccionesInicioParaPagina);

        loadedSeccionesProducto = completarSeccionesProducto(loadedSeccionesProducto, loadedSecciones);

        // MIGRACION: Si existen testimonios sueltos, inyectarlos en la sección testimonios
        if (guardada.testimonios && guardada.testimonios.length > 0) {
           const sec = loadedSecciones.find(s => s.tipo === 'testimonios');
           if (sec) { sec.contenido = { ...sec.contenido, items: guardada.testimonios.map(t => ({
              nombre: t.nombre, foto: t.foto || null, calificacion: t.calificacion, comentario: t.comentario
           })) }; }
        }
        
        // MIGRACION: Si existen faqs sueltas, inyectarlas en la sección faq
        if (guardada.faq && guardada.faq.length > 0) {
           const sec = loadedSecciones.find(s => s.tipo === 'faq');
           if (sec) { sec.contenido = { ...sec.contenido, items: guardada.faq.map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta })) }; }
        }

        // Guardamos las secciones procesadas en el modelo de documento
        
        // MIGRACION: Inyectar productos en la seccion productos
        const clavesCatalogo = new Set([
          ...(datosCatalogo.productos || []).map(p => claveItem('producto', p.id)),
          ...(datosCatalogo.combos || []).map(c => claveItem('combo', c.id)),
        ]);

        const mapa = new Map();
        let descartados = 0;
        [...(guardada.items || [])]
          .sort((a, b) => a.orden - b.orden)
          .forEach(item => {
            const clave = claveItem(item.tipo, item.referencia_id);
            if (!clavesCatalogo.has(clave)) { descartados++; return; }
            mapa.set(clave, {
              tipo: item.tipo,
              id: item.referencia_id,
              referencia_id: item.referencia_id,
              etiqueta: item.etiqueta || '',
              precio_ancla: item.precio_ancla ?? null,
              envio_incluido: item.envio_incluido === true,
              mostrar_en_inicio: item.mostrar_en_inicio !== false,
            });
          });
        setSeleccion(mapa);

        if (mapa.size > 0) {
           loadedSecciones = loadedSecciones.map(sec => {
              if (sec.tipo === 'productos') {
                 const actuales = sec.contenido?.productos || [];
                 const productos = actuales.length > 0
                   ? actuales.map(p => {
                     const itemId = p.id || p.referencia_id;
                     const guardado = mapa.get(claveItem(p.tipo, itemId));
                     return {
                       ...p,
                       id: itemId,
                       referencia_id: itemId,
                       etiqueta: p.etiqueta ?? guardado?.etiqueta ?? '',
                       precio_ancla: p.precio_ancla ?? guardado?.precio_ancla ?? null,
                       envio_incluido: p.envio_incluido ?? guardado?.envio_incluido ?? false,
                       mostrar_en_inicio: p.mostrar_en_inicio ?? guardado?.mostrar_en_inicio ?? true,
                     };
                   })
                   : Array.from(mapa.values()).map(m => ({
                     tipo: m.tipo,
                     id: m.id,
                     referencia_id: m.id,
                     etiqueta: m.etiqueta,
                     precio_ancla: m.precio_ancla,
                     envio_incluido: m.envio_incluido === true,
                     mostrar_en_inicio: m.mostrar_en_inicio !== false,
                   }));
                 return { 
                   ...sec, 
                   contenido: { ...sec.contenido, productos } 
                 };
              }
              return sec;
           });
        }
        
        setDocumentModel({
          pages: {
            landing: { sections: loadedSecciones },
            producto: { sections: loadedSeccionesProducto }
          }
        });


        // sucio=true a propósito cuando hubo descarte: lo que quedó en
        // memoria ya no coincide con lo guardado en la base (que todavía
        // tiene esas filas huérfanas) hasta el próximo Guardar — el badge
        // "Cambios sin guardar" no es un falso positivo acá, es exacto.
        // Siempre se llama a setSucio acá (nunca condicionalmente omitido):
        // si el usuario navega de una landing con cambios pendientes a otra
        // (mismo componente, cambia solo el :id de la ruta), sucio=true de
        // la anterior no debe quedar pegado en la que recién carga.
        if (descartados > 0) {
          setExito(
            descartados === 1
              ? 'Se quitó 1 producto que ya no está en tu catálogo (dado de baja o sin stock).'
              : `Se quitaron ${descartados} productos que ya no están en tu catálogo (dados de baja o sin stock).`
          );
        }
        setSucio(descartados > 0);
      } else {
        setSucio(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la información.');
    } finally {
      setCargando(false);
    }
  }, [id, esEdicion, esModoProducto, productoId]);

  useEffect(() => { cargar(); }, [cargar]);

  /**
   * Aplica la plantilla elegida en la galería inicial (solo al crear, ver
   * el gate de render más abajo): reemplaza `secciones` por las del
   * preset, aplica su `tema` sobre el form, y precarga testimonios/faq
   * planos — LandingPreview.jsx todavía los lee de ahí, no de
   * seccion.contenido.items (ver landingTemplates.js).
   */
  function handleElegirPlantilla(template) {
    setSecciones(template.secciones.map((s, idx) => ({ ...s, id: `tpl-${s.tipo}-${idx}`, orden: idx })));
    if (template.tema && Object.keys(template.tema).length > 0) {
      setForm(prev => ({
        ...prev,
        ...template.tema,
        mostrar_testimonios: (template.testimonios?.length > 0) || prev.mostrar_testimonios,
        mostrar_faq: (template.faqs?.length > 0) || prev.mostrar_faq,
      }));
    }
    if (template.testimonios?.length > 0) setTestimonios(template.testimonios);
    if (template.faqs?.length > 0) setFaqs(template.faqs);
    setPlantillaElegida(template.id);
  }

  /**
   * El aviso de guardado se borra solo: es una confirmación, no un estado.
   * Si quedara fijo, al rato dejaría de estar claro si corresponde al último
   * guardado o a uno de hace diez minutos. Los errores NO se autodescartan
   * — esos hay que leerlos y resolverlos.
   */
  useEffect(() => {
    if (!exito) return;
    const t = setTimeout(() => setExito(null), 4000);
    return () => clearTimeout(t);
  }, [exito]);

  /* ─── Derivados ──────────────────────────────────────────────────────── */

  const catalogoPorClave = useMemo(() => {
    const mapa = new Map();
    (catalogo.productos || []).forEach(p => mapa.set(claveItem('producto', p.id), { ...p, tipo: 'producto' }));
    (catalogo.combos || []).forEach(c => mapa.set(claveItem('combo', c.id), { ...c, tipo: 'combo' }));
    return mapa;
  }, [catalogo]);

  /**
   * El orden de inserción del Map ES el orden de aparición en la tienda:
   * reordenar reconstruye el Map, y al guardar se numera por índice.
   *
   * Un item puede haber salido del catálogo (dado de baja o fuera de venta)
   * desde que se agregó. No se descarta en silencio — se marca no_disponible
   * para que la usuaria decida, igual que hace la landing pública, que
   * simplemente lo omite al renderizar.
   */
  const itemsOrdenados = useMemo(() => {
    const productosSeleccionados = secciones.find(s => s.tipo === 'productos')?.contenido?.productos || [];
    return productosSeleccionados.map(sel => {
      const clave = claveItem(sel.tipo, sel.id || sel.referencia_id);
      const base = catalogoPorClave.get(clave);
      if (!base) {
        return {
          id: sel.id || sel.referencia_id,
          tipo: sel.tipo,
          nombre: `${sel.tipo === 'combo' ? 'Combo' : 'Producto'} #${sel.id || sel.referencia_id} — ya no está disponible`,
          etiqueta: sel.etiqueta,
          precio_ancla: sel.precio_ancla ?? null,
          envio_incluido: sel.envio_incluido === true,
          mostrar_en_inicio: sel.mostrar_en_inicio !== false,
          precio_efectivo: null,
          no_disponible: true,
        };
      }
      return {
        ...base,
        etiqueta: sel.etiqueta,
        precio_ancla: sel.precio_ancla ?? null,
        envio_incluido: sel.envio_incluido === true,
        mostrar_en_inicio: sel.mostrar_en_inicio !== false,
      };
    });
  }, [secciones, catalogoPorClave]);

  const itemsPreview = useMemo(() => itemsOrdenados.filter(i => !i.no_disponible || (esModoProducto && String(i.id) === String(productoId))), [itemsOrdenados, esModoProducto, productoId]);
  const hayNoDisponibles = itemsOrdenados.length !== itemsPreview.length;

  // La raíz del hostname sirve SIEMPRE la página con es_home=true (ver
  // LandingService.obtenerPublica: `if (slug) where.slug = slug; else
  // where.es_home = true`). Como la tienda ya no tiene una sola landing sino
  // tres páginas fijas (inicio/catalogo/contacto, ver asegurarPaginasFijas),
  // apuntar siempre a la raíz hacía que al editar Catálogo o Contacto el
  // link llevara a Inicio — parecía que lo guardado "era cualquier otra
  // cosa". Solo la home va sin slug; el resto por /l/<slug>.
  //
  // Para la home se mantiene la raíz pelada a propósito, SIN "/l": Nginx
  // decide bot-vs-humano sobre "/" en el vhost de tiendas (ver
  // deploy/nginx/tiendas.gesicomm.com y routes/landingHtml.js), así que la
  // URL que se muestra acá tiene que ser la misma que la real.
  const urlPublica = useMemo(() => {
    if (!tienda) return null;
    const base = `https://${tienda.subdominio}.gesicomm.com`;
    const esHome = landing ? (landing.es_home ?? landing.tipo_pagina === 'inicio') : true;
    const slug = landing?.slug || form.slug;
    return esHome || !slug ? base : `${base}/l/${slug}`;
  }, [tienda, landing?.es_home, landing?.tipo_pagina, landing?.slug, form.slug]);

  const publicada = !!landing?.activo;
  const bannerTieneContenido = !!(form.banner_titulo.trim() || landing?.banner_imagen);
  const bannerLinkOk = linkBannerValido(form.banner_boton_link);
  // "claro" nunca hereda el fondo oscuro pensado para modo oscuro — mismo
  // fallback que aplica el backend en obtenerPublica().
  const fondoHeredado = form.tema_modo === 'claro' ? '#f8fafc' : (tienda?.color_fondo || '#0a0a0a');

  /* ─── Mutadores ──────────────────────────────────────────────────────── */

  /**
   * `error`/`erroresValidacion` solo se tocan dentro de guardar() — nada
   * más los limpia. Sin esto, el mensaje de un intento de guardado fallido
   * ("El producto #6 no existe...") queda pegado en pantalla pase lo que
   * pase después: seguís tocando el picker, el error sigue ahí, y da la
   * impresión de que CUALQUIER cambio lo vuelve a disparar — no es así, es
   * el mismo mensaje viejo sin borrar. Cada mutador lo descarta al primer
   * cambio, para que el usuario sepa que ese error ya no aplica al estado
   * actual (se vuelve a mostrar de cero si el próximo guardado falla).
   */
  function limpiarErrorPrevio() {
    setError(null);
    setErroresValidacion([]);
  }

  function handleChange(campo, valor) {
    limpiarErrorPrevio();
    setForm(prev => ({ ...prev, [campo]: valor }));
    setSucio(true);
  }

  function toggleItem(item) {
    limpiarErrorPrevio();
    const clave = claveItem(item.tipo, item.id);
    setSeleccion(prev => {
      const copia = new Map(prev);
      if (copia.has(clave)) {
        copia.delete(clave);
      } else {
        if (copia.size >= MAX_ITEMS) return prev;
        copia.set(clave, { tipo: item.tipo, referencia_id: item.id, etiqueta: '' });
      }
      return copia;
    });
    setSucio(true);
  }

  function actualizarEtiqueta(item, etiqueta) {
    limpiarErrorPrevio();
    const clave = claveItem(item.tipo, item.id);
    setSeleccion(prev => {
      if (!prev.has(clave)) return prev;
      const copia = new Map(prev);
      copia.set(clave, { ...copia.get(clave), etiqueta });
      return copia;
    });
    setSucio(true);
  }

  /**
   * Un producto o combo puede darse de baja (o quedar sin stock/estado
   * "en_venta") después de agregarse a la landing — sigue en `seleccion`
   * pero ya no está en `catalogo` (ver itemsOrdenados: se marca
   * no_disponible). armarPayload() manda `seleccion` tal cual al guardar, y
   * el backend rechaza la landing ENTERA si cualquier item referencia un
   * producto que no está activo (LandingService.resolverItemsCatalogo) — no
   * hay guardado parcial. Este botón es la salida: saca de una sola vez
   * todo lo que ya no es válido, sin tocar el resto de la selección.
   */
  function quitarNoDisponibles() {
    limpiarErrorPrevio();
    const claves = new Set(itemsOrdenados.filter(i => i.no_disponible).map(i => claveItem(i.tipo, i.id)));
    if (!claves.size) return;
    setSecciones(prev => prev.map(sec => {
      if (sec.tipo !== 'productos') return sec;
      const productos = (sec.contenido?.productos || []).filter(p => !claves.has(claveItem(p.tipo, p.id || p.referencia_id)));
      return { ...sec, contenido: { ...sec.contenido, productos } };
    }));
    setSucio(true);
  }

  function reordenar(desde, hasta) {
    limpiarErrorPrevio();
    setSeleccion(prev => {
      const entradas = Array.from(prev.entries());
      const [movida] = entradas.splice(desde, 1);
      entradas.splice(hasta, 0, movida);
      return new Map(entradas);
    });
    setSucio(true);
  }

  /* ─── Testimonios y FAQ ──────────────────────────────────────────────────
     Listas planas en useState (este archivo no usa react-hook-form en
     ningún lado, así que no se introduce acá solo para esto) con flechas
     arriba/abajo en vez de arrastrar — más simple que ListaOrden de
     ProductPicker.jsx, que es lo que pidió explícitamente el alcance. */
  function agregarTestimonio() {
    limpiarErrorPrevio();
    setTestimonios(prev => [...prev, { nombre: '', foto: null, calificacion: 5, comentario: '' }]);
    setSucio(true);
  }
  function actualizarTestimonio(idx, campo, valor) {
    limpiarErrorPrevio();
    setTestimonios(prev => prev.map((t, i) => (i === idx ? { ...t, [campo]: valor } : t)));
    setSucio(true);
  }
  function quitarTestimonio(idx) {
    limpiarErrorPrevio();
    setTestimonios(prev => prev.filter((_, i) => i !== idx));
    setSucio(true);
  }
  function moverTestimonio(idx, delta) {
    const destino = idx + delta;
    if (destino < 0 || destino >= testimonios.length) return;
    limpiarErrorPrevio();
    setTestimonios(prev => {
      const copia = [...prev];
      [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
      return copia;
    });
    setSucio(true);
  }

  /**
   * Mismo criterio que handleBannerFile: si todavía no hay landing
   * guardada, guarda primero para tener un id contra el cual subir. A
   * diferencia del banner, la respuesta es solo { url } — no hay fila con
   * id estable a la que colgarle la imagen (ver sincronizarTestimonios en
   * el backend, destroy-all + bulkCreate en cada guardado) — la URL se
   * pega directo en el campo "foto" de la fila que se está editando.
   */
  async function handleTestimonioFoto(idx, file) {
    if (!file) return;

    let idActual = id || landing?.id;
    if (!idActual) {
      const guardada = await guardar();
      if (!guardada) return;
      idActual = guardada.id;
      if (!esEdicion) navigate(`/mi-landing/${guardada.id}`, { replace: true });
    }

    setSubiendoFotoTestimonio(idx);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const { url } = await landingService.subirTestimonioFoto(idActual, fd);
      actualizarTestimonio(idx, 'foto', url);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir la foto del testimonio.');
    } finally {
      setSubiendoFotoTestimonio(null);
    }
  }

  /**
   * Sube la imagen de un campo `type: 'image'` de cualquier sección (ej.
   * el fondo del bloque "banner" del constructor) y devuelve la URL —
   * mismo criterio que handleTestimonioFoto, pero sin pegarla en ningún
   * campo puntual: es SchemaInspector quien decide en qué campo va,
   * porque este handler no sabe qué sección ni qué key está editando.
   * Lanza en vez de usar el `error` global: es un control inline dentro
   * del inspector, no una acción de toda la pantalla.
   * @returns {Promise<string>} la URL de la imagen subida
   */
  async function handleUploadSeccionImagen(file) {
    if (!file) throw new Error('No se seleccionó ningún archivo.');

    if (esModoProducto) {
      if (!inicioLandingId) throw new Error('Todavía se está cargando la tienda — probá de nuevo en un segundo.');
      const fd = new FormData();
      fd.append('imagen', file);
      const { url } = await landingService.subirImagenSeccion(inicioLandingId, fd);
      return url;
    }

    let idActual = id || landing?.id;
    if (!idActual) {
      const guardada = await guardar();
      if (!guardada) throw new Error('Guardá la landing antes de subir imágenes.');
      idActual = guardada.id;
      if (!esEdicion) navigate(`/mi-landing/${guardada.id}`, { replace: true });
    }

    const fd = new FormData();
    fd.append('imagen', file);
    const { url } = await landingService.subirImagenSeccion(idActual, fd);
    return url;
  }

  function agregarFaq() {
    limpiarErrorPrevio();
    setFaqs(prev => [...prev, { pregunta: '', respuesta: '' }]);
    setSucio(true);
  }
  function actualizarFaq(idx, campo, valor) {
    limpiarErrorPrevio();
    setFaqs(prev => prev.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)));
    setSucio(true);
  }
  function quitarFaq(idx) {
    limpiarErrorPrevio();
    setFaqs(prev => prev.filter((_, i) => i !== idx));
    setSucio(true);
  }
  function moverFaq(idx, delta) {
    const destino = idx + delta;
    if (destino < 0 || destino >= faqs.length) return;
    limpiarErrorPrevio();
    setFaqs(prev => {
      const copia = [...prev];
      [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
      return copia;
    });
    setSucio(true);
  }

  /**
   * El banner cuelga de un id de landing (igual que las fotos de producto):
   * si todavía no se guardó nada, guarda primero. En creación, eso deja la
   * URL en /editar — mismo comportamiento que ya tiene handleGuardar().
   */
  async function handleBannerFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    let idActual = id || landing?.id;
    if (!idActual) {
      const guardada = await guardar();
      if (!guardada) return;
      idActual = guardada.id;
      if (!esEdicion) navigate(`/mi-landing/${guardada.id}`, { replace: true });
    }

    setSubiendoBanner(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const actualizada = await landingService.subirBanner(idActual, fd);
      setLanding(actualizada);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir la imagen del banner.');
    } finally {
      setSubiendoBanner(false);
    }
  }

  async function quitarBannerImagen() {
    if (!landing?.id) return;
    setSubiendoBanner(true);
    setError(null);
    try {
      const actualizada = await landingService.eliminarBanner(landing.id);
      setLanding(actualizada);
    } catch (err) {
      setError('No se pudo quitar la imagen del banner.');
    } finally {
      setSubiendoBanner(false);
    }
  }

  /** Mismo criterio que handleBannerFile: la imagen OG cuelga de un id ya guardado. */
  async function handleSeoImagenFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    let idActual = id || landing?.id;
    if (!idActual) {
      const guardada = await guardar();
      if (!guardada) return;
      idActual = guardada.id;
      if (!esEdicion) navigate(`/mi-landing/${guardada.id}`, { replace: true });
    }

    setSubiendoSeoImagen(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const actualizada = await landingService.subirSeoImagen(idActual, fd);
      setLanding(actualizada);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir la imagen para compartir.');
    } finally {
      setSubiendoSeoImagen(false);
    }
  }

  async function quitarSeoImagen() {
    if (!landing?.id) return;
    setSubiendoSeoImagen(true);
    setError(null);
    try {
      const actualizada = await landingService.eliminarSeoImagen(landing.id);
      setLanding(actualizada);
    } catch (err) {
      setError('No se pudo quitar la imagen.');
    } finally {
      setSubiendoSeoImagen(false);
    }
  }

  /* ─── Guardar / publicar ─────────────────────────────────────────────── */

  function armarPayload() {
    return {
      ...form,
      // Al crear, el backend usa el nombre si no hay título; al actualizar,
      // un título vacío se guarda como null y la landing pública queda sin
      // encabezado. Se resuelve acá para que ambos caminos coincidan con
      // lo que muestra la vista previa.
      titulo: form.titulo.trim() || form.nombre.trim(),
      items: (secciones.find(s => s.tipo === 'productos')?.contenido?.productos || []).map((item, idx) => ({ 
        tipo: item.tipo, 
        referencia_id: item.id || item.referencia_id, 
        etiqueta: item.etiqueta || '', 
        precio_ancla: item.precio_ancla != null && item.precio_ancla !== '' ? Number(item.precio_ancla) : null,
        envio_incluido: item.envio_incluido === true,
        mostrar_en_inicio: item.mostrar_en_inicio !== false,
        orden: idx 
      })),
      testimonios: (secciones.find(s => s.tipo === 'testimonios')?.contenido?.items || []).map((t, idx) => ({
        nombre: t.nombre.trim(),
        foto: t.foto || null,
        calificacion: Number(t.calificacion),
        comentario: t.comentario.trim(),
        orden: idx,
      })),
      faq: (secciones.find(s => s.tipo === 'faq')?.contenido?.items || []).map((f, idx) => ({ 
        pregunta: f.pregunta.trim(), 
        respuesta: f.respuesta.trim(), 
        orden: idx 
      })),
      secciones: [
        ...documentModel.pages.landing.sections.map((s, idx) => ({
          stable_id: s.stable_id,
          page_type: 'landing',
          tipo: s.tipo,
          schema_version: s.schema_version,
          nombre_interno: s.nombre_interno,
          activo: s.activo !== false,
          orden: idx,
          template: s.template,
          config: s.config || {},
          contenido: s.contenido || {},
        })),
        ...documentModel.pages.producto.sections.map((s, idx) => ({
          stable_id: s.stable_id,
          page_type: 'product',
          tipo: s.tipo,
          schema_version: s.schema_version,
          nombre_interno: s.nombre_interno,
          activo: s.activo !== false,
          orden: idx,
          template: s.template,
          config: s.config || {},
          contenido: s.contenido || {},
        }))
      ],
      secciones_producto: [] // Enviamos vacío para evitar que si algo lo lee devuelva un error, pero va todo en 'secciones'
    };
  }

  /** @returns {object|null} la landing guardada, o null si falló. */
  async function guardar() {
    setError(null);
    setExito(null);
    setErroresValidacion([]);

    if (esModoProducto) {
      setGuardando(true);
      try {
        const payload = documentModel.pages.producto.sections.map((s, idx) => ({
          stable_id: s.stable_id,
          tipo: s.tipo,
          schema_version: s.schema_version,
          nombre_interno: s.nombre_interno,
          activo: s.activo !== false,
          orden: idx,
          template: s.template,
          config: s.config || {},
          contenido: s.contenido || {},
        }));
        const guardadas = await landingService.guardarSeccionesProducto(productoId, payload);
        setDocumentModel(prev => ({
          ...prev,
          pages: {
            ...prev.pages,
            producto: {
              sections: guardadas.sort((a, b) => a.orden - b.orden).map((s, idx) => {
                const existing = prev.pages.producto.sections.find(es => es.stable_id === s.stable_id || (es.id && !es.stable_id && es.tipo === s.tipo && es.orden === idx));
                return BlockRegistry.migrate({
                  id: existing ? existing.id : String(`loaded-prod-${s.tipo}-${idx}`),
                  stable_id: s.stable_id,
                  tipo: s.tipo,
                  schema_version: s.schema_version,
                  nombre_interno: s.nombre_interno || s.tipo,
                  activo: s.activo !== false,
                  orden: idx,
                  config: s.config || s.config_json || {},
                  contenido: s.contenido || s.contenido_json || {},
                });
              }),
            },
          },
        }));
        setSucio(false);
        setExito('Cambios guardados.');
      } catch (err) {
        setError(err.response?.data?.message || 'Error al guardar el diseño del producto.');
      } finally {
        setGuardando(false);
      }
      return;
    }

    if (!form.nombre.trim()) {
      setError('Poné un nombre interno para poder guardar.');
      return null;
    }
    // Las páginas informativas fijas no tienen catálogo propio.
    if (itemsOrdenados.length === 0 && !TIPOS_SIN_CATALOGO.has(landing?.tipo_pagina)) {
      setError('Elegí al menos un producto o combo para la landing.');
      return null;
    }
    if (!bannerLinkOk) {
      setError('El link del botón del banner no es válido.');
      return null;
    }

    setGuardando(true);
    try {
      // No alcanza con `esEdicion`: si el usuario crea la landing y algo
      // falla después (ej. al publicar), sigue en la ruta /nuevo con una
      // landing ya creada. Sin mirar landing.id, el próximo guardado
      // crearía un duplicado.
      const idActual = id || landing?.id;
      const guardada = idActual
        ? await landingService.actualizar(idActual, armarPayload())
        : await landingService.crear(armarPayload());
        
      setLanding(guardada);
      
      // SINCRONIZAR SECCIONES CON STABLE_IDs DEL BACKEND
      if (Array.isArray(guardada.secciones) && guardada.secciones.length > 0) {
        setDocumentModel(prev => {
          const basePorTipo = new Map(getSeccionesBase().map(s => [s.tipo, s]));
          
          // Actualizamos landing
          const landingSecs = guardada.secciones.filter(s => !s.page_type || s.page_type === 'landing').sort((a, b) => a.orden - b.orden);
          const newLanding = landingSecs.length > 0 ? landingSecs.map((s, idx) => {
             // Preservar la clave temporal 'id' si la teníamos, o generar una.
             const existing = prev.pages.landing.sections.find(es => es.stable_id === s.stable_id || (es.id && !es.stable_id && es.tipo === s.tipo && es.orden === idx));
             return BlockRegistry.migrate({
               ...(basePorTipo.get(s.tipo) || {}),
               id: existing ? existing.id : String(`loaded-${s.tipo}-${idx}`),
               stable_id: s.stable_id,
               tipo: s.tipo,
               schema_version: s.schema_version,
               nombre_interno: s.nombre_interno || basePorTipo.get(s.tipo)?.nombre_interno || s.tipo,
               activo: s.activo !== false,
               orden: idx,
               config: s.config || s.config_json || {},
               contenido: s.contenido || s.contenido_json || {},
             });
          }) : prev.pages.landing.sections;
          
          // Actualizamos product
          const prodSecs = guardada.secciones.filter(s => s.page_type === 'product').sort((a, b) => a.orden - b.orden);
          const newProduct = prodSecs.length > 0 ? prodSecs.map((s, idx) => {
             const existing = prev.pages.producto.sections.find(es => es.stable_id === s.stable_id || (es.id && !es.stable_id && es.tipo === s.tipo && es.orden === idx));
             return BlockRegistry.migrate({
               ...(basePorTipo.get(s.tipo) || {}),
               id: existing ? existing.id : String(`loaded-prod-${s.tipo}-${idx}`),
               stable_id: s.stable_id,
               tipo: s.tipo,
               schema_version: s.schema_version,
               nombre_interno: s.nombre_interno || basePorTipo.get(s.tipo)?.nombre_interno || s.tipo,
               activo: s.activo !== false,
               orden: idx,
               config: s.config || s.config_json || {},
               contenido: s.contenido || s.contenido_json || {},
             });
          }) : prev.pages.producto.sections;
          
          return {
            ...prev,
            pages: {
              landing: { sections: newLanding },
              producto: { sections: newProduct }
            }
          };
        });
      }

      setForm(prev => ({ ...prev, slug: guardada.slug || prev.slug }));
      setSucio(false);
      setExito('Cambios guardados.');
      return guardada;
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la landing.');
      setErroresValidacion(err.response?.data?.errores || []);
      return null;
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardar() {
    const guardada = await guardar();
    // Al crear se sigue en el constructor (misma landing, ahora con id):
    // así se puede publicar sin volver al listado.
    if (guardada && !esEdicion) navigate(`/mi-landing/${guardada.id}`, { replace: true });
  }

  async function togglePublicar() {
    let actual = landing;
    if (sucio || !esEdicion) {
      actual = await guardar();
      if (!actual) return;
    }

    const nuevoEstado = !actual.activo;
    if (!nuevoEstado) {
      setConfirmDespublicar(actual);
      return;
    }
    await ejecutarCambioEstado(actual, nuevoEstado);
  }

  async function ejecutarCambioEstado(actual, nuevoEstado) {
    setPublicando(true);
    try {
      const actualizada = await landingService.cambiarEstado(actual.id, nuevoEstado);
      setLanding(prev => ({ ...prev, ...actualizada }));
      setExito(nuevoEstado ? 'Landing publicada.' : 'Landing despublicada.');
      if (!esEdicion) navigate(`/mi-landing/${actual.id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar el estado.');
    } finally {
      setPublicando(false);
    }
  }

  async function confirmarDespublicar() {
    const actual = confirmDespublicar;
    setConfirmDespublicar(null);
    if (actual) await ejecutarCambioEstado(actual, false);
  }

  function eliminarLanding() {
    if (!landing?.id) return;
    setConfirmEliminar(true);
  }

  async function confirmarEliminarLanding() {
    setConfirmEliminar(false);
    setGuardando(true);
    setError(null);
    try {
      await landingService.eliminar(landing.id);
      navigate('/mi-landing', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar la landing.');
      setGuardando(false);
    }
  }

  function copiarLink() {
    if (!urlPublica) return;
    navigator.clipboard.writeText(urlPublica).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */

  // Solo al crear una landing nueva: la galería no depende del catálogo,
  // así que se muestra aunque `cargar()` siga trayendo catalogo/tienda en
  // paralelo — no bloquea nada, la próxima pantalla ya los va a tener.
  if (!esEdicion && !esModoProducto && !plantillaElegida) {
    return <LandingTemplatePicker onSelect={handleElegirPlantilla} />;
  }

  if (cargando) {
    return (
      <div className="vit-page">
        <div className="vit-empty"><Loader size={22} className="spin-icon" /><p>Cargando el constructor...</p></div>
      </div>
    );
  }

  const ocupado = guardando || publicando;
  const seccionEditando = seccionSeleccionadaId ? secciones.find(s => s.id === seccionSeleccionadaId) : null;

  return (
    <div className="lb-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Top Toolbar ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: '64px', borderBottom: '1px solid var(--vit-border)', background: 'var(--vit-card-bg)', flexShrink: 0, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
          {esModoProducto ? (
            <Link to="/products" className="lb-btn-ghost" style={{ padding: '0.4rem', color: 'var(--vit-text)' }}>
              &larr; Volver a productos
            </Link>
          ) : !esEdicion ? (
            <button type="button" onClick={() => window.location.reload()} className="lb-btn-ghost" style={{ padding: '0.4rem', color: 'var(--vit-text)' }}>
              &larr; Volver a plantillas
            </button>
          ) : (
            <Link to="/mi-landing" className="lb-btn-ghost" style={{ padding: '0.4rem', color: 'var(--vit-text)' }}>
              &larr; Volver
            </Link>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--vit-text)' }}>
              {esModoProducto
                ? `Diseño propio — ${catalogo.productos.find(p => String(p.id) === String(productoId))?.nombre || 'Producto'}`
                : (form.nombre || 'Mi landing')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--vit-muted)' }}>
              {!esModoProducto && (
                <span className={`lb-estado ${publicada ? 'on' : 'off'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="lb-estado-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: publicada ? '#10b981' : '#f59e0b' }} />
                  {publicada ? 'Publicada' : 'Borrador'}
                </span>
              )}
              {sucio && <span style={{ color: '#f59e0b' }}>• Cambios sin guardar</span>}
            </div>
          </div>
        </div>



        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {!esModoProducto && urlPublica && (
            <a href={urlPublica} target="_blank" rel="noreferrer" className="lb-btn-ghost text-sm flex items-center gap-1 font-medium" style={{ color: 'var(--vit-muted)' }}>
              Ver web <ExternalLink size={14} />
            </a>
          )}
          <button type="button" className="lb-btn-secondary text-sm px-4 py-2" onClick={handleGuardar} disabled={ocupado}>
            {guardando ? <Loader size={14} className="spin-icon" /> : <Save size={14} />} Guardar
          </button>
          {!esModoProducto && (
            <button
              type="button"
              className={publicada ? 'lb-btn-warn text-sm px-4 py-2' : 'lb-btn-primary text-sm px-4 py-2'}
              onClick={togglePublicar}
              disabled={ocupado || (itemsOrdenados.length === 0 && !TIPOS_SIN_CATALOGO.has(landing?.tipo_pagina))}
            >
              {publicando ? <Loader size={14} className="spin-icon" /> : (publicada ? <PowerOff size={14} /> : <Power size={14} />)}
              {publicada ? 'Despublicar' : 'Publicar'}
            </button>
          )}
          {!esModoProducto && (
            <button
              type="button"
              className="lb-btn-ghost text-red-500 px-3 py-2 ml-2"
              onClick={eliminarLanding}
              disabled={ocupado}
              title="Eliminar Landing"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </header>

      {paginas.length > 1 && (
        <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--vit-border)', background: 'var(--vit-card-bg)', flexShrink: 0 }}>
          {[...paginas].sort((a, b) => {
            return (ORDEN_PAGINAS_FIJAS[a.tipo_pagina] ?? 99) - (ORDEN_PAGINAS_FIJAS[b.tipo_pagina] ?? 99);
          }).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => cambiarPagina(p.id)}
              className="lb-btn-ghost"
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: String(p.id) === String(id) ? 'var(--vit-accent)' : 'var(--vit-muted)',
                background: String(p.id) === String(id) ? 'var(--vit-accent-soft)' : 'transparent',
              }}
            >
              {p.titulo || p.nombre}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="land-alert-error" role="alert" style={{ flexShrink: 0, margin: 0, borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
          <span><AlertCircle size={14} /> {error}</span>
          {erroresValidacion.length > 0 && <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>
      )}
      {/* ── Cuerpo: 3 Columnas ── */}
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* COLUMNA IZQUIERDA: Estructura */}
        {showLeftSidebar && (
        <div className="bg-[var(--vit-card-bg)] border-r border-[var(--vit-border)] flex flex-col w-[260px] flex-shrink-0 z-10 overflow-hidden">
            <SidebarSecciones 
              secciones={secciones}
              viewMode={viewMode}
              onSelect={setSeccionSeleccionadaId}
              onAddClick={() => { setAgregarAlLadoDe(null); setSelectorAbierto(true); }}
              onAddBeside={handleAgregarAlLado}
              onToggleVisible={handleToggleVisible}
              onDuplicate={handleDuplicarSeccion}
              onDelete={handleEliminarSeccion}
              onReorder={handleReordenarSeccion}
              selectedId={seccionSeleccionadaId}
            />
        </div>
        )}

        {(() => {
          const EditorContent = (
            <>
              {/* COLUMNA CENTRAL: Canvas */}
              <main className="flex-1 overflow-hidden relative flex flex-col items-center">
                 <div className="w-full grid grid-cols-3 items-center p-2 bg-[var(--vit-surface)] border-b border-[var(--vit-border)] shadow-sm z-10 px-4">
                    
                    <div className="flex justify-start">
                      <button type="button" onClick={() => setShowLeftSidebar(!showLeftSidebar)} className="mr-2 p-1.5 rounded-md text-[var(--vit-muted)] hover:text-[var(--vit-text)] hover:bg-[var(--vit-card-bg)] transition-colors">
                        <PanelLeft size={18} />
                      </button>
                      {!esModoProducto && (
                        <div className="flex items-center gap-1 bg-[var(--vit-bg)] p-1 rounded-lg border border-[var(--vit-border)]">
                          <button type="button" onClick={() => { setViewMode('landing'); setSeccionSeleccionadaId(null); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'landing' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`}>
                            Página Principal
                          </button>
                          <button type="button" onClick={() => { setViewMode('producto'); setSeccionSeleccionadaId(null); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'producto' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`}>
                            Vista de Producto
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-center">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--vit-bg)', padding: '6px', borderRadius: '10px', border: '1px solid var(--vit-border)' }}>
                        <button type="button" onClick={() => setViewportMode('desktop')} className={`px-4 py-2 flex items-center gap-2 rounded-md text-sm font-medium transition-colors ${viewportMode === 'desktop' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`} title="Desktop">
                          <Monitor size={16} /> Desktop
                        </button>
                        <button type="button" onClick={() => setViewportMode('tablet')} className={`px-4 py-2 flex items-center gap-2 rounded-md text-sm font-medium transition-colors ${viewportMode === 'tablet' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`} title="Tablet">
                          <Tablet size={16} /> Tablet
                        </button>
                        <button type="button" onClick={() => setViewportMode('mobile')} className={`px-4 py-2 flex items-center gap-2 rounded-md text-sm font-medium transition-colors ${viewportMode === 'mobile' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`} title="Mobile">
                          <Smartphone size={16} /> Mobile
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setShowRightSidebar(!showRightSidebar)} className="ml-2 p-1.5 rounded-md text-[var(--vit-muted)] hover:text-[var(--vit-text)] hover:bg-[var(--vit-card-bg)] transition-colors">
                        <PanelRight size={18} />
                      </button>
                    </div>
                 </div>
                 <div 
                   className="w-full flex-1 overflow-y-auto flex justify-center relative overflow-x-hidden"
                   style={{ backgroundColor: viewportMode === 'desktop' ? 'transparent' : 'var(--vit-bg-secondary)' }}
                 >
                   <div style={{
                      width: viewportMode === 'mobile' ? '375px' : viewportMode === 'tablet' ? '768px' : '100%',
                      height: viewportMode === 'mobile' ? '812px' : viewportMode === 'tablet' ? '1024px' : '100%',
                      minHeight: viewportMode === 'desktop' ? '100%' : 'auto',
                      backgroundColor: 'white',
                      boxShadow: viewportMode === 'desktop' ? 'none' : '0 0 40px rgba(0,0,0,0.15)',
                      transition: 'width 0.3s ease, height 0.3s ease',
                      margin: viewportMode === 'desktop' ? '0' : '2rem auto',
                      borderRadius: viewportMode === 'mobile' ? '36px' : viewportMode === 'tablet' ? '24px' : '0',
                      border: viewportMode === 'desktop' ? 'none' : '12px solid #1c2230',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                   }}>
                      <LandingPreview
                        titulo={form.titulo || form.nombre}
                        descripcion={form.descripcion}
                        filtros={{
                          categoria: form.mostrar_filtro_categoria,
                          marca: form.mostrar_filtro_marca,
                          etiqueta: form.mostrar_filtro_etiqueta,
                          buscador: form.mostrar_buscador,
                          orden_precio: form.mostrar_orden_precio,
                        }}
                        items={itemsPreview}
                        catalogo={catalogo}
                        tema={{
                          modo: form.tema_modo,
                          primario: form.color_primario || tienda?.color_primario,
                          secundario: tienda?.color_secundario,
                          fondo: form.color_fondo || fondoHeredado,
                          texto: form.color_texto || undefined,
                          tarjeta: form.color_tarjeta || undefined,
                        }}
                        diseno={{ radio_bordes: form.radio_bordes, fuente: form.fuente }}
                        typography={form.typography?.mode === 'custom' ? form.typography : (landing?.typography?.resolved || tienda?.typography)}
                        contacto={{ whatsapp: form.mostrar_whatsapp ? tienda?.whatsapp : null }}
                        logoImagen={landing?.logo_imagen || tienda?.logo_imagen}
                        banner={form.mostrar_banner && bannerTieneContenido ? {
                          imagen: landing?.banner_imagen || null,
                          titulo: form.banner_titulo,
                          subtitulo: form.banner_subtitulo,
                          boton_texto: form.banner_boton_texto,
                          boton_link: form.banner_boton_link,
                        } : null}
                        urlPublica={urlPublica}
                        secciones={secciones}
                        seccionSeleccionadaId={seccionSeleccionadaId}
                        onSelectSeccion={setSeccionSeleccionadaId}
                        mostrarTestimonios={form.mostrar_testimonios}
                        testimonios={testimonios}
                        mostrarFaq={form.mostrar_faq}
                        faqs={faqs}
                        viewportMode={viewportMode}
                        onReorderSeccion={handleMoverSeccion}
                        onDeleteSeccion={handleEliminarSeccion}
                        onDuplicateSeccion={handleDuplicarSeccion}
                        onEditarProducto={!esModoProducto ? irAEditarProducto : undefined}
                        previewCheckoutAbierto={previewCheckoutAbierto}
                        onTogglePreviewCheckout={setPreviewCheckoutAbierto}
                      />
                   </div>
                 </div>
              </main>

              {/* COLUMNA DERECHA: Inspector */}
              {showRightSidebar && (
                <aside className="bg-[var(--vit-card-bg)] border-l border-[var(--vit-border)] flex flex-col w-[320px] flex-shrink-0 z-10 overflow-hidden">
                  {seccionEditando?.tipo === 'footer' ? (
                    <FooterInspectorPanel onUploadImagen={handleUploadSeccionImagen} paginas={paginas} />
                  ) : seccionSeleccionadaId ? (
                    <InspectorSeccion
                      seccion={secciones.find(s => s.id === seccionSeleccionadaId)}
                      onUpdate={(id, updates) => handleActualizarSeccion(id, updates)}
                      onBack={() => setSeccionSeleccionadaId(null)}
                      catalogo={catalogo}
                      paginas={paginas}
                      productoId={esModoProducto ? productoId : null}
                      onSacarDeFila={handleSacarDeFila}
                      onDuplicate={handleDuplicarSeccion}
                      onDelete={handleEliminarSeccion}
                      onUploadImagen={handleUploadSeccionImagen}
                      previewCheckoutAbierto={previewCheckoutAbierto}
                      onTogglePreviewCheckout={setPreviewCheckoutAbierto}
                      onPrecioVentaGuardado={actualizarPrecioCatalogo}
                    />
                  ) : esModoProducto ? (
                    <div className="p-4 text-sm text-[var(--vit-muted)]">
                      Elegí una sección para editarla. El color, la fuente y los bordes de esta página siempre son los de tu tienda — se editan desde Mi landing, no acá.
                    </div>
                  ) : (
                    <InspectorGlobal
                      form={form}
                      onChange={handleChange}
                      typography={landing?.typography?.resolved || tienda?.typography}
                    />
                  )}
                </aside>
              )}
            </>
          );

          // El provider va SIEMPRE montado, activo o no. Antes se montaba
          // solo al editar el footer, y ese cambio de forma del árbol hacía
          // que React desmontara y volviera a montar todo EditorContent —
          // con el <iframe> de la preview adentro — así que al clickear el
          // footer la vista previa se recargaba entera y saltaba al inicio.
          return (
            <FooterProvider
              active={seccionEditando?.tipo === 'footer'}
              sectionId={seccionEditando?.tipo === 'footer' ? seccionSeleccionadaId : null}
              initialData={seccionEditando?.tipo === 'footer' ? seccionEditando.config : undefined}
              onChange={(newData) => handleActualizarSeccion(seccionSeleccionadaId, { config: newData })}
              viewportMode={viewportMode}
            >
              {EditorContent}
            </FooterProvider>
          );
        })()}


        <SelectorSecciones
            isOpen={selectorAbierto}
            onClose={() => { setSelectorAbierto(false); setAgregarAlLadoDe(null); }}
            onAdd={handleAgregarSeccion}
            seccionesActuales={secciones}
            alLadoDe={agregarAlLadoDe ? secciones.find(s => s.id === agregarAlLadoDe) : null}
        />

        {confirmDespublicar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6">
                <h3 className="text-xl font-bold text-[var(--vit-text)] mb-2">¿Despublicar Landing?</h3>
                <p className="text-[var(--vit-muted)] mb-6">
                  Al despublicar, tu página dejará de estar visible para tus clientes y el enlace dejará de funcionar inmediatamente. Podés volver a publicarla cuando quieras.
                </p>
                <div className="flex gap-3 justify-end">
                  <button type="button" className="lb-btn-ghost px-4 py-2" onClick={() => setConfirmDespublicar(null)}>Cancelar</button>
                  <button type="button" className="lb-btn-warn px-4 py-2" onClick={confirmarDespublicar}>Sí, despublicar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6">
                <h3 className="text-xl font-bold text-red-500 mb-2">Eliminar Landing</h3>
                <p className="text-[var(--vit-muted)] mb-6">
                  ¿Estás seguro de que querés eliminar esta landing definitivamente? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3 justify-end">
                  <button type="button" className="lb-btn-ghost px-4 py-2" onClick={() => setConfirmEliminar(false)}>Cancelar</button>
                  <button type="button" className="bg-red-500 hover:bg-red-600 text-white font-medium rounded-md px-4 py-2 transition-colors" onClick={confirmarEliminarLanding}>Sí, eliminar</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
