import React, { useState, useEffect, useCallback } from "react";
import { X, MessageCircle, Clock, Check, Tag, Loader2, Ban, Circle, CheckCircle2, RotateCcw, Send, ChevronRight, ChevronLeft, Eye, EyeOff } from "lucide-react";
import Select, { components } from "react-select";
import { seguimientoService } from "../../services/seguimiento.service";
import { formatEspera } from "./variablesWhatsapp";
import { numeroPedidoVisible } from "./pedidoNumero";
import { formatGs } from "../../lib/courier";
import { FLOW_TYPES } from "./orderLifecycle";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'var(--color-canvas)',
    borderColor: state.isFocused ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
    '&:hover': { borderColor: 'var(--color-primary)' },
    minHeight: '38px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem'
  }),
  menu: (base) => ({
    ...base,
    background: 'var(--color-surface-2)',
    border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    overflow: 'hidden',
    zIndex: 1050
  }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
    color: state.isFocused ? 'var(--color-primary-text)' : 'var(--color-fg)',
    cursor: 'pointer',
    padding: '8px 12px',
    fontSize: '0.85rem',
    '&:active': { background: 'color-mix(in srgb, var(--color-primary) 25%, transparent)' }
  }),
  singleValue: (base) => ({ ...base, color: 'var(--color-fg)' }),
  placeholder: (base) => ({ ...base, color: 'var(--color-fg-muted)' }),
  input: (base) => ({ ...base, color: 'var(--color-fg)' })
};

const EtiquetaOption = (props) => {
  return (
    <components.Option {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 12, height: 12, borderRadius: '3px', background: props.data.color || 'var(--color-fg)' }} />
        {props.data.label}
      </div>
    </components.Option>
  );
};

function nombreVisibleDelFlujo(flujo) {
  return FLOW_TYPES[flujo?.tipo]?.label || flujo?.nombre || "Flujo";
}

function esFasePreparacion(fase) {
  const transicion = transicionEstadoFase(fase);
  return transicion
    ? transicion.desde === "Confirmado" && transicion.hasta === "Preparado"
    : fase?.accion_operativa === "PREPARAR_PEDIDO";
}

function esFaseDespacho(fase) {
  const transicion = transicionEstadoFase(fase);
  return transicion
    ? transicion.desde === "Preparado" && transicion.hasta === "Despachado"
    : fase?.accion_operativa === "DESPACHAR_PEDIDO";
}

function transicionEstadoFase(fase) {
  if (fase?.transicion_estado_desde && fase?.transicion_estado_hasta) {
    return { desde: fase.transicion_estado_desde, hasta: fase.transicion_estado_hasta };
  }
  if (fase?.accion_operativa === "PREPARAR_PEDIDO") return { desde: "Confirmado", hasta: "Preparado" };
  if (fase?.accion_operativa === "DESPACHAR_PEDIDO") return { desde: "Preparado", hasta: "Despachado" };
  return null;
}

function flujoTieneFaseCompletada(flujo, coincide) {
  return flujo?.tipo === "SEGUIMIENTO_ENVIO"
    && (flujo.fases || []).some((fase) => fase.completada && coincide(fase));
}

/** "hoy 18:42" si es de hoy, "28/09 18:42" si no. */
function formatMomento(iso) {
  if (!iso) return "";
  const f = new Date(iso);
  const hora = f.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  const hoy = new Date();
  const mismoDia = f.toDateString() === hoy.toDateString();
  if (mismoDia) return `hoy ${hora}`;
  return `${f.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' })} ${hora}`;
}

/**
 * El recordatorio del pedido tal como vino en la fila de la bandeja. De ahí
 * en adelante el panel lleva su propia copia: la fila que le pasan no se
 * vuelve a pedir mientras está abierto, así que si dependiera de ella no se
 * enteraría de lo que él mismo acaba de agendar, completar o cancelar.
 */
function recordatorioDeEnvio(envio) {
  if (!envio?.recordatorio_id) return null;
  return {
    id: envio.recordatorio_id,
    estado: envio.recordatorio_estado,
    ejecutar_en: envio.recordatorio_ejecutar_en,
    nota: envio.recordatorio_nota,
  };
}

