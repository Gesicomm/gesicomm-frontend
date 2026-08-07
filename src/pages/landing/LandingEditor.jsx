import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Save, Loader, AlertCircle, Check, Copy, ExternalLink, Eye, EyeOff,
  FileText, LayoutGrid, SlidersHorizontal, Rocket, Palette, MessageCircle,
  Power, PowerOff, CircleAlert, ImagePlus, Trash2, Sun, Moon, Search, BarChart3, Globe, Sparkles,
  MessageSquareQuote,
} from 'lucide-react';
import { landingService } from '../../services/landingService';
import { vitrinaService } from '../../services/vitrinaService';
import { tiendaService } from '../../services/tiendaService';
import { getMediaUrl } from '../../services/api';
import ProductPicker from './ProductPicker';
import LandingPreview from './LandingPreview';
import EstadisticasPanel from './EstadisticasPanel';
import PasoContenido from './PasoContenido';
import ConfirmDialog from '../../components/ConfirmDialog';
import { MODOS } from '../../lib/landingDiseno';
import '../vitrina/vitrina.css';
import './landing.css';

const MAX_ITEMS = 40;
const MAX_IMAGEN_BYTES = 1024 * 1024;

const PASOS = [
  { id: 'info', label: 'Información', icono: FileText, descripcion: 'Nombre, título y URL' },
  { id: 'productos', label: 'Productos', icono: LayoutGrid, descripcion: 'Qué vas a mostrar' },
  { id: 'diseno', label: 'Diseño', icono: Palette, descripcion: 'Banner, colores y tipografía' },
  { id: 'filtros', label: 'Filtros', icono: SlidersHorizontal, descripcion: 'Navegación y WhatsApp' },
  { id: 'contenido', label: 'Opiniones y FAQ', icono: MessageSquareQuote, descripcion: 'Testimonios y preguntas frecuentes' },
  { id: 'seo', label: 'SEO', icono: Search, descripcion: 'Cómo se comparte y se busca' },
  { id: 'estadisticas', label: 'Estadísticas', icono: BarChart3, descripcion: 'Visitas y conversaciones' },
  { id: 'publicar', label: 'Publicar', icono: Rocket, descripcion: 'Link público y estado' },
];

const FILTROS_DISPONIBLES = [
  ['mostrar_buscador', 'Buscador', 'Deja que el visitante busque por nombre.'],
  ['mostrar_filtro_categoria', 'Categoría', 'Usa la categoría del catálogo.'],
  ['mostrar_filtro_marca', 'Marca', 'Usa la marca del catálogo.'],
  ['mostrar_filtro_etiqueta', 'Etiquetas propias', 'Las que definís vos en el paso Productos.'],
  ['mostrar_orden_precio', 'Orden por precio', 'De menor a mayor y viceversa.'],
];

const RADIOS_BORDE = [
  { valor: 'chico', label: 'Chico' },
  { valor: 'mediano', label: 'Mediano' },
  { valor: 'grande', label: 'Grande' },
];

// Equivalente hex aproximado del cardBg semitransparente de MODOS (ver
// landingDiseno.js) — el <input type="color"> nativo no acepta rgba.
const CARD_HEX_DEFAULT = { oscuro: '#181818', claro: '#ffffff' };

