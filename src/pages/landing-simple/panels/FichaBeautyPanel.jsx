import React, { useState } from 'react';
import { ChevronDown, Link2Off, Plus, Trash2, GripVertical } from 'lucide-react';
import {
  SECCIONES_BEAUTY, LIMITES, ETIQUETA_FUENTE,
  clonarFichaBeauty, fuenteDeSeccion, seccionEsPropia,
} from '../templates/beauty/fichaBeauty';
import { CATALOGO_ICONOS_BENEFICIOS, getIconoBeneficio } from '../templates/iconosBeneficios';

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const MINI = 'bg-fg/5 border border-fg/10 rounded-lg px-2 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const ETIQUETA = 'block text-[10px] font-semibold uppercase tracking-wide text-fg/40 mb-1';

export default function FichaBeautyPanel({
  ficha,
  fichaResuelta,
  fichaLanding = null,
  fichaDelProducto = null,
  respaldos = {},
  modo = 'producto',
  onChange,
}) {
  const [abierta, setAbierta] = useState(null);
  const esProducto = modo === 'producto';

  const editar = (key, update) => {
    let base = ficha[key];
    if (!seccionEsPropia(ficha, key)) {
      base = clonarFichaBeauty(fichaResuelta, key);
    }
    onChange({ ...ficha, [key]: { ...base, ...update } });
  };

  const editarItem = (key, campo, index, cambios) => {
    let base = ficha[key];
    if (!seccionEsPropia(ficha, key)) base = clonarFichaBeauty(fichaResuelta, key);
    const lista = [...(base[campo] || [])];
    lista[index] = { ...lista[index], ...cambios };
    onChange({ ...ficha, [key]: { ...base, [campo]: lista } });
  };

  const agregarItem = (key, campo, nuevo) => {
    let base = ficha[key];
    if (!seccionEsPropia(ficha, key)) base = clonarFichaBeauty(fichaResuelta, key);
    onChange({ ...ficha, [key]: { ...base, [campo]: [...(base[campo] || []), nuevo] } });
  };

  const quitarItem = (key, campo, index) => {
    let base = ficha[key];
    if (!seccionEsPropia(ficha, key)) base = clonarFichaBeauty(fichaResuelta, key);
    onChange({ ...ficha, [key]: { ...base, [campo]: (base[campo] || []).filter((_, i) => i !== index) } });
  };

  const moverItem = (key, campo, index, delta) => {
    let base = ficha[key];
    if (!seccionEsPropia(ficha, key)) base = clonarFichaBeauty(fichaResuelta, key);
    const lista = [...(base[campo] || [])];
    const target = index + delta;
    if (target < 0 || target >= lista.length) return;
    const temp = lista[index];
    lista[index] = lista[target];
    lista[target] = temp;
    onChange({ ...ficha, [key]: { ...base, [campo]: lista } });
  };

  const desvincular = (key) => {
    onChange({ ...ficha, [key]: clonarFichaBeauty(fichaResuelta, key) });
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
                className={`flex-1 flex items-center gap-3 text-left ${datos.activo ? 'text-fg' : 'text-fg/40 line-through'}`}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${datos.activo ? 'bg-fg text-canvas' : 'bg-fg/10 text-fg/40'}`}>
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

function SelectorIcono({ valor, onChange }) {
  const Icono = getIconoBeneficio(valor);
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <span className="grid place-items-center w-7 h-7 rounded-lg bg-fg/10 text-fg/70"><Icono size={14} /></span>
      <select
        value={valor || ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-5 opacity-0 absolute cursor-pointer"
        title="Cambiar ícono"
      >
        <option value="">Quitar</option>
        {Object.entries(CATALOGO_ICONOS_BENEFICIOS).map(([key, info]) => (
          <option key={key} value={key} className="bg-neutral-900">{info.label}</option>
        ))}
      </select>
    </span>
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
        <input type="checkbox" checked={!!c.activo} onChange={e => setC({ activo: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
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
            <SelectorIcono valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
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
      <Texto label="Bajada (Lead)" valor={d.lead} respaldo={respaldos.lead} area onChange={v => set({ lead: v })} />
      <Texto label="Botón principal" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
      <Texto label="Texto reseñas" valor={d.calificacion_texto} placeholder="4.8/5 · +25,000 clientas" onChange={v => set({ calificacion_texto: v })} />
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

  prueba_social: ({ d, set }) => (
    <>
      <Texto label="Puntaje estrellas (1 a 5)" valor={d.calificacion} placeholder="4.8" onChange={v => set({ calificacion: v })} />
      <Texto label="Texto de reseñas" valor={d.resenas_texto} placeholder="12,847 reseñas verificadas" onChange={v => set({ resenas_texto: v })} />
      <Texto label="Texto de clientes" valor={d.clientes_texto} placeholder="+25,000 clientas satisfechas" onChange={v => set({ clientes_texto: v })} />
    </>
  ),

  precio: ({ d, set }) => (
    <>
      <Texto label="Título de las ofertas" valor={d.titulo} placeholder="Elige tu oferta" onChange={v => set({ titulo: v })} />
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
              <SelectorIcono valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Piel más joven" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
            </div>
            <textarea rows={2} className={MINI} value={it.descripcion || ''} placeholder="Reduce arrugas y líneas finas." onChange={e => lista.editar('items', i, { descripcion: e.target.value })} />
          </>
        )}
      </ListaEditable>
    </>
  ),

  ingredientes: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Los ingredientes se cargan en la pestaña <b className="text-fg/60">Rubro</b> en la ventana principal de Mis Productos.
      </p>
    </>
  ),

  resultados: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Los testimonios se cargan en la pestaña <b className="text-fg/60">Rubro</b> en la ventana principal de Mis Productos.
      </p>
    </>
  ),

  como_funciona: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Los pasos de uso se cargan en la pestaña <b className="text-fg/60">Rubro</b> en la ventana principal de Mis Productos.
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
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Los productos se eligen en la pestaña <b className="text-fg/60">Relacionados</b>.
      </p>
    </>
  ),

  garantias: ({ d, lista }) => (
    <ListaEditable
      items={d.items} campo="items" lista={lista} max={LIMITES.garantias_items}
      textoAgregar="Agregar garantía" nuevo={() => ({ icono: '✦', titulo: '', descripcion: '' })}
    >
      {(it, i) => (
        <>
          <div className="flex items-center gap-1.5">
            <input className={`${MINI} w-10 shrink-0 text-center`} value={it.icono || ''} placeholder="✦" onChange={e => lista.editar('items', i, { icono: e.target.value })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Garantía 60 días" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
          </div>
          <input className={MINI} value={it.descripcion || ''} placeholder="Devoluciones sin preguntas" onChange={e => lista.editar('items', i, { descripcion: e.target.value })} />
        </>
      )}
    </ListaEditable>
  ),

  cta_final: ({ d, set }) => (
    <>
      <Texto label="Etiqueta" valor={d.etiqueta} placeholder="¡Oferta por tiempo limitado!" onChange={v => set({ etiqueta: v })} />
      <Texto label="Texto principal" valor={d.texto} placeholder="No te pierdas esta oferta" onChange={v => set({ texto: v })} />
      <Texto label="Subtexto" valor={d.subtexto} placeholder="El descuento se aplica" onChange={v => set({ subtexto: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Botón" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
        <Texto label="Nota del botón" valor={d.cta_nota} placeholder="Envío gratis" onChange={v => set({ cta_nota: v })} />
      </div>
      <CamposContador d={d} set={set} />
    </>
  ),
};
