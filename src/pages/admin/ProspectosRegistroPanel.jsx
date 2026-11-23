import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Mail,
  MessageCircle,
  Search,
  Users,
  X,
} from 'lucide-react';
import API from '../../services/api';

const RESUMEN_VACIO = {
  total: 0,
  sin_comprar: 0,
  datos_completados: 0,
  checkout_iniciado: 0,
  prueba_activa: 0,
  comprado: 0,
  cancelado: 0,
};

const ESTADOS_PROSPECTO = {
  datos_completados: { label: 'Solo datos (Paso 1)', tono: 'info' },
  checkout_iniciado: { label: 'No completó pago', tono: 'warning' },
  prueba_activa: { label: 'Prueba activa', tono: 'success' },
  comprado: { label: 'Compró', tono: 'success' },
  cancelado: { label: 'Cancelado', tono: 'danger' },
};

const ORIGENES = {
  portada: 'Portada',
  solicitar_prueba: 'Paso 1',
  crear_cuenta: 'Paso 2',
  hotmart: 'Hotmart',
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
  { id: 'sin_comprar', label: 'Sin comprar', key: 'sin_comprar', icono: Clock },
  { id: 'datos_completados', label: 'Solo datos', key: 'datos_completados', icono: Users },
  { id: 'checkout_iniciado', label: 'No completó pago', key: 'checkout_iniciado', icono: Clock },
  { id: 'prueba_activa', label: 'Prueba activa', key: 'prueba_activa', icono: CheckCircle2 },
  { id: 'comprado', label: 'Compraron', key: 'comprado', icono: CreditCard },
  { id: 'cancelado', label: 'Cancelados', key: 'cancelado', icono: X },
];

