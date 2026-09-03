import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, Save, Trash2, ExternalLink, Eye, EyeOff, Monitor, Tablet, Smartphone, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { ofertaService } from '../../services/ofertaService';
import { vitrinaService } from '../../services/vitrinaService';
import { tiendaService } from '../../services/tiendaService';
import { getComponenteTemplate } from './templates';
import { urlPublicaLanding } from './urlPublicaLanding';
import { mapEditorDraftToTemplateData } from './mapLandingToTemplateData';
import ProductoPreview from './templates/ProductoPreview';
import FitnessProductPage from './templates/fitness/FitnessProductPage';
import TechProductPage from './templates/tech/TechProductPage';
import BeautyProductPage from './templates/beauty/BeautyProductPage';
import BasicoProductPage from './templates/basico/BasicoProductPage';
import { fichaTechDesdeProducto, resolverFichaTech } from './templates/tech/fichaTech';
import { fichaBeautyDesdeProducto, resolverFichaBeauty } from './templates/beauty/fichaBeauty';
import { fichaBasicoDesdeProducto, resolverFichaBasico } from './templates/basico/fichaBasico';
import { armarItemFicha as armarItemFichaComun } from './templates/fichaComun';
import {
  armarItemFicha, fichaDesdeMarketing, resolverFichaFitness,
} from './templates/fitness/fichaFitness';
import FunnelCheckout from '../funnel/FunnelCheckout';
import StoreHeader from './templates/StoreHeader';
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
import FichaFitnessPanel from './panels/FichaFitnessPanel';
import FichaTechPanel from './panels/FichaTechPanel';
import FichaBeautyPanel from './panels/FichaBeautyPanel';
import FichaBasicoPanel from './panels/FichaBasicoPanel';

// El id de la sección apunta a la misma sección del template (ver los
// `id="..."` en templates/*.jsx y templates/sections.jsx) — al cambiar de
// tab, el preview se desplaza solo hasta ahí. "colores" no tiene una
// sección propia (aplica a toda la landing), no dispara scroll.
// "catalogo" y "destacados" son DOS editores distintos a propósito:
// catalogo administra la página /catalogo (qué productos existen, orden,
// etiquetas, precio ancla), destacados solo elige cuáles de esos se
// muestran además en el inicio. Antes era un único tab "Productos" que
// hacía las dos cosas y agregar un producto lo publicaba solo en el inicio.
// El template que estrena la ficha de producto rediseñada (12 secciones
// editables, ver templates/fitness/). Los otros tres siguen con la ficha
// genérica de siempre hasta que se adapten.
const SLUG_FICHA_RICA = 'fitness-suplementos';

// Electrónica & Tecnología tiene su propia ficha de producto (14 secciones,
// ver templates/tech/). Pide otros campos que la de suplementos — specs,
// "en la caja", comparativa — y por eso el producto tiene rubro.
const SLUG_FICHA_TECH = 'tech-electronica';

const SLUG_FICHA_BEAUTY = 'beauty-skincare';

