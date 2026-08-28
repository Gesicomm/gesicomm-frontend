/**
 * Pasada EXHAUSTIVA de colores fijos → tokens de tema.
 *
 * Las pasadas anteriores fallaron por ir tapando casos de a uno. Ésta parte
 * de enumerar todas las formas en que se escribe un color en este código:
 *
 *   1. propiedad de estilo:  color: '#fff'   |   color: "#888"
 *   2. atributo JSX:         color="#888"    |   fill="#fff"
 *   3. velo blanco:          rgba(255,255,255,α)
 *   4. Tailwind arbitrario:  text-[#f1f5f9]
 *
 * y de un único criterio, en vez de listas de hex:
 *
 *   - Sólo se tocan colores NEUTROS (saturación ≤ 22). Los saturados son
 *     semánticos (verde de éxito, rojo, ámbar, navy de marca) y se dejan.
 *   - Se clasifican por LUMINANCIA: claro → fg, medio → muted, tenue →
 *     subtle; fondos oscuros → canvas/surface/-2/-3.
 *   - Si la MISMA línea pinta un fondo de color, el texto claro es
 *     intencional en ambos temas y no se toca.
 *
 * Queda afuera la salida del comercio (templates, landing pública,
 * page-builder) y el CSS de impresión: ahí el tema no es data-theme.
 *
 *   node scripts/migrar-tema-total.mjs [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const APLICAR = process.argv.includes('--apply');

const EXCLUIDO = /\/templates\/|Publica\.jsx|Publico\.jsx|page-builder\/|Landing(Hero|ImageText|Social|BeforeAfter|CategoryStrip|Preview)\.jsx|landingPublica\.css|impresion-pedidos\.css|fitnessProductPage\.css|footer-builder/;

const rgb = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (h) => {
  const c = rgb(h); if (!c) return null;
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const neutro = (h) => { const c = rgb(h); return c ? Math.max(...c) - Math.min(...c) <= 22 : false; };

/** Token para un color de TEXTO neutro, según su luminancia. */
function tokenTexto(L) {
  if (L > 0.55) return 'var(--color-fg)';
  if (L > 0.18) return 'var(--color-fg-muted)';
  if (L > 0.05) return 'var(--color-fg-subtle)';
  return null; // casi negro: suele ser texto sobre una superficie clara puntual
}
/** Token para un FONDO neutro oscuro. */
function tokenFondo(L) {
  if (L < 0.012) return 'var(--color-canvas)';
  if (L < 0.022) return 'var(--color-surface)';
  if (L < 0.040) return 'var(--color-surface-2)';
  if (L < 0.060) return 'var(--color-surface-3)';
  return null;
}
/** ¿La línea pinta un fondo de color propio? Entonces el blanco es a propósito. */
function lineaPintaColor(linea) {
  if (/gradient/i.test(linea)) return true;
  const m = linea.match(/(?:background|backgroundColor)\s*[:=]\s*['"]?(#[0-9a-fA-F]{3,8})/);
  return !!(m && !neutro(m[1]));
}

const archivos = execSync('grep -rl "" src --include="*.jsx" --include="*.css"', { encoding: 'utf8' })
  .trim().split('\n').filter((f) => f && !EXCLUIDO.test(f));

let tot = { estilo: 0, attr: 0, velo: 0, tw: 0 };

for (const archivo of archivos) {
  const original = readFileSync(archivo, 'utf8');
  const esCss = archivo.endsWith('.css');

  const salida = original.split('\n').map((linea) => {
    const pinta = lineaPintaColor(linea);
    let l = linea;

    // (1) propiedad de estilo — CSS y JSX, comillas simples o dobles
    l = l.replace(
      /(^|[\s;{,])(color|background|background-color|backgroundColor|border-color|borderColor|borderTopColor|borderBottomColor)(\s*[:=]\s*)(['"]?)(#[0-9a-fA-F]{3,8})\4/g,
      (m, pre, prop, sep, q, hex) => {
        if (!neutro(hex)) return m;
        const L = lum(hex); if (L === null) return m;
        const esTexto = /^color$/i.test(prop);
        const t = esTexto ? (pinta ? null : tokenTexto(L)) : tokenFondo(L);
        if (!t) return m;
        tot.estilo++;
        return `${pre}${prop}${sep}${q}${t}${q}`;
      },
    );

    // (2) atributo JSX: color="#888" / fill="#fff" / stroke="#aaa"
    if (!esCss) {
      l = l.replace(/\b(color|fill|stroke)=(\{?)(['"])(#[0-9a-fA-F]{3,8})\3/g, (m, prop, llave, q, hex) => {
        if (!neutro(hex)) return m;
        const L = lum(hex); if (L === null) return m;
        const t = pinta ? null : tokenTexto(L);
        if (!t) return m;
        tot.attr++;
        return `${prop}=${llave}${q}${t}${q}`;
      });
    }

    // (3) velos blancos → tinta del tema
    l = l.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0?\.\d+)\s*\)/g, (m, a) => {
      if (parseFloat(a) > 0.5) return m;
      tot.velo++;
      return `color-mix(in srgb, var(--color-fg) ${+(parseFloat(a) * 100).toFixed(1)}%, transparent)`;
    });

    // (4) valor arbitrario de Tailwind
    if (!esCss) {
      l = l.replace(/\b(text|bg|border|ring|fill|stroke)(-[a-z]+)?-\[(#[0-9a-fA-F]{3,8})\]/g, (m, tipo, mod, hex) => {
        if (!neutro(hex)) return m;
        const L = lum(hex); if (L === null) return m;
        const esTexto = tipo === 'text';
        const t = esTexto ? (pinta ? null : tokenTexto(L)) : tokenFondo(L);
        if (!t) return m;
        tot.tw++;
        // Traduce el token a la utilidad equivalente (más limpio que el arbitrario).
        const util = t.replace('var(--color-', '').replace(')', '');
        return `${tipo}${mod || ''}-${util}`;
      });
    }

    return l;
  }).join('\n');

  // Dentro de un valor arbitrario de Tailwind los espacios rompen la sintaxis.
  const final = salida.replace(
    /\b((?:bg|text|border|ring|from|to|via|shadow|fill|stroke)(?:-[a-z]+)?)-\[([^\]]*(?:color-mix|rgba?\()[^\]]*)\]/g,
    (m, pre, val) => `${pre}-[${val.replace(/\s+/g, '_')}]`,
  );

  if (final !== original && APLICAR) writeFileSync(archivo, final);
}

console.log(`${APLICAR ? 'APLICADO' : 'SIMULACRO'}:`);
console.log(`  propiedades de estilo : ${tot.estilo}`);
console.log(`  atributos JSX         : ${tot.attr}`);
console.log(`  velos blancos         : ${tot.velo}`);
console.log(`  arbitrarios Tailwind  : ${tot.tw}`);
console.log(`  TOTAL                 : ${tot.estilo + tot.attr + tot.velo + tot.tw}`);
