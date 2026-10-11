import React from 'react';
import { ResumenTab } from './ResumenTab';
import './courier.css';

/**
 * Banco de pruebas de la pestaña Resumen de Pedidos, sin backend ni sesión:
 * el MISMO componente ResumenTab (y el mismo SeguimientoPanel de la bandeja)
 * contra un backend de mentira que vive en este archivo.
 *
 * El backend falso respeta el contrato real: cada etapa tiene su flujo y sus
 * pedidos, filtra, busca y pagina él (el componente nunca recibe más que la
 * página que pidió), y un pedido cambia de columna recién cuando se marca el
 * mensaje como enviado. "Enviar mensaje" no abre nada. Sigue la convención
 * de __DevFlujos.jsx.
 *
 * Se borra junto con la ruta /dev/resumen cuando ya no haga falta.
 */

const enHoras = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
const TRES_DIAS = 3 * 24 * 60;

const ETAPAS = [
  { tipo: 'CONFIRMACION_PEDIDO_WEB', nombre: 'Confirmación de pedido web', descripcion: 'Pedidos nuevos que entraron por la tienda o una landing y todavía no se confirmaron.' },
  { tipo: 'VENTA_WHATSAPP', nombre: 'Venta por WhatsApp', descripcion: 'Ventas que empezaron en una conversación de WhatsApp y falta cerrarlas.' },
  { tipo: 'SEGUIMIENTO_ENVIO', nombre: 'Seguimiento de envío', descripcion: 'Pedidos ya confirmados: avisos al cliente mientras se prepara, se despacha y viaja.' },
  { tipo: 'ESCALAMIENTO_VENTAS', nombre: 'Escalamiento de ventas', descripcion: 'Pedidos entregados: volver a contactar al cliente para una nueva compra.' },
];

const fase = (id, flujo_id, orden, nombre, espera, mensaje) => ({ id, flujo_id, orden, nombre, espera_sugerida_minutos: espera, mensaje });

const FLUJOS = {
  CONFIRMACION_PEDIDO_WEB: { id: 1, nombre: 'Confirmación de pedido web', fases: [
    fase(101, 1, 1, 'Confirmación', 0, 'Hola {cliente}, te escribimos para confirmar tu pedido #{pedido}.\n\nProductos: {productos}\nTotal: {total}\n\n¿Nos confirmás que podemos prepararlo?'),
    fase(102, 1, 2, 'Recordatorio', 240, 'Hola {cliente}, volvemos a escribirte por tu pedido #{pedido}.\n\n¿Nos confirmás si seguimos adelante?'),
    fase(103, 1, 3, 'Último intento', 1440, 'Hola {cliente}, este es nuestro último aviso por tu pedido #{pedido}.'),
  ] },
  VENTA_WHATSAPP: { id: 2, nombre: 'Venta por WhatsApp', fases: [
    fase(201, 2, 1, 'Resumen del pedido', 0, 'Hola {cliente}, te paso el resumen de tu pedido #{pedido}: {productos}. Total: {total}. ¿Lo confirmamos?'),
    fase(202, 2, 2, 'Recordatorio', 240, 'Hola {cliente}, ¿pudiste ver el resumen de tu pedido #{pedido}?'),
  ] },
  SEGUIMIENTO_ENVIO: { id: 3, nombre: 'Seguimiento de envío', fases: [
    fase(301, 3, 1, 'Pedido confirmado', 0, 'Hola {cliente}, tu pedido #{pedido} ya está confirmado y lo estamos preparando.'),
    fase(302, 3, 2, 'Pedido despachado', 0, 'Hola {cliente}, tu pedido #{pedido} ya fue despachado.'),
    fase(303, 3, 3, 'Pedido en camino', 0, 'Hola {cliente}, tu pedido #{pedido} está en camino.'),
  ] },
  ESCALAMIENTO_VENTAS: { id: 4, nombre: 'Escalamiento de ventas', fases: [
    fase(401, 4, 1, '¿Cómo te fue?', TRES_DIAS, 'Hola {cliente}, ¿cómo te fue con tu pedido #{pedido}?'),
    fase(402, 4, 2, 'Nueva compra', 7 * 1440, 'Hola {cliente}, gracias por tu compra. Si querés volver a pedir {productos}, escribinos.'),
  ] },
};

