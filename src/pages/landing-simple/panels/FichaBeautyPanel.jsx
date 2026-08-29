import React, { useState } from 'react';
import { ChevronDown, Link2Off, Plus, Trash2 } from 'lucide-react';
import {
  SECCIONES_BEAUTY, LIMITES, ETIQUETA_FUENTE,
  clonarFichaBeauty, fuenteDeSeccion, seccionEsPropia,
} from '../templates/beauty/fichaBeauty';
import { CATALOGO_ICONOS_BENEFICIOS, getIconoBeneficio } from '../templates/iconosBeneficios';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/30';
const MINI = 'bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/30';
const ETIQUETA = 'block text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-1';

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

  const set = (key, update) => {
    let base = ficha[key];
    if (!seccionEsPropia(ficha, key)) {
      base = clonarFichaBeauty(fichaResuelta, key);
    }
    onChange({ ...ficha, [key]: { ...base, ...update } });
  };

  const desvincular = (key) => {
    onChange({ ...ficha, [key]: clonarFichaBeauty(fichaResuelta, key) });
  };

  const alternar = (key) => {
    if (!seccionEsPropia(ficha, key)) {
      const clon = clonarFichaBeauty(fichaResuelta, key);
      onChange({ ...ficha, [key]: { ...clon, activo: !clon.activo } });
    } else {
      onChange({ ...ficha, [key]: { ...ficha[key], activo: !ficha[key].activo } });
    }
  };

  const borrar = (key) => {
    const { [key]: _, ...resto } = ficha;
    onChange(resto);
  };

  const RENDERERS = {
    barra_superior: (s, k) => (
      <div className="space-y-4">
        <label>
          <span className={ETIQUETA}>Botón de compra</span>
          <input className={CAMPO} value={s.cta_texto || ''} onChange={e => set(k, { cta_texto: e.target.value })} placeholder="Ej: Comprar ahora" />
        </label>
        <div>
          <span className={ETIQUETA}>Ventajas (Max {LIMITES.barra_superior_items})</span>
          <div className="space-y-2 mt-1">
            {(s.items || []).map((it, i) => (
              <div key={i} className="flex gap-2">
                <input className={`${CAMPO} flex-1`} value={it.texto || ''} onChange={e => { const list = [...s.items]; list[i].texto = e.target.value; set(k, { items: list }); }} />
                <button type="button" className="p-2 text-white/30 hover:text-white/60 bg-white/5 rounded-lg border border-white/10" onClick={() => set(k, { items: s.items.filter((_, idx) => idx !== i) })}><Trash2 size={14} /></button>
              </div>
            ))}
            {(s.items || []).length < LIMITES.barra_superior_items && (
              <button type="button" className="w-full py-1.5 flex justify-center items-center gap-1.5 text-xs text-white/50 hover:text-white/80 bg-white/5 rounded border border-white/10" onClick={() => set(k, { items: [...(s.items || []), { icono: 'check', texto: '' }] })}><Plus size={12} /> Agregar ventaja</button>
            )}
          </div>
        </div>
      </div>
    ),
    hero: (s, k) => (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label><span className={ETIQUETA}>Sobre-título</span><input className={CAMPO} value={s.eyebrow || ''} onChange={e => set(k, { eyebrow: e.target.value })} placeholder="Ej: NUEVA FÓRMULA" /></label>
          <label><span className={ETIQUETA}>Etiqueta foto</span><input className={CAMPO} value={s.etiqueta || ''} onChange={e => set(k, { etiqueta: e.target.value })} placeholder="Ej: MÁS VENDIDO" /></label>
        </div>
        <label><span className={ETIQUETA}>Título principal</span><textarea className={CAMPO} rows={2} value={s.titulo || ''} onChange={e => set(k, { titulo: e.target.value })} placeholder="Dejar vacío para usar nombre del producto" /></label>
        <label><span className={ETIQUETA}>Descripción (Lead)</span><textarea className={CAMPO} rows={2} value={s.lead || ''} onChange={e => set(k, { lead: e.target.value })} placeholder="Dejar vacío para usar descripción general" /></label>
        <label><span className={ETIQUETA}>Texto botón</span><input className={CAMPO} value={s.cta_texto || ''} onChange={e => set(k, { cta_texto: e.target.value })} placeholder="Ej: Comprar Ahora" /></label>
        <label><span className={ETIQUETA}>Texto reseñas estrella</span><input className={CAMPO} value={s.calificacion_texto || ''} onChange={e => set(k, { calificacion_texto: e.target.value })} placeholder="Ej: 4.8/5 · +25,000 clientas satisfechas" /></label>
        <div>
          <span className={ETIQUETA}>Características cortas (Max {LIMITES.hero_caracteristicas})</span>
          <div className="space-y-2 mt-1">
            {(s.caracteristicas || []).map((c, i) => (
              <div key={i} className="flex gap-2">
                <input className={`${CAMPO} flex-1`} value={c || ''} onChange={e => { const list = [...s.caracteristicas]; list[i] = e.target.value; set(k, { caracteristicas: list }); }} />
                <button type="button" className="p-2 text-white/30 hover:text-white/60 bg-white/5 rounded-lg border border-white/10" onClick={() => set(k, { caracteristicas: s.caracteristicas.filter((_, idx) => idx !== i) })}><Trash2 size={14} /></button>
              </div>
            ))}
            {(s.caracteristicas || []).length < LIMITES.hero_caracteristicas && (
              <button type="button" className="w-full py-1.5 flex justify-center items-center gap-1.5 text-xs text-white/50 hover:text-white/80 bg-white/5 rounded border border-white/10" onClick={() => set(k, { caracteristicas: [...(s.caracteristicas || []), ''] })}><Plus size={12} /> Agregar característica</button>
            )}
          </div>
        </div>
      </div>
    ),
    prueba_social: (s, k) => (
      <div className="space-y-4">
        <label><span className={ETIQUETA}>Puntaje estrellas (1-5)</span><input type="number" min="1" max="5" step="0.1" className={CAMPO} value={s.calificacion || ''} onChange={e => set(k, { calificacion: e.target.value })} /></label>
        <label><span className={ETIQUETA}>Reseñas</span><input className={CAMPO} value={s.resenas_texto || ''} onChange={e => set(k, { resenas_texto: e.target.value })} placeholder="Ej: 12,847 reseñas verificadas" /></label>
        <label><span className={ETIQUETA}>Clientes satisfechos</span><input className={CAMPO} value={s.clientes_texto || ''} onChange={e => set(k, { clientes_texto: e.target.value })} placeholder="Ej: +25,000 clientas" /></label>
      </div>
    ),
    precio: (s, k) => (
      <div className="space-y-4">
        <label><span className={ETIQUETA}>Título opciones</span><input className={CAMPO} value={s.titulo || ''} onChange={e => set(k, { titulo: e.target.value })} placeholder="Ej: Elige tu oferta" /></label>
        <label><span className={ETIQUETA}>Texto de suscripción</span><input className={CAMPO} value={s.suscripcion_texto || ''} onChange={e => set(k, { suscripcion_texto: e.target.value })} placeholder="Ej: Ahorra 15%" /></label>
        <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-white/80">
          <input type="checkbox" className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900" checked={s.suscripcion_activa !== false} onChange={e => set(k, { suscripcion_activa: e.target.checked })} />
          Mostrar toggle de suscripción
        </label>
      </div>
    ),
    beneficios: (s, k) => (
      <div className="space-y-4">
        <label><span className={ETIQUETA}>Título sección</span><input className={CAMPO} value={s.titulo || ''} onChange={e => set(k, { titulo: e.target.value })} /></label>
        <div>
          <span className={ETIQUETA}>Beneficios (Max {LIMITES.beneficios_items})</span>
          <div className="space-y-3 mt-1">
            {(s.items || []).map((b, i) => (
              <div key={i} className="flex gap-2 items-start bg-white/5 p-2 rounded-lg border border-white/5">
                <select className={`${MINI} w-[100px] shrink-0`} value={b.icono || ''} onChange={e => { const list = [...s.items]; list[i].icono = e.target.value; set(k, { items: list }); }}>
                  {Object.entries(CATALOGO_ICONOS_BENEFICIOS).map(([clave, datos]) => (<option key={clave} value={clave} className="bg-gray-800">{datos.label}</option>))}
                </select>
                <div className="flex-1 space-y-2">
                  <input className={CAMPO} value={b.titulo || ''} onChange={e => { const list = [...s.items]; list[i].titulo = e.target.value; set(k, { items: list }); }} placeholder="Título del beneficio" />
                  <textarea className={CAMPO} rows={2} value={b.descripcion || ''} onChange={e => { const list = [...s.items]; list[i].descripcion = e.target.value; set(k, { items: list }); }} placeholder="Breve descripción..." />
                </div>
                <button type="button" className="p-1.5 text-white/30 hover:text-red-400 mt-1" onClick={() => set(k, { items: s.items.filter((_, idx) => idx !== i) })}><Trash2 size={14} /></button>
              </div>
            ))}
            {(s.items || []).length < LIMITES.beneficios_items && (
              <button type="button" className="w-full py-1.5 flex justify-center items-center gap-1.5 text-xs text-white/50 hover:text-white/80 bg-white/5 rounded border border-white/10" onClick={() => set(k, { items: [...(s.items || []), { icono: 'star', titulo: '', descripcion: '' }] })}><Plus size={12} /> Agregar beneficio</button>
            )}
          </div>
        </div>
      </div>
    ),
    ingredientes: (s, k) => <div className="space-y-4"><label><span className={ETIQUETA}>Título sección</span><input className={CAMPO} value={s.titulo || ''} onChange={e => set(k, { titulo: e.target.value })} /></label><p className="text-xs text-white/50 mt-2 px-1">Los ingredientes se cargan desde Mis Productos {'>'} Pestaña Rubro.</p></div>,
    resultados: (s, k) => <div className="space-y-4"><label><span className={ETIQUETA}>Título sección</span><input className={CAMPO} value={s.titulo || ''} onChange={e => set(k, { titulo: e.target.value })} /></label><p className="text-xs text-white/50 mt-2 px-1">Los resultados se cargan desde Mis Productos {'>'} Pestaña Rubro.</p></div>,
    como_funciona: (s, k) => <div className="space-y-4"><label><span className={ETIQUETA}>Título sección</span><input className={CAMPO} value={s.titulo || ''} onChange={e => set(k, { titulo: e.target.value })} /></label><p className="text-xs text-white/50 mt-2 px-1">Los pasos se cargan desde Mis Productos {'>'} Pestaña Rubro.</p></div>,
    garantias: (s, k) => (
      <div className="space-y-4">
        <div>
          <span className={ETIQUETA}>Garantías (Max {LIMITES.garantias_items})</span>
          <div className="space-y-3 mt-1">
            {(s.items || []).map((b, i) => (
              <div key={i} className="flex gap-2 items-start bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="flex-1 space-y-2">
                  <input className={CAMPO} value={b.icono || ''} onChange={e => { const list = [...s.items]; list[i].icono = e.target.value; set(k, { items: list }); }} placeholder="Icono/Emoji" />
                  <input className={CAMPO} value={b.titulo || ''} onChange={e => { const list = [...s.items]; list[i].titulo = e.target.value; set(k, { items: list }); }} placeholder="Título" />
                  <input className={CAMPO} value={b.descripcion || ''} onChange={e => { const list = [...s.items]; list[i].descripcion = e.target.value; set(k, { items: list }); }} placeholder="Descripción..." />
                </div>
                <button type="button" className="p-1.5 text-white/30 hover:text-red-400 mt-1" onClick={() => set(k, { items: s.items.filter((_, idx) => idx !== i) })}><Trash2 size={14} /></button>
              </div>
            ))}
            {(s.items || []).length < LIMITES.garantias_items && (
              <button type="button" className="w-full py-1.5 flex justify-center items-center gap-1.5 text-xs text-white/50 hover:text-white/80 bg-white/5 rounded border border-white/10" onClick={() => set(k, { items: [...(s.items || []), { icono: '✦', titulo: '', descripcion: '' }] })}><Plus size={12} /> Agregar garantía</button>
            )}
          </div>
        </div>
      </div>
    ),
    faq: (s, k) => <div className="space-y-4"><label><span className={ETIQUETA}>Título sección</span><input className={CAMPO} value={s.titulo || ''} onChange={e => set(k, { titulo: e.target.value })} /></label></div>,
    upsells: (s, k) => <div className="space-y-4"><label><span className={ETIQUETA}>Título sección</span><input className={CAMPO} value={s.titulo || ''} onChange={e => set(k, { titulo: e.target.value })} /></label></div>,
    cta_final: (s, k) => (
      <div className="space-y-4">
        <label><span className={ETIQUETA}>Etiqueta</span><input className={CAMPO} value={s.etiqueta || ''} onChange={e => set(k, { etiqueta: e.target.value })} /></label>
        <label><span className={ETIQUETA}>Texto principal</span><input className={CAMPO} value={s.texto || ''} onChange={e => set(k, { texto: e.target.value })} /></label>
        <label><span className={ETIQUETA}>Subtexto</span><input className={CAMPO} value={s.subtexto || ''} onChange={e => set(k, { subtexto: e.target.value })} /></label>
        <label><span className={ETIQUETA}>Botón</span><input className={CAMPO} value={s.cta_texto || ''} onChange={e => set(k, { cta_texto: e.target.value })} /></label>
        <label><span className={ETIQUETA}>Debajo del botón</span><input className={CAMPO} value={s.cta_nota || ''} onChange={e => set(k, { cta_nota: e.target.value })} /></label>
      </div>
    ),
  };

  return (
    <div className="p-4 space-y-3 pb-32">
      <p className="text-sm text-white/70 mb-5 leading-relaxed">
        {esProducto ? (
          <>Configurá cómo se ve <strong>este producto</strong> en la plantilla de Beauty & Skin Care.</>
        ) : (
          <>Configurá los textos por defecto para <strong>todos los productos</strong> de la plantilla Beauty.</>
        )}
      </p>

      {SECCIONES_BEAUTY.map(sec => {
        const fuente = fuenteDeSeccion(sec.key, { fichaProducto: ficha, fichaLanding, fichaDelProducto });
        const resuelta = fichaResuelta[sec.key] || {};
        const isPropia = seccionEsPropia(ficha, sec.key);
        const activa = resuelta.activo !== false;

        return (
          <div key={sec.key} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-colors hover:border-white/20">
            <div className="flex items-center">
              <button type="button" onClick={() => setAbierta(abierta === sec.key ? null : sec.key)} className="flex-1 flex items-center justify-between p-3.5 text-left bg-transparent border-0 text-white cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${activa ? 'bg-[#7c5cff] text-white' : 'bg-white/10 text-white/40'}`}>{sec.numero}</div>
                  <div>
                    <span className={`block text-sm font-semibold ${activa ? '' : 'text-white/40 line-through'}`}>{sec.label}</span>
                    <span className="block text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{ETIQUETA_FUENTE[fuente]}</span>
                  </div>
                </div>
                <ChevronDown size={18} className={`text-white/30 transition-transform ${abierta === sec.key ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {abierta === sec.key && (
              <div className="p-4 pt-2 border-t border-white/5 bg-black/20">
                <p className="text-xs text-white/50 mb-5 leading-relaxed">{sec.ayuda}</p>

                {esProducto && !isPropia ? (
                  <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[13px] text-white/70 mb-4 px-6 leading-relaxed">
                      Esta sección está heredando el contenido de <strong className="text-white">"{sec.ambito === 'producto' ? 'Mis Productos' : 'La landing'}"</strong>.
                    </p>
                    <button type="button" onClick={() => desvincular(sec.key)} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-[13px] font-semibold rounded-lg transition-colors border border-white/10">
                      <Link2Off size={14} /> Personalizar para este producto
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                      <span className="text-[13px] font-medium text-white/80">Mostrar sección</span>
                      <button type="button" onClick={() => alternar(sec.key)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${activa ? 'bg-green-500' : 'bg-white/20'}`}>
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${activa ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className={activa ? 'opacity-100' : 'opacity-40 pointer-events-none'}>
                      {RENDERERS[sec.key] ? RENDERERS[sec.key](resuelta, sec.key) : <p className="text-xs italic text-white/40">Sin opciones avanzadas.</p>}
                    </div>

                    {esProducto && isPropia && (
                      <div className="pt-4 mt-2 border-t border-white/10 flex justify-end">
                        <button type="button" onClick={() => borrar(sec.key)} className="text-[12px] font-medium text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors">
                          <Trash2 size={13} /> Restaurar herencia
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
