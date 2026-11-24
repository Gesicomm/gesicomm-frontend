import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/dom';

const html = readFileSync('registro/web/crear-cuenta.html', 'utf8');
beforeEach(() => {
  const pagina = new DOMParser().parseFromString(html, 'text/html');
  document.body.replaceChildren(document.importNode(pagina.getElementById('gc-country'), true));
  window.eval(pagina.getElementById('gc-country-script').textContent);
});
afterEach(() => document.body.replaceChildren());

it('abre una lista propia y filtra países aunque se escriban sin tildes', () => {
  const campo = screen.getByRole('combobox', { name: 'País' });
  fireEvent.focus(campo);
  expect(screen.getByRole('listbox')).toBeVisible();
  expect(campo).not.toHaveAttribute('list');
  fireEvent.input(campo, { target: { value: 'mex' } });
  expect(screen.getByRole('option', { name: 'México' })).toBeVisible();
  expect(screen.queryByRole('option', { name: 'Paraguay' })).not.toBeInTheDocument();
});

it('permite elegir con las flechas y Enter y conserva el valor del formulario', () => {
  const campo = screen.getByRole('combobox', { name: 'País' });
  fireEvent.focus(campo);
  fireEvent.keyDown(campo, { key: 'ArrowDown' });
  fireEvent.keyDown(campo, { key: 'Enter' });
  expect(campo).toHaveValue('Paraguay');
  expect(campo).toHaveAttribute('aria-expanded', 'false');
  expect(campo).not.toHaveAttribute('aria-activedescendant');
});

it('permite elegir con el mouse y cerrar con Escape sin borrar la selección', () => {
  const campo = screen.getByRole('combobox', { name: 'País' });
  fireEvent.focus(campo);
  fireEvent.click(screen.getByRole('option', { name: 'Argentina' }));
  expect(campo).toHaveValue('Argentina');
  fireEvent.focus(campo);
  expect(screen.getByRole('option', { name: 'Argentina' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(campo, { key: 'Escape' });
  expect(campo).toHaveValue('Argentina');
  expect(campo).toHaveAttribute('aria-expanded', 'false');
});

it('conserva la posibilidad de escribir un país que no está entre las sugerencias', () => {
  const campo = screen.getByRole('combobox', { name: 'País' });
  fireEvent.input(campo, { target: { value: 'Costa Rica' } });
  expect(screen.getByRole('status')).toHaveTextContent('Podés escribir tu país');
  fireEvent.keyDown(campo, { key: 'Tab' });
  expect(campo).toHaveValue('Costa Rica');
  expect(campo).toHaveAttribute('aria-expanded', 'false');
});
