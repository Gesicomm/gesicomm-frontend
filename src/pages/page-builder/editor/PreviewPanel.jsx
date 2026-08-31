import React, { useCallback, useState } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw, AlertTriangle } from 'lucide-react';
import CodigoPreview from '../../landing-simple/CodigoPreview';

/**
 * El preview del editor.
 *
 * Usa CodigoPreview — EL MISMO componente que renderiza la página
 * publicada. No hay dos renderers: lo que se ve acá es exactamente lo que
 * va a ver el visitante, salvo lo que el sanitizador le quite al guardar.
 *
 * El iframe tiene alto fijo y scrollea por dentro en vez de crecer con su
 * contenido: así `100vh`, `position: fixed` y un header pegajoso escritos
 * por el usuario se comportan igual que en una página suelta.
 */

const ANCHOS = { desktop: '100%', tablet: '768px', mobile: '390px' };

const VIEWPORTS = [
  { clave: 'desktop', icono: Monitor, titulo: 'Escritorio' },
  { clave: 'tablet', icono: Tablet, titulo: 'Tablet' },
  { clave: 'mobile', icono: Smartphone, titulo: 'Celular' },
];

export default function PreviewPanel({ codigo, titulo }) {
  const [viewport, setViewport] = useState('desktop');
  const [errorRuntime, setErrorRuntime] = useState('');
  // Cambiar la key remonta el iframe: es la forma de volver a correr el
  // JavaScript del usuario sin tocarle el código.
  const [generacion, setGeneracion] = useState(0);

  const alError = useCallback((mensaje) => setErrorRuntime(mensaje), []);

  function refrescar() {
    setErrorRuntime('');
    setGeneracion(g => g + 1);
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-surface-2">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
          {VIEWPORTS.map(({ clave, icono: Icono, titulo: t }) => (
            <button
              key={clave}
              type="button"
              onClick={() => setViewport(clave)}
              title={t}
              aria-pressed={viewport === clave}
              className={`rounded-md p-1.5 transition-colors ${
                viewport === clave
                  ? 'bg-primary text-primary-fg'
                  : 'text-fg-muted hover:bg-surface-3 hover:text-fg'
              }`}
            >
              <Icono size={16} />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={refrescar}
          title="Volver a ejecutar el JavaScript"
          className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {errorRuntime && (
        <div
          className="flex items-start gap-2 border-b border-border px-3 py-2 text-xs"
          style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)' }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-danger)' }} />
          <span className="text-fg">
            Error al ejecutar el JavaScript: <code className="font-mono">{errorRuntime}</code>
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 justify-center overflow-hidden p-3">
        <div
          className={`h-full overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-all ${viewport === 'desktop' ? 'w-full' : ''}`}
          style={{ width: viewport === 'desktop' ? undefined : ANCHOS[viewport], maxWidth: '100%' }}
        >
          <CodigoPreview
            key={generacion}
            codigo={codigo}
            titulo={titulo}
            onError={alError}
          />
        </div>
      </div>
    </div>
  );
}
