import React, { useState, useRef } from 'react';
import { 
  X, ArrowLeft, ArrowRight, Check, Video, GalleryHorizontal, CircleDashed, 
  Upload, AlertTriangle, Copy, Sparkles, Clock, Calendar, 
  Layers, Film, FileText, ChevronDown, ChevronUp, CheckCircle2, Trash2, Plus
} from 'lucide-react';
import { contentApi, socialApi } from '../../services/automationHubApi';
import LivePreviewMockup from './LivePreviewMockup';

function InstagramIcon({ size = 18, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 18, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const FORMATOS = [
  { 
    value: 'R', 
    label: 'Video / Reel', 
    desc: 'Publicá un video vertical en Instagram y Facebook.', 
    icon: Video 
  },
  { 
    value: 'C', 
    label: 'Carrusel', 
    desc: 'Publicá varias imágenes o slides con copy propio.', 
    icon: GalleryHorizontal 
  },
  { 
    value: 'H', 
    label: 'Historias', 
    desc: 'Formato efímero en pantalla completa para historias.', 
    icon: CircleDashed 
  },
];

const OBJETIVOS = [
  'Alcance', 'Educación', 'Autoridad', 'Leads', 'Conversación',
  'Venta Low Ticket', 'Venta High Ticket', 'Nutrición',
];

const PASOS = [
  { id: 1, key: 'Formato', title: 'Elegir formato' },
  { id: 2, key: 'Estrategia', title: 'Definir estrategia' },
  { id: 3, key: 'Contenido', title: 'Desarrollar pieza' },
  { id: 4, key: 'Programación', title: 'Programar publicación' },
];

const inputClass = 'h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg focus:border-primary focus:outline-none transition-colors';
const textareaClass = 'w-full rounded-lg border border-border bg-surface-2 p-3 text-sm text-fg focus:border-primary focus:outline-none transition-colors';

function limpiarSlug(v) {
  const sinTildes = (v || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  return sinTildes.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 12) || 'CONT';
}

function previsualizarTrackingCode({ format, keyword, publish_date }) {
  const fecha = String(publish_date || '').slice(2).replace(/-/g, '');
  return `${format}-${limpiarSlug(keyword)}-${fecha}`;
}

function plantillaParaFormato(format) {
  return format === 'H' ? 'PLANTILLA - TRACKING HISTORIAS' : 'PLANTILLA - TRACKING REELS / POSTS';
}

function ReelIllustration({ active }) {
  return (
    <div className={`relative flex h-12 w-9 shrink-0 flex-col justify-between rounded-lg border p-1 transition-colors ${
      active ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-surface-3 text-fg-subtle'
    }`}>
      <div className="flex justify-between items-center px-0.5">
        <div className="h-1 w-2.5 rounded-full bg-current opacity-60" />
        <div className="h-1 w-1 rounded-full bg-current opacity-60" />
      </div>
      <div className="flex items-center justify-center py-0.5">
        <Video size={13} className="opacity-90" />
      </div>
      <div className="h-1 w-full rounded bg-current opacity-40" />
    </div>
  );
}

function CarruselIllustration({ active }) {
  return (
    <div className="relative flex h-12 w-10 shrink-0 items-center justify-center">
      <div className={`absolute top-0.5 left-0 h-10 w-8 rounded-md border ${active ? 'border-primary/40 bg-primary/10' : 'border-border bg-surface-3/60'}`} />
      <div className={`absolute top-1.5 left-1 h-10 w-8 rounded-md border ${active ? 'border-primary/70 bg-primary/20' : 'border-border bg-surface-3'}`} />
      <div className={`relative h-10 w-8 rounded-md border flex items-center justify-center p-0.5 transition-colors ${
        active ? 'border-primary bg-primary/30 text-primary' : 'border-border bg-surface text-fg-subtle'
      }`}>
        <GalleryHorizontal size={13} className="opacity-90" />
      </div>
    </div>
  );
}

function HistoriasIllustration({ active }) {
  return (
    <div className={`relative flex h-12 w-9 shrink-0 flex-col justify-between rounded-lg border p-1 transition-colors ${
      active ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-surface-3 text-fg-subtle'
    }`}>
      <div className="flex gap-0.5 w-full">
        <div className="h-0.5 flex-1 rounded bg-current opacity-90" />
        <div className="h-0.5 flex-1 rounded bg-current opacity-40" />
        <div className="h-0.5 flex-1 rounded bg-current opacity-40" />
      </div>
      <div className="flex items-center justify-center py-0.5">
        <CircleDashed size={13} className="opacity-90" />
      </div>
      <div className="h-1.5 w-1.5 rounded-full border border-current opacity-60 self-center" />
    </div>
  );
}

export default function ContentFormModal({ fechaInicial, onClose, onCreado, itemToEdit }) {
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState(itemToEdit ? {
    format: itemToEdit.format || 'R',
    topic: itemToEdit.topic || '',
    keyword: itemToEdit.keyword || '',
    angle: itemToEdit.angle || '',
    objective: itemToEdit.objective || '',
    script: itemToEdit.script || '',
    description: itemToEdit.description || '',
    slides: itemToEdit.slides || [],
    publish_date: itemToEdit.publish_date || fechaInicial || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }),
    publish_time: itemToEdit.publish_time ? itemToEdit.publish_time.slice(0,5) : '10:00',
    is_test: itemToEdit.is_test || false,
    video_url: itemToEdit.video_url || null,
  } : {
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
  const [conflicto, setConflicto] = useState(null);
  const [error, setError] = useState('');
  const [creado, setCreado] = useState(null);
  const [file, setFile] = useState(null);
  const [platforms, setPlatforms] = useState(itemToEdit && itemToEdit.platforms ? {
    instagram: itemToEdit.platforms.includes('instagram'),
    facebook: itemToEdit.platforms.includes('facebook')
  } : { instagram: true, facebook: true });
  const [mostrarDetallesTecnicos, setMostrarDetallesTecnicos] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const fileInputRef = useRef(null);

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
    if (n > 2 && (!datos.topic.trim() || !datos.keyword.trim())) {
      setError('El tema y la palabra clave / CTA son obligatorios.');
      return;
    }
    setError('');
    setPaso(n);
  };

  const copiarCodigoTracking = () => {
    const code = previsualizarTrackingCode(datos);
    navigator.clipboard.writeText(code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const agregarSugerenciaCaption = (texto) => {
    setDatos((d) => ({
      ...d,
      description: d.description ? `${d.description}\n\n${texto}` : texto,
    }));
  };

  const handleSubmit = async (forzar = false) => {
    setGuardando(true);
    setError('');
    try {
      let finalData = { 
        ...datos, 
        platforms: Object.keys(platforms).filter(k => platforms[k]),
        force: forzar === true,
      };

      if (file) {
        const res = await socialApi.uploadMedia(file);
        finalData.video_url = res.videoUrl;
      }

      let nuevo;
      if (itemToEdit) {
        nuevo = await contentApi.editar(itemToEdit.id, finalData);
      } else {
        nuevo = await contentApi.crear(finalData);
      }
      setCreado(nuevo);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.existing_id) {
        setConflicto(err.response.data.existing_id);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'No se pudo guardar el contenido.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const getMediaListForPreview = () => {
    if (!file) return [];
    const url = URL.createObjectURL(file);
    return [{ url, type: file.type || 'video/mp4' }];
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-[540px] flex-col bg-surface shadow-2xl transition-all" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Principal */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="m-0 text-base font-bold text-fg">Nuevo contenido</h3>
            <p className="m-0 text-xs text-fg-muted">Asistente de creación y programación</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Stepper / Mini Progreso Bar */}
        {!creado && (
          <div className="border-b border-border bg-surface-2/60 px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Paso {paso} de 4
              </span>
              <span className="text-xs font-semibold text-fg">
                {PASOS[paso - 1].title}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {PASOS.map((p) => {
                const completado = p.id < paso;
                const actual = p.id === paso;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => p.id < paso && irA(p.id)}
                    disabled={p.id > paso}
                    className="flex flex-col gap-1 text-left cursor-pointer disabled:cursor-default"
                  >
                    <div
                      className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                        completado
                          ? 'bg-primary'
                          : actual
                          ? 'bg-primary'
                          : 'bg-border'
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium transition-colors ${
                        actual
                          ? 'font-bold text-fg'
                          : completado
                          ? 'text-primary'
                          : 'text-fg-subtle'
                      }`}
                    >
                      {p.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Body */}
        {creado ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h4 className="m-0 text-lg font-bold text-fg">¡Contenido programado con éxito!</h4>
              <p className="mt-1 text-xs text-fg-muted">
                Quedó agendado para el <strong className="text-fg">{creado.publish_date}</strong> a las <strong className="text-fg">{String(creado.publish_time).slice(0, 5)}</strong> hs.
              </p>
            </div>
            
            <div className="w-full max-w-sm rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Código de tracking generado</div>
              <div className="text-base font-mono font-bold text-primary">{creado.tracking_code}</div>
              <p className="m-0 mt-1 text-[11px] text-fg-muted">Usá este código exacto en tu flujo de ManyChat.</p>
            </div>

            <button 
              type="button" 
              onClick={() => onCreado(creado)}
              className="mt-2 h-11 w-full max-w-sm rounded-lg bg-primary text-sm font-bold text-primary-fg shadow hover:opacity-95 transition-opacity"
            >
              Listo, volver al calendario
            </button>
          </div>
        ) : (
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col gap-6 p-6">

            {/* PASO 1: Formato */}
            {paso === 1 && (
              <div className="space-y-4">
                <div>
                  <h4 className="m-0 text-sm font-bold text-fg">Elegí el formato de publicación</h4>
                  <p className="m-0 text-xs text-fg-muted">Seleccioná qué tipo de pieza vas a producir y programar.</p>
                </div>

                <div className="flex flex-col gap-3">
                  {FORMATOS.map((f) => {
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
                        className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                          activo 
                            ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30' 
                            : 'border-border bg-surface-2 hover:bg-surface-3 hover:border-border/80'
                        }`}
                      >
                        {f.value === 'R' && <ReelIllustration active={activo} />}
                        {f.value === 'C' && <CarruselIllustration active={activo} />}
                        {f.value === 'H' && <HistoriasIllustration active={activo} />}

                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-bold ${activo ? 'text-primary' : 'text-fg'}`}>{f.label}</div>
                          <div className="text-xs text-fg-muted mt-0.5">{f.desc}</div>
                        </div>

                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          activo ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface-3'
                        }`}>
                          {activo && <Check size={14} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PASO 2: Estrategia */}
            {paso === 2 && (
              <div className="space-y-4">
                <div>
                  <h4 className="m-0 text-sm font-bold text-fg">Definí la estrategia</h4>
                  <p className="m-0 text-xs text-fg-muted">¿Qué queremos comunicar y qué respuesta buscamos del usuario?</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-fg">Tema *</label>
                      <div className="text-[11px] text-fg-muted mb-1.5">¿Qué querés comunicar en este contenido?</div>
                      <input 
                        className={inputClass} 
                        value={datos.topic} 
                        onChange={set('topic')} 
                        placeholder="Ej.: Lanzamiento del nuevo producto" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-fg">Palabra clave / CTA *</label>
                      <div className="text-[11px] text-fg-muted mb-1.5">¿Qué debe escribir o hacer la persona para activar ManyChat?</div>
                      <input 
                        className={inputClass} 
                        value={datos.keyword} 
                        onChange={set('keyword')} 
                        placeholder="Ej.: Escribí 'INFO' o 'PRODUCTO'" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-fg mb-0.5">Ángulo</label>
                      <div className="text-[10px] text-fg-subtle mb-1.5">Enfoque principal</div>
                      <input 
                        className={inputClass} 
                        value={datos.angle} 
                        onChange={set('angle')} 
                        placeholder="Ej.: Problema → solución" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-fg mb-0.5">Objetivo</label>
                      <div className="text-[10px] text-fg-subtle mb-1.5">Meta comercial</div>
                      <select className={inputClass} value={datos.objective} onChange={set('objective')}>
                        <option value="">Seleccionar...</option>
                        {OBJETIVOS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: Contenido */}
            {paso === 3 && (
              <div className="space-y-4">
                <div>
                  <h4 className="m-0 text-sm font-bold text-fg">Desarrollá la pieza</h4>
                  <p className="m-0 text-xs text-fg-muted">Redactá el copy, guión o caption que acompañará tu publicación.</p>
                </div>

                {esMultiSlide ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">
                        Idea general {datos.format === 'C' ? 'del carrusel' : 'de la historia'}
                      </label>
                      <textarea 
                        className={textareaClass} 
                        rows={3} 
                        value={datos.script} 
                        onChange={set('script')} 
                        placeholder="Resumen o guía general del contenido..." 
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-fg">Slides / Diapositivas</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-fg-muted">Cantidad:</span>
                          <input 
                            type="number" 
                            min="1" 
                            className="h-8 w-16 rounded-md border border-border bg-surface-2 px-2 text-center text-xs text-fg font-bold" 
                            value={datos.slides.length || 1}
                            onChange={(e) => cambiarCantidadSlides(e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {datos.slides.map((texto, i) => (
                          <div key={i} className="flex gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                              {i + 1}
                            </div>
                            <textarea 
                              className={textareaClass} 
                              rows={2} 
                              value={texto} 
                              onChange={(e) => cambiarSlide(i, e.target.value)}
                              placeholder={`Copy del slide ${i + 1}...`} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-fg">Guión / Copy</label>
                      <span className="text-[10px] text-fg-subtle">{datos.script.length} / 2.200</span>
                    </div>
                    <p className="text-[11px] text-fg-muted mb-1.5">Texto que aparecerá o se dirá en el contenido.</p>
                    <textarea 
                      className={textareaClass} 
                      rows={4} 
                      value={datos.script} 
                      onChange={set('script')} 
                      placeholder="Escribí acá el guión o locución del video..." 
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-fg">Descripción / Caption</label>
                    <span className="text-[10px] text-fg-subtle">{datos.description.length} / 2.200</span>
                  </div>
                  <p className="text-[11px] text-fg-muted mb-2">Texto que acompañará la publicación en redes.</p>
                  <textarea 
                    className={textareaClass} 
                    rows={3} 
                    value={datos.description} 
                    onChange={set('description')} 
                    placeholder="Escribí la descripción del post..." 
                  />

                  {/* Acciones rápidas / Sugerencias de copy */}
                  <div className="mt-3.5 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle flex items-center gap-1">
                      <Sparkles size={12} className="text-primary" /> Sugerencias rápidas
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => agregarSugerenciaCaption(`👇 Comentá "${datos.keyword.trim() || 'INFO'}" y te envío la información completa por privado. 📩`)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-fg hover:bg-surface-3 hover:border-primary/50 transition-colors"
                      >
                        <Plus size={11} className="text-primary" /> Agregar CTA de ManyChat
                      </button>
                      <button
                        type="button"
                        onClick={() => agregarSugerenciaCaption('#estrategia #marketingdigital #creaciondecontenido #negocios')}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-fg hover:bg-surface-3 hover:border-primary/50 transition-colors"
                      >
                        <Plus size={11} className="text-primary" /> Agregar Hashtags
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: Programación */}
            {paso === 4 && (
              <div className="space-y-5">
                <div>
                  <h4 className="m-0 text-sm font-bold text-fg">Programá la publicación</h4>
                  <p className="m-0 text-xs text-fg-muted">Elegí cuándo y dónde querés publicarla.</p>
                </div>

                {/* BLOQUE: Publicación */}
                <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle flex items-center gap-1.5">
                    <Calendar size={13} className="text-primary" /> Publicación
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg-muted mb-1">Fecha</label>
                      <input type="date" className={inputClass} value={datos.publish_date} onChange={set('publish_date')} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg-muted mb-1">Hora</label>
                      <input type="time" className={inputClass} value={datos.publish_time} onChange={set('publish_time')} />
                    </div>
                  </div>
                  <div className="text-[11px] text-fg-subtle pt-1 border-t border-border/50">
                    Zona horaria: <span className="font-semibold text-fg">America/Asuncion</span>
                  </div>
                </div>

                {/* BLOQUE: Archivo y Live Preview */}
                <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle flex items-center gap-1.5">
                    <Film size={13} className="text-primary" /> Archivo de media
                  </div>

                  {file ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Film size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-fg truncate">{file.name}</div>
                            <div className="text-[10px] text-fg-muted">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB · {file.type || 'Media'}
                            </div>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setFile(null)} 
                          className="rounded-md p-1.5 text-danger hover:bg-danger/10 transition-colors"
                          title="Quitar archivo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Preview incorporada dentro del Wizard */}
                      <div className="rounded-lg border border-border bg-surface p-3 flex flex-col items-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle mb-2">Vista previa rápida</div>
                        <div className="scale-90 transform-gpu origin-top">
                          <LivePreviewMockup 
                            format={datos.format} 
                            text={datos.description} 
                            medias={getMediaListForPreview()} 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface p-6 hover:bg-surface-3 hover:border-primary/50 cursor-pointer transition-colors text-center"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="video/mp4,image/jpeg,image/png"
                        onChange={(e) => setFile(e.target.files[0])}
                      />
                      <Upload size={24} className="mb-2 text-primary" />
                      <span className="text-xs font-semibold text-fg">Arrastrá tu video acá o hacé clic para seleccionar</span>
                      <span className="text-[10px] text-fg-muted mt-1">MP4 / Formato vertical recomendado (Máx. 100 MB)</span>
                    </div>
                  )}
                </div>

                {/* BLOQUE: Canales */}
                <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Publicar en</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPlatforms(p => ({ ...p, instagram: !p.instagram }))}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        platforms.instagram 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border bg-surface text-fg-muted hover:bg-surface-3'
                      }`}
                    >
                      <InstagramIcon size={18} className={platforms.instagram ? 'text-primary' : 'text-fg-subtle'} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-fg">Instagram</div>
                        <div className="text-[10px] text-fg-muted">Reels / Posts</div>
                      </div>
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        platforms.instagram ? 'border-primary bg-primary text-primary-fg' : 'border-border'
                      }`}>
                        {platforms.instagram && <Check size={10} />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlatforms(p => ({ ...p, facebook: !p.facebook }))}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        platforms.facebook 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border bg-surface text-fg-muted hover:bg-surface-3'
                      }`}
                    >
                      <FacebookIcon size={18} className={platforms.facebook ? 'text-primary' : 'text-fg-subtle'} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-fg">Facebook</div>
                        <div className="text-[10px] text-fg-muted">Reels / Posts</div>
                      </div>
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        platforms.facebook ? 'border-primary bg-primary text-primary-fg' : 'border-border'
                      }`}>
                        {platforms.facebook && <Check size={10} />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* BLOQUE: Automatización ManyChat */}
                <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                      Automatización ManyChat
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 size={11} /> Configurada
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-border bg-surface p-2.5">
                      <div className="text-[10px] text-fg-subtle font-medium">Palabra clave (Trigger)</div>
                      <div className="font-bold text-primary truncate mt-0.5">{datos.keyword || '—'}</div>
                    </div>

                    <div className="rounded-lg border border-border bg-surface p-2.5">
                      <div className="text-[10px] text-fg-subtle font-medium">Código de tracking</div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono font-bold text-fg text-[11px] truncate">{previsualizarTrackingCode(datos)}</span>
                        <button 
                          type="button" 
                          onClick={copiarCodigoTracking} 
                          className="text-primary hover:text-primary/80 transition-colors ml-1" 
                          title="Copiar código"
                        >
                          {copiado ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Detalles Técnicos */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setMostrarDetallesTecnicos(!mostrarDetallesTecnicos)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-fg-muted hover:text-fg transition-colors"
                    >
                      {mostrarDetallesTecnicos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      Ver detalles técnicos
                    </button>
                    {mostrarDetallesTecnicos && (
                      <div className="mt-2 rounded-lg bg-surface p-3 text-[11px] text-fg-muted space-y-1 font-mono border border-border/60">
                        <div>Plantilla: <strong className="text-fg">{plantillaParaFormato(datos.format)}</strong></div>
                        <div>Formato interno: <strong className="text-fg">{datos.format}</strong></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOQUE: Contenido de prueba (Toggle discreto) */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3.5">
                  <div>
                    <div className="text-xs font-bold text-fg">Contenido de prueba</div>
                    <div className="text-[11px] text-fg-muted">Excluir este contenido de las analíticas de rendimiento.</div>
                  </div>
                  <input 
                    type="checkbox" 
                    id="isTestCheck" 
                    checked={datos.is_test}
                    onChange={(e) => setDatos((d) => ({ ...d, is_test: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer" 
                  />
                </div>

                {/* RESUMEN DE PUBLICACIÓN */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <div className="text-xs font-bold text-fg flex items-center gap-1.5">
                    <Layers size={14} className="text-primary" /> RESUMEN
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-fg-muted">
                    <div><span className="font-semibold text-fg">Formato:</span> {FORMATOS.find(f => f.value === datos.format)?.label}</div>
                    <div><span className="font-semibold text-fg">Canales:</span> {Object.keys(platforms).filter(k => platforms[k]).join(' + ') || 'Ninguno'}</div>
                    <div><span className="font-semibold text-fg">Fecha/Hora:</span> {datos.publish_date} · {datos.publish_time}</div>
                    <div><span className="font-semibold text-fg">CTA:</span> {datos.keyword || '—'}</div>
                  </div>
                </div>

              </div>
            )}

            {/* Manejo de Conflicto de Tracking Code Duplicado */}
            {conflicto && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-sm relative">
                <button type="button" onClick={() => setConflicto(null)} className="absolute top-2 right-2 text-amber-500 hover:text-amber-600">
                  <X size={16} />
                </button>
                <h4 className="text-amber-500 text-xs font-bold flex items-center gap-2 mb-1">
                  <AlertTriangle size={16} /> ¡Código de tracking duplicado!
                </h4>
                <p className="text-xs text-fg mb-3">
                  Ya existe una pieza de contenido con la misma fecha y palabra clave.
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setConflicto(null)} className="text-xs bg-surface border border-border px-3 py-1.5 rounded-lg text-fg hover:bg-surface-2 font-medium">
                    Cambiar datos
                  </button>
                  <button type="button" onClick={() => handleSubmit(true)} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 font-bold ml-auto">
                    Crear de todas formas (-02, -03...)
                  </button>
                </div>
              </div>
            )}
            
            {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs font-medium text-danger">{error}</div>}
          </div>

          {/* Footer del Modal */}
          <div className="shrink-0 flex items-center justify-between gap-3 border-t border-border p-4 bg-surface">
            {paso > 1 ? (
              <button 
                type="button" 
                onClick={() => setPaso((p) => p - 1)}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-xs font-bold text-fg hover:bg-surface-2 transition-colors"
              >
                <ArrowLeft size={15} /> Atrás
              </button>
            ) : <span />}

            {paso < 4 ? (
              <button 
                type="button" 
                onClick={() => irA(paso + 1)}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-xs font-bold text-primary-fg shadow hover:opacity-95 transition-all ml-auto"
              >
                Continuar <ArrowRight size={15} />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={() => handleSubmit(false)} 
                disabled={guardando}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-xs font-bold text-primary-fg shadow hover:opacity-95 disabled:opacity-60 transition-all ml-auto"
              >
                <Check size={15} /> {guardando ? 'Guardando...' : (itemToEdit ? 'Guardar cambios' : 'Programar publicación')}
              </button>
            )}
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
