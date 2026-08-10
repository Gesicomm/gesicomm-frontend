import React, { useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import { BLOQUES_SCHEMA, CATEGORIAS_SECCION } from './BloquesSchema';

export default function SelectorSecciones({ isOpen, onClose, onAdd, seccionesActuales }) {
  const [busqueda, setBusqueda] = useState('');

  const tiposPresentes = useMemo(() => (
    new Set((seccionesActuales || []).map(s => s.tipo))
  ), [seccionesActuales]);

  const bloquesDisponibles = useMemo(() => (
    Object.values(BLOQUES_SCHEMA).filter(schema => !(schema.singleton && tiposPresentes.has(schema.type)))
  ), [tiposPresentes]);

  const grupos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return CATEGORIAS_SECCION
      .map(cat => ({
        ...cat,
        bloques: bloquesDisponibles.filter(schema => (
          schema.categoria === cat.id && (!texto || schema.name.toLowerCase().includes(texto))
        )),
      }))
      .filter(grupo => grupo.bloques.length > 0);
  }, [bloquesDisponibles, busqueda]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-[var(--vit-card-bg)] shadow-xl">
      <div className="flex items-center justify-between border-b border-[var(--vit-border)] p-4">
        <h3 className="font-semibold text-[var(--vit-text)]">Agregar sección</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--vit-muted)] hover:bg-[var(--vit-surface)] hover:text-[var(--vit-text)]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="border-b border-[var(--vit-border)] p-3">
        <div className="flex items-center gap-2 rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] px-2.5 py-2">
          <Search size={14} className="text-[var(--vit-muted)] flex-shrink-0" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar sección..."
            className="w-full bg-transparent text-sm text-[var(--vit-text)] placeholder:text-[var(--vit-muted-2)] focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {grupos.length === 0 ? (
          <p className="p-4 text-center text-sm text-[var(--vit-muted)]">
            No encontramos ninguna sección para "{busqueda}".
          </p>
        ) : (
          grupos.map(grupo => (
            <div key={grupo.id} className="mb-4">
              <span className="mb-2 block px-1 text-xs font-semibold uppercase tracking-wider text-[var(--vit-muted)]">
                {grupo.label}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {grupo.bloques.map(schema => {
                  const Icono = schema.icon;
                  return (
                    <button
                      key={schema.type}
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[var(--vit-border)] bg-[var(--vit-surface)] p-4 text-center transition-all hover:border-[var(--vit-accent)] hover:bg-[var(--vit-card-bg)]"
                      onClick={() => onAdd(schema.type)}
                    >
                      <Icono size={24} className="text-[var(--vit-accent)]" />
                      <span className="text-xs font-medium text-[var(--vit-text)]">{schema.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
