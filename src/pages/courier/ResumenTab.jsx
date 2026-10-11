import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Clock, Loader2, MessageCircle, PhoneOff, RefreshCw, Search, Send, X } from "lucide-react";
import { getPendientesSeguimiento, getResumenPedidos, getTableroSeguimiento } from "../../services/courierApi";
import { seguimientoService } from "../../services/seguimiento.service";
import { formatGs } from "../../lib/courier";
import { SeguimientoPanel } from "./SeguimientoPanel";
import "./resumen-pedidos.css";

/**
 * Pestaña Resumen de Pedidos: cómo viene el período y un tablero Kanban con
 * los mensajes de WhatsApp por enviar, una columna por fase del flujo.
 *
 * - Cada tarjeta es un pedido en la fase en la que está. Se toca para abrir
 *   el mismo SeguimientoPanel de la bandeja, ya parado en esa fase.
 * - Arriba se elige la etapa (confirmación web, venta por WhatsApp,
 *   seguimiento de envío, escalamiento de ventas). A qué etapa pertenece un
 *   pedido lo decide su estado: cambia solo cuando el pedido se confirma o
 *   se entrega.
 * - Vencido = tenía un recordatorio, ya le pasó la hora y el mensaje sigue
 *   sin marcarse como enviado. Se ve en rojo en la tarjeta, en la columna y
 *   en la pestaña de la etapa, y tiene su propio filtro.
 * - Cada tarjeta tiene sus dos pasos a la vista: "Enviar mensaje" (abre
 *   WhatsApp con el mensaje de esa fase) y, recién después, "Marcar como
 *   enviado", que es lo que mueve al pedido a la columna siguiente.
 * - Buscar, filtrar y paginar lo hace el backend: acá no se filtra ni se
 *   corta ninguna lista. Cada columna tiene su propia página.
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
  { id: "", label: "Todos" },
  { id: "vencido", label: "Vencidos" },
  { id: "ahora", label: "Para enviar ahora" },
  { id: "hoy", label: "Hoy más tarde" },
  { id: "despues", label: "Otro día" },
  { id: "sin_fecha", label: "Sin fecha" },
];

const REGISTROS_POR_PAGINA = [10, 20, 50];
const TAMANO_COLA = 50;

const SERVICIOS = {
  resumen: getResumenPedidos,
  tablero: getTableroSeguimiento,
  pendientes: getPendientesSeguimiento,
  enviarMensaje: seguimientoService.crearContacto,
  completarFase: seguimientoService.completarFase,
};

/** "hace 3 h", "en 40 min", "hace 2 días". */
function tiempoRelativo(iso, ahora = Date.now()) {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - ahora;
  const min = Math.round(Math.abs(diff) / 60000);
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

/** Por qué este pedido está donde está, dicho como lo diría el operador. */
function motivoDelItem(item) {
  const toca = item.toca_en || item.recordatorio?.ejecutar_en;
  if (item.motivo === "vencido") return { texto: `Tocaba ${tiempoRelativo(toca)}`, tono: "vencido" };
  if (item.motivo === "nuevo") {
    if (item.etapa === "ESCALAMIENTO_VENTAS") return { texto: `Entregado ${tiempoRelativo(item.entregado_en)}`, tono: "nuevo" };
    if (item.etapa === "SEGUIMIENTO_ENVIO") return { texto: `${item.estado}, sin avisos enviados`, tono: "nuevo" };
    return { texto: `Entró ${tiempoRelativo(item.creado_en)}`, tono: "nuevo" };
  }
  if (item.motivo === "programado" && toca) {
    const cuando = item.cuando === "hoy" ? `Hoy ${horaCorta(toca)}` : `${fechaCorta(toca)} ${horaCorta(toca)}`;
    return { texto: `${item.recordatorio ? "Agendado" : "Toca"}: ${cuando}`, tono: "programado" };
  }
  return { texto: "Sin próximo contacto agendado", tono: "suelto" };
}

/** La fila mínima que necesita SeguimientoPanel, armada desde una tarjeta. */
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

export function ResumenTab({ servicios = SERVICIOS, servicioSeguimiento, onIrAlTablero }) {
  // ── Pedidos del período ──
  const [periodo, setPeriodo] = useState("hoy");
  const [ventas, setVentas] = useState(null);
  const [errorVentas, setErrorVentas] = useState(null);

  // ── Tablero: todo esto viaja al backend, que es quien filtra y pagina ──
  const [etapa, setEtapa] = useState("CONFIRMACION_PEDIDO_WEB");
  const [flujoId, setFlujoId] = useState(null);
  const [cuando, setCuando] = useState("");
  const [busquedaEscrita, setBusquedaEscrita] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [limite, setLimite] = useState(REGISTROS_POR_PAGINA[0]);
  const [paginas, setPaginas] = useState({});
  const [tablero, setTablero] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  // Pedido con una acción de tarjeta en curso (enviar o marcar).
  const [ocupada, setOcupada] = useState(null);

  // Cola de trabajo: se congela al abrirla para que los pedidos no cambien
  // de lugar debajo del operador mientras el tablero se va actualizando.
  const [cola, setCola] = useState(null); // { items: [{ item, envio }], indice }
  const [armandoCola, setArmandoCola] = useState(false);
  const pedidoTablero = useRef(0);

  useEffect(() => {
    let vigente = true;
    servicios.resumen(PERIODOS.find((p) => p.id === periodo).rango())
      .then((res) => { if (vigente) { setVentas(res.ventas); setErrorVentas(null); } })
      .catch(() => { if (vigente) setErrorVentas("No se pudieron cargar los pedidos del período."); });
    return () => { vigente = false; };
  }, [periodo, servicios]);

  // La búsqueda se manda cuando se deja de escribir, no en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => { setBusqueda(busquedaEscrita.trim()); setPaginas({}); }, 350);
    return () => clearTimeout(t);
  }, [busquedaEscrita]);

  const cargarTablero = useCallback(async () => {
    const pedido = ++pedidoTablero.current;
    setCargando(true);
    try {
      const res = await servicios.tablero({
        etapa,
        ...(flujoId ? { flujo_id: flujoId } : {}),
        ...(cuando ? { cuando } : {}),
        ...(busqueda ? { busqueda } : {}),
        limit: limite,
        paginas,
      });
      if (pedido !== pedidoTablero.current) return;
      setTablero(res);
      setError(null);
    } catch (e) {
      if (pedido !== pedidoTablero.current) return;
      setError(e?.response?.data?.error || "No se pudo cargar el tablero.");
    } finally {
      if (pedido === pedidoTablero.current) setCargando(false);
    }
  }, [servicios, etapa, flujoId, cuando, busqueda, limite, paginas]);

  useEffect(() => { cargarTablero(); }, [cargarTablero]);

  const cambiarFiltro = (aplicar) => { aplicar(); setPaginas({}); };

  /** Cada etapa tiene sus propios flujos: al cambiarla se vuelve al principal. */
  const cambiarEtapa = (tipo) => { setEtapa(tipo); setFlujoId(null); setPaginas({}); };

  const abrirCola = (items, indice = 0) => {
    if (items.length === 0) return;
    setCola({ items: items.map((item) => ({ item, envio: envioParaPanel(item) })), indice });
  };

  const cerrarCola = () => { setCola(null); cargarTablero(); };

  const moverCola = (paso) => {
    if (!cola) return;
    const siguiente = cola.indice + paso;
    if (siguiente < 0) return;
    if (siguiente >= cola.items.length) { cerrarCola(); return; }
    setCola({ ...cola, indice: siguiente });
  };

  /** "Empezar a enviar": la cola la arma el backend, ya filtrada y paginada. */
  const empezarAEnviar = async () => {
    setArmandoCola(true);
    try {
      const res = await servicios.pendientes({
        etapa,
        ...(tablero?.flujo_id ? { flujo_id: tablero.flujo_id } : {}),
        cuando: "ahora",
        page: 1,
        limit: TAMANO_COLA,
      });
      abrirCola(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "No se pudo armar la cola de envío.");
    } finally {
      setArmandoCola(false);
    }
  };

  /**
   * Paso 1 de la tarjeta: abre WhatsApp con el mensaje de la fase en la que
   * está el pedido. No lo mueve de columna: eso es el paso 2.
   */
  const enviarMensaje = async (item) => {
    setOcupada(item.envio_id);
    try {
      const res = await servicios.enviarMensaje(item.envio_id, { fase_id: item.fase_id, telefono: item.telefono });
      if (res?.whatsapp_url) window.open(res.whatsapp_url, "_blank");
      await cargarTablero();
    } catch (e) {
      setError(e?.response?.data?.error || "No se pudo abrir WhatsApp para este pedido.");
    } finally {
      setOcupada(null);
    }
  };

  /** Paso 2: el operador confirma que lo mandó, y el pedido pasa a la fase siguiente. */
  const marcarEnviado = async (item) => {
    setOcupada(item.envio_id);
    try {
      await servicios.completarFase(item.envio_id, item.fase_id);
      await cargarTablero();
    } catch (e) {
      setError(e?.response?.data?.error || "No se pudo marcar el mensaje como enviado.");
    } finally {
      setOcupada(null);
    }
  };

  const enCola = cola ? cola.items[cola.indice] : null;
  const totales = tablero?.totales || { ahora: 0, hoy: 0, despues: 0, sin_fecha: 0 };
  const vencidos = tablero?.vencidos || 0;
  const flujos = tablero?.flujos || [];
  const etapas = tablero?.etapas || [];
  const etapaActual = etapas.find((e) => e.tipo === etapa);
  const hayFiltros = Boolean(cuando || busqueda);

  return (
    <div className="rp-shell">
      {/* ── Pedidos del período ── */}
      <section className="rp-bloque" aria-label="Pedidos del período">
        <header className="rp-bloque-head">
          <h2>Pedidos</h2>
          <div className="rp-segmento" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button key={p.id} type="button" className={periodo === p.id ? "active" : ""} aria-pressed={periodo === p.id} onClick={() => setPeriodo(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {errorVentas ? (
          <p className="rp-aviso rp-aviso--error" role="alert">{errorVentas}</p>
        ) : (
          <div className="rp-kpis" aria-busy={!ventas}>
            <Kpi titulo="Recibidos" dato={ventas?.recibidos} destacado />
            <Kpi titulo="Por confirmar" dato={ventas?.por_confirmar} tono="warning" />
            <Kpi titulo="Confirmados en curso" dato={ventas?.en_curso} tono="info" />
            <Kpi titulo="Entregados" dato={ventas?.entregados} tono="success" />
            <Kpi titulo="Cancelados" dato={ventas?.cancelados} tono="muted" />
            <Kpi titulo="Devueltos / perdidos" dato={ventas?.devueltos_perdidos} tono="danger" />
          </div>
        )}
        {onIrAlTablero && (
          <button type="button" className="rp-link" onClick={onIrAlTablero}>
            Ver todos los pedidos en el Tablero <ChevronRight size={14} />
          </button>
        )}
      </section>

      {/* ── Kanban de mensajes por enviar ── */}
      <section className="rp-bloque" aria-label="Mensajes de WhatsApp por enviar">
        <header className="rp-bloque-head">
          <div>
            <h2><MessageCircle size={17} /> Mensajes por enviar</h2>
            <p className="rp-sub">
              <strong>{totales.ahora}</strong> para enviar ahora
              {vencidos > 0 && <> (<span className="rp-vencidos">{vencidos} {vencidos === 1 ? "vencido" : "vencidos"}</span>)</>}
              {" · "}{totales.hoy} hoy más tarde
              {" · "}{totales.despues} otro día
              {" · "}{totales.sin_fecha} sin fecha
            </p>
          </div>
          <div className="rp-head-acciones">
            <button type="button" className="rp-btn rp-btn--icono" onClick={cargarTablero} disabled={cargando} title="Actualizar" aria-label="Actualizar tablero">
              <RefreshCw size={15} className={cargando ? "animate-spin" : ""} />
            </button>
            <button type="button" className="rp-btn rp-btn--primario" disabled={totales.ahora === 0 || armandoCola} onClick={empezarAEnviar}>
              {armandoCola ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {totales.ahora === 0 ? "Nada para enviar ahora" : `Empezar a enviar (${totales.ahora})`}
            </button>
          </div>
        </header>

        {/* Etapa: a cuál pertenece cada pedido lo decide su estado */}
        {etapas.length > 0 && (
          <div className="rp-etapas" role="tablist" aria-label="Etapa del seguimiento">
            {etapas.map((e) => (
              <button
                key={e.tipo}
                type="button"
                role="tab"
                aria-selected={etapa === e.tipo}
                className={etapa === e.tipo ? "active" : ""}
                onClick={() => cambiarEtapa(e.tipo)}
              >
                {e.nombre} <span className="rp-etapa-cuenta">{e.pedidos}</span>
                {e.vencidos > 0 && (
                  <span className="rp-etapa-vencidos" title={`${e.vencidos} ${e.vencidos === 1 ? "mensaje vencido" : "mensajes vencidos"} sin enviar`}>
                    <AlertCircle size={12} aria-hidden="true" /> {e.vencidos} {e.vencidos === 1 ? "vencido" : "vencidos"}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {etapaActual?.descripcion && <p className="rp-etapa-descripcion">{etapaActual.descripcion}</p>}

        {/* Filtros: todos se resuelven en el backend */}
        <div className="rp-filtros">
          {flujos.length > 1 && (
            <label className="rp-campo">
              <span>Flujo</span>
              <select value={tablero?.flujo_id || ""} onChange={(e) => cambiarFiltro(() => setFlujoId(Number(e.target.value)))}>
                {flujos.map((f) => <option key={f.id} value={f.id}>{f.nombre} ({f.pendientes})</option>)}
              </select>
            </label>
          )}
          <label className="rp-campo rp-campo--buscar">
            <span className="rp-solo-lector">Buscar</span>
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar cliente, teléfono o nro. de pedido"
              value={busquedaEscrita}
              onChange={(e) => setBusquedaEscrita(e.target.value)}
            />
            {busquedaEscrita && (
              <button type="button" onClick={() => setBusquedaEscrita("")} aria-label="Borrar búsqueda"><X size={13} /></button>
            )}
          </label>
          <div className="rp-chips" role="group" aria-label="Filtrar por cuándo toca">
            {CUANDO.map((c) => (
              <button
                key={c.id || "todos"}
                type="button"
                className={`${cuando === c.id ? "active" : ""} ${c.id === "vencido" && vencidos > 0 ? "rp-chip--alerta" : ""}`}
                aria-pressed={cuando === c.id}
                onClick={() => cambiarFiltro(() => setCuando(c.id))}
              >
                {c.label}{c.id === "vencido" ? ` ${vencidos}` : ""}
              </button>
            ))}
          </div>
          <label className="rp-campo rp-campo--chico">
            <span>Por columna</span>
            <select value={limite} onChange={(e) => cambiarFiltro(() => setLimite(Number(e.target.value)))} aria-label="Registros por página">
              {REGISTROS_POR_PAGINA.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        {tablero?.truncado && (
          <p className="rp-aviso" role="status">
            Hay más pedidos pendientes de los que entran en el tablero: se están evaluando los 2.000 más recientes.
          </p>
        )}
        {error && (
          <p className="rp-aviso rp-aviso--error" role="alert">
            <AlertCircle size={15} /> {error}
            <button type="button" className="rp-link" onClick={cargarTablero}>Reintentar</button>
          </p>
        )}

        {!tablero && cargando ? (
          <div className="rp-estado"><Loader2 size={18} className="animate-spin" /> Cargando tablero…</div>
        ) : tablero && tablero.columnas.length === 0 ? (
          <div className="rp-vacio">
            <p>Esta etapa no tiene un flujo activo. Activá o creá uno para ver en qué mensaje está cada pedido.</p>
            <Link to="/pedidos/configuracion" className="rp-btn rp-btn--primario">Ir a Flujos de WhatsApp</Link>
          </div>
        ) : tablero ? (
          <div className="kanban-board rp-kanban" aria-busy={cargando}>
            {tablero.columnas.map((columna) => (
              <Columna
                key={columna.clave}
                columna={columna}
                hayFiltros={hayFiltros}
                ocupada={ocupada}
                onAbrir={(indice) => abrirCola(columna.data, indice)}
                onEnviar={enviarMensaje}
                onMarcarEnviado={marcarEnviado}
                onPagina={(page) => setPaginas((actual) => ({ ...actual, [columna.clave]: page }))}
              />
            ))}
          </div>
        ) : null}
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
        onRefreshPedido={cargarTablero}
        {...(servicioSeguimiento ? { servicio: servicioSeguimiento } : {})}
      />
    </div>
  );
}

function Kpi({ titulo, dato, tono = "default", destacado = false }) {
  return (
    <div className={`rp-kpi rp-kpi--${tono} ${destacado ? "rp-kpi--destacado" : ""}`}>
      <span className="rp-kpi-titulo">{titulo}</span>
      <strong className="rp-kpi-numero">{dato ? dato.cantidad.toLocaleString("es-PY") : "–"}</strong>
      <span className="rp-kpi-monto">{dato ? formatGs(dato.monto) : " "}</span>
    </div>
  );
}

/** Una fase del flujo: sus pedidos (la página que mandó el backend) y su paginador. */
function Columna({ columna, hayFiltros, ocupada, onAbrir, onEnviar, onMarcarEnviado, onPagina }) {
  const { conteo, data, total, page, totalPages, limit } = columna;
  const enLaFase = conteo.ahora + conteo.hoy + conteo.despues + conteo.sin_fecha;
  const desde = total === 0 ? 0 : (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);
  const titulo = columna.orden ? `Fase ${columna.orden}` : "Sin fase";

  return (
    <section className={`kanban-column rp-columna ${conteo.ahora > 0 ? "rp-columna--urgente" : ""} ${columna.vencidos > 0 ? "rp-columna--vencida" : ""}`} aria-label={`${titulo}: ${columna.nombre}`}>
      <div className="kanban-col-header">
        <h3 className="kanban-col-title">
          <span className="rp-columna-fase">{titulo}</span>
          <span className="rp-columna-nombre" title={columna.nombre}>{columna.nombre}</span>
        </h3>
        <span className="kanban-col-count" title="Pedidos en esta fase">{enLaFase}</span>
      </div>
      <p className="rp-columna-sub">
        <strong>{conteo.ahora}</strong> para enviar ahora
        {columna.vencidos > 0 && <> · <span className="rp-vencidos">{columna.vencidos} {columna.vencidos === 1 ? "vencido" : "vencidos"}</span></>}
        {conteo.hoy > 0 && <> · {conteo.hoy} hoy</>}
        {conteo.despues > 0 && <> · {conteo.despues} otro día</>}
        {conteo.sin_fecha > 0 && <> · {conteo.sin_fecha} sin fecha</>}
      </p>

      <div className="kanban-cards">
        {data.length === 0 ? (
          <p className="rp-columna-vacia">
            {hayFiltros && enLaFase > 0 ? "Ningún pedido de esta fase coincide con el filtro." : "Ningún pedido en esta fase."}
          </p>
        ) : data.map((item, indice) => (
          <Tarjeta
            key={item.envio_id}
            item={item}
            ocupada={ocupada === item.envio_id}
            onAbrir={() => onAbrir(indice)}
            onEnviar={() => onEnviar(item)}
            onMarcarEnviado={() => onMarcarEnviado(item)}
          />
        ))}
      </div>

      {total > 0 && (
        <footer className="rp-paginador" aria-label={`Páginas de ${titulo}`}>
          <button type="button" onClick={() => onPagina(page - 1)} disabled={page <= 1} aria-label="Página anterior"><ChevronLeft size={15} /></button>
          <span>{desde}–{hasta} de {total}</span>
          <button type="button" onClick={() => onPagina(page + 1)} disabled={page >= totalPages} aria-label="Página siguiente"><ChevronRight size={15} /></button>
        </footer>
      )}
    </section>
  );
}

/**
 * Un pedido en su fase, con sus dos pasos en la tarjeta:
 *  1. "Enviar mensaje": abre WhatsApp con el mensaje de esa fase.
 *  2. "Marcar como enviado": se habilita después del paso 1 y es lo que
 *     pasa el pedido a la columna siguiente. Lo confirma la persona porque
 *     el sistema no puede saber si el mensaje salió.
 * Tocar el cuerpo de la tarjeta abre el panel completo (vista previa del
 * mensaje, recordatorio, etiquetas, otras fases).
 */
function Tarjeta({ item, ocupada, onAbrir, onEnviar, onMarcarEnviado }) {
  const enviado = Boolean(item.fase_abierta_en);
  const motivo = motivoDelItem(item);
  const detalle = [item.productos, item.monto > 0 ? formatGs(item.monto) : null].filter(Boolean).join(" · ");

  return (
    <article className={`rp-tarjeta rp-tarjeta--${item.cuando} ${item.motivo === "vencido" ? "rp-tarjeta--vencido" : ""}`}>
      <button type="button" className="rp-tarjeta-cuerpo" onClick={onAbrir} aria-label={`Pedido ${item.numero_pedido}, ${item.cliente}: abrir para enviar el mensaje`}>
        <span className="rp-tarjeta-top">
          <strong>#{item.numero_pedido}</strong>
          <span className="rp-tarjeta-cliente">{item.cliente}</span>
        </span>
        {detalle && <span className="rp-tarjeta-detalle">{detalle}</span>}
        <span className="rp-tarjeta-pie">
          <span className={`rp-tarjeta-motivo rp-tarjeta-motivo--${motivo.tono}`}><Clock size={12} /> {motivo.texto}</span>
          {!item.telefono && <span className="rp-tarjeta-sintel"><PhoneOff size={12} /> Sin teléfono</span>}
        </span>
      </button>

      {item.fase_id && (
        <div className={`rp-tarjeta-acciones ${enviado ? "rp-tarjeta-acciones--enviado" : ""}`}>
          {enviado && <span className="rp-tarjeta-aviso">WhatsApp abierto {tiempoRelativo(item.fase_abierta_en)}. ¿Lo enviaste?</span>}
          <div className="rp-tarjeta-botones">
            <button
              type="button"
              className={`rp-accion ${enviado ? "" : "rp-accion--principal"}`}
              onClick={onEnviar}
              disabled={ocupada || !item.telefono}
              title={item.telefono ? "Abrir WhatsApp con el mensaje de esta fase" : "El pedido no tiene teléfono"}
            >
              {ocupada && !enviado ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {enviado ? "Reenviar" : "Enviar mensaje"}
            </button>
            <button
              type="button"
              className={`rp-accion ${enviado ? "rp-accion--principal" : ""}`}
              onClick={onMarcarEnviado}
              disabled={ocupada || !enviado}
              title={enviado ? "Confirmar que lo mandaste: el pedido pasa a la fase siguiente" : "Primero enviá el mensaje"}
            >
              {ocupada && enviado ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Marcar como enviado
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
