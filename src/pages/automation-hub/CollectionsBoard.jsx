import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RefreshCcw, MessageCircle, X, Check, ChevronRight, CreditCard, Search } from 'lucide-react';
import { collectionsApi, financeApi } from '../../services/automationHubApi';
import { getMetodosPago } from '../../services/courierApi';

function soloDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}
const fmtGs = (n) => Number(n || 0).toLocaleString('es-PY');

function columnaSiguiente(tarjeta) {
  // Un pago único (1 sola cuota) al cobrarse va directo a Saldado.
  if (tarjeta.current_installment_number >= tarjeta.total_cuotas) return 'saldado';
  return `col-${tarjeta.current_installment_number + 1}`;
}

const esPagoUnico = (t) => t.total_cuotas === 1;
const esPerdido = (t) => t.student_status === 'Cancelado';

// ── Columna del tablero (se usa igual para "Pago único" y para las cuotas) ────
function ColumnaCobros({ droppableId, titulo, tarjetas, onVerDetalle, onMarcarCobro }) {
  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.droppableProps}
          className={`w-64 shrink-0 rounded-lg border border-border p-2 ${snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-surface-2'}`}>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-fg">{titulo}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-text">{tarjetas.length}</span>
          </div>
          <div className="flex min-h-[80px] flex-col gap-2">
            {tarjetas.map((t, index) => (
              <Draggable draggableId={String(t.student_id)} index={index} key={t.student_id}>
                {(providedCard) => (
                  <div ref={providedCard.innerRef} {...providedCard.draggableProps} {...providedCard.dragHandleProps}
                    className={`cursor-pointer rounded-md border p-2.5 shadow-sm transition-colors ${t.vencida ? 'border-danger bg-danger/10 hover:bg-danger/15' : 'border-border bg-surface hover:bg-surface-2'}`}
                    onClick={() => onVerDetalle(t)}>
                    <div className="text-xs font-semibold text-fg">{t.name}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] text-fg-muted">
                        {esPagoUnico(t) ? 'Pago único' : `Cuota ${t.current_installment_number}/${t.total_cuotas}`} · {t.current_due_date}
                      </span>
                      <span className="text-[10px] font-bold text-fg-muted">Gs {fmtGs(t.negotiated_price)}</span>
                    </div>
                    {t.vencida && <div className="mt-1 text-[9px] font-bold uppercase text-danger">Vencido</div>}
                    <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {t.phone && (
                        <a href={`https://wa.me/${soloDigitos(t.phone)}`} target="_blank" rel="noopener noreferrer"
                          className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md bg-success/15 text-[10px] font-semibold text-success hover:bg-success/25">
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                      <button type="button" onClick={() => onMarcarCobro(t)}
                        className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md bg-primary/15 text-[10px] font-semibold text-primary-text hover:bg-primary/25">
                        <Check size={12} /> Marcar cobro
                      </button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}

// ── Modal: ver plan de pagos completo ─────────────────────────────────────────
function StudentDetailModal({ tarjeta, onClose, onRegistrarCobro }) {
  const pagos = [...(tarjeta.payments || [])].sort((a, b) => a.installment_number - b.installment_number);
  const pagadas = pagos.filter((p) => p.status === 'Pagado').length;
  const totalGs = pagos.reduce((s, p) => s + Number(p.amount || 0), 0);
  const cobradoGs = pagos.filter((p) => p.status === 'Pagado').reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-4">
          <div>
            <h3 className="m-0 text-base font-bold text-fg">{tarjeta.name}</h3>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              {tarjeta.email || '—'} &nbsp;·&nbsp; {tarjeta.phone || 'Sin teléfono'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div className="p-3 text-center">
            <div className="text-[10px] uppercase text-fg-subtle">Total</div>
            <div className="mt-0.5 text-sm font-bold text-fg">{fmtGs(totalGs)} Gs</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-[10px] uppercase text-fg-subtle">Cobrado</div>
            <div className="mt-0.5 text-sm font-bold text-success">{fmtGs(cobradoGs)} Gs</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-[10px] uppercase text-fg-subtle">Pendiente</div>
            <div className="mt-0.5 text-sm font-bold text-warning">{fmtGs(totalGs - cobradoGs)} Gs</div>
          </div>
        </div>

        {/* Lista de cuotas */}
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {pagos.map((p) => {
            const esPagada = p.status === 'Pagado';
            const esVencida = !esPagada && p.due_date && p.due_date < new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${esVencida ? 'bg-danger/5' : ''}`}>
                {/* Ícono */}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
                  ${esPagada ? 'bg-success/20 text-success' : esVencida ? 'bg-danger/20 text-danger' : 'bg-surface-2 text-fg-muted'}`}>
                  {esPagada ? '✓' : p.installment_number}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-fg">{p.label || `Cuota ${p.installment_number}`}</div>
                  <div className="mt-0.5 text-[10px] text-fg-muted">
                    {esPagada
                      ? <>Pagado el {p.paid_date} {p.payment_method ? `· ${p.payment_method}` : ''}</>
                      : <>Vence {p.due_date} {esVencida ? <span className="font-bold text-danger"> · VENCIDO</span> : ''}</>
                    }
                  </div>
                </div>
                {/* Monto */}
                <div className={`shrink-0 text-xs font-bold ${esPagada ? 'text-success' : esVencida ? 'text-danger' : 'text-fg'}`}>
                  {fmtGs(p.amount)} Gs
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border p-4">
          {tarjeta.phone && (
            <a href={`https://wa.me/${soloDigitos(tarjeta.phone)}`} target="_blank" rel="noopener noreferrer"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-success/15 text-xs font-semibold text-success hover:bg-success/25">
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {!tarjeta.saldado && (
            <button type="button" onClick={() => onRegistrarCobro(tarjeta)}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-semibold text-primary-fg hover:bg-primary-hover">
              <CreditCard size={14} /> Registrar cobro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal: registrar cobro ─────────────────────────────────────────────────────
function RegistrarCobroModal({ tarjeta, onClose, onGuardado }) {
  const [paidDate, setPaidDate] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }));
  const [metodo, setMetodo] = useState('');
  const [metodosPago, setMetodosPago] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [cobradoPor, setCobradoPor] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMetodosPago()
      .then((data) => setMetodosPago((data || []).filter((m) => m.activo)))
      .catch(() => {});
    financeApi.teamMembers.listar()
      .then((data) => setEquipo((data || []).filter((m) => m.active)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await collectionsApi.registrarCobro(tarjeta.current_payment_id, {
        paid_date: paidDate,
        payment_method: metodo || null,
        notes: notas || null,
        collected_by_team_member_id: cobradoPor ? Number(cobradoPor) : null,
      });
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar el cobro.');
    } finally {
      setGuardando(false);
    }
  };

  const inputClass = 'h-9 w-full rounded-md border border-border bg-surface-2 px-2 text-xs text-fg';

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">Registrar cobro — {tarjeta.name}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4">
          <p className="m-0 text-xs text-fg-muted">Cuota {tarjeta.current_installment_number} de {tarjeta.total_cuotas} · <strong>{fmtGs(tarjeta.payments?.find(p => p.id === tarjeta.current_payment_id)?.amount)} Gs</strong></p>
          <label className="text-[10px] font-semibold uppercase text-fg-subtle">Fecha de pago</label>
          <input type="date" className={inputClass} value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Método de pago</label>
          <select className={inputClass} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="">Sin especificar</option>
            {metodosPago.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
          </select>
          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Cobrado por (closer / setter)</label>
          <select className={inputClass} value={cobradoPor} onChange={(e) => setCobradoPor(e.target.value)}>
            <option value="">Sin especificar</option>
            {equipo.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? ` · ${m.role}` : ''}</option>)}
          </select>
          {equipo.length === 0 && (
            <p className="m-0 text-[10px] text-fg-subtle">No hay nadie cargado en Finanzas → Equipo todavía.</p>
          )}

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Notas</label>
          <input className={inputClass} value={notas} onChange={(e) => setNotas(e.target.value)} />
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-2 py-1.5 text-[11px] text-danger">{error}</div>}
          <button type="submit" disabled={guardando} className="mt-1 h-10 rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
            {guardando ? 'Guardando...' : 'Confirmar cobro'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CollectionsBoard() {
  const [students, setStudents] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [detailTarjeta, setDetailTarjeta] = useState(null);   // modal detalle
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState(null); // modal cobro
  const [busqueda, setBusqueda] = useState('');

  const cargar = async (texto = busqueda) => {
    setCargando(true);
    setError('');
    try {
      const data = await collectionsApi.listar(texto || undefined);
      setStudents(data.students);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las cobranzas.');
    } finally {
      setCargando(false);
    }
  };

  // Debounce igual que en Oportunidades: no una consulta por tecla.
  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), busqueda ? 300 : 0);
    return () => clearTimeout(t);
  }, [busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarEstadoAlumno = async (tarjeta, nuevoEstado, textoConfirm) => {
    if (!window.confirm(textoConfirm)) return;
    try {
      await financeApi.students.actualizar(tarjeta.student_id, { student_status: nuevoEstado });
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar el estado del alumno.');
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const tarjeta = students.find((s) => String(s.student_id) === result.draggableId);
    if (!tarjeta) return;
    const destino = result.destination.droppableId;

    // Marcar como perdido: se puede desde cualquier columna.
    if (destino === 'perdido') {
      if (esPerdido(tarjeta)) return;
      cambiarEstadoAlumno(tarjeta, 'Cancelado',
        `¿Dar por perdido el plan de ${tarjeta.name}? Queda registrado como cancelado y sale de las columnas de cobro.`);
      return;
    }

    // Sacar de perdidos y reactivar.
    if (esPerdido(tarjeta)) {
      cambiarEstadoAlumno(tarjeta, 'Activo', `¿Reactivar el plan de ${tarjeta.name}?`);
      return;
    }

    if (tarjeta.saldado) return;
    if (destino !== columnaSiguiente(tarjeta)) {
      setError('Solo se puede arrastrar a la próxima cuota (o a Saldado si era la última) — para otra fecha, hacé clic en la tarjeta.');
      return;
    }
    setTarjetaSeleccionada(tarjeta);
  };

  if (!cargando && !students.length && !error) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-fg-muted">
        Todavía no hay ningún plan de pagos activo. Generá uno desde la ficha de un lead en Oportunidades.
      </div>
    );
  }

  // Los pagos únicos (1 sola cuota) tienen su propia columna: mezclarlos con
  // "Esperando Pago 1" confundía dos cosas distintas — uno es un plan de
  // cuotas arrancando, el otro es un cobro de una sola vez.
  const activos = students.filter((s) => !esPerdido(s));
  const perdidos = students.filter(esPerdido);
  const pendientesUnicos = activos.filter((s) => !s.saldado && esPagoUnico(s));
  const enCuotas = activos.filter((s) => !s.saldado && !esPagoUnico(s));
  const maxCuotas = enCuotas.reduce((max, s) => Math.max(max, s.total_cuotas), 0);
  const columnas = Array.from({ length: maxCuotas }, (_, i) => i + 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, email o teléfono..."
              className="h-10 w-64 rounded-md border border-border bg-surface-2 pl-8 pr-8 text-sm text-fg"
            />
            {busqueda && (
              <button type="button" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg">
                <X size={14} />
              </button>
            )}
          </div>
          {busqueda && !cargando && (
            <span className="text-xs text-fg-muted">{students.length} resultado{students.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        <button type="button" onClick={() => cargar()}
          className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-xs font-semibold text-fg">
          <RefreshCcw size={14} /> Actualizar
        </button>
      </div>

      {error && <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

      {cargando ? (
        <div className="p-8 text-center text-sm text-fg-muted">Cargando...</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <ColumnaCobros
              droppableId="unico"
              titulo="Pago único · pendiente"
              tarjetas={pendientesUnicos}
              onVerDetalle={setDetailTarjeta}
              onMarcarCobro={setTarjetaSeleccionada}
            />

            {columnas.map((n) => (
              <ColumnaCobros
                key={n}
                droppableId={`col-${n}`}
                titulo={`Esperando Pago ${n}`}
                tarjetas={enCuotas.filter((s) => s.current_installment_number === n)}
                onVerDetalle={setDetailTarjeta}
                onMarcarCobro={setTarjetaSeleccionada}
              />
            ))}

            <Droppable droppableId="saldado">
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className={`w-64 shrink-0 rounded-lg border border-success/30 p-2 ${snapshot.isDraggingOver ? 'bg-success/10' : 'bg-success/5'}`}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-success">Saldado / Pagado</span>
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">{activos.filter((s) => s.saldado).length}</span>
                  </div>
                  <div className="flex min-h-[80px] flex-col gap-2">
                    {activos.filter((s) => s.saldado).map((t, index) => (
                      <Draggable draggableId={String(t.student_id)} index={index} key={t.student_id} isDragDisabled>
                        {(providedCard) => (
                          <div ref={providedCard.innerRef} {...providedCard.draggableProps} {...providedCard.dragHandleProps}
                            className="cursor-pointer rounded-md border border-border bg-surface p-2.5 shadow-sm opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => setDetailTarjeta(t)}>
                            <div className="text-xs font-semibold text-fg">{t.name}</div>
                            <div className="mt-0.5 text-[10px] text-fg-muted">{t.total_cuotas} cuota{t.total_cuotas !== 1 ? 's' : ''} · ver detalle →</div>
                            <div className="mt-1 text-[10px] font-bold text-success">Gs {fmtGs(t.negotiated_price)}</div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>

            {/* Perdidos: no terminó de pagar, canceló, se cayó la venta. */}
            <Droppable droppableId="perdido">
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className={`w-64 shrink-0 rounded-lg border border-danger/30 p-2 ${snapshot.isDraggingOver ? 'bg-danger/10' : 'bg-danger/5'}`}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-danger">Perdido / Cancelado</span>
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{perdidos.length}</span>
                  </div>
                  <div className="flex min-h-[80px] flex-col gap-2">
                    {perdidos.map((t, index) => (
                      <Draggable draggableId={String(t.student_id)} index={index} key={t.student_id}>
                        {(providedCard) => (
                          <div ref={providedCard.innerRef} {...providedCard.draggableProps} {...providedCard.dragHandleProps}
                            className="cursor-pointer rounded-md border border-border bg-surface p-2.5 shadow-sm opacity-80 transition-opacity hover:opacity-100"
                            onClick={() => setDetailTarjeta(t)}>
                            <div className="text-xs font-semibold text-fg">{t.name}</div>
                            <div className="mt-0.5 text-[10px] text-fg-muted">
                              {t.cuotas_pagadas}/{t.total_cuotas} cuotas cobradas · ver detalle →
                            </div>
                            <div className="mt-1 text-[10px] font-bold text-danger">
                              Sin cobrar Gs {fmtGs(Number(t.negotiated_price) - (t.payments || []).filter((p) => p.status === 'Pagado').reduce((a, p) => a + Number(p.amount), 0))}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}

      {/* Modal detalle de plan de pagos */}
      {detailTarjeta && !tarjetaSeleccionada && (
        <StudentDetailModal
          tarjeta={detailTarjeta}
          onClose={() => setDetailTarjeta(null)}
          onRegistrarCobro={(t) => { setDetailTarjeta(null); setTarjetaSeleccionada(t); }}
        />
      )}

      {/* Modal registrar cobro */}
      {tarjetaSeleccionada && (
        <RegistrarCobroModal
          tarjeta={tarjetaSeleccionada}
          onClose={() => setTarjetaSeleccionada(null)}
          onGuardado={() => { setTarjetaSeleccionada(null); setDetailTarjeta(null); cargar(); }}
        />
      )}
    </div>
  );
}

