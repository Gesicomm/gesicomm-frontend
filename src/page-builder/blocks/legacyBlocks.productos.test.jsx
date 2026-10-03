import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { RenderProvider } from '../core/RenderContext';
import { SectionRenderer } from '../core/SectionRenderer';
import { registerLegacyBlocks } from './legacyBlocks';

/**
 * El backend dejó de embeber el catálogo dentro de la sección `productos`
 * (ver landing.service.js#construirSeccionesPublicas): eran 137 KB de los
 * 498 KB de la respuesta pública, el mismo array que ya viaja en la raíz como
 * items/catalogo_items. Este test fija que el bloque lo toma del contexto de
 * render y no de la sección, para que nadie lo vuelva a inyectar "porque no
 * se veían los productos".
 */

const PRODUCTOS = [
  { tipo: 'producto', referencia_id: 1, content_id: 'remera-azul', nombre: 'Remera Azul', precio: 95000, imagenes: [] },
  { tipo: 'producto', referencia_id: 2, content_id: 'gorra-negra', nombre: 'Gorra Negra', precio: 60000, imagenes: [] },
];

function renderSeccionProductos(section) {
  const context = {
    theme: {},
    page: { slug: 'tienda-qa', secciones: [section], contacto: {}, filtros: {} },
    data: {
      itemsFiltrados: PRODUCTOS,
      itemsDestacados: [],
      categorias: [], marcas: [], etiquetas: [],
      conteo: PRODUCTOS.length, hayFiltroActivo: false,
    },
    actions: {}, state: {}, env: { mode: 'public' },
  };
  return render(
    <RenderProvider context={context}>
      <SectionRenderer section={section} />
    </RenderProvider>
  );
}

describe('bloque productos (legacy)', () => {
  beforeAll(() => registerLegacyBlocks());

  it('renderiza el catálogo del contexto aunque la sección no traiga items', () => {
    renderSeccionProductos({
      tipo: 'productos',
      activo: true,
      contenido: { titulo: 'Todos los productos' },
      config: {},
      // sin `items`: es exactamente lo que ahora manda el backend
    });

    expect(screen.getByText('Remera Azul')).toBeInTheDocument();
    expect(screen.getByText('Gorra Negra')).toBeInTheDocument();
  });

  it('ignora un `items` embebido en la sección y usa el del contexto', () => {
    renderSeccionProductos({
      tipo: 'productos',
      activo: true,
      contenido: { titulo: 'Todos los productos' },
      config: {},
      items: [{ tipo: 'producto', referencia_id: 9, content_id: 'fantasma', nombre: 'Producto Fantasma', precio: 1, imagenes: [] }],
    });

    expect(screen.getByText('Remera Azul')).toBeInTheDocument();
    expect(screen.queryByText('Producto Fantasma')).toBeNull();
  });
});
