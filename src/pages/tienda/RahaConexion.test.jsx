import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import RahaConexion, { semaforoRaha } from './RahaConexion';
import { rahaService } from '../../services/rahaService';
vi.mock('../../services/rahaService', () => ({ rahaService: { obtener: vi.fn(), guardar: vi.fn(), enviar: vi.fn(), subir: vi.fn(), quitar: vi.fn(), documento: vi.fn(), contrato: vi.fn() } }));
const base = { id: 1, estado: 'borrador', version: 0, datos: {}, documentos: [], historial: [] };
beforeEach(() => { cleanup(); vi.clearAllMocks(); rahaService.obtener.mockResolvedValue(structuredClone(base)); });
describe('Raha application', () => {
  it('guarda lo que está en pantalla antes de descargar el contrato', async () => {
    rahaService.guardar.mockResolvedValue({ ...base, version: 1 });
    rahaService.contrato.mockResolvedValue();
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Banco'), { target: { value: 'Banco Itaú' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar contrato para firmar' }));
    await waitFor(() => expect(rahaService.contrato).toHaveBeenCalled());
    expect(rahaService.guardar.mock.calls[0][0].datos.banco).toBe('Banco Itaú');
    expect(rahaService.guardar.mock.invocationCallOrder[0]).toBeLessThan(rahaService.contrato.mock.invocationCallOrder[0]);
  });
  it('pide el contrato firmado en PDF y lo exige para enviar', async () => {
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Adjuntar Contrato marco firmado'), { target: { files: [new File(['x'], 'pagina1.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('un solo PDF');
    expect(rahaService.subir).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('Descargá el contrato, firmalo y subilo escaneado.')).toBeInTheDocument();
    expect(rahaService.enviar).not.toHaveBeenCalled();
  });
  it('prefills known store data and requires consent before submitting', async () => {
    render(<RahaConexion tienda={{ nombre: 'Mi empresa', ruc: '80000000-0' }} />);
    expect(await screen.findByLabelText('Razón social')).toHaveValue('Mi empresa');
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled();
  });
  it('preserves inputs after upload and validation errors', async () => {
    rahaService.subir.mockResolvedValue({ ...base, version: 1, documentos: [{ id: 4, tipo: 'ruc', nombre: 'ruc.pdf', size: 30 }] });
    rahaService.guardar.mockRejectedValue({ response: { data: { message: 'Conflicto de version' } } });
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Tipo de productos que vendés'), { target: { value: 'Ropa y calzado' } });
    fireEvent.change(screen.getByLabelText('Adjuntar Constancia de RUC'), { target: { files: [new File(['%PDF'], 'ruc.pdf', { type: 'application/pdf' })] } });
    await screen.findByText('ruc.pdf');
    expect(screen.getByLabelText('Tipo de productos que vendés')).toHaveValue('Ropa y calzado');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de version');
    expect(screen.getByLabelText('Tipo de productos que vendés')).toHaveValue('Ropa y calzado');
    expect(rahaService.guardar.mock.calls[0][0].version).toBe(1);
  });
  it('disallows modifying a pending application but shows review notes', async () => {
    rahaService.obtener.mockResolvedValue({ ...base, estado: 'en_revision', historial: [{ estado: 'observada', ocurrido_at: '2026-10-03T00:00:00Z', nota: 'La cedula no se lee.' }] });
    render(<RahaConexion />);
    expect(await screen.findByLabelText('Razón social')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).not.toBeInTheDocument();
    expect(screen.getByText('La cedula no se lee.')).toBeInTheDocument();
  });
  it('rejects unsupported file types without posting them', async () => {
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Adjuntar Constancia de RUC'), { target: { files: [new File(['<svg/>'], 'ruc.svg', { type: 'image/svg+xml' })] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('hasta 8 MB'));
    expect(rahaService.subir).not.toHaveBeenCalled();
  });
  it('shows upload progress next to the document and confirms when it is stored', async () => {
    let avanzar, terminar;
    rahaService.subir.mockImplementation((file, tipo, version, onProgreso) => { avanzar = onProgreso; return new Promise(resolve => { terminar = resolve; }); });
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Adjuntar Constancia de RUC'), { target: { files: [new File(['%PDF'], 'ruc.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText('Subiendo… 0%')).toBeInTheDocument();
    expect(screen.getByLabelText('Adjuntar Cédula del representante legal')).toBeDisabled();
    act(() => avanzar(40));
    expect(screen.getByText('Subiendo… 40%')).toBeInTheDocument();
    act(() => avanzar(100));
    expect(screen.getByText('Guardando el archivo…')).toBeInTheDocument();
    await act(async () => terminar({ ...base, version: 1, documentos: [{ id: 4, tipo: 'ruc', nombre: 'ruc.pdf', size: 30 }] }));
    expect(screen.getByText('Archivo subido correctamente.')).toBeInTheDocument();
    expect(screen.getByText('Adjuntado')).toBeInTheDocument();
  });
  it.each(['Constancia de RUC', 'Cédula del representante legal'])('rechaza un archivo pesado en %s antes de enviarlo', async documento => {
    render(<RahaConexion />);
    const archivo = new File(['imagen'], 'documento.png', { type: 'image/png' });
    Object.defineProperty(archivo, 'size', { value: 9 * 1024 * 1024 });
    fireEvent.change(await screen.findByLabelText(`Adjuntar ${documento}`), { target: { files: [archivo] } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('El archivo es demasiado pesado');
    expect(alerta).toHaveTextContent('máximo de 8 MB');
    expect(alerta).not.toHaveTextContent(/servidor|conexión/i);
    expect(rahaService.subir).not.toHaveBeenCalled();
    expect(screen.getByLabelText(`Adjuntar ${documento}`)).toBeEnabled();
  });
  it.each([
    { response: { status: 413, data: '<html>413 Request Entity Too Large</html>' } },
    { response: { status: 413 } },
    { response: { status: 400, data: { code: 'FILE_TOO_LARGE' } } },
  ])('explica el rechazo por tamaño del servidor o proxy: %j', async error => {
    rahaService.subir.mockRejectedValue(error);
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Adjuntar Constancia de RUC'), { target: { files: [new File(['%PDF'], 'ruc.pdf', { type: 'application/pdf' })] } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('El archivo es demasiado pesado');
    expect(alerta).toHaveTextContent('8 MB por documento');
    expect(alerta).not.toHaveTextContent(/conexión|servidor/i);
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });
  it('no afirma una caída del servidor cuando el navegador no informa la causa', async () => {
    rahaService.subir.mockRejectedValue({ code: 'ERR_NETWORK' });
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Adjuntar Constancia de RUC'), { target: { files: [new File(['%PDF'], 'ruc.pdf', { type: 'application/pdf' })] } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No se pudo completar la carga del documento');
    expect(alerta).toHaveTextContent('máximo 8 MB');
    expect(alerta).not.toHaveTextContent(/No hay conexión con el servidor|servidor.*caído/i);
  });
  it('rechaza archivos vacíos con un mensaje específico', async () => {
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Adjuntar Constancia de RUC'), { target: { files: [new File([], 'ruc.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo está vacío');
    expect(rahaService.subir).not.toHaveBeenCalled();
  });
  it('reports a failed upload next to the document and lets the user retry', async () => {
    rahaService.subir.mockRejectedValue({ response: { status: 503, data: { message: 'Error interno del servidor.' } } });
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Adjuntar Constancia de RUC'), { target: { files: [new File(['%PDF'], 'ruc.pdf', { type: 'application/pdf' })] } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('ruc.pdf');
    expect(alerta).toHaveTextContent('El servidor no pudo guardar el archivo');
    expect(alerta.closest('.raha-doc-group')).toHaveTextContent('Constancia de RUC');
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
    expect(screen.getByText('Obligatorio', { selector: '.raha-doc-group:first-child span' })).toBeInTheDocument();
    expect(screen.getByLabelText('Adjuntar Constancia de RUC')).toBeEnabled();
  });
  it('shows custom inline validation errors when submitting with empty or invalid fields', async () => {
    render(<RahaConexion />);
    const consent = await screen.findByRole('checkbox');
    fireEvent.click(consent);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText(/Por favor completá todos los campos obligatorios/)).toBeInTheDocument();
    expect(screen.getByText('La razón social es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('El RUC es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El email es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Debés adjuntar la constancia de RUC.')).toBeInTheDocument();
    expect(screen.getByText('Debés adjuntar la cédula del representante legal.')).toBeInTheDocument();
    expect(rahaService.enviar).not.toHaveBeenCalled();
  });
  it('validates email and phone formats on blur with custom messages', async () => {
    render(<RahaConexion />);
    const emailInput = await screen.findByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'correo-invalido' } });
    fireEvent.blur(emailInput);
    expect(screen.getByText('Ingresá un email válido (ej: contacto@empresa.com).')).toBeInTheDocument();

    const telInput = screen.getByLabelText('Teléfono');
    fireEvent.change(telInput, { target: { value: 'abc' } });
    fireEvent.blur(telInput);
    expect(screen.getByText('Ingresá un teléfono válido (ej: 0981 123456).')).toBeInTheDocument();
  });
  it('correctly maps traffic light semaphore colors to application lifecycle', () => {
    expect(semaforoRaha('borrador').color).toBe('rojo');
    expect(semaforoRaha('observada').color).toBe('rojo');
    expect(semaforoRaha('rechazada').color).toBe('rojo');
    expect(semaforoRaha('enviada_raha').color).toBe('amarillo');
    expect(semaforoRaha('en_revision').color).toBe('amarillo');
    expect(semaforoRaha('aprobada').color).toBe('verde');
  });
});
