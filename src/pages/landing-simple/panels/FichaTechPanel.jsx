import React, { useState } from 'react';
import { ChevronDown, Link2Off, Plus, Trash2 } from 'lucide-react';
import {
  SECCIONES_TECH, LIMITES, ETIQUETA_FUENTE,
  clonarSeccionResuelta, fuenteDeSeccion, seccionEsPropia,
} from '../templates/tech/fichaTech';
import IconoPicker from './IconoPicker';
import { analizarVideo, NOMBRE_PLATAFORMA } from '../templates/video';

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const MINI = 'bg-fg/5 border border-fg/10 rounded-lg px-2 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const ETIQUETA = 'block text-[10px] font-semibold uppercase tracking-wide text-fg/40 mb-1';

/**
 * Editor de la ficha de producto del template Electrónica & Tecnología —
 * las 14 secciones del diseño, cada una con su interruptor y sus campos.
 *
 * Mismo comportamiento que FichaFitnessPanel (dos modos, herencia por
 * sección, clonado al personalizar). Lo que cambia son las secciones: acá
 * hay especificaciones, "en la caja" y comparativa en vez de ingredientes.
 *
 * Varias secciones se cargan mejor desde Mis Productos (specs, comparativa)
 * porque son del producto y sirven en todas sus landings — el panel lo dice
 * en vez de dejar que el comercio las escriba dos veces sin saberlo.
 */
