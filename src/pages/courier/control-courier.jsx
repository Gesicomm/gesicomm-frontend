import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, PackageCheck, Users, Plus, Printer, TrendingUp, CreditCard } from "lucide-react";
import { SummaryBar } from "./summary-bar";
import { DayFilter } from "./day-filter";
import { PedidosTable } from "./PedidosTable";
import { CouriersCrud } from "./couriers-crud";
import { MetodosPagoCrud } from "./MetodosPagoCrud";
import { NuevoPedidoModal } from "./NuevoPedidoModal";
import { ImprimirPedidosModal } from "./ImprimirPedidosModal";
import { CentroInteligenciaComercial } from "./CentroInteligenciaComercial";
import {
  getCouriers,
  getEnvios,
  updateEstadoEnvio,
  createCourier,
  updateCourier,
  deleteCourier,
  createEnvio
} from "../../services/courierApi";
import "./courier.css";

const TABS_VALIDOS = new Set(["tablero", "couriers", "metodos-pago", "analitica"]);

export function ControlCourier() {
  // Permite llegar directo a una pestaña con un link (ej: "Mi Dashboard"
  // linkeando a /mis-pedidos?tab=analitica) en vez de siempre abrir en
  // Tablero y obligar a la usuaria a encontrar la pestaña ella misma.
  const [searchParams] = useSearchParams();
  const tabInicial = searchParams.get("tab");
  const [tab, setTab] = useState(TABS_VALIDOS.has(tabInicial) ? tabInicial : "tablero");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [couriers, setCouriers] = useState([]);
  const [envios, setEnvios] = useState([]);                 // solo para el SummaryBar del día
  const [openNuevoPedido, setOpenNuevoPedido] = useState(false);
  const [openImprimir, setOpenImprimir] = useState(false);
  const [envioParaCompletar, setEnvioParaCompletar] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [date]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [couriersData, enviosData] = await Promise.all([
        getCouriers(),
        getEnvios(date)
      ]);
      setCouriers(couriersData);
      setEnvios(enviosData);
    } catch (err) {
      console.error("Error al cargar datos logísticos:", err);
    } finally {
      setLoading(false);
    }
  };

  const enviosDelDia = useMemo(() => envios.filter((e) => e.dispatchedAt === date), [envios, date]);

  const enviosCountByCourier = useMemo(() => {
    const acc = {};
    for (const e of envios) {
      if (e.courier_id) {
        acc[e.courier_id] = (acc[e.courier_id] ?? 0) + 1;
      }
    }
    return acc;
  }, [envios]);

  const handleDropCard = async (nuevoEstado) => {
    if (!draggingId) return;
    const envioId = draggingId;
    setDraggingId(null);

    // "Confirmado" no se aplica directo: abre el modal para completar
    // courier/costo de envío primero — recién ese submit dispara el PUT.
    if (nuevoEstado === "Confirmado") {
      const envio = envios.find(e => e.id === envioId);
      if (envio) setEnvioParaCompletar(envio);
      return;
    }

    // Optimistic update
    setEnvios(prev => prev.map(e => e.id === envioId ? { ...e, estado: nuevoEstado } : e));

    try {
      await updateEstadoEnvio(envioId, { estado: nuevoEstado });
    } catch (err) {
      console.error("Error actualizando estado:", err);
      cargarDatos(); // Revert back on error
    }
  };

  const handleChangeEstado = async (id, nuevoEstado) => {
    if (nuevoEstado === "Confirmado") {
      const envio = envios.find(e => e.id === id);
      if (envio) setEnvioParaCompletar(envio);
      return;
    }

    setEnvios(prev => prev.map(e => e.id === id ? { ...e, estado: nuevoEstado } : e));
    try {
      await updateEstadoEnvio(id, { estado: nuevoEstado });
    } catch (err) {
      console.error("Error actualizando estado:", err);
      cargarDatos();
    }
  };

  const handleConfirmarPedido = async (payload) => {
    const actualizado = await updateEstadoEnvio(payload.id, payload);
    setEnvios(prev => prev.map(e => e.id === payload.id ? actualizado : e));
    setEnvioParaCompletar(null);
  };

  const handleCreateNuevoPedido = async (payload) => {
    const res = await createEnvio(payload);
    setEnvios(prev => [res, ...prev]);
    setOpenNuevoPedido(false);
  };

  // El modal único de Pedido llama a esto tanto al crear como al completar
  // (mismo formulario — ver NuevoPedidoModal.jsx). Los errores del backend
  // (RUC obligatorio, comprobante duplicado, etc.) se propagan al modal,
  // que los muestra inline en vez de un alert() bloqueante.
  const handleModalSubmit = (payload, modoCompletar) => (
    modoCompletar ? handleConfirmarPedido(payload) : handleCreateNuevoPedido(payload)
  );

  return (
    <div className="prod-page" style={{ background: '#050505', minHeight: '100vh', color: '#fff', maxWidth: '100%' }}>
      <div className="courier-header">
        <div className="prod-header-left">
          <div className="prod-icon-wrap" style={{ background: 'rgba(255, 0, 127, 0.1)', color: '#ff007f' }}>
            <PackageCheck size={22} />
          </div>
          <div>
            <h1 className="prod-title" style={{ color: '#fff' }}>Control de Pedidos y Couriers</h1>
            <p className="prod-subtitle" style={{ color: '#888' }}>Módulo logístico centralizado</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* ── Resumen del día ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Resumen del día</h2>
                <p style={{ fontSize: '0.8rem', color: '#888', margin: '0.2rem 0 0 0' }}>
                  KPIs en tiempo real. Usá los filtros de abajo para buscar pedidos históricos.
                </p>
              </div>
              <DayFilter date={date} onChange={setDate} count={enviosDelDia.length} />
            </div>

            <SummaryBar envios={enviosDelDia} couriers={couriers} />

            {/* ── Tabla de pedidos con paginación y filtros ── */}
            <PedidosTable
              couriers={couriers}
              onChangeEstado={handleChangeEstado}
              onAbrirDetalle={(envio) => setEnvioParaCompletar(envio)}
            />
          </div>
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
          <CentroInteligenciaComercial />
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
        envios={enviosDelDia}
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
