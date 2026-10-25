import { describe, expect, it } from 'vitest';
import { generarSku } from './ProductForm';

describe('generarSku', () => {
  it('usa hasta tres iniciales del nombre, sin tildes ni conectores', () => {
    expect(generarSku('Juego de sillas de jardín', () => 0)).toBe('JSJ-1000');
    expect(generarSku('Ángulo óptico', () => 0.9999)).toBe('AO-9999');
  });
  it('sin nombre propone un SKU genérico', () => {
    expect(generarSku('', () => 0.5)).toBe('PRD-5500');
  });
});
