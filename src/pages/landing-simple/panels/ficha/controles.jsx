import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader, Plus, Trash2 } from 'lucide-react';
import { getMediaUrl } from '../../../../services/api';

/**
 * Controles de edición compartidos por los paneles de "Ficha avanzada"
 * (Fitness, Beauty…). Son puramente de interfaz: no saben de herencia ni
 * de secciones; cada panel les pasa el valor y el onChange.
 */

export const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
export const MINI = 'bg-fg/5 border border-fg/10 rounded-lg px-2 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
export const ETIQUETA = 'block text-[10px] font-semibold uppercase tracking-wide text-fg/40 mb-1';
export const AVISO_REAL = 'text-[10px] text-amber-400/70 leading-relaxed';

/* ── Controles reutilizables ──────────────────────────────────────── */

/**
 * `respaldo` = el texto que la ficha muestra cuando este campo queda vacío
 * (el nombre del producto, su categoría, su descripción). Va de placeholder
 * y se aclara abajo, así el comercio ve de qué texto se trata sin tener que
 * deducirlo. Nunca se precarga en `valor`: si se escribiera, el campo
 * quedaría congelado con una copia y dejaría de seguir al producto.
 */
export function Texto({ label, valor, onChange, placeholder, respaldo, area = false }) {
  const usaRespaldo = !valor && !!respaldo;
  return (
    <div>
      {label && <label className={ETIQUETA}>{label}</label>}
      {area ? (
        <textarea rows={3} className={CAMPO} value={valor || ''} placeholder={respaldo || placeholder} onChange={e => onChange(e.target.value)} />
      ) : (
        <input type="text" className={CAMPO} value={valor || ''} placeholder={respaldo || placeholder} onChange={e => onChange(e.target.value)} />
      )}
      {usaRespaldo && (
        <p className="text-[10px] text-fg/30 mt-1 leading-relaxed">
          Es lo que se está mostrando. Escribí acá solo si querés algo distinto en esta landing.
        </p>
      )}
    </div>
  );
}

/** Fila de una lista repetible: mover, contenido y borrar. */
export function Fila({ children, onSubir, onBajar, onQuitar }) {
  return (
    <div className="flex items-start gap-1.5 bg-fg/[0.03] border border-fg/10 rounded-lg p-2">
      <div className="flex flex-col text-fg/25 pt-0.5">
        <button type="button" onClick={onSubir} className="hover:text-fg leading-none text-[10px]">▲</button>
        <button type="button" onClick={onBajar} className="hover:text-fg leading-none text-[10px]">▼</button>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">{children}</div>
      <button type="button" onClick={onQuitar} className="text-fg/25 hover:text-red-400 pt-0.5"><Trash2 size={13} /></button>
    </div>
  );
}

export function BotonAgregar({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg disabled:opacity-35 disabled:cursor-not-allowed w-fit"
    >
      <Plus size={12} /> {children}
    </button>
  );
}

/** Lista repetible genérica — todas las secciones con items usan esta forma. */
export function ListaEditable({ items, campo, lista, max, textoAgregar, nuevo, children }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <Fila
          key={i}
          onSubir={() => lista.mover(campo, i, -1)}
          onBajar={() => lista.mover(campo, i, 1)}
          onQuitar={() => lista.quitar(campo, i)}
        >
          {children(it, i)}
        </Fila>
      ))}
      <BotonAgregar onClick={() => lista.agregar(campo, nuevo())} disabled={items.length >= max}>
        {items.length >= max ? `Máximo ${max}` : textoAgregar}
      </BotonAgregar>
    </div>
  );
}

/**
 * Lista de textos sueltos (no objetos) — los puntos de "antes y después".
 * No pasa por ListaEditable, que trabaja sobre objetos {campo: valor}.
 */
export function ListaTextos({ items, max, placeholder, textoAgregar, onChange }) {
  const mover = (i, delta) => {
    const l = [...items];
    const destino = i + delta;
    if (destino < 0 || destino >= l.length) return;
    [l[i], l[destino]] = [l[destino], l[i]];
    onChange(l);
  };
  return (
    <div className="flex flex-col gap-2">
      {items.map((linea, i) => (
        <Fila key={i} onSubir={() => mover(i, -1)} onBajar={() => mover(i, 1)} onQuitar={() => onChange(items.filter((_, x) => x !== i))}>
          <input
            className={MINI}
            value={linea}
            placeholder={placeholder}
            onChange={e => { const l = [...items]; l[i] = e.target.value; onChange(l); }}
          />
        </Fila>
      ))}
      <BotonAgregar onClick={() => onChange([...items, ''])} disabled={items.length >= max}>
        {items.length >= max ? `Máximo ${max}` : textoAgregar}
      </BotonAgregar>
    </div>
  );
}

/**
 * Foto propia de la ficha, de dos formas:
 *   - "Subir": el archivo va a R2 con `onSubir` (devuelve la URL).
 *   - "Link": se pega la dirección de una foto que ya está publicada en
 *     internet (https://…) y se usa tal cual, sin copiarla.
 * En los dos casos se guarda solo la URL. `respaldo` explica qué se
 * muestra si queda vacía (por ejemplo, la foto principal del producto).
 */
