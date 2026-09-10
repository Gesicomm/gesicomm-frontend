import { useState } from 'react';
import {
  Plus, Copy, Check, Edit2, Trash2, Archive, Play, Pause,
  MessageCircle, Globe, Megaphone, ChevronRight,
} from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import CampanaInternaModal from './CampanaInternaModal';
import AdsCampanaDetalle from './AdsCampanaDetalle';
import {
  formatPYGCorto, formatNum, formatROAS, etiquetaPeriodo, semaforoROAS, BADGE_ESTADO,
} from './adsShared';
import { EncabezadoSeccion, EstadoVacio } from './adsUI';

/**
 * Vista "Campañas": administración de las campañas internas + su
 * rendimiento del período.
 *
 * El rendimiento que se muestra por fila sale del reporte de Meta
 * (inversión, compras, ROAS). Pedidos y utilidad NO se muestran acá a
 * propósito: se calculan por producto, no por campaña, así que ponerlos
 * en la fila de una campaña daría a entender una atribución que el
 * sistema todavía no tiene. Esos números viven en Reportes.
 */
export default function AdsCampanas({ campanas, cargando, periodo, resumen, tiendas, onCambio, irA }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [campanaEditar, setCampanaEditar] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('activas');
  const [campanaAbierta, setCampanaAbierta] = useState(null);

  const rendimientoPorCampana = new Map(
    (resumen?.actual?.campanas || []).map((c) => [c.campana_id, c]),
  );

  const visibles = campanas.filter((c) => {
    if (filtroEstado === 'todas') return true;
    if (filtroEstado === 'archivadas') return c.estado === 'archivada';
    return c.estado !== 'archivada';
  });

  const copiarTexto = (texto, id) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 1800);
    });
  };

  const cambiarEstado = async (campana, estado) => {
    try {
      await metaReportesService.actualizarCampana(campana.id, { estado });
      onCambio();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'No se pudo cambiar el estado.');
    }
  };

  const eliminar = async (campana) => {
    if (!window.confirm(`¿Eliminar la campaña "${campana.nombre_display}"?`)) return;
    try {
      await metaReportesService.eliminarCampana(campana.id);
      onCambio();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'No se pudo eliminar.');
    }
  };

  // El detalle vive dentro de esta vista (no es una ruta): así el período y
  // el resumen que ya tiene el shell se reusan sin volver a pedirlos.
  if (campanaAbierta) {
    // Se relee de la lista para que un cambio de estado o de nombre se vea
    // reflejado sin cerrar y volver a abrir.
    const vigente = campanas.find((c) => c.id === campanaAbierta.id) || campanaAbierta;
    return (
      <>
        <AdsCampanaDetalle
          campana={vigente}
          periodo={periodo}
          resumen={resumen}
          onVolver={() => setCampanaAbierta(null)}
          onEditar={(c) => { setCampanaEditar(c); setModalOpen(true); }}
        />
        <CampanaInternaModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setCampanaEditar(null); }}
          onCreated={onCambio}
          tiendas={tiendas}
          campanaEditar={campanaEditar}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <EncabezadoSeccion
        titulo="Campañas"
        descripcion="Cada campaña genera un nombre con código para copiar en Meta Ads Manager. Ese código es lo que después relaciona el reporte importado con tus productos."
      >
        <select className="filter-input" style={{ maxWidth: '170px' }} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="activas">En curso</option>
          <option value="archivadas">Archivadas</option>
          <option value="todas">Todas</option>
        </select>
        <button type="button" className="btn-primary" onClick={() => { setCampanaEditar(null); setModalOpen(true); }}>
          <Plus size={16} style={{ marginRight: '0.35rem' }} /> Nueva campaña
        </button>
      </EncabezadoSeccion>

      {cargando ? (
        <div className="skeleton-row" style={{ height: '120px' }} />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          icono={Megaphone}
          titulo={filtroEstado === 'archivadas' ? 'No hay campañas archivadas' : 'Todavía no creaste ninguna campaña'}
          descripcion="Creá una campaña, copiá el nombre generado en Meta Ads Manager y el reporte que importes después se va a relacionar solo con tus productos."
        >
          {filtroEstado !== 'archivadas' && (
            <button type="button" className="btn-primary mt-1" onClick={() => { setCampanaEditar(null); setModalOpen(true); }}>
              <Plus size={16} style={{ marginRight: '0.35rem' }} /> Nueva campaña
            </button>
          )}
        </EstadoVacio>
      ) : (
        <div className="data-table-wrapper">
          <div className="table-scroll-container">
            <table className="escalafy-table">
              <thead>
                <tr>
                  <th>Campaña</th>
                  <th>Productos</th>
                  <th>Tipo</th>
                  <th className="text-right">Inversión</th>
                  <th className="text-right">Compras</th>
                  <th className="text-right">ROAS</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const badge = BADGE_ESTADO[c.estado] || BADGE_ESTADO.borrador;
                  const rend = rendimientoPorCampana.get(c.id);
                  const sem = rend ? semaforoROAS(rend.roas) : null;

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          {c.tipo === 'whatsapp'
                            ? <MessageCircle size={16} color="#10b981" title="WhatsApp" />
                            : <Globe size={16} color="#3b82f6" title="Funnel" />}
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => setCampanaAbierta(c)}
                              className="group inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left text-[0.88rem] font-semibold text-fg hover:text-primary-text"
                            >
                              {c.nombre_display}
                              <ChevronRight size={13} className="text-fg-subtle group-hover:text-primary-text" />
                            </button>
                            <span className="flex items-center gap-1.5">
                              <code className="text-[0.72rem] text-fg-muted">{c.nombre_interno}</code>
                              <button
                                type="button"
                                onClick={() => copiarTexto(c.nombre_interno, c.id)}
                                className="cursor-pointer border-none bg-transparent p-0.5 text-fg-muted hover:text-fg"
                                title="Copiar nombre para Meta Ads Manager"
                              >
                                {copiadoId === c.id ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                              </button>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-fg">
                        {(c.productos || []).map(p => p.nombre).join(', ') || '—'}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: c.tipo === 'whatsapp' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                            color: c.tipo === 'whatsapp' ? '#10b981' : '#3b82f6',
                          }}
                        >
                          {c.tipo === 'whatsapp' ? 'WhatsApp' : 'Funnel'}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{rend ? formatPYGCorto(rend.inversion) : '—'}</td>
                      <td className="text-right tabular-nums">{rend ? formatNum(rend.compras) : '—'}</td>
                      <td className="text-right tabular-nums" style={sem ? { color: sem.color } : undefined}>
                        {rend ? formatROAS(rend.roas) : '—'}
                      </td>
                      <td>
                        <span className="badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" className="btn-icon" title="Editar" onClick={() => { setCampanaEditar(c); setModalOpen(true); }}>
                            <Edit2 size={15} />
                          </button>
                          {(c.estado === 'borrador' || c.estado === 'pausada') && (
                            <button type="button" className="btn-icon" title="Marcar como activa" onClick={() => cambiarEstado(c, 'activa')}>
                              <Play size={15} />
                            </button>
                          )}
                          {c.estado === 'activa' && (
                            <button type="button" className="btn-icon" title="Pausar" onClick={() => cambiarEstado(c, 'pausada')}>
                              <Pause size={15} />
                            </button>
                          )}
                          {c.estado !== 'archivada' && (
                            <button type="button" className="btn-icon" title="Archivar" onClick={() => cambiarEstado(c, 'archivada')}>
                              <Archive size={15} />
                            </button>
                          )}
                          <button type="button" className="btn-icon danger" title="Eliminar" onClick={() => eliminar(c)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="m-0 text-[0.72rem] text-fg-subtle">
        Inversión, compras y ROAS son del período seleccionado ({etiquetaPeriodo(periodo).toLowerCase()}) y salen del reporte de Meta.{' '}
        <button type="button" onClick={() => irA('reportes')} className="text-primary-text hover:underline">
          El rendimiento por producto está en Reportes
        </button>.
      </p>

      <CampanaInternaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setCampanaEditar(null); }}
        onCreated={onCambio}
        tiendas={tiendas}
        campanaEditar={campanaEditar}
      />
    </div>
  );
}
