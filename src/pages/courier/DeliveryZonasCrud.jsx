import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  MapPin,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";

const TIPOS_PAGO = ["Ambos", "Al Recibir", "Anticipado"];
const FILTROS = ["Todas", "Configuradas", "Sin courier"];

const nuevaRegla = (departamento = "", ciudad = "") => ({
  departamento,
  ciudad,
  courier_id: "",
  tipo_pago: "Ambos",
  rango_min: 0,
  rango_max: "",
  costo: 0,
  tiempo_entrega_hs: "En el día",
  activo: true,
});

function zonaKey(departamento, ciudad) {
  return `${String(departamento || "").trim().toLowerCase()}::${String(ciudad || "").trim().toLowerCase()}`;
}

function rangoLabel(regla) {
  const desde = Number(regla.rango_min) || 0;
  if (regla.rango_max === "" || regla.rango_max === null || regla.rango_max === undefined) {
    return `Desde ${desde} productos`;
  }
  return `De ${desde} a ${regla.rango_max} productos`;
}

function precioLabel(valor) {
  return `Gs ${Number(valor || 0).toLocaleString("es-PY")}`;
}

function reglaPreview(regla) {
  const entrega = regla.tiempo_entrega_hs?.trim() || "sin tiempo estimado";
  return `${rangoLabel(regla)} · ${regla.tipo_pago || "Ambos"} · ${precioLabel(regla.costo)} · ${entrega}`;
}

function normalizarRegla(regla, departamento, ciudad) {
  return {
    ...regla,
    departamento,
    ciudad,
    courier_id: regla.courier_id || "",
    tipo_pago: regla.tipo_pago || "Ambos",
    rango_min: Number(regla.rango_min) || 0,
    rango_max: regla.rango_max === null || regla.rango_max === undefined ? "" : regla.rango_max,
    costo: Number(regla.costo) || 0,
    tiempo_entrega_hs: regla.tiempo_entrega_hs || "En el día",
    activo: regla.activo !== false,
  };
}