const FUENTES = [
  { valor: 'outfit', label: 'Outfit', familia: "'Outfit', sans-serif" },
  { valor: 'inter', label: 'Inter', familia: "'Inter', sans-serif" },
  { valor: 'poppins', label: 'Poppins', familia: "'Poppins', sans-serif" },
  { valor: 'roboto', label: 'Roboto', familia: "'Roboto', sans-serif" },
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

/** Filtra a solo dígitos hexadecimales y antepone "#" — acepta pegar "#AABBCC" o "AABBCC" por igual. */
function limpiarHex(valor) {
  const limpio = valor.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
  return limpio ? `#${limpio}` : '';
}

/**
 * Selector de color con swatch nativo + campo de texto para el hexadecimal.
 * `colorHeredado` es lo que se muestra en el swatch "Heredado" (puede ser
 * cualquier color CSS, incluso rgba). `colorPicker` es el valor de arranque
 * del <input type="color"> nativo al activar "Personalizado" — ese input
 * solo acepta hex de 6 dígitos, así que si `colorHeredado` no es hex (ej.
 * el fondo semitransparente de las tarjetas en modo oscuro) hace falta un
 * equivalente aproximado.
 */
function CampoColor({ label, valor, colorHeredado, colorPicker, onChange }) {
  return (
    <div className="lb-field">
      <span>{label}</span>
      <div className="lb-color-opciones">
        <button
          type="button"
          className={`lb-color-opcion ${!valor ? 'active' : ''}`}
          onClick={() => onChange('')}
        >
          <span className="lb-swatch" style={{ background: colorHeredado }} />
          Heredado
        </button>
        <label className={`lb-color-opcion ${valor ? 'active' : ''}`}>
          <input
            type="color"
            value={valor || colorPicker || colorHeredado}
            onChange={e => onChange(e.target.value)}
          />
          Personalizado
        </label>
      </div>
      {valor && (
        <input
          type="text"
          className="lb-color-hex"
          value={valor}
          onChange={e => onChange(limpiarHex(e.target.value))}
          placeholder={colorHeredado}
          maxLength={7}
          spellCheck={false}
        />
      )}
    </div>
  );
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
  const [subiendoFotoTestimonio, setSubiendoFotoTestimonio] = useState(null); // índice de la fila, o null
  const [catalogo, setCatalogo] = useState({ productos: [], combos: [] });
  const [tienda, setTienda] = useState(null);
  const [landing, setLanding] = useState(null); // metadatos del registro guardado

  const [paso, setPaso] = useState('info');
  const [previewVisible, setPreviewVisible] = useState(true);
  const [sucio, setSucio] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [subiendoBanner, setSubiendoBanner] = useState(false);
  const [subiendoSeoImagen, setSubiendoSeoImagen] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [confirmDespublicar, setConfirmDespublicar] = useState(null); // landing actualizada, pendiente de confirmar
  const [confirmEliminar, setConfirmEliminar] = useState(false);

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
        setTestimonios((guardada.testimonios || []).map(t => ({
          nombre: t.nombre, foto: t.foto || null, calificacion: t.calificacion, comentario: t.comentario,
        })));
        setFaqs((guardada.faq || []).map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta })));
        // Un producto/combo puede haberse dado de baja (o quedado sin
        // stock/"en_venta") desde que se agregó a esta landing. Antes esos
        // items huérfanos entraban igual a `seleccion` y se mostraban en
        // "Orden y etiquetas" marcados "ya no disponible" — inofensivo en
        // apariencia, pero armarPayload() los manda tal cual al guardar, y
        // el backend rechaza la landing ENTERA por un solo item inválido
        // (LandingService.resolverItemsCatalogo no hace guardado parcial).
        // Resultado real: cualquier intento de guardar volvía a fallar con
        // "El producto #N no existe..." hasta que alguien los sacara a mano
        // uno por uno. Se filtran acá, ANTES de que entren a `seleccion`, así
        // ya no aparecen en ningún lado del editor ni pueden volver a romper
        // un guardado — no requieren que la usuaria haga nada.
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
              referencia_id: item.referencia_id,
              etiqueta: item.etiqueta || '',
            });
          });
        setSeleccion(mapa);

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
  const itemsOrdenados = useMemo(() => (
    Array.from(seleccion.entries()).map(([clave, sel]) => {
      const base = catalogoPorClave.get(clave);
      if (!base) {
        return {
          id: sel.referencia_id,
          tipo: sel.tipo,
          nombre: `${sel.tipo === 'combo' ? 'Combo' : 'Producto'} #${sel.referencia_id} — ya no está disponible`,
          etiqueta: sel.etiqueta,
          precio_efectivo: null,
          no_disponible: true,
        };
      }
      return { ...base, etiqueta: sel.etiqueta };
    })
  ), [seleccion, catalogoPorClave]);

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

  const completado = {
    info: !!form.nombre.trim(),
    productos: seleccion.size > 0,
    diseno: true,
    filtros: true,
    contenido: true,
    seo: true,
    publicar: publicada,
  };

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
    const claves = itemsOrdenados.filter(i => i.no_disponible).map(i => claveItem(i.tipo, i.id));
    if (!claves.length) return;
    setSeleccion(prev => {
      const copia = new Map(prev);
      claves.forEach(clave => copia.delete(clave));
      return copia;
    });
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
      items: Array.from(seleccion.values()).map((item, idx) => ({ ...item, orden: idx })),
      testimonios: testimonios.map((t, idx) => ({
        nombre: t.nombre.trim(),
        foto: t.foto || null,
        calificacion: Number(t.calificacion),
        comentario: t.comentario.trim(),
        orden: idx,
      })),
      faq: faqs.map((f, idx) => ({ pregunta: f.pregunta.trim(), respuesta: f.respuesta.trim(), orden: idx })),
    };
  }

  /** @returns {object|null} la landing guardada, o null si falló. */
  async function guardar() {
    setError(null);
    setExito(null);
    setErroresValidacion([]);

    if (!form.nombre.trim()) {
      setPaso('info');
      setError('Poné un nombre interno para poder guardar.');
      return null;
    }
    if (seleccion.size === 0) {
      setPaso('productos');
      setError('Elegí al menos un producto o combo para la landing.');
      return null;
    }
    if (!bannerLinkOk) {
      setPaso('diseno');
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

  if (cargando) {
    return (
      <div className="vit-page">
        <div className="vit-empty"><Loader size={22} className="spin-icon" /><p>Cargando el constructor...</p></div>
      </div>
    );
  }

  const ocupado = guardando || publicando;

  return (
    <div className="lb-page">
      {/* ── Hero ── */}
      <header className="lb-hero">
        <div className="lb-hero-top">
          <span className="lb-hero-label">Mi landing</span>
          <div className="lb-hero-actions">
            <button
              type="button"
              className="lb-btn-ghost"
              onClick={() => setPreviewVisible(v => !v)}
            >
              {previewVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              {previewVisible ? 'Ocultar vista previa' : 'Vista previa'}
            </button>
            <button type="button" className="lb-btn-secondary" onClick={handleGuardar} disabled={ocupado}>
              {guardando ? <Loader size={14} className="spin-icon" /> : <Save size={14} />}
              Guardar
            </button>
            <button
              type="button"
              className={publicada ? 'lb-btn-warn' : 'lb-btn-primary'}
              onClick={togglePublicar}
              disabled={ocupado || seleccion.size === 0}
              title={seleccion.size === 0 ? 'Agregá productos antes de publicar' : undefined}
            >
              {publicando ? <Loader size={14} className="spin-icon" /> : (publicada ? <PowerOff size={14} /> : <Power size={14} />)}
              {publicada ? 'Despublicar' : 'Publicar'}
            </button>
          </div>
        </div>

        <input
          className="lb-hero-nombre"
          value={form.nombre}
          onChange={e => handleChange('nombre', e.target.value)}
          placeholder="Nombre de tu landing"
          aria-label="Nombre interno de la landing"
        />

        <div className="lb-hero-meta">
          <span className={`lb-estado ${publicada ? 'on' : 'off'}`}>
            <span className="lb-estado-dot" />
            {publicada ? 'Publicada' : 'Borrador'}
          </span>
          <span className="lb-meta-sep" />
          <span>{seleccion.size} {seleccion.size === 1 ? 'producto' : 'productos'}</span>
          {landing?.updated_at && (
            <>
              <span className="lb-meta-sep" />
              <span>Editada {tiempoRelativo(landing.updated_at)}</span>
            </>
          )}
          {sucio && (
            <>
              <span className="lb-meta-sep" />
              <span className="lb-sin-guardar">Cambios sin guardar</span>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="land-alert-error" role="alert">
          <span><AlertCircle size={14} /> {error}</span>
          {erroresValidacion.length > 0 && (
            <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>
          )}
        </div>
      )}

      {/* role=status y no role=alert: es una confirmación, se anuncia sin
          interrumpir lo que esté leyendo un lector de pantalla. */}
      {exito && (
        <div className="land-alert-success" role="status">
          <Check size={14} /> {exito}
        </div>
      )}

      {hayNoDisponibles && (
        <div className="lb-alert-warn">
          <CircleAlert size={14} />
          <span>
            Hay {itemsOrdenados.filter(i => i.no_disponible).length === 1 ? 'un producto' : 'productos'} que
            {' '}ya no {itemsOrdenados.filter(i => i.no_disponible).length === 1 ? 'está' : 'están'} en tu catálogo
            (dado de baja o sin stock). No se muestra en la landing pública, y <strong>el próximo guardado va a fallar</strong> mientras
            siga en la lista.
          </span>
          <button type="button" className="lb-alert-warn-btn" onClick={quitarNoDisponibles}>
            Quitar {itemsOrdenados.filter(i => i.no_disponible).length === 1 ? '' : `(${itemsOrdenados.filter(i => i.no_disponible).length})`}
          </button>
        </div>
      )}

      {/* ── Cuerpo: pasos · panel · vista previa ── */}
      <div className={`lb-body ${previewVisible ? 'con-preview' : ''}`}>
        <nav className="lb-rail">
          {PASOS.map((p, idx) => {
            const Icono = p.icono;
            return (
              <button
                key={p.id}
                type="button"
                className={`lb-rail-item ${paso === p.id ? 'active' : ''} ${completado[p.id] ? 'done' : ''}`}
                onClick={() => setPaso(p.id)}
              >
                <span className="lb-rail-num">
                  {completado[p.id] ? <Check size={12} strokeWidth={3} /> : idx + 1}
                </span>
                <span className="lb-rail-text">
                  <strong><Icono size={13} /> {p.label}</strong>
                  <small>{p.descripcion}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="lb-panel">
          {paso === 'info' && (
            <div className="lb-section">
              <header className="lb-section-head">
                <h2>Información general</h2>
                <p>El nombre interno solo lo ves vos. El título es lo que lee el visitante.</p>
              </header>

              <div className="lb-form-grid">
                <label className="lb-field">
                  <span>Nombre interno</span>
                  <input
                    value={form.nombre}
                    onChange={e => handleChange('nombre', e.target.value)}
                    placeholder="Ej: Ofertas de verano"
                  />
                </label>

                <label className="lb-field">
                  <span>Título público</span>
                  <input
                    value={form.titulo}
                    onChange={e => handleChange('titulo', e.target.value)}
                    placeholder="Se usa el nombre interno si lo dejás vacío"
                  />
                </label>

                <div className="lb-field">
                  <span>Tu URL</span>
                  <div className="lb-url">
                    <code>{urlPublica || 'Se define en cuanto cargue tu tienda...'}</code>
                  </div>
                  <small>Es la única landing de tu tienda, así que siempre vive acá.</small>
                </div>

                <label className="lb-field ancho-total">
                  <span>Descripción</span>
                  <textarea
                    rows={3}
                    value={form.descripcion}
                    onChange={e => handleChange('descripcion', e.target.value)}
                    placeholder="Una línea que explique qué van a encontrar acá."
                  />
                </label>
              </div>
            </div>
          )}

          {paso === 'productos' && (
            <div className="lb-section">
              <header className="lb-section-head">
                <h2>Productos de tu tienda</h2>
                <p>Tocá una tarjeta para agregarla. Podés incluir hasta {MAX_ITEMS} entre productos y combos.</p>
              </header>

              <ProductPicker
                catalogo={catalogo}
                seleccion={seleccion}
                itemsOrdenados={itemsOrdenados}
                onToggle={toggleItem}
                onEtiqueta={actualizarEtiqueta}
                onReordenar={reordenar}
                max={MAX_ITEMS}
              />
            </div>
          )}

          {paso === 'diseno' && (
            <div className="lb-section">
              <header className="lb-section-head">
                <h2>Banner principal</h2>
                <p>Lo primero que ve el visitante al entrar. Opcional — sin imagen ni título, no se muestra.</p>
              </header>

              <label className="lb-switch">
                <input
                  type="checkbox"
                  checked={form.mostrar_banner}
                  onChange={e => handleChange('mostrar_banner', e.target.checked)}
                />
                <span className="lb-switch-track" />
                <span className="lb-switch-label">Mostrar banner en la landing</span>
              </label>

              {form.mostrar_banner && !bannerTieneContenido && (
                <p className="lb-hint aviso">
                  <CircleAlert size={13} /> Activaste el banner pero todavía no cargaste imagen ni título — no se va a mostrar hasta que completes alguno.
                </p>
              )}

              <div className="lb-banner-guide-box">
                <div className="lb-banner-guide-title">
                  <Sparkles size={14} color="#10b981" />
                  <strong>Recomendaciones para tu Banner</strong>
                </div>
                <div className="lb-banner-guide-specs">
                  <span className="lb-guide-tag">📐 Tamaño ideal: <strong>1200 x 400 px</strong> (Proporción 3:1)</span>
                  <span className="lb-guide-tag">🖼️ Formato: <strong>Horizontal / Panorámico</strong></span>
                  <span className="lb-guide-tag">📁 Formatos: <strong>JPG, PNG o WebP (hasta 1MB)</strong></span>
                </div>
                <p className="lb-banner-guide-tip">
                  💡 <em>Consejo:</em> Utilizá fotos apaisadas y ubicá a las personas o productos en el centro para que no se recorten en celulares ni en pantallas grandes.
                </p>
              </div>

              <div className="lb-banner-editor">
                <div className="lb-banner-imagen">
                  {landing?.banner_imagen ? (
                    <div className="lb-banner-preview">
                      <img src={getMediaUrl(landing.banner_imagen)} alt="Banner de la landing" />
                      <button type="button" className="lb-banner-quitar" onClick={quitarBannerImagen} disabled={subiendoBanner}>
                        {subiendoBanner ? <Loader size={13} className="spin-icon" /> : <Trash2 size={13} />} Quitar
                      </button>
                    </div>
                  ) : (
                    <label className="lb-banner-upload">
                      {subiendoBanner ? <Loader size={20} className="spin-icon" /> : <ImagePlus size={20} />}
                      <span>{subiendoBanner ? 'Subiendo...' : 'Subir imagen'}</span>
                      <small>1200 x 400 px · hasta 1MB</small>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleBannerFile}
                        disabled={subiendoBanner}
                        hidden
                      />
                    </label>
                  )}
                </div>

                <div className="lb-banner-campos">
                  <label className="lb-field">
                    <span>Título</span>
                    <input
                      value={form.banner_titulo}
                      onChange={e => handleChange('banner_titulo', e.target.value)}
                      placeholder="Ej: Ofertas de temporada"
                      maxLength={200}
                    />
                  </label>
                  <label className="lb-field">
                    <span>Subtítulo</span>
                    <input
                      value={form.banner_subtitulo}
                      onChange={e => handleChange('banner_subtitulo', e.target.value)}
                      placeholder="Una línea corta debajo del título"
                      maxLength={300}
                    />
                  </label>
                  <label className="lb-field">
                    <span>Texto del botón</span>
                    <input
                      value={form.banner_boton_texto}
                      onChange={e => handleChange('banner_boton_texto', e.target.value)}
                      placeholder="Ej: Ver productos"
                      maxLength={50}
                    />
                  </label>
                  <label className="lb-field">
                    <span>Link del botón</span>
                    <input
                      value={form.banner_boton_link}
                      onChange={e => handleChange('banner_boton_link', e.target.value)}
                      placeholder="https://... (vacío = no muestra botón)"
                      maxLength={500}
                    />
                    {!bannerLinkOk && <small className="lb-campo-error">Tiene que empezar con http://, https:// o /.</small>}
                  </label>
                </div>
              </div>

              <header className="lb-section-head separada">
                <h2>Tema de esta landing</h2>
                <p>Por defecto usa los colores de tu tienda. Podés personalizarlos solo para esta landing.</p>
              </header>

              <div className="lb-segmented lb-modo-toggle">
                <button type="button" className={form.tema_modo === 'oscuro' ? 'active' : ''} onClick={() => handleChange('tema_modo', 'oscuro')}>
                  <Moon size={13} /> Oscuro
                </button>
                <button type="button" className={form.tema_modo === 'claro' ? 'active' : ''} onClick={() => handleChange('tema_modo', 'claro')}>
                  <Sun size={13} /> Claro
                </button>
              </div>

              <div className="lb-diseno-grid">
                <CampoColor
                  label="Color principal"
                  valor={form.color_primario}
                  colorHeredado={tienda?.color_primario || '#10b981'}
                  onChange={v => handleChange('color_primario', v)}
                />

                <CampoColor
                  label="Color de fondo"
                  valor={form.color_fondo}
                  colorHeredado={fondoHeredado}
                  onChange={v => handleChange('color_fondo', v)}
                />

                <CampoColor
                  label="Color de las letras"
                  valor={form.color_texto}
                  colorHeredado={(MODOS[form.tema_modo] || MODOS.oscuro).text}
                  onChange={v => handleChange('color_texto', v)}
                />

                <CampoColor
                  label="Color de las tarjetas"
                  valor={form.color_tarjeta}
                  colorHeredado={(MODOS[form.tema_modo] || MODOS.oscuro).cardBg}
                  colorPicker={CARD_HEX_DEFAULT[form.tema_modo] || CARD_HEX_DEFAULT.oscuro}
                  onChange={v => handleChange('color_tarjeta', v)}
                />
              </div>

              <div className="lb-field">
                <span>Radio de bordes</span>
                <div className="lb-segmented">
                  {RADIOS_BORDE.map(r => (
                    <button key={r.valor} type="button" className={form.radio_bordes === r.valor ? 'active' : ''} onClick={() => handleChange('radio_bordes', r.valor)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lb-field">
                <span>Fuente</span>
                <div className="lb-segmented lb-segmented-fuentes">
                  {FUENTES.map(f => (
                    <button
                      key={f.valor}
                      type="button"
                      style={{ fontFamily: f.familia }}
                      className={form.fuente === f.valor ? 'active' : ''}
                      onClick={() => handleChange('fuente', f.valor)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {paso === 'filtros' && (
            <div className="lb-section">
              <header className="lb-section-head">
                <h2>Cómo navega el visitante</h2>
                <p>Cada opción que actives aparece arriba de los productos en tu tienda.</p>
              </header>

              <div className="lb-opciones">
                {FILTROS_DISPONIBLES.map(([campo, label, ayuda]) => (
                  <label key={campo} className={`lb-opcion ${form[campo] ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form[campo]}
                      onChange={e => handleChange(campo, e.target.checked)}
                    />
                    <span className="lb-opcion-check"><Check size={12} strokeWidth={3} /></span>
                    <span className="lb-opcion-text">
                      <strong>{label}</strong>
                      <small>{ayuda}</small>
                    </span>
                  </label>
                ))}
              </div>

              <header className="lb-section-head separada">
                <h2>Mensaje de WhatsApp</h2>
                <p>Qué se agrega automáticamente cuando el visitante toca "Consultar".</p>
              </header>

              <label className="lb-switch">
                <input
                  type="checkbox"
                  checked={form.mostrar_whatsapp}
                  onChange={e => handleChange('mostrar_whatsapp', e.target.checked)}
                />
                <span className="lb-switch-track" />
                <span className="lb-switch-label">Mostrar botón de WhatsApp en esta landing</span>
              </label>

              {form.mostrar_whatsapp && (
                <div className="lb-opciones">
                  <label className={`lb-opcion ${form.whatsapp_incluir_precio ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.whatsapp_incluir_precio}
                      onChange={e => handleChange('whatsapp_incluir_precio', e.target.checked)}
                    />
                    <span className="lb-opcion-check"><Check size={12} strokeWidth={3} /></span>
                    <span className="lb-opcion-text">
                      <strong>Agregar precio</strong>
                      <small>Se suma al mensaje junto al nombre del producto.</small>
                    </span>
                  </label>
                  <label className={`lb-opcion ${form.whatsapp_incluir_url ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.whatsapp_incluir_url}
                      onChange={e => handleChange('whatsapp_incluir_url', e.target.checked)}
                    />
                    <span className="lb-opcion-check"><Check size={12} strokeWidth={3} /></span>
                    <span className="lb-opcion-text">
                      <strong>Agregar el link de esta landing</strong>
                      <small>Para que sepas desde dónde te escriben.</small>
                    </span>
                  </label>
                </div>
              )}

              {form.mostrar_whatsapp && (
                <label className="lb-switch">
                  <input
                    type="checkbox"
                    checked={form.checkout_redirigir_whatsapp}
                    onChange={e => handleChange('checkout_redirigir_whatsapp', e.target.checked)}
                  />
                  <span className="lb-switch-track" />
                  <span className="lb-switch-label">
                    Después de crear el pedido, abrir WhatsApp para coordinar
                  </span>
                </label>
              )}

              <div className="lb-tema">
                <div className="lb-tema-contacto">
                  <MessageCircle size={14} />
                  {tienda?.whatsapp
                    ? <span>Número configurado: <strong>{tienda.whatsapp}</strong></span>
                    : <span className="lb-sin-guardar">Sin WhatsApp configurado en tu tienda: el botón no se va a mostrar.</span>}
                </div>
                <Link to="/mi-tienda" className="lb-btn-ghost">
                  <Palette size={14} /> Configurar en Mi tienda
                </Link>
              </div>
            </div>
          )}

          {paso === 'contenido' && (
            <PasoContenido
              mostrarTestimonios={form.mostrar_testimonios}
              mostrarFaq={form.mostrar_faq}
              onChange={handleChange}
              testimonios={testimonios}
              onAgregarTestimonio={agregarTestimonio}
              onActualizarTestimonio={actualizarTestimonio}
              onQuitarTestimonio={quitarTestimonio}
              onMoverTestimonio={moverTestimonio}
              onSubirFotoTestimonio={handleTestimonioFoto}
              subiendoFotoTestimonio={subiendoFotoTestimonio}
              faqs={faqs}
              onAgregarFaq={agregarFaq}
              onActualizarFaq={actualizarFaq}
              onQuitarFaq={quitarFaq}
              onMoverFaq={moverFaq}
            />
          )}

          {paso === 'seo' && (
            <div className="lb-section">
              <header className="lb-section-head">
                <h2>SEO</h2>
                <p>Cómo se ve tu landing cuando la comparten o la buscan en Google.</p>
              </header>

              <div className="lb-form-grid">
                <label className="lb-field ancho-total">
                  <span>Título SEO</span>
                  <input
                    value={form.seo_titulo}
                    onChange={e => handleChange('seo_titulo', e.target.value)}
                    placeholder={form.titulo || form.nombre || 'Se usa el título público si lo dejás vacío'}
                    maxLength={160}
                  />
                  <small className={form.seo_titulo.length > 60 ? 'lb-campo-error' : ''}>{form.seo_titulo.length}/60 recomendado</small>
                </label>

                <label className="lb-field ancho-total">
                  <span>Descripción SEO</span>
                  <textarea
                    rows={2}
                    value={form.seo_descripcion}
                    onChange={e => handleChange('seo_descripcion', e.target.value)}
                    placeholder={form.descripcion || 'Se usa la descripción de la landing si la dejás vacía'}
                    maxLength={320}
                  />
                  <small className={form.seo_descripcion.length > 160 ? 'lb-campo-error' : ''}>{form.seo_descripcion.length}/160 recomendado</small>
                </label>

                <label className="lb-field ancho-total">
                  <span>Palabras clave</span>
                  <input
                    value={form.seo_keywords}
                    onChange={e => handleChange('seo_keywords', e.target.value)}
                    placeholder="Separadas por coma: ropa, verano, ofertas"
                    maxLength={300}
                  />
                </label>
              </div>

              <header className="lb-section-head separada">
                <h2>Imagen para compartir</h2>
                <p>La que se ve al pegar el link en WhatsApp, Facebook o Twitter. Sin una propia, se usa la del banner.</p>
              </header>

              <div className="lb-banner-imagen">
                {landing?.seo_og_imagen ? (
                  <div className="lb-banner-preview">
                    <img src={getMediaUrl(landing.seo_og_imagen)} alt="Imagen para compartir" />
                    <button type="button" className="lb-banner-quitar" onClick={quitarSeoImagen} disabled={subiendoSeoImagen}>
                      {subiendoSeoImagen ? <Loader size={13} className="spin-icon" /> : <Trash2 size={13} />} Quitar
                    </button>
                  </div>
                ) : landing?.banner_imagen ? (
                  <div className="lb-banner-preview heredada">
                    <img src={getMediaUrl(landing.banner_imagen)} alt="Usando la del banner" />
                    <span className="lb-banner-heredada-tag">Usando la del banner</span>
                    <label className="lb-banner-quitar como-boton">
                      {subiendoSeoImagen ? <Loader size={13} className="spin-icon" /> : <ImagePlus size={13} />} Subir una distinta
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleSeoImagenFile} disabled={subiendoSeoImagen} hidden />
                    </label>
                  </div>
                ) : (
                  <label className="lb-banner-upload">
                    {subiendoSeoImagen ? <Loader size={20} className="spin-icon" /> : <ImagePlus size={20} />}
                    <span>{subiendoSeoImagen ? 'Subiendo...' : 'Subir imagen'}</span>
                    <small>JPG, PNG o WebP · hasta 1MB</small>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleSeoImagenFile} disabled={subiendoSeoImagen} hidden />
                  </label>
                )}
              </div>

              <header className="lb-section-head separada">
                <h2>Así se ve en Google</h2>
              </header>
              <div className="lb-seo-snippet">
                <span className="lb-seo-snippet-url">{urlPublica || 'https://tutienda.gesicomm.com'}</span>
                <span className="lb-seo-snippet-titulo">{(form.seo_titulo || form.titulo || form.nombre || 'Título de tu landing').slice(0, 70)}</span>
                <span className="lb-seo-snippet-desc">{(form.seo_descripcion || form.descripcion || 'Agregá una descripción para que se vea acá.').slice(0, 170)}</span>
              </div>
            </div>
          )}

          {paso === 'estadisticas' && (
            <div className="lb-section">
              <header className="lb-section-head">
                <h2>Estadísticas</h2>
                <p>Visitas y conversaciones de WhatsApp generadas desde esta landing.</p>
              </header>

              {!landing?.id ? (
                <div className="lb-empty">
                  <BarChart3 size={30} opacity={0.3} />
                  <p>Guardá la landing para empezar a ver estadísticas.</p>
                </div>
              ) : (
                <EstadisticasPanel landingId={landing.id} />
              )}
            </div>
          )}

          {paso === 'publicar' && (
            <div className="lb-section">
              <header className="lb-section-head">
                <h2>Publicación</h2>
                <p>Mientras esté en borrador, el link no muestra productos a nadie.</p>
              </header>

              <div className="lb-publicar">
                <div className="lb-publicar-estado">
                  <span className={`lb-estado grande ${publicada ? 'on' : 'off'}`}>
                    <span className="lb-estado-dot" />
                    {publicada ? 'Publicada' : 'Borrador'}
                  </span>
                  {landing?.updated_at && <small>Última edición {tiempoRelativo(landing.updated_at)}</small>}
                </div>

                <div className="lb-checklist">
                  {[
                    [completado.info, 'Tiene nombre'],
                    [completado.productos, `Tiene productos (${seleccion.size})`],
                    [!!landing, 'Está guardada'],
                  ].map(([ok, texto]) => (
                    <span key={texto} className={`lb-check-item ${ok ? 'ok' : ''}`}>
                      {ok ? <Check size={12} strokeWidth={3} /> : <span className="lb-check-vacio" />}
                      {texto}
                    </span>
                  ))}
                </div>

                {urlPublica ? (
                  <div className="lb-url">
                    <code>{urlPublica}</code>
                    <button type="button" className="land-icon-btn" onClick={copiarLink} title="Copiar link">
                      {copiado ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                    <a href={urlPublica} target="_blank" rel="noreferrer" className="land-icon-btn" title="Abrir">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ) : (
                  <p className="lb-hint">La URL pública se define cuando guardes la landing.</p>
                )}

                <Link to="/mi-tienda" className="lb-btn-ghost lb-dominio-link">
                  <Globe size={13} /> ¿Querés usar tu propio dominio en vez de gesicomm.com? Configuralo en Mi tienda
                </Link>

                <div className="lb-publicar-acciones">
                  <button type="button" className="lb-btn-secondary" onClick={handleGuardar} disabled={ocupado}>
                    {guardando ? <Loader size={14} className="spin-icon" /> : <Save size={14} />}
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    className={publicada ? 'lb-btn-warn' : 'lb-btn-primary'}
                    onClick={togglePublicar}
                    disabled={ocupado || seleccion.size === 0}
                  >
                    {publicando ? <Loader size={14} className="spin-icon" /> : (publicada ? <PowerOff size={14} /> : <Power size={14} />)}
                    {publicada ? 'Despublicar' : 'Publicar ahora'}
                  </button>
                </div>

                {landing?.id && (
                  <div className="lb-zona-peligro">
                    <div>
                      <strong>Eliminar landing</strong>
                      <small>Se borra todo — productos elegidos, banner, diseño. Tu tienda queda sin landing hasta que crees una nueva.</small>
                    </div>
                    <button type="button" className="lb-btn-danger" onClick={eliminarLanding} disabled={ocupado}>
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {previewVisible && (
          <aside className="lb-preview-col">
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
              mostrarTestimonios={form.mostrar_testimonios}
              testimonios={testimonios}
              mostrarFaq={form.mostrar_faq}
              faqs={faqs}
            />
          </aside>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDespublicar}
        title="¿Despublicar esta landing?"
        description="Si tenés anuncios o links compartidos apuntando acá, van a dejar de mostrar productos."
        confirmLabel="Despublicar"
        danger
        loading={publicando}
        onConfirm={confirmarDespublicar}
        onCancel={() => setConfirmDespublicar(null)}
      />

      <ConfirmDialog
        open={confirmEliminar}
        title={`¿Eliminar "${landing?.nombre}"?`}
        description="No se puede deshacer, y tu tienda va a quedar sin landing hasta que crees una nueva."
        confirmLabel="Eliminar"
        danger
        loading={guardando}
        onConfirm={confirmarEliminarLanding}
        onCancel={() => setConfirmEliminar(false)}
      />
    </div>
  );
}
