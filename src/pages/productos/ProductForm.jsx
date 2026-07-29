import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { productService } from '../../services/productService';
import { getMediaUrl } from '../../services/api';
import { categoriaService } from '../../services/catalogoService';
import { comboAdminService } from '../../services/comboAdminService';
import { calcularPrincipal, simularDescuentosPrincipal } from '../../utils/comboPricingLocal';
import CurrencyInput from '../../components/CurrencyInput';
import {
  Package, ChevronLeft, Save, Plus, Trash2, Upload,
  Star, X, Info, DollarSign, BarChart2, Image as ImageIcon, Tag, Activity
} from 'lucide-react';
import './productos.css';
import '../combos/combos.css'; // Reutilizar estilos de métricas de combos

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtGs(n)  { return n !== null && n !== undefined ? 'Gs ' + fmt(n) : '—'; }

// 3 tabs simplificadas: sin Logística, sin SKU, sin Marcas
const TABS = [
  { id: 'basicos',  label: 'Datos básicos', icon: <Package size={15} /> },
  { id: 'precios',  label: 'Precios',        icon: <DollarSign size={15} /> },
  { id: 'stock',    label: 'Stock',           icon: <BarChart2 size={15} /> },
];

const ESTADOS_VENTA = [
  { value: 'en_venta',       label: '🟢 En venta',         desc: 'Visible y disponible para comprar' },
  { value: 'fuera_de_stock', label: '🟡 Fuera de stock',   desc: 'Visible, pero no se puede comprar' },
  { value: 'no_disponible',  label: '🔴 No disponible',    desc: 'No aparece en la tienda' },
];

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [tabActiva, setTabActiva] = useState('basicos');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(esEdicion);
  const [error, setError] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [imagenesNuevas, setImagenesNuevas] = useState([]); // Para imágenes en cola (nuevo prod)
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [tieneVariantes, setTieneVariantes] = useState(false);
  const [config, setConfig] = useState(null);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: '',
      categoria_id: '',
      descripcion_corta: '',
      descripcion_larga: '',
      tags: '',
      precio_base: '',
      precio_costo: '',
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
  useEffect(() => {
    const init = async () => {
      const [catData, conf] = await Promise.all([
        categoriaService.buscar({ solo_activas: true, limit: 1000 }),
        comboAdminService.obtenerConfiguracion().catch(() => null)
      ]);
      setCategorias(catData.categorias || catData);
      if (conf) setConfig(conf);

      if (esEdicion) {
        try {
          const p = await productService.detalle(id);
          reset({
            nombre: p.nombre || '',
            categoria_id: p.categoria_id || '',
            descripcion_corta: p.descripcion_corta || '',
            descripcion_larga: p.descripcion_larga || '',
            tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
            precio_base: p.precio_base || '',
            precio_costo: p.precio_costo || '',
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
            variantes: p.variantes?.length ? p.variantes : [],
          });
          if (p.variantes?.length > 0) setTieneVariantes(true);
          setImagenes(p.imagenes || []);
        } catch {
          setError('No se pudo cargar el producto.');
        } finally {
          setCargando(false);
        }
      }
    };
    init();
  }, [id]);

  // ── Rentabilidad Reactiva ─────────────────────────────────
  const precioBaseVal = parseFloat(watch('precio_base')) || 0;
  const precioCostoVal = parseFloat(watch('precio_costo')) || 0;
  const descuentoPctVal = parseFloat(watch('descuento_porcentaje')) || 0;

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
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        descripcion_corta: data.descripcion_corta || null,
        descripcion_larga: data.descripcion_larga || null,
        precio_base: parseFloat(data.precio_base),
        precio_costo: data.precio_costo ? parseFloat(data.precio_costo) : null,
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

      <form onSubmit={handleSubmit(onSubmit)} className="prod-form" noValidate>

        <div className={`tab-content ${tabActiva === 'basicos' ? 'active' : ''}`}>
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
              <label htmlFor="prod-estado-venta">Estado de venta</label>
              <select id="prod-estado-venta" {...register('estado_venta')}>
                {ESTADOS_VENTA.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
              <p className="field-hint">
                {ESTADOS_VENTA.find(e => e.value === watch('estado_venta'))?.desc}
              </p>
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

            <div className="form-group full" style={{ flexDirection: 'row', gap: '2rem', alignItems: 'center' }}>
              <label className="check-label">
                <input type="checkbox" {...register('destacado')} />
                <Star size={13} /> Destacado
              </label>
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

          <div className="form-section-title">
            <ImageIcon size={14} /> Imágenes del producto
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
                <span className="img-principal-badge" style={{background: 'rgba(255,255,255,0.2)'}}>Pendiente</span>
              </div>
            ))}

            <label className="imagen-upload-btn">
              {subiendoImg
                ? <div className="spinner-sm" />
                : <><Upload size={20} /><span>Subir foto</span></>
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
            Formatos admitidos: JPG, PNG, WEBP. Máx. 1&nbsp;MB.
            Las imágenes se comprimen automáticamente a 1200px de ancho.
          </p>
        </div>

        <div className={`tab-content ${tabActiva === 'precios' ? 'active' : ''}`}>
          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="prod-precio-base">
                Precio base <span className="req">*</span>
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

            <div className="form-group">
              <label htmlFor="prod-precio-costo">
                Precio de costo <span className="hint">(solo admins)</span>
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
              <label htmlFor="prod-precio-minimo">Precio mínimo</label>
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

          {config && rentabilidad && (
            <div className="combo-section" style={{ marginTop: '2rem', background: 'transparent', padding: 0, border: 'none' }}>
              <h2 className="combo-section-title"><Activity size={16} /> Rentabilidad Individual Estimada</h2>
              <p className="combo-section-desc">
                Cálculo basado en la configuración económica global de combos y el descuento actual aplicado.
                {' '}<Link to="/combos/configuracion">Editar CPA, envío, confirmación y empaque</Link>.
              </p>

              <div className="combo-metrics-grid">
                <div className="combo-metric-card">
                  <span className="combo-metric-label">Venta (con desc)</span>
                  <span className="combo-metric-value">{fmtGs(rentabilidad.finalPrice)}</span>
                </div>
                <div className="combo-metric-card">
                  <span className="combo-metric-label">Costo Prod.</span>
                  <span className="combo-metric-value">{fmtGs(precioCostoVal)}</span>
                </div>
                <div className="combo-metric-card">
                  <span className="combo-metric-label">CPA ({config.cpa_porcentaje}%)</span>
                  <span className="combo-metric-value">{fmtGs(rentabilidad.cpaMax)}</span>
                </div>
                <div className="combo-metric-card">
                  <span className="combo-metric-label">Operativos</span>
                  <span className="combo-metric-value">
                    {fmtGs((Number(config.costo_envio)||0) + (Number(config.costo_confirmacion)||0) + (Number(config.costo_empaque)||0))}
                  </span>
                </div>
                <div className="combo-metric-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="combo-metric-label">Costo Total Estimado</span>
                  <span className="combo-metric-value">
                    {fmtGs(rentabilidad.totalCosts)}
                  </span>
                </div>
                <div className={`combo-metric-card ${rentabilidad.profit > 0 ? 'profit-positive' : 'profit-negative'}`}>
                  <span className="combo-metric-label">Utilidad</span>
                  <span className="combo-metric-value">
                    {fmtGs(rentabilidad.profit)}
                  </span>
                </div>
                <div className={`combo-metric-card ${rentabilidad.margin >= Number(config.margen_minimo) / 100 ? 'profit-positive' : (rentabilidad.margin > 0 ? 'profit-warning' : 'profit-negative')}`}>
                  <span className="combo-metric-label">Margen</span>
                  <span className="combo-metric-value">
                    {(rentabilidad.margin * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="combo-table-container" style={{ marginTop: '1.5rem' }}>
                <table className="combo-table">
                  <thead>
                    <tr>
                      <th>Escenario Descuento</th>
                      <th className="text-right">Precio Final</th>
                      <th className="text-right">Utilidad Unitaria</th>
                      <th className="text-right">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentabilidad.simulador.map(sim => (
                      <tr key={sim.discountPercentage}>
                        <td>
                          {sim.discountPercentage}% 
                          {sim.discountPercentage === descuentoPctVal ? <span className="badge-primary" style={{marginLeft: '8px', fontSize: '10px'}}>ACTUAL</span> : null}
                        </td>
                        <td className="text-right">{fmtGs(sim.finalPrice)}</td>
                        <td className={`text-right ${sim.profit > 0 ? 'text-success' : 'text-danger'}`}>
                          {fmtGs(sim.profit)}
                        </td>
                        <td className={`text-right ${sim.margin >= Number(config.margen_minimo) / 100 ? 'text-success' : (sim.margin > 0 ? 'text-warning' : 'text-danger')}`}>
                          {(sim.margin * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB 3: STOCK Y VARIANTES
        ══════════════════════════════════════════════════════ */}
        <div className={`tab-content ${tabActiva === 'stock' ? 'active' : ''}`}>
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

          <div className="form-section-title">
            <BarChart2 size={14} /> Variantes
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
                onClick={() => appendVariante({ nombre: '', stock: 0, precio_diferencial: 0 })}
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

      </form>
    </div>
  );
}
