import { test, expect } from '@playwright/test';

function contraste(a, b) {
  const canal = color => color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = ([r, g, bl]) => 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  const [l1, l2] = [lum(canal(a)), lum(canal(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

for (const oscuro of [false, true]) {
  for (const estilo of ['compacta', 'tarjetas', 'destacada']) {
    test(`confianza guardada conserva contraste y emojis centrados: ${oscuro ? 'oscuro' : 'claro'} ${estilo}`, async ({ page }) => {
      const errores = [];
      page.on('pageerror', error => errores.push(error.message));
      await page.goto('http://localhost:5173/tests/fixtures/combos-inicio.html?seccion=confianza');
      const documento = await page.evaluate(async ({ oscuro, estilo }) => {
        const { construirDocumentoCodigo } = await import('/src/pages/landing-simple/construirDocumentoCodigo.js');
        const { PLANTILLA_INICIO } = await import('/src/pages/landing-simple/plantillasBaseCodigo.js');
        return construirDocumentoCodigo({ ...PLANTILLA_INICIO, css: `${PLANTILLA_INICIO.css}
        .trust-section { background: #fff; border: 1px solid #ddd; border-radius: 9px; padding: 24px; }
        .trust-card { flex-direction: row; }
        .trust-card-icon { align-self: flex-start; border-radius: 50%; }
      ` }, { datos: { vista: 'inicio', tienda: { nombre: 'Tienda', colores: { primario: '#155e63', fondo: oscuro ? '#101a21' : '#ffffff' } },
        venta: { inicio: { bloques: [{ tipo: 'confianza', visible: true }], confianza_estilo: estilo } }, productos: [] } });
      }, { oscuro, estilo });
      await page.setContent(documento);
      for (const width of [1366, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.locator('.trust-card')).toHaveCount(3);
        const mediciones = await page.locator('.trust-card').evaluateAll(cards => cards.map(card => {
          const ctx = document.createElement('canvas').getContext('2d');
          const rgb = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); const p = ctx.getImageData(0, 0, 1, 1).data; return `rgb(${p[0]}, ${p[1]}, ${p[2]})`; };
          let fondo = card;
          while (fondo.parentElement && getComputedStyle(fondo).backgroundColor === 'rgba(0, 0, 0, 0)') fondo = fondo.parentElement;
          const emoji = card.querySelector('.trust-card-icon').getBoundingClientRect();
          const rect = card.getBoundingClientRect();
          return { fondo: rgb(getComputedStyle(fondo).backgroundColor), titulo: rgb(getComputedStyle(card.querySelector('h3')).color),
            texto: rgb(getComputedStyle(card.querySelector('p')).color), centrado: Math.abs(emoji.left + emoji.width / 2 - rect.left - rect.width / 2) < 1,
            arriba: emoji.bottom <= card.querySelector('h3').getBoundingClientRect().top };
        }));
        for (const m of mediciones) {
          expect(contraste(m.titulo, m.fondo)).toBeGreaterThanOrEqual(4.5);
          expect(contraste(m.texto, m.fondo)).toBeGreaterThanOrEqual(4.5);
          expect(m.centrado).toBe(true);
          expect(m.arriba).toBe(true);
          if (oscuro) expect(m.fondo).not.toBe('rgb(255, 255, 255)');
        }
      }
      expect(errores).toEqual([]);
    });
  }
}
