import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronRight, Clock, Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { getResumenPedidos } from "../../services/courierApi";
import { formatGs } from "../../lib/courier";
import { SeguimientoPanel } from "./SeguimientoPanel";
import "./resumen-pedidos.css";

/**
 * Pestaña Resumen de Pedidos: cómo viene el período y, sobre todo, qué
 * mensajes de WhatsApp hay que mandar ahora, agrupados por fase.
 *
 * Los números del tablero y la lista de abajo salen de la MISMA lista
 * (`seguimiento.items`): el backend la arma una vez y acá solo se filtra.
 * Por eso tocar "Fase 2 · 5" abre exactamente 5 pedidos.
 *
 * La cola de trabajo reusa SeguimientoPanel (el mismo panel de la bandeja):
 * se abre sobre un pedido, y al agendar el próximo contacto pasa al siguiente.
 */

const ZONA = "America/Asuncion";
const hoyLocal = () => new Date().toLocaleDateString("sv-SE", { timeZone: ZONA });

function restarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() - dias);
  return d.toLocaleDateString("sv-SE");
}

const PERIODOS = [
  { id: "hoy", label: "Hoy", rango: () => ({ fecha_desde: hoyLocal(), fecha_hasta: hoyLocal() }) },
  { id: "7d", label: "7 días", rango: () => ({ fecha_desde: restarDias(hoyLocal(), 6), fecha_hasta: hoyLocal() }) },
  { id: "mes", label: "Este mes", rango: () => ({ fecha_desde: `${hoyLocal().slice(0, 8)}01`, fecha_hasta: hoyLocal() }) },
];

const CUANDO = [
  { id: "ahora", label: "Para enviar ahora", corto: "Ahora" },
  { id: "hoy", label: "Hoy más tarde", corto: "Hoy más tarde" },
  { id: "despues", label: "Otro día", corto: "Otro día" },
  { id: "sin_fecha", label: "Sin fecha agendada", corto: "Sin fecha" },
];

const TODAS = "todas";
const SIN_FASE = "sin_fase";

/** "hace 3 h", "en 40 min", "hace 2 días". */
function tiempoRelativo(iso, ahora = Date.now()) {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - ahora;
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  let texto;
  if (min < 1) texto = "un momento";
  else if (min < 60) texto = `${min} min`;
  else if (min < 60 * 36) texto = `${Math.round(min / 60)} h`;
  else texto = `${Math.round(min / 1440)} días`;
  return diff > 0 ? `en ${texto}` : `hace ${texto}`;
}

function horaCorta(iso) {
  return new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
}

function fechaCorta(iso) {
  return new Date(iso).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", timeZone: ZONA });
}

/** Por qué este pedido está en la lista, dicho como lo diría el operador. */
function motivoDelItem(item) {
  if (item.motivo === "nuevo") return { texto: `Pedido nuevo, entró ${tiempoRelativo(item.creado_en)}`, tono: "nuevo" };
  if (item.motivo === "vencido") return { texto: `Tocaba ${tiempoRelativo(item.recordatorio?.ejecutar_en)}`, tono: "vencido" };
  if (item.motivo === "programado") {
    const cuando = item.cuando === "hoy"
      ? `Hoy ${horaCorta(item.recordatorio.ejecutar_en)}`
      : `${fechaCorta(item.recordatorio.ejecutar_en)} ${horaCorta(item.recordatorio.ejecutar_en)}`;
    return { texto: `Agendado: ${cuando}`, tono: "programado" };
  }
  return { texto: `Último mensaje ${tiempoRelativo(item.ultimo_contacto_en)}, sin próximo agendado`, tono: "suelto" };
}

/** La fila mínima que necesita SeguimientoPanel, armada desde un ítem del resumen. */
function envioParaPanel(item) {
  return {
    id: item.envio_id,
    numero_pedido: item.numero_pedido,
    telefono: item.telefono,
    nombre_cliente: item.cliente,
    ciudad: item.ciudad,
    monto: item.monto,
    productos_texto: item.productos,
    recordatorio_id: item.recordatorio?.id || null,
    recordatorio_estado: item.recordatorio?.estado || null,
    recordatorio_ejecutar_en: item.recordatorio?.ejecutar_en || null,
    recordatorio_nota: item.recordatorio?.nota || null,
  };
}

