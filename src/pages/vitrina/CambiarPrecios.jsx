import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Save, Percent, ChevronLeft, ChevronRight, Loader,
  Check, CheckCheck, SlidersHorizontal, PencilLine, ImageOff, X, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { vitrinaService } from '../../services/vitrinaService';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import './vitrina.css';
import './cambiarPrecios.css';

const clave = item => `${item.tipo}:${item.id}`;
const identidad = key => {
  const [tipo, id] = key.split(':');
  return { tipo, id: Number(id) };
};
const gs = n => n == null ? '—' : `${Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 })} Gs`;
const filtrosIniciales = { busqueda: '', categoria: '', proveedor: '', tipo: '', origen: '', orden: 'nombre' };
const filtroLabels = { categoria: 'Categoría', proveedor: 'Proveedor' };
const secciones = [
  { valor: 'producto-gesicom', label: 'Productos Gesicom', tipo: 'producto', origen: 'gesicomm' },
  { valor: 'combo-gesicom', label: 'Combos Gesicom', tipo: 'combo', origen: 'gesicomm' },
  { valor: 'producto-propio', label: 'Productos propios', tipo: 'producto', origen: 'propios' },
  { valor: 'combo-propio', label: 'Combos propios', tipo: 'combo', origen: 'propios' },
  { valor: 'landing', label: 'Productos en mi landing', tipo: 'landing', origen: '' },
  { valor: 'todos', label: 'Todos', tipo: '', origen: '' },
];
// Solo existe cuando se llega desde Mi catálogo con filas marcadas.
const seccionSeleccionados = { valor: 'seleccionados', label: 'Seleccionados', tipo: '', origen: '' };

// La selección de Mi catálogo llega por router state, nunca por la URL.
function leerPreseleccion(state) {
  const vistos = new Set();
  return (Array.isArray(state?.seleccion) ? state.seleccion : []).filter(item => {
    if (!item || !['producto', 'combo'].includes(item.tipo) || !Number.isSafeInteger(item.id) || item.id <= 0) return false;
    if (vistos.has(clave(item))) return false;
    vistos.add(clave(item));
    return true;
  }).map(({ tipo, id }) => ({ tipo, id }));
}

function validarPrecio(item, precio) {
  if (!Number.isSafeInteger(precio) || precio <= 0 || precio > 9999999999) return 'Ingresá un precio entero mayor a cero.';
  if (precio < (item.costo || 0)) return `Debe ser al menos ${gs(item.costo)} (costo).`;
  if (precio < (item.precio_minimo || 0)) return `Mínimo permitido: ${gs(item.precio_minimo)}.`;
  return '';
}

function FotoProducto({ item }) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [item.imagen]);
  return (
    <div className="precios-photo">
      {item.imagen && !fallo
        ? <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" onError={() => setFallo(true)} />
        : <span title="Este producto no tiene foto"><ImageOff size={20} /><span>Sin foto</span></span>}
    </div>
  );
}

