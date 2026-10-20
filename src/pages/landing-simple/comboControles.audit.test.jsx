import { describe, expect, it } from 'vitest';
import { codigoFichaCombo } from './codigoFichaCombo';
const inicio = { html: '<header>Tienda QA</header><footer>Pie QA</footer>', css: '', js: '' };
const base = {
  hero: { titulo: 'Kit QA', eyebrow: 'Cocina QA', lead: 'Descripción QA', etiqueta: 'Pack QA', etiqueta_oferta: 'Oferta QA', rating_activo: true,
    caracteristicas: ['Punto QA'], nota_envio: 'Envío QA', nota_garantia: 'Garantía QA', nota_stock: 'Stock QA', contador: { activo: true, horas: 1, minutos: 0, segundos: 0 } },
  beneficio_principal: { items: [{ icono: 'star', titulo: 'Beneficio QA', texto: 'Detalle QA' }] },
  prueba_social: { activo: true, testimonios: [{ nombre: 'Ana QA', comentario: 'Comentario QA', foto: '/ana.webp', detalle: 'Compra QA', calificacion: 5 }] },
  confianza: { items: [{ icono: '💚', titulo: 'Protección QA', texto: 'Atención QA' }] },
  valor: { nota_ahorro: 'Nota QA' },
};
const item = { id: 1, tipo: 'combo', nombre: 'Kit QA', precio: 100000, imagenes: ['/uno.webp', '/dos.webp'],
  productos_combo: [{ id: 2, nombre: 'Cacerola QA', cantidad: 2, precio: 100000, imagen: '/cacerola.webp', beneficios: ['Antiadherente QA'] }],
  faq: [{ pregunta: 'Pregunta QA', respuesta: 'Respuesta QA' }] };
function documento(preview, bloque, parte, visible) {
  const ficha = { ...base, [bloque]: { ...base[bloque], partes: { [parte]: visible } } };
  const codigo = codigoFichaCombo({ item: { ...item, ficha_combo: ficha }, content: { codigo: inicio }, codigoInicio: inicio, preview });
  const plantilla = document.createElement('template'); plantilla.innerHTML = codigo.html; return plantilla.content;
}
const casos = [
  ['hero', 'oferta', '.limited-offer-kicker'], ['hero', 'sobre_titulo', '.cmb-hero-copy .cmb-eyebrow'],
  ['hero', 'titulo', '.cmb-hero-copy h1'], ['hero', 'descripcion', '.cmb-lead'], ['hero', 'calificacion', '.cmb-hero-copy .cmb-rating'],
  ['hero', 'galeria', '.cmb-hero-visual'], ['hero', 'etiqueta', '.cmb-hero-badge'], ['hero', 'productos', '.cmb-kit-strip'],
  ['hero', 'miniaturas', '.cmb-miniaturas'], ['hero', 'precio', '.cmb-price-main'], ['hero', 'precio_anterior', '.cmb-price-line'],
  ['hero', 'ahorro', '.cmb-saving-xl'], ['hero', 'porcentaje', '.cmb-saving-xl b'],
  ['hero', 'rotulo_combo', '.cmb-offer-panel-head > span'], ['hero', 'cantidad_productos', '.cmb-offer-panel-head > strong'],
  ['hero', 'rotulo_precio', '.cmb-price-main > span'], ['hero', 'rotulo_precio_anterior', '.cmb-price-line > span'],
  ['hero', 'caracteristicas', '.cmb-hero-checklist'], ['hero', 'compra', '.cmb-hero-accion'],
  ['incluye', 'imagen', '.cmb-product-card-image'], ['incluye', 'nombre', '.cmb-product-card-copy h3'],
  ['incluye', 'cantidad', '.cmb-product-card-image span'], ['incluye', 'beneficio', '.cmb-product-beneficios'],
  ['valor', 'desglose', '.cmb-price-breakdown'], ['valor', 'total', '.cmb-breakdown-total'], ['valor', 'precio', '.cmb-combo-price > strong'],
  ['valor', 'rotulo_precio', '.cmb-combo-price > p'], ['valor', 'ahorro', '.cmb-combo-price > span'],
  ['valor', 'nota', '.cmb-combo-price > small'], ['valor', 'compra', '.cmb-value-button'],
  ['beneficio_principal', 'iconos', '.cmb-why-item .cmb-icono-libre'], ['beneficio_principal', 'nombre', '.cmb-why-item h3'], ['beneficio_principal', 'texto', '.cmb-why-item p'],
  ['prueba_social', 'calificacion', '.cmb-rating--centrado'], ['prueba_social', 'estrellas', '.cmb-review .cmb-estrellas'],
  ['prueba_social', 'comentario', '.cmb-review > p'], ['prueba_social', 'nombre', '.cmb-review > strong'],
  ['prueba_social', 'foto', '.cmb-review-foto'], ['prueba_social', 'detalle', '.cmb-review small'], ['prueba_social', 'verificada', '.cmb-review small'],
  ['confianza', 'iconos', '.cmb-trust-icono'], ['confianza', 'nombre', '.cmb-trust-item h3'], ['confianza', 'texto', '.cmb-trust-item p'],
  ['faq', 'respuestas', '.cmb-faq-answer'], ['compra_movil', 'precio', '.cmb-barra-movil b'], ['compra_movil', 'compra', '.cmb-barra-movil button'],
];
describe.each([true, false])('Auditoría de controles de combo: preview=%s', preview => {
  it.each(casos)('%s · %s oculta su elemento y lo restaura', (bloque, parte, selector) => {
    for (const visible of [true, false, true]) {
      const doc = documento(preview, bloque, parte, visible);
      expect(!!doc.querySelector(selector), selector).toBe(visible);
      expect(doc.querySelector('header')?.textContent).toContain('Tienda QA');
      expect(doc.querySelector('footer')?.textContent).toContain('Pie QA');
      expect(doc.querySelector('.cmb-root')).not.toBeNull();
    }
  });
  it.each(['incluye', 'valor', 'beneficio_principal', 'prueba_social', 'confianza', 'faq'])('%s permite ocultar y restaurar sus títulos', bloque => {
    for (const parte of ['eyebrow', 'titulo']) {
      const selector = `[data-combo-bloque="${bloque}"] .cmb-seccion-titulo ${parte === 'eyebrow' ? '.cmb-eyebrow' : 'h2'}`;
      expect(documento(preview, bloque, parte, true).querySelector(selector)).not.toBeNull();
      expect(documento(preview, bloque, parte, false).querySelector(selector)).toBeNull();
    }
  });
  it('ocultar el precio actual conserva el precio por separado y el ahorro', () => {
    const doc = documento(preview, 'hero', 'precio', false);
    expect(doc.querySelector('.cmb-price-main')).toBeNull();
    expect(doc.querySelector('.cmb-price-line del')?.textContent).toContain('200.000');
    expect(doc.querySelector('.cmb-saving-xl')?.textContent).toContain('100.000');
  });
  it('las notas antiguas de envío, garantía y stock ya no se muestran', () => {
    const doc = documento(preview, 'hero', 'titulo', true);
    expect(doc.querySelector('.cmb-trust-row')).toBeNull();
    expect(doc.textContent).not.toContain('Envío QA');
    expect(doc.textContent).not.toContain('Garantía QA');
    expect(doc.textContent).not.toContain('Stock QA');
  });
});
