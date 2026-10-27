import { expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TutorialTiendaLateral from './TutorialTiendaLateral';

it('muestra el espacio vacío y permite expandirlo sin URL', () => {
  render(<TutorialTiendaLateral nombre="Tienda" />);
  const toggle = screen.getByRole('button', { name: /Tutorial de Tienda/i });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByText('Video próximamente')).toBeInTheDocument();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Acá va el video explicativo de Tienda.')).toBeInTheDocument();
});

it('mantiene el panel abierto y cambia el video al cambiar de sección', () => {
  const { rerender } = render(<TutorialTiendaLateral nombre="Tienda" urlGeneral="https://youtu.be/dQw4w9WgXcQ" />);
  fireEvent.click(screen.getByRole('button', { name: /Tutorial de Tienda/i }));
  expect(screen.getByTitle('Tutorial de Tienda')).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));
  rerender(<TutorialTiendaLateral nombre="Contacto" url="https://youtu.be/9bZkp7q19f0" urlGeneral="https://youtu.be/dQw4w9WgXcQ" />);
  expect(screen.getByRole('button', { name: /Tutorial de Contacto/i })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByTitle('Tutorial de Contacto')).toHaveAttribute('src', expect.stringContaining('9bZkp7q19f0'));
  fireEvent.click(screen.getByRole('button', { name: /Tutorial de Contacto/i }));
  expect(screen.queryByTitle('Tutorial de Contacto')).not.toBeInTheDocument();
});
