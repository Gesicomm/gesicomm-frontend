import { leerPreferenciaDashboard } from '../../utils/preferenciasDashboard';
import { getMetricasDashboardPedidos } from '../../services/courierApi';
import { landingService } from '../../services/landingService';

/**
 * Precarga del Dashboard General.
 *
 * Al elegir la tienda, el dashboard recién pedía sus dos consultas después
 * de bajar su chunk y de que el cascarón del panel terminara de armarse:
 * más de un segundo mirando una pantalla vacía ANTES de preguntar nada. Y
 * son justamente las dos consultas más pesadas del lado del servidor
 * (analítica sobre envíos y el tráfico del pixel). Acá arrancan apenas se
 * sabe con qué tienda se va a trabajar, en paralelo con esa carga.
 *
 * Solo sirve para la primera vista, la del período por defecto: cambiar de
 * período o de producto pide de nuevo al servidor, como siempre.
 */
const VIGENCIA_MS = 60_000;
let precarga = null;

/** Los mismos filtros con los que MiDashboard se dibuja al abrirse. */
export function filtrosInicialesDashboard() {
  const guardado = leerPreferenciaDashboard('general');
  const periodos = ['hoy', 'ayer', '7d', '30d', 'este_mes', 'mes_anterior', 'este_anio', 'personalizado_mes'];
  const periodo = periodos.includes(guardado.periodo) ? guardado.periodo : 'este_mes';
  const mes = Number(guardado.mes);
  const anio = Number(guardado.anio);
  return {
    periodo,
    mes: periodo === 'personalizado_mes' && mes >= 1 && mes <= 12 ? mes : undefined,
    anio: Number.isInteger(anio) && anio >= 1900 && anio <= 2200 ? anio : new Date().getFullYear(),
    producto_id: Number(guardado.producto_id) > 0 ? String(guardado.producto_id) : undefined,
  };
}

const mismosFiltros = (uno = {}, otro = {}) =>
  ['periodo', 'mes', 'anio', 'producto_id'].every(c => uno[c] === otro[c]);

export function precargarDashboard() {
  const filtros = filtrosInicialesDashboard();
  const ventas = getMetricasDashboardPedidos(filtros);
  // Mismo criterio que en el dashboard: un problema del pixel no deja sin
  // ventas a la pantalla.
  const pixel = landingService.estadisticasRango('todas', filtros).catch(() => null);
  const actual = { desde: Date.now(), filtros, ventas, pixel };
  // Sin este catch, un error que nadie consuma queda como rechazo sin manejar.
  ventas.catch(() => { if (precarga === actual) precarga = null; });
  precarga = actual;
}

/** La precarga si sirve para estos filtros; se consume una sola vez. */
export function tomarPrecargaDashboard(filtros) {
  const actual = precarga;
  precarga = null;
  if (!actual || Date.now() - actual.desde > VIGENCIA_MS) return null;
  return mismosFiltros(actual.filtros, filtros) ? actual : null;
}
