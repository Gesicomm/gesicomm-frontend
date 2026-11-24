import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DatosContactoSection } from './templates/sections';
import { mapPublicDtoToTemplateData } from './mapLandingToTemplateData';
import { armarSeccionesSistema } from './seccionesSistemaCodigo';

describe('Ubicación pública de Google Maps', () => {
  it('lleva el enlace configurado desde el DTO al contacto público', () => {
    const { contacto } = mapPublicDtoToTemplateData({ contacto_landing: { direccion: 'Local 123', google_maps_url: 'https://maps.app.goo.gl/local' } });
    render(<DatosContactoSection contacto={contacto} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://maps.app.goo.gl/local');
  });
  it('muestra Maps aunque no se haya escrito la dirección', () => {
    render(<DatosContactoSection contacto={{ google_maps_url: 'https://maps.app.goo.gl/local' }} />);
    expect(screen.getByRole('link')).toHaveTextContent('Ver ubicación en Google Maps');
  });
  it('incluye el enlace en la sección de contacto de lienzo en blanco y escapa parámetros', () => {
    const { html } = armarSeccionesSistema({ mostrarContacto: true, contacto: { google_maps_url: 'https://www.google.com/maps?q=local&hl=es' } });
    expect(html).toContain('href="https://www.google.com/maps?q=local&amp;hl=es"');
    expect(html).toContain('Ver en Google Maps');
  });
});
