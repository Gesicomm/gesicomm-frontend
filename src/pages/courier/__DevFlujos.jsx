import React from 'react';
import { FlujosWhatsapp } from './FlujosWhatsapp';

/**
 * Banco de pruebas del constructor de flujos de WhatsApp, sin backend ni
 * sesión: el MISMO componente FlujosWhatsapp con un servicio falso.
 *
 * Sirve para revisar el layout, el resaltado de variables y la vista previa
 * sin tener que entrar al panel. Guardar y eliminar no hacen nada.
 *
 * Se borra junto con la ruta /dev/flujos cuando ya no haga falta.
 */

const VARIABLES = [
  { key: 'cliente_nombre',    grupo: 'Cliente', desc: 'Nombre del cliente',            ejemplo: 'María González' },
  { key: 'telefono',          grupo: 'Cliente', desc: 'Teléfono del cliente',          ejemplo: '0981 234 567' },
  { key: 'pedido_id',         grupo: 'Pedido',  desc: 'Número del pedido',             ejemplo: '1842' },
  { key: 'productos',         grupo: 'Pedido',  desc: 'Lista de productos del pedido', ejemplo: 'Zapatilla Urban Black, Remera Oversize' },
  { key: 'total_gs',          grupo: 'Pedido',  desc: 'Monto total en guaraníes',      ejemplo: 'Gs. 249.000' },
  { key: 'direccion_entrega', grupo: 'Envío',   desc: 'Dirección de entrega',          ejemplo: 'Av. Mariscal López 1234, Asunción' },
  { key: 'courier_nombre',    grupo: 'Envío',   desc: 'Nombre del courier',            ejemplo: 'Pronto Entrega' },
];

const ETIQUETAS = [
  { id: 1, nombre: 'DÍA 1', color: '#3b82f6', activo: true },
  { id: 2, nombre: 'DÍA 2', color: '#f59e0b', activo: true },
  { id: 3, nombre: 'No responde', color: '#ef4444', activo: true },
];

const FLUJOS = [
  {
    id: 1,
    nombre: 'Confirmación de pedido',
    descripcion: 'Para pedidos nuevos que todavía no confirmó el cliente.',
    activo: true,
    fases: [
      {
        id: 101, flujo_id: 1, orden: 1, nombre: 'Primer contacto', activo: true,
        espera_sugerida_minutos: 0, etiqueta_id: 1,
        mensaje: 'Hola {cliente_nombre}, te escribimos para confirmar tu pedido #{pedido_id}.\n\nProductos: {productos}\nTotal: {total_gs}\nEntrega: {direccion_entrega}\n\n¿Nos confirmás que podemos prepararlo?',
      },
      {
        id: 102, flujo_id: 1, orden: 2, nombre: 'Recordatorio', activo: true,
        espera_sugerida_minutos: 240, etiqueta_id: 2,
        mensaje: 'Hola {cliente_nombre}, volvemos a escribirte por tu pedido #{pedido_id}.\n\n¿Podrías confirmarnos si seguimos adelante?',
      },
      {
        id: 103, flujo_id: 1, orden: 3, nombre: 'Último intento', activo: true,
        espera_sugerida_minutos: 1440, etiqueta_id: 3,
        mensaje: 'Hola {cliente_nombre}, este es nuestro último intento de confirmación.\n\nSi todavía querés recibir tu pedido, respondé este mensaje.',
      },
    ],
  },
  {
    id: 2,
    nombre: 'Recuperación de carrito',
    descripcion: '',
    activo: false,
    fases: [
      {
        id: 201, flujo_id: 2, orden: 1, nombre: 'Primer contacto', activo: true,
        espera_sugerida_minutos: 0, etiqueta_id: null,
        mensaje: 'Hola {cliente_nombre}, vimos que dejaste {productos} sin terminar la compra. ¿Te ayudamos?',
      },
      {
        id: 202, flujo_id: 2, orden: 2, nombre: 'Recordatorio', activo: true,
        espera_sugerida_minutos: 2880, etiqueta_id: null,
        mensaje: 'Hola {cliente_nombe}, te guardamos el stock un día más.',
      },
    ],
  },
];

const clonar = (x) => JSON.parse(JSON.stringify(x));

const servicioFalso = {
  getFlujos: async () => clonar(FLUJOS),
  getFlujo: async (id) => clonar(FLUJOS.find((f) => f.id === Number(id))),
  getEtiquetas: async () => clonar(ETIQUETAS),
  getVariables: async () => clonar(VARIABLES),
  createFlujo: async (payload) => { console.log('[dev] createFlujo', payload); return payload; },
  updateFlujo: async (id, payload) => { console.log('[dev] updateFlujo', id, payload); return payload; },
  deleteFlujo: async (id) => { console.log('[dev] deleteFlujo', id); return null; },
};

export default function DevFlujos() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem', color: 'var(--color-fg)' }}>
      <FlujosWhatsapp servicio={servicioFalso} />
    </div>
  );
}
