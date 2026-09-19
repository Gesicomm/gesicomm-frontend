import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, PackageCheck, Plus, Printer, TrendingUp, HandCoins, Truck, CreditCard } from "lucide-react";
import { verificarSesion } from "../../utils/auth";
import { PedidosTable } from "./PedidosTable";
import { DeliveryPanel } from "./DeliveryPanel";
import { NuevoPedidoModal } from "./NuevoPedidoModal";
import { ImprimirPedidosModal } from "./ImprimirPedidosModal";
import { CentroInteligenciaComercial } from "./CentroInteligenciaComercial";
import { ReprogramarModal } from "./ReprogramarModal";
import LogisticaAbastecimientoModal from '../../components/depositos/LogisticaAbastecimientoModal';
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
  iniciarPagoAbastecimiento,
  actualizarAbastecimientoManual,
  createCourier,
  updateCourier,
  deleteCourier,
  getDeliveryZonas,
  replaceDeliveryZonas,
  createEnvio,
  registrarDevolucion,
  registrarPerdida,
} from "../../services/courierApi";
import "./courier.css";

const TABS_VALIDOS = new Set(["tablero", "abastecimiento", "delivery", "rendicion", "analitica"]);
const TABS_SOLO_ADMIN = new Set(["abastecimiento"]);
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

  useEffect(() => {
    if (usuarioActual === null || esAdmin || !TABS_SOLO_ADMIN.has(tab)) return;
    seleccionarTab("tablero");
  }, [usuarioActual, esAdmin, tab]);

  function seleccionarTab(tabId) {
    if (!esAdmin && TABS_SOLO_ADMIN.has(tabId)) tabId = "tablero";
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

  const handlePagarAbastecimiento = async (envio) => {
    setLogisticaModalEnvio(envio);
  };

  const proceedToPagarAbastecimiento = async (envioId) => {
    try {
      const checkout = await iniciarPagoAbastecimiento(envioId);
      if (checkout?.payment_url) {
        window.location.href = checkout.payment_url;
        return;
      }
      throw new Error("PagoPar no devolvió un enlace de pago.");
    } catch (err) {
      console.error("Error iniciando pago de abastecimiento:", err);
      alert(err.response?.data?.error || err.message || "No se pudo iniciar el pago de abastecimiento.");
    }
  };

  const handleAdminAbastecimiento = async (envio, accion) => {
    const esPago = accion === "acreditar_pago";
    const metodo = esPago
      ? window.prompt("Método de acreditación (ej: transferencia, contacto directo, efectivo)", "transferencia")
      : "recepción en depósito";
    if (metodo === null) return;

    const nota = window.prompt("Nota interna opcional", "");
    if (nota === null) return;

    try {
      const actualizado = await actualizarAbastecimientoManual(envio.id, {
        accion,
        metodo_acreditacion: metodo || "manual",
        nota: nota || null,
      });
      setEnvios(prev => prev.map(e => e.id === envio.id ? actualizado : e));
      cargarDatos();
      setRefrescarKey(k => k + 1);
    } catch (err) {
      console.error("Error actualizando abastecimiento manual:", err);
      alert(err.response?.data?.error || err.message || "No se pudo actualizar el abastecimiento.");
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
    <div className="prod-page" style={{ minHeight: '100vh', maxWidth: '100%' }}>
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
          <TabButton active={tab === "tablero"} onClick={() => seleccionarTab("tablero")} icon={<LayoutGrid size={16} />}>
            Tablero
          </TabButton>
          {esAdmin && (
            <TabButton active={tab === "abastecimiento"} onClick={() => seleccionarTab("abastecimiento")} icon={<CreditCard size={16} />}>
              Abastecimiento
            </TabButton>
          )}
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
            onAdminAbastecimiento={handleAdminAbastecimiento}
            onAbrirDetalle={(envio) => setEnvioParaCompletar(envio)}
            onAccionEspecial={(tipo, envio, extra) => setAccionEspecial({ tipo, envio, ...extra })}
            onAbrirResumen={(envio) => setResumenEnvio(envio)}
            onAbrirHistorial={(envio) => setHistorialEnvio(envio)}
            onAbrirSeguimiento={(envio) => setSeguimientoEnvio(envio)}
            refrescarKey={refrescarKey}
          />
        ) : tab === "abastecimiento" ? (
          <PedidosTable
            couriers={couriers}
            onChangeEstado={handleChangeEstado}
            onPagarAbastecimiento={handlePagarAbastecimiento}
            onAdminAbastecimiento={handleAdminAbastecimiento}
            onAbrirDetalle={(envio) => setEnvioParaCompletar(envio)}
            onAccionEspecial={(tipo, envio, extra) => setAccionEspecial({ tipo, envio, ...extra })}
            onAbrirResumen={(envio) => setResumenEnvio(envio)}
            onAbrirHistorial={(envio) => setHistorialEnvio(envio)}
            onAbrirSeguimiento={(envio) => setSeguimientoEnvio(envio)}
            refrescarKey={refrescarKey}
            soloAbastecimiento
            initialAbastecimientoEstado="en_proceso"
          />
        ) : tab === "delivery" ? (
          <DeliveryPanel
            zonas={deliveryZonas}
            couriers={couriers}
            enviosCountByCourier={enviosCountByCourier}
            onSaveZonas={async (zonas) => {
              const res = await replaceDeliveryZonas(zonas);
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
          const envioId = logisticaModalEnvio.id;
          setLogisticaModalEnvio(null);
          proceedToPagarAbastecimiento(envioId);
        }}
      />
    </div>
  );
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tab-btn ${active ? 'active' : ''}`}
    >
      {icon}
      {children}
    </button>
  );
}
