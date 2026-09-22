import { useState, useEffect, useCallback } from "react";
import { Package, History, FileText, CheckCircle2, Clock } from "lucide-react";
import {
  getEnviosPaginados,
  getConteoPorAbastecimiento,
  validarPagoAbastecimiento,
  rechazarPagoAbastecimiento,
  avanzarAbastecimiento,
} from "../../services/courierApi";
import AbastecimientoTimeline from "../../components/abastecimiento/AbastecimientoTimeline";
import { numeroPedidoVisible } from "./pedidoNumero";

const LIMITE = 15;

const TABS = [
  { id: "pago_enviado", label: "A validar", description: "Comprobante subido por la tienda, esperando validación del admin" },
  { id: "en_seguimiento", label: "En seguimiento", description: "Pago validado, en camino hacia el destino final" },
  { id: "pendiente_pago", label: "Pendientes de pago", description: "La tienda todavía debe pagar o reenviar el comprobante" },
  { id: "recibido", label: "Recibidos", description: "Abastecimiento completo" },
  { id: "TODOS", label: "Todos", description: "Todos los pedidos con abastecimiento" },
];

function formatGs(valor) {
  const n = Math.max(0, Math.round(Number(valor) || 0));
  return `Gs. ${n.toLocaleString("es-PY")}`;
}

function formatFecha(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PY", { timeZone: "America/Asuncion", day: "2-digit", month: "2-digit", year: "numeric" });
}

// Texto del botón "Avanzar" por estado actual — refleja 1 a 1 la máquina de
// estados del backend (services/abastecimiento/estadoMachine.js). Nunca
// depende de accion_siguiente ni del `estado` de venta del pedido: un
// pedido puede seguir en seguimiento de abastecimiento aunque ya haya
// avanzado (o incluso quedado, en datos viejos) más allá de Confirmado, y
// el admin igual tiene que poder moverlo por estos pasos.
const CTA_AVANZAR = {
  pago_validado: "Contactar proveedor",
  proveedor_contactado: "Marcar enviado por proveedor",
  enviado_por_proveedor: "Marcar en tránsito a Gesicomm",
  en_transito_a_gesicomm: "Marcar recibido en Gesicomm",
  preparando_envio_a_deposito_cliente: "Marcar despachado",
  despachado_a_deposito_cliente: "Marcar en tránsito",
};

function ctaAvanzar(envio) {
  if (envio.abastecimiento_estado === "recibido_en_gesicomm") {
    return envio.tipo_logistica_abastecimiento === "PROPIA" ? "Iniciar preparación para envío" : "Marcar disponible en Gesicomm";
  }
  return CTA_AVANZAR[envio.abastecimiento_estado] || null;
}

/**
 * Bandeja dedicada y exclusiva de abastecimiento para el admin. A diferencia
 * de la tabla general de pedidos, acá cada fila solo puede mostrar la(s)
 * acción(es) que la máquina de estados realmente permite en ese estado —
 * nunca un cambio de estado libre.
 */
