import React, { useState } from 'react';
import { ChevronDown, Link2Off, Plus, Trash2 } from 'lucide-react';
import {
  SECCIONES_COMBO, LIMITES, ETIQUETA_FUENTE,
  clonarSeccionResuelta, fuenteDeSeccion, seccionEsPropia,
} from '../templates/combo/fichaCombo';
import IconoPicker from './IconoPicker';

/**
 * Panel de la ficha del template Combo.
 *
 * Misma estructura y mismo diseño que FichaBasicoPanel/FichaFitnessPanel/
 * etc.: una fila plegable por sección, con su número, su interruptor y la
 * etiqueta de dónde sale lo que se está viendo. Lo único propio son los
 * campos de cada sección — "Qué incluye" y "Detalle de cada producto" se
 * arman solas con los productos del combo, así que acá solo se configura
 * el título/subtítulo, no el contenido.
 */

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const MINI = 'bg-fg/5 border border-fg/10 rounded-lg px-2 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const ETIQUETA = 'block text-[10px] font-semibold uppercase tracking-wide text-fg/40 mb-1';

export default function FichaComboPanel({
  ficha,
  fichaResuelta,
  fichaLanding = null,
  fichaDelProducto = null,
  respaldos = {},
  modo = 'producto',
  // Vista del combo (ComboEditor.jsx) es una pantalla propia, ancha, sin el
  // sidebar angosto del page-builder: ahí las secciones se muestran todas
  // abiertas en fila (misma idea que Vista del producto) en vez de acordeón
  // de a una, para que no se sienta como un panel técnico escondido.
  expandirTodas = false,
  onChange,
}) {
  const [abierta, setAbierta] = useState(null);
  const esProducto = modo === 'producto';

  const baseDe = (key) => (
    seccionEsPropia(ficha, key) ? ficha[key] : clonarSeccionResuelta(fichaResuelta, key)
  );

  const guardar = (key, seccion) => onChange({ ...(ficha || {}), [key]: seccion });
  const editar = (key, update) => guardar(key, { ...baseDe(key), ...update });

  const editarItem = (key, campo, index, cambios) => {
    const base = baseDe(key);
    const lista = [...(base[campo] || [])];
    lista[index] = { ...lista[index], ...cambios };
    guardar(key, { ...base, [campo]: lista });
  };
  const agregarItem = (key, campo, nuevo) => {
    const base = baseDe(key);
    guardar(key, { ...base, [campo]: [...(base[campo] || []), nuevo] });
  };
  const quitarItem = (key, campo, index) => {
    const base = baseDe(key);
    guardar(key, { ...base, [campo]: (base[campo] || []).filter((_, i) => i !== index) });
  };
  const moverItem = (key, campo, index, delta) => {
    const base = baseDe(key);
    const lista = [...(base[campo] || [])];
    const destino = index + delta;
    if (destino < 0 || destino >= lista.length) return;
    [lista[index], lista[destino]] = [lista[destino], lista[index]];
    guardar(key, { ...base, [campo]: lista });
  };

  const volverAHeredar = (key) => {
    const copia = { ...(ficha || {}) };
    delete copia[key];
    onChange(copia);
  };

  return (
    <div className={expandirTodas ? 'space-y-4 pb-8' : 'p-4 space-y-3 pb-32'}>
      <p className="text-sm text-fg/70 mb-5 leading-relaxed">
        {esProducto ? (
          <>Configurá cómo se ve <strong>este combo</strong> en su ficha de detalle.</>
        ) : (
          <>Configurá los textos por defecto para <strong>todos los combos</strong> de esta landing.</>
        )}
      </p>

      {SECCIONES_COMBO.map(sec => {
        const desplegada = expandirTodas ? true : abierta === sec.key;
        const propia = seccionEsPropia(ficha, sec.key);
        const fuente = fuenteDeSeccion(sec.key, { fichaProducto: ficha, fichaLanding, fichaDelProducto });
        const datos = fichaResuelta[sec.key] || {};

        return (
          <div
            key={sec.key}
            className={expandirTodas
              ? 'bg-canvas border border-fg/10 rounded-2xl overflow-hidden shadow-sm'
              : 'bg-fg/5 border border-fg/10 rounded-xl overflow-hidden'}
          >
            <div className={`flex items-center gap-3 transition-colors ${expandirTodas ? 'p-4' : 'p-3.5'} ${desplegada && !expandirTodas ? 'bg-fg/5' : ''}`}>
              <button
                type="button"
                onClick={expandirTodas ? undefined : () => setAbierta(desplegada ? null : sec.key)}
                className={`flex-1 flex items-center gap-3 text-left min-w-0 ${expandirTodas ? 'cursor-default' : ''} ${datos.activo ? 'text-fg' : 'text-fg/40 line-through'}`}
              >
                <span className={`flex items-center justify-center shrink-0 rounded-full font-bold ${expandirTodas ? 'w-6 h-6 text-[11px]' : 'w-5 h-5 text-[10px]'} ${datos.activo ? 'bg-fg text-canvas' : 'bg-fg/10 text-fg/40'}`}>
                  {sec.numero}
                </span>
                <span className="min-w-0">
                  <span className={expandirTodas ? 'block text-[14px] font-semibold truncate' : 'block text-[13px] font-semibold truncate'}>{sec.label}</span>
                  {expandirTodas ? (
                    <span className="block text-[11px] text-fg/40 truncate">{sec.ayuda}</span>
                  ) : esProducto && (
                    <span className={`block text-[10px] truncate ${propia ? 'text-[var(--color-accent-text)]/80' : 'text-fg/35'}`}>
                      {ETIQUETA_FUENTE[fuente]}
                    </span>
                  )}
                </span>
              </button>

              <label className="shrink-0 inline-flex items-center cursor-pointer" title={datos.activo ? 'Ocultar sección' : 'Mostrar sección'}>
                <input
                  type="checkbox"
                  checked={!!datos.activo}
                  onChange={e => editar(sec.key, { activo: e.target.checked })}
                  className="w-4 h-4 accent-[var(--color-accent)]"
                />
              </label>

              {!expandirTodas && (
                <button
                  type="button"
                  onClick={() => setAbierta(desplegada ? null : sec.key)}
                  className="shrink-0 text-fg/30 hover:text-fg"
                >
                  <ChevronDown size={15} className={desplegada ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
              )}
            </div>

            {desplegada && (
              <div className={expandirTodas
                ? 'px-4 pb-4 flex flex-col gap-3 border-t border-fg/10 pt-3.5'
                : 'px-3 pb-3.5 flex flex-col gap-3 border-t border-fg/10 pt-3'}>
                {!expandirTodas && <p className="text-[11px] text-fg/35 leading-relaxed">{sec.ayuda}</p>}
                {expandirTodas && esProducto && (
                  <p className={`text-[11px] -mt-1 ${propia ? 'text-[var(--color-accent-text)]/80' : 'text-fg/35'}`}>
                    {ETIQUETA_FUENTE[fuente]}
                  </p>
                )}

                {CAMPOS[sec.key]({
                  d: datos,
                  set: (cambios) => editar(sec.key, cambios),
                  lista: {
                    editar: (campo, i, c) => editarItem(sec.key, campo, i, c),
                    agregar: (campo, nuevo) => agregarItem(sec.key, campo, nuevo),
                    quitar: (campo, i) => quitarItem(sec.key, campo, i),
                    mover: (campo, i, delta) => moverItem(sec.key, campo, i, delta),
                  },
                  respaldos,
                })}

                {propia && (
                  <button
                    type="button"
                    onClick={() => volverAHeredar(sec.key)}
                    className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-fg/45 hover:text-fg py-1.5"
                  >
                    <Link2Off size={12} /> Descartar y volver a heredar
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Controles reutilizables ──────────────────────────────────────── */

function Texto({ label, valor, onChange, placeholder, respaldo, area = false }) {
  const usaRespaldo = !valor && !!respaldo;
  const id = React.useId();
  const comun = {
    id,
    className: CAMPO,
    value: valor || '',
    placeholder: respaldo || placeholder,
    onChange: e => onChange(e.target.value),
  };
  return (
    <div>
      {label && <label className={ETIQUETA} htmlFor={id}>{label}</label>}
      {area ? <textarea rows={3} {...comun} /> : <input type="text" {...comun} />}
      {usaRespaldo && (
        <p className="text-[10px] text-fg/30 mt-1 leading-relaxed">
          Es lo que se está mostrando. Escribí acá solo si querés algo distinto en esta landing.
        </p>
      )}
    </div>
  );
}

function ListaEditable({ items = [], max, campo, lista, textoAgregar, nuevo, children }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 items-start bg-black/20 p-2.5 rounded-lg border border-fg/5 relative group">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">{children(it, i)}</div>
          <div className="flex flex-col items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => lista.mover(campo, i, -1)} disabled={i === 0} className="text-fg/30 hover:text-fg disabled:opacity-10"><ChevronDown size={12} className="rotate-180" /></button>
            <button type="button" onClick={() => lista.quitar(campo, i)} className="text-fg/30 hover:text-red-400 p-1"><Trash2 size={12} /></button>
            <button type="button" onClick={() => lista.mover(campo, i, 1)} disabled={i === items.length - 1} className="text-fg/30 hover:text-fg disabled:opacity-10"><ChevronDown size={12} /></button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => lista.agregar(campo, nuevo())} className="inline-flex items-center justify-center gap-1.5 py-2 mt-1 border border-dashed border-fg/20 rounded-lg text-[12px] font-medium text-fg/50 hover:text-fg hover:border-fg/40">
          <Plus size={14} /> {textoAgregar} ({items.length}/{max})
        </button>
      )}
    </div>
  );
}

function ListaTextos({ valores = [], max, onCambio, textoAgregar, placeholder }) {
  const lista = Array.isArray(valores) ? valores : [];
  const actualizar = (i, valor) => {
    const copia = [...lista];
    copia[i] = valor;
    onCambio(copia);
  };
  const quitar = (i) => onCambio(lista.filter((_, idx) => idx !== i));
  const mover = (i, delta) => {
    const destino = i + delta;
    if (destino < 0 || destino >= lista.length) return;
    const copia = [...lista];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    onCambio(copia);
  };
  return (
    <div className="flex flex-col gap-2">
      {lista.map((valor, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="text-fg/25 hover:text-fg disabled:opacity-10"><ChevronDown size={12} className="rotate-180" /></button>
          <input className={`${MINI} flex-1 min-w-0`} value={valor || ''} placeholder={placeholder} onChange={e => actualizar(i, e.target.value)} />
          <button type="button" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} className="text-fg/25 hover:text-fg disabled:opacity-10"><ChevronDown size={12} /></button>
          <button type="button" onClick={() => quitar(i)} className="text-fg/25 hover:text-red-400 p-1"><Trash2 size={12} /></button>
        </div>
      ))}
      {lista.length < max && (
        <button type="button" onClick={() => onCambio([...lista, ''])} className="inline-flex items-center justify-center gap-1.5 py-2 border border-dashed border-fg/20 rounded-lg text-[12px] font-medium text-fg/50 hover:text-fg hover:border-fg/40">
          <Plus size={14} /> {textoAgregar} ({lista.length}/{max})
        </button>
      )}
    </div>
  );
}

function CamposContador({ d, set }) {
  const c = d.contador || {};
  const setC = (cambios) => set({ contador: { ...c, ...cambios } });
  return (
    <div className="mt-2 bg-black/20 p-3 rounded-xl border border-fg/5 space-y-3">
      <label className="flex items-center gap-2 text-[12px] text-fg/90 font-semibold cursor-pointer">
        <input type="checkbox" checked={!!c.activo} onChange={e => setC({ activo: e.target.checked })} className="w-4 h-4 accent-[var(--color-accent)]" />
        Contador de tiempo limitado
      </label>
      {c.activo && (
        <div className="grid grid-cols-3 gap-2">
          <div><label className={ETIQUETA}>Horas</label><input type="number" min="0" max="23" className={CAMPO} value={c.horas || 0} onChange={e => setC({ horas: Number(e.target.value) })} /></div>
          <div><label className={ETIQUETA}>Min</label><input type="number" min="0" max="59" className={CAMPO} value={c.minutos || 0} onChange={e => setC({ minutos: Number(e.target.value) })} /></div>
          <div><label className={ETIQUETA}>Seg</label><input type="number" min="0" max="59" className={CAMPO} value={c.segundos || 0} onChange={e => setC({ segundos: Number(e.target.value) })} /></div>
        </div>
      )}
    </div>
  );
}

const CAMPOS = {
  barra_superior: ({ d, set, lista }) => (
    <>
      <Texto label="Botón de la barra" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.barra_superior_items}
        textoAgregar="Agregar ventaja" nuevo={() => ({ icono: 'check', texto: '' })}
      >
        {(it, i) => (
          <div className="flex items-center gap-1.5 w-full">
            <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.texto || ''} placeholder="Ej: Envío gratis" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </div>
        )}
      </ListaEditable>
    </>
  ),

  hero: ({ d, set, respaldos }) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Sobre-título" valor={d.eyebrow} respaldo={respaldos.eyebrow} onChange={v => set({ eyebrow: v })} />
        <Texto label="Etiqueta foto" valor={d.etiqueta} placeholder="Más vendido" onChange={v => set({ etiqueta: v })} />
      </div>
      <Texto label="Título principal" valor={d.titulo} respaldo={respaldos.titulo} area onChange={v => set({ titulo: v })} />
      <Texto
        label="Remate del título (en color)"
        valor={d.titulo_destacado}
        placeholder="mejor precio juntos."
        onChange={v => set({ titulo_destacado: v })}
      />
      <Texto label="Bajada (Lead)" valor={d.lead} respaldo={respaldos.lead} area onChange={v => set({ lead: v })} />
      <Texto label="Botón principal" valor={d.cta_texto} placeholder="Comprar ahora — envío gratis" onChange={v => set({ cta_texto: v })} />
      <div>
        <label className={ETIQUETA}>Puntos clave (los ✓ del encabezado)</label>
        <ListaTextos
          valores={d.caracteristicas}
          max={LIMITES.hero_caracteristicas}
          textoAgregar="Agregar"
          placeholder="Combo completo y listo para usar"
          onCambio={l => set({ caracteristicas: l })}
        />
      </div>

      <div className="pt-2 border-t border-fg/10">
        <Texto label="Etiqueta de oferta" valor={d.etiqueta_oferta} placeholder="Oferta por tiempo limitado" onChange={v => set({ etiqueta_oferta: v })} />
        <CamposContador d={d} set={set} />
      </div>
      <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer">
        <input type="checkbox" className="w-3.5 h-3.5 accent-primary" checked={d.rating_activo !== false} onChange={e => set({ rating_activo: e.target.checked })} />
        Mostrar calificación
      </label>
      {d.rating_activo !== false && (
        <div>
          <label className={ETIQUETA}>Calificación (0 a 5)</label>
          <input type="number" min="0" max="5" step="0.1" className={CAMPO} value={d.rating_valor} onChange={e => set({ rating_valor: Number(e.target.value) })} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Nota de stock" valor={d.nota_stock} placeholder="Stock limitado" onChange={v => set({ nota_stock: v })} />
        <Texto label="Nota de envío" valor={d.nota_envio} placeholder="Envío gratis" onChange={v => set({ nota_envio: v })} />
      </div>
      <Texto label="Nota de garantía (debajo del botón)" valor={d.nota_garantia} placeholder="Garantía 30 días" onChange={v => set({ nota_garantia: v })} />
    </>
  ),

  incluye: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="¿Qué incluye?" onChange={v => set({ titulo: v })} />
      <Texto label="Subtítulo (opcional)" valor={d.subtitulo} placeholder="Todo lo que necesitás en un solo pack" onChange={v => set({ subtitulo: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Las tarjetas de productos se arman solas con lo que cargaste en <b className="text-fg/60">Productos del combo</b> — acá solo se edita el título.
      </p>
    </>
  ),

  valor: ({ d, set }) => (
    <>
      <Texto label="Título — precio por separado" valor={d.titulo} placeholder="Precio por separado" onChange={v => set({ titulo: v })} />
      <Texto label="Título — precio del combo" valor={d.titulo_combo} placeholder="Precio combo" onChange={v => set({ titulo_combo: v })} />
      <Texto label="Nota bajo el ahorro (opcional)" valor={d.nota_ahorro} placeholder="Precio válido mientras dure el stock" onChange={v => set({ nota_ahorro: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        La tabla y el ahorro se calculan solos con los precios reales de cada producto y el precio del combo.
      </p>
    </>
  ),

  beneficio_principal: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="¿Por qué este combo?" onChange={v => set({ titulo: v })} />
      <Texto label="Texto explicativo" valor={d.texto} area placeholder="Una selección simple: productos que se complementan para resolver más con menos." onChange={v => set({ texto: v })} />
      <div>
        <label className={ETIQUETA}>Tarjetas (título + texto corto)</label>
        <ListaEditable
          items={d.items} campo="items" lista={lista} max={LIMITES.beneficio_principal_items}
          textoAgregar="Agregar tarjeta" nuevo={() => ({ icono: 'star', titulo: '', texto: '' })}
        >
          {(it, i) => (
            <>
              <div className="flex items-center gap-1.5 w-full">
                <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
                <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Todo resuelto" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
              </div>
              <input className={MINI} value={it.texto || ''} placeholder="Recibís una solución completa sin perder tiempo buscando por separado." onChange={e => lista.editar('items', i, { texto: e.target.value })} />
            </>
          )}
        </ListaEditable>
        <p className="text-[10px] text-fg/35 leading-relaxed mt-1.5">
          Si cargás <b className="text-fg/60">Beneficios</b> en Vista del combo, se usan acá automáticamente.
        </p>
      </div>
    </>
  ),

  detalle_productos: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="Conocé lo que recibís" onChange={v => set({ titulo: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Cada producto aparece con su foto y sus propios checks (los beneficios cargados en la ficha de ESE producto) — no hace falta repetirlos acá.
      </p>
    </>
  ),

  prueba_social: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="Opiniones reales" onChange={v => set({ titulo: v })} />
      <div>
        <label className={ETIQUETA}>Calificación (0 a 5)</label>
        <input type="number" min="0" max="5" step="0.1" className={CAMPO} value={d.calificacion} onChange={e => set({ calificacion: Number(e.target.value) })} />
      </div>
      <div>
        <label className={ETIQUETA}>Testimonios</label>
        <ListaEditable
          items={d.testimonios} campo="testimonios" lista={lista} max={LIMITES.prueba_social_testimonios}
          textoAgregar="Agregar testimonio" nuevo={() => ({ nombre: '', comentario: '', calificacion: 5 })}
        >
          {(it, i) => (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <input className={MINI} value={it.nombre || ''} placeholder="Nombre" onChange={e => lista.editar('testimonios', i, { nombre: e.target.value })} />
                <input type="number" min="1" max="5" className={MINI} value={it.calificacion ?? 5} placeholder="5" onChange={e => lista.editar('testimonios', i, { calificacion: Number(e.target.value) })} />
              </div>
              <textarea rows={2} className={MINI} value={it.comentario || ''} placeholder="Excelente combo, llegó todo perfecto." onChange={e => lista.editar('testimonios', i, { comentario: e.target.value })} />
            </>
          )}
        </ListaEditable>
      </div>
    </>
  ),

  confianza: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="Comprá con confianza" onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.confianza_items}
        textoAgregar="Agregar ítem" nuevo={() => ({ icono: 'shield', titulo: '', texto: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5 w-full">
              <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Garantía 30 días" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
            </div>
            <input className={MINI} value={it.texto || ''} placeholder="Compra sin riesgos." onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </>
        )}
      </ListaEditable>
    </>
  ),

  faq: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="Preguntas frecuentes" onChange={v => set({ titulo: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Las preguntas se cargan en <b className="text-fg/60">Vista del combo</b>. Acá solo se edita el título.
      </p>
    </>
  ),

  cta_final: ({ d, set }) => (
    <>
      <Texto label="Etiqueta" valor={d.etiqueta} placeholder="No pierdas esta oferta" onChange={v => set({ etiqueta: v })} />
      <Texto label="Título (vacío = nombre del combo)" valor={d.titulo} respaldo="" placeholder="Combo 3 en 1" onChange={v => set({ titulo: v })} />
      <Texto label="Botón" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
      <CamposContador d={d} set={set} />
    </>
  ),
};
