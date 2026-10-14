import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus, Trash2, Edit2, Loader2, GripVertical, Copy, X, Search,
  Clock, AlertCircle, Tag, Eye, Check, ArrowLeft, Info, Clipboard,
} from "lucide-react";
import { seguimientoService } from "../../services/seguimiento.service";
import {
  resolverConEjemplos, partirMensaje, variablesDesconocidas, agruparVariables,
  nombreSugerido, desarmarEspera, formatEspera, horaSimulada, UNIDADES,
} from "./variablesWhatsapp";
import { CUSTOM_FLOW_TYPE, FLOW_TYPES } from "./orderLifecycle";
import { STATUS, STATUS_ORDER } from "../../lib/courier";
import "./flujos-whatsapp.css";

/**
 * Constructor de flujos de WhatsApp.
 *
 * Dos columnas: a la izquierda se construye el flujo, a la derecha se ve el
 * mensaje como lo va a recibir el cliente, con datos de ejemplo y en vivo
 * mientras se escribe. La fase que se está editando es la misma que muestra
 * el preview — no hay dos selecciones que puedan desincronizarse.
 *
 * La espera es SUGERIDA y vive en el conector entre fases, no adentro de
 * ellas: una fase no se completa ni se bloquea nunca. Desde el pedido el
 * operador abre cualquier fase, en cualquier orden, las veces que quiera.
 */

