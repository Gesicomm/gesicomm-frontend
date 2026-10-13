import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import AdsCampanas from './AdsCampanas';
import { metaReportesService } from '../../services/metaReportesService';

vi.mock('../../services/metaReportesService', () => ({
  metaReportesService: {
    crearGasto: vi.fn(),
    actualizarGasto: vi.fn(),
    eliminarGasto: vi.fn(),
    listarGastos: vi.fn(),
    actualizarCampana: vi.fn(),
    eliminarCampana: vi.fn(),
  },
}));
// El asistente de alta trae productos y categorías al abrirse; acá no se prueba.
vi.mock('./CampanaInternaModal', () => ({ default: () => null }));

const CAMPANAS = [
  {
    id: 7, nombre_display: 'P0003 | TERMO | WEB | CONVERSION | CBO', nombre_interno: 'P0003 | TERMO | WEB | CONVERSION | CBO',
    tipo: 'web', estado: 'activa', productos: [{ id: 3, nombre: 'Termo' }],
    gasto_total: 1750000, gasto_registros: 3, gasto_ultimo_dia: '2026-10-14',
  },
  {
    id: 9, nombre_display: 'P0008 | MATE | WHATSAPP | EVALUACION | ABO', nombre_interno: 'P0008 | MATE | WHATSAPP | EVALUACION | ABO',
    tipo: 'whatsapp', estado: 'borrador', productos: [{ id: 8, nombre: 'Mate' }],
    gasto_total: 0, gasto_registros: 0, gasto_ultimo_dia: null,
  },
];

const HISTORIAL = {
  resumen: { total_gastado: 1750000, registros: 3, primer_dia: '2026-09-24', ultimo_dia: '2026-10-14', dias_cargados: 21, promedio_diario: 83333.33 },
  total: 3, pagina: 1, limite: 10, total_paginas: 1,
  orden: { campo: 'fecha_desde', direccion: 'DESC' },
  gastos: [
    { id: 31, fecha_desde: '2026-10-08', fecha_hasta: '2026-10-14', dias: 7, monto: 700000, promedio_diario: 100000, nota: 'subí presupuesto', created_at: '2026-10-15T12:00:00Z' },
    { id: 30, fecha_desde: '2026-10-01', fecha_hasta: '2026-10-07', dias: 7, monto: 600000, promedio_diario: 85714.28, nota: null, created_at: '2026-10-08T12:00:00Z' },
    { id: 29, fecha_desde: '2026-09-24', fecha_hasta: '2026-09-30', dias: 7, monto: 450000, promedio_diario: 64285.71, nota: null, created_at: '2026-10-01T12:00:00Z' },
  ],
};

// Intl separa "Gs." del número con un espacio duro; se compara solo la cifra.
const cifra = (texto) => new RegExp(texto.replace(/\./g, '\\.'));

const montar = (onCambio = vi.fn()) => {
  render(<AdsCampanas campanas={CAMPANAS} cargando={false} tiendas={[]} onCambio={onCambio} />);
  return onCambio;
};

beforeEach(() => {
  vi.clearAllMocks();
  metaReportesService.listarGastos.mockResolvedValue(HISTORIAL);
});
afterEach(cleanup);

describe('AdsCampanas — total gastado por campaña', () => {
  it('muestra lo gastado en cada campaña y el total', () => {
    montar();
    const fila = screen.getByText('P0003 | TERMO | WEB | CONVERSION | CBO', { selector: 'button' }).closest('tr');
    expect(within(fila).getByText(cifra('1.750.000'))).toBeInTheDocument();
    expect(within(fila).getByText('hasta el 14/10/2026')).toBeInTheDocument();

    const sinGasto = screen.getByText('P0008 | MATE | WHATSAPP | EVALUACION | ABO', { selector: 'button' }).closest('tr');
    expect(within(sinGasto).getByText('Sin cargar')).toBeInTheDocument();

    const pie = screen.getByText('Total gastado').closest('tr');
    expect(within(pie).getByText(cifra('1.750.000'))).toBeInTheDocument();
  });

  it('ya no ofrece importar reportes', () => {
    montar();
    expect(screen.queryByText(/importar/i)).not.toBeInTheDocument();
  });
});

