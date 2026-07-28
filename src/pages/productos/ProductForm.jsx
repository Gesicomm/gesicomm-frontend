import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { productService } from '../../services/productService';
import { categoriaService } from '../../services/catalogoService';
import {
  Package, ChevronLeft, Save, Plus, Trash2, Upload,
  Star, X, Info, DollarSign, BarChart2, Image as ImageIcon, Tag
} from 'lucide-react';
import './productos.css';

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
  const [imagenes, setImagenes] = useState([]);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [tieneVariantes, setTieneVariantes] = useState(false);

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
      precios_mayoristas: [],
    },
  });

  const { fields: variantesFields, append: appendVariante, remove: removeVariante } =
    useFieldArray({ control, name: 'variantes' });
  const { fields: mayoristasFields, append: appendMayorista, remove: removeMayorista } =
    useFieldArray({ control, name: 'precios_mayoristas' });

  const nombre = watch('nombre');

  // ── Cargar datos ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const catData = await categoriaService.buscar({ solo_activas: true, limit: 1000 });
      setCategorias(catData.categorias || catData);

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
            variantes: p.variantes || [],
            precios_mayoristas: p.precios_mayoristas || [],
          });
          setImagenes(p.imagenes || []);
          setTieneVariantes((p.variantes || []).length > 0);
        } catch {
          setError('No se pudo cargar el producto.');
        } finally {
          setCargando(false);
        }
      }
    };
    init();
  }, [id]);

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
        precios_mayoristas: data.precios_mayoristas.map(pm => ({
          cantidad_minima: parseInt(pm.cantidad_minima),
          precio_unitario: parseFloat(pm.precio_unitario),
        })),
      };

      if (esEdicion) {
        await productService.actualizar(id, payload);
        navigate('/products');
      } else {
        const nuevo = await productService.crear(payload);
        // Navegar a edición para poder subir imágenes
        navigate(`/products/${nuevo.id}/editar`);
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
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!esEdicion) {
      setError('Guardá el producto primero para poder subir imágenes.');
      return;
    }
    setSubiendoImg(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const nueva = await productService.subirImagen(id, fd);
      setImagenes(imgs => [...imgs, nueva]);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir imagen. Máx. 1MB.');
    } finally {
      setSubiendoImg(false);
      // Reset el input para poder subir la misma imagen nuevamente si hace falta
      e.target.value = '';
    }
  };

  const eliminarImagen = async (imgId) => {
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

  if (cargando) return (
    <div className="prod-page"><div className="prod-loading"><div className="spinner" /></div></div>
  );

  return (
    <div className="prod-page">

      {/* ── Header ──────────────────────────────────────────── */}
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

      {/* ── Error banner ────────────────────────────────────── */}
      {error && (
        <div className="form-error-banner" role="alert">
          <Info size={15} />
          <span style={{ flex: 1, whiteSpace: 'pre-line' }}>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar error">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────── */}
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

        {/* ══════════════════════════════════════════════════════
            TAB 1: DATOS BÁSICOS (incluye imágenes)
        ══════════════════════════════════════════════════════ */}
        <div className={`tab-content ${tabActiva === 'basicos' ? 'active' : ''}`}>
          <div className="form-grid-2">

            {/* Nombre */}
            <div className="form-group full">
              <label htmlFor="prod-nombre">Nombre <span className="req">*</span></label>
              <input
                id="prod-nombre"
                {...register('nombre', { required: 'El nombre es requerido.' })}
                placeholder="Ej: Remera básica azul"
              />
              {errors.nombre && <span className="field-error">{errors.nombre.message}</span>}
            </div>

            {/* Categoría */}
            <div className="form-group">
              <label htmlFor="prod-categoria">Categoría</label>
              <select id="prod-categoria" {...register('categoria_id')}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            {/* Estado de venta */}
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

            {/* Tags */}
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

            {/* Flags */}
            <div className="form-group full" style={{ flexDirection: 'row', gap: '2rem', alignItems: 'center' }}>
              <label className="check-label">
                <input type="checkbox" {...register('activo')} />
                Producto activo
              </label>
              <label className="check-label">
                <input type="checkbox" {...register('destacado')} />
                <Star size={13} /> Destacado
              </label>
            </div>

            {/* Descripción corta */}
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

            {/* Descripción larga */}
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

          {/* ── Imágenes (en el mismo tab) ─────────────────── */}
          <div className="form-section-title">
            <ImageIcon size={14} /> Imágenes del producto
          </div>

          {!esEdicion && (
            <div className="info-banner">
              <Info size={14} />
              Guardá el producto primero para poder subir imágenes.
            </div>
          )}

          <div className="imagenes-grid">
            {[...imagenes].sort((a, b) => a.orden - b.orden).map(img => (
              <div
                key={img.id}
                className={`imagen-card ${img.es_principal ? 'principal' : ''}`}
              >
                <img src={img.url} alt={img.alt_text || 'Imagen del producto'} />
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
                    onClick={() => eliminarImagen(img.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
                {img.es_principal && <span className="img-principal-badge">Principal</span>}
              </div>
            ))}

            {esEdicion && (
              <label className="imagen-upload-btn">
                {subiendoImg
                  ? <div className="spinner-sm" />
                  : <><Upload size={20} /><span>Subir foto</span></>
                }
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  hidden
                  disabled={subiendoImg}
                />
              </label>
            )}
          </div>
          <p className="field-hint">
            Formatos admitidos: JPG, PNG, WEBP. Máx. 1&nbsp;MB.
            Las imágenes se comprimen automáticamente a 1200px de ancho.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB 2: PRECIOS
        ══════════════════════════════════════════════════════ */}
        <div className={`tab-content ${tabActiva === 'precios' ? 'active' : ''}`}>
          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="prod-precio-base">
                Precio base <span className="req">*</span>
              </label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  id="prod-precio-base"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('precio_base', {
                    required: 'El precio base es requerido.',
                    min: { value: 0, message: 'El precio no puede ser negativo.' },
                  })}
                />
              </div>
              {errors.precio_base && <span className="field-error">{errors.precio_base.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="prod-precio-costo">
                Precio de costo <span className="hint">(solo admins)</span>
              </label>
              <div className="input-prefix">
                <span>$</span>
                <input id="prod-precio-costo" type="number" step="0.01" min="0" placeholder="0.00" {...register('precio_costo')} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="prod-precio-minimo">Precio mínimo</label>
              <div className="input-prefix">
                <span>$</span>
                <input id="prod-precio-minimo" type="number" step="0.01" min="0" placeholder="0.00" {...register('precio_minimo')} />
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

          <div className="form-section-title"><DollarSign size={14} /> Precios por volumen (mayorista)</div>
          {mayoristasFields.map((field, i) => (
            <div key={field.id} className="variante-row">
              <div className="form-group">
                <label>Cantidad mínima</label>
                <input
                  type="number"
                  min="1"
                  placeholder="10"
                  {...register(`precios_mayoristas.${i}.cantidad_minima`)}
                />
              </div>
              <div className="form-group">
                <label>Precio unitario</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register(`precios_mayoristas.${i}.precio_unitario`)}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn-icon danger"
                onClick={() => removeMayorista(i)}
                aria-label="Quitar precio mayorista"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => appendMayorista({ cantidad_minima: 10, precio_unitario: '' })}
          >
            <Plus size={14} /> Agregar precio mayorista
          </button>
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
                onChange={e => setTieneVariantes(e.target.checked)}
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
                <div key={field.id} className="variante-row variante-row-3">
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
                  <div className="input-prefix">
                    <span>$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register(`variantes.${i}.precio_diferencial`)}
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
