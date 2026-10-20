import React from 'react';
const campo = 'mt-1 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg';
const directo = (_parte, _titulo, nodo) => nodo;
export default function ListaConfianzaProducto({ items, onCambiar, renderCampo = directo }) {
  const base = Array.isArray(items) ? items : [];
  const cambiar = (idx, campoItem, valor) => onCambiar('confianza', base.map((it, i) => (i === idx ? { ...it, [campoItem]: valor } : it)));
  const agregar = () => onCambiar('confianza', [...base, { icono: '', titulo: '', texto: '' }].slice(0, 6));
  const quitar = idx => onCambiar('confianza', base.filter((_, i) => i !== idx));
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
      <legend className="px-1 text-sm font-semibold text-fg">Tarjetas de confianza</legend>
      <p className="text-xs leading-relaxed text-fg-muted">El ícono es texto libre: podés pegar un símbolo, emoji o clase de ícono. No hay lista fija.</p>
      {base.length === 0 && <p className="text-xs text-fg-muted">Todavía no agregaste tarjetas de confianza.</p>}
      {base.map((item, idx) => (
        <div key={idx} className={`grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-2/70 p-2 ${renderCampo === directo ? 'sm:grid-cols-[82px_1fr_auto]' : ''}`}>
          {renderCampo('iconos', 'Ícono', <input className={campo} value={item.icono || ''} maxLength={40} placeholder="Ícono" aria-label={`Ícono ${idx + 1}`} onChange={e => cambiar(idx, 'icono', e.target.value)} />, item, idx)}
          <div className="grid grid-cols-1 gap-2">
          {renderCampo('nombre', 'Título de tarjeta', <input className={campo} value={item.titulo || ''} maxLength={70} placeholder="Título, ej: Compra protegida" onChange={e => cambiar(idx, 'titulo', e.target.value)} />, item, idx)}
          {renderCampo('texto', 'Texto de tarjeta', <input className={campo} value={item.texto || ''} maxLength={120} placeholder="Subtítulo, ej: Tu pago y tus datos están seguros." onChange={e => cambiar(idx, 'texto', e.target.value)} />, item, idx)}
          </div>
          <button type="button" onClick={() => quitar(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
        </div>
      ))}
      {base.length < 6 && <button type="button" onClick={agregar} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar tarjeta</button>}
    </fieldset>
  );
}