export default function CambiarPrecios() {
  const navigate = useNavigate();
  const location = useLocation();
  const [preseleccion] = useState(() => leerPreseleccion(location.state));
  const [soloPreseleccion, setSoloPreseleccion] = useState(preseleccion.length > 0);
  const [query, setQuery] = useState({ ...filtrosIniciales, page: 1, limit: 25 });
  const [texto, setTexto] = useState('');
  const [data, setData] = useState({ items: [], total: 0, totalPages: 0, categorias: [], proveedores: [] });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [error, setError] = useState('');
  const [erroresFilas, setErroresFilas] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [reload, setReload] = useState(0);
  const [borradores, setBorradores] = useState({});
  // Lo marcado en Mi catálogo entra ya tildado ("todos" dentro de la sección
  // Seleccionados): el reajuste por porcentaje queda a un clic.
  const [todos, setTodos] = useState(preseleccion.length > 0);
  const [seleccion, setSeleccion] = useState(new Set());
  const [porcentaje, setPorcentaje] = useState('5');
  const [modo, setModo] = useState('manual');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);
  const checkPagina = useRef(null);
  const reajuste = modo === 'reajuste';
  const cambios = Object.values(borradores);
  const cantidad = todos ? Math.max(0, data.total - seleccion.size) : seleccion.size;
  const pendientes = reajuste ? cantidad : cambios.length;
  const porcentajeNumero = porcentaje.trim() === '' ? NaN : Number(porcentaje);
  const porcentajeValido = Number.isFinite(porcentajeNumero) && porcentajeNumero >= 0 && porcentajeNumero <= 1000;
  const hayBusquedaPendiente = texto.trim() !== query.busqueda;
  const bloqueado = guardando || cargando || hayBusquedaPendiente || !!errorCarga;
  const estaSeleccionado = item => todos ? !seleccion.has(clave(item)) : seleccion.has(clave(item));
  const filasSeleccionadas = data.items.filter(estaSeleccionado).length;
  const paginaSeleccionada = data.items.length > 0 && filasSeleccionadas === data.items.length;
  const filtros = useMemo(() => {
    const activos = Object.fromEntries(Object.entries(query).filter(([key, value]) => !['page', 'limit'].includes(key) && value !== ''));
    return soloPreseleccion ? { ...activos, items: preseleccion } : activos;
  }, [query, soloPreseleccion, preseleccion]);
  const filtrosActivos = Object.keys(filtroLabels).filter(key => query[key]);
  const seccionesVisibles = preseleccion.length ? [seccionSeleccionados, ...secciones] : secciones;
  const seccionActual = soloPreseleccion ? seccionSeleccionados
    : secciones.find(item => item.tipo === query.tipo && item.origen === query.origen) || secciones.at(-1);

  const calcularReajuste = item => item.costo > 0 && porcentajeValido
    ? Math.round(item.costo * (1 + porcentajeNumero / 100)) : null;
  const errorReajuste = item => item.costo == null || item.costo <= 0
    ? 'Este producto no tiene un costo válido.' : validarPrecio(item, calcularReajuste(item));
  const preciosInvalidos = reajuste
    ? !porcentajeValido || data.items.some(item => estaSeleccionado(item) && errorReajuste(item))
    : cambios.some(item => validarPrecio(item, item.precio));
  const puedeGuardar = !bloqueado && pendientes > 0 && !preciosInvalidos;

  useEffect(() => {
    const timer = setTimeout(() => setQuery(prev => prev.busqueda === texto.trim() ? prev : { ...prev, busqueda: texto.trim(), page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [texto]);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setErrorCarga('');
    vitrinaService.buscarPrecios({ ...filtros, page: query.page, limit: query.limit }).then(resultado => {
      if (cancelado) return;
      if (resultado.totalPages > 0 && query.page > resultado.totalPages) {
        setQuery(prev => ({ ...prev, page: resultado.totalPages }));
        return;
      }
      setData(resultado);
    }).catch(err => {
      if (!cancelado) setErrorCarga(err.response?.data?.message || 'No se pudieron cargar los precios. Intentá nuevamente.');
    }).finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [filtros, query.page, query.limit, reload]);

  useEffect(() => {
    if (checkPagina.current) checkPagina.current.indeterminate = filasSeleccionadas > 0 && !paginaSeleccionada;
  }, [filasSeleccionadas, paginaSeleccionada]);

  useEffect(() => {
    if (!pendientes) return;
    const avisar = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [pendientes]);

  function limpiarSeleccion() { setTodos(false); setSeleccion(new Set()); }
  function cambiarFiltro(campo, valor) {
    limpiarSeleccion(); setMensaje('');
    setQuery(prev => ({ ...prev, [campo]: valor, page: 1 }));
  }
  function limpiarFiltros() {
    limpiarSeleccion(); setTexto(''); setSoloPreseleccion(false);
    setQuery(prev => ({ ...prev, ...filtrosIniciales, orden: prev.orden, page: 1 }));
  }
  function cambiarSeccion(seccion) {
    limpiarSeleccion(); setMensaje('');
    setSoloPreseleccion(seccion.valor === seccionSeleccionados.valor);
    setQuery(prev => ({ ...prev, tipo: seccion.tipo, origen: seccion.origen, page: 1 }));
  }
  function limpiarSeccion() {
    const todosSeccion = secciones.at(-1);
    cambiarSeccion(todosSeccion);
  }
  function toggleFila(item) {
    if (bloqueado) return;
    setSeleccion(prev => {
      const next = new Set(prev), key = clave(item);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function togglePagina() {
    setSeleccion(prev => {
      const next = new Set(prev);
      data.items.forEach(item => {
        const key = clave(item);
        if (todos ? paginaSeleccionada : !paginaSeleccionada) next.add(key); else next.delete(key);
      });
      return next;
    });
  }
  function seleccionarFila(event, item) {
    if (event.target.closest('input, button, select, a, label')) return;
    toggleFila(item);
  }
  function cambiarModo(nuevo) {
    if (nuevo === modo) return;
    if (cambios.length && nuevo === 'reajuste') setConfirmacion({ tipo: 'modo', modo: nuevo });
    else { setModo(nuevo); setError(''); setErroresFilas([]); }
  }
  function editar(item, precio) {
    setMensaje(''); setError(''); setErroresFilas([]);
    setBorradores(prev => {
      const next = { ...prev };
      if (precio === item.precio_actual) delete next[clave(item)];
      else next[clave(item)] = { ...item, precio };
      return next;
    });
  }
  function siguienteCampo(event) {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    const campos = [...event.currentTarget.closest('table').querySelectorAll('input[aria-label^="Precio de venta de"]')];
    const siguiente = campos[campos.indexOf(event.currentTarget) + (event.key === 'Tab' && event.shiftKey ? -1 : 1)];
    if (siguiente) { event.preventDefault(); siguiente.focus(); siguiente.select(); }
    else if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
  }
  async function guardar(body) {
    if (guardando) return;
    setGuardando(true); setError(''); setErroresFilas([]); setMensaje('');
    try {
      const resultado = await vitrinaService.actualizarPrecios(body);
      setBorradores({}); limpiarSeleccion();
      const n = resultado.actualizados;
      setMensaje(n === 1 ? 'Se guardó 1 precio.' : `Se guardaron ${n} precios.${resultado.sin_cambios ? ` ${resultado.sin_cambios} ya tenían ese precio.` : ''}`);
      setConfirmacion(null); setReload(prev => prev + 1);
    } catch (err) {
      setConfirmacion(null);
      setError(err.response?.data?.message || 'No se pudieron guardar los precios. Tus cambios se conservaron para volver a intentar.');
      setErroresFilas(err.response?.data?.errores || []);
    } finally { setGuardando(false); }
  }
  function guardarCambios() {
    if (!puedeGuardar) return;
    if (!reajuste) {
      guardar({ modo: 'manual', cambios: cambios.map(item => ({ tipo: item.tipo, id: item.id, precio: item.precio })) });
      return;
    }
    setConfirmacion({
      tipo: 'reajuste', cantidad, porcentaje: porcentajeNumero,
      body: { modo: 'reajuste', porcentaje: porcentajeNumero, seleccion: todos
        ? { todos: true, filtros, excluidos: [...seleccion].map(identidad) }
        : { todos: false, items: [...seleccion].map(identidad) } },
    });
  }
  function volver() {
    if (pendientes) setConfirmacion({ tipo: 'salir' });
    else navigate('/mi-catalogo');
  }
  const confirmTitle = confirmacion?.tipo === 'reajuste' ? `Guardar ${confirmacion.cantidad} precios`
    : confirmacion?.tipo === 'salir' ? '¿Salir sin guardar?' : confirmacion?.tipo === 'modo' ? '¿Cambiar al reajuste por porcentaje?' : '¿Descartar los cambios?';
  const confirmDescription = confirmacion?.tipo === 'reajuste'
    ? `Cada precio de venta será su costo + ${confirmacion.porcentaje}%. Revisaste la vista previa en la tabla. Si algún precio no cumple el mínimo permitido, no se guardará ninguno.`
    : confirmacion?.tipo === 'modo' ? `Tenés ${cambios.length} cambio(s) manuales sin guardar. Se descartarán para comenzar el reajuste.`
      : `Tenés ${pendientes} precio(s) sin guardar. Si continuás, se descartarán.`;
  const renderPaginacion = (variant = '') => (
    <div className={`precios-pagination ${variant ? `precios-pagination--${variant}` : ''}`}>
      <label>Mostrar<select aria-label="Filas por página" value={query.limit} disabled={bloqueado} onChange={e => setQuery(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}>{[25, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label>
      <span>{data.total ? (query.page - 1) * query.limit + 1 : 0}–{Math.min(query.page * query.limit, data.total)} de {data.total}</span>
      <div><button aria-label="Página anterior" disabled={bloqueado || query.page <= 1} onClick={() => setQuery(prev => ({ ...prev, page: prev.page - 1 }))}><ChevronLeft size={16} /></button><span>{query.page} / {data.totalPages || 1}</span><button aria-label="Página siguiente" disabled={bloqueado || query.page >= data.totalPages} onClick={() => setQuery(prev => ({ ...prev, page: prev.page + 1 }))}><ChevronRight size={16} /></button></div>
    </div>
  );

  return (
    <div className="vit-page precios-page">
      <button className="precios-back" onClick={volver} disabled={guardando}><ArrowLeft size={16} /> Productos</button>
      <header className="precios-header">
        <div><span className="precios-eyebrow">MI CATÁLOGO</span><h1>Precios de venta</h1><p>Identificá tus productos, revisá los nuevos precios y guardá todo junto.</p></div>
        <span className="precios-result-count">{data.total.toLocaleString('es-PY')} productos y combos</span>
      </header>

      <section className="precios-workspace" aria-label="Editor de precios">
        <div className="precios-methods" role="tablist" aria-label="Cómo cambiar los precios">
          <button role="tab" aria-selected={!reajuste} aria-controls="precios-editor" className={!reajuste ? 'active' : ''} disabled={guardando} onClick={() => cambiarModo('manual')}><PencilLine size={16} /> Editar precios</button>
          <button role="tab" aria-selected={reajuste} aria-controls="precios-editor" className={reajuste ? 'active' : ''} disabled={guardando} onClick={() => cambiarModo('reajuste')}><Percent size={16} /> Reajustar por porcentaje</button>
        </div>
        <div id="precios-editor" className="precios-method-content">
          {reajuste ? (
            <div className="precios-adjust">
              <div className="precios-method-copy"><strong>Calculá la venta desde el costo</strong><p>Seleccioná las filas y elegí cuánto sumar al costo. El nuevo precio se muestra en la tabla.</p></div>
              <div className="precios-adjust-controls">
                <div className="precios-presets" aria-label="Porcentajes rápidos">{[5, 10].map(n => <button key={n} aria-pressed={porcentajeNumero === n} className={porcentajeNumero === n ? 'active' : ''} disabled={guardando} onClick={() => setPorcentaje(String(n))}>{n}%</button>)}</div>
                <label className="precios-percent"><span>Otro porcentaje</span><div><input aria-label="Porcentaje de reajuste" type="number" min="0" max="1000" step="0.1" value={porcentaje} disabled={guardando} onChange={e => setPorcentaje(e.target.value)} /><span>%</span></div></label>
                <span className="precios-formula">{porcentajeValido ? `${gs(100000)} + ${porcentajeNumero}% = ${gs(Math.round(100000 * (1 + porcentajeNumero / 100)))}` : 'Ingresá un porcentaje entre 0 y 1000.'}</span>
              </div>
            </div>
          ) : <div className="precios-manual-hint"><PencilLine size={16} /><p>Editá la columna <strong>Nuevo precio</strong>. Usá Tab o Enter para avanzar; guardá todos los cambios al terminar.</p></div>}
        </div>
      </section>

      {mensaje && <div className="precios-success" role="status"><Check size={17} />{mensaje}</div>}
      {error && <div className="precios-error-box" role="alert"><p>{error}</p>{erroresFilas.length > 0 && <ul>{erroresFilas.map(item => <li key={clave(item)}>{item.nombre}: {item.motivo}</li>)}</ul>}</div>}
      {errorCarga && <div className="precios-error-box" role="alert">{errorCarga} <button onClick={() => setReload(prev => prev + 1)}>Reintentar</button></div>}

      <section className="precios-catalog" aria-label="Productos y precios">
        <div className="precios-toolbar">
          <div className="precios-search"><Search size={17} /><input aria-label="Buscar productos" placeholder="Buscar producto o SKU…" value={texto} disabled={guardando} onChange={e => { setTexto(e.target.value); limpiarSeleccion(); }} />{texto && <button aria-label="Limpiar búsqueda" disabled={guardando} onClick={() => { setTexto(''); limpiarSeleccion(); }}><X size={14} /></button>}</div>
          <button className={`precios-filter-toggle ${filtrosAbiertos ? 'active' : ''}`} aria-expanded={filtrosAbiertos} aria-controls="precios-filter-panel" onClick={() => setFiltrosAbiertos(prev => !prev)}><SlidersHorizontal size={16} /> Filtros{filtrosActivos.length > 0 && <span>{filtrosActivos.length}</span>}</button>
          <select className="precios-sort" aria-label="Orden" value={query.orden} disabled={guardando} onChange={e => cambiarFiltro('orden', e.target.value)}><option value="nombre">Nombre A–Z</option><option value="recientes">Más recientes</option><option value="precio-asc">Menor precio</option><option value="precio-desc">Mayor precio</option></select>
        </div>
        <div className="precios-origin-strip" aria-label="Sección del catálogo">
          <span>Sección</span>
          <div className="precios-origin-tabs">
            {seccionesVisibles.map(item => (
              <button
                key={item.valor}
                type="button"
                className={seccionActual.valor === item.valor ? 'active' : ''}
                aria-pressed={seccionActual.valor === item.valor}
                disabled={guardando}
                onClick={() => cambiarSeccion(item)}
              >
                {item.label}{item.valor === seccionSeleccionados.valor && <> <span className="precios-origin-count">{preseleccion.length}</span></>}
              </button>
            ))}
          </div>
          {seccionActual.valor !== 'todos' && <button type="button" className="precios-origin-clear" disabled={guardando} onClick={limpiarSeccion}>Ver todos</button>}
        </div>
        {filtrosAbiertos && <div className="precios-filters" id="precios-filter-panel">
          <label>Categoría<select aria-label="Categoría" value={query.categoria} disabled={guardando} onChange={e => cambiarFiltro('categoria', e.target.value)}><option value="">Todas las categorías</option>{data.categorias.map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Proveedor<select aria-label="Proveedor" value={query.proveedor} disabled={guardando} onChange={e => cambiarFiltro('proveedor', e.target.value)}><option value="">Todos los proveedores</option>{data.proveedores.map(p => <option key={p}>{p}</option>)}</select></label>
        </div>}
        {(filtrosActivos.length > 0 || seccionActual.valor !== 'todos') && <div className="precios-filter-chips">{seccionActual.valor !== 'todos' && <button disabled={guardando} aria-label="Quitar filtro Sección" onClick={limpiarSeccion}>Sección: {seccionActual.label}<X size={12} /></button>}{filtrosActivos.map(key => <button key={key} disabled={guardando} aria-label={`Quitar filtro ${filtroLabels[key]}`} onClick={() => cambiarFiltro(key, '')}>{filtroLabels[key]}: {query[key]}<X size={12} /></button>)}<button disabled={guardando} onClick={limpiarFiltros}>Limpiar filtros</button></div>}
        <div className={`precios-selection ${cantidad ? 'has-selection' : ''}`}>
          <div><strong aria-live="polite">{cantidad ? `${cantidad} seleccionado${cantidad === 1 ? '' : 's'}` : 'Seleccioná con un clic en la fila'}</strong><span>{todos && soloPreseleccion ? 'Son los que marcaste en Mi catálogo' : todos ? 'Incluye todas las páginas del filtro actual' : cantidad ? 'La selección se conserva entre páginas' : 'También podés usar las casillas'}</span></div>
          <div className="precios-selection-actions">
            <button className="precios-select-all" disabled={bloqueado || !data.total || (todos && !seleccion.size)} onClick={() => { setTodos(true); setSeleccion(new Set()); }}><CheckCheck size={17} /> Seleccionar todos <span>{data.total}</span></button>
            {cantidad > 0 && <button className="precios-clear-selection" disabled={guardando} onClick={limpiarSeleccion}>Quitar selección</button>}
          </div>
        </div>
        {renderPaginacion('top')}

        <div className="precios-table-wrap" aria-busy={cargando}>
          <table className="precios-table">
            <caption className="precios-sr-only">Seleccioná un producto haciendo clic en su fila o usando Espacio o Enter. Los campos de precio se editan sin cambiar la selección.</caption>
            <thead><tr>
              <th className="precios-check-cell"><input ref={checkPagina} type="checkbox" aria-label="Seleccionar página" checked={paginaSeleccionada} disabled={bloqueado || !data.items.length} onChange={togglePagina} /></th>
              <th>Producto</th><th className="num">Costo</th><th className="num">Precio actual</th><th className="num precios-edit-heading">Nuevo precio <PencilLine size={12} /></th><th className="num">Cambio</th>
            </tr></thead>
            <tbody>
              {data.items.map(item => {
                const key = clave(item), borrador = borradores[key], elegido = estaSeleccionado(item);
                const valor = reajuste && elegido ? calcularReajuste(item) : borrador ? borrador.precio : item.precio_actual;
                const errorFila = reajuste && elegido ? errorReajuste(item) : borrador ? validarPrecio(item, valor) : '';
                const diferencia = typeof valor === 'number' && !errorFila ? valor - item.precio_actual : 0;
                const editado = !!borrador || (reajuste && elegido);
                return (
                  <tr key={key} tabIndex={bloqueado ? -1 : 0} aria-selected={elegido} className={`${elegido ? 'is-selected' : ''} ${editado ? 'is-dirty' : ''}`} onClick={e => seleccionarFila(e, item)}
                    onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleFila(item); } }}>
                    <td className="precios-check-cell"><input type="checkbox" aria-label={`Seleccionar ${item.nombre}`} checked={elegido} disabled={bloqueado} onChange={() => toggleFila(item)} /></td>
                    <td className="precios-product-cell"><div className="precios-product"><FotoProducto item={item} /><div className="precios-product-info"><strong title={item.nombre}>{item.nombre}</strong><span className="precios-product-meta">{item.tipo === 'combo' && <span className="precios-combo-label">Combo</span>}{item.sku && <span>SKU {item.sku}</span>}{item.proveedor && <span>{item.proveedor}</span>}</span>{item.categoria && <span className="precios-product-category">{item.categoria}</span>}</div></div></td>
                    <td className="num precios-cost-cell" data-label="Costo"><span>{gs(item.costo)}</span>{item.precio_minimo > (item.costo || 0) && <small>Mínimo {gs(item.precio_minimo)}</small>}</td>
                    <td className="num precios-current-cell" data-label="Precio actual">{gs(item.precio_actual)}</td>
                    <td className="precios-new-cell" data-label="Nuevo precio">
                      {reajuste ? <div className={`precios-calculated ${elegido ? 'is-ready' : ''}`}><span>{gs(valor)}</span>{elegido && porcentajeValido && <span className="precios-calculated-label">Costo + {porcentajeNumero}%</span>}</div>
                        : <div className={`precios-input-wrap ${borrador ? 'is-edited' : ''} ${errorFila ? 'invalid' : ''}`} onFocusCapture={e => e.target.select?.()}><CurrencyInput prefix="" aria-label={`Precio de venta de ${item.nombre}`} aria-invalid={!!errorFila} className="precios-input" value={valor} disabled={bloqueado} onChange={precio => editar(item, precio)} onKeyDown={siguienteCampo} /><span>Gs</span></div>}
                      {errorFila && <small className="precios-error" role="alert">{errorFila}</small>}
                    </td>
                    <td className="num precios-change-cell" data-label="Cambio">{diferencia !== 0 ? <span className={`precios-difference ${diferencia > 0 ? 'up' : 'down'}`}>{diferencia > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{diferencia > 0 ? '+' : '−'}{gs(Math.abs(diferencia))}</span> : <span className="precios-no-change">Sin cambios</span>}</td>
                  </tr>
                );
              })}
              {!data.items.length && <tr><td colSpan={6} className="precios-empty">{cargando ? <><Loader size={22} className="spin-icon" /> Cargando productos…</> : errorCarga ? 'No se pudo cargar la tabla.' : <><Search size={24} /><strong>No encontramos productos</strong><span>Probá otro nombre o cambiá los filtros.</span></>}</td></tr>}
            </tbody>
          </table>
        </div>
        {renderPaginacion()}
      </section>

      <div className={`precios-savebar ${pendientes ? 'has-changes' : ''}`}>
        <div className="precios-save-summary"><span className={`precios-status-dot ${pendientes ? 'pending' : ''}`} /><div><strong>{guardando ? 'Guardando precios…' : pendientes ? `${pendientes} precio${pendientes === 1 ? '' : 's'} por guardar` : 'Sin cambios pendientes'}</strong><span>{preciosInvalidos && pendientes ? 'Corregí los precios marcados antes de guardar.' : reajuste && !cantidad ? 'Seleccioná productos para ver el reajuste.' : pendientes ? reajuste ? `Costo + ${porcentajeNumero}%. Revisá la columna Nuevo precio.` : 'Se incluyen los cambios de otras páginas.' : 'Los cambios se guardan juntos desde acá.'}</span></div></div>
        <div className="precios-save-actions">{pendientes > 0 && <button className="precios-discard" disabled={guardando} onClick={() => setConfirmacion({ tipo: 'descartar' })}>Descartar</button>}<button className="precios-save" disabled={!puedeGuardar} onClick={guardarCambios}>{guardando ? <Loader size={16} className="spin-icon" /> : <Save size={16} />} Guardar cambios{pendientes > 0 ? ` (${pendientes})` : ''}</button></div>
      </div>

      <ConfirmDialog open={!!confirmacion} loading={guardando} title={confirmTitle} description={confirmDescription}
        confirmLabel={confirmacion?.tipo === 'reajuste' ? 'Confirmar guardado' : confirmacion?.tipo === 'modo' ? 'Descartar y continuar' : 'Descartar'}
        onCancel={() => { if (!guardando) setConfirmacion(null); }}
        onConfirm={() => {
          if (guardando) return;
          if (confirmacion.tipo === 'reajuste') guardar(confirmacion.body);
          else if (confirmacion.tipo === 'salir') navigate('/mi-catalogo');
          else {
            setBorradores({});
            if (confirmacion.tipo === 'modo') setModo(confirmacion.modo);
            else limpiarSeleccion();
            setConfirmacion(null);
          }
        }} />
    </div>
  );
}
