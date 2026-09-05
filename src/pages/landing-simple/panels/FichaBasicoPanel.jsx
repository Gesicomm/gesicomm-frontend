import React, { useState } from 'react';
import { ChevronDown, Link2Off, Plus, Trash2 } from 'lucide-react';
import {
  SECCIONES_BASICO, LIMITES, ETIQUETA_FUENTE,
  clonarSeccionResuelta, fuenteDeSeccion, seccionEsPropia,
} from '../templates/basico/fichaBasico';
import IconoPicker from './IconoPicker';

/**
 * Panel de la ficha del template Básico.
 *
 * Misma estructura y mismo diseño que FichaFitnessPanel / FichaTechPanel /
 * FichaBeautyPanel: una fila plegable por sección, con su número, su
 * interruptor y la etiqueta de dónde sale lo que se está viendo. Lo único
 * propio son los campos de cada sección.
 */

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const MINI = 'bg-fg/5 border border-fg/10 rounded-lg px-2 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const ETIQUETA = 'block text-[10px] font-semibold uppercase tracking-wide text-fg/40 mb-1';

export default function FichaBasicoPanel({
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
   * comprobarlo lanza un TypeError y ningún control del panel responde —
   * ni el interruptor ni los botones de agregar. Ya pasó en Beauty.
   */
  const baseDe = (key) => (
    seccionEsPropia(ficha, key) ? ficha[key] : clonarSeccionResuelta(fichaResuelta, key)
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
  const volverAHeredar = (key) => {
    const copia = { ...(ficha || {}) };
    delete copia[key];
    onChange(copia);
  };

  return (
    <div className="p-4 space-y-3 pb-32">
      <p className="text-sm text-fg/70 mb-5 leading-relaxed">
        {esProducto ? (
          <>Configurá cómo se ve <strong>este producto</strong> en el template Básico.</>
        ) : (
          <>Configurá los textos por defecto para <strong>todos los productos</strong> del template Básico.</>
        )}
      </p>

      {SECCIONES_BASICO.map(sec => {
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
                  checked={!!datos.activo}
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
  // asociados y un lector de pantalla anuncia el input sin nombre.
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
    const n = [...valores]; const t = n[i]; n[i] = n[i + dir]; n[i + dir] = t; onCambio(n);
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
            <Texto label="Separador" valor={d.separador} placeholder="·" onChange={v => set({ separador: v })} />
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
      <Texto
        label="Remate del título (en color)" valor={d.titulo_destacado}
        placeholder="mejorar tu día." onChange={v => set({ titulo_destacado: v })}
      />
      <Texto label="Bajada (Lead)" valor={d.lead} respaldo={respaldos.lead} area onChange={v => set({ lead: v })} />
      <Texto label="Botón principal" valor={d.cta_texto} placeholder="Comprar ahora — envío gratis" onChange={v => set({ cta_texto: v })} />
      <div>
        <label className={ETIQUETA}>Puntos clave (los ✓ del encabezado)</label>
        <ListaTextos
          valores={d.caracteristicas} max={LIMITES.hero_caracteristicas}
          textoAgregar="Agregar" placeholder="Calidad premium y diseño funcional"
          onCambio={l => set({ caracteristicas: l })}
        />
      </div>
    </>
  ),

  precio: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <Texto label="Etiqueta sobre el precio" valor={d.etiqueta_oferta} placeholder="Oferta por tiempo limitado" onChange={v => set({ etiqueta_oferta: v })} />
      <Texto label="Nota bajo el precio" valor={d.nota} placeholder="Elegí la opción que mejor se adapta a vos" onChange={v => set({ nota: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        El precio y el <b className="text-fg/60">precio ancla</b> (el tachado) salen de la pestaña
        <b className="text-fg/60"> Detalles</b> de este producto. Acá se configuran los textos que lo acompañan.
      </p>
    </>
  ),

  opciones: ({ d, set, packs }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Opción suelta" valor={d.etiqueta_individual} placeholder="1 unidad" onChange={v => set({ etiqueta_individual: v })} />
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
              const guardarPack = (cambios) => set({
                packs: { ...(d.packs || {}), [String(p.id)]: { ...conf, ...cambios } },
              });
              return (
                <div key={p.id} className="bg-black/20 p-2.5 rounded-lg border border-fg/5 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-fg/70 truncate">{p.nombre}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={MINI} value={conf.badge || ''} placeholder="Más vendido" onChange={e => guardarPack({ badge: e.target.value })} />
                    <input className={MINI} value={conf.subtitulo || ''} placeholder="3 unidades" onChange={e => guardarPack({ subtitulo: e.target.value })} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  ),

  beneficios: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.beneficios_items}
        textoAgregar="Agregar beneficio" nuevo={() => ({ icono: 'star', titulo: '', texto: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5 w-full">
              <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Calidad superior" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
            </div>
            <input className={MINI} value={it.texto || ''} placeholder="Materiales y acabados seleccionados" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </>
        )}
      </ListaEditable>
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Si los cargaste en <b className="text-fg/60">Vista del producto</b>, aparecen solos acá.
      </p>
    </>
  ),

  descripcion: ({ d, set, respaldos }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <Texto label="Titular de la tarjeta" valor={d.encabezado} placeholder="Diseñado para funcionar, creado para durar" onChange={v => set({ encabezado: v })} />
      <Texto label="Texto" valor={d.texto} respaldo={respaldos.descripcion} area onChange={v => set({ texto: v })} />
      <div>
        <label className={ETIQUETA}>Puntos destacados (los ✓ de abajo)</label>
        <ListaTextos
          valores={d.destacados} max={LIMITES.descripcion_destacados}
          textoAgregar="Agregar" placeholder="Diseño inteligente"
          onCambio={l => set({ destacados: l })}
        />
      </div>
    </>
  ),

  usos: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.pasos} campo="pasos" lista={lista} max={LIMITES.usos_pasos}
        textoAgregar="Agregar paso" nuevo={() => ({ paso: '', titulo: '', texto: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5 w-full">
              <input className={`${MINI} w-12 shrink-0 text-center`} value={it.paso || ''} placeholder={String(i + 1)} onChange={e => lista.editar('pasos', i, { paso: e.target.value })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Elegí" onChange={e => lista.editar('pasos', i, { titulo: e.target.value })} />
            </div>
            <input className={MINI} value={it.texto || ''} placeholder="Seleccioná la opción ideal para vos." onChange={e => lista.editar('pasos', i, { texto: e.target.value })} />
          </>
        )}
      </ListaEditable>
    </>
  ),

  prueba_social: ({ d, set }) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Etiqueta" valor={d.etiqueta} placeholder="Excelente" onChange={v => set({ etiqueta: v })} />
        <div>
          <label className={ETIQUETA}>Calificación (0 a 5)</label>
          <input type="number" min="0" max="5" step="0.1" className={CAMPO} value={d.calificacion} onChange={e => set({ calificacion: e.target.value })} />
        </div>
      </div>
      <Texto label="Cantidad de reseñas" valor={d.resenas_texto} placeholder="2.847 reseñas verificadas" onChange={v => set({ resenas_texto: v })} />
      <Texto label="Clientes satisfechos" valor={d.clientes_texto} placeholder="+10.000 pedidos entregados" onChange={v => set({ clientes_texto: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">Publicá números reales.</p>
    </>
  ),

  comparacion: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Tu columna" valor={d.nosotros} placeholder="Nuestro producto" onChange={v => set({ nosotros: v })} />
        <Texto label="La otra columna" valor={d.otros} placeholder="Otras opciones" onChange={v => set({ otros: v })} />
      </div>
      <Texto
        label="Foto de tu producto (link)" valor={d.imagen_nosotros}
        placeholder="Vacío = la foto principal del producto"
        onChange={v => set({ imagen_nosotros: v })}
      />
      <Texto label="Foto de la otra opción (link)" valor={d.imagen_otros} placeholder="https://…" onChange={v => set({ imagen_otros: v })} />
      <div>
        <label className={ETIQUETA}>Características a comparar</label>
        <ListaEditable
          items={d.items} campo="items" lista={lista} max={LIMITES.comparacion_items}
          textoAgregar="Agregar característica" nuevo={() => ({ caracteristica: '', nosotros: true, otros: false })}
        >
          {(it, i) => (
            <>
              <input className={MINI} value={it.caracteristica || ''} placeholder="Garantía incluida" onChange={e => lista.editar('items', i, { caracteristica: e.target.value })} />
              <div className="flex items-center gap-4 text-[11px] text-fg/60">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]" checked={it.nosotros !== false} onChange={e => lista.editar('items', i, { nosotros: e.target.checked })} />
                  {d.nosotros || 'Nuestro producto'}
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]" checked={it.otros === true} onChange={e => lista.editar('items', i, { otros: e.target.checked })} />
                  {d.otros || 'Otras opciones'}
                </label>
              </div>
            </>
          )}
        </ListaEditable>
      </div>
    </>
  ),

  faq: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Las preguntas se cargan en <b className="text-fg/60">Vista del producto</b>.
      </p>
    </>
  ),

  relacionados: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <Texto label="Botón de cada tarjeta" valor={d.cta_texto} placeholder="Agregar" onChange={v => set({ cta_texto: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Los productos se eligen en la pestaña <b className="text-fg/60">Relacionados</b>.
      </p>
    </>
  ),

  garantias: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.garantias_items}
        textoAgregar="Agregar sello" nuevo={() => ({ icono: 'shield', titulo: '', texto: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5 w-full">
              <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Garantía 30 días" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
            </div>
            <input className={MINI} value={it.texto || ''} placeholder="Compra sin riesgos" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </>
        )}
      </ListaEditable>
      <div className="border-t border-fg/10 pt-2.5 flex flex-col gap-3">
        <Texto label="Titular de la devolución" valor={d.encabezado} placeholder="Comprá con total tranquilidad" onChange={v => set({ encabezado: v })} />
        <Texto
          label="Política de devolución" valor={d.texto} area
          placeholder="Si no cumple tus expectativas, escribinos dentro de los 30 días y te ayudamos con el cambio o la devolución."
          onChange={v => set({ texto: v })}
        />
      </div>
    </>
  ),

  cta_final: ({ d, set }) => (
    <>
      <Texto label="Etiqueta" valor={d.etiqueta} placeholder="Oferta por tiempo limitado" onChange={v => set({ etiqueta: v })} />
      <Texto label="Título" valor={d.titulo} placeholder="No pierdas esta oferta" onChange={v => set({ titulo: v })} />
      <Texto label="Texto" valor={d.texto} placeholder="Stock limitado · envío gratis" onChange={v => set({ texto: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Botón" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
        <Texto label="Nota del botón" valor={d.cta_nota} placeholder="Garantía 30 días" onChange={v => set({ cta_nota: v })} />
      </div>
      <CamposContador d={d} set={set} />
    </>
  ),
};
