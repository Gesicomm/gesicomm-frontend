import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { CATALOGO_ICONOS_BENEFICIOS, getIconoBeneficio } from '../templates/iconosBeneficios';

/**
 * Elegir el ícono de un beneficio, garantía o mensaje de la barra.
 *
 * Antes era un <select> que mostraba el NOMBRE de la categoría ("Seguridad",
 * "Envío"). Ese nombre no se publica en ningún lado — es solo una etiqueta
 * del catálogo — pero se comía unos 100px de una fila angosta y dejaba el
 * campo de título recortado en "Rendi…". Acá el control muestra únicamente
 * el ícono, que es lo que el comercio realmente está eligiendo, y el nombre
 * aparece al pasar el mouse o al abrir la grilla.
 *
 * Accesible: el botón se enfoca con Tab, Enter/Espacio abre, Escape cierra y
 * devuelve el foco, y cada opción anuncia su nombre.
 */
export default function IconoPicker({ valor, onChange, titulo = 'Ícono' }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const contenedor = useRef(null);
  const boton = useRef(null);
  const Actual = getIconoBeneficio(valor);
  const nombreActual = CATALOGO_ICONOS_BENEFICIOS.find(i => i.key === valor)?.label;

  const iconosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return CATALOGO_ICONOS_BENEFICIOS;
    return CATALOGO_ICONOS_BENEFICIOS.filter(({ key, label, keywords = '' }) => (
      `${key} ${label} ${keywords}`.toLowerCase().includes(q)
    ));
  }, [busqueda]);

  useEffect(() => {
    if (!abierto) return undefined;
    const alClickear = (e) => {
      if (!contenedor.current?.contains(e.target)) setAbierto(false);
    };
    const alTeclear = (e) => {
      if (e.key !== 'Escape') return;
      setAbierto(false);
      boton.current?.focus();
    };
    // `true` = fase de captura: si no, un click dentro de otro popover que
    // detiene la propagación dejaría este abierto para siempre.
    document.addEventListener('mousedown', alClickear, true);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClickear, true);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  function elegir(key) {
    onChange(key || null);
    setAbierto(false);
    boton.current?.focus();
  }

  return (
    <span className="relative shrink-0" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto(v => !v)}
        aria-haspopup="true"
        aria-expanded={abierto}
        title={nombreActual ? `${titulo}: ${nombreActual}` : `Elegir ${titulo.toLowerCase()}`}
        className={`grid place-items-center w-8 h-8 rounded-lg border transition-colors ${
          abierto
            ? 'border-primary text-primary-text bg-fg/10'
            : 'border-fg/15 text-fg/70 bg-fg/5 hover:text-fg hover:border-fg/30'
        }`}
      >
        <Actual size={15} />
        <span className="sr-only">{nombreActual ? `Ícono: ${nombreActual}` : 'Elegir ícono'}</span>
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label={`Elegir ${titulo.toLowerCase()}`}
          className="absolute z-30 top-full left-0 mt-1.5 p-2 rounded-xl border border-fg/15 bg-canvas shadow-xl w-[300px]"
        >
          <label className="flex items-center gap-2 h-8 px-2 mb-2 rounded-lg border border-fg/10 bg-fg/5 text-fg/55 focus-within:border-primary/60 focus-within:text-fg">
            <Search size={14} />
            <input
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar icono..."
              className="min-w-0 flex-1 bg-transparent outline-none text-[12px] text-fg placeholder:text-fg/35"
            />
          </label>

          <div className="max-h-[292px] overflow-y-auto pr-1">
            {iconosFiltrados.length > 0 ? (
              <div className="grid grid-cols-8 gap-1" role="listbox" aria-label={`Opciones de ${titulo.toLowerCase()}`}>
                {iconosFiltrados.map(({ key, label, Icon }) => {
                  const elegido = key === valor;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={elegido}
                      title={label}
                      onClick={() => elegir(key)}
                      className={`grid place-items-center h-8 rounded-lg transition-colors ${
                        elegido
                          ? 'bg-primary/15 text-primary-text ring-1 ring-primary'
                          : 'text-fg/60 hover:bg-fg/10 hover:text-fg'
                      }`}
                    >
                      <Icon size={15} />
                      <span className="sr-only">{label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-[11px] text-fg/45">
                No hay iconos para “{busqueda.trim()}”.
              </p>
            )}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-fg/10 flex items-center justify-between gap-2">
            <span className="text-[10px] text-fg/40 truncate">{nombreActual || 'Sin ícono'}</span>
            {valor && (
              <button
                type="button"
                onClick={() => elegir(null)}
                className="text-[10px] font-semibold text-fg/45 hover:text-fg shrink-0"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
