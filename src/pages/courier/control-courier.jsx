import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, PackageCheck, Users, Plus, Printer, TrendingUp, CreditCard, HandCoins, LayoutDashboard } from "lucide-react";
import { PedidosTable } from "./PedidosTable";
import { DashboardGeneralTab } from "./DashboardGeneralTab";
import { CouriersCrud } from "./couriers-crud";
import { MetodosPagoCrud } from "./MetodosPagoCrud";
import { NuevoPedidoModal } from "./NuevoPedidoModal";
import { ImprimirPedidosModal } from "./ImprimirPedidosModal";
import { CentroInteligenciaComercial } from "./CentroInteligenciaComercial";
import { ReprogramarModal } from "./ReprogramarModal";
import { MarcarEntregadoModal } from "./MarcarEntregadoModal";
import { DevolucionModal } from "./DevolucionModal";
import { PerdidaModal } from "./PerdidaModal";
import { ResumenPedidoPanel } from "./ResumenPedidoPanel";
import { HistorialPedidoPanel } from "./HistorialPedidoPanel";
import { RendicionTab } from "./RendicionTab";
import {
  getCouriers,
  getEnvios,
  updateEstadoEnvio,
  createCourier,
  updateCourier,
  deleteCourier,
  createEnvio,
  registrarDevolucion,
  registrarPerdida,
} from "../../services/courierApi";
import "./courier.css";

const TABS_VALIDOS = new Set(["tablero", "couriers", "metodos-pago", "analitica"]);

export function ControlCourier() {
  const [searchParams] = useSearchParams();
  const tabInicial = searchParams.get("tab");
  const [tab, setTab] = useState(TABS_VALIDOS.has(tabInicial) ? tabInicial : "tablero");
  const [fechaDesde, setFechaDesde] = useState(() => new Date().toISOString().slice(0, 10));
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [couriers, setCouriers] = useState([]);
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

  useEffect(() => {
    cargarDatos();
  }, [fechaDesde, fechaHasta]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [couriersData, enviosData] = await Promise.all([
        getCouriers(),
        getEnvios({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
      ]);
      setCouriers(couriersData);
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

  // Las 4 transiciones que necesitan datos adicionales (fecha, método de
  // pago, detalle por producto) se resuelven acá, en un modal dedicado por
  // tipo — nunca con un PATCH directo del dropdown de la bandeja.
  const handleReprogramarSubmit = async (id, datos) => {
    const actualizado = await updateEstadoEnvio(id, { estado: "Reprogramado", ...datos });
    setEnvios((prev) => prev.map((e) => (e.id === id ? actualizado : e)));
    setAccionEspecial(null);
    cargarDatos();
    setRefrescarKey((k) => k + 1);
  };

  const handleEntregadoSubmit = async (id, datos) => {
    const actualizado = await updateEstadoEnvio(id, { estado: "Entregado", ...datos });
    setEnvios((prev) => prev.map((e) => (e.id === id ? actualizado : e)));
    setAccionEspecial(null);
    cargarDatos();
    setRefrescarKey((k) => k + 1);
  };

  const handleDevolucionSubmit = async (id, datos) => {
    const actualizado = await registrarDevolucion(id, datos);
    setEnvios((prev) => prev.map((e) => (e.id === id ? actualizado : e)));
    setAccionEspecial(null);
    cargarDatos();
    setRefrescarKey((k) => k + 1);
  };

  const handlePerdidaSubmit = async (id, datos) => {
    const actualizado = await registrarPerdida(id, datos);
    setEnvios((prev) => prev.map((e) => (e.id === id ? actualizado : e)));
    setAccionEspecial(null);
    cargarDatos();
    setRefrescarKey((k) => k + 1);
  };

  return (
    <div className="prod-page" style={{ minHeight: '100vh', maxWidth: '100%' }}>
      <div className="courier-header">
        <div className="prod-header-left">
          <div className="prod-icon-wrap" style={{ background: 'var(--vit-accent-soft)', color: 'var(--color-primary-text)' }}>
            <PackageCheck size={22} />
          </div>
          <div>
            <h1 className="prod-title">Control de Pedidos y Couriers</h1>
            <p className="prod-subtitle">Módulo logístico centralizado</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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

          <nav className="courier-tabs">
            <TabButton active={tab === "tablero"} onClick={() => setTab("tablero")} icon={<LayoutGrid size={16} />}>
              Tablero
            </TabButton>
            <TabButton active={tab === "couriers"} onClick={() => setTab("couriers")} icon={<Users size={16} />}>
              Couriers
            </TabButton>
            <TabButton active={tab === "metodos-pago"} onClick={() => setTab("metodos-pago")} icon={<CreditCard size={16} />}>
              Métodos de Pago
            </TabButton>
            <TabButton active={tab === "analitica"} onClick={() => setTab("analitica")} icon={<TrendingUp size={16} />}>
              Analítica
            </TabButton>
          </nav>
        </div>
      </div>

      <main className="courier-container" style={{ marginTop: '1.25rem' }}>
        {tab === "tablero" ? (
          // Bandeja operativa: sin dashboard arriba, ocupa casi toda la
          // pantalla — los indicadores generales viven en "Analítica" aparte.
          <PedidosTable
            couriers={couriers}
            onChangeEstado={handleChangeEstado}
            onAbrirDetalle={(envio) => setEnvioParaCompletar(envio)}
            onAccionEspecial={(tipo, envio) => setAccionEspecial({ tipo, envio })}
            onAbrirResumen={(envio) => setResumenEnvio(envio)}
            onAbrirHistorial={(envio) => setHistorialEnvio(envio)}
            refrescarKey={refrescarKey}
          />
        ) : tab === "couriers" ? (
          <CouriersCrud
            couriers={couriers}
            enviosCountByCourier={enviosCountByCourier}
            onCreate={async (c) => {
              const res = await createCourier(c);
              setCouriers(prev => [...prev, res]);
            }}
            onUpdate={async (c) => {
              const res = await updateCourier(c.id, c);
              setCouriers(prev => prev.map(x => x.id === c.id ? res : x));
            }}
            onDelete={async (id) => {
              await deleteCourier(id);
              setCouriers(prev => prev.filter(x => x.id !== id));
            }}
          />
        ) : tab === "metodos-pago" ? (
          <MetodosPagoCrud />
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
