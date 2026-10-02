import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, PackageCheck, Plus, Printer, TrendingUp, HandCoins, Truck } from "lucide-react";
import { verificarSesion } from "../../utils/auth";
import { PedidosTable } from "./PedidosTable";
import { DeliveryPanel } from "./DeliveryPanel";
import { NuevoPedidoModal } from "./NuevoPedidoModal";
import { ImprimirPedidosModal } from "./ImprimirPedidosModal";
import { CentroInteligenciaComercial } from "./CentroInteligenciaComercial";
import { ReprogramarModal } from "./ReprogramarModal";
import LogisticaAbastecimientoModal from '../../components/depositos/LogisticaAbastecimientoModal';
import TransferenciaAbastecimientoModal from '../../components/abastecimiento/TransferenciaAbastecimientoModal';
import AbastecimientoTimelineModal from '../../components/abastecimiento/AbastecimientoTimelineModal';
import { CostoViajeModal } from "./CostoViajeModal";
import { MarcarEntregadoModal } from "./MarcarEntregadoModal";
import { DevolucionModal } from "./DevolucionModal";
import { PerdidaModal } from "./PerdidaModal";
import { ResumenPedidoPanel } from "./ResumenPedidoPanel";
import { HistorialPedidoPanel } from "./HistorialPedidoPanel";
import { RendicionTab } from "./RendicionTab";
import { SeguimientoPanel } from "./SeguimientoPanel";
import {
  getCouriers,
  getEnvios,
  updateEstadoEnvio,
  validarPagoAbastecimiento,
  rechazarPagoAbastecimiento,
  avanzarAbastecimiento,
  confirmarRecepcionAbastecimiento,
  createCourier,
  updateCourier,
  deleteCourier,
  createCourierAccess,
  changeCourierAccessPassword,
  updateCourierAccessStatus,
  getDeliveryZonas,
  replaceDeliveryZonas,
  createEnvio,
  registrarDevolucion,
  registrarPerdida,
} from "../../services/courierApi";
import "./courier.css";

// Abastecimiento ya no es una pestaña de acá: vive en su propia sección
// (/abastecimiento), porque como pestaña quedaba escondida.
const TABS_VALIDOS = new Set(["tablero", "delivery", "rendicion", "analitica"]);
const CLAVE_TAB = "gesicomm:pedidosTab";

// La pestaña activa nunca viaja por query string: llega como router state
// desde otra pantalla y se recuerda en sessionStorage para el refresh.
function tabInicial(estadoNavegacion) {
  if (TABS_VALIDOS.has(estadoNavegacion)) return estadoNavegacion;
  try {
    const guardada = window.sessionStorage.getItem(CLAVE_TAB);
    if (TABS_VALIDOS.has(guardada)) return guardada;
  } catch { /* sin storage */ }
  return "tablero";
}

