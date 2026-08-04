import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Reemplazo de <select> para los filtros de la landing pública: el popup de
 * <option> nativo no respeta background-color en varios navegadores/SO (se
 * confirmó roto en Windows/Chrome incluso con las reglas CSS correctas), así
 * que acá el "popup" es una lista propia con las mismas variables --l-* del
 * resto de la landing.
 */
export default function LandingDropdown({ value, onChange, options }) {
  const [abierto, setAbierto] = useState(false);
  const raizRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    function alHacerClickFuera(e) {
      if (raizRef.current && !raizRef.current.contains(e.target)) setAbierto(false);
    }
    function alPresionarEscape(e) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('mousedown', alHacerClickFuera);
    document.addEventListener('keydown', alPresionarEscape);
    return () => {
      document.removeEventListener('mousedown', alHacerClickFuera);
      document.removeEventListener('keydown', alPresionarEscape);
    };
  }, [abierto]);

  const actual = options.find(o => o.value === value) || options[0];

  return (
    <div className="lp-dropdown" ref={raizRef}>
      <button
        type="button"
        className="lp-dropdown-btn"
        onClick={() => setAbierto(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <span>{actual?.label}</span>
        <ChevronDown size={14} className={`lp-dropdown-chevron${abierto ? ' abierto' : ''}`} />
      </button>
      {abierto && (
        <ul className="lp-dropdown-lista" role="listbox">
          {options.map(o => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`lp-dropdown-opcion${o.value === value ? ' selected' : ''}`}
              onClick={() => { onChange(o.value); setAbierto(false); }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
