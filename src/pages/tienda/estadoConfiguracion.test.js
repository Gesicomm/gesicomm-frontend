import { describe, expect, it } from 'vitest';
import { estadosConfiguracion } from './estadoConfiguracion';

describe('Estado de configuración guardada', () => {
  it('no completa secciones sin datos', () => {
    expect(Object.values(estadosConfiguracion(null)).every(e => !e.completo)).toBe(true);
  });

  it('mantiene la tienda pendiente si falta la cédula del titular', () => {
    const tienda = { nombre: 'Mi tienda', subdominio: 'mi-tienda' };
    expect(estadosConfiguracion(tienda).tienda.completo).toBe(false);
    expect(estadosConfiguracion({ ...tienda, documento: '4123456' }).tienda.completo).toBe(true);
  });

  it.each([
    ['whatsapp', { whatsapp: '595981111222' }],
    ['email', { email: 'ventas@tienda.com' }],
    ['telefono', { telefono: '+595 (981) 111222' }],
    ['instagram', { instagram: '@mi.tienda' }],
  ])('evalúa el canal preferido %s', (canal_contacto, datos) => {
    expect(estadosConfiguracion({ canal_contacto, ...datos }).contacto.completo).toBe(true);
    expect(estadosConfiguracion({ canal_contacto, whatsapp: '123', email: 'invalido', instagram: '' }).contacto.completo).toBe(false);
  });

  it('exige un pago activo y admite costos guardados en cero', () => {
    const recursos = { pagos: [{ activo: false }], costos: { cpa_porcentaje: 0, costo_envio: 0, costo_confirmacion: 0, costo_empaque: 0 } };
    expect(estadosConfiguracion({}, recursos).pasarelas.completo).toBe(false);
    expect(estadosConfiguracion({}, recursos).economica.completo).toBe(true);
    recursos.pagos[0].activo = true;
    expect(estadosConfiguracion({}, recursos).pasarelas.completo).toBe(true);
    recursos.costos.costo_envio = '';
    expect(estadosConfiguracion({}, recursos).economica.completo).toBe(false);
  });

  it('la aprobación y las pruebas sandbox todavía no completan logística', () => {
    const recursos = { solicitud: { estado: 'aprobada' }, logistica: { connections: [{ environment: 'sandbox', activo: true }] } };
    expect(estadosConfiguracion({}, recursos).raha.completo).toBe(false);
    recursos.logistica.connections.push({ environment: 'production', activo: true });
    expect(estadosConfiguracion({}, recursos).raha.completo).toBe(true);
  });
});
