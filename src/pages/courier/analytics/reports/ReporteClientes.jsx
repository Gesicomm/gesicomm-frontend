import React, { useEffect, useState } from 'react';
import { User, Users, Star, ShieldAlert, ThumbsUp, Clock, Download, ChevronDown } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';
import { formatGs } from '../../../../lib/courier';
import { exportarClientesCsv } from './exportarClientes';

// Calificación por historial completo del cliente en la tienda (backend:
// ReporteService._calificarCliente). La devolución injustificada se carga
// al marcar el pedido como Devuelto en Gestión Logística.
const CALIFICACION = {
  recurrente: { label: 'Recurrente', icon: Star, ayuda: 'Recibió 2 o más pedidos y nunca devolvió sin motivo.' },
  bueno: { label: 'Bueno', icon: ThumbsUp, ayuda: 'Recibió su pedido y nunca devolvió sin motivo.' },
  problematico: { label: 'Problemático', icon: ShieldAlert, ayuda: 'Tiene al menos una devolución injustificada.' },
  sin_entregas: { label: 'Sin entregas aún', icon: Clock, ayuda: 'Todavía no recibió ningún pedido.' },
};

const SEGMENTOS = [
  { id: 'todos', label: 'Todos' },
  { id: 'buenos', label: 'Buenos' },
  { id: 'problematicos', label: 'Problemáticos' },
  { id: 'sin_entregas', label: 'Sin entregas aún' },
];

const LIMITE = 25;

