import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/api', () => ({ default: {}, getMediaUrl: u => u }));

const { extraerBloques } = await import('./LandingCodigoEditor');
const { calcularRecomendados } = await import('./datosRuntime');
const { armarPromptVista } = await import('./promptsCodigo');

describe('extraerBloques — pegar la respuesta de la IA', () => {
  it('separa los tres bloques aunque vengan con texto alrededor', () => {
    const respuesta = 'Acá tenés:\n```html\n<h1>Hola</h1>\n```\nY el estilo:\n```css\nh1 { color: red; }\n```\n```javascript\nconsole.log(1);\n```\nSuerte!';
    expect(extraerBloques(respuesta)).toEqual({ html: '<h1>Hola</h1>', css: 'h1 { color: red; }', js: 'console.log(1);' });
  });

  it('solo cambia lo que vino: sin bloque css, no pisa el CSS', () => {
    expect(extraerBloques('```html\n<p>x</p>\n```')).toEqual({ html: '<p>x</p>' });
  });

  it('una página HTML pegada sin bloques va entera al HTML', () => {
    expect(extraerBloques('<!doctype html><html><body>x</body></html>')).toEqual({ html: '<!doctype html><html><body>x</body></html>' });
  });

  it('texto sin código no devuelve nada', () => {
    expect(extraerBloques('no puedo ayudarte con eso')).toEqual({});
  });
});

describe('calcularRecomendados', () => {
  const catalogo = [
    { id: 'a', categoria: 'Cocina' }, { id: 'b', categoria: 'Fitness' },
    { id: 'c', categoria: 'Cocina' }, { id: 'd', categoria: 'Cocina' },
  ];

  it('en la ficha prioriza la misma categoría y nunca incluye el producto actual', () => {
    expect(calcularRecomendados(catalogo, catalogo[0], null).map(i => i.id)).toEqual(['c', 'd', 'b']);
  });

  it('respeta la lista manual y el máximo', () => {
    const venta = { recomendados: { modo: 'manual', items: ['d', 'b', 'x'], max: 1 } };
    expect(calcularRecomendados(catalogo, catalogo[0], venta).map(i => i.id)).toEqual(['d']);
  });

  it('apagados no devuelve nada', () => {
    expect(calcularRecomendados(catalogo, null, { recomendados: { activo: false } })).toEqual([]);
  });
});

describe('prompts por vista', () => {
  const productos = [{ id: 7, tipo: 'producto', slug: 'air-fryer', nombre: 'Air Fryer', precio_efectivo: 145735, categoria: 'Cocina' }];

  it('lleva el contrato, el tipo de venta y los IDs públicos de los productos', () => {
    const p = armarPromptVista('inicio', { tienda: { nombre: 'Mi Tienda' }, venta: { tipo: 'producto_unico' }, productos });
    expect(p).toContain('data-gesicomm-comprar');
    expect(p).toContain('PRODUCTO ÚNICO');
    expect(p).toContain('ID: air-fryer');
    expect(p).toContain('Gs 145.735');
  });

  it('la ficha no pide la lista de ofertas si las ventas cruzadas están apagadas', () => {
    const p = armarPromptVista('producto', { venta: { cross_sell: { activo: false } }, productos });
    expect(p).toContain('Ofertas desactivadas');
  });
});
