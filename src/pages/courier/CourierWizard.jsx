import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  Building2,
  Car,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";
import DepositoCampos, { DEPOSITO_VACIO, validarDeposito } from "../../components/depositos/DepositoCampos";
import { getCourierGeografia } from "../../services/courierApi";
import "./courierWizard.css";

const VEHICULOS = ["Moto", "Auto", "Camioneta", "Bicicleta"];
const TIPOS_PAGO = ["Ambos", "Al Recibir", "Anticipado"];
const PASO_DEPOSITO = ["deposito", "Depósito"];
const PASO_COURIER = ["courier", "Courier"];
const PASO_CIUDADES = ["ciudades", "Ciudades"];
const PASO_RESUMEN = ["resumen", "Resumen"];

// El alta de un depósito (conDeposito) arranca un paso antes: el depósito se
// carga primero y el courier nace ya vinculado a él. Si el comercio todavía no
// tiene courier (sinCourier), se saltea ciudades — no hay a quién cargárselas.
function pasosDelAsistente(conDeposito, sinCourier) {
  if (!conDeposito) return [PASO_COURIER, PASO_CIUDADES, PASO_RESUMEN];
  if (sinCourier) return [PASO_DEPOSITO, PASO_COURIER, PASO_RESUMEN];
  return [PASO_DEPOSITO, PASO_COURIER, PASO_CIUDADES, PASO_RESUMEN];
}

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
    rangos: Array.isArray(overrides.rangos)
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
    deposito: { ...DEPOSITO_VACIO },
    sinCourier: false,
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
//
// Con `conDeposito` es además el alta de un depósito: Depósito → Courier →
// Ciudades → Resumen. `onGuardar` recibe entonces también `deposito`, y
// `courier` llega en null si el comercio eligió cargarlo después.
export function CourierWizard({
  open,
  conDeposito = false,
  courier = null,
  reglas = [],
  pasoInicial = conDeposito ? "deposito" : "courier",
  esAdmin = false,
  onClose,
  onGuardar,
}) {
  const [paso, setPaso] = useState(pasoInicial);
  const [draft, setDraft] = useState(() => draftInicial(courier, reglas));
  const [erroresDeposito, setErroresDeposito] = useState({});
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [geo, setGeo] = useState([]);
  const [cargandoGeo, setCargandoGeo] = useState(false);
  const [errorGeo, setErrorGeo] = useState(false);
  const [reintentoGeo, setReintentoGeo] = useState(0);
  const [departamentoId, setDepartamentoId] = useState(null);
  const [busquedaCiudad, setBusquedaCiudad] = useState("");
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const nombreRef = useRef(null);
  const initialDraft = useRef(JSON.stringify(draft));
  const closeRef = useRef(null);
  closeRef.current = () => {
    if (guardando) return;
    if (JSON.stringify(draft) !== initialDraft.current) setConfirmarSalida(true);
    else onClose();
  };

  useEffect(() => {
    if (!open) return;
    const inicial = draftInicial(courier, reglas);
    setDraft(inicial);
    initialDraft.current = JSON.stringify(inicial);
    setConfirmarSalida(false);
    setPaso(pasoInicial);
    setErroresDeposito({});
    setError("");
    // El draft se siembra al abrir; después es del usuario hasta que cierre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement;
    const dialog = dialogRef.current;
    if (!dialog?.contains(document.activeElement)) dialog?.focus();
    const teclado = event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const controles = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
        .filter(el => el.getClientRects().length && !el.closest('[inert]'));
      const primero = controles[0], ultimo = controles.at(-1);
      if (!primero) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === primero || document.activeElement === dialog)) { event.preventDefault(); ultimo.focus(); }
      else if (!event.shiftKey && (document.activeElement === ultimo || document.activeElement === dialog)) { event.preventDefault(); primero.focus(); }
    };
    dialog?.addEventListener("keydown", teclado);
    return () => { dialog?.removeEventListener("keydown", teclado); anterior?.focus?.(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo?.({ top: 0 });
    if (paso !== "courier") bodyRef.current?.focus();
  }, [open, paso]);

  useEffect(() => {
    if (confirmarSalida) dialogRef.current?.querySelector('.cw-keep-editing')?.focus();
  }, [confirmarSalida]);

  useEffect(() => {
    if (!open || paso !== "ciudades" || geo.length > 0) return;
    let vigente = true;
    setCargandoGeo(true);
    setErrorGeo(false);
    getCourierGeografia({ conCiudades: true })
      .then((data) => {
        if (!vigente) return;
        setCargandoGeo(false);
        const lista = data || [];
        setGeo(lista);
        setDepartamentoId((prev) => prev ?? lista[0]?.id ?? null);
      })
      .catch(() => { if (vigente) setErrorGeo(true); })
      .finally(() => { if (vigente) setCargandoGeo(false); });
    return () => { vigente = false; };
  }, [open, paso, geo.length, reintentoGeo]);

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

  const PASOS = pasosDelAsistente(conDeposito, draft.sinCourier);

  function setDeposito(cambios) {
    setError("");
    setDraft(prev => ({ ...prev, deposito: { ...prev.deposito, ...cambios } }));
    setErroresDeposito(prev => {
      const siguiente = { ...prev };
      Object.keys(cambios).forEach(campo => { delete siguiente[campo]; });
      return siguiente;
    });
  }

  function setSinCourier(valor) {
    setError("");
    setDraft(prev => ({ ...prev, sinCourier: valor }));
  }

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

  function validarDepositoPaso() {
    const errores = validarDeposito(draft.deposito);
    setErroresDeposito(errores);
    return Object.keys(errores).length ? "Completá los datos obligatorios del depósito." : "";
  }

  function validarCourier() {
    if (draft.sinCourier) return "";
    if (!draft.courier.nombre.trim()) { nombreRef.current?.focus(); return "Ingresá el nombre del courier."; }
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
    if (guardando) return;

    if (paso === "deposito") {
      const problema = validarDepositoPaso();
      if (problema) return setError(problema);
      setError("");
      return setPaso("courier");
    }

    if (paso === "courier") {
      const problema = validarCourier();
      if (problema) return setError(problema);
      setError("");
      return setPaso(draft.sinCourier ? "resumen" : "ciudades");
    }

    if (paso === "ciudades") {
      const problema = validarCiudades();
      if (problema) return setError(problema);
      setError("");
      return setPaso("resumen");
    }

    const reglasFinales = draft.sinCourier ? [] : draft.ciudades
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
        ...(conDeposito ? { deposito: draft.deposito } : {}),
        courier: draft.sinCourier ? null : {
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
    } catch (err) {
      // El alta con depósito son varios guardados encadenados: quien llama
      // sabe cuál falló y lo dice en `mensajeUsuario`.
      setError(err?.mensajeUsuario || (conDeposito
        ? "No pudimos guardar el depósito. Intentá de nuevo."
        : "No pudimos guardar el courier y sus ciudades. Intentá de nuevo."));
    } finally {
      setGuardando(false);
    }
  }

  // Saltar a un paso exige que todos los anteriores estén bien cargados.
  function irAlPaso(targetPaso) {
    if (targetPaso === paso) return;

    const validadores = { deposito: validarDepositoPaso, courier: validarCourier, ciudades: validarCiudades };
    const destino = PASOS.findIndex(([key]) => key === targetPaso);
    for (const [key] of PASOS.slice(0, destino)) {
      const problema = validadores[key]?.();
      if (problema) return setError(problema);
    }

    setError("");
    setPaso(targetPaso);
  }

  function retroceder() {
    setError("");
    setPaso(PASOS[Math.max(0, activeIndex - 1)][0]);
  }

  const activeIndex = PASOS.findIndex(([key]) => key === paso);
  const esPrimerPaso = activeIndex === 0;
  const ciudadesValidas = draft.ciudades.filter(c => c.ciudad.trim());
  const totalRangos = ciudadesValidas.reduce((acc, c) => acc + totalRangosCiudad(c), 0);

  return (
    <div className="cw-overlay" style={styles.overlay} onClick={() => closeRef.current()}>
      <aside ref={dialogRef} tabIndex={-1} className={`cw-dialog cw-step-${paso}`} style={styles.drawer} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-busy={guardando} aria-labelledby="cw-title">
        {confirmarSalida && <div className="cw-exit" role="alertdialog" aria-labelledby="cw-exit-title"><h3 id="cw-exit-title">¿Salir sin guardar?</h3><p>Los datos que cargaste todavía no se guardaron.</p><div><button type="button" className="btn-secondary cw-keep-editing" onClick={() => { setConfirmarSalida(false); dialogRef.current?.focus(); }}>Seguir editando</button><button type="button" className="btn-secondary" onClick={onClose}>Descartar y cerrar</button></div></div>}
        <form onSubmit={avanzar} noValidate style={styles.form} {...(confirmarSalida ? { inert: "" } : {})}>
          <div className="cw-header" style={styles.header}>
            <div className="cw-heading"><span className="cw-heading-icon"><Truck size={25} /></span><div>
              <p style={styles.eyebrow}>{conDeposito ? "Nuevo depósito" : courier?.id ? "Editar courier" : "Nuevo courier"}</p>
              <h3 id="cw-title" style={styles.title}>
                {paso === "deposito"
                  ? "Datos del depósito"
                  : paso === "courier"
                  ? "Datos del courier"
                  : paso === "ciudades"
                    ? `Ciudades de ${draft.courier.nombre || "este courier"}`
                    : "Revisar y guardar"}
              </h3>
              <span className="cw-step-caption">Paso {activeIndex + 1} de {PASOS.length} · {paso === "courier" ? "Identificá quién va a realizar las entregas." : paso === "ciudades" ? "Definí la cobertura y los costos de envío." : paso === "resumen" ? "Revisá los datos antes de guardar." : "Definí desde dónde salen tus pedidos."}</span>
            </div></div>
            <button type="button" className="btn-icon" onClick={() => closeRef.current()} disabled={guardando} title="Cerrar" aria-label="Cerrar panel">
              <X size={18} />
            </button>
          </div>

          <nav className="cw-steps" aria-label="Pasos de configuración" style={{ ...styles.steps, gridTemplateColumns: `repeat(${PASOS.length}, minmax(0, 1fr))` }}>
            {PASOS.map(([key, label], index) => {
              const isPassedOrActive = index <= activeIndex;
              const isCurrent = key === paso;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => irAlPaso(key)}
                  className={`cw-step ${isCurrent ? "is-current" : index < activeIndex ? "is-complete" : ""}`}
                  disabled={guardando || index > activeIndex}
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
                    {index < activeIndex ? <CheckCircle2 size={17} /> : index + 1}
                  </span>
                  {label}
                  {index < PASOS.length - 1 && <ChevronRight className="cw-step-arrow" size={17} aria-hidden="true" />}
                </button>
              );
            })}
          </nav>

          {error && error !== "Ingresá el nombre del courier." && <div role="alert" style={styles.error}>{error}</div>}

          <div ref={bodyRef} tabIndex={-1} className="cw-body" style={styles.body} {...(guardando ? { inert: "" } : {})}>
            {paso === "deposito" && (
              <div style={styles.stack}>
                <p style={styles.help}>
                  Primero el lugar desde donde despachás. En el paso siguiente cargás el courier que retira de acá y las ciudades que cubre.
                </p>
                <DepositoCampos form={draft.deposito} errors={erroresDeposito} onChange={setDeposito} autoFocus />
              </div>
            )}

            {paso === "courier" && conDeposito && (
              <label style={{ ...styles.toggle, marginBottom: "1rem" }}>
                <input
                  type="checkbox"
                  checked={draft.sinCourier}
                  onChange={e => setSinCourier(e.target.checked)}
                  style={styles.checkbox}
                />
                Todavía no tengo courier: guardar solo el depósito
              </label>
            )}

            {paso === "courier" && draft.sinCourier && (
              <p style={styles.help}>
                El depósito se guarda sin courier. Podés cargarlo después desde esta misma pantalla, en la sección Couriers.
              </p>
            )}

            {paso === "courier" && !draft.sinCourier && (
              <div className="cw-courier-fields" style={styles.stack}>
                <section className="cw-card"><div className="cw-section-heading"><Building2 size={21} /><div><h4>Información del courier</h4><p>Cargá el nombre y los datos de contacto.</p></div></div>
                <p className="cw-depot-context" style={styles.help} hidden={!conDeposito}>
                  {conDeposito
                    ? `El courier que va a retirar de ${draft.deposito.nombre.trim() || "este depósito"}. Después cargás las ciudades que cubre y cuánto cobra en cada una.`
                    : ""}
                </p>

                <Field label="Nombre del courier o empresa">
                  <div style={styles.inputWrap}>
                    <Building2 size={16} style={styles.inputIcon} />
                    <input
                      ref={nombreRef}
                      autoFocus
                      className="form-input"
                      style={styles.iconInput}
                      value={draft.courier.nombre}
                      onChange={e => setCourier("nombre", e.target.value)}
                      placeholder="Ej. Propio, TSI, PAP..."
                      required
                      aria-invalid={error === "Ingresá el nombre del courier."}
                      aria-describedby={error === "Ingresá el nombre del courier." ? "cw-name-error" : undefined}
                    />
                  </div>
                </Field>
                {error === "Ingresá el nombre del courier." && <p id="cw-name-error" className="cw-field-error" role="alert">{error}</p>}

                <div className="cw-two-cols" style={styles.twoCols}>
                  <Field label="Teléfono de contacto">
                    <div style={styles.inputWrap}>
                      <Phone size={16} style={styles.inputIcon} />
                      <input
                        type="tel"
                        autoComplete="tel"
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
                </section>
                <label className="cw-status" style={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={draft.courier.activo}
                    onChange={e => setCourier("activo", e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span><strong>Courier activo</strong><small>Disponible para asignar entregas cuando guardes su cobertura.</small></span>
                </label>
                <div className="cw-next-note"><MapPin size={21} /><div><strong>Siguiente: ciudades y tarifas</strong><p>Elegí dónde entrega y cuánto cobra. Podés revisar todo antes de guardar.</p></div></div>
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
                  {errorGeo && <div className="cw-geo-error" role="alert"><p>No se pudo cargar el catálogo de ciudades.</p><button type="button" className="btn-secondary" onClick={() => setReintentoGeo(value => value + 1)}>Reintentar carga</button></div>}
                  <div className="cw-city-controls" style={styles.cityPickerControls}>
                    <Field label="Departamento">
                      <select
                        className="form-input"
                        value={departamentoId ?? ""}
                        onChange={e => setDepartamentoId(Number(e.target.value))}
                        disabled={geo.length === 0}
                      >
                        {geo.length === 0 ? (
                          <option value="">{cargandoGeo ? "Cargando ciudades..." : "Sin departamentos disponibles"}</option>
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
                      aria-pressed={tieneCoberturaInterior}
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
                        {cargandoGeo ? "Cargando catálogo..." : errorGeo ? "Reintentá la carga para seleccionar ciudades." : "No encontramos ciudades en este departamento."}
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
                          aria-pressed={seleccionada}
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

                {draft.ciudades.length > 0 && <div className="cw-tariff-heading"><h4>Tarifas de las ciudades seleccionadas</h4><span>{draft.ciudades.length} cobertura{draft.ciudades.length === 1 ? "" : "s"} · {totalRangos} rango{totalRangos === 1 ? "" : "s"}</span></div>}

                {draft.ciudades.map((ciudad, ciudadIndice) => (
                  <section className="cw-city-card" key={ciudad._id || ciudadIndice} style={styles.cityCard}>
                    <div style={styles.cityCardHeader}>
                      <span style={styles.cityBadge}>
                        <MapPin size={14} />
                        {esCoberturaInterior(ciudad) ? "Otras ciudades / interior" : (ciudad.ciudad.trim() || `Ciudad ${ciudadIndice + 1}`)}
                        {ciudad.departamento && !esCoberturaInterior(ciudad) ? <small style={styles.cityBadgeMeta}>· {ciudad.departamento}</small> : null}
                        {esCoberturaInterior(ciudad) ? <small style={styles.cityBadgeMeta}>· sin tarifa específica</small> : null}
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
                {conDeposito && (
                  <div style={styles.summaryCard}>
                    <Building2 size={20} color="var(--color-success)" />
                    <div>
                      <h4 style={styles.sectionTitle}>{draft.deposito.nombre}</h4>
                      <p style={styles.sectionHelp}>
                        {draft.deposito.direccion}
                        {` · ${draft.deposito.ciudad}`}
                        {draft.deposito.departamento ? `, ${draft.deposito.departamento}` : ""}
                      </p>
                    </div>
                  </div>
                )}

                {draft.sinCourier ? (
                  <p style={styles.help}>Sin courier por ahora. Lo cargás después desde la sección Couriers.</p>
                ) : (
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
                )}

                {!draft.sinCourier && ciudadesValidas.map((ciudad, index) => (
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

          <div className="cw-actions" style={styles.actions}>
            {esPrimerPaso ? (
              <button type="button" className="btn-secondary" onClick={() => closeRef.current()}>Cancelar</button>
            ) : (
              <button type="button" className="btn-secondary" onClick={retroceder} disabled={guardando}>
                Volver a editar
              </button>
            )}
            <button type="submit" className="btn-nuevo-pedido" disabled={guardando}>
              {paso === "deposito"
                ? "Continuar con el courier"
                : paso === "courier"
                  ? (draft.sinCourier ? "Revisar" : "Continuar con ciudades")
                  : paso === "ciudades"
                    ? "Revisar"
                    : guardando
                      ? "Guardando..."
                      : !conDeposito
                        ? "Guardar courier y ciudades"
                        : draft.sinCourier ? "Guardar depósito" : "Guardar depósito y courier"}
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

      <div className="cw-config-grid" style={styles.configGrid}>
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
            <div className="cw-range-row" key={rangoIndice} style={styles.rangeRow}>
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
    justifyContent: "center",
    alignItems: "center",
    padding: "1.25rem",
    backdropFilter: "blur(5px)",
  },
  drawer: {
    width: "min(860px, 100%)",
    maxHeight: "min(92dvh, 980px)",
    display: "flex",
    flexDirection: "column",
    borderRadius: 24,
    overflow: "hidden",
    background: "var(--color-surface)",
    color: "var(--color-fg)",
    border: "1px solid var(--color-border)",
    boxShadow: "-20px 0 45px rgba(0,0,0,0.22)",
  },
  form: {
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "1.5rem",
    flexShrink: 0,
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  eyebrow: {
    margin: "0 0 0.25rem",
    color: "var(--color-fg-muted)",
    fontSize: "var(--ui-text-help, .875rem)",
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
    gap: "1.5rem",
    flexShrink: 0,
    padding: "1rem 1.5rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  step: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    minHeight: 44,
    borderRadius: 10,
    fontSize: "var(--ui-text-help, .875rem)",
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
    background: "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))",
    color: "var(--color-primary-text)",
    border: "1px solid var(--color-primary)",
    boxShadow: "0 0 0 1px var(--color-primary)",
  },
  stepDot: {
    display: "grid",
    placeItems: "center",
    width: 26,
    height: 26,
    flexShrink: 0,
    borderRadius: 999,
    background: "color-mix(in srgb, var(--color-fg) 8%, transparent)",
    fontSize: "var(--ui-text-help, .875rem)",
    transition: "all 0.15s ease",
  },
  stepDotCurrent: {
    background: "var(--color-primary)",
    color: "var(--color-primary-fg)",
  },
  error: {
    margin: "0.9rem 1.3rem 0",
    padding: "0.75rem 0.85rem",
    borderRadius: 10,
    color: "var(--color-danger)",
    background: "color-mix(in srgb, var(--color-danger) 8%, var(--color-surface))",
    border: "1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)",
    fontSize: "var(--ui-text-help, .875rem)",
    fontWeight: 700,
  },
  body: {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    padding: "1.5rem",
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
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
    textAlign: "center",
  },
  emptySelection: {
    padding: "1rem",
    borderRadius: 12,
    border: "1px dashed color-mix(in srgb, var(--color-fg) 14%, transparent)",
    color: "var(--color-fg-muted)",
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
    fontWeight: 700,
  },
  removeConfigButton: {
    border: "none",
    background: "transparent",
    color: "var(--color-danger)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
    fontWeight: 850,
  },
  label: {
    color: "var(--color-fg-muted)",
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
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
    fontSize: "var(--ui-text-help, .875rem)",
  },
  summaryCity: {
    fontSize: "0.88rem",
    fontWeight: 850,
  },
  summaryRange: {
    color: "var(--color-fg-muted)",
    fontSize: "var(--ui-text-help, .875rem)",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "1rem 1.5rem",
    flexShrink: 0,
    borderTop: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    background: "var(--color-canvas)",
  },
};
