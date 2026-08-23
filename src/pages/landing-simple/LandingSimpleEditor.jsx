import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, Save, Trash2, ExternalLink, Eye, EyeOff, Monitor, Tablet, Smartphone, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { ofertaService } from '../../services/ofertaService';
import { vitrinaService } from '../../services/vitrinaService';
import { tiendaService } from '../../services/tiendaService';
import { getComponenteTemplate } from './templates';
import { mapEditorDraftToTemplateData } from './mapLandingToTemplateData';
import ProductoPreview from './templates/ProductoPreview';
import FunnelCheckout from '../funnel/FunnelCheckout';
import CatalogoPreview from './templates/CatalogoPreview';
import ContactoPreview from './templates/ContactoPreview';
import { productService } from '../../services/productService';
import MarcaPanel from './panels/MarcaPanel';
import ContenidoPanel from './panels/ContenidoPanel';
import CatalogoPanel from './panels/CatalogoPanel';
import DestacadosPanel from './panels/DestacadosPanel';
import ContactoPanel from './panels/ContactoPanel';
import RedesPanel from './panels/RedesPanel';
import FaqPanel from './panels/FaqPanel';
import BeneficiosPanel from './panels/BeneficiosPanel';
import ColoresPanel from './panels/ColoresPanel';
import ProductoPanel from './panels/ProductoPanel';

// El id de la sección apunta a la misma sección del template (ver los
// `id="..."` en templates/*.jsx y templates/sections.jsx) — al cambiar de
// tab, el preview se desplaza solo hasta ahí. "colores" no tiene una
// sección propia (aplica a toda la landing), no dispara scroll.
// "catalogo" y "destacados" son DOS editores distintos a propósito:
// catalogo administra la página /catalogo (qué productos existen, orden,
// etiquetas, precio ancla), destacados solo elige cuáles de esos se
// muestran además en el inicio. Antes era un único tab "Productos" que
// hacía las dos cosas y agregar un producto lo publicaba solo en el inicio.
const TABS = [
  { key: 'marca', label: 'Marca', seccionId: 'header' },
  { key: 'contenido', label: 'Contenido', seccionId: 'hero' },
  { key: 'colores', label: 'Colores', seccionId: null },
  { key: 'catalogo', label: 'Catálogo', seccionId: null },
  { key: 'destacados', label: 'Destacados', seccionId: 'productos' },
  { key: 'beneficios', label: 'Beneficios', seccionId: 'beneficios' },
  { key: 'contacto', label: 'Contacto', seccionId: null },
  { key: 'redes', label: 'Redes sociales', seccionId: 'contacto' },
  { key: 'faq', label: 'Preguntas', seccionId: 'faq' },
];

/**
 * Configurador de la landing rígida — NO es un Page Builder: panel de
 * config a la izquierda (Marca/Contenido/Productos/Contacto/Preguntas) +
 * preview en vivo a la derecha, sin canvas de edición estructural ni
 * botones "+ Agregar sección/bloque" (spec puntos 3 y 10). El preview usa
 * el MISMO componente de template que la landing pública
 * (templates/index.js) para que nunca puedan divergir.
 */
