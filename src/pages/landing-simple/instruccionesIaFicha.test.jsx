import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InstruccionesIaFicha } from './ConfigurarVentaCodigo';
import { armarPromptFichaProducto, faltantesFicha } from './promptsFichaProducto';
import { BLOQUES_FICHA_PANEL } from './PresentacionProducto';
import { PLANTILLA_PRODUCTO, esFichaProductoBase, marcarFichaPersonalizada } from './plantillasBaseCodigo';
import { codigoFichaProducto } from './fichaCodigoLanding';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));

afterEach(cleanup);

// Una ficha "rediseñada por la IA": la base con otro título y otro color.
const htmlIa = PLANTILLA_PRODUCTO.html.replace('data-gesicomm-base="producto"', 'data-gesicomm-base="producto" class="ficha-ia"');
const respuestaIa = `Acá está tu ficha:\n\n\`\`\`html\n${htmlIa}\n\`\`\`\n\n\`\`\`css\n.ficha-ia { color: #123456; }\n\`\`\`\n\n\`\`\`js\nconsole.log('ficha');\n\`\`\``;

describe('instrucciones para la IA de la ficha', () => {
  it('el prompt explica cada bloque del panel, pregunta antes de generar y trae el código actual', () => {
    const prompt = armarPromptFichaProducto({
      tienda: { nombre: 'Tienda Asunción' }, venta: {}, productos: [{ id: 1, tipo: 'producto', nombre: 'Crema' }],
      producto: { nombre: 'Crema' }, base: PLANTILLA_PRODUCTO,
    });
    BLOQUES_FICHA_PANEL.forEach(b => expect(prompt).toContain(`"${b.clave}"`));
    expect(prompt).toContain('no generes código todavía');
    expect(prompt).toContain('pdp-info');
    expect(prompt).toContain('ofertas_bump');
    expect(prompt).toContain('paquetes');
    expect(prompt).toContain(PLANTILLA_PRODUCTO.html.slice(0, 200));
  });

  it('una ficha propia no se confunde con la base (vista previa, guardado y página publicada)', () => {
    expect(esFichaProductoBase(htmlIa)).toBe(true);
    const marcada = marcarFichaPersonalizada(htmlIa);
    expect(esFichaProductoBase(marcada)).toBe(false);
    const publicada = codigoFichaProducto({ vistas: { producto: { html: marcada, css: '.ficha-ia{}', js: '' } } }, 'crema');
    expect(publicada.html).toContain('ficha-ia');
    // Sin data-gesicomm-base la marca va en el primer elemento.
    expect(marcarFichaPersonalizada('<!-- x --><main class="pdp-info"></main>')).toBe('<!-- x --><main data-gesicomm-personalizado class="pdp-info"></main>');
  });

  it('pegar la respuesta reemplaza HTML, CSS y JS de la ficha, marcada como propia', () => {
    const onCambiarCodigo = vi.fn();
    render(<InstruccionesIaFicha codigos={{}} onCambiarCodigo={onCambiarCodigo} onRestaurarCodigo={vi.fn()} tienda={{}} venta={{}} productos={[]} producto={null} />);
    expect(screen.getByText('Tu ficha usa el diseño base de Gesicomm')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Pegá la respuesta de la IA/), { target: { value: respuestaIa } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar a la ficha/ }));
    const cambios = Object.fromEntries(onCambiarCodigo.mock.calls.map(([vista, parte, valor]) => [`${vista}.${parte}`, valor]));
    expect(cambios['producto.html']).toContain('ficha-ia');
    expect(esFichaProductoBase(cambios['producto.html'])).toBe(false);
    expect(cambios['producto.css']).toBe('.ficha-ia { color: #123456; }');
    expect(cambios['producto.js']).toBe("console.log('ficha');");
    expect(screen.getByRole('status').textContent).toMatch(/Guardá para publicarla/);
  });

  it('si a la respuesta le falta lo esencial no se aplica y dice qué pedirle a la IA', () => {
    const onCambiarCodigo = vi.fn();
    render(<InstruccionesIaFicha codigos={{}} onCambiarCodigo={onCambiarCodigo} tienda={{}} venta={{}} productos={[]} producto={null} />);
    fireEvent.change(screen.getByLabelText(/Pegá la respuesta de la IA/), { target: { value: '```html\n<main class="pdp-info"><h1>Hola</h1></main>\n```' } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar a la ficha/ }));
    expect(onCambiarCodigo).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/botón de compra/);
    expect(faltantesFicha(PLANTILLA_PRODUCTO.html)).toEqual([]);
  });

  it('avisa qué bloques del panel quedan desconectados', () => {
    const sinPreguntas = htmlIa.replace('data-gesicomm-ficha-bloque="preguntas"', '');
    render(<InstruccionesIaFicha codigos={{}} onCambiarCodigo={vi.fn()} tienda={{}} venta={{}} productos={[]} producto={null} />);
    fireEvent.change(screen.getByLabelText(/Pegá la respuesta de la IA/), { target: { value: `\`\`\`html\n${sinPreguntas}\n\`\`\`` } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar a la ficha/ }));
    expect(screen.getByRole('status').textContent).toMatch(/15 · Preguntas frecuentes/);
  });

  it('con diseño propio ofrece volver a la base, con confirmación', () => {
    const onRestaurarCodigo = vi.fn();
    render(<InstruccionesIaFicha codigos={{ producto: { html: marcarFichaPersonalizada(htmlIa), css: '', js: '' } }} onCambiarCodigo={vi.fn()} onRestaurarCodigo={onRestaurarCodigo} tienda={{}} venta={{}} productos={[]} producto={null} />);
    expect(screen.getByText('Tu ficha tiene un diseño propio')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Volver al diseño base/ }));
    expect(onRestaurarCodigo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, volver' }));
    expect(onRestaurarCodigo).toHaveBeenCalledWith('producto');
  });
});
