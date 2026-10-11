import React from 'react';
import { ResumenTab } from './ResumenTab';
import './courier.css';

/**
 * Banco de pruebas de la pestaña Resumen de Pedidos, sin backend ni sesión:
 * el MISMO componente ResumenTab (y el mismo SeguimientoPanel de la bandeja)
 * contra un backend de mentira que vive en este archivo.
 *
 * El backend falso respeta el contrato real: filtra, busca y pagina él (el
 * componente nunca recibe más que la página que pidió), y un pedido cambia
 * de columna recién cuando se marca la fase como completada. "Abrir en
 * WhatsApp" no abre nada. Sigue la convención de __DevFlujos.jsx.
 *
 * Se borra junto con la ruta /dev/resumen cuando ya no haga falta.
 */

const enHoras = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

const FASES = [
  { id: 101, flujo_id: 1, orden: 1, nombre: 'Confirmación', espera_sugerida_minutos: 0 },
  { id: 102, flujo_id: 1, orden: 2, nombre: 'Recordatorio', espera_sugerida_minutos: 240 },
  { id: 103, flujo_id: 1, orden: 3, nombre: 'Último intento', espera_sugerida_minutos: 1440 },
];

const NOMBRES = ['María González', 'Carlos Benítez', 'Lucía Fernández', 'Derlis Ayala', 'Fátima Rojas', 'Óscar Villalba', 'Noelia Cáceres', 'Rubén Giménez'];
const CIUDADES = ['Luque', 'Asunción', 'San Lorenzo', 'Ciudad del Este', 'Encarnación'];
const PRODUCTOS = ['Mancuernas ajustables 20 kg', 'Serum vitamina C x2', 'Banda elástica, Colchoneta yoga', 'Auriculares Bluetooth'];

/** Estado de cada pedido en el "backend": qué fases completó y qué recordatorio tiene. */
const pedidos = Array.from({ length: 41 }, (_, i) => {
  const n = i + 1;
  const completadas = n <= 24 ? 0 : n <= 35 ? 1 : n <= 39 ? 2 : 3;
  let recordatorio = null;
  if (completadas === 1 && n % 3 === 0) recordatorio = { id: 900 + n, estado: 'VENCIDO', ejecutar_en: enHoras(-n / 4), nota: null };
  else if (completadas === 1 && n % 3 === 1) recordatorio = { id: 900 + n, estado: 'PENDIENTE', ejecutar_en: enHoras(2 + (n % 4)), nota: null };
  else if (completadas === 2 && n % 2 === 0) recordatorio = { id: 900 + n, estado: 'PENDIENTE', ejecutar_en: enHoras(30), nota: null };
  return {
    envio_id: n,
    numero_pedido: 1800 + n,
    cliente: `${NOMBRES[n % 8]}`,
    telefono: n === 6 ? null : `0981 ${String(100 + n).padStart(3, '0')} ${String(500 + n)}`,
    ciudad: CIUDADES[n % 5],
    monto: 149000 + n * 10000,
    productos: PRODUCTOS[n % 4],
    creado_en: enHoras(-2 - n),
    completadas,
    abierta: n === 2 || n === 27, // WhatsApp abierto, falta marcar como enviado
    recordatorio,
  };
});

function aItem(p) {
  const fase = FASES.find((f) => f.orden === p.completadas + 1) || null;
  let cuando;
  let motivo;
  if (p.recordatorio) {
    const hora = new Date(p.recordatorio.ejecutar_en);
    if (p.recordatorio.estado === 'VENCIDO' || hora <= new Date()) { cuando = 'ahora'; motivo = 'vencido'; }
    else if (hora.toDateString() === new Date().toDateString()) { cuando = 'hoy'; motivo = 'programado'; }
    else { cuando = 'despues'; motivo = 'programado'; }
  } else if (p.completadas === 0) { cuando = 'ahora'; motivo = 'nuevo'; }
  else { cuando = 'sin_fecha'; motivo = 'sin_agendar'; }
  return {
    envio_id: p.envio_id, numero_pedido: p.numero_pedido, estado: p.completadas ? 'EnSeguimiento' : 'Pendiente',
    cliente: p.cliente, telefono: p.telefono, ciudad: p.ciudad, monto: p.monto, productos: p.productos, creado_en: p.creado_en,
    flujo_id: 1, flujo_nombre: 'Confirmación de pedido',
    fase_id: fase?.id || null, fase_orden: fase?.orden || null, fase_nombre: fase?.nombre || null,
    fase_origen: fase ? 'derivada' : null,
    fase_abierta_en: p.abierta && fase ? enHoras(-0.1) : null,
    cuando, motivo, recordatorio: p.recordatorio, ultima_fase_completada_en: p.completadas ? enHoras(-5) : null,
  };
}

