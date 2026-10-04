import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeroCarousel, { imagenesHero } from './HeroCarousel';
import { mapEditorDraftToTemplateData, mapPublicDtoToTemplateData } from '../mapLandingToTemplateData';

describe('HeroCarousel', () => {
  it('limita el carrusel a cinco imagenes y usa banner_imagen como fallback', () => {
    expect(imagenesHero({ imagenes: ['1', '2', '3', '4', '5', '6'], imagen: 'legacy' })).toEqual(['1', '2', '3', '4', '5']);
    expect(imagenesHero({ imagen: 'legacy' })).toEqual(['legacy']);
  });

  it('rota automaticamente y permite controlar la imagen visible', () => {
    vi.useFakeTimers();
    render(<HeroCarousel hero={{ imagenes: ['/a.webp', '/b.webp'] }} alt="Portada" />);

    const primera = screen.getByRole('img', { name: 'Portada' });
    expect(primera).toHaveAttribute('src', '/a.webp');

    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.getByRole('img', { name: 'Portada' })).toHaveAttribute('src', '/b.webp');

    fireEvent.click(screen.getByRole('button', { name: 'Imagen anterior' }));
    expect(screen.getByRole('img', { name: 'Portada' })).toHaveAttribute('src', '/a.webp');
    vi.useRealTimers();
  });
});

describe('imagenes de portada en templates rigidos', () => {
  it('mapea editor y publico con la galeria guardada en content.portada', () => {
    const content = { portada: { banner_imagenes: ['/uno.webp', '/dos.webp'] } };
    const editor = mapEditorDraftToTemplateData({ content, items: [], banner_imagen: '/legacy.webp' }, { productos: [], combos: [] }, null);
    const publico = mapPublicDtoToTemplateData({ content, banner: { imagen: '/legacy.webp' } });

    expect(editor.hero.imagenes).toEqual(['http://localhost:3000/uno.webp', 'http://localhost:3000/dos.webp']);
    expect(publico.hero.imagenes).toEqual(['http://localhost:3000/uno.webp', 'http://localhost:3000/dos.webp']);
  });

  it('respeta una galeria vacia sin volver a la imagen legacy', () => {
    const content = { portada: { banner_imagenes: [] } };
    const editor = mapEditorDraftToTemplateData({ content, items: [], banner_imagen: '/legacy.webp' }, { productos: [], combos: [] }, null);
    const publico = mapPublicDtoToTemplateData({ content, banner: { imagen: '/legacy.webp' } });

    expect(editor.hero.imagenes).toEqual([]);
    expect(publico.hero.imagenes).toEqual([]);
  });
});
