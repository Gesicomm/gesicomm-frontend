import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, MapPin, Pencil, Plus, Save, Search, Trash2, Users } from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";
import ConfirmDialog from "../../components/ConfirmDialog";
import { CourierWizard, VehiculoIcon, iniciales, rangoLabel } from "./CourierWizard";

function zonaKey(departamento, ciudad) {
  return `${String(departamento || "").trim().toLowerCase()}::${String(ciudad || "").trim().toLowerCase()}`;
}

function normalizarRegla(regla) {
  return {
    departamento: regla.departamento || "",
    ciudad: regla.ciudad || "",
    ciudad_id: regla.ciudad_id || null,
    departamento_id: regla.departamento_id || null,
    pais_id: regla.pais_id || null,
    tipo_cobertura: regla.tipo_cobertura || "CIUDAD",
    courier_id: regla.courier_id ? String(regla.courier_id) : "",
    tipo_pago: regla.tipo_pago || "Ambos",
    rango_min: Number(regla.rango_min) || 0,
    rango_max: regla.rango_max === null || regla.rango_max === undefined ? "" : regla.rango_max,
    costo: Number(regla.costo) || 0,
    tiempo_entrega_hs: regla.tiempo_entrega_hs || "",
    activo: regla.activo !== false,
  };
}

function reglasDesdeZonas(zonas) {
  return (zonas || []).map(normalizarRegla);
}

function paraApi(filas) {
  return filas
    .filter(f => f.ciudad.trim())
    .map(f => ({
      departamento: f.departamento.trim() || null,
      ciudad: f.ciudad.trim(),
      ciudad_id: f.ciudad_id || null,
      departamento_id: f.departamento_id || null,
      pais_id: f.pais_id || null,
      tipo_cobertura: f.tipo_cobertura || "CIUDAD",
      courier_id: f.courier_id || null,
      tipo_pago: f.tipo_pago || "Ambos",
      rango_min: Number(f.rango_min) || 0,
      rango_max: f.rango_max === "" || f.rango_max === null ? null : Number(f.rango_max),
      costo: Number(f.costo) || 0,
      tiempo_entrega_hs: f.tiempo_entrega_hs?.trim() || null,
      activo: f.activo !== false,
    }));
}

// Firma estable para detectar retoques sin guardar en la grilla: el alta y la
// edición por asistente persisten solas, pero los ajustes en línea (costo,
// tiempo, activo) se acumulan hasta que el usuario confirma.
function firmaReglas(filas) {
  return JSON.stringify(
    paraApi(filas).map(f => JSON.stringify(f)).sort()
  );
}

// Un tramo de cantidad definido solo para un tipo de pago deja un agujero: al
// cotizar, elegirTarifa exige coincidencia exacta de ciudad + tipo de pago +
// cantidad, así que ese caso no autocompleta nada y el flete hay que cargarlo
// a mano en cada pedido.
function huecosDeCobertura(reglas) {
  const ciudades = new Map();
  reglas.forEach(regla => {
    if (regla.activo === false) return;
    const clave = zonaKey(regla.departamento, regla.ciudad);
    if (!ciudades.has(clave)) ciudades.set(clave, { ciudad: regla.ciudad, tramos: new Map() });
    const tramos = ciudades.get(clave).tramos;
    const tramo = `${Number(regla.rango_min) || 0}-${regla.rango_max === "" ? "" : Number(regla.rango_max)}`;
    if (!tramos.has(tramo)) tramos.set(tramo, { regla, pagos: new Set() });
    tramos.get(tramo).pagos.add(regla.tipo_pago || "Ambos");
  });

  const avisos = [];
  ciudades.forEach(({ ciudad, tramos }) => {
    tramos.forEach(({ regla, pagos }) => {
      if (pagos.has("Ambos")) return;
      ["Al Recibir", "Anticipado"].forEach(tipo => {
        if (pagos.has(tipo)) return;
        avisos.push(`${ciudad}: ${rangoLabel(regla).toLowerCase()} no tiene tarifa "${tipo}"`);
      });
    });
  });
  return avisos;
}