export function CampoImagen({ label, valor, onChange, onSubir, respaldo, compacto = false }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [conLink, setConLink] = useState(false);
  const [link, setLink] = useState('');

  async function alElegir(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onSubir) return;
    setError('');
    setSubiendo(true);
    try {
      onChange(await onSubir(file));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  }

  function usarLink() {
    const url = link.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setError('Pegá un link completo, que empiece con https://');
      return;
    }
    setError('');
    onChange(url);
    setLink('');
    setConLink(false);
  }

  const tam = compacto ? 'h-10 w-10' : 'h-14 w-20';
  const boton = 'text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg disabled:opacity-40';
  return (
    <div className="min-w-0">
      {label && <label className={ETIQUETA}>{label}</label>}
      <div className="flex items-center gap-2">
        <div className={`${tam} rounded-lg bg-fg/5 border border-fg/10 flex items-center justify-center overflow-hidden shrink-0`}>
          {subiendo ? <Loader size={14} className="animate-spin text-fg/50" />
            : valor ? <img src={getMediaUrl(valor)} alt="" className="w-full h-full object-cover" onError={() => setError('No se pudo cargar esa imagen. Revisá el link.')} />
              : <ImageIcon size={14} className="text-fg/30" />}
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          {onSubir && (
            <button type="button" onClick={() => inputRef.current?.click()} disabled={subiendo} className={boton}>
              {valor ? 'Cambiar' : 'Subir'}
            </button>
          )}
          <button type="button" onClick={() => { setConLink(v => !v); setError(''); }} className={boton}>
            Link
          </button>
          {valor && (
            <button type="button" onClick={() => { onChange(''); setError(''); }} className="text-[10px] text-fg/40 hover:text-red-400 px-1">
              Quitar
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={alElegir} />
        </div>
      </div>
      {conLink && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <input
            className={`${MINI} flex-1 min-w-0`}
            value={link}
            autoFocus
            placeholder="https://… (link de la foto)"
            onChange={e => setLink(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); usarLink(); } }}
          />
          <button type="button" onClick={usarLink} className={boton}>Usar</button>
        </div>
      )}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
      {!valor && respaldo && <p className="text-[10px] text-fg/30 mt-1 leading-relaxed">{respaldo}</p>}
    </div>
  );
}

/** Rótulo + título + parte destacada: el encabezado que repiten casi todas las secciones. */
export function Encabezado({ d, set, conSubtitulo = false, campoSubtitulo = 'subtitulo', labelSubtitulo = 'Bajada' }) {
  return (
    <>
      <Texto label="Rótulo chico (arriba del título)" valor={d.eyebrow} onChange={v => set({ eyebrow: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Título" valor={d.titulo} onChange={v => set({ titulo: v })} />
        <Texto label="Parte destacada" valor={d.titulo_destacado} onChange={v => set({ titulo_destacado: v })} />
      </div>
      {conSubtitulo && (
        <Texto label={labelSubtitulo} area valor={d[campoSubtitulo]} onChange={v => set({ [campoSubtitulo]: v })} />
      )}
    </>
  );
}


/** Horas / minutos / segundos de arranque del contador de urgencia. */
function NumerosContador({ d, set }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[['horas', 'Horas', 99], ['minutos', 'Minutos', 59], ['segundos', 'Segundos', 59]].map(([campo, label, max]) => (
        <div key={campo}>
          <label className={ETIQUETA}>{label}</label>
          <input
            type="number" min="0" max={max} className={CAMPO}
            value={d[campo]}
            onChange={e => set({ [campo]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Campos completos de la franja "Tu descuento termina en:" (ver
 * templates/contadorUrgencia.jsx). Iguales en todas las fichas que la usan.
 */
export function CamposUrgencia({ d, set }) {
  return (
    <>
      <Texto label="Texto" valor={d.texto} placeholder="Tu descuento termina en:" onChange={v => set({ texto: v })} />
      <NumerosContador d={d} set={set} />
      <div className="grid grid-cols-3 gap-2">
        <Texto label="Rótulo horas" valor={d.rotulo_horas} placeholder="HRS" onChange={v => set({ rotulo_horas: v })} />
        <Texto label="Rótulo min." valor={d.rotulo_minutos} placeholder="MIN" onChange={v => set({ rotulo_minutos: v })} />
        <Texto label="Rótulo seg." valor={d.rotulo_segundos} placeholder="SEG" onChange={v => set({ rotulo_segundos: v })} />
      </div>
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Arranca en este tiempo cada vez que alguien abre la página y baja hasta cero. No hay una fecha
        límite real detrás.
      </p>
      {d.activo && (
        <p className="text-[10px] text-amber-400/90 leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
          Este contador es solo visual, acá en la ficha del producto. Para que el producto aparezca
          además en <b>Categorías</b> o en <b>Oferta flash</b> de una landing, activalo también ahí, en
          <b> Configurar venta → Categorías → Editar promo</b> de esa landing.
        </p>
      )}
    </>
  );
}
