import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// Guarda simple: las tarjetas de productos digitales y servicios llevan la marca de beta.
const fuente = readFileSync(join(process.cwd(), 'src/pages/auth/SeleccionModulo.jsx'), 'utf8');

describe('selector de espacios: módulos en beta', () => {
  it('marca Productos digitales y Servicios como beta, y Productos físicos no', () => {
    expect(fuente).toMatch(/id:'digital'[^}]*beta:true/);
    expect(fuente).toMatch(/id:'servicios'[^}]*beta:true/);
    expect(fuente).not.toMatch(/id:'fisico'[^}]*beta:true/);
    expect(fuente).toContain('module-card__beta');
  });
});
