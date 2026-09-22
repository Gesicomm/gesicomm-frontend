/**
 * Vocabulario del proveedor logístico.
 *
 * Deliberadamente no reutiliza nada del courier: son entidades distintas y
 * mezclar sus etiquetas fue lo que hizo que la red se administrara como si
 * fuera un CRUD de repartidores. Acá no se dice "delivery" ni "courier de la
 * tienda": esta pantalla es Red de Fulfillment, no el módulo Delivery.
 *
 * Las descripciones están escritas para que las entienda cualquiera, no sólo
 * alguien que sepa de logística.
 */

export const TIPOS = [
  {
    valor: 'TRANSPORTADORA',
    etiqueta: 'Transportadora',
    ayuda: 'Mueve cargas grandes entre ciudades.',
  },
  {
    valor: 'OPERADOR_ULTIMA_MILLA',
    etiqueta: 'Operador de última milla',
    ayuda: 'Entrega paquetes puerta a puerta.',
  },
  {
    valor: 'FLOTA_PROPIA',
    etiqueta: 'Flota propia',
    ayuda: 'Vehículos que maneja Gesicomm.',
  },
];

/**
 * Qué sabe hacer un proveedor. El orden sigue el recorrido de la mercadería:
 * primero se la retira, después se la mueve y al final se la entrega.
 *
 * "Distribución a depósitos de comercios" y "Última milla" son dos destinos
 * distintos y por eso son dos capacidades distintas: una termina en el
 * depósito del comercio y la otra en la casa del comprador.
 */
export const CAPACIDADES = [
  {
    valor: 'RETIRO_EN_PROVEEDOR',
    etiqueta: 'Retiro en proveedor',
    ayuda: 'Retira mercadería directamente del proveedor.',
  },
  {
    valor: 'CROSS_DOCKING',
    etiqueta: 'Cross-docking',
    ayuda: 'Recibe y redistribuye mercadería sin almacenarla.',
  },
  {
    valor: 'ALMACENAMIENTO',
    etiqueta: 'Almacenamiento',
    ayuda: 'Puede almacenar mercadería dentro de su operación.',
  },
  {
    valor: 'TRASLADO_ENTRE_CENTROS',
    etiqueta: 'Traslado entre centros',
    ayuda: 'Mueve mercadería entre centros de Gesicomm.',
  },
  {
    valor: 'ENTREGA_A_DEPOSITO_COMERCIO',
    etiqueta: 'Distribución a depósitos de comercios',
    ayuda: 'Lleva abastecimientos desde Gesicomm hasta el depósito del comercio.',
  },
  {
    valor: 'ULTIMA_MILLA',
    etiqueta: 'Última milla',
    ayuda: 'Entrega pedidos al cliente final.',
  },
];

export function etiquetaTipo(valor) {
  return TIPOS.find((t) => t.valor === valor)?.etiqueta || 'Proveedor';
}

export function etiquetaCapacidad(valor) {
  return CAPACIDADES.find((c) => c.valor === valor)?.etiqueta || valor;
}
