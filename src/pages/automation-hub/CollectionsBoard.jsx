import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RefreshCcw, MessageCircle, X, Check, ChevronRight, CreditCard } from 'lucide-react';
import { collectionsApi } from '../../services/automationHubApi';
import { getMetodosPago } from '../../services/courierApi';

function soloDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}
const fmtGs = (n) => Number(n || 0).toLocaleString('es-PY');

function columnaSiguiente(tarjeta) {
  if (tarjeta.current_installment_number >= tarjeta.total_cuotas) return 'saldado';
  return `col-${tarjeta.current_installment_number + 1}`;
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
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMetodosPago()
      .then((data) => setMetodosPago((data || []).filter((m) => m.activo)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await collectionsApi.registrarCobro(tarjeta.current_payment_id, { paid_date: paidDate, payment_method: metodo || null, notes: notas || null });
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
  const [maxInstallments, setMaxInstallments] = useState(0);
  const [students, setStudents] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [detailTarjeta, setDetailTarjeta] = useState(null);   // modal detalle
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState(null); // modal cobro

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await collectionsApi.listar();
      setMaxInstallments(data.max_installments);
      setStudents(data.students);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las cobranzas.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const tarjeta = students.find((s) => String(s.student_id) === result.draggableId);
    if (!tarjeta || tarjeta.saldado) return;
    if (result.destination.droppableId !== columnaSiguiente(tarjeta)) {
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

  const columnas = Array.from({ length: maxInstallments }, (_, i) => i + 1);

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button type="button" onClick={cargar}
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
            {columnas.map((n) => {
              const tarjetas = students.filter((s) => s.current_installment_number === n);
              return (
                <Droppable droppableId={`col-${n}`} key={n}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`w-64 shrink-0 rounded-lg border border-border p-2 ${snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-surface-2'}`}>
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-xs font-semibold text-fg">Esperando Pago {n}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-text">{tarjetas.length}</span>
                      </div>
                      <div className="flex min-h-[80px] flex-col gap-2">
                        {tarjetas.map((t, index) => (
                          <Draggable draggableId={String(t.student_id)} index={index} key={t.student_id}>
                            {(providedCard) => (
                              <div ref={providedCard.innerRef} {...providedCard.draggableProps} {...providedCard.dragHandleProps}
                                className={`cursor-pointer rounded-md border p-2.5 shadow-sm transition-colors ${t.vencida ? 'border-danger bg-danger/10 hover:bg-danger/15' : 'border-border bg-surface hover:bg-surface-2'}`}
                                onClick={() => setDetailTarjeta(t)}>
                                <div className="text-xs font-semibold text-fg">{t.name}</div>
                                <div className="mt-1 flex items-center justify-between">
                                  <span className="text-[10px] text-fg-muted">Cuota {t.current_installment_number}/{t.total_cuotas} · {t.current_due_date}</span>
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
                                  <button type="button" onClick={() => setTarjetaSeleccionada(t)}
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
            })}

            <Droppable droppableId="saldado">
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className={`w-64 shrink-0 rounded-lg border border-success/30 p-2 ${snapshot.isDraggingOver ? 'bg-success/10' : 'bg-success/5'}`}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-success">Saldado / Pagado</span>
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">{students.filter((s) => s.saldado).length}</span>
                  </div>
                  <div className="flex min-h-[80px] flex-col gap-2">
                    {students.filter((s) => s.saldado).map((t, index) => (
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

