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
import { VALORES_DEFECTO_POR_TIPO, getSeccionesBase } from './BloquesSchema';
import { BlockRegistry } from '../../page-builder/core/BlockRegistry';

import ConfirmDialog from '../../components/ConfirmDialog';
import '../vitrina/vitrina.css';
import './landing.css';

const MAX_ITEMS = 40;
const MAX_IMAGEN_BYTES = 1024 * 1024;

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
  const { id } = useParams();
  const esEdicion = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(FORM_INICIAL);
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
  const [plantillaElegida, setPlantillaElegida] = useState(null); // id de la plantilla elegida al crear, null hasta elegir

  const [seccionSeleccionadaId, setSeccionSeleccionadaId] = useState(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [viewportMode, setViewportMode] = useState('desktop');
  const [sidebarTab, setSidebarTab] = useState('sections'); // 'sections' | 'theme'
  const [viewMode, setViewMode] = useState('landing'); // 'landing' | 'producto'

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
    setSecciones(prev => [...prev, nuevaSeccion]);
    setSelectorAbierto(false);
    setSeccionSeleccionadaId(nuevaSeccion.id);
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

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [datosCatalogo, datosTienda] = await Promise.all([
        vitrinaService.catalogo(),
        tiendaService.obtener(),
      ]);
      setCatalogo(datosCatalogo);
      setTienda(datosTienda);

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
          mostrar_whatsapp: guardada.mostrar_whatsapp !== false,
          whatsapp_incluir_precio: !!guardada.whatsapp_incluir_precio,
          whatsapp_incluir_url: !!guardada.whatsapp_incluir_url,
          mostrar_testimonios: !!guardada.mostrar_testimonios,
          mostrar_faq: !!guardada.mostrar_faq,
          checkout_redirigir_whatsapp: guardada.checkout_redirigir_whatsapp !== false,
          seo_titulo: guardada.seo_titulo || '',
          seo_descripcion: guardada.seo_descripcion || '',
          seo_keywords: guardada.seo_keywords || '',
        });
        // Ya vienen ordenados por "orden" (ver include en landing.service.js
        // obtener()) — se copian los campos editables nada más, sin
        // arrastrar id/landing_id/timestamps que no hace falta mandar de
        // vuelta (armarPayload reconstruye el orden por índice).
        
        // MAPEO DE SECCIONES (CON MIGRACION DE LEGACY)
        let hasOldData = false;
        let loadedSecciones = [];
        
        if (Array.isArray(guardada.secciones) && guardada.secciones.length > 0) {
          const basePorTipo = new Map(getSeccionesBase().map(s => [s.tipo, s]));
          loadedSecciones = guardada.secciones
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((s, idx) => BlockRegistry.migrate({
              ...(basePorTipo.get(s.tipo) || {}),
              id: String(s.id || `loaded-${s.tipo}-${idx}`),
              tipo: s.tipo,
              schema_version: s.schema_version,
              nombre_interno: s.nombre_interno || basePorTipo.get(s.tipo)?.nombre_interno || s.tipo,
              activo: s.activo !== false,
              orden: idx,
              config: s.config || s.config_json || {},
              contenido: s.contenido || s.contenido_json || {},
            }));
        } else {
          loadedSecciones = getSeccionesBase().map((s, idx) => ({ ...s, id: `base-${s.tipo}-${idx}`, orden: idx }));
        }

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
        
        // MAPEO DE SECCIONES DE PRODUCTO
        let loadedSeccionesProducto = [];
        if (Array.isArray(guardada.secciones_producto) && guardada.secciones_producto.length > 0) {
          const basePorTipo = new Map(getSeccionesBase().map(s => [s.tipo, s]));
          loadedSeccionesProducto = guardada.secciones_producto
            .slice()
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
        } else {
          // Default para vista de producto
          const pdDefaults = VALORES_DEFECTO_POR_TIPO['product_detail'] || { template: 'standard', config: {}, contenido: {} };
          loadedSeccionesProducto = [
            { id: 'base-header-p0', tipo: 'header', nombre_interno: 'Header', activo: true, orden: 0, config: {}, contenido: {} },
            { id: 'base-product_detail-p1', tipo: 'product_detail', nombre_interno: 'Detalle de Producto', activo: true, orden: 1, config: pdDefaults.config, contenido: pdDefaults.contenido },
            { id: 'base-footer-p2', tipo: 'footer', nombre_interno: 'Footer', activo: true, orden: 2, config: {}, contenido: {} },
          ];
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
            });
          });
        setSeleccion(mapa);

        if (mapa.size > 0) {
           loadedSecciones = loadedSecciones.map(sec => {
              if (sec.tipo === 'productos' && (!sec.contenido?.productos || sec.contenido.productos.length === 0)) {
                 return { 
                   ...sec, 
                   contenido: { 
                     ...sec.contenido, 
                     productos: Array.from(mapa.values()).map(m => ({ tipo: m.tipo, id: m.id, etiqueta: m.etiqueta, nombre: m.nombre })) 
                   } 
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
  }, [id, esEdicion]);

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
          precio_efectivo: null,
          no_disponible: true,
        };
      }
      return { ...base, etiqueta: sel.etiqueta };
    });
  }, [secciones, catalogoPorClave]);

  const itemsPreview = useMemo(() => itemsOrdenados.filter(i => !i.no_disponible), [itemsOrdenados]);
  const hayNoDisponibles = itemsOrdenados.length !== itemsPreview.length;

  // Una sola landing por tienda, siempre en la raíz — el link es
  // conocido en cuanto se conoce la tienda, ni siquiera hace falta haber
  // guardado todavía. Raíz del hostname, SIN "/l": eso quedó como
  // compatibilidad hacia atrás nada más — Nginx ya decide bot-vs-humano
  // sobre "/" en el vhost de tiendas (ver deploy/nginx/tiendas.gesicomm.com
  // y routes/landingHtml.js), así que la URL que se muestra acá tiene que
  // ser la misma que la real.
  const urlPublica = useMemo(() => (
    tienda ? `https://${tienda.subdominio}.gesicomm.com` : null
  ), [tienda]);

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
    if (file.size > MAX_IMAGEN_BYTES) {
      setError('La foto supera el máximo permitido de 1MB.');
      return;
    }

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
    if (file.size > MAX_IMAGEN_BYTES) throw new Error('La imagen supera el máximo permitido de 1MB.');

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
    if (file.size > MAX_IMAGEN_BYTES) {
      setError('La imagen del banner supera el máximo permitido de 1MB.');
      return;
    }

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
    if (file.size > MAX_IMAGEN_BYTES) {
      setError('La imagen supera el máximo permitido de 1MB.');
      return;
    }

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
      secciones: documentModel.pages.landing.sections.map((s, idx) => ({
        stable_id: s.stable_id,
        tipo: s.tipo,
        schema_version: s.schema_version,
        nombre_interno: s.nombre_interno,
        activo: s.activo !== false,
        orden: idx,
        template: s.template,
        config: s.config || {},
        contenido: s.contenido || {},
      })),
      secciones_producto: documentModel.pages.producto.sections.map((s, idx) => ({
        stable_id: s.stable_id,
        tipo: s.tipo,
        schema_version: s.schema_version,
        nombre_interno: s.nombre_interno,
        activo: s.activo !== false,
        orden: idx,
        template: s.template,
        config: s.config || {},
        contenido: s.contenido || {},
      })),
    };
  }

  /** @returns {object|null} la landing guardada, o null si falló. */
  async function guardar() {
    setError(null);
    setExito(null);
    setErroresValidacion([]);

    if (!form.nombre.trim()) {
      setError('Poné un nombre interno para poder guardar.');
      return null;
    }
    if (itemsOrdenados.length === 0) {
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
  if (!esEdicion && !plantillaElegida) {
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

  return (
    <div className="lb-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Top Toolbar ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: '64px', borderBottom: '1px solid var(--vit-border)', background: 'var(--vit-card-bg)', flexShrink: 0, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
          {!esEdicion ? (
            <button type="button" onClick={() => window.location.reload()} className="lb-btn-ghost" style={{ padding: '0.4rem', color: 'var(--vit-text)' }}>
              &larr; Volver a plantillas
            </button>
          ) : (
            <Link to="/mi-landing" className="lb-btn-ghost" style={{ padding: '0.4rem', color: 'var(--vit-text)' }}>
              &larr; Volver
            </Link>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--vit-text)' }}>{form.nombre || 'Mi landing'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--vit-muted)' }}>
              <span className={`lb-estado ${publicada ? 'on' : 'off'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="lb-estado-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: publicada ? '#10b981' : '#f59e0b' }} />
                {publicada ? 'Publicada' : 'Borrador'}
              </span>
              {sucio && <span style={{ color: '#f59e0b' }}>• Cambios sin guardar</span>}
            </div>
          </div>
        </div>



        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {urlPublica && (
            <a href={urlPublica} target="_blank" rel="noreferrer" className="lb-btn-ghost text-sm flex items-center gap-1 font-medium" style={{ color: 'var(--vit-muted)' }}>
              Ver web <ExternalLink size={14} />
            </a>
          )}
          <button type="button" className="lb-btn-secondary text-sm px-4 py-2" onClick={handleGuardar} disabled={ocupado}>
            {guardando ? <Loader size={14} className="spin-icon" /> : <Save size={14} />} Guardar
          </button>
          <button
            type="button"
            className={publicada ? 'lb-btn-warn text-sm px-4 py-2' : 'lb-btn-primary text-sm px-4 py-2'}
            onClick={togglePublicar}
            disabled={ocupado || itemsOrdenados.length === 0}
          >
            {publicando ? <Loader size={14} className="spin-icon" /> : (publicada ? <PowerOff size={14} /> : <Power size={14} />)}
            {publicada ? 'Despublicar' : 'Publicar'}
          </button>
          <button
            type="button"
            className="lb-btn-ghost text-red-500 px-3 py-2 ml-2"
            onClick={eliminarLanding}
            disabled={ocupado}
            title="Eliminar Landing"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {error && (
        <div className="land-alert-error" role="alert" style={{ flexShrink: 0, margin: 0, borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
          <span><AlertCircle size={14} /> {error}</span>
          {erroresValidacion.length > 0 && <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>
      )}
      {exito && (
        <div className="land-alert-success" role="status" style={{ flexShrink: 0, margin: 0, borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
          <Check size={14} /> {exito}
        </div>
      )}
      {hayNoDisponibles && (
        <div className="lb-alert-warn" style={{ flexShrink: 0, margin: 0, borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
          <CircleAlert size={14} />
          <span>Hay productos no disponibles en tu catálogo.</span>
          <button type="button" className="lb-alert-warn-btn" onClick={quitarNoDisponibles}>Quitar no disponibles</button>
        </div>
      )}

      {/* ── Cuerpo: 3 Columnas ── */}
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* COLUMNA IZQUIERDA: Estructura */}
        {showLeftSidebar && (
        <div className="bg-[var(--vit-card-bg)] border-r border-[var(--vit-border)] flex flex-col w-[260px] flex-shrink-0 z-10 overflow-hidden">
          <SidebarSecciones 
            secciones={secciones}
            onSelect={setSeccionSeleccionadaId}
            onAddClick={() => setSelectorAbierto(true)}
            onToggleVisible={handleToggleVisible}
            onDuplicate={handleDuplicarSeccion}
            onDelete={handleEliminarSeccion}
            onReorder={handleReordenarSeccion}
            selectedId={seccionSeleccionadaId}
          />
        </div>
        )}

        {/* COLUMNA CENTRAL: Canvas */}
        <main className="flex-1 overflow-hidden relative flex flex-col items-center">
           <div className="w-full grid grid-cols-3 items-center p-2 bg-[var(--vit-surface)] border-b border-[var(--vit-border)] shadow-sm z-10 px-4">
              
              <div className="flex justify-start">
                <button type="button" onClick={() => setShowLeftSidebar(!showLeftSidebar)} className="mr-2 p-1.5 rounded-md text-[var(--vit-muted)] hover:text-[var(--vit-text)] hover:bg-[var(--vit-card-bg)] transition-colors">
                  <PanelLeft size={18} />
                </button>
                <div className="flex items-center gap-1 bg-[var(--vit-bg)] p-1 rounded-lg border border-[var(--vit-border)]">
                  <button type="button" onClick={() => { setViewMode('landing'); setSeccionSeleccionadaId(null); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'landing' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`}>
                    Página Principal
                  </button>
                  <button type="button" onClick={() => { setViewMode('producto'); setSeccionSeleccionadaId(null); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'producto' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`}>
                    Vista de Producto
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--vit-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--vit-border)' }}>
                  <button type="button" onClick={() => setViewportMode('desktop')} className={`px-3 py-1.5 flex items-center gap-2 rounded-md text-sm font-medium transition-colors ${viewportMode === 'desktop' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`} title="Desktop">
                    <Monitor size={16} /> Desktop
                  </button>
                  <button type="button" onClick={() => setViewportMode('tablet')} className={`px-3 py-1.5 flex items-center gap-2 rounded-md text-sm font-medium transition-colors ${viewportMode === 'tablet' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`} title="Tablet">
                    <Tablet size={16} /> Tablet
                  </button>
                  <button type="button" onClick={() => setViewportMode('mobile')} className={`px-3 py-1.5 flex items-center gap-2 rounded-md text-sm font-medium transition-colors ${viewportMode === 'mobile' ? 'bg-[var(--vit-card-bg)] shadow-sm text-[var(--vit-text)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`} title="Mobile">
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
                  contacto={{ whatsapp: form.mostrar_whatsapp ? tienda?.whatsapp : null }}
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
                />
             </div>
           </div>
        </main>

        {/* COLUMNA DERECHA: Inspector */}
        {showRightSidebar && (
          <aside className="bg-[var(--vit-card-bg)] border-l border-[var(--vit-border)] flex flex-col w-[320px] flex-shrink-0 z-10 overflow-hidden">
            {seccionSeleccionadaId ? (
              <InspectorSeccion
                seccion={secciones.find(s => s.id === seccionSeleccionadaId)}
                onUpdate={handleActualizarSeccion}
                onBack={() => setSeccionSeleccionadaId(null)}
                catalogo={catalogo}
                onDuplicate={handleDuplicarSeccion}
                onDelete={handleEliminarSeccion}
                onUploadImagen={handleUploadSeccionImagen}
              />
            ) : (
              <InspectorGlobal 
                form={form}
                onChange={handleChange}
              />
            )}
          </aside>
        )}


        <SelectorSecciones
            isOpen={selectorAbierto}
            onClose={() => setSelectorAbierto(false)}
            onAdd={handleAgregarSeccion}
            seccionesActuales={secciones}
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
