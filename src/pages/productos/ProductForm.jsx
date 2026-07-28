import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { productService } from '../../services/productService';
import { categoriaService, marcaService } from '../../services/catalogoService';
import {
  Package, ChevronLeft, Save, Plus, Trash2,
  Upload, Star, X, Info, DollarSign, BarChart2,
  Image as ImageIcon, Globe, Truck, Tag
} from 'lucide-react';
import './productos.css';

const TABS = [
  { id: 'basicos',    label: 'Datos básicos',     icon: <Package size={15} /> },
  { id: 'precios',    label: 'Precios',            icon: <DollarSign size={15} /> },
  { id: 'stock',      label: 'Stock y variantes',  icon: <BarChart2 size={15} /> },
  { id: 'imagenes',   label: 'Imágenes',           icon: <ImageIcon size={15} /> },
  { id: 'seo',        label: 'SEO y visibilidad',  icon: <Globe size={15} /> },
  { id: 'logistica',  label: 'Logística',          icon: <Truck size={15} /> },
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
  const [marcas, setMarcas] = useState([]);
  const [imagenes, setImagenes] = useState([]);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [tieneVariantes, setTieneVariantes] = useState(false);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: '', sku: '', categoria_id: '', marca_id: '',
      descripcion_corta: '', descripcion_larga: '', tags: '',
      precio_base: '', precio_costo: '', precio_minimo: '',
      descuento_porcentaje: '', descuento_inicio: '', descuento_fin: '',
      impuestos_incluidos: true,
      cantidad_disponible: 0, stock_minimo: 0, unidad_medida: 'unidad',
      activo: true, destacado: false,
      fecha_disponible_desde: '', fecha_disponible_hasta: '',
      slug: '', meta_titulo: '', meta_descripcion: '',
      peso: '', dimensiones: '', tipo_producto: 'fisico',
      variantes: [],
      precios_mayoristas: [],
    },
  });

  const { fields: variantesFields, append: appendVariante, remove: removeVariante } = useFieldArray({ control, name: 'variantes' });
  const { fields: mayoristasFields, append: appendMayorista, remove: removeMayorista } = useFieldArray({ control, name: 'precios_mayoristas' });

  const nombre = watch('nombre');

  // Cargar catálogo y producto (si es edición)
  useEffect(() => {
    const init = async () => {
      const [catData, mrcData] = await Promise.all([
        categoriaService.buscar({ solo_activas: true, limit: 1000 }),
        marcaService.buscar({ solo_activas: true, limit: 1000 }),
      ]);
      setCategorias(catData.categorias || catData);
      setMarcas(mrcData.marcas || mrcData);

      if (esEdicion) {
        try {
          const p = await productService.detalle(id);
          reset({
            nombre: p.nombre || '',
            sku: p.sku || '',
            categoria_id: p.categoria_id || '',
            marca_id: p.marca_id || '',
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
            destacado: p.destacado,
            fecha_disponible_desde: p.fecha_disponible_desde ? p.fecha_disponible_desde.slice(0, 10) : '',
            fecha_disponible_hasta: p.fecha_disponible_hasta ? p.fecha_disponible_hasta.slice(0, 10) : '',
            slug: p.slug || '',
            meta_titulo: p.meta_titulo || '',
            meta_descripcion: p.meta_descripcion || '',
            peso: p.peso || '',
            dimensiones: p.dimensiones || '',
            tipo_producto: p.tipo_producto || 'fisico',
            variantes: p.variantes || [],
            precios_mayoristas: p.precios_mayoristas || [],
          });
          setImagenes(p.imagenes || []);
          setTieneVariantes((p.variantes || []).length > 0);
        } catch { setError('No se pudo cargar el producto.'); }
        finally { setCargando(false); }
      }
    };
    init();
  }, [id]);

  // Auto-generar slug desde nombre (solo si el slug está vacío o en creación)
  useEffect(() => {
    if (!esEdicion && nombre) {
      const slug = nombre.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setValue('slug', slug);
    }
  }, [nombre, esEdicion]);

  const onSubmit = async (data) => {
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        precio_base: parseFloat(data.precio_base) || 0,
        precio_costo: data.precio_costo ? parseFloat(data.precio_costo) : undefined,
        precio_minimo: data.precio_minimo ? parseFloat(data.precio_minimo) : undefined,
        descuento_porcentaje: data.descuento_porcentaje ? parseFloat(data.descuento_porcentaje) : 0,
        categoria_id: data.categoria_id || undefined,
        marca_id: data.marca_id || undefined,
      };

      if (esEdicion) {
        await productService.actualizar(id, payload);
      } else {
        const nuevo = await productService.crear(payload);
        navigate(`/products/${nuevo.id}/editar`);
        return;
      }
      navigate('/products');
    } catch (err) {
      const msg = err.response?.data?.errores
        ? err.response.data.errores.join('\n')
        : err.response?.data?.message || 'Error al guardar el producto.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleImageUpload = async (e) => {
    if (!esEdicion) {
      setError('Guardá el producto primero para poder subir imágenes.');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoImg(true);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const nueva = await productService.subirImagen(id, fd);
      setImagenes(imgs => [...imgs, nueva]);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir imagen.');
    } finally {
      setSubiendoImg(false);
    }
  };

  const eliminarImagen = async (imgId) => {
    try {
      await productService.eliminarImagen(id, imgId);
      setImagenes(imgs => imgs.filter(i => i.id !== imgId));
    } catch (err) { setError('Error al eliminar imagen.'); }
  };

  const marcarPrincipal = async (imgId) => {
    try {
      await productService.actualizarImagen(id, imgId, { es_principal: true });
      setImagenes(imgs => imgs.map(i => ({ ...i, es_principal: i.id === imgId })));
    } catch (err) { setError('Error al actualizar imagen.'); }
  };

  if (cargando) return (
    <div className="prod-page"><div className="prod-loading"><div className="spinner" /></div></div>
  );

  return (
    <div className="prod-page">
      {/* Header */}
      <div className="prod-header">
        <div className="prod-header-left">
          <button className="btn-back" onClick={() => navigate('/products')}>
            <ChevronLeft size={18} />
          </button>
          <div className="prod-icon-wrap"><Package size={22} /></div>
          <div>
            <h1 className="prod-title">{esEdicion ? 'Editar producto' : 'Nuevo producto'}</h1>
            {esEdicion && <p className="prod-subtitle">ID #{id}</p>}
          </div>
        </div>
        <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={guardando}>
          <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {error && (
        <div className="form-error-banner">
          <Info size={15} /> {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="prod-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`prod-tab ${tabActiva === tab.id ? 'active' : ''}`}
            onClick={() => setTabActiva(tab.id)}
            type="button"
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="prod-form">

        {/* ── TAB: Datos básicos ─────────────────────────────────────── */}
        <div className={`tab-content ${tabActiva === 'basicos' ? 'active' : ''}`}>
          <div className="form-grid-2">
            <div className="form-group full">
              <label>Nombre <span className="req">*</span></label>
              <input {...register('nombre', { required: 'El nombre es requerido.' })} />
              {errors.nombre && <span className="field-error">{errors.nombre.message}</span>}
            </div>
            <div className="form-group">
              <label>SKU / Código interno</label>
              <input {...register('sku')} placeholder="Ej: REM-001" />
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <select {...register('categoria_id')}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Marca</label>
              <select {...register('marca_id')}>
                <option value="">Sin marca</option>
                {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tags (separados por coma)</label>
              <input {...register('tags')} placeholder="ropa, verano, oferta" />
            </div>
            <div className="form-group full">
              <label>Descripción corta <span className="hint">(aparece en listados)</span></label>
              <input {...register('descripcion_corta')} maxLength={500} />
            </div>
            <div className="form-group full">
              <label>Descripción larga <span className="hint">(aparece en la ficha)</span></label>
              <textarea {...register('descripcion_larga')} rows={6} />
            </div>
          </div>
        </div>

        {/* ── TAB: Precios ───────────────────────────────────────────── */}
        <div className={`tab-content ${tabActiva === 'precios' ? 'active' : ''}`}>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Precio base <span className="req">*</span></label>
              <div className="input-prefix">
                <span>$</span>
                <input type="number" step="0.01" min="0" {...register('precio_base', { required: 'Requerido.' })} />
              </div>
              {errors.precio_base && <span className="field-error">{errors.precio_base.message}</span>}
            </div>
            <div className="form-group">
              <label>Precio de costo <span className="hint">(solo admin)</span></label>
              <div className="input-prefix">
                <span>$</span>
                <input type="number" step="0.01" min="0" {...register('precio_costo')} />
              </div>
            </div>
            <div className="form-group">
              <label>Precio mínimo</label>
              <div className="input-prefix">
                <span>$</span>
                <input type="number" step="0.01" min="0" {...register('precio_minimo')} />
              </div>
              <p className="field-hint">El precio con descuentos no puede caer por debajo de este valor.</p>
            </div>
          </div>

          <div className="form-section-title"><Tag size={14} /> Descuento</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Descuento (%)</label>
              <input type="number" step="0.01" min="0" max="100" {...register('descuento_porcentaje')} />
            </div>
            <div className="form-group">
              <label>Vigencia desde</label>
              <input type="date" {...register('descuento_inicio')} />
            </div>
            <div className="form-group">
              <label>Vigencia hasta</label>
              <input type="date" {...register('descuento_fin')} />
            </div>
          </div>
          <label className="check-label">
            <input type="checkbox" {...register('impuestos_incluidos')} />
            Precio incluye IVA
          </label>

          <div className="form-section-title"><DollarSign size={14} /> Precios mayoristas por volumen</div>
          {mayoristasFields.map((field, i) => (
            <div key={field.id} className="variante-row">
              <div className="form-group">
                <label>Cantidad mínima</label>
                <input type="number" min="1" {...register(`precios_mayoristas.${i}.cantidad_minima`)} />
              </div>
              <div className="form-group">
                <label>Precio unitario</label>
                <div className="input-prefix"><span>$</span>
                  <input type="number" step="0.01" min="0" {...register(`precios_mayoristas.${i}.precio_unitario`)} />
                </div>
              </div>
              <button type="button" className="btn-icon danger" onClick={() => removeMayorista(i)}><Trash2 size={14} /></button>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => appendMayorista({ cantidad_minima: 10, precio_unitario: '' })}>
            <Plus size={14} /> Agregar precio mayorista
          </button>
        </div>

        {/* ── TAB: Stock y variantes ────────────────────────────────── */}
        <div className={`tab-content ${tabActiva === 'stock' ? 'active' : ''}`}>
          <div className="form-grid-3">
            <div className="form-group">
              <label>
                Cantidad disponible
                {tieneVariantes && <span className="hint"> (calculado desde variantes)</span>}
              </label>
              <input
                type="number" min="0"
                {...register('cantidad_disponible')}
                disabled={tieneVariantes}
              />
            </div>
            <div className="form-group">
              <label>Stock mínimo (alerta)</label>
              <input type="number" min="0" {...register('stock_minimo')} />
            </div>
            <div className="form-group">
              <label>Unidad de medida</label>
              <select {...register('unidad_medida')}>
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

          {tieneVariantes && (
            <>
              <div className="variantes-header">
                <span>Nombre</span><span>SKU variante</span><span>Stock</span><span>Precio diferencial</span><span></span>
              </div>
              {variantesFields.map((field, i) => (
                <div key={field.id} className="variante-row">
                  <input placeholder="Ej: Talle M - Rojo" {...register(`variantes.${i}.nombre`)} />
                  <input placeholder="SKU-001-M-R" {...register(`variantes.${i}.sku_variante`)} />
                  <input type="number" min="0" placeholder="0" {...register(`variantes.${i}.stock`)} />
                  <div className="input-prefix">
                    <span>$</span>
                    <input type="number" step="0.01" placeholder="0.00" {...register(`variantes.${i}.precio_diferencial`)} />
                  </div>
                  <button type="button" className="btn-icon danger" onClick={() => removeVariante(i)}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn-ghost" onClick={() => appendVariante({ nombre: '', sku_variante: '', stock: 0, precio_diferencial: 0 })}>
                <Plus size={14} /> Agregar variante
              </button>
            </>
          )}
        </div>

        {/* ── TAB: Imágenes ─────────────────────────────────────────── */}
        <div className={`tab-content ${tabActiva === 'imagenes' ? 'active' : ''}`}>
          {!esEdicion && (
            <div className="info-banner">
              <Info size={14} /> Guardá el producto primero para poder subir imágenes.
            </div>
          )}
          <div className="imagenes-grid">
            {imagenes.sort((a, b) => a.orden - b.orden).map(img => (
              <div key={img.id} className={`imagen-card ${img.es_principal ? 'principal' : ''}`}>
                <img src={img.url} alt="" />
                <div className="imagen-actions">
                  <button type="button" className="btn-icon" title="Marcar como principal" onClick={() => marcarPrincipal(img.id)}>
                    <Star size={13} fill={img.es_principal ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" className="btn-icon danger" title="Eliminar" onClick={() => eliminarImagen(img.id)}>
                    <X size={13} />
                  </button>
                </div>
                {img.es_principal && <span className="img-principal-badge">Principal</span>}
              </div>
            ))}
            {esEdicion && (
              <label className="imagen-upload-btn">
                {subiendoImg ? <div className="spinner-sm" /> : <><Upload size={20} /><span>Subir foto</span></>}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} hidden />
              </label>
            )}
          </div>
          <p className="field-hint">Las imágenes se comprimen automáticamente a máx. 1200px de ancho.</p>
        </div>

        {/* ── TAB: SEO y visibilidad ─────────────────────────────────── */}
        <div className={`tab-content ${tabActiva === 'seo' ? 'active' : ''}`}>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Slug (URL amigable)</label>
              <input {...register('slug')} placeholder="nombre-del-producto" />
              <p className="field-hint">Se genera automáticamente. Editable manualmente.</p>
            </div>
            <div className="form-group">
              <label>Meta título <span className="hint">(máx. 160 caracteres)</span></label>
              <input {...register('meta_titulo')} maxLength={160} />
            </div>
            <div className="form-group full">
              <label>Meta descripción <span className="hint">(máx. 320 caracteres)</span></label>
              <textarea {...register('meta_descripcion')} rows={3} maxLength={320} />
            </div>
          </div>

          <div className="form-section-title">Visibilidad</div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Disponible desde</label>
              <input type="date" {...register('fecha_disponible_desde')} />
            </div>
            <div className="form-group">
              <label>Disponible hasta</label>
              <input type="date" {...register('fecha_disponible_hasta')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <label className="check-label">
              <input type="checkbox" {...register('activo')} />
              Producto activo (publicado)
            </label>
            <label className="check-label">
              <input type="checkbox" {...register('destacado')} />
              <Star size={13} /> Destacado (aparece en secciones especiales)
            </label>
          </div>
        </div>

        {/* ── TAB: Logística ────────────────────────────────────────── */}
        <div className={`tab-content ${tabActiva === 'logistica' ? 'active' : ''}`}>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Tipo de producto</label>
              <select {...register('tipo_producto')}>
                <option value="fisico">Físico</option>
                <option value="digital">Digital</option>
              </select>
            </div>
            <div className="form-group">
              <label>Peso (kg)</label>
              <input type="number" step="0.001" min="0" {...register('peso')} placeholder="0.500" />
            </div>
            <div className="form-group">
              <label>Dimensiones</label>
              <input {...register('dimensiones')} placeholder="30x20x10 cm" />
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