// El template neutro. Misma ficha de 13 secciones que las otras tres, sin
// campos de rubro: sirve para cualquier producto.
const SLUG_FICHA_BASICO = 'basico';

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
  // Solo en el template Fitness — se filtra por `soloFicha` al renderizar.
  { key: 'ficha', label: 'Ficha producto', seccionId: null, soloFicha: true },
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
        content: draft.content,
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
  function abrirInicio() { setVistaCatalogo(false); setVistaContacto(false); setProductoPreview(null); setTab('marca'); }
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
  const [productoOfertas, setProductoOfertas] = useState([]);
  // Ficha rediseñada: `productoFicha` es SOLO lo que este producto pisa en
  // esta landing (content.productos[id].ficha) — puede quedar null entero si
  // hereda todo. `productoMarketing` es el detalle del producto, del que sale
  // la capa "Marketing & Embudo". Ver fichaFitness.js.
  const [productoFicha, setProductoFicha] = useState(null);
  const [productoMarketing, setProductoMarketing] = useState(null);
  // Override de la ficha de Tecnología para este producto en esta landing.
  // Va aparte de `productoFicha` (la de Fitness) porque son secciones
  // distintas: un producto puede venderse en las dos landings y cada ficha
  // guarda lo suyo sin pisar la otra.
  const [productoFichaTech, setProductoFichaTech] = useState(null);

  const [productoFichaBeauty, setProductoFichaBeauty] = useState(null);
  const [productoFichaBasico, setProductoFichaBasico] = useState(null);

  const catalogoFiltradoParaRelacionados = useMemo(() => {
    if (!catalogo || !items) return { productos: [], combos: [] };
    const itemsIdsProductos = new Set(items.filter(i => i.tipo === 'producto').map(i => i.referencia_id));
    const itemsIdsCombos = new Set(items.filter(i => i.tipo === 'combo').map(i => i.referencia_id));
    return {
      productos: (catalogo.productos || []).filter(p => itemsIdsProductos.has(p.id)),
      combos: (catalogo.combos || []).filter(c => itemsIdsCombos.has(c.id)),
    };
  }, [catalogo, items]);


  // Las imágenes son del Producto del catálogo, compartido por todo el
  // inquilino — no se pueden personalizar por landing como la descripción o
  // la FAQ. Por eso acá sí manda la propiedad del producto: solo su creador
  // (o un admin) puede tocarlas. Ver imagen.controller.js en el backend.
  const [productoImagenesEditables, setProductoImagenesEditables] = useState(true);
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
    setProductoOfertas([]);
    setProductoFicha(null);
    setProductoFichaTech(null);
    setProductoMarketing(null);
    setProductoImagenesEditables(true);
    if (p?.tipo !== 'producto') return;
    setProductoCargando(true);
    Promise.all([
      productService.detalle(p.id).catch(() => null),
      productService.imagenes(p.id).catch(() => []),
      productService.faq(p.id).catch(() => []),
      productService.relacionados(p.id, id).catch(() => ({ titulo: null, items: [], automatico: false })),
      ofertaService.listarPorProducto(p.id, { soloActivas: true }).catch(() => []),
    ]).then(([pDetail, imgs, preguntas, relacionados, ofertas]) => {
      setProductoImagenes(imgs);
      setProductoOfertas((ofertas || []).filter(o => o.estrategia === 'normal' || o.estrategia === 'order_bump'));
      // pDetail null = no se pudo leer el detalle; se asume no editable para
      // no ofrecer un botón que el backend va a rechazar igual.
      setProductoImagenesEditables(pDetail?.puede_editar === true);
      // Detalle completo: de acá salen propuesta_valor / beneficios /
      // confianza / sobre_este_producto, o sea la pestaña "Marketing &
      // Embudo" de la carga de productos. La ficha los usa como fuente antes
      // de caer en los defaults de la landing.
      setProductoMarketing(pDetail || null);

      // Lo que este comercio ya personalizó de este producto EN ESTA landing
      // manda sobre el catálogo global (ver guardarProducto y
      // LandingService.overrideDeProducto en el backend). El producto sigue
      // siendo el punto de partida para lo que todavía no se tocó — lo que
      // no pasa nunca es el camino inverso: editar acá no lo reescribe.
      const propio = (draft?.content?.productos || {})[String(p.id)] || null;

      // Pre-cargar la descripción detallada si existe (sobre_este_producto > descripcion_larga > descripcion_corta)
      const descPreCargada = pDetail?.sobre_este_producto || pDetail?.descripcion_larga || pDetail?.descripcion_corta || p.descripcion || '';
      setProductoDescripcion(propio?.descripcion ?? descPreCargada);

      // Pre-cargar preguntas: si la landing no tiene preguntas específicas guardadas en la tabla de FAQs, usar pDetail.preguntas_frecuentes
      const faqEsplicito = preguntas.map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta }));
      const faqProducto = (pDetail?.preguntas_frecuentes || pDetail?.faq || []).map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta }));
      setProductoFaq(propio?.faq ?? (faqEsplicito.length > 0 ? faqEsplicito : faqProducto));
      if (propio?.faq_titulo != null) setProductoFaqTitulo(propio.faq_titulo);
      setProductoFicha(propio?.ficha || null);
      setProductoFichaTech(propio?.ficha_tech || null);
      setProductoFichaBeauty(propio?.ficha_beauty || null);
      setProductoFichaBasico(propio?.ficha_basico || null);

      setProductoRelacionadosTitulo(propio?.relacionados_titulo ?? (relacionados.titulo || ''));
      // Mostramos los relacionados en el preview SIEMPRE (sean automáticos o curados).
      // Usamos `automatico` solo para saber si el comercio los personalizó o no.
      const conDatosDeLanding = (r) => {
        const landingItem = items.find(i => i.referencia_id === r.id && i.tipo === 'producto');
        return {
          id: r.id,
          nombre: r.nombre,
          imagen: r.imagen,
          precio_efectivo: r.precio ?? r.precio_efectivo,
          precio_ancla: landingItem?.precio_ancla || r.precio_tachado || null,
          etiqueta: landingItem?.etiqueta || null,
        };
      };

      if (Array.isArray(propio?.relacionados)) {
        // Elegidos a mano en esta landing. Se resuelven contra el catálogo
        // porque pueden no estar entre los que devuelve el producto global.
        const porId = new Map((catalogo.productos || []).map(x => [Number(x.id), x]));
        const delProducto = new Map((relacionados.items || []).map(x => [Number(x.id), x]));
        setProductoRelacionados(
          propio.relacionados
            .map(rid => porId.get(Number(rid)) || delProducto.get(Number(rid)))
            .filter(Boolean)
            .map(conDatosDeLanding)
        );
        setProductoRelacionadosAutomatico(false);
      } else {
        setProductoRelacionados((relacionados.items || []).map(conDatosDeLanding));
        setProductoRelacionadosAutomatico(!!relacionados.automatico);
      }
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

  /**
   * Clic en un producto complementario desde la ficha. El objeto que llega
   * es el resumido de `relacionados` ({id, nombre, imagen, precio}), sin
   * `tipo` — abrirProducto necesita el registro del catálogo para traer
   * detalle/imágenes/FAQ, así que se resuelve por id antes de abrirlo.
   */
  /**
   * Precio ancla (el precio tachado) del producto abierto. Vive en el
   * LandingItem, no en el Producto: es de ESTA landing, así que el mismo
   * producto puede tener un ancla distinto en cada una. Hasta ahora solo se
   * podía tocar desde la pestaña Catálogo, dentro del picker — había que
   * salir de la ficha, buscar el producto en la lista y volver.
   *
   * `null` = sin ancla propio; la ficha cae al precio_tachado del producto
   * global, igual que antes.
   */
  function itemDeLanding(producto) {
    if (!producto) return null;
    return items.find(i => (
      Number(i.referencia_id) === Number(producto.id) && i.tipo === (producto.tipo || 'producto')
    )) || null;
  }

  function precioAnclaDe(producto) {
    return itemDeLanding(producto)?.precio_ancla ?? null;
  }

  function cambiarPrecioAncla(valor) {
    if (!productoPreview) return;
    const limpio = valor === '' || valor === null || valor === undefined ? null : Number(valor);
    setItems(prev => prev.map(i => (
      Number(i.referencia_id) === Number(productoPreview.id) && i.tipo === (productoPreview.tipo || 'producto')
        ? { ...i, precio_ancla: Number.isFinite(limpio) ? limpio : null }
        : i
    )));
    setProductoAviso('');
  }

  function abrirRelacionado(rel) {
    const delCatalogo = (catalogo.productos || []).find(p => Number(p.id) === Number(rel?.id));
    if (delCatalogo) abrirProducto(delCatalogo);
  }

  function quitarRelacionado(id) {
    setProductoRelacionados(prev => prev.filter(r => r.id !== id));
    // Al quitar manualmente, ya no son auto-populados
    setProductoRelacionadosAutomatico(false);
  }

  /**
   * Guarda TODO el panel de producto dentro de ESTA landing, nunca sobre el
   * Producto del catálogo.
   *
   * Un Producto es compartido por todo el inquilino: escribirle la
   * descripción, la FAQ o los relacionados desde el armador le cambiaba la
   * ficha a cualquier otro comercio que vendiera el mismo producto. Y como el
   * backend solo deja editar productos propios, quien no lo había creado
   * directamente no podía tocar ni su propia landing.
   *
   * Ahora todo eso vive en Landing.content.productos["<id>"], que es de la
   * landing y por lo tanto de quien la edita. El backend lo aplica encima del
   * catálogo al publicar (ver LandingService.overrideDeProducto).
   */
  async function guardarProducto() {
    setProductoGuardando(true);
    setProductoError('');
    setProductoAviso('');
    try {
      const contenido = draft?.content || {};
      const porProducto = { ...(contenido.productos || {}) };
      porProducto[String(productoPreview.id)] = {
        ...(porProducto[String(productoPreview.id)] || {}),
        descripcion: productoDescripcion,
        faq_titulo: productoFaqTitulo,
        faq: productoFaq.filter(f => f.pregunta.trim() && f.respuesta.trim()),
        relacionados_titulo: productoRelacionadosTitulo,
        // Los automáticos (rellenados por categoría) no se congelan: si el
        // comercio no eligió nada, la landing sigue mostrando lo que el
        // backend calcule, no una foto vieja de esa lista.
        relacionados: productoRelacionadosAutomatico ? null : productoRelacionados.map(r => r.id),
        // Solo las secciones que este producto pisa. Sin nada propio se
        // guarda null y la ficha vuelve a heredar entera — no se congela
        // una copia de los defaults de la landing.
        ficha: productoFicha && Object.keys(productoFicha).length ? productoFicha : null,
        ficha_tech: productoFichaTech && Object.keys(productoFichaTech).length ? productoFichaTech : null,
        ficha_beauty: productoFichaBeauty && Object.keys(productoFichaBeauty).length ? productoFichaBeauty : null,
        ficha_basico: productoFichaBasico && Object.keys(productoFichaBasico).length ? productoFichaBasico : null,
      };

      const contenidoNuevo = { ...contenido, productos: porProducto };
      // `items` va en el mismo guardado porque el precio ancla vive ahí (en
      // el LandingItem) y ahora se edita desde este panel: sin esto, el
      // comercio lo escribe, aprieta "Guardar cambios" y se pierde sin que
      // nada se lo diga.
      await landingSimpleService.actualizar(id, { content: contenidoNuevo, items });
      setDraft(prev => ({ ...prev, content: contenidoNuevo }));

      setProductoAviso('Cambios guardados en esta landing.');
      recargarCatalogo();
    } catch (err) {
      setProductoError(err?.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setProductoGuardando(false);
    }
  }

  if (cargando || !draft) {
    return (
      <div className="flex items-center justify-center gap-2 text-fg/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando...
      </div>
    );
  }

  const Componente = getComponenteTemplate(landing?.template?.slug);
  const templateSlug = landing?.template?.slug;
  // Ficha rediseñada: activa solo en Fitness. Se resuelve acá (y no dentro
  // del panel o del preview) porque los dos lados tienen que ver
  // exactamente lo mismo — es el mismo objeto.
  const fichaActiva = templateSlug === SLUG_FICHA_RICA;
  const fichaLanding = draft?.content?.ficha_fitness || null;
  const fichaMarketing = fichaDesdeMarketing(productoMarketing);
  const fichaResuelta = fichaActiva
    ? resolverFichaFitness(productoFicha, fichaLanding, fichaMarketing)
    : null;

  // Ídem para Electrónica & Tecnología. Los dos bloques son excluyentes:
  // una landing usa un template y por lo tanto una sola ficha.
  const fichaTechActiva = templateSlug === SLUG_FICHA_TECH;
  const fichaTechLanding = draft?.content?.ficha_tech || null;
  const fichaTechDelProducto = fichaTechDesdeProducto(productoMarketing);
  const fichaTechResuelta = fichaTechActiva
    ? resolverFichaTech(productoFichaTech, fichaTechLanding, fichaTechDelProducto)
    : null;

  const fichaBeautyActiva = templateSlug === SLUG_FICHA_BEAUTY;
  const fichaBeautyLanding = draft?.content?.ficha_beauty || null;
  const fichaBeautyDelProducto = fichaBeautyDesdeProducto(productoPreview || {});
  const fichaBeautyResuelta = fichaBeautyActiva
    ? resolverFichaBeauty(productoFichaBeauty, fichaBeautyLanding, fichaBeautyDelProducto)
    : null;
    
  // Una sola bandera para lo que es común a las tres: mostrar la pestaña
  // "Ficha" en el panel del producto y la de defaults en el sidebar.
  const fichaBasicoActiva = templateSlug === SLUG_FICHA_BASICO;
  const fichaBasicoLanding = draft?.content?.ficha_basico || null;
  const fichaBasicoDelProducto = fichaBasicoDesdeProducto(productoMarketing);
  const fichaBasicoResuelta = fichaBasicoActiva
    ? resolverFichaBasico(productoFichaBasico, fichaBasicoLanding, fichaBasicoDelProducto)
    : null;

  const algunaFichaActiva = fichaActiva || fichaTechActiva || fichaBeautyActiva || fichaBasicoActiva;
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
  // Raíz del subdominio en producción, "/l/:slug" en local — ver
  // urlPublicaLanding.js, compartido con el editor del lienzo en blanco.
  const publicUrl = urlPublicaLanding(tienda, landing);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b border-fg/10 shrink-0 flex items-center justify-between px-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="flex items-center gap-1.5 p-2 -ml-2 text-fg/50 hover:text-fg transition-colors text-xs font-semibold bg-fg/5 rounded-lg px-3"
            title={sidebarVisible ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
          >
            {sidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span className="hidden sm:inline">{sidebarVisible ? 'Ocultar panel' : 'Mostrar panel'}</span>
          </button>
          
          <div>
            <h1 className="text-sm font-bold truncate">
              {landing?.titulo || 'Mi Landing'}
            </h1>
            <a href={`/${landing?.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-fg/50 hover:text-fg/80">
              {window.location.host}/{landing?.slug} <ExternalLink size={10} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport Toggles */}
          <div className="flex items-center bg-fg/5 rounded-lg p-0.5 mr-2 border border-fg/10">
            <button
              type="button"
              onClick={() => setViewportMode('desktop')}
              className={`p-1.5 rounded transition-colors ${viewportMode === 'desktop' ? 'bg-fg text-canvas' : 'text-fg/50 hover:text-fg'}`}
              title="Desktop"
            >
              <Monitor size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('tablet')}
              className={`p-1.5 rounded transition-colors ${viewportMode === 'tablet' ? 'bg-fg text-canvas' : 'text-fg/50 hover:text-fg'}`}
              title="Tablet"
            >
              <Tablet size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('mobile')}
              className={`p-1.5 rounded transition-colors ${viewportMode === 'mobile' ? 'bg-fg text-canvas' : 'text-fg/50 hover:text-fg'}`}
              title="Mobile"
            >
              <Smartphone size={14} />
            </button>
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

      {error && <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="flex flex-1 min-h-0">
        {sidebarVisible && (
          <div className="w-80 shrink-0 border-r border-fg/10 overflow-y-auto">
            {productoPreview ? (
            <ProductoPanel
              producto={productoPreview}
              editable={productoPreview.tipo === 'producto'}
              cargando={productoCargando}
              descripcion={productoDescripcion}
              onDescripcion={setProductoDescripcion}
              imagenes={productoImagenes}
              imagenesEditables={productoImagenesEditables}
              subiendoImg={productoSubiendoImg}
              onSubirImagen={subirImagenProducto}
              onEliminarImagen={eliminarImagenProducto}
              onMarcarPrincipal={marcarPrincipalProducto}
              config={draft?.content || {}}
              onChange={(k, v) => campo(k, v)}
              onOfertasChange={setProductoOfertas}
              precioAncla={precioAnclaDe(productoPreview)}
              onPrecioAncla={itemDeLanding(productoPreview) ? cambiarPrecioAncla : null}
              precioActual={productoPreview?.precio_efectivo ?? productoPreview?.precio_base ?? productoPreview?.precio ?? null}
              fichaActiva={fichaActiva}
              ficha={productoFicha}
              fichaResuelta={fichaResuelta}
              fichaLanding={fichaLanding}
              fichaMarketing={fichaMarketing}
              onFicha={setProductoFicha}
              fichaTechActiva={fichaTechActiva}
              fichaTech={productoFichaTech}
              fichaTechResuelta={fichaTechResuelta}
              fichaTechLanding={fichaTechLanding}
              fichaTechDelProducto={fichaTechDelProducto}
              onFichaTech={setProductoFichaTech}
              fichaBeautyActiva={fichaBeautyActiva}
              fichaBeauty={productoFichaBeauty}
              fichaBeautyResuelta={fichaBeautyResuelta}
              fichaBeautyLanding={fichaBeautyLanding}
              fichaBeautyDelProducto={fichaBeautyDelProducto}
              onFichaBeauty={setProductoFichaBeauty}
              fichaBasicoActiva={fichaBasicoActiva}
              fichaBasico={productoFichaBasico}
              fichaBasicoResuelta={fichaBasicoResuelta}
              fichaBasicoLanding={fichaBasicoLanding}
              fichaBasicoDelProducto={fichaBasicoDelProducto}
              onFichaBasico={setProductoFichaBasico}
              packs={productoOfertas.filter(o => o.estrategia === 'normal' && o.tipo_contenido === 'pack')}
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
              <div className="grid grid-cols-4 gap-1 p-2 border-b border-fg/10">
                {TABS.filter(t => !t.soloFicha || algunaFichaActiva).map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => cambiarTab(t.key)}
                    className={`px-2 py-2 rounded-lg text-[11px] font-semibold text-center transition-colors ${tab === t.key ? 'bg-fg text-canvas' : 'text-fg/50 hover:bg-fg/10'}`}
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
                {tab === 'ficha' && fichaActiva && (
                  <FichaFitnessPanel
                    ficha={fichaLanding}
                    fichaResuelta={resolverFichaFitness(null, fichaLanding, null)}
                    modo="landing"
                    onChange={(nueva) => campo('content', { ...(draft?.content || {}), ficha_fitness: nueva })}
                  />
                )}
                {tab === 'ficha' && fichaTechActiva && (
                  <FichaTechPanel
                    ficha={fichaTechLanding}
                    fichaResuelta={resolverFichaTech(null, fichaTechLanding, null)}
                    modo="landing"
                    onChange={(nueva) => campo('content', { ...(draft?.content || {}), ficha_tech: nueva })}
                  />
                )}
                {tab === 'ficha' && fichaBeautyActiva && (
                  <FichaBeautyPanel
                    ficha={fichaBeautyLanding}
                    fichaResuelta={resolverFichaBeauty(null, fichaBeautyLanding, null)}
                    modo="landing"
                    onChange={(nueva) => campo('content', { ...(draft?.content || {}), ficha_beauty: nueva })}
                  />
                )}
                {tab === 'ficha' && fichaBasicoActiva && (
                  <FichaBasicoPanel
                    ficha={fichaBasicoLanding}
                    fichaResuelta={resolverFichaBasico(null, fichaBasicoLanding, null)}
                    modo="landing"
                    onChange={(nueva) => campo('content', { ...(draft?.content || {}), ficha_basico: nueva })}
                  />
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
                  productoOfertas={productoOfertas}
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
                  onAbrirInicio={abrirInicio}
                  onAbrirCatalogo={abrirCatalogo}
                  onCerrarCatalogo={cerrarCatalogo}
                  vistaContacto={vistaContacto}
                  onAbrirContacto={abrirContacto}
                  onCerrarContacto={cerrarContacto}
                  templateSlug={templateSlug}
                  setCompraFunnel={setCompraFunnel}
                  fichaResuelta={fichaResuelta}
                  fichaTechResuelta={fichaTechResuelta}
                  fichaBeautyResuelta={fichaBeautyResuelta}
                  fichaBasicoResuelta={fichaBasicoResuelta}
                  precioAnclaEnVivo={precioAnclaDe(productoPreview)}
                  onCerrarProducto={() => setProductoPreview(null)}
                  onAbrirRelacionado={abrirRelacionado}
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
                  productoOfertas={productoOfertas}
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
                  onAbrirInicio={abrirInicio}
                  onAbrirCatalogo={abrirCatalogo}
                  onCerrarCatalogo={cerrarCatalogo}
                  vistaContacto={vistaContacto}
                  onAbrirContacto={abrirContacto}
                  onCerrarContacto={cerrarContacto}
                  templateSlug={templateSlug}
                  setCompraFunnel={setCompraFunnel}
                  fichaResuelta={fichaResuelta}
                  fichaTechResuelta={fichaTechResuelta}
                  fichaBeautyResuelta={fichaBeautyResuelta}
                  fichaBasicoResuelta={fichaBasicoResuelta}
                  precioAnclaEnVivo={precioAnclaDe(productoPreview)}
                  onCerrarProducto={() => setProductoPreview(null)}
                  onAbrirRelacionado={abrirRelacionado}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vista previa del checkout. Es el MISMO componente que usa la landing
          pública, alimentado con la misma configuración (draft.content) y las
          ofertas del producto ya traducidas a la forma del DTO — así se puede
          comprobar si un order bump aparece sin tener que publicar y abrir la
          tienda en otra pestaña. No crea ningún pedido: onConfirmar corta con
          un aviso, que FunnelCheckout muestra dentro del formulario. */}
      <FunnelCheckout
        abierto={!!compraFunnel && !!productoPreview}
        onCerrar={() => setCompraFunnel(null)}
        tema={{
          fondo: datosPreview?.tema?.fondo || '#ffffff',
          texto: datosPreview?.tema?.texto || '#111827',
          acento: datosPreview?.tema?.acento || '#111827',
        }}
        resumen={productoPreview ? {
          // Lo que se eligió en la ficha (paquete y/o variante), no el
          // producto suelto: antes el preview mostraba siempre el precio
          // individual aunque el cliente hubiera elegido un paquete, así
          // que no servía para comprobar justamente eso.
          nombre: [
            productoPreview.nombre,
            compraFunnel?.pack ? `— ${compraFunnel.pack.nombre}` : '',
            compraFunnel?.variante ? `(${compraFunnel.variante.nombre})` : '',
          ].filter(Boolean).join(' '),
          variante: compraFunnel?.variante?.nombre || null,
          precio: compraFunnel?.precio
            ?? productoPreview.precio_efectivo ?? productoPreview.precio_base ?? 0,
          imagen: productoImagenes?.[0]?.url || productoPreview.imagen || null,
        } : null}
        ofertasLanding={draft?.content?.ofertas_producto_vista || []}
        itemOriginal={{ id: productoPreview?.id, ofertas: compraFunnel?.ofertas || [] }}
        onConfirmar={() => {
          throw new Error('Es una vista previa: desde el editor no se envía el pedido.');
        }}
      />
    </div>
  );
}

/**
 * Traduce una Oferta como la devuelve el admin (`/productos/:id/ofertas`) a
 * la forma que publica el backend en el DTO de la landing, que es la que
 * espera FunnelCheckout. Se replica acá para que la vista previa muestre
 * EXACTAMENTE lo que va a ver el visitante — incluido cuál de los dos
 * precios se cobra — sin tener que publicar la landing para comprobarlo.
 * Ver landing.service.js#obtenerPublica (armado de `ofertasDto`).
 */
export function ofertaAFormaPublica(o, productoAnclaId) {
  // Solo el order bump vive en el checkout (ver Oferta.js). Un paquete
  // (estrategia 'normal') no pasa por acá: se elige en la ficha del
  // producto, no como casilla del checkout.
  const esCheckout = o.estrategia === 'order_bump';
  const componentes = o.componentes || [];
  const compPack = componentes.find(c => Number(c.producto_id) === Number(productoAnclaId)) || componentes[0];
  const unidades = o.tipo_contenido === 'pack' ? (Number(o.unidades ?? compPack?.cantidad) || null) : null;
  const comps = componentes.filter(c => Number(c.producto_id) !== Number(productoAnclaId));
  const productos_incluidos = comps.map(c => {
    const imgs = c.producto?.imagenes || [];
    const principal = imgs.find(i => i.es_principal) || imgs[0];
    return { nombre: c.producto?.nombre || null, imagen: principal?.url || null };
  }).filter(x => x.nombre);

  const precioNormal = Number(o.precio_normal ?? o.precio) || 0;
  const bump = (o.precio_order_bump === null || o.precio_order_bump === undefined)
    ? null : Number(o.precio_order_bump);

  return {
    id: o.id,
    nombre: o.nombre,
    estrategia: o.estrategia,
    tipo_contenido: o.tipo_contenido,
    descripcion: o.descripcion || null,
    // Imagen propia de la oferta (Oferta.imagen_url). El DTO público la
    // publica como `imagen` (ver landing.service.js), así que acá se traduce
    // igual: si no, la tarjeta del paquete se veía con foto en la landing
    // publicada y sin foto en el preview.
    imagen: o.imagen_url || null,
    precio: precioNormal,
    precio_normal: precioNormal,
    precio_order_bump: bump,
    precio_efectivo: esCheckout ? (bump ?? precioNormal) : precioNormal,
    unidades,
    producto_complementario: productos_incluidos[0] || null,
    productos_incluidos,
  };
}

// Subcomponente para renderizar el preview sin duplicar código
function PreviewContent({
  productoPreview, productoOfertas = [], productoImagenes, productoDescripcion, productoFaq, productoFaqTitulo,
  productoRelacionadosTitulo, productoRelacionados,
  datosPreview, Componente, abrirProducto, catalogoPorIdMapeado, viewportMode,
  vistaCatalogo, onAbrirInicio, onAbrirCatalogo, onCerrarCatalogo,
  vistaContacto, onAbrirContacto, onCerrarContacto, templateSlug, setCompraFunnel,
  fichaResuelta = null, fichaTechResuelta = null, fichaBeautyResuelta = null,
  fichaBasicoResuelta = null,
  onCerrarProducto = null, onAbrirRelacionado = null,
  // El precio ancla se edita en el panel del producto y vive en `items`;
  // `productoPreview` es una foto del catálogo del momento en que se abrió,
  // así que sin esto el preview no reflejaría el cambio hasta reabrirlo.
  precioAnclaEnVivo = null,
}) {
  if (productoPreview) {
    const ofertasPublicas = productoOfertas.map(o => ofertaAFormaPublica(o, productoPreview?.id));

    // Ficha rediseñada (Fitness). Es EL MISMO componente que monta la
    // landing publicada (ver LandingPublica.jsx) alimentado con la misma
    // forma de datos — por eso el preview y lo publicado no pueden
    // desincronizarse como pasaba con ProductoPreview vs ProductPagePublica.
    const headerProps = {
      templateSlug,
      nombreComercio: datosPreview.nombreComercio,
      logo: datosPreview.logo,
      tema: datosPreview.tema,
      previewMode: true,
      onClickInicio: onAbrirInicio,
      onClickCatalogo: onAbrirCatalogo,
      onClickContacto: onAbrirContacto,
      linkInicio: '#',
      linkCatalogo: '#',
      linkContacto: '#',
      // El preview no es un iframe: sin esto el header seguiria viendo el
      // viewport de escritorio y nunca colapsaria a hamburguesa.
      isMobile: viewportMode === 'mobile'
    };

    if (fichaResuelta) {
      return (
        <div className="flex flex-col min-h-screen">
          <StoreHeader {...headerProps} />
          <FitnessProductPage
            item={armarItemFichaComun({
              nombre: productoPreview.nombre,
              categoria: productoPreview.categoria?.nombre || productoPreview.categoria || null,
              descripcion: productoDescripcion,
              precio: productoPreview.precio_efectivo ?? productoPreview.precio_base ?? productoPreview.precio,
              precioAntes: precioAnclaEnVivo ?? productoPreview.precio_tachado ?? null,
              imagenes: (productoImagenes || []).map(i => i.url),
              ofertas: ofertasPublicas,
              faq: productoFaq,
              faqTitulo: productoFaqTitulo,
              relacionados: productoRelacionados,
              relacionadosTitulo: productoRelacionadosTitulo,
            })}
            ficha={fichaResuelta}
            tema={datosPreview.tema}
            templateSlug={templateSlug}
            contacto={datosPreview.contacto}
            nombreComercio={datosPreview.nombreComercio}
            logo={datosPreview.logo}
            isMobile={viewportMode === 'mobile'}
            previewMode
            onComprar={(eleccion) => setCompraFunnel?.({ ofertas: ofertasPublicas, ...(eleccion || {}) })}
            onVolver={onCerrarProducto}
            onClickRelacionado={onAbrirRelacionado}
          />
        </div>
      );
    }

    if (fichaTechResuelta) {
      return (
        <div className="flex flex-col min-h-screen">
          <StoreHeader {...headerProps} />
          <TechProductPage
            item={armarItemFichaComun({
              nombre: productoPreview.nombre,
              categoria: productoPreview.categoria?.nombre || productoPreview.categoria || null,
              descripcion: productoDescripcion,
              precio: productoPreview.precio_efectivo ?? productoPreview.precio_base ?? productoPreview.precio,
              precioAntes: precioAnclaEnVivo ?? productoPreview.precio_tachado ?? null,
              imagenes: (productoImagenes || []).map(i => i.url),
              ofertas: ofertasPublicas,
              faq: productoFaq,
              faqTitulo: productoFaqTitulo,
              relacionados: productoRelacionados,
              relacionadosTitulo: productoRelacionadosTitulo,
            })}
            ficha={fichaTechResuelta}
            tema={datosPreview.tema}
            templateSlug={templateSlug}
            contacto={datosPreview.contacto}
            nombreComercio={datosPreview.nombreComercio}
            logo={datosPreview.logo}
            isMobile={viewportMode === 'mobile'}
            previewMode
            onComprar={(eleccion) => setCompraFunnel?.({ ofertas: ofertasPublicas, ...(eleccion || {}) })}
            // Agregar al carrito NO abre el checkout: son dos acciones
            // distintas. Acá no hay carrito real, así que se avisa en vez de
            // simular algo que no pasa (mismo criterio que el botón de
            // carrito del header en el preview).
            onAgregar={() => window.alert('El carrito funciona en la landing publicada.')}
            onVolver={onCerrarProducto}
            onClickRelacionado={onAbrirRelacionado}
          />
        </div>
      );
    }

    if (fichaBeautyResuelta) {
      return (
        <div className="flex flex-col min-h-screen">
          <StoreHeader {...headerProps} />
          <BeautyProductPage
            item={armarItemFichaComun({
              nombre: productoPreview.nombre,
              categoria: productoPreview.categoria?.nombre || productoPreview.categoria || null,
              descripcion: productoDescripcion,
              precio: productoPreview.precio_efectivo ?? productoPreview.precio_base ?? productoPreview.precio,
              precioAntes: precioAnclaEnVivo ?? productoPreview.precio_tachado ?? null,
              imagenes: (productoImagenes || []).map(i => i.url),
              ofertas: ofertasPublicas,
              faq: productoFaq,
              faqTitulo: productoFaqTitulo,
              relacionados: productoRelacionados,
              relacionadosTitulo: productoRelacionadosTitulo,
            })}
            ficha={fichaBeautyResuelta}
            tema={datosPreview.tema}
            templateSlug={templateSlug}
            contacto={datosPreview.contacto}
            nombreComercio={datosPreview.nombreComercio}
            logo={datosPreview.logo}
            isMobile={viewportMode === 'mobile'}
            previewMode
            onComprar={(eleccion) => setCompraFunnel?.({ ofertas: ofertasPublicas, ...(eleccion || {}) })}
            // Agregar al carrito NO abre el checkout: son acciones
            // distintas. Acá no hay carrito, así que se avisa.
            onAgregar={() => window.alert('El carrito funciona en la landing publicada.')}
            onVolver={onCerrarProducto}
            onClickRelacionado={onAbrirRelacionado}
          />
        </div>
      );
    }

    if (fichaBasicoResuelta) {
      return (
        <div className="flex flex-col min-h-screen">
          <StoreHeader {...headerProps} />
          <BasicoProductPage
            item={armarItemFichaComun({
              nombre: productoPreview.nombre,
              categoria: productoPreview.categoria?.nombre || productoPreview.categoria || null,
              descripcion: productoDescripcion,
              precio: productoPreview.precio_efectivo ?? productoPreview.precio_base ?? productoPreview.precio,
              precioAntes: precioAnclaEnVivo ?? productoPreview.precio_tachado ?? null,
              imagenes: (productoImagenes || []).map(i => i.url),
              ofertas: ofertasPublicas,
              faq: productoFaq,
              faqTitulo: productoFaqTitulo,
              relacionados: productoRelacionados,
              relacionadosTitulo: productoRelacionadosTitulo,
            })}
            ficha={fichaBasicoResuelta}
            tema={datosPreview.tema}
            templateSlug={templateSlug}
            contacto={datosPreview.contacto}
            nombreComercio={datosPreview.nombreComercio}
            logo={datosPreview.logo}
            isMobile={viewportMode === 'mobile'}
            previewMode
            onComprar={(eleccion) => setCompraFunnel?.({ ofertas: ofertasPublicas, ...(eleccion || {}) })}
            // Agregar al carrito NO abre el checkout: son acciones
            // distintas. Acá no hay carrito, así que se avisa.
            onAgregar={() => window.alert('El carrito funciona en la landing publicada.')}
            onVolver={onCerrarProducto}
            onClickRelacionado={onAbrirRelacionado}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen">
        <StoreHeader {...headerProps} />
        <ProductoPreview
        producto={productoPreview}
        ofertas={ofertasPublicas}
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
        logo={datosPreview.logo}
        isMobile={viewportMode === 'mobile'}
        previewMode={true}
        onComprar={(eleccion) => setCompraFunnel?.({ ofertas: ofertasPublicas, ...(eleccion || {}) })}
      />
      </div>
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
        logo={datosPreview.logo}
        onClickProducto={(p) => abrirProducto(p)}
        onClickInicio={onAbrirInicio}
        onClickCatalogo={onAbrirCatalogo}
        onClickContacto={onAbrirContacto}
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
        logo={datosPreview.logo}
        onVolver={onCerrarContacto}
        onClickInicio={onAbrirInicio}
        onClickCatalogo={onAbrirCatalogo}
        onClickContacto={onAbrirContacto}
        isMobile={viewportMode === 'mobile'}
      />
    );
  }
  if (Componente) {
    return (
      <Componente
        data={datosPreview}
        onClickProducto={(p) => abrirProducto(catalogoPorIdMapeado.get(p.id) || null)}
        onClickInicio={onAbrirInicio}
        onClickCatalogo={onAbrirCatalogo}
        onClickContacto={onAbrirContacto}
        cantidadCarrito={0}
        onAbrirCarrito={() => alert('El carrito funciona en la landing publicada.')}
        isMobile={viewportMode === 'mobile'}
        previewMode={true}
      />
    );
  }
  return <p className="p-8 text-fg/40">Template no encontrado.</p>;
}
