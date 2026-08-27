/**
 * Segunda pasada: colores de texto y fondos fijos del panel → tokens de tema.
 *
 * A diferencia de los velos (migrar-velos-css.mjs), acá NO se puede sustituir
 * a ciegas: `color:#fff` sobre un botón navy es correcto en los dos temas,
 * pero `color:#fff` sobre una superficie es invisible en claro. Por eso el
 * script parsea bloque por bloque y solo toca el texto claro cuando la regla
 * NO pinta un fondo de color propio.
 *
 *   node scripts/migrar-colores-css.mjs [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const APLICAR = process.argv.includes('--apply');

const ARCHIVOS = [
  'src/components/dashboard.css',
  'src/pages/productos/productos.css',
  'src/pages/combos/combos.css',
  'src/pages/courier/courier.css',
  'src/pages/courier/CentroInteligenciaComercial.css',
  'src/pages/courier/analytics/analytics.css',
  'src/pages/educacion/AdminEducacion.css',
  'src/pages/educacion/EducacionView.css',
  'src/pages/dashboard/MiDashboard.css',
  'src/pages/tienda/tienda.css',
  'src/pages/onboarding/onboarding.css',
];

// Texto: claro → tinta del tema; grises → los dos escalones atenuados.
const TEXTO_CLARO = /^#(fff|ffffff|f8fafc|f1f5f9|f4f4f6|e2e8f0|e0e0e0|eee|eeeeee)$/i;
const TEXTO_MEDIO = /^#(aaa|aaaaaa|ccc|cccccc|888|888888|94a3b8|9ca3af|a1a1aa|b0b0b0)$/i;
const TEXTO_TENUE = /^#(64748b|6b7280|475569|555|555555|666|666666|71717a|7b8294)$/i;

// Fondos oscuros fijos → superficies del tema.
const FONDOS = {
  canvas: /^#(050505|060709|08080a|0a0a0a|0a0a0b|0a0c10|090909)$/i,
  surface: /^#(0d1117|0e0e11|101219|0f1116|10152a|111318)$/i,
  surface2: /^#(141416|16161a|12131a|171a23|111720|1a1a1c|161c36|151515)$/i,
  surface3: /^#(1c1c21|1e2230|1c2444|202024|212121)$/i,
};

// Si la regla pinta su propio fondo de color (marca, semántico, gradiente),
// el texto claro que lleva adentro es intencional y no se toca.
const FONDO_DE_COLOR = /background(-color)?:\s*(linear-gradient|radial-gradient|#(?!0[0-9a-f]{5}|1[0-9a-f]{5})[0-9a-f]{6}|rgba?\((?!\s*0\s*,\s*0\s*,\s*0)|var\(--(?:color-)?(?:primary|accent|bg-primary|vit-accent))/i;

let total = 0;
for (const archivo of ARCHIVOS) {
  let css;
  try { css = readFileSync(archivo, 'utf8'); } catch { continue; }
  let n = 0;

  // Recorre bloque a bloque: "{ ...declaraciones... }"
  const salida = css.replace(/\{([^{}]*)\}/g, (bloqueCompleto, cuerpo) => {
    const pintaColor = FONDO_DE_COLOR.test(cuerpo);

    let nuevo = cuerpo.replace(
      /(^|[\s;])(color|background|background-color|border-color|border-top-color|border-bottom-color)\s*:\s*(#[0-9a-fA-F]{3,8})/g,
      (m, pre, prop, hex) => {
        let token = null;

        if (prop === 'color') {
          if (TEXTO_CLARO.test(hex)) token = pintaColor ? null : 'var(--color-fg)';
          else if (TEXTO_MEDIO.test(hex)) token = 'var(--color-fg-muted)';
          else if (TEXTO_TENUE.test(hex)) token = 'var(--color-fg-subtle)';
        } else {
          if (FONDOS.canvas.test(hex)) token = 'var(--color-canvas)';
          else if (FONDOS.surface.test(hex)) token = 'var(--color-surface)';
          else if (FONDOS.surface2.test(hex)) token = 'var(--color-surface-2)';
          else if (FONDOS.surface3.test(hex)) token = 'var(--color-surface-3)';
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
console.log(`\n${APLICAR ? 'APLICADO' : 'SIMULACRO'}: ${total} colores fijos migrados a tokens.`);
