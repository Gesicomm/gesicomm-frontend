import { useEffect, useState } from "react";
import {
  Bike,
  Building2,
  Car,
  CheckCircle2,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";

const VEHICULOS = ["Moto", "Auto", "Camioneta", "Bicicleta"];
const TIPOS_PAGO = ["Ambos", "Al Recibir", "Anticipado"];
const PASOS = [
  ["courier", "Courier"],
  ["ciudades", "Ciudades"],
  ["resumen", "Resumen"],
];

export function VehiculoIcon({ v, size = 15 }) {
  if (v === "Moto" || v === "Bicicleta") return <Bike size={size} />;
  if (v === "Camioneta") return <Truck size={size} />;
  return <Car size={size} />;
}

export function iniciales(nombre = "") {
  return nombre.trim().slice(0, 2).toUpperCase() || "CO";
}

export function rangoLabel(rango) {
  const desde = Number(rango.rango_min) || 0;
  if (rango.rango_max === "" || rango.rango_max === null || rango.rango_max === undefined) {
    return `Desde ${desde} ${desde === 1 ? "producto" : "productos"}`;
  }
  const hasta = Number(rango.rango_max);
  return `De ${desde} a ${hasta} ${hasta === 1 ? "producto" : "productos"}`;
}

export function precioLabel(valor) {
  return `Gs ${Number(valor || 0).toLocaleString("es-PY")}`;
}

export function rangoPreview(rango) {
  const entrega = rango.tiempo_entrega_hs?.trim() || "sin tiempo estimado";
  return `${rangoLabel(rango)} · ${rango.tipo_pago || "Ambos"} · ${precioLabel(rango.costo)} · ${entrega}`;
}

const nuevoRango = () => ({
  tipo_pago: "Ambos",
  rango_min: 0,
  rango_max: "",
  costo: 0,
  tiempo_entrega_hs: "En el día",
  activo: true,
});

const nuevaCiudad = () => ({ departamento: "", ciudad: "", rangos: [nuevoRango()] });

function draftInicial(courier, reglas) {
  const ciudades = [];
  (reglas || []).forEach(regla => {
    const key = `${String(regla.departamento || "").trim().toLowerCase()}::${String(regla.ciudad || "").trim().toLowerCase()}`;
    let destino = ciudades.find(c => c.key === key);
    if (!destino) {
      destino = { key, departamento: regla.departamento || "", ciudad: regla.ciudad || "", rangos: [] };
      ciudades.push(destino);
    }
    destino.rangos.push({
      tipo_pago: regla.tipo_pago || "Ambos",
      rango_min: Number(regla.rango_min) || 0,
      rango_max: regla.rango_max === null || regla.rango_max === undefined ? "" : regla.rango_max,
      costo: Number(regla.costo) || 0,
      tiempo_entrega_hs: regla.tiempo_entrega_hs || "",
      activo: regla.activo !== false,
    });
  });

  return {
    courier: {
      nombre: courier?.nombre || "",
      telefono: courier?.telefono || "",
      vehiculo: courier?.vehiculo || "Moto",
      activo: courier?.activo !== false,
    },
    ciudades: ciudades.length ? ciudades : [nuevaCiudad()],
  };
}

// Alta y edición de un courier junto con las ciudades que cubre y sus rangos,
// en un solo flujo: la ciudad nunca se carga por separado, nace ya asignada al
// courier que se está configurando.
export function CourierWizard({
  open,
  courier = null,
  reglas = [],
  pasoInicial = "courier",
  onClose,
  onGuardar,
}) {
  const [paso, setPaso] = useState(pasoInicial);
  const [draft, setDraft] = useState(() => draftInicial(courier, reglas));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(draftInicial(courier, reglas));
    setPaso(pasoInicial);
    setError("");
    // El draft se siembra al abrir; después es del usuario hasta que cierre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function setCourier(campo, valor) {
    setError("");
    setDraft(prev => ({ ...prev, courier: { ...prev.courier, [campo]: valor } }));
  }

  function setCiudad(indice, campo, valor) {
    setError("");
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => i === indice ? { ...c, [campo]: valor } : c),
    }));
  }

  function agregarCiudad() {
    setDraft(prev => ({ ...prev, ciudades: [...prev.ciudades, nuevaCiudad()] }));
  }

  function eliminarCiudad(indice) {
    setDraft(prev => ({ ...prev, ciudades: prev.ciudades.filter((_, i) => i !== indice) }));
  }

  function setRango(ciudadIndice, rangoIndice, campo, valor) {
    setError("");
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => i !== ciudadIndice ? c : {
        ...c,
        rangos: c.rangos.map((r, j) => j === rangoIndice ? { ...r, [campo]: valor } : r),
      }),
    }));
  }

  function agregarRango(ciudadIndice) {
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => i !== ciudadIndice ? c : { ...c, rangos: [...c.rangos, nuevoRango()] }),
    }));
  }

  function eliminarRango(ciudadIndice, rangoIndice) {
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => i !== ciudadIndice ? c : {
        ...c,
        rangos: c.rangos.filter((_, j) => j !== rangoIndice),
      }),
    }));
  }

  function validarCourier() {
    if (!draft.courier.nombre.trim()) return "Ingresá el nombre del courier.";
    return "";
  }

  function validarCiudades() {
    const conNombre = draft.ciudades.filter(c => c.ciudad.trim());
    if (conNombre.length === 0) return "Agregá al menos una ciudad que cubra este courier.";

    const claves = conNombre.map(c => `${c.departamento.trim().toLowerCase()}::${c.ciudad.trim().toLowerCase()}`);
    if (new Set(claves).size !== claves.length) {
      return "Repetiste una ciudad. Juntá sus rangos en una sola tarjeta.";
    }
    if (conNombre.some(c => c.rangos.length === 0)) {
      return "Cada ciudad necesita al menos un rango de cantidad.";
    }

    const rangoInvalido = conNombre.some(c => c.rangos.some(r => (
      Number(r.rango_min) < 0 ||
      (r.rango_max !== "" && r.rango_max !== null && Number(r.rango_max) < Number(r.rango_min)) ||
      Number(r.costo) < 0
    )));
    if (rangoInvalido) {
      return "Revisá los rangos: la cantidad máxima debe ser mayor o igual a la mínima y el costo no puede ser negativo.";
    }
    return "";
  }

  async function avanzar(e) {
    e.preventDefault();

    if (paso === "courier") {
      const problema = validarCourier();
      if (problema) return setError(problema);
      setError("");
      return setPaso("ciudades");
    }

    if (paso === "ciudades") {
      const problema = validarCiudades();
      if (problema) return setError(problema);
      setError("");
      return setPaso("resumen");
    }

    const reglasFinales = draft.ciudades
      .filter(c => c.ciudad.trim())
      .flatMap(c => c.rangos.map(r => ({
        departamento: c.departamento.trim(),
        ciudad: c.ciudad.trim(),
        tipo_pago: r.tipo_pago || "Ambos",
        rango_min: Number(r.rango_min) || 0,
        rango_max: r.rango_max === "" || r.rango_max === null ? "" : Number(r.rango_max),
        costo: Number(r.costo) || 0,
        tiempo_entrega_hs: r.tiempo_entrega_hs?.trim() || "",
        activo: r.activo !== false,
      })));

    setGuardando(true);
    try {
      await onGuardar({
        courier: {
          ...(courier?.id ? { id: courier.id } : {}),
          nombre: draft.courier.nombre.trim(),
          telefono: draft.courier.telefono.trim(),
          vehiculo: draft.courier.vehiculo,
          activo: draft.courier.activo,
        },
        reglas: reglasFinales,
      });
    } catch {
      setError("No pudimos guardar el courier y sus ciudades. Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function retroceder() {
    setError("");
    setPaso(paso === "resumen" ? "ciudades" : "courier");
  }

  const activeIndex = PASOS.findIndex(([key]) => key === paso);
  const ciudadesValidas = draft.ciudades.filter(c => c.ciudad.trim());
  const totalRangos = ciudadesValidas.reduce((acc, c) => acc + c.rangos.length, 0);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <aside style={styles.drawer} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <form onSubmit={avanzar} style={styles.form}>
          <div style={styles.header}>
            <div>
              <p style={styles.eyebrow}>{courier?.id ? "Editar courier" : "Nuevo courier"}</p>
              <h3 style={styles.title}>
                {paso === "courier"
                  ? "Datos del courier"
                  : paso === "ciudades"
                    ? `Ciudades de ${draft.courier.nombre || "este courier"}`
                    : "Revisar y guardar"}
              </h3>
            </div>
            <button type="button" className="btn-icon" onClick={onClose} title="Cerrar" aria-label="Cerrar panel">
              <X size={18} />
            </button>
          </div>

          <div style={styles.steps}>
            {PASOS.map(([key, label], index) => (
              <div key={key} style={{ ...styles.step, ...(index <= activeIndex ? styles.stepActive : {}) }}>
                <span style={styles.stepDot}>{index + 1}</span>
                {label}
              </div>
            ))}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.body}>
            {paso === "courier" && (
              <div style={styles.stack}>
                <p style={styles.help}>
                  Después de estos datos vas a cargar, en el mismo paso, las ciudades que cubre y cuánto cobra en cada una.
                </p>

                <Field label="Nombre del courier o empresa">
                  <div style={styles.inputWrap}>
                    <Building2 size={16} style={styles.inputIcon} />
                    <input
                      autoFocus
                      className="form-input"
                      style={styles.iconInput}
                      value={draft.courier.nombre}
                      onChange={e => setCourier("nombre", e.target.value)}
                      placeholder="Ej. Propio, TSI, PAP..."
                      required
                    />
                  </div>
                </Field>

                <div style={styles.twoCols}>
                  <Field label="Teléfono de contacto">
                    <div style={styles.inputWrap}>
                      <Phone size={16} style={styles.inputIcon} />
                      <input
                        className="form-input"
                        style={styles.iconInput}
                        value={draft.courier.telefono}
                        onChange={e => setCourier("telefono", e.target.value)}
                        placeholder="0981 234 567"
                      />
                    </div>
                  </Field>

                  <Field label="Tipo de vehículo">
                    <div style={styles.inputWrap}>
                      <div style={styles.inputIcon}>
                        <VehiculoIcon v={draft.courier.vehiculo} size={16} />
                      </div>
                      <select
                        className="form-input"
                        style={{ ...styles.iconInput, appearance: "auto" }}
                        value={draft.courier.vehiculo}
                        onChange={e => setCourier("vehiculo", e.target.value)}
                      >
                        {VEHICULOS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </Field>
                </div>

                <label style={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={draft.courier.activo}
                    onChange={e => setCourier("activo", e.target.checked)}
                    style={styles.checkbox}
                  />
                  Courier activo
                </label>
              </div>
            )}

            {paso === "ciudades" && (
              <div style={styles.stack}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h4 style={styles.sectionTitle}>Ciudades que cubre</h4>
                    <p style={styles.sectionHelp}>
                      Cada ciudad queda asignada a este courier. Dentro de cada una definís el costo según la cantidad de productos.
                    </p>
                  </div>
                  <button type="button" className="btn-secondary" onClick={agregarCiudad}>
                    <Plus size={15} /> Agregar ciudad
                  </button>
                </div>

                {draft.ciudades.map((ciudad, ciudadIndice) => (
                  <section key={ciudadIndice} style={styles.cityCard}>
                    <div style={styles.cityCardHeader}>
                      <span style={styles.cityBadge}>
                        <MapPin size={14} />
                        {ciudad.ciudad.trim() || `Ciudad ${ciudadIndice + 1}`}
                      </span>
                      {draft.ciudades.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => eliminarCiudad(ciudadIndice)}
                          title="Quitar ciudad"
                          aria-label={`Quitar ciudad ${ciudadIndice + 1}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div style={styles.twoCols}>
                      <Field label="Departamento">
                        <input
                          className="form-input"
                          value={ciudad.departamento}
                          onChange={e => setCiudad(ciudadIndice, "departamento", e.target.value)}
                          placeholder="Central"
                        />
                      </Field>
                      <Field label="Ciudad">
                        <input
                          className="form-input"
                          value={ciudad.ciudad}
                          onChange={e => setCiudad(ciudadIndice, "ciudad", e.target.value)}
                          placeholder="Luque"
                        />
                      </Field>
                    </div>

                    <div style={styles.rangosStack}>
                      {ciudad.rangos.map((rango, rangoIndice) => (
                        <RangoEditor
                          key={rangoIndice}
                          numero={rangoIndice + 1}
                          rango={rango}
                          puedeEliminar={ciudad.rangos.length > 1}
                          onChange={(campo, valor) => setRango(ciudadIndice, rangoIndice, campo, valor)}
                          onRemove={() => eliminarRango(ciudadIndice, rangoIndice)}
                        />
                      ))}
                      <button type="button" className="btn-secondary" onClick={() => agregarRango(ciudadIndice)}>
                        <Plus size={15} /> Agregar rango a {ciudad.ciudad.trim() || "esta ciudad"}
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            )}

            {paso === "resumen" && (
              <div style={styles.stack}>
                <div style={styles.summaryCard}>
                  <CheckCircle2 size={20} color="var(--color-success)" />
                  <div>
                    <h4 style={styles.sectionTitle}>{draft.courier.nombre}</h4>
                    <p style={styles.sectionHelp}>
                      {draft.courier.vehiculo}
                      {draft.courier.telefono ? ` · ${draft.courier.telefono}` : ""}
                      {` · ${ciudadesValidas.length} ciudad${ciudadesValidas.length === 1 ? "" : "es"} · ${totalRangos} rango${totalRangos === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>

                {ciudadesValidas.map((ciudad, index) => (
                  <div key={index} style={styles.summaryItem}>
                    <strong style={styles.summaryCity}>
                      {ciudad.ciudad}, {ciudad.departamento || "Sin departamento"}
                    </strong>
                    {ciudad.rangos.map((rango, j) => (
                      <span key={j} style={styles.summaryRange}>{rangoPreview(rango)}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.actions}>
            {paso === "courier" ? (
              <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            ) : (
              <button type="button" className="btn-secondary" onClick={retroceder} disabled={guardando}>
                Volver a editar
              </button>
            )}
            <button type="submit" className="btn-nuevo-pedido" disabled={guardando}>
              {paso === "courier"
                ? "Continuar con ciudades"
                : paso === "ciudades"
                  ? "Revisar"
                  : guardando
                    ? "Guardando..."
                    : "Guardar courier y ciudades"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function RangoEditor({ numero, rango, puedeEliminar, onChange, onRemove }) {
  const sinLimite = rango.rango_max === "" || rango.rango_max === null || rango.rango_max === undefined;

  return (
    <div style={styles.rangoCard}>
      <div style={styles.rangoHeader}>
        <div>
          <strong style={styles.rangoTitle}>Rango {numero}</strong>
          <p style={styles.rangoPreview}>{rangoPreview(rango)}</p>
        </div>
        {puedeEliminar && (
          <button type="button" className="btn-icon danger" onClick={onRemove} title="Eliminar rango" aria-label="Eliminar rango">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div style={styles.twoCols}>
        <Field label="Cantidad mínima de productos">
          <input
            type="number"
            min="0"
            className="form-input"
            value={rango.rango_min}
            onChange={e => onChange("rango_min", Number(e.target.value))}
          />
        </Field>
        <Field label="Cantidad máxima de productos">
          <input
            type="number"
            min="0"
            className="form-input"
            value={sinLimite ? "" : rango.rango_max}
            onChange={e => onChange("rango_max", e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Sin límite"
            disabled={sinLimite}
          />
        </Field>
      </div>

      <label style={styles.toggle}>
        <input
          type="checkbox"
          checked={sinLimite}
          onChange={e => onChange("rango_max", e.target.checked ? "" : Number(rango.rango_min) || 0)}
          style={styles.checkbox}
        />
        Sin límite máximo
      </label>

      <div style={styles.twoCols}>
        <Field label="Método de pago aceptado">
          <select className="form-input" value={rango.tipo_pago} onChange={e => onChange("tipo_pago", e.target.value)}>
            {TIPOS_PAGO.map(tp => <option key={tp} value={tp}>{tp}</option>)}
          </select>
        </Field>
        <Field label="Costo de envío">
          <CurrencyInput
            className="form-input"
            value={rango.costo}
            onChange={val => onChange("costo", val)}
            prefix="Gs "
            style={styles.moneyInput}
          />
        </Field>
      </div>

      <div style={styles.twoCols}>
        <Field label="Tiempo estimado de entrega">
          <input
            className="form-input"
            value={rango.tiempo_entrega_hs}
            onChange={e => onChange("tiempo_entrega_hs", e.target.value)}
            placeholder="En el día"
          />
        </Field>
        <label style={{ ...styles.toggle, alignSelf: "end", paddingBottom: "0.55rem" }}>
          <input
            type="checkbox"
            checked={rango.activo !== false}
            onChange={e => onChange("activo", e.target.checked)}
            style={styles.checkbox}
          />
          Rango activo
        </label>
      </div>
    </div>
  );
}

// El label envuelve al control para que quede asociado sin depender de ids
// generados a mano — de lo contrario un lector de pantalla lee el campo sin
// nombre.
function Field({ label, children }) {
  return (
    <label className="form-group" style={{ margin: 0, display: "block" }}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1200,
    background: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    justifyContent: "flex-end",
  },
  drawer: {
    width: "min(560px, 100vw)",
    height: "100%",
    background: "var(--color-canvas)",
    color: "var(--color-fg)",
    borderLeft: "1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)",
    boxShadow: "-20px 0 45px rgba(0,0,0,0.22)",
  },
  form: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  header: {
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
  title: {
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
  body: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "1.1rem 1.3rem",
  },
  stack: {
    display: "grid",
    gap: "1rem",
  },
  help: {
    margin: 0,
    padding: "0.8rem 0.9rem",
    borderRadius: 10,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-fg) 4%, transparent)",
    fontSize: "0.82rem",
  },
  sectionHeader: {
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
  cityCard: {
    display: "grid",
    gap: "0.9rem",
    padding: "1rem",
    borderRadius: 12,
    border: "1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)",
    background: "color-mix(in srgb, var(--color-fg) 3%, transparent)",
  },
  cityCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
  },
  cityBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.85rem",
    fontWeight: 850,
    color: "var(--color-fg)",
  },
  rangosStack: {
    display: "grid",
    gap: "0.7rem",
  },
  rangoCard: {
    display: "grid",
    gap: "0.8rem",
    padding: "0.9rem",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    background: "var(--color-canvas)",
  },
  rangoHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.8rem",
    alignItems: "flex-start",
  },
  rangoTitle: {
    display: "block",
    fontSize: "0.88rem",
    color: "var(--color-fg)",
  },
  rangoPreview: {
    margin: "0.25rem 0 0",
    fontSize: "0.76rem",
    color: "var(--color-fg-muted)",
  },
  twoCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "0.85rem",
  },
  label: {
    color: "var(--color-fg-muted)",
    fontSize: "0.8rem",
    fontWeight: 700,
    marginBottom: "0.35rem",
    display: "block",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "0.8rem",
    color: "var(--color-fg-subtle)",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
  },
  iconInput: {
    paddingLeft: "2.5rem",
    width: "100%",
  },
  moneyInput: {
    fontFamily: "monospace",
    fontWeight: 850,
    color: "var(--color-success)",
  },
  toggle: {
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
  summaryCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    padding: "1rem",
    borderRadius: 12,
    background: "color-mix(in srgb, var(--color-success) 10%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-success) 18%, transparent)",
  },
  summaryItem: {
    display: "grid",
    gap: "0.3rem",
    padding: "0.85rem",
    borderRadius: 10,
    background: "color-mix(in srgb, var(--color-fg) 4%, transparent)",
    color: "var(--color-fg)",
    fontSize: "0.83rem",
  },
  summaryCity: {
    fontSize: "0.88rem",
    fontWeight: 850,
  },
  summaryRange: {
    color: "var(--color-fg-muted)",
    fontSize: "0.79rem",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "1rem 1.3rem",
    borderTop: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    background: "var(--color-canvas)",
  },
};