export function DeliveryZonasCrud({ zonas = [], couriers = [], onSave }) {
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [drawer, setDrawer] = useState(null);

  useEffect(() => {
    setFilas((zonas || []).map(z => normalizarRegla({
      id: z.id,
      courier_id: z.courier_id || "",
      tipo_pago: z.tipo_pago || "Ambos",
      rango_min: z.rango_min ?? 0,
      rango_max: z.rango_max ?? "",
      costo: z.costo ?? 0,
      tiempo_entrega_hs: z.tiempo_entrega_hs || "",
      activo: z.activo !== false,
    }, z.departamento || "", z.ciudad || "")));
  }, [zonas]);

  const grupos = useMemo(() => {
    const map = new Map();
    filas.forEach((fila, index) => {
      if (!fila.ciudad?.trim()) return;
      const key = zonaKey(fila.departamento, fila.ciudad);
      if (!map.has(key)) {
        map.set(key, {
          key,
          departamento: fila.departamento || "",
          ciudad: fila.ciudad || "",
          reglas: [],
        });
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

  const gruposFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return grupos.filter(grupo => {
      const matchTexto = !q || `${grupo.ciudad} ${grupo.departamento}`.toLowerCase().includes(q);
      const tieneCourier = grupo.reglas.some(regla => regla.courier_id);
      const tieneActivas = grupo.reglas.some(regla => regla.activo !== false);
      const matchFiltro =
        filtro === "Todas" ||
        (filtro === "Configuradas" && tieneActivas) ||
        (filtro === "Sin courier" && !tieneCourier);
      return matchTexto && matchFiltro;
    });
  }, [busqueda, filtro, grupos]);

  function courierNombre(id) {
    if (!id) return "Sin courier";
    return couriers.find(c => Number(c.id) === Number(id))?.nombre || "Courier no disponible";
  }

  function crearDraft({ departamento = "", ciudad = "", reglas = [nuevaRegla(departamento, ciudad)] }) {
    return {
      departamento,
      ciudad,
      reglas: reglas.map(regla => {
        const copia = { ...regla };
        delete copia.index;
        return normalizarRegla(copia, departamento, ciudad);
      }),
    };
  }

  function abrirCiudadNueva() {
    setDrawer({
      modo: "crear",
      paso: "ciudad",
      sourceKey: null,
      error: "",
      draft: crearDraft({}),
    });
  }

  function abrirEditarCiudad(grupo, paso = "rangos") {
    setDrawer({
      modo: "editar",
      paso,
      sourceKey: grupo.key,
      error: "",
      draft: crearDraft({
        departamento: grupo.departamento,
        ciudad: grupo.ciudad,
        reglas: grupo.reglas,
      }),
    });
  }

  function abrirAgregarRango(grupo) {
    setDrawer({
      modo: "editar",
      paso: "rangos",
      sourceKey: grupo.key,
      error: "",
      draft: crearDraft({
        departamento: grupo.departamento,
        ciudad: grupo.ciudad,
        reglas: [...grupo.reglas, nuevaRegla(grupo.departamento, grupo.ciudad)],
      }),
    });
  }

  function duplicarConfiguracion(grupo) {
    setDrawer({
      modo: "crear",
      paso: "ciudad",
      sourceKey: null,
      error: "",
      draft: crearDraft({
        departamento: grupo.departamento,
        ciudad: "",
        reglas: grupo.reglas.map(regla => ({ ...regla, id: undefined })),
      }),
    });
  }

  function updateDraft(field, value) {
    setDrawer(prev => ({
      ...prev,
      error: "",
      draft: { ...prev.draft, [field]: value },
    }));
  }

  function updateDraftRegla(index, field, value) {
    setDrawer(prev => ({
      ...prev,
      error: "",
      draft: {
        ...prev.draft,
        reglas: prev.draft.reglas.map((regla, i) => i === index ? { ...regla, [field]: value } : regla),
      },
    }));
  }

  function agregarDraftRegla() {
    setDrawer(prev => ({
      ...prev,
      draft: {
        ...prev.draft,
        reglas: [...prev.draft.reglas, nuevaRegla(prev.draft.departamento, prev.draft.ciudad)],
      },
    }));
  }

  function eliminarDraftRegla(index) {
    setDrawer(prev => ({
      ...prev,
      draft: {
        ...prev.draft,
        reglas: prev.draft.reglas.filter((_, i) => i !== index),
      },
    }));
  }

  function continuarARangos(e) {
    e.preventDefault();
    const departamento = drawer.draft.departamento.trim();
    const ciudad = drawer.draft.ciudad.trim();
    if (!ciudad) {
      setDrawer(prev => ({ ...prev, error: "Ingresá la ciudad para continuar." }));
      return;
    }

    const key = zonaKey(departamento, ciudad);
    if (grupos.some(grupo => grupo.key === key && grupo.key !== drawer.sourceKey)) {
      setDrawer(prev => ({ ...prev, error: "Esta ciudad ya existe. Editá sus rangos desde la tarjeta existente." }));
      return;
    }

    setDrawer(prev => ({
      ...prev,
      paso: "rangos",
      error: "",
      draft: {
        ...prev.draft,
        departamento,
        ciudad,
        reglas: prev.draft.reglas.length
          ? prev.draft.reglas.map(regla => normalizarRegla(regla, departamento, ciudad))
          : [nuevaRegla(departamento, ciudad)],
      },
    }));
  }

  function validarRangos() {
    const reglas = drawer.draft.reglas;
    if (reglas.length === 0) return "Agregá al menos un rango para esta ciudad.";
    const invalida = reglas.find(regla => (
      Number(regla.rango_min) < 0 ||
      (regla.rango_max !== "" && regla.rango_max !== null && Number(regla.rango_max) < Number(regla.rango_min)) ||
      Number(regla.costo) < 0
    ));
    if (invalida) return "Revisá los rangos: la cantidad máxima debe ser mayor o igual a la mínima y el costo no puede ser negativo.";
    return "";
  }

  function revisarCiudad(e) {
    e.preventDefault();
    const error = validarRangos();
    if (error) {
      setDrawer(prev => ({ ...prev, error }));
      return;
    }
    setDrawer(prev => ({ ...prev, paso: "resumen", error: "" }));
  }

  function guardarDraftCiudad(e) {
    e.preventDefault();
    const departamento = drawer.draft.departamento.trim();
    const ciudad = drawer.draft.ciudad.trim();
    const key = zonaKey(departamento, ciudad);
    const error = validarRangos();

    if (!ciudad) {
      setDrawer(prev => ({ ...prev, paso: "ciudad", error: "Ingresá la ciudad para guardar." }));
      return;
    }
    if (grupos.some(grupo => grupo.key === key && grupo.key !== drawer.sourceKey)) {
      setDrawer(prev => ({ ...prev, paso: "ciudad", error: "Esta ciudad ya existe. Editá sus rangos desde la tarjeta existente." }));
      return;
    }
    if (error) {
      setDrawer(prev => ({ ...prev, paso: "rangos", error }));
      return;
    }

    const reglas = drawer.draft.reglas.map(regla => normalizarRegla(regla, departamento, ciudad));
    setFilas(prev => [
      ...prev.filter(fila => zonaKey(fila.departamento, fila.ciudad) !== drawer.sourceKey),
      ...reglas,
    ]);
    setDrawer(null);
  }

  function eliminarRegla(index) {
    setFilas(prev => prev.filter((_, i) => i !== index));
  }

  function actualizarFila(index, field, value) {
    setFilas(prev => prev.map((fila, i) => i === index ? { ...fila, [field]: value } : fila));
  }

  function eliminarCiudad(grupo) {
    setFilas(prev => prev.filter(f => zonaKey(f.departamento, f.ciudad) !== grupo.key));
  }

  async function guardar() {
    setGuardando(true);
    try {
      const limpias = filas
        .filter(f => f.ciudad.trim())
        .map(f => ({
          departamento: f.departamento.trim() || null,
          ciudad: f.ciudad.trim(),
          courier_id: f.courier_id || null,
          tipo_pago: f.tipo_pago || "Ambos",
          rango_min: Number(f.rango_min) || 0,
          rango_max: f.rango_max === "" || f.rango_max === null ? null : Number(f.rango_max),
          costo: Number(f.costo) || 0,
          tiempo_entrega_hs: f.tiempo_entrega_hs?.trim() || null,
          activo: f.activo !== false,
        }));
      await onSave(limpias);
    } finally {
      setGuardando(false);
    }
  }

  const totalRangos = filas.length;
  const totalSinCourier = grupos.filter(grupo => !grupo.reglas.some(regla => regla.courier_id)).length;

  return (
    <>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.titulo}>
              <MapPin size={18} /> Ciudades y tarifas
            </h2>
            <p style={styles.descripcion}>
              Configura costos y tiempos de entrega según ciudad y cantidad de productos.
            </p>
          </div>
          <div style={styles.headerActions}>
            <button type="button" className="btn-secondary" onClick={abrirCiudadNueva}>
              <Plus size={16} /> Agregar ciudad
            </button>
            <button type="button" className="btn-nuevo-pedido" onClick={guardar} disabled={guardando}>
              <Save size={16} /> {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        <div style={styles.toolbar}>
          <label style={styles.searchBox}>
            <Search size={15} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar ciudad o departamento"
              style={styles.searchInput}
            />
          </label>
          <div style={styles.filters} role="group" aria-label="Filtrar ciudades">
            {FILTROS.map(nombre => (
              <button
                key={nombre}
                type="button"
                onClick={() => setFiltro(nombre)}
                style={{ ...styles.filterButton, ...(filtro === nombre ? styles.filterButtonActive : {}) }}
              >
                {nombre}
              </button>
            ))}
          </div>
          <span style={styles.counter}>
            {grupos.length} ciudad{grupos.length === 1 ? "" : "es"} · {totalRangos} rango{totalRangos === 1 ? "" : "s"}
          </span>
        </div>

        {grupos.length === 0 ? (
          <EmptyState onAdd={abrirCiudadNueva} />
        ) : gruposFiltrados.length === 0 ? (
          <div style={styles.filteredEmpty}>
            No encontramos ciudades con ese filtro.
          </div>
        ) : (
          <div style={styles.cityList}>
            {gruposFiltrados.map(grupo => (
              <section key={grupo.key} style={styles.cityCard}>
                <header style={styles.cityHeader}>
                  <div>
                    <div style={styles.cityTitleRow}>
                      <h3 style={styles.cityTitle}>{grupo.ciudad}, {grupo.departamento || "Sin departamento"}</h3>
                      <span style={grupo.reglas.some(regla => regla.activo) ? styles.badgeOk : styles.badgeMuted}>
                        {grupo.reglas.some(regla => regla.activo) ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <p style={styles.cityMeta}>
                      {grupo.reglas.length} rango{grupo.reglas.length === 1 ? "" : "s"} configurado{grupo.reglas.length === 1 ? "" : "s"}
                      {!grupo.reglas.some(regla => regla.courier_id) ? " · Sin courier asignado" : ""}
                    </p>
                  </div>
                  <div style={styles.cityActions}>
                    <button type="button" className="btn-secondary" onClick={() => abrirAgregarRango(grupo)}>
                      <Plus size={15} /> Agregar rango
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => duplicarConfiguracion(grupo)}>
                      <Copy size={15} /> Duplicar
                    </button>
                    <button type="button" className="btn-icon" onClick={() => abrirEditarCiudad(grupo, "ciudad")} title="Editar ciudad" aria-label={`Editar ${grupo.ciudad}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="btn-icon danger" onClick={() => eliminarCiudad(grupo)} title="Eliminar ciudad" aria-label={`Eliminar ${grupo.ciudad}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </header>

                <div style={styles.table}>
                  <div style={styles.tableHead}>
                    <span>Rango</span>
                    <span>Método de pago</span>
                    <span>Entrega</span>
                    <span>Costo</span>
                    <span>Estado</span>
                    <span />
                  </div>
                  {grupo.reglas.map(regla => (
                    <div key={regla.index} style={styles.ruleRow}>
                      <strong style={styles.ruleRange}>{rangoLabel(regla)}</strong>
                      <span style={styles.mutedText}>{regla.tipo_pago || "Ambos"}</span>
                      <span style={styles.deliveryCell}>
                        <span>{courierNombre(regla.courier_id)}</span>
                        <input
                          className="form-input"
                          value={regla.tiempo_entrega_hs || ""}
                          onChange={e => actualizarFila(regla.index, "tiempo_entrega_hs", e.target.value)}
                          placeholder="En el día"
                          style={styles.inlineTime}
                        />
                      </span>
                      <CurrencyInput
                        className="form-input"
                        value={regla.costo}
                        onChange={val => actualizarFila(regla.index, "costo", val)}
                        prefix="Gs "
                        style={styles.inlineMoney}
                      />
                      <label style={styles.inlineToggle}>
                        <input
                          type="checkbox"
                          checked={regla.activo !== false}
                          onChange={e => actualizarFila(regla.index, "activo", e.target.checked)}
                          style={styles.checkbox}
                        />
                        Activa
                      </label>
                      <div style={styles.rowActions}>
                        <button type="button" className="btn-icon" onClick={() => abrirEditarCiudad(grupo, "rangos")} title="Editar rangos" aria-label={`Editar rangos de ${grupo.ciudad}`}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="btn-icon danger" onClick={() => eliminarRegla(regla.index)} title="Eliminar rango" aria-label={`Eliminar rango ${rangoLabel(regla)}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {totalSinCourier > 0 && grupos.length > 0 && (
          <div style={styles.footerHint}>
            {totalSinCourier} ciudad{totalSinCourier === 1 ? "" : "es"} sin courier asignado. Podés dejarlo así si se define manualmente al preparar el envío.
          </div>
        )}
      </div>

      {drawer && (
        <Drawer
          drawer={drawer}
          setDrawer={setDrawer}
          couriers={couriers}
          onClose={() => setDrawer(null)}
          onDraftChange={updateDraft}
          onReglaChange={updateDraftRegla}
          onAddRegla={agregarDraftRegla}
          onRemoveRegla={eliminarDraftRegla}
          onContinue={continuarARangos}
          onReview={revisarCiudad}
          onSave={guardarDraftCiudad}
        />
      )}
    </>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div style={styles.empty}>
      <MapPin size={30} style={{ opacity: 0.35, margin: "0 auto 0.75rem" }} />
      <p style={{ margin: 0, fontWeight: 800, color: "var(--color-fg)" }}>Todavía no configuraste ciudades</p>
      <p style={{ margin: "0.3rem 0 1rem", fontSize: "0.86rem" }}>
        Agrega tu primera ciudad para comenzar a definir costos y tiempos de entrega.
      </p>
      <button type="button" className="btn-nuevo-pedido" onClick={onAdd}>
        <Plus size={16} /> Agregar primera ciudad
      </button>
    </div>
  );
}

function Drawer({
  drawer,
  setDrawer,
  couriers,
  onClose,
  onDraftChange,
  onReglaChange,
  onAddRegla,
  onRemoveRegla,
  onContinue,
  onReview,
  onSave,
}) {
  const { draft, paso, error } = drawer;

  return (
    <div style={styles.drawerOverlay} onClick={onClose}>
      <aside style={styles.drawer} onClick={e => e.stopPropagation()} aria-modal="true" role="dialog">
        <form onSubmit={paso === "ciudad" ? onContinue : paso === "rangos" ? onReview : onSave} style={styles.drawerForm}>
          <div style={styles.drawerHeader}>
            <div>
              <p style={styles.eyebrow}>{drawer.modo === "crear" ? "Nueva configuración" : "Editar configuración"}</p>
              <h3 style={styles.drawerTitle}>
                {paso === "ciudad" ? "Agregar ciudad" : paso === "rangos" ? `Configura rangos de ${draft.ciudad}` : "Revisar ciudad"}
              </h3>
            </div>
            <button type="button" className="btn-icon" onClick={onClose} title="Cerrar" aria-label="Cerrar panel">
              <X size={18} />
            </button>
          </div>

          <StepIndicator paso={paso} />

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.drawerBody}>
            {paso === "ciudad" && (
              <div style={styles.sectionStack}>
                <Field label="Departamento">
                  <input
                    autoFocus
                    className="form-input"
                    value={draft.departamento}
                    onChange={e => onDraftChange("departamento", e.target.value)}
                    placeholder="Central"
                  />
                </Field>
                <Field label="Ciudad">
                  <input
                    className="form-input"
                    value={draft.ciudad}
                    onChange={e => onDraftChange("ciudad", e.target.value)}
                    placeholder="Luque"
                    required
                  />
                </Field>
                {draft.reglas.length > 0 && draft.ciudad === "" && (
                  <div style={styles.infoBox}>
                    Se copiarán {draft.reglas.length} rango{draft.reglas.length === 1 ? "" : "s"} cuando elijas la ciudad.
                  </div>
                )}
              </div>
            )}

            {paso === "rangos" && (
              <div style={styles.sectionStack}>
                <div style={styles.rangeHeader}>
                  <div>
                    <h4 style={styles.sectionTitle}>Rangos de cantidad</h4>
                    <p style={styles.sectionHelp}>Define cuánto cuesta el envío según la cantidad de productos del pedido.</p>
                  </div>
                  <button type="button" className="btn-secondary" onClick={onAddRegla}>
                    <Plus size={15} /> Agregar otro rango
                  </button>
                </div>

                {draft.reglas.length === 0 ? (
                  <div style={styles.rangeEmpty}>
                    No hay rangos para esta ciudad.
                    <button type="button" className="btn-secondary" onClick={onAddRegla}>
                      <Plus size={15} /> Crear rango
                    </button>
                  </div>
                ) : draft.reglas.map((regla, index) => (
                  <RangeEditor
                    key={index}
                    index={index}
                    regla={regla}
                    couriers={couriers}
                    onChange={onReglaChange}
                    onRemove={onRemoveRegla}
                  />
                ))}
              </div>
            )}

            {paso === "resumen" && (
              <div style={styles.sectionStack}>
                <div style={styles.summaryCard}>
                  <CheckCircle2 size={20} color="var(--color-success)" />
                  <div>
                    <h4 style={styles.sectionTitle}>{draft.ciudad}, {draft.departamento || "Sin departamento"}</h4>
                    <p style={styles.sectionHelp}>{draft.reglas.length} rango{draft.reglas.length === 1 ? "" : "s"} configurado{draft.reglas.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div style={styles.summaryList}>
                  {draft.reglas.map((regla, index) => (
                    <div key={index} style={styles.summaryItem}>
                      <strong>{reglaPreview(regla)}</strong>
                      <span>{regla.courier_id ? couriers.find(c => Number(c.id) === Number(regla.courier_id))?.nombre || "Courier no disponible" : "Sin courier asignado"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={styles.drawerActions}>
            {paso !== "ciudad" ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDrawer(prev => ({ ...prev, paso: paso === "resumen" ? "rangos" : "ciudad", error: "" }))}
              >
                Volver a editar
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            )}
            <button type="submit" className="btn-nuevo-pedido">
              {paso === "ciudad" ? "Continuar con rangos" : paso === "rangos" ? "Revisar ciudad" : "Guardar ciudad"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function RangeEditor({ index, regla, couriers, onChange, onRemove }) {
  const sinLimite = regla.rango_max === "" || regla.rango_max === null || regla.rango_max === undefined;

  return (
    <section style={styles.rangeCard}>
      <div style={styles.rangeEditorHeader}>
        <div>
          <strong style={styles.rangeEditorTitle}>{rangoLabel(regla)}</strong>
          <p style={styles.previewText}>{reglaPreview(regla)}</p>
        </div>
        <button type="button" className="btn-icon danger" onClick={() => onRemove(index)} title="Eliminar rango" aria-label="Eliminar rango">
          <Trash2 size={15} />
        </button>
      </div>

      <div style={styles.formSection}>
        <h5 style={styles.formSectionTitle}>Alcance del rango</h5>
        <div style={styles.twoCols}>
          <Field label="Cantidad mínima de productos">
            <input
              type="number"
              min="0"
              className="form-input"
              value={regla.rango_min}
              onChange={e => onChange(index, "rango_min", Number(e.target.value))}
            />
          </Field>
          <Field label="Cantidad máxima de productos">
            <input
              type="number"
              min="0"
              className="form-input"
              value={sinLimite ? "" : regla.rango_max}
              onChange={e => onChange(index, "rango_max", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Sin límite"
              disabled={sinLimite}
            />
          </Field>
        </div>
        <label style={styles.inlineToggle}>
          <input
            type="checkbox"
            checked={sinLimite}
            onChange={e => onChange(index, "rango_max", e.target.checked ? "" : Number(regla.rango_min) || 0)}
            style={styles.checkbox}
          />
          Sin límite máximo
        </label>
      </div>

      <div style={styles.formSection}>
        <h5 style={styles.formSectionTitle}>Condiciones del envío</h5>
        <div style={styles.twoCols}>
          <Field label="Método de pago aceptado">
            <select className="form-input" value={regla.tipo_pago} onChange={e => onChange(index, "tipo_pago", e.target.value)}>
              {TIPOS_PAGO.map(tp => <option key={tp} value={tp}>{tp}</option>)}
            </select>
          </Field>
          <Field label="Servicio de entrega">
            <select className="form-input" value={regla.courier_id || ""} onChange={e => onChange(index, "courier_id", e.target.value)}>
              <option value="">Sin asignar</option>
              {couriers.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div style={styles.formSection}>
        <h5 style={styles.formSectionTitle}>Precio y entrega</h5>
        <div style={styles.twoCols}>
          <Field label="Costo de envío">
            <CurrencyInput
              className="form-input"
              value={regla.costo}
              onChange={val => onChange(index, "costo", val)}
              prefix="Gs "
              style={styles.moneyInput}
            />
          </Field>
          <Field label="Tiempo estimado de entrega">
            <input
              className="form-input"
              value={regla.tiempo_entrega_hs}
              onChange={e => onChange(index, "tiempo_entrega_hs", e.target.value)}
              placeholder="En el día"
            />
          </Field>
        </div>
        <label style={styles.inlineToggle}>
          <input
            type="checkbox"
            checked={regla.activo !== false}
            onChange={e => onChange(index, "activo", e.target.checked)}
            style={styles.checkbox}
          />
          Rango activo
        </label>
      </div>
    </section>
  );
}

function StepIndicator({ paso }) {
  const pasos = [
    ["ciudad", "Ciudad"],
    ["rangos", "Rangos"],
    ["resumen", "Resumen"],
  ];
  const activeIndex = pasos.findIndex(([key]) => key === paso);

  return (
    <div style={styles.steps}>
      {pasos.map(([key, label], index) => (
        <div key={key} style={{ ...styles.step, ...(index <= activeIndex ? styles.stepActive : {}) }}>
          <span style={styles.stepDot}>{index + 1}</span>
          {label}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  panel: {
    background: "var(--color-canvas)",
    borderRadius: "0.85rem",
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    overflow: "hidden",
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
  headerActions: {
    display: "flex",
    gap: "0.65rem",
    flexWrap: "wrap",
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) auto auto",
    gap: "0.75rem",
    alignItems: "center",
    padding: "1rem 1.2rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
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
  filters: {
    display: "flex",
    alignItems: "center",
    padding: 3,
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    background: "color-mix(in srgb, var(--color-fg) 3%, transparent)",
  },
  filterButton: {
    border: 0,
    borderRadius: 8,
    background: "transparent",
    color: "var(--color-fg-muted)",
    fontWeight: 700,
    fontSize: "0.78rem",
    padding: "0.45rem 0.7rem",
    cursor: "pointer",
  },
  filterButtonActive: {
    background: "var(--color-fg)",
    color: "var(--color-canvas)",
  },
  counter: {
    color: "var(--color-fg-muted)",
    fontSize: "0.82rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
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
  cityList: {
    display: "grid",
    gap: "0.9rem",
    padding: "1rem",
  },
  cityCard: {
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    borderRadius: "0.75rem",
    overflow: "hidden",
    background: "color-mix(in srgb, var(--color-fg) 2%, transparent)",
  },
  cityHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.8rem",
    alignItems: "center",
    padding: "1rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 7%, transparent)",
  },
  cityTitleRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  cityTitle: {
    margin: 0,
    fontSize: "0.98rem",
    fontWeight: 800,
    color: "var(--color-fg)",
  },
  cityMeta: {
    margin: "0.15rem 0 0",
    fontSize: "0.78rem",
    color: "var(--color-fg-muted)",
  },
  cityActions: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
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
    gridTemplateColumns: "minmax(150px, 1.1fr) minmax(120px, 0.9fr) minmax(140px, 1fr) minmax(120px, 0.8fr) minmax(90px, 0.7fr) 88px",
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
  ruleRow: {
    display: "grid",
    gridTemplateColumns: "minmax(150px, 1.1fr) minmax(120px, 0.9fr) minmax(140px, 1fr) minmax(120px, 0.8fr) minmax(90px, 0.7fr) 88px",
    gap: "0.75rem",
    minWidth: 820,
    alignItems: "center",
    padding: "0.72rem 1rem",
    borderTop: "1px solid color-mix(in srgb, var(--color-fg) 5%, transparent)",
  },
  ruleRange: {
    fontSize: "0.86rem",
    color: "var(--color-fg)",
  },
  mutedText: {
    fontSize: "0.8rem",
    color: "var(--color-fg-muted)",
  },
  deliveryCell: {
    display: "grid",
    gap: "0.35rem",
    fontSize: "0.8rem",
    color: "var(--color-fg-muted)",
  },
  inlineMoney: {
    minWidth: 112,
    padding: "0.38rem 0.55rem",
    fontFamily: "monospace",
    color: "var(--color-success)",
    fontWeight: 800,
  },
  inlineTime: {
    width: "100%",
    minWidth: 120,
    padding: "0.34rem 0.5rem",
    fontSize: "0.78rem",
  },
  inlineToggle: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--color-fg-muted)",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
  rowActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.35rem",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "var(--color-primary)",
  },
  footerHint: {
    margin: "0 1rem 1rem",
    padding: "0.75rem 0.9rem",
    borderRadius: 10,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-warning, #f59e0b) 10%, transparent)",
    fontSize: "0.82rem",
  },
  drawerOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1200,
    background: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    justifyContent: "flex-end",
  },
  drawer: {
    width: "min(520px, 100vw)",
    height: "100%",
    background: "var(--color-canvas)",
    color: "var(--color-fg)",
    borderLeft: "1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)",
    boxShadow: "-20px 0 45px rgba(0,0,0,0.22)",
  },
  drawerForm: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "1.25rem 1.3rem 0.85rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  eyebrow: {
    margin: "0 0 0.25rem",
    color: "var(--color-fg-muted)",
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  drawerTitle: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: 850,
    color: "var(--color-fg)",
  },
  steps: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "0.4rem",
    padding: "0.85rem 1.3rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  step: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    minHeight: 34,
    borderRadius: 10,
    fontSize: "0.78rem",
    fontWeight: 800,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-fg) 4%, transparent)",
  },
  stepActive: {
    color: "var(--color-fg)",
    background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
  },
  stepDot: {
    display: "grid",
    placeItems: "center",
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "color-mix(in srgb, var(--color-fg) 8%, transparent)",
    fontSize: "0.68rem",
  },
  error: {
    margin: "0.9rem 1.3rem 0",
    padding: "0.75rem 0.85rem",
    borderRadius: 10,
    color: "#f87171",
    background: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
  drawerBody: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "1.1rem 1.3rem",
  },
  sectionStack: {
    display: "grid",
    gap: "1rem",
  },
  fieldLabel: {
    color: "var(--color-fg-muted)",
    fontSize: "0.8rem",
    fontWeight: 700,
    marginBottom: "0.35rem",
    display: "block",
  },
  infoBox: {
    padding: "0.8rem",
    borderRadius: 10,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-fg) 5%, transparent)",
    fontSize: "0.82rem",
  },
  rangeHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.8rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: 850,
    color: "var(--color-fg)",
  },
  sectionHelp: {
    margin: "0.2rem 0 0",
    color: "var(--color-fg-muted)",
    fontSize: "0.78rem",
  },
  rangeEmpty: {
    display: "grid",
    justifyItems: "center",
    gap: "0.8rem",
    padding: "1.4rem",
    borderRadius: 12,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-fg) 4%, transparent)",
    fontSize: "0.85rem",
  },
  rangeCard: {
    display: "grid",
    gap: "1rem",
    padding: "1rem",
    borderRadius: 12,
    border: "1px solid color-mix(in srgb, var(--color-fg) 9%, transparent)",
    background: "color-mix(in srgb, var(--color-fg) 3%, transparent)",
  },
  rangeEditorHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.8rem",
    alignItems: "flex-start",
  },
  rangeEditorTitle: {
    display: "block",
    fontSize: "0.92rem",
    color: "var(--color-fg)",
  },
  previewText: {
    margin: "0.25rem 0 0",
    fontSize: "0.78rem",
    color: "var(--color-fg-muted)",
  },
  formSection: {
    display: "grid",
    gap: "0.75rem",
  },
  formSectionTitle: {
    margin: 0,
    fontSize: "0.75rem",
    color: "var(--color-fg-muted)",
    textTransform: "uppercase",
    fontWeight: 850,
  },
  twoCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "0.85rem",
  },
  moneyInput: {
    fontFamily: "monospace",
    fontWeight: 850,
    color: "var(--color-success)",
  },
  summaryCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    padding: "1rem",
    borderRadius: 12,
    background: "color-mix(in srgb, var(--color-success) 10%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-success) 18%, transparent)",
  },
  summaryList: {
    display: "grid",
    gap: "0.7rem",
  },
  summaryItem: {
    display: "grid",
    gap: "0.2rem",
    padding: "0.85rem",
    borderRadius: 10,
    background: "color-mix(in srgb, var(--color-fg) 4%, transparent)",
    color: "var(--color-fg)",
    fontSize: "0.83rem",
  },
  drawerActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "1rem 1.3rem",
    borderTop: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    background: "var(--color-canvas)",
  },
};
