import { describe, it, expect } from 'vitest';
import { PLANTILLA_INICIO, esBaseIntacta, marcarPersonalizado, formatoDeBase } from './plantillasBaseCodigo';

// Un inicio base retocado desde "Diseño (código) de esta sección" tiene que
// dejar de contar como base (si no, la vista previa y el guardado lo pisaban
// con la plantilla limpia) sin perder data-gesicomm-base, del que cuelgan estilos.
describe('inicio base personalizado', () => {
  it('la plantilla tal cual es base intacta', () => {
    expect(esBaseIntacta(PLANTILLA_INICIO.html)).toBe(true);
  });

  it('marcada como personalizada deja de ser base intacta y conserva su formato', () => {
    const editado = marcarPersonalizado(PLANTILLA_INICIO.html);
    expect(esBaseIntacta(editado)).toBe(false);
    expect(formatoDeBase(editado)).toBe(formatoDeBase(PLANTILLA_INICIO.html));
    expect(marcarPersonalizado(editado)).toBe(editado);
  });

  it('un HTML propio sin marca de base no se toca', () => {
    expect(marcarPersonalizado('<main>mío</main>')).toBe('<main>mío</main>');
    expect(esBaseIntacta('<main>mío</main>')).toBe(false);
  });
});
