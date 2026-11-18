import { describe, expect, it } from 'vitest';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';

// La fuente elegida en Mi negocio se cargaba solo en el panel, no dentro del
// iframe del lienzo: la landing recibía el nombre en --store-font-* pero nunca
// el archivo, y caía a la fuente del sistema.
describe('fuente de la tienda dentro del lienzo', () => {
  it('carga en el iframe la fuente de Google elegida en la tienda', () => {
    const doc = construirDocumentoCodigo({ html: '<h1>Hola</h1>', css: '' }, {
      typography: { headingFont: 'playfair-display', bodyFont: 'inter' },
    });
    expect(doc).toContain('family=Playfair+Display');
    expect(doc).toContain('family=Inter');
    expect(doc).toContain("--store-font-heading:'Playfair Display'");
  });

  it('también carga Outfit, la fuente por defecto', () => {
    const doc = construirDocumentoCodigo({ html: '<p>x</p>', css: '' }, { typography: {} });
    expect(doc).toContain('family=Outfit');
  });

  it('conserva las fuentes propias de la landing', () => {
    const doc = construirDocumentoCodigo({
      html: '<p>x</p>', css: '', fonts: ['https://fonts.googleapis.com/css2?family=Fraunces&display=swap'],
    }, { typography: { headingFont: 'inter', bodyFont: 'inter' } });
    expect(doc).toContain('family=Fraunces');
    expect(doc).toContain('family=Inter');
  });
});
