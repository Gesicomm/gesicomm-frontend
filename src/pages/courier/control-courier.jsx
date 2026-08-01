import { useMemo, useState, useEffect } from "react";
import { LayoutGrid, PackageCheck, Users, Plus, List } from "lucide-react";
import { KanbanBoard } from "./kanban-board";
import { SummaryBar } from "./summary-bar";
import { DayFilter } from "./day-filter";
import { CouriersCrud } from "./couriers-crud";
import { NuevoPedidoModal } from "./NuevoPedidoModal";
import { 
  getCouriers, 
  getEnvios, 
  updateEstadoEnvio, 
  createCourier, 
  updateCourier, 
  deleteCourier,
  createEnvio 
} from "../../services/courierApi";
import { STATUS, formatGs } from "../../lib/courier";
import "./courier.css";

export function ControlCourier() {
  const [tab, setTab] = useState("tablero");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [couriers, setCouriers] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [openNuevoPedido, setOpenNuevoPedido] = useState(false);
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

    // Optimistic update
    setEnvios(prev => prev.map(e => e.id === envioId ? { ...e, estado: nuevoEstado } : e));

    try {
      await updateEstadoEnvio(envioId, nuevoEstado);
    } catch (err) {
      console.error("Error actualizando estado:", err);
      cargarDatos(); // Revert back on error
    }
  };

  const handleChangeEstado = async (id, nuevoEstado) => {
    setEnvios(prev => prev.map(e => e.id === id ? { ...e, estado: nuevoEstado } : e));
    try {
      await updateEstadoEnvio(id, nuevoEstado);
    } catch (err) {
      console.error("Error actualizando estado:", err);
      cargarDatos();
    }
  };

  const handleCreateNuevoPedido = async (payload) => {
    try {
      const res = await createEnvio(payload);
      setEnvios(prev => [res, ...prev]);
      setOpenNuevoPedido(false);
    } catch (err) {
      console.error("Error creando pedido:", err);
      alert("Ocurrió un error al crear el pedido");
    }
  };

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
            <TabButton active={tab === "envios"} onClick={() => setTab("envios")} icon={<List size={16} />}>
              Envíos
            </TabButton>
            <TabButton active={tab === "couriers"} onClick={() => setTab("couriers")} icon={<Users size={16} />}>
              Couriers
            </TabButton>
          </nav>
        </div>
      </div>

      <main className="courier-container" style={{ marginTop: '1.25rem' }}>
        {tab === "tablero" || tab === "envios" ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Envíos del día</h2>
                <p style={{ fontSize: '0.8rem', color: '#888', margin: '0.2rem 0 0 0' }}>
                  {tab === "tablero" 
                    ? "Arrastrá las tarjetas entre columnas para actualizar el estado instantáneamente." 
                    : "Listado detallado de todos los pedidos del día."}
                </p>
              </div>
              <DayFilter date={date} onChange={setDate} count={enviosDelDia.length} />
            </div>

            <SummaryBar envios={enviosDelDia} couriers={couriers} />

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>Cargando envíos...</div>
            ) : tab === "tablero" ? (
              <KanbanBoard
                envios={enviosDelDia}
                couriers={couriers}
                draggingId={draggingId}
                onDragStartCard={(id) => setDraggingId(id)}
                onDragEndCard={() => setDraggingId(null)}
                onDropCard={handleDropCard}
                onChangeEstado={handleChangeEstado}
              />
            ) : (
              <div className="data-table-wrapper" style={{ overflowX: 'auto', background: '#0a0a0b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table className="escalafy-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#141416', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>#</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Cliente</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Ciudad</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Dirección</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Producto</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Cant.</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Monto</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Envío</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Courier</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Método</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Rendido El</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enviosDelDia.length === 0 ? (
                      <tr>
                        <td colSpan={12} style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                          No hay envíos registrados para este día.
                        </td>
                      </tr>
                    ) : (
                      enviosDelDia.map((e) => {
                        const idPedido = `PED-${e.id.toString().padStart(6, '0')}`;
                        const nombreCliente = e.nombre_cliente
                          ? `${e.nombre_cliente} ${e.apellido_cliente || ''}`.trim()
                          : e.cliente || 'Cliente';

                        const nombresProds = e.items && e.items.length > 0
                          ? e.items.map(item => item.nombre_producto).join(', ')
                          : 'Sin producto';
                        const cantTotal = e.items && e.items.length > 0
                          ? e.items.reduce((sum, item) => sum + (item.cantidad || 0), 0)
                          : 0;

                        const nombreCourier = e.Courier ? e.Courier.nombre : 'Delivery propio';

                        let metodoFormat = e.metodo_pago;
                        if (e.metodo_pago === 'Efectivo') metodoFormat = 'Pago Contra Entrega';
                        else if (e.metodo_pago === 'Transferencia') metodoFormat = 'Transferencia bancaria';
                        else if (e.metodo_pago === 'POS') metodoFormat = 'POS / Tarjeta';
                        else if (e.metodo_pago === 'Pagado') metodoFormat = 'Ya pagado (Anticipado)';

                        const rendidoElStr = e.fecha_rendicion
                          ? new Date(e.fecha_rendicion + 'T00:00:00').toLocaleDateString('es-PY')
                          : '-';

                        const metaEstado = STATUS[e.estado] || { label: e.estado, chipBg: 'rgba(255,255,255,0.05)', chipText: '#fff' };

                        let rowBg = 'transparent';
                        if (e.estado === 'Entregado') rowBg = 'rgba(16, 185, 129, 0.08)';
                        else if (e.estado === 'Rendido') rowBg = 'rgba(139, 92, 246, 0.08)';
                        else if (e.estado === 'Cancelado') rowBg = 'rgba(239, 68, 68, 0.05)';
                        else if (e.estado === 'En camino') rowBg = 'rgba(59, 130, 246, 0.04)';
                        else if (e.estado === 'Reagendado') rowBg = 'rgba(249, 115, 22, 0.04)';
                        else if (e.estado === 'Devuelto') rowBg = 'rgba(129, 140, 248, 0.04)';

                        return (
                          <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: rowBg }}>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#3b82f6' }}>{idPedido}</td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#fff' }}>{nombreCliente}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>{e.ciudad || '-'}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>{e.direccion || '-'}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>{nombresProds}</td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>{cantTotal}</td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#10b981' }}>{formatGs(e.monto)}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#888' }}>{formatGs(e.costo_envio)}</td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{nombreCourier}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>{metodoFormat}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#a78bfa', fontWeight: 600 }}>{rendidoElStr}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{
                                background: metaEstado.chipBg,
                                color: metaEstado.chipText,
                                padding: '0.25rem 0.6rem',
                                borderRadius: '999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                display: 'inline-block'
                              }}>
                                {metaEstado.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
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
        )}
      </main>

      {/* Modal de Nuevo Pedido */}
      <NuevoPedidoModal
        open={openNuevoPedido}
        onClose={() => setOpenNuevoPedido(false)}
        onSubmit={handleCreateNuevoPedido}
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
