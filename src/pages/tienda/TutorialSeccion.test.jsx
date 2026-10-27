import { expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TutorialSeccion from './TutorialSeccion';

it('muestra un espacio pendiente y abre el video asignado a esa sección', () => {
  const { rerender } = render(<TutorialSeccion nombre="Tienda" url="" />);
  expect(screen.getByText('Video próximamente')).toBeInTheDocument();
  expect(screen.getByText('Espacio para el video explicativo')).toBeInTheDocument();
  rerender(<TutorialSeccion nombre="Tienda" url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial' }));
  expect(screen.getByRole('dialog', { name: 'Tutorial de Tienda' })).toBeInTheDocument();
  expect(screen.getByTitle('Tutorial de Tienda')).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar tutorial' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