const NOMBRES = ['María González', 'Carlos Benítez', 'Lucía Fernández', 'Derlis Ayala', 'Fátima Rojas', 'Óscar Villalba', 'Noelia Cáceres', 'Rubén Giménez'];
const CIUDADES = ['Luque', 'Asunción', 'San Lorenzo', 'Ciudad del Este', 'Encarnación'];
const PRODUCTOS = ['Mancuernas ajustables 20 kg', 'Serum vitamina C x2', 'Banda elástica, Colchoneta yoga', 'Auriculares Bluetooth'];

const base = (n, etapa, estado, extra = {}) => ({
  envio_id: n,
  numero_pedido: 1800 + n,
  etapa,
  estado,
  cliente: NOMBRES[n % 8],
  telefono: n === 6 ? null : `0981 ${String(100 + (n % 900)).padStart(3, '0')} ${String(500 + (n % 400))}`,
  ciudad: CIUDADES[n % 5],
  monto: 149000 + (n % 40) * 10000,
  productos: PRODUCTOS[n % 4],
  creado_en: enHoras(-2 - n),
  completadas: 0,
  abierta: false,
  recordatorio: null,
  entregado_en: null,
  ...extra,
});

/** Estado de cada pedido en el "backend": en qué etapa está, qué mensajes completó y qué tiene agendado. */
const pedidos = [
  // Confirmación web: 41 pedidos repartidos entre los tres mensajes.
  ...Array.from({ length: 41 }, (_, i) => {
    const n = i + 1;
    const completadas = n <= 24 ? 0 : n <= 35 ? 1 : n <= 39 ? 2 : 3;
    let recordatorio = null;
    if (completadas === 1 && n % 3 === 0) recordatorio = { id: 900 + n, estado: 'VENCIDO', ejecutar_en: enHoras(-n / 4), nota: null };
    else if (completadas === 1 && n % 3 === 1) recordatorio = { id: 900 + n, estado: 'PENDIENTE', ejecutar_en: enHoras(2 + (n % 4)), nota: null };
    else if (completadas === 2 && n % 2 === 0) recordatorio = { id: 900 + n, estado: 'PENDIENTE', ejecutar_en: enHoras(30), nota: null };
    return base(n, 'CONFIRMACION_PEDIDO_WEB', completadas ? 'EnSeguimiento' : 'Pendiente', { completadas, abierta: n === 2 || n === 27, recordatorio });
  }),
  base(60, 'VENTA_WHATSAPP', 'Pendiente'),
  base(61, 'VENTA_WHATSAPP', 'EnSeguimiento', { completadas: 1 }),
  // Seguimiento de envío: ya confirmados.
  base(70, 'SEGUIMIENTO_ENVIO', 'Confirmado'),
  base(71, 'SEGUIMIENTO_ENVIO', 'Confirmado'),
  base(72, 'SEGUIMIENTO_ENVIO', 'Preparado', { completadas: 1, recordatorio: { id: 972, estado: 'VENCIDO', ejecutar_en: enHoras(-6), nota: null } }),
  base(73, 'SEGUIMIENTO_ENVIO', 'Despachado', { completadas: 1, abierta: true }),
  base(74, 'SEGUIMIENTO_ENVIO', 'Despachado', { completadas: 2 }),
  base(75, 'SEGUIMIENTO_ENVIO', 'Reprogramado', { completadas: 3 }),
  // Escalamiento de ventas: entregados hace distinta cantidad de días.
  base(80, 'ESCALAMIENTO_VENTAS', 'Entregado', { entregado_en: enHoras(-24) }),
  base(81, 'ESCALAMIENTO_VENTAS', 'Entregado', { entregado_en: enHoras(-2.8 * 24) }),
  base(82, 'ESCALAMIENTO_VENTAS', 'Entregado', { entregado_en: enHoras(-4 * 24) }),
  base(83, 'ESCALAMIENTO_VENTAS', 'Entregado', { entregado_en: enHoras(-6 * 24) }),
  base(84, 'ESCALAMIENTO_VENTAS', 'Entregado', { entregado_en: enHoras(-12 * 24), completadas: 1 }),
];

