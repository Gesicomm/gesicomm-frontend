import React from 'react';

/** Input/textarea con label, compartido por los paneles del Lienzo en blanco (Ajustes, Secciones). */
export default function Campo({ etiqueta, ayuda, valor, onChange, multilinea }) {
  const Elemento = multilinea ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-fg/70 mb-1">{etiqueta}</span>
      <Elemento
        value={valor}
        onChange={e => onChange(e.target.value)}
        rows={multilinea ? 3 : undefined}
        className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-fg/30"
      />
      {ayuda && <span className="block mt-1 text-[11px] text-fg/35">{ayuda}</span>}
    </label>
  );
}
