/**
 * Migra clases Tailwind LITERALES de blanco (`text-white`, `bg-white/5`,
 * `border-white/10`, `placeholder:text-white/25`, …) a los tokens de tema.
 *
 * Por qué existía esta categoría todavía: la primera migración de este
 * tipo (texto/fondo/borde blanco → fg) corrió UNA sola vez, al principio,
 * contra el estado del código de ese momento, y después se borró (era un
 * script de un solo uso). Cualquier archivo escrito DESPUÉS de esa pasada
 * — como los paneles de ficha por rubro (Tech, Beauty), más nuevos que el
 * de Fitness — nunca la recibió. Las pasadas posteriores de esta sesión
 * (migrar-tema-total.mjs) sólo cubrían hex literales y arbitrarios de
 * Tailwind, no esta forma.
 *
 * Mismo criterio que en su momento: si el MISMO string de className trae
 * un fondo de marca/semántico (bg-primary, bg-[#hex-saturado], bg-red-500,
 * etc.), el blanco de ahí es intencional y se deja.
 *
 *   node scripts/migrar-tailwind-white.mjs [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const APLICAR = process.argv.includes('--apply');

const EXCLUIDO = /\/templates\/|Publica\.jsx|Publico\.jsx|page-builder\/|Landing(Hero|ImageText|Social|BeforeAfter|CategoryStrip|Preview)\.jsx/;

const MAPA = {
  text: 'fg',
  bg: 'fg',
  border: 'fg',
  placeholder: 'fg',
  ring: 'fg',
  divide: 'fg',
  from: 'fg',
  via: 'fg',
  to: 'fg',
};

// Fondo de marca/semántico DENTRO del mismo string → el blanco de al lado es a propósito.
const BG_DE_COLOR = /\bbg-(primary|accent|success|warning|danger|info|red|green|blue|orange|amber|emerald|teal|sky|indigo|violet|purple|pink|rose|yellow|lime|cyan)(-[a-z]+)?(-\d{2,3})?(\/\d+)?\b|\bbg-\[(?!#(?:0[0-9a-f]{5}|1[0-9a-f]{5})\]|rgba?\(0,\s*0,\s*0)/;

const archivos = execSync('grep -rl "" src --include="*.jsx"', { encoding: 'utf8' })
  .trim().split('\n').filter((f) => f && !EXCLUIDO.test(f));

let total = 0;
const porArchivo = [];

for (const archivo of archivos) {
  const original = readFileSync(archivo, 'utf8');
  let n = 0;

  // Opera sobre cada string entre comillas (className="...", o el interior
  // de un template literal simple) para poder mirar si trae fondo de marca.
  const salida = original.replace(/(["'`])([^"'`]*?)\1/g, (m, q, contenido) => {
    if (!/\b(text|bg|border|placeholder:text|ring|divide|from|via|to)-white\b/.test(contenido)) return m;
    const pinta = BG_DE_COLOR.test(contenido);

    const nuevo = contenido.replace(
      /\b(text|bg|border|placeholder:text|ring|divide|from|via|to)-white(\/\d{1,3})?\b/g,
      (mm, prefijo, opacidad) => {
        const base = prefijo.replace('placeholder:text', 'placeholder:text');
        const esTexto = /text$/.test(prefijo);
        if (esTexto && pinta) return mm; // texto blanco sobre fondo de marca: intencional
        n++;
        return `${base}-fg${opacidad || ''}`;
      },
    );
    return q + nuevo + q;
  });

  if (salida !== original) {
    if (APLICAR) writeFileSync(archivo, salida);
    porArchivo.push([archivo, n]);
    total += n;
  }
}

porArchivo.sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log(`  ${String(n).padStart(3)}  ${f}`));
console.log(`\n${APLICAR ? 'APLICADO' : 'SIMULACRO'}: ${total} clases blanco->fg migradas en ${porArchivo.length} archivos.`);