// `modo="historial"`: lo usa el módulo Clientes, sin período (toda la
// historia de la tienda) y con su propio título de página.
export function ReporteClientes({ filters, modo = 'periodo', onAbrirCliente = null }) {
  const historial = modo === 'historial';
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({});
  const [segmento, setSegmento] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuExportar, setMenuExportar] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [avisoExport, setAvisoExport] = useState('');

  useEffect(() => { setPagina(1); }, [filters, segmento]);

  useEffect(() => {
    let vigente = true;
    setLoading(true);
    reportesService.obtenerReporteClientes({
      ...filters,
      calificacion: segmento === 'todos' ? undefined : segmento,
      pagina,
      limite: LIMITE,
    })
      .then(res => {
        if (!vigente) return;
        setData(res.data || []);
        setKpis(res.kpis || {});
        setPaginas(res.paginas || 1);
        setTotal(res.total || 0);
      })
      .catch(err => console.error('Error al obtener clientes:', err))
      .finally(() => { if (vigente) setLoading(false); });
    return () => { vigente = false; };
  }, [filters, segmento, pagina]);

  const formatDate = (ymd) => (ymd ? String(ymd).slice(0, 10).split('-').reverse().join('/') : '—');

  async function manejarExportar(alcance) {
    setMenuExportar(false);
    setAvisoExport('');
    setExportando(true);
    try {
      const cantidad = await exportarClientesCsv(
        { ...filters, calificacion: segmento === 'todos' ? undefined : segmento },
        alcance,
      );
      if (cantidad === 0) {
        setAvisoExport(
          alcance === 'promociones'
            ? 'No hay clientes con correo que hayan aceptado promociones con estos filtros.'
            : alcance === 'con_correo'
              ? 'No hay clientes con correo cargado con estos filtros.'
              : 'No hay clientes para exportar con estos filtros.',
        );
      }
    } catch (err) {
      console.error('Error al exportar clientes:', err);
      setAvisoExport('No se pudo generar el archivo CSV. Intentá de nuevo.');
    } finally {
      setExportando(false);
    }
  }

  const tarjetas = [
    { label: 'Clientes con pedido', valor: kpis.clientes_con_pedido ?? 0, sub: historial ? 'Hicieron al menos un pedido' : 'Hicieron al menos un pedido en el período', icon: User },
    { label: 'Ya recibieron', valor: kpis.clientes_compradores ?? 0, sub: `${Number(kpis.tasa_conversion_pedido || 0).toFixed(1)}% de los clientes con pedido`, icon: Users },
    { label: 'Recurrentes', valor: kpis.clientes_recurrentes ?? 0, sub: '2 o más pedidos recibidos', icon: Star },
    { label: 'Problemáticos', valor: kpis.clientes_problematicos ?? 0, sub: 'Con devolución injustificada', icon: ShieldAlert, peligro: true },
  ];

  return (
    <div className="cic-report-container animate-fade-in">
      {!historial && (
      <div className="cic-report-header">
        <h2 className="cic-report-title">Clientes: buenos y problemáticos</h2>
        <p className="cic-report-desc">
          Quién compró en el período y cómo se portó en toda su historia con tu tienda: si recibió sus pedidos,
          si devolvió con motivo o sin motivo, y cuánto te compró.
        </p>
      </div>
      )}

      <div className="cic-kpi-grid">
        {tarjetas.map(({ label, valor, sub, icon: Icon, peligro }) => (
          <div className="cic-kpi-card" key={label}>
            <div className="cic-kpi-header"><span>{label}</span><Icon size={16} /></div>
            <div className="cic-kpi-val" style={peligro && valor > 0 ? { color: 'var(--color-danger)' } : undefined}>{valor}</div>
            <div className="cic-kpi-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
        <div className="cic-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="cic-card-title">Historial por cliente</h3>
            <p className="cic-card-subtitle">Las devoluciones justificadas no cuentan en contra del cliente.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <div className="cic-segmented" role="group" aria-label="Tipo de cliente">
              {SEGMENTOS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`cic-preset-pill ${segmento === s.id ? 'active' : ''}`}
                  aria-pressed={segmento === s.id}
                  onClick={() => setSegmento(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="cli-export-wrap">
              <button
                type="button"
                className="cic-btn"
                disabled={exportando || loading}
                aria-expanded={menuExportar}
                aria-haspopup="menu"
                onClick={() => setMenuExportar(o => !o)}
              >
                <Download size={16} aria-hidden="true" />
                {exportando ? 'Exportando…' : 'Exportar CSV'}
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {menuExportar && (
                <>
                  <div className="cli-export-backdrop" onClick={() => setMenuExportar(false)} />
                  <div className="cli-export-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => manejarExportar('promociones')}>
                      <strong>Lista para email marketing</strong>
                      <span>Solo con correo y que aceptan promociones</span>
                    </button>
                    <button type="button" role="menuitem" onClick={() => manejarExportar('con_correo')}>
                      <strong>Solo clientes con correo</strong>
                      <span>Todos los que dejaron correo en el checkout</span>
                    </button>
                    <button type="button" role="menuitem" onClick={() => manejarExportar('todos')}>
                      <strong>Todos los clientes</strong>
                      <span>Incluye clientes sin correo según los filtros actuales</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {avisoExport && (
          <p role="status" className="cli-export-aviso">{avisoExport}</p>
        )}

        <div className="cic-table-wrapper">
          <table className="cic-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Correo</th>
                <th>Origen</th>
                <th>Calificación</th>
                <th style={{ textAlign: 'center' }}>Pedidos</th>
                <th style={{ textAlign: 'center' }}>Recibidos</th>
                <th style={{ textAlign: 'center' }}>Devoluciones</th>
                <th style={{ textAlign: 'center' }}>Cancelados</th>
                <th style={{ textAlign: 'right' }}>Total comprado</th>
                <th style={{ textAlign: 'center' }}>Último pedido</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>Cargando clientes...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>
                  {filters?.buscador
                    ? `Ningún cliente coincide con "${filters.buscador}".`
                    : segmento === 'todos'
                      ? (historial ? 'Todavía no hay clientes con pedidos.' : 'No hay clientes con pedidos en este período.')
                      : (historial ? 'Ningún cliente de este tipo.' : 'Ningún cliente de este tipo en el período.')}
                </td></tr>
              ) : data.map(row => {
                const c = CALIFICACION[row.calificacion] || CALIFICACION.sin_entregas;
                const Icon = c.icon;
                return (
                  <tr key={row.cliente_key}>
                    <td style={{ minWidth: 190 }}>
                      {onAbrirCliente ? (
                        <button type="button" className="cic-cliente-link" onClick={() => onAbrirCliente(row)} aria-label={`Ver ficha de ${row.nombre}`}>
                          {row.nombre}
                        </button>
                      ) : (
                        <div style={{ fontWeight: 600, color: 'var(--color-fg)' }}>{row.nombre}</div>
                      )}
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-fg-muted)', whiteSpace: 'nowrap' }}>{row.telefono}</div>
                    </td>
                    <td style={{ minWidth: 190 }}>
                      {row.email ? (
                        <>
                          <div style={{ fontSize: '0.875rem', color: 'var(--color-fg)', overflowWrap: 'anywhere' }}>{row.email}</div>
                          {row.acepta_promociones === true && (
                            <div style={{ fontSize: '0.8125rem', color: 'var(--color-success)' }}>Acepta promociones</div>
                          )}
                          {row.acepta_promociones === false && (
                            <div style={{ fontSize: '0.8125rem', color: 'var(--color-fg-muted)' }}>No acepta promos</div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--color-fg-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {(Array.isArray(row.origenes) && row.origenes.length > 0 ? row.origenes : [row.origen || 'Gesicom']).map((orig) => {
                          const isShopify = String(orig).toLowerCase() === 'shopify';
                          const isDropi = String(orig).toLowerCase() === 'dropi';
                          const bg = isShopify
                            ? 'rgba(16, 185, 129, 0.14)'
                            : isDropi
                              ? 'rgba(245, 158, 11, 0.14)'
                              : 'color-mix(in srgb, var(--color-primary) 14%, transparent)';
                          const fg = isShopify
                            ? '#10b981'
                            : isDropi
                              ? '#f59e0b'
                              : 'var(--color-primary-text, var(--color-fg))';
                          const bd = isShopify
                            ? 'rgba(16, 185, 129, 0.3)'
                            : isDropi
                              ? 'rgba(245, 158, 11, 0.3)'
                              : 'color-mix(in srgb, var(--color-primary) 28%, transparent)';
                          return (
                            <span
                              key={orig}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.18rem 0.6rem',
                                borderRadius: '999px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                background: bg,
                                color: fg,
                                border: `1px solid ${bd}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {orig}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      <span className={`cic-calif cic-calif-${row.calificacion}`} title={c.ayuda}>
                        <Icon size={14} /> {c.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.pedidos_totales}</td>
                    <td style={{ textAlign: 'center' }}>{row.entregados}</td>
                    <td style={{ textAlign: 'center' }}>
                      {row.devueltos === 0 ? '—' : (
                        <span title="Justificadas / injustificadas">
                          {row.devueltos}
                          {(row.devoluciones_justificadas > 0 || row.devoluciones_injustificadas > 0) && (
                            <span style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--color-fg-muted)', whiteSpace: 'nowrap', lineHeight: 1.35 }}>
                              {row.devoluciones_justificadas} con motivo
                              <span style={{ display: 'block', color: row.devoluciones_injustificadas > 0 ? 'var(--color-danger)' : undefined }}>
                                {row.devoluciones_injustificadas} sin motivo
                              </span>
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.cancelados || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: row.total_comprado > 0 ? 'var(--color-success)' : 'var(--color-fg-muted)' }}>
                      {formatGs(row.total_comprado)}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--color-fg-muted)', whiteSpace: 'nowrap' }}>{formatDate(row.ultimo_pedido)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && paginas > 1 && (
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-fg-muted)' }}>Página {pagina} de {paginas} · {total} clientes</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="cic-btn" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
              <button type="button" className="cic-btn" disabled={pagina === paginas} onClick={() => setPagina(p => p + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