export function DeliveryPanel({
  zonas = [],
  couriers = [],
  enviosCountByCourier = {},
  esAdmin = false,
  onSaveZonas,
  onCreateCourier,
  onUpdateCourier,
  onDeleteCourier,
}) {
  const [filas, setFilas] = useState([]);
  const [baseline, setBaseline] = useState("[]");
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [agrupacion, setAgrupacion] = useState("courier");
  const [wizard, setWizard] = useState(null);
  const [courierABorrar, setCourierABorrar] = useState(null);

  useEffect(() => {
    const base = reglasDesdeZonas(zonas);
    setFilas(base);
    setBaseline(firmaReglas(base));
  }, [zonas]);

  const hayCambios = firmaReglas(filas) !== baseline;

  const reglasPorCourier = useMemo(() => {
    const acc = new Map();
    filas.forEach((fila, index) => {
      if (!fila.ciudad?.trim()) return;
      const key = fila.courier_id || "";
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push({ ...fila, index });
    });
    return acc;
  }, [filas]);

  const gruposCourier = useMemo(() => {
    const ordenar = reglas => [...reglas].sort((a, b) => {
      const ciudad = a.ciudad.localeCompare(b.ciudad, "es");
      return ciudad || (Number(a.rango_min) || 0) - (Number(b.rango_min) || 0);
    });

    const grupos = couriers.map(c => ({
      key: String(c.id),
      courier: c,
      reglas: ordenar(reglasPorCourier.get(String(c.id)) || []),
    }));

    // Reglas cuyo courier ya no existe (o que nunca tuvieron uno) se muestran
    // aparte para que se puedan reasignar en vez de desaparecer.
    const sinCourier = Array.from(reglasPorCourier.entries())
      .filter(([key]) => !key || !couriers.some(c => String(c.id) === key))
      .flatMap(([, reglas]) => reglas);

    if (sinCourier.length > 0) {
      grupos.push({ key: "", courier: null, reglas: ordenar(sinCourier) });
    }
    return grupos;
  }, [couriers, reglasPorCourier]);

  const gruposCiudad = useMemo(() => {
    const map = new Map();
    filas.forEach((fila, index) => {
      if (!fila.ciudad?.trim()) return;
      const key = zonaKey(fila.departamento, fila.ciudad);
      if (!map.has(key)) {
        map.set(key, { key, departamento: fila.departamento || "", ciudad: fila.ciudad, reglas: [] });
      }
      map.get(key).reglas.push({ ...fila, index });
    });

    return Array.from(map.values())
      .map(grupo => ({
        ...grupo,
        reglas: grupo.reglas.sort((a, b) => (Number(a.rango_min) || 0) - (Number(b.rango_min) || 0)),
      }))
      .sort((a, b) => {
        const dep = a.departamento.localeCompare(b.departamento, "es");
        return dep || a.ciudad.localeCompare(b.ciudad, "es");
      });
  }, [filas]);

  const porCourier = agrupacion === "courier";
  const q = busqueda.trim().toLowerCase();

  const gruposCourierFiltrados = useMemo(() => {
    if (!q) return gruposCourier;
    return gruposCourier.filter(grupo => {
      const nombre = grupo.courier?.nombre || "sin courier";
      return nombre.toLowerCase().includes(q)
        || grupo.reglas.some(r => `${r.ciudad} ${r.departamento}`.toLowerCase().includes(q));
    });
  }, [gruposCourier, q]);

  const gruposCiudadFiltrados = useMemo(() => {
    if (!q) return gruposCiudad;
    return gruposCiudad.filter(grupo => `${grupo.ciudad} ${grupo.departamento}`.toLowerCase().includes(q));
  }, [gruposCiudad, q]);

  function courierNombre(id) {
    if (!id) return "Sin courier";
    return couriers.find(c => String(c.id) === String(id))?.nombre || "Courier no disponible";
  }

  function ciudadesDe(courierId) {
    const reglas = reglasPorCourier.get(String(courierId)) || [];
    return new Set(reglas.map(r => zonaKey(r.departamento, r.ciudad))).size;
  }

  function abrirNuevoCourier() {
    setWizard({ courier: null, reglas: [], paso: "courier" });
  }

  function abrirEditarCourier(courier, paso = "courier") {
    setWizard({
      courier,
      reglas: reglasPorCourier.get(String(courier.id)) || [],
      paso,
    });
  }

  // El asistente es una transacción completa: crea o actualiza el courier y
  // persiste sus ciudades en la misma acción, así el usuario no queda con un
  // courier a medio configurar.
  async function guardarDesdeWizard({ courier, reglas }) {
    const guardado = courier.id ? await onUpdateCourier(courier) : await onCreateCourier(courier);
    const courierId = String(courier.id || guardado?.id || "");
    if (!courierId) throw new Error("El courier no devolvió un id");

    // Se manda SOLO lo de este courier, declarando el alcance. Antes se
    // reenviaba el set completo (`resto` + propias) porque el backend borraba
    // todo: alcanzaba con que el estado local estuviera desactualizado para
    // pisar las tarifas de otro courier.
    const propias = reglas.map(r => normalizarRegla({ ...r, courier_id: courierId }));
    await onSaveZonas(paraApi(propias), [Number(courierId)]);
    setWizard(null);
  }

  async function eliminarCourier(courier) {
    setGuardando(true);
    try {
      await onDeleteCourier(courier.id);
      // Alcance = ese courier y sin reglas: borra las suyas y nada más.
      await onSaveZonas([], [Number(courier.id)]);
    } finally {
      setGuardando(false);
      setCourierABorrar(null);
    }
  }

  function actualizarFila(index, campo, valor) {
    setFilas(prev => prev.map((fila, i) => i === index ? { ...fila, [campo]: valor } : fila));
  }

  function eliminarRegla(index) {
    setFilas(prev => prev.filter((_, i) => i !== index));
  }

  async function guardarCambios() {
    setGuardando(true);
    try {
      await onSaveZonas(paraApi(filas));
    } finally {
      setGuardando(false);
    }
  }

  function descartarCambios() {
    const base = reglasDesdeZonas(zonas);
    setFilas(base);
    setBaseline(firmaReglas(base));
  }

  const totalRangos = filas.filter(f => f.ciudad.trim()).length;
  const sinCourier = gruposCourier.find(g => !g.courier);

  return (
    <>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.titulo}>
              <Users size={18} /> Delivery
            </h2>
            <p style={styles.descripcion}>
              Cargá un courier y, en el mismo paso, las ciudades que cubre con sus rangos y tarifas.
            </p>
          </div>
          <button type="button" className="btn-nuevo-pedido" onClick={abrirNuevoCourier}>
            <Plus size={16} /> Nuevo courier
          </button>
        </div>

        <div style={styles.toolbar}>
          <label style={styles.searchBox}>
            <Search size={15} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder={porCourier ? "Buscar courier o ciudad" : "Buscar ciudad o departamento"}
              style={styles.searchInput}
            />
          </label>

          <div style={styles.segmented} role="group" aria-label="Agrupar reglas">
            <span style={styles.segmentedLabel}>Ver por</span>
            {[["courier", "Courier"], ["ciudad", "Ciudad"]].map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setAgrupacion(valor)}
                style={{ ...styles.segmentButton, ...(agrupacion === valor ? styles.segmentButtonActive : {}) }}
              >
                {label}
              </button>
            ))}
          </div>

          <span style={styles.counter}>
            {couriers.length} courier{couriers.length === 1 ? "" : "s"} · {gruposCiudad.length} ciudad{gruposCiudad.length === 1 ? "" : "es"} · {totalRangos} rango{totalRangos === 1 ? "" : "s"}
          </span>
        </div>

        {couriers.length === 0 && totalRangos === 0 ? (
          <EmptyState onAdd={abrirNuevoCourier} />
        ) : porCourier ? (
          gruposCourierFiltrados.length === 0 ? (
            <div style={styles.filteredEmpty}>No encontramos couriers con esa búsqueda.</div>
          ) : (
            <div style={styles.lista}>
              {gruposCourierFiltrados.map(grupo => (
                <section key={grupo.key || "sin-courier"} style={styles.card}>
                  <header style={styles.cardHeader}>
                    <div style={styles.identity}>
                      <span style={grupo.courier ? styles.avatar : styles.avatarMuted}>
                        {grupo.courier ? iniciales(grupo.courier.nombre) : "—"}
                      </span>
                      <div>
                        <div style={styles.titleRow}>
                          <h3 style={styles.cardTitle}>{grupo.courier?.nombre || "Sin courier asignado"}</h3>
                          {grupo.courier && (
                            <span style={grupo.courier.activo !== false ? styles.badgeOk : styles.badgeMuted}>
                              {grupo.courier.activo !== false ? "Activo" : "Inactivo"}
                            </span>
                          )}
                        </div>
                        <p style={styles.cardMeta}>
                          {grupo.courier ? (
                            <>
                              <span style={styles.inlineIcon}><VehiculoIcon v={grupo.courier.vehiculo} size={13} /></span>
                              {grupo.courier.vehiculo || "Sin definir"}
                              {grupo.courier.telefono ? ` · ${grupo.courier.telefono}` : ""}
                              {` · ${ciudadesDe(grupo.courier.id)} ciudad${ciudadesDe(grupo.courier.id) === 1 ? "" : "es"}`}
                              {` · ${enviosCountByCourier[grupo.courier.id] ?? 0} envío${(enviosCountByCourier[grupo.courier.id] ?? 0) === 1 ? "" : "s"} en el rango`}
                            </>
                          ) : (
                            "Reglas viejas que quedaron sin courier. Editá el courier que corresponda y agregá estas ciudades ahí."
                          )}
                        </p>
                      </div>
                    </div>

                    {grupo.courier && (
                      <div style={styles.cardActions}>
                        <button type="button" className="btn-secondary" onClick={() => abrirEditarCourier(grupo.courier, "ciudades")}>
                          <Plus size={15} /> Agregar ciudad
                        </button>
                        <button type="button" className="btn-icon" onClick={() => abrirEditarCourier(grupo.courier)} title="Editar courier" aria-label={`Editar ${grupo.courier.nombre}`}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="btn-icon danger" onClick={() => setCourierABorrar(grupo.courier)} title="Eliminar courier" aria-label={`Eliminar ${grupo.courier.nombre}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </header>

                  {grupo.reglas.length === 0 ? (
                    <div style={styles.cardEmpty}>
                      Todavía no cubre ninguna ciudad.
                      <button type="button" className="btn-secondary" onClick={() => abrirEditarCourier(grupo.courier, "ciudades")}>
                        <Plus size={15} /> Agregar su primera ciudad
                      </button>
                    </div>
                  ) : (
                    <>
                      <ReglasTable
                        reglas={grupo.reglas}
                        encabezadoPrimeraColumna="Ciudad y rango"
                        mostrarCiudad
                        onActualizar={actualizarFila}
                        onEliminar={eliminarRegla}
                      />
                      <AvisoCobertura reglas={grupo.reglas} />
                    </>
                  )}
                </section>
              ))}
            </div>
          )
        ) : gruposCiudadFiltrados.length === 0 ? (
          <div style={styles.filteredEmpty}>No encontramos ciudades con esa búsqueda.</div>
        ) : (
          <div style={styles.lista}>
            {gruposCiudadFiltrados.map(grupo => (
              <section key={grupo.key} style={styles.card}>
                <header style={styles.cardHeader}>
                  <div style={styles.identity}>
                    <span style={styles.avatarMuted}><MapPin size={16} /></span>
                    <div>
                      <div style={styles.titleRow}>
                        <h3 style={styles.cardTitle}>{grupo.ciudad}, {grupo.departamento || "Sin departamento"}</h3>
                        <span style={grupo.reglas.some(r => r.activo) ? styles.badgeOk : styles.badgeMuted}>
                          {grupo.reglas.some(r => r.activo) ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      <p style={styles.cardMeta}>
                        {grupo.reglas.length} rango{grupo.reglas.length === 1 ? "" : "s"} ·{" "}
                        {new Set(grupo.reglas.map(r => courierNombre(r.courier_id))).size} courier
                        {new Set(grupo.reglas.map(r => courierNombre(r.courier_id))).size === 1 ? "" : "s"} la cubre
                        {new Set(grupo.reglas.map(r => courierNombre(r.courier_id))).size === 1 ? "" : "n"}
                      </p>
                    </div>
                  </div>
                </header>

                <ReglasTable
                  reglas={grupo.reglas}
                  encabezadoPrimeraColumna="Courier y rango"
                  mostrarCourier
                  courierNombre={courierNombre}
                  onActualizar={actualizarFila}
                  onEliminar={eliminarRegla}
                />
                <AvisoCobertura reglas={grupo.reglas} />
              </section>
            ))}
          </div>
        )}

        {sinCourier && porCourier && (
          <div style={styles.footerHint}>
            {sinCourier.reglas.length} regla{sinCourier.reglas.length === 1 ? "" : "s"} sin courier. El pedido las sigue usando para calcular el costo, pero el courier se define a mano al despachar.
          </div>
        )}

        {hayCambios && (
          <div style={styles.saveBar}>
            <span style={styles.saveBarText}>Tenés ajustes de tarifas sin guardar.</span>
            <div style={styles.saveBarActions}>
              <button type="button" className="btn-secondary" onClick={descartarCambios} disabled={guardando}>
                Descartar
              </button>
              <button type="button" className="btn-nuevo-pedido" onClick={guardarCambios} disabled={guardando}>
                <Save size={16} /> {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </div>

      <CourierWizard
        open={!!wizard}
        courier={wizard?.courier}
        reglas={wizard?.reglas || []}
        pasoInicial={wizard?.paso || "courier"}
        esAdmin={esAdmin}
        onClose={() => setWizard(null)}
        onGuardar={guardarDesdeWizard}
      />

      <ConfirmDialog
        open={!!courierABorrar}
        title={`¿Eliminar "${courierABorrar?.nombre}"?`}
        description={
          courierABorrar && ciudadesDe(courierABorrar.id) > 0
            ? `Se borran también las ${ciudadesDe(courierABorrar.id)} ciudad${ciudadesDe(courierABorrar.id) === 1 ? "" : "es"} que tiene configurada${ciudadesDe(courierABorrar.id) === 1 ? "" : "s"} con sus tarifas. Los envíos ya despachados no se ven afectados.`
            : "Esta acción no se puede deshacer. Los envíos ya asignados a este courier no se ven afectados."
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={() => eliminarCourier(courierABorrar)}
        onCancel={() => setCourierABorrar(null)}
      />
    </>
  );
}

function ReglasTable({
  reglas,
  encabezadoPrimeraColumna,
  mostrarCiudad = false,
  mostrarCourier = false,
  courierNombre,
  onActualizar,
  onEliminar,
}) {
  return (
    <div style={styles.table}>
      <div style={styles.tableHead}>
        <span>{encabezadoPrimeraColumna}</span>
        <span>Método de pago</span>
        <span>Tiempo de entrega</span>
        <span>Costo</span>
        <span>Estado</span>
        <span />
      </div>
      {reglas.map((regla, posicion) => {
        const caption = mostrarCiudad
          ? `${regla.ciudad}, ${regla.departamento || "Sin departamento"}`
          : courierNombre(regla.courier_id);
        const anterior = reglas[posicion - 1];
        const captionAnterior = !anterior
          ? null
          : mostrarCiudad
            ? `${anterior.ciudad}, ${anterior.departamento || "Sin departamento"}`
            : courierNombre(anterior.courier_id);

        return (
        <div key={regla.index} style={styles.row}>
          <div style={styles.rangeCell}>
            {caption !== captionAnterior && <span style={styles.rowCaption}>{caption}</span>}
            <strong style={styles.rangeText}>{rangoLabel(regla)}</strong>
          </div>
          <span style={styles.mutedText}>{regla.tipo_pago || "Ambos"}</span>
          <input
            className="form-input"
            value={regla.tiempo_entrega_hs || ""}
            onChange={e => onActualizar(regla.index, "tiempo_entrega_hs", e.target.value)}
            placeholder="En el día"
            style={styles.inlineTime}
            aria-label={`Tiempo de entrega de ${regla.ciudad}`}
          />
          <CurrencyInput
            className="form-input"
            value={regla.costo}
            onChange={val => onActualizar(regla.index, "costo", val)}
            prefix="Gs "
            style={styles.inlineMoney}
          />
          <label style={styles.inlineToggle}>
            <input
              type="checkbox"
              checked={regla.activo !== false}
              onChange={e => onActualizar(regla.index, "activo", e.target.checked)}
              style={styles.checkbox}
            />
            Activa
          </label>
          <div style={styles.rowActions}>
            <button
              type="button"
              className="btn-icon danger"
              onClick={() => onEliminar(regla.index)}
              title="Eliminar rango"
              aria-label={`Eliminar rango ${rangoLabel(regla)} de ${regla.ciudad}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}

function AvisoCobertura({ reglas }) {
  const avisos = huecosDeCobertura(reglas);
  if (avisos.length === 0) return null;

  return (
    <div style={styles.aviso}>
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <strong>Estos tramos no van a autocompletar el flete: habrá que cargarlo a mano en cada pedido.</strong>
        <ul style={styles.avisoLista}>
          {avisos.map(aviso => <li key={aviso}>{aviso}</li>)}
        </ul>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div style={styles.empty}>
      <Users size={30} style={{ opacity: 0.35, margin: "0 auto 0.75rem" }} />
      <p style={{ margin: 0, fontWeight: 800, color: "var(--color-fg)" }}>Todavía no configuraste el delivery</p>
      <p style={{ margin: "0.3rem 0 1rem", fontSize: "0.86rem" }}>
        Empezá cargando un courier: en el mismo asistente definís las ciudades que cubre y cuánto cobra en cada una.
      </p>
      <button type="button" className="btn-nuevo-pedido" onClick={onAdd}>
        <Plus size={16} /> Crear primer courier
      </button>
    </div>
  );
}

const styles = {
  panel: {
    background: "var(--color-canvas)",
    borderRadius: "0.85rem",
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    color: "var(--color-fg)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
    padding: "1.2rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  titulo: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--color-fg)",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  descripcion: {
    margin: "0.2rem 0 0 0",
    fontSize: "0.8rem",
    color: "var(--color-fg-muted)",
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    alignItems: "center",
    padding: "1rem 1.2rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flex: "1 1 220px",
    minHeight: 38,
    padding: "0 0.8rem",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)",
    background: "color-mix(in srgb, var(--color-fg) 3%, transparent)",
    color: "var(--color-fg-muted)",
  },
  searchInput: {
    border: 0,
    outline: 0,
    width: "100%",
    background: "transparent",
    color: "var(--color-fg)",
    fontSize: "0.86rem",
  },
  segmented: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: 3,
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    background: "color-mix(in srgb, var(--color-fg) 3%, transparent)",
  },
  segmentedLabel: {
    padding: "0 0.4rem 0 0.5rem",
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
    color: "var(--color-fg-subtle)",
  },
  segmentButton: {
    border: 0,
    borderRadius: 8,
    background: "transparent",
    color: "var(--color-fg-muted)",
    fontWeight: 700,
    fontSize: "0.78rem",
    padding: "0.45rem 0.7rem",
    cursor: "pointer",
  },
  segmentButtonActive: {
    background: "var(--color-fg)",
    color: "var(--color-canvas)",
  },
  counter: {
    color: "var(--color-fg-muted)",
    fontSize: "0.82rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
    marginLeft: "auto",
  },
  empty: {
    padding: "3rem 1.5rem",
    textAlign: "center",
    color: "var(--color-fg-muted)",
  },
  filteredEmpty: {
    padding: "2rem",
    textAlign: "center",
    color: "var(--color-fg-muted)",
  },
  lista: {
    display: "grid",
    gap: "0.9rem",
    padding: "1rem",
  },
  card: {
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    borderRadius: "0.75rem",
    overflow: "hidden",
    background: "color-mix(in srgb, var(--color-fg) 2%, transparent)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.8rem",
    alignItems: "center",
    flexWrap: "wrap",
    padding: "1rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 7%, transparent)",
  },
  identity: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    minWidth: 0,
  },
  avatar: {
    display: "grid",
    placeItems: "center",
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: "50%",
    background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
    color: "var(--color-primary-text)",
    fontWeight: "bold",
    fontSize: 12,
  },
  avatarMuted: {
    display: "grid",
    placeItems: "center",
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: "50%",
    background: "color-mix(in srgb, var(--color-fg) 7%, transparent)",
    color: "var(--color-fg-muted)",
    fontWeight: "bold",
    fontSize: 12,
  },
  inlineIcon: {
    display: "inline-flex",
    verticalAlign: "-2px",
    marginRight: "0.3rem",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  cardTitle: {
    margin: 0,
    fontSize: "0.98rem",
    fontWeight: 800,
    color: "var(--color-fg)",
  },
  cardMeta: {
    margin: "0.15rem 0 0",
    fontSize: "0.78rem",
    color: "var(--color-fg-muted)",
  },
  cardActions: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  cardEmpty: {
    display: "grid",
    justifyItems: "center",
    gap: "0.75rem",
    padding: "1.5rem 1rem",
    fontSize: "0.84rem",
    color: "var(--color-fg-muted)",
  },
  badgeOk: {
    fontSize: "0.7rem",
    fontWeight: 800,
    padding: "0.2rem 0.5rem",
    borderRadius: 999,
    color: "var(--color-success)",
    background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
  },
  badgeMuted: {
    fontSize: "0.7rem",
    fontWeight: 800,
    padding: "0.2rem 0.5rem",
    borderRadius: 999,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-fg) 6%, transparent)",
  },
  table: {
    display: "grid",
    overflowX: "auto",
  },
  tableHead: {
    display: "grid",
    gridTemplateColumns: "minmax(170px, 1.2fr) minmax(110px, 0.8fr) minmax(130px, 0.9fr) minmax(120px, 0.8fr) minmax(90px, 0.7fr) 56px",
    gap: "0.75rem",
    minWidth: 820,
    alignItems: "center",
    padding: "0.65rem 1rem",
    fontSize: "0.72rem",
    fontWeight: 800,
    color: "var(--color-fg-muted)",
    textTransform: "uppercase",
    background: "color-mix(in srgb, var(--color-fg) 3%, transparent)",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(170px, 1.2fr) minmax(110px, 0.8fr) minmax(130px, 0.9fr) minmax(120px, 0.8fr) minmax(90px, 0.7fr) 56px",
    gap: "0.75rem",
    minWidth: 820,
    alignItems: "center",
    padding: "0.72rem 1rem",
    borderTop: "1px solid color-mix(in srgb, var(--color-fg) 5%, transparent)",
  },
  rangeCell: {
    display: "grid",
    gap: "0.1rem",
    minWidth: 0,
  },
  rowCaption: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "var(--color-fg-muted)",
  },
  rangeText: {
    fontSize: "0.86rem",
    color: "var(--color-fg)",
  },
  mutedText: {
    fontSize: "0.8rem",
    color: "var(--color-fg-muted)",
  },
  inlineTime: {
    width: "100%",
    minWidth: 110,
    padding: "0.34rem 0.5rem",
    fontSize: "0.78rem",
  },
  inlineMoney: {
    minWidth: 112,
    padding: "0.38rem 0.55rem",
    fontFamily: "monospace",
    color: "var(--color-success)",
    fontWeight: 800,
  },
  inlineToggle: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--color-fg-muted)",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "var(--color-primary)",
  },
  rowActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  aviso: {
    display: "flex",
    gap: "0.55rem",
    alignItems: "flex-start",
    margin: "0.75rem 1rem 1rem",
    padding: "0.75rem 0.9rem",
    borderRadius: 10,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-warning, #f59e0b) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-warning, #f59e0b) 22%, transparent)",
    fontSize: "0.8rem",
  },
  avisoLista: {
    margin: "0.3rem 0 0",
    paddingLeft: "1.1rem",
  },
  footerHint: {
    margin: "0 1rem 1rem",
    padding: "0.75rem 0.9rem",
    borderRadius: 10,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-warning, #f59e0b) 10%, transparent)",
    fontSize: "0.82rem",
  },
  saveBar: {
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
    padding: "0.9rem 1.2rem",
    borderTop: "1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)",
    borderRadius: "0 0 0.85rem 0.85rem",
    background: "var(--color-canvas)",
    boxShadow: "0 -12px 24px color-mix(in srgb, var(--color-fg) 10%, transparent)",
  },
  saveBarText: {
    fontSize: "0.84rem",
    fontWeight: 800,
    color: "var(--color-fg)",
  },
  saveBarActions: {
    display: "flex",
    gap: "0.65rem",
    marginLeft: "auto",
  },
};
