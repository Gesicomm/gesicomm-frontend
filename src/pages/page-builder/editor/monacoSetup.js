/**
 * Monaco AUTOHOSPEDADO.
 *
 * Por defecto, @monaco-editor/react baja Monaco de un CDN (jsdelivr) en
 * tiempo de ejecución. Eso mete una dependencia externa en el dashboard:
 * el editor deja de funcionar sin internet o si el CDN está bloqueado, y
 * agrega un tercero al que no le controlamos las versiones. `loader.config`
 * de abajo lo apunta al paquete de node_modules, que Vite empaqueta.
 *
 * Los workers se importan con `?worker` (sintaxis de Vite): Monaco corre
 * el análisis de cada lenguaje en un hilo aparte. Sin esto los tira al
 * hilo principal y tipear en un archivo grande se traba.
 *
 * ⚠️ La ruta va SIN el prefijo "esm/vs/" y CON la extensión .js. El
 * package.json de monaco-editor 0.56 declara `exports` con el patrón
 * "./*.js" → "./esm/vs/*.js", así que el prefijo lo agrega el propio
 * paquete; escribirlo a mano hace que Rollup no resuelva el import.
 *
 * Solo se cargan los tres lenguajes que usa el editor. El worker de
 * TypeScript es el que Monaco usa también para JavaScript.
 *
 * Este módulo se importa dinámicamente desde CodeArea.jsx, así que todo
 * este peso (~2 MB) queda en su propio chunk y no entra al bundle
 * principal del dashboard.
 */

import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

import editorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import htmlWorker from 'monaco-editor/language/html/html.worker.js?worker';
import cssWorker from 'monaco-editor/language/css/css.worker.js?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker';

// ⚠️ En monaco-editor 0.56 `htmlDefaults`/`cssDefaults` YA NO cuelgan de
// `monaco.languages.html`/`.css` (eso era la API de versiones viejas).
// Ahora son exports nombrados del propio módulo de contribución del
// lenguaje. Hacer `monaco.languages.html.htmlDefaults` revienta con
// "Cannot read properties of undefined" porque ese namespace no existe.
import { htmlDefaults } from 'monaco-editor/language/html/monaco.contribution.js';
import { cssDefaults } from 'monaco-editor/language/css/monaco.contribution.js';

// Fragmentos, no documentos completos: el código del usuario suele venir
// sin <html>/<head>, y la validación de Monaco lo llenaría de errores
// falsos. El que decide qué es válido de verdad es el sanitizador del
// servidor (landingCodigo.service.js), no el editor.
htmlDefaults.setOptions({ validate: false });
cssDefaults.setOptions({ validate: false });

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'javascript' || label === 'typescript') return new tsWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });

/**
 * Tema propio, alineado con los tokens de color del dashboard. Sin esto
 * Monaco pinta su gris estándar y el editor se ve pegado con cinta al
 * resto de la app.
 */
export const TEMA_OSCURO = 'gesicomm-oscuro';
export const TEMA_CLARO = 'gesicomm-claro';

monaco.editor.defineTheme(TEMA_OSCURO, {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#0a0e1a',
    'editorGutter.background': '#0a0e1a',
    'editorLineNumber.foreground': '#4b5573',
    'editorLineNumber.activeForeground': '#a3a8b8',
    'editor.lineHighlightBackground': '#10152a',
    'editorCursor.foreground': '#7d9bd6',
  },
});

monaco.editor.defineTheme(TEMA_CLARO, {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#f7f7f5',
    'editorGutter.background': '#f7f7f5',
  },
});

export default monaco;