const faseNueva = (indice) => ({
  _key: `nueva-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  id: null,
  nombre: nombreSugerido(indice),
  mensaje: "",
  // La primera fase no tiene "espera desde la anterior": arranca cuando el
  // operador quiere. De la segunda en adelante, 4 h es el default razonable.
  espera_sugerida_minutos: indice === 0 ? 0 : 240,
  etiqueta_id: null,
  accion_operativa: null,
  estado_activador: null,
  transicion_estado_desde: null,
  transicion_estado_hasta: null,
});

const ETAPA_RECOMPRA = "ESCALAMIENTO_VENTAS";
const ETAPA_ENVIO = "SEGUIMIENTO_ENVIO";
const TRES_DIAS = 3 * 24 * 60;
function activadorDeFase(fase) {
  return fase?.estado_activador || fase?.transicion_estado_hasta
    || (fase?.accion_operativa === "PREPARAR_PEDIDO" ? "Preparado"
      : ["DESPACHAR_PEDIDO", "AVISO_EN_CAMINO"].includes(fase?.accion_operativa) ? "Despachado" : null);
}

const PROMPT_CONFIRMACION_PEDIDO_WEB = String.raw`Actúa como especialista en ventas conversacionales por WhatsApp, seguimiento de pedidos de e-commerce y persuasión aplicada.

Tu tarea es crear una secuencia profesional de seguimiento para personas que YA realizaron un pedido mediante una página web, dejaron su número de WhatsApp y todavía no han confirmado completamente la entrega.

El objetivo de la secuencia NO es volver a vender el producto desde cero. El prospecto ya manifestó intención de compra.

El objetivo principal es conseguir que la persona responda y completar la confirmación del pedido obteniendo, cuando corresponda:

- Confirmación de que mantiene el pedido.
- Ubicación o dirección de entrega.
- Referencia para encontrar el domicilio.
- Horario recomendado para entregar.
- Cualquier indicación necesaria para completar correctamente la entrega.

La secuencia dura un máximo de 3 días y debe contener exactamente 8 contactos:

DÍA 1
- Mensaje 1
- Mensaje 2
- Mensaje 3

DÍA 2
- Mensaje 4
- Mensaje 5
- Mensaje 6

DÍA 3
- Mensaje 7
- Mensaje 8

Si el prospecto responde, confirma el pedido o proporciona la información necesaria para completar la entrega, la secuencia automática debe detenerse.

No continúes enviando mensajes a alguien que ya confirmó.

La secuencia debe ir aumentando ligeramente el nivel de cierre con el paso de los mensajes, pero nunca debe sentirse desesperada, agresiva ni acosadora.

Utiliza de manera natural principios de influencia de Robert Cialdini cuando sean aplicables: prueba social, autoridad, escasez, reciprocidad, consistencia/compromiso, afinidad y unidad.

Nunca inventes escasez. Nunca digas cosas como "quedan solo 2 unidades", "última oportunidad", "tenemos muchos pedidos", "todo el mundo lo está comprando" o afirmaciones similares si esa información no fue proporcionada.

Nunca inventes testimonios, número de clientes, resultados, certificaciones o autoridad.

Los mensajes deben parecer escritos por una persona real, sonar naturales en WhatsApp, ser breves, fáciles de leer desde el celular, tener una intención diferente en cada contacto, evitar repetir exactamente la misma pregunta y evitar sonar como un bot.

Evita lenguaje corporativo innecesario, párrafos largos, presión excesiva y frases genéricas repetitivas como "Seguimos atentos", "Quedamos atentos", "Solo queríamos saber", "Te escribimos nuevamente" o "¿Sigues interesado?".

Cada mensaje debe cumplir una función distinta:

DÍA 1:
Mensaje 1: contacto inicial después del pedido. Debe mencionar el producto y hacer evidente que estamos procesando el pedido. Objetivo: obtener confirmación y comenzar a recopilar datos de entrega.
Mensaje 2: seguimiento suave si todavía no respondió. Puede reforzar un beneficio del producto, facilidad de entrega, oferta o seguridad de la compra. Objetivo: provocar una respuesta sencilla.
Mensaje 3: último contacto del primer día. Debe sentirse humano y operativo. Puede explicar que necesitamos confirmar algunos datos antes de preparar o coordinar el envío.

DÍA 2:
Mensaje 4: retomar la conversación de manera diferente. No repetir literalmente lo enviado el día anterior.
Mensaje 5: introducir una razón práctica para responder: organización de entregas, disponibilidad, coordinación logística, forma de pago, horario o preparación del pedido.
Mensaje 6: intento de cierre del segundo día. Debe pedir una acción concreta y fácil.

DÍA 3:
Mensaje 7: penúltimo seguimiento. Debe comunicar de manera educada que necesitamos saber si continuamos procesando el pedido.
Mensaje 8: mensaje final. Debe cerrar elegantemente la secuencia y obtener una última respuesta clara o dar de baja el pedido/prospecto.

Los 8 mensajes NO deben parecer pequeñas modificaciones del mismo texto. Alterna recursos como pregunta directa, confirmación logística, beneficio del producto, recordatorio del pedido, reducción de riesgo, prueba social real, escasez real, coordinación de entrega, pregunta de elección, microcompromiso y cierre de expediente/pedido.

Prioriza preguntas fáciles de responder. No hagas tres o cuatro preguntas diferentes dentro del mismo mensaje. Cada contacto debe tener un objetivo principal.

Antes de entregar la respuesta revisa que ninguno sea redundante, que cada uno tenga una razón distinta para existir, que no hayas inventado información, que el llamado a la acción sea fácil, que el mensaje final permita cerrar o dar de baja al prospecto y que parezcan mensajes de una conversación humana.`;

const PROMPT_VENTA_WHATSAPP = String.raw`Actúa como especialista en ventas conversacionales por WhatsApp, e-commerce de productos físicos, copywriting de respuesta directa y seguimiento comercial.

Tu tarea es crear una secuencia completa de venta y seguimiento por WhatsApp para leads que llegan directamente desde anuncios de Meta, Instagram, Facebook u otra fuente publicitaria.

Este lead NO ha realizado todavía un pedido. Ha visto un anuncio, mostró interés y abrió una conversación por WhatsApp.

Tu función es construir una secuencia que ayude a llevar al prospecto desde:

INTERÉS → CONOCIMIENTO DEL PRODUCTO → DESEO → RESOLUCIÓN DE DUDAS → OFERTA → DECISIÓN → COMPRA.

La secuencia debe estar orientada específicamente a PRODUCTOS FÍSICOS vendidos mediante WhatsApp.

El objetivo principal es conseguir que el prospecto compre el producto. Dependiendo del modelo de venta, esto puede significar confirmar que desea comprar, elegir cantidad o variante, enviar ubicación o dirección, indicar referencia del domicilio, seleccionar horario de entrega, confirmar forma de pago, completar un enlace de pago o coordinar la entrega.

No asumas que el prospecto conoce toda la información del producto. Debes vender.

Nunca inventes características, resultados, promociones, descuentos, testimonios, stock, garantías ni condiciones comerciales. Si determinada información no fue proporcionada, trabaja con lo disponible.

La secuencia tendrá una ventana máxima de 3 días. Genera exactamente 11 contactos:

DÍA 1
- Mensaje 1
- Mensaje 2
- Mensaje 3
- Mensaje 4
- Mensaje 5

DÍA 2
- Mensaje 6
- Mensaje 7
- Mensaje 8

DÍA 3
- Mensaje 9
- Mensaje 10
- Mensaje 11

Estos mensajes representan oportunidades de contacto, NO una secuencia que deba continuar ciegamente.

Si el prospecto responde, la secuencia automática debe detenerse temporalmente y la conversación debe continuar según su respuesta. Nunca envíes el siguiente seguimiento automático mientras existe una conversación activa.

Cuando la conversación vuelva a quedar sin respuesta, se puede retomar el seguimiento desde el punto correspondiente.

DÍA 1 — CONVERTIR INTERÉS EN INTENCIÓN DE COMPRA:

Mensaje 1 — Apertura: iniciar una conversación natural relacionada directamente con el anuncio. Debe saludar, mencionar el producto, conectar con el interés generado por el anuncio y abrir la conversación con una pregunta sencilla.

Mensaje 2 — Producto + problema: explicar brevemente qué es el producto y por qué puede interesarle. Conectar problema, producto y beneficio. No escribir una ficha técnica.

Mensaje 3 — Beneficios: aumentar deseo. Selecciona los 2 o 3 beneficios más fuertes. Prioriza beneficios por encima de características.

Mensaje 4 — Oferta: presentar claramente la propuesta comercial. Debe incluir cuando exista producto, precio, precio promocional, descuento, combo, forma de pago, envío, tiempo aproximado de entrega, garantía o bono.

Mensaje 5 — Primer cierre: pedir la compra con una pregunta de cierre fácil y de baja fricción.

DÍA 2 — RECUPERAR AL PROSPECTO:

Mensaje 6 — Nuevo ángulo de venta: volver a despertar interés con un argumento diferente.

Mensaje 7 — Prueba / confianza / objeción: reducir riesgo con información disponible como testimonio real, cantidad real de compradores, garantía, pago contra entrega, política de cambios, empresa, marca, material, calidad, demostración o pregunta frecuente.

Mensaje 8 — Segundo cierre: llevar nuevamente a una decisión con una pregunta concreta o cierre por alternativa cuando realmente existan alternativas.

DÍA 3 — DEFINICIÓN:

Mensaje 9 — Razón para actuar: dar una razón legítima para tomar una decisión. Puede usar promoción real, stock real, condiciones de entrega, precio vigente, disponibilidad, bono, organización logística o beneficio principal. Nunca inventes urgencia ni escasez.

Mensaje 10 — Cierre directo: pedir una respuesta clara.

Mensaje 11 — Cierre de secuencia: obtener una última respuesta o cerrar comercialmente el lead de forma amable, dejando la puerta abierta.

Utiliza cuando correspondan principios de Robert Cialdini: prueba social, autoridad, escasez, reciprocidad, compromiso y consistencia, afinidad y unidad. También aplica venta directa: beneficio antes que característica, reducción de riesgo, claridad de la oferta, eliminación de fricción, microcompromisos, preguntas de elección y cierre progresivo.

No fuerces los principios. La conversación debe sentirse natural.

Nunca inventes escasez, urgencia, número de compradores, testimonios, opiniones, certificaciones, autoridad, garantías, resultados, promociones, precios anteriores, stock ni fechas límite.

Todos los mensajes deben parecer escritos por una persona real: cortos, conversacionales, fáciles de leer, directos, naturales, comerciales, profesionales y cercanos.

Evita lenguaje de publicidad tradicional, textos de call center, bloques enormes, abuso de emojis, todo en mayúsculas y presión artificial.

Cada mensaje debe buscar una acción sencilla. Una pregunta por mensaje es preferible a cinco preguntas. Prioriza microcompromisos.

Antes de entregar el resultado verifica que los 11 mensajes sean diferentes, que la conversación avance, que haya presentación del producto, beneficios, oferta, manejo de riesgo, varios intentos de cierre, que no haya datos inventados, falsa escasez ni falsa prueba social, y que el día 3 termine con una definición comercial.`;

const PROMPTS_IA_POR_TIPO = {
  CONFIRMACION_PEDIDO_WEB: {
    promptBase: PROMPT_CONFIRMACION_PEDIDO_WEB,
  },
  VENTA_WHATSAPP: {
    promptBase: PROMPT_VENTA_WHATSAPP,
  },
  SEGUIMIENTO_ENVIO: {
    objetivo: "mantener informado al cliente despues de confirmar el pedido",
    enfoque: "avisar preparacion, despacho y entrega con mensajes breves y operativos",
  },
  ESCALAMIENTO_VENTAS: {
    objetivo: "volver a contactar clientes con pedidos entregados para feedback y recompra",
    enfoque: "empezar con experiencia post compra y luego ofrecer una nueva compra sin presionar",
  },
  RECUPERACION_CLIENTES: {
    objetivo: "atender a clientes con pedidos devueltos o perdidos y recuperar la relación",
    enfoque: "escuchar qué ocurrió, buscar una solución y ofrecer retomar la compra sin prometer reintegros, reenvíos ni descuentos no confirmados",
  },
  [CUSTOM_FLOW_TYPE]: {
    objetivo: "crear un flujo manual de WhatsApp para un caso operativo especifico",
    enfoque: "mantener mensajes claros, humanos y accionables, con esperas razonables entre fases",
  },
};

/**
 * En escalamiento de ventas la espera del PRIMER mensaje se cuenta desde la
 * entrega del pedido; en las demás etapas el primero no espera nada.
 */
function conEsperaInicial(fases, tipo) {
  if (tipo !== ETAPA_RECOMPRA || fases.length === 0) return fases;
  if (Number(fases[0].espera_sugerida_minutos) > 0) return fases;
  return [{ ...fases[0], espera_sugerida_minutos: TRES_DIAS }, ...fases.slice(1)];
}

const flujoNuevo = (tipo = "CONFIRMACION_PEDIDO_WEB") => ({
  id: null,
  nombre: "",
  descripcion: "",
  activo: true,
  tipo,
  activacion: tipo === CUSTOM_FLOW_TYPE ? "MANUAL" : "AUTOMATICA",
  predeterminado: false,
  fases: conEsperaInicial(fasesInicialesPorTipo(tipo), tipo),
});

function fasesInicialesPorTipo(tipo) {
  if (tipo === ETAPA_ENVIO) {
    return [
      {
        ...faseNueva(0),
        nombre: "Pedido confirmado",
        mensaje: "Hola {cliente_nombre}, tu pedido #{pedido_id} ha sido confirmado y ahora lo estamos preparando.",
        estado_activador: "Preparado",
      },
      {
        ...faseNueva(1),
        nombre: "Pedido despachado",
        mensaje: "Hola {cliente_nombre}, tu pedido #{pedido_id} ha sido despachado. Por favor, mantenete atento a tu courier: {courier_nombre}, teléfono {courier_telefono}. Dirección de entrega: {direccion_entrega}.",
        espera_sugerida_minutos: 0,
        estado_activador: "Despachado",
      },
      {
        ...faseNueva(2),
        nombre: "Pedido en camino",
        mensaje: "Hola {cliente_nombre}, tu pedido #{pedido_id} está en camino. Tu courier es {courier_nombre}, teléfono {courier_telefono}. Por favor tené el teléfono a mano para coordinar la entrega.",
        espera_sugerida_minutos: 0,
        estado_activador: "Despachado",
      },
    ];
  }
  if (tipo === "RECUPERACION_CLIENTES") {
    return [
      { ...faseNueva(0), nombre: "Contacto tras incidencia", mensaje: "Hola {cliente_nombre}, vimos que hubo un inconveniente con tu pedido #{pedido_id}. ¿Podés contarnos qué pasó para ayudarte?" },
      { ...faseNueva(1), nombre: "Buscar una solución", espera_sugerida_minutos: 1440, mensaje: "Hola {cliente_nombre}, queremos ayudarte a resolver el inconveniente con tu pedido #{pedido_id}. ¿Cómo te gustaría que sigamos?" },
      { ...faseNueva(2), nombre: "Retomar la compra", espera_sugerida_minutos: 4320, mensaje: "Hola {cliente_nombre}, si querés retomar tu compra de {productos}, escribinos y revisamos juntos las opciones disponibles." },
    ];
  }
  return [faseNueva(0)];
}

/** Las fases que llegan del backend necesitan una key estable para el drag & drop. */
function conKeys(fases) {
  return (fases || []).map((f) => ({
    ...f,
    _key: `fase-${f.id}`,
    etiqueta_id: f.etiqueta_id ?? null,
    espera_sugerida_minutos: f.espera_sugerida_minutos ?? 0,
    estado_activador: activadorDeFase(f),
    accion_operativa: null,
    transicion_estado_desde: null,
    transicion_estado_hasta: null,
  }));
}

function keyNuevaFaseImportada(indice) {
  return `ia-${Date.now()}-${indice}-${Math.random().toString(36).slice(2, 7)}`;
}

function limpiarBloqueJson(texto) {
  let limpio = String(texto || "").trim();
  const fence = limpio.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) limpio = fence[1].trim();
  const inicio = limpio.search(/[\[{]/);
  const finObjeto = Math.max(limpio.lastIndexOf("}"), limpio.lastIndexOf("]"));
  if (inicio > 0 && finObjeto >= inicio) limpio = limpio.slice(inicio, finObjeto + 1);
  return limpio;
}

function parsearJsonFlujo(texto) {
  try {
    const parseado = JSON.parse(limpiarBloqueJson(texto));
    return parseado?.flujo || parseado;
  } catch {
    throw new Error("No pude leer el JSON. Pegá solo el objeto JSON que devolvió la IA, sin texto adicional.");
  }
}

function minutosDesdeEntrada(fase) {
  const directo = fase?.espera_sugerida_minutos ?? fase?.espera_minutos ?? fase?.espera;
  if (directo !== undefined && directo !== null && directo !== "") {
    const n = Number(directo);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  const horas = Number(fase?.espera_horas);
  if (Number.isFinite(horas)) return Math.max(0, Math.floor(horas * 60));
  const dias = Number(fase?.espera_dias);
  if (Number.isFinite(dias)) return Math.max(0, Math.floor(dias * 24 * 60));
  return null;
}

function etiquetaIdDesdeEntrada(fase, etiquetas) {
  if (fase?.etiqueta_id === null || fase?.etiqueta_id === "" || fase?.etiqueta_id === undefined) return null;
  const directa = Number(fase.etiqueta_id);
  if (Number.isInteger(directa) && etiquetas.some((e) => Number(e.id) === directa)) return directa;
  const nombre = String(fase?.etiqueta_nombre || fase?.etiqueta || "").trim().toLowerCase();
  if (!nombre) return null;
  return etiquetas.find((e) => String(e.nombre || "").trim().toLowerCase() === nombre)?.id || null;
}

function aplicarJsonAlFlujo({ texto, editando, etiquetas }) {
  const entrada = parsearJsonFlujo(texto);
  const fasesEntrada = entrada?.fases || entrada?.mensajes || entrada?.messages;
  if (!Array.isArray(fasesEntrada) || fasesEntrada.length === 0) {
    throw new Error('El JSON tiene que incluir un array "fases" con al menos una fase.');
  }

  const fases = fasesEntrada.map((fase, idx) => {
    const previa = editando.fases?.[idx] || {};
    const nombre = String(fase?.nombre || fase?.titulo || fase?.fase || "").trim();
    const mensaje = String(fase?.mensaje || fase?.texto || fase?.message || "").trim();
    if (!nombre) throw new Error(`Fase ${idx + 1}: falta "nombre".`);
    if (!mensaje) throw new Error(`Fase ${idx + 1}: falta "mensaje".`);
    return {
      id: previa.id || null,
      _key: previa._key || keyNuevaFaseImportada(idx),
      nombre,
      mensaje,
      espera_sugerida_minutos: minutosDesdeEntrada(fase) ?? (idx === 0 ? 0 : 240),
      etiqueta_id: etiquetaIdDesdeEntrada(fase, etiquetas),
      accion_operativa: null,
      estado_activador: fase.estado_activador === undefined ? activadorDeFase(previa) : fase.estado_activador || null,
      transicion_estado_desde: null,
      transicion_estado_hasta: null,
    };
  });

  return {
    ...editando,
    nombre: String(entrada?.nombre || editando.nombre || "").trim(),
    descripcion: entrada?.descripcion !== undefined ? String(entrada.descripcion || "").trim() : editando.descripcion,
    activo: entrada?.activo !== undefined ? !!entrada.activo : editando.activo,
    predeterminado: editando.tipo === CUSTOM_FLOW_TYPE
      ? false
      : entrada?.predeterminado !== undefined ? !!entrada.predeterminado : editando.predeterminado,
    fases: conEsperaInicial(fases, editando.tipo),
  };
}

function generarInstruccionesIA({ flujo, variables }) {
  const tipo = flujo?.tipo || "CONFIRMACION_PEDIDO_WEB";
  const meta = FLOW_TYPES[tipo] || FLOW_TYPES.CONFIRMACION_PEDIDO_WEB;
  const prompt = PROMPTS_IA_POR_TIPO[tipo] || PROMPTS_IA_POR_TIPO[CUSTOM_FLOW_TYPE];
  const cantidadFases = tipo === "VENTA_WHATSAPP" ? 11 : tipo === "CONFIRMACION_PEDIDO_WEB" ? 8 : null;
  const variablesTexto = (variables || [])
    .map((v) => `- {${v.key}}: ${v.desc || "Variable disponible"} (ejemplo: ${v.ejemplo || "sin ejemplo"})`)
    .join("\n");
  const ejemplo = {
    nombre: flujo?.nombre || meta.label,
    descripcion: flujo?.descripcion || meta.hint,
    activo: true,
    predeterminado: tipo === CUSTOM_FLOW_TYPE ? false : !!flujo?.predeterminado,
    fases: [
      {
        nombre: "Primer contacto",
        mensaje: "Hola {cliente_nombre}, te escribimos por tu pedido #{pedido_id}.",
        espera_sugerida_minutos: 0,
        etiqueta_id: null,
      },
      {
        nombre: "Recordatorio",
        mensaje: "Hola {cliente_nombre}, volvemos a escribirte por tu pedido #{pedido_id}.",
        espera_sugerida_minutos: 240,
        etiqueta_id: null,
      },
    ],
  };

  const promptBase = prompt.promptBase
    ? `PROMPT BASE DEL FLUJO
${prompt.promptBase}

`
    : `Objetivo: ${prompt.objetivo}
Enfoque: ${prompt.enfoque}

`;

  return `${promptBase}Necesito que generes un flujo completo de mensajes de WhatsApp para Gesicom.

Tipo de flujo: ${meta.label}

Reglas obligatorias de salida para Gesicom:
- Tu respuesta debe venir en formato JSON válido para que pueda copiarse completa y pegarse directamente en la sección "Pegar JSON" de Gesicom.
- Respondé EXCLUSIVAMENTE con el objeto JSON. No uses Markdown, no agregues explicación, no agregues texto antes o después y no encierres la respuesta en \`\`\`.
- Aunque el prompt base pida análisis, estrategia, tablas, objeciones o clasificaciones, usalo solo como criterio interno. La respuesta final debe ser SOLO el JSON del flujo.
- El sistema usará ese JSON para armar automáticamente el flujo de conversaciones, por eso debe respetar exactamente los nombres de campos.
- El JSON raíz debe tener exactamente esta estructura:
{
  "nombre": "Nombre del flujo",
  "descripcion": "Descripción breve del objetivo del flujo",
  "activo": true,
  "predeterminado": true,
  "fases": [
    {
      "nombre": "Nombre de la fase",
      "mensaje": "Texto exacto del mensaje de WhatsApp con variables de Gesicom",
      "espera_sugerida_minutos": 0,
      "etiqueta_id": null
    }
  ]
}
- "fases" debe ser un array ordenado. Cada fase debe tener: nombre, mensaje, espera_sugerida_minutos y etiqueta_id.
- Cada fase representa un contacto/mensaje del prompt base.${cantidadFases ? ` Generá exactamente ${cantidadFases} fases para este flujo.` : ""}
- espera_sugerida_minutos siempre es un número entero en minutos. Para 4 horas usá 240; para 1 día usá 1440; para 3 días usá 4320.
- etiqueta_id debe ser null salvo que yo te indique IDs de etiquetas.
- Usá solo variables de esta lista, escritas exactamente con llaves:
${variablesTexto || "- No hay variables disponibles."}
- Si el prompt base menciona variables con doble llave como {{nombre_cliente}}, convertílas al formato disponible de Gesicom, por ejemplo {cliente_nombre}.
- No inventes datos del cliente, productos, montos, direcciones ni teléfonos. Usá variables.
- Mantené el tono cercano, paraguayo/neutro, claro y breve. Cada mensaje debe poder enviarse por WhatsApp tal cual.
- El flujo tiene que cubrir el recorrido completo, no solo un mensaje.

JSON de ejemplo de formato:
${JSON.stringify(ejemplo, null, 2)}

Flujo actual para mejorar o reemplazar:
${JSON.stringify({
  nombre: flujo?.nombre || meta.label,
  descripcion: flujo?.descripcion || "",
  activo: flujo?.activo !== false,
  predeterminado: tipo === CUSTOM_FLOW_TYPE ? false : !!flujo?.predeterminado,
  fases: (flujo?.fases || []).map((f) => ({
    nombre: f.nombre,
    mensaje: f.mensaje,
    espera_sugerida_minutos: Number(f.espera_sugerida_minutos) || 0,
    etiqueta_id: f.etiqueta_id || null,
  })),
}, null, 2)}`;
}

/**
 * `servicio` existe solo como costura para el banco de pruebas
 * (__DevFlujos.jsx, ruta /dev/flujos): permite ver la pantalla con datos
 * falsos sin backend ni sesion. En produccion nunca se pasa, y el
 * componente es EL MISMO — no hay una segunda version de esta pantalla.
 */
export function FlujosWhatsapp({ onModoEdicion, servicio = seguimientoService }) {
  const [flujos, setFlujos] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [variables, setVariables] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState([]);

  // Una sola selección para el editor y el preview.
  const [faseActiva, setFaseActiva] = useState(0);
  const [modoPreview, setModoPreview] = useState("ejemplo");
  const [previewMovil, setPreviewMovil] = useState(false);
  const [flujoCompleto, setFlujoCompleto] = useState(false);
  const [jsonIAAbierto, setJsonIAAbierto] = useState(false);
  const [jsonIA, setJsonIA] = useState("");
  const [errorIA, setErrorIA] = useState("");
  const [avisoIA, setAvisoIA] = useState("");

  // Para hacer scroll y dar foco a la fase recién agregada.
  const refsFase = useRef({});
  const faseAEnfocar = useRef(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resFlujos, resEtiquetas, resVariables] = await Promise.all([
        servicio.getFlujos(),
        servicio.getEtiquetas(),
        servicio.getVariables(),
      ]);
      setFlujos(resFlujos || []);
      setEtiquetas(resEtiquetas || []);
      setVariables(resVariables || []);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar los flujos");
    } finally {
      setCargando(false);
    }
  }, [servicio]);

  useEffect(() => { cargar(); }, [cargar]);

  // El constructor ocupa la pantalla: el contenedor esconde su encabezado y
  // las otras secciones mientras se edita un flujo.
  useEffect(() => {
    if (onModoEdicion) onModoEdicion(!!editando);
  }, [editando, onModoEdicion]);

  // Scroll + foco a la fase nueva, una vez que React la pintó.
  useEffect(() => {
    const indice = faseAEnfocar.current;
    if (indice === null || indice === undefined) return;
    faseAEnfocar.current = null;
    const nodo = refsFase.current[indice];
    if (!nodo) return;
    nodo.scrollIntoView({ behavior: "smooth", block: "center" });
    nodo.querySelector("input")?.focus();
  }, [editando?.fases?.length]);

  const abrirNuevo = (tipo) => {
    setErroresValidacion([]);
    setFaseActiva(0);
    setEditando(flujoNuevo(typeof tipo === "string" ? tipo : undefined));
  };

  const abrirExistente = async (flujo) => {
    setErroresValidacion([]);
    setFaseActiva(0);
    try {
      const completo = await servicio.getFlujo(flujo.id);
      setEditando({ ...completo, fases: conKeys(completo.fases) });
    } catch (e) {
      console.error(e);
      setError("No se pudo abrir el flujo");
    }
  };

  const cambiarFase = (idx, campo, valor) => {
    setEditando((prev) => ({
      ...prev,
      fases: prev.fases.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)),
    }));
  };

  const agregarFase = () => {
    const indiceNuevo = editando.fases.length;
    faseAEnfocar.current = indiceNuevo;
    setEditando((prev) => ({ ...prev, fases: [...prev.fases, faseNueva(prev.fases.length)] }));
    setFaseActiva(indiceNuevo);
  };

  const duplicarFase = (idx) => {
    const base = {
      ...editando.fases[idx],
      accion_operativa: null,
      transicion_estado_desde: null,
      transicion_estado_hasta: null,
    };
    const copia = {
      ...base,
      id: null,
      _key: `nueva-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nombre: `${editando.fases[idx].nombre} (copia)`,
    };
    faseAEnfocar.current = idx + 1;
    setEditando((prev) => {
      const fases = [...prev.fases];
      fases.splice(idx + 1, 0, copia);
      return { ...prev, fases };
    });
    setFaseActiva(idx + 1);
  };

  const quitarFase = (idx) => {
    if (editando.fases.length === 1) return;
    const quedan = editando.fases.length - 1;
    setEditando((prev) => ({ ...prev, fases: prev.fases.filter((_, i) => i !== idx) }));
    setFaseActiva((activa) => Math.min(activa > idx ? activa - 1 : activa, quedan - 1));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    setEditando((prev) => {
      const fases = Array.from(prev.fases);
      const [movida] = fases.splice(source.index, 1);
      fases.splice(destination.index, 0, movida);
      return { ...prev, fases };
    });
    // El preview sigue a la fase que el usuario acaba de mover.
    setFaseActiva((activa) => {
      if (activa === source.index) return destination.index;
      if (source.index < activa && destination.index >= activa) return activa - 1;
      if (source.index > activa && destination.index <= activa) return activa + 1;
      return activa;
    });
  };

  const guardar = async () => {
    setErroresValidacion([]);
    const payload = {
      nombre: editando.nombre,
      descripcion: editando.descripcion,
      activo: editando.activo,
      tipo: editando.tipo || "CONFIRMACION_PEDIDO_WEB",
      activacion: editando.tipo === CUSTOM_FLOW_TYPE ? "MANUAL" : (editando.activacion || "MANUAL"),
      predeterminado: editando.tipo === CUSTOM_FLOW_TYPE ? false : !!editando.predeterminado,
      // El orden es la posición en el array; el backend recalcula `orden`.
      fases: editando.fases.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        mensaje: f.mensaje,
        espera_sugerida_minutos: Number(f.espera_sugerida_minutos) || 0,
        etiqueta_id: f.etiqueta_id || null,
        estado_activador: f.estado_activador || null,
        accion_operativa: null,
        transicion_estado_desde: null,
        transicion_estado_hasta: null,
      })),
    };

    setGuardando(true);
    try {
      if (editando.id) await servicio.updateFlujo(editando.id, payload);
      else await servicio.createFlujo(payload);
      setEditando(null);
      await cargar();
    } catch (e) {
      console.error(e);
      const data = e.response?.data;
      if (data?.errores?.length) setErroresValidacion(data.errores);
      else setErroresValidacion([data?.error || data?.message || "No se pudo guardar el flujo"]);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (flujo) => {
    if (!window.confirm(`¿Eliminar el flujo "${flujo.nombre}"?`)) return;
    try {
      const res = await servicio.deleteFlujo(flujo.id);
      if (res?.desactivado) window.alert(res.message);
      await cargar();
    } catch (e) {
      console.error(e);
      window.alert(e.response?.data?.error || "No se pudo eliminar el flujo");
    }
  };

  const copiarInstruccionesIA = async () => {
    if (!editando) return;
    setErrorIA("");
    setAvisoIA("");
    const instrucciones = generarInstruccionesIA({ flujo: editando, variables });
    try {
      await navigator.clipboard.writeText(instrucciones);
      setAvisoIA("Instrucciones copiadas. Pegalas en la IA y después traé acá el JSON.");
    } catch {
      setErrorIA("No pude copiar al portapapeles. Probá de nuevo desde un navegador con permisos de copia.");
    }
  };

  const abrirJsonIA = async () => {
    setErrorIA("");
    setAvisoIA("");
    setJsonIA("");
    setJsonIAAbierto(true);
    try {
      const texto = await navigator.clipboard?.readText?.();
      if (texto && /[\[{]/.test(texto)) setJsonIA(texto);
    } catch {
      // El navegador puede negar lectura del portapapeles; el textarea queda listo para pegar manualmente.
    }
  };

  const aplicarJsonIA = () => {
    try {
      const actualizado = aplicarJsonAlFlujo({ texto: jsonIA, editando, etiquetas });
      setEditando(actualizado);
      setFaseActiva(0);
      setErroresValidacion([]);
      setJsonIAAbierto(false);
      setAvisoIA(`JSON aplicado: ${actualizado.fases.length} ${actualizado.fases.length === 1 ? "fase" : "fases"} en el flujo.`);
    } catch (e) {
      setErrorIA(e.message || "No pude aplicar el JSON.");
    }
  };

  if (cargando) {
    return (
      <div className="gw-shell" style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "var(--color-fg-muted)" }}>
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  const fases = editando?.fases || [];
  const faseEnPreview = fases[Math.min(faseActiva, fases.length - 1)] || null;

  return (
    <section className="gw-shell">
      {error && (
        <div className="gw-errors" role="alert">
          <AlertCircle size={16} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          {error}
        </div>
      )}

      {!editando ? (
        <>
          <header className="gw-head">
            <div className="gw-head-titles">
              <p className="gw-eyebrow">Seguimiento por WhatsApp</p>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Flujos de mensajes</h2>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.86rem", color: "var(--color-fg-muted)", maxWidth: "70ch" }}>
                Las etapas principales avanzan según el estado del pedido, y también podés crear otros flujos manuales
                para casos propios de tu operación.
              </p>
            </div>
          </header>
          <ListaFlujos flujos={flujos} onEditar={abrirExistente} onEliminar={eliminar} onNuevo={abrirNuevo} />
        </>
      ) : (
        <>
          <div className="gw-back-bar">
            <button
              type="button"
              className="gw-btn-back"
              onClick={() => setEditando(null)}
            >
              <ArrowLeft size={16} />
              <span>Volver a Flujos</span>
            </button>
            <span className="gw-edit-badge">
              {editando.id ? "Editando flujo" : "Nuevo flujo"}
            </span>
          </div>
          <header className="gw-head">
            <div className="gw-head-titles">
              <div className="gw-header-fields">
                <div className="gw-field-group">
                  <label className="gw-field-label">
                    <Edit2 size={12} className="gw-label-icon" />
                    Nombre del flujo <span className="gw-req">*</span>
                  </label>
                  <input
                    className="gw-input gw-input--title"
                    placeholder="Nombre del flujo (ej: Confirmación de pedido)"
                    value={editando.nombre}
                    onChange={(e) => setEditando((p) => ({ ...p, nombre: e.target.value }))}
                    aria-label="Nombre del flujo"
                  />
                </div>
                <div className="gw-field-group">
                  <label className="gw-field-label">
                    <Edit2 size={12} className="gw-label-icon" />
                    Descripción (opcional)
                  </label>
                  <input
                    className="gw-input gw-input--sub"
                    placeholder="Escribí para qué sirve este flujo..."
                    value={editando.descripcion || ""}
                    onChange={(e) => setEditando((p) => ({ ...p, descripcion: e.target.value }))}
                    aria-label="Descripción del flujo"
                  />
                </div>
              </div>
            </div>
            <div className="gw-head-actions">
              <button className="gw-btn gw-btn--ghost" onClick={() => setFlujoCompleto(true)}>
                <Eye size={15} /> Vista previa completa
              </button>
              <button className="gw-btn gw-btn--primary" onClick={guardar} disabled={guardando}>
                {guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Guardar cambios
              </button>
            </div>
          </header>

          <section className="gw-flow-config" aria-label="Configuración del flujo">
            <div className="gw-flow-config__field">
              <label className="gw-field-label">Uso del flujo <span className="gw-req">*</span></label>
              <select
                className="gw-input"
                value={editando?.tipo || "CONFIRMACION_PEDIDO_WEB"}
                onChange={(e) => {
                  const tipo = e.target.value;
                  setEditando((p) => ({
                    ...p,
                    tipo,
                    activacion: tipo === CUSTOM_FLOW_TYPE ? "MANUAL" : p.activacion,
                    predeterminado: tipo === CUSTOM_FLOW_TYPE ? false : p.predeterminado,
                    fases: conEsperaInicial(p.fases, tipo),
                  }));
                }}
                aria-label="Uso del flujo"
              >
                {Object.entries(FLOW_TYPES).map(([value, meta]) => (
                  <option key={value} value={value}>{meta.label}</option>
                ))}
              </select>
              <p>{FLOW_TYPES[editando?.tipo || "CONFIRMACION_PEDIDO_WEB"]?.hint}</p>
            </div>

            {editando?.tipo !== CUSTOM_FLOW_TYPE && (
              <label className="gw-switch gw-switch--inline">
                <input
                  type="checkbox"
                  checked={!!editando?.predeterminado}
                  onChange={(e) => setEditando((p) => ({ ...p, predeterminado: e.target.checked }))}
                />
                <span>Flujo principal de la etapa: el que reciben los pedidos que entran a ella</span>
              </label>
            )}
          </section>

          {erroresValidacion.length > 0 && (
            <div className="gw-errors" role="alert">
              <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={15} /> No se pudo guardar
              </strong>
              <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          <div className="gw-grid">
            <div className="gw-builder">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="fases-flujo">
                  {(dropProvided) => (
                    <div className="gw-steps" ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                      {fases.map((fase, idx) => (
                        <Draggable key={fase._key} draggableId={fase._key} index={idx}>
                          {(dragProvided, snapshot) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} style={dragProvided.draggableProps.style}>
                              {idx === 0 && editando.tipo === ETAPA_RECOMPRA && (
                                <ConnectorWait
                                  inicio
                                  texto="Enviar el primer mensaje"
                                  sufijo="después de la entrega"
                                  esperaMinutos={fase.espera_sugerida_minutos}
                                  onChangeEspera={(nuevosMinutos) => cambiarFase(idx, "espera_sugerida_minutos", nuevosMinutos)}
                                />
                              )}
                              {idx > 0 && (
                                <ConnectorWait
                                  esperaMinutos={fase.espera_sugerida_minutos}
                                  onChangeEspera={(nuevosMinutos) => cambiarFase(idx, "espera_sugerida_minutos", nuevosMinutos)}
                                />
                              )}
                              <FaseCard
                                ref={(el) => { refsFase.current[idx] = el; }}
                                fase={fase}
                                idx={idx}
                                total={fases.length}
                                fases={fases}
                                etiquetas={etiquetas}
                                variables={variables}
                                tipoFlujo={editando.tipo}
                                activa={idx === faseActiva}
                                arrastrando={snapshot.isDragging}
                                dragHandleProps={dragProvided.dragHandleProps}
                                onSeleccionar={() => setFaseActiva(idx)}
                                onCampo={cambiarFase}
                                onDuplicar={duplicarFase}
                                onQuitar={quitarFase}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <button className="gw-add" onClick={agregarFase}>
                <Plus size={16} /> Agregar siguiente fase
              </button>

              <label className="gw-switch">
                <input
                  type="checkbox"
                  checked={!!editando.activo}
                  onChange={(e) => setEditando((p) => ({ ...p, activo: e.target.checked }))}
                />
                <span>Flujo activo</span>
                <span className="gw-tip" data-tip="Un flujo inactivo no aparece en el panel del pedido, pero no se borra.">
                  <Info size={13} />
                </span>
              </label>

              <button className="gw-btn gw-btn--ghost gw-fab" onClick={() => setPreviewMovil(true)}>
                <Eye size={15} /> Vista previa
              </button>
            </div>

            <aside className="gw-aside">
              <VistaPrevia
                fases={fases}
                indice={Math.min(faseActiva, fases.length - 1)}
                onIndice={setFaseActiva}
                variables={variables}
                modo={modoPreview}
                onModo={setModoPreview}
              />
              <AsistenteFlujoIA
                aviso={avisoIA}
                error={errorIA}
                onCopiar={copiarInstruccionesIA}
                onPegar={abrirJsonIA}
              />
            </aside>
          </div>

          {previewMovil && (
            <Modal
              titulo="Vista previa"
              subtitulo="Así se va a ver el mensaje de esta fase."
              onCerrar={() => setPreviewMovil(false)}
            >
              <VistaPrevia
                fases={fases}
                indice={Math.min(faseActiva, fases.length - 1)}
                onIndice={setFaseActiva}
                variables={variables}
                modo={modoPreview}
                onModo={setModoPreview}
                sinMarco
              />
            </Modal>
          )}

          {flujoCompleto && (
            <Modal
              titulo={editando.nombre?.trim() || "Flujo sin nombre"}
              subtitulo={`${fases.length} ${fases.length === 1 ? "fase" : "fases"} · el recorrido completo con datos de ejemplo`}
              onCerrar={() => setFlujoCompleto(false)}
            >
              <FlujoCompleto fases={fases} variables={variables} />
            </Modal>
          )}

          {jsonIAAbierto && (
            <Modal
              titulo="Pegar JSON de la IA"
              subtitulo="Esto actualiza el flujo en pantalla. Después revisá la vista previa y guardá los cambios."
              onCerrar={() => setJsonIAAbierto(false)}
            >
              <div className="gw-ai-modal">
                <textarea
                  className="gw-textarea gw-ai-json"
                  value={jsonIA}
                  onChange={(e) => { setJsonIA(e.target.value); setErrorIA(""); }}
                  placeholder='{"nombre":"Confirmación de pedido web","descripcion":"...","fases":[{"nombre":"Confirmación","mensaje":"Hola {cliente_nombre}...","espera_sugerida_minutos":0,"etiqueta_id":null}]}'
                  autoFocus
                  spellCheck={false}
                />
                {errorIA && (
                  <div className="gw-ai-alert gw-ai-alert--error" role="alert">
                    <AlertCircle size={14} /> {errorIA}
                  </div>
                )}
                <div className="gw-ai-actions">
                  <button type="button" className="gw-btn gw-btn--ghost" onClick={() => setJsonIAAbierto(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="gw-btn gw-btn--primary" onClick={aplicarJsonIA} disabled={!jsonIA.trim()}>
                    <Check size={15} /> Aplicar JSON al flujo
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </section>
  );
}

/* ─── Asistente IA ─────────────────────────────────────────── */

function AsistenteFlujoIA({ aviso, error, onCopiar, onPegar }) {
  return (
    <section className="gw-ai-card" aria-label="Instrucciones para IA">
      <div className="gw-ai-card__head">
        <div>
          <h3>Instrucciones para IA</h3>
          <p>Copiá el prompt, pedile a la IA el JSON y pegalo acá para actualizar las fases.</p>
        </div>
      </div>
      <div className="gw-ai-card__actions">
        <button type="button" className="gw-btn gw-btn--ghost" onClick={onCopiar}>
          <Clipboard size={15} /> Copiar instrucciones
        </button>
        <button type="button" className="gw-btn gw-btn--primary" onClick={onPegar}>
          <Copy size={15} /> Pegar JSON
        </button>
      </div>
      {aviso && (
        <div className="gw-ai-alert gw-ai-alert--ok" role="status">
          <Check size={14} /> {aviso}
        </div>
      )}
      {error && (
        <div className="gw-ai-alert gw-ai-alert--error" role="alert">
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </section>
  );
}

/* ─── Listado ──────────────────────────────────────────────── */

function ListaFlujos({ flujos, onEditar, onEliminar, onNuevo }) {
  // Una sección por uso: las etapas automáticas y un grupo libre para flujos
  // manuales que no dependen del estado del pedido.
  return (
    <div className="gw-etapas">
      {Object.entries(FLOW_TYPES).map(([tipo, meta]) => {
        const deLaEtapa = flujos.filter((f) => (f.tipo || "CONFIRMACION_PEDIDO_WEB") === tipo);
        return (
          <section key={tipo} className="gw-etapa" aria-label={meta.label}>
            <header className="gw-etapa-head">
              <div style={{ minWidth: 0 }}>
                <h3>{meta.label}</h3>
                <p>{meta.hint}</p>
              </div>
              <button className="gw-btn gw-btn--ghost" onClick={() => onNuevo(tipo)}>
                <Plus size={15} /> Agregar flujo
              </button>
            </header>

            {deLaEtapa.length === 0 ? (
              <div className="gw-empty">
                {meta.stage === "manual" ? "Todavía no hay flujos manuales." : "Esta etapa todavía no tiene flujo."}
              </div>
            ) : (
              <div className="gw-cards">
                {deLaEtapa.map((flujo) => (
                  <TarjetaFlujo
                    key={flujo.id}
                    flujo={flujo}
                    unicoDeLaEtapa={meta.stage !== "manual" && deLaEtapa.length === 1}
                    onEditar={onEditar}
                    onEliminar={onEliminar}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TarjetaFlujo({ flujo, unicoDeLaEtapa, onEditar, onEliminar }) {
  const fases = flujo.fases || [];
  const esRecompra = flujo.tipo === ETAPA_RECOMPRA;
  return (
    <article className={`gw-card ${flujo.activo ? "" : "is-off"}`}>
      <div className="gw-card-head">
        <div style={{ minWidth: 0 }}>
          <h4>{flujo.nombre}</h4>
          <div className="gw-card-meta">
            {fases.length} {fases.length === 1 ? "mensaje" : "mensajes"}
            {flujo.predeterminado && <> · <span className="gw-pill gw-pill--ok">Principal</span></>}
            {!flujo.activo && <> · <span className="gw-pill">Inactivo</span></>}
          </div>
        </div>
        <div className="gw-step-tools">
          <button className="gw-icon-btn" onClick={() => onEditar(flujo)} title="Editar flujo"><Edit2 size={15} /></button>
          <button
            className="gw-icon-btn gw-icon-btn--danger"
            onClick={() => onEliminar(flujo)}
            disabled={unicoDeLaEtapa}
            title={unicoDeLaEtapa ? "Es el único flujo de esta etapa: se puede editar o desactivar, no eliminar" : "Eliminar flujo"}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {flujo.descripcion && (
        <p style={{ margin: "0.7rem 0 0", fontSize: "0.8rem", color: "var(--color-fg-muted)" }}>{flujo.descripcion}</p>
      )}

      <ul className="gw-card-steps">
        {fases.map((fase, i) => (
          <li key={fase.id} className="gw-card-step">
            <span className="gw-badge">{i + 1}</span>
            <span className="gw-card-step-name">{fase.nombre}</span>
            {i > 0 && <span className="gw-card-step-wait">+{formatEspera(fase.espera_sugerida_minutos)}</span>}
            {i === 0 && esRecompra && fase.espera_sugerida_minutos > 0 && (
              <span className="gw-card-step-wait">{formatEspera(fase.espera_sugerida_minutos)} tras la entrega</span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ─── Conector interactivo de espera entre fases ───────────── */
function ConnectorWait({ esperaMinutos, onChangeEspera, texto = "esperar", sufijo = null, inicio = false }) {
  const { valor, unidad } = desarmarEspera(esperaMinutos);

  const cambiarEspera = (nuevoValor, nuevaUnidad) => {
    const factor = UNIDADES.find((u) => u.key === nuevaUnidad)?.factor || 1;
    const n = Math.max(0, Math.floor(Number(nuevoValor) || 0));
    onChangeEspera(n * factor);
  };

  return (
    <div className={`gw-connector ${inicio ? "gw-connector--inicio" : ""}`}>
      {!inicio && <div className="gw-connector-line" />}
      <div className="gw-wait-editable">
        <Clock size={13} className="gw-wait-icon" />
        <span className="gw-wait-text">{texto}</span>
        <input
          type="number"
          min="0"
          className="gw-input gw-input--wait-num"
          value={valor}
          onChange={(e) => cambiarEspera(e.target.value, unidad)}
          aria-label="Tiempo de espera"
        />
        <select
          className="gw-select gw-select--wait-unit"
          value={unidad}
          onChange={(e) => cambiarEspera(valor, e.target.value)}
          aria-label="Unidad de tiempo de espera"
        >
          {UNIDADES.map((u) => (
            <option key={u.key} value={u.key}>
              {valor === 1 ? u.singular : u.plural}
            </option>
          ))}
        </select>
        {sufijo && <span className="gw-wait-text">{sufijo}</span>}
      </div>
    </div>
  );
}

/* ─── Una fase ─────────────────────────────────────────────── */

const FaseCard = React.forwardRef(function FaseCard({
  fase, idx, total, fases, etiquetas, variables, tipoFlujo, activa, arrastrando,
  dragHandleProps, onSeleccionar, onCampo, onDuplicar, onQuitar,
}, ref) {
  const { valor, unidad } = desarmarEspera(fase.espera_sugerida_minutos);

  const cambiarEspera = (nuevoValor, nuevaUnidad) => {
    const factor = UNIDADES.find((u) => u.key === nuevaUnidad)?.factor || 1;
    const n = Math.max(0, Math.floor(Number(nuevoValor) || 0));
    onCampo(idx, "espera_sugerida_minutos", n * factor);
  };

  const faseSiguiente = (fases && idx < total - 1) ? fases[idx + 1] : null;
  const { valor: valorSig, unidad: unidadSig } = desarmarEspera(faseSiguiente?.espera_sugerida_minutos || 0);

  const cambiarEsperaSig = (nuevoValor, nuevaUnidad) => {
    const factor = UNIDADES.find((u) => u.key === nuevaUnidad)?.factor || 1;
    const n = Math.max(0, Math.floor(Number(nuevoValor) || 0));
    onCampo(idx + 1, "espera_sugerida_minutos", n * factor);
  };

  return (
    <div
      ref={ref}
      className={`gw-step-card${activa ? " is-editing" : ""}${arrastrando ? " is-dragging" : ""}`}
      onFocus={onSeleccionar}
      onMouseDown={onSeleccionar}
    >
      <div className="gw-step-head">
        <span className="gw-badge">{idx + 1}</span>
        <input
          className="gw-input gw-step-name"
          placeholder="Nombre de la fase"
          value={fase.nombre}
          onChange={(e) => onCampo(idx, "nombre", e.target.value)}
          aria-label={`Nombre de la fase ${idx + 1}`}
        />
        {activa && <span className="gw-editing-tag">Editando</span>}
        <div className="gw-step-tools">
          <button className="gw-icon-btn gw-icon-btn--grab" {...dragHandleProps} title="Arrastrar para reordenar" aria-label="Reordenar fase">
            <GripVertical size={15} />
          </button>
          <button className="gw-icon-btn" onClick={() => onDuplicar(idx)} title="Duplicar fase"><Copy size={14} /></button>
          <button
            className="gw-icon-btn gw-icon-btn--danger"
            onClick={() => onQuitar(idx)}
            disabled={total <= 1}
            title={total > 1 ? "Eliminar fase" : "El flujo necesita al menos una fase"}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <EditorMensaje
        value={fase.mensaje}
        variables={variables}
        onChange={(texto) => onCampo(idx, "mensaje", texto)}
      />

      <div className="gw-cfg">
        {idx < total - 1 && (
          <div className="gw-cfg-field">
            <div className="gw-cfg-label">
              <Clock size={12} /> Seguimiento para la Fase {idx + 2}
              <span className="gw-tip" data-tip="Tiempo a esperar después de enviar esta fase para recordarte enviar el siguiente mensaje.">
                <Info size={12} />
              </span>
            </div>
            <div className="gw-cfg-row">
              <input
                type="number"
                min="0"
                className="gw-input gw-input--num"
                value={valorSig}
                onChange={(e) => cambiarEsperaSig(e.target.value, unidadSig)}
                aria-label="Cantidad de espera sugerida para la siguiente fase"
              />
              <select
                className="gw-select"
                value={unidadSig}
                onChange={(e) => cambiarEsperaSig(valorSig, e.target.value)}
                aria-label="Unidad de espera sugerida para la siguiente fase"
              >
                {UNIDADES.map((u) => <option key={u.key} value={u.key}>{u.plural} después</option>)}
              </select>
            </div>
          </div>
        )}

        {idx > 0 && idx === total - 1 && (
          <div className="gw-cfg-field">
            <div className="gw-cfg-label">
              <Clock size={12} /> Espera desde la Fase {idx}
              <span className="gw-tip" data-tip="Solo genera un recordatorio para vos. No envía mensajes automáticamente.">
                <Info size={12} />
              </span>
            </div>
            <div className="gw-cfg-row">
              <input
                type="number"
                min="0"
                className="gw-input gw-input--num"
                value={valor}
                onChange={(e) => cambiarEspera(e.target.value, unidad)}
                aria-label="Cantidad de espera sugerida"
              />
              <select
                className="gw-select"
                value={unidad}
                onChange={(e) => cambiarEspera(valor, e.target.value)}
                aria-label="Unidad de espera sugerida"
              >
                {UNIDADES.map((u) => <option key={u.key} value={u.key}>{u.plural} después</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="gw-cfg-field">
          <div className="gw-cfg-label">
            <Tag size={12} /> Etiqueta al abrir
          </div>
          <select
            className="gw-select"
            value={fase.etiqueta_id || ""}
            onChange={(e) => onCampo(idx, "etiqueta_id", e.target.value ? Number(e.target.value) : null)}
            aria-label="Etiqueta que se aplica al abrir la fase"
          >
            <option value="">Ninguna</option>
            {etiquetas.map((et) => <option key={et.id} value={et.id}>{et.nombre}</option>)}
          </select>
        </div>

          <div className="gw-cfg-field gw-cfg-field--transition">
            <label className="gw-cfg-label">Estado activador</label>
            <select className="gw-select" aria-label="Estado activador" value={fase.estado_activador || ""} onChange={(e) => onCampo(idx, "estado_activador", e.target.value || null)}>
              <option value="">Al iniciar esta etapa</option>
              {STATUS_ORDER.map((estado) => <option key={estado} value={estado}>{STATUS[estado]?.label || estado}</option>)}
            </select>
            <p className="gw-transition-help">El estado del pedido habilita este mensaje. Enviarlo conserva el estado logístico; los avisos de preparación se omiten si el pedido ya está despachado.</p>
          </div>
      </div>
    </div>
  );
});

/* ─── Editor con variables resaltadas ──────────────────────── */

/**
 * Textarea con las variables pintadas distinto del texto normal.
 *
 * Un textarea no puede contener HTML, así que se usan dos capas alineadas:
 * un div de fondo que pinta el texto con las variables resaltadas, y el
 * textarea encima con el texto transparente (aporta caret, selección y
 * edición). Las dos comparten la clase .gw-layer, que fija la MISMA
 * tipografía, padding y borde — cualquier diferencia desalinea el resaltado.
 *
 * Lo que se guarda sigue siendo el texto crudo con {variable}.
 */
function EditorMensaje({ value, variables, onChange }) {
  const taRef = useRef(null);
  const fondoRef = useRef(null);
  const [enfocado, setEnfocado] = useState(false);

  const tramos = useMemo(() => partirMensaje(value, variables), [value, variables]);
  const malEscritas = useMemo(() => variablesDesconocidas(value, variables), [value, variables]);

  const sincronizarScroll = () => {
    if (fondoRef.current && taRef.current) {
      fondoRef.current.scrollTop = taRef.current.scrollTop;
      fondoRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  // El mensaje se ve entero: el textarea crece con el texto en vez de
  // esconderlo detras de un scroll interno. Recien al pasarse de .gw-ta
  // (max-height) aparece scroll, y ahi el fondo lo sigue.
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    // scrollHeight no incluye los bordes y la caja es border-box: sin sumarlos
    // el textarea queda 2px corto y aparece un scroll de dos pixeles.
    const bordes = ta.offsetHeight - ta.clientHeight;
    ta.style.height = `${ta.scrollHeight + bordes}px`;
    sincronizarScroll();
  }, [value]);

  /** Inserta el token donde está el cursor y deja el caret después de él. */
  const insertar = (clave) => {
    const token = `{${clave}}`;
    const ta = taRef.current;
    const actual = value || "";
    if (!ta) {
      onChange(actual + token);
      return;
    }
    const inicio = ta.selectionStart ?? actual.length;
    const fin = ta.selectionEnd ?? actual.length;
    onChange(actual.slice(0, inicio) + token + actual.slice(fin));
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = inicio + token.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div>
      <div className={`gw-editor${enfocado ? " is-focused" : ""}`}>
        <div className="gw-layer gw-editor-backdrop" ref={fondoRef} aria-hidden="true">
          {tramos.map((t, i) => (
            t.tipo === "variable"
              ? <span key={i} className={`gw-chip${t.conocida ? "" : " gw-chip--bad"}`}>{t.valor}</span>
              : <span key={i}>{t.valor}</span>
          ))}
          {/* Sin esta última línea, un mensaje que termina en Enter deja el
              fondo más corto que el textarea y el resaltado se corre. */}
          {"\n"}
        </div>
        <textarea
          ref={taRef}
          className="gw-layer gw-ta"
          placeholder="Hola {cliente_nombre}, te escribimos para confirmar tu pedido #{pedido_id}. ¿Nos confirmás que podemos prepararlo?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={sincronizarScroll}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          spellCheck={false}
        />
      </div>

      <div className="gw-editor-bar">
        <SelectorVariables variables={variables} onInsertar={insertar} />
        {malEscritas.length > 0 && (
          <span className="gw-warn">
            <AlertCircle size={13} />
            {malEscritas.length === 1
              ? `{${malEscritas[0]}} no existe: va a llegar así al cliente`
              : `${malEscritas.length} variables no existen y van a llegar así al cliente`}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Selector de variables ────────────────────────────────── */

function SelectorVariables({ variables, onInsertar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const cajaRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const afuera = (e) => { if (!cajaRef.current?.contains(e.target)) setAbierto(false); };
    const escape = (e) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return variables;
    return variables.filter((v) =>
      v.key.toLowerCase().includes(q) ||
      (v.desc || "").toLowerCase().includes(q) ||
      (v.grupo || "").toLowerCase().includes(q));
  }, [variables, busqueda]);

  const grupos = useMemo(() => agruparVariables(filtradas), [filtradas]);

  const elegir = (clave) => {
    onInsertar(clave);
    setAbierto(false);
    setBusqueda("");
  };

  return (
    <div className="gw-varpick" ref={cajaRef}>
      <button
        className="gw-btn gw-btn--ghost"
        style={{ fontSize: "0.8rem", padding: "0.4rem 0.7rem" }}
        onClick={() => setAbierto((v) => !v)}
        type="button"
      >
        <Plus size={14} /> Insertar variable
      </button>

      {abierto && (
        <div className="gw-pop" role="dialog" aria-label="Insertar variable">
          <div className="gw-pop-search">
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-subtle)" }} />
              <input
                className="gw-input"
                style={{ paddingLeft: "1.9rem" }}
                placeholder="Buscar variable..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="gw-pop-list">
            {grupos.map((g) => (
              <div key={g.nombre}>
                <div className="gw-pop-group">{g.nombre}</div>
                {g.variables.map((v) => (
                  <button key={v.key} className="gw-pop-item" type="button" onClick={() => elegir(v.key)}>
                    <strong>{v.desc}</strong>
                    <span>{`{${v.key}}`} · {v.ejemplo}</span>
                  </button>
                ))}
              </div>
            ))}
            {grupos.length === 0 && <div className="gw-pop-empty">No hay variables que coincidan.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Vista previa ─────────────────────────────────────────── */

function VistaPrevia({ fases, indice, onIndice, variables, modo, onModo, sinMarco }) {
  const fase = fases[indice] || null;
  const cliente = variables.find((v) => v.key === "cliente_nombre")?.ejemplo || "Cliente";

  const cuerpo = (
    <>
      <div className="gw-preview-head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          {!sinMarco && <h3 className="gw-preview-title">Vista previa</h3>}
          <div className="gw-seg" role="group" aria-label="Modo de vista previa">
            <button className={`gw-seg-btn${modo === "ejemplo" ? " is-active" : ""}`} onClick={() => onModo("ejemplo")}>
              Datos de ejemplo
            </button>
            <button className={`gw-seg-btn${modo === "variables" ? " is-active" : ""}`} onClick={() => onModo("variables")}>
              Ver variables
            </button>
          </div>
        </div>
        {fases.length > 1 && (
          <div className="gw-tabs" role="tablist">
            {fases.map((f, i) => (
              <button
                key={f._key || f.id}
                role="tab"
                aria-selected={i === indice}
                className={`gw-tab${i === indice ? " is-active" : ""}`}
                onClick={() => onIndice(i)}
                title={f.nombre}
              >
                Fase {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <BurbujaWhatsapp
        mensaje={fase?.mensaje}
        variables={variables}
        modo={modo}
        quien={cliente}
      />

      <div className="gw-preview-foot">
        {modo === "ejemplo"
          ? "Datos ficticios con el mismo formato que usa el mensaje real."
          : "El texto tal como se guarda, antes de reemplazar las variables."}
        {indice > 0 && fase && (
          <> Sugerida {formatEspera(fase.espera_sugerida_minutos)} después de la fase anterior.</>
        )}
      </div>
    </>
  );

  if (sinMarco) return <div>{cuerpo}</div>;
  return <div className="gw-preview">{cuerpo}</div>;
}

function BurbujaWhatsapp({ mensaje, variables, modo, quien }) {
  const texto = String(mensaje || "");

  if (!texto.trim()) {
    return (
      <div className="gw-wa">
        <div className="gw-bubble gw-bubble--vacia">
          Escribí el mensaje de la fase para verlo acá.
        </div>
      </div>
    );
  }

  // En modo "ejemplo" se resuelve igual que el backend y lo que quede sin
  // resolver se marca: es exactamente lo que le llegaría al cliente.
  const contenido = modo === "ejemplo" ? resolverConEjemplos(texto, variables) : texto;
  const tramos = partirMensaje(contenido, variables);

  return (
    <div className="gw-wa">
      {quien && <span className="gw-wa-quien">{quien}</span>}
      <div className="gw-bubble">
        {tramos.map((t, i) => (
          t.tipo === "variable"
            ? <span key={i} className={`gw-chip${t.conocida ? "" : " gw-chip--bad"}`}>{t.valor}</span>
            : <span key={i}>{t.valor}</span>
        ))}
        <span className="gw-bubble-meta">{horaSimulada()} ✓✓</span>
      </div>
    </div>
  );
}

/* ─── Recorrido completo ───────────────────────────────────── */

function FlujoCompleto({ fases, variables }) {
  const cliente = variables.find((v) => v.key === "cliente_nombre")?.ejemplo || "Cliente";

  return (
    <div>
      {fases.map((fase, i) => (
        <div key={fase._key || fase.id} className="gw-timeline-step">
          {i > 0 && (
            <div className="gw-connector">
              <div className="gw-connector-line" />
              <span className="gw-wait"><Clock size={12} /> esperar {formatEspera(fase.espera_sugerida_minutos)}</span>
            </div>
          )}
          <div className="gw-timeline-label">
            <span className="gw-badge">{i + 1}</span>
            {fase.nombre}
          </div>
          <div className="gw-timeline-wa">
            <BurbujaWhatsapp mensaje={fase.mensaje} variables={variables} modo="ejemplo" quien={i === 0 ? cliente : null} />
          </div>
        </div>
      ))}
      <p style={{ fontSize: "0.76rem", color: "var(--color-fg-muted)", margin: "1rem 0 0", lineHeight: 1.5 }}>
        Las esperas son sugerencias. Desde el pedido podés abrir cualquier fase en cualquier
        momento, y repetir la misma todas las veces que necesites.
      </p>
    </div>
  );
}

/* ─── Modal ────────────────────────────────────────────────── */

function Modal({ titulo, subtitulo, onCerrar, children }) {
  useEffect(() => {
    const escape = (e) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onCerrar]);

  return (
    <div className="gw-modal-backdrop" onClick={onCerrar}>
      <div className="gw-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="gw-modal-head">
          <div style={{ minWidth: 0 }}>
            <h3>{titulo}</h3>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button className="gw-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="gw-modal-body">{children}</div>
      </div>
    </div>
  );
}