/** A quién se le está escribiendo: sin esto el panel era "un WhatsApp" sin nombre ni pedido. */
function contextoDelPedido(envio) {
  const cliente = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ").trim() || envio.cliente || "";
  const productos = envio.productos_texto
    || (envio.items || []).map((i) => `${i.nombre_producto}${Number(i.cantidad) > 1 ? ` x${i.cantidad}` : ""}`).join(", ");
  return { cliente, productos };
}

/**
 * @param {number|null} faseSugeridaId  fase que toca mandar ahora (la marca y abre su vista previa).
 * @param {object|null} cola            { posicion, total, onSiguiente, onAnterior } cuando el panel se
 *                                      recorre como cola de trabajo.
 * @param {function} onConfirmarPedido  abre el pedido para confirmarlo. Se ofrece mientras está por
 *                                      confirmar, en la fase que sea: al confirmarse, el pedido sale
 *                                      solo del flujo de confirmación.
 * @param {function} onCambiarEstadoPedido cambia el pedido al estado configurado en la fase.
 * @param {function} onPrepararPedido   compatibilidad: marca el pedido como Preparado.
 * @param {function} onDespacharPedido  compatibilidad: marca el pedido como Despachado.
 * @param {object} servicio             solo para pruebas.
 */
export function SeguimientoPanel({ open, envio, onClose, onRefreshPedido, onConfirmarPedido, onCambiarEstadoPedido, onPrepararPedido, onDespacharPedido, faseSugeridaId = null, cola = null, servicio = seguimientoService }) {
  const [flujos, setFlujos] = useState([]);
  const [flujoId, setFlujoId] = useState(null);
  const [configuracion, setConfiguracion] = useState(null);
  const [etiquetasPedido, setEtiquetasPedido] = useState([]);
  const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [faseEnviando, setFaseEnviando] = useState(null);
  const [horasProgramadas, setHorasProgramadas] = useState(null);
  const [recordatorio, setRecordatorio] = useState(null);
  // Fase cuyo mensaje se está viendo antes de abrir WhatsApp.
  const [faseVista, setFaseVista] = useState(null);

  const [telefonoPersonalizado, setTelefonoPersonalizado] = useState("");
  const [fechaCustom, setFechaCustom] = useState("");
  const [notaRecordatorio, setNotaRecordatorio] = useState("");

  const cargarFlujos = useCallback(async (envioId) => {
    const resFlujos = await servicio.getFlujosPedido(envioId);
    setFlujos(resFlujos || []);
    return resFlujos || [];
  }, [servicio]);

  // Con qué fase se abre el panel (para elegir el flujo y mostrar su mensaje).
  const faseQueToca = faseSugeridaId ?? envio?.recordatorio_fase_id ?? null;

  useEffect(() => {
    if (!open || !envio) return;
    let activo = true;

    setCargando(true);
    setRecordatorio(recordatorioDeEnvio(envio));
    setFaseVista(faseQueToca);
    setNotaRecordatorio("");
    setHorasProgramadas(null);
    setFechaCustom("");
    setTelefonoPersonalizado(envio.telefono || "");

    Promise.all([
      servicio.getFlujosPedido(envio.id),
      servicio.getConfiguracion(),
      servicio.getEtiquetasPedido(envio.id),
      servicio.getEtiquetas()
    ]).then(([resFlujos, resConfig, resEtiqPed, resEtiqDisp]) => {
      if (!activo) return;
      const lista = resFlujos || [];
      setFlujos(lista);
      if (envio.estado === "Confirmado" && lista.some((f) => flujoTieneFaseCompletada(f, esFasePreparacion))) {
        const cambiar = onCambiarEstadoPedido
          ? () => onCambiarEstadoPedido(envio, "Preparado")
          : onPrepararPedido ? () => onPrepararPedido(envio) : null;
        cambiar?.().catch((err) => console.error(err));
      } else if (envio.estado === "Preparado" && lista.some((f) => flujoTieneFaseCompletada(f, esFaseDespacho))) {
        const cambiar = onCambiarEstadoPedido
          ? () => onCambiarEstadoPedido(envio, "Despachado")
          : onDespacharPedido ? () => onDespacharPedido(envio) : null;
        cambiar?.().catch((err) => console.error(err));
      }
      // Arranca en el flujo de la fase que toca; si no hay, en el que ya se
      // venía usando con este pedido.
      const delaFase = faseQueToca ? lista.find(f => (f.fases || []).some(x => x.id === faseQueToca)) : null;
      const enUso = lista.find(f => (f.envios_totales || 0) > 0);
      setFlujoId((delaFase || enUso || lista[0])?.id ?? null);
      setConfiguracion(resConfig || { tiempos_rapidos_horas: [1, 2, 4, 8, 24] });
      setEtiquetasPedido(resEtiqPed || []);
      setEtiquetasDisponibles(resEtiqDisp || []);
      setCargando(false);
    }).catch(err => {
      console.error(err);
      if (activo) setCargando(false);
    });

    return () => { activo = false; };
  }, [open, envio, servicio, faseQueToca, onCambiarEstadoPedido, onPrepararPedido, onDespacharPedido]);

  useEffect(() => {
    if (!open) return undefined;
    const alEscape = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", alEscape);
    return () => document.removeEventListener("keydown", alEscape);
  }, [open, onClose]);

  // VENCIDO sigue siendo un recordatorio abierto: es el que más hace falta
  // poder cerrar desde acá.
  const recordatorioAbierto = recordatorio && ['PENDIENTE', 'VENCIDO'].includes(recordatorio.estado) ? recordatorio : null;
  const recordatorioVencido = !!recordatorioAbierto && (
    recordatorioAbierto.estado === 'VENCIDO' || new Date(recordatorioAbierto.ejecutar_en) <= new Date()
  );

  const flujo = flujos.find(f => f.id === flujoId) || null;
  const fases = flujo?.fases || [];
  const faseMarcaPreparacion = (fase) => (
    envio?.estado === "Confirmado"
    && flujo?.tipo === "SEGUIMIENTO_ENVIO"
    && esFasePreparacion(fase)
  );
  const faseMarcaDespacho = (fase) => (
    envio?.estado === "Preparado"
    && flujo?.tipo === "SEGUIMIENTO_ENVIO"
    && esFaseDespacho(fase)
  );
  const faseDebeCambiarEstado = (fase) => {
    if (flujo?.tipo !== "SEGUIMIENTO_ENVIO") return null;
    const transicion = transicionEstadoFase(fase);
    if (!transicion || envio?.estado !== transicion.desde) return null;
    return transicion;
  };

  // La fase en la que está el pedido: la que pidió quien abrió el panel
  // mientras no esté completada; si no, la siguiente a la más avanzada que
  // ya se completó. Así, al marcar una como enviada, "Toca ahora" pasa sola
  // a la que sigue.
  const sugeridaPendiente = fases.find(f => f.id === faseQueToca && !f.completada);
  const mayorCompletada = fases.reduce((max, f) => (f.completada ? Math.max(max, f.orden) : max), 0);
  const faseActualId = (sugeridaPendiente || fases.find(f => f.orden > mayorCompletada))?.id ?? null;

  /**
   * Abre una fase en WhatsApp. No valida ningún orden a propósito: se puede
   * abrir cualquier fase, y repetirla las veces que haga falta.
   */
  const abrirFase = async (fase) => {
    setFaseEnviando(fase.id);
    try {
      const res = await servicio.crearContacto(envio.id, {
        fase_id: fase.id,
        telefono: telefonoPersonalizado || envio.telefono
      });
      if (res.whatsapp_url) window.open(res.whatsapp_url, '_blank');

      // Abrir WhatsApp no mueve al pedido de fase: eso pasa recién cuando se
      // marca el mensaje como enviado (completarFase).
      await cargarFlujos(envio.id);
      const resEtiqPed = await servicio.getEtiquetasPedido(envio.id);
      setEtiquetasPedido(resEtiqPed || []);
      if (onRefreshPedido) onRefreshPedido();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "No se pudo registrar el envío");
    } finally {
      setFaseEnviando(null);
    }
  };

  /**
   * "Ya lo envié": marca la fase como completada. Es lo que hace pasar al
   * pedido a la fase siguiente, y recién ahí se ofrece agendar el próximo
   * contacto.
   */
  const completarFase = async (fase) => {
    setFaseEnviando(fase.id);
    try {
      const res = await servicio.completarFase(envio.id, fase.id);
      const cumplidos = res?.recordatorios_cumplidos || [];
      // El backend agenda solo el mensaje siguiente con la espera del flujo:
      // acá solo se muestra lo que quedó (se puede cambiar o cancelar abajo).
      setRecordatorio(prev => res?.recordatorio || (prev && cumplidos.includes(prev.id) ? null : prev));
      if (res?.siguiente_fase) setFaseVista(res.siguiente_fase.id);
      const transicion = faseDebeCambiarEstado(fase);
      if (transicion && onCambiarEstadoPedido) {
        try {
          await onCambiarEstadoPedido(envio, transicion.hasta);
        } catch (err) {
          console.error(err);
          alert(err.response?.data?.error || `El mensaje quedó marcado como enviado, pero no se pudo cambiar el pedido a ${transicion.hasta}`);
        }
      } else if (faseMarcaPreparacion(fase) && onPrepararPedido) {
        try {
          await onPrepararPedido(envio);
        } catch (err) {
          console.error(err);
          alert(err.response?.data?.error || "El mensaje quedó marcado como enviado, pero no se pudo cambiar el pedido a Preparado");
        }
      } else if (faseMarcaDespacho(fase) && onDespacharPedido) {
        try {
          await onDespacharPedido(envio);
        } catch (err) {
          console.error(err);
          alert(err.response?.data?.error || "El mensaje quedó marcado como enviado, pero no se pudo cambiar el pedido a Despachado");
        }
      }
      await cargarFlujos(envio.id);
      if (onRefreshPedido) onRefreshPedido();
      // En la cola de trabajo, marcar como enviado cierra este pedido.
      cola?.onSiguiente?.();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "No se pudo marcar el mensaje como enviado");
    } finally {
      setFaseEnviando(null);
    }
  };

  /** Deshace un "marcar como enviado" hecho por error. */
  const descompletarFase = async (fase) => {
    setFaseEnviando(fase.id);
    try {
      await servicio.descompletarFase(envio.id, fase.id);
      await cargarFlujos(envio.id);
      if (onRefreshPedido) onRefreshPedido();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "No se pudo desmarcar");
    } finally {
      setFaseEnviando(null);
    }
  };

  const guardarNotaORecordatorio = async () => {
    setLoadingAccion(true);
    try {
      if (horasProgramadas || fechaCustom) {
        const payload = { nota: notaRecordatorio.trim() };
        if (horasProgramadas && horasProgramadas !== 'custom') {
          payload.horas = horasProgramadas;
        } else if (fechaCustom) {
          payload.ejecutar_en = new Date(fechaCustom).toISOString();
        }
        const agendado = await servicio.programarRecordatorio(envio.id, payload);
        setRecordatorio(agendado);
      } else if (notaRecordatorio.trim()) {
        await servicio.guardarNota(envio.id, notaRecordatorio.trim());
      }
      setNotaRecordatorio("");
      setHorasProgramadas(null);
      setFechaCustom("");
      if (onRefreshPedido) onRefreshPedido();
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al guardar");
    } finally {
      setLoadingAccion(false);
    }
  };

  const programarRapido = (horas) => {
    setHorasProgramadas(horas);
    setFechaCustom("");
  };

  const completar = async () => {
    if (!recordatorioAbierto) return;
    setLoadingAccion(true);
    try {
      await servicio.completarRecordatorio(envio.id, recordatorioAbierto.id);
      setRecordatorio(null);
      if (onRefreshPedido) onRefreshPedido();
    } catch (e) {
      console.error(e);
      alert("Error al completar");
    } finally {
      setLoadingAccion(false);
    }
  };

  const cancelarRecordatorio = async () => {
    if (!recordatorioAbierto) return;
    setLoadingAccion(true);
    try {
      await servicio.cancelarRecordatorio(envio.id, recordatorioAbierto.id);
      setRecordatorio(null);
      if (onRefreshPedido) onRefreshPedido();
    } catch (e) {
      console.error(e);
      alert("Error al cancelar");
    } finally {
      setLoadingAccion(false);
    }
  };

  const agregarEtiqueta = async (optValue) => {
    if (!optValue) return;
    const etiqueta = etiquetasDisponibles.find(e => e.id === optValue);
    if (!etiqueta) return;
    const tempEntry = { id: Date.now(), etiqueta_id: etiqueta.id, etiqueta };
    setEtiquetasPedido(prev => [...prev, tempEntry]);
    setLoadingAccion(true);
    try {
      await servicio.addEtiquetaPedido(envio.id, optValue);
      const resEtiqPed = await servicio.getEtiquetasPedido(envio.id);
      setEtiquetasPedido(resEtiqPed || []);
    } catch (err) {
      console.error(err);
      setEtiquetasPedido(prev => prev.filter(e => e.id !== tempEntry.id));
      alert('Error al agregar etiqueta');
    } finally {
      setLoadingAccion(false);
    }
  };

  const quitarEtiqueta = async (etiquetaId) => {
    const prev = etiquetasPedido;
    setEtiquetasPedido(etiquetasPedido.filter(e => e.etiqueta_id !== etiquetaId));
    setLoadingAccion(true);
    try {
      await servicio.removeEtiquetaPedido(envio.id, etiquetaId);
    } catch (err) {
      console.error(err);
      setEtiquetasPedido(prev);
      alert('Error al quitar etiqueta');
    } finally {
      setLoadingAccion(false);
    }
  };

  if (!open || !envio) return null;

  const { cliente, productos } = contextoDelPedido(envio);
  const porConfirmar = ["Pendiente", "EnSeguimiento"].includes(envio.estado);
  const opcionesFlujo = flujos.map(f => ({ value: f.id, label: nombreVisibleDelFlujo(f) }));
  const confirmarPedidoCta = porConfirmar && onConfirmarPedido ? (
    <div style={{
      marginTop: "14px",
      padding: "12px",
      borderRadius: "8px",
      background: "color-mix(in srgb, var(--color-success) 9%, transparent)",
      border: "1px solid color-mix(in srgb, var(--color-success) 32%, transparent)"
    }}>
      <button
        type="button"
        className="btn-secondary"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "var(--color-success)", borderColor: "var(--color-success)", color: "#fff", fontWeight: 700 }}
        onClick={() => onConfirmarPedido(envio)}
        disabled={!!faseEnviando}
      >
        <CheckCircle2 size={15} /> Confirmar pedido
      </button>
      <p style={{ fontSize: "0.72rem", color: "var(--color-fg-muted)", margin: "7px 0 0 0", lineHeight: 1.35 }}>
        Si el cliente ya confirmó, completás los datos del pedido y este seguimiento se cierra.
      </p>
    </div>
  ) : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Seguimiento por WhatsApp del pedido ${numeroPedidoVisible(envio)}`} style={{ width: "460px", maxWidth: "100%", height: "100%", background: "var(--color-canvas)", borderLeft: "1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)", color: "var(--color-fg)", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", padding: "1rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MessageCircle size={18} color="var(--color-primary-text)" style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Pedido #{numeroPedidoVisible(envio)}{cliente ? ` · ${cliente}` : ""}
              </span>
            </h2>
            {(productos || Number(envio.monto) > 0) && (
              <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--color-fg-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {[productos, Number(envio.monto) > 0 ? formatGs(envio.monto) : null].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button type="button" className="icon-button" onClick={() => window.open("/pedidos/configuracion", "_blank")} title="Configuración de flujos y etiquetas">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button type="button" className="close-btn dark" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {cargando ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-fg-muted)" }}><Loader2 className="animate-spin" size={16} /> Cargando...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* Etiquetas */}
              <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "8px", border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
                <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "var(--color-fg-subtle)", display: "flex", alignItems: "center", gap: "6px" }}><Tag size={14}/> Etiquetas</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "0.75rem" }}>
                  {etiquetasPedido.length === 0 && <span style={{ fontSize: "0.8rem", color: "var(--color-fg-muted)" }}>Sin etiquetas</span>}
                  {etiquetasPedido.map(ep => {
                    const bgColor = ep.etiqueta?.color ? `color-mix(in srgb, ${ep.etiqueta.color} 15%, transparent)` : 'color-mix(in srgb, var(--color-primary) 15%, transparent)';
                    const textColor = ep.etiqueta?.color || 'var(--color-primary-text)';

                    return (
                      <div key={ep.id} style={{ background: bgColor, color: textColor, border: `1px solid color-mix(in srgb, ${textColor} 30%, transparent)`, fontSize: "0.75rem", padding: "4px 10px", borderRadius: "16px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                        {ep.etiqueta?.nombre || "Etiqueta"}
                        <button onClick={() => quitarEtiqueta(ep.etiqueta_id)} style={{ background: "none", border: "none", color: "currentColor", cursor: "pointer", padding: 0, display: "flex", opacity: 0.7 }} disabled={loadingAccion}>
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  {etiquetasDisponibles.length === 0 ? (
                    <div style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag size={16} style={{ flexShrink: 0 }} />
                      <span>No tienes etiquetas. <a href="/pedidos/configuracion" target="_blank" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>Crea una en configuración</a>.</span>
                    </div>
                  ) : (
                    <Select
                      styles={selectStyles}
                      components={{ Option: EtiquetaOption }}
                      placeholder="+ Agregar etiqueta..."
                      value={null}
                      onChange={(opt) => { if(opt) agregarEtiqueta(opt.value) }}
                      options={etiquetasDisponibles
                        .filter(ed => !etiquetasPedido.find(ep => ep.etiqueta_id === ed.id))
                        .map(ed => ({ value: ed.id, label: ed.nombre, color: ed.color }))
                      }
                      isDisabled={loadingAccion}
                      noOptionsMessage={() => "No hay más etiquetas"}
                      isSearchable={false}
                    />
                  )}
                </div>
              </div>

              {/* Flujo de WhatsApp */}
              <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "8px", border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
                {flujos.length === 0 ? (
                  <div style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageCircle size={16} style={{ flexShrink: 0 }} />
                    <span>No tenés flujos activos. <a href="/pedidos/configuracion" target="_blank" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>Creá un flujo primero</a>.</span>
                  </div>
                ) : (
                  <>
                    <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "4px", color: "var(--color-fg-subtle)" }}>Flujo</label>
                    <Select
                      styles={selectStyles}
                      placeholder="Seleccionar flujo..."
                      value={opcionesFlujo.find(o => o.value === flujoId) || null}
                      onChange={opt => setFlujoId(opt ? opt.value : null)}
                      options={opcionesFlujo}
                      isDisabled={!!faseEnviando}
                      isSearchable={false}
                    />

                    <label style={{ display: "block", fontSize: "0.8rem", margin: "12px 0 4px", color: "var(--color-fg-subtle)" }}>Teléfono</label>
                    <input type="text" className="form-input" style={{ width: "100%" }} value={telefonoPersonalizado} onChange={e => setTelefonoPersonalizado(e.target.value)} disabled={!!faseEnviando} />

                    {confirmarPedidoCta}

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
                      {fases.map(fase => (
                        <FaseFila
                          key={fase.id}
                          fase={fase}
                          sugerida={fase.id === faseActualId}
                          vistaAbierta={fase.id === faseVista}
                          onVerMensaje={() => setFaseVista(v => (v === fase.id ? null : fase.id))}
                          enviando={faseEnviando === fase.id}
                          deshabilitado={!!faseEnviando}
                          onAbrir={() => abrirFase(fase)}
                          onCompletar={() => completarFase(fase)}
                          onDescompletar={() => descompletarFase(fase)}
                        />
                      ))}
                      {fases.length === 0 && (
                        <span style={{ fontSize: "0.8rem", color: "var(--color-fg-muted)" }}>Este flujo no tiene fases activas.</span>
                      )}
                    </div>

                    <p style={{ fontSize: "0.72rem", color: "var(--color-fg-muted)", margin: "12px 0 0 0" }}>
                      El pedido pasa a la fase siguiente cuando marcás el mensaje como enviado.
                      Abrir WhatsApp solo no lo mueve.
                    </p>

                  </>
                )}
              </div>

              {/* Recordatorio */}
              <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "8px", border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
                <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "var(--color-fg-subtle)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={14}/> Próximo seguimiento
                </h3>

                {recordatorioAbierto ? (
                  <div style={{ marginBottom: "1rem", padding: "0.75rem", background: `color-mix(in srgb, var(${recordatorioVencido ? "--color-danger" : "--color-primary"}) 10%, transparent)`, borderRadius: "6px" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: recordatorioVencido ? "var(--color-danger)" : "var(--color-primary-text)" }}>
                      {recordatorioVencido ? "Seguimiento vencido" : "Programado para:"}
                    </div>
                    <div style={{ fontSize: "0.9rem", margin: "4px 0 0 0" }}>
                      {recordatorioVencido ? "Era para el " : ""}{new Date(recordatorioAbierto.ejecutar_en).toLocaleString('es-PY')}
                    </div>
                    {recordatorioAbierto.nota && (
                      <div style={{ fontSize: "0.8rem", color: "var(--color-fg-muted)", marginTop: "4px" }}>{recordatorioAbierto.nota}</div>
                    )}

                    <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                      <button className="btn-secondary" style={{ flex: 1, padding: "4px", fontSize: "0.8rem" }} onClick={completar} disabled={loadingAccion}><Check size={14}/> Completar</button>
                      <button className="btn-secondary" style={{ flex: 1, padding: "4px", fontSize: "0.8rem", color: "var(--color-danger)" }} onClick={cancelarRecordatorio} disabled={loadingAccion}><Ban size={14}/> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--color-fg-muted)" }}>
                    Sin próximo seguimiento
                  </div>
                )}

                <div style={{ borderTop: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)", paddingTop: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "4px" }}>Nota (opcional)</label>

                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <textarea className="form-input" value={notaRecordatorio} onChange={e => setNotaRecordatorio(e.target.value)} style={{ flex: 1, minHeight: '60px', resize: 'vertical' }} placeholder="Escribe una nota..." />
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {configuracion?.tiempos_rapidos_horas?.map(h => {
                      const activo = horasProgramadas === h;
                      return (
                        <button
                          key={h}
                          className="btn-secondary"
                          style={{
                            padding: "6px 14px",
                            fontSize: "0.8rem",
                            borderRadius: "16px",
                            flex: "1 1 auto",
                            textAlign: "center",
                            transition: "all 0.18s ease",
                            background: activo ? "var(--color-primary)" : "var(--color-canvas)",
                            color: activo ? "var(--color-primary-fg)" : undefined,
                            borderColor: activo ? "var(--color-primary)" : "color-mix(in srgb, var(--color-fg) 12%, transparent)",
                            fontWeight: activo ? 700 : 400,
                          }}
                          onClick={() => programarRapido(h)}
                          disabled={loadingAccion}
                        >
                          {activo ? `✓ +${h}h` : `+${h}h`}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                    <input type="datetime-local" className="form-input" value={fechaCustom} onChange={e => { setFechaCustom(e.target.value); setHorasProgramadas(e.target.value ? 'custom' : null); }} style={{ flex: 1 }} disabled={loadingAccion}/>
                  </div>

                  {(notaRecordatorio.trim() || horasProgramadas || fechaCustom) && (
                    <button className="btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={guardarNotaORecordatorio} disabled={loadingAccion}>
                      Guardar nota / recordatorio
                    </button>
                  )}
                </div>

              </div>

            </div>
          )}
        </div>

        {cola && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.75rem 1.25rem", borderTop: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)", background: "var(--color-surface-2)" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-fg-muted)", fontVariantNumeric: "tabular-nums" }}>
              Pedido {cola.posicion} de {cola.total}
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button type="button" className="btn-secondary" style={{ padding: "6px 10px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }} onClick={cola.onAnterior} disabled={cola.posicion <= 1}>
                <ChevronLeft size={14} /> Anterior
              </button>
              <button type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }} onClick={cola.onSiguiente}>
                {cola.posicion >= cola.total ? "Terminar" : "Siguiente pedido"} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Una fase del flujo dentro del pedido. Tres estados:
 *  - sin abrir: "Abrir en WhatsApp" (y "Ya lo envié" si se mandó por fuera);
 *  - abierta sin completar: "Marcar como enviado" pasa a ser el botón
 *    principal — es lo que mueve al pedido a la fase siguiente;
 *  - completada: se puede reabrir igual, y desmarcar si fue un error.
 */
function FaseFila({ fase, sugerida = false, vistaAbierta = false, onVerMensaje, enviando, deshabilitado, onAbrir, onCompletar, onDescompletar }) {
  const abierta = (fase.envios || 0) > 0;
  const completada = !!fase.completada;
  const faltaMarcar = abierta && !completada;
  const borde = sugerida
    ? "color-mix(in srgb, var(--color-primary) 55%, transparent)"
    : completada
      ? "color-mix(in srgb, var(--color-success) 35%, transparent)"
      : faltaMarcar
        ? "color-mix(in srgb, var(--color-warning) 45%, transparent)"
        : "color-mix(in srgb, var(--color-fg) 10%, transparent)";
  const botonChico = { padding: "5px 10px", fontSize: "0.75rem", whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" };
  const verde = { background: "var(--color-success)", borderColor: "var(--color-success)", color: "#fff" };
  const enlace = { padding: 0, background: "none", border: "none", cursor: "pointer", color: "var(--color-primary-text)", fontSize: "0.75rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" };

  return (
    <div style={{ borderRadius: "8px", background: "var(--color-canvas)", border: `1px solid ${borde}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px" }}>
        <div style={{ paddingTop: "2px", color: completada ? "var(--color-success)" : faltaMarcar ? "var(--color-warning)" : "var(--color-fg-subtle)", flexShrink: 0 }}>
          {completada ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            Fase {fase.orden} — {fase.nombre}
            {sugerida && (
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px", borderRadius: "999px", background: "color-mix(in srgb, var(--color-primary) 18%, transparent)", color: "var(--color-primary-text)" }}>
                Toca ahora
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.75rem", color: faltaMarcar ? "var(--color-warning)" : "var(--color-fg-muted)", marginTop: "2px" }}>
            {completada
              ? `Enviado ${formatMomento(fase.ultimo_envio_en)}`
              : faltaMarcar
                ? `Abriste WhatsApp ${formatMomento(fase.ultimo_envio_en)} · falta marcarlo como enviado`
                : fase.espera_sugerida_minutos > 0
                  ? `Sugerida ${formatEspera(fase.espera_sugerida_minutos)} después de la anterior`
                  : "Sin enviar"}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "6px" }}>
            {fase.mensaje_resuelto && onVerMensaje && (
              <button type="button" onClick={onVerMensaje} aria-expanded={vistaAbierta} style={enlace}>
                {vistaAbierta ? <EyeOff size={12} /> : <Eye size={12} />}
                {vistaAbierta ? "Ocultar mensaje" : "Ver mensaje"}
              </button>
            )}
            {completada && onDescompletar && (
              <button type="button" onClick={onDescompletar} disabled={deshabilitado} style={{ ...enlace, color: "var(--color-fg-muted)" }}>
                Desmarcar
              </button>
            )}
            {!abierta && onCompletar && (
              <button type="button" onClick={onCompletar} disabled={deshabilitado} style={{ ...enlace, color: "var(--color-fg-muted)" }} title="Si lo mandaste por fuera del sistema">
                Ya lo envié
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
          {faltaMarcar && onCompletar && (
            <button className="btn-secondary" style={{ ...botonChico, ...verde }} onClick={onCompletar} disabled={deshabilitado} title="Confirmar que mandaste el mensaje: el pedido pasa a la fase siguiente">
              {enviando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Marcar como enviado
            </button>
          )}
          <button
            className="btn-secondary"
            style={{ ...botonChico, ...(!abierta ? verde : {}) }}
            onClick={onAbrir}
            disabled={deshabilitado}
            title={abierta ? "Volver a abrir esta fase en WhatsApp" : "Abrir esta fase en WhatsApp"}
          >
            {enviando && !faltaMarcar
              ? <Loader2 size={13} className="animate-spin" />
              : abierta ? <RotateCcw size={13} /> : <Send size={13} />}
            {abierta ? "Abrir otra vez" : "Abrir en WhatsApp"}
          </button>
        </div>
      </div>

      {vistaAbierta && fase.mensaje_resuelto && (
        <div style={{ margin: "0 12px 12px 38px", padding: "8px 10px", borderRadius: "8px", background: "color-mix(in srgb, var(--color-success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--color-success) 22%, transparent)", fontSize: "0.8rem", lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {fase.mensaje_resuelto}
        </div>
      )}
    </div>
  );
}
