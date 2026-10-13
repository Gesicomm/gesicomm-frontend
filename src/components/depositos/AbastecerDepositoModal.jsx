import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, ImageOff, Loader, PackagePlus, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getMediaUrl } from '../../services/api';
import { productService } from '../../services/productService';
import { categoriaService } from '../../services/catalogoService';
import { solicitudAbastecimientoService } from '../../services/solicitudAbastecimiento.service';
import { useDebounce } from '../../hooks/useDebounce';

function nombreProducto(item) {
  return item.variante
    ? `${item.producto.nombre} - ${item.variante.nombre || item.variante.sku_variante}`
    : item.producto.nombre;
}

function imagenProducto(producto) {
  if (!producto) return '';
  return producto.imagenes?.[0]?.url
    || producto.imagenes?.[0]
    || producto.imagen
    || producto.imagen_url
    || '';
}

function precioProducto(producto) {
  return producto?.precio_efectivo ?? producto?.precio_base ?? producto?.precio ?? null;
}

function formatGs(value) {
  const numero = Number(value);
  if (!Number.isFinite(numero) || numero <= 0) return '';
  return `Gs. ${numero.toLocaleString('es-PY')}`;
}

function categoriaNombre(producto, categorias) {
  const categoriaId = producto?.categoria_id || producto?.categoriaId;
  return categorias.find((cat) => String(cat.id) === String(categoriaId))?.nombre || '';
}

function ProductImage({ producto, className = 'h-16 w-16' }) {
  const src = imagenProducto(producto);
  if (!src) {
    return (
      <span className={`${className} flex flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-muted`}>
        <ImageOff size={18} />
      </span>
    );
  }
  return (
    <img
      src={getMediaUrl(src)}
      alt={producto.nombre}
      className={`${className} flex-shrink-0 rounded-lg border border-border bg-surface-2 object-cover`}
      loading="lazy"
    />
  );
}

