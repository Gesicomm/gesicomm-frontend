/**
 * Busca el bug estructural de los bloques :root[data-theme='light'] escritos
 * a mano: aplicar un color de texto OSCURO a un elemento que conserva su
 * fondo de color de marca. Resultado: navy sobre navy.
 *
 *   node scripts/auditar-overrides.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const archivos = execSync('grep -rl "data-theme" src --include="*.css"', { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

// Un fondo "de marca": color sólido no-oscuro, gradiente, o token de acento.
const FONDO_MARCA = /background(-color)?:\s*(linear-gradient|var\(--(?:color-)?(?:primary|accent|vit-accent)|#(?![01][0-9a-f]{5})[0-9a-f]{6})/i;
// Texto oscuro del tema claro.
const TEXTO_OSCURO = /color:\s*var\(--color-fg[^)]*\)/i;

let hallazgos = 0;

for (const archivo of archivos) {
  const css = readFileSync(archivo, 'utf8');

  // Reglas base: selector -> cuerpo (fuera de los bloques data-theme).
  const base = new Map();
  for (const m of css.matchAll(/(^|\})\s*([^{}@]+?)\s*\{([^{}]*)\}/gm)) {
    const sel = m[2].trim().replace(/\s+/g, ' ');
    if (sel.startsWith(':root') || sel.startsWith('@')) continue;
    base.set(sel, (base.get(sel) || '') + m[3]);
  }

  // Reglas dentro del bloque light.
  const bloque = css.match(/:root\[data-theme=['"]light['"]\]\s*\{([\s\S]*?)\n\}/);
  if (!bloque) continue;

  for (const m of bloque[1].matchAll(/([^{}]+?)\s*\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const cuerpo = m[2];
    if (!TEXTO_OSCURO.test(cuerpo)) continue;
    // ¿el override también repinta el fondo? entonces está resuelto.
    if (/background/i.test(cuerpo)) continue;

    const cuerpoBase = base.get(sel);
    if (cuerpoBase && FONDO_MARCA.test(cuerpoBase)) {
      const bg = cuerpoBase.match(FONDO_MARCA)[0].trim();
      console.log(`  ${archivo}\n     ${sel}  →  texto oscuro, pero el fondo base es "${bg}"`);
      hallazgos++;
    }
  }
}

console.log(hallazgos ? `\n${hallazgos} reglas con texto oscuro sobre fondo de marca.` : '\nSin hallazgos.');
