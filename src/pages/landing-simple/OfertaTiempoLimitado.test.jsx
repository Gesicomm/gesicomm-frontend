import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfertaTiempoLimitado, { HTML_OFERTA_PRODUCTO } from './OfertaTiempoLimitado';
import { PLANTILLA_PRODUCTO } from './plantillasBaseCodigo';
import { codigoFichaCombo } from './codigoFichaCombo';
import estilosOferta from './ofertaTiempoLimitado.css?inline';
it('producto y combo usan el mismo HTML de oferta, estilos y contrato de countdown', () => {
  expect(PLANTILLA_PRODUCTO.html).toContain(HTML_OFERTA_PRODUCTO);
  expect(PLANTILLA_PRODUCTO.css).toContain(estilosOferta);
  const codigo = codigoFichaCombo({ item: { id: 1, tipo: 'combo', precio: 1000, nombre: 'Kit', ficha_combo: { hero: { contador: { activo: true } } } }, content: {} });
  expect(codigo.css).toContain(estilosOferta);
  expect(codigo.html).toContain('limited-offer pdp-limited-offer pdp-offer-card');
  expect(codigo.html).toContain('data-gesicomm-countdown-parte="horas"');
  expect(codigo.js).not.toContain('actualizarContadores');
});
it('el componente compartido respeta textos vacíos y visibilidad individual', () => {
  const datos = { urgencia_kicker: '', urgencia_titulo: 'Flash cocina', urgencia_texto: 'Oferta del día', urgencia_horas: 1 };
  const { container, rerender } = render(<OfertaTiempoLimitado datos={datos} />);
  expect(container.querySelector('.limited-offer-kicker')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Flash cocina' })).toBeInTheDocument();
  rerender(<OfertaTiempoLimitado datos={datos} partes={{ oferta_nombre: false, oferta_texto: false, oferta_duracion: false }} />);
  expect(screen.queryByText('Flash cocina')).toBeNull();
  expect(screen.queryByText('Oferta del día')).toBeNull();
  expect(container.querySelector('.countdown')).toBeNull();
});
