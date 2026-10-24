// Período del Dashboard Operativo. Un solo lugar que traduce el preset
// elegido ("Este mes", "Mes anterior"...) a fechas concretas: todos los
// reportes reciben fecha_desde/fecha_hasta ya resueltas. Antes cada reporte
// mandaba el preset suelto y la mayoría del backend lo ignoraba, así que
// mostraban el historial completo sin importar el período.

export const PRESETS_PERIODO = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: 'este_mes', label: 'Este mes' },
  { id: 'mes_anterior', label: 'Mes anterior' },
  { id: 'este_anio', label: 'Este año' },
  { id: 'personalizado_mes', label: 'Elegir mes' },
  { id: 'personalizado_rango', label: 'Elegir fechas' },
];

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const pad = n => String(n).padStart(2, '0');
export const fechaYMD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function resolverRango(filters, hoy = new Date()) {
  const anio = Number(filters.anio) || hoy.getFullYear();

  switch (filters.periodo) {
    case 'personalizado_rango':
      return { fecha_desde: filters.fecha_desde || '', fecha_hasta: filters.fecha_hasta || '' };
    case 'personalizado_mes': {
      const m = Number(filters.mes) || hoy.getMonth() + 1;
      return { fecha_desde: fechaYMD(new Date(anio, m - 1, 1)), fecha_hasta: fechaYMD(new Date(anio, m, 0)) };
    }
    case 'hoy':
      return { fecha_desde: fechaYMD(hoy), fecha_hasta: fechaYMD(hoy) };
    case 'ayer': {
      const a = new Date(hoy); a.setDate(a.getDate() - 1);
      return { fecha_desde: fechaYMD(a), fecha_hasta: fechaYMD(a) };
    }
    case '7d': {
      const d = new Date(hoy); d.setDate(d.getDate() - 6);
      return { fecha_desde: fechaYMD(d), fecha_hasta: fechaYMD(hoy) };
    }
    case '30d': {
      const d = new Date(hoy); d.setDate(d.getDate() - 29);
      return { fecha_desde: fechaYMD(d), fecha_hasta: fechaYMD(hoy) };
    }
    case 'mes_anterior':
      return {
        fecha_desde: fechaYMD(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
        fecha_hasta: fechaYMD(new Date(hoy.getFullYear(), hoy.getMonth(), 0)),
      };
    case 'este_anio':
      return { fecha_desde: `${anio}-01-01`, fecha_hasta: `${anio}-12-31` };
    case 'este_mes':
    default:
      return {
        fecha_desde: fechaYMD(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        fecha_hasta: fechaYMD(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
      };
  }
}

/** "1 oct. 2026 – 31 oct. 2026 · 31 días" para mostrar qué se está mirando. */
export function describirRango({ fecha_desde, fecha_hasta }) {
  if (!fecha_desde || !fecha_hasta) return null;
  const [y1, m1, d1] = fecha_desde.split('-').map(Number);
  const [y2, m2, d2] = fecha_hasta.split('-').map(Number);
  const desde = new Date(y1, m1 - 1, d1);
  const hasta = new Date(y2, m2 - 1, d2);
  const fmt = d => d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' });
  const dias = Math.round((hasta - desde) / 86400000) + 1;
  const texto = fecha_desde === fecha_hasta ? fmt(desde) : `${fmt(desde)} – ${fmt(hasta)}`;
  return { texto, dias };
}

/** "2026-10-21" → "21/10/2026", como se lee en Paraguay. Si no es una
 * fecha ISO la devuelve tal cual. */
export function fechaCorta(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (ymd || '');
}
