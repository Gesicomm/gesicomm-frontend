import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Mail,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Users,
  XCircle,
} from 'lucide-react';
import API from '../../services/api';
import './prospectos.css';

const RESUMEN_VACIO = {
  total: 0,
  sin_comprar: 0,
  datos_completados: 0,
  checkout_iniciado: 0,
  prueba_activa: 0,
  comprado: 0,
  cancelado: 0,
};

const PAGINACION_VACIA = {
  total: 0,
  pagina: 1,
  limit: 20,
  total_paginas: 0,
  desde: 0,
  hasta: 0,
  tiene_anterior: false,
  tiene_siguiente: false,
};

const FILTROS_VACIOS = {
  paises: [],
  planes: [],
  origenes: ['portada', 'solicitar_prueba', 'crear_cuenta', 'hotmart'],
};

const ESTADOS_META = {
  datos_completados: { label: 'Dejó sus datos', tono: 'info' },
  checkout_iniciado: { label: 'Llegó al carrito', tono: 'warning' },
  prueba_activa: { label: 'Prueba activa', tono: 'success' },
  comprado: { label: 'Pagó', tono: 'success' },
  cancelado: { label: 'Cancelado', tono: 'danger' },
};

const ORIGENES_LABEL = {
  portada: 'Portada',
  solicitar_prueba: 'Paso 1 · Registro',
  crear_cuenta: 'Paso 2 · Carrito',
  hotmart: 'Hotmart directo',
};

const PLANES_LABEL = {
  'hotmart-starter-founder': 'Starter Founder · USD 47/mes',
  'hotmart-starter-founder-anual': 'Starter Founder · USD 470/año',
  'hotmart-starter': 'Starter · USD 57/mes',
  'hotmart-starter-anual': 'Starter · USD 570/año',
  'hotmart-scaler': 'Scaler · USD 77/mes',
  'hotmart-builder-t2e': 'Builder T2E · USD 37/mes',
  'hotmart-builder-t2e-anual': 'Builder T2E · USD 370/año',
};

const KPIS = [
  { id: 'todos', label: 'Todos', key: 'total', icono: Users },
  { id: 'sin_comprar', label: 'Sin pagar', key: 'sin_comprar', icono: Clock },
  { id: 'datos_completados', label: 'Dejó datos', key: 'datos_completados', icono: Users },
  { id: 'checkout_iniciado', label: 'Llegó al carrito', key: 'checkout_iniciado', icono: ShoppingCart },
  { id: 'prueba_activa', label: 'Prueba activa', key: 'prueba_activa', icono: CheckCircle2 },
  { id: 'comprado', label: 'Pagó', key: 'comprado', icono: CreditCard },
  { id: 'cancelado', label: 'Cancelados', key: 'cancelado', icono: XCircle },
];

const ORDENES = [
  { value: 'recientes', label: 'Más recientes primero' },
  { value: 'antiguos', label: 'Más antiguos primero' },
  { value: 'etapa_desc', label: 'Mayor avance en embudo' },
  { value: 'nombre_asc', label: 'Nombre A–Z' },
];

function formatearFechaHora(valor) {
  if (!valor) return null;
  try {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return null;
    return fecha.toLocaleString('es-PY', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

function whatsappHref(telefono) {
  const digitos = String(telefono || '').replace(/\D/g, '');
  return digitos.length >= 6 ? `https://wa.me/${digitos}` : null;
}

function construirVentanaPaginas(paginaActual, totalPaginas) {
  if (totalPaginas <= 1) return [];
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, idx) => idx + 1);
  }
  const paginas = [1];
  const inicio = Math.max(2, paginaActual - 1);
  const fin = Math.min(totalPaginas - 1, paginaActual + 1);
  if (inicio > 2) paginas.push('...');
  for (let i = inicio; i <= fin; i++) paginas.push(i);
  if (fin < totalPaginas - 1) paginas.push('...');
  paginas.push(totalPaginas);
  return paginas;
}

