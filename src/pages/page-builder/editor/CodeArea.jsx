import React, { Suspense, lazy, useEffect, useState } from 'react';

/**
 * El área donde se escribe el código.
 *
 * Interfaz: { value, onChange, lenguaje, placeholder }. Nadie más sabe
 * qué hay adentro — esa indirección es toda la razón por la que este
 * componente existe: el editor se terminó y se probó de punta a punta con
 * un <textarea>, y meter Monaco fue cambiar SOLO este archivo.
 *
 * Monaco pesa ~2 MB, así que va en un chunk aparte con lazy(): el
 * dashboard no lo descarga hasta que alguien abre una página del builder.
 * Mientras llega se muestra el textarea, que ya es usable — no una
 * pantalla vacía con un spinner.
 */

const MonacoArea = lazy(() => import('./MonacoArea'));

function TextareaArea({ value, onChange, lenguaje, placeholder }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      data-lenguaje={lenguaje}
      className="h-full w-full resize-none bg-canvas p-4 font-mono text-[13px] leading-relaxed text-fg outline-none"
      style={{ border: 0, tabSize: 2, whiteSpace: 'pre', overflow: 'auto' }}
    />
  );
}

export default function CodeArea(props) {
  // Monaco solo existe en el navegador (usa Web Workers), y montarlo en
  // el primer render pelea con la hidratación del layout.
  const [enNavegador, setEnNavegador] = useState(false);
  useEffect(() => { setEnNavegador(true); }, []);

  if (!enNavegador) return <TextareaArea {...props} />;

  return (
    <Suspense fallback={<TextareaArea {...props} />}>
      <MonacoArea {...props} />
    </Suspense>
  );
}
