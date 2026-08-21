import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { productService } from '../../services/productService';
import { getMediaUrl } from '../../services/api';
import { categoriaService } from '../../services/catalogoService';
import { comboAdminService } from '../../services/comboAdminService';
import { proveedoresService } from '../../services/costosGastosService';
import { verificarSesion } from '../../utils/auth';
import { calcularPrincipal, simularDescuentosPrincipal } from '../../utils/comboPricingLocal';
import CurrencyInput from '../../components/CurrencyInput';
import OfertasProductoTab from './OfertasProductoTab';
import FaqPanel from '../landing-simple/panels/FaqPanel';
import {
  Package, ChevronLeft, Save, Plus, Trash2, Upload,
  Star, X, Info, DollarSign, BarChart2, Image as ImageIcon, Tag, Activity, Monitor,
  Settings, Layers, HelpCircle
} from 'lucide-react';
import './productos.css';
import '../combos/combos.css'; // Reutilizar estilos de métricas de combos

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtGs(n)  { return n !== null && n !== undefined ? 'Gs ' + fmt(n) : '—'; }
function fmtPct(n) { return n !== null && n !== undefined ? (Number(n) * 100).toFixed(2) + '%' : '—'; }

const TABS = [
  { id: 'general',  label: 'General', icon: <Package size={15} /> },
  { id: 'precio',  label: 'Precio', icon: <DollarSign size={15} /> },
  { id: 'inventario', label: 'Inventario', icon: <BarChart2 size={15} /> },
  { id: 'variantes', label: 'Variantes', icon: <Layers size={15} /> },
  { id: 'multimedia', label: 'Multimedia', icon: <ImageIcon size={15} /> },
  { id: 'faq', label: 'Todo lo que necesitas saber', icon: <HelpCircle size={15} /> },
  { id: 'ofertas',  label: 'Ofertas comerciales', icon: <Tag size={15} /> },
  { id: 'configuracion', label: 'Configuración', icon: <Settings size={15} /> },
  // NO re-agregar una pestaña que apunte a /mi-landing: ese editor
  // (FunnelSelector + MerchantEditor + page-builder) está deprecado. El
  // funnel vive en su propio módulo, ver pages/funnel/.
];

const ESTADOS_VENTA = [
  { value: 'en_venta',       label: '🟢 En venta',         desc: 'Visible y disponible para comprar' },
  { value: 'fuera_de_stock', label: '🟡 Fuera de stock',   desc: 'Visible, pero no se puede comprar' },
  { value: 'no_disponible',  label: '🔴 No disponible',    desc: 'No aparece en la tienda' },
];

