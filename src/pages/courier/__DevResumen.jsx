import React from 'react';
import { ResumenTab } from './ResumenTab';
import './courier.css';

/**
 * Banco de pruebas de la pestaña Resumen de Pedidos, sin backend ni sesión:
 * el MISMO componente ResumenTab (y el mismo SeguimientoPanel de la bandeja)
 * con servicios falsos.
 *
 * Sirve para revisar el tablero por fase, la lista y la cola de trabajo sin
 * tener que entrar al panel. "Abrir en WhatsApp" no abre nada: solo simula
 * lo que responde el backend. Sigue la convención de __DevFlujos.jsx.
 *
 * Se borra junto con la ruta /dev/resumen cuando ya no haga falta.
 */

const enHoras = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

const FASES = [
  { id: 101, flujo_id: 1, orden: 1, nombre: 'Confirmación', espera_sugerida_minutos: 0 },
  { id: 102, flujo_id: 1, orden: 2, nombre: 'Recordatorio', espera_sugerida_minutos: 240 },
  { id: 103, flujo_id: 1, orden: 3, nombre: 'Último intento', espera_sugerida_minutos: 1440 },
];

const item = (n, fase, cuando, motivo, extra = {}) => ({
  envio_id: n,
  numero_pedido: 1800 + n,
  estado: motivo === 'nuevo' ? 'Pendiente' : 'EnSeguimiento',
  cliente: ['María González', 'Carlos Benítez', 'Lucía Fernández', 'Derlis Ayala', 'Fátima Rojas', 'Óscar Villalba', 'Noelia Cáceres', 'Rubén Giménez'][n % 8],
  telefono: n === 6 ? null : '0981 234 567',
  ciudad: ['Luque', 'Asunción', 'San Lorenzo', 'Ciudad del Este', 'Encarnación'][n % 5],
  monto: 149000 + n * 10000,
  productos: ['Mancuernas ajustables 20 kg', 'Serum vitamina C x2', 'Banda elástica, Colchoneta yoga', 'Auriculares Bluetooth'][n % 4],
  creado_en: enHoras(-3 - n),
  flujo_id: fase ? 1 : null,
  flujo_nombre: fase ? 'Confirmación de pedido' : null,
  fase_id: fase?.id || null,
  fase_orden: fase?.orden || null,
  fase_nombre: fase?.nombre || null,
  fase_origen: fase ? 'derivada' : null,
  cuando,
  motivo,
  recordatorio: null,
  ultimo_contacto_en: motivo === 'nuevo' ? null : enHoras(-6),
  aperturas: motivo === 'nuevo' ? 0 : 1,
  ...extra,
});

const recordatorio = (id, horas, estado = 'PENDIENTE') => ({
  id, estado, ejecutar_en: enHoras(horas), nota: 'Enviar "Recordatorio" (Fase 2) si el cliente no responde',
});

const ITEMS = [
  item(1, FASES[1], 'ahora', 'vencido', { recordatorio: recordatorio(901, -5, 'VENCIDO') }),
  item(2, FASES[0], 'ahora', 'nuevo'),
  item(3, FASES[0], 'ahora', 'nuevo'),
  item(4, FASES[1], 'ahora', 'vencido', { recordatorio: recordatorio(902, -1) }),
  item(5, FASES[2], 'ahora', 'vencido', { recordatorio: recordatorio(903, -0.5) }),
  item(6, FASES[0], 'ahora', 'nuevo'),
  item(7, FASES[1], 'hoy', 'programado', { recordatorio: recordatorio(904, 2) }),
  item(8, FASES[1], 'hoy', 'programado', { recordatorio: recordatorio(905, 4) }),
  item(9, FASES[2], 'despues', 'programado', { recordatorio: recordatorio(906, 30) }),
  item(10, FASES[1], 'sin_fecha', 'sin_agendar'),
  item(11, null, 'sin_fecha', 'sin_agendar'),
];

function resumir(items) {
  const vacio = () => ({ ahora: 0, hoy: 0, despues: 0, sin_fecha: 0 });
  const totales = vacio();
  const sinFase = vacio();
  const porFase = new Map(FASES.map((f) => [f.id, vacio()]));
  for (const i of items) {
    totales[i.cuando] += 1;
    (i.fase_id ? porFase.get(i.fase_id) : sinFase)[i.cuando] += 1;
  }
  return {
    totales,
    sin_fase: sinFase,
    flujos: [{ id: 1, nombre: 'Confirmación de pedido', fases: FASES.map((f) => ({ ...f, ...porFase.get(f.id) })) }],
    items,
    truncado: false,
  };
}

