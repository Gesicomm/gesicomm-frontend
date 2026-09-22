/**
 * Reconstruye el estado del formulario a partir de las reglas guardadas.
 *
 * En la base las tarifas son planas: una fila por ciudad y por rango. El
 * formulario, en cambio, habla de "tarifa base" + "precios propios", que es
 * un atajo de carga y no una entidad. Para poder editar hay que volver del
 * plano al atajo, y eso es una inferencia — no una lectura.
 *
 * Por eso devuelve `avisos`: cuando los datos no entran limpios en el modelo
 * del formulario (métodos de pago mezclados, una ciudad sin todos los
 * rangos), se dice en pantalla en vez de aplanar en silencio y que el
 * guardado se lleve puesto algo que nadie vio.
 */

const clave = (regla) => (regla.ciudad_id ? `id:${regla.ciudad_id}` : `txt:${regla.ciudad}`);
const claveRango = (r) => `${Number(r.rango_min) || 0}-${r.rango_max ?? ''}`;

/** El valor que más se repite. Empate: el primero en aparecer. */
function moda(valores) {
  const cuenta = new Map();
  for (const v of valores) cuenta.set(v, (cuenta.get(v) || 0) + 1);
  let mejor = null;
  let mejorN = -1;
  for (const [v, n] of cuenta) {
    if (n > mejorN) { mejor = v; mejorN = n; }
  }
  return mejor;
}

export function reconstruirDesdeReglas(reglas = []) {
  const avisos = [];

  if (reglas.length === 0) {
    return {
      configuraciones: new Map(),
      avisos,
    };
  }

  // Agrupar reglas por ciudad
  const reglasPorCiudad = new Map();
  const infoCiudad = new Map();

  for (const r of reglas) {
    let ciudadId = r.ciudad_id ?? clave(r);
    if (r.tipo_cobertura === 'RESTO_PAIS') ciudadId = 'RESTO_PAIS';

    if (!infoCiudad.has(ciudadId)) {
      infoCiudad.set(ciudadId, {
        ciudad_id: r.ciudad_id ?? null,
        ciudad: r.tipo_cobertura === 'RESTO_PAIS' ? 'Resto del país' : r.ciudad,
        departamento_id: r.departamento_id ?? null,
        departamento: r.departamento ?? null,
        pais_id: r.pais_id ?? null,
        tipo_cobertura: r.tipo_cobertura || 'CIUDAD',
      });
    }

    const arr = reglasPorCiudad.get(ciudadId) || [];
    arr.push(r);
    reglasPorCiudad.set(ciudadId, arr);
  }

  // Generar configuración completa por ciudad
  const configuraciones = new Map();

  for (const [ciudadId, cityRules] of reglasPorCiudad.entries()) {
    // Agrupar las reglas de esta ciudad por su modalidad (tipo_pago y tiempos)
    // Para simplificar, agrupamos por tipo_pago, asumiendo que los tiempos de entrega
    // son consistentes dentro del mismo tipo_pago para la misma ciudad.
    const rulesByPayment = new Map();
    for (const r of cityRules) {
      const tp = r.tipo_pago || 'Ambos';
      const arr = rulesByPayment.get(tp) || [];
      arr.push(r);
      rulesByPayment.set(tp, arr);
    }

    const modalidades = [];
    
    for (const [tp, rules] of rulesByPayment.entries()) {
      rules.sort((a, b) => (Number(a.rango_min) || 0) - (Number(b.rango_min) || 0));

      const rangos = rules.map(r => ({
        rango_min: Number(r.rango_min) || 0,
        rango_max: r.rango_max === null || r.rango_max === undefined || r.rango_max === '' ? '' : Number(r.rango_max),
        costo: Number(r.costo) || 0,
      }));

      const tiempo = {
        min: rules[0]?.tiempo_entrega_min_hs ?? '',
        max: rules[0]?.tiempo_entrega_max_hs ?? '',
      };

      modalidades.push({
        tipoPago: tp,
        tiempo,
        rangos
      });
    }

    configuraciones.set(ciudadId, {
      ...infoCiudad.get(ciudadId),
      modalidades
    });
  }

  return {
    configuraciones,
    avisos,
  };
}
