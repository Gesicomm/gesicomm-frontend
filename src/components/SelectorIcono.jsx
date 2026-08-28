import React, { useState, useEffect, useRef } from 'react';
import { CATALOGO_ICONOS_BENEFICIOS, getIconoBeneficio } from '../pages/landing-simple/templates/iconosBeneficios';

export default function SelectorIcono({ valor, onChange, containerClassName = "relative shrink-0" }) {
  const [open, setOpen] = useState(false);
  const IconoSeleccionado = getIconoBeneficio(valor);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className={containerClassName} ref={containerRef}>
      <button
        type="button"
        className="grid place-items-center w-8 h-8 rounded-lg bg-fg/10 text-fg/70 hover:bg-fg/15 border border-fg/10 transition-colors"
        onClick={() => setOpen(!open)}
        title="Seleccionar ícono"
        style={{ color: 'var(--text-color)', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
      >
        <IconoSeleccionado size={14} />
      </button>

      {open && (
        <div 
          className="absolute z-50 p-2 border rounded-lg shadow-xl grid grid-cols-5 gap-1 w-48 max-h-56 overflow-y-auto"
          style={{ 
            top: '100%', 
            left: 0, 
            marginTop: '4px',
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-color)' 
          }}
        >
          {CATALOGO_ICONOS_BENEFICIOS.map(i => {
            const Icon = i.Icon;
            return (
              <button
                key={i.key}
                type="button"
                className={`p-1.5 flex items-center justify-center rounded transition-colors ${valor === i.key ? 'text-primary' : ''}`}
                style={{
                  backgroundColor: valor === i.key ? 'var(--bg-hover)' : 'transparent',
                  border: valor === i.key ? '1px solid var(--primary-color)' : '1px solid transparent'
                }}
                onClick={() => {
                  onChange(i.key);
                  setOpen(false);
                }}
                title={i.label}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
