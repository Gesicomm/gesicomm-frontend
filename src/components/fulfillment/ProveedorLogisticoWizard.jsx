import React, { useEffect, useMemo, useState } from 'react';
import {
  X, ArrowLeft, ArrowRight, Check, AlertCircle, Search, Warehouse, Plus, Trash2, Info,
} from 'lucide-react';
import { redFulfillmentService } from '../../services/redFulfillment.service';
import { reconstruirDesdeReglas } from './reconstruirTarifas';
import { TIPOS, CAPACIDADES, etiquetaTipo, etiquetaCapacidad } from './proveedorVocabulario';
import { etiquetaRango, etiquetaTipoPago, etiquetaTiempo, formatGs } from './vocabulario';

const PASOS = ['Proveedor', 'Operación', 'Cobertura y tarifas', 'Revisión'];

const METODOS_PAGO = ['Ambos', 'Anticipado', 'Al Recibir'];

const RANGO_INICIAL = { rango_min: 1, rango_max: 10, costo: '' };

/**
 * Alta y edición de un proveedor logístico de la red.
 *
 * Es UN solo formulario en dos modos, no dos pantallas parecidas: un alta y
 * una edición que se ven distinto obligan a aprender la misma cosa dos veces,
 * y la edición termina alcanzando menos campos que el alta.
 *
 * El centro va en el paso 2, antes que la cobertura, porque no es un detalle
 * posterior: define desde dónde presta servicio el proveedor, y la tarifa
 * pertenece al par centro+proveedor. En edición ese paso elige QUÉ operación
 * se está editando, porque un proveedor puede trabajar desde varios centros
 * con precios distintos.
 *
 * Los rangos son de CANTIDAD de unidades. Nunca de monto.
 */