export default function AbastecerDepositoModal({ deposito, open, onClose }) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [producto, setProducto] = useState(null);
  const [variantes, setVariantes] = useState([]);
  const [varianteId, setVarianteId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const textoBuscado = useDebounce(texto, 350);

  useEffect(() => {
    if (!open) {
      setTexto('');
      setCategoriaId('');
      setProductos([]);
      setProducto(null);
      setVariantes([]);
      setVarianteId('');
      setCantidad(1);
      setItems([]);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let activo = true;
    categoriaService.buscar({ solo_activas: true, limit: 1000 })
      .then((data) => {
        if (!activo) return;
        const lista = Array.isArray(data) ? data : data.categorias || [];
        setCategorias(lista);
      })
      .catch(() => {
        if (activo) setCategorias([]);
      });
    return () => { activo = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let activo = true;
    setCargandoProductos(true);
    productService.buscar({
      page: 1,
      limit: 20,
      activo: true,
      ordenar_por: 'nombre',
      ...(textoBuscado.trim() ? { texto: textoBuscado.trim() } : {}),
      ...(categoriaId ? { categoria_id: Number(categoriaId) } : {}),
    })
      .then((data) => {
        if (!activo) return;
        setProductos((data.productos || []).filter((p) => !p.puede_editar));
      })
      .catch(() => {
        if (activo) setError('No se pudieron cargar los productos de catálogo.');
      })
      .finally(() => {
        if (activo) setCargandoProductos(false);
      });
    return () => { activo = false; };
  }, [open, textoBuscado, categoriaId]);

  useEffect(() => {
    if (!producto) {
      setVariantes([]);
      setVarianteId('');
      return undefined;
    }
    if (!Number(producto.variantes_count)) {
      setVariantes([]);
      setVarianteId('');
      return undefined;
    }
    let activo = true;
    setVarianteId('');
    productService.variantes(producto.id)
      .then((lista) => {
        if (!activo) return;
        const activas = (lista || []).filter((v) => v.activo !== false);
        setVariantes(activas);
        if (activas.length === 1) setVarianteId(String(activas[0].id));
      })
      .catch(() => {
        if (activo) setError('No se pudieron cargar las variantes del producto.');
      });
    return () => { activo = false; };
  }, [producto]);

  const productoTieneVariantes = Number(producto?.variantes_count || 0) > 0;
  const varianteSeleccionada = useMemo(
    () => variantes.find((v) => String(v.id) === String(varianteId)) || null,
    [variantes, varianteId],
  );
  const puedeAgregar = producto && cantidad > 0 && (!productoTieneVariantes || varianteSeleccionada);

  function agregarItem() {
    if (!puedeAgregar) return;
    setItems((prev) => {
      const key = `${producto.id}:${varianteSeleccionada?.id || 'base'}`;
      const existente = prev.find((item) => item.key === key);
      if (existente) {
        return prev.map((item) => item.key === key ? { ...item, cantidad: item.cantidad + cantidad } : item);
      }
      return [...prev, {
        key,
        producto,
        variante: varianteSeleccionada,
        cantidad,
      }];
    });
    setProducto(null);
    setVariantes([]);
    setVarianteId('');
    setCantidad(1);
  }

  async function confirmar() {
    if (!deposito?.id || items.length === 0) return;
    setCreando(true);
    setError('');
    try {
      const creadas = [];
      for (const item of items) {
        const solicitud = await solicitudAbastecimientoService.crear({
          producto_id: item.producto.id,
          variante_id: item.variante?.id || null,
          cantidad: item.cantidad,
          tipoLogistica: 'PROPIA',
          depositoId: deposito.id,
        });
        creadas.push(solicitud);
      }
      toast.success(items.length === 1 ? 'Solicitud de abastecimiento creada.' : 'Solicitudes de abastecimiento creadas.');
      onClose?.();
      if (creadas.length === 1) navigate(`/mis-abastecimientos/${creadas[0].id}`);
      else navigate('/mis-abastecimientos');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el abastecimiento.');
    } finally {
      setCreando(false);
    }
  }

  if (!open || !deposito) return null;

  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-border bg-surface px-6 py-4">
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-semibold uppercase text-fg-muted">Abastecer depósito</p>
            <h2 className="m-0 mt-1 text-lg font-semibold text-fg">{deposito.nombre}</h2>
            <p className="m-0 mt-1 text-sm text-fg-muted">{deposito.direccion} · {deposito.ciudad}{deposito.departamento ? `, ${deposito.departamento}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Cerrar abastecimiento">
            <X size={18} />
          </button>
        </div>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-h-0 overflow-y-auto border-b border-border bg-surface-50 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-fg">Producto de catálogo RAHA</label>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={16} />
                  <input
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    placeholder="Buscar por nombre o SKU..."
                    className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <label className="sr-only" htmlFor="categoria-raha">Categoría</label>
                <select
                  id="categoria-raha"
                  value={categoriaId}
                  onChange={(event) => setCategoriaId(event.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {cargandoProductos && productos.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-fg-muted">
                  <Loader size={16} className="animate-spin text-primary" />
                  Cargando productos...
                </div>
              ) : productos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-fg-muted">
                  No encontramos productos de catálogo con esa búsqueda.
                </div>
              ) : productos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProducto(p)}
                  className={`group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${producto?.id === p.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-2'}`}
                >
                  <ProductImage producto={p} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold text-fg">{p.nombre}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-fg-muted">
                      <span>{p.sku || 'Sin SKU'}</span>
                      {categoriaNombre(p, categorias) && <span>{categoriaNombre(p, categorias)}</span>}
                      {Number(p.variantes_count) > 0 && <span>{p.variantes_count} variantes</span>}
                    </span>
                    {formatGs(precioProducto(p)) && (
                      <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[12px] font-semibold text-primary">
                        {formatGs(precioProducto(p))}
                      </span>
                    )}
                  </span>
                  {producto?.id === p.id && <Check className="flex-shrink-0 text-primary" size={17} />}
                </button>
              ))}
            </div>
          </div>

          <aside className="flex min-h-0 flex-col bg-surface p-5">
            <div className="space-y-4">
              <div>
                <p className="m-0 text-sm font-semibold text-fg">Producto seleccionado</p>
                {producto ? (
                  <div className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-surface-50 p-3">
                    <ProductImage producto={producto} className="h-20 w-20" />
                    <div className="min-w-0">
                      <p className="m-0 line-clamp-3 text-sm font-semibold text-fg">{producto.nombre}</p>
                      <p className="m-0 mt-1 text-[12px] text-fg-muted">{producto.sku || 'Sin SKU'}</p>
                      {categoriaNombre(producto, categorias) && (
                        <p className="m-0 mt-1 text-[12px] text-fg-muted">{categoriaNombre(producto, categorias)}</p>
                      )}
                      {formatGs(precioProducto(producto)) && (
                        <p className="m-0 mt-2 text-sm font-semibold text-primary">{formatGs(precioProducto(producto))}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-border bg-surface-50 px-4 py-6 text-sm text-fg-muted">
                    Elegí un producto del listado.
                  </div>
                )}
              </div>

              {productoTieneVariantes && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-fg">Variante</span>
                  <select
                    value={varianteId}
                    onChange={(event) => setVarianteId(event.target.value)}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  >
                    <option value="">Seleccionar variante</option>
                    {variantes.map((v) => (
                      <option key={v.id} value={v.id}>{v.nombre || v.sku_variante || `Variante ${v.id}`}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-fg">Cantidad</span>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(event) => setCantidad(Math.max(1, parseInt(event.target.value, 10) || 1))}
                  className="w-28 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <button
                type="button"
                disabled={!puedeAgregar}
                onClick={agregarItem}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-fg hover:bg-surface-2 disabled:opacity-50"
              >
                <Plus size={16} />
                Agregar al pedido
              </button>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto border-t border-border pt-4">
              <p className="m-0 mb-3 text-sm font-semibold text-fg">Pedido a RAHA</p>
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-surface-50 px-4 py-6 text-center text-sm text-fg-muted">
                  Agregá al menos un producto.
                </div>
              ) : (
                <ul className="m-0 space-y-2 p-0">
                  {items.map((item) => (
                    <li key={item.key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-50 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductImage producto={item.producto} className="h-10 w-10 rounded-md" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-fg">{nombreProducto(item)}</span>
                          <span className="mt-0.5 block text-[12px] text-fg-muted">{item.cantidad} u.</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((row) => row.key !== item.key))}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-danger/10 hover:text-danger"
                        aria-label={`Quitar ${nombreProducto(item)}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </aside>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
          <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
            <PackagePlus size={16} />
            {items.length} producto{items.length === 1 ? '' : 's'} · destino {deposito.nombre}
          </span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} disabled={creando} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2 disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={confirmar} disabled={creando || items.length === 0} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
              {creando ? <Loader size={16} className="animate-spin" /> : <PackagePlus size={16} />}
              Crear pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
