import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  FileText,
  GalleryHorizontal,
  Layers,
  Megaphone,
  Plus,
  Sparkles,
  Upload,
  Video,
  X,
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
  { id: 1, label: 'Formato', icon: Megaphone },
  { id: 2, label: 'Estrategia', icon: FileText },
  { id: 3, label: 'Contenido', icon: GalleryHorizontal },
  { id: 4, label: 'Programación', icon: CalendarClock },
];

const MEDIA_RULES = {
  R: {
    title: 'Video principal del Reel',
    help: 'Un Reel usa un video principal. La publicación por API admite videos largos; conviene mantenerlo enfocado.',
    accept: 'video/mp4,video/quicktime',
    maxFiles: 1,
  },
  C: {
    title: 'Slides del carrusel',
    help: 'Subí imágenes o videos y ordenalos como slides. Por API se preparan hasta 10 items por carrusel.',
    accept: 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime',
    maxFiles: 10,
  },
  H: {
    title: 'Tarjetas de historias',
    help: 'Subí varias imágenes/videos, o un video largo para dividirlo automáticamente en tarjetas.',
    accept: 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime',
    maxFiles: 20,
  },
};

const STORY_SEGMENT_OPTIONS = [15, 30, 60];

const inputClass = 'h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-primary/60 focus:ring-2 focus:ring-primary/10';
const textareaClass = 'w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-primary/60 focus:ring-2 focus:ring-primary/10';

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

function labelFormato(format) {
  return FORMATOS.find((f) => f.value === format)?.label || 'Contenido';
}

function mediaKind(file) {
  return file.type?.startsWith('video/') ? 'video' : 'image';
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const total = Math.round(seconds);
  const min = Math.floor(total / 60);
  const sec = String(total % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function fileSizeLabel(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toStoredAsset(asset, uploadedFile) {
  const { id, name, mime_type, type, size, duration_seconds, segment_index, segment_start, segment_end, source_file_id, source_file_name, publishing_type, url, storage_path } = asset;
  return {
    id,
    name,
    original_name: uploadedFile?.original_name || name,
    mime_type: uploadedFile?.mime_type || mime_type,
    type,
    size: uploadedFile?.size || size,
    url: uploadedFile?.url || url || null,
    storage_path: uploadedFile?.storage_path || storage_path || null,
    duration_seconds,
    segment_index,
    segment_start,
    segment_end,
    source_file_id,
    source_file_name,
    publishing_type,
  };
}

async function fileToAsset(file) {
  const type = mediaKind(file);
  let duration = null;
  if (type === 'video') {
    duration = await new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(video.duration) ? video.duration : null);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      video.src = url;
    });
  }
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    mime_type: file.type,
    type,
    size: file.size,
    duration_seconds: duration,
    file,
  };
}

function buildPublishingAssets(format, mediaAssets, storySegmentSeconds) {
  if (format === 'R') {
    return mediaAssets.slice(0, 1).map((asset, idx) => ({
      ...asset,
      publishing_type: 'reel_video',
      segment_index: idx + 1,
    }));
  }

  if (format === 'C') {
    return mediaAssets.slice(0, MEDIA_RULES.C.maxFiles).map((asset, idx) => ({
      ...asset,
      publishing_type: 'carousel_item',
      segment_index: idx + 1,
    }));
  }

  const seconds = Math.min(60, Math.max(5, Number(storySegmentSeconds) || 60));
  const result = [];
  for (const asset of mediaAssets) {
    if (asset.type === 'video' && asset.duration_seconds && asset.duration_seconds > seconds) {
      const parts = Math.ceil(asset.duration_seconds / seconds);
      for (let i = 0; i < parts && result.length < MEDIA_RULES.H.maxFiles; i += 1) {
        const start = i * seconds;
        const end = Math.min((i + 1) * seconds, asset.duration_seconds);
        result.push({
          id: `${asset.id}-part-${i + 1}`,
          name: `${asset.name} · Parte ${i + 1}`,
          mime_type: asset.mime_type,
          type: 'video',
          size: asset.size,
          duration_seconds: end - start,
          source_file_id: asset.id,
          source_file_name: asset.name,
          segment_index: result.length + 1,
          segment_start: start,
          segment_end: end,
          publishing_type: 'story_segment',
        });
      }
    } else if (result.length < MEDIA_RULES.H.maxFiles) {
      result.push({
        ...asset,
        publishing_type: 'story_card',
        segment_index: result.length + 1,
      });
    }
  }
  return result;
}