export function ControlCourier() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => tabInicial(location.state?.tab));
  const [fechaDesde, setFechaDesde] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }));
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }));
  const [couriers, setCouriers] = useState([]);
  const [deliveryZonas, setDeliveryZonas] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [openNuevoPedido, setOpenNuevoPedido] = useState(false);
  const [openImprimir, setOpenImprimir] = useState(false);
  const [envioParaCompletar, setEnvioParaCompletar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refrescarKey, setRefrescarKey] = useState(0);
  // Acción especial en curso desde el dropdown de estado de la bandeja —
  // { tipo: 'reprogramar'|'entregar'|'devolver'|'perder', envio } — ver
  // plan Gestión de Pedidos sección 42.
  const [accionEspecial, setAccionEspecial] = useState(null);
  const [resumenEnvio, setResumenEnvio] = useState(null);
  const [historialEnvio, setHistorialEnvio] = useState(null);
  const [seguimientoEnvio, setSeguimientoEnvio] = useState(null);
  const [transferenciaModalEnvio, setTransferenciaModalEnvio] = useState(null);
  const [timelineAbastecimientoEnvio, setTimelineAbastecimientoEnvio] = useState(null);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const esAdmin = usuarioActual?.rol === "administrador";

  // El state de navegación se consume una sola vez: si no, un refresh volvería
  // a forzar la pestaña que pidió la pantalla anterior.
  useEffect(() => {
    if (!location.state?.tab) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    verificarSesion().then(setUsuarioActual).catch(() => setUsuarioActual(null));
  }, []);

  function seleccionarTab(tabId) {
    setTab(tabId);
    try { window.sessionStorage.setItem(CLAVE_TAB, tabId); } catch { /* sin storage */ }
  }

  useEffect(() => {
    cargarDatos();
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    if (seguimientoEnvio) {
      const updated = envios.find(e => e.id === seguimientoEnvio.id);
      if (updated && updated !== seguimientoEnvio) setSeguimientoEnvio(updated);
    }
    if (resumenEnvio) {
      const updated = envios.find(e => e.id === resumenEnvio.id);
      if (updated && updated !== resumenEnvio) setResumenEnvio(updated);
    }
    if (historialEnvio) {
      const updated = envios.find(e => e.id === historialEnvio.id);
      if (updated && updated !== historialEnvio) setHistorialEnvio(updated);
    }
    if (envioParaCompletar) {
      const updated = envios.find(e => e.id === envioParaCompletar.id);
      if (updated && updated !== envioParaCompletar) setEnvioParaCompletar(updated);
    }
  }, [envios]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [couriersData, zonasData, enviosData] = await Promise.all([
        getCouriers(),
        getDeliveryZonas(),
        getEnvios({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
      ]);
      setCouriers(couriersData);
      setDeliveryZonas(zonasData);
      setEnvios(enviosData);
    } catch (err) {
      console.error("Error al cargar datos logísticos:", err);
    } finally {
      setLoading(false);
    }
  };

  // enviosDelDia eliminado: el backend ya filtra por rango de fechas en envios Data

  const enviosCountByCourier = useMemo(() => {
    const acc = {};
    for (const e of envios) {
      if (e.courier_id) {
        acc[e.courier_id] = (acc[e.courier_id] ?? 0) + 1;
      }
    }
    return acc;
  }, [envios]);

  // Pedidos que requieren accion del comercio en abastecimiento:
  // pendiente_pago = nunca pago, rechazado = fue rechazado y debe volver a pagar
  const pagosPendientesCount = useMemo(
    () => envios.filter(e =>
      e.abastecimiento_estado === 'pendiente_pago' ||
      e.abastecimiento_estado === 'rechazado'
    ).length,
    [envios]
  );

  const handleChangeEstado = async (id, nuevoEstado, envioDirecto = null) => {
    if (nuevoEstado === "Confirmado") {
      const envio = envioDirecto || envios.find(e => e.id === id);
      if (envio) setEnvioParaCompletar(envio);
      return;
    }

    setEnvios(prev => prev.map(e => e.id === id ? { ...e, estado: nuevoEstado } : e));
    try {
      await updateEstadoEnvio(id, { estado: nuevoEstado });
      cargarDatos();
      setRefrescarKey(k => k + 1);
    } catch (err) {
      console.error("Error actualizando estado:", err);
      cargarDatos();
      setRefrescarKey(k => k + 1);
    }
  };

  const [logisticaModalEnvio, setLogisticaModalEnvio] = useState(null);

  // pendiente_pago sin logística definida: primero hay que elegir GESICOMM
  // o depósito propio (LogisticaAbastecimientoModal). Con la logística ya
  // definida (primer pago o reenvío tras un rechazo) se va directo a la
  // transferencia — ya no hay redirect a PagoPar.
  const handlePagarAbastecimiento = (envio) => {
    if (envio.abastecimiento_estado === "pendiente_pago" && !envio.tipo_logistica_abastecimiento) {
      setLogisticaModalEnvio(envio);
    } else {
      setTransferenciaModalEnvio(envio);
    }
  };

  const handleComprobanteEnviado = (actualizado) => {
    setEnvios(prev => prev.map(e => e.id === actualizado.id ? actualizado : e));
    setTransferenciaModalEnvio(null);
    cargarDatos();
    setRefrescarKey(k => k + 1);
  };

  const handleValidarPagoAbastecimiento = async (envio) => {
    try {
      const actualizado = await validarPagoAbastecimiento(envio.id);
      setEnvios(prev => prev.map(e => e.id === envio.id ? actualizado : e));
      cargarDatos();
      setRefrescarKey(k => k + 1);
    } catch (err) {
      console.error("Error validando pago de abastecimiento:", err);
      alert(err.response?.data?.error || err.message || "No se pudo validar el pago.");
    }
  };

  const handleRechazarPagoAbastecimiento = async (envio) => {
    const motivo = window.prompt("Motivo del rechazo (obligatorio, lo ve la tienda):", "");
    if (!motivo) return;
    try {
      const actualizado = await rechazarPagoAbastecimiento(envio.id, motivo);
      setEnvios(prev => prev.map(e => e.id === envio.id ? actualizado : e));
      cargarDatos();
      setRefrescarKey(k => k + 1);
    } catch (err) {
      console.error("Error rechazando pago de abastecimiento:", err);
      alert(err.response?.data?.error || err.message || "No se pudo rechazar el pago.");
    }
  };

  // El backend resuelve el único siguiente estado válido (proveedor
  // contactado → ... → recibido/disponible): acá no se elige nada, solo se
  // dispara la acción.
  const handleAvanzarAbastecimiento = async (envio) => {
    try {
      const actualizado = await avanzarAbastecimiento(envio.id);
      setEnvios(prev => prev.map(e => e.id === envio.id ? actualizado : e));
      cargarDatos();
      setRefrescarKey(k => k + 1);
    } catch (err) {
      console.error("Error avanzando abastecimiento:", err);
      alert(err.response?.data?.error || err.message || "No se pudo avanzar el abastecimiento.");
    }
  };

  const handleConfirmarRecepcionAbastecimiento = async (envio) => {
    if (!window.confirm("¿Confirmás que recibiste este abastecimiento en tu depósito?")) return;
    try {
      const actualizado = await confirmarRecepcionAbastecimiento(envio.id);
      setEnvios(prev => prev.map(e => e.id === envio.id ? actualizado : e));
      cargarDatos();
      setRefrescarKey(k => k + 1);
    } catch (err) {
      console.error("Error confirmando recepción de abastecimiento:", err);
      alert(err.response?.data?.error || err.message || "No se pudo confirmar la recepción.");
    }
  };

  const handleConfirmarPedido = async (payload) => {
    const actualizado = await updateEstadoEnvio(payload.id, payload);
    setEnvios(prev => prev.map(e => e.id === payload.id ? actualizado : e));
    setEnvioParaCompletar(null);
    cargarDatos();
    setRefrescarKey(k => k + 1);
  };

  const handleCreateNuevoPedido = async (payload) => {
    const res = await createEnvio(payload);
    setEnvios(prev => [res, ...prev]);
    setOpenNuevoPedido(false);
    cargarDatos();
    setRefrescarKey(k => k + 1);
  };

  const handleModalSubmit = (payload, modoCompletar) => (
    modoCompletar ? handleConfirmarPedido(payload) : handleCreateNuevoPedido(payload)
  );

  // Con qué modal se completa cada destino que sale de "Reprogramado" —
  // debe reflejar el mismo mapeo que ESTADOS_CON_MODAL en PedidosTable.
  const ESTADOS_CON_MODAL = { Reprogramado: "reprogramar", Entregado: "entregar", Devuelto: "devolver", Perdido: "perder" };

  // El costo del viaje que resuelve un "Reprogramado" (ver CostoViajeModal)
  // se pidió aparte y viaja acá para sumarse al payload real de la
  // transición, sea cual sea el modal (o ninguno) que la complete.
  const costoIntentoPendiente = () => {
    const costo = accionEspecial?.costoIntento;
    return costo !== undefined ? { costo_intento: costo } : {};
  };

  // Las transiciones que necesitan datos adicionales (fecha, método de
  // pago, detalle por producto) se resuelven acá, en un modal dedicado por
  // tipo — nunca con un PATCH directo del dropdown de la bandeja.
  const handleReprogramarSubmit = async (id, datos) => {
    const actualizado = await updateEstadoEnvio(id, { estado: "Reprogramado", ...datos, ...costoIntentoPendiente() });
    setEnvios((prev) => prev.map((e) => (e.id === id ? actualizado : e)));
    setAccionEspecial(null);
    cargarDatos();
    setRefrescarKey((k) => k + 1);
  };

  const handleEntregadoSubmit = async (id, datos) => {
    const actualizado = await updateEstadoEnvio(id, { estado: "Entregado", ...datos, ...costoIntentoPendiente() });
    setEnvios((prev) => prev.map((e) => (e.id === id ? actualizado : e)));
    setAccionEspecial(null);
    cargarDatos();
    setRefrescarKey((k) => k + 1);
  };

  const handleDevolucionSubmit = async (id, datos) => {
    const actualizado = await registrarDevolucion(id, { ...datos, ...costoIntentoPendiente() });
    setEnvios((prev) => prev.map((e) => (e.id === id ? actualizado : e)));
    setAccionEspecial(null);
    cargarDatos();
    setRefrescarKey((k) => k + 1);
  };

  const handlePerdidaSubmit = async (id, datos) => {
    const actualizado = await registrarPerdida(id, { ...datos, ...costoIntentoPendiente() });
    setEnvios((prev) => prev.map((e) => (e.id === id ? actualizado : e)));
    setAccionEspecial(null);
    cargarDatos();
    setRefrescarKey((k) => k + 1);
  };

  // Paso previo cuando se sale de "Reprogramado": si el destino tiene su
  // propio modal, se encadena guardando el costo para que el submit final lo
  // incluya; si es una transición simple (Despachado, Cancelado) se aplica
  // directo acá.
  const handleCostoViajeSubmit = async (costoIntento) => {
    const { envio, destino } = accionEspecial || {};
    if (!envio || !destino) return;
    const tipoModal = ESTADOS_CON_MODAL[destino];
    if (tipoModal) {
      setAccionEspecial({ tipo: tipoModal, envio, costoIntento });
      return;
    }
    const actualizado = await updateEstadoEnvio(envio.id, { estado: destino, costo_intento: costoIntento });
    setEnvios((prev) => prev.map((e) => (e.id === envio.id ? actualizado : e)));
    setAccionEspecial(null);
    cargarDatos();
    setRefrescarKey((k) => k + 1);
  };

  return (
    <div className="prod-page courier-page" style={{ minHeight: '100vh', maxWidth: '100%' }}>
      <div className="courier-header">
        <div className="courier-header-main">
          <div className="prod-header-left">
            <div className="prod-icon-wrap" style={{ background: 'var(--vit-accent-soft)', color: 'var(--color-primary-text)' }}>
              <PackageCheck size={22} />
            </div>
            <div>
              <h1 className="prod-title">Pedidos</h1>
              <p className="prod-subtitle">Confirmación, abastecimiento, despacho y rendición</p>
            </div>
          </div>

          <div className="courier-header-actions">
            <button
              type="button"
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => setOpenImprimir(true)}
            >
              <Printer size={16} />
              Imprimir Pedidos
            </button>

            <button
              type="button"
              className="btn-nuevo-pedido"
              onClick={() => setOpenNuevoPedido(true)}
            >
              <Plus size={18} />
              Nuevo Pedido
            </button>
          </div>
        </div>

        <nav className="courier-tabs" aria-label="Secciones de pedidos">
          <TabButton active={tab === "tablero"} onClick={() => seleccionarTab("tablero")} icon={<LayoutGrid size={16} />} badge={pagosPendientesCount}>
            Tablero
          </TabButton>
          <TabButton active={tab === "delivery"} onClick={() => seleccionarTab("delivery")} icon={<Truck size={16} />}>
            Delivery
          </TabButton>
          <TabButton active={tab === "rendicion"} onClick={() => seleccionarTab("rendicion")} icon={<HandCoins size={16} />}>
            Rendición
          </TabButton>
          <TabButton active={tab === "analitica"} onClick={() => seleccionarTab("analitica")} icon={<TrendingUp size={16} />}>
            Analítica
          </TabButton>
        </nav>
      </div>

      <main className="courier-container" style={{ marginTop: '1.25rem' }}>
        {tab === "tablero" ? (
          // Bandeja operativa: sin dashboard arriba, ocupa casi toda la
          // pantalla — los indicadores generales viven en "Analítica" aparte.
          <PedidosTable
            couriers={couriers}
            onChangeEstado={handleChangeEstado}
            onPagarAbastecimiento={handlePagarAbastecimiento}
            onValidarPagoAbastecimiento={handleValidarPagoAbastecimiento}
            onRechazarPagoAbastecimiento={handleRechazarPagoAbastecimiento}
            onAvanzarAbastecimiento={handleAvanzarAbastecimiento}
            onConfirmarRecepcionAbastecimiento={handleConfirmarRecepcionAbastecimiento}
            onAbrirTimelineAbastecimiento={(envio) => setTimelineAbastecimientoEnvio(envio)}
            onAbrirDetalle={(envio) => setEnvioParaCompletar(envio)}
            onAccionEspecial={(tipo, envio, extra) => setAccionEspecial({ tipo, envio, ...extra })}
            onAbrirResumen={(envio) => setResumenEnvio(envio)}
            onAbrirHistorial={(envio) => setHistorialEnvio(envio)}
            onAbrirSeguimiento={(envio) => setSeguimientoEnvio(envio)}
            refrescarKey={refrescarKey}
          />
        ) : tab === "delivery" ? (
          <DeliveryPanel
            zonas={deliveryZonas}
            couriers={couriers}
            esAdmin={esAdmin}
            enviosCountByCourier={enviosCountByCourier}
            onSaveZonas={async (zonas, courierIds) => {
              const res = await replaceDeliveryZonas(zonas, courierIds);
              setDeliveryZonas(res);
            }}
            onCreateCourier={async (c) => {
              const res = await createCourier(c);
              setCouriers(prev => [...prev, res]);
              return res;
            }}
            onUpdateCourier={async (c) => {
              const res = await updateCourier(c.id, c);
              setCouriers(prev => prev.map(x => x.id === c.id ? res : x));
              return res;
            }}
            onDeleteCourier={async (id) => {
              await deleteCourier(id);
              setCouriers(prev => prev.filter(x => x.id !== id));
            }}
            onCreateAccess={async (id, payload) => {
              const acceso = await createCourierAccess(id, payload);
              setCouriers(prev => prev.map(x => x.id === id ? { ...x, acceso } : x));
              return acceso;
            }}
            onChangeAccessPassword={async (id, payload) => {
              const acceso = await changeCourierAccessPassword(id, payload);
              setCouriers(prev => prev.map(x => x.id === id ? { ...x, acceso } : x));
              return acceso;
            }}
            onUpdateAccessStatus={async (id, activo) => {
              const acceso = await updateCourierAccessStatus(id, activo);
              setCouriers(prev => prev.map(x => x.id === id ? { ...x, acceso } : x));
              return acceso;
            }}
          />
        ) : tab === "rendicion" ? (
          <RendicionTab couriers={couriers} />
        ) : (
          <CentroInteligenciaComercial couriers={couriers} />
        )}
      </main>

      {/* Modal único de Pedido: alta (envio=null) o completar al confirmar (envio=<registro>) */}
      <NuevoPedidoModal
        open={openNuevoPedido || !!envioParaCompletar}
        envio={envioParaCompletar}
        onClose={() => { setOpenNuevoPedido(false); setEnvioParaCompletar(null); }}
        onSubmit={handleModalSubmit}
        deliveryZonas={deliveryZonas}
        onPrecioItemActualizado={() => setRefrescarKey((k) => k + 1)}
        onAbrirSeguimiento={(envio) => setSeguimientoEnvio(envio)}
      />

      {/* Modal de Impresión de Pedidos */}
      <ImprimirPedidosModal
        open={openImprimir}
        onClose={() => setOpenImprimir(false)}
        envios={envios}
        fechaDesde={fechaDesde}
        onChangeFechaDesde={(d) => setFechaDesde(d)}
        fechaHasta={fechaHasta}
        onChangeFechaHasta={(d) => setFechaHasta(d)}
      />

      {/* Modales de transición con datos adicionales — ver plan sección 42-47 */}
      <CostoViajeModal
        open={accionEspecial?.tipo === "costo_viaje"}
        envio={accionEspecial?.envio}
        onClose={() => setAccionEspecial(null)}
        onSubmit={handleCostoViajeSubmit}
      />
      <ReprogramarModal
        open={accionEspecial?.tipo === "reprogramar"}
        envio={accionEspecial?.envio}
        onClose={() => setAccionEspecial(null)}
        onSubmit={handleReprogramarSubmit}
      />
      <MarcarEntregadoModal
        open={accionEspecial?.tipo === "entregar"}
        envio={accionEspecial?.envio}
        onClose={() => setAccionEspecial(null)}
        onSubmit={handleEntregadoSubmit}
      />
      <DevolucionModal
        open={accionEspecial?.tipo === "devolver"}
        envio={accionEspecial?.envio}
        onClose={() => setAccionEspecial(null)}
        onSubmit={handleDevolucionSubmit}
      />
      <PerdidaModal
        open={accionEspecial?.tipo === "perder"}
        envio={accionEspecial?.envio}
        onClose={() => setAccionEspecial(null)}
        onSubmit={handlePerdidaSubmit}
      />
      <ResumenPedidoPanel
        open={!!resumenEnvio}
        envio={resumenEnvio}
        onClose={() => setResumenEnvio(null)}
      />
      <HistorialPedidoPanel
        open={!!historialEnvio}
        envio={historialEnvio}
        onClose={() => setHistorialEnvio(null)}
      />
      <SeguimientoPanel
        open={!!seguimientoEnvio}
        envio={seguimientoEnvio}
        onClose={() => setSeguimientoEnvio(null)}
        onRefreshPedido={() => setRefrescarKey((k) => k + 1)}
      />
      <LogisticaAbastecimientoModal
        open={!!logisticaModalEnvio}
        envio={logisticaModalEnvio}
        onClose={() => setLogisticaModalEnvio(null)}
        onPagar={() => {
          const envio = logisticaModalEnvio;
          setLogisticaModalEnvio(null);
          setTransferenciaModalEnvio(envio);
        }}
      />
      <TransferenciaAbastecimientoModal
        open={!!transferenciaModalEnvio}
        envio={transferenciaModalEnvio}
        onClose={() => setTransferenciaModalEnvio(null)}
        onEnviado={handleComprobanteEnviado}
      />
      <AbastecimientoTimelineModal
        open={!!timelineAbastecimientoEnvio}
        envio={timelineAbastecimientoEnvio}
        onClose={() => setTimelineAbastecimientoEnvio(null)}
        esAdmin={esAdmin}
        onConfirmarRecepcion={esAdmin ? null : handleConfirmarRecepcionAbastecimiento}
      />
    </div>
  );
}

function TabButton({ active, onClick, icon, children, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tab-btn ${active ? 'active' : ''}`}
      style={{ position: 'relative' }}
    >
      {icon}
      {children}
      {badge > 0 && (
        <span style={{
          position: 'absolute',
          top: '-7px',
          right: '-8px',
          background: '#ef4444',
          color: '#fff',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 700,
          minWidth: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px',
          lineHeight: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          border: '2px solid var(--color-bg)',
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}
