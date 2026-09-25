import { describe, it, expect } from 'vitest';
import { buscarOpcionDelivery, prepararOpcionesDelivery } from './deliveryOptions';

const opciones = prepararOpcionesDelivery([
  { ciudad: 'Asunción', departamento: 'Central' },
  { ciudad: 'Luque', departamento: 'Central' },
  { ciudad: 'San Lorenzo', departamento: 'Central' },
  { ciudad: 'San Lorenzo', departamento: 'Itapúa' },
]);

describe('buscarOpcionDelivery', () => {
  it('acepta la etiqueta completa, sin tildes ni mayúsculas', () => {
    expect(buscarOpcionDelivery(opciones, 'asuncion - central')?.ciudad).toBe('Asunción');
  });

  it('acepta solo la ciudad cuando no hay otra con el mismo nombre', () => {
    expect(buscarOpcionDelivery(opciones, 'Asunción')?.ciudad).toBe('Asunción');
    expect(buscarOpcionDelivery(opciones, ' luque ')?.ciudad).toBe('Luque');
  });

  it('con dos ciudades homónimas pide el departamento', () => {
    expect(buscarOpcionDelivery(opciones, 'San Lorenzo')).toBeNull();
    expect(buscarOpcionDelivery(opciones, 'San Lorenzo - Itapúa')?.departamento).toBe('Itapúa');
  });

  it('lo que no está en la lista no matchea', () => {
    expect(buscarOpcionDelivery(opciones, 'Encarnación')).toBeNull();
    expect(buscarOpcionDelivery(opciones, '')).toBeNull();
  });
});
