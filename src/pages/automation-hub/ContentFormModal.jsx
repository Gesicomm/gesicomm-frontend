import React, { useState } from 'react';
import { X } from 'lucide-react';
import { contentApi } from '../../services/automationHubApi';

const FORMATOS = [
  { value: 'R', label: 'Video / Reel' },
  { value: 'C', label: 'Carrusel' },
  { value: 'H', label: 'Historias' },
];

const OBJETIVOS = [
  'Alcance', 'Educación', 'Autoridad', 'Leads', 'Conversación',
  'Venta Low Ticket', 'Venta High Ticket', 'Nutrición',
];

const inputClass = 'h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg';

export default function ContentFormModal({ fechaInicial, onClose, onCreado }) {
  const [datos, setDatos] = useState({
    format: 'R',
    topic: '',
    keyword: '',
    angle: '',
    objective: '',
    script: '',
    description: '',
    publish_date: fechaInicial || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }),
    publish_time: '10:00',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!datos.topic.trim() || !datos.keyword.trim()) {
      setError('El tema y la palabra clave / CTA son obligatorios.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const creado = await contentApi.crear(datos);
      onCreado(creado);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el contenido.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">Nuevo contenido</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-muted">Formato</label>
              <div className="grid grid-cols-3 gap-2">
                {FORMATOS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setDatos((d) => ({ ...d, format: f.value }))}
                    className={`rounded-md border px-2 py-2 text-xs font-semibold ${
                      datos.format === f.value
                        ? 'border-primary bg-primary/10 text-primary-text'
                        : 'border-border bg-surface-2 text-fg-muted'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-muted">Tema *</label>
              <input className={inputClass} value={datos.topic} onChange={set('topic')} placeholder="Ej.: Cómo elegir un producto rentable" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-muted">Palabra clave / CTA *</label>
              <input className={inputClass} value={datos.keyword} onChange={set('keyword')} placeholder="Ej.: PRODUCTO" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-muted">Ángulo</label>
              <input className={inputClass} value={datos.angle} onChange={set('angle')} placeholder="Ej.: Error común / Caso real" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-muted">Objetivo</label>
              <select className={inputClass} value={datos.objective} onChange={set('objective')}>
                <option value="">Seleccionar...</option>
                {OBJETIVOS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-muted">Guión / Copy</label>
              <textarea className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm text-fg" rows={4}
                value={datos.script} onChange={set('script')} placeholder="Escribí acá el contenido..." />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-muted">Descripción / Caption</label>
              <textarea className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm text-fg" rows={3}
                value={datos.description} onChange={set('description')} placeholder="Descripción para publicar..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-fg-muted">Fecha de produccion del video</label>
                <input type="date" className={inputClass} value={datos.publish_date} onChange={set('publish_date')} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-fg-muted">Hora de produccion del video</label>
                <input type="time" className={inputClass} value={datos.publish_time} onChange={set('publish_time')} />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
              <input 
                type="checkbox" 
                id="isTestCheck" 
                checked={datos.is_test || false} 
                onChange={(e) => setDatos(d => ({ ...d, is_test: e.target.checked }))} 
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="isTestCheck" className="text-xs font-semibold text-warning">
                Marcar como contenido de prueba (No se contar en las analticas)
              </label>
            </div>

            {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          </div>

          <div className="shrink-0 border-t border-border p-4">
            <button type="submit" disabled={guardando}
              className="h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Programar contenido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