const pedidoPorId = (id) => pedidos.find((p) => p.envio_id === id);
const fasesDe = (p) => FLUJOS[p.etapa].fases;
const cuandoToca = (iso) => {
  const hora = new Date(iso);
  if (hora <= new Date()) return 'ahora';
  return hora.toDateString() === new Date().toDateString() ? 'hoy' : 'despues';
};

function aItem(p) {
  const flujo = FLUJOS[p.etapa];
  const actual = flujo.fases.find((f) => f.orden === p.completadas + 1) || null;
  let cuando;
  let motivo;
  let tocaEn = null;
  if (p.recordatorio) {
    cuando = p.recordatorio.estado === 'VENCIDO' ? 'ahora' : cuandoToca(p.recordatorio.ejecutar_en);
    motivo = cuando === 'ahora' ? 'vencido' : 'programado';
    tocaEn = p.recordatorio.ejecutar_en;
  } else if (p.completadas === 0) {
    if (p.etapa === 'ESCALAMIENTO_VENTAS' && actual?.espera_sugerida_minutos > 0) {
      tocaEn = new Date(new Date(p.entregado_en).getTime() + actual.espera_sugerida_minutos * 60000).toISOString();
      cuando = cuandoToca(tocaEn);
      motivo = cuando === 'ahora' ? 'nuevo' : 'programado';
    } else { cuando = 'ahora'; motivo = 'nuevo'; }
  } else { cuando = 'sin_fecha'; motivo = 'sin_agendar'; }
  return {
    envio_id: p.envio_id, numero_pedido: p.numero_pedido, estado: p.estado, etapa: p.etapa,
    cliente: p.cliente, telefono: p.telefono, ciudad: p.ciudad, monto: p.monto, productos: p.productos,
    creado_en: p.creado_en, entregado_en: p.entregado_en,
    flujo_id: flujo.id, flujo_nombre: flujo.nombre,
    fase_id: actual?.id || null, fase_orden: actual?.orden || null, fase_nombre: actual?.nombre || null,
    fase_origen: actual ? 'derivada' : null,
    fase_abierta_en: p.abierta && actual ? enHoras(-0.1) : null,
    cuando, motivo, toca_en: tocaEn, recordatorio: p.recordatorio,
    ultima_fase_completada_en: p.completadas ? enHoras(-5) : null,
  };
}

const ORDEN = ['ahora', 'hoy', 'despues', 'sin_fecha'];
/** Los pedidos de una etapa. En escalamiento de ventas, quien ya recibió todo sale del tablero. */
const deLaEtapa = (etapa) => pedidos
  .filter((p) => p.etapa === etapa)
  .map(aItem)
  .filter((i) => !(etapa === 'ESCALAMIENTO_VENTAS' && !i.fase_id))
  .sort((a, b) => ORDEN.indexOf(a.cuando) - ORDEN.indexOf(b.cuando) || a.envio_id - b.envio_id);
const contar = (items) => items.reduce((c, i) => ({ ...c, [i.cuando]: c[i.cuando] + 1 }), { ahora: 0, hoy: 0, despues: 0, sin_fecha: 0 });
const clave = (i) => (i.fase_id ? String(i.fase_id) : 'sin_fase');
const vencidosDe = (items) => items.filter((i) => i.motivo === 'vencido').length;
const pasaCuando = (i, cuando) => !cuando || (cuando === 'vencido' ? i.motivo === 'vencido' : i.cuando === cuando);