export default function ProveedorLogisticoWizard({
  centros = [], proveedorExistente = null, onCerrar, onListo,
}) {
  const edicion = Boolean(proveedorExistente);

  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [cargandoTarifas, setCargandoTarifas] = useState(false);
  const [error, setError] = useState(null);
  const [avisos, setAvisos] = useState([]);

  const [proveedor, setProveedor] = useState({
    nombre: proveedorExistente?.nombre || '',
    tipo: proveedorExistente?.tipo || 'TRANSPORTADORA',
    capacidades: proveedorExistente?.capacidades || [],
    contacto: proveedorExistente?.contacto || '',
    telefono: proveedorExistente?.telefono || '',
    email: proveedorExistente?.email || '',
  });
  const [centrosDelProveedor, setCentrosDelProveedor] = useState([]);
  const [centroId, setCentroId] = useState(centros[0]?.id ?? null);

  const [geo, setGeo] = useState([]);
  const [departamentoId, setDepartamentoId] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const [configuraciones, setConfiguraciones] = useState(() => new Map());
  const [ciudadEditando, setCiudadEditando] = useState(null);

  // En edición, desde qué centros opera hoy. El primero es el que se abre.
  useEffect(() => {
    if (!edicion) return;
    redFulfillmentService.centrosDeProveedor(proveedorExistente.id)
      .then((lista) => {
        setCentrosDelProveedor(lista || []);
        if (lista?.length) setCentroId(lista[0].id);
      })
      .catch(() => setError('No se pudieron cargar los centros de este proveedor.'));
  }, [edicion, proveedorExistente]);

  // Las tarifas se leen del par centro+proveedor y se traducen al modelo del formulario.
  useEffect(() => {
    if (!edicion || !centroId) return;
    let cancelado = false;
    setCargandoTarifas(true);
    redFulfillmentService.coberturaDeProveedor(centroId, proveedorExistente.id)
      .then((reglasGuardadas) => {
        if (cancelado) return;
        const estado = reconstruirDesdeReglas(reglasGuardadas || []);
        setConfiguraciones(estado.configuraciones);
        setAvisos(estado.avisos);
      })
      .catch(() => { if (!cancelado) setError('No se pudo cargar la cobertura.'); })
      .finally(() => { if (!cancelado) setCargandoTarifas(false); });
    return () => { cancelado = true; };
  }, [edicion, centroId, proveedorExistente]);

  useEffect(() => {
    if (paso !== 2 || geo.length > 0) return;
    redFulfillmentService.geografia(true)
      .then((data) => {
        setGeo(data || []);
        setDepartamentoId((data || [])[0]?.id ?? null);
      })
      .catch(() => setError('No se pudo cargar el catálogo de ciudades.'));
  }, [paso, geo.length]);

  const departamento = useMemo(
    () => geo.find((d) => d.id === departamentoId) || null,
    [geo, departamentoId],
  );

  const ciudadesVisibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const lista = departamento?.ciudades || [];
    if (!texto) return lista;
    return lista.filter((c) => String(c.nombre).toLowerCase().includes(texto));
  }, [departamento, busqueda]);

  const alternarCiudad = (ciudad) => {
    setConfiguraciones((prev) => {
      const siguiente = new Map(prev);
      if (siguiente.has(ciudad.id)) {
        siguiente.delete(ciudad.id);
      } else {
        siguiente.set(ciudad.id, {
          ciudad_id: ciudad.id,
          ciudad: ciudad.nombre,
          departamento_id: departamento?.id ?? null,
          departamento: departamento?.nombre ?? null,
          pais_id: departamento?.pais_id ?? null,
          tipo_cobertura: 'CIUDAD',
          modalidades: [
            {
              tipoPago: 'Ambos',
              tiempo: { min: 24, max: 48 },
              rangos: [{ rango_min: 1, rango_max: '', costo: '' }]
            }
          ]
        });
      }
      return siguiente;
    });
  };

  const alternarRestoPais = () => {
    setConfiguraciones((prev) => {
      const siguiente = new Map(prev);
      if (siguiente.has('RESTO_PAIS')) {
        siguiente.delete('RESTO_PAIS');
      } else {
        siguiente.set('RESTO_PAIS', {
          ciudad_id: null,
          ciudad: 'Resto del país',
          departamento_id: null,
          departamento: null,
          pais_id: geo[0]?.pais_id ?? 1,
          tipo_cobertura: 'RESTO_PAIS',
          modalidades: [
            {
              tipoPago: 'Ambos',
              tiempo: { min: 24, max: 48 },
              rangos: [{ rango_min: 1, rango_max: '', costo: '' }]
            }
          ]
        });
      }
      return siguiente;
    });
  };

  const alternarExpandida = (ciudadId) => {
    setCiudadEditando(ciudadId);
  };

  const actualizarConfig = (ciudadId, actualizador) => {
    setConfiguraciones((prev) => {
      const siguiente = new Map(prev);
      const conf = siguiente.get(ciudadId);
      if (conf) {
        siguiente.set(ciudadId, actualizador(conf));
      }
      return siguiente;
    });
  };

  const agregarModalidadPersonal = (ciudadId) => {
    actualizarConfig(ciudadId, (conf) => ({
      ...conf,
      modalidades: [
        ...conf.modalidades,
        {
          tipoPago: 'Ambos',
          tiempo: { min: 24, max: 48 },
          rangos: [{ rango_min: 1, rango_max: '', costo: '' }]
        }
      ]
    }));
  };

  const quitarModalidadPersonal = (ciudadId, modIndex) => {
    actualizarConfig(ciudadId, (conf) => {
      if (conf.modalidades.length <= 1) return conf;
      return {
        ...conf,
        modalidades: conf.modalidades.filter((_, i) => i !== modIndex)
      };
    });
  };

  const cambiarPagoPersonal = (ciudadId, modIndex, tipo) => {
    actualizarConfig(ciudadId, (conf) => {
      const nuevasMod = [...conf.modalidades];
      nuevasMod[modIndex] = { ...nuevasMod[modIndex], tipoPago: tipo };
      return { ...conf, modalidades: nuevasMod };
    });
  };

  const cambiarTiempoPersonal = (ciudadId, modIndex, campo, valor) => {
    actualizarConfig(ciudadId, (conf) => {
      const nuevasMod = [...conf.modalidades];
      nuevasMod[modIndex] = { 
        ...nuevasMod[modIndex], 
        tiempo: { ...nuevasMod[modIndex].tiempo, [campo]: valor } 
      };
      return { ...conf, modalidades: nuevasMod };
    });
  };

  const cambiarRangoPersonal = (ciudadId, modIndex, rangoIndex, campo, valor) => {
    actualizarConfig(ciudadId, (conf) => {
      const nuevasMod = [...conf.modalidades];
      const mod = nuevasMod[modIndex];
      const nuevosRangos = [...mod.rangos];
      nuevosRangos[rangoIndex] = { ...nuevosRangos[rangoIndex], [campo]: valor };
      nuevasMod[modIndex] = { ...mod, rangos: nuevosRangos };
      return { ...conf, modalidades: nuevasMod };
    });
  };

  const agregarRangoPersonal = (ciudadId, modIndex) => {
    actualizarConfig(ciudadId, (conf) => {
      const nuevasMod = [...conf.modalidades];
      const mod = nuevasMod[modIndex];
      const ultimo = mod.rangos[mod.rangos.length - 1];
      const desde = Number(ultimo?.rango_max) ? Number(ultimo.rango_max) + 1 : 1;
      
      nuevasMod[modIndex] = {
        ...mod,
        rangos: [...mod.rangos, { rango_min: desde, rango_max: '', costo: '' }]
      };
      return { ...conf, modalidades: nuevasMod };
    });
  };

  const quitarRangoPersonal = (ciudadId, modIndex, rangoIndex) => {
    actualizarConfig(ciudadId, (conf) => {
      const nuevasMod = [...conf.modalidades];
      const mod = nuevasMod[modIndex];
      if (mod.rangos.length <= 1) return conf;
      
      nuevasMod[modIndex] = {
        ...mod,
        rangos: mod.rangos.filter((_, i) => i !== rangoIndex)
      };
      return { ...conf, modalidades: nuevasMod };
    });
  };

  const toggleCapacidad = (valor) => {
    setProveedor((p) => ({
      ...p,
      capacidades: p.capacidades.includes(valor)
        ? p.capacidades.filter((c) => c !== valor)
        : [...p.capacidades, valor],
    }));
  };

  const reglas = useMemo(() => {
    const salida = [];
    for (const [claveCiudad, ciudad] of configuraciones.entries()) {
      const mods = ciudad.modalidades || [];
      mods.forEach((mod) => {
        mod.rangos.forEach((r) => {
          salida.push({
            ciudad_id: ciudad.ciudad_id,
            ciudad: ciudad.ciudad,
            departamento_id: ciudad.departamento_id,
            departamento: ciudad.departamento,
            pais_id: ciudad.pais_id ?? null,
            tipo_cobertura: ciudad.tipo_cobertura || 'CIUDAD',
            tipo_pago: mod.tipoPago,
            rango_min: Number(r.rango_min) || 0,
            rango_max: r.rango_max === '' ? null : Number(r.rango_max),
            costo: Number(r.costo) || 0,
            tiempo_entrega_min_hs: mod.tiempo.min === '' ? null : Number(mod.tiempo.min),
            tiempo_entrega_max_hs: mod.tiempo.max === '' ? null : Number(mod.tiempo.max),
            activo: true,
          });
        });
      });
    }
    return salida;
  }, [configuraciones]);

  const configuracionesValidas = useMemo(() => {
    if (configuraciones.size === 0) return false;
    for (const conf of configuraciones.values()) {
      const mods = conf.modalidades || [];
      if (mods.length === 0) return false;
      for (const mod of mods) {
        if (!mod.rangos || mod.rangos.length === 0) return false;
        if (!mod.rangos.every(r => Number(r.costo) > 0)) return false;
        
        const tiempoInvalido = (mod.tiempo.min === '') !== (mod.tiempo.max === '')
          || (mod.tiempo.min !== '' && Number(mod.tiempo.max) < Number(mod.tiempo.min));
        if (tiempoInvalido) return false;
      }
    }
    return true;
  }, [configuraciones]);

  const puedeAvanzar = () => {
    if (paso === 0) return proveedor.nombre.trim() !== '';
    if (paso === 1) return Boolean(centroId);
    if (paso === 2) return !ciudadEditando && configuracionesValidas;
    return true;
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      if (edicion) {
        await redFulfillmentService.actualizarProveedor(proveedorExistente.id, proveedor);
        // Vincular es idempotente: si ya operaba desde este centro no hace
        // nada, y si es uno nuevo lo suma sin tocar los otros.
        await redFulfillmentService.vincularProveedor(centroId, proveedorExistente.id);
        await redFulfillmentService.guardarCoberturaDeProveedor(centroId, proveedorExistente.id, reglas);
      } else {
        const creado = await redFulfillmentService.crearProveedor({ ...proveedor, centro_id: centroId });
        await redFulfillmentService.guardarCoberturaDeProveedor(centroId, creado.id, reglas);
      }
      onListo?.();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el proveedor.');
    } finally {
      setGuardando(false);
    }
  };

  const centro = centros.find((c) => c.id === centroId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-surface shadow-xl">
        <header className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="m-0 text-lg font-semibold text-fg">
              {edicion ? 'Editar proveedor logístico' : 'Nuevo proveedor logístico'}
            </h2>
            <p className="m-0 mt-0.5 text-[13px] text-fg-muted">
              Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </header>

        {/* En edición los pasos son navegables: no se está completando una
            secuencia, se está corrigiendo algo puntual y obligar a pasar por
            todo para llegar a las tarifas sería un peaje inútil. */}
        <div className="flex flex-shrink-0 gap-1 border-b border-border px-5 py-2">
          {PASOS.map((p, i) => (
            edicion ? (
              <button
                key={p}
                type="button"
                onClick={() => setPaso(i)}
                aria-label={`Ir a ${p}`}
                className={`h-1 flex-1 cursor-pointer rounded-full border-none p-0 ${
                  i === paso ? 'bg-primary' : 'bg-surface-2 hover:bg-primary/40'
                }`}
              />
            ) : (
              <span key={p} className={`h-1 flex-1 rounded-full ${i <= paso ? 'bg-primary' : 'bg-surface-2'}`} />
            )
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ── PASO 1 · Proveedor ───────────────────────────────────── */}
          {paso === 0 && (
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fg">Nombre</span>
                <input
                  value={proveedor.nombre}
                  onChange={(e) => setProveedor({ ...proveedor, nombre: e.target.value })}
                  placeholder="Transportadora XYZ"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-medium text-fg">Tipo</span>
                <div className="flex flex-col gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.valor}
                      type="button"
                      onClick={() => setProveedor({ ...proveedor, tipo: t.valor })}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        proveedor.tipo === t.valor ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="block text-sm font-medium text-fg">{t.etiqueta}</span>
                      <span className="block text-[12px] text-fg-muted">{t.ayuda}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-fg">Capacidades</span>
                <p className="m-0 mb-2 flex items-start gap-1.5 text-[12px] text-fg-muted">
                  <Info size={13} className="mt-0.5 flex-shrink-0" />
                  Por ahora son una ficha de qué sabe hacer el proveedor: quedan registradas
                  pero todavía no activan ningún flujo automático.
                </p>
                <div className="flex flex-col gap-1.5">
                  {CAPACIDADES.map((c) => {
                    const marcada = proveedor.capacidades.includes(c.valor);
                    return (
                      <button
                        key={c.valor}
                        type="button"
                        onClick={() => toggleCapacidad(c.valor)}
                        className="flex items-start gap-2.5 rounded-md border border-border p-2.5 text-left hover:border-primary/50"
                      >
                        <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                          marcada ? 'border-primary bg-primary' : 'border-fg-muted'
                        }`}>
                          {marcada && <Check size={11} className="text-white" />}
                        </span>
                        <span>
                          <span className="block text-sm text-fg">{c.etiqueta}</span>
                          <span className="block text-[12px] text-fg-muted">{c.ayuda}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[['contacto', 'Contacto'], ['telefono', 'Teléfono'], ['email', 'Email']].map(([campo, etiqueta]) => (
                  <label key={campo} className="block">
                    <span className="mb-1 block text-sm font-medium text-fg">{etiqueta}</span>
                    <input
                      value={proveedor[campo]}
                      onChange={(e) => setProveedor({ ...proveedor, [campo]: e.target.value })}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── PASO 2 · Operación ───────────────────────────────────── */}
          {paso === 1 && (
            <div>
              <span className="mb-1 block text-sm font-medium text-fg">Centro operativo</span>
              <p className="m-0 mb-3 text-[13px] text-fg-muted">
                {edicion
                  ? 'Qué operación estás editando. Cada centro tiene sus propias tarifas, así que cambiar de centro acá muestra otras.'
                  : 'Desde dónde trabaja este proveedor. La tarifa pertenece al par centro + proveedor: el mismo proveedor puede cobrar distinto a la misma ciudad según desde dónde salga.'}
              </p>

              {centros.length === 0 ? (
                <p className="rounded-md bg-warning/10 px-4 py-3 text-sm text-warning">
                  Todavía no hay ningún centro en la red. Designá uno antes de sumar proveedores.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {centros.map((c) => {
                      const elegido = centroId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCentroId(c.id)}
                          className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                            elegido ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                            elegido ? 'border-primary bg-primary' : 'border-fg-muted'
                          }`}>
                            {elegido && <Check size={10} className="text-white" />}
                          </span>
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
                            <Warehouse size={17} />
                          </span>
                          <span>
                            <span className="block text-sm font-medium text-fg">{c.nombre}</span>
                            <span className="block text-[12px] text-fg-muted">
                              {c.ciudad}
                              {edicion && (centrosDelProveedor.some((x) => x.id === c.id)
                                ? ' · ya opera acá'
                                : ' · sumar esta operación')}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {centro && (
                    <p className="m-0 mt-4 rounded-md bg-surface-2 px-4 py-3 text-[13px] text-fg">
                      <strong className="font-semibold">{proveedor.nombre || 'Este proveedor'}</strong>
                      {' '}va a trabajar desde <strong className="font-semibold">{centro.nombre}</strong>
                      {centro.ciudad ? ` · ${centro.ciudad}` : ''}.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── PASO 3 · Cobertura y tarifas ─────────────────────────── */}
          {paso === 2 && (
            <div>
              {cargandoTarifas && (
                <p className="m-0 mb-3 text-[13px] text-fg-muted">Cargando las tarifas de este centro…</p>
              )}

              {avisos.length > 0 && (
                <div className="mb-4 rounded-md bg-warning/10 px-4 py-3 text-[13px] text-warning">
                  {avisos.map((a) => <p key={a} className="m-0">{a}</p>)}
                </div>
              )}


              {!ciudadEditando ? (
                <>
                  {configuraciones.size > 0 && (
                    <section className="mb-6">
                      <span className="mb-2 block text-sm font-medium text-fg">
                        Ciudades seleccionadas ({configuraciones.size})
                      </span>
                      <ul className="m-0 list-none overflow-hidden rounded-lg border border-border p-0">
                        {[...configuraciones.entries()].map(([claveCiudad, ciudad]) => {
                          const mods = ciudad.modalidades || [];
                          const totalRangos = mods.reduce((acc, mod) => acc + (mod.rangos?.length || 0), 0);
                          const isMultipleMod = mods.length > 1;
                          
                          let preciosResumen = 'Sin rangos';
                          if (isMultipleMod) {
                            preciosResumen = `${mods.length} configuraciones`;
                          } else if (mods.length === 1 && mods[0].rangos?.length > 0) {
                            preciosResumen = mods[0].rangos.map((r) => formatGs(Number(r.costo) || 0)).join(' · ');
                          }

                          return (
                            <li key={claveCiudad} className="border-b border-border last:border-b-0">
                              <div className="flex items-center gap-3 px-3 py-2 bg-surface-2/30">
                                <span className="flex-1">
                                  <span className="block text-sm text-fg">{ciudad.ciudad}</span>
                                  <span className="block text-[12px] text-fg-muted">
                                    {totalRangos} rango{totalRangos > 1 ? 's' : ''} en total
                                  </span>
                                </span>
                                <span className="text-sm font-semibold text-fg text-right">
                                  {preciosResumen}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => alternarExpandida(claveCiudad)}
                                  className="cursor-pointer border-none bg-transparent p-0 text-[12px] font-medium text-primary hover:underline ml-2"
                                >
                                  Opciones Avanzadas
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}

                  <section>
                    <span className="mb-2 block text-sm font-medium text-fg">Buscar y agregar ciudades</span>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <select
                        value={departamentoId ?? ''}
                        onChange={(e) => setDepartamentoId(Number(e.target.value))}
                        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
                      >
                        {geo.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                      </select>
                      <div className="relative min-w-[180px] flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                        <input
                          type="search"
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          placeholder="Buscar ciudad…"
                          className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-fg"
                        />
                      </div>
                    </div>

                    <ul className="m-0 max-h-48 list-none overflow-y-auto rounded-lg border border-border p-0">
                      {(!busqueda || 'resto del país'.includes(busqueda.toLowerCase())) && (
                        <li key="RESTO_PAIS" className="border-b border-border bg-primary/5">
                          <button
                            type="button"
                            onClick={alternarRestoPais}
                            className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3 py-2 text-left hover:bg-surface-2/50"
                          >
                            <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                              configuraciones.has('RESTO_PAIS') ? 'border-primary bg-primary' : 'border-fg-muted'
                            }`}>
                              {configuraciones.has('RESTO_PAIS') && <Check size={11} className="text-white" />}
                            </span>
                            <span className="text-sm font-medium text-fg">Resto del país (ciudades no seleccionadas)</span>
                          </button>
                        </li>
                      )}
                      {ciudadesVisibles.map((c) => {
                        const elegida = configuraciones.has(c.id);
                        return (
                          <li key={c.id} className="border-b border-border last:border-b-0">
                            <button
                              type="button"
                              onClick={() => alternarCiudad(c)}
                              className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3 py-2 text-left hover:bg-surface-2"
                            >
                              <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                                elegida ? 'border-primary bg-primary' : 'border-fg-muted'
                              }`}>
                                {elegida && <Check size={11} className="text-white" />}
                              </span>
                              <span className="text-sm text-fg">{c.nombre}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                </>
              ) : (
                <section>
                  {(() => {
                    const ciudad = configuraciones.get(ciudadEditando);
                    if (!ciudad) return null;
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 border-b border-border pb-3">
                          <button
                            type="button"
                            onClick={() => setCiudadEditando(null)}
                            className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-surface p-1.5 text-fg hover:bg-surface-2"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <div>
                            <h3 className="m-0 text-base font-semibold text-fg">
                              Configurando: {ciudad.ciudad}
                            </h3>
                            <p className="m-0 text-[13px] text-fg-muted">
                              Agregá rangos, definí los costos, tiempos y métodos de pago.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-5">
                          {(ciudad.modalidades || []).map((mod, modIndex) => (
                            <div key={modIndex} className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2/30 p-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="block text-[14px] font-medium text-fg">
                                  Configuración {modIndex + 1}
                                </span>
                                {ciudad.modalidades.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => quitarModalidadPersonal(ciudadEditando, modIndex)}
                                    className="cursor-pointer border-none bg-transparent text-[12px] text-danger hover:underline"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap items-end gap-4 border-b border-border/50 pb-4">
                                <label className="block flex-1 min-w-[150px]">
                                  <span className="mb-1 block text-[13px] font-medium text-fg-subtle">Método de pago aceptado</span>
                                  <select
                                    value={mod.tipoPago}
                                    onChange={(e) => cambiarPagoPersonal(ciudadEditando, modIndex, e.target.value)}
                                    className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-[14px] text-fg"
                                  >
                                    {METODOS_PAGO.map((m) => (
                                      <option key={m} value={m}>{etiquetaTipoPago(m)}</option>
                                    ))}
                                  </select>
                                </label>
                                <div className="flex flex-col gap-1">
                                  <span className="block text-[13px] font-medium text-fg-subtle">Plazo de entrega estimado (en horas)</span>
                                  <div className="flex gap-3">
                                    <label className="block flex-1">
                                      <div className="flex items-center">
                                        <span className="mr-2 text-[12px] text-fg-muted">Mínimo:</span>
                                        <input
                                          type="number" min="0" value={mod.tiempo.min}
                                          onChange={(e) => cambiarTiempoPersonal(ciudadEditando, modIndex, 'min', e.target.value)}
                                          placeholder="Ej: 24"
                                          className="w-24 rounded-md border border-border bg-surface px-3 py-1.5 text-[14px] text-fg"
                                        />
                                      </div>
                                    </label>
                                    <label className="block flex-1">
                                      <div className="flex items-center">
                                        <span className="mr-2 text-[12px] text-fg-muted">Máximo:</span>
                                        <input
                                          type="number" min="0" value={mod.tiempo.max}
                                          onChange={(e) => cambiarTiempoPersonal(ciudadEditando, modIndex, 'max', e.target.value)}
                                          placeholder="Ej: 48"
                                          className="w-24 rounded-md border border-border bg-surface px-3 py-1.5 text-[14px] text-fg"
                                        />
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 pt-1">
                                <span className="block text-[13px] font-medium text-fg-subtle">Costo de envío según la cantidad de unidades/bultos</span>
                                {mod.rangos.map((r, i) => (
                                  <div key={i} className="flex flex-wrap items-end gap-3 pb-2">
                                    <label className="block">
                                      <span className="mb-1 block text-[12px] text-fg-muted">Desde (unidades)</span>
                                      <input
                                        type="number" min="0" value={r.rango_min}
                                        onChange={(e) => cambiarRangoPersonal(ciudadEditando, modIndex, i, 'rango_min', e.target.value)}
                                        className="w-28 rounded-md border border-border bg-surface px-3 py-1.5 text-[14px] text-fg"
                                      />
                                    </label>
                                    <label className="block">
                                      <span className="mb-1 block text-[12px] text-fg-muted">Hasta (unidades)</span>
                                      <input
                                        type="number" min="0" value={r.rango_max}
                                        onChange={(e) => cambiarRangoPersonal(ciudadEditando, modIndex, i, 'rango_max', e.target.value)}
                                        placeholder="sin tope"
                                        className="w-28 rounded-md border border-border bg-surface px-3 py-1.5 text-[14px] text-fg"
                                      />
                                    </label>
                                    <label className="block">
                                      <span className="mb-1 block text-[12px] text-fg-muted">Costo total (Gs.)</span>
                                      <input
                                        type="text" 
                                        value={r.costo ? Number(r.costo).toLocaleString('es-PY') : ''}
                                        onChange={(e) => {
                                          const rawVal = e.target.value.replace(/\D/g, '');
                                          cambiarRangoPersonal(ciudadEditando, modIndex, i, 'costo', rawVal);
                                        }}
                                        placeholder="0"
                                        className="w-32 rounded-md border border-border bg-surface px-3 py-1.5 text-[14px] text-fg"
                                      />
                                    </label>
                                    {mod.rangos.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => quitarRangoPersonal(ciudadEditando, modIndex, i)}
                                        className="mb-1.5 cursor-pointer border-none bg-transparent p-1.5 text-fg-muted hover:text-danger"
                                        title="Quitar rango"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => agregarRangoPersonal(ciudadEditando, modIndex)}
                                  className="mt-1 flex w-max cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[12px] font-medium text-primary hover:underline"
                                >
                                  <Plus size={13} /> Agregar rango
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => agregarModalidadPersonal(ciudadEditando)}
                          className="w-max cursor-pointer rounded-md border border-border bg-surface px-4 py-2 text-[13px] font-medium text-fg hover:bg-surface-2"
                        >
                          + Agregar otra configuración (ej. distinto método de pago)
                        </button>

                        <div className="mt-4 border-t border-border pt-4">
                          <button
                            type="button"
                            onClick={() => setCiudadEditando(null)}
                            className="w-full cursor-pointer rounded-md bg-primary py-2.5 text-center text-[13px] font-semibold text-primary-fg hover:bg-primary/90"
                          >
                            Listo, volver a la lista de ciudades
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </section>
              )}
            </div>
          )}

          {/* ── PASO 4 · Revisión ────────────────────────────────────── */}
          {paso === 3 && (
            <div className="flex flex-col gap-4">
              <section>
                <h3 className="m-0 mb-1 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Proveedor</h3>
                <p className="m-0 text-sm text-fg">{proveedor.nombre} · {etiquetaTipo(proveedor.tipo)}</p>
                {[proveedor.contacto, proveedor.telefono, proveedor.email].filter(Boolean).length > 0 && (
                  <p className="m-0 mt-0.5 text-[13px] text-fg-muted">
                    {[proveedor.contacto, proveedor.telefono, proveedor.email].filter(Boolean).join(' · ')}
                  </p>
                )}
              </section>

              {proveedor.capacidades.length > 0 && (
                <section>
                  <h3 className="m-0 mb-1 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Capacidades</h3>
                  <ul className="m-0 list-none p-0">
                    {proveedor.capacidades.map((c) => (
                      <li key={c} className="text-sm text-fg">{etiquetaCapacidad(c)}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h3 className="m-0 mb-1 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Centro</h3>
                <p className="m-0 text-sm text-fg">{centro?.nombre} · {centro?.ciudad}</p>
              </section>

              <section>
                <h3 className="m-0 mb-1 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                  Reglas que se van a crear ({reglas.length})
                </h3>
                <p className="m-0 mb-2 text-[12px] text-fg-muted">
                  {configuraciones.size} ciudad{configuraciones.size === 1 ? '' : 'es'} configurada{configuraciones.size === 1 ? '' : 's'}.
                </p>
                <ul className="m-0 max-h-56 list-none overflow-y-auto rounded-lg border border-border p-0">
                  {reglas.map((r, i) => {
                    const elPlazo = etiquetaTiempo(r.tiempo_entrega_min_hs, r.tiempo_entrega_max_hs);
                    return (
                      <li key={i} className="flex flex-wrap items-center gap-x-3 border-b border-border px-3 py-1.5 last:border-b-0">
                        <span className="flex-1 text-[13px] font-medium text-fg">{r.ciudad}</span>
                        <span className="text-[12px] text-fg-muted">{etiquetaRango(r.rango_min, r.rango_max)}</span>
                        <span className="text-[12px] text-fg-muted">{etiquetaTipoPago(r.tipo_pago)}</span>
                        {elPlazo && <span className="text-[12px] text-fg-muted">{elPlazo}</span>}
                        <span className="text-[13px] font-semibold text-fg">{formatGs(r.costo)}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="m-0">{error}</p>
            </div>
          )}
        </div>

        <footer className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3">
          <button
            type="button"
            disabled={paso === 0 || guardando}
            onClick={() => setPaso((p) => p - 1)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm text-fg-muted hover:text-fg disabled:opacity-40"
          >
            <ArrowLeft size={15} /> Atrás
          </button>

          {paso < PASOS.length - 1 ? (
            <button
              type="button"
              disabled={!puedeAvanzar()}
              onClick={() => setPaso((p) => p + 1)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              Continuar <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              disabled={guardando}
              onClick={guardar}
              className="flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : (edicion ? 'Guardar cambios' : 'Crear proveedor')}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
