import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus, Minus, Mail, Phone, Tag } from 'lucide-react';
import { crmApi } from '../../services/automationHubApi';
import { TICKET_OPTIONS, obtenerTicketTag, reemplazarTicketTag } from './ticketTags';
import CurrencyInput from '../../components/CurrencyInput';

const inputClass = 'h-9 w-full rounded-md border border-border bg-surface-2 px-2 text-xs text-fg';
const fmtGs = (n) => Number(n || 0).toLocaleString('es-PY');

const COLOR_CLASS = {
  green: 'bg-success/10 text-success',
  amber: 'bg-warning/10 text-warning',
  red: 'bg-danger/10 text-danger',
  gray: 'bg-surface-2 text-fg-muted',
};

function sumarMeses(fechaBase, n) {
  const d = new Date(fechaBase);
  d.setMonth(d.getMonth() + n);
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });
}

/** Reparte el monto entre N cuotas en partes iguales — el resto de la
 * división (por redondeo a la unidad) se acumula en la última cuota, para
 * que la suma dé siempre exacta. */
function distribuirAutomatico(monto, cantidad) {
  const base = Math.floor(monto / cantidad);
  const resto = monto - base * cantidad;
  return Array.from({ length: cantidad }, (_, i) => (i === cantidad - 1 ? base + resto : base));
}

