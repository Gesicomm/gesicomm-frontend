/**
 * Migra colores fijos del panel a tokens de tema — POR LUMINANCIA.
 *
 * La primera versión de este script usaba una lista blanca de hex
 * (#fff, #e0e0e0, …) y por eso se le escaparon #e5e5e5, #ddd, #bbb, #999,
 * #111, #0f111a… — justo los que dejaban los nombres de cliente lavados
 * sobre fondo blanco. Enumerar valores no escala: ahora se decide por la
 * luminancia real del color, que es la propiedad que importa.
 *
 * Regla:
 *   color:      claro  → --color-fg        (a menos que la regla pinte su
 *               medio   → --color-fg-muted   propio fondo de color, donde
 *               tenue   → --color-fg-subtle  el texto claro es correcto)
 *   background: oscuro → --color-canvas / --color-surface / -2 / -3
 *
 *   node scripts/migrar-colores-css.mjs [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const APLICAR = process.argv.includes('--apply');

// CSS del PANEL. Queda afuera la salida del comercio (landing pública,
// page-builder, templates) y el CSS de impresión, que es papel blanco.
const EXCLUIDOS = /landingPublica\.css|impresion-pedidos\.css|footer-builder|fitnessProductPage\.css/;

const archivos = execSync('grep -rl "" src --include="*.css"', { encoding: 'utf8' })
  .trim().split('\n').filter(f => f && !EXCLUIDOS.test(f));

function rgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminancia(hex) {
  const c = rgb(hex);
  if (!c) return null;
  const [r, g, b] = c.map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** ¿Es un gris/neutro? Los colores con saturación son semánticos (verde de
 *  éxito, rojo de error, azul de marca) y NO se tocan. */
function esNeutro(hex) {
  const c = rgb(hex);
  if (!c) return false;
  return Math.max(...c) - Math.min(...c) <= 22;
}

// La regla pinta su propio fondo de color de marca/semántico → el texto
// claro de adentro es intencional en los dos temas.
const FONDO_DE_COLOR = /background(-color)?:\s*(linear-gradient|radial-gradient|var\(--(?:color-)?(?:primary|accent|vit-accent))/i;

let total = 0;
for (const archivo of archivos) {
  let css;
  try { css = readFileSync(archivo, 'utf8'); } catch { continue; }
  let n = 0;

  const salida = css.replace(/\{([^{}]*)\}/g, (_m, cuerpo) => {
    let pintaColor = FONDO_DE_COLOR.test(cuerpo);
    // También cuenta como fondo de color un hex saturado y no oscuro.
    const bgHex = cuerpo.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,8})/);
    if (bgHex && !esNeutro(bgHex[1]) && (luminancia(bgHex[1]) ?? 0) > 0.06) pintaColor = true;

    const nuevo = cuerpo.replace(
      /(^|[\s;])(color|background|background-color)\s*:\s*(#[0-9a-fA-F]{3,8})(?=\s*[;}]|\s*!)/g,
      (m, pre, prop, hex) => {
        const L = luminancia(hex);
        if (L === null || !esNeutro(hex)) return m;
        let token = null;

        if (prop === 'color') {
          if (L > 0.55)      token = pintaColor ? null : 'var(--color-fg)';
          else if (L > 0.18) token = 'var(--color-fg-muted)';
          else if (L > 0.05) token = 'var(--color-fg-subtle)';
          // Más oscuro que eso es casi negro: suele ser texto sobre una
          // superficie clara puntual, se deja como está.
        } else {
          if (L < 0.012)      token = 'var(--color-canvas)';
          else if (L < 0.022) token = 'var(--color-surface)';
          else if (L < 0.040) token = 'var(--color-surface-2)';
          else if (L < 0.060) token = 'var(--color-surface-3)';
        }

        if (!token) return m;
        n++;
        return `${pre}${prop}: ${token}`;
      },
    );
    return `{${nuevo}}`;
  });

  if (n) {
    if (APLICAR) writeFileSync(archivo, salida);
    console.log(`  ${String(n).padStart(3)}  ${archivo}`);
    total += n;
  }
}
console.log(`\n${APLICAR ? 'APLICADO' : 'SIMULACRO'}: ${total} colores neutros fijos migrados a tokens.`);
