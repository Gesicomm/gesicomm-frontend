import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductPicker from './ProductPicker';
import { vitrinaService } from '../../services/vitrinaService';

vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { catalogoPaginado: vi.fn(async () => ({ items: [], total: 0, totalPages: 1 })) } }));
vi.mock('../../services/api', () => ({ getMediaUrl: value => value }));
const base = { catalogo: { productos: [], combos: [] }, seleccion: new Map(), max: 50, onToggle: () => {}, mostrarLista: false, mostrarInputs: false, permitirCombos: false };

test('el selector controlado abre directamente el catálogo y confirma mediante el callback', async () => {
  const confirmar = vi.fn(), cerrar = vi.fn();
  render(<ProductPicker {...base} abierto onCerrar={cerrar} onConfirmar={confirmar} modalTitle="Productos de interés" />);
  expect(screen.getByRole('dialog', { name: 'Productos de interés' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Elegir productos' })).not.toBeInTheDocument();
  await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Agregar productos' }));
  expect(confirmar).toHaveBeenCalledTimes(1);
  expect(cerrar).not.toHaveBeenCalled();
});

test('el selector habitual sigue abriendo y cerrando con sus propios botones', async () => {
  render(<ProductPicker {...base} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Elegir productos' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
