import React, { useMemo, useState } from 'react';
import { X, Search, ChevronLeft } from 'lucide-react';
import { BLOQUES_SCHEMA, CATEGORIAS_SECCION } from './BloquesSchema';
import TemplateThumbnails from './TemplateThumbnails'; // We will create this

export default function SelectorSecciones({ isOpen, onClose, onAdd, seccionesActuales }) {
  const [busqueda, setBusqueda] = useState('');
  const [selectedType, setSelectedType] = useState(null);

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

  const handleClose = () => {
    setBusqueda('');
    setSelectedType(null);
    onClose();
  };

  const handleSelectType = (schema) => {
    // If it has templates, go to step 2. Else add immediately.
    if (schema.templates && schema.templates.length > 0) {
      setSelectedType(schema);
    } else {
      onAdd(schema.type);
      handleClose();
    }
  };

  const handleSelectTemplate = (templateId) => {
    onAdd(selectedType.type, templateId);
    handleClose();
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-[var(--vit-card-bg)] shadow-xl">
      <div className="flex items-center justify-between border-b border-[var(--vit-border)] p-4">
        <div className="flex items-center gap-2">
          {selectedType && (
            <button onClick={() => setSelectedType(null)} className="rounded p-1 hover:bg-[var(--vit-surface)]">
              <ChevronLeft size={18} />
            </button>
          )}
          <h3 className="font-semibold text-[var(--vit-text)]">
            {selectedType ? `Elegí un diseo` : `Agregar seccin`}
          </h3>
        </div>
        <button
          onClick={handleClose}
          className="rounded p-1 text-[var(--vit-muted)] hover:bg-[var(--vit-surface)] hover:text-[var(--vit-text)]"
        >
          <X size={18} />
        </button>
      </div>

      {!selectedType && (
        <div className="border-b border-[var(--vit-border)] p-3">
          <div className="flex items-center gap-2 rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] px-2.5 py-2">
            <Search size={14} className="text-[var(--vit-muted)] flex-shrink-0" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar seccin..."
              className="w-full bg-transparent text-sm text-[var(--vit-text)] placeholder:text-[var(--vit-muted-2)] focus:outline-none"
              autoFocus
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {selectedType ? (
          <div>
            <div className="mb-4 text-center">
              <span className="text-sm font-medium text-[var(--vit-text)]">{selectedType.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {selectedType.templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl.id)}
                  className="group flex flex-col gap-2 rounded-lg border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 transition-all hover:border-[var(--vit-accent)] hover:bg-[var(--vit-card-bg)]"
                >
                  <div className="flex aspect-video w-full items-center justify-center rounded bg-[var(--vit-bg)] border border-[var(--vit-border)] overflow-hidden">
                    <TemplateThumbnails type={selectedType.type} templateId={tpl.id} />
                  </div>
                  <span className="text-center text-[10px] font-semibold text-[var(--vit-text)] group-hover:text-[var(--vit-accent)] leading-tight">
                    {tpl.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : grupos.length === 0 ? (
          <p className="p-4 text-center text-sm text-[var(--vit-muted)]">
            No encontramos ninguna seccin para "{busqueda}".
          </p>
        ) : (
          grupos.map(grupo => (
            <div key={grupo.id} className="mb-4">
              <span className="mb-2 block px-1 text-xs font-semibold uppercase tracking-wider text-[var(--vit-muted)]">
                {grupo.label}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {grupo.bloques.map(schema => {
                  const Icono = schema.icon;
                  return (
                    <button
                      key={schema.type}
                      className="group flex flex-col gap-2 rounded-lg border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-left transition-all hover:border-[var(--vit-accent)] hover:bg-[var(--vit-card-bg)]"
                      onClick={() => handleSelectType(schema)}
                    >
                      <div className="flex aspect-[16/9] w-full items-center justify-center rounded bg-[var(--vit-bg)] border border-[var(--vit-border)] overflow-hidden transition-transform group-hover:scale-[1.02]">
                        <TemplateThumbnails type={schema.type} templateId={schema.templates?.[0]?.id || 'default'} />
                      </div>
                      <div className="flex items-center gap-2 px-1 pb-0.5">
                        <Icono size={14} className="text-[var(--vit-accent)] shrink-0" />
                        <span className="text-[11px] font-semibold text-[var(--vit-text)] leading-tight">{schema.name}</span>
                      </div>
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