function coincide(item, busqueda) {
  const t = String(busqueda || '').trim().toLowerCase();
  if (!t) return true;
  const digitos = t.replace(/\D/g, '');
  return item.cliente.toLowerCase().includes(t)
    || String(item.numero_pedido) === t.replace(/^#/, '')
    || (digitos.length >= 4 && String(item.telefono || '').replace(/\D/g, '').includes(digitos));
}

function paginar(items, page = 1, limit = 10) {
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const pagina = Math.min(totalPages, Math.max(1, Number(page) || 1));
  return { data: items.slice((pagina - 1) * limit, pagina * limit), total: items.length, page: pagina, totalPages, limit };
}

const demora = (valor) => new Promise((r) => setTimeout(() => r(valor), 180));

const servicios = {
  resumen: async () => demora({
    ventas: {
      recibidos: { cantidad: 38, monto: 6840000 },
      por_confirmar: { cantidad: 11, monto: 1980000 },
      en_curso: { cantidad: 9, monto: 1620000 },
      entregados: { cantidad: 14, monto: 2520000 },
      cancelados: { cantidad: 3, monto: 540000 },
      devueltos_perdidos: { cantidad: 1, monto: 180000 },
      otros: { cantidad: 0, monto: 0 },
    },
  }),
  tablero: async ({ etapa = 'CONFIRMACION_PEDIDO_WEB', cuando, busqueda, limit = 10, paginas = {} }) => {
    console.log('[dev] POST /envios/seguimiento/tablero', { etapa, cuando, busqueda, limit, paginas });
    const flujo = FLUJOS[etapa];
    const items = deLaEtapa(etapa);
    const filtrados = items.filter((i) => pasaCuando(i, cuando) && coincide(i, busqueda));
    const columna = (k, datos) => ({
      clave: k, ...datos,
      conteo: contar(items.filter((i) => clave(i) === k)),
      vencidos: vencidosDe(items.filter((i) => clave(i) === k)),
      ...paginar(filtrados.filter((i) => clave(i) === k), paginas[k], limit),
    });
    const columnas = flujo.fases.map((f) => columna(String(f.id), { fase_id: f.id, orden: f.orden, nombre: f.nombre, espera_sugerida_minutos: f.espera_sugerida_minutos }));
    if (items.some((i) => !i.fase_id)) columnas.push(columna('sin_fase', { fase_id: null, orden: null, nombre: 'Flujo terminado', espera_sugerida_minutos: 0 }));
    return demora({
      etapa,
      etapas: ETAPAS.map((e) => ({ ...e, pedidos: pedidos.filter((p) => p.etapa === e.tipo).length, vencidos: vencidosDe(deLaEtapa(e.tipo)) })),
      flujos: [{ id: flujo.id, nombre: flujo.nombre, predeterminado: true, pendientes: items.length }],
      flujo_id: flujo.id, totales: contar(items), vencidos: vencidosDe(items), columnas, truncado: false,
    });
  },
  pendientes: async ({ etapa = 'CONFIRMACION_PEDIDO_WEB', cuando, page, limit }) => {
    console.log('[dev] POST /envios/seguimiento/pendientes', { etapa, cuando, page, limit });
    return demora(paginar(deLaEtapa(etapa).filter((i) => pasaCuando(i, cuando)), page, limit));
  },
  enviarMensaje: async (envioId, payload) => servicioSeguimiento.crearContacto(envioId, payload),
  completarFase: async (envioId, faseId) => servicioSeguimiento.completarFase(envioId, faseId),
};

const mensajeDe = (f, p) => f.mensaje
  .replace('{cliente}', p.cliente)
  .replace('{pedido}', p.numero_pedido)
  .replace('{productos}', p.productos)
  .replace('{total}', `Gs. ${p.monto.toLocaleString('es-PY')}`);

const servicioSeguimiento = {
  getFlujosPedido: async (envioId) => {
    const p = pedidoPorId(envioId);
    const flujo = FLUJOS[p.etapa];
    return [{
      id: flujo.id,
      nombre: flujo.nombre,
      envios_totales: p.completadas + (p.abierta ? 1 : 0),
      fases: flujo.fases.map((f) => {
        const completada = f.orden <= p.completadas;
        const abierta = completada || (p.abierta && f.orden === p.completadas + 1);
        return {
          ...f, mensaje_resuelto: mensajeDe(f, p),
          envios: abierta ? 1 : 0, ultimo_envio_en: abierta ? enHoras(-0.1) : null, completada,
        };
      }),
    }];
  },
  getConfiguracion: async () => ({ tiempos_rapidos_horas: [1, 2, 4, 8, 24] }),
  getEtiquetasPedido: async () => [],
  getEtiquetas: async () => [{ id: 1, nombre: 'No responde', color: '#ef4444' }],
  crearContacto: async (envioId, { fase_id }) => {
    console.log('[dev] abrir WhatsApp', envioId, fase_id);
    const p = pedidoPorId(envioId);
    if (fasesDe(p).find((f) => f.id === fase_id)?.orden === p.completadas + 1) p.abierta = true;
    return { whatsapp_url: null };
  },
  completarFase: async (envioId, faseId) => {
    console.log('[dev] completar fase', envioId, faseId);
    const p = pedidoPorId(envioId);
    const hecha = fasesDe(p).find((f) => f.id === faseId);
    const cumplidos = p.recordatorio ? [p.recordatorio.id] : [];
    p.completadas = Math.max(p.completadas, hecha.orden);
    p.abierta = false;
    const siguiente = fasesDe(p).find((f) => f.orden === hecha.orden + 1) || null;
    // Igual que el backend: el mensaje siguiente queda agendado solo.
    p.recordatorio = siguiente && siguiente.espera_sugerida_minutos > 0
      ? { id: 3000 + envioId, estado: 'PENDIENTE', ejecutar_en: enHoras(siguiente.espera_sugerida_minutos / 60), nota: `Enviar "${siguiente.nombre}" (Fase ${siguiente.orden}) si el cliente no responde` }
      : null;
    return { recordatorios_cumplidos: cumplidos, siguiente_fase: siguiente, recordatorio: p.recordatorio };
  },
  descompletarFase: async (envioId, faseId) => {
    console.log('[dev] desmarcar fase', envioId, faseId);
    const p = pedidoPorId(envioId);
    p.completadas = fasesDe(p).find((f) => f.id === faseId).orden - 1;
    p.abierta = true;
    p.recordatorio = null;
  },
  programarRecordatorio: async (envioId, payload) => {
    console.log('[dev] programarRecordatorio', envioId, payload);
    const p = pedidoPorId(envioId);
    p.recordatorio = { id: 2000 + envioId, estado: 'PENDIENTE', ejecutar_en: payload.ejecutar_en || enHoras(payload.horas || 4), nota: payload.nota || '' };
    return p.recordatorio;
  },
  completarRecordatorio: async (envioId) => { pedidoPorId(envioId).recordatorio = null; },
  cancelarRecordatorio: async (envioId) => { pedidoPorId(envioId).recordatorio = null; },
  guardarNota: async (...a) => console.log('[dev] guardarNota', ...a),
  addEtiquetaPedido: async () => ({}),
  removeEtiquetaPedido: async () => undefined,
};

export default function DevResumen() {
  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <ResumenTab servicios={servicios} servicioSeguimiento={servicioSeguimiento} onIrAlTablero={() => console.log('[dev] ir al tablero')} />
    </div>
  );
}