const ESTADO_VENTA_LABELS = {
  en_venta: 'En venta',
  fuera_de_stock: 'Fuera de stock',
  no_disponible: 'No disponible',
};

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [tabActiva, setTabActiva] = useState('general');

  // Permite abrir directo en una pestaña (ej. desde "Abrir ofertas del
  // producto" en el wizard de campañas) sin filtrar nada por la URL — el
  // payload viaja por sessionStorage (se copia a la pestaña nueva por ser
  // same-origin) y se consume una sola vez, nunca queda en el link.
  // Tiene que ir en un efecto, no en el inicializador de useState: bajo
  // StrictMode React ejecuta el inicializador dos veces en un render que
  // después descarta, y la segunda pasada ya encuentra el sessionStorage
  // vacío (lo borró la primera) — el efecto sí es seguro porque corre
  // sobre el árbol ya commiteado.
  useEffect(() => {
    const payload = sessionStorage.getItem('gesicomm:tabInicial');
    if (!payload) return;
    sessionStorage.removeItem('gesicomm:tabInicial');
    if (TABS.some(t => t.id === payload)) setTabActiva(payload);
  }, []);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(esEdicion);
  const [error, setError] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [guardandoProveedor, setGuardandoProveedor] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [faq, setFaq] = useState([]);
  const [imagenesNuevas, setImagenesNuevas] = useState([]); // Para imágenes en cola (nuevo prod)
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [tieneVariantes, setTieneVariantes] = useState(false);
  const [descuentoSimulado, setDescuentoSimulado] = useState(0);
  const [mostrarDetalleEscenarios, setMostrarDetalleEscenarios] = useState(false);
  const [config, setConfig] = useState(null);
  const [cotizacionUsd, setCotizacionUsd] = useState('');
  const [usuarioActual, setUsuarioActual] = useState(null);
  const esAdmin = usuarioActual?.rol === 'administrador';

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      nombre: '',
      categoria_id: '',
      proveedor_id: '',
      sku: '',
      descripcion_corta: '',
      descripcion_larga: '',
      faq_titulo: '',
      tags: '',
      precio_base: '',
      precio_costo: '',
      precio_dolar: '',
      precio_ancla: '',
      precio_minimo: '',
      descuento_porcentaje: '',
      descuento_inicio: '',
      descuento_fin: '',
      impuestos_incluidos: true,
      cantidad_disponible: 0,
      stock_minimo: 0,
      unidad_medida: 'unidad',
      activo: true,
      estado_venta: 'en_venta',
      destacado: false,
      variantes: [],
    },
  });

  // keyName custom: por default react-hook-form usa "id" como su propia key
  // interna y PISA el id real de la variante (viene de la base de datos) con
  // un uuid generado — sin esto, el backend no puede saber qué fila es una
  // variante existente a actualizar vs. una nueva a crear.
  const { fields: variantesFields, append: appendVariante, remove: removeVariante, replace: replaceVariantes } =
    useFieldArray({ control, name: 'variantes', keyName: '_rhfKey' });

  const nombre = watch('nombre');

  // ── Cargar datos ──────────────────────────────────────────
  // Todo en una sola oleada de Promise.all: ninguna de estas 5 llamadas
  // depende del resultado de otra (todas solo necesitan el `id` de la URL),
  // así que esperar a que termine categorías+config antes de recién pedir
  // el producto (dos oleadas secuenciales) solo duplicaba la latencia sin
  // necesidad — medido ~2x más lento que pedirlas todas juntas.
  useEffect(() => {
    const init = async () => {
      const [catData, conf, p, vars, imgs, provData, faqData] = await Promise.all([
        categoriaService.buscar({ solo_activas: true, limit: 1000 }),
        comboAdminService.obtenerConfiguracion().catch(() => null),
        esEdicion ? productService.detalle(id).catch(() => null) : Promise.resolve(null),
        esEdicion ? productService.variantes(id).catch(() => []) : Promise.resolve([]),
        esEdicion ? productService.imagenes(id).catch(() => []) : Promise.resolve([]),
        proveedoresService.buscar({}).catch(() => ({ proveedores: [] })),
        esEdicion ? productService.faq(id).catch(() => []) : Promise.resolve([]),
      ]);
      setCategorias(catData.categorias || catData);
      setProveedores(provData.proveedores || provData || []);
      if (conf) setConfig(conf);

      if (esEdicion) {
        try {
          if (!p) throw new Error('No se pudo cargar el producto.');
          reset({
            nombre: p.nombre || '',
            categoria_id: p.categoria_id || '',
            proveedor_id: p.proveedor_id || '',
            sku: p.sku || '',
            descripcion_corta: p.descripcion_corta || '',
            descripcion_larga: p.descripcion_larga || '',
            faq_titulo: p.faq_titulo || '',
            tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
            precio_base: p.precio_base || '',
            precio_costo: p.precio_costo || '',
            precio_dolar: p.precio_dolar || '',
            precio_ancla: p.precio_ancla ?? p.precio_tachado ?? '',
            precio_minimo: p.precio_minimo || '',
            descuento_porcentaje: p.descuento_porcentaje || '',
            descuento_inicio: p.descuento_inicio ? p.descuento_inicio.slice(0, 10) : '',
            descuento_fin: p.descuento_fin ? p.descuento_fin.slice(0, 10) : '',
            impuestos_incluidos: p.impuestos_incluidos,
            cantidad_disponible: p.cantidad_disponible || 0,
            stock_minimo: p.stock_minimo || 0,
            unidad_medida: p.unidad_medida || 'unidad',
            activo: p.activo,
            estado_venta: p.estado_venta || 'en_venta',
            destacado: p.destacado,
            variantes: vars?.length ? vars : [],
          });
          if (vars?.length > 0) setTieneVariantes(true);
          setImagenes(imgs || []);
          setFaq(Array.isArray(faqData) ? faqData.map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta })) : []);
        } catch {
          setError('No se pudo cargar el producto.');
        } finally {
          setCargando(false);
        }
      }
    };
    init();
  }, [id]);

  useEffect(() => {
    verificarSesion().then((res) => setUsuarioActual(res)).catch(() => setUsuarioActual(null));
  }, []);

  // ── Rentabilidad Reactiva ─────────────────────────────────
  const precioBaseVal = parseFloat(watch('precio_base')) || 0;
  const precioCostoVal = parseFloat(watch('precio_costo')) || 0;
  const descuentoPctVal = parseFloat(watch('descuento_porcentaje')) || 0;
  const precioAnclaVal = parseFloat(watch('precio_ancla')) || 0;

  const rentabilidad = React.useMemo(() => {
    if (!config) return null;

    // El CPA y los costos totales se calculan siempre sobre el precio base,
    // igual que en combos y en la plantilla original: el CPA no depende del
    // descuento que se aplique (es el costo de adquisición, no de venta).
    const result = calcularPrincipal({ salePrice: precioBaseVal, cost: precioCostoVal }, {
      cpaPercentage: Number(config.cpa_porcentaje) || 0,
      shipping: Number(config.costo_envio) || 0,
      confirmation: Number(config.costo_confirmacion) || 0,
      packaging: Number(config.costo_empaque) || 0
    });

    // Precio de venta real con el descuento actual aplicado: la utilidad y el
    // margen se recalculan sobre este precio, pero contra los costos totales
    // fijos de arriba (mismo criterio que el simulador de descuentos).
    const finalPrice = precioBaseVal * (1 - (descuentoPctVal / 100));
    const profit = finalPrice - result.totalCosts;
    const margin = finalPrice > 0 ? profit / finalPrice : 0;

    // Simulamos sobre el precio base completo, usando los mismos escenarios de
    // descuento configurados en Configuración económica de combos — antes esto
    // tenía [0,10,20,30,40] hardcodeado, ignorando lo que se configure ahí.
    const escenarios = Array.isArray(config.escenarios_descuento) && config.escenarios_descuento.length > 0
      ? config.escenarios_descuento
      : [0, 10, 20, 30, 40];
    const simulador = simularDescuentosPrincipal(precioBaseVal, result.totalCosts, escenarios);

    return { ...result, finalPrice, profit, margin, simulador };
  }, [precioBaseVal, precioCostoVal, descuentoPctVal, config]);

  // ── Submit ────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        nombre: data.nombre.trim(),
        categoria_id: data.categoria_id || null,
        proveedor_id: data.proveedor_id || null,
        sku: data.sku || null,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        descripcion_corta: data.descripcion_corta || null,
        descripcion_larga: data.descripcion_larga || null,
        faq_titulo: data.faq_titulo || null,
        faq: faq
          .filter(f => f.pregunta?.trim() && f.respuesta?.trim())
          .map((f, idx) => ({ pregunta: f.pregunta.trim(), respuesta: f.respuesta.trim(), orden: idx })),
        precio_base: parseFloat(data.precio_base),
        precio_costo: data.precio_costo ? parseFloat(data.precio_costo) : null,
        precio_dolar: data.precio_dolar ? parseFloat(data.precio_dolar) : null,
        precio_ancla: data.precio_ancla ? parseFloat(data.precio_ancla) : null,
        precio_minimo: data.precio_minimo ? parseFloat(data.precio_minimo) : null,
        descuento_porcentaje: data.descuento_porcentaje ? parseFloat(data.descuento_porcentaje) : 0,
        descuento_inicio: data.descuento_inicio || null,
        descuento_fin: data.descuento_fin || null,
        impuestos_incluidos: data.impuestos_incluidos,
        cantidad_disponible: parseInt(data.cantidad_disponible) || 0,
        stock_minimo: parseInt(data.stock_minimo) || 0,
        unidad_medida: data.unidad_medida,
        activo: data.activo,
        estado_venta: data.estado_venta,
        destacado: data.destacado,
        variantes: data.variantes.map(v => ({
          ...v,
          stock: parseInt(v.stock) || 0,
          precio_diferencial: v.precio_diferencial ? parseFloat(v.precio_diferencial) : 0,
        })),
      };

      if (esEdicion) {
        await productService.actualizar(id, payload);
        for (const file of imagenesNuevas.map(i => i.file)) {
          const fd = new FormData();
          fd.append('imagen', file);
          await productService.subirImagen(id, fd);
        }
        navigate('/products');
      } else {
        const nuevo = await productService.crear(payload);
        for (const imgObj of imagenesNuevas) {
          try {
            const fd = new FormData();
            fd.append('imagen', imgObj.file);
            await productService.subirImagen(nuevo.id, fd);
          } catch (e) {
            console.error('Error subiendo imagen', e);
          }
        }
        navigate('/products');
      }
    } catch (err) {
      const errores = err.response?.data?.errores;
      const msg = errores
        ? errores.join('\n')
        : (err.response?.data?.message || 'Error al guardar el producto.');
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  // ── Imágenes ──────────────────────────────────────────────
  const MAX_IMAGEN_BYTES = 1 * 1024 * 1024; // 1MB en total

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const totalActual = imagenes.length + imagenesNuevas.length;
    if (totalActual + files.length > 6) {
      setError(`Solo se permiten hasta 6 imágenes por producto. Tienes ${totalActual} y estás intentando subir ${files.length} más.`);
      e.target.value = '';
      return;
    }

    let pesoTotalNuevas = files.reduce((acc, file) => acc + file.size, 0);
    if (!esEdicion) {
      pesoTotalNuevas += imagenesNuevas.reduce((acc, img) => acc + img.file.size, 0);
    }

    if (pesoTotalNuevas > MAX_IMAGEN_BYTES) {
      setError(`El peso total de las imágenes (nuevas) supera 1MB. Peso actual: ${(pesoTotalNuevas / 1024 / 1024).toFixed(2)}MB.`);
      e.target.value = '';
      return;
    }

    if (!esEdicion) {
      const nuevasPreview = files.map((file, idx) => ({
        id: Date.now() + idx,
        file,
        url: URL.createObjectURL(file),
        es_principal: (imagenesNuevas.length === 0 && idx === 0)
      }));
      setImagenesNuevas(imgs => [...imgs, ...nuevasPreview]);
      e.target.value = '';
      return;
    }

    setSubiendoImg(true);
    setError(null);
    let subidas = [];
    let errores = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('imagen', file);
        const nueva = await productService.subirImagen(id, fd);
        subidas.push(nueva);
      } catch (err) {
        errores.push(err.response?.data?.message || `Error al subir la imagen.`);
      }
    }
    
    if (subidas.length > 0) {
      setImagenes(imgs => [...imgs, ...subidas]);
    }
    if (errores.length > 0) {
      setError(errores.join('\n'));
    }

    setSubiendoImg(false);
    e.target.value = '';
  };

  const eliminarImagen = async (imgId, esNueva = false) => {
    if (esNueva) {
      setImagenesNuevas(imgs => imgs.filter(i => i.id !== imgId));
      return;
    }
    try {
      await productService.eliminarImagen(id, imgId);
      setImagenes(imgs => imgs.filter(i => i.id !== imgId));
    } catch { setError('Error al eliminar imagen.'); }
  };

  const marcarPrincipal = async (imgId) => {
    try {
      await productService.actualizarImagen(id, imgId, { es_principal: true });
      setImagenes(imgs => imgs.map(i => ({ ...i, es_principal: i.id === imgId })));
    } catch { setError('Error al actualizar imagen.'); }
  };

  const handleCrearCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    setGuardandoCategoria(true);
    try {
      const res = await categoriaService.crear({ nombre: nuevaCategoria.trim(), activo: true });
      setCategorias(prev => [...prev, res]);
      setValue('categoria_id', res.id);
      setCreandoCategoria(false);
      setNuevaCategoria('');
    } catch (err) {
      setError('Error al crear categoría: ' + (err.response?.data?.message || err.message));
    } finally {
      setGuardandoCategoria(false);
    }
  };

  const handleCrearProveedor = async () => {
    if (!nuevoProveedor.trim()) return;
    setGuardandoProveedor(true);
    try {
      const res = await proveedoresService.crear({ nombre: nuevoProveedor.trim() });
      setProveedores(prev => [...prev, res]);
      setValue('proveedor_id', res.id);
      setCreandoProveedor(false);
      setNuevoProveedor('');
    } catch (err) {
      setError('Error al crear proveedor: ' + (err.response?.data?.message || err.message));
    } finally {
      setGuardandoProveedor(false);
    }
  };

  const stockActualVal = parseInt(watch('cantidad_disponible'), 10) || 0;
  const stockMinimoVal = parseInt(watch('stock_minimo'), 10) || 0;
  const unidadVal = watch('unidad_medida') || 'unidad';
  const estadoVentaVal = watch('estado_venta') || 'en_venta';
  const activoVal = watch('activo');
  const destacadoVal = watch('destacado');
  const tagsVal = watch('tags') || '';
  const precioFinalVal = precioBaseVal * (1 - (descuentoPctVal / 100));
  const gananciaSimpleVal = precioFinalVal - precioCostoVal;
  const margenSimpleVal = precioFinalVal > 0 ? gananciaSimpleVal / precioFinalVal : 0;
  const stockRatio = stockMinimoVal > 0
    ? Math.min(100, (stockActualVal / Math.max(stockMinimoVal * 2, 1)) * 100)
    : (stockActualVal > 0 ? 100 : 0);
  const stockEstadoTexto = stockActualVal <= 0
    ? 'Agotado'
    : (stockMinimoVal > 0 && stockActualVal <= stockMinimoVal ? 'Stock bajo' : 'Stock saludable');
  const categoriaActual = categorias.find(c => String(c.id) === String(watch('categoria_id')));
  const estadoVentaActual = ESTADOS_VENTA.find(e => e.value === estadoVentaVal) || ESTADOS_VENTA[0];
  const imagenPrincipal = [...imagenes].sort((a, b) => a.orden - b.orden).find(img => img.es_principal)
    || imagenes[0]
    || imagenesNuevas.find(img => img.es_principal)
    || imagenesNuevas[0];
  const imagenPrincipalUrl = imagenPrincipal?.url ? getMediaUrl(imagenPrincipal.url) : null;

  if (cargando) return (
    <div className="prod-page"><div className="prod-loading"><div className="spinner" /></div></div>
  );

  return (
    <div className="prod-page">

      <div className="prod-header">
        <div className="prod-header-left">
          <button className="btn-back" onClick={() => navigate('/products')}
            type="button" aria-label="Volver al listado">
            <ChevronLeft size={18} />
          </button>
          <div className="prod-icon-wrap"><Package size={22} /></div>
          <div>
            <h1 className="prod-title">{esEdicion ? 'Editar producto' : 'Nuevo producto'}</h1>
            {esEdicion && <p className="prod-subtitle">ID #{id}</p>}
          </div>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={guardando}
        >
          <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {error && (
        <div className="form-error-banner" role="alert">
          <Info size={15} />
          <span style={{ flex: 1, whiteSpace: 'pre-line' }}>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar error">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="prod-tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tabActiva === tab.id}
            className={`prod-tab ${tabActiva === tab.id ? 'active' : ''}`}
            onClick={() => setTabActiva(tab.id)}
            type="button"
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="prod-form prod-workspace" noValidate>
        <div className="prod-workspace-main">

        <div className={`tab-content ${tabActiva === 'general' ? 'active' : ''}`}>
          <div className="form-grid-2">
            <div className="form-group full">
              <label htmlFor="prod-nombre">Nombre <span className="req">*</span></label>
              <input
                id="prod-nombre"
                {...register('nombre', { required: 'El nombre es requerido.' })}
                placeholder="Ej: Remera básica azul"
              />
              {errors.nombre && <span className="field-error">{errors.nombre.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="prod-categoria">Categoría</label>
              {creandoCategoria ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Nueva categoría..."
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    disabled={guardandoCategoria}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCrearCategoria();
                      }
                    }}
                  />
                  <button type="button" className="btn-primary" onClick={handleCrearCategoria} disabled={guardandoCategoria} style={{ padding: '0 10px' }}>
                    {guardandoCategoria ? '...' : <Save size={15}/>}
                  </button>
                  <button type="button" className="btn-icon danger" onClick={() => { setCreandoCategoria(false); setNuevaCategoria(''); }} disabled={guardandoCategoria}>
                    <X size={15}/>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select id="prod-categoria" {...register('categoria_id')} style={{ flex: 1 }}>
                    <option value="">Sin categoría</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button type="button" className="btn-icon" onClick={() => setCreandoCategoria(true)} title="Crear nueva categoría">
                    <Plus size={16}/>
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="prod-proveedor">Proveedor</label>
              {creandoProveedor ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Nuevo proveedor..."
                    value={nuevoProveedor}
                    onChange={(e) => setNuevoProveedor(e.target.value)}
                    disabled={guardandoProveedor}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCrearProveedor();
                      }
                    }}
                  />
                  <button type="button" className="btn-primary" onClick={handleCrearProveedor} disabled={guardandoProveedor} style={{ padding: '0 10px' }}>
                    {guardandoProveedor ? '...' : <Save size={15}/>}
                  </button>
                  <button type="button" className="btn-icon danger" onClick={() => { setCreandoProveedor(false); setNuevoProveedor(''); }} disabled={guardandoProveedor}>
                    <X size={15}/>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select id="prod-proveedor" {...register('proveedor_id')} style={{ flex: 1 }}>
                    <option value="">Sin proveedor</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button type="button" className="btn-icon" onClick={() => setCreandoProveedor(true)} title="Crear nuevo proveedor">
                    <Plus size={16}/>
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="prod-tags">
                Tags <span className="hint">(separados por coma)</span>
              </label>
              <input
                id="prod-tags"
                {...register('tags')}
                placeholder="verano, oferta, nuevo"
              />
            </div>

            <div className="form-group full">
              <label htmlFor="prod-desc-corta">
                Descripción corta <span className="hint">(para listados)</span>
              </label>
              <input
                id="prod-desc-corta"
                {...register('descripcion_corta')}
                maxLength={500}
                placeholder="Breve descripción del producto..."
              />
            </div>

            <div className="form-group full">
              <label htmlFor="prod-desc-larga">
                Descripción <span className="hint">(detalle completo)</span>
              </label>
              <textarea
                id="prod-desc-larga"
                {...register('descripcion_larga')}
                rows={5}
                placeholder="Descripción detallada del producto..."
              />
            </div>
          </div>

        </div>

        <div className={`tab-content ${tabActiva === 'precio' ? 'active' : ''}`}>
          {esAdmin && (
            <div className="form-group" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8 }}>
              <label htmlFor="prod-precio-dolar">
                Precio de compra en USD <span className="hint">(costo del proveedor, solo admins)</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Controller
                  name="precio_dolar"
                  control={control}
                  render={({ field }) => (
                    <input
                      id="prod-precio-dolar"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ej: 14.08"
                      style={{ padding: '0.6rem', width: 140 }}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <span style={{ opacity: 0.6 }}>×</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Cotización Gs/USD"
                  style={{ padding: '0.6rem', width: 160 }}
                  value={cotizacionUsd}
                  onChange={(e) => setCotizacionUsd(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const dolar = parseFloat(watch('precio_dolar'));
                    const cot = parseFloat(cotizacionUsd);
                    if (!dolar || !cot) return;
                    const costo = Math.round(dolar * cot);
                    setValue('precio_costo', costo, { shouldDirty: true });
                    setValue('precio_base', Math.round(costo * 1.1), { shouldDirty: true });
                  }}
                >
                  Recalcular con cotización
                </button>
              </div>
              <p className="field-hint">
                Guarda el costo en dólares para poder recalcular precio de compra y venta (margen 10%) el día que cambie la cotización, sin tener que volver a cargar el producto.
              </p>
            </div>
          )}
          <div className={esAdmin ? 'form-grid-3' : 'form-grid-2'}>
                        <div className="form-group">
              <label htmlFor="prod-precio-costo">
                Precio de compra del producto {esAdmin && <span className="hint">(solo admins)</span>}
              </label>
              <div className="input-prefix" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                <Controller
                  name="precio_costo"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="prod-precio-costo"
                      className="w-full"
                      style={{ padding: '0.6rem' }}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="prod-precio-base">
                {esAdmin ? 'Precio de Venta Para las Tiendas' : 'Precio de venta a las personas'} <span className="req">*</span>
              </label>
              <div className="input-prefix" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                <Controller
                  name="precio_base"
                  control={control}
                  rules={{ required: 'El precio base es requerido.', min: { value: 0, message: 'El precio no puede ser negativo.' } }}
                  render={({ field }) => (
                    <CurrencyInput
                      id="prod-precio-base"
                      className="w-full"
                      style={{ padding: '0.6rem' }}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
              {errors.precio_base && <span className="field-error">{errors.precio_base.message}</span>}
            </div>


            {esAdmin && (
            <div className="form-group">
              <label htmlFor="prod-precio-minimo">Precio mínimo de Venta Para las Tiendas</label>
              <div className="input-prefix" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                <Controller
                  name="precio_minimo"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="prod-precio-minimo"
                      className="w-full"
                      style={{ padding: '0.6rem' }}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
              <p className="field-hint">El precio con descuento no puede caer por debajo de este valor.</p>
            </div>
            )}
          </div>

          <div className="commercial-summary">
            <div>
              <span>Precio final</span>
              <strong>{fmtGs(precioFinalVal)}</strong>
            </div>
            <div>
              <span>Costo</span>
              <strong>{fmtGs(precioCostoVal)}</strong>
            </div>
            <div>
              <span>Ganancia</span>
              <strong className={gananciaSimpleVal >= 0 ? 'positive' : 'negative'}>{fmtGs(gananciaSimpleVal)}</strong>
            </div>
            <div>
              <span>Margen</span>
              <strong className={margenSimpleVal >= 0 ? 'positive' : 'negative'}>{fmtPct(margenSimpleVal)}</strong>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label htmlFor="prod-precio-ancla">
                Precio ancla <span className="hint">(referencia visible)</span>
              </label>
              <div className="input-prefix" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                <Controller
                  name="precio_ancla"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="prod-precio-ancla"
                      className="w-full"
                      style={{ padding: '0.6rem' }}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
              <p className="field-hint">Se usa como referencia de valor cuando el precio de venta queda por debajo.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {precioAnclaVal > 0 && precioBaseVal > 0 && precioAnclaVal > precioBaseVal && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.7rem 1rem', borderRadius: '0.5rem',
                  background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.3)',
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#f97316' }}>Descuento visible:</span>
                  <strong style={{ fontSize: '1.1rem', color: '#f97316' }}>
                    -{Math.round((1 - precioBaseVal / precioAnclaVal) * 100)}%
                  </strong>
                </div>
              )}
            </div>
          </div>

          <label className="check-label" style={{ marginTop: '0.5rem' }}>
            <input type="checkbox" {...register('impuestos_incluidos')} />
            Precio incluye IVA
          </label>

          <div className="form-section-title"><Tag size={14} /> Descuento</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="prod-descuento">Descuento (%)</label>
              <input
                id="prod-descuento"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
                {...register('descuento_porcentaje')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-desc-inicio">Vigencia desde</label>
              <input id="prod-desc-inicio" type="date" {...register('descuento_inicio')} />
            </div>
            <div className="form-group">
              <label htmlFor="prod-desc-fin">Vigencia hasta</label>
              <input id="prod-desc-fin" type="date" {...register('descuento_fin')} />
            </div>
          </div>
          <p className="field-hint">
            Este descuento se aplica de verdad en el checkout (mismo motor de precios que ve el cliente), no es solo informativo.
          </p>

          {config && rentabilidad && (() => {
            const sBase = rentabilidad;
            const targetMargin = Number(config.margen_minimo) / 100;
            const marginBase = sBase.margin;
            const utilityBase = sBase.profit;
            
            // Helper function to get margin health
            const getHealth = (m) => {
              if (m <= 0) return { label: '✕ Pérdida', class: 'negative', color: '#ef4444' };
              if (m < 0.15) return { label: '⚠ Margen crítico', class: 'negative', color: '#ef4444' };
              if (m < targetMargin) return { label: '⚠ Margen reducido', class: 'warning', color: '#f59e0b' };
              if (m >= 0.5) return { label: '✓ Excelente margen', class: 'positive', color: '#10b981' };
              return { label: '✓ Margen saludable', class: 'positive', color: '#10b981' };
            };

            const healthBase = getHealth(marginBase);

            // Calculate simulated
            const simulatedPrice = Math.round(precioBaseVal * (1 - (descuentoSimulado / 100)));
            const simulatedUtility = simulatedPrice - sBase.totalCosts;
            const simulatedMargin = simulatedPrice > 0 ? simulatedUtility / simulatedPrice : 0;
            const healthSimulated = getHealth(simulatedMargin);

            // Calculate break-even discount (where margin hits target)
            const minPriceTarget = sBase.totalCosts / (1 - targetMargin);
            const maxDiscountTarget = precioBaseVal > 0 ? Math.max(0, 1 - (minPriceTarget / precioBaseVal)) * 100 : 0;

            return (
              <div className="combo-section" style={{ marginTop: '2rem', background: 'transparent', padding: 0, border: 'none' }}>
                <h2 className="combo-section-title"><Activity size={16} /> Rentabilidad y descuentos</h2>
                <p className="combo-section-desc">
                  Base de simulación: Los descuentos comerciales se calculan sobre el precio base de <strong>{fmtGs(precioBaseVal)}</strong>. El precio actual del producto con tu descuento ({descuentoPctVal}%) es {fmtGs(sBase.finalPrice)}.
                  {' '}<Link to="/configuracion-economica">Editar costos operativos</Link>.
                </p>

                {/* 1. Resumen ejecutivo (3 tarjetas) */}
                <div className="combo-metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div className="combo-metric-card">
                    <span className="combo-metric-label">Precio Actual</span>
                    <span className="combo-metric-value">{fmtGs(sBase.finalPrice)}</span>
                  </div>
                  <div className={`combo-metric-card profit-${healthBase.class}`}>
                    <span className="combo-metric-label">Utilidad</span>
                    <span className="combo-metric-value">{fmtGs(utilityBase)}</span>
                  </div>
                  <div className={`combo-metric-card profit-${healthBase.class}`}>
                    <span className="combo-metric-label">Margen</span>
                    <span className="combo-metric-value">{fmtPct(marginBase)}</span>
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: healthBase.color, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {healthBase.label}.
                  {maxDiscountTarget > 0 && ` Podés aplicar hasta ${Math.floor(maxDiscountTarget)}% de descuento manteniendo un margen superior al ${(targetMargin*100).toFixed(0)}%.`}
                </div>

                {/* 2. Simulador (Number Input) */}
                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="form-section-title" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>SIMULAR DESCUENTO SOBRE PRECIO BASE</div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <input 
                      type="number"
                      min="0" max="100"
                      value={descuentoSimulado}
                      onChange={(e) => setDescuentoSimulado(Number(e.target.value))}
                      style={{ width: '80px', padding: '0.5rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--primary)' }}>%</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Precio final</div>
                      <div style={{ fontWeight: 'bold' }}>{fmtGs(simulatedPrice)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Utilidad</div>
                      <div style={{ fontWeight: 'bold', color: healthSimulated.color }}>{fmtGs(simulatedUtility)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Margen</div>
                      <div style={{ fontWeight: 'bold', color: healthSimulated.color }}>{fmtPct(simulatedMargin)}</div>
                    </div>
                  </div>

                  {descuentoSimulado > 0 && descuentoSimulado !== descuentoPctVal && (
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                      <button type="button" className="btn-primary" onClick={() => {
                        setValue('descuento_porcentaje', descuentoSimulado);
                      }}>
                        Aplicar este descuento
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Tabla Detalles Toggleable */}
                <div style={{ marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setMostrarDetalleEscenarios(!mostrarDetalleEscenarios)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                  >
                    {mostrarDetalleEscenarios ? '▴ Ocultar' : '▾ Ver escenarios detallados'}
                  </button>
                  
                  {mostrarDetalleEscenarios && (
                    <div style={{ overflowX: 'auto', marginTop: '1rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                      <table className="combo-sensitivity-table">
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Descuento</th>
                            <th className="text-right">Precio Final</th>
                            <th className="text-right">Utilidad Unitaria</th>
                            <th className="text-right">Margen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rentabilidad.simulador.map(sim => {
                            const h = getHealth(sim.margin);
                            return (
                              <tr key={sim.discountPercentage}>
                                <td>
                                  {sim.discountPercentage}% 
                                  {sim.discountPercentage === descuentoPctVal ? <span className="badge-primary" style={{marginLeft: '8px', fontSize: '10px'}}>ACTUAL</span> : null}
                                </td>
                                <td className="text-right">{fmtGs(sim.finalPrice)}</td>
                                <td className="text-right" style={{ color: h.color }}>{fmtGs(sim.profit)}</td>
                                <td className="text-right" style={{ color: h.color }}>{fmtPct(sim.margin)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        <div className={`tab-content ${tabActiva === 'inventario' ? 'active' : ''}`}>
          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="prod-stock">
                Cantidad disponible
                {tieneVariantes && <span className="hint"> (calculado)</span>}
              </label>
              <input
                id="prod-stock"
                type="number"
                min="0"
                {...register('cantidad_disponible')}
                disabled={tieneVariantes}
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-stock-min">Stock mínimo (alerta)</label>
              <input id="prod-stock-min" type="number" min="0" {...register('stock_minimo')} />
            </div>
            <div className="form-group">
              <label htmlFor="prod-sku">SKU</label>
              <input
                id="prod-sku"
                {...register('sku')}
                placeholder="CRE-300"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-unidad">Unidad de medida</label>
              <select id="prod-unidad" {...register('unidad_medida')}>
                <option value="unidad">Unidad</option>
                <option value="kg">Kilogramo</option>
                <option value="litro">Litro</option>
                <option value="metro">Metro</option>
                <option value="par">Par</option>
              </select>
            </div>
          </div>

          <div className={`inventory-panel ${stockActualVal <= 0 ? 'empty' : stockActualVal <= stockMinimoVal ? 'low' : 'ok'}`}>
            <div>
              <span className="inventory-total">{stockActualVal} {unidadVal}{stockActualVal === 1 ? '' : 's'}</span>
              <span className="inventory-status">{stockEstadoTexto}</span>
            </div>
            <div className="inventory-meter" aria-hidden="true">
              <span style={{ width: `${stockRatio}%` }} />
            </div>
          </div>
        </div>

        <div className={`tab-content ${tabActiva === 'variantes' ? 'active' : ''}`}>
          <div className="form-section-title">
            <Layers size={14} /> Variantes
            <label className="check-label" style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={tieneVariantes}
                onChange={e => {
                  const activar = e.target.checked;
                  setTieneVariantes(activar);
                  // Al desactivar, limpiar el array — si no, las filas quedan
                  // ocultas pero se siguen mandando al guardar.
                  if (!activar) replaceVariantes([]);
                }}
              />
              Activar variantes
            </label>
          </div>

          {tieneVariantes ? (
            <>
              <div className="variantes-header">
                <span>Nombre de variante</span>
                <span>SKU</span>
                <span>Stock</span>
                <span>Precio diferencial</span>
                <span></span>
              </div>
              {variantesFields.map((field, i) => (
                <div key={field._rhfKey} className="variante-row variante-row-3">
                  <input
                    placeholder="Ej: Talle M - Rojo"
                    {...register(`variantes.${i}.nombre`)}
                  />
                  <input
                    placeholder="CRE-M-ROJO"
                    {...register(`variantes.${i}.sku_variante`)}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register(`variantes.${i}.stock`)}
                  />
                  <div className="input-prefix" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                    <Controller
                      name={`variantes.${i}.precio_diferencial`}
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          className="w-full"
                          style={{ padding: '0.6rem' }}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-icon danger"
                    onClick={() => removeVariante(i)}
                    aria-label="Quitar variante"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => appendVariante({ nombre: '', sku_variante: '', stock: 0, precio_diferencial: 0 })}
              >
                <Plus size={14} /> Agregar variante
              </button>
              <p className="field-hint" style={{ marginTop: '0.75rem' }}>
                Cuando hay variantes, el stock del producto se calcula automáticamente como la suma de todas las variantes.
              </p>
            </>
          ) : (
            <div className="variantes-empty">
              <BarChart2 size={32} opacity={0.2} />
              <p>Sin variantes. Activá la opción de arriba para agregar talle, color, etc.</p>
            </div>
          )}
        </div>

        <div className={`tab-content ${tabActiva === 'multimedia' ? 'active' : ''}`}>
          <div className="form-section-title">
            <ImageIcon size={14} /> Fotos del producto
          </div>

          <div className="imagenes-grid">
            {[...imagenes].sort((a, b) => a.orden - b.orden).map(img => (
              <div
                key={img.id}
                className={`imagen-card ${img.es_principal ? 'principal' : ''}`}
              >
                <img src={getMediaUrl(img.url)} alt={img.alt_text || 'Imagen del producto'} />
                <div className="imagen-actions">
                  <button
                    type="button"
                    className="btn-icon"
                    title="Marcar como principal"
                    onClick={() => marcarPrincipal(img.id)}
                  >
                    <Star size={13} fill={img.es_principal ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon danger"
                    title="Eliminar imagen"
                    onClick={() => eliminarImagen(img.id, false)}
                  >
                    <X size={13} />
                  </button>
                </div>
                {img.es_principal && <span className="img-principal-badge">Principal</span>}
              </div>
            ))}

            {imagenesNuevas.map(img => (
              <div
                key={img.id}
                className={`imagen-card nueva-img ${img.es_principal ? 'principal' : ''}`}
              >
                <img src={getMediaUrl(img.url)} alt="Nueva" />
                <div className="imagen-actions">
                  <button
                    type="button"
                    className="btn-icon danger"
                    title="Eliminar"
                    onClick={() => eliminarImagen(img.id, true)}
                  >
                    <X size={13} />
                  </button>
                </div>
                <span className="img-principal-badge pending">Pendiente</span>
              </div>
            ))}

            <label className="imagen-upload-btn">
              {subiendoImg
                ? <div className="spinner-sm" />
                : <><Upload size={20} /><span>Agregar fotos</span></>
              }
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                hidden
                disabled={subiendoImg}
              />
            </label>
          </div>
          <p className="field-hint">
            JPG, PNG o WEBP. Máx. 1&nbsp;MB.
          </p>
        </div>

        <div className={`tab-content ${tabActiva === 'faq' ? 'active' : ''}`}>
          <div className="form-group">
            <label htmlFor="prod-faq-titulo">Título de la sección</label>
            <input
              id="prod-faq-titulo"
              type="text"
              placeholder="Ej: Todo lo que necesitas saber"
              {...register('faq_titulo')}
            />
            <p className="field-hint">
              Se muestra en la página pública del producto, dentro de la landing. Dejalo vacío para usar el título por defecto.
            </p>
          </div>
          <div className="form-group">
            <label>Preguntas frecuentes propias de este producto</label>
            <FaqPanel faq={faq} onChange={setFaq} />
          </div>
        </div>

        <div className={`tab-content ${tabActiva === 'ofertas' ? 'active' : ''}`}>
          {esEdicion ? (
            <OfertasProductoTab
              productoId={id}
              productoNombre={nombre}
              productoAnclaPrecioBase={precioBaseVal}
              productoAnclaPrecioCosto={precioCostoVal}
            />
          ) : (
            <div className="variantes-empty">
              <Tag size={32} opacity={0.2} />
              <p>Guardá el producto primero para poder agregarle ofertas comerciales.</p>
            </div>
          )}
        </div>

        <div className={`tab-content ${tabActiva === 'configuracion' ? 'active' : ''}`}>
          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="prod-estado-venta">Estado de venta</label>
              <select id="prod-estado-venta" {...register('estado_venta')}>
                {ESTADOS_VENTA.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
              <p className="field-hint">{estadoVentaActual.desc}</p>
            </div>

            <div className="config-flags">
              <label className="check-label">
                <input type="checkbox" {...register('activo')} />
                Producto activo
              </label>
              <label className="check-label">
                <input type="checkbox" {...register('destacado')} />
                <Star size={13} /> Destacado
              </label>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB 5: DISEÑO DE PÁGINA PROPIO
        ══════════════════════════════════════════════════════ */}
        <div className={`tab-content ${tabActiva === 'diseno' ? 'active' : ''}`}>
          {esEdicion ? (
            <div className="variantes-empty">
              <ImageIcon size={32} opacity={0.2} />
              <p>
                Este producto se mostrará con el diseño estándar de tu tienda.
                Si querés crear un <b>Embudo de Venta (Funnel)</b> de alta conversión exclusivo para este producto, ingresá al selector de plantillas.
              </p>
              <Link to={`/mi-landing/producto/${id}/funnel-selector`} className="lb-btn-primary" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
                <Monitor size={16} style={{ marginRight: '6px' }} /> Configurar Funnel
              </Link>
            </div>
          ) : (
            <div className="variantes-empty">
              <ImageIcon size={32} opacity={0.2} />
              <p>Guardá el producto primero para poder darle un diseño propio.</p>
            </div>
          )}
        </div>

        </div>

        <aside className="prod-summary-panel" aria-label="Resumen del producto">
          <div className="summary-media">
            {imagenPrincipalUrl
              ? <img src={imagenPrincipalUrl} alt={nombre || 'Producto'} />
              : <Package size={34} opacity={0.35} />
            }
          </div>

          <div>
            <h2>{nombre || 'Producto sin nombre'}</h2>
            <p>{categoriaActual?.nombre || 'Sin categoría'}</p>
          </div>

          <div className="summary-price">
            {precioAnclaVal > precioFinalVal && <span>{fmtGs(precioAnclaVal)}</span>}
            <strong>{fmtGs(precioFinalVal)}</strong>
          </div>

          <div className="summary-kpis">
            <div>
              <span>Stock</span>
              <strong>{stockActualVal}</strong>
            </div>
            <div>
              <span>Margen</span>
              <strong className={margenSimpleVal >= 0 ? 'positive' : 'negative'}>{fmtPct(margenSimpleVal)}</strong>
            </div>
          </div>

          <div className="summary-list">
            <div>
              <span>Estado</span>
              <strong>{ESTADO_VENTA_LABELS[estadoVentaVal] || 'En venta'}</strong>
            </div>
            <div>
              <span>Activo</span>
              <strong>{activoVal ? 'Sí' : 'No'}</strong>
            </div>
            <div>
              <span>Variantes</span>
              <strong>{tieneVariantes ? variantesFields.length : 0}</strong>
            </div>
            <div>
              <span>Tags</span>
              <strong>{tagsVal.split(',').map(t => t.trim()).filter(Boolean).length}</strong>
            </div>
          </div>

          {destacadoVal && <span className="summary-featured"><Star size={12} /> Destacado</span>}
        </aside>

      </form>

      {isDirty && !guardando && (
        <div className="prod-save-bar">
          <span>Cambios sin guardar</span>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn-secondary" onClick={() => reset()}>Descartar</button>
            <button type="button" className="btn-primary" onClick={handleSubmit(onSubmit)}>
              <Save size={14} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
