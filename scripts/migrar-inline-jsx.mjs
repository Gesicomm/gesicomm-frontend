/**
 * Migra colores NEUTROS fijos escritos en estilos inline de JSX a tokens.
 *
 * Es la última categoría de deuda de tema oscuro: `style={{ color: '#fff' }}`
 * pisa cualquier clase, así que ni los tokens ni los overrides de tema le
 * ganan. Era lo que dejaba el título de Control de Pedidos invisible sobre
 * el fondo claro.
 *
 * Solo toca grises/blancos/negros (neutros). Los colores CON saturación son
 * semánticos —verde de éxito, rojo de error, ámbar de aviso, navy de marca—
 * y se dejan intactos.
 *
 *   node scripts/migrar-inline-jsx.mjs [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const APLICAR = process.argv.includes('--apply');

// La salida del comercio define su propio tema, no data-theme.
const EXCLUIDO = /\/templates\/|Publica\.jsx|Publico\.jsx|page-builder\/|Landing(Hero|ImageText|Social|BeforeAfter|CategoryStrip|Preview)\.jsx/;

const archivos = execSync('grep -rl "style={{" src --include="*.jsx"', { encoding: 'utf8' })
  .trim().split('\n').filter(f => f && !EXCLUIDO.test(f));

const rgb = (hex) => {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (hex) => {
  const c = rgb(hex); if (!c) return null;
  const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const neutro = (hex) => { const c = rgb(hex); return c ? Math.max(...c) - Math.min(...c) <= 22 : false; };

let total = 0;
for (const archivo of archivos) {
  const original = readFileSync(archivo, 'utf8');
  let n = 0;

  // Procesa cada objeto style={{...}} por separado, para poder mirar si el
  // MISMO elemento se pinta un fondo de color (ahí el texto claro es
  // intencional en los dos temas).
  const salida = original.replace(/style=\{\{([^{}]*)\}\}/g, (match, cuerpo) => {
    const bg = cuerpo.match(/(?:background|backgroundColor)\s*:\s*'(#[0-9a-fA-F]{3,6})'/);
    const gradiente = /(?:background|backgroundColor)\s*:\s*'[^']*gradient/i.test(cuerpo);
    const pintaColor = gradiente || (bg && !neutro(bg[1]));

    const nuevo = cuerpo.replace(
      /(background|backgroundColor|color)\s*:\s*'(#[0-9a-fA-F]{3,6})'/g,
      (m, prop, hex) => {
        if (!neutro(hex)) return m;              // semántico → intacto
        const L = lum(hex);
        if (L === null) return m;
        let token = null;

        if (prop === 'color') {
          if (L > 0.55)      token = pintaColor ? null : 'var(--color-fg)';
          else if (L > 0.18) token = 'var(--color-fg-muted)';
          else if (L > 0.05) token = 'var(--color-fg-subtle)';
        } else {
          if (L < 0.012)      token = 'var(--color-canvas)';
          else if (L < 0.022) token = 'var(--color-surface)';
          else if (L < 0.040) token = 'var(--color-surface-2)';
          else if (L < 0.060) token = 'var(--color-surface-3)';
        }

        if (!token) return m;
        n++;
        return `${prop}: '${token}'`;
      },
    );
    return `style={{${nuevo}}}`;
  });

  if (n) {
    if (APLICAR) writeFileSync(archivo, salida);
    console.log(`  ${String(n).padStart(3)}  ${archivo}`);
    total += n;
  }
}
console.log(`\n${APLICAR ? 'APLICADO' : 'SIMULACRO'}: ${total} colores inline neutros migrados.`);