export function ResumenTab({ servicio = getResumenPedidos, servicioSeguimiento, onIrAlTablero }) {
  const [periodo, setPeriodo] = useState("hoy");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const [seleccion, setSeleccion] = useState({ fase: TODAS, cuando: "ahora" });
  // Cola de trabajo: se congela al abrirla para que los pedidos no cambien de
  // lugar debajo del operador mientras el resumen se va actualizando.
  const [cola, setCola] = useState(null); // { items: [...], indice }
  const pedidoActual = useRef(0);

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    const pedido = ++pedidoActual.current;
    if (silencioso) setRefrescando(true); else setCargando(true);
    try {
      const rango = PERIODOS.find((p) => p.id === periodo).rango();
      const res = await servicio(rango);
      if (pedido !== pedidoActual.current) return;
      setDatos(res);
      setError(null);
    } catch (e) {
      if (pedido !== pedidoActual.current) return;
      setError(e?.response?.data?.error || "No se pudo cargar el resumen.");
    } finally {
      if (pedido === pedidoActual.current) { setCargando(false); setRefrescando(false); }
    }
  }, [periodo, servicio]);

  useEffect(() => { cargar({ silencioso: datos !== null }); }, [cargar]); // eslint-disable-line react-hooks/exhaustive-deps

  const seguimiento = datos?.seguimiento;
  const items = useMemo(() => seguimiento?.items || [], [seguimiento]);

  const itemsFiltrados = useMemo(() => items.filter((item) => {
    if (seleccion.cuando !== "todos" && item.cuando !== seleccion.cuando) return false;
    if (seleccion.fase === TODAS) return true;
    if (seleccion.fase === SIN_FASE) return !item.fase_id;
    return item.fase_id === seleccion.fase;
  }), [items, seleccion]);

  const abrirCola = (lista, indice = 0) => {
    if (lista.length === 0) return;
    setCola({ items: lista.map((item) => ({ item, envio: envioParaPanel(item) })), indice });
  };

  const cerrarCola = () => { setCola(null); cargar({ silencioso: true }); };

  const moverCola = (paso) => {
    if (!cola) return;
    const siguiente = cola.indice + paso;
    if (siguiente < 0) return;
    if (siguiente >= cola.items.length) { cerrarCola(); return; }
    setCola({ ...cola, indice: siguiente });
  };

  const enCola = cola ? cola.items[cola.indice] : null;

  if (cargando && !datos) {
    return <div className="rp-estado"><Loader2 size={18} className="animate-spin" /> Cargando resumen…</div>;
  }
  if (error && !datos) {
    return (
      <div className="rp-estado rp-estado--error" role="alert">
        <AlertCircle size={18} /> {error}
        <button type="button" className="rp-btn" onClick={() => cargar()}>Reintentar</button>
      </div>
    );
  }

  const { ventas } = datos;
  const totales = seguimiento.totales;
  const hayFlujos = seguimiento.flujos.length > 0;
  const sinFaseTotal = CUANDO.reduce((acc, c) => acc + (seguimiento.sin_fase?.[c.id] || 0), 0);
  const tituloSeleccion = (() => {
    const cuando = seleccion.cuando === "todos" ? "todos" : CUANDO.find((c) => c.id === seleccion.cuando).label.toLowerCase();
    if (seleccion.fase === TODAS) return `Todas las fases · ${cuando}`;
    if (seleccion.fase === SIN_FASE) return `Sin fase · ${cuando}`;
    const fase = seguimiento.flujos.flatMap((f) => f.fases).find((f) => f.id === seleccion.fase);
    return fase ? `Fase ${fase.orden} · ${fase.nombre} · ${cuando}` : cuando;
  })();

  return (
    <div className="rp-shell">
      {/* ── Ventas del período ── */}
      <section className="rp-bloque" aria-label="Pedidos del período">
        <header className="rp-bloque-head">
          <h2>Pedidos</h2>
          <div className="rp-head-acciones">
            <div className="rp-segmento" role="group" aria-label="Período">
              {PERIODOS.map((p) => (
                <button key={p.id} type="button" className={periodo === p.id ? "active" : ""} aria-pressed={periodo === p.id} onClick={() => setPeriodo(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
            <button type="button" className="rp-btn rp-btn--icono" onClick={() => cargar({ silencioso: true })} disabled={refrescando} title="Actualizar" aria-label="Actualizar resumen">
              <RefreshCw size={15} className={refrescando ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="rp-kpis">
          <Kpi titulo="Recibidos" dato={ventas.recibidos} destacado />
          <Kpi titulo="Por confirmar" dato={ventas.por_confirmar} tono="warning" />
          <Kpi titulo="Confirmados en curso" dato={ventas.en_curso} tono="info" />
          <Kpi titulo="Entregados" dato={ventas.entregados} tono="success" />
          <Kpi titulo="Cancelados" dato={ventas.cancelados} tono="muted" />
          <Kpi titulo="Devueltos / perdidos" dato={ventas.devueltos_perdidos} tono="danger" />
        </div>
        {onIrAlTablero && (
          <button type="button" className="rp-link" onClick={onIrAlTablero}>
            Ver todos los pedidos en el Tablero <ChevronRight size={14} />
          </button>
        )}
      </section>

      {/* ── Mensajes por enviar ── */}
      <section className="rp-bloque" aria-label="Mensajes de WhatsApp por enviar">
        <header className="rp-bloque-head">
          <div>
            <h2><MessageCircle size={17} /> Mensajes por enviar</h2>
            <p className="rp-sub">
              <strong>{totales.ahora}</strong> para enviar ahora
              {" · "}{totales.hoy} hoy más tarde
              {" · "}{totales.despues} otro día
              {" · "}{totales.sin_fecha} sin fecha
            </p>
          </div>
          <button
            type="button"
            className="rp-btn rp-btn--primario"
            disabled={totales.ahora === 0}
            onClick={() => abrirCola(items.filter((i) => i.cuando === "ahora"))}
          >
            <Send size={15} /> {totales.ahora === 0 ? "Nada para enviar ahora" : `Empezar a enviar (${totales.ahora})`}
          </button>
        </header>

        {seguimiento.truncado && (
          <p className="rp-aviso" role="status">
            Hay más pedidos pendientes de los que entran acá: se muestran los 500 más recientes.
          </p>
        )}

        {!hayFlujos ? (
          <div className="rp-vacio">
            <p>Todavía no tenés un flujo de mensajes. Con un flujo, acá vas a ver qué mensaje le toca a cada pedido.</p>
            <Link to="/pedidos/configuracion" className="rp-btn rp-btn--primario">Crear mi primer flujo</Link>
          </div>
        ) : (
          seguimiento.flujos.map((flujo) => (
            <div key={flujo.id} className="rp-flujo">
              {seguimiento.flujos.length > 1 && <h3 className="rp-flujo-nombre">{flujo.nombre}</h3>}
              <div className="rp-fases">
                {flujo.fases.map((fase) => (
                  <FaseCard
                    key={fase.id}
                    titulo={`Fase ${fase.orden}`}
                    nombre={fase.nombre}
                    conteo={fase}
                    seleccion={seleccion.fase === fase.id ? seleccion.cuando : null}
                    onElegir={(cuando) => setSeleccion({ fase: fase.id, cuando })}
                  />
                ))}
                {sinFaseTotal > 0 && flujo === seguimiento.flujos[seguimiento.flujos.length - 1] && (
                  <FaseCard
                    titulo="Sin fase"
                    nombre="Flujo terminado o sin flujo"
                    conteo={seguimiento.sin_fase}
                    seleccion={seleccion.fase === SIN_FASE ? seleccion.cuando : null}
                    onElegir={(cuando) => setSeleccion({ fase: SIN_FASE, cuando })}
                  />
                )}
              </div>
            </div>
          ))
        )}

        {/* ── La lista de la que salen los números ── */}
        {hayFlujos && (
          <div className="rp-cola">
            <div className="rp-cola-head">
              <h3>{tituloSeleccion} <span className="rp-cuenta">{itemsFiltrados.length}</span></h3>
              <div className="rp-chips" role="group" aria-label="Filtrar la lista">
                <button type="button" className={seleccion.fase === TODAS ? "active" : ""} onClick={() => setSeleccion((s) => ({ ...s, fase: TODAS }))}>
                  Todas las fases
                </button>
                {CUANDO.map((c) => (
                  <button key={c.id} type="button" className={seleccion.cuando === c.id ? "active" : ""} onClick={() => setSeleccion((s) => ({ ...s, cuando: c.id }))}>
                    {c.corto}
                  </button>
                ))}
                <button type="button" className={seleccion.cuando === "todos" ? "active" : ""} onClick={() => setSeleccion((s) => ({ ...s, cuando: "todos" }))}>
                  Todos
                </button>
              </div>
            </div>

            {itemsFiltrados.length === 0 ? (
              <p className="rp-cola-vacia">
                {seleccion.cuando === "ahora" ? "No hay mensajes para enviar ahora en esta selección." : "No hay pedidos en esta selección."}
              </p>
            ) : (
              <ul className="rp-lista">
                {itemsFiltrados.map((item, indice) => {
                  const motivo = motivoDelItem(item);
                  return (
                    <li key={item.envio_id}>
                      <button type="button" className="rp-fila" onClick={() => abrirCola(itemsFiltrados, indice)}>
                        <span className="rp-fila-principal">
                          <strong>{item.cliente}</strong>
                          <span className="rp-fila-pedido">#{item.numero_pedido}</span>
                          {item.fase_orden && <span className="rp-fila-fase">Fase {item.fase_orden} · {item.fase_nombre}</span>}
                        </span>
                        <span className="rp-fila-detalle">
                          {[item.productos, item.monto > 0 ? formatGs(item.monto) : null, item.ciudad].filter(Boolean).join(" · ") || "Sin detalle"}
                        </span>
                        <span className={`rp-fila-motivo rp-fila-motivo--${motivo.tono}`}>
                          <Clock size={12} /> {motivo.texto}
                        </span>
                        <span className="rp-fila-accion">
                          {item.telefono ? <>Abrir <ChevronRight size={14} /></> : "Sin teléfono"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      <SeguimientoPanel
        open={!!enCola}
        envio={enCola?.envio || null}
        faseSugeridaId={enCola?.item.fase_id || null}
        cola={enCola ? {
          posicion: cola.indice + 1,
          total: cola.items.length,
          onSiguiente: () => moverCola(1),
          onAnterior: () => moverCola(-1),
        } : null}
        onClose={cerrarCola}
        onRefreshPedido={() => cargar({ silencioso: true })}
        {...(servicioSeguimiento ? { servicio: servicioSeguimiento } : {})}
      />
    </div>
  );
}

function Kpi({ titulo, dato, tono = "default", destacado = false }) {
  return (
    <div className={`rp-kpi rp-kpi--${tono} ${destacado ? "rp-kpi--destacado" : ""}`}>
      <span className="rp-kpi-titulo">{titulo}</span>
      <strong className="rp-kpi-numero">{(dato?.cantidad || 0).toLocaleString("es-PY")}</strong>
      <span className="rp-kpi-monto">{formatGs(dato?.monto || 0)}</span>
    </div>
  );
}

/**
 * Una fase del tablero. El número grande es lo que hay que mandar ahora; los
 * tres de abajo, lo que viene. Cada uno filtra la lista de abajo.
 */
function FaseCard({ titulo, nombre, conteo, seleccion, onElegir }) {
  const urgente = conteo.ahora > 0;
  return (
    <article className={`rp-fase ${urgente ? "rp-fase--urgente" : ""} ${seleccion ? "rp-fase--activa" : ""}`}>
      <header>
        <span className="rp-fase-titulo">{titulo}</span>
        <span className="rp-fase-nombre" title={nombre}>{nombre}</span>
      </header>
      <button
        type="button"
        className={`rp-fase-ahora ${seleccion === "ahora" ? "active" : ""}`}
        aria-pressed={seleccion === "ahora"}
        onClick={() => onElegir("ahora")}
      >
        <strong>{conteo.ahora}</strong>
        <span>para enviar ahora</span>
      </button>
      <div className="rp-fase-resto">
        {CUANDO.slice(1).map((c) => (
          <button
            key={c.id}
            type="button"
            className={seleccion === c.id ? "active" : ""}
            aria-pressed={seleccion === c.id}
            onClick={() => onElegir(c.id)}
          >
            <strong>{conteo[c.id]}</strong> {c.corto.toLowerCase()}
          </button>
        ))}
      </div>
    </article>
  );
}