let pendientes = [...ITEMS];

const servicioResumen = async () => ({
  ventas: {
    recibidos: { cantidad: 38, monto: 6840000 },
    por_confirmar: { cantidad: 11, monto: 1980000 },
    en_curso: { cantidad: 9, monto: 1620000 },
    entregados: { cantidad: 14, monto: 2520000 },
    cancelados: { cantidad: 3, monto: 540000 },
    devueltos_perdidos: { cantidad: 1, monto: 180000 },
    otros: { cantidad: 0, monto: 0 },
  },
  seguimiento: resumir(pendientes),
});

const mensajeDe = (fase, envioId) => {
  const p = ITEMS.find((i) => i.envio_id === envioId) || ITEMS[0];
  const textos = {
    101: `Hola ${p.cliente}, te escribimos para confirmar tu pedido #${p.numero_pedido}.\n\nProductos: ${p.productos}\nTotal: Gs. ${p.monto.toLocaleString('es-PY')}\n\n¿Nos confirmás que podemos prepararlo?`,
    102: `Hola ${p.cliente}, volvemos a escribirte por tu pedido #${p.numero_pedido}.\n\n¿Podrías confirmarnos si seguimos adelante?`,
    103: `Hola ${p.cliente}, este es nuestro último intento de confirmación.\n\nSi todavía querés recibir tu pedido, respondé este mensaje.`,
  };
  return textos[fase.id];
};

const abiertas = new Map(); // envioId -> Set(faseId)

const servicioSeguimiento = {
  getFlujosPedido: async (envioId) => {
    const p = ITEMS.find((i) => i.envio_id === envioId);
    const yaAbiertas = abiertas.get(envioId) || new Set(FASES.filter((f) => p?.fase_orden && f.orden < p.fase_orden).map((f) => f.id));
    return [{
      id: 1,
      nombre: 'Confirmación de pedido',
      envios_totales: yaAbiertas.size,
      fases: FASES.map((f) => ({
        ...f,
        mensaje: '',
        mensaje_resuelto: mensajeDe(f, envioId),
        envios: yaAbiertas.has(f.id) ? 1 : 0,
        ultimo_envio_en: yaAbiertas.has(f.id) ? enHoras(-6) : null,
      })),
    }];
  },
  getConfiguracion: async () => ({ tiempos_rapidos_horas: [1, 2, 4, 8, 24] }),
  getEtiquetasPedido: async () => [],
  getEtiquetas: async () => [{ id: 1, nombre: 'No responde', color: '#ef4444' }],
  crearContacto: async (envioId, { fase_id }) => {
    console.log('[dev] crearContacto', envioId, fase_id);
    const p = ITEMS.find((i) => i.envio_id === envioId);
    const previas = new Set(FASES.filter((f) => p?.fase_orden && f.orden < p.fase_orden).map((f) => f.id));
    abiertas.set(envioId, new Set([...(abiertas.get(envioId) || previas), fase_id]));
    pendientes = pendientes.filter((i) => i.envio_id !== envioId);
    return { whatsapp_url: null, recordatorios_cumplidos: p?.recordatorio ? [p.recordatorio.id] : [] };
  },
  programarRecordatorio: async (envioId, payload) => {
    console.log('[dev] programarRecordatorio', envioId, payload);
    return { id: 990, estado: 'PENDIENTE', ejecutar_en: payload.ejecutar_en || enHoras(payload.horas || 4), nota: payload.nota || '' };
  },
  completarRecordatorio: async (...a) => console.log('[dev] completarRecordatorio', ...a),
  cancelarRecordatorio: async (...a) => console.log('[dev] cancelarRecordatorio', ...a),
  guardarNota: async (...a) => console.log('[dev] guardarNota', ...a),
  addEtiquetaPedido: async () => ({}),
  removeEtiquetaPedido: async () => undefined,
};

export default function DevResumen() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <ResumenTab servicio={servicioResumen} servicioSeguimiento={servicioSeguimiento} onIrAlTablero={() => console.log('[dev] ir al tablero')} />
    </div>
  );
}
