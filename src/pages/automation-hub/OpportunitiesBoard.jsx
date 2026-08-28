import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RefreshCcw, MessageCircle, Plus, X } from 'lucide-react';
import { crmApi } from '../../services/automationHubApi';

function soloDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}

// Una tarjeta se marca "NUEVA" si entró en las últimas 24hs — reemplaza al
// tracking de "vistas" que antes vivía en GoHighLevel/localStorage.
function esNueva(lead) {
  return Date.now() - new Date(lead.created_at).getTime() < 24 * 60 * 60 * 1000;
}

const inputClass = 'h-9 w-full rounded-md border border-border bg-surface-2 px-2 text-xs text-fg';

function NuevoLeadModal({ pipelines, pipelineId, onClose, onCreado }) {
  const pipeline = pipelines.find((p) => p.id === pipelineId);
  const [form, setForm] = useState({ name: '', phone: '', email: '', source: '', value: '', stage_id: pipeline?.Stages?.[0]?.id || '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.stage_id) {
      setError('El nombre y la etapa son obligatorios.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await crmApi.crearLead({ ...form, pipeline_id: pipelineId, value: form.value || null });
      onCreado();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear el lead.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">Nuevo lead / oportunidad</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4">
          <input className={inputClass} placeholder="Nombre *" value={form.name} onChange={set('name')} />
          <input className={inputClass} placeholder="Teléfono" value={form.phone} onChange={set('phone')} />
          <input className={inputClass} placeholder="Email" value={form.email} onChange={set('email')} />
          <input className={inputClass} placeholder="Fuente (ej. Instagram, Referido)" value={form.source} onChange={set('source')} />
          <input type="number" step="0.01" className={inputClass} placeholder="Valor" value={form.value} onChange={set('value')} />
          <select className={inputClass} value={form.stage_id} onChange={set('stage_id')}>
            {(pipeline?.Stages || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-2 py-1.5 text-[11px] text-danger">{error}</div>}
          <button type="submit" disabled={guardando} className="mt-1 h-10 rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
            {guardando ? 'Guardando...' : 'Crear lead'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OpportunitiesBoard() {
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState('');
  const [leads, setLeads] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);

  const pipeline = useMemo(() => pipelines.find((p) => p.id === pipelineId), [pipelines, pipelineId]);

  const cargarPipelines = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await crmApi.pipelines();
      setPipelines(data);
      if (data.length && !pipelineId) setPipelineId(data[0].id);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los pipelines.');
    } finally {
      setCargando(false);
    }
  };

  const cargarLeads = async (pid) => {
    if (!pid) return;
    setCargando(true);
    setError('');
    try {
      setLeads(await crmApi.leads(pid));
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los leads.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarPipelines(); }, []);
  useEffect(() => { if (pipelineId) cargarLeads(pipelineId); }, [pipelineId]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const nuevaEtapaId = Number(result.destination.droppableId);
    const leadId = Number(result.draggableId);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage_id === nuevaEtapaId) return;

    const anterior = leads;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage_id: nuevaEtapaId } : l)));
    try {
      await crmApi.moverEtapa(leadId, nuevaEtapaId);
    } catch (err) {
      setLeads(anterior);
      setError(err.response?.data?.message || 'No se pudo mover el lead.');
    }
  };

  if (!cargando && !pipelines.length && !error) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-fg-muted">
        No hay pipelines configurados todavía.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select value={pipelineId} onChange={(e) => setPipelineId(Number(e.target.value))}
          className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={() => setModalAbierto(true)}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-fg">
            <Plus size={14} /> Nuevo lead
          </button>
          <button type="button" onClick={() => cargarLeads(pipelineId)}
            className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-xs font-semibold text-fg">
            <RefreshCcw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

      {cargando ? (
        <div className="p-8 text-center text-sm text-fg-muted">Cargando...</div>
      ) : pipeline ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(pipeline.Stages || []).map((stage) => {
              const tarjetas = leads.filter((l) => l.stage_id === stage.id);
              return (
                <Droppable droppableId={String(stage.id)} key={stage.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`w-72 shrink-0 rounded-lg border border-border p-2 ${snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-surface-2'}`}>
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-xs font-semibold text-fg">{stage.name}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-text">{tarjetas.length}</span>
                      </div>
                      <div className="flex min-h-[80px] flex-col gap-2">
                        {tarjetas.map((lead, index) => (
                          <Draggable draggableId={String(lead.id)} index={index} key={lead.id}>
                            {(providedCard) => (
                              <div ref={providedCard.innerRef} {...providedCard.draggableProps} {...providedCard.dragHandleProps}
                                className="rounded-md border border-border bg-surface p-2.5 shadow-sm">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                                  {lead.name}
                                  {esNueva(lead) && (
                                    <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">NUEVA</span>
                                  )}
                                </div>
                                {lead.email && <div className="mt-1 text-[10px] text-fg-muted">{lead.email}</div>}
                                {lead.phone && (
                                  <a
                                    href={`https://wa.me/${soloDigitos(lead.phone)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-success"
                                  >
                                    <MessageCircle size={11} /> {lead.phone}
                                  </a>
                                )}
                                <div className="mt-1 flex items-center justify-between">
                                  {lead.source && <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold text-fg-muted">{lead.source}</span>}
                                  {lead.value != null && <span className="text-[10px] font-bold text-fg-muted">{Number(lead.value).toLocaleString('es-PY')}</span>}
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
          </div>
        </DragDropContext>
      ) : null}

      {modalAbierto && (
        <NuevoLeadModal
          pipelines={pipelines}
          pipelineId={pipelineId}
          onClose={() => setModalAbierto(false)}
          onCreado={() => { setModalAbierto(false); cargarLeads(pipelineId); }}
        />
      )}
    </div>
  );
}
