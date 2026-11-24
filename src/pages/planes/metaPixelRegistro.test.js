import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { PIXEL_ID_GESICOMM } from '../../lib/metaPixel';

const inicioHtml = readFileSync('registro/web/inicio.html', 'utf8');
const solicitarPruebaHtml = readFileSync('registro/web/solicitar-prueba.html', 'utf8');
const crearCuentaHtml = readFileSync('registro/web/crear-cuenta.html', 'utf8');
const nginxConf = readFileSync('nginx.conf', 'utf8');

function montarPagina(html, { conScriptPrincipal } = {}) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = '';
  document.body.appendChild(document.importNode(doc.body, true));
  const pixelScript = doc.getElementById('gc-meta-pixel');
  expect(pixelScript).not.toBeNull();
  window.eval(pixelScript.textContent);
  if (conScriptPrincipal) {
    const mainScript = doc.getElementById(conScriptPrincipal);
    expect(mainScript).not.toBeNull();
    window.eval(mainScript.textContent);
  }
}

beforeEach(() => {
  delete window.fbq;
  delete window._fbq;
  delete window.__gcTrackMeta;
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete window.fbq;
  delete window._fbq;
  delete window.__gcTrackMeta;
  document.body.innerHTML = '';
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('Meta Pixel en páginas públicas de registro y Hotmart', () => {
  it.each([
    ['registro/web/inicio.html', inicioHtml],
    ['registro/web/solicitar-prueba.html', solicitarPruebaHtml],
    ['registro/web/crear-cuenta.html', crearCuentaHtml],
  ])('%s inicializa el mismo píxel de plataforma y dispara PageView', (_ruta, html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const pixelScript = doc.getElementById('gc-meta-pixel');
    expect(pixelScript).not.toBeNull();
    expect(pixelScript.textContent).toContain(PIXEL_ID_GESICOMM);

    const fbqSpy = vi.fn();
    window.fbq = fbqSpy;
    window.eval(pixelScript.textContent);

    expect(fbqSpy).toHaveBeenCalledWith('init', PIXEL_ID_GESICOMM);
    expect(fbqSpy).toHaveBeenCalledWith('track', 'PageView');
    expect(html).toContain(`https://www.facebook.com/tr?id=${PIXEL_ID_GESICOMM}&ev=PageView&noscript=1`);
  });

  it('habilita los dominios de Meta Pixel en la CSP de las tres páginas de registro', () => {
    for (const ubicacion of [
      'location = /__gesicom_preview/inicio.html',
      'location = /__gesicom_preview/solicitar-prueba.html',
      'location = /__gesicom_preview/crear-cuenta.html',
    ]) {
      const inicio = nginxConf.indexOf(ubicacion);
      expect(inicio).toBeGreaterThan(-1);
      const bloque = nginxConf.slice(inicio, nginxConf.indexOf('}', inicio));
      expect(bloque).toMatch(/script-src[^;]*https:\/\/connect\.facebook\.net/);
      expect(bloque).toMatch(/img-src[^;]*https:\/\/www\.facebook\.com/);
      expect(bloque).toMatch(/connect-src[^;]*https:\/\/www\.facebook\.com/);
      expect(bloque).toMatch(/connect-src[^;]*https:\/\/connect\.facebook\.net/);
      expect(bloque).toMatch(/frame-src[^;]*https:\/\/www\.facebook\.com/);
      expect(bloque).toMatch(/form-action[^;]*https:\/\/www\.facebook\.com/);
    }
  });

  it('inicio.html dispara Lead al enviar el formulario directo de portada', () => {
    const fbqSpy = vi.fn();
    window.fbq = fbqSpy;
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ prospecto: { id: 1 } }) })));

    montarPagina(inicioHtml, { conScriptPrincipal: 'gc-prueba-directa-script' });

    fireEvent.input(document.getElementById('gc-prueba-email'), { target: { value: 'ana@gesicom.test' } });
    fireEvent.input(document.getElementById('gc-prueba-whatsapp'), { target: { value: '+595981123456' } });
    fireEvent.submit(document.getElementById('gc-prueba-directa'));

    expect(fbqSpy).toHaveBeenCalledWith(
      'track',
      'Lead',
      { content_name: 'Prueba gratuita Gesicom', content_category: 'portada' },
      { eventID: expect.any(String) },
    );
  });

  it('solicitar-prueba.html dispara Lead con el plan y periodicidad elegidos', async () => {
    const fbqSpy = vi.fn();
    window.fbq = fbqSpy;
    window.history.replaceState({}, '', '/solicitar-prueba?plan=founder&billing=annual');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ prospecto: { id: 10 } }) })));

    montarPagina(solicitarPruebaHtml, { conScriptPrincipal: 'gc-trial-script' });

    const inputs = document.querySelectorAll('#trial-form input');
    fireEvent.input(inputs[0], { target: { value: 'Ana Prueba' } });
    fireEvent.input(inputs[1], { target: { value: 'ana@gesicom.test' } });
    fireEvent.input(inputs[2], { target: { value: '+595981123456' } });
    fireEvent.submit(document.getElementById('trial-form'));

    await waitFor(() => {
      expect(fbqSpy).toHaveBeenCalledWith(
        'track',
        'Lead',
        {
          content_name: expect.stringContaining('Starter Founder'),
          content_ids: ['hotmart-starter-founder-anual'],
        },
        { eventID: expect.any(String) },
      );
    });
  });

  it('crear-cuenta.html dispara InitiateCheckout anual y Purchase deduplicado al confirmar Hotmart + Workshop', async () => {
    vi.useFakeTimers();
    const fbqSpy = vi.fn();
    window.fbq = fbqSpy;
    window.history.replaceState({}, '', '/crear-cuenta?plan=founder&billing=annual');

    const ofertaResp = {
      oferta: '2vonlzpl',
      mensualidad: 470,
      precio: 470,
      periodicidad: 'anual',
      desde: 1700000000,
      firma: 'firma-anual-001',
    };
    const fetchMock = vi.fn(async (url) => {
      if (url === '/registro/prospecto') return { ok: true, json: async () => ({ prospecto: { id: 12 } }) };
      if (url === '/registro/oferta') return { ok: true, json: async () => ofertaResp };
      return { ok: false };
    });
    vi.stubGlobal('fetch', fetchMock);

    montarPagina(crearCuentaHtml, { conScriptPrincipal: 'gc-checkout-script' });

    fireEvent.input(document.getElementById('fn'), { target: { value: 'Ana' } });
    fireEvent.input(document.getElementById('ln'), { target: { value: 'Prueba' } });
    fireEvent.input(document.getElementById('em'), { target: { value: 'ana@gesicom.test' } });
    fireEvent.input(document.getElementById('wa'), { target: { value: '+595981123456' } });
    fireEvent.input(document.getElementById('pais'), { target: { value: 'Paraguay' } });
    fireEvent.submit(document.getElementById('activar'));

    await vi.waitFor(() => {
      expect(fbqSpy).toHaveBeenCalledWith(
        'track',
        'InitiateCheckout',
        {
          content_name: 'Starter Founder Anual',
          content_ids: ['hotmart-starter-founder-anual'],
          content_type: 'product',
          value: 470,
          currency: 'USD',
        },
        { eventID: expect.any(String) },
      );
    });
  });

  it('crear-cuenta.html dispara InitiateCheckout mensual (47 USD) y Purchase una sola vez al confirmarse el alta en Hotmart', async () => {
    vi.useFakeTimers();
    const fbqSpy = vi.fn();
    window.fbq = fbqSpy;
    window.history.replaceState({}, '', '/crear-cuenta?plan=founder');

    const ofertaResp = {
      oferta: '0h9kqefg',
      mensualidad: 47,
      precio: 47,
      periodicidad: 'mensual',
      desde: 1700000000,
      firma: 'firma-mensual-12345',
    };
    let intentosConfirmacion = 0;
    const fetchMock = vi.fn(async (url, init) => {
      if (url === '/registro/prospecto') return { ok: true, json: async () => ({ prospecto: { id: 25 } }) };
      if (url === '/registro/oferta') {
        const body = JSON.parse(init.body);
        if (body.accion === 'confirmacion') {
          intentosConfirmacion += 1;
          if (intentosConfirmacion === 1) {
            return { ok: true, json: async () => ({ confirmada: false }) };
          }
          return { ok: true, json: async () => ({ confirmada: true, token_registro: 'tok-1' }) };
        }
        return { ok: true, json: async () => ofertaResp };
      }
      return { ok: false };
    });
    vi.stubGlobal('fetch', fetchMock);

    montarPagina(crearCuentaHtml, { conScriptPrincipal: 'gc-checkout-script' });

    fireEvent.input(document.getElementById('fn'), { target: { value: 'Ana' } });
    fireEvent.input(document.getElementById('ln'), { target: { value: 'Prueba' } });
    fireEvent.input(document.getElementById('em'), { target: { value: 'ana@gesicom.test' } });
    fireEvent.input(document.getElementById('wa'), { target: { value: '+595981123456' } });
    fireEvent.input(document.getElementById('pais'), { target: { value: 'Paraguay' } });
    fireEvent.submit(document.getElementById('activar'));

    await vi.waitFor(() => {
      expect(fbqSpy).toHaveBeenCalledWith(
        'track',
        'InitiateCheckout',
        {
          content_name: 'Starter Founder Mensual',
          content_ids: ['hotmart-starter-founder'],
          content_type: 'product',
          value: 47,
          currency: 'USD',
        },
        { eventID: expect.any(String) },
      );
    });

    // Antes de que Hotmart confirme la compra procesada, NO debe dispararse Purchase
    expect(fbqSpy.mock.calls.filter(c => c[0] === 'track' && c[1] === 'Purchase')).toHaveLength(0);

    // Primer poll a los 12s devuelve confirmada: false → sigue sin disparar Purchase
    await vi.advanceTimersByTimeAsync(12000);
    expect(intentosConfirmacion).toBe(1);
    expect(fbqSpy.mock.calls.filter(c => c[0] === 'track' && c[1] === 'Purchase')).toHaveLength(0);

    // Segundo poll a los +15s devuelve confirmada: true → recién ahí dispara Purchase
    await vi.advanceTimersByTimeAsync(15000);
    expect(intentosConfirmacion).toBe(2);

    const compras = fbqSpy.mock.calls.filter(c => c[0] === 'track' && c[1] === 'Purchase');
    expect(compras).toHaveLength(1);
    expect(compras[0]).toEqual([
      'track',
      'Purchase',
      {
        content_name: 'Starter Founder Mensual',
        content_ids: ['hotmart-starter-founder'],
        content_type: 'product',
        value: 47,
        currency: 'USD',
      },
      { eventID: expect.stringMatching(/^hotmart-purchase-/) },
    ]);

    // Al confirmarse el alta, #pago queda oculto; la deduplicación por firma protege contra reintentos o dobles confirmaciones
    fireEvent.click(screen.getByRole('button', { name: 'Volver a tus datos', hidden: true }));
    fireEvent.submit(document.getElementById('activar'));
    await vi.advanceTimersByTimeAsync(12000);

    const comprasDespues = fbqSpy.mock.calls.filter(c => c[0] === 'track' && c[1] === 'Purchase');
    expect(comprasDespues).toHaveLength(1);

    // El upsell del Workshop dispara su propio InitiateCheckout (27 USD) sin duplicar Purchase
    fireEvent.click(screen.getByRole('button', { name: /Ir al pago del workshop/i, hidden: true }));
    expect(fbqSpy).toHaveBeenCalledWith(
      'track',
      'InitiateCheckout',
      {
        content_name: 'Workshop de inicio rápido',
        content_ids: ['hotmart-workshop'],
        content_type: 'product',
        value: 27,
        currency: 'USD',
      },
      { eventID: expect.any(String) },
    );
    expect(fbqSpy.mock.calls.filter(c => c[0] === 'track' && c[1] === 'Purchase')).toHaveLength(1);
  });
});
