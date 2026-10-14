import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { esperarCookiesFacebook, leerCookiesFacebook } from './metaPixel';

function borrarCookies() {
  document.cookie.split(';').forEach(c => {
    const nombre = c.split('=')[0].trim();
    if (nombre) document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

beforeEach(() => {
  localStorage.clear();
  borrarCookies();
  window.history.replaceState({}, '', '/');
  delete window.fbq;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('leerCookiesFacebook — respaldo del fbclid', () => {
  it('sin cookie _fbc arma el fbc con el fbclid del anuncio', () => {
    window.history.replaceState({}, '', '/?utm_source=fb&fbclid=IwAR123');
    const { fbc } = leerCookiesFacebook();
    expect(fbc).toMatch(/^fb\.1\.\d{13}\.IwAR123$/);
  });

  it('el fbclid sobrevive a la navegación interna, que lo saca de la URL', () => {
    window.history.replaceState({}, '', '/?fbclid=IwAR123');
    const primero = leerCookiesFacebook().fbc;
    window.history.replaceState({}, '', '/producto/remera');
    expect(leerCookiesFacebook().fbc).toBe(primero);
  });

  it('recargar con el mismo clic conserva la hora del primero', () => {
    window.history.replaceState({}, '', '/?fbclid=IwAR123');
    const primero = leerCookiesFacebook().fbc;
    expect(leerCookiesFacebook().fbc).toBe(primero);
  });

  it('la cookie del Pixel gana sobre el respaldo', () => {
    window.history.replaceState({}, '', '/?fbclid=IwAR123');
    document.cookie = '_fbc=fb.1.5.cookie; path=/';
    document.cookie = '_fbp=fb.1.6.789; path=/';
    expect(leerCookiesFacebook()).toEqual({ fbc: 'fb.1.5.cookie', fbp: 'fb.1.6.789' });
  });

  it('un clic de hace más de 90 días ya no se usa', () => {
    const viejo = Date.now() - 91 * 24 * 60 * 60 * 1000;
    localStorage.setItem('gesicomm-fbc', JSON.stringify({ fbclid: 'x', fbc: `fb.1.${viejo}.x`, ts: viejo }));
    expect(leerCookiesFacebook().fbc).toBeNull();
  });

  it('sin anuncio no inventa nada', () => {
    expect(leerCookiesFacebook()).toEqual({ fbc: null, fbp: null });
  });
});

describe('esperarCookiesFacebook', () => {
  it('sin Pixel en la página resuelve enseguida', async () => {
    await expect(esperarCookiesFacebook()).resolves.toEqual({ fbc: null, fbp: null });
  });

  it('espera a que el Pixel cree _fbp', async () => {
    vi.useFakeTimers();
    window.fbq = () => {};
    const promesa = esperarCookiesFacebook(1000);
    await vi.advanceTimersByTimeAsync(300);
    document.cookie = '_fbp=fb.1.6.789; path=/';
    await vi.advanceTimersByTimeAsync(100);
    await expect(promesa).resolves.toEqual({ fbc: null, fbp: 'fb.1.6.789' });
  });

  it('con un bloqueador se rinde al vencer el plazo', async () => {
    vi.useFakeTimers();
    window.fbq = () => {};
    const promesa = esperarCookiesFacebook(1000);
    await vi.advanceTimersByTimeAsync(1100);
    await expect(promesa).resolves.toEqual({ fbc: null, fbp: null });
  });
});
