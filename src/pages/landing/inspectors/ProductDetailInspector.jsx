import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
    <span className="text-sm font-medium text-[var(--vit-text)]">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="w-4 h-4 accent-[var(--vit-accent)]"
    />
  </label>
);

/**
 * Inspector del bloque "Detalle de Producto" — antes no tenía ninguno
 * (BLOQUES_SCHEMA no lo declaraba), así que no había forma de elegir qué
 * botones mostrar ni de qué lado va la galería. Todo vive en `config`
 * (settings_json), leído por ProductDetailBlock.jsx con los mismos
 * defaults que ya tenía hardcodeados (imagen a la izquierda, los 3
 * botones visibles) — una sección ya guardada sin estos campos se
 * comporta exactamente igual que antes.
 */
export default function ProductDetailInspector({ seccion, onUpdate }) {
  const config = seccion.config || {};
  const contenido = seccion.contenido || {};
  const bloques = contenido.bloques_info || [];

  const actualizar = (campo, valor) => {
    onUpdate(seccion.id, { config: { ...config, [campo]: valor } });
  };

  const actualizarBloques = (nuevos) => {
    onUpdate(seccion.id, { contenido: { ...contenido, bloques_info: nuevos } });
  };

  const agregarBloque = () => {
    actualizarBloques([...bloques, { titulo: '💎 Beneficios', items: [''] }]);
  };
  const quitarBloque = (idx) => {
    actualizarBloques(bloques.filter((_, i) => i !== idx));
  };
  const moverBloque = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= bloques.length) return;
    const nuevos = [...bloques];
    [nuevos[idx], nuevos[target]] = [nuevos[target], nuevos[idx]];
    actualizarBloques(nuevos);
  };
  const actualizarTituloBloque = (idx, titulo) => {
    const nuevos = [...bloques];
    nuevos[idx] = { ...nuevos[idx], titulo };
    actualizarBloques(nuevos);
  };
  const agregarItem = (idx) => {
    const nuevos = [...bloques];
    nuevos[idx] = { ...nuevos[idx], items: [...nuevos[idx].items, ''] };
    actualizarBloques(nuevos);
  };
  const actualizarItem = (idxBloque, idxItem, valor) => {
    const nuevos = [...bloques];
    const items = [...nuevos[idxBloque].items];
    items[idxItem] = valor;
    nuevos[idxBloque] = { ...nuevos[idxBloque], items };
    actualizarBloques(nuevos);
  };
  const quitarItem = (idxBloque, idxItem) => {
    const nuevos = [...bloques];
    nuevos[idxBloque] = { ...nuevos[idxBloque], items: nuevos[idxBloque].items.filter((_, i) => i !== idxItem) };
    actualizarBloques(nuevos);
  };

  const imagenPosicion = config.imagen_posicion || 'izquierda';
  const mostrarComprarAhora = config.mostrar_comprar_ahora !== false;
  const mostrarAgregarCarrito = config.mostrar_agregar_carrito !== false;
  const mostrarWhatsapp = config.mostrar_whatsapp !== false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Galería</h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => actualizar('imagen_posicion', 'izquierda')}
            className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${imagenPosicion === 'izquierda' ? 'border-[var(--vit-accent)] bg-[var(--vit-accent-soft)] text-[var(--vit-accent)]' : 'border-[var(--vit-border)] text-[var(--vit-muted)]'}`}
          >
            Fotos a la izquierda
          </button>
          <button
            type="button"
            onClick={() => actualizar('imagen_posicion', 'derecha')}
            className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${imagenPosicion === 'derecha' ? 'border-[var(--vit-accent)] bg-[var(--vit-accent-soft)] text-[var(--vit-accent)]' : 'border-[var(--vit-border)] text-[var(--vit-muted)]'}`}
          >
            Fotos a la derecha
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-2">Botones de compra</h4>
        <p className="text-xs text-[var(--vit-muted-2)] mb-2">
          Se muestran en este orden: Comprar ahora, Agregar al carrito, Consultar por WhatsApp. Desmarcá los que no quieras mostrar.
        </p>
        <div className="flex flex-col divide-y divide-[var(--vit-border)]">
          <Toggle label="Comprar ahora" checked={mostrarComprarAhora} onChange={v => actualizar('mostrar_comprar_ahora', v)} />
          <Toggle label="Agregar al carrito" checked={mostrarAgregarCarrito} onChange={v => actualizar('mostrar_agregar_carrito', v)} />
          <Toggle label="Consultar por WhatsApp" checked={mostrarWhatsapp} onChange={v => actualizar('mostrar_whatsapp', v)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between border-b border-[var(--vit-border)] pb-2 mb-3">
          <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Bloques de info (Beneficios, Qué incluye...)</h4>
          <button type="button" onClick={agregarBloque} className="text-xs text-[var(--vit-primary)] font-semibold flex items-center gap-1 hover:underline">
            <Plus size={12} /> Agregar bloque
          </button>
        </div>
        <p className="text-xs text-[var(--vit-muted-2)] mb-3">
          Van debajo del precio, dentro de la misma columna de compra — así como "💎 BENEFICIOS" o "📦 QUÉ INCLUYE" en una ficha de producto tipo Shopify.
        </p>

        {bloques.length === 0 && (
          <p className="text-sm text-[var(--vit-muted-2)] italic">Sin bloques todavía.</p>
        )}

        <div className="flex flex-col gap-3">
          {bloques.map((bloque, idxBloque) => (
            <div key={idxBloque} className="flex flex-col gap-2 p-3 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bloque.titulo}
                  onChange={e => actualizarTituloBloque(idxBloque, e.target.value)}
                  placeholder="Título del bloque (ej: 💎 Beneficios)"
                  className="flex-1 h-9 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm font-semibold focus:border-[var(--vit-accent)] focus:outline-none"
                />
                <button type="button" onClick={() => moverBloque(idxBloque, -1)} disabled={idxBloque === 0} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronUp size={14} /></button>
                <button type="button" onClick={() => moverBloque(idxBloque, 1)} disabled={idxBloque === bloques.length - 1} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronDown size={14} /></button>
                <button type="button" onClick={() => quitarBloque(idxBloque)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
              </div>

              <div className="flex flex-col gap-1.5 pl-2">
                {bloque.items.map((item, idxItem) => (
                  <div key={idxItem} className="flex items-center gap-2">
                    <span className="text-[var(--vit-muted)] text-sm">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={e => actualizarItem(idxBloque, idxItem, e.target.value)}
                      placeholder="Ítem de la lista..."
                      className="flex-1 h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                    />
                    <button type="button" onClick={() => quitarItem(idxBloque, idxItem)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => agregarItem(idxBloque)}
                  className="text-xs text-[var(--vit-primary)] font-semibold flex items-center gap-1 hover:underline mt-1 self-start"
                >
                  <Plus size={11} /> Agregar ítem
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
