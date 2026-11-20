import { reportesService } from '../../../../services/reportesApi';

const LIMITE_POR_PAGINA = 500;
const CONCURRENCIA = 3;

const CALIFICACION_LABEL = {
  recurrente: 'Recurrente',
  bueno: 'Bueno',
  problematico: 'Problemático',
  sin_entregas: 'Sin entregas aún',
};

const CABECERAS = [
  'Nombre',
  'Teléfono',
  'Correo',
  'Acepta promociones',
  'Calificación',
  'Pedidos',
  'Recibidos',
  'Devoluciones',
  'Cancelados',
  'Total comprado',
  'Ticket promedio',
  'Último pedido',
];

function celdaCsv(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function etiquetaPromociones(valor) {
  if (valor === true) return 'Sí';
  if (valor === false) return 'No';
  return 'Sin especificar';
}

function filaACsv(row) {
  return [
    row.nombre || '',
    row.telefono || '',
    row.email || '',
    etiquetaPromociones(row.acepta_promociones),
    CALIFICACION_LABEL[row.calificacion] || row.calificacion || '',
    row.pedidos_totales ?? 0,
    row.entregados ?? 0,
    row.devueltos ?? 0,
    row.cancelados ?? 0,
    row.total_comprado ?? 0,
    row.ticket_promedio ?? 0,
    row.ultimo_pedido ? String(row.ultimo_pedido).slice(0, 10) : '',
  ].map(celdaCsv).join(',');
}

export function armarCsvClientes(filas) {
  const lineas = [CABECERAS.join(','), ...filas.map(filaACsv)];
  return '\uFEFF' + lineas.join('\r\n');
}

function descargarArchivo(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

async function traerTodosLosClientes(filtros) {
  const primera = await reportesService.obtenerReporteClientes({
    ...filtros,
    pagina: 1,
    limite: LIMITE_POR_PAGINA,
  });
  const totalPaginas = primera.paginas || 1;
  const paginas = [primera.data || []];

  let siguiente = 2;
  async function trabajador() {
    while (siguiente <= totalPaginas) {
      const pagina = siguiente++;
      const res = await reportesService.obtenerReporteClientes({
        ...filtros,
        pagina,
        limite: LIMITE_POR_PAGINA,
      });
      paginas[pagina - 1] = res.data || [];
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCIA, Math.max(totalPaginas - 1, 0)) }, trabajador),
  );
  return paginas.flat();
}

/**
 * Exporta clientes a CSV para análisis o campañas de email marketing.
 * @param {object} filtros - Filtros activos del reporte (buscador, calificacion, fechas, etc.)
 * @param {'todos'|'con_correo'|'promociones'} alcance
 * @returns {Promise<number>} Cantidad de clientes exportados
 */
export async function exportarClientesCsv(filtros = {}, alcance = 'todos') {
  const params = { ...filtros };
  if (alcance === 'con_correo') params.solo_con_email = true;
  if (alcance === 'promociones') params.solo_acepta_promociones = true;

  const filas = await traerTodosLosClientes(params);
  if (filas.length === 0) return 0;

  const hoy = new Date().toISOString().slice(0, 10);
  const sufijo = alcance === 'promociones'
    ? 'email-marketing'
    : alcance === 'con_correo'
      ? 'con-correo'
      : 'todos';
  descargarArchivo(armarCsvClientes(filas), `clientes-${sufijo}-${hoy}.csv`);
  return filas.length;
}
