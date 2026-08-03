import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Save, Loader, AlertCircle, Check, Copy, ExternalLink, Eye, EyeOff,
  FileText, LayoutGrid, SlidersHorizontal, Rocket, Palette, MessageCircle,
  Power, PowerOff, CircleAlert, ImagePlus, Trash2, Sun, Moon, Search, BarChart3, Globe,
} from 'lucide-react';
import { landingService } from '../../services/landingService';
import { vitrinaService } from '../../services/vitrinaService';
import { tiendaService } from '../../services/tiendaService';
import { getMediaUrl } from '../../services/api';
import ProductPicker from './ProductPicker';
import LandingPreview from './LandingPreview';
import EstadisticasPanel from './EstadisticasPanel';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../vitrina/vitrina.css';
import './landing.css';

const MAX_ITEMS = 40;
const MAX_IMAGEN_BYTES = 1024 * 1024;

const PASOS = [
  { id: 'info', label: 'Información', icono: FileText, descripcion: 'Nombre, título y URL' },
  { id: 'productos', label: 'Productos', icono: LayoutGrid, descripcion: 'Qué vas a mostrar' },
  { id: 'diseno', label: 'Diseño', icono: Palette, descripcion: 'Banner, colores y tipografía' },
  { id: 'filtros', label: 'Filtros', icono: SlidersHorizontal, descripcion: 'Navegación y WhatsApp' },
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
  radio_bordes: 'mediano',
  fuente: 'outfit',
  mostrar_whatsapp: true,
  whatsapp_incluir_precio: false,
  whatsapp_incluir_url: false,
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
          radio_bordes: guardada.radio_bordes || 'mediano',
          fuente: guardada.fuente || 'outfit',
          mostrar_whatsapp: guardada.mostrar_whatsapp !== false,
          whatsapp_incluir_precio: !!guardada.whatsapp_incluir_precio,
          whatsapp_incluir_url: !!guardada.whatsapp_incluir_url,
          seo_titulo: guardada.seo_titulo || '',
          seo_descripcion: guardada.seo_descripcion || '',
          seo_keywords: guardada.seo_keywords || '',
        });
        const mapa = new Map();
        [...(guardada.items || [])]
          .sort((a, b) => a.orden - b.orden)
          .forEach(item => {
            mapa.set(claveItem(item.tipo, item.referencia_id), {
              tipo: item.tipo,
              referencia_id: item.referencia_id,
              etiqueta: item.etiqueta || '',
            });
          });
        setSeleccion(mapa);
      }
      setSucio(false);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la información.');
    } finally {
      setCargando(false);
    }
  }, [id, esEdicion]);

  useEffect(() => { cargar(); }, [cargar]);

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
  // guardado todavía. "/l" (no la raíz sin path) porque ahí es donde
  // Nginx decide bot-vs-humano — ver deploy/nginx/tiendas.gesicomm.com y
  // routes/landingHtml.js.
  const urlPublica = useMemo(() => (
    tienda ? `https://${tienda.subdominio}.gesicomm.com/l` : null
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
    seo: true,
    publicar: publicada,
  };

  /* ─── Mutadores ──────────────────────────────────────────────────────── */

  function handleChange(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setSucio(true);
  }

  function toggleItem(item) {
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
    const clave = claveItem(item.tipo, item.id);
    setSeleccion(prev => {
      if (!prev.has(clave)) return prev;
      const copia = new Map(prev);
      copia.set(clave, { ...copia.get(clave), etiqueta });
      return copia;
    });
    setSucio(true);
  }

  function reordenar(desde, hasta) {
    setSeleccion(prev => {
      const entradas = Array.from(prev.entries());
      const [movida] = entradas.splice(desde, 1);
      entradas.splice(hasta, 0, movida);
      return new Map(entradas);
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
    };
  }

  /** @returns {object|null} la landing guardada, o null si falló. */
  async function guardar() {
    setError(null);
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
        <div className="land-alert-error">
          <span><AlertCircle size={14} /> {error}</span>
          {erroresValidacion.length > 0 && (
            <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>
          )}
        </div>
      )}

      {hayNoDisponibles && (
        <div className="lb-alert-warn">
          <CircleAlert size={14} />
          Hay productos que ya no están en tu catálogo. No se muestran en la landing pública —
          quitalos en <strong>Productos → Orden y etiquetas</strong>.
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
                      <small>JPG, PNG o WebP · hasta 1MB</small>
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
                <div className="lb-field">
                  <span>Color principal</span>
                  <div className="lb-color-opciones">
                    <button
                      type="button"
                      className={`lb-color-opcion ${!form.color_primario ? 'active' : ''}`}
                      onClick={() => handleChange('color_primario', '')}
                    >
                      <span className="lb-swatch" style={{ background: tienda?.color_primario || '#10b981' }} />
                      Heredado
                    </button>
                    <label className={`lb-color-opcion ${form.color_primario ? 'active' : ''}`}>
                      <input
                        type="color"
                        value={form.color_primario || tienda?.color_primario || '#10b981'}
                        onChange={e => handleChange('color_primario', e.target.value)}
                      />
                      Personalizado
                    </label>
                  </div>
                </div>

                <div className="lb-field">
                  <span>Color de fondo</span>
                  <div className="lb-color-opciones">
                    <button
                      type="button"
                      className={`lb-color-opcion ${!form.color_fondo ? 'active' : ''}`}
                      onClick={() => handleChange('color_fondo', '')}
                    >
                      <span className="lb-swatch" style={{ background: fondoHeredado }} />
                      Heredado
                    </button>
                    <label className={`lb-color-opcion ${form.color_fondo ? 'active' : ''}`}>
                      <input
                        type="color"
                        value={form.color_fondo || fondoHeredado}
                        onChange={e => handleChange('color_fondo', e.target.value)}
                      />
                      Personalizado
                    </label>
                  </div>
                </div>
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
