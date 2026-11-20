import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import CampanaInternaModal from './CampanaInternaModal';
import { metaReportesService } from '../../services/metaReportesService';

vi.mock('../../services/metaReportesService', () => ({ metaReportesService: { actualizarCampana: vi.fn(), crearCampana: vi.fn() } }));
vi.mock('../../services/productService', () => ({ productService: { buscar: vi.fn().mockResolvedValue({ productos: [] }) } }));
vi.mock('../../services/catalogoService', () => ({ categoriaService: { buscar: vi.fn().mockResolvedValue({ categorias: [] }) } }));
vi.mock('./ConjuntoVentasMeta', () => ({ default: () => null }));

const CAMPANA = {
  id: 5, tipo: 'web', nombre_interno: 'P0003 | TERMO | WEB | CONVERSION | CBO', nombre_display: 'P0003 | TERMO | WEB | CONVERSION | CBO',
  productos: [{ id: 3, nombre: 'Termo' }],
  configuracion_anuncios: { objetivo: 'OUTCOME_SALES', tipo_presupuesto: 'CBO', presupuesto_diario: 50000, conjuntos: [{ id: 1, nombre: 'Público nuevo', descripcion: '' }] },
};

const abrirEnAnuncios = async () => {
  render(<CampanaInternaModal open campanaEditar={CAMPANA} onClose={vi.fn()} onCreated={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ir a conjuntos y ventas de Meta' }));
  fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
  await screen.findByRole('heading', { name: 'Anuncios' });
};

beforeEach(() => { vi.clearAllMocks(); metaReportesService.actualizarCampana.mockResolvedValue({ ...CAMPANA }); });
afterEach(cleanup);

describe('CampanaInternaModal — anuncios y nombre', () => {
  it('ya no ofrece seleccionar carpeta de creativos', async () => {
    await abrirEnAnuncios();
    expect(screen.queryByText(/carpeta/i)).not.toBeInTheDocument();
  });

  it('no deja seguir con nombres de anuncio repetidos', async () => {
    await abrirEnAnuncios();
    fireEvent.change(screen.getByLabelText('Anuncio 1'), { target: { value: 'Video 1' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar anuncio/ }));
    fireEvent.change(screen.getByLabelText('Anuncio 2'), { target: { value: 'video 1 ' } });
    expect(screen.getAllByText('Este nombre ya está en otro anuncio.')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
  });

  it('guarda los anuncios y un nombre propio para la campaña', async () => {
    await abrirEnAnuncios();
    fireEvent.change(screen.getByLabelText('Anuncio 1'), { target: { value: ' Video 1 · Gancho ' } });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));

    expect(await screen.findByText('P0003 | TERMO | WEB | CONVERSION | CBO')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Usar nombre propio/));
    const guardar = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(guardar).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nombre propio'), { target: { value: 'Termo Black Friday' } });
    fireEvent.click(guardar);

    await waitFor(() => expect(metaReportesService.actualizarCampana).toHaveBeenCalled());
    const [, payload] = metaReportesService.actualizarCampana.mock.calls[0];
    expect(payload.nombre_display).toBe('Termo Black Friday');
    expect(payload.configuracion_anuncios).toMatchObject({ nombre_modo: 'propio', fase: 'CONVERSION', anuncios: [{ id: 1, nombre: 'Video 1 · Gancho' }] });
    expect(payload.configuracion_anuncios).not.toHaveProperty('carpeta_creativos');
  });
});
