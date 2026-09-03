import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Video, GalleryHorizontal, CircleDashed } from 'lucide-react';
import { contentApi } from '../../services/automationHubApi';

const FORMATOS = [
  { value: 'R', label: 'Video / Reel', desc: 'Una pieza de video vertical, un solo copy.', icon: Video },
  { value: 'C', label: 'Carrusel', desc: 'Varias imágenes o slides con copy propio cada uno.', icon: GalleryHorizontal },
  { value: 'H', label: 'Historias', desc: 'Formato efímero, también con varios slides.', icon: CircleDashed },
];

const OBJETIVOS = [
  'Alcance', 'Educación', 'Autoridad', 'Leads', 'Conversación',
  'Venta Low Ticket', 'Venta High Ticket', 'Nutrición',
];

const inputClass = 'h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg';
const textareaClass = 'w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm text-fg';

function limpiarSlug(v) {
  const sinTildes = (v || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  return sinTildes.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 18) || 'CONTENIDO';
}
function previsualizarTrackingCode({ format, keyword, publish_date }) {
  const fecha = String(publish_date || '').replace(/-/g, '');
  return `${format}-${limpiarSlug(keyword)}-${fecha}-XXXXXX`;
}
// Mismo criterio que ManyChatFloatingAssistant.jsx: solo Historias usa una
// plantilla distinta, Reel y Carrusel comparten la de "Reels / Posts".
function plantillaParaFormato(format) {
  return format === 'H' ? 'PLANTILLA - TRACKING HISTORIAS' : 'PLANTILLA - TRACKING REELS / POSTS';
}

function PasoHeader({ numero, titulo, subtitulo }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary-text">
        {numero}
      </div>
      <div>
        <h4 className="m-0 text-sm font-semibold text-fg">{titulo}</h4>
        <p className="m-0 text-xs text-fg-muted">{subtitulo}</p>
      </div>
    </div>
  );
}

