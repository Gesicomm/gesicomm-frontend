import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RefreshCcw, MessageCircle } from 'lucide-react';
import { opportunitiesApi } from '../../services/automationHubApi';

function soloDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}

export default function OpportunitiesBoard() {
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState('');
  const [oportunidades, setOportunidades] = useState([]);
  const [nuevasIds, setNuevasIds] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const pipeline = useMemo(() => pipelines.find((p) => p.id === pipelineId), [pipelines, pipelineId]);

  const cargarPipelines = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await opportunitiesApi.pipelines();
      setPipelines(data);
      if (data.length && !pipelineId) setPipelineId(data[0].id);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los pipelines de GoHighLevel.');
    } finally {
      setCargando(false);
    }
  };

  const cargarOportunidades = async (pid) => {
    if (!pid) return;
    setCargando(true);
    setError('');
    try {
      const { oportunidades: lista, nuevasIds: nuevas } = await opportunitiesApi.listar(pid);
      setOportunidades(lista);
      setNuevasIds(nuevas);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las oportunidades.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarPipelines(); }, []);
  useEffect(() => { if (pipelineId) cargarOportunidades(pipelineId); }, [pipelineId]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const nuevaEtapaId = result.destination.droppableId;
    const oportunidad = oportunidades.find((o) => o.id === result.draggableId);
    if (!oportunidad || oportunidad.pipelineStageId === nuevaEtapaId) return;

    const anterior = oportunidades;
    setOportunidades((prev) => prev.map((o) => (o.id === oportunidad.id ? { ...o, pipelineStageId: nuevaEtapaId } : o)));
    try {
      await opportunitiesApi.moverEtapa(oportunidad.id, pipelineId, nuevaEtapaId);
    } catch (err) {
      setOportunidades(anterior);
      setError(err.response?.data?.message || 'No se pudo mover la oportunidad.');
    }
  };

  if (!cargando && !pipelines.length && !error) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-fg-muted">
        No hay pipelines disponibles. Conectá GoHighLevel en la pestaña correspondiente.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}
          className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" onClick={() => cargarOportunidades(pipelineId)}
          className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-xs font-semibold text-fg">
          <RefreshCcw size={14} /> Actualizar
        </button>
      </div>

      {error && <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

      {cargando ? (
        <div className="p-8 text-center text-sm text-fg-muted">Cargando...</div>
      ) : pipeline ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(pipeline.stages || []).map((stage) => {
              const tarjetas = oportunidades.filter((o) => o.pipelineStageId === stage.id);
              return (
                <Droppable droppableId={stage.id} key={stage.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`w-72 shrink-0 rounded-lg border border-border p-2 ${snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-surface-2'}`}>
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-xs font-semibold text-fg">{stage.name}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{tarjetas.length}</span>
                      </div>
                      <div className="flex min-h-[80px] flex-col gap-2">
                        {tarjetas.map((op, index) => (
                          <Draggable draggableId={op.id} index={index} key={op.id}>
                            {(providedCard) => (
                              <div ref={providedCard.innerRef} {...providedCard.draggableProps} {...providedCard.dragHandleProps}
                                className="rounded-md border border-border bg-surface p-2.5 shadow-sm">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                                  {op.name || op.contact?.name || 'Sin nombre'}
                                  {nuevasIds.includes(op.id) && (
                                    <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">NUEVA</span>
                                  )}
                                </div>
                                {op.contact?.phone && (
                                  <a
                                    href={`https://wa.me/${soloDigitos(op.contact.phone)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-success"
                                  >
                                    <MessageCircle size={11} /> {op.contact.phone}
                                  </a>
                                )}
                                {typeof op.monetaryValue === 'number' && op.monetaryValue > 0 && (
                                  <div className="mt-1 text-[10px] font-bold text-fg-muted">{op.monetaryValue}</div>
                                )}
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
    </div>
  );
}
