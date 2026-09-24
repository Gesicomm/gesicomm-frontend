import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import ComboProductPage from './templates/combo/ComboProductPage';
import { fichaTechDesdeProducto, resolverFichaTech } from './templates/tech/fichaTech';
import { fichaBeautyDesdeProducto, resolverFichaBeauty } from './templates/beauty/fichaBeauty';
import { fichaBasicoDesdeProducto, resolverFichaBasico } from './templates/basico/fichaBasico';
import { fichaComboDesdeProducto, resolverFichaCombo } from './templates/combo/fichaCombo';
import { armarItemFicha as armarItemFichaComun } from './templates/fichaComun';
import {
  armarItemFicha, fichaDesdeMarketing, resolverFichaFitness,
} from './templates/fitness/fichaFitness';
import CartDrawer from '../landing/CartDrawer';
import { ofertaCheckoutPublicable, ordenarOfertasCheckout } from '../landing/ofertasCheckout';
import { hexToRgba } from './templates/themeUtils';
import { tintaSobre } from '../../lib/landingDiseno';
import '../landing/landingPublica.css';
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
import { imagenPrincipalDeGaleria } from './templates/mediaGaleria';

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

const PANEL_GROUPS = [
  { key: 'marca', label: 'Marca', defaultTab: 'marca', tabs: ['marca'] },
  { key: 'contacto', label: 'Contacto', defaultTab: 'contacto', tabs: ['contacto'], requerido: true },
  { key: 'redes', label: 'Redes', defaultTab: 'redes', tabs: ['redes'] },
  { key: 'landing', label: 'Landing', defaultTab: 'contenido', tabs: ['contenido', 'destacados', 'beneficios', 'faq'] },
  { key: 'estilo', label: 'Estilo', defaultTab: 'colores', tabs: ['colores'] },
  { key: 'catalogo', label: 'Catálogo', defaultTab: 'catalogo', tabs: ['catalogo', 'ficha'] },
];

const SUBTABS = {
  landing: [
    { key: 'contenido', label: 'Portada', seccionId: 'hero' },
    { key: 'destacados', label: 'Destacados', seccionId: 'productos' },
    { key: 'beneficios', label: 'Beneficios', seccionId: 'beneficios' },
    { key: 'faq', label: 'Preguntas', seccionId: 'faq' },
  ],
  catalogo: [
    { key: 'catalogo', label: 'Productos', seccionId: null },
    { key: 'ficha', label: 'Ficha por defecto', seccionId: null, soloFicha: true },
  ],
};

const TAB_SECCIONES = {
  marca: 'header',
  contenido: 'hero',
  destacados: 'productos',
  beneficios: 'beneficios',
  faq: 'faq',
  contacto: null,
  redes: 'contacto',
  colores: null,
  catalogo: null,
  ficha: null,
};

function grupoActivoDe(tabActual) {
  return PANEL_GROUPS.find(g => g.tabs.includes(tabActual)) || PANEL_GROUPS[0];
}

function medioDesdeImagenProducto(img) {
  if (!img?.url) return null;
  return {
    tipo: 'imagen',
    id: img.id,
    imagen_id: img.id,
    url: img.url,
    es_principal: !!img.es_principal,
    variante_id: img.variante_id ?? null,
  };
}

function imagenesCatalogoAMedios(imagenes = []) {
  return (imagenes || []).map(medioDesdeImagenProducto).filter(Boolean);
}

function fusionarMediosProducto(imagenes = [], mediosGuardados = null) {
  const base = imagenesCatalogoAMedios(imagenes);
  if (!Array.isArray(mediosGuardados) || mediosGuardados.length === 0) return base;

  const porId = new Map(base.filter(m => m.imagen_id != null).map(m => [String(m.imagen_id), m]));
  const porUrl = new Map(base.map(m => [String(m.url), m]));
  const usados = new Set();
  const resueltos = [];

  mediosGuardados.forEach(medio => {
    if (!medio) return;
    if (typeof medio === 'string') {
      const encontrado = porUrl.get(medio);
      if (encontrado) {
        usados.add(String(encontrado.imagen_id ?? encontrado.url));
        resueltos.push(encontrado);
      } else {
        resueltos.push({ tipo: 'imagen', url: medio });
      }
      return;
    }

    if (medio.tipo === 'video') {
      if (medio.url) resueltos.push({ tipo: 'video', url: medio.url, titulo: medio.titulo || '', id: medio.id || null });
      return;
    }

    const encontrado = porId.get(String(medio.imagen_id ?? medio.id)) || porUrl.get(String(medio.url || ''));
    if (encontrado) {
      usados.add(String(encontrado.imagen_id ?? encontrado.url));
      resueltos.push(encontrado);
    }
  });

  base.forEach(medio => {
    const clave = String(medio.imagen_id ?? medio.url);
    if (!usados.has(clave)) resueltos.push(medio);
  });

  return resueltos;
}

function serializarMediosProducto(medios = []) {
  return (medios || []).map(medio => {
    if (!medio) return null;
    if (typeof medio === 'string') return { tipo: 'imagen', url: medio };
    if (medio.tipo === 'video') {
      return { tipo: 'video', url: medio.url, titulo: medio.titulo || '' };
    }
    return { tipo: 'imagen', imagen_id: medio.imagen_id ?? medio.id ?? null, url: medio.url };
  }).filter(m => m?.url);
}

