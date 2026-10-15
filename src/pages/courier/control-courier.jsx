import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, PackageCheck, Plus, Printer, HandCoins, MessageCircle } from "lucide-react";
import { verificarSesion } from "../../utils/auth";
import { PedidosTable } from "./PedidosTable";
import { NuevoPedidoModal } from "./NuevoPedidoModal";
import { VentaWhatsAppModal } from "./VentaWhatsAppModal";
import { ImprimirPedidosModal } from "./ImprimirPedidosModal";
import { ReprogramarModal } from "./ReprogramarModal";
import { CostoViajeModal } from "./CostoViajeModal";
import { MarcarEntregadoModal } from "./MarcarEntregadoModal";
import { DevolucionModal } from "./DevolucionModal";
import { PerdidaModal } from "./PerdidaModal";
import { ResumenPedidoPanel } from "./ResumenPedidoPanel";
import { HistorialPedidoPanel } from "./HistorialPedidoPanel";
import { RendicionTab } from "./RendicionTab";
import { SeguimientoPanel } from "./SeguimientoPanel";
import { ConfirmacionPedidoWhatsappModal } from "./ConfirmacionPedidoWhatsappModal";
import {
  getCouriers,
  getEnvios,
  updateEstadoEnvio,
  getDeliveryZonas,
  createEnvio,
  registrarDevolucion,
  registrarPerdida,
} from "../../services/courierApi";
import { tiendaService } from "../../services/tiendaService";
import "./courier.css";

// Abastecimiento ya no es una pestaña de acá: vive en su propia sección
// (/abastecimiento), porque como pestaña quedaba escondida. Delivery tampoco:
// los couriers se cargan junto con el depósito, en Mi Tienda → Depósitos.
// Rendición es liquidación de couriers: solo tiene sentido en Gestión
// Logística, no en Comercial. Analítica dejó de ser una pestaña acá: ya no
// pertenece a ningún estado (ni comercial ni logístico), es su propio menú
// "Dashboard Operativo" (pedido del usuario, 2026-10-14).
const TABS_POR_MENU = {
  comercial: ["tablero"],
  logistica: ["tablero", "rendicion"],
};
const tabsDisponiblesDe = (etapaFija) => TABS_POR_MENU[etapaFija] || ["tablero", "rendicion"];
const claveTabDe = (etapaFija) => `gesicomm:pedidosTab:${etapaFija || "todas"}`;

// La pestaña activa nunca viaja por query string: llega como router state
// desde otra pantalla y se recuerda en sessionStorage (por página) para el refresh.
function tabInicial(estadoNavegacion, tabsDisponibles, claveTab) {
  if (tabsDisponibles.includes(estadoNavegacion)) return estadoNavegacion;
  try {
    const guardada = window.sessionStorage.getItem(claveTab);
    if (tabsDisponibles.includes(guardada)) return guardada;
  } catch { /* sin storage */ }
  return "tablero";
}

// Comercial gestiona la confirmación, los mensajes del envío y la recompra.
// Logística tiene su bandeja de preparación, despacho y entrega.
const ETAPAS_POR_MENU = {
  comercial: { etapasDisponibles: ["comercial", "seguimiento_envio", "recompra", "recuperacion"], initialEtapa: "comercial", initialEstado: undefined },
  logistica: { etapasDisponibles: ["logistica"], initialEtapa: "logistica", initialEstado: "Confirmado" },
};