export default function FichaTechPanel({
  ficha,
  fichaResuelta,
  fichaLanding = null,
  fichaDelProducto = null,
  respaldos = {},
  // Paquetes ya creados de este producto (Ofertas con estrategia 'normal').
  // Acá solo se configura cómo se ven; se crean en la pestaña Ofertas.
  packs = [],
  modo = 'producto',
  onChange,
}) {
  const [abierta, setAbierta] = useState(null);
  const esProducto = modo === 'producto';

  /**
   * Toda edición pasa por acá. Si la sección venía heredada, primero se
   * clona la versión resuelta (lo que el comercio está viendo en el
   * preview) y recién ahí se aplica el cambio — así nunca arranca de un
   * formulario en blanco ni pierde lo que veía.
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

  const editarItem = (key, campoLista, indice, cambios) => {
    const l = [...(fichaResuelta[key][campoLista] || [])];
    l[indice] = { ...l[indice], ...cambios };
    editar(key, { [campoLista]: l });
  };
  const agregarItem = (key, campoLista, nuevo) => {
    editar(key, { [campoLista]: [...(fichaResuelta[key][campoLista] || []), nuevo] });
  };
  const quitarItem = (key, campoLista, indice) => {
    editar(key, { [campoLista]: (fichaResuelta[key][campoLista] || []).filter((_, i) => i !== indice) });
  };
  const moverItem = (key, campoLista, indice, delta) => {
    const l = [...(fichaResuelta[key][campoLista] || [])];
    const destino = indice + delta;
    if (destino < 0 || destino >= l.length) return;
    [l[indice], l[destino]] = [l[destino], l[indice]];
    editar(key, { [campoLista]: l });
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-fg/40 leading-relaxed">
        {esProducto
          ? 'La ficha toma lo que ya cargaste en Vista del producto. Lo que escribas acá vale solo para este producto en esta landing.'
          : 'Estos valores los heredan todas las fichas de producto de esta landing. Cada producto puede pisarlos desde su Vista del producto.'}
      </p>

      {SECCIONES_TECH.map(sec => {
        const datos = fichaResuelta[sec.key];
        const propia = esProducto && seccionEsPropia(ficha, sec.key);
        const fuente = esProducto
          ? fuenteDeSeccion(sec.key, { fichaProducto: ficha, fichaLanding, fichaDelProducto })
          : null;
        const desplegada = abierta === sec.key;

        return (
          <div key={sec.key} className="border border-fg/10 rounded-xl overflow-hidden bg-fg/[0.02]">
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

/**
 * `respaldo` = el texto que la ficha muestra cuando este campo queda vacío
 * (el nombre del producto, su categoría, su descripción). Va de placeholder
 * y se aclara abajo: así el campo dice qué está mostrando, en vez de una
 * explicación abstracta que no deja ver de qué texto se habla. Nunca se
 * precarga en `valor`: si se escribiera, el campo quedaría congelado con
 * una copia y dejaría de seguir al producto.
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
        <p className="text-[10px] text-fg/30 mt-1 leading-relaxed">
          Es lo que se está mostrando. Escribí acá solo si querés algo distinto en esta landing.
        </p>
      )}
    </div>
  );
}

function Fila({ children, onSubir, onBajar, onQuitar }) {
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

/** Lista repetible de objetos. */
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

/** Lista repetible de strings sueltos (no objetos), como "en la caja". */
function ListaTextos({ valores, max, textoAgregar, placeholder, onCambio }) {
  const set = (l) => onCambio(l);
  return (
    <div className="flex flex-col gap-2">
      {valores.map((linea, i) => (
        <Fila
          key={i}
          onSubir={() => { const l = [...valores]; if (i > 0) { [l[i], l[i - 1]] = [l[i - 1], l[i]]; set(l); } }}
          onBajar={() => { const l = [...valores]; if (i < l.length - 1) { [l[i], l[i + 1]] = [l[i + 1], l[i]]; set(l); } }}
          onQuitar={() => set(valores.filter((_, x) => x !== i))}
        >
          <input
            className={MINI}
            value={linea}
            placeholder={placeholder}
            onChange={e => { const l = [...valores]; l[i] = e.target.value; set(l); }}
          />
        </Fila>
      ))}
      <BotonAgregar onClick={() => set([...valores, ''])} disabled={valores.length >= max}>
        {valores.length >= max ? `Máximo ${max}` : textoAgregar}
      </BotonAgregar>
    </div>
  );
}

function CamposContador({ d, set }) {
  return (
    <div className="border-t border-fg/10 pt-2.5">
      <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer mb-1.5">
        <input
          type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]"
          checked={!!d.contador.activo}
          onChange={e => set({ contador: { ...d.contador, activo: e.target.checked } })}
        />
        Mostrar contador
      </label>
      {d.contador.activo && (
        <>
          <div className="grid grid-cols-4 gap-2">
            {[['dias', 'Días', 30], ['horas', 'Horas', 23], ['minutos', 'Min', 59], ['segundos', 'Seg', 59]].map(([campo, label, max]) => (
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
  );
}

/**
 * Qué va a pasar con el link que se acaba de pegar. Sin esto el comercio
 * pega una URL, no ve nada distinto y no sabe si la tomó o no.
 */
function AvisoVideo({ url, tieneImagen }) {
  if (!url?.trim()) {
    return (
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Con link se muestra como video; sin link, como imagen suelta.
      </p>
    );
  }

  const video = analizarVideo(url);
  if (!video) {
    return <p className="text-[10px] text-amber-400/90 leading-relaxed">No parece un link válido.</p>;
  }

  const nombre = NOMBRE_PLATAFORMA[video.plataforma];

  if (video.incrustable) {
    return (
      <p className="text-[10px] text-emerald-400/90 leading-relaxed">
        {nombre}: se reproduce en la misma página.
        {!video.miniatura && !tieneImagen && ' Agregale una portada abajo, o se ve un recuadro vacío.'}
      </p>
    );
  }

  return (
    <p className="text-[10px] text-fg/45 leading-relaxed">
      {nombre} no permite reproducir dentro de otra web, así que se abre en otra pestaña.
      {!tieneImagen && ' Agregale una portada abajo para que se vea algo.'}
    </p>
  );
}

/* ── Campos por sección ───────────────────────────────────────────── */

const CAMPOS = {
  barra_superior: ({ d, set, lista }) => (
    <>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.barra_superior_items}
        textoAgregar="Agregar mensaje" nuevo={() => ({ icono: 'shield', texto: '' })}
      >
        {(it, i) => (
          <div className="flex items-center gap-1.5">
            <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.texto || ''} placeholder="Envío gratis en todos los pedidos" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </div>
        )}
      </ListaEditable>
      <Texto label="Texto del botón" valor={d.cta_texto} placeholder="Comprar ahora — vacío = sin botón" onChange={v => set({ cta_texto: v })} />
      <div className="border-t border-fg/10 pt-2.5">
        <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer mb-1.5">
          <input
            type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]"
            checked={d.animado !== false}
            onChange={e => set({ animado: e.target.checked })}
          />
          Desplazar los mensajes
        </label>
        {d.animado !== false && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={ETIQUETA}>Segundos por vuelta</label>
                <input
                  type="number" min="8" max="120" className={CAMPO}
                  value={d.velocidad}
                  onChange={e => set({ velocidad: e.target.value })}
                />
              </div>
              <Texto label="Separador" valor={d.separador} placeholder="✦" onChange={v => set({ separador: v })} />
            </div>
            <p className="text-[10px] text-fg/35 leading-relaxed mt-1.5">
              Más segundos = más lento. Se pausa cuando el visitante pasa el mouse, y no se mueve para
              quien pidió menos animaciones en su sistema.
            </p>
          </>
        )}
      </div>
    </>
  ),

  hero: ({ d, set, respaldos }) => (
    <>
      <Texto label="Línea superior" valor={d.eyebrow} respaldo={respaldos.eyebrow} placeholder="Ej: Auriculares" onChange={v => set({ eyebrow: v })} />
      <Texto label="Etiqueta sobre la foto" valor={d.etiqueta} placeholder="Nuevo — vacío = sin etiqueta" onChange={v => set({ etiqueta: v })} />
      <Texto label="Título" valor={d.titulo} respaldo={respaldos.titulo} placeholder="Nombre del producto" onChange={v => set({ titulo: v })} />
      <Texto label="Segunda línea (en color de acento)" valor={d.titulo_destacado} placeholder="Ej: ProSound Max" onChange={v => set({ titulo_destacado: v })} />
      <Texto label="Propuesta de valor" area valor={d.lead} respaldo={respaldos.lead} placeholder="Sonido premium. Comodidad extrema." onChange={v => set({ lead: v })} />
      <div>
        <label className={ETIQUETA}>Características clave (con tilde)</label>
        <ListaTextos
          valores={d.caracteristicas} max={LIMITES.hero_caracteristicas}
          textoAgregar="Agregar característica" placeholder="Hasta 50 horas de batería"
          onCambio={l => set({ caracteristicas: l })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Botón principal" valor={d.cta_texto} placeholder="Añadir al carrito" onChange={v => set({ cta_texto: v })} />
        <Texto label="Botón secundario" valor={d.cta_secundario} placeholder="Comprar ahora" onChange={v => set({ cta_secundario: v })} />
      </div>
    </>
  ),

  prueba_social: ({ d, set }) => (
    <>
      <div>
        <label className={ETIQUETA}>Calificación (0 a 5)</label>
        <input
          type="number" min="0" max="5" step="0.1" className={CAMPO}
          value={d.calificacion}
          onChange={e => set({ calificacion: e.target.value })}
        />
      </div>
      <Texto label="Cantidad de reseñas" valor={d.resenas_texto} placeholder="1.248 reseñas" onChange={v => set({ resenas_texto: v })} />
      <Texto label="Clientes satisfechos" valor={d.clientes_texto} placeholder="+5.000 clientes satisfechos" onChange={v => set({ clientes_texto: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Se muestra en el encabezado, al lado del precio. Publicá números reales.
      </p>
    </>
  ),

  precio: ({ d, set }) => (
    <>
      <Texto label="Etiqueta" valor={d.etiqueta} placeholder="Oferta por tiempo limitado" onChange={v => set({ etiqueta: v })} />
      <Texto label="Texto de cuotas" valor={d.cuotas_texto} placeholder="o 3 cuotas sin interés de 56.000 Gs" onChange={v => set({ cuotas_texto: v })} />
      <p className="text-[10px] text-amber-400/70 leading-relaxed">
        El precio tachado y el % de descuento salen del precio ancla del producto, no se escriben acá.
      </p>
      <CamposContador d={d} set={set} />
    </>
  ),

  variantes: ({ d, set, packs }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <Texto label="Cómo se llama el grupo" valor={d.etiqueta_grupo} placeholder="Versión, Color, Capacidad…" onChange={v => set({ etiqueta_grupo: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Las opciones salen de las <b className="text-fg/60">variantes del producto</b>, que se cargan en Mis Productos.
        Acá solo se configura cómo se presentan.
      </p>

      <div className="border-t border-fg/10 pt-2.5">
        <label className={ETIQUETA}>Paquetes</label>
        {packs.length === 0 ? (
          <p className="text-[11px] text-fg/35 leading-relaxed">
            Todavía no hay paquetes. Se crean en la pestaña <b className="text-fg/60">Ofertas</b> de este producto,
            como “Paquete — más unidades del mismo producto”, y aparecen acá abajo de las variantes.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Texto label="Título del grupo" valor={d.packs_titulo} placeholder="Cantidad" onChange={v => set({ packs_titulo: v })} />
              <Texto label="Opción suelta" valor={d.etiqueta_individual} placeholder="1 unidad" onChange={v => set({ etiqueta_individual: v })} />
            </div>
            <div className="flex flex-col gap-2">
              {packs.map(p => {
                const conf = d.packs?.[String(p.id)] || {};
                const guardar = (cambios) => set({ packs: { ...(d.packs || {}), [String(p.id)]: { ...conf, ...cambios } } });
                return (
                  <div key={p.id} className="bg-fg/[0.03] border border-fg/10 rounded-lg p-2 flex flex-col gap-1.5">
                    <p className="text-[11px] font-semibold text-fg/70 truncate">{p.nombre}</p>
                    <input className={MINI} value={conf.badge || ''} placeholder="Cintillo (ej: Más vendido)" onChange={e => guardar({ badge: e.target.value })} />
                    <input className={MINI} value={conf.subtitulo || ''} placeholder="Subtítulo (ej: 3 unidades)" onChange={e => guardar({ subtitulo: e.target.value })} />
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-fg/35 leading-relaxed mt-1.5">
              El ahorro se calcula solo contra el precio unitario. No se escribe acá.
            </p>
          </>
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
              <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Sonido premium" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
            </div>
            <textarea rows={2} className={MINI} value={it.texto || ''} placeholder="Audio Hi-Fi con bajos de alta definición." onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </>
        )}
      </ListaEditable>
    </>
  ),

  especificaciones: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <p className="text-[10px] text-amber-400/70 leading-relaxed">
        Conviene cargarlas en <b>Mis Productos → Vista del producto</b>: son del producto y sirven en todas tus
        landings. Lo que escribas acá vale solo para esta.
      </p>
      <div>
        <label className={ETIQUETA}>Especificaciones</label>
        <ListaEditable
          items={d.items} campo="items" lista={lista} max={LIMITES.especificaciones_items}
          textoAgregar="Agregar especificación" nuevo={() => ({ clave: '', valor: '' })}
        >
          {(it, i) => (
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} w-[38%] shrink-0`} value={it.clave || ''} placeholder="Batería" onChange={e => lista.editar('items', i, { clave: e.target.value })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.valor || ''} placeholder="50 horas de reproducción" onChange={e => lista.editar('items', i, { valor: e.target.value })} />
            </div>
          )}
        </ListaEditable>
      </div>
      <Texto label="Título de la caja" valor={d.caja_titulo} placeholder="En la caja" onChange={v => set({ caja_titulo: v })} />
      <div>
        <label className={ETIQUETA}>Qué incluye</label>
        <ListaTextos
          valores={d.en_la_caja} max={LIMITES.en_la_caja}
          textoAgregar="Agregar ítem" placeholder="1x Cable de carga USB-C"
          onCambio={l => set({ en_la_caja: l })}
        />
      </div>
    </>
  ),

  multimedia: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.multimedia_items}
        textoAgregar="Agregar contenido" nuevo={() => ({ titulo: '', imagen: '', video: false })}
      >
        {(it, i) => (
          <>
            <input className={MINI} value={it.titulo || ''} placeholder="Video demostrativo" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
            <input className={MINI} value={it.imagen || ''} placeholder="/uploads/… (ruta de una imagen ya subida)" onChange={e => lista.editar('items', i, { imagen: e.target.value })} />
            <label className="flex items-center gap-2 text-[11px] text-fg/60 cursor-pointer">
              <input
                type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]"
                checked={!!it.video}
                onChange={e => lista.editar('items', i, { video: e.target.checked })}
              />
              Mostrar ícono de play
            </label>
          </>
        )}
      </ListaEditable>
    </>
  ),

  comparativa: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Columna propia" valor={d.nosotros} placeholder="Nuestro producto" onChange={v => set({ nosotros: v })} />
        <Texto label="Columna rival" valor={d.otros} placeholder="Otras marcas" onChange={v => set({ otros: v })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Texto
          label="Foto propia"
          valor={d.imagen_nosotros}
          placeholder="La foto principal del producto"
          onChange={v => set({ imagen_nosotros: v })}
        />
        <Texto
          label="Foto del rival"
          valor={d.imagen_otros}
          placeholder="Pegá el link de una imagen"
          onChange={v => set({ imagen_otros: v })}
        />
      </div>
      <p className="text-[10px] text-fg/35 leading-relaxed">
        {d.imagen_otros?.trim()
          ? 'Las dos fotos se muestran enfrentadas arriba de la tabla.'
          : 'Cargá la foto del rival para que aparezca el enfrentamiento de fotos. Sin ella se muestra solo la tabla.'}
      </p>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.comparativa_items}
        textoAgregar="Agregar característica" nuevo={() => ({ caracteristica: '', nosotros: true, otros: false })}
      >
        {(it, i) => (
          <>
            <input className={MINI} value={it.caracteristica || ''} placeholder="Cancelación de ruido ANC" onChange={e => lista.editar('items', i, { caracteristica: e.target.value })} />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-[11px] text-fg/60 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]" checked={it.nosotros !== false} onChange={e => lista.editar('items', i, { nosotros: e.target.checked })} />
                {d.nosotros || 'Nosotros'}
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-fg/60 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]" checked={it.otros === true} onChange={e => lista.editar('items', i, { otros: e.target.checked })} />
                {d.otros || 'Otras marcas'}
              </label>
            </div>
          </>
        )}
      </ListaEditable>
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Compará con hechos verificables. Afirmar algo falso sobre la competencia es publicidad engañosa.
      </p>
    </>
  ),

  resenas: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.resenas_items}
        textoAgregar="Agregar reseña" nuevo={() => ({ nombre: '', calificacion: 5, comentario: '', verificada: false })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="María G." onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
              <select
                className={`${MINI} w-[64px] shrink-0`}
                value={it.calificacion}
                onChange={e => lista.editar('items', i, { calificacion: Number(e.target.value) })}
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n} className="bg-neutral-900">{n} ★</option>)}
              </select>
            </div>
            <textarea rows={2} className={MINI} value={it.comentario || ''} placeholder="La calidad de sonido es increíble." onChange={e => lista.editar('items', i, { comentario: e.target.value })} />
            <label className="flex items-center gap-2 text-[11px] text-fg/60 cursor-pointer">
              <input
                type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]"
                checked={!!it.verificada}
                onChange={e => lista.editar('items', i, { verificada: e.target.checked })}
              />
              Marcar como compra verificada
            </label>
          </>
        )}
      </ListaEditable>
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Publicá solo opiniones reales de clientes, y marcá "compra verificada" únicamente si lo es.
      </p>
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
      <Texto label="Texto del botón" valor={d.cta_texto} placeholder="Añadir" onChange={v => set({ cta_texto: v })} />
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
            <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Garantía 2 años" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
          </div>
          <input className={MINI} value={it.texto || ''} placeholder="Cobertura completa" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
        </>
      )}
    </ListaEditable>
  ),

  cta_final: ({ d, set }) => (
    <>
      <Texto label="Etiqueta" valor={d.etiqueta} placeholder="¡Oferta por tiempo limitado!" onChange={v => set({ etiqueta: v })} />
      <Texto label="Texto de apoyo" valor={d.texto} placeholder="No te pierdas esta oferta exclusiva" onChange={v => set({ texto: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Botón" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
        <Texto label="Nota del botón" valor={d.cta_nota} placeholder="Envío gratis · Garantía 2 años" onChange={v => set({ cta_nota: v })} />
      </div>
      <CamposContador d={d} set={set} />
    </>
  ),
};
