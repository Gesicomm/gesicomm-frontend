import React, { useState } from 'react';
import { ChevronDown, Link2Off, Plus, Trash2, GripVertical } from 'lucide-react';
import {
  SECCIONES_BEAUTY, LIMITES, ETIQUETA_FUENTE,
  clonarFichaBeauty, fuenteDeSeccion, seccionEsPropia,
} from '../templates/beauty/fichaBeauty';
import IconoPicker from './IconoPicker';

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const MINI = 'bg-fg/5 border border-fg/10 rounded-lg px-2 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const ETIQUETA = 'block text-[10px] font-semibold uppercase tracking-wide text-fg/40 mb-1';

export default function FichaBeautyPanel({
  ficha,
  fichaResuelta,
  fichaLanding = null,
  fichaDelProducto = null,
  respaldos = {},
  // Paquetes ya creados de este producto (Ofertas con estrategia
  // 'normal'). Acá solo se configura cómo se ven.
  packs = [],
  modo = 'producto',
  onChange,
}) {
  const [abierta, setAbierta] = useState(null);
  const esProducto = modo === 'producto';

  /**
   * Base sobre la que se aplica un cambio.
   *
   * El orden importa: `ficha` es null mientras el producto no pisó ninguna
   * sección (es el estado inicial), así que leer `ficha[key]` antes de
   * comprobarlo lanzaba un TypeError y ningún control del panel respondía —
   * ni el interruptor de la sección ni los botones de agregar. Por eso se
   * pregunta primero (`seccionEsPropia` ya valida que sea un objeto) y
   * recién después se lee.
   */
  const baseDe = (key) => (
    seccionEsPropia(ficha, key) ? ficha[key] : clonarFichaBeauty(fichaResuelta, key)
  );

  // `ficha` puede ser null: el spread de null da {} y no rompe.
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

  /**
   * Vuelve a heredar: se BORRA la sección propia, no se clona la resuelta.
   * Clonarla dejaba una copia congelada — el botón decía "volver a heredar"
   * y hacía exactamente lo contrario.
   */
  const desvincular = (key) => {
    const copia = { ...(ficha || {}) };
    delete copia[key];
    onChange(copia);
  };

  const volverAHeredar = (key) => {
    const { [key]: _, ...resto } = ficha;
    onChange(resto);
  };

  return (
    <div className="p-4 space-y-3 pb-32">
      <p className="text-sm text-fg/70 mb-5 leading-relaxed">
        {esProducto ? (
          <>Configurá cómo se ve <strong>este producto</strong> en el template Beauty & Skin Care.</>
        ) : (
          <>Configurá los textos por defecto para <strong>todos los productos</strong> del template Beauty.</>
        )}
      </p>

      {SECCIONES_BEAUTY.map(sec => {
        const desplegada = abierta === sec.key;
        const propia = seccionEsPropia(ficha, sec.key);
        const fuente = fuenteDeSeccion(sec.key, { fichaProducto: ficha, fichaLanding, fichaDelProducto });
        const datos = fichaResuelta[sec.key] || {};

        return (
          <div key={sec.key} className="bg-fg/5 border border-fg/10 rounded-xl overflow-hidden">
            <div className={`flex items-center gap-3 p-3.5 transition-colors ${desplegada ? 'bg-fg/5' : ''}`}>
              <button
                type="button"
                onClick={() => setAbierta(desplegada ? null : sec.key)}
                className={`flex-1 flex items-center gap-3 text-left min-w-0 ${datos.activo ? 'text-fg' : 'text-fg/40 line-through'}`}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${datos.activo ? 'bg-fg text-canvas' : 'bg-fg/10 text-fg/40'}`}>
                  {sec.numero}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{sec.label}</span>
                  {esProducto && (
                    <span className={`block text-[10px] truncate ${propia ? 'text-[var(--color-accent-text)]/80' : 'text-fg/35'}`}>
                      {ETIQUETA_FUENTE[fuente]}
                    </span>
                  )}
                </span>
              </button>

              <label className="shrink-0 inline-flex items-center cursor-pointer" title={datos.activo ? 'Ocultar sección' : 'Mostrar sección'}>
                <input
                  type="checkbox"
                  checked={datos.activo}
                  onChange={e => editar(sec.key, { activo: e.target.checked })}
                  className="w-4 h-4 accent-[var(--color-accent)]"
                />
              </label>

              <button
                type="button"
                onClick={() => setAbierta(desplegada ? null : sec.key)}
                className="shrink-0 text-fg/30 hover:text-fg"
              >
                <ChevronDown size={15} className={desplegada ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
            </div>

            {desplegada && (
              <div className="px-3 pb-3.5 flex flex-col gap-3 border-t border-fg/10 pt-3">
                <p className="text-[11px] text-fg/35 leading-relaxed">{sec.ayuda}</p>

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
                  packs,
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
  // El label tiene que apuntar a su campo: sin htmlFor/id no están
  // asociados y un lector de pantalla anuncia el input sin nombre. useId da
  // un id único aunque el mismo label se repita en varias secciones.
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

function ListaTextos({ valores = [], max, textoAgregar, placeholder, onCambio }) {
  const add = () => onCambio([...valores, '']);
  const edit = (i, v) => { const n = [...valores]; n[i] = v; onCambio(n); };
  const del = (i) => onCambio(valores.filter((_, idx) => idx !== i));
  const mv = (i, dir) => {
    if (i + dir < 0 || i + dir >= valores.length) return;
    const n = [...valores]; const t = n[i]; n[i] = n[i+dir]; n[i+dir] = t; onCambio(n);
  };

  return (
    <div className="flex flex-col gap-2 mt-1">
      {valores.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <button type="button" onClick={() => mv(i, -1)} disabled={i === 0} className="text-fg/20 hover:text-fg disabled:opacity-30"><ChevronDown size={14} className="rotate-180" /></button>
          <button type="button" onClick={() => mv(i, 1)} disabled={i === valores.length - 1} className="text-fg/20 hover:text-fg disabled:opacity-30"><ChevronDown size={14} /></button>
          <input className={`${MINI} flex-1 min-w-0`} value={v || ''} placeholder={placeholder} onChange={e => edit(i, e.target.value)} />
          <button type="button" onClick={() => del(i)} className="text-fg/20 hover:text-red-400 p-1"><Trash2 size={13} /></button>
        </div>
      ))}
      {valores.length < max && (
        <button type="button" onClick={add} className="inline-flex items-center justify-center gap-1.5 py-1.5 mt-1 border border-dashed border-fg/20 rounded-lg text-[11px] font-medium text-fg/50 hover:text-fg hover:border-fg/40">
          <Plus size={12} /> {textoAgregar} ({valores.length}/{max})
        </button>
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
            <button type="button" onClick={() => lista.mover(campo, i, -1)} disabled={i===0} className="text-fg/30 hover:text-fg disabled:opacity-10"><ChevronDown size={12} className="rotate-180" /></button>
            <button type="button" onClick={() => lista.quitar(campo, i)} className="text-fg/30 hover:text-red-400 p-1"><Trash2 size={12} /></button>
            <button type="button" onClick={() => lista.mover(campo, i, 1)} disabled={i===items.length-1} className="text-fg/30 hover:text-fg disabled:opacity-10"><ChevronDown size={12} /></button>
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
        <div className="grid grid-cols-4 gap-2">
          <div><label className={ETIQUETA}>Días</label><input type="number" min="0" className={CAMPO} value={c.dias || 0} onChange={e => setC({ dias: Number(e.target.value) })} /></div>
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
      <div className="border-t border-fg/10 pt-2.5">
        <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer mb-1.5">
          <input
            type="checkbox" className="w-3.5 h-3.5 accent-primary"
            checked={d.animado !== false}
            onChange={e => set({ animado: e.target.checked })}
          />
          Desplazar los mensajes
        </label>
        {d.animado !== false && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={ETIQUETA}>Segundos por vuelta</label>
              <input type="number" min="8" max="120" className={CAMPO} value={d.velocidad} onChange={e => set({ velocidad: e.target.value })} />
            </div>
            <Texto label="Separador" valor={d.separador} placeholder="✦" onChange={v => set({ separador: v })} />
          </div>
        )}
      </div>
    </>
  ),

  hero: ({ d, set, respaldos }) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Sobre-título" valor={d.eyebrow} respaldo={respaldos.eyebrow} onChange={v => set({ eyebrow: v })} />
        <Texto label="Etiqueta foto" valor={d.etiqueta} placeholder="Más vendido" onChange={v => set({ etiqueta: v })} />
      </div>
      <Texto label="Título principal" valor={d.titulo} respaldo={respaldos.titulo} area onChange={v => set({ titulo: v })} />
      <Texto label="Subtítulo" valor={d.subtitulo} placeholder="Nombre del producto — Fórmula avanzada" onChange={v => set({ subtitulo: v })} />
      <Texto label="Bajada (Lead)" valor={d.lead} respaldo={respaldos.lead} area onChange={v => set({ lead: v })} />
      <Texto label="Botón principal" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
      <Texto label="Nota bajo el botón" valor={d.garantia_texto} placeholder="Garantía 60 días o te devolvemos tu dinero" onChange={v => set({ garantia_texto: v })} />
      <div>
        <label className={ETIQUETA}>Características cortas</label>
        <ListaTextos
          valores={d.caracteristicas} max={LIMITES.hero_caracteristicas}
          textoAgregar="Agregar" placeholder="Apto para todo tipo de piel"
          onCambio={l => set({ caracteristicas: l })}
        />
      </div>
    </>
  ),

  prueba_social: ({ d, set, lista }) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Etiqueta" valor={d.etiqueta} placeholder="Excelente" onChange={v => set({ etiqueta: v })} />
        <div>
          <label className={ETIQUETA}>Calificación (0 a 5)</label>
          <input type="number" min="0" max="5" step="0.1" className={CAMPO} value={d.calificacion} onChange={e => set({ calificacion: e.target.value })} />
        </div>
      </div>
      <Texto label="Cantidad de reseñas" valor={d.resenas_texto} placeholder="+12.847 reseñas verificadas" onChange={v => set({ resenas_texto: v })} />
      <Texto label="Clientas satisfechas" valor={d.clientes_texto} placeholder="+25.000 clientas satisfechas" onChange={v => set({ clientes_texto: v })} />
      <div>
        <label className={ETIQUETA}>Caritas (se muestran las iniciales)</label>
        <ListaEditable
          items={d.avatares} campo="avatares" lista={lista} max={LIMITES.prueba_social_avatares}
          textoAgregar="Agregar persona" nuevo={() => ({ nombre: '' })}
        >
          {(it, i) => (
            <input className={MINI} value={it.nombre || ''} placeholder="Ana Martínez" onChange={e => lista.editar('avatares', i, { nombre: e.target.value })} />
          )}
        </ListaEditable>
      </div>
      <p className="text-[10px] text-fg/35 leading-relaxed">Publicá números reales.</p>
    </>
  ),

  precio: ({ d, set, lista, packs }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Opción suelta" valor={d.etiqueta_individual} placeholder="1 frasco" onChange={v => set({ etiqueta_individual: v })} />
        <Texto label="Nota de la tarjeta" valor={d.nota_pack} placeholder="Compra única" onChange={v => set({ nota_pack: v })} />
      </div>
      <Texto label="Botón de cada tarjeta" valor={d.cta_pack} placeholder="Agregar al carrito" onChange={v => set({ cta_pack: v })} />

      <div>
        <label className={ETIQUETA}>Cintillo de cada paquete</label>
        {packs.length === 0 ? (
          <p className="text-[11px] text-fg/35 leading-relaxed">
            Todavía no hay paquetes. Se crean en la pestaña <b className="text-fg/60">Ofertas</b> de este
            producto, como paquete de más unidades del mismo producto.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {packs.map(p => {
              const conf = d.packs?.[String(p.id)] || {};
              const guardar = (cambios) => set({ packs: { ...(d.packs || {}), [String(p.id)]: { ...conf, ...cambios } } });
              return (
                <div key={p.id} className="bg-fg/[0.03] border border-fg/10 rounded-lg p-2 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-fg/70 truncate">{p.nombre}</p>
                  <input className={MINI} value={conf.badge || ''} placeholder="Cintillo (ej: Más vendido)" onChange={e => guardar({ badge: e.target.value })} />
                  <input className={MINI} value={conf.subtitulo || ''} placeholder="Subtítulo (ej: 90 ml)" onChange={e => guardar({ subtitulo: e.target.value })} />
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-fg/35 leading-relaxed mt-1.5">
          El ahorro se calcula solo contra el precio unitario. No se escribe acá.
        </p>
      </div>

      <div className="border-t border-fg/10 pt-2.5">
        <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer mb-1.5">
          <input
            type="checkbox" className="w-3.5 h-3.5 accent-primary"
            checked={!!d.suscripcion?.activo}
            onChange={e => set({ suscripcion: { ...d.suscripcion, activo: e.target.checked } })}
          />
          Mostrar opción de suscripción
        </label>
        {d.suscripcion?.activo && (
          <>
            <input className={CAMPO} value={d.suscripcion.titulo || ''} placeholder="Suscripción: 15% adicional + envío gratis" onChange={e => set({ suscripcion: { ...d.suscripcion, titulo: e.target.value } })} />
            <p className="text-[10px] text-amber-400/80 leading-relaxed mt-1.5">
              Por ahora es informativo: marca la intención de la clienta, no genera un cobro recurrente.
            </p>
          </>
        )}
      </div>

      <div className="border-t border-fg/10 pt-2.5">
        <label className={ETIQUETA}>Sellos debajo de las tarjetas</label>
        <ListaEditable
          items={d.confianza} campo="confianza" lista={lista} max={LIMITES.precio_confianza}
          textoAgregar="Agregar sello" nuevo={() => ({ icono: 'shield', texto: '' })}
        >
          {(it, i) => (
            <div className="flex items-center gap-1.5 w-full">
              <IconoPicker valor={it.icono} onChange={v => lista.editar('confianza', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.texto || ''} placeholder="Envío gratis a todo el país" onChange={e => lista.editar('confianza', i, { texto: e.target.value })} />
            </div>
          )}
        </ListaEditable>
      </div>
    </>
  ),

  beneficios: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.beneficios_items}
        textoAgregar="Agregar beneficio" nuevo={() => ({ icono: 'sparkles', titulo: '', descripcion: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Piel más joven" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
            </div>
            <textarea rows={2} className={MINI} value={it.descripcion || ''} placeholder="Reduce arrugas y líneas finas." onChange={e => lista.editar('items', i, { descripcion: e.target.value })} />
          </>
        )}
      </ListaEditable>
    </>
  ),

  ingredientes: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <p className="text-[10px] text-amber-400/80 leading-relaxed">
        Conviene cargarlos en <b>Mis Productos → Ficha del rubro</b>: son del producto y sirven en todas tus
        landings. Lo que escribas acá vale solo para esta.
      </p>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.ingredientes_items}
        textoAgregar="Agregar ingrediente" nuevo={() => ({ icono: '', nombre: '', descripcion: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} w-11 shrink-0 text-center`} value={it.icono || ''} placeholder="💧" onChange={e => lista.editar('items', i, { icono: e.target.value })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="Ácido hialurónico" onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
            </div>
            <input className={MINI} value={it.descripcion || ''} placeholder="Hidratación profunda y rellena arrugas" onChange={e => lista.editar('items', i, { descripcion: e.target.value })} />
          </>
        )}
      </ListaEditable>
    </>
  ),

  resultados: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <p className="text-[10px] text-amber-400/80 leading-relaxed">
        Conviene cargarlos en <b>Mis Productos → Ficha del rubro</b>. Lo que escribas acá vale solo para esta landing.
      </p>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.resultados_items}
        textoAgregar="Agregar testimonio" nuevo={() => ({ nombre: '', calificacion: 5, testimonio: '', antes: '', despues: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="Ana M." onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
              <select className={`${MINI} w-[62px] shrink-0`} value={it.calificacion} onChange={e => lista.editar('items', i, { calificacion: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} estrellas</option>)}
              </select>
            </div>
            <textarea rows={2} className={MINI} value={it.testimonio || ''} placeholder="En 2 semanas mi piel se ve más luminosa." onChange={e => lista.editar('items', i, { testimonio: e.target.value })} />
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} flex-1 min-w-0`} value={it.antes || ''} placeholder="Foto antes (ruta o link)" onChange={e => lista.editar('items', i, { antes: e.target.value })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.despues || ''} placeholder="Foto después" onChange={e => lista.editar('items', i, { despues: e.target.value })} />
            </div>
          </>
        )}
      </ListaEditable>
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Publicá solo testimonios y fotos reales de clientas, con su permiso.
      </p>
    </>
  ),

  como_funciona: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <p className="text-[10px] text-amber-400/80 leading-relaxed">
        Conviene cargarlos en <b>Mis Productos → Ficha del rubro</b>. Lo que escribas acá vale solo para esta landing.
      </p>
      <ListaEditable
        items={d.pasos} campo="pasos" lista={lista} max={LIMITES.como_funciona_pasos}
        textoAgregar="Agregar paso" nuevo={() => ({ paso: '', titulo: '', descripcion: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} w-11 shrink-0 text-center`} value={it.paso || ''} placeholder={String(i + 1)} onChange={e => lista.editar('pasos', i, { paso: e.target.value })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Limpia" onChange={e => lista.editar('pasos', i, { titulo: e.target.value })} />
            </div>
            <input className={MINI} value={it.descripcion || ''} placeholder="Limpiá tu rostro completamente" onChange={e => lista.editar('pasos', i, { descripcion: e.target.value })} />
          </>
        )}
      </ListaEditable>
    </>
  ),

  faq: ({ d, set, respaldos }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} respaldo={respaldos.faqTitulo} onChange={v => set({ titulo: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Las preguntas se cargan en la pestaña <b className="text-fg/60">Detalles</b> de este producto.
      </p>
    </>
  ),

  upsells: ({ d, set, respaldos }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} respaldo={respaldos.upsellsTitulo} onChange={v => set({ titulo: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Los productos se eligen en la pestaña <b className="text-fg/60">Relacionados</b>.
      </p>
    </>
  ),

  garantias: ({ d, lista }) => (
    <ListaEditable
      items={d.items} campo="items" lista={lista} max={LIMITES.garantias_items}
      textoAgregar="Agregar garantía" nuevo={() => ({ icono: 'shield', titulo: '', texto: '' })}
    >
      {(it, i) => (
        <>
          <div className="flex items-center gap-1.5">
            <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Garantía 60 días" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
          </div>
          <input className={MINI} value={it.texto || ''} placeholder="Devolución sin preguntas" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
        </>
      )}
    </ListaEditable>
  ),

  cta_final: ({ d, set }) => (
    <>
      <Texto label="Etiqueta" valor={d.etiqueta} placeholder="¡Oferta por tiempo limitado!" onChange={v => set({ etiqueta: v })} />
      <Texto label="Título" valor={d.titulo} placeholder="No pierdas esta oferta especial" onChange={v => set({ titulo: v })} />
      <Texto label="Texto de apoyo" valor={d.texto} placeholder="El descuento se aplica automáticamente" onChange={v => set({ texto: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Botón" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
        <Texto label="Nota del botón" valor={d.cta_nota} placeholder="Envío gratis" onChange={v => set({ cta_nota: v })} />
      </div>
      <CamposContador d={d} set={set} />
    </>
  ),
};
