import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Receipt, ChevronDown, ChevronRight, Upload, FileText, Search, CheckCircle2 } from 'lucide-react';
import CurrencyInput from '../../components/CurrencyInput';
import { costosGastosService } from '../../services/costosGastosService';
import { getMetodosPago } from '../../services/courierApi';
import { productService } from '../../services/productService';
import { useDebounce } from '../../hooks/useDebounce';

const GRUPO_LABELS = {
  operacion: 'Operación', administracion: 'Administración', marketing: 'Marketing',
  tecnologia: 'Tecnología', financiero: 'Financiero', otros: 'Otros',
};

const FRECUENCIAS = [
  { id: 'semanal', label: 'Semanal' }, { id: 'quincenal', label: 'Quincenal' },
  { id: 'mensual', label: 'Mensual' }, { id: 'trimestral', label: 'Trimestral' },
  { id: 'semestral', label: 'Semestral' }, { id: 'anual', label: 'Anual' },
];

function hoyISO() { return new Date().toISOString().slice(0, 10); }

function estadoInicial(registro) {
  if (registro) {
    return {
      tipo: registro.tipo,
      concepto: registro.concepto || '',
      categoria_id: registro.categoria_id || '',
      importe: registro.importe ? Number(registro.importe) : '',
      fecha: registro.fecha || hoyISO(),
      frecuencia: registro.es_recurrente ? registro.frecuencia : '',
      descripcion: registro.descripcion || '',
      estado: registro.estado || 'pendiente',
      fecha_pago: registro.fecha_pago || '',
      clasificacion: registro.clasificacion || '',
      metodo_pago_id: registro.metodo_pago_id || '',
      proveedor_id: registro.proveedor_id || '',
      producto_id: registro.producto_id || '',
      producto_nombre: registro.producto?.nombre || '',
    };
  }
  return {
    tipo: 'gasto', concepto: '', categoria_id: '', importe: '', fecha: hoyISO(),
    frecuencia: '', descripcion: '', estado: 'pendiente', fecha_pago: '',
    clasificacion: '', metodo_pago_id: '', proveedor_id: '', producto_id: '', producto_nombre: '',
  };
}