export default function LandingSimpleEditor({ landingInicial, onEliminada }) {
  const { id: idParam } = useParams();
  const id = landingInicial?.id ?? idParam;
  const navigate = useNavigate();

  const [landing, setLanding] = useState(landingInicial || null);
  const [tienda, setTienda] = useState(null);
  const [draft, setDraft] = useState(null);
  const [faq, setFaq] = useState([]);
  const [beneficios, setBeneficios] = useState([]);
  const [items, setItems] = useState([]);
  const [catalogo, setCatalogo] = useState({ productos: [], combos: [] });
  const [cargando, setCargando] = useState(!landingInicial);
  const [tab, setTab] = useState('marca');
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [subiendoHero, setSubiendoHero] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const previewRef = useRef(null);

  useEffect(() => {
    let activo = true;
    Promise.all([
      landingInicial ? Promise.resolve(landingInicial) : landingSimpleService.obtener(id),
      vitrinaService.catalogo().catch(() => ({ productos: [], combos: [] })),
      tiendaService.obtener().catch(() => null),
    ]).then(([l, cat, t]) => {
      if (!activo) return;
      setLanding(l);
      setDraft(l);
      setFaq(l.faq || []);
      setBeneficios((l.beneficios || []).map(b => ({ titulo: b.titulo, texto: b.texto, icono: b.icono })));
      let prefilledItems = [];
      try {
        const stored = sessionStorage.getItem('gesicomm:prefilledLandingItems');
        if (stored) {
          prefilledItems = JSON.parse(stored);
          sessionStorage.removeItem('gesicomm:prefilledLandingItems');
        }
      } catch(e){}

      const currentItems = (l.items || []).map(it => ({ tipo: it.tipo, referencia_id: it.referencia_id, etiqueta: it.etiqueta, orden: it.orden, precio_ancla: it.precio_ancla, mostrar_en_inicio: it.mostrar_en_inicio !== false }));
      const newItems = [...currentItems];
      
      prefilledItems.forEach(pi => {
        if (!newItems.find(it => it.tipo === pi.tipo && Number(it.referencia_id) === Number(pi.referencia_id))) {
          newItems.push({ tipo: pi.tipo, referencia_id: pi.referencia_id, etiqueta: '', orden: newItems.length, precio_ancla: null, mostrar_en_inicio: true });
        }
      });
      
      setItems(newItems);
      if (prefilledItems.length > 0) {
        setAviso('Productos seleccionados añadidos al catálogo. Recordá hacer clic en Guardar.');
        setTab('catalogo');
        setVistaCatalogo(true);
      }
      setCatalogo(cat);
      setTienda(t);
      setCargando(false);
    }).catch(() => { if (activo) { setError('No se pudo cargar la landing.'); setCargando(false); } });
    return () => { activo = false; };
  }, [id, landingInicial]);

  function campo(clave, valor) {
    setDraft(prev => ({ ...prev, [clave]: valor }));
    setAviso('');
  }

  function cambiarTab(nuevoTab) {
    setTab(nuevoTab);
    setProductoPreview(null);
    // El panel "Productos" gestiona TODOS los items de la landing (no solo
    // los destacados del home) — mostrar ahí la landing de inicio confundía
    // (parecía que no pasaba nada al entrar a la pestaña). Ahora la derecha
    // sigue a la pestaña activa: Productos → vista de Catálogo completo
    // (clickeable para editar cada producto), Redes sociales → vista de
    // Contacto, cualquier otra → la landing de inicio de siempre.
    setVistaCatalogo(nuevoTab === 'catalogo');
    setVistaContacto(nuevoTab === 'contacto');
    const seccionId = TABS.find(t => t.key === nuevoTab)?.seccionId;
    if (!seccionId || nuevoTab === 'catalogo' || nuevoTab === 'contacto') return;
    // El preview vive en el mismo árbol de React (no un iframe), así que
    // alcanza con buscar el id dentro del contenedor con scroll propio.
    requestAnimationFrame(() => {
      previewRef.current?.querySelector(`#${seccionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      const payload = {
        titulo: draft.titulo,
        descripcion: draft.descripcion,
        banner_titulo: draft.banner_titulo,
        banner_subtitulo: draft.banner_subtitulo,
        banner_boton_texto: draft.banner_boton_texto,
        banner_boton_link: draft.banner_boton_link,
        banner_opacidad: draft.banner_opacidad,
        contacto_whatsapp: draft.contacto_whatsapp,
        contacto_telefono: draft.contacto_telefono,
        contacto_email: draft.contacto_email,
        contacto_direccion: draft.contacto_direccion,
        contacto_ciudad: draft.contacto_ciudad,
        contacto_pais: draft.contacto_pais,
        contacto_horarios: draft.contacto_horarios,
        contacto_instagram: draft.contacto_instagram,
        contacto_facebook: draft.contacto_facebook,
        contacto_tiktok: draft.contacto_tiktok,
        contacto_youtube: draft.contacto_youtube,
        contacto_twitter: draft.contacto_twitter,
        contenido_titulo: draft.contenido_titulo,
        contenido_texto: draft.contenido_texto,
        productos_titulo: draft.productos_titulo,
        catalogo_titulo: draft.catalogo_titulo,
        catalogo_descripcion: draft.catalogo_descripcion,
        color_fondo: draft.color_fondo,
        color_texto: draft.color_texto,
        color_primario: draft.color_primario,
        items,
        faq,
        beneficios,
      };
      const actualizada = await landingSimpleService.actualizar(id, payload);
      setLanding(actualizada);
      setDraft(actualizada);
      setAviso('Cambios guardados.');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(activo) {
    setError('');
    try {
      const actualizada = await landingSimpleService.cambiarEstado(id, activo);
      setLanding(actualizada);
      setDraft(prev => ({ ...prev, activo: actualizada.activo }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cambiar el estado.');
    }
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar esta landing? Esta acción no se puede deshacer.')) return;
    try {
      await landingSimpleService.eliminar(id);
      if (onEliminada) onEliminada();
      else navigate('/landing', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar la landing.');
    }
  }

  async function subirLogo(file, errorInline) {
    if (errorInline) { setError(errorInline); return; }
    setSubiendoLogo(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('imagen', file);
      const actualizada = await landingSimpleService.subirLogo(id, formData);
      setDraft(prev => ({ ...prev, logo_imagen: actualizada.logo_imagen }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo subir el logo.');
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function quitarLogo() {
    try {
      const actualizada = await landingSimpleService.eliminarLogo(id);
      setDraft(prev => ({ ...prev, logo_imagen: actualizada.logo_imagen }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo quitar el logo.');
    }
  }

  async function subirHero(file, errorInline) {
    if (errorInline) { setError(errorInline); return; }
    setSubiendoHero(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('imagen', file);
      const actualizada = await landingSimpleService.subirHeroImagen(id, formData);
      setDraft(prev => ({ ...prev, banner_imagen: actualizada.banner_imagen }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo subir la imagen.');
    } finally {
      setSubiendoHero(false);
    }
  }

  async function quitarHero() {
    try {
      const actualizada = await landingSimpleService.eliminarHeroImagen(id);
      setDraft(prev => ({ ...prev, banner_imagen: actualizada.banner_imagen }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo quitar la imagen.');
    }
  }

  // Edición de un producto individual desde el preview (ver
  // panels/ProductoPanel.jsx + templates/ProductoPreview.jsx). El estado
  // vive acá, no en esos componentes, por el mismo motivo que draft/items/
  // faq/beneficios: el panel de la izquierda edita, el preview de la
  // derecha solo refleja — así no hay que duplicar "Guardar"/"Volver" dentro
  // del área de preview, y esta escribe en vivo sin esperar un guardado.
  const [productoPreview, setProductoPreview] = useState(null);
  const [compraFunnel, setCompraFunnel] = useState(null);
  // Vista in-editor del Catálogo completo — clickear "Catálogo" en el
  // header del preview (antes navegaba a la landing pública de verdad, en
  // una pestaña nueva, sin nada editable) abre esto en el mismo panel en
  // vez de salir del editor.
  const [vistaCatalogo, setVistaCatalogo] = useState(false);
  const [vistaContacto, setVistaContacto] = useState(false);

  // Mismos interruptores que cambiarTab, pero disparados desde los links
  // "Catálogo"/"Contacto" DENTRO del preview (no desde el sidebar) —
  // sincronizan la pestaña activa del sidebar para que ambos lados nunca
  // queden mostrando cosas distintas.
  function abrirCatalogo() { setVistaCatalogo(true); setVistaContacto(false); setProductoPreview(null); setTab('catalogo'); }
  function cerrarCatalogo() { setVistaCatalogo(false); setTab('marca'); }
  function abrirContacto() { setVistaContacto(true); setVistaCatalogo(false); setProductoPreview(null); setTab('contacto'); }
  function cerrarContacto() { setVistaContacto(false); setTab('marca'); }

  const [productoCargando, setProductoCargando] = useState(false);
  const [productoImagenes, setProductoImagenes] = useState([]);
  const [productoDescripcion, setProductoDescripcion] = useState('');
  const [productoFaq, setProductoFaq] = useState([]);
  const [productoFaqTitulo, setProductoFaqTitulo] = useState('');
  const [productoRelacionadosTitulo, setProductoRelacionadosTitulo] = useState('');
  const [productoRelacionados, setProductoRelacionados] = useState([]); // [{id, nombre, imagen, precio_efectivo}]
  const [productoRelacionadosAutomatico, setProductoRelacionadosAutomatico] = useState(false);

  const catalogoFiltradoParaRelacionados = useMemo(() => {
    if (!catalogo || !items) return { productos: [], combos: [] };
    const itemsIdsProductos = new Set(items.filter(i => i.tipo === 'producto').map(i => i.referencia_id));
    const itemsIdsCombos = new Set(items.filter(i => i.tipo === 'combo').map(i => i.referencia_id));
    return {
      productos: (catalogo.productos || []).filter(p => itemsIdsProductos.has(p.id)),
      combos: (catalogo.combos || []).filter(c => itemsIdsCombos.has(c.id)),
    };
  }, [catalogo, items]);


  const [productoSubiendoImg, setProductoSubiendoImg] = useState(false);
  const [productoGuardando, setProductoGuardando] = useState(false);
  const [productoError, setProductoError] = useState('');
  const [productoAviso, setProductoAviso] = useState('');

  // Viewport y Sidebar
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [viewportMode, setViewportMode] = useState('desktop'); // desktop | tablet | mobile
  const [desktopScale, setDesktopScale] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        const newScale = Math.min(width / 1440, 1);
        setDesktopScale(newScale);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Deep-link desde el wizard de campañas ("Editar fotos y descripción de
  // este producto"): el id viaja por sessionStorage, no por query string, y
  // se consume una sola vez para que un F5 después no vuelva a saltar acá.
  useEffect(() => {
    const pedido = sessionStorage.getItem('gesicomm:landingProductoId');
    if (!pedido || !catalogo.productos.length) return;
    sessionStorage.removeItem('gesicomm:landingProductoId');
    const p = catalogo.productos.find(x => String(x.id) === String(pedido));
    if (p) {
      setTab('catalogo');
      setVistaCatalogo(false);
      abrirProducto(p);
    }
  }, [catalogo.productos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tras editar un producto (imagen/descripción/FAQ) desde la vista previa
  // del editor, refresca el catálogo para que la tarjeta del producto en el
  // preview de la landing (imagen/nombre) no quede desactualizada.
  function recargarCatalogo() {
    vitrinaService.catalogo().then(setCatalogo).catch(() => {});
  }

  function abrirProducto(p) {
    setProductoPreview(p);
    setProductoError('');
    setProductoFaq([]);
    setProductoFaqTitulo('');

    if (!p) return;
    // Tanto producto como combo exponen la descripción corta bajo la
    // misma clave `descripcion` en el catálogo (ver precioUsuario.service.js
    // #listarCatalogo) — nunca `descripcion_corta`, esa es la columna real
    // del modelo, no el campo del DTO del catálogo.
    setProductoDescripcion(p.descripcion || '');
    setProductoFaqTitulo(p.faq_titulo || '');
    setProductoImagenes([]);
    setProductoFaq([]);
    setProductoRelacionadosTitulo('');
    setProductoRelacionados([]);
    setProductoRelacionadosAutomatico(false);
    if (p?.tipo !== 'producto') return;
    setProductoCargando(true);
    Promise.all([
      productService.detalle(p.id).catch(() => null),
      productService.imagenes(p.id).catch(() => []),
      productService.faq(p.id).catch(() => []),
      productService.relacionados(p.id).catch(() => ({ titulo: null, items: [], automatico: false })),
    ]).then(([pDetail, imgs, preguntas, relacionados]) => {
      setProductoImagenes(imgs);

      // Pre-cargar la descripción detallada si existe (sobre_este_producto > descripcion_larga > descripcion_corta)
      const descPreCargada = pDetail?.sobre_este_producto || pDetail?.descripcion_larga || pDetail?.descripcion_corta || p.descripcion || '';
      setProductoDescripcion(descPreCargada);

      // Pre-cargar preguntas: si la landing no tiene preguntas específicas guardadas en la tabla de FAQs, usar pDetail.preguntas_frecuentes
      const faqEsplicito = preguntas.map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta }));
      const faqProducto = (pDetail?.preguntas_frecuentes || pDetail?.faq || []).map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta }));
      setProductoFaq(faqEsplicito.length > 0 ? faqEsplicito : faqProducto);

      setProductoRelacionadosTitulo(relacionados.titulo || '');
      // Mostramos los relacionados en el preview SIEMPRE (sean automáticos o curados).
      // Usamos `automatico` solo para saber si el comercio los personalizó o no.
      setProductoRelacionados((relacionados.items || []).map(r => {
        const landingItem = items.find(i => i.referencia_id === r.id && i.tipo === 'producto');
        return { 
          id: r.id, 
          nombre: r.nombre, 
          imagen: r.imagen, 
          precio_efectivo: r.precio,
          precio_ancla: landingItem?.precio_ancla || r.precio_tachado || null,
          etiqueta: landingItem?.etiqueta || null
        };
      }));
      setProductoRelacionadosAutomatico(!!relacionados.automatico);
      setProductoCargando(false);
    });
  }

  async function subirImagenProducto(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !productoPreview) return;
    setProductoSubiendoImg(true);
    setProductoError('');
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('imagen', file);
        const nueva = await productService.subirImagen(productoPreview.id, fd);
        setProductoImagenes(prev => [...prev, nueva]);
      } catch (err) {
        setProductoError(err?.response?.data?.message || 'No se pudo subir la imagen.');
      }
    }
    setProductoSubiendoImg(false);
    recargarCatalogo();
  }

  async function eliminarImagenProducto(imgId) {
    try {
      await productService.eliminarImagen(productoPreview.id, imgId);
      setProductoImagenes(prev => prev.filter(i => i.id !== imgId));
      recargarCatalogo();
    } catch {
      setProductoError('No se pudo eliminar la imagen.');
    }
  }

  async function marcarPrincipalProducto(imgId) {
    try {
      await productService.actualizarImagen(productoPreview.id, imgId, { es_principal: true });
      setProductoImagenes(prev => prev.map(i => ({ ...i, es_principal: i.id === imgId })));
      recargarCatalogo();
    } catch {
      setProductoError('No se pudo actualizar la imagen.');
    }
  }

  function agregarRelacionado(item) {
    setProductoRelacionados(prev => {
      if (prev.some(r => r.id === item.id) || item.id === productoPreview?.id) return prev;
      const landingItem = items.find(i => Number(i.referencia_id) === Number(item.id) && i.tipo === 'producto');
      return [...prev, { 
        id: item.id, 
        nombre: item.nombre, 
        imagen: item.imagen, 
        precio_efectivo: item.precio_efectivo ?? item.precio_base,
        precio_ancla: landingItem?.precio_ancla || item.precio_tachado || null,
        etiqueta: landingItem?.etiqueta || null
      }];
    });
    // Al agregar manualmente, ya no son auto-populados
    setProductoRelacionadosAutomatico(false);
  }

  function quitarRelacionado(id) {
    setProductoRelacionados(prev => prev.filter(r => r.id !== id));
    // Al quitar manualmente, ya no son auto-populados
    setProductoRelacionadosAutomatico(false);
  }

  async function guardarProducto() {
    setProductoGuardando(true);
    setProductoError('');
    setProductoAviso('');
    try {
      await productService.actualizar(productoPreview.id, {
        sobre_este_producto: productoDescripcion,
        descripcion_corta: productoDescripcion,
        faq_titulo: productoFaqTitulo,
        faq: productoFaq.filter(f => f.pregunta.trim() && f.respuesta.trim()),
        relacionados_titulo: productoRelacionadosTitulo,
        // Solo enviamos relacionados si el comercio los tocó (no si son auto-populados)
        ...(!productoRelacionadosAutomatico && { relacionados: productoRelacionados.map(r => r.id) }),
      });
      setProductoAviso('Cambios guardados.');
      recargarCatalogo();
    } catch (err) {
      setProductoError(err?.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setProductoGuardando(false);
    }
  }

  if (cargando || !draft) {
    return (
      <div className="flex items-center justify-center gap-2 text-white/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando...
      </div>
    );
  }

  const Componente = getComponenteTemplate(landing?.template?.slug);
  const draftParaPreview = { ...draft, items, faq, beneficios };
  const datosPreview = mapEditorDraftToTemplateData(draftParaPreview, catalogo);
  datosPreview.tienda = { subdominio: tienda?.subdominio };
  datosPreview.slug = landing?.slug || draft?.slug;
  // Mismo criterio de id (slug si existe, si no `tipo:referencia_id`) que
  // mapEditorDraftToTemplateData usa para datosPreview.productos[].id — acá
  // se recalcula para resolver, a partir de ese id, el registro COMPLETO del
  // catálogo (con descripción/categoría/stock) que la vista previa de
  // producto necesita y que la forma reducida de TemplateData no trae.
  const catalogoPorIdMapeado = new Map();
  items.forEach(item => {
    const c = item.tipo === 'producto'
      ? catalogo.productos.find(p => p.id === item.referencia_id)
      : catalogo.combos.find(c => c.id === item.referencia_id);
    if (!c) return;
    const finalId = c.slug ? c.slug : `${item.tipo}:${item.referencia_id}`;
    // Se mezclan `precio_ancla`/`etiqueta` del LandingItem sobre el registro
    // del catálogo: son datos de ESTA landing (no del producto global), y sin
    // ellos CatalogoPreview no podía mostrar el precio tachado ni la etiqueta
    // — se veía igual con o sin precio ancla configurado.
    catalogoPorIdMapeado.set(finalId, {
      ...c,
      precio_ancla: item.precio_ancla ?? null,
      etiqueta: item.etiqueta || null,
    });
  });
  // Mismo criterio que LandingEditor.jsx (sistema flexible): la landing
  // pública vive en la RAÍZ del subdominio de la tienda (es_home=true,
  // ver landingSimple.service.js#crear), nunca en "/l/:slug" — ese path
  // es solo el fallback de desarrollo local (resolverTienda.js jamás
  // resuelve tienda por host en localhost).

  const publicUrl = tienda?.subdominio
    ? (landing?.es_home ? `https://${tienda.subdominio}.gesicomm.com` : `https://${tienda.subdominio}.gesicomm.com/l/${landing?.slug || ''}`)
    : `/l/${landing?.slug || ''}`;

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b border-white/10 shrink-0 flex items-center justify-between px-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="flex items-center gap-1.5 p-2 -ml-2 text-white/50 hover:text-white transition-colors text-xs font-semibold bg-white/5 rounded-lg px-3"
            title={sidebarVisible ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
          >
            {sidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span className="hidden sm:inline">{sidebarVisible ? 'Ocultar panel' : 'Mostrar panel'}</span>
          </button>
          
          <div>
            <h1 className="text-sm font-bold truncate">
              {landing?.titulo || 'Mi Landing'}
            </h1>
            <a href={`/${landing?.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80">
              {window.location.host}/{landing?.slug} <ExternalLink size={10} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport Toggles */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 mr-2 border border-white/10">
            <button
              type="button"
              onClick={() => setViewportMode('desktop')}
              className={`p-1.5 rounded transition-colors ${viewportMode === 'desktop' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
              title="Desktop"
            >
              <Monitor size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('tablet')}
              className={`p-1.5 rounded transition-colors ${viewportMode === 'tablet' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
              title="Tablet"
            >
              <Tablet size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('mobile')}
              className={`p-1.5 rounded transition-colors ${viewportMode === 'mobile' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
              title="Mobile"
            >
              <Smartphone size={14} />
            </button>
          </div>
          {aviso && <span className="text-xs text-emerald-400">{aviso}</span>}
          <button type="button" onClick={eliminar} className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400" title="Eliminar landing">
            <Trash2 size={16} />
          </button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white" title="Ver landing pública">
            <ExternalLink size={16} />
          </a>
          <button
            type="button"
            onClick={() => cambiarEstado(!landing?.activo)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
          >
            {landing?.activo ? <><EyeOff size={13} /> Despublicar</> : <><Eye size={13} /> Publicar</>}
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-50"
          >
            {guardando ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>

      {error && <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="flex flex-1 min-h-0">
        {sidebarVisible && (
          <div className="w-80 shrink-0 border-r border-white/10 overflow-y-auto">
            {productoPreview ? (
            <ProductoPanel
              producto={productoPreview}
              editable={productoPreview.tipo === 'producto'}
              cargando={productoCargando}
              descripcion={productoDescripcion}
              onDescripcion={setProductoDescripcion}
              imagenes={productoImagenes}
              subiendoImg={productoSubiendoImg}
              onSubirImagen={subirImagenProducto}
              onEliminarImagen={eliminarImagenProducto}
              onMarcarPrincipal={marcarPrincipalProducto}
              config={draft?.content || {}}
              onChange={(k, v) => campo(k, v)}
              faq={productoFaq}
              onFaqChange={setProductoFaq}
              faqTitulo={productoFaqTitulo}
              onFaqTitulo={setProductoFaqTitulo}
              relacionadosTitulo={productoRelacionadosTitulo}
              onRelacionadosTitulo={setProductoRelacionadosTitulo}
              relacionados={productoRelacionados}
              relacionadosAutomatico={productoRelacionadosAutomatico}
              onAgregarRelacionado={agregarRelacionado}
              onQuitarRelacionado={quitarRelacionado}
              catalogo={catalogoFiltradoParaRelacionados}
              guardando={productoGuardando}
              onGuardar={guardarProducto}
              aviso={productoAviso}
              error={productoError}
              onVolver={() => setProductoPreview(null)}
            />
          ) : (
            <>
              <div className="grid grid-cols-4 gap-1 p-2 border-b border-white/10">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => cambiarTab(t.key)}
                    className={`px-2 py-2 rounded-lg text-[11px] font-semibold text-center transition-colors ${tab === t.key ? 'bg-white text-black' : 'text-white/50 hover:bg-white/10'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {tab === 'marca' && (
                  <MarcaPanel
                    draft={draft}
                    onCampo={campo}
                    logoUrl={draft.logo_imagen ? `${datosPreview.logo}` : null}
                    subiendoLogo={subiendoLogo}
                    onSubirLogo={subirLogo}
                    onQuitarLogo={quitarLogo}
                  />
                )}
                {tab === 'contenido' && (
                  <ContenidoPanel
                    draft={draft}
                    onCampo={campo}
                    heroUrl={draft.banner_imagen ? `${datosPreview.hero.imagen}` : null}
                    subiendoHero={subiendoHero}
                    onSubirHero={subirHero}
                    onQuitarHero={quitarHero}
                  />
                )}
                {tab === 'colores' && (
                  <ColoresPanel draft={draft} onCampo={campo} />
                )}
                {tab === 'catalogo' && (
                  <CatalogoPanel items={items} catalogo={catalogo} onChange={setItems} draft={draft} onCampo={campo} onEditarProducto={abrirProducto} />
                )}
                {tab === 'destacados' && (
                  <DestacadosPanel items={items} catalogo={catalogo} onChange={setItems} draft={draft} onCampo={campo} />
                )}
                {tab === 'beneficios' && (
                  <BeneficiosPanel beneficios={beneficios} onChange={setBeneficios} />
                )}
                {tab === 'contacto' && (
                  <ContactoPanel draft={draft} onCampo={campo} />
                )}
                {tab === 'redes' && (
                  <RedesPanel draft={draft} onCampo={campo} />
                )}
                {tab === 'faq' && (
                  <FaqPanel faq={faq} onChange={setFaq} />
                )}
              </div>
            </>
          )}
          </div>
        )}

        <div ref={containerRef} className="flex-1 overflow-y-auto bg-black/30 flex justify-center w-full relative">
          {viewportMode === 'desktop' && desktopScale < 1 ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', transform: `scale(${desktopScale})`, transformOrigin: 'top center' }}>
              <div style={{ width: '1440px', height: `${100 / desktopScale}%`, flexShrink: 0, backgroundColor: 'transparent' }}>
                <PreviewContent
                  productoPreview={productoPreview}
                  productoImagenes={productoImagenes}
                  productoDescripcion={productoDescripcion}
                  productoFaq={productoFaq}
                  productoFaqTitulo={productoFaqTitulo}
                  productoRelacionadosTitulo={productoRelacionadosTitulo}
                  productoRelacionados={productoRelacionados}
                  datosPreview={datosPreview}
                  Componente={Componente}
                  abrirProducto={abrirProducto}
                  catalogoPorIdMapeado={catalogoPorIdMapeado}
                  viewportMode={viewportMode}
                  vistaCatalogo={vistaCatalogo}
                  onAbrirCatalogo={abrirCatalogo}
                  onCerrarCatalogo={cerrarCatalogo}
                  vistaContacto={vistaContacto}
                  onAbrirContacto={abrirContacto}
                  onCerrarContacto={cerrarContacto}
                  templateSlug={landing?.template?.slug}
                  setCompraFunnel={setCompraFunnel}
                />
              </div>
            </div>
          ) : (
            <div
              className="relative transition-all duration-300 ease-in-out"
              style={{
                width: viewportMode === 'mobile' ? '375px' : viewportMode === 'tablet' ? '768px' : '100%',
                height: viewportMode === 'mobile' ? '812px' : viewportMode === 'tablet' ? '1024px' : '100%',
                minHeight: viewportMode === 'desktop' ? '100%' : 'auto',
                boxShadow: viewportMode === 'desktop' ? 'none' : '0 0 40px rgba(0,0,0,0.5)',
                margin: viewportMode === 'desktop' ? '0' : '2rem auto',
                borderRadius: viewportMode === 'mobile' ? '36px' : viewportMode === 'tablet' ? '24px' : '0',
                border: viewportMode === 'desktop' ? 'none' : '12px solid #1c2230',
                overflow: 'hidden',
                backgroundColor: viewportMode === 'desktop' ? 'transparent' : 'white'
              }}
            >
              <div className="w-full h-full overflow-y-auto" ref={previewRef}>
                <PreviewContent
                  productoPreview={productoPreview}
                  productoImagenes={productoImagenes}
                  productoDescripcion={productoDescripcion}
                  productoFaq={productoFaq}
                  productoFaqTitulo={productoFaqTitulo}
                  productoRelacionadosTitulo={productoRelacionadosTitulo}
                  productoRelacionados={productoRelacionados}
                  datosPreview={datosPreview}
                  Componente={Componente}
                  abrirProducto={abrirProducto}
                  catalogoPorIdMapeado={catalogoPorIdMapeado}
                  viewportMode={viewportMode}
                  vistaCatalogo={vistaCatalogo}
                  onAbrirCatalogo={abrirCatalogo}
                  onCerrarCatalogo={cerrarCatalogo}
                  vistaContacto={vistaContacto}
                  onAbrirContacto={abrirContacto}
                  onCerrarContacto={cerrarContacto}
                  templateSlug={landing?.template?.slug}
                  setCompraFunnel={setCompraFunnel}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponente para renderizar el preview sin duplicar código
function PreviewContent({
  productoPreview, productoImagenes, productoDescripcion, productoFaq, productoFaqTitulo,
  productoRelacionadosTitulo, productoRelacionados,
  datosPreview, Componente, abrirProducto, catalogoPorIdMapeado, viewportMode,
  vistaCatalogo, onAbrirCatalogo, onCerrarCatalogo,
  vistaContacto, onAbrirContacto, onCerrarContacto, templateSlug, setCompraFunnel,
}) {
  if (productoPreview) {
    return (
      <ProductoPreview
        producto={productoPreview}
        imagenes={productoImagenes}
        descripcion={productoDescripcion}
        faq={productoFaq}
        faqTitulo={productoFaqTitulo}
        relacionadosTitulo={productoRelacionadosTitulo}
        relacionados={productoRelacionados}
        tema={datosPreview.tema}
        templateSlug={templateSlug}
        contacto={datosPreview.contacto}
        nombreComercio={datosPreview.nombreComercio}
        isMobile={viewportMode === 'mobile'}
        previewMode={true}
        onComprar={async () => {
          try {
            const ofs = await ofertaService.listarPorProducto(productoPreview?.id);
            if (setCompraFunnel) setCompraFunnel(ofs);
          } catch (e) {
            console.error(e);
            if (setCompraFunnel) setCompraFunnel([]);
          }
        }}
      />
    );
  }
  if (vistaCatalogo) {
    return (
      <CatalogoPreview
        productos={Array.from(catalogoPorIdMapeado.values())}
        titulo={datosPreview.catalogoTitulo}
        descripcion={datosPreview.catalogoDescripcion}
        tema={datosPreview.tema}
        templateSlug={templateSlug}
        contacto={datosPreview.contacto}
        nombreComercio={datosPreview.nombreComercio}
        onClickProducto={(p) => abrirProducto(p)}
        onVolver={onCerrarCatalogo}
        isMobile={viewportMode === 'mobile'}
      />
    );
  }
  if (vistaContacto) {
    return (
      <ContactoPreview
        contacto={datosPreview.contacto}
        tema={datosPreview.tema}
        templateSlug={templateSlug}
        nombreComercio={datosPreview.nombreComercio}
        onVolver={onCerrarContacto}
      />
    );
  }
  if (Componente) {
    return (
      <Componente
        data={datosPreview}
        onClickProducto={(p) => abrirProducto(catalogoPorIdMapeado.get(p.id) || null)}
        onClickCatalogo={onAbrirCatalogo}
        onClickContacto={onAbrirContacto}
        cantidadCarrito={0}
        onAbrirCarrito={() => alert('El carrito funciona en la landing publicada.')}
        isMobile={viewportMode === 'mobile'}
        previewMode={true}
      />
    );
  }
  return <p className="p-8 text-white/40">Template no encontrado.</p>;
}
