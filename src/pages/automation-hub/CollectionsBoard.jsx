import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RefreshCcw, MessageCircle, X } from 'lucide-react';
import { collectionsApi } from '../../services/automationHubApi';
import { getMetodosPago } from '../../services/courierApi';

function soloDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}
const fmtGs = (n) => Number(n || 0).toLocaleString('es-PY');

/** A qué columna tiene que ir la tarjeta si se cobra su cuota actual —
 * la próxima cuota, o "saldado" si esta era la última. Cualquier otro
 * destino de un drag se rechaza (para eso está el click, con fecha/método
 * manuales). */
function columnaSiguiente(tarjeta) {
  if (tarjeta.current_installment_number >= tarjeta.total_cuotas) return 'saldado';
  return `col-${tarjeta.current_installment_number + 1}`;
}

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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">Registrar cobro — {tarjeta.name}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4">
          <p className="m-0 text-xs text-fg-muted">Cuota {tarjeta.current_installment_number} de {tarjeta.total_cuotas}.</p>
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
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState(null);

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

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const tarjeta = students.find((s) => String(s.student_id) === result.draggableId);
    if (!tarjeta || tarjeta.saldado) return;
    if (result.destination.droppableId !== columnaSiguiente(tarjeta)) {
      setError('Solo se puede arrastrar a la próxima cuota (o a Saldado si era la última) — para otra fecha, hacé clic en la tarjeta.');
      return;
    }
    const anterior = students;
    setStudents((prev) => prev.filter((s) => s.student_id !== tarjeta.student_id).concat({
      ...tarjeta,
      cuotas_pagadas: tarjeta.cuotas_pagadas + 1,
      current_installment_number: tarjeta.current_installment_number + 1 > tarjeta.total_cuotas ? null : tarjeta.current_installment_number + 1,
      saldado: tarjeta.cuotas_pagadas + 1 === tarjeta.total_cuotas,
    }));
    try {
      await collectionsApi.registrarCobro(tarjeta.current_payment_id, {});
      cargar();
    } catch (err) {
      setStudents(anterior);
      setError(err.response?.data?.message || 'No se pudo registrar el cobro.');
    }
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
                                onClick={() => setTarjetaSeleccionada(t)}
                                className={`cursor-pointer rounded-md border p-2.5 shadow-sm ${t.vencida ? 'border-danger bg-danger/10' : 'border-border bg-surface'}`}>
                                <div className="text-xs font-semibold text-fg">{t.name}</div>
                                {t.phone && (
                                  <a href={`https://wa.me/${soloDigitos(t.phone)}`} target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-success">
                                    <MessageCircle size={11} /> {t.phone}
                                  </a>
                                )}
                                <div className="mt-1 flex items-center justify-between">
                                  <span className="text-[10px] text-fg-muted">Vence {t.current_due_date}</span>
                                  <span className="text-[10px] font-bold text-fg-muted">Gs {fmtGs(t.negotiated_price)}</span>
                                </div>
                                {t.vencida && <div className="mt-1 text-[9px] font-bold uppercase text-danger">Vencido</div>}
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
                            className="rounded-md border border-border bg-surface p-2.5 shadow-sm opacity-80">
                            <div className="text-xs font-semibold text-fg">{t.name}</div>
                            <div className="mt-1 text-[10px] font-bold text-fg-muted">Gs {fmtGs(t.negotiated_price)}</div>
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

      {tarjetaSeleccionada && (
        <RegistrarCobroModal
          tarjeta={tarjetaSeleccionada}
          onClose={() => setTarjetaSeleccionada(null)}
          onGuardado={() => { setTarjetaSeleccionada(null); cargar(); }}
        />
      )}
    </div>
  );
}