export default function ContentFormModal({ fechaInicial, onClose, onCreado }) {
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState({
    format: 'R',
    topic: '',
    keyword: '',
    angle: '',
    objective: '',
    script: '',
    description: '',
    slides: [],
    publish_date: fechaInicial || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }),
    publish_time: '10:00',
    is_test: false,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [creado, setCreado] = useState(null);

  const set = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));
  const esMultiSlide = datos.format === 'C' || datos.format === 'H';

  const cambiarCantidadSlides = (n) => {
    const cant = Math.max(1, Number(n) || 1);
    setDatos((d) => {
      const nuevas = [...d.slides];
      while (nuevas.length < cant) nuevas.push('');
      nuevas.length = cant;
      return { ...d, slides: nuevas };
    });
  };
  const cambiarSlide = (i, valor) => setDatos((d) => ({ ...d, slides: d.slides.map((s, idx) => (idx === i ? valor : s)) }));

  const irA = (n) => {
    if (n === 3 && (!datos.topic.trim() || !datos.keyword.trim())) {
      setError('El tema y la palabra clave / CTA son obligatorios.');
      return;
    }
    setError('');
    setPaso(n);
  };

  const handleSubmit = async () => {
    setGuardando(true);
    setError('');
    try {
      const nuevo = await contentApi.crear(datos);
      setCreado(nuevo); // muestra la confirmación en vez de cerrar de golpe
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

        {creado ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <Check size={26} />
            </div>
            <h4 className="m-0 text-base font-semibold text-fg">Contenido programado</h4>
            <p className="m-0 text-sm text-fg-muted">Quedó agendado para el {creado.publish_date} · {String(creado.publish_time).slice(0, 5)}.</p>
            <div className="w-full max-w-xs rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Código de tracking</div>
              <div className="text-sm font-bold text-primary-text">{creado.tracking_code}</div>
            </div>
            <button type="button" onClick={() => onCreado(creado)}
              className="mt-2 h-10 w-full max-w-xs rounded-md bg-primary text-sm font-semibold text-primary-fg">
              Listo
            </button>
          </div>
        ) : (
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col gap-4 p-4">

            {paso === 1 && (
              <div>
                <PasoHeader numero={1} titulo="Elegí el formato" subtitulo="Qué tipo de pieza vas a producir." />
                <div className="flex flex-col gap-2">
                  {FORMATOS.map((f) => {
                    const Icono = f.icon;
                    const activo = datos.format === f.value;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setDatos((d) => ({
                          ...d,
                          format: f.value,
                          slides: (f.value === 'C' || f.value === 'H') && d.slides.length === 0 ? [''] : d.slides,
                        }))}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          activo ? 'border-primary bg-primary/5' : 'border-border bg-surface-2 hover:bg-surface'
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          activo ? 'bg-primary text-primary-fg' : 'bg-surface text-fg-muted'
                        }`}>
                          <Icono size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-sm font-semibold ${activo ? 'text-primary-text' : 'text-fg'}`}>{f.label}</div>
                          <div className="text-xs text-fg-muted">{f.desc}</div>
                        </div>
                        {activo && <Check size={16} className="ml-auto shrink-0 text-primary-text" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {paso === 2 && (
              <div className="flex flex-col gap-3">
                <PasoHeader numero={2} titulo="Definí la estrategia" subtitulo="Qué queremos comunicar y qué acción buscamos." />
                <div className="grid grid-cols-2 gap-3">
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
                </div>
              </div>
            )}

            {paso === 3 && (
              <div className="flex flex-col gap-3">
                <PasoHeader numero={3} titulo="Desarrollá la pieza" subtitulo="Escribí el contenido que finalmente se producirá." />

                {esMultiSlide ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-fg-muted">
                        Idea general {datos.format === 'C' ? 'del carrusel' : 'de la historia'}
                      </label>
                      <textarea className={textareaClass} rows={3} value={datos.script} onChange={set('script')} placeholder="Escribí acá el contenido..." />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-fg-muted">Cantidad de slides</label>
                      <input type="number" min="1" className={`${inputClass} w-24`} value={datos.slides.length || 1}
                        onChange={(e) => cambiarCantidadSlides(e.target.value)} />
                    </div>

                    <div className="flex flex-col gap-2">
                      {datos.slides.map((texto, i) => (
                        <div key={i} className="flex gap-2">
                          <div className="flex h-9 w-7 shrink-0 items-center justify-center rounded-md bg-warning/10 text-xs font-bold text-warning">{i + 1}</div>
                          <textarea className={textareaClass} rows={2} value={texto} onChange={(e) => cambiarSlide(i, e.target.value)}
                            placeholder={`Copy del slide ${i + 1}...`} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted">Guión / Copy</label>
                    <textarea className={textareaClass} rows={4} value={datos.script} onChange={set('script')} placeholder="Escribí acá el contenido..." />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted">Descripción / Caption</label>
                  <textarea className={textareaClass} rows={3} value={datos.description} onChange={set('description')} placeholder="Descripción para publicar..." />
                </div>
              </div>
            )}

            {paso === 4 && (
              <div className="flex flex-col gap-3">
                <PasoHeader numero={4} titulo="Programá la publicación" subtitulo="Definí cuándo debe publicarse la pieza." />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted">Fecha de Producción del video</label>
                    <input type="date" className={inputClass} value={datos.publish_date} onChange={set('publish_date')} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted">Hora de Producción del video</label>
                    <input type="time" className={inputClass} value={datos.publish_time} onChange={set('publish_time')} />
                  </div>
                </div>

                <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
                  <div className="mb-2 flex flex-col gap-1.5 text-xs">
                    <div><span className="text-fg-muted">Plantilla a duplicar en ManyChat: </span><strong className="text-fg">{plantillaParaFormato(datos.format)}</strong></div>
                    <div><span className="text-fg-muted">Palabra CTA (Trigger): </span><strong className="text-primary-text">{datos.keyword}</strong></div>
                  </div>
                  <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Código único de tracking</div>
                  <div className="text-sm font-bold text-primary-text">{previsualizarTrackingCode(datos)}</div>
                  <p className="m-0 mt-1 text-[10px] text-fg-subtle">Las X finales se generan solas al guardar — evitan choques si dos piezas comparten palabra clave y fecha.</p>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
                  <input type="checkbox" id="isTestCheck" checked={datos.is_test}
                    onChange={(e) => setDatos((d) => ({ ...d, is_test: e.target.checked }))}
                    className="h-4 w-4 rounded border-border" />
                  <label htmlFor="isTestCheck" className="text-xs font-semibold text-warning">
                    Marcar como contenido de prueba (No se contará en las analíticas)
                  </label>
                </div>
              </div>
            )}

            {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          </div>

          <div className="shrink-0 flex items-center justify-between gap-2 border-t border-border p-4">
            {paso > 1 ? (
              <button type="button" onClick={() => setPaso((p) => p - 1)}
                className="flex h-10 items-center gap-1.5 rounded-md border border-border px-4 text-sm font-semibold text-fg">
                <ArrowLeft size={15} /> Atrás
              </button>
            ) : <span />}

            {paso < 4 ? (
              <button type="button" onClick={() => irA(paso + 1)}
                className="flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg">
                Continuar <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={guardando}
                className="flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg disabled:opacity-60">
                <Check size={15} /> {guardando ? 'Guardando...' : 'Finalizar'}
              </button>
            )}
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
