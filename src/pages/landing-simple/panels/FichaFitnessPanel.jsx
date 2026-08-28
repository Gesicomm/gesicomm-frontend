import React, { useState } from 'react';
import { ChevronDown, Link2Off, Plus, Trash2 } from 'lucide-react';
import {
  SECCIONES_FICHA, LIMITES, ETIQUETA_FUENTE,
  clonarSeccionResuelta, fuenteDeSeccion, seccionEsPropia,
} from '../templates/fitness/fichaFitness';
import { CATALOGO_ICONOS_BENEFICIOS, getIconoBeneficio } from '../templates/iconosBeneficios';

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const MINI = 'bg-fg/5 border border-fg/10 rounded-lg px-2 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const ETIQUETA = 'block text-[10px] font-semibold uppercase tracking-wide text-fg/40 mb-1';

/**
 * Editor de la ficha de producto del template Fitness — las 12 secciones
 * del diseño, cada una con su interruptor y sus campos.
 *
 * Dos modos, el mismo componente:
 *   modo="producto" → edita content.productos["<id>"].ficha. Cada sección
 *     puede estar heredada (de la landing o de Marketing & Embudo del
 *     producto) o escrita acá. El primer cambio sobre una sección heredada
 *     la clona tal cual se está viendo y la vuelve propia — el comercio
 *     nunca arranca de un formulario en blanco ni pierde lo que veía.
 *   modo="landing" → edita content.ficha_fitness, los valores por defecto
 *     que heredan todas las fichas. No hay herencia que mostrar.
 *
 * No guarda nada: sube el objeto entero por onChange, igual que el resto de
 * los paneles del armador. Lo persiste quien tenga el botón "Guardar".
 */
