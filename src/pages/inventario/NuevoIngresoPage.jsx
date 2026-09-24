import React, { useState, useEffect, useRef } from 'react';
import { Package, Truck, ArrowRight, CheckCircle2, Warehouse, Search, X, AlertCircle, ImageOff, Check, Layers } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { inventarioService } from '../../services/inventario.service';
import { getMediaUrl } from '../../services/api';

function claveSeleccion(producto_id, variante_id) {
  return `${producto_id}:${variante_id || 'base'}`;
}

/**
 * Tarjeta de producto para elegir qué enviar a Gesicomm. Estilo alineado al
 * ProductPicker de landing (grid con imagen, badge de stock, check al
 * seleccionar) en vez de la lista de texto plano que habia antes.
 */
function TarjetaProductoIngreso({ producto, seleccionActual, onToggleBase, onAbrirVariantes, variantesAbiertas, variantesCargando, variantes, onToggleVariante }) {
  const tieneVariantes = (producto.variantes_count || 0) > 0;
  const imagenUrl = producto.imagenes?.[0]?.url ? getMediaUrl(producto.imagenes[0].url) : null;
  const seleccionadoBase = !tieneVariantes && !!seleccionActual;
  const stock = producto.cantidad_disponible;

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${seleccionadoBase ? 'border-primary ring-1 ring-primary' : 'border-surface-border hover:border-primary/50'}`}>
      <button
        type="button"
        className="w-full text-left"
        onClick={() => tieneVariantes ? onAbrirVariantes(producto) : onToggleBase(producto)}
      >
        <div className="relative aspect-square bg-surface-2">
          {imagenUrl ? (
            <img src={imagenUrl} alt={producto.nombre} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-fg-subtle">
              <ImageOff size={22} />
            </div>
          )}
          {typeof stock === 'number' && (
            <span className={`absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${stock > 0 ? 'bg-surface/90 text-fg' : 'bg-danger/90 text-white'}`}>
              {stock > 0 ? `Stock ${stock}` : 'Sin stock'}
            </span>
          )}
          {seleccionadoBase && (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-sm font-medium text-fg leading-snug line-clamp-2">{producto.nombre}</p>
          <p className="text-xs text-fg-muted mt-0.5">{producto.sku || 'Sin SKU'}</p>
          {tieneVariantes && (
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <Layers size={11} /> {producto.variantes_count} variante{producto.variantes_count > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </button>

      {tieneVariantes && variantesAbiertas === producto.id && (
        <div className="border-t border-surface-border bg-surface-50 p-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {variantesCargando ? (
            <p className="text-xs text-fg-muted">Cargando variantes...</p>
          ) : variantes.length === 0 ? (
            <p className="text-xs text-fg-muted">Este producto no tiene variantes activas.</p>
          ) : (
            variantes.map((v) => {
              const elegida = !!seleccionActual?.[v.id];
              return (
                <label key={v.id} className="flex items-center justify-between gap-2 text-xs cursor-pointer py-1">
                  <span className="text-fg">{v.nombre || v.sku_variante || `Variante ${v.id}`}</span>
                  <input
                    type="checkbox"
                    checked={elegida}
                    onChange={() => onToggleVariante(producto, v)}
                    className="rounded border-surface-border text-primary focus:ring-primary"
                  />
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function NuevoIngresoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);

  // Paso 1: Seleccion
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [seleccionados, setSeleccionados] = useState([]); // { producto_id, variante_id, producto, variante, cantidad_declarada }
  const [variantesAbiertas, setVariantesAbiertas] = useState(null); // producto_id con el desplegable abierto
  const [variantesPorProducto, setVariantesPorProducto] = useState({}); // { [producto_id]: Variante[] }
  const [cargandoVariantes, setCargandoVariantes] = useState(false);
  const debounceRef = useRef(null);

  // Paso 2: Destino
  const [centros, setCentros] = useState([]);
  const [centroSeleccionado, setCentroSeleccionado] = useState(null);
  const [cargandoCentros, setCargandoCentros] = useState(true);

  useEffect(() => {
    cargarCentros();
    if (location.state?.preseleccionarProducto) {
      const p = location.state.preseleccionarProducto;
      setSeleccionados([{
        producto_id: p.id,
        variante_id: null,
        producto: p,
        variante: null,
        cantidad_declarada: 1
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    buscarProductos(busqueda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  const buscarProductos = (texto) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCargandoProductos(true);
      try {
        const resultado = await inventarioService.buscarProductosPropios({ texto, limit: 24 });
        setProductos(resultado.productos || []);
      } catch (error) {
        toast.error('No se pudieron cargar tus productos.');
      } finally {
        setCargandoProductos(false);
      }
    }, texto ? 300 : 0);
  };

  const cargarCentros = async () => {
    setCargandoCentros(true);
    try {
      const listaCentros = await inventarioService.listarCentrosGesicomm();
      setCentros(listaCentros);
      if (listaCentros.length === 1) {
        setCentroSeleccionado(listaCentros[0].id);
      }
    } catch (error) {
      toast.error('No se pudieron cargar los centros de Gesicomm.');
    } finally {
      setCargandoCentros(false);
    }
  };

  const estaSeleccionado = (producto_id, variante_id) =>
    seleccionados.some(s => s.producto_id === producto_id && (variante_id ? s.variante_id === variante_id : !s.variante_id));

  const toggleBase = (producto) => {
    if (estaSeleccionado(producto.id, null)) {
      setSeleccionados(seleccionados.filter(s => !(s.producto_id === producto.id && !s.variante_id)));
    } else {
      setSeleccionados([...seleccionados, {
        producto_id: producto.id,
        variante_id: null,
        producto,
        variante: null,
        cantidad_declarada: 1
      }]);
    }
  };

  const abrirVariantes = async (producto) => {
    if (variantesAbiertas === producto.id) {
      setVariantesAbiertas(null);
      return;
    }
    setVariantesAbiertas(producto.id);
    if (!variantesPorProducto[producto.id]) {
      setCargandoVariantes(true);
      try {
        const vars = await inventarioService.obtenerVariantes(producto.id);
        setVariantesPorProducto((prev) => ({ ...prev, [producto.id]: vars }));
      } catch (error) {
        toast.error('No se pudieron cargar las variantes.');
      } finally {
        setCargandoVariantes(false);
      }
    }
  };

  const toggleVariante = (producto, variante) => {
    if (estaSeleccionado(producto.id, variante.id)) {
      setSeleccionados(seleccionados.filter(s => !(s.producto_id === producto.id && s.variante_id === variante.id)));
    } else {
      setSeleccionados([...seleccionados, {
        producto_id: producto.id,
        variante_id: variante.id,
        producto,
        variante,
        cantidad_declarada: 1
      }]);
    }
  };

  // Mapa auxiliar para que la tarjeta sepa qué variantes de SU producto
  // estan elegidas, sin que cada tarjeta tenga que recorrer todo el array.
  const seleccionPorProducto = (producto_id) => {
    const propias = seleccionados.filter(s => s.producto_id === producto_id);
    if (propias.length === 0) return null;
    const mapa = {};
    propias.forEach(s => { if (s.variante_id) mapa[s.variante_id] = true; });
    return Object.keys(mapa).length > 0 ? mapa : propias[0];
  };

  const quitarSeleccion = (sel) => {
    setSeleccionados(seleccionados.filter(s => !(s.producto_id === sel.producto_id && s.variante_id === sel.variante_id)));
  };

  const updateCantidad = (idx, qty) => {
    const val = parseInt(qty, 10);
    const copy = [...seleccionados];
    copy[idx].cantidad_declarada = isNaN(val) || val < 1 ? 1 : val;
    setSeleccionados(copy);
  };

  const handleGenerarIngreso = async () => {
    if (!centroSeleccionado) {
      toast.error('Debe seleccionar un Centro de Destino.');
      return;
    }
    if (seleccionados.length === 0) {
      toast.error('Debe agregar al menos un producto.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        centro_gesicomm_id: centroSeleccionado,
        items: seleccionados.map(s => ({
          producto_id: s.producto_id,
          variante_id: s.variante_id,
          cantidad_declarada: s.cantidad_declarada
        }))
      };

      const borrador = await inventarioService.crearBorrador(payload);
      // Pasar a pendiente de envio directo, porque el wizard ya confirma la intencion
      await inventarioService.confirmarEnvio(borrador.id);

      toast.success('¡Aviso de envío generado correctamente!');
      navigate(`/inventario/${borrador.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al generar el ingreso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      <div className="px-6 py-5 bg-surface border-b border-surface-border">
        <h1 className="text-xl font-bold text-fg mb-1">Nuevo Ingreso a Fulfillment</h1>
        <p className="text-sm text-fg-muted">Enviá tu stock a los centros de Gesicomm para que nos encarguemos del picking y empaquetado.</p>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
        {/* Stepper Header */}
        <div className="flex items-center justify-between mb-8">
          <div className={`flex flex-col items-center ${paso >= 1 ? 'text-primary' : 'text-fg-muted'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${paso >= 1 ? 'border-primary bg-primary/10' : 'border-surface-border'}`}>
              <Package size={20} />
            </div>
            <span className="text-sm font-medium">1. Productos</span>
          </div>
          <div className={`flex-1 h-px mx-4 ${paso >= 2 ? 'bg-primary' : 'bg-surface-border'}`}></div>
          <div className={`flex flex-col items-center ${paso >= 2 ? 'text-primary' : 'text-fg-muted'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${paso >= 2 ? 'border-primary bg-primary/10' : 'border-surface-border'}`}>
              <Warehouse size={20} />
            </div>
            <span className="text-sm font-medium">2. Destino</span>
          </div>
          <div className={`flex-1 h-px mx-4 ${paso >= 3 ? 'bg-primary' : 'bg-surface-border'}`}></div>
          <div className={`flex flex-col items-center ${paso >= 3 ? 'text-primary' : 'text-fg-muted'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${paso >= 3 ? 'border-primary bg-primary/10' : 'border-surface-border'}`}>
              <CheckCircle2 size={20} />
            </div>
            <span className="text-sm font-medium">3. Revisión</span>
          </div>
        </div>

        {/* CONTENIDO DE LOS PASOS */}
        <div className="bg-surface border border-surface-border rounded-xl shadow-sm p-6 mb-6">

          {paso === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-fg mb-4">Seleccioná los productos a enviar</h2>

              <div className="flex gap-6">
                {/* Buscador + grid */}
                <div className="w-3/5 border-r border-surface-border pr-6">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o SKU..."
                      className="w-full pl-10 pr-4 py-2 bg-surface border border-surface-border rounded-lg text-sm focus:outline-none focus:border-primary"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>

                  {cargandoProductos ? (
                    <div className="h-64 flex items-center justify-center text-fg-muted text-sm">Cargando productos...</div>
                  ) : productos.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-fg-muted text-sm text-center gap-1">
                      <Package size={28} className="opacity-30 mb-1" />
                      {busqueda ? 'Ningún producto coincide con la búsqueda.' : 'No tenés productos propios cargados todavía.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 max-h-[28rem] overflow-auto pr-1">
                      {productos.map(p => (
                        <TarjetaProductoIngreso
                          key={p.id}
                          producto={p}
                          seleccionActual={seleccionPorProducto(p.id)}
                          onToggleBase={toggleBase}
                          onAbrirVariantes={abrirVariantes}
                          variantesAbiertas={variantesAbiertas}
                          variantesCargando={cargandoVariantes && variantesAbiertas === p.id}
                          variantes={variantesPorProducto[p.id] || []}
                          onToggleVariante={toggleVariante}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Seleccionados y Cantidades */}
                <div className="w-2/5 pl-2">
                  <h3 className="font-medium text-sm mb-4">Productos a incluir ({seleccionados.length})</h3>
                  {seleccionados.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-fg-muted bg-surface-50 rounded-lg border border-dashed border-surface-border">
                      <p className="text-sm">No has seleccionado ningún producto.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {seleccionados.map((sel, idx) => (
                        <div key={`${sel.producto_id}:${sel.variante_id || 'base'}`} className="flex items-center justify-between bg-surface-50 p-3 rounded-lg border border-surface-border">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{sel.producto.nombre}</p>
                            {sel.variante && <p className="text-xs text-fg-muted">{sel.variante.nombre}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <label className="text-xs text-fg-muted">Cant:</label>
                            <input
                              type="number"
                              min="1"
                              className="w-16 px-2 py-1 text-sm border border-surface-border rounded bg-surface"
                              value={sel.cantidad_declarada}
                              onChange={(e) => updateCantidad(idx, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => quitarSeleccion(sel)}
                              title="Quitar de la lista"
                              className="text-danger-text hover:bg-danger/10 p-1.5 rounded transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="max-w-xl mx-auto py-8">
              <h2 className="text-lg font-semibold text-fg mb-2">Seleccioná el Centro de Destino</h2>
              <p className="text-sm text-fg-muted mb-6">Elegí a cuál de nuestros centros enviarás la mercadería.</p>

              {cargandoCentros ? (
                <div className="h-24 flex items-center justify-center text-fg-muted text-sm">Cargando centros...</div>
              ) : centros.length === 0 ? (
                <div className="flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-lg p-4">
                  <AlertCircle size={20} className="text-warning-text mt-0.5 shrink-0" />
                  <p className="text-sm text-fg">Gesicomm todavía no tiene centros de fulfillment habilitados para tu cuenta. Contactá a soporte antes de continuar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {centros.map(c => (
                    <div
                      key={c.id}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${centroSeleccionado === c.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-surface-border hover:border-primary/50'}`}
                      onClick={() => setCentroSeleccionado(c.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${centroSeleccionado === c.id ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-fg-muted'}`}>
                          <Warehouse size={20} />
                        </div>
                        <div>
                          <h3 className="font-medium">{c.nombre}</h3>
                          <p className="text-sm text-fg-muted">{c.ciudad}{c.departamento ? `, ${c.departamento}` : ''}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {paso === 3 && (
            <div className="max-w-2xl mx-auto py-8">
              <h2 className="text-lg font-semibold text-fg mb-6 text-center">Resumen del Ingreso</h2>

              <div className="bg-surface-50 border border-surface-border rounded-xl p-6 mb-6">
                <div className="flex justify-between items-start mb-6 pb-6 border-b border-surface-border">
                  <div>
                    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Destino</p>
                    <p className="font-medium flex items-center gap-2"><Warehouse size={16} className="text-primary"/> {centros.find(c => c.id === centroSeleccionado)?.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Total Unidades</p>
                    <p className="font-medium text-lg text-primary">{seleccionados.reduce((acc, s) => acc + s.cantidad_declarada, 0)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Detalle de mercadería</p>
                  <div className="space-y-2">
                    {seleccionados.map((sel, i) => (
                      <div key={i} className="flex justify-between text-sm py-1">
                        <span className="text-fg">{sel.producto.nombre} {sel.variante ? `(${sel.variante.nombre})` : ''}</span>
                        <span className="font-medium">x{sel.cantidad_declarada}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-info/10 border border-info/20 rounded-lg p-4 text-sm text-info-text flex items-start gap-3">
                <Truck size={20} className="shrink-0 mt-0.5" />
                <p>Al confirmar, se generará un aviso de envío con estado <strong>Pendiente de envío</strong>. Gesicomm esperará recibir estas cantidades en el centro seleccionado para ingresarlas a tu stock disponible.</p>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER WIZARD */}
        <div className="flex justify-between">
          <button
            onClick={() => paso === 1 ? navigate('/inventario') : setPaso(p => p - 1)}
            className="btn-secondary"
          >
            {paso === 1 ? 'Cancelar' : 'Atrás'}
          </button>

          {paso < 3 ? (
            <button
              onClick={() => setPaso(p => p + 1)}
              disabled={(paso === 1 && seleccionados.length === 0) || (paso === 2 && !centroSeleccionado)}
              className="btn-primary"
            >
              Siguiente <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleGenerarIngreso}
              disabled={loading}
              className="btn-primary"
              style={{ background: '#059669' }}
            >
              {loading ? 'Procesando...' : 'Confirmar e Informar Envío'} <CheckCircle2 size={18} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