function PlanPagosForm({ leadId, montoNegociado, hayPlanActivo, onCancelar, onCreado }) {
  const [cantidad, setCantidad] = useState(3);
  const [auto, setAuto] = useState(false);
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });
  const [cuotas, setCuotas] = useState(
    Array.from({ length: 3 }, (_, i) => ({ amount: '', due_date: sumarMeses(hoy, i + 1) }))
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const regenerar = (cant, automatico) => {
    setCuotas((prev) => {
      const montos = automatico && montoNegociado > 0 ? distribuirAutomatico(montoNegociado, cant) : null;
      return Array.from({ length: cant }, (_, i) => ({
        amount: montos ? String(montos[i]) : (prev[i]?.amount || ''),
        due_date: prev[i]?.due_date || sumarMeses(hoy, i + 1),
      }));
    });
  };

  // El monto sale siempre de "Monto negociado" (arriba, en Gestión) — si lo
  // cambiás mientras este formulario está abierto, las cuotas automáticas
  // se recalculan solas.
  useEffect(() => { if (auto) regenerar(cantidad, true); }, [montoNegociado]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarCantidad = (n) => { const c = Math.max(1, Number(n) || 1); setCantidad(c); regenerar(c, auto); };
  const cambiarAuto = (v) => {
    setAuto(v);
    if (v) {
      regenerar(cantidad, true);
    } else {
      // Al desactivar, se borra lo que se había distribuido — no queda
      // como "manual" con los números automáticos todavía puestos.
      setCuotas((prev) => prev.map((c) => ({ ...c, amount: '' })));
    }
  };
  const cambiarCuota = (i, campo, valor) => setCuotas((prev) => prev.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c)));

  const suma = cuotas.reduce((a, c) => a + (Number(c.amount) || 0), 0);
  const diferencia = montoNegociado - suma;
  const coincide = montoNegociado > 0 && Math.abs(diferencia) < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coincide) return;
    setGuardando(true);
    setError('');
    try {
      await crmApi.crearPlanDePagos(leadId, {
        total: montoNegociado,
        cuotas: cuotas.map((c, i) => ({ amount: Number(c.amount), due_date: c.due_date, label: `Pago ${i + 1}` })),
      });
      onCreado();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear el acuerdo de pago.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3">
      <div className="mb-1 text-xs font-semibold uppercase text-fg-subtle">Crear acuerdo de pago</div>

      {hayPlanActivo && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-[11px] text-warning">
          Este lead ya tiene un acuerdo sin terminar de pagar — revisá si en realidad querés ver ese en vez de crear uno nuevo.
        </div>
      )}

      <div>
        <label className="text-[10px] font-semibold uppercase text-fg-subtle">Monto a negociar</label>
        <div className="flex h-11 items-center rounded-md border border-border bg-surface px-2 text-base font-semibold text-fg">
          Gs {fmtGs(montoNegociado)}
        </div>
        {montoNegociado <= 0 && (
          <p className="m-0 mt-1 text-[11px] text-warning">Completá "Monto negociado" arriba antes de crear el acuerdo.</p>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase text-fg-subtle">Cuotas</label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => cambiarCantidad(cantidad - 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-fg"><Minus size={13} /></button>
          <span className="w-5 text-center text-sm font-semibold text-fg">{cantidad}</span>
          <button type="button" onClick={() => cambiarCantidad(cantidad + 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-fg"><Plus size={13} /></button>
        </div>
      </div>

      <label className="mt-1 flex items-center gap-2 text-xs text-fg">
        <input type="checkbox" checked={auto} onChange={(e) => cambiarAuto(e.target.checked)} />
        Distribuir automáticamente
      </label>

      <div className="mt-1 flex flex-col gap-1.5">
        {cuotas.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-14 shrink-0 text-[10px] font-semibold text-fg-muted">Cuota {i + 1}</span>
            <CurrencyInput className={inputClass} placeholder="Monto" value={c.amount === '' ? '' : Number(c.amount)} disabled={auto}
              onChange={(v) => cambiarCuota(i, 'amount', v === '' ? '' : v)} />
            <input type="date" className={inputClass} value={c.due_date} onChange={(e) => cambiarCuota(i, 'due_date', e.target.value)} />
          </div>
        ))}
      </div>

      <div className="mt-1 flex flex-col gap-0.5 rounded-md bg-surface px-2 py-1.5 text-[11px]">
        <div className="flex justify-between text-fg-muted"><span>Total</span><span className="font-semibold text-fg">Gs {fmtGs(montoNegociado)}</span></div>
        <div className="flex justify-between text-fg-muted"><span>Distribuido</span><span className="font-semibold text-fg">Gs {fmtGs(suma)}</span></div>
        <div className={`flex justify-between font-semibold ${coincide ? 'text-success' : 'text-danger'}`}><span>Diferencia</span><span>Gs {fmtGs(diferencia)}</span></div>
      </div>

      {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-2 py-1.5 text-[11px] text-danger">{error}</div>}

      <div className="mt-1 flex gap-2">
        <button type="button" onClick={onCancelar} disabled={guardando}
          className="h-9 flex-1 rounded-md border border-border text-xs font-semibold text-fg">
          Cancelar
        </button>
        <button type="submit" disabled={!coincide || guardando}
          className="h-9 flex-[2] rounded-md bg-primary text-xs font-semibold text-primary-fg disabled:opacity-40">
          {guardando ? 'Creando...' : 'Crear acuerdo de pago'}
        </button>
      </div>
    </form>
  );
}

function AcuerdoCard({ plan }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-fg">Acuerdo #{plan.id} — Gs {fmtGs(plan.negotiated_price)}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${plan.saldado ? COLOR_CLASS.green : COLOR_CLASS.amber}`}>
          {plan.saldado ? 'Saldado' : 'Activo'}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {plan.cuotas.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-[11px]">
            <span className={c.status === 'Pagado' ? 'text-success' : 'text-fg-muted'}>
              {c.status === 'Pagado' ? '✓' : '○'} Cuota {c.installment_number} · Gs {fmtGs(c.amount)}
            </span>
            <span className="text-fg-muted">{c.status === 'Pagado' ? `Pagado ${c.paid_date}` : `Vence ${c.due_date}`}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-border pt-1.5 text-[11px]">
        <span className="text-fg-muted">Pagado <strong className="text-success">Gs {fmtGs(plan.total_pagado)}</strong></span>
        <span className="text-fg-muted">Pendiente <strong className="text-fg">Gs {fmtGs(plan.total_pendiente)}</strong></span>
      </div>
    </div>
  );
}

export default function LeadDetailModal({ lead, pipeline, onClose, onCambio }) {
  const [form, setForm] = useState({
    phone: lead.phone || '',
    email: lead.email || '',
    source: lead.source || '',
    value: lead.value ?? '',
    status: lead.status || 'open',
    stage_id: lead.stage_id,
    ticket: obtenerTicketTag(lead.tags),
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [estados, setEstados] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [mostrarFormPlan, setMostrarFormPlan] = useState(false);

  useEffect(() => {
    crmApi.estados().then(setEstados).catch(() => {});
    crmApi.planesDeLead(lead.id).then(setPlanes).catch(() => {});
  }, [lead.id]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleGuardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (Number(form.stage_id) !== lead.stage_id) {
        await crmApi.moverEtapa(lead.id, Number(form.stage_id));
      }
      await crmApi.actualizarLead(lead.id, {
        phone: form.phone || null,
        email: form.email || null,
        source: form.source || null,
        value: form.value === '' ? null : form.value,
        status: form.status,
        tags: reemplazarTicketTag(lead.tags, form.ticket || null),
      });
      onCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el lead.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm(`¿Eliminar el lead "${lead.name}"? Esta acción no se puede deshacer.`)) return;
    setGuardando(true);
    try {
      await crmApi.eliminarLead(lead.id);
      onCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el lead.');
      setGuardando(false);
    }
  };

  const otrosTags = (lead.tags || []).filter((t) => !TICKET_OPTIONS.some((o) => o.value === t));
  const hayPlanActivo = planes.some((p) => !p.saldado);
  const estadoActual = estados.find((e) => e.code === form.status);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">{lead.name}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"><X size={18} /></button>
        </div>

        {/* Cliente */}
        <div className="flex flex-col gap-1 border-b border-border p-4 pb-3">
          <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Cliente</div>
          <div className="flex items-center gap-1.5 text-xs text-fg"><Phone size={12} className="text-fg-muted" /> {form.phone || '—'}</div>
          <div className="flex items-center gap-1.5 text-xs text-fg"><Mail size={12} className="text-fg-muted" /> {form.email || '—'}</div>
          <div className="flex items-center gap-1.5 text-xs text-fg"><Tag size={12} className="text-fg-muted" /> {form.source || '—'}</div>
        </div>

        <form onSubmit={handleGuardar} className="flex flex-col gap-2 border-b border-border p-4">
          <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Gestión</div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="text-[9px] font-semibold uppercase text-fg-subtle">Etapa</label>
              <select className={inputClass} value={form.stage_id} onChange={set('stage_id')}>
                {(pipeline?.Stages || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase text-fg-subtle">Estado</label>
              <select className={inputClass} value={form.status} onChange={set('status')}>
                {estados.length === 0 && <option value={form.status}>{form.status}</option>}
                {estados.map((e) => <option key={e.code} value={e.code}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase text-fg-subtle">Ticket</label>
              <select className={inputClass} value={form.ticket} onChange={set('ticket')}>
                <option value="">—</option>
                {TICKET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {estadoActual?.color && (
            <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${COLOR_CLASS[estadoActual.color] || COLOR_CLASS.gray}`}>
              {estadoActual.label}
            </span>
          )}

          <label className="mt-2 text-[10px] font-semibold uppercase text-fg-subtle">Teléfono</label>
          <input className={inputClass} value={form.phone} onChange={set('phone')} />

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Email</label>
          <input className={inputClass} value={form.email} onChange={set('email')} />

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Fuente</label>
          <input className={inputClass} value={form.source} onChange={set('source')} />

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Monto negociado</label>
          <CurrencyInput className={inputClass} placeholder="Ej: 5.000.000" value={form.value === '' ? '' : Number(form.value)}
            onChange={(v) => setForm((f) => ({ ...f, value: v === '' ? '' : v }))} />
          <p className="m-0 text-[10px] text-fg-subtle">Este monto se usa como punto de partida al crear el acuerdo de pago, abajo.</p>

          {lead.tracking_code && (
            <>
              <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Código de Tracking (Reel/Post)</label>
              <input className={`${inputClass} bg-surface-2 text-fg-muted cursor-not-allowed`} value={lead.tracking_code} disabled />
            </>
          )}

          {otrosTags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {otrosTags.map((t) => (
                <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-fg-muted">{t}</span>
              ))}
            </div>
          )}

          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-2 py-1.5 text-[11px] text-danger">{error}</div>}

          <div className="mt-2 flex gap-2">
            <button type="submit" disabled={guardando} className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={handleEliminar} disabled={guardando}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-danger/30 text-danger disabled:opacity-60">
              <Trash2 size={16} />
            </button>
          </div>
        </form>

        <div className="p-4 pt-3">
          <div className="mb-2 text-[10px] font-semibold uppercase text-fg-subtle">Acuerdo de pago</div>

          {planes.length > 0 && (
            <div className="mb-2 flex flex-col gap-2">
              {planes.map((p) => <AcuerdoCard key={p.id} plan={p} />)}
            </div>
          )}

          {mostrarFormPlan ? (
            <PlanPagosForm
              leadId={lead.id}
              montoNegociado={Number(form.value) || 0}
              hayPlanActivo={hayPlanActivo}
              onCancelar={() => setMostrarFormPlan(false)}
              onCreado={onCambio}
            />
          ) : (
            <button type="button" onClick={() => setMostrarFormPlan(true)}
              className={planes.length === 0
                ? 'flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-fg'
                : 'flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-border text-xs font-semibold text-fg'}>
              <Plus size={planes.length === 0 ? 16 : 14} /> {planes.length === 0 ? 'Crear acuerdo de pago' : 'Nuevo acuerdo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
