import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { crmApi } from '../../services/automationHubApi';
import { TICKET_OPTIONS, obtenerTicketTag, reemplazarTicketTag } from './ticketTags';

const inputClass = 'h-9 w-full rounded-md border border-border bg-surface-2 px-2 text-xs text-fg';
const ESTADOS = [
  { value: 'open', label: 'Abierto' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
];

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

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">{lead.name}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"><X size={18} /></button>
        </div>
        <form onSubmit={handleGuardar} className="flex flex-col gap-2 p-4">
          <label className="text-[10px] font-semibold uppercase text-fg-subtle">Etapa</label>
          <select className={inputClass} value={form.stage_id} onChange={set('stage_id')}>
            {(pipeline?.Stages || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Estado</label>
          <select className={inputClass} value={form.status} onChange={set('status')}>
            {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Tipo de ticket</label>
          <select className={inputClass} value={form.ticket} onChange={set('ticket')}>
            <option value="">Sin clasificar</option>
            {TICKET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Teléfono</label>
          <input className={inputClass} value={form.phone} onChange={set('phone')} />

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Email</label>
          <input className={inputClass} value={form.email} onChange={set('email')} />

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Fuente</label>
          <input className={inputClass} value={form.source} onChange={set('source')} />

          <label className="mt-1 text-[10px] font-semibold uppercase text-fg-subtle">Monto de venta ($)</label>
          <input type="number" step="0.01" className={inputClass} placeholder="Ej: 500" value={form.value} onChange={set('value')} />

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
      </div>
    </div>
  );
}