/**
 * Configurador de la landing rígida — NO es un Page Builder: panel de
 * config a la izquierda (Marca/Contacto/Redes/Landing/Estilo/Catálogo) +
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

      const currentItems = (l.items || []).map(it => ({
        tipo: it.tipo,
        referencia_id: it.referencia_id,
        etiqueta: it.etiqueta,
        orden: it.orden,
        precio_ancla: it.precio_ancla,
        envio_incluido: it.envio_incluido === true,
        mostrar_en_inicio: it.mostrar_en_inicio !== false,
      }));
      const newItems = [...currentItems];
      
      prefilledItems.forEach(pi => {
        if (!newItems.find(it => it.tipo === pi.tipo && Number(it.referencia_id) === Number(pi.referencia_id))) {
          newItems.push({ tipo: pi.tipo, referencia_id: pi.referencia_id, etiqueta: '', orden: newItems.length, precio_ancla: null, envio_incluido: false, mostrar_en_inicio: true });
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
    // La derecha sigue el contexto mental del panel: Catálogo abre la
    // página de catálogo, Contacto/Redes abren la página de contacto, y
    // Landing vuelve al inicio.
    setVistaCatalogo(nuevoTab === 'catalogo');
    setVistaContacto(nuevoTab === 'contacto' || nuevoTab === 'redes');
    const seccionId = TAB_SECCIONES[nuevoTab];
    if (!seccionId || nuevoTab === 'catalogo' || nuevoTab === 'contacto' || nuevoTab === 'redes') return;
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
  function abrirInicio() { setVistaCatalogo(false); setVistaContacto(false); setProductoPreview(null); setTab('contenido'); }
  function abrirCatalogo() { setVistaCatalogo(true); setVistaContacto(false); setProductoPreview(null); setTab('catalogo'); }
  function cerrarCatalogo() { setVistaCatalogo(false); setTab('contenido'); }
  function abrirContacto() { setVistaContacto(true); setVistaCatalogo(false); setProductoPreview(null); setTab('contacto'); }
  function cerrarContacto() { setVistaContacto(false); setTab('contenido'); }

  const [productoCargando, setProductoCargando] = useState(false);
  const [productoImagenes, setProductoImagenes] = useState([]);
  const [productoMedios, setProductoMedios] = useState([]);
  // Variantes/Opciones del producto abierto en preview — sin esto el
  // selector de variantes nunca aparecía acá (el catálogo liviano que arma
  // `abrirProducto` no las trae, ver fetch de abajo).
  const [productoVariantes, setProductoVariantes] = useState([]);
  const [productoOpciones, setProductoOpciones] = useState([]);
  const [productoDescripcion, setProductoDescripcion] = useState('');
  const [productoFaq, setProductoFaq] = useState([]);
  const [productoFaqTitulo, setProductoFaqTitulo] = useState('');
  const [productoRelacionadosTitulo, setProductoRelacionadosTitulo] = useState('');
  const [productoRelacionados, setProductoRelacionados] = useState([]); // [{id, nombre, imagen, precio_efectivo}]
  const [productoRelacionadosAutomatico, setProductoRelacionadosAutomatico] = useState(false);
  const [productoOfertas, setProductoOfertas] = useState([]);
  // Oferta (order bump / upsell) que se está creando o editando en el
  // sidebar, todavía sin guardar — ver ProductCheckoutOfertas#onPreviewOferta.
  // Null cuando no hay ninguna en edición. Alimenta el mismo carrito simulado
  // que dispara "Comprar ahora", así el canvas muestra el checkout real con
  // el borrador ya adentro, en vez de un mock aparte que podía divergir.
  const [ofertaBorrador, setOfertaBorrador] = useState(null);

  // Carrito simulado SOLO para previsualizar order bump/upsell en el canvas
  // mientras se edita uno — el flujo real de esta tienda es el carrito
  // (CartDrawer), también cuando el CTA dice "Comprar ahora". Nunca toca
  // localStorage ni llama al backend: `useStoreCart` (el hook real) hace las
  // dos cosas y además dispara píxeles de Meta/GA/TikTok, que jamás deben
  // salir desde una sesión de admin. Es un array, no un Map — mismo shape
  // de ítem que arma `agregarAlCarrito` en useStoreCart.js.
  const [carritoPreview, setCarritoPreview] = useState([]);
  const [carritoPreviewAbierto, setCarritoPreviewAbierto] = useState(false);

  // Mientras se edita un order bump/upsell, el carrito se abre solo con el
  // producto ya adentro y la sugerencia lista para probar — mismo mecanismo
  // que si el comprador ya hubiera tocado "Agregar al carrito". Al cerrar el
  // borrador (se guarda o se cancela) el carrito simulado se vacía: la
  // próxima edición arranca de cero, no del carrito de la sesión anterior.
  useEffect(() => {
    if (!ofertaBorrador || !productoPreview) {
      setCarritoPreviewAbierto(false);
      setCarritoPreview([]);
      return;
    }
    const precioAncla = productoPreview.precio_efectivo ?? productoPreview.precio_base ?? productoPreview.precio ?? 0;
    setCarritoPreview([{
      clave: `producto:${productoPreview.id}:base:individual`,
      tipo: 'producto',
      contentId: productoPreview.id,
      nombre: productoPreview.nombre,
      varianteId: null,
      varianteNombre: null,
      ofertaId: null,
      ofertaNombre: null,
      precio: precioAncla,
      cantidad: 1,
      imagen: imagenPrincipalDeGaleria(productoMedios) || productoPreview.imagen || null,
      stockMax: null,
      envioIncluido: false,
    }]);
    setCarritoPreviewAbierto(true);
  }, [ofertaBorrador?.id, productoPreview?.id, productoMedios]);

  // El borrador en curso MÁS las demás ofertas reales activas de este
  // producto (order bump/upsell pueden convivir: uno es casilla en el
  // formulario, el otro es el popup después) — si solo mostrara el
  // borrador, editar un upsell no dejaría ver el order bump real que ya
  // está habilitado para el carrito, y el admin no podría probar cómo
  // quedan los dos juntos, que es exactamente lo que pasa en la tienda
  // publicada. Misma regla de habilitación por estrategia que
  // useStoreCart.sugerenciasCarrito (ver ese archivo): sin config
  // explícita para una estrategia, sus ofertas activas se muestran por
  // defecto; con config, solo las tildadas — el borrador se ve siempre,
  // esté o no tildado, para poder armarlo antes de decidir.
  const sugerenciasCarritoPreview = useMemo(() => {
    if (!productoPreview) return [];
    const reales = productoOfertas
      .map(o => ofertaAFormaPublica(o, productoPreview.id))
      .filter(o => o.estrategia === 'order_bump' || o.estrategia === 'upsell')
      .filter(o => !ofertaBorrador || String(o.id) !== String(ofertaBorrador.id));
    const todas = ofertaBorrador ? [...reales, ofertaBorrador] : reales;

    const idsConfigurados = new Set((draft?.content?.ofertas_carrito || []).map(Number));
    const yaEnCarrito = new Set(carritoPreview.map(it => Number(it.ofertaId)).filter(Boolean));

    return ordenarOfertasCheckout(todas, idsConfigurados)
      .filter(o => !yaEnCarrito.has(Number(o.id)))
      .filter(o => o.__previewBorrador || ofertaCheckoutPublicable(o))
      .map(oferta => ({ item: { ...productoPreview, imagen: productoPreview.imagen || null }, oferta }));
  }, [ofertaBorrador, productoPreview, carritoPreview, productoOfertas, draft?.content?.ofertas_carrito]);

  function agregarSugerenciaCarritoPreview(item, oferta) {
    const precio = oferta.precio_efectivo ?? oferta.precio_order_bump ?? oferta.precio_normal ?? oferta.precio ?? 0;
    setCarritoPreview(prev => [...prev, {
      clave: `producto:${productoPreview?.id}:base:${oferta.id}`,
      tipo: 'producto',
      contentId: productoPreview?.id,
      nombre: productoPreview?.nombre,
      varianteId: null,
      varianteNombre: null,
      ofertaId: oferta.id,
      ofertaNombre: oferta.nombre,
      precio,
      cantidad: 1,
      imagen: oferta.imagen || oferta.producto_complementario?.imagen || item?.imagen || null,
      stockMax: null,
      envioIncluido: false,
    }]);
  }

  function abrirCarritoCompraPreview(eleccion = {}) {
    if (!productoPreview) return;
    const pack = eleccion?.pack || null;
    const variante = eleccion?.variante || null;
    const precio = eleccion?.precio
      ?? (pack ? (pack.precio_efectivo ?? pack.precio) : null)
      ?? (variante ? variante.precio_efectivo : null)
      ?? productoPreview.precio_efectivo
      ?? productoPreview.precio_base
      ?? productoPreview.precio
      ?? 0;

    setCarritoPreview([{
      clave: `producto:${productoPreview.id}:preview:${pack?.id || 'base'}:${variante?.id || 'sin-variante'}`,
      tipo: 'producto',
      contentId: productoPreview.id,
      nombre: productoPreview.nombre,
      varianteId: variante?.id || null,
      varianteNombre: variante?.nombre || null,
      ofertaId: pack?.id || null,
      ofertaNombre: pack?.nombre || null,
      precio,
      cantidad: 1,
      imagen: imagenPrincipalDeGaleria(productoMedios) || productoPreview.imagen || null,
      stockMax: null,
      envioIncluido: false,
    }]);
    setCarritoPreviewAbierto(true);
  }

  function cambiarCantidadCarritoPreview(clave, delta) {
    setCarritoPreview(prev => prev
      .map(it => it.clave === clave ? { ...it, cantidad: it.cantidad + delta } : it)
      .filter(it => it.cantidad > 0));
  }

  function quitarDeCarritoPreview(clave) {
    setCarritoPreview(prev => prev.filter(it => it.clave !== clave));
  }

  // Ficha rediseñada: `productoFicha` es SOLO lo que este producto pisa en
  // esta landing (content.productos[id].ficha) — puede quedar null entero si
  // hereda todo. `productoMarketing` es el detalle del producto, del que sale
  // la capa "Vista del producto". Ver fichaFitness.js.
  const [productoFicha, setProductoFicha] = useState(null);
  const [productoMarketing, setProductoMarketing] = useState(null);
  // Override de la ficha de Tecnología para este producto en esta landing.
  // Va aparte de `productoFicha` (la de Fitness) porque son secciones
  // distintas: un producto puede venderse en las dos landings y cada ficha
  // guarda lo suyo sin pisar la otra.
  const [productoFichaTech, setProductoFichaTech] = useState(null);

  const [productoFichaBeauty, setProductoFichaBeauty] = useState(null);
  const [productoFichaBasico, setProductoFichaBasico] = useState(null);
  // Override de ficha_combo EN ESTA landing (ver content.combos["<id>"]).
  const [productoFichaCombo, setProductoFichaCombo] = useState(null);

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
    setProductoMedios([]);
    setProductoVariantes([]);
    setProductoOpciones([]);
    setProductoFaq([]);
    setProductoRelacionadosTitulo('');
    setProductoRelacionados([]);
    setProductoRelacionadosAutomatico(false);
    setProductoOfertas([]);
    setProductoFicha(null);
    setProductoFichaTech(null);
    setProductoMarketing(null);
    setProductoFichaCombo(null);
    // Las imágenes de un combo se administran desde Mis Productos → Combos
    // (necesitan permiso de "editar_combos" que un usuario tienda no
    // siempre tiene) — acá solo se muestran, nunca se suben/borran.
    setProductoImagenesEditables(p?.tipo === 'combo' ? false : true);

    if (p?.tipo === 'combo') {
      // Un combo no pasa por el fetch de abajo (es solo para productos): ya
      // trae todo lo que hace falta resuelto en el propio ítem del catálogo
      // (ver precioUsuario.service.js#listarCatalogo). Lo único que vive
      // POR LANDING es el override de FAQ/ficha, que sale de `draft`.
      const propio = (draft?.content?.combos || {})[String(p.id)] || null;
      const imagenesCombo = (p.imagenes || []).map((url, idx) => ({ id: `combo-${p.id}-${idx}`, url }));
      setProductoMedios(fusionarMediosProducto(imagenesCombo, propio?.medios));
      setProductoFaq(propio?.faq ?? (p.preguntas_frecuentes || []).map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta })));
      setProductoFaqTitulo(propio?.faq_titulo ?? (p.faq_titulo || ''));
      setProductoFichaCombo(propio?.ficha_combo || null);
      setProductoCargando(false);
      return;
    }
    if (p?.tipo !== 'producto') return;
    setProductoCargando(true);
    Promise.all([
      productService.detalle(p.id).catch(() => null),
      productService.imagenes(p.id).catch(() => []),
      productService.faq(p.id).catch(() => []),
      productService.relacionados(p.id, id).catch(() => ({ titulo: null, items: [], automatico: false })),
      ofertaService.listarPorProducto(p.id, { soloActivas: true }).catch(() => []),
      productService.variantes(p.id).catch(() => []),
      productService.opciones(p.id).catch(() => []),
    ]).then(([pDetail, imgs, preguntas, relacionados, ofertas, variantes, opciones]) => {
      setProductoImagenes(imgs);
      setProductoOfertas((ofertas || []).filter(o => o.estrategia === 'normal' || o.estrategia === 'order_bump'));
      // Se guardan ya traducidas a la misma forma que usa el DTO público
      // (ver landing.service.js#obtenerPublica) para que armarItemFicha no
      // tenga que distinguir de dónde vienen: `valoresOpcion` plano
      // {opcion, valor} en vez del objeto anidado que devuelve el admin.
      setProductoVariantes((variantes || []).map(v => ({
        id: v.id,
        nombre: v.nombre,
        stock: v.stock,
        precio_diferencial: Number(v.precio_diferencial) || 0,
        valoresOpcion: (v.valoresOpcion || []).map(vo => ({ opcion: vo.opcion?.nombre || vo.opcion, valor: vo.valor })),
      })));
      setProductoOpciones((opciones || []).map(o => ({
        nombre: o.nombre,
        orden: o.orden,
        valores: (o.valores || []).map(val => val.valor),
      })));
      // pDetail null = no se pudo leer el detalle; se asume no editable para
      // no ofrecer un botón que el backend va a rechazar igual.
      setProductoImagenesEditables(pDetail?.puede_editar === true);
      // Detalle completo: de acá salen propuesta_valor / beneficios /
      // confianza / sobre_este_producto, o sea la pestaña "Vista del producto"
      // de la carga de productos. La ficha los usa como fuente antes
      // de caer en los defaults de la landing.
      setProductoMarketing(pDetail || null);

      // Lo que este comercio ya personalizó de este producto EN ESTA landing
      // manda sobre el catálogo global (ver guardarProducto y
      // LandingService.overrideDeProducto en el backend). El producto sigue
      // siendo el punto de partida para lo que todavía no se tocó — lo que
      // no pasa nunca es el camino inverso: editar acá no lo reescribe.
      const propio = (draft?.content?.productos || {})[String(p.id)] || null;
      setProductoMedios(fusionarMediosProducto(imgs, propio?.medios));

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
          // Galería completa: la tarjeta de relacionado la rota al pasar el
          // mouse por encima (ver ImagenProductoHover).
          imagenes: r.imagenes || [],
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
        const nuevoMedio = medioDesdeImagenProducto(nueva);
        if (nuevoMedio) setProductoMedios(prev => [...prev, nuevoMedio]);
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
      setProductoMedios(prev => prev.filter(m => String(m?.imagen_id ?? m?.id) !== String(imgId)));
      recargarCatalogo();
    } catch {
      setProductoError('No se pudo eliminar la imagen.');
    }
  }

  async function marcarPrincipalProducto(imgId) {
    try {
      await productService.actualizarImagen(productoPreview.id, imgId, { es_principal: true });
      setProductoImagenes(prev => prev.map(i => ({ ...i, es_principal: i.id === imgId })));
      setProductoMedios(prev => prev.map(m => (
        m?.tipo === 'imagen' ? { ...m, es_principal: String(m.imagen_id ?? m.id) === String(imgId) } : m
      )));
      recargarCatalogo();
    } catch {
      setProductoError('No se pudo actualizar la imagen.');
    }
  }

  function agregarVideoProducto(url) {
    const limpio = String(url || '').trim();
    if (!limpio) return;
    setProductoMedios(prev => [
      ...(prev || []),
      { tipo: 'video', id: `video-${Date.now()}`, url: limpio, titulo: '' },
    ]);
    setProductoAviso('');
  }

  function eliminarMedioProducto(index) {
    setProductoMedios(prev => (prev || []).filter((_, i) => i !== index));
    setProductoAviso('');
  }

  function reordenarMediosProducto(origen, destino) {
    setProductoMedios(prev => {
      const lista = [...(prev || [])];
      if (origen < 0 || destino < 0 || origen >= lista.length || destino >= lista.length) return prev;
      const [movido] = lista.splice(origen, 1);
      lista.splice(destino, 0, movido);
      return lista;
    });
    setProductoAviso('');
  }

  function agregarRelacionado(item) {
    setProductoRelacionados(prev => {
      if (prev.some(r => r.id === item.id) || item.id === productoPreview?.id) return prev;
      const landingItem = items.find(i => Number(i.referencia_id) === Number(item.id) && i.tipo === 'producto');
      return [...prev, { 
        id: item.id, 
        nombre: item.nombre, 
        imagen: item.imagen, 
        imagenes: item.imagenes || [],
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

  function envioIncluidoDe(producto) {
    return itemDeLanding(producto)?.envio_incluido === true;
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

  function cambiarEnvioIncluido(valor) {
    if (!productoPreview) return;
    setItems(prev => prev.map(i => (
      Number(i.referencia_id) === Number(productoPreview.id) && i.tipo === (productoPreview.tipo || 'producto')
        ? { ...i, envio_incluido: valor === true }
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
      let contenidoNuevo;

      if (productoPreview?.tipo === 'combo') {
        // Mismo mecanismo que overrideDeProducto, pero en
        // content.combos["<id>"] (ver overrideDeCombo en el backend). Un
        // combo no tiene relacionados ni la ficha por rubro: solo FAQ propia
        // de esta landing y su ficha (template "Combo").
        const porCombo = { ...(contenido.combos || {}) };
        porCombo[String(productoPreview.id)] = {
          ...(porCombo[String(productoPreview.id)] || {}),
          faq_titulo: productoFaqTitulo,
          faq: productoFaq.filter(f => f.pregunta.trim() && f.respuesta.trim()),
          medios: serializarMediosProducto(productoMedios),
          ficha_combo: productoFichaCombo && Object.keys(productoFichaCombo).length ? productoFichaCombo : null,
        };
        contenidoNuevo = { ...contenido, combos: porCombo };
      } else {
        const porProducto = { ...(contenido.productos || {}) };
        porProducto[String(productoPreview.id)] = {
          ...(porProducto[String(productoPreview.id)] || {}),
          descripcion: productoDescripcion,
          faq_titulo: productoFaqTitulo,
          faq: productoFaq.filter(f => f.pregunta.trim() && f.respuesta.trim()),
          medios: serializarMediosProducto(productoMedios),
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
        contenidoNuevo = { ...contenido, productos: porProducto };
      }
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
  // "Ficha" en el panel del producto y el subapartado de defaults dentro
  // de Catálogo.
  const fichaBasicoActiva = templateSlug === SLUG_FICHA_BASICO;
  const fichaBasicoLanding = draft?.content?.ficha_basico || null;
  const fichaBasicoDelProducto = fichaBasicoDesdeProducto(productoMarketing);
  const fichaBasicoResuelta = fichaBasicoActiva
    ? resolverFichaBasico(productoFichaBasico, fichaBasicoLanding, fichaBasicoDelProducto)
    : null;

  // A diferencia de las otras cuatro, la ficha del Combo no depende del
  // template de la landing — se activa siempre que lo que está abierto en
  // el preview es un combo, sin importar qué template rígido usa el resto.
  // Layer 3 (fichaComboDesdeProducto) sale de lo cargado en "Vista del
  // combo" (ComboEditor.jsx), que el catálogo ya trae en `productoPreview`.
  const fichaComboActiva = productoPreview?.tipo === 'combo';
  const fichaComboLanding = draft?.content?.ficha_combo || null;
  const fichaComboDelProducto = fichaComboActiva ? fichaComboDesdeProducto(productoPreview) : {};
  const fichaComboResuelta = fichaComboActiva
    ? resolverFichaCombo(productoFichaCombo, fichaComboLanding, fichaComboDelProducto)
    : null;

  const algunaFichaActiva = fichaActiva || fichaTechActiva || fichaBeautyActiva || fichaBasicoActiva;
  const draftParaPreview = { ...draft, items, faq, beneficios };
  const datosPreview = mapEditorDraftToTemplateData(draftParaPreview, catalogo, tienda);
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
      envio_incluido: item.envio_incluido === true,
      etiqueta: item.etiqueta || null,
    });
  });
  // Raíz del subdominio en producción, "/l/:slug" en local — ver
  // urlPublicaLanding.js, compartido con el editor del lienzo en blanco.
  const publicUrl = urlPublicaLanding(tienda, landing);
  const activeGroup = grupoActivoDe(tab);
  const subtabs = (SUBTABS[activeGroup.key] || []).filter(t => !t.soloFicha || algunaFichaActiva);

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

      {error && <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/40 text-danger text-sm font-medium">{error}</div>}

      <div className="flex flex-1 min-h-0">
        {sidebarVisible && (
          <div className={`w-[336px] shrink-0 border-r border-fg/10 ${productoPreview ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {productoPreview ? (
            <ProductoPanel
              producto={productoPreview}
              editable
              cargando={productoCargando}
              descripcion={productoDescripcion}
              onDescripcion={setProductoDescripcion}
              imagenes={productoImagenes}
              medios={productoMedios}
              imagenesEditables={productoImagenesEditables}
              subiendoImg={productoSubiendoImg}
              onSubirImagen={subirImagenProducto}
              onEliminarImagen={eliminarImagenProducto}
              onMarcarPrincipal={marcarPrincipalProducto}
              onAgregarVideo={agregarVideoProducto}
              onEliminarMedio={eliminarMedioProducto}
              onReordenarMedios={reordenarMediosProducto}
              config={draft?.content || {}}
              onChange={(k, v) => campo(k, v)}
              onOfertasChange={setProductoOfertas}
              onPreviewOferta={setOfertaBorrador}
              tema={datosPreview?.tema}
              precioAncla={precioAnclaDe(productoPreview)}
              onPrecioAncla={itemDeLanding(productoPreview) ? cambiarPrecioAncla : null}
              envioIncluido={envioIncluidoDe(productoPreview)}
              onEnvioIncluido={itemDeLanding(productoPreview) ? cambiarEnvioIncluido : null}
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
              fichaComboActiva={fichaComboActiva}
              fichaCombo={productoFichaCombo}
              fichaComboResuelta={fichaComboResuelta}
              fichaComboLanding={fichaComboLanding}
              fichaComboDelProducto={fichaComboDelProducto}
              onFichaCombo={setProductoFichaCombo}
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
              <div className="p-3 border-b border-fg/10">
                <div className="grid grid-cols-2 gap-1.5">
                  {PANEL_GROUPS.map(g => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => cambiarTab(g.defaultTab)}
                      className={`min-h-10 px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${activeGroup.key === g.key ? 'bg-fg text-canvas' : 'text-fg/55 hover:bg-fg/10 hover:text-fg'}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{g.label}</span>
                        {g.requerido && (
                          <span className={`text-[9px] font-bold uppercase ${activeGroup.key === g.key ? 'text-canvas/60' : 'text-fg/35'}`}>
                            Req.
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {subtabs.length > 0 && (
                <div className="flex gap-1 overflow-x-auto px-3 py-2 border-b border-fg/10">
                  {subtabs.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => cambiarTab(t.key)}
                    className={`shrink-0 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${tab === t.key ? 'bg-fg/12 text-fg' : 'text-fg/45 hover:bg-fg/8 hover:text-fg/70'}`}
                  >
                    {t.label}
                  </button>
                  ))}
                </div>
              )}

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
                  <ColoresPanel draft={draft} onCampo={campo} templateSlug={templateSlug} tienda={tienda} />
                )}
                {tab === 'catalogo' && (
                  <CatalogoPanel items={items} catalogo={catalogo} onChange={setItems} draft={draft} onCampo={campo} onEditarProducto={abrirProducto} onPrecioVentaGuardado={actualizarPrecioCatalogo} />
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

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto bg-black/30 flex justify-center w-full relative"
          // `contain: layout` vuelve a este div el "containing block" de sus
          // descendientes en position:fixed (CartDrawer, con inset:0 pensado
          // para tapar TODA una página publicada).
          // Sin esto, "fixed" mira el viewport entero y el overlay tapaba
          // también el sidebar de edición — el comercio no podía ver el
          // popup/carrito Y seguir editando los campos al mismo tiempo.
          style={{ contain: 'layout' }}
        >
          {viewportMode === 'desktop' && desktopScale < 1 ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', transform: `scale(${desktopScale})`, transformOrigin: 'top center' }}>
              <div style={{ width: '1440px', height: `${100 / desktopScale}%`, flexShrink: 0, backgroundColor: 'transparent' }}>
                <PreviewContent
                  productoPreview={productoPreview}
                  productoOfertas={productoOfertas}
                  productoImagenes={productoImagenes}
                  productoMedios={productoMedios}
                  productoVariantes={productoVariantes}
                  productoOpciones={productoOpciones}
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
                  onComprarPreview={abrirCarritoCompraPreview}
                  fichaResuelta={fichaResuelta}
                  fichaTechResuelta={fichaTechResuelta}
                  fichaBeautyResuelta={fichaBeautyResuelta}
                  fichaBasicoResuelta={fichaBasicoResuelta}
                  fichaComboResuelta={fichaComboResuelta}
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
                  productoMedios={productoMedios}
                  productoVariantes={productoVariantes}
                  productoOpciones={productoOpciones}
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
                  onComprarPreview={abrirCarritoCompraPreview}
                  fichaResuelta={fichaResuelta}
                  fichaTechResuelta={fichaTechResuelta}
                  fichaBeautyResuelta={fichaBeautyResuelta}
                  fichaBasicoResuelta={fichaBasicoResuelta}
                  fichaComboResuelta={fichaComboResuelta}
                  precioAnclaEnVivo={precioAnclaDe(productoPreview)}
                  onCerrarProducto={() => setProductoPreview(null)}
                  onAbrirRelacionado={abrirRelacionado}
                />
              </div>
            </div>
          )}

          {/* Carrito simulado — ver `carritoPreview` más arriba. Mismo CartDrawer
              que la tienda publicada (nunca un mock aparte), envuelto en las
              variables --l-* que esas clases `.lp-cart-*` necesitan para pintarse
              con la paleta real (ver el mismo patrón en ProductPagePublica.jsx).
              También dentro de containerRef: su overlay .lp-cart-overlay es
              position:fixed. */}
          {productoPreview && (
            <div
              // Deliberadamente SIN className="lp-page": esa clase trae
              // min-height:100vh + background propios (pensados para una página
              // pública completa), que acá tapaban todo el editor de un bloque
              // blanco. Solo hacen falta las variables --l-*, no su layout.
              style={datosPreview?.tema ? {
                '--l-primary': datosPreview.tema.acento,
                '--l-secondary': datosPreview.tema.acento,
                '--l-bg': datosPreview.tema.fondo,
                '--l-on-primary': tintaSobre(datosPreview.tema.acento),
                '--l-text': datosPreview.tema.texto,
                '--l-text-muted': hexToRgba(datosPreview.tema.texto, 0.55),
                '--l-surface': hexToRgba(datosPreview.tema.texto, 0.05),
                '--l-card-bg': datosPreview.tema.fondo,
                '--l-card-border': hexToRgba(datosPreview.tema.texto, 0.1),
                '--l-surface-border': hexToRgba(datosPreview.tema.texto, 0.12),
                '--l-popover-bg': datosPreview.tema.fondo,
                '--l-modal-bg': datosPreview.tema.fondo,
              } : undefined}
            >
              <CartDrawer
                // Cambiar de oferta (o cerrar y volver a abrir) tiene que
                // arrancar de cero: sin key, React reutiliza la misma instancia
                // y CartDrawer arrastra su estado interno (paso, popup de
                // upsell ya visto, formulario tipeado) de la oferta anterior —
                // se veía un popup de upsell vacío al pasar de editar un upsell
                // a un order bump.
                key={ofertaBorrador ? `borrador-${ofertaBorrador.id}` : 'sin-borrador'}
                // El admin no es un cliente probando el flujo: quiere ver
                // directamente cómo queda, no tocar "Finalizar pedido" y
                // llenar un formulario falso primero. Order bump vive en el
                // paso "formulario" (arranca ahí directo); upsell además
                // fuerza el popup desde el primer render.
                pasoInicial={ofertaBorrador ? 'formulario' : 'carrito'}
                mostrarUpsellInicial={ofertaBorrador?.estrategia === 'upsell'}
                permitirSugerenciasIncompletas={true}
                items={carritoPreview}
                sugerencias={sugerenciasCarritoPreview}
                onAgregarSugerencia={agregarSugerenciaCarritoPreview}
                abierto={carritoPreviewAbierto}
                onAbrir={() => setCarritoPreviewAbierto(true)}
                onCerrar={() => setCarritoPreviewAbierto(false)}
                onCantidad={cambiarCantidadCarritoPreview}
                onQuitar={quitarDeCarritoPreview}
                onConfirmarPedido={() => {
                  throw new Error('Es una vista previa: desde el editor no se envía el pedido.');
                }}
                onValidarCupon={() => {
                  throw new Error('Los cupones no se pueden probar desde la vista previa.');
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Traduce una Oferta como la devuelve el admin (`/productos/:id/ofertas`) a
 * la forma que publica el backend en el DTO de la landing, que es la que
 * espera CartDrawer. Se replica acá para que la vista previa muestre
 * EXACTAMENTE lo que va a ver el visitante — incluido cuál de los dos
 * precios se cobra — sin tener que publicar la landing para comprobarlo.
 * Ver landing.service.js#obtenerPublica (armado de `ofertasDto`).
 */
export function ofertaAFormaPublica(o, productoAnclaId) {
  // Bump y upsell viven en el checkout; un paquete (estrategia 'normal') se
  // elige en la ficha del producto.
  const esCheckout = o.estrategia === 'order_bump' || o.estrategia === 'upsell';
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
    beneficios: Array.isArray(o.beneficios) ? o.beneficios : null,
    unidades,
    producto_complementario: productos_incluidos[0] || null,
    productos_incluidos,
  };
}

// Subcomponente para renderizar el preview sin duplicar código
function PreviewContent({
  productoPreview, productoOfertas = [], productoImagenes, productoMedios = [], productoVariantes = [], productoOpciones = [],
  productoDescripcion, productoFaq, productoFaqTitulo,
  productoRelacionadosTitulo, productoRelacionados,
  datosPreview, Componente, abrirProducto, catalogoPorIdMapeado, viewportMode,
  vistaCatalogo, onAbrirInicio, onAbrirCatalogo, onCerrarCatalogo,
  vistaContacto, onAbrirContacto, onCerrarContacto, templateSlug, onComprarPreview,
  fichaResuelta = null, fichaTechResuelta = null, fichaBeautyResuelta = null,
  fichaBasicoResuelta = null, fichaComboResuelta = null,
  onCerrarProducto = null, onAbrirRelacionado = null,
  // El precio ancla se edita en el panel del producto y vive en `items`;
  // `productoPreview` es una foto del catálogo del momento en que se abrió,
  // así que sin esto el preview no reflejaría el cambio hasta reabrirlo.
  precioAnclaEnVivo = null,
}) {
  if (productoPreview) {
    const ofertasPublicas = productoOfertas.map(o => ofertaAFormaPublica(o, productoPreview?.id));

    // precio_efectivo/imagenes por variante se calculan acá porque
    // dependen de datos en vivo (precio base editándose, imágenes recién
    // subidas) que `productoVariantes` no trae — mismo criterio que
    // ProductLandingPreview.jsx#variantesPreview en el armador de productos.
    const precioBaseVariantes = Number(productoPreview.precio_efectivo ?? productoPreview.precio_base ?? productoPreview.precio) || 0;
    const variantesParaFicha = productoVariantes.map(v => ({
      ...v,
      precio_efectivo: Math.max(0, precioBaseVariantes + (Number(v.precio_diferencial) || 0)),
      imagenes: (productoImagenes || []).filter(img => img.variante_id === v.id),
    }));

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

    // Un combo tiene su propia ficha siempre — no depende del template
    // rígido activo, así que esta rama va ANTES de las cuatro de abajo.
    if (fichaComboResuelta) {
      return (
        <div className="flex flex-col min-h-screen">
          <StoreHeader {...headerProps} />
          <ComboProductPage
            item={armarItemFichaComun({
              nombre: productoPreview.nombre,
              categoria: productoPreview.categoria?.nombre || productoPreview.categoria || null,
              descripcion: productoDescripcion,
              precio: productoPreview.precio_efectivo ?? productoPreview.precio_base ?? productoPreview.precio,
              precioAntes: precioAnclaEnVivo ?? productoPreview.precio_tachado ?? null,
              // Las imágenes y productos incluidos vienen del catálogo (se
              // administran en Mis Productos → Combos). FAQ y faq_titulo SÍ
              // se editan en esta landing (pestaña "Contenido") y se leen
              // desde los estados reactivos para que el preview los refleje
              // en vivo sin tener que guardar primero.
              imagenes: productoMedios?.length ? productoMedios : (productoPreview.imagenes || []),
              faq: productoFaq.length
                ? productoFaq.filter(f => f?.pregunta?.trim())
                : (productoPreview.preguntas_frecuentes || []).filter(f => f?.pregunta?.trim()),
              faqTitulo: productoFaqTitulo || productoPreview.faq_titulo || '',
              productosIncluidos: Array.isArray(productoPreview.productos_combo) ? productoPreview.productos_combo : [],
            })}
            ficha={fichaComboResuelta}
            tema={datosPreview.tema}
            templateSlug={templateSlug}
            contacto={datosPreview.contacto}
            nombreComercio={datosPreview.nombreComercio}
            isMobile={viewportMode === 'mobile'}
            previewMode
            // En combo el CTA principal usa primero onAgregar; por eso se
            // conecta al mismo carrito simulado que "Comprar ahora".
            onAgregar={onComprarPreview}
            onComprar={onComprarPreview}
            onVolver={onCerrarProducto}
          />
        </div>
      );
    }

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
              imagenes: productoMedios,
              ofertas: ofertasPublicas,
              variantes: variantesParaFicha,
              opciones: productoOpciones,
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
            onComprar={onComprarPreview}
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
              imagenes: productoMedios,
              ofertas: ofertasPublicas,
              variantes: variantesParaFicha,
              opciones: productoOpciones,
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
            onComprar={onComprarPreview}
            onAgregar={onComprarPreview}
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
              imagenes: productoMedios,
              ofertas: ofertasPublicas,
              variantes: variantesParaFicha,
              opciones: productoOpciones,
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
            onComprar={onComprarPreview}
            onAgregar={onComprarPreview}
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
              imagenes: productoMedios,
              ofertas: ofertasPublicas,
              variantes: variantesParaFicha,
              opciones: productoOpciones,
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
            onComprar={onComprarPreview}
            onAgregar={onComprarPreview}
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
        imagenes={productoMedios}
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
        onComprar={onComprarPreview}
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