const ORDEN = ['ahora', 'hoy', 'despues', 'sin_fecha'];
const todos = () => pedidos.map(aItem).sort((a, b) => ORDEN.indexOf(a.cuando) - ORDEN.indexOf(b.cuando) || a.envio_id - b.envio_id);
const contar = (items) => items.reduce((c, i) => ({ ...c, [i.cuando]: c[i.cuando] + 1 }), { ahora: 0, hoy: 0, despues: 0, sin_fecha: 0 });
const clave = (i) => (i.fase_id ? String(i.fase_id) : 'sin_fase');

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
  tablero: async ({ cuando, busqueda, limit = 10, paginas = {} }) => {
    console.log('[dev] POST /envios/seguimiento/tablero', { cuando, busqueda, limit, paginas });
    const items = todos();
    const filtrados = items.filter((i) => (!cuando || i.cuando === cuando) && coincide(i, busqueda));
    const columna = (k, datos) => ({
      clave: k, ...datos,
      conteo: contar(items.filter((i) => clave(i) === k)),
      ...paginar(filtrados.filter((i) => clave(i) === k), paginas[k], limit),
    });
    const columnas = FASES.map((f) => columna(String(f.id), { fase_id: f.id, orden: f.orden, nombre: f.nombre, espera_sugerida_minutos: f.espera_sugerida_minutos }));
    if (items.some((i) => !i.fase_id)) columnas.push(columna('sin_fase', { fase_id: null, orden: null, nombre: 'Flujo terminado', espera_sugerida_minutos: 0 }));
    return demora({
      flujos: [{ id: 1, nombre: 'Confirmación de pedido', pendientes: items.length }],
      flujo_id: 1, totales: contar(items), columnas, truncado: false,
    });
  },
  pendientes: async ({ cuando, page, limit }) => {
    console.log('[dev] POST /envios/seguimiento/pendientes', { cuando, page, limit });
    return demora(paginar(todos().filter((i) => !cuando || i.cuando === cuando), page, limit));
  },
  enviarMensaje: async (envioId, payload) => servicioSeguimiento.crearContacto(envioId, payload),
  completarFase: async (envioId, faseId) => servicioSeguimiento.completarFase(envioId, faseId),
};

const mensajeDe = (fase, p) => ({
  101: `Hola ${p.cliente}, te escribimos para confirmar tu pedido #${p.numero_pedido}.\n\nProductos: ${p.productos}\nTotal: Gs. ${p.monto.toLocaleString('es-PY')}\n\n¿Nos confirmás que podemos prepararlo?`,
  102: `Hola ${p.cliente}, volvemos a escribirte por tu pedido #${p.numero_pedido}.\n\n¿Podrías confirmarnos si seguimos adelante?`,
  103: `Hola ${p.cliente}, este es nuestro último intento de confirmación.\n\nSi todavía querés recibir tu pedido, respondé este mensaje.`,
}[fase.id]);

const servicioSeguimiento = {
  getFlujosPedido: async (envioId) => {
    const p = pedidos.find((x) => x.envio_id === envioId);
    return [{
      id: 1,
      nombre: 'Confirmación de pedido',
      envios_totales: p.completadas + (p.abierta ? 1 : 0),
      fases: FASES.map((f) => {
        const completada = f.orden <= p.completadas;
        const abierta = completada || (p.abierta && f.orden === p.completadas + 1);
        return {
          ...f, mensaje: '', mensaje_resuelto: mensajeDe(f, p),
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
    const p = pedidos.find((x) => x.envio_id === envioId);
    if (FASES.find((f) => f.id === fase_id)?.orden === p.completadas + 1) p.abierta = true;
    return { whatsapp_url: null };
  },
  completarFase: async (envioId, faseId) => {
    console.log('[dev] completar fase', envioId, faseId);
    const p = pedidos.find((x) => x.envio_id === envioId);
    const fase = FASES.find((f) => f.id === faseId);
    const cumplidos = p.recordatorio ? [p.recordatorio.id] : [];
    p.completadas = Math.max(p.completadas, fase.orden);
    p.abierta = false;
    p.recordatorio = null;
    const siguiente = FASES.find((f) => f.orden === fase.orden + 1) || null;
    return { recordatorios_cumplidos: cumplidos, siguiente_fase: siguiente };
  },
  descompletarFase: async (envioId, faseId) => {
    console.log('[dev] desmarcar fase', envioId, faseId);
    const p = pedidos.find((x) => x.envio_id === envioId);
    p.completadas = FASES.find((f) => f.id === faseId).orden - 1;
    p.abierta = true;
  },
  programarRecordatorio: async (envioId, payload) => {
    console.log('[dev] programarRecordatorio', envioId, payload);
    const p = pedidos.find((x) => x.envio_id === envioId);
    p.recordatorio = { id: 2000 + envioId, estado: 'PENDIENTE', ejecutar_en: payload.ejecutar_en || enHoras(payload.horas || 4), nota: payload.nota || '' };
    return p.recordatorio;
  },
  completarRecordatorio: async (envioId) => { pedidos.find((x) => x.envio_id === envioId).recordatorio = null; },
  cancelarRecordatorio: async (envioId) => { pedidos.find((x) => x.envio_id === envioId).recordatorio = null; },
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
