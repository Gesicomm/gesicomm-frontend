// Glosario estándar de reportes.
// La fuente de verdad son los nombres visibles del dashboard principal.
export const METRIC_TERMS = Object.freeze({
  ventasNetas: 'Ventas netas',
  ticketPromedio: 'Ticket Promedio',
  utilidadNeta: 'Utilidad Neta',
  utilidadBruta: 'Utilidad Bruta',
  margen: 'Margen',
  margenBruto: 'Margen Bruto',
  conversion: 'Conversión',
  rentabilidad: 'Rentabilidad',
  ganancia: 'Ganancia',
  roiCanal: 'ROI sobre costo',
  costosFijos: 'Costos Fijos',
  costosVariables: 'Costos Variables',
  flujoCajaNeto: 'Flujo de caja neto',
  cajaDisponible: 'Caja disponible',
});

export const METRIC_HELP = Object.freeze({
  ventasNetas: 'Venta de productos entregados, sin delivery/flete. Los pedidos pendientes o cancelados no entran.',
  ticketPromedio: 'Promedio vendido por cada pedido entregado. Fórmula: ventas netas divididas por pedidos entregados.',
  utilidadNeta: 'Lo que te quedó limpio: las ventas netas menos todos los costos y gastos del período.',
  utilidadBruta: 'Ventas netas menos producto, envíos, comisiones e IVA. Todavía no descuenta Meta ni costos fijos.',
  margen: 'De cada 100 guaraníes de ventas netas, cuántos te quedaron limpios.',
  conversion: 'De cada 100 pedidos que entraron, cuántos lograste confirmar.',
  rentabilidad: 'De cada Gs 100 que vendiste, cuántos te quedaron de ganancia.',
});
