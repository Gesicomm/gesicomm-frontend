import React, { useState } from 'react';
import { Box, ImageOff, Layers, GripVertical } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import CurrencyInput from '../../../components/CurrencyInput';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors';
const CAMPO_CHICO = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors';

function formatGs(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 });
}

/**
 * Editor de la sección "Productos destacados" de la página de INICIO —
 * separado del editor del Catálogo (panels/CatalogoPanel.jsx).
 *
 * Acá NO se agregan ni quitan productos de la landing (eso es Catálogo):
 * solo se elige cuáles de los que ya están en el catálogo se muestran
 * además en el inicio. Así el comercio decide explícitamente dónde
 * aparece cada uno (solo catálogo, o catálogo + inicio) en vez de que se
 * publiquen solos al agregarlos.
 *
 * Etiqueta, precio ancla y orden viven acá TAMBIÉN (no solo en Catálogo):
 * son las mismas columnas del mismo LandingItem, así que editarlas desde
 * cualquiera de los dos lados actualiza lo mismo — pero al separar
 * Catálogo/Destacados en dos pestañas, dejar esto solo del lado de
 * Catálogo hacía parecer que la función había desaparecido al entrar acá,
 * que es justo donde el comercio decide el orden y las etiquetas de lo que
 * se ve en el inicio.
 */
export default function DestacadosPanel({ items, catalogo, onChange, draft, onCampo }) {
  const [arrastrando, setArrastrando] = useState(null);
  const [encima, setEncima] = useState(null);
  const [habilitada, setHabilitada] = useState(null);

  const porClave = new Map();
  (catalogo?.productos || []).forEach(p => porClave.set(`producto:${p.id}`, p));
  (catalogo?.combos || []).forEach(c => porClave.set(`combo:${c.id}`, c));

  const filas = (items || []).map((it, idx) => ({
    idx,
    item: it,
    entidad: porClave.get(`${it.tipo}:${it.referencia_id}`),
  }));

  const cantidadEnInicio = filas.filter(f => f.item.mostrar_en_inicio === true).length;

  function alternar(idx, mostrar) {
    onChange(items.map((it, i) => (i === idx ? { ...it, mostrar_en_inicio: mostrar } : it)));
  }

  function todos(mostrar) {
    onChange(items.map(it => ({ ...it, mostrar_en_inicio: mostrar })));
  }

  function cambiarEtiqueta(idx, etiqueta) {
    onChange(items.map((it, i) => (i === idx ? { ...it, etiqueta } : it)));
  }

  function cambiarPrecioAncla(idx, precio_ancla) {
    onChange(items.map((it, i) => (i === idx ? { ...it, precio_ancla } : it)));
  }

  function soltar(destino) {
    if (arrastrando !== null && arrastrando !== destino) {
      const copia = [...items];
      const [movida] = copia.splice(arrastrando, 1);
      copia.splice(destino, 0, movida);
      onChange(copia);
    }
    setArrastrando(null);
    setEncima(null);
    setHabilitada(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-white/40 leading-relaxed">
        Elegí cuáles de los productos de tu <strong className="text-white/70">Catálogo</strong> se muestran también en la
        página de <strong className="text-white/70">inicio</strong>. Los que dejes sin marcar siguen estando en el catálogo.
        La etiqueta y el precio ancla que pongas acá son los mismos del catálogo (es el mismo producto en la misma landing).
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-white/70">Título de la sección en el inicio</label>
        <input
          type="text"
          value={draft?.productos_titulo || ''}
          onChange={e => onCampo?.('productos_titulo', e.target.value)}
          placeholder="Productos destacados"
          className={CAMPO}
        />
      </div>

      {filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 py-10 px-4 text-center flex flex-col items-center gap-2">
          <Box size={26} className="text-white/20" />
          <p className="text-sm font-semibold text-white/70">Todavía no hay productos</p>
          <p className="text-xs text-white/40">Agregalos primero en la pestaña "Catálogo".</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70">
              En el inicio: {cantidadEnInicio} de {filas.length}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => todos(true)} className="text-[11px] font-semibold text-white/50 hover:text-white underline underline-offset-2">Todos</button>
              <button type="button" onClick={() => todos(false)} className="text-[11px] font-semibold text-white/50 hover:text-white underline underline-offset-2">Ninguno</button>
            </div>
          </div>

          {filas.map(({ idx, item, entidad }) => {
            const activo = item.mostrar_en_inicio === true;
            return (
              <div
                key={`${item.tipo}:${item.referencia_id}`}
                className={`rounded-lg p-2.5 flex flex-col gap-2.5 transition-colors border ${arrastrando === idx ? 'opacity-40' : ''} ${encima === idx && arrastrando !== idx ? 'border-emerald-400' : activo ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-white/10 bg-white/[0.02]'}`}
                draggable={habilitada === idx}
                onDragStart={() => setArrastrando(idx)}
                onDragOver={(e) => { e.preventDefault(); setEncima(idx); }}
                onDrop={() => soltar(idx)}
                onDragEnd={() => { setArrastrando(null); setEncima(null); setHabilitada(null); }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="shrink-0 text-white/30 hover:text-white/60 cursor-grab"
                    onMouseDown={() => setHabilitada(idx)}
                    onMouseUp={() => setHabilitada(null)}
                    title="Arrastrar para reordenar"
                  >
                    <GripVertical size={14} />
                  </span>
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={e => alternar(idx, e.target.checked)}
                    className="shrink-0 cursor-pointer"
                    title="Mostrar en el inicio"
                  />
                  <div className="w-9 h-9 shrink-0 rounded-md overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center text-white/30">
                    {entidad?.imagen ? (
                      <img src={getMediaUrl(entidad.imagen)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      item.tipo === 'combo' ? <Layers size={14} /> : <ImageOff size={14} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{entidad?.nombre || '(ya no disponible)'}</p>
                    <p className="text-[11px] text-white/40">Gs {formatGs(entidad?.precio_efectivo ?? entidad?.precio_base)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-9">
                  <input
                    type="text"
                    value={item.etiqueta || ''}
                    onChange={e => cambiarEtiqueta(idx, e.target.value)}
                    placeholder="Etiqueta (ej: Ofertas)"
                    className={CAMPO_CHICO}
                  />
                  <CurrencyInput
                    value={item.precio_ancla || ''}
                    onChange={val => cambiarPrecioAncla(idx, val)}
                    placeholder="Precio ancla (tachado)"
                    className={CAMPO_CHICO}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
