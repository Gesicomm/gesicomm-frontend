import React, { useState, useEffect, useCallback } from "react";
import { X, MessageCircle, Check, Tag, Loader2, Circle, CheckCircle2, RotateCcw, Send, ChevronRight, ChevronLeft, Eye, EyeOff } from "lucide-react";
import Select, { components } from "react-select";
import { seguimientoService } from "../../services/seguimiento.service";
import { formatEspera } from "./variablesWhatsapp";
import { numeroPedidoVisible } from "./pedidoNumero";
import { formatGs } from "../../lib/courier";
import { FLOW_TYPES, fasesDeSeguimientoParaPedido, estadoParaSeguimiento, puedeEnviarSeguimiento } from "./orderLifecycle";
import { ImagenProductoSeguimiento } from "./ImagenProductoSeguimiento";

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

function flujosParaPedido(flujos, esRaha) {
  return (flujos || []).filter(f => !esRaha || !['CONFIRMACION_PEDIDO_WEB', 'VENTA_WHATSAPP', 'CONSULTA_GENERAL_WHATSAPP', 'SEGUIMIENTO_PRODUCTO_WHATSAPP'].includes(f.tipo));
}

function formatMomento(iso) {
  if (!iso) return "";
  const f = new Date(iso);
  const hora = f.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  const hoy = new Date();
  const mismoDia = f.toDateString() === hoy.toDateString();
  if (mismoDia) return `hoy ${hora}`;
  return `${f.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' })} ${hora}`;
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
 * @param {object} servicio             solo para pruebas.
 */
export function SeguimientoPanel({ open, envio, onClose, onRefreshPedido, onConfirmarPedido, onElegirProductos, faseSugeridaId = null, cola = null, servicio = seguimientoService }) {
  const esRaha = Boolean(envio?.raha_logistica?.gestionado);
  const [flujos, setFlujos] = useState([]);
  const [flujoId, setFlujoId] = useState(null);
  const [etiquetasPedido, setEtiquetasPedido] = useState([]);
  const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [faseEnviando, setFaseEnviando] = useState(null);
  // Fase cuyo mensaje se está viendo antes de abrir WhatsApp.
  const [faseVista, setFaseVista] = useState(null);
  const [productosMensaje, setProductosMensaje] = useState(null);
  const [actualizandoMensaje, setActualizandoMensaje] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState('');

  const [telefonoPersonalizado, setTelefonoPersonalizado] = useState("");

  const cargarFlujos = useCallback(async (envioId) => {
    const resFlujos = productosMensaje?.length
      ? await servicio.getFlujosPedido(envioId, { producto_ids: productosMensaje.join(',') })
      : await servicio.getFlujosPedido(envioId);
    const lista = flujosParaPedido(resFlujos, esRaha);
    setFlujos(lista);
    return lista;
  }, [servicio, esRaha, productosMensaje]);

  // Con qué fase se abre el panel (para elegir el flujo y mostrar su mensaje).
  const faseQueToca = faseSugeridaId ?? envio?.recordatorio_fase_id ?? null;

  useEffect(() => {
    if (!open || !envio) return;
    let activo = true;

    setCargando(true);
    setProductosMensaje(null);
    setActualizandoMensaje(false);
    setErrorMensaje('');
    setFaseVista(faseQueToca);
    setTelefonoPersonalizado(envio.telefono || "");

    Promise.all([
      servicio.getFlujosPedido(envio.id),
      servicio.getEtiquetasPedido(envio.id),
      servicio.getEtiquetas()
    ]).then(([resFlujos, resEtiqPed, resEtiqDisp]) => {
      if (!activo) return;
      const lista = flujosParaPedido(resFlujos, esRaha);
      setFlujos(lista);
      // Arranca en el flujo de la fase que toca; si no hay, en el que ya se
      // venía usando con este pedido.
      const delaFase = faseQueToca ? lista.find(f => (f.fases || []).some(x => x.id === faseQueToca)) : null;
      const estado = estadoParaSeguimiento(envio);
      const tipoActual = puedeEnviarSeguimiento(envio) ? "SEGUIMIENTO_ENVIO"
        : estado === "Entregado" ? "ESCALAMIENTO_VENTAS"
          : ["Devuelto", "Perdido"].includes(estado) ? "RECUPERACION_CLIENTES"
            : ["Pendiente", "EnSeguimiento"].includes(estado)
              ? (String(envio.origen || "").toUpperCase().includes("WHATSAPP") ? ((envio.es_lead || (Array.isArray(envio.items) && envio.items.length === 0)) ? (envio.items?.length ? "SEGUIMIENTO_PRODUCTO_WHATSAPP" : "CONSULTA_GENERAL_WHATSAPP") : "VENTA_WHATSAPP") : "CONFIRMACION_PEDIDO_WEB") : null;
      const deLaEtapa = tipoActual ? lista.filter(f => f.tipo === tipoActual) : lista;
      const enUso = deLaEtapa.find(f => (f.envios_totales || 0) > 0);
      const elegido = (delaFase && (!tipoActual || delaFase.tipo === tipoActual) ? delaFase : null)
        || enUso || deLaEtapa.find(f => f.predeterminado) || deLaEtapa[0] || lista[0];
      setFlujoId(elegido?.id ?? null);
      const fasesElegidas = fasesDeSeguimientoParaPedido(elegido, envio);
      const sugerida = fasesElegidas.find(f => f.id === faseQueToca && f.disponible !== false && !f.completada);
      const mayorCompletada = fasesElegidas.reduce((max, f) => f.completada ? Math.max(max, f.orden) : max, 0);
      setFaseVista((sugerida || fasesElegidas.find(f => f.orden > mayorCompletada && f.disponible !== false) || (tipoActual === 'SEGUIMIENTO_PRODUCTO_WHATSAPP' ? fasesElegidas.find(f => f.disponible !== false) : null))?.id ?? null);
      setEtiquetasPedido(resEtiqPed || []);
      setEtiquetasDisponibles(resEtiqDisp || []);
      setCargando(false);
    }).catch(err => {
      console.error(err);
      if (activo) setCargando(false);
    });

    return () => { activo = false; };
  }, [open, envio, servicio, faseQueToca, esRaha]);

  useEffect(() => {
    if (!open || !envio || productosMensaje === null || productosMensaje.length === 0) return;
    let activo = true;
    servicio.getFlujosPedido(envio.id, { producto_ids: productosMensaje.join(',') }).then(lista => {
      if (!activo) return;
      setFlujos(flujosParaPedido(lista, esRaha));
      setActualizandoMensaje(false);
    }).catch(err => {
      if (!activo) return;
      setErrorMensaje(err?.response?.data?.error || 'No se pudo actualizar el mensaje. Volvé a elegir los productos.');
      setActualizandoMensaje(false);
    });
    return () => { activo = false; };
  }, [open, envio, productosMensaje, servicio, esRaha]);

  const cambiarProductoMensaje = productoId => {
    const actuales = productosMensaje ?? [...new Set((envio.items || []).map(item => Number(item.producto_id)).filter(Boolean))];
    const siguientes = actuales.includes(productoId) ? actuales.filter(id => id !== productoId) : [...actuales, productoId];
    setProductosMensaje(siguientes);
    setActualizandoMensaje(siguientes.length > 0);
    setErrorMensaje('');
  };

  useEffect(() => {
    if (!open) return undefined;
    const alEscape = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", alEscape);
    return () => document.removeEventListener("keydown", alEscape);
  }, [open, onClose]);


  const flujo = flujos.find(f => f.id === flujoId) || null;
  const fases = fasesDeSeguimientoParaPedido(flujo, envio);
  const seguimientoBloqueado = flujo?.tipo === "SEGUIMIENTO_ENVIO" && !puedeEnviarSeguimiento(envio);
  // La fase en la que está el pedido: la que pidió quien abrió el panel
  // mientras no esté completada; si no, la siguiente a la más avanzada que
  // ya se completó. Así, al marcar una como enviada, "Toca ahora" pasa sola
  // a la que sigue.
  const sugeridaPendiente = fases.find(f => f.id === faseQueToca && !f.completada && f.disponible !== false);
  const mayorCompletada = fases.reduce((max, f) => (f.completada ? Math.max(max, f.orden) : max), 0);
  const faseActualId = seguimientoBloqueado ? null : (sugeridaPendiente || fases.find(f => f.orden > mayorCompletada && f.disponible !== false))?.id ?? null;

  /**
   * Abre una fase en WhatsApp. No valida ningún orden a propósito: se puede
   * abrir cualquier fase, y repetirla las veces que haga falta.
   */
  const abrirFase = async (fase) => {
    if (seguimientoBloqueado || fase.disponible === false || actualizandoMensaje || errorMensaje || productosMensaje?.length === 0) return;
    setFaseEnviando(fase.id);
    try {
      const res = await servicio.crearContacto(envio.id, {
        fase_id: fase.id,
        telefono: telefonoPersonalizado || envio.telefono,
        ...(productosMensaje ? { producto_ids: productosMensaje } : {}),
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
    if (seguimientoBloqueado || fase.disponible === false || actualizandoMensaje || errorMensaje || productosMensaje?.length === 0) return;
    setFaseEnviando(fase.id);
    try {
      const res = productosMensaje
        ? await servicio.completarFase(envio.id, fase.id, { producto_ids: productosMensaje })
        : await servicio.completarFase(envio.id, fase.id);
      // El backend agenda solo el mensaje siguiente con la espera del flujo:
      // acá solo se muestra lo que quedó (se puede cambiar o cancelar abajo).
      if (res?.siguiente_fase) setFaseVista(res.siguiente_fase.id);
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
  const porConfirmar = !envio.raha_logistica?.gestionado && ["Pendiente", "EnSeguimiento"].includes(envio.estado);
  const consultaGeneral = String(envio.origen || '').toUpperCase().includes('WHATSAPP') && (envio.es_lead || (Array.isArray(envio.items) && envio.items.length === 0));
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
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "var(--color-success)", borderColor: "var(--color-success)", color: "var(--color-success-fg)", fontWeight: 700 }}
        onClick={() => consultaGeneral && !envio.items?.length && onElegirProductos ? onElegirProductos(envio) : onConfirmarPedido(envio)}
        disabled={!!faseEnviando}
      >
        <CheckCircle2 size={15} /> {consultaGeneral ? (envio.items?.length ? 'Confirmar compra' : 'Elegir productos') : 'Confirmar pedido'}
      </button>
      {consultaGeneral && envio.items?.length > 0 && onElegirProductos && <button type="button" className="btn-secondary" disabled={!!faseEnviando} onClick={() => onElegirProductos(envio)} style={{ width: '100%', marginTop: '8px' }}>Cambiar productos de interés</button>}
      <p style={{ fontSize: "0.72rem", color: "var(--color-fg-muted)", margin: "7px 0 0 0", lineHeight: 1.35 }}>
        {consultaGeneral ? (envio.items?.length ? 'Se abrirá el confirmador con cliente, teléfono y productos. Completá ubicación, entrega y pago; al guardar se crea el pedido.' : 'Elegí los productos de interés para iniciar su seguimiento. La compra se confirma después, cuando el cliente decida avanzar.') : 'Si el cliente ya confirmó, completás los datos del pedido y este seguimiento se cierra.'}
      </p>
    </div>
  ) : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end", background: "var(--color-overlay)" }} onClick={onClose}>
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

                    {envio.es_lead && flujo?.tipo === 'SEGUIMIENTO_PRODUCTO_WHATSAPP' && envio.items?.length > 1 && <fieldset style={{ marginTop: '14px', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '8px' }} disabled={!!faseEnviando}>
                      <legend style={{ fontSize: '0.8rem' }}>Productos para este mensaje</legend>
                      {[...new Map(envio.items.map(item => [Number(item.producto_id), item])).values()].map(item => <label key={item.producto_id} style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0', fontSize: '0.8rem' }}>
                        <input type="checkbox" checked={productosMensaje === null || productosMensaje.includes(Number(item.producto_id))} onChange={() => cambiarProductoMensaje(Number(item.producto_id))} />
                        {item.nombre_producto}
                      </label>)}
                      <p style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', margin: '6px 0' }}>Elegí de cuáles hablar. Los demás siguen como productos de interés.</p>
                      {actualizandoMensaje && <span role="status">Actualizando mensaje…</span>}
                      {productosMensaje?.length === 0 && <span role="alert">Elegí al menos un producto para enviar el mensaje.</span>}
                      {errorMensaje && <span role="alert">{errorMensaje}</span>}
                    </fieldset>}

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
                      {fases.filter(fase => !fase.superada || fase.completada).map(fase => (
                        <FaseFila
                          key={fase.id}
                          fase={fase}
                          envioId={envio.id}
                          servicio={servicio}
                          sugerida={fase.id === faseActualId}
                          vistaAbierta={fase.id === faseVista}
                          onVerMensaje={() => setFaseVista(v => (v === fase.id ? null : fase.id))}
                          enviando={faseEnviando === fase.id}
                          deshabilitado={!!faseEnviando || actualizandoMensaje || !!errorMensaje || productosMensaje?.length === 0}
                          bloqueadaPorEstado={seguimientoBloqueado || fase.disponible === false}
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
function FaseFila({ fase, envioId, servicio, sugerida = false, vistaAbierta = false, onVerMensaje, enviando, deshabilitado, bloqueadaPorEstado = false, onAbrir, onCompletar, onDescompletar }) {
  const imagenes = fase.imagenes_productos || [];
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
            {sugerida && !bloqueadaPorEstado && (
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px", borderRadius: "999px", background: "color-mix(in srgb, var(--color-primary) 18%, transparent)", color: "var(--color-primary-text)" }}>
                Toca ahora
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.75rem", color: faltaMarcar ? "var(--color-warning)" : "var(--color-fg-muted)", marginTop: "2px" }}>
            {bloqueadaPorEstado && <span>Espera que logística marque {fase.estado_requerido || fase.estado_activador || "Preparado"}. </span>}
            {completada
              ? `Enviado ${formatMomento(fase.ultimo_envio_en)}`
              : faltaMarcar
                ? `Abriste WhatsApp ${formatMomento(fase.ultimo_envio_en)} · falta marcarlo como enviado`
                : fase.espera_sugerida_minutos > 0
                  ? `Sugerida ${formatEspera(fase.espera_sugerida_minutos)} después de la anterior`
                  : "Sin enviar"}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "6px" }}>
            {(fase.mensaje_resuelto || imagenes.length > 0) && onVerMensaje && (
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
              <button type="button" onClick={onCompletar} disabled={deshabilitado || bloqueadaPorEstado} style={{ ...enlace, color: "var(--color-fg-muted)" }} title="Si lo mandaste por fuera del sistema">
                Ya lo envié
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
          {faltaMarcar && onCompletar && (
            <button className="btn-secondary" style={{ ...botonChico, ...verde }} onClick={onCompletar} disabled={deshabilitado || bloqueadaPorEstado} title="Confirmar que mandaste el mensaje: el pedido pasa a la fase siguiente">
              {enviando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Marcar como enviado
            </button>
          )}
          <button
            className="btn-secondary"
            style={{ ...botonChico, ...(!abierta ? verde : {}) }}
            onClick={onAbrir}
            disabled={deshabilitado || bloqueadaPorEstado}
            title={abierta ? "Volver a abrir esta fase en WhatsApp" : "Abrir esta fase en WhatsApp"}
          >
            {enviando && !faltaMarcar
              ? <Loader2 size={13} className="animate-spin" />
              : abierta ? <RotateCcw size={13} /> : <Send size={13} />}
            {abierta ? "Abrir otra vez" : "Abrir en WhatsApp"}
          </button>
        </div>
      </div>

      {vistaAbierta && (fase.mensaje_resuelto || imagenes.length > 0) && (
        <div style={{ margin: "0 12px 12px 38px", padding: "8px 10px", borderRadius: "8px", background: "color-mix(in srgb, var(--color-success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--color-success) 22%, transparent)", fontSize: "0.8rem", lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {imagenes.map(imagen => <ImagenProductoSeguimiento key={`${envioId}-${imagen.item_id}-${imagen.url}`} imagen={imagen} envioId={envioId} servicio={servicio} />)}
          {fase.mensaje_resuelto && <div>{fase.mensaje_resuelto}</div>}
        </div>
      )}
    </div>
  );
}
