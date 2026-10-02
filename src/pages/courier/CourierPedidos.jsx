import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  Check,
  Copy,
  LogOut,
  MapPin,
  MessageSquareText,
  PackageCheck,
  PackageX,
  Phone,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";
import {
  courierLogout,
  getCourierMe,
  getCourierMetodosPago,
  getCourierPedidos,
  marcarPedidoEntregadoCourier,
  reprogramarPedidoCourier,
  reportarNoEntregadoCourier,
} from "../../services/courierPortalApi";
import { numeroPedidoVisible } from "./pedidoNumero";
import "./courier-portal.css";

function gs(valor) {
  return `Gs. ${Number(valor || 0).toLocaleString("es-PY")}`;
}

function hoyMasUno() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function descripcionItems(pedido) {
  const items = pedido.items || [];
  if (!items.length) return pedido.producto || "Pedido sin detalle de producto";
  return items.map(item => `${item.cantidad || 1}× ${item.nombre_producto}`).join(", ");
}

function soloDigitos(telefono) {
  return String(telefono || "").replace(/[^\d+]/g, "");
}

function direccionCompleta(pedido) {
  return [pedido.direccion, pedido.ciudad, pedido.departamento].filter(Boolean).join(", ");
}

function mapsUrl(pedido) {
  if (pedido.link_maps) return pedido.link_maps;
  const direccion = direccionCompleta(pedido);
  if (!direccion) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(direccion)}`;
}

const TABS = [
  { key: "todos", label: "Todos", match: () => true },
  { key: "por_entregar", label: "Por entregar", match: p => p.estado === "Despachado" },
  { key: "reprogramados", label: "Reprogramados", match: p => p.estado === "Reprogramado" },
  { key: "entregados", label: "Entregados", match: p => p.estado === "Entregado" },
  { key: "perdidos", label: "Perdidos", match: p => p.estado === "Perdido" },
];

export default function CourierPedidos() {
  const navigate = useNavigate();
  const [courier, setCourier] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState("");
  const [accion, setAccion] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState("todos");

  async function cargar({ silencioso = false } = {}) {
    if (silencioso) setRefrescando(true);
    else setLoading(true);
    setError("");
    try {
      const [me, pedidosData, metodosData] = await Promise.all([
        getCourierMe(),
        getCourierPedidos(),
        getCourierMetodosPago(),
      ]);
      setCourier(me.courier);
      setPedidos(pedidosData || []);
      setMetodos(metodosData || []);
    } catch (err) {
      if (err?.response?.status === 401) {
        await courierLogout();
        navigate("/courier/login", { replace: true });
        return;
      }
      setError(err?.response?.data?.error || "No pudimos cargar tus pedidos.");
    } finally {
      setLoading(false);
      setRefrescando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ordenados = useMemo(() => {
    return [...pedidos].sort((a, b) => (Number(b.numero_pedido || b.id) - Number(a.numero_pedido || a.id)));
  }, [pedidos]);

  const conteos = useMemo(() => {
    const map = {};
    TABS.forEach(t => { map[t.key] = ordenados.filter(t.match).length; });
    return map;
  }, [ordenados]);

  const visibles = useMemo(() => {
    const tabDef = TABS.find(t => t.key === tab) || TABS[0];
    const base = ordenados.filter(tabDef.match);
    const q = busqueda.trim().toLowerCase();
    if (!q) return base;
    return base.filter(p => {
      const campos = [
        numeroPedidoVisible(p),
        p.cliente,
        `${p.nombre_cliente || ""} ${p.apellido_cliente || ""}`,
        p.telefono,
        p.ciudad,
        p.direccion,
      ];
      return campos.some(c => String(c || "").toLowerCase().includes(q));
    });
  }, [ordenados, tab, busqueda]);

  const resumen = useMemo(() => {
    const porEntregar = ordenados.filter(p => p.estado === "Despachado" || p.estado === "Reprogramado");
    const entregados = ordenados.filter(p => p.estado === "Entregado");
    const perdidos = ordenados.filter(p => p.estado === "Perdido");
    return {
      porEntregar: porEntregar.length,
      entregados: entregados.length,
      perdidos: perdidos.length,
      aCobrar: porEntregar.reduce((acc, p) => acc + Number(p.monto_visible_a_cobrar || 0), 0),
    };
  }, [ordenados]);

  async function salir() {
    await courierLogout();
    navigate("/courier/login", { replace: true });
  }

  async function actualizarPedido(callback) {
    const actualizado = await callback();
    setPedidos(prev => prev.map(p => p.id === actualizado.id ? actualizado : p));
    setAccion(null);
    cargar({ silencioso: true });
  }

  return (
    <main className="cp-root">
      <div className="cp-page">
        <header className="cp-header">
          <div className="cp-header-row">
            <div className="cp-header-id">
              <span className="cp-header-badge"><Truck size={18} /></span>
              <div style={{ minWidth: 0 }}>
                <p className="cp-eyebrow">Portal courier</p>
                <h1 className="cp-title">{courier?.nombre || "Mis entregas"}</h1>
              </div>
            </div>
            <div className="cp-header-actions">
              <button
                type="button"
                className={`cp-icon-btn${refrescando ? " cp-spin" : ""}`}
                onClick={() => cargar({ silencioso: true })}
                aria-label="Actualizar"
              >
                <RefreshCw size={17} />
              </button>
              <button type="button" className="cp-icon-btn" onClick={salir} aria-label="Salir">
                <LogOut size={17} />
              </button>
            </div>
          </div>

          <div className="cp-stats">
            <div className="cp-stat">
              <strong>{resumen.porEntregar}</strong>
              <span>Por entregar</span>
            </div>
            <div className="cp-stat cp-stat-money">
              <strong>{gs(resumen.aCobrar)}</strong>
              <span>A cobrar</span>
            </div>
            <div className="cp-stat">
              <strong>{resumen.entregados}</strong>
              <span>Entregados</span>
            </div>
            <div className="cp-stat">
              <strong>{resumen.perdidos}</strong>
              <span>Perdidos</span>
            </div>
          </div>

          <div className="cp-search">
            <Search size={16} />
            <input
              type="search"
              inputMode="search"
              placeholder="Buscar por N° de pedido, cliente, teléfono o ciudad..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button type="button" className="cp-search-clear" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="cp-tabs" role="tablist">
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                role="tab"
                className="cp-tab"
                data-active={tab === t.key}
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
              >
                {t.label} <b>{conteos[t.key] ?? 0}</b>
              </button>
            ))}
          </div>
        </header>

        {error && <div className="cp-error">{error}</div>}

        {loading ? (
          <div className="cp-list" style={{ marginTop: "0.9rem" }}>
            {[0, 1, 2].map(i => (
              <div className="cp-skeleton" key={i}>
                <div className="cp-skel-line" style={{ width: "40%" }} />
                <div className="cp-skel-line" style={{ width: "70%" }} />
                <div className="cp-skel-line" style={{ width: "55%" }} />
              </div>
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="cp-empty">
            {busqueda ? "No encontramos pedidos con esa búsqueda." : "No tenés pedidos en esta categoría."}
          </div>
        ) : (
          <section className="cp-list">
            {visibles.map(pedido => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                onEntregar={() => setAccion({ tipo: "entregar", pedido })}
                onReprogramar={() => setAccion({ tipo: "reprogramar", pedido })}
                onNoEntregado={() => setAccion({ tipo: "no_entregado", pedido })}
              />
            ))}
          </section>
        )}
      </div>

      <AccionModal
        accion={accion}
        metodos={metodos}
        onClose={() => setAccion(null)}
        onConfirmar={actualizarPedido}
      />
    </main>
  );
}

function PedidoCard({ pedido, onEntregar, onReprogramar, onNoEntregado }) {
  const [copiado, setCopiado] = useState(false);
  const nombreCliente = pedido.cliente || `${pedido.nombre_cliente || ""} ${pedido.apellido_cliente || ""}`.trim() || "Cliente";
  const telefono = pedido.telefono;
  const telDigits = soloDigitos(telefono);
  const maps = mapsUrl(pedido);
  const esActivo = pedido.estado !== "Entregado" && pedido.estado !== "Perdido";
  const badge = {
    Despachado: { label: "Despachado", bg: "color-mix(in srgb, var(--color-info) 14%, transparent)", fg: "var(--color-info)" },
    Reprogramado: { label: "Reprogramado", bg: "color-mix(in srgb, var(--color-warning) 14%, transparent)", fg: "var(--color-warning)" },
    Entregado: { label: "Entregado", bg: "color-mix(in srgb, var(--color-success) 14%, transparent)", fg: "var(--color-success)" },
    Perdido: { label: "Perdido", bg: "color-mix(in srgb, var(--color-danger) 14%, transparent)", fg: "var(--color-danger)" },
  }[pedido.estado] || { label: pedido.estado, bg: "var(--color-surface-2)", fg: "var(--color-fg-muted)" };

  async function copiarTelefono() {
    try {
      await navigator.clipboard.writeText(telefono);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // Sin acceso al portapapeles: el número ya está visible para copiarlo a mano.
    }
  }

  return (
    <article className="cp-card">
      <span className="cp-card-rail" data-estado={pedido.estado} />

      <div className="cp-card-top">
        <div style={{ minWidth: 0 }}>
          <span className="cp-card-number">#{numeroPedidoVisible(pedido)}</span>
          <h2 className="cp-card-client">{nombreCliente}</h2>
        </div>
        <span className="cp-badge" style={{ background: badge.bg, color: badge.fg }}>
          {pedido.estado === "Perdido" && <AlertTriangle size={12} />}
          {badge.label}
        </span>
      </div>

      <div className="cp-card-info">
        <div className="cp-card-info-row">
          <Phone size={14} />
          {telefono ? (
            <div className="cp-link-row">
              <a href={`tel:${telDigits}`}>{telefono}</a>
              <button
                type="button"
                className="cp-mini-btn"
                data-copied={copiado}
                onClick={copiarTelefono}
                aria-label="Copiar teléfono"
                title="Copiar número"
              >
                {copiado ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          ) : (
            <span>Sin teléfono</span>
          )}
        </div>

        <div className="cp-card-info-row">
          <MapPin size={14} />
          {maps ? (
            <a className="cp-maps-link" href={maps} target="_blank" rel="noreferrer">
              {direccionCompleta(pedido)}
            </a>
          ) : (
            <span>Sin dirección</span>
          )}
        </div>

        {pedido.fecha_reprogramada && (
          <div className="cp-card-info-row">
            <CalendarDays size={14} />
            <span>Reprogramado para {pedido.fecha_reprogramada}</span>
          </div>
        )}
      </div>

      <p className="cp-card-items">{descripcionItems(pedido)}</p>

      {pedido.observaciones && (
        <div
          className="cp-card-info-row"
          style={{
            marginTop: "0.6rem",
            padding: "0.55rem 0.7rem",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            color: "var(--color-fg)",
            fontSize: "0.83rem",
            alignItems: "flex-start",
          }}
        >
          <MessageSquareText size={14} style={{ marginTop: 2 }} />
          <span><strong>Observación:</strong> {pedido.observaciones}</span>
        </div>
      )}

      <div className="cp-perforation" />

      <div className="cp-money-row" data-cobrado={pedido.estado === "Entregado" && !pedido.pendiente_cobro}>
        <span>{pedido.pendiente_cobro ? "Monto a cobrar" : "Cobrado / anticipado"}</span>
        <strong>{gs(pedido.monto_visible_a_cobrar)}</strong>
      </div>

      {esActivo && (
        <div className="cp-actions">
          <button type="button" className="cp-btn cp-btn-primary" onClick={onEntregar}>
            <PackageCheck size={16} /> Entregado
          </button>
          <button type="button" className="cp-btn cp-btn-ghost" onClick={onReprogramar}>
            <Calendar size={16} /> Reprogramar
          </button>
          {pedido.estado === "Despachado" && (
            <button type="button" className="cp-btn cp-btn-danger-ghost" onClick={onNoEntregado}>
              <PackageX size={16} /> No entregado
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function AccionModal({ accion, metodos, onClose, onConfirmar }) {
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [montoCobrado, setMontoCobrado] = useState(0);
  const [fecha, setFecha] = useState(hoyMasUno());
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!accion) return;
    setMetodoPagoId("");
    setMontoCobrado(Number(accion.pedido?.monto_visible_a_cobrar) || 0);
    setFecha(hoyMasUno());
    setMotivo("");
    setObservacion("");
    setError("");
  }, [accion]);

  if (!accion) return null;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      if (accion.tipo === "entregar") {
        if (!metodoPagoId) throw new Error("Elegí el método de pago real.");
        await onConfirmar(() => marcarPedidoEntregadoCourier(accion.pedido.id, {
          metodo_pago_id: metodoPagoId,
          monto_cobrado: montoCobrado,
          observacion,
        }));
      } else if (accion.tipo === "reprogramar") {
        if (!fecha) throw new Error("Indicá la nueva fecha.");
        await onConfirmar(() => reprogramarPedidoCourier(accion.pedido.id, {
          fecha_reprogramada: fecha,
          motivo,
        }));
      } else {
        if (!motivo.trim()) throw new Error("Indicá el motivo.");
        await onConfirmar(() => reportarNoEntregadoCourier(accion.pedido.id, { motivo }));
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "No pudimos guardar la acción.");
    } finally {
      setGuardando(false);
    }
  }

  const esEntrega = accion.tipo === "entregar";
  const esReprogramar = accion.tipo === "reprogramar";

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <form className="cp-modal" onSubmit={submit} onClick={e => e.stopPropagation()}>
        <h3 className="cp-modal-title">
          {esEntrega ? "Confirmar entrega" : esReprogramar ? "Reprogramar pedido" : "Reportar no entregado"}
        </h3>
        <p className="cp-modal-help">#{numeroPedidoVisible(accion.pedido)}</p>

        {esEntrega ? (
          <>
            <div className="cp-expected-box">
              <span>Monto esperado</span>
              <strong>{gs(accion.pedido.monto_visible_a_cobrar)}</strong>
            </div>
            <label className="cp-modal-field">
              <span>Monto cobrado</span>
              <CurrencyInput className="cp-input" value={montoCobrado} onChange={v => setMontoCobrado(v || 0)} />
            </label>
            <label className="cp-modal-field">
              <span>Método de pago</span>
              <select className="cp-input" value={metodoPagoId} onChange={e => setMetodoPagoId(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </label>
            <label className="cp-modal-field">
              <span>Observación</span>
              <textarea className="cp-input" rows={3} value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Opcional" />
            </label>
          </>
        ) : esReprogramar ? (
          <>
            <label className="cp-modal-field">
              <span>Nueva fecha</span>
              <input className="cp-input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
            </label>
            <label className="cp-modal-field">
              <span>Motivo</span>
              <textarea className="cp-input" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Cliente no estaba en domicilio" />
            </label>
          </>
        ) : (
          <label className="cp-modal-field">
            <span>Motivo</span>
            <textarea className="cp-input" rows={4} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. No respondió, dirección incorrecta, no quiso recibir..." required />
          </label>
        )}

        {error && <div className="cp-login-error">{error}</div>}

        <div className="cp-modal-actions">
          <button type="button" className="cp-btn cp-btn-ghost" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button type="submit" className="cp-btn cp-btn-primary" disabled={guardando}>
            {guardando ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  );
}