function formatearFecha(valor) {
  if (!valor) return null;
  try {
    return new Date(valor).toLocaleString('es-PY', {
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

export default function ProspectosRegistroPanel({ revision = 0 }) {
  const [estado, setEstado] = useState('todos');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(1);

  const [prospectos, setProspectos] = useState([]);
  const [resumen, setResumen] = useState(RESUMEN_VACIO);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    API.post('/publico/admin/prospectos-registro/buscar', {
      estado,
      busqueda,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      page,
      limit: 20,
    })
      .then(({ data }) => {
        if (!vigente) return;
        const payload = data && typeof data === 'object' ? data : {};
        setProspectos(Array.isArray(payload.prospectos) ? payload.prospectos : []);
        setResumen(payload.resumen && typeof payload.resumen === 'object' ? { ...RESUMEN_VACIO, ...payload.resumen } : RESUMEN_VACIO);
        setTotal(Number(payload.total || 0));
        setTotalPaginas(Number(payload.total_paginas || 0));
      })
      .catch(() => {
        if (vigente) setError('No pudimos cargar el embudo de prueba gratuita y compras.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, [estado, busqueda, fechaDesde, fechaHasta, page, revision]);

  useEffect(() => cargar(), [cargar]);

  function aplicarBusqueda(event) {
    event.preventDefault();
    setPage(1);
    setBusqueda(busquedaInput.trim());
  }

  function limpiarFiltros() {
    setEstado('todos');
    setBusquedaInput('');
    setBusqueda('');
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
        busqueda,
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
      setError('No pudimos exportar el listado CSV.');
    } finally {
      setExportando(false);
    }
  }

  const hayFiltros = estado !== 'todos' || Boolean(busqueda) || Boolean(fechaDesde) || Boolean(fechaHasta);

  return (
    <section className="prospects-panel" aria-labelledby="titulo-embudo-prueba">
      <div className="prospects-header">
        <div>
          <h2 id="titulo-embudo-prueba">Prueba gratuita y compras</h2>
          <p>Seguimiento de personas que dejaron sus datos, no completaron el pago, activaron la prueba o compraron en Hotmart.</p>
        </div>
        <button
          type="button"
          className="prospects-export-btn"
          onClick={exportarCsv}
          disabled={exportando}
        >
          <Download size={16} aria-hidden="true" />
          {exportando ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      <div className="prospects-kpis" role="group" aria-label="Resumen por etapa">
        {KPIS.map((kpi) => {
          const Icono = kpi.icono;
          const activo = estado === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              className={`prospect-kpi ${activo ? 'is-active' : ''}`}
              aria-pressed={activo}
              onClick={() => { setEstado(kpi.id); setPage(1); }}
            >
              <span className="prospect-kpi-label">
                <Icono size={15} aria-hidden="true" />
                {kpi.label}
              </span>
              <strong>{resumen[kpi.key] ?? 0}</strong>
            </button>
          );
        })}
      </div>

      <form className="prospects-filters" onSubmit={aplicarBusqueda}>
        <label className="prospects-filter-search">
          <span>Buscar prospecto</span>
          <div className="prospects-search-box">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              placeholder="Nombre, correo o WhatsApp"
            />
          </div>
        </label>

        <label>
          <span>Etapa</span>
          <select
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPage(1); }}
          >
            <option value="todos">Todas las etapas</option>
            <option value="sin_comprar">Sin comprar (Paso 1 y Paso 2)</option>
            <option value="datos_completados">Solo completó datos (Paso 1)</option>
            <option value="checkout_iniciado">No completó pago (Paso 2)</option>
            <option value="prueba_activa">Prueba gratuita activa</option>
            <option value="comprado">Compró suscripción</option>
            <option value="cancelado">Cancelado / revertido</option>
          </select>
        </label>

        <label>
          <span>Desde</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
          />
        </label>

        <label>
          <span>Hasta</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
          />
        </label>

        <div className="prospects-filter-actions">
          <button type="submit" className="prospects-search-btn">Buscar</button>
          {hayFiltros && (
            <button type="button" onClick={limpiarFiltros}>Limpiar</button>
          )}
        </div>
      </form>

      {!cargando && !error && (
        <p className="prospects-count">{total} registros encontrados</p>
      )}

      {cargando ? (
        <p role="status">Cargando registros de prueba gratuita…</p>
      ) : error ? (
        <div role="alert" className="prospects-alert">
          <p>{error}</p>
          <button type="button" onClick={cargar}>Reintentar</button>
        </div>
      ) : !prospectos.length ? (
        <div className="web-requests-empty">
          <Users size={32} aria-hidden="true" />
          <h3>No hay prospectos en esta etapa</h3>
          <p>Cuando alguien complete sus datos para la prueba gratuita, aparecerá aquí con su progreso.</p>
        </div>
      ) : (
        <>
          <div className="prospects-list">
            {prospectos.map((p) => {
              const infoEstado = ESTADOS_PROSPECTO[p.estado] || { label: p.estado, tono: 'info' };
              const waUrl = whatsappHref(p.whatsapp);
              const fechaActualizado = formatearFecha(p.updated_at || p.created_at);
              const fechaPaso1 = formatearFecha(p.paso_1_en);
              const fechaCheckout = formatearFecha(p.checkout_iniciado_en);
              const fechaPrueba = formatearFecha(p.prueba_activada_en);
              const fechaCompra = formatearFecha(p.comprado_en);
              const fechaCorreo = formatearFecha(p.correo_confirmacion_enviado_en);
              const fechaBrevo = formatearFecha(p.brevo_sincronizado_en);

              return (
                <article className="prospect-card" key={p.id}>
                  <div className="prospect-card-top">
                    <div className="prospect-card-badges">
                      <span className={`prospect-badge prospect-badge-${infoEstado.tono}`}>
                        {infoEstado.label}
                      </span>
                      {p.origen && (
                        <span className="prospect-origin">
                          Origen: {ORIGENES[p.origen] || p.origen}
                        </span>
                      )}
                    </div>
                    {fechaActualizado && (
                      <time dateTime={p.updated_at || p.created_at}>
                        Actualizado: {fechaActualizado}
                      </time>
                    )}
                  </div>

                  <div className="prospect-card-main">
                    <div>
                      <h3>{p.nombre || 'Sin nombre todavía'}</h3>
                      <div className="prospect-contact-links">
                        <a href={`mailto:${p.email}`}>
                          <Mail size={15} aria-hidden="true" />
                          {p.email}
                        </a>
                        {p.whatsapp && (
                          waUrl ? (
                            <a href={waUrl} target="_blank" rel="noopener noreferrer">
                              <MessageCircle size={15} aria-hidden="true" />
                              {p.whatsapp}
                            </a>
                          ) : (
                            <span>{p.whatsapp}</span>
                          )
                        )}
                        {p.pais && <span>País: {p.pais}</span>}
                      </div>
                    </div>

                    <div className="prospect-plan-info">
                      {p.plan_codigo && (
                        <span>{PLANES_LABEL[p.plan_codigo] || p.plan_codigo}</span>
                      )}
                      {p.monto_pagado > 0 && (
                        <strong>{p.moneda || 'USD'} {p.monto_pagado}</strong>
                      )}
                    </div>
                  </div>

                  <div className="prospect-timeline">
                    {fechaPaso1 && <span>Datos: {fechaPaso1}</span>}
                    {fechaCheckout && <span>Checkout: {fechaCheckout}</span>}
                    {fechaPrueba && <span>Prueba activa: {fechaPrueba}</span>}
                    {fechaCompra && <span>Compra: {fechaCompra}</span>}
                  </div>

                  <div className="prospect-sync-row">
                    {fechaCorreo ? (
                      <span className="prospect-sync-ok">Correo de confirmación enviado ({fechaCorreo})</span>
                    ) : (
                      <span className="prospect-sync-muted">Sin correo de compra todavía</span>
                    )}
                    {fechaBrevo ? (
                      <span className="prospect-sync-ok">Sincronizado en Brevo ({fechaBrevo})</span>
                    ) : p.brevo_error ? (
                      <span className="prospect-sync-warn">Brevo: {p.brevo_error}</span>
                    ) : (
                      <span className="prospect-sync-muted">Brevo pendiente</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <nav className="web-requests-pagination" aria-label="Páginas de prospectos">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span>Página {page} de {Math.max(1, totalPaginas)}</span>
            <button type="button" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
