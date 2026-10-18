import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { datosRuntimePreview, datosRuntimePublico } from './datosRuntime';

describe('Canal de contacto publicado', () => {
  it.each([
    ['instagram', 'https://instagram.com/sommix'],
    ['email', 'mailto:contacto@example.com'],
    ['telefono', 'tel:595981123456'],
    ['whatsapp', 'https://wa.me/595981123456'],
  ])('el botón publicado coincide con el preview al preferir %s', (canal, destino) => {
    const contacto = {
      whatsapp: '595981123456', telefono: '595981123456',
      instagram: 'sommix', email: 'contacto@example.com',
    };
    const publico = datosRuntimePublico({ contacto_landing: { ...contacto, canal }, catalogo_items: [] }, 'sommix');
    const preview = datosRuntimePreview({ tienda: { ...contacto, canal_contacto: canal } });
    expect(publico.tienda.canal_contacto).toBe(preview.tienda.canal_contacto);
    const botones = [publico, preview].map(datos => {
      const dom = new JSDOM(construirDocumentoCodigo({ html: '<main></main>', css: '', js: '' }, { datos }), {
        runScripts: 'dangerously',
        beforeParse(w) { w.postMessage = () => {}; w.scrollTo = () => {}; },
      });
      try {
        const boton = dom.window.document.querySelector('[data-gesicomm-contacto-flotante]');
        expect(boton).toBeTruthy();
        expect(boton.classList.contains(`gc-contact-float--${canal}`)).toBe(true);
        expect(boton.href).toContain(destino);
        return boton.href;
      } finally {
        dom.window.close();
      }
    });
    expect(botones[0]).toBe(botones[1]);
  });
});
