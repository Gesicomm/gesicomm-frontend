import { describe, it, expect } from 'vitest';
import { codigoFooterDesdeTexto, limpiarTextoFooter, textoInicialFooter } from './paginasFooter';

describe('páginas del footer', () => {
  it('conserva imágenes seguras al guardar y reabrir sin atributos ejecutables', () => {
    const html = '<p>Antes</p><img src="https://cdn.example.com/foto.webp" alt="Mi foto" onerror="alert(1)"><img src="javascript:alert(2)"><img src="data:image/png;base64,AAAA"><p>Después</p>';
    const codigo = codigoFooterDesdeTexto('contacto', html);
    expect(codigo.html).toContain('<img src="https://cdn.example.com/foto.webp" alt="Mi foto">');
    expect(codigo.html).not.toMatch(/onerror|javascript:|data:image/);
    expect(textoInicialFooter('contacto', {}, codigo)).toContain('https://cdn.example.com/foto.webp');
    expect(codigo.css).toContain('.footer-edited-content img');
  });
  it('carga textos actuales y prioriza el contenido personalizado', () => {
    expect(textoInicialFooter('politica_privacidad', { nombre: 'SomMix' })).toContain('SomMix');
    expect(textoInicialFooter('contacto', {}, { html: '<main><h1>Mi contacto</h1><p>Texto vigente</p></main>' })).toBe('<h1>Mi contacto</h1><p>Texto vigente</p>');
  });
  it('conserva el formato al pegar y elimina contenido ejecutable', () => {
    const html = limpiarTextoFooter('<p><span style="font-weight:700;font-style:italic;text-decoration:underline" onclick="alert(1)">Texto</span></p><script>alert(2)</script><img src=x onerror=alert(3)><ol><li>Uno</li></ol>');
    expect(html).toContain('<strong>Texto</strong>');
    expect(html).toContain('<u>');
    expect(html).toContain('<em>');
    expect(html).toContain('<ol><li>Uno</li></ol>');
    expect(html).not.toMatch(/script|onerror|onclick|alert|style=/);
  });
  it('publica exactamente la edición guardada y respeta las páginas sin editar', () => {
    const codigo = codigoFooterDesdeTexto('contacto', '<p><u>Nuevo contacto</u></p>');
    expect(codigo.html).toContain('<p><u>Nuevo contacto</u></p>');
    expect(codigo.html).not.toContain('No especificado');
    expect(textoInicialFooter('contacto', {}, codigo)).toBe('<p><u>Nuevo contacto</u></p>');
  });
});