export default function FichaFitnessPanel({
  ficha,
  fichaResuelta,
  fichaLanding = null,
  fichaMarketing = null,
  packs = [],
  // Lo que la ficha muestra HOY en cada campo que puede quedar vacío: el
  // nombre del producto, su categoría, su descripción. Se usan de
  // placeholder para que el campo diga qué está mostrando en vez de una
  // explicación abstracta ("Vacío = el nombre del producto"), que no deja
  // ver de qué texto se está hablando.
  respaldos = {},
  modo = 'producto',
  onChange,
}) {
  const [abierta, setAbierta] = useState(null);
  const esProducto = modo === 'producto';

  /**
   * Toda edición pasa por acá. Si la sección venía heredada, primero se
   * clona la versión resuelta (lo que el comercio está viendo en el
   * preview) y recién ahí se aplica el cambio.
   */
  function editar(key, cambios) {
    const base = seccionEsPropia(ficha, key)
      ? ficha[key]
      : clonarSeccionResuelta(fichaResuelta, key);
    onChange({ ...(ficha || {}), [key]: { ...base, ...cambios } });
  }

  function volverAHeredar(key) {
    const copia = { ...(ficha || {}) };
    delete copia[key];
    onChange(copia);
  }

  /** Helper de listas: sube el array completo con el elemento i modificado. */
  const editarItem = (key, campoLista, indice, cambios) => {
    const lista = [...(fichaResuelta[key][campoLista] || [])];
    lista[indice] = { ...lista[indice], ...cambios };
    editar(key, { [campoLista]: lista });
  };
  const agregarItem = (key, campoLista, nuevo) => {
    editar(key, { [campoLista]: [...(fichaResuelta[key][campoLista] || []), nuevo] });
  };
  const quitarItem = (key, campoLista, indice) => {
    editar(key, { [campoLista]: (fichaResuelta[key][campoLista] || []).filter((_, i) => i !== indice) });
  };
  const moverItem = (key, campoLista, indice, delta) => {
    const lista = [...(fichaResuelta[key][campoLista] || [])];
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    editar(key, { [campoLista]: lista });
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-fg/40 leading-relaxed">
        {esProducto
          ? 'La ficha toma lo que ya cargaste en Marketing & Embudo del producto. Lo que escribas acá vale solo para este producto en esta landing.'
          : 'Estos valores los heredan todas las fichas de producto de esta landing. Cada producto puede pisarlos desde su propia pestaña Ficha.'}
      </p>

      {SECCIONES_FICHA.map(sec => {
        const datos = fichaResuelta[sec.key];
        const propia = esProducto && seccionEsPropia(ficha, sec.key);
        const fuente = esProducto
          ? fuenteDeSeccion(sec.key, { fichaProducto: ficha, fichaLanding, fichaMarketing })
          : null;
        const desplegada = abierta === sec.key;

        return (
          <div key={sec.key} className="border border-fg/10 rounded-xl overflow-hidden bg-white/[0.02]">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setAbierta(desplegada ? null : sec.key)}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
              >
                <span className={`grid place-items-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${datos.activo ? 'bg-fg text-canvas' : 'bg-fg/10 text-fg/40'}`}>
                  {sec.numero}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{sec.label}</span>
                  {esProducto && (
                    <span className={`block text-[10px] truncate ${propia ? 'text-emerald-400/80' : 'text-fg/35'}`}>
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
                  className="w-4 h-4 accent-emerald-500"
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
                  packs,
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

/**
 * `respaldo` = el texto que la ficha muestra cuando este campo queda vacío
 * (el nombre del producto, su categoría, su descripción). Va de placeholder
 * y se aclara abajo, así el comercio ve de qué texto se trata sin tener que
 * deducirlo. Nunca se precarga en `valor`: si se escribiera, el campo
 * quedaría congelado con una copia y dejaría de seguir al producto.
 */
function Texto({ label, valor, onChange, placeholder, respaldo, area = false }) {
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
        <p className="text-[10px] text-white/30 mt-1 leading-relaxed">
          Es lo que se está mostrando. Escribí acá solo si querés algo distinto en esta landing.
        </p>
      )}
    </div>
  );
}

function SelectorIcono({ valor, onChange }) {
  const Icono = getIconoBeneficio(valor);
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <span className="grid place-items-center w-7 h-7 rounded-lg bg-fg/10 text-fg/70"><Icono size={14} /></span>
      <select
        value={valor || ''}
        onChange={e => onChange(e.target.value || null)}
        className="bg-fg/5 border border-fg/10 rounded-lg px-1.5 py-1 text-[11px] text-fg focus:outline-none w-[92px]"
      >
        <option value="">Ícono…</option>
        {CATALOGO_ICONOS_BENEFICIOS.map(i => (
          <option key={i.key} value={i.key} className="bg-neutral-900">{i.label}</option>
        ))}
      </select>
    </span>
  );
}

/** Fila de una lista repetible: mover, contenido y borrar. */
function Fila({ children, onSubir, onBajar, onQuitar }) {
  return (
    <div className="flex items-start gap-1.5 bg-white/[0.03] border border-fg/10 rounded-lg p-2">
      <div className="flex flex-col text-fg/25 pt-0.5">
        <button type="button" onClick={onSubir} className="hover:text-fg leading-none text-[10px]">▲</button>
        <button type="button" onClick={onBajar} className="hover:text-fg leading-none text-[10px]">▼</button>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">{children}</div>
      <button type="button" onClick={onQuitar} className="text-fg/25 hover:text-red-400 pt-0.5"><Trash2 size={13} /></button>
    </div>
  );
}

function BotonAgregar({ onClick, disabled, children }) {
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
function ListaEditable({ items, campo, lista, max, textoAgregar, nuevo, children }) {
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

/* ── Campos por sección ───────────────────────────────────────────── */

const CAMPOS = {
  anuncio: ({ d, set, lista }) => (
    <>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.anuncio_items}
        textoAgregar="Agregar mensaje" nuevo={() => ({ icono: 'shield', texto: '' })}
      >
        {(it, i) => (
          <div className="flex items-center gap-1.5">
            <SelectorIcono valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.texto || ''} placeholder="Envío gratis en todos los pedidos" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </div>
        )}
      </ListaEditable>
      <Texto label="Texto del botón" valor={d.cta_texto} placeholder="Comprar ahora — vacío = sin botón" onChange={v => set({ cta_texto: v })} />
    </>
  ),

  hero: ({ d, set, respaldos }) => (
    <>
      <Texto label="Línea superior" valor={d.eyebrow} respaldo={respaldos.eyebrow} placeholder="Ej: Cápsulas" onChange={v => set({ eyebrow: v })} />
      <Texto label="Título" valor={d.titulo} respaldo={respaldos.titulo} placeholder="Nombre del producto" onChange={v => set({ titulo: v })} />
      <Texto label="Segunda línea (en color de acento)" valor={d.titulo_destacado} placeholder="Ej: Resultados reales." onChange={v => set({ titulo_destacado: v })} />
      <Texto label="Promesa" area valor={d.lead} respaldo={respaldos.lead} placeholder="Contale al cliente para qué sirve" onChange={v => set({ lead: v })} />
      {/* La checklist es una lista de strings sueltos, no de objetos, así que
          no pasa por ListaEditable (que trabaja sobre {campo: valor}). */}
      <div>
        <label className={ETIQUETA}>Beneficios rápidos (con tilde)</label>
        <div className="flex flex-col gap-2">
          {d.checklist.map((linea, i) => {
            const conLista = (l) => set({ checklist: l });
            return (
              <Fila
                key={i}
                onSubir={() => { const l = [...d.checklist]; if (i > 0) { [l[i], l[i - 1]] = [l[i - 1], l[i]]; conLista(l); } }}
                onBajar={() => { const l = [...d.checklist]; if (i < l.length - 1) { [l[i], l[i + 1]] = [l[i + 1], l[i]]; conLista(l); } }}
                onQuitar={() => conLista(d.checklist.filter((_, x) => x !== i))}
              >
                <input
                  className={MINI}
                  value={linea}
                  placeholder="Mejora la concentración"
                  onChange={e => { const l = [...d.checklist]; l[i] = e.target.value; conLista(l); }}
                />
              </Fila>
            );
          })}
          <BotonAgregar onClick={() => set({ checklist: [...d.checklist, ''] })} disabled={d.checklist.length >= LIMITES.hero_checklist}>
            {d.checklist.length >= LIMITES.hero_checklist ? `Máximo ${LIMITES.hero_checklist}` : 'Agregar beneficio'}
          </BotonAgregar>
        </div>
      </div>
      <Texto label="Texto del botón principal" valor={d.cta_texto} placeholder="Comprar ahora con descuento" onChange={v => set({ cta_texto: v })} />
      <Texto label="Letra chica bajo el botón" valor={d.microcopy} placeholder="Pago seguro · Envío gratis" onChange={v => set({ microcopy: v })} />
    </>
  ),

  prueba_social: ({ d, set, lista }) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Etiqueta" valor={d.etiqueta} placeholder="Excelente" onChange={v => set({ etiqueta: v })} />
        <div>
          <label className={ETIQUETA}>Calificación (0 a 5)</label>
          <input
            type="number" min="0" max="5" step="0.1" className={CAMPO}
            value={d.calificacion}
            onChange={e => set({ calificacion: e.target.value })}
          />
        </div>
      </div>
      <Texto label="Cantidad de reseñas" valor={d.resenas_texto} placeholder="+2.847 reseñas verificadas" onChange={v => set({ resenas_texto: v })} />
      <Texto label="Clientes satisfechos" valor={d.clientes_texto} placeholder="+10.000 clientes satisfechos" onChange={v => set({ clientes_texto: v })} />
      <div>
        <label className={ETIQUETA}>Caritas (se muestran las iniciales)</label>
        <ListaEditable
          items={d.avatares} campo="avatares" lista={lista} max={LIMITES.prueba_social_avatares}
          textoAgregar="Agregar persona" nuevo={() => ({ nombre: '' })}
        >
          {(it, i) => (
            <input className={MINI} value={it.nombre || ''} placeholder="María González" onChange={e => lista.editar('avatares', i, { nombre: e.target.value })} />
          )}
        </ListaEditable>
      </div>
    </>
  ),

  ofertas: ({ d, set, packs }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Nombre de la opción suelta" valor={d.etiqueta_individual} placeholder="1 unidad" onChange={v => set({ etiqueta_individual: v })} />
        <Texto label="Cintillo de esa opción" valor={d.badge_individual} placeholder="Ej: Prueba" onChange={v => set({ badge_individual: v })} />
      </div>
      <Texto label="Nota al pie de cada tarjeta" valor={d.nota_pack} placeholder="Compra única" onChange={v => set({ nota_pack: v })} />

      <div>
        <label className={ETIQUETA}>Cintillo de cada paquete</label>
        {packs.length === 0 ? (
          <p className="text-[11px] text-fg/35 leading-relaxed">
            Todavía no hay paquetes. Se crean en la pestaña <b className="text-fg/60">Checkout y Ofertas</b> como
            “Paquete — más unidades del mismo producto”, y acá les ponés el cintillo (“Más vendido”, “Mejor valor”).
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {packs.map(p => {
              const conf = d.packs?.[String(p.id)] || {};
              const guardar = (cambios) => set({ packs: { ...(d.packs || {}), [String(p.id)]: { ...conf, ...cambios } } });
              return (
                <div key={p.id} className="bg-white/[0.03] border border-fg/10 rounded-lg p-2 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-fg/70 truncate">{p.nombre}</p>
                  <input className={MINI} value={conf.badge || ''} placeholder="Más vendido" onChange={e => guardar({ badge: e.target.value })} />
                  <input className={MINI} value={conf.subtitulo || ''} placeholder="Subtítulo (ej: 90 días)" onChange={e => guardar({ subtitulo: e.target.value })} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-fg/10 pt-2.5">
        <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer mb-1.5">
          <input
            type="checkbox" className="w-3.5 h-3.5 accent-emerald-500"
            checked={!!d.suscripcion.activo}
            onChange={e => set({ suscripcion: { ...d.suscripcion, activo: e.target.checked } })}
          />
          Mostrar opción de suscripción
        </label>
        {d.suscripcion.activo && (
          <div className="flex flex-col gap-2">
            <input className={CAMPO} value={d.suscripcion.titulo || ''} placeholder="Suscribite y ahorrá 15% adicional" onChange={e => set({ suscripcion: { ...d.suscripcion, titulo: e.target.value } })} />
            <input className={CAMPO} value={d.suscripcion.detalle || ''} placeholder="Envío automático cada 30 días. Cancelás cuando quieras." onChange={e => set({ suscripcion: { ...d.suscripcion, detalle: e.target.value } })} />
            <p className="text-[10px] text-amber-400/70 leading-relaxed">
              Por ahora es informativo: marca la intención del cliente, no genera un cobro recurrente.
            </p>
          </div>
        )}
      </div>
    </>
  ),

  beneficios: ({ d, set, lista }) => (
    <>
      <Texto label="Título (vacío = sin encabezado)" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.beneficios_items}
        textoAgregar="Agregar beneficio" nuevo={() => ({ icono: 'zap', titulo: '', texto: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <SelectorIcono valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Enfoque total" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
            </div>
            <textarea rows={2} className={MINI} value={it.texto || ''} placeholder="Elimina distracciones y mejora la atención." onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </>
        )}
      </ListaEditable>
    </>
  ),

  ingredientes: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.ingredientes_items}
        textoAgregar="Agregar ingrediente" nuevo={() => ({ icono: 'leaf', nombre: '', dosis: '', texto: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <SelectorIcono valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="L-Teanina" onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
              <input className={`${MINI} w-[74px] shrink-0`} value={it.dosis || ''} placeholder="200mg" onChange={e => lista.editar('items', i, { dosis: e.target.value })} />
            </div>
            <textarea rows={2} className={MINI} value={it.texto || ''} placeholder="Relaja la mente sin causar somnolencia." onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </>
        )}
      </ListaEditable>
    </>
  ),

  opiniones: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.opiniones_items}
        textoAgregar="Agregar opinión" nuevo={() => ({ nombre: '', calificacion: 5, comentario: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="Juan P." onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
              <select
                className={`${MINI} w-[64px] shrink-0`}
                value={it.calificacion}
                onChange={e => lista.editar('items', i, { calificacion: Number(e.target.value) })}
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n} className="bg-neutral-900">{n} ★</option>)}
              </select>
            </div>
            <textarea rows={2} className={MINI} value={it.comentario || ''} placeholder="Desde que lo uso, mi productividad se disparó." onChange={e => lista.editar('items', i, { comentario: e.target.value })} />
          </>
        )}
      </ListaEditable>
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Publicá solo opiniones reales de clientes: inventarlas es publicidad engañosa.
      </p>
    </>
  ),

  como_funciona: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.pasos} campo="pasos" lista={lista} max={LIMITES.como_funciona_pasos}
        textoAgregar="Agregar paso" nuevo={() => ({ icono: 'zap', titulo: '', texto: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <SelectorIcono valor={it.icono} onChange={v => lista.editar('pasos', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Tomás" onChange={e => lista.editar('pasos', i, { titulo: e.target.value })} />
            </div>
            <textarea rows={2} className={MINI} value={it.texto || ''} placeholder="Dos cápsulas con agua por la mañana." onChange={e => lista.editar('pasos', i, { texto: e.target.value })} />
          </>
        )}
      </ListaEditable>
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
            <SelectorIcono valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Garantía de 60 días" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
          </div>
          <input className={MINI} value={it.texto || ''} placeholder="Devolución sin preguntas" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
        </>
      )}
    </ListaEditable>
  ),

  faq: ({ d, set, respaldos }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} respaldo={respaldos.faqTitulo} onChange={v => set({ titulo: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Las preguntas se cargan en la pestaña <b className="text-fg/60">Detalles</b> de este producto, o en
        Marketing &amp; Embudo si querés que valgan para todas las landings.
      </p>
    </>
  ),

  upsells: ({ d, set, respaldos }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} respaldo={respaldos.upsellsTitulo} onChange={v => set({ titulo: v })} />
      <Texto label="Texto del botón" valor={d.cta_texto} placeholder="Agregar" onChange={v => set({ cta_texto: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Los productos que aparecen acá se eligen en la pestaña <b className="text-fg/60">Relacionados</b>.
      </p>
    </>
  ),

  cta_final: ({ d, set }) => (
    <>
      <Texto label="Etiqueta" valor={d.etiqueta} placeholder="Oferta por tiempo limitado" onChange={v => set({ etiqueta: v })} />
      <Texto label="Título" valor={d.titulo} placeholder="No pierdas esta oferta especial" onChange={v => set({ titulo: v })} />
      <Texto label="Texto de apoyo" valor={d.texto} onChange={v => set({ texto: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Botón" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
        <Texto label="Nota del botón" valor={d.cta_nota} placeholder="Envío gratis" onChange={v => set({ cta_nota: v })} />
      </div>
      <div className="border-t border-fg/10 pt-2.5">
        <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer mb-1.5">
          <input
            type="checkbox" className="w-3.5 h-3.5 accent-emerald-500"
            checked={!!d.contador.activo}
            onChange={e => set({ contador: { ...d.contador, activo: e.target.checked } })}
          />
          Mostrar contador
        </label>
        {d.contador.activo && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[['horas', 'Horas', 23], ['minutos', 'Minutos', 59], ['segundos', 'Segundos', 59]].map(([campo, label, max]) => (
                <div key={campo}>
                  <label className={ETIQUETA}>{label}</label>
                  <input
                    type="number" min="0" max={max} className={CAMPO}
                    value={d.contador[campo]}
                    onChange={e => set({ contador: { ...d.contador, [campo]: e.target.value } })}
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-fg/35 leading-relaxed mt-1.5">
              Arranca en este tiempo cada vez que alguien abre la página y baja hasta cero. No hay una fecha
              límite real detrás.
            </p>
          </>
        )}
      </div>
    </>
  ),
};