export function ControlCourier({ etapaFija } = {}) {
  const etapasProps = ETAPAS_POR_MENU[etapaFija] || ETAPAS_POR_MENU.comercial;
  const permiteSeguimiento = etapaFija !== "logistica";
  const tabsDisponibles = tabsDisponiblesDe(etapaFija);
  const claveTab = claveTabDe(etapaFija);
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => tabInicial(location.state?.tab, tabsDisponibles, claveTab));
  const [fechaDesde, setFechaDesde] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }));
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }));
  const [couriers, setCouriers] = useState([]);
  const [deliveryZonas, setDeliveryZonas] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [openNuevoPedido, setOpenNuevoPedido] = useState(false);
  const [openVentaWhatsApp, setOpenVentaWhatsApp] = useState(false);
  // Pedido de origen cuando se abre "Nuevo pedido" desde Recompra: solo
  // presta sus datos de cliente/entrega, no se completa ni se toca.
  const [clienteParaRepetir, setClienteParaRepetir] = useState(null);
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
  // El mensaje del flujo que le tocaba al pedido cuando se abrió el panel.
  const [faseSeguimientoId, setFaseSeguimientoId] = useState(null);
  const [usuarioActual, setUsuarioActual] = useState(null);
  // Plantilla + número de WhatsApp de la tienda, para el pop-up de
  // confirmación de pedido (ver ConfirmacionPedidoWhatsappModal).
  const [tiendaContacto, setTiendaContacto] = useState(null);
  const [confirmacionWhatsapp, setConfirmacionWhatsapp] = useState(null);

  useEffect(() => {
    tiendaService.obtener().then(setTiendaContacto).catch(() => setTiendaContacto(null));
  }, []);

  useEffect(() => {
    if (!permiteSeguimiento) {
      setSeguimientoEnvio(null);
      setFaseSeguimientoId(null);
    }
  }, [permiteSeguimiento]);

  // El state de navegación se consume una sola vez: si no, un refresh volvería
  // a forzar la pestaña que pidió la pantalla anterior.
  useEffect(() => {
    if (!location.state?.tab) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    verificarSesion().then(setUsuarioActual).catch(() => setUsuarioActual(null));
  }, []);

  function abrirNuevoPedidoDesdeRecompra(envio) {
    setClienteParaRepetir(envio);
    setOpenNuevoPedido(true);
  }

  function abrirSeguimiento(envio) {
    if (!permiteSeguimiento) return;
    setFaseSeguimientoId(envio?.seguimiento?.fase_id ?? null);
    setSeguimientoEnvio(envio);
  }

  function seleccionarTab(tabId) {
    setTab(tabId);
    try { window.sessionStorage.setItem(claveTab, tabId); } catch { /* sin storage */ }
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

  const handleConfirmarPedido = async (payload) => {
    const actualizado = await updateEstadoEnvio(payload.id, payload);
    setEnvios(prev => prev.map(e => e.id === payload.id ? actualizado : e));
    setEnvioParaCompletar(null);
    // payload.estado solo viaja cuando el modal de verdad confirmó el
    // pedido (ver vaAConfirmar en NuevoPedidoModal) — no en una edición
    // sobre un pedido que ya había avanzado antes.
    if (payload.estado === "Confirmado") {
      setConfirmacionWhatsapp(actualizado);
    }
    cargarDatos();
    setRefrescarKey(k => k + 1);
  };

  const handleCreateNuevoPedido = async (payload) => {
    const res = await createEnvio(payload);
    setEnvios(prev => [res, ...prev]);
    setOpenNuevoPedido(false);
    setClienteParaRepetir(null);
    cargarDatos();
    setRefrescarKey(k => k + 1);
  };

  const handleCreateVentaWhatsApp = async (payload) => {
    const res = await createEnvio(payload);
    setEnvios(prev => [res, ...prev]);
    setOpenVentaWhatsApp(false);
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
              <h1 className="prod-title">{etapaFija === "logistica" ? "Gestión Logística" : "Gestión Comercial"}</h1>
              <p className="prod-subtitle">
                {etapaFija === "logistica" ? "Preparación, despacho y rendición" : "Confirmación y seguimiento de pedidos"}
              </p>
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

            {permiteSeguimiento && ['usuario', 'administrador'].includes(usuarioActual?.rol) && (
              <Link to="/pedidos/configuracion" className="courier-flow-action">
                <MessageCircle size={22} strokeWidth={2.2} aria-hidden="true" />
                Flujos de WhatsApp
              </Link>
            )}

            <button
              type="button"
              className="btn-venta-whatsapp"
              onClick={() => { setClienteParaRepetir(null); setOpenVentaWhatsApp(true); }}
            >
              <MessageCircle size={18} />
              Venta por WhatsApp
            </button>

            <button
              type="button"
              className="btn-nuevo-pedido"
              onClick={() => { setClienteParaRepetir(null); setOpenNuevoPedido(true); }}
            >
              <Plus size={18} />
              Nuevo Pedido
            </button>
          </div>
        </div>

        {tabsDisponibles.length > 1 && (
          <nav className="courier-tabs" aria-label="Secciones de pedidos">
            <TabButton active={tab === "tablero"} onClick={() => seleccionarTab("tablero")} icon={<LayoutGrid size={16} />}>
              Tablero
            </TabButton>
            {tabsDisponibles.includes("rendicion") && (
              <TabButton active={tab === "rendicion"} onClick={() => seleccionarTab("rendicion")} icon={<HandCoins size={16} />}>
                Rendición
              </TabButton>
            )}
          </nav>
        )}
      </div>

      <main className="courier-container" style={{ marginTop: '1.25rem' }}>
        {tab === "tablero" ? (
          // Bandeja operativa: sin dashboard arriba, ocupa casi toda la
          // pantalla — los indicadores generales viven en Dashboard Operativo aparte.
          <PedidosTable
            couriers={couriers}
            onChangeEstado={handleChangeEstado}
            onAbrirDetalle={(envio) => setEnvioParaCompletar(envio)}
            onAccionEspecial={(tipo, envio, extra) => setAccionEspecial({ tipo, envio, ...extra })}
            onAbrirResumen={(envio) => setResumenEnvio(envio)}
            onAbrirHistorial={(envio) => setHistorialEnvio(envio)}
            onAbrirSeguimiento={permiteSeguimiento ? abrirSeguimiento : undefined}
            onRepetirPedido={permiteSeguimiento ? abrirNuevoPedidoDesdeRecompra : undefined}
            refrescarKey={refrescarKey}
            {...etapasProps}
          />
        ) : (
          <RendicionTab couriers={couriers} />
        )}
      </main>

      {/* Modal único de Pedido: alta (envio=null) o completar al confirmar (envio=<registro>) */}
      <NuevoPedidoModal
        open={openNuevoPedido || !!envioParaCompletar}
        envio={envioParaCompletar}
        clienteBase={clienteParaRepetir}
        onClose={() => { setOpenNuevoPedido(false); setEnvioParaCompletar(null); setClienteParaRepetir(null); }}
        onSubmit={handleModalSubmit}
        deliveryZonas={deliveryZonas}
        onPrecioItemActualizado={() => setRefrescarKey((k) => k + 1)}
        onAbrirSeguimiento={permiteSeguimiento ? abrirSeguimiento : undefined}
      />

      {/* Alta rápida de un pedido que llega por WhatsApp: nombre, teléfono y
          productos nomás. Entra al flujo de seguimiento "Venta por WhatsApp"
          (ver esOrigenWhatsapp en flujosBase.js) por el origen fijo que manda. */}
      <VentaWhatsAppModal
        open={openVentaWhatsApp}
        onClose={() => setOpenVentaWhatsApp(false)}
        onSubmit={handleCreateVentaWhatsApp}
      />

      {/* Pop-up para avisar por WhatsApp apenas se confirma un pedido */}
      <ConfirmacionPedidoWhatsappModal
        open={!!confirmacionWhatsapp}
        envio={confirmacionWhatsapp}
        tienda={tiendaContacto}
        onClose={() => setConfirmacionWhatsapp(null)}
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
      {permiteSeguimiento && <SeguimientoPanel
        open={!!seguimientoEnvio}
        envio={seguimientoEnvio}
        faseSugeridaId={faseSeguimientoId}
        onClose={() => setSeguimientoEnvio(null)}
        onConfirmarPedido={(envio) => {
          // Mismo camino que "Completar datos" de la bandeja: al confirmar,
          // el pedido sale solo del flujo de confirmación.
          setSeguimientoEnvio(null);
          setEnvioParaCompletar(envio);
        }}
        onRefreshPedido={() => setRefrescarKey((k) => k + 1)}
      />}
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
          background: "var(--color-danger)",
          color: "var(--color-danger-fg)",
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