export function AbastecimientoPanel({ onAbrirTimeline, refrescarKey = 0 }) {
  const [tab, setTab] = useState("pago_enviado");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], total: 0, totalPages: 1 });
  const [conteos, setConteos] = useState({});
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [timelineExpandidoId, setTimelineExpandidoId] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const payload = { page, limit: LIMITE, ...(tab === "TODOS" ? { solo_abastecimiento: true } : { abastecimiento_estado: tab }) };
      const [res, conteoRes] = await Promise.all([
        getEnviosPaginados(payload),
        getConteoPorAbastecimiento({}),
      ]);
      setData(res);
      setConteos(conteoRes || {});
    } catch (err) {
      console.error("Error cargando bandeja de abastecimiento:", err);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { cargar(); }, [cargar, refrescarKey]);

  const handleSelectTab = (id) => {
    setTab(id);
    setPage(1);
  };

  const ejecutar = async (envioId, accion) => {
    setProcesandoId(envioId);
    try {
      await accion();
      await cargar();
    } catch (err) {
      console.error("Error en acción de abastecimiento:", err);
      alert(err.response?.data?.error || err.message || "No se pudo completar la acción.");
    } finally {
      setProcesandoId(null);
    }
  };

  const handleValidar = (envio) => ejecutar(envio.id, () => validarPagoAbastecimiento(envio.id));

  const handleRechazar = (envio) => {
    const motivo = window.prompt("Motivo del rechazo (obligatorio, lo ve la tienda):", "");
    if (!motivo) return;
    ejecutar(envio.id, () => rechazarPagoAbastecimiento(envio.id, motivo));
  };

  const handleAvanzar = (envio) => ejecutar(envio.id, () => avanzarAbastecimiento(envio.id));

  const envios = data.data || [];

  return (
    <div className="pt-root">
      <div className="pt-abastecimiento-board">
        <div className="pt-abastecimiento-board__copy">
          <span>Abastecimiento Gesicom</span>
          <strong>Validación de pagos y seguimiento operativo</strong>
        </div>
        <div className="pt-abastecimiento-tabs" role="tablist" aria-label="Estados de abastecimiento">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={t.description}
                className={`pt-abastecimiento-tab ${active ? "active" : ""}`}
                onClick={() => handleSelectTab(t.id)}
              >
                <span>{t.label}</span>
                <strong>{conteos[t.id] ?? 0}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-table-wrap" style={{ marginTop: 12 }}>
        <table className="pt-table">
          <thead>
            <tr>
              <th className="pt-th pt-th-id">#</th>
              <th className="pt-th">Fecha</th>
              <th className="pt-th pt-th-num">Costo abastecimiento</th>
              <th className="pt-th">Logística</th>
              <th className="pt-th">Comprobante</th>
              <th className="pt-th">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="pt-td" colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>Cargando...</td></tr>
            ) : envios.length === 0 ? (
              <tr><td className="pt-td" colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--color-fg-muted)" }}>No hay pedidos en este estado.</td></tr>
            ) : envios.map((e) => [
              <tr
                key={e.id}
                className="pt-row"
                style={{ cursor: "pointer" }}
                onClick={() => setTimelineExpandidoId((prev) => (prev === e.id ? null : e.id))}
              >
                <td className="pt-td pt-td-id">#{numeroPedidoVisible(e)}</td>
                <td className="pt-td">{formatFecha(e.created_at)}</td>
                <td className="pt-td pt-td-num">{formatGs(e.abastecimiento_costo)}</td>
                <td className="pt-td">{e.tipo_logistica_abastecimiento || "—"}</td>
                <td className="pt-td" onClick={(ev) => ev.stopPropagation()}>
                  {e.abastecimiento_comprobante_url ? (
                    <a href={e.abastecimiento_comprobante_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <FileText size={13} /> Ver
                    </a>
                  ) : (
                    <span style={{ color: "var(--color-fg-subtle)" }}>—</span>
                  )}
                </td>
                <td className="pt-td" onClick={(ev) => ev.stopPropagation()}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {e.abastecimiento_estado === "pago_enviado" && (
                      <>
                        <button type="button" className="pt-next-action pt-next-action--success" disabled={procesandoId === e.id} onClick={() => handleValidar(e)}>
                          <CheckCircle2 size={13} /> Validar
                        </button>
                        <button type="button" className="pt-next-action pt-next-action--danger" disabled={procesandoId === e.id} onClick={() => handleRechazar(e)}>
                          Rechazar
                        </button>
                      </>
                    )}
                    {ctaAvanzar(e) && (
                      <button type="button" className="pt-next-action pt-next-action--info" disabled={procesandoId === e.id} onClick={() => handleAvanzar(e)}>
                        <Package size={13} /> {ctaAvanzar(e)}
                      </button>
                    )}
                    {e.abastecimiento_estado === "en_transito_a_deposito_cliente" && (
                      <span className="pt-next-pill pt-next-pill--info">
                        <Clock size={13} /> Esperando confirmación del cliente
                      </span>
                    )}
                    {["pendiente_pago", "pago_rechazado"].includes(e.abastecimiento_estado) && (
                      <span className="pt-next-pill pt-next-pill--danger">
                        <Clock size={13} /> {e.abastecimiento_estado === "pago_rechazado" ? "Esperando reenvío de la tienda" : "Esperando pago de la tienda"}
                      </span>
                    )}
                    {["recibido_en_deposito_cliente", "disponible_en_gesicomm"].includes(e.abastecimiento_estado) && (
                      <span className="pt-next-pill pt-next-pill--success"><CheckCircle2 size={13} /> Recibido</span>
                    )}
                    <button type="button" title="Ver seguimiento en grande" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-fg-muted)", padding: 4 }} onClick={() => onAbrirTimeline?.(e)}>
                      <History size={14} />
                    </button>
                  </div>
                </td>
              </tr>,
              timelineExpandidoId === e.id && (
                <tr key={`${e.id}-timeline`}>
                  <td className="pt-td" colSpan={6} style={{ background: "var(--color-surface-2)", padding: "1rem 1.25rem" }}>
                    <AbastecimientoTimeline envio={e} compacto esAdmin />
                  </td>
                </tr>
              ),
            ])}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span>Página {page} de {data.totalPages}</span>
          <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}
    </div>
  );
}
