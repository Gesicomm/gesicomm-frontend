import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
// El setup tiene que correr ANTES de montar el editor: apunta el loader a
// la copia local de Monaco y registra los workers y los temas.
import { TEMA_OSCURO, TEMA_CLARO } from './monacoSetup';

/**
 * Monaco, detrás de la misma interfaz que el <textarea> al que reemplaza
 * ({ value, onChange, lenguaje, placeholder }).
 *
 * Lo que se apagó a propósito:
 *  - minimap: en una pantalla partida al medio con el preview al lado, se
 *    come ancho útil y no aporta.
 *  - validación de HTML/CSS: el código del usuario suele ser un fragmento
 *    (sin <html> ni <head>) y Monaco lo marcaría lleno de errores falsos.
 *    El que decide qué es válido es el sanitizador del servidor.
 */
export default function MonacoArea({ value, onChange, lenguaje, placeholder }) {
  const [tema, setTema] = useState(TEMA_OSCURO);

  // El dashboard tiene tema claro y oscuro; el editor sigue al de la app.
  useEffect(() => {
    const raiz = document.documentElement;
    const leer = () => {
      const claro = raiz.getAttribute('data-theme') === 'light'
        || raiz.classList.contains('light');
      setTema(claro ? TEMA_CLARO : TEMA_OSCURO);
    };
    leer();
    const observador = new MutationObserver(leer);
    observador.observe(raiz, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observador.disconnect();
  }, []);

  return (
    <Editor
      height="100%"
      language={lenguaje || 'html'}
      theme={tema}
      value={value || ''}
      onChange={(v) => onChange(v ?? '')}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        tabSize: 2,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        renderLineHighlight: 'line',
        padding: { top: 12, bottom: 12 },
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        // El código pegado de afuera viene con la indentación que venga:
        // reformatearlo solo genera diffs enormes entre versiones.
        formatOnPaste: false,
        formatOnType: false,
      }}
      loading={
        <div className="flex h-full items-center justify-center bg-canvas text-xs text-fg-muted">
          Cargando el editor…
        </div>
      }
      onMount={(editor) => {
        // La validación de HTML/CSS se apaga en monacoSetup.js, que corre
        // antes de este onMount: `monaco.languages.html.htmlDefaults` NO
        // existe en esta versión de monaco-editor (ver el comentario ahí).
        if (placeholder && !value) editor.updateOptions({ placeholder });
      }}
    />
  );
}