function PasoHeader({ numero, titulo, subtitulo }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary-text">
        {numero}
      </div>
      <div>
        <h4 className="m-0 text-base font-semibold text-fg">{titulo}</h4>
        <p className="m-0 mt-0.5 text-sm text-fg-muted">{subtitulo}</p>
      </div>
    </div>
  );
}

function Stepper({ paso }) {
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-border bg-surface px-4 pb-4 sm:grid-cols-4">
      {PASOS.map((p) => {
        const Icon = p.icon;
        const activo = paso === p.id;
        const completo = paso > p.id;
        return (
          <div
            key={p.id}
            className={`rounded-md border px-3 py-2 transition-colors ${
              activo ? 'border-primary bg-primary/10 text-primary-text' : completo ? 'border-success/25 bg-success/10 text-success' : 'border-border bg-surface-2 text-fg-muted'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${activo ? 'bg-primary text-primary-fg' : completo ? 'bg-success text-white' : 'bg-surface text-fg-muted'}`}>
                {completo ? <Check size={13} /> : <Icon size={13} />}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-75">Paso {p.id}</div>
                <div className="truncate text-xs font-semibold">{p.label}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PreviewPanel({ datos, platforms, mediaAssets, publishingAssets, storySegmentSeconds, mediasGuardadas = [] }) {
  // Los archivos todavia no estan subidos, asi que se previsualizan con object
  // URLs. Hay que revocarlas al cambiar de archivo o se filtra memoria: un video
  // de 2 MB queda retenido por cada preview que no se libera.
  const medias = useMemo(() => {
    const fuente = mediaAssets.length > 0 ? mediaAssets : mediasGuardadas;
    return fuente
      .map((asset) => ({
        url: asset.file ? URL.createObjectURL(asset.file) : asset.url,
        type: asset.mime_type || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        esLocal: !!asset.file,
      }))
      .filter((m) => m.url);
  }, [mediaAssets, mediasGuardadas]);

  useEffect(() => () => {
    medias.forEach((m) => { if (m.esLocal) URL.revokeObjectURL(m.url); });
  }, [medias]);

  const destinos = Object.entries(platforms).filter(([, activo]) => activo).map(([nombre]) => nombre);
  const hayContenido = datos.topic || datos.script || datos.description;
  return (
    <aside className="hidden border-l border-border bg-surface-2/60 p-5 lg:block">
      <div className="sticky top-5">
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-fg-subtle">Vista previa</div>
          <h4 className="m-0 mt-1 text-base font-semibold text-fg">{datos.topic || 'Contenido sin tema'}</h4>
          <p className="m-0 mt-1 text-xs text-fg-muted">{labelFormato(datos.format)} · {datos.objective || 'Sin objetivo definido'}</p>
        </div>

        {/* El telefono va primero: al programar, lo que importa es ver como
            queda el video con el copy, no la ficha de datos. */}
        <div className="mb-4 flex justify-center">
          <div className="origin-top scale-[0.82] xl:scale-90 2xl:scale-100">
            <LivePreviewMockup
              format={datos.format}
              text={datos.description || datos.script}
              medias={medias}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary-text">
              {labelFormato(datos.format)}
            </span>
            <span className="font-mono text-[11px] font-semibold text-fg-muted">{datos.publish_date} · {datos.publish_time}</span>
          </div>
          <div className="min-h-[160px] rounded-md border border-dashed border-border bg-surface-2 p-3">
            {hayContenido ? (
              <div className="space-y-3">
                <p className="m-0 text-sm font-semibold leading-relaxed text-fg">{datos.script || datos.angle || datos.topic}</p>
                {datos.description && <p className="m-0 text-xs leading-relaxed text-fg-muted">{datos.description}</p>}
                {publishingAssets?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {publishingAssets.slice(0, 8).map((asset) => (
                      <span key={asset.id} className="rounded-md bg-warning/10 px-2 py-1 text-[10px] font-semibold text-warning">
                        {datos.format === 'H' ? 'Historia' : datos.format === 'C' ? 'Slide' : 'Asset'} {asset.segment_index}
                      </span>
                    ))}
                    {publishingAssets.length > 8 && <span className="rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-fg-muted">+{publishingAssets.length - 8}</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[134px] items-center justify-center text-center text-xs text-fg-subtle">
                La preview se completa mientras cargás la estrategia y el contenido.
              </div>
            )}
          </div>
          <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">Tracking estimado</div>
            <div className="mt-1 break-all font-mono text-xs font-bold text-primary-text">{previsualizarTrackingCode(datos)}</div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs text-fg-muted">
          <div className="flex justify-between gap-3"><span>CTA</span><strong className="text-fg">{datos.keyword || 'Pendiente'}</strong></div>
          <div className="flex justify-between gap-3"><span>Archivos</span><strong className="max-w-[160px] truncate text-fg">{mediaAssets.length ? `${mediaAssets.length} cargado(s)` : 'Sin archivos'}</strong></div>
          {datos.format === 'H' && <div className="flex justify-between gap-3"><span>Corte</span><strong className="text-fg">{storySegmentSeconds}s por historia</strong></div>}
          <div className="flex justify-between gap-3"><span>Canales</span><strong className="text-fg">{destinos.length ? destinos.join(', ') : 'Ninguno'}</strong></div>
        </div>
      </div>
    </aside>
  );
}

export default function ContentFormModal({ fechaInicial, itemToEdit = null, onClose, onCreado }) {
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
  const [copiado, setCopiado] = useState('');
  const [mediaAssets, setMediaAssets] = useState([]);
  const [storySegmentSeconds, setStorySegmentSeconds] = useState(30);
  const [platforms, setPlatforms] = useState(() => {
    const selected = Array.isArray(itemToEdit?.platforms) ? itemToEdit.platforms : null;
    return {
      instagram: selected ? selected.includes('instagram') : true,
      facebook: selected ? selected.includes('facebook') : true,
    };
  });
  const fileInputRef = useRef(null);

  const set = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));
  const esMultiSlide = datos.format === 'C' || datos.format === 'H';
  const mediaRule = MEDIA_RULES[datos.format];
  const publishingAssets = useMemo(
    () => buildPublishingAssets(datos.format, mediaAssets, storySegmentSeconds),
    [datos.format, mediaAssets, storySegmentSeconds]
  );
  const channelLabel = datos.format === 'H' ? 'Historias' : datos.format === 'C' ? 'Carrusel' : 'Reels';
  const trackingEstimado = previsualizarTrackingCode(datos);
  const plantillaActual = plantillaParaFormato(datos.format);

  const copiarTexto = async (clave, valor) => {
    try {
      await navigator.clipboard?.writeText(valor);
      setCopiado(clave);
      setTimeout(() => setCopiado(''), 1400);
    } catch (e) { /* no bloquea el flujo */ }
  };

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

  const seleccionarFormato = (format) => {
    setDatos((d) => ({
      ...d,
      format,
      slides: (format === 'C' || format === 'H') && d.slides.length === 0 ? [''] : d.slides,
    }));
    setMediaAssets((prev) => prev.slice(0, MEDIA_RULES[format].maxFiles));
  };

  const handleMediaFiles = async (files) => {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;
    setError('');
    const normalized = await Promise.all(incoming.map(fileToAsset));
    setMediaAssets((prev) => {
      const next = datos.format === 'R' ? normalized.slice(0, 1) : [...prev, ...normalized].slice(0, mediaRule.maxFiles);
      if ((datos.format === 'C' || datos.format === 'H') && next.length > datos.slides.length) {
        setDatos((d) => {
          const slides = [...d.slides];
          while (slides.length < next.length) slides.push('');
          return { ...d, slides };
        });
      }
      return next;
    });
  };

  const quitarAsset = (id) => {
    setMediaAssets((prev) => prev.filter((asset) => asset.id !== id));
  };

  const irA = (n) => {
    if (n > 2 && (!datos.topic.trim() || !datos.keyword.trim())) {
      setError('El tema y la palabra clave / CTA son obligatorios.');
      return;
    }
    setError('');
    setPaso(n);
  };

  const agregarSugerenciaCaption = (texto) => {
    setDatos((d) => ({
      ...d,
      description: d.description ? `${d.description}\n\n${texto}` : texto,
    }));
  };

  const handleSubmit = async (forzar = false) => {
    const publishDateTime = new Date(`${datos.publish_date}T${datos.publish_time || '00:00'}`);
    if (!datos.publish_date || !datos.publish_time || Number.isNaN(publishDateTime.getTime())) {
      setError('Definí una fecha y hora válidas para programar la publicación.');
      return;
    }
    if (!datos.topic.trim() || !datos.keyword.trim()) {
      setError('El tema y la palabra clave / CTA son obligatorios.');
      setPaso(2);
      return;
    }
    if (!Object.values(platforms).some(Boolean)) {
      setError('Elegí al menos un canal de publicación.');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      let finalData = { 
        ...datos, 
        platforms: Object.keys(platforms).filter(k => platforms[k]),
        force_duplicate: forzar,
      };

      let uploadedByAssetId = {};
      if (mediaAssets.length > 0) {
        const formData = new FormData();
        const filesToUpload = mediaAssets.filter((asset) => asset.file);
        filesToUpload.forEach((asset) => formData.append('files', asset.file));
        if (filesToUpload.length > 0) {
          const uploaded = await socialApi.uploadMedia(formData);
          uploadedByAssetId = Object.fromEntries(
            filesToUpload.map((asset, index) => [asset.id, uploaded.files?.[index]])
          );
        }
      }

      finalData.media_assets = mediaAssets.length > 0
        ? publishingAssets.map((asset) => {
            const sourceId = asset.source_file_id || asset.id;
            return toStoredAsset(asset, uploadedByAssetId[sourceId]);
          })
        : (itemToEdit?.media_assets || []);
      finalData.media_plan = {
        story_segment_seconds: datos.format === 'H' ? Number(storySegmentSeconds) : null,
        source_files_count: mediaAssets.length,
        publishing_assets_count: publishingAssets.length,
      };

      const nuevo = itemToEdit
        ? await contentApi.editar(itemToEdit.id, finalData)
        : await contentApi.crear(finalData);

      if (itemToEdit) {
        onCreado(nuevo);
      } else {
        setCreado(nuevo);
      }
    } catch (err) {
      // Sin esto el motivo real queda invisible: el catch atrapa tanto los
      // errores del backend como cualquier TypeError del cliente, y abajo
      // todo termina en el mismo texto generico.
      console.error('[ContentFormModal] fallo al guardar:', err.response?.status, err.response?.data || err);
      const existingId = err.response?.data?.existingItemId || err.response?.data?.existing_id;
      if (err.response?.status === 409 && existingId) {
        setConflicto(existingId);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'No se pudo guardar el contenido.');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-5xl flex-col bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-4 p-5">
          <div>
            <h3 className="m-0 text-lg font-semibold text-fg">Programar contenido</h3>
            <p className="m-0 mt-1 text-sm text-fg-muted">Armá la pieza, su tracking y la preparación para ManyChat desde un solo flujo.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={18} />
          </button>
        </div>
        {!creado && <Stepper paso={paso} />}

        {/* Stepper / Mini Progreso Bar */}
        {!creado && (
          <div className="border-b border-border bg-surface-2/60 px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Paso {paso} de 4
              </span>
              <span className="text-xs font-semibold text-fg">
                {PASOS[paso - 1].label}
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
                      {p.label}
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
            <div className="w-full max-w-lg rounded-xl border border-primary/30 bg-primary/5 p-4 text-left shadow-sm">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Preparación para ManyChat</div>
              {[
                ['Palabra clave / CTA', creado.keyword || datos.keyword, 'cta'],
                ['Plantilla a duplicar', plantillaParaFormato(creado.format || datos.format), 'plantilla'],
                ['Código único de tracking', creado.tracking_code || trackingEstimado, 'tracking'],
              ].map(([label, value, clave]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-t border-primary/10 py-2 first:border-t-0 first:pt-0">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">{label}</div>
                    <div className="mt-0.5 break-all font-mono text-sm font-bold text-primary-text">{value}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copiarTexto(clave, value)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-surface text-primary-text hover:bg-primary/10"
                    title={`Copiar ${label}`}
                  >
                    {copiado === clave ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
              <p className="m-0 mt-3 text-[11px] leading-relaxed text-fg-muted">
                Duplicá la plantilla correspondiente y usá estos datos exactos para que la automatización quede vinculada al contenido programado.
              </p>
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
        <form onSubmit={(e) => e.preventDefault()} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-4 overflow-y-auto p-5">

            {/* PASO 1: Formato */}
            {paso === 1 && (
              <div>
                <PasoHeader numero={1} titulo="Elegí el formato" subtitulo="Qué tipo de pieza vas a programar." />
                <div className="flex flex-col gap-2">
                  {FORMATOS.map((f) => {
                    const activo = datos.format === f.value;
                    const Icon = f.icon;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => seleccionarFormato(f.value)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          activo ? 'border-primary bg-primary/5' : 'border-border bg-surface-2 hover:bg-surface'
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
                          activo ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-surface text-fg-muted'
                        }`}>
                          <Icon size={19} />
                        </div>

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
              <div className="flex flex-col gap-3">
                <PasoHeader numero={2} titulo="Definí la estrategia" subtitulo="Qué vamos a comunicar y qué acción esperamos del usuario." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted">Tema de la pieza *</label>
                    <input className={inputClass} value={datos.topic} onChange={set('topic')} placeholder="Ej.: Cómo elegir un producto rentable" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted">Palabra clave o CTA *</label>
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
              <div className="flex flex-col gap-3">
                <PasoHeader numero={4} titulo="Programá la publicación" subtitulo="Definí cuándo sale y dejá listo el tracking." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted">Fecha de publicación</label>
                    <input type="date" className={inputClass} value={datos.publish_date} onChange={set('publish_date')} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted">Hora de publicación</label>
                    <input type="time" className={inputClass} value={datos.publish_time} onChange={set('publish_time')} />
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
                  <input type="checkbox" id="isTestCheck" checked={datos.is_test}
                    onChange={(e) => setDatos((d) => ({ ...d, is_test: e.target.checked }))}
                    className="h-4 w-4 rounded border-border" />
                  <label htmlFor="isTestCheck" className="text-xs font-semibold text-warning">
                    Guardar como prueba, sin impactar analíticas
                  </label>
                </div>

                <div className="mt-2 border-t border-border pt-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-fg-muted">{mediaRule.title}</label>
                      <p className="m-0 mt-1 max-w-xl text-xs leading-relaxed text-fg-subtle">{mediaRule.help}</p>
                    </div>
                    <span className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] font-bold uppercase text-fg-muted">
                      {mediaAssets.length}/{mediaRule.maxFiles} archivos
                    </span>
                  </div>
                  {datos.format === 'H' && (
                    <div className="mb-3 rounded-md border border-border bg-surface-2 p-3">
                      <label className="mb-2 block text-xs font-semibold text-fg-muted">Duración por historia al dividir video</label>
                      <div className="flex flex-wrap gap-2">
                        {STORY_SEGMENT_OPTIONS.map((seconds) => (
                          <button
                            key={seconds}
                            type="button"
                            onClick={() => setStorySegmentSeconds(seconds)}
                            className={`h-8 rounded-md border px-3 text-xs font-semibold transition-colors ${
                              Number(storySegmentSeconds) === seconds ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg-muted hover:text-fg'
                            }`}
                          >
                            {seconds}s
                          </button>
                        ))}
                        <input
                          type="number"
                          min="5"
                          max="60"
                          className={`${inputClass} h-8 w-24 text-xs`}
                          value={storySegmentSeconds}
                          onChange={(e) => setStorySegmentSeconds(Math.min(60, Math.max(5, Number(e.target.value) || 5)))}
                          aria-label="Segundos personalizados por historia"
                        />
                      </div>
                      <p className="m-0 mt-2 text-[11px] text-fg-subtle">
                        Ejemplo: un video de 60s con corte de 30s se prepara como 2 historias.
                      </p>
                    </div>
                  )}
                  <div 
                    className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-surface-2 p-6 hover:bg-surface-3 hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept={mediaRule.accept}
                      multiple={datos.format !== 'R'}
                      onChange={(e) => {
                        handleMediaFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <Upload size={24} className="mb-2 text-primary" />
                    {mediaAssets.length ? (
                      <span className="text-sm font-semibold text-fg">{mediaAssets.length} archivo(s) listo(s) para este formato</span>
                    ) : (
                      <span className="text-sm text-fg-muted">
                        {datos.format === 'R' ? 'Elegí un video principal' : 'Elegí uno o varios videos/imágenes'}
                      </span>
                    )}
                  </div>
                  {mediaAssets.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {mediaAssets.map((asset, index) => (
                        <div key={asset.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-fg">
                              {index + 1}. {asset.name}
                            </div>
                            <div className="mt-0.5 text-[11px] text-fg-subtle">
                              {asset.type === 'video' ? 'Video' : 'Imagen'} · {fileSizeLabel(asset.size)}{asset.duration_seconds ? ` · ${formatDuration(asset.duration_seconds)}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => quitarAsset(asset.id)}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {publishingAssets.length > mediaAssets.length && (
                    <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary-text">
                      El sistema preparará {publishingAssets.length} historias a partir de {mediaAssets.length} archivo(s), usando cortes de {storySegmentSeconds}s.
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-border text-primary"
                      checked={platforms.instagram}
                      onChange={(e) => setPlatforms(p => ({...p, instagram: e.target.checked}))}
                    /> Instagram {channelLabel}
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-border text-primary"
                      checked={platforms.facebook}
                      onChange={(e) => setPlatforms(p => ({...p, facebook: e.target.checked}))}
                    /> Facebook {channelLabel}
                  </label>
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

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-bold text-fg flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-primary" /> ManyChat
                    </div>
                    <span className="rounded-md bg-surface px-2 py-1 text-[10px] font-bold uppercase text-primary-text">
                      Preparación
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ['CTA', datos.keyword || 'Pendiente', 'cta-preview'],
                      ['Plantilla', plantillaActual, 'plantilla-preview'],
                      ['Tracking', trackingEstimado, 'tracking-preview'],
                    ].map(([label, value, clave]) => (
                      <div key={label} className="min-w-0 rounded-md border border-primary/10 bg-surface/70 p-3">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">{label}</div>
                        <div className="flex items-center justify-between gap-2">
                          <strong className="min-w-0 break-all font-mono text-xs text-primary-text">{value}</strong>
                          <button
                            type="button"
                            onClick={() => copiarTexto(clave, value)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-fg-muted hover:text-primary-text"
                            title={`Copiar ${label}`}
                          >
                            {copiado === clave ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    ))}
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
          <PreviewPanel
            datos={datos}
            platforms={platforms}
            mediaAssets={mediaAssets}
            publishingAssets={publishingAssets}
            storySegmentSeconds={storySegmentSeconds}
            mediasGuardadas={itemToEdit?.media_assets || []}
          />
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
              <button type="button" onClick={handleSubmit} disabled={guardando}
                className="flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg disabled:opacity-60">
                <Check size={15} /> {guardando ? 'Guardando...' : 'Programar contenido'}
              </button>
            )}
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