export default function Prospectos() {
  const [estado, setEstado] = useState('todos');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pais, setPais] = useState('');
  const [plan, setPlan] = useState('');
  const [origen, setOrigen] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('recientes');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [revision, setRevision] = useState(0);

  const [prospectos, setProspectos] = useState([]);
  const [resumen, setResumen] = useState(RESUMEN_VACIO);
  const [paginacion, setPaginacion] = useState(PAGINACION_VACIA);
  const [filtrosDisponibles, setFiltrosDisponibles] = useState(FILTROS_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);

  const requestSeqRef = useRef(0);

  useEffect(() => {
    const limpio = busquedaInput.trim();
    if (limpio === busqueda) return undefined;
    const timer = setTimeout(() => {
      setPage(1);
      setBusqueda(limpio);
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaInput, busqueda]);

  const cargar = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setCargando(true);
    setError('');
    API.post('/publico/admin/prospectos-registro/buscar', {
      estado,
      busqueda,
      pais,
      plan,
      origen,
      ordenarPor,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      page,
      limit,
    })
      .then(({ data }) => {
        if (seq !== requestSeqRef.current) return;
        const payload = data && typeof data === 'object' ? data : {};
        const pag = payload.paginacion && typeof payload.paginacion === 'object'
          ? { ...PAGINACION_VACIA, ...payload.paginacion }
          : {
              ...PAGINACION_VACIA,
              total: Number(payload.total || 0),
              pagina: Number(payload.pagina || page || 1),
              limit,
              total_paginas: Number(payload.total_paginas || 0),
            };
        setProspectos(Array.isArray(payload.prospectos) ? payload.prospectos : []);
        setResumen(payload.resumen && typeof payload.resumen === 'object' ? { ...RESUMEN_VACIO, ...payload.resumen } : RESUMEN_VACIO);
        setPaginacion(pag);
        if (pag.pagina && pag.pagina !== page) {
          setPage(pag.pagina);
        }
        if (payload.filtros_disponibles && typeof payload.filtros_disponibles === 'object') {
          setFiltrosDisponibles({
            paises: Array.isArray(payload.filtros_disponibles.paises) ? payload.filtros_disponibles.paises : [],
            planes: Array.isArray(payload.filtros_disponibles.planes) ? payload.filtros_disponibles.planes : [],
            origenes: Array.isArray(payload.filtros_disponibles.origenes) && payload.filtros_disponibles.origenes.length
              ? payload.filtros_disponibles.origenes
              : FILTROS_VACIOS.origenes,
          });
        }
      })
      .catch(() => {
        if (seq !== requestSeqRef.current) return;
        setError('No pudimos cargar el listado de prospectos. Volvé a intentar.');
      })
      .finally(() => {
        if (seq === requestSeqRef.current) setCargando(false);
      });
  }, [estado, busqueda, pais, plan, origen, ordenarPor, fechaDesde, fechaHasta, page, limit, revision]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function aplicarBusqueda(event) {
    event.preventDefault();
    const limpio = busquedaInput.trim();
    if (limpio === busqueda && page === 1) {
      setRevision((r) => r + 1);
      return;
    }
    setPage(1);
    setBusqueda(limpio);
  }

  function limpiarFiltros() {
    setEstado('todos');
    setBusquedaInput('');
    setBusqueda('');
    setPais('');
    setPlan('');
    setOrigen('');
    setOrdenarPor('recientes');
    setFechaDesde('');
    setFechaHasta('');
    setPage(1);
  }

  async function exportarCsv() {
    if (exportando) return;
    setExportando(true);
    setError('');
    try {
      const { data } = await API.post('/publico/admin/prospectos-registro/exportar', {
        estado,
        busqueda: busquedaInput.trim() || busqueda,
        pais,
        plan,
        origen,
        ordenarPor,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      }, { responseType: 'blob' });
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'prospectos-gesicom.csv';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('No pudimos exportar el archivo CSV.');
    } finally {
      setExportando(false);
    }
  }

  const hayFiltros = estado !== 'todos'
    || Boolean(busquedaInput.trim() || busqueda)
    || Boolean(pais)
    || Boolean(plan)
    || Boolean(origen)
    || ordenarPor !== 'recientes'
    || Boolean(fechaDesde)
    || Boolean(fechaHasta);

  const ventanaPaginas = useMemo(
    () => construirVentanaPaginas(paginacion.pagina, paginacion.total_paginas),
    [paginacion.pagina, paginacion.total_paginas]
  );

  return (
    <main className="admin-prospects gc-panel" aria-labelledby="titulo-prospectos">
      <header className="admin-prospects__header">
        <div>
          <h1 id="titulo-prospectos">Prospectos</h1>
          <p>
            Seguimiento de cada persona desde que deja sus datos hasta que llega al carrito, activa su prueba o paga en Hotmart.
          </p>
        </div>
        <div className="admin-prospects__actions">
          <button
            type="button"
            className="admin-prospects__btn-secondary"
            onClick={() => setRevision((r) => r + 1)}
            disabled={cargando}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Actualizar
          </button>
          <button
            type="button"
            className="admin-prospects__btn-primary"
            onClick={exportarCsv}
            disabled={exportando}
          >
            <Download size={16} aria-hidden="true" />
            {exportando ? 'Exportando…' : 'Exportar .csv'}
          </button>
        </div>
      </header>

      <section className="admin-prospects__kpis" role="group" aria-label="Resumen por etapa del embudo">
        {KPIS.map((kpi) => {
          const Icono = kpi.icono;
          const activo = estado === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              className={`admin-prospects__kpi ${activo ? 'is-active' : ''}`}
              aria-pressed={activo}
              onClick={() => {
                setEstado(kpi.id);
                setPage(1);
              }}
            >
              <span className="admin-prospects__kpi-label">
                <Icono size={15} aria-hidden="true" />
                {kpi.label}
              </span>
              <strong>{resumen[kpi.key] ?? 0}</strong>
            </button>
          );
        })}
      </section>

      <form className="admin-prospects__filters" onSubmit={aplicarBusqueda} aria-label="Filtros de prospectos">
        <label className="admin-prospects__filter-search">
          <span>Buscar por nombre, correo o teléfono</span>
          <div className="admin-prospects__search-box">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              placeholder="Nombre, correo o número"
            />
          </div>
        </label>

        <label>
          <span>Hasta dónde llegó</span>
          <select
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setPage(1);
            }}
          >
            <option value="todos">Todas las etapas</option>
            <option value="sin_comprar">Sin pagar (datos o carrito)</option>
            <option value="datos_completados">Dejó sus datos (Paso 1)</option>
            <option value="checkout_iniciado">Llegó al carrito (Paso 2)</option>
            <option value="prueba_activa">Prueba gratuita activa</option>
            <option value="comprado">Pagó suscripción</option>
            <option value="cancelado">Cancelado / revertido</option>
          </select>
        </label>

        <label>
          <span>País</span>
          <select
            value={pais}
            onChange={(e) => {
              setPais(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los países</option>
            {filtrosDisponibles.paises.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Plan</span>
          <select
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los planes</option>
            {filtrosDisponibles.planes.map((codigo) => (
              <option key={codigo} value={codigo}>
                {PLANES_LABEL[codigo] || codigo}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Origen</span>
          <select
            value={origen}
            onChange={(e) => {
              setOrigen(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los orígenes</option>
            {filtrosDisponibles.origenes.map((item) => (
              <option key={item} value={item}>{ORIGENES_LABEL[item] || item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Desde</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value);
              setPage(1);
            }}
          />
        </label>

        <label>
          <span>Hasta</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => {
              setFechaHasta(e.target.value);
              setPage(1);
            }}
          />
        </label>

        <label>
          <span>Ordenar</span>
          <select
            value={ordenarPor}
            onChange={(e) => {
              setOrdenarPor(e.target.value);
              setPage(1);
            }}
          >
            {ORDENES.map((ord) => (
              <option key={ord.value} value={ord.value}>{ord.label}</option>
            ))}
          </select>
        </label>

        <div className="admin-prospects__filter-actions">
          <button type="submit" className="admin-prospects__btn-primary">
            Buscar
          </button>
          {hayFiltros && (
            <button type="button" className="admin-prospects__btn-secondary" onClick={limpiarFiltros}>
              <RotateCcw size={15} aria-hidden="true" />
              Limpiar
            </button>
          )}
        </div>
      </form>

      <div className="admin-prospects__toolbar">
        <p className="admin-prospects__count" role="status">
          {cargando
            ? 'Cargando prospectos…'
            : paginacion.total === 0
              ? '0 prospectos encontrados'
              : `Mostrando ${paginacion.desde}–${paginacion.hasta} de ${paginacion.total} prospectos`}
        </p>

        <label className="admin-prospects__per-page">
          <span>Por página</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((cantidad) => (
              <option key={cantidad} value={cantidad}>{cantidad}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div role="alert" className="admin-prospects__alert">
          <p>{error}</p>
          <button type="button" className="admin-prospects__btn-secondary" onClick={cargar}>
            Reintentar
          </button>
        </div>
      ) : !cargando && prospectos.length === 0 ? (
        <div className="admin-prospects__empty">
          <Users size={34} aria-hidden="true" />
          <h2>No hay prospectos para estos filtros</h2>
          <p>Probá cambiar la etapa, el país o el rango de fechas para ver otros registros.</p>
        </div>
      ) : (
        <div className="admin-prospects__table-wrap">
          <table className="admin-prospects__table">
            <thead>
              <tr>
                <th>Nombre y correo</th>
                <th>Teléfono y país</th>
                <th>Hasta dónde llegó</th>
                <th>Plan y pago</th>
                <th>Fecha y hora</th>
              </tr>
            </thead>
            <tbody>
              {prospectos.map((p) => {
                const estadoInfo = ESTADOS_META[p.estado] || { label: p.etapa_label || p.estado, tono: 'info' };
                const etapaTexto = p.etapa_label || estadoInfo.label;
                const llegoAlCarrito = p.llego_al_carrito ?? Boolean(p.checkout_iniciado_en || ['checkout_iniciado', 'prueba_activa', 'comprado'].includes(p.estado));
                const llegoAPagar = p.llego_a_pagar ?? Boolean(p.prueba_activada_en || p.comprado_en || ['prueba_activa', 'comprado'].includes(p.estado));
                const pagoConfirmado = p.pago_confirmado ?? Boolean(p.comprado_en || p.estado === 'comprado');
                const waUrl = whatsappHref(p.whatsapp);
                const fechaPrincipal = formatearFechaHora(p.fecha_ultima_actividad || p.updated_at || p.created_at);
                const fechaDatos = formatearFechaHora(p.paso_1_en || p.created_at);
                const fechaCarrito = formatearFechaHora(p.checkout_iniciado_en);
                const fechaPrueba = formatearFechaHora(p.prueba_activada_en);
                const fechaPago = formatearFechaHora(p.comprado_en);
                const fechaCancelado = formatearFechaHora(p.cancelado_en);

                return (
                  <tr key={p.id}>
                    <td data-label="Nombre y correo">
                      <div className="admin-prospects__person">
                        <strong>{p.nombre || 'Sin nombre todavía'}</strong>
                        <a href={`mailto:${p.email}`}>
                          <Mail size={15} aria-hidden="true" />
                          {p.email}
                        </a>
                        {p.origen && (
                          <span className="admin-prospects__origin">
                            {ORIGENES_LABEL[p.origen] || p.origen}
                          </span>
                        )}
                      </div>
                    </td>

                    <td data-label="Teléfono y país">
                      <div className="admin-prospects__contact">
                        {p.whatsapp ? (
                          waUrl ? (
                            <a href={waUrl} target="_blank" rel="noopener noreferrer">
                              <MessageCircle size={15} aria-hidden="true" />
                              {p.whatsapp}
                            </a>
                          ) : (
                            <span>{p.whatsapp}</span>
                          )
                        ) : (
                          <span className="admin-prospects__muted">Sin teléfono</span>
                        )}
                        <span className="admin-prospects__country">
                          {p.pais || 'País sin indicar'}
                        </span>
                      </div>
                    </td>

                    <td data-label="Hasta dónde llegó">
                      <div className="admin-prospects__stage">
                        <span className={`admin-prospects__badge is-${estadoInfo.tono}`}>
                          {etapaTexto}
                        </span>
                        <div className="admin-prospects__steps" aria-label="Hitos completados">
                          <span className="is-done">Datos</span>
                          <span className={llegoAlCarrito ? 'is-done' : ''}>
                            Carrito: {llegoAlCarrito ? 'Sí' : 'No'}
                          </span>
                          <span className={llegoAPagar ? 'is-done' : ''}>
                            {pagoConfirmado ? 'Pagó: Sí' : llegoAPagar ? 'Prueba: Activa' : 'Pagó: No'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td data-label="Plan y pago">
                      <div className="admin-prospects__plan">
                        <span>{p.plan_codigo ? (PLANES_LABEL[p.plan_codigo] || p.plan_codigo) : 'Sin plan elegido'}</span>
                        {p.monto_pagado > 0 && (
                          <strong>{p.moneda || 'USD'} {p.monto_pagado}</strong>
                        )}
                        {p.oferta_hotmart && (
                          <span className="admin-prospects__muted">Oferta {p.oferta_hotmart}</span>
                        )}
                      </div>
                    </td>

                    <td data-label="Fecha y hora">
                      <div className="admin-prospects__dates">
                        {fechaPrincipal && (
                          <time dateTime={p.fecha_ultima_actividad || p.updated_at || p.created_at}>
                            {fechaPrincipal}
                          </time>
                        )}
                        {fechaDatos && <span>Datos: {fechaDatos}</span>}
                        {fechaCarrito && <span>Carrito: {fechaCarrito}</span>}
                        {fechaPrueba && <span>Prueba: {fechaPrueba}</span>}
                        {fechaPago && <span>Pago: {fechaPago}</span>}
                        {fechaCancelado && <span>Cancelado: {fechaCancelado}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paginacion.total_paginas > 1 && (
        <nav className="admin-prospects__pagination" aria-label="Paginación de prospectos">
          <button
            type="button"
            className="admin-prospects__btn-secondary"
            disabled={!paginacion.tiene_anterior || cargando}
            onClick={() => setPage(paginacion.pagina - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Anterior
          </button>

          <div className="admin-prospects__page-numbers">
            {ventanaPaginas.map((item, idx) => (
              item === '...' ? (
                <span key={`sep-${idx}`} className="admin-prospects__ellipsis" aria-hidden="true">…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`admin-prospects__page-btn ${item === paginacion.pagina ? 'is-current' : ''}`}
                  aria-current={item === paginacion.pagina ? 'page' : undefined}
                  disabled={cargando}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              )
            ))}
          </div>

          <button
            type="button"
            className="admin-prospects__btn-secondary"
            disabled={!paginacion.tiene_siguiente || cargando}
            onClick={() => setPage(paginacion.pagina + 1)}
          >
            Siguiente
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}
    </main>
  );
}
