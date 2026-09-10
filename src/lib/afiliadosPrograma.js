const STORAGE_KEY = 'gesicomm.afiliados.config.v1';

export const AFILIADOS_DEFAULT = {
  activo: true,
  comision_pct: 40,
  recurrencia: 'Recurrente mientras el cliente referido permanezca activo y al dia.',
  base_comisionable: 'Suscripcion SaaS elegible efectivamente cobrada por Gesicom.',
  exclusiones: [
    'Autorreferidos.',
    'Cancelaciones, devoluciones y contracargos.',
    'Servicios adicionales, implementaciones, consumos, impuestos u otros conceptos no SaaS.',
  ],
  condiciones: [
    'La comision se calcula solo sobre pagos cobrados.',
    'El cliente referido debe permanecer activo y con pagos al dia.',
    'Gesicom puede ajustar reglas operativas del programa y comunicar cambios relevantes.',
  ],
};

export function normalizarConfigAfiliados(config) {
  const entrada = config && typeof config === 'object' ? config : {};
  return {
    ...AFILIADOS_DEFAULT,
    ...entrada,
    activo: entrada.activo !== undefined ? !!entrada.activo : AFILIADOS_DEFAULT.activo,
    comision_pct: Math.max(0, Math.min(100, Number(entrada.comision_pct ?? AFILIADOS_DEFAULT.comision_pct) || 0)),
    exclusiones: Array.isArray(entrada.exclusiones) ? entrada.exclusiones : AFILIADOS_DEFAULT.exclusiones,
    condiciones: Array.isArray(entrada.condiciones) ? entrada.condiciones : AFILIADOS_DEFAULT.condiciones,
  };
}

export function cargarAfiliadosLocal() {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY);
    if (!crudo) return AFILIADOS_DEFAULT;
    return normalizarConfigAfiliados(JSON.parse(crudo));
  } catch {
    return AFILIADOS_DEFAULT;
  }
}

export function guardarAfiliadosLocal(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizarConfigAfiliados(config)));
    return true;
  } catch {
    return false;
  }
}
