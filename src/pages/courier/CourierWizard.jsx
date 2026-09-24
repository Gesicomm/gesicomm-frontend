import { useEffect, useMemo, useState } from "react";
import {
  Bike,
  Building2,
  Car,
  CheckCircle2,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";
import { getCourierGeografia } from "../../services/courierApi";

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

const nuevoRango = (overrides = {}) => ({
  tipo_pago: "Ambos",
  rango_min: 1,
  rango_max: "",
  costo: 0,
  tiempo_entrega_hs: "En el día",
  activo: true,
  ...overrides,
});

const nuevaConfiguracion = (overrides = {}) => {
  const tipoPago = overrides.tipo_pago || "Ambos";
  const tiempoEntrega = overrides.tiempo_entrega_hs || "En el día";
  const activo = overrides.activo !== false;
  return {
    _id: Math.random().toString(36).slice(2, 11),
    tipo_pago: tipoPago,
    tiempo_entrega_hs: tiempoEntrega,
    activo,
    rangos: overrides.rangos?.length
      ? overrides.rangos
      : [nuevoRango({ tipo_pago: tipoPago, tiempo_entrega_hs: tiempoEntrega, activo })],
  };
};

function siguienteRangoDesde(rango) {
  const minActual = Math.max(1, Number(rango?.rango_min) || 1);
  const maxActual = rango?.rango_max === "" || rango?.rango_max === null || rango?.rango_max === undefined
    ? minActual
    : Number(rango.rango_max) || minActual;
  return nuevoRango({
    tipo_pago: rango?.tipo_pago || "Ambos",
    rango_min: maxActual + 1,
    tiempo_entrega_hs: rango?.tiempo_entrega_hs || "En el día",
  });
}

function configuracionesDeCiudad(ciudad) {
  if (ciudad?.configuraciones?.length) return ciudad.configuraciones;
  const rangos = ciudad?.rangos?.length ? ciudad.rangos : [nuevoRango()];
  return [nuevaConfiguracion({
    tipo_pago: rangos[0]?.tipo_pago || "Ambos",
    tiempo_entrega_hs: rangos[0]?.tiempo_entrega_hs || "En el día",
    activo: rangos[0]?.activo !== false,
    rangos,
  })];
}

function totalRangosCiudad(ciudad) {
  return configuracionesDeCiudad(ciudad).reduce((acc, config) => acc + (config.rangos?.length || 0), 0);
}

function rangoPreviewConfig(config, rango) {
  const entrega = config.tiempo_entrega_hs?.trim() || "sin tiempo estimado";
  return `${rangoLabel(rango)} · ${config.tipo_pago || "Ambos"} · ${precioLabel(rango.costo)} · ${entrega}`;
}

const normalizarTexto = (valor = "") => String(valor).trim().toLowerCase();

const claveCiudad = (ciudad) => {
  if (ciudad?.ciudad_id) return `id:${ciudad.ciudad_id}`;
  return `txt:${normalizarTexto(ciudad?.departamento)}::${normalizarTexto(ciudad?.ciudad)}`;
};

const claveCatalogo = (ciudad, departamento) => (
  `txt:${normalizarTexto(departamento?.nombre)}::${normalizarTexto(ciudad?.nombre)}`
);

const nuevaCiudadDesdeCatalogo = (ciudad, departamento) => ({
  _id: Math.random().toString(36).slice(2, 11),
  key: `id:${ciudad.id}`,
  ciudad_id: ciudad.id,
  departamento_id: departamento?.id ?? null,
  pais_id: departamento?.pais_id ?? null,
  departamento: departamento?.nombre || "",
  ciudad: ciudad.nombre || "",
  configuraciones: [nuevaConfiguracion()],
});

const nuevaCoberturaInterior = (paisId = 1) => ({
  _id: Math.random().toString(36).slice(2, 11),
  key: "RESTO_PAIS",
  ciudad_id: null,
  departamento_id: null,
  pais_id: paisId || 1,
  tipo_cobertura: "RESTO_PAIS",
  departamento: "",
  ciudad: "Otras ciudades",
  configuraciones: [nuevaConfiguracion()],
});

function esCoberturaInterior(ciudad) {
  return ciudad?.tipo_cobertura === "RESTO_PAIS";
}

function draftInicial(courier, reglas) {
  const ciudades = [];
  (reglas || []).forEach(regla => {
    const key = regla.tipo_cobertura === "RESTO_PAIS"
      ? "RESTO_PAIS"
      : `${String(regla.departamento || "").trim().toLowerCase()}::${String(regla.ciudad || "").trim().toLowerCase()}`;
    let destino = ciudades.find(c => c.key === key);
    if (!destino) {
      destino = {
        _id: Math.random().toString(36).slice(2, 11),
        key,
        ciudad_id: regla.ciudad_id || null,
        departamento_id: regla.departamento_id || null,
        pais_id: regla.pais_id || null,
        tipo_cobertura: regla.tipo_cobertura || "CIUDAD",
        departamento: regla.departamento || "",
        ciudad: regla.ciudad || "",
        configuraciones: [],
      };
      ciudades.push(destino);
    }
    const tipoPago = regla.tipo_pago || "Ambos";
    const tiempoEntrega = regla.tiempo_entrega_hs || "En el día";
    const activo = regla.activo !== false;
    let config = destino.configuraciones.find(c => (
      c.tipo_pago === tipoPago &&
      c.tiempo_entrega_hs === tiempoEntrega &&
      c.activo === activo
    ));
    if (!config) {
      config = nuevaConfiguracion({
        tipo_pago: tipoPago,
        tiempo_entrega_hs: tiempoEntrega,
        activo,
        rangos: [],
      });
      destino.configuraciones.push(config);
    }
    config.rangos.push({
      rango_min: Number(regla.rango_min) || 0,
      rango_max: regla.rango_max === null || regla.rango_max === undefined ? "" : regla.rango_max,
      costo: Number(regla.costo) || 0,
    });
  });

  return {
    courier: {
      nombre: courier?.nombre || "",
      telefono: courier?.telefono || "",
      vehiculo: courier?.vehiculo || "Moto",
      activo: courier?.activo !== false,
    },
    ciudades: ciudades.length ? ciudades.slice().reverse() : [],
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
  esAdmin = false,
  onClose,
  onGuardar,
}) {
  const [paso, setPaso] = useState(pasoInicial);
  const [draft, setDraft] = useState(() => draftInicial(courier, reglas));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [geo, setGeo] = useState([]);
  const [departamentoId, setDepartamentoId] = useState(null);
  const [busquedaCiudad, setBusquedaCiudad] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(draftInicial(courier, reglas));
    setPaso(pasoInicial);
    setError("");
    // El draft se siembra al abrir; después es del usuario hasta que cierre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || paso !== "ciudades" || geo.length > 0) return;
    getCourierGeografia({ conCiudades: true })
      .then((data) => {
        const lista = data || [];
        setGeo(lista);
        setDepartamentoId((prev) => prev ?? lista[0]?.id ?? null);
      })
      .catch(() => setError("No se pudo cargar el catálogo de ciudades."));
  }, [open, paso, geo.length]);

  const departamento = useMemo(
    () => geo.find((d) => Number(d.id) === Number(departamentoId)) || null,
    [geo, departamentoId],
  );

  const ciudadesVisibles = useMemo(() => {
    const texto = busquedaCiudad.trim().toLowerCase();
    const lista = departamento?.ciudades || [];
    if (!texto) return lista;
    return lista.filter((c) => String(c.nombre || "").toLowerCase().includes(texto));
  }, [departamento, busquedaCiudad]);

  const ciudadesSeleccionadas = useMemo(() => {
    const set = new Set();
    draft.ciudades.forEach((ciudad) => {
      set.add(claveCiudad(ciudad));
      if (ciudad.departamento && ciudad.ciudad) {
        set.add(`txt:${normalizarTexto(ciudad.departamento)}::${normalizarTexto(ciudad.ciudad)}`);
      }
    });
    return set;
  }, [draft.ciudades]);

  const tieneCoberturaInterior = useMemo(
    () => draft.ciudades.some(esCoberturaInterior),
    [draft.ciudades],
  );

  if (!open) return null;

  function setCourier(campo, valor) {
    setError("");
    setDraft(prev => ({ ...prev, courier: { ...prev.courier, [campo]: valor } }));
  }

  function eliminarCiudad(indice) {
    setDraft(prev => ({ ...prev, ciudades: prev.ciudades.filter((_, i) => i !== indice) }));
  }

  function alternarCiudadCatalogo(ciudad) {
    if (!departamento) return;
    setError("");
    const claves = new Set([`id:${ciudad.id}`, claveCatalogo(ciudad, departamento)]);
    setDraft(prev => {
      const existente = prev.ciudades.find(c => claves.has(claveCiudad(c)) || claves.has(claveCatalogo({ nombre: c.ciudad }, { nombre: c.departamento })));
      if (existente) {
        return { ...prev, ciudades: prev.ciudades.filter(c => c !== existente) };
      }
      return { ...prev, ciudades: [nuevaCiudadDesdeCatalogo(ciudad, departamento), ...prev.ciudades] };
    });
  }

  function alternarCoberturaInterior() {
    setError("");
    setDraft(prev => {
      if (prev.ciudades.some(esCoberturaInterior)) {
        return { ...prev, ciudades: prev.ciudades.filter(c => !esCoberturaInterior(c)) };
      }
      const paisId = geo[0]?.pais_id || departamento?.pais_id || 1;
      return { ...prev, ciudades: [nuevaCoberturaInterior(paisId), ...prev.ciudades] };
    });
  }

  function setConfiguracion(ciudadIndice, configIndice, campo, valor) {
    setError("");
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => i !== ciudadIndice ? c : {
        ...c,
        configuraciones: configuracionesDeCiudad(c).map((config, j) => (
          j === configIndice ? { ...config, [campo]: valor } : config
        )),
      }),
    }));
  }

  function setRango(ciudadIndice, configIndice, rangoIndice, campo, valor) {
    setError("");
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => i !== ciudadIndice ? c : {
        ...c,
        configuraciones: configuracionesDeCiudad(c).map((config, j) => (
          j !== configIndice ? config : {
            ...config,
            rangos: config.rangos.map((r, k) => k === rangoIndice ? { ...r, [campo]: valor } : r),
          }
        )),
      }),
    }));
  }

  function agregarRango(ciudadIndice, configIndice) {
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => {
        if (i !== ciudadIndice) return c;
        return {
          ...c,
          configuraciones: configuracionesDeCiudad(c).map((config, j) => {
            if (j !== configIndice) return config;
            const rangos = config.rangos.length ? config.rangos : [nuevoRango()];
            const ultimo = rangos[rangos.length - 1];
            return {
              ...config,
              rangos: [
                ...rangos,
                siguienteRangoDesde({
                  ...ultimo,
                  tipo_pago: config.tipo_pago,
                  tiempo_entrega_hs: config.tiempo_entrega_hs,
                  activo: config.activo,
                }),
              ],
            };
          }),
        };
      }),
    }));
  }

  function eliminarRango(ciudadIndice, configIndice, rangoIndice) {
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => i !== ciudadIndice ? c : {
        ...c,
        configuraciones: configuracionesDeCiudad(c).map((config, j) => (
          j !== configIndice ? config : {
            ...config,
            rangos: config.rangos.filter((_, k) => k !== rangoIndice),
          }
        )),
      }),
    }));
  }

  function agregarConfiguracion(ciudadIndice) {
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => {
        if (i !== ciudadIndice) return c;
        const configuraciones = configuracionesDeCiudad(c);
        const usados = new Set(configuraciones.map(config => config.tipo_pago));
        const tipoSugerido = TIPOS_PAGO.find(tp => !usados.has(tp)) || "Ambos";
        return {
          ...c,
          configuraciones: [
            ...configuraciones,
            nuevaConfiguracion({ tipo_pago: tipoSugerido }),
          ],
        };
      }),
    }));
  }

  function eliminarConfiguracion(ciudadIndice, configIndice) {
    setDraft(prev => ({
      ...prev,
      ciudades: prev.ciudades.map((c, i) => i !== ciudadIndice ? c : {
        ...c,
        configuraciones: configuracionesDeCiudad(c).filter((_, j) => j !== configIndice),
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
    if (conNombre.some(c => configuracionesDeCiudad(c).length === 0)) {
      return "Cada ciudad necesita al menos una configuración.";
    }
    if (conNombre.some(c => configuracionesDeCiudad(c).some(config => !config.rangos?.length))) {
      return "Cada configuración necesita al menos un rango de cantidad.";
    }

    const rangoInvalido = conNombre.some(c => configuracionesDeCiudad(c).some(config => config.rangos.some(r => (
      Number(r.rango_min) < 0 ||
      (r.rango_max !== "" && r.rango_max !== null && Number(r.rango_max) < Number(r.rango_min)) ||
      Number(r.costo) < 0
    ))));
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
      .flatMap(c => configuracionesDeCiudad(c).flatMap(config => config.rangos.map(r => ({
          departamento: c.departamento.trim(),
          ciudad: c.ciudad.trim(),
          ciudad_id: c.ciudad_id || null,
          departamento_id: c.departamento_id || null,
          pais_id: c.pais_id || null,
          tipo_cobertura: c.tipo_cobertura || "CIUDAD",
          tipo_pago: config.tipo_pago || "Ambos",
          rango_min: Number(r.rango_min) || 0,
          rango_max: r.rango_max === "" || r.rango_max === null ? "" : Number(r.rango_max),
          costo: Number(r.costo) || 0,
          tiempo_entrega_hs: config.tiempo_entrega_hs?.trim() || "",
          activo: config.activo !== false,
        }))));

    setGuardando(true);
    try {
      await onGuardar({
        courier: {
          ...(courier?.id ? { id: courier.id } : {}),
          nombre: draft.courier.nombre.trim(),
          telefono: draft.courier.telefono.trim(),
          vehiculo: draft.courier.vehiculo,
          activo: draft.courier.activo,
          // Solo el admin puede publicar un courier como proveedor de
          // Gesicomm; el backend revalida igual y rechaza con 403.
        },
        reglas: reglasFinales,
      });
    } catch {
      setError("No pudimos guardar el courier y sus ciudades. Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function irAlPaso(targetPaso) {
    if (targetPaso === paso) return;

    if (targetPaso === "ciudades") {
      const probCourier = validarCourier();
      if (probCourier) return setError(probCourier);
    }

    if (targetPaso === "resumen") {
      const probCourier = validarCourier();
      if (probCourier) return setError(probCourier);
      const probCiudades = validarCiudades();
      if (probCiudades) return setError(probCiudades);
    }

    setError("");
    setPaso(targetPaso);
  }

  function retroceder() {
    setError("");
    setPaso(paso === "resumen" ? "ciudades" : "courier");
  }

  const activeIndex = PASOS.findIndex(([key]) => key === paso);
  const ciudadesValidas = draft.ciudades.filter(c => c.ciudad.trim());
  const totalRangos = ciudadesValidas.reduce((acc, c) => acc + totalRangosCiudad(c), 0);

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
            {PASOS.map(([key, label], index) => {
              const isPassedOrActive = index <= activeIndex;
              const isCurrent = key === paso;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => irAlPaso(key)}
                  style={{
                    ...styles.step,
                    ...(isPassedOrActive ? styles.stepActive : {}),
                    ...(isCurrent ? styles.stepCurrent : {}),
                  }}
                  title={`Ir a ${label}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span style={{
                    ...styles.stepDot,
                    ...(isCurrent ? styles.stepDotCurrent : {}),
                  }}>
                    {index + 1}
                  </span>
                  {label}
                </button>
              );
            })}
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
                      Elegí ciudades del catálogo por departamento. Después configurás los rangos y costos de cada una.
                    </p>
                  </div>
                </div>

                <section style={styles.cityPicker}>
                  <div style={styles.cityPickerControls}>
                    <Field label="Departamento">
                      <select
                        className="form-input"
                        value={departamentoId ?? ""}
                        onChange={e => setDepartamentoId(Number(e.target.value))}
                        disabled={geo.length === 0}
                      >
                        {geo.length === 0 ? (
                          <option value="">Cargando ciudades...</option>
                        ) : geo.map((d) => (
                          <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Buscar ciudad">
                      <div style={styles.inputWrap}>
                        <Search size={16} style={styles.inputIcon} />
                        <input
                          type="search"
                          className="form-input"
                          style={styles.iconInput}
                          value={busquedaCiudad}
                          onChange={e => setBusquedaCiudad(e.target.value)}
                          placeholder="Filtrar ciudad..."
                        />
                      </div>
                    </Field>
                  </div>

                  <div style={styles.cityList} aria-label="Ciudades disponibles">
                    <button
                      type="button"
                      style={{
                        ...styles.cityOption,
                        ...styles.cityOptionWide,
                        ...(tieneCoberturaInterior ? styles.cityOptionSelected : {}),
                      }}
                      onClick={alternarCoberturaInterior}
                    >
                      <span style={{
                        ...styles.cityCheck,
                        ...(tieneCoberturaInterior ? styles.cityCheckSelected : {}),
                      }}>
                        {tieneCoberturaInterior && <CheckCircle2 size={12} />}
                      </span>
                      <span>
                        Otras ciudades / interior
                        <small style={styles.cityOptionMeta}>Precio para ciudades sin tarifa propia</small>
                      </span>
                    </button>
                    {ciudadesVisibles.length === 0 ? (
                      <div style={styles.cityEmpty}>
                        {geo.length === 0 ? "Cargando catálogo..." : "No encontramos ciudades en este departamento."}
                      </div>
                    ) : ciudadesVisibles.map((c) => {
                      const seleccionada = ciudadesSeleccionadas.has(`id:${c.id}`) || ciudadesSeleccionadas.has(claveCatalogo(c, departamento));
                      return (
                        <button
                          key={c.id}
                          type="button"
                          style={{
                            ...styles.cityOption,
                            ...(seleccionada ? styles.cityOptionSelected : {}),
                          }}
                          onClick={() => alternarCiudadCatalogo(c)}
                        >
                          <span style={{
                            ...styles.cityCheck,
                            ...(seleccionada ? styles.cityCheckSelected : {}),
                          }}>
                            {seleccionada && <CheckCircle2 size={12} />}
                          </span>
                          <span>{c.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {draft.ciudades.length === 0 && (
                  <div style={styles.emptySelection}>
                    Seleccioná una o más ciudades del catálogo para configurar las tarifas.
                  </div>
                )}

                {draft.ciudades.map((ciudad, ciudadIndice) => (
                  <section key={ciudad._id || ciudadIndice} style={styles.cityCard}>
                    <div style={styles.cityCardHeader}>
                      <span style={styles.cityBadge}>
                        <MapPin size={14} />
                        {esCoberturaInterior(ciudad) ? "Otras ciudades / interior" : (ciudad.ciudad.trim() || `Ciudad ${ciudadIndice + 1}`)}
                        {ciudad.departamento && !esCoberturaInterior(ciudad) ? <small style={styles.cityBadgeMeta}>· {ciudad.departamento}</small> : null}
                        {esCoberturaInterior(ciudad) ? <small style={styles.cityBadgeMeta}>· fallback</small> : null}
                      </span>
                      <div style={styles.cityCardActions}>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => eliminarCiudad(ciudadIndice)}
                          title="Quitar ciudad"
                          aria-label={`Quitar ${esCoberturaInterior(ciudad) ? "otras ciudades" : ciudad.ciudad || "ciudad"}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div style={styles.configStack}>
                      {configuracionesDeCiudad(ciudad).map((config, configIndice) => (
                        <TarifaConfigEditor
                          key={config._id || configIndice}
                          numero={configIndice + 1}
                          config={config}
                          puedeEliminar={configuracionesDeCiudad(ciudad).length > 1}
                          onSharedChange={(campo, valor) => setConfiguracion(ciudadIndice, configIndice, campo, valor)}
                          onRangeChange={(rangoIndice, campo, valor) => setRango(ciudadIndice, configIndice, rangoIndice, campo, valor)}
                          onAddRange={() => agregarRango(ciudadIndice, configIndice)}
                          onRemoveRange={(rangoIndice) => eliminarRango(ciudadIndice, configIndice, rangoIndice)}
                          onRemoveConfig={() => eliminarConfiguracion(ciudadIndice, configIndice)}
                        />
                      ))}
                    </div>

                    <button type="button" style={styles.addConfigButton} onClick={() => agregarConfiguracion(ciudadIndice)}>
                      <Plus size={14} /> Agregar otra configuración (ej. distinto método de pago)
                    </button>
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
                      {esCoberturaInterior(ciudad) ? "Otras ciudades / interior" : `${ciudad.ciudad}, ${ciudad.departamento || "Sin departamento"}`}
                    </strong>
                    {configuracionesDeCiudad(ciudad).flatMap((config, configIndex) => (
                      config.rangos.map((rango, rangoIndex) => (
                        <span key={`${configIndex}-${rangoIndex}`} style={styles.summaryRange}>
                          {rangoPreviewConfig(config, rango)}
                        </span>
                      ))
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

function TarifaConfigEditor({
  numero,
  config,
  puedeEliminar,
  onSharedChange,
  onRangeChange,
  onAddRange,
  onRemoveRange,
  onRemoveConfig,
}) {
  const rangos = config.rangos.length ? config.rangos : [nuevoRango()];
  return (
    <div style={styles.configCard}>
      <div style={styles.configHeader}>
        <div>
          <strong style={styles.configTitle}>Configuración {numero}</strong>
          <span style={styles.configMeta}>
            {config.tipo_pago || "Ambos"} · {rangos.length} rango{rangos.length === 1 ? "" : "s"}
          </span>
        </div>
        {puedeEliminar && (
          <button
            type="button"
            style={styles.removeConfigButton}
            onClick={onRemoveConfig}
            title="Eliminar configuración"
          >
            Eliminar
          </button>
        )}
      </div>

      <div style={styles.configGrid}>
        <Field label="Método de pago aceptado">
          <select className="form-input" value={config.tipo_pago} onChange={e => onSharedChange("tipo_pago", e.target.value)}>
            {TIPOS_PAGO.map(tp => <option key={tp} value={tp}>{tp}</option>)}
          </select>
        </Field>
        <Field label="Tiempo estimado de entrega">
          <input
            className="form-input"
            value={config.tiempo_entrega_hs}
            onChange={e => onSharedChange("tiempo_entrega_hs", e.target.value)}
            placeholder="En el día"
          />
        </Field>
      </div>

      <div style={styles.rangosPanel}>
        <span style={styles.rangosTitle}>Costo de envío según cantidad de productos</span>
        <div style={styles.rangosRows}>
          {rangos.map((rango, rangoIndice) => (
            <div key={rangoIndice} style={styles.rangeRow}>
              <Field label="Desde">
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={rango.rango_min}
                  onChange={e => onRangeChange(rangoIndice, "rango_min", Number(e.target.value))}
                />
              </Field>
              <Field label="Hasta">
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={rango.rango_max ?? ""}
                  onChange={e => onRangeChange(rangoIndice, "rango_max", e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="sin tope"
                />
              </Field>
              <div style={styles.rangeCostAction}>
                <Field label="Costo total (Gs.)">
                  <CurrencyInput
                    className="form-input"
                    value={rango.costo}
                    onChange={val => onRangeChange(rangoIndice, "costo", val)}
                    prefix="Gs "
                    style={styles.moneyInput}
                  />
                </Field>
                {rangos.length > 1 && (
                  <button
                    type="button"
                    style={styles.inlineRemoveButton}
                    onClick={() => onRemoveRange(rangoIndice)}
                    title="Quitar rango"
                    aria-label={`Quitar rango ${rangoIndice + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button type="button" style={styles.addRangeButton} onClick={onAddRange}>
          <Plus size={13} /> Agregar rango
        </button>
      </div>

      <label style={styles.toggle}>
        <input
          type="checkbox"
          checked={config.activo !== false}
          onChange={e => onSharedChange("activo", e.target.checked)}
          style={styles.checkbox}
        />
        Tarifa activa
      </label>
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
    border: "1px solid transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    padding: "0 0.5rem",
    transition: "all 0.15s ease",
    outline: "none",
  },
  stepActive: {
    color: "var(--color-fg)",
    background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
  },
  stepCurrent: {
    border: "1px solid var(--color-primary)",
    boxShadow: "0 0 0 1px var(--color-primary)",
  },
  stepDot: {
    display: "grid",
    placeItems: "center",
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "color-mix(in srgb, var(--color-fg) 8%, transparent)",
    fontSize: "0.68rem",
    transition: "all 0.15s ease",
  },
  stepDotCurrent: {
    background: "var(--color-primary)",
    color: "#fff",
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
  cityPicker: {
    display: "grid",
    gap: "0.75rem",
    padding: "0.85rem",
    borderRadius: 12,
    border: "1px solid color-mix(in srgb, var(--color-primary) 18%, transparent)",
    background: "color-mix(in srgb, var(--color-primary) 5%, transparent)",
  },
  cityPickerControls: {
    display: "grid",
    gridTemplateColumns: "minmax(150px, 0.65fr) minmax(180px, 1fr)",
    gap: "0.75rem",
  },
  cityList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
    gap: "0.45rem",
    maxHeight: 220,
    overflowY: "auto",
    padding: "0.15rem",
  },
  cityOption: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    minHeight: 36,
    border: "1px solid color-mix(in srgb, var(--color-fg) 9%, transparent)",
    borderRadius: 9,
    background: "color-mix(in srgb, var(--color-fg) 3%, transparent)",
    color: "var(--color-fg)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.8rem",
    fontWeight: 750,
    padding: "0.45rem 0.55rem",
    textAlign: "left",
    transition: "all 0.15s ease",
  },
  cityOptionSelected: {
    border: "1px solid color-mix(in srgb, var(--color-primary) 42%, transparent)",
    background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
    color: "var(--color-primary-text)",
  },
  cityOptionWide: {
    gridColumn: "1 / -1",
  },
  cityOptionMeta: {
    display: "block",
    marginTop: 2,
    color: "var(--color-fg-muted)",
    fontSize: "0.72rem",
    fontWeight: 650,
  },
  cityCheck: {
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    width: 17,
    height: 17,
    borderRadius: 5,
    border: "1px solid color-mix(in srgb, var(--color-fg) 24%, transparent)",
    color: "#fff",
  },
  cityCheckSelected: {
    border: "1px solid var(--color-primary)",
    background: "var(--color-primary)",
  },
  cityEmpty: {
    gridColumn: "1 / -1",
    padding: "0.9rem",
    borderRadius: 9,
    border: "1px dashed color-mix(in srgb, var(--color-fg) 14%, transparent)",
    color: "var(--color-fg-muted)",
    fontSize: "0.82rem",
    textAlign: "center",
  },
  emptySelection: {
    padding: "1rem",
    borderRadius: 12,
    border: "1px dashed color-mix(in srgb, var(--color-fg) 14%, transparent)",
    color: "var(--color-fg-muted)",
    fontSize: "0.84rem",
    textAlign: "center",
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
    flexWrap: "wrap",
  },
  cityCardActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45rem",
    flexWrap: "wrap",
  },
  cityBadge: {
    display: "inline-flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.4rem",
    fontSize: "0.85rem",
    fontWeight: 850,
    color: "var(--color-fg)",
  },
  cityBadgeMeta: {
    color: "var(--color-fg-muted)",
    fontSize: "0.75rem",
    fontWeight: 750,
  },
  configStack: {
    display: "grid",
    gap: "0.85rem",
  },
  configCard: {
    display: "grid",
    gap: "0.85rem",
    padding: "0.95rem",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)",
    background: "color-mix(in srgb, var(--color-canvas) 86%, transparent)",
  },
  configHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.8rem",
    flexWrap: "wrap",
  },
  configTitle: {
    color: "var(--color-fg)",
    fontSize: "0.9rem",
    fontWeight: 850,
  },
  configMeta: {
    display: "block",
    marginTop: 3,
    color: "var(--color-fg-muted)",
    fontSize: "0.76rem",
    fontWeight: 700,
  },
  removeConfigButton: {
    border: "none",
    background: "transparent",
    color: "var(--color-danger)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.76rem",
    fontWeight: 800,
    padding: "0.1rem 0",
  },
  configGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(150px, 0.9fr) minmax(170px, 1fr)",
    gap: "0.8rem",
    paddingBottom: "0.85rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  rangosPanel: {
    display: "grid",
    gap: "0.55rem",
  },
  rangosTitle: {
    display: "block",
    color: "var(--color-fg-muted)",
    fontSize: "0.8rem",
    fontWeight: 750,
  },
  rangosRows: {
    display: "grid",
    gap: "0.75rem",
  },
  rangeRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "0.65rem 0.75rem",
    alignItems: "end",
    padding: "0.75rem",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    background: "color-mix(in srgb, var(--color-fg) 3%, transparent)",
  },
  rangeCostAction: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 36px",
    gap: "0.6rem",
    alignItems: "end",
  },
  inlineRemoveButton: {
    width: 36,
    height: 38,
    display: "inline-grid",
    placeItems: "center",
    borderRadius: 8,
    border: "1px solid color-mix(in srgb, var(--color-danger) 18%, transparent)",
    background: "color-mix(in srgb, var(--color-danger) 7%, transparent)",
    color: "var(--color-fg-muted)",
    cursor: "pointer",
  },
  addRangeButton: {
    width: "max-content",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.15rem 0",
    border: "none",
    background: "transparent",
    color: "var(--color-primary)",
    fontSize: "0.78rem",
    fontWeight: 800,
    cursor: "pointer",
  },
  addConfigButton: {
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.45rem",
    minHeight: 40,
    borderRadius: 9,
    border: "1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)",
    background: "transparent",
    color: "var(--color-fg)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.82rem",
    fontWeight: 850,
  },
  label: {
    color: "var(--color-fg-muted)",
    fontSize: "0.76rem",
    fontWeight: 700,
    marginBottom: "0.28rem",
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