describe('Cargar gasto', () => {
  const abrirCarga = (nombre) => {
    const fila = screen.getByText(nombre, { selector: 'button' }).closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /cargar gasto/i }));
    return screen.getByRole('heading', { name: /cargar gasto/i }).closest('div').parentElement;
  };

  it('arranca en el día siguiente al último cargado y guarda el rango con su monto', async () => {
    metaReportesService.crearGasto.mockResolvedValue({ id: 32 });
    const onCambio = montar();
    const modal = abrirCarga('P0003 | TERMO | WEB | CONVERSION | CBO');

    expect(within(modal).getByLabelText('Desde')).toHaveValue('2026-10-15');
    expect(within(modal).getByText(/Llevás cargado/)).toHaveTextContent('1.750.000');

    fireEvent.change(within(modal).getByLabelText('Hasta'), { target: { value: '2026-10-21' } });
    fireEvent.change(within(modal).getByLabelText('Monto gastado'), { target: { value: '840000' } });
    expect(within(modal).getByText(/7 días/)).toHaveTextContent('120.000');

    fireEvent.click(within(modal).getByRole('button', { name: 'Cargar gasto' }));

    await waitFor(() => expect(metaReportesService.crearGasto).toHaveBeenCalledWith(7, {
      fecha_desde: '2026-10-15', fecha_hasta: '2026-10-21', monto: 840000, nota: null,
    }));
    await waitFor(() => expect(onCambio).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: /cargar gasto/i })).not.toBeInTheDocument();
  });

  it('no manda nada sin monto, y muestra el error del backend si el rango se pisa', async () => {
    metaReportesService.crearGasto.mockRejectedValue({
      response: { data: { message: 'Esta campaña ya tiene gasto cargado del 08/10/2026 al 14/10/2026. Editá ese registro o elegí un rango que no se pise.' } },
    });
    montar();
    const modal = abrirCarga('P0008 | MATE | WHATSAPP | EVALUACION | ABO');

    fireEvent.change(within(modal).getByLabelText('Desde'), { target: { value: '2026-10-10' } });
    fireEvent.change(within(modal).getByLabelText('Hasta'), { target: { value: '2026-10-12' } });
    fireEvent.submit(within(modal).getByRole('button', { name: 'Cargar gasto' }).closest('form'));

    expect(await within(modal).findByRole('alert')).toHaveTextContent('mayor a cero');
    expect(metaReportesService.crearGasto).not.toHaveBeenCalled();

    fireEvent.change(within(modal).getByLabelText('Monto gastado'), { target: { value: '50000' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Cargar gasto' }));

    await waitFor(() => expect(within(modal).getByRole('alert')).toHaveTextContent('ya tiene gasto cargado del 08/10/2026 al 14/10/2026'));
    // El modal sigue abierto para corregir el rango.
    expect(within(modal).getByLabelText('Desde')).toHaveValue('2026-10-10');
  });
});

describe('Histórico de gasto', () => {
  const abrirHistorico = async () => {
    fireEvent.click(screen.getAllByTitle('Ver histórico de gasto')[0]);
    await screen.findByText('08/10/2026 → 14/10/2026');
  };

  it('lista cada rango con su monto y el total de la campaña', async () => {
    montar();
    await abrirHistorico();

    expect(metaReportesService.listarGastos).toHaveBeenCalledWith(7, {
      pagina: 1, limite: 10, orden: { campo: 'fecha_desde', direccion: 'DESC' },
    });

    const fila = screen.getByText('08/10/2026 → 14/10/2026').closest('tr');
    expect(within(fila).getByText(cifra('700.000'))).toBeInTheDocument();
    expect(within(fila).getByText('subí presupuesto')).toBeInTheDocument();

    const pie = screen.getByText('Total de la campaña').closest('tr');
    expect(within(pie).getByText(cifra('1.750.000'))).toBeInTheDocument();
    expect(within(pie).getByText('21')).toBeInTheDocument();
  });

  it('ordenar por monto se lo pide al backend', async () => {
    montar();
    await abrirHistorico();

    fireEvent.click(screen.getByTitle('Ordenar por gastado'));

    await waitFor(() => expect(metaReportesService.listarGastos).toHaveBeenLastCalledWith(7, {
      pagina: 1, limite: 10, orden: { campo: 'monto', direccion: 'DESC' },
    }));
  });

  it('corregir un registro lo actualiza en vez de crear otro', async () => {
    metaReportesService.actualizarGasto.mockResolvedValue({ id: 30 });
    const onCambio = montar();
    await abrirHistorico();

    const fila = screen.getByText('01/10/2026 → 07/10/2026').closest('tr');
    fireEvent.click(within(fila).getByTitle('Corregir'));

    const modal = screen.getByRole('heading', { name: /corregir gasto/i }).closest('div').parentElement;
    expect(within(modal).getByLabelText('Desde')).toHaveValue('2026-10-01');
    fireEvent.change(within(modal).getByLabelText('Monto gastado'), { target: { value: '650000' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(metaReportesService.actualizarGasto).toHaveBeenCalledWith(30, {
      fecha_desde: '2026-10-01', fecha_hasta: '2026-10-07', monto: 650000, nota: null,
    }));
    expect(metaReportesService.crearGasto).not.toHaveBeenCalled();
    await waitFor(() => expect(onCambio).toHaveBeenCalled());
  });

  it('eliminar pide confirmación y recarga el histórico', async () => {
    metaReportesService.eliminarGasto.mockResolvedValue({});
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onCambio = montar();
    await abrirHistorico();

    const fila = screen.getByText('24/09/2026 → 30/09/2026').closest('tr');
    fireEvent.click(within(fila).getByTitle('Eliminar'));

    await waitFor(() => expect(metaReportesService.eliminarGasto).toHaveBeenCalledWith(29));
    await waitFor(() => expect(metaReportesService.listarGastos).toHaveBeenCalledTimes(2));
    expect(onCambio).toHaveBeenCalled();
    confirmar.mockRestore();
  });
});
