import { describe, it, expect } from 'vitest';
import { obtenerTarifaPara, buscarCourierYTarifa, buscarZonaDelivery } from './tarifaCourier';

/**
 * Esta lógica decide si el courier/costo del envío se autocompleta al
 * cargar un pedido. El caso real que la motivó: JB RIDER (courier real,
 * usuario 1) tiene una tarifa a "Luque" con `departamento: null` — nunca
 * se le cargó ese dato — y buscar con departamento="Central" (correcto,
 * Luque es de Central) no encontraba nada: el courier no se autocompletaba
 * aunque la tarifa existiera y cubriera esa ciudad.
 */
describe('tarifaCourier', () => {
  const jbRider = {
    id: 76,
    nombre: 'JB RIDER',
    tarifas: [
      { id: 124, ciudad_zona: 'Luque', departamento: null, tipo_pago: 'Anticipado', rango_min: 1, rango_max: 5, costo: 20000 },
    ],
  };

  describe('una tarifa sin departamento cargado cubre cualquier departamento', () => {
    it('el caso real: Luque sin departamento SÍ matchea buscando "Central"', () => {
      // Antes de este arreglo, esto devolvía null.
      const costo = obtenerTarifaPara([jbRider], 'Luque', 76, true, [{ cantidad: 1 }], 'Central');
      expect(costo).toBe(20000);
    });

    it('sigue funcionando sin especificar departamento (comportamiento previo, no se rompió)', () => {
      const costo = obtenerTarifaPara([jbRider], 'Luque', 76, true, [{ cantidad: 1 }], '');
      expect(costo).toBe(20000);
    });

    it('buscarCourierYTarifa también autocompleta con el departamento puesto', () => {
      const resultado = buscarCourierYTarifa([jbRider], 'Luque', true, [{ cantidad: 1 }], 'Central');
      expect(resultado).toEqual({ courierId: 76, costo: 20000 });
    });

    it('buscarZonaDelivery (tabla de zonas, no de couriers) también respeta el comodín', () => {
      const zonas = [{ ciudad: 'Luque', departamento: null, tipo_pago: 'Anticipado', costo: 20000, courier_id: 76, activo: true }];
      const resultado = buscarZonaDelivery(zonas, 'Luque', true, [{ cantidad: 1 }], 'Central');
      expect(resultado?.costo).toBe(20000);
    });
  });

  describe('una tarifa CON departamento cargado sigue siendo estricta', () => {
    const courierConDepto = {
      id: 1,
      tarifas: [{ ciudad_zona: 'Encarnacion', departamento: 'Itapúa', tipo_pago: 'Al Recibir', costo: 15000 }],
    };

    it('no matchea si se busca un departamento distinto al cargado', () => {
      const costo = obtenerTarifaPara([courierConDepto], 'Encarnacion', 1, false, [{ cantidad: 1 }], 'Central');
      expect(costo).toBeNull();
    });

    it('matchea cuando el departamento buscado coincide (case/acentos insensible)', () => {
      const costo = obtenerTarifaPara([courierConDepto], 'Encarnacion', 1, false, [{ cantidad: 1 }], 'itapua');
      expect(costo).toBe(15000);
    });
  });

  it('una tarifa específica del departamento le gana a una comodín más barata', () => {
    // Si alguien SÍ se tomó el trabajo de cargar una tarifa para el
    // departamento exacto, tiene que ganarle a una comodín sin departamento
    // — aunque la comodín sea más barata. La comodín es un "por si las
    // moscas", no la primera opción cuando hay una específica disponible.
    const courier = {
      id: 5,
      tarifas: [
        { ciudad_zona: 'Luque', departamento: null, tipo_pago: 'Anticipado', costo: 10000 },
        { ciudad_zona: 'Luque', departamento: 'Central', tipo_pago: 'Anticipado', costo: 25000 },
      ],
    };
    const costo = obtenerTarifaPara([courier], 'Luque', 5, true, [{ cantidad: 1 }], 'Central');
    expect(costo).toBe(25000);
  });

  it('sin especificar departamento, sigue eligiendo la más barata entre las que coinciden', () => {
    const courier = {
      id: 5,
      tarifas: [
        { ciudad_zona: 'Luque', departamento: null, tipo_pago: 'Anticipado', costo: 10000 },
        { ciudad_zona: 'Luque', departamento: 'Central', tipo_pago: 'Anticipado', costo: 25000 },
      ],
    };
    // Sin departamento buscado, ninguna es "específica" — gana la barata.
    const costo = obtenerTarifaPara([courier], 'Luque', 5, true, [{ cantidad: 1 }], '');
    expect(costo).toBe(10000);
  });

  it('el tipo de pago y el rango de cantidad siguen filtrando igual que antes', () => {
    const courier = {
      id: 9,
      tarifas: [
        { ciudad_zona: 'Luque', departamento: null, tipo_pago: 'Al Recibir', rango_min: 1, rango_max: 3, costo: 18000 },
        { ciudad_zona: 'Luque', departamento: null, tipo_pago: 'Al Recibir', rango_min: 4, rango_max: null, costo: 12000 },
      ],
    };
    expect(obtenerTarifaPara([courier], 'Luque', 9, false, [{ cantidad: 2 }], 'Central')).toBe(18000);
    expect(obtenerTarifaPara([courier], 'Luque', 9, false, [{ cantidad: 5 }], 'Central')).toBe(12000);
  });

  it('sin cobertura para la ciudad sigue devolviendo null', () => {
    expect(obtenerTarifaPara([jbRider], 'Ciudad del Este', 76, true, [{ cantidad: 1 }], 'Alto Paraná')).toBeNull();
  });
});