export default function CostoGastoForm({ registro, categorias, proveedores, onCrearProveedor, onClose, onGuardado }) {
  const esEdicion = !!registro;
  const [paso, setPaso] = useState(esEdicion ? 'formulario' : 'seleccion');
  const [datos, setDatos] = useState(() => estadoInicial(registro));
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [registroGuardadoId, setRegistroGuardadoId] = useState(registro?.id || null);

  const [comprobante, setComprobante] = useState(null);
  const [metodosPago, setMetodosPago] = useState([]);
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [buscarProducto, setBuscarProducto] = useState('');
  const buscarProductoDebounced = useDebounce(buscarProducto, 300);
  const [resultadosProducto, setResultadosProducto] = useState([]);
  const [mostrarBusquedaProducto, setMostrarBusquedaProducto] = useState(false);

  useEffect(() => {
    getMetodosPago().then(setMetodosPago).catch(console.error);
  }, []);

  useEffect(() => {
    if (!mostrarBusquedaProducto || !buscarProductoDebounced.trim()) { setResultadosProducto([]); return; }
    productService.buscar({ texto: buscarProductoDebounced, limit: 8 })
      .then(d => setResultadosProducto(d.productos || []))
      .catch(console.error);
  }, [buscarProductoDebounced, mostrarBusquedaProducto]);

  const set = (campo) => (e) => setDatos(d => ({ ...d, [campo]: e?.target ? e.target.value : e }));

  const categoriasAgrupadas = useMemo(() => {
    const grupos = {};
    for (const c of categorias) {
      if (!grupos[c.grupo]) grupos[c.grupo] = [];
      grupos[c.grupo].push(c);
    }
    return grupos;
  }, [categorias]);

  const elegirTipo = (tipo) => { setDatos(d => ({ ...d, tipo })); setPaso('formulario'); };

  const validar = () => {
    if (!datos.concepto.trim()) return 'El concepto es requerido.';
    if (!datos.categoria_id) return 'La categoría es requerida.';
    if (!datos.importe || Number(datos.importe) <= 0) return 'El importe debe ser mayor a 0.';
    return '';
  };

  const construirPayload = () => ({
    tipo: datos.tipo,
    concepto: datos.concepto.trim(),
    categoria_id: Number(datos.categoria_id),
    importe: Number(datos.importe),
    fecha: datos.fecha,
    es_recurrente: !!datos.frecuencia,
    frecuencia: datos.frecuencia || null,
    descripcion: datos.descripcion || null,
    estado: datos.estado,
    fecha_pago: datos.fecha_pago || null,
    clasificacion: datos.clasificacion || null,
    metodo_pago_id: datos.metodo_pago_id || null,
    proveedor_id: datos.proveedor_id || null,
    producto_id: datos.producto_id || null,
  });

  const subirComprobanteSiCorresponde = async (id) => {
    if (!comprobante) return;
    const formData = new FormData();
    formData.append('comprobante', comprobante);
    await costosGastosService.subirComprobante(id, formData);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const msg = validar();
    if (msg) { setError(msg); return; }
    setError('');
    setGuardando(true);
    try {
      let id = registroGuardadoId;
      if (esEdicion) {
        await costosGastosService.actualizar(registro.id, construirPayload());
      } else {
        const creado = await costosGastosService.crear(construirPayload());
        id = creado.id;
        setRegistroGuardadoId(id);
      }
      await subirComprobanteSiCorresponde(id);
      setComprobante(null);

      if (!esEdicion && !avanzadoAbierto) {
        // Registro rápido: ofrecemos completar detalles antes de cerrar.
        setPaso('guardado');
      } else {
        onGuardado();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el registro.');
    } finally {
      setGuardando(false);
    }
  };

  const agregarProveedorRapido = async () => {
    if (!nuevoProveedor.trim()) return;
    const creado = await onCrearProveedor(nuevoProveedor.trim());
    setDatos(d => ({ ...d, proveedor_id: creado.id }));
    setNuevoProveedor('');
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">
            {esEdicion ? 'Editar registro' : 'Registrar costo o gasto'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"><X size={18} /></button>
        </div>

        {paso === 'seleccion' && (
          <div className="flex flex-1 flex-col justify-center gap-4 p-6">
            <p className="text-center text-sm font-medium text-fg-muted">¿Qué quieres registrar?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => elegirTipo('costo')}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface-2 p-5 text-left transition-colors hover:border-info hover:bg-info/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10 text-info"><Package size={18} /></div>
                <span className="text-base font-bold text-fg">Costo</span>
                <span className="text-xs text-fg-muted">Asociado directamente a la operación, producción o venta.</span>
              </button>
              <button type="button" onClick={() => elegirTipo('gasto')}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface-2 p-5 text-left transition-colors hover:border-primary hover:bg-primary/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Receipt size={18} /></div>
                <span className="text-base font-bold text-fg">Gasto</span>
                <span className="text-xs text-fg-muted">Necesario para mantener funcionando el negocio.</span>
              </button>
            </div>
          </div>
        )}

        {paso === 'guardado' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success"><CheckCircle2 size={28} /></div>
            <h4 className="m-0 text-base font-bold text-fg">Registrado correctamente</h4>
            <p className="m-0 max-w-xs text-sm text-fg-muted">¿Querés agregar proveedor, método de pago, comprobante u otros detalles?</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={onGuardado} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg">
                Listo por ahora
              </button>
              <button type="button" onClick={() => { setAvanzadoAbierto(true); setPaso('formulario'); }} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                Agregar detalles
              </button>
            </div>
          </div>
        )}

        {paso === 'formulario' && (
          <form onSubmit={guardar} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              {!esEdicion && (
                <div className="mb-4 flex gap-2">
                  {['costo', 'gasto'].map(t => (
                    <button key={t} type="button" onClick={() => setDatos(d => ({ ...d, tipo: t }))}
                      className={`flex-1 rounded-md border py-1.5 text-sm font-semibold transition-colors ${datos.tipo === t ? (t === 'costo' ? 'border-info bg-info/10 text-info' : 'border-primary bg-primary/10 text-primary') : 'border-border text-fg-muted hover:bg-surface-2'}`}>
                      {t === 'costo' ? 'Costo' : 'Gasto'}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Campo label="Concepto">
                  <input type="text" value={datos.concepto} onChange={set('concepto')} autoFocus
                    placeholder="Ej: Factura de electricidad"
                    className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle" />
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Categoría">
                    <select value={datos.categoria_id} onChange={set('categoria_id')} className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
                      <option value="">Seleccionar…</option>
                      {Object.entries(GRUPO_LABELS).map(([grupo, label]) => {
                        const items = categoriasAgrupadas[grupo];
                        if (!items) return null;
                        return <optgroup key={grupo} label={label}>{items.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>;
                      })}
                    </select>
                  </Campo>
                  <Campo label="Importe">
                    <CurrencyInput value={datos.importe} onChange={(v) => setDatos(d => ({ ...d, importe: v }))}
                      className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg" />
                  </Campo>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Fecha">
                    <input type="date" value={datos.fecha} onChange={set('fecha')} className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" />
                  </Campo>
                  <Campo label="Frecuencia">
                    <select value={datos.frecuencia} onChange={set('frecuencia')} className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
                      <option value="">Único</option>
                      {FRECUENCIAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </Campo>
                </div>
                {datos.frecuencia && (
                  <p className="-mt-1.5 text-xs text-fg-subtle">Se generará automáticamente cada período según la frecuencia elegida.</p>
                )}

                {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              </div>

              <button type="button" onClick={() => setAvanzadoAbierto(o => !o)}
                className="mt-5 flex w-full items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg">
                Opciones avanzadas
                {avanzadoAbierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {avanzadoAbierto && (
                <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
                  <Campo label="Descripción">
                    <textarea value={datos.descripcion} onChange={set('descripcion')} rows={2}
                      className="w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
                      placeholder="Información adicional (opcional)" />
                  </Campo>

                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Estado">
                      <select value={datos.estado} onChange={set('estado')} className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
                        <option value="pendiente">Pendiente</option>
                        <option value="pagado">Pagado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </Campo>
                    <Campo label="Fecha de pago">
                      <input type="date" value={datos.fecha_pago} onChange={set('fecha_pago')} className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" />
                    </Campo>
                  </div>

                  <Campo label="Clasificación">
                    <div className="flex gap-2">
                      {[{ id: '', label: 'Sin definir' }, { id: 'fijo', label: 'Fijo' }, { id: 'variable', label: 'Variable' }].map(o => (
                        <button key={o.id} type="button" onClick={() => setDatos(d => ({ ...d, clasificacion: o.id }))}
                          className={`flex-1 rounded-md border py-1.5 text-xs font-medium ${datos.clasificacion === o.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-fg-muted hover:bg-surface-2'}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </Campo>

                  <Campo label="Método de pago">
                    <select value={datos.metodo_pago_id} onChange={set('metodo_pago_id')} className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
                      <option value="">Sin especificar</option>
                      {metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </Campo>

                  <Campo label="Proveedor">
                    <div className="flex gap-2">
                      <select value={datos.proveedor_id} onChange={set('proveedor_id')} className="h-10 w-full flex-1 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
                        <option value="">Sin especificar</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      <input type="text" value={nuevoProveedor} onChange={e => setNuevoProveedor(e.target.value)}
                        placeholder="Agregar proveedor nuevo…"
                        className="h-8 flex-1 rounded-md border border-border bg-surface px-2 text-xs text-fg placeholder:text-fg-subtle" />
                      <button type="button" onClick={agregarProveedorRapido} className="rounded-md border border-border px-2 text-xs font-medium text-fg-muted hover:bg-surface-2">Agregar</button>
                    </div>
                  </Campo>

                  <Campo label="Producto asociado">
                    {datos.producto_id ? (
                      <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                        <span className="text-fg">{datos.producto_nombre}</span>
                        <button type="button" onClick={() => setDatos(d => ({ ...d, producto_id: '', producto_nombre: '' }))} className="text-fg-subtle hover:text-danger"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3">
                          <Search size={14} className="text-fg-subtle" />
                          <input type="text" value={buscarProducto}
                            onChange={e => { setBuscarProducto(e.target.value); setMostrarBusquedaProducto(true); }}
                            onFocus={() => setMostrarBusquedaProducto(true)}
                            placeholder="Buscar producto…"
                            className="h-10 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none" />
                        </div>
                        {mostrarBusquedaProducto && resultadosProducto.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-xl">
                            {resultadosProducto.map(p => (
                              <button key={p.id} type="button"
                                onClick={() => { setDatos(d => ({ ...d, producto_id: p.id, producto_nombre: p.nombre })); setMostrarBusquedaProducto(false); setBuscarProducto(''); }}
                                className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-surface-2">
                                {p.nombre}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Campo>

                  <Campo label="Comprobante">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-surface-2 px-3 py-3 text-sm text-fg-muted hover:border-primary hover:text-primary">
                      {comprobante ? <FileText size={16} /> : <Upload size={16} />}
                      {comprobante ? comprobante.name : (registro?.comprobante_url ? 'Reemplazar comprobante' : 'Adjuntar imagen o PDF')}
                      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                        onChange={e => setComprobante(e.target.files?.[0] || null)} />
                    </label>
                  </Campo>
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-border p-4">
              <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-fg-subtle">{label}</span>
      {children}
    </label>
  );
}
