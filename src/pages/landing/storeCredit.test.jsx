import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { actualizarCreditosGesicom, CREDITO_GESICOM_CONTENIDO, adaptarLogosGesicom } from './storeCredit';
import StoreFooterLegal from './StoreFooterLegal';
import { PLANTILLA_INICIO, PLANTILLA_PRODUCTO, PLANTILLA_CATALOGO, PLANTILLA_CHECKOUT } from '../landing-simple/plantillasBaseCodigo';
import { armarSeccionesSistema } from '../landing-simple/seccionesSistemaCodigo';

afterEach(() => { cleanup(); document.body.innerHTML = ''; });

describe('firma compartida de las tiendas', () => {
  it('actualiza una firma guardada sin cambiar el nombre ni otros enlaces', () => {
    document.body.innerHTML = '<footer><div class="footer-bottom">Llevalofacil · Tecnología de <a href="https://gesicomm.com">Gesicom</a></div><a href="/contacto">Contacto</a></footer><main><a href="https://gesicomm.com">Gesicom</a></main>';
    const stopFirst = actualizarCreditosGesicom(CREDITO_GESICOM_CONTENIDO);
    const stopSecond = actualizarCreditosGesicom(CREDITO_GESICOM_CONTENIDO);
    const firma = document.querySelector('[data-gesicomm-credit]');
    expect(firma.querySelectorAll('svg')).toHaveLength(1);
    expect(firma.querySelector('circle').getAttribute('fill')).toBe('#ff5c45');
    expect(firma.textContent).toBe('Gesicom');
    expect(firma.rel).toBe('noopener noreferrer');
    expect(document.querySelector('.footer-bottom').textContent).toContain('Llevalofacil · Tecnología de Gesicom');
    expect(document.querySelector('main a svg')).toBeNull();
    expect(document.querySelector('a[href="/contacto"]').textContent).toBe('Contacto');
    stopFirst();
    stopSecond();
  });

  it('incluye la marca con logo en las bases y el footer automático', () => {
    const extras = armarSeccionesSistema({ mostrarFooter: true, nombreComercio: 'Mi tienda <segura>' });
    for (const html of [PLANTILLA_INICIO.html, PLANTILLA_PRODUCTO.html, PLANTILLA_CATALOGO.html, PLANTILLA_CHECKOUT.html, extras.html]) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      expect(doc.querySelector('footer [data-gesicomm-credit] svg')).not.toBeNull();
    }
    expect(extras.html).toContain('Mi tienda &lt;segura&gt;');
  });

  it.each(['#000000', '#ffffff'])('muestra la firma también en React sobre %s', fondo => {
    const { container } = render(<MemoryRouter><StoreFooterLegal nombreComercio="Llevalofacil" style={{ backgroundColor: fondo }} tema={{ fondo, texto: fondo === '#000000' ? '#ffffff' : '#000000' }} /></MemoryRouter>);
    const firma = container.querySelector('[data-gesicomm-credit]');
    expect(firma.textContent).toBe('Gesicom');
    expect(firma.querySelector('svg')).not.toBeNull();
    expect(firma.style.getPropertyValue('--gesicom-credit-logo')).toBe(fondo === '#000000' ? '#f7fafc' : '#08111f');
    expect(firma.querySelector('circle').getAttribute('fill')).toBe('#ff5c45');
    expect(container.textContent).toContain('Llevalofacil');
    expect(container.querySelector('style').textContent).toContain('#ff5c45');
  });

  it('usa el fondo real incluso si el texto y el tema declarado dicen lo contrario', () => {
    document.body.innerHTML = '<div style="background:#000;color:#000"><footer style="background:rgba(255,255,255,.1)"><a data-gesicomm-credit>Gesicom</a></footer></div>';
    const stop = adaptarLogosGesicom(document);
    expect(document.querySelector('a').style.getPropertyValue('--gesicom-credit-logo')).toBe('#f7fafc');
    stop();
    const { container } = render(<MemoryRouter><StoreFooterLegal nombreComercio="Tienda" tema={{ fondo: '#ffffff', texto: '#000000' }} style={{ backgroundColor: '#000000' }} /></MemoryRouter>);
    expect(container.querySelector('[data-gesicomm-credit]').style.getPropertyValue('--gesicom-credit-logo')).toBe('#f7fafc');
  });
});
