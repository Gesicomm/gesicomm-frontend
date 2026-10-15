import { useState } from 'react';
import {
  Plus, Copy, Check, Edit2, Trash2, Archive, Play, Pause,
  MessageCircle, Globe, Megaphone, ChevronRight, History, Wallet,
} from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import CampanaInternaModal from './CampanaInternaModal';
import GastoCampanaModal from './GastoCampanaModal';
import AdsCampanaHistorial from './AdsCampanaHistorial';
import { formatPYG, formatFecha, BADGE_ESTADO } from './adsShared';
import { EncabezadoSeccion, EstadoVacio } from './adsUI';

/**
 * Vista "Campañas": las campañas internas y lo que se lleva gastado en
 * cada una.
 *
 * El gasto se carga a mano por rango de fechas (GastoCampanaModal) y se va
 * sumando. Acá se ve el total de cada campaña; el detalle rango por rango
 * está en su histórico (AdsCampanaHistorial).
 */
export default function AdsCampanas({ campanas, cargando, tiendas, onCambio }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [campanaEditar, setCampanaEditar] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('activas');
  const [campanaAbierta, setCampanaAbierta] = useState(null);
  const [campanaGasto, setCampanaGasto] = useState(null);

  const visibles = campanas.filter((c) => {
    if (filtroEstado === 'todas') return true;
    if (filtroEstado === 'archivadas') return c.estado === 'archivada';
    return c.estado !== 'archivada';
  });
  const totalVisible = visibles.reduce((acc, c) => acc + (Number(c.gasto_total) || 0), 0);

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

  const modalCampana = (
    <CampanaInternaModal
      open={modalOpen}
      onClose={() => { setModalOpen(false); setCampanaEditar(null); }}
      onCreated={onCambio}
      onCargarGasto={(creada) => { setModalOpen(false); setCampanaEditar(null); setCampanaGasto(creada); }}
      tiendas={tiendas}
      campanaEditar={campanaEditar}
    />
  );

  // El histórico vive dentro de esta vista (no es una ruta).
  if (campanaAbierta) {
    // Se relee de la lista para que un cambio de estado o de nombre se vea
    // reflejado sin cerrar y volver a abrir.
    const vigente = campanas.find((c) => c.id === campanaAbierta.id) || campanaAbierta;
    return (
      <>
        <AdsCampanaHistorial
          campana={vigente}
          onVolver={() => setCampanaAbierta(null)}
          onEditar={(c) => { setCampanaEditar(c); setModalOpen(true); }}
          onCambio={onCambio}
        />
        {modalCampana}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <EncabezadoSeccion
        titulo="Campañas"
        descripcion="Creá la campaña, copiá el nombre generado en Meta Ads Manager y cargá acá cuánto gastaste en cada rango de fechas. El gasto se va sumando."
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

      {/* El esqueleto es solo para la primera carga: al refrescar después de
          guardar un gasto, la tabla se queda en pantalla. */}
      {cargando && campanas.length === 0 ? (
        <div className="skeleton-row" style={{ height: '120px' }} />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          icono={Megaphone}
          titulo={filtroEstado === 'archivadas' ? 'No hay campañas archivadas' : 'Todavía no creaste ninguna campaña'}
          descripcion="Creá una campaña, copiá el nombre generado en Meta Ads Manager y después cargá cuánto gastaste en cada rango de fechas."
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
                  <th className="text-right">Gastado</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const badge = BADGE_ESTADO[c.estado] || BADGE_ESTADO.borrador;
                  const tieneGasto = (c.gasto_registros || 0) > 0;
                  // El asistente genera un nombre que ya ES el que se copia en
                  // Meta: mostrarlo dos veces solo ensancha la tabla. Las
                  // campañas viejas tienen un nombre corto + otro con código.
                  const nombreUnico = c.nombre_interno === c.nombre_display;
                  const botonCopiar = (
                    <button
                      type="button"
                      onClick={() => copiarTexto(c.nombre_interno, c.id)}
                      className="shrink-0 cursor-pointer border-none bg-transparent p-0.5 text-fg-muted hover:text-fg"
                      title="Copiar nombre para Meta Ads Manager"
                    >
                      {copiadoId === c.id ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                    </button>
                  );

                  return (
                    <tr key={c.id}>
                      <td style={{ whiteSpace: 'normal', minWidth: '15rem' }}>
                        <div className="flex items-center gap-2.5">
                          {c.tipo === 'whatsapp'
                            ? <MessageCircle size={16} className="shrink-0" color="var(--color-success)" title="WhatsApp" />
                            : <Globe size={16} className="shrink-0" color="var(--color-primary-text)" title="Funnel" />}
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex items-start gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCampanaAbierta(c)}
                                className="group inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left text-[0.88rem] font-semibold text-fg hover:text-primary-text"
                              >
                                {c.nombre_display}
                                <ChevronRight size={13} className="shrink-0 text-fg-subtle group-hover:text-primary-text" />
                              </button>
                              {nombreUnico && botonCopiar}
                            </span>
                            {!nombreUnico && (
                              <span className="flex items-center gap-1.5">
                                <code className="break-all text-[0.72rem] text-fg-muted">{c.nombre_interno}</code>
                                {botonCopiar}
                              </span>
                            )}
                            {!nombreUnico && (c.productos || []).length > 0 && (
                              <span className="text-[0.72rem] text-fg-muted">{c.productos.map(p => p.nombre).join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        {tieneGasto ? (
                          <>
                            <span className="block font-semibold tabular-nums text-fg">{formatPYG(c.gasto_total)}</span>
                            <span className="block text-[0.72rem] text-fg-muted" title="Último día con gasto cargado">hasta el {formatFecha(c.gasto_ultimo_dia)}</span>
                          </>
                        ) : <span className="text-fg-subtle">Sin cargar</span>}
                      </td>
                      <td>
                        <span className="badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                            onClick={() => setCampanaGasto(c)}
                          >
                            <Wallet size={13} style={{ marginRight: '0.3rem' }} /> Cargar gasto
                          </button>
                          <button type="button" className="btn-icon" title="Ver histórico de gasto" onClick={() => setCampanaAbierta(c)}>
                            <History size={15} />
                          </button>
                          <button type="button" className="btn-icon" title="Editar campaña" onClick={() => { setCampanaEditar(c); setModalOpen(true); }}>
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
              <tfoot>
                <tr>
                  <td className="font-semibold text-fg">Total gastado</td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums text-fg">{formatPYG(totalVisible)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <p className="m-0 text-[0.72rem] text-fg-subtle">
        El gasto de cada campaña es la suma de todos los rangos de fechas que cargaste. Tocá el nombre de la campaña para ver el histórico completo.
      </p>

      {modalCampana}
      <GastoCampanaModal
        open={Boolean(campanaGasto)}
        campana={campanaGasto}
        onClose={() => setCampanaGasto(null)}
        onGuardado={onCambio}
      />
    </div>
  );
}
