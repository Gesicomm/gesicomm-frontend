import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload, Loader2, AlertCircle, CheckCircle2, FileText, Link2, ArrowRight, ArrowLeft,
  Check, Sparkles, AlertTriangle, X, Megaphone, Info,
} from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import { formatNum, formatPYG, formatFecha, formatPct, sugerirCampanas, FILAS_POR_PAGINA } from './adsShared';
import { EncabezadoSeccion, CampoBusqueda, Paginacion } from './adsUI';

/**
 * Vista "Importar": asistente de 4 pasos.
 *
 *   1. Archivo      — elegir el .csv
 *   2. Validación   — qué leyó el sistema (columnas, período, filas)
 *   3. Relaciones   — a qué campaña va cada campaña de Meta detectada
 *   4. Confirmación — resumen de lo que se va a guardar
 *
 * El paso 2-3 corre contra /importar/analizar, que NO escribe nada: usa el
 * mismo `_prepararFilas` que la importación real, así que lo que se revisa
 * es literalmente lo que después se guarda. Recién el paso 4 escribe, y le
 * manda las relaciones elegidas para que entren ya vinculadas (en vez de
 * caer como pendientes y resolverlas después).
 */

const PASOS = [
  { id: 1, label: 'Archivo' },
  { id: 2, label: 'Validación' },
  { id: 3, label: 'Relaciones' },
  { id: 4, label: 'Confirmación' },
];

export default function AdsImportar({ tiendas = [], campanas = [], onImportado, irA }) {
  const inputArchivo = useRef(null);

  const [paso, setPaso] = useState(1);
  const [archivo, setArchivo] = useState(null);
  const [analisis, setAnalisis] = useState(null);
  const [relaciones, setRelaciones] = useState({}); // nombre_campana_meta -> campana_id
  const [analizando, setAnalizando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  const campanasVigentes = useMemo(() => campanas.filter((c) => c.estado !== 'archivada'), [campanas]);

  const reiniciar = () => {
    setPaso(1);
    setArchivo(null);
    setAnalisis(null);
    setRelaciones({});
    setError(null);
    setResultado(null);
  };

  const analizar = async (elegido) => {
    if (!elegido) return;
    if (!/\.csv$/i.test(elegido.name)) {
      setError('El archivo tiene que ser un .csv exportado de Meta Ads Manager.');
      return;
    }

    setArchivo(elegido);
    setAnalizando(true);
    setError(null);
    try {
      const res = await metaReportesService.analizarCSV(elegido);
      setAnalisis(res);
      setPaso(2);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo leer el archivo.');
      setArchivo(null);
    } finally {
      setAnalizando(false);
    }
  };

  const importar = async () => {
    setImportando(true);
    setError(null);
    try {
      const meta_integration_id = tiendas.length === 1 ? tiendas[0].id : null;
      const res = await metaReportesService.importarCSV(archivo, meta_integration_id, relaciones);
      setResultado(res.resumen);
      onImportado();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo importar el archivo.');
    } finally {
      setImportando(false);
    }
  };

  // ---- Pantalla final, fuera del asistente ----
  if (resultado) {
    return <Resultado resultado={resultado} archivo={archivo} onOtro={reiniciar} irA={irA} />;
  }

  const sinRelacionar = (analisis?.campanas_detectadas || []).filter((c) => !c.campana_id);
  const pendientesTrasRevision = sinRelacionar.filter((c) => !relaciones[c.nombre_campana_meta]);
  const filasPendientes = pendientesTrasRevision.reduce((total, c) => total + c.filas, 0);
  const filasARelacionar = sinRelacionar
    .filter((c) => relaciones[c.nombre_campana_meta])
    .reduce((total, c) => total + c.filas, 0);

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <EncabezadoSeccion
        titulo="Importar datos de Meta"
        descripcion="Subí el reporte que exportás de Meta Ads Manager. Antes de guardar nada vas a poder revisar qué leyó el sistema."
      >
        {paso > 1 && (
          <button type="button" className="btn-secondary" onClick={reiniciar}>
            <X size={14} style={{ marginRight: '0.3rem' }} /> Cancelar
          </button>
        )}
      </EncabezadoSeccion>

      <IndicadorPasos pasoActual={paso} />

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs text-danger">
          <AlertCircle size={15} className="mt-px shrink-0" /> {error}
        </div>
      )}

      {paso === 1 && (
        <PasoArchivo
          arrastrando={arrastrando}
          analizando={analizando}
          onArrastrar={setArrastrando}
          onArchivo={analizar}
          inputRef={inputArchivo}
        />
      )}

      {paso === 2 && analisis && (
        <PasoValidacion
          analisis={analisis}
          archivo={archivo}
          onVolver={reiniciar}
          onSiguiente={() => setPaso(sinRelacionar.length > 0 ? 3 : 4)}
          hayQueRelacionar={sinRelacionar.length > 0}
        />
      )}

      {paso === 3 && analisis && (
        <PasoRelaciones
          detectadas={analisis.campanas_detectadas}
          campanas={campanasVigentes}
          relaciones={relaciones}
          onCambiar={setRelaciones}
          onVolver={() => setPaso(2)}
          onSiguiente={() => setPaso(4)}
        />
      )}

      {paso === 4 && analisis && (
        <PasoConfirmacion
          analisis={analisis}
          filasARelacionar={filasARelacionar}
          filasPendientes={filasPendientes}
          importando={importando}
          onVolver={() => setPaso(sinRelacionar.length > 0 ? 3 : 2)}
          onImportar={importar}
        />
      )}
    </div>
  );
}

function IndicadorPasos({ pasoActual }) {
  return (
    <ol className="m-0 flex list-none items-center gap-1 p-0">
      {PASOS.map((p, i) => {
        const hecho = p.id < pasoActual;
        const activo = p.id === pasoActual;
        return (
          <li key={p.id} className="flex flex-1 items-center gap-1.5">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[0.7rem] font-semibold ${
              hecho ? 'bg-success/15 text-success'
                : activo ? 'bg-primary text-primary-fg'
                : 'bg-surface-3 text-fg-subtle'
            }`}>
              {hecho ? <Check size={12} strokeWidth={3} /> : p.id}
            </span>
            <span className={`whitespace-nowrap text-xs ${activo ? 'font-semibold text-fg' : 'text-fg-muted'}`}>
              {p.label}
            </span>
            {i < PASOS.length - 1 && <span className={`h-px flex-1 ${hecho ? 'bg-success/40' : 'bg-border'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function PasoArchivo({ arrastrando, analizando, onArrastrar, onArchivo, inputRef }) {
  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); onArrastrar(true); }}
        onDragLeave={() => onArrastrar(false)}
        onDrop={(e) => { e.preventDefault(); onArrastrar(false); onArchivo(e.dataTransfer.files?.[0]); }}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-8 py-12 text-center transition-colors ${
          arrastrando ? 'border-primary bg-primary/5' : 'border-border bg-surface/40'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary-text">
          {analizando ? <Loader2 size={22} className="animate-spin" /> : <FileText size={22} />}
        </div>
        <div>
          <p className="m-0 text-sm font-medium text-fg">
            {analizando ? 'Leyendo el archivo...' : 'Arrastrá tu archivo acá'}
          </p>
          <p className="m-0 mt-1 text-xs text-fg-muted">Formato .csv, hasta 5 MB</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()} disabled={analizando}>
          <Upload size={15} style={{ marginRight: '0.35rem' }} /> Seleccionar archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ''; onArchivo(a); }}
        />
      </div>

      <section>
        <h3 className="m-0 mb-2 text-sm font-semibold text-fg">Qué exportar en Meta</h3>
        <p className="m-0 text-xs text-fg-muted">
          En Ads Manager elegí el reporte <strong className="font-medium text-fg">Rendimiento de campaña</strong> y
          exportalo en .csv. Tiene que incluir la columna "Nombre de la campaña" — es la que lleva el código
          <code className="mx-1 text-fg">[GSC-…]</code> que relaciona cada dato con tus productos.
        </p>
        <p className="m-0 mt-2 flex items-start gap-1.5 text-[0.72rem] text-fg-subtle">
          <Info size={12} className="mt-0.5 shrink-0" />
          Si podés, exportá con desglose por día: Meta trae una fila por informe, y un informe de varios meses no se
          puede repartir después en períodos más chicos.
        </p>
      </section>
    </>
  );
}

function PasoValidacion({ analisis, archivo, onVolver, onSiguiente, hayQueRelacionar }) {
  const { columnas, periodo, resumen } = analisis;

  return (
    <>
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={17} className="text-success" />
          <h3 className="m-0 text-sm font-semibold text-fg">Archivo leído</h3>
        </div>
        <p className="m-0 mt-1 text-xs text-fg-muted">{archivo?.name}</p>

        <dl className="m-0 mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { k: 'Datos', v: formatNum(resumen.total) },
            { k: 'Campañas', v: formatNum(resumen.campanas) },
            { k: 'Se relacionan solas', v: formatNum(resumen.matcheadas) },
            { k: 'A revisar', v: formatNum(resumen.sin_match) },
          ].map(({ k, v }) => (
            <div key={k} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
              <dt className="m-0 text-[0.65rem] uppercase tracking-wide text-fg-subtle">{k}</dt>
              <dd className="m-0 mt-0.5 font-mono text-lg font-semibold text-fg">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="m-0 mt-3 text-xs text-fg-muted">
          Período del informe: <strong className="font-medium text-fg">{formatFecha(periodo.fecha_inicio)} → {formatFecha(periodo.fecha_fin)}</strong>
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="m-0 text-sm font-semibold text-fg">Columnas</h3>

        <p className="m-0 mt-2 flex items-center gap-1.5 text-xs text-success">
          <Check size={14} /> {columnas.reconocidas.length} reconocidas
        </p>

        {columnas.faltantes.length > 0 && (
          <div className="mt-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5">
            <p className="m-0 flex items-center gap-1.5 text-xs font-medium text-warning">
              <AlertTriangle size={14} /> Faltan columnas importantes
            </p>
            <ul className="m-0 mt-1.5 list-none p-0">
              {columnas.faltantes.map((c) => (
                <li key={c.label} className="text-[0.72rem] text-fg-muted">
                  <strong className="font-medium text-fg">{c.label}</strong> — {c.consecuencia}
                </li>
              ))}
            </ul>
          </div>
        )}

        {columnas.no_reconocidas.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-fg-muted hover:text-fg">
              {columnas.no_reconocidas.length} columnas que el sistema no usa
            </summary>
            <p className="m-0 mt-1.5 text-[0.72rem] text-fg-subtle">
              Se guardan igual en el dato crudo, pero no alimentan ninguna métrica: {columnas.no_reconocidas.join(', ')}
            </p>
          </details>
        )}
      </div>

      <Navegacion
        onVolver={onVolver}
        etiquetaVolver="Elegir otro archivo"
        onSiguiente={onSiguiente}
        etiquetaSiguiente={hayQueRelacionar ? 'Revisar relaciones' : 'Continuar'}
      />
    </>
  );
}

function PasoRelaciones({ detectadas, campanas, relaciones, onCambiar, onVolver, onSiguiente }) {
  const yaVinculadas = detectadas.filter((c) => c.campana_id);
  const aRevisar = detectadas.filter((c) => !c.campana_id);

  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [mostrarVinculadas, setMostrarVinculadas] = useState(false);

  // Sugerencias por parecido de nombre, calculadas acá con la lista de
  // campañas que el shell ya tiene: no hace falta pedirlas al backend ni
  // duplicar la heurística en dos lenguajes.
  const sugerencias = useMemo(() => {
    const mapa = new Map();
    for (const c of aRevisar) {
      mapa.set(c.nombre_campana_meta, sugerirCampanas(c.nombre_campana_meta, campanas));
    }
    return mapa;
  }, [aRevisar, campanas]);

  // Búsqueda y paginación son client-side a propósito: `detectadas` ya está
  // completo en memoria (viene del análisis previo del CSV), no hay
  // endpoint de backend que paginar acá.
  const textoBusqueda = busqueda.trim().toLowerCase();

  const filtradas = useMemo(() => {
    if (!textoBusqueda) return aRevisar;
    return aRevisar.filter((c) => c.nombre_campana_meta.toLowerCase().includes(textoBusqueda));
  }, [aRevisar, textoBusqueda]);

  // Lo que se busca puede ser justo una de las que YA se relacionan solas
  // por su código — esas no viven en `aRevisar` y el buscador de acá abajo
  // nunca las va a mostrar. Sin este chequeo, buscar el nombre de una
  // campaña ya vinculada da "0 resultados" como si no existiera, cuando en
  // realidad está resuelta y arriba.
  const vinculadasQueCoinciden = useMemo(() => {
    if (!textoBusqueda) return [];
    return yaVinculadas.filter((c) => c.nombre_campana_meta.toLowerCase().includes(textoBusqueda));
  }, [yaVinculadas, textoBusqueda]);

  // Si la búsqueda encontró algo entre las ya vinculadas, se abre solo
  // para que se vea sin un clic extra en "Ver cuáles".
  useEffect(() => {
    if (vinculadasQueCoinciden.length > 0) setMostrarVinculadas(true);
  }, [vinculadasQueCoinciden.length]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / FILAS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaSegura - 1) * FILAS_POR_PAGINA, paginaSegura * FILAS_POR_PAGINA);

  const cambiarBusqueda = (valor) => { setBusqueda(valor); setPagina(1); };

  const elegir = (nombreMeta, campanaId) => {
    onCambiar((prev) => {
      const siguiente = { ...prev };
      if (campanaId) siguiente[nombreMeta] = campanaId;
      else delete siguiente[nombreMeta];
      return siguiente;
    });
  };

  const usarSugerencias = () => {
    onCambiar((prev) => {
      const siguiente = { ...prev };
      for (const c of aRevisar) {
        const mejor = (sugerencias.get(c.nombre_campana_meta) || [])[0];
        if (mejor && mejor.puntaje >= 0.4) siguiente[c.nombre_campana_meta] = String(mejor.campana.id);
      }
      return siguiente;
    });
  };

  const haySugerenciasFuertes = aRevisar.some((c) => {
    const mejor = (sugerencias.get(c.nombre_campana_meta) || [])[0];
    return mejor && mejor.puntaje >= 0.4;
  });

  const elegidas = Object.keys(relaciones).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="m-0 text-sm font-semibold text-fg">Relacionar campañas</h3>
          <p className="m-0 mt-1 max-w-2xl text-xs text-fg-muted">
            {aRevisar.length} no traen código: elegí a qué campaña van, o dejalas sin relacionar y resolvelas después.
          </p>
        </div>
        {haySugerenciasFuertes && (
          <button type="button" className="btn-secondary" onClick={usarSugerencias}>
            <Sparkles size={14} style={{ marginRight: '0.3rem' }} /> Usar sugerencias
          </button>
        )}
      </div>

      {/* Las que se relacionan solas van ARRIBA y visibles — antes quedaban
          en un <details> escondido después de las filas a revisar, así que
          con 200+ campañas nadie las veía sin hacer scroll hasta el final. */}
      {yaVinculadas.length > 0 && (
        <div className="rounded-xl border border-success/30 bg-success/5">
          <button
            type="button"
            onClick={() => setMostrarVinculadas((v) => !v)}
            className="flex w-full items-center justify-between gap-2 border-none bg-transparent px-3 py-2.5 text-left text-xs"
          >
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <Check size={13} />
              {yaVinculadas.length} {yaVinculadas.length === 1 ? 'campaña se relaciona sola' : 'campañas se relacionan solas'} por su código
            </span>
            <span className="text-fg-subtle">{mostrarVinculadas ? 'Ocultar' : 'Ver cuáles'}</span>
          </button>
          {mostrarVinculadas && (
            <ul className="m-0 flex list-none flex-col gap-1 border-t border-success/20 p-2">
              {yaVinculadas.map((c) => {
                // Resaltada si es la que trajo hasta acá una búsqueda que
                // no encontró nada entre las pendientes.
                const esLaBuscada = vinculadasQueCoinciden.includes(c);
                return (
                  <li
                    key={c.nombre_campana_meta}
                    className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${
                      esLaBuscada ? 'bg-success/15 ring-1 ring-success/40' : ''
                    }`}
                  >
                    <span className="min-w-0 truncate text-xs text-fg-muted" title={c.nombre_campana_meta}>{c.nombre_campana_meta}</span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-success">
                      <ArrowRight size={11} /> {c.campana_nombre}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {campanas.length === 0 && (
        <p className="m-0 flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          <AlertTriangle size={14} /> No tenés campañas activas. Podés importar igual: todo va a quedar pendiente en Relaciones.
        </p>
      )}

      {aRevisar.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CampoBusqueda valor={busqueda} onChange={cambiarBusqueda} placeholder="Buscar campaña de Meta..." ancho="280px" />
          <span className="text-xs text-fg-subtle">
            {formatNum(filtradas.length)} {filtradas.length === 1 ? 'campaña' : 'campañas'} a revisar
          </span>
        </div>
      )}

      {aRevisar.length > 0 && filtradas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-fg-muted">
          {vinculadasQueCoinciden.length > 0 ? (
            <p className="m-0 flex flex-col items-center gap-1">
              <span className="inline-flex items-center gap-1.5 text-success">
                <Check size={13} />
                {vinculadasQueCoinciden.length === 1
                  ? 'Esa campaña ya se relaciona sola por su código'
                  : `${vinculadasQueCoinciden.length} campañas que coinciden ya se relacionan solas por su código`}
              </span>
              <span>No hace falta que hagas nada con {vinculadasQueCoinciden.length === 1 ? 'ella' : 'ellas'} — mirá arriba, en &quot;se relaciona sola por su código&quot;.</span>
            </p>
          ) : (
            <p className="m-0">Ninguna campaña pendiente coincide con &quot;{busqueda}&quot;.</p>
          )}
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {visibles.map((c) => {
            const sug = sugerencias.get(c.nombre_campana_meta) || [];
            const elegida = relaciones[c.nombre_campana_meta] || '';
            return (
              <li key={c.nombre_campana_meta} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[0.7rem] uppercase tracking-wide text-fg-subtle">Meta</p>
                    <p className="m-0 mt-0.5 break-words text-sm font-medium text-fg">{c.nombre_campana_meta}</p>
                    <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 text-[0.72rem] text-fg-subtle">
                      <span>{formatNum(c.filas)} {c.filas === 1 ? 'dato' : 'datos'}</span>
                      <span>Gasto {formatPYG(c.gasto)}</span>
                      {c.compras > 0 && <span>{formatNum(c.compras)} compras</span>}
                    </p>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-80">
                    <p className="m-0 text-[0.7rem] uppercase tracking-wide text-fg-subtle">Gesicomm</p>
                    <select
                      className="filter-input"
                      value={elegida}
                      onChange={(e) => elegir(c.nombre_campana_meta, e.target.value)}
                    >
                      <option value="">Dejar sin relacionar</option>
                      {campanas.map((k) => <option key={k.id} value={k.id}>{k.nombre_display}</option>)}
                    </select>

                    {sug.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[0.68rem] text-fg-subtle">
                          <Sparkles size={11} /> Sugerencias:
                        </span>
                        {sug.map(({ campana, puntaje }) => (
                          <button
                            key={campana.id}
                            type="button"
                            onClick={() => elegir(c.nombre_campana_meta, String(campana.id))}
                            className={`rounded-md border px-1.5 py-0.5 text-[0.68rem] transition-colors ${
                              String(elegida) === String(campana.id)
                                ? 'border-primary bg-primary/15 text-primary-text'
                                : 'border-border text-fg-muted hover:border-border-strong hover:text-fg'
                            }`}
                          >
                            {campana.nombre_display} · {formatPct(puntaje * 100, 0)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtradas.length > FILAS_POR_PAGINA && (
        <div className="data-table-wrapper">
          <Paginacion
            pagina={paginaSegura}
            totalPaginas={totalPaginas}
            etiqueta={`${formatNum(filtradas.length)} ${filtradas.length === 1 ? 'campaña' : 'campañas'}`}
            cargando={false}
            onCambio={setPagina}
          />
        </div>
      )}

      <Navegacion
        onVolver={onVolver}
        onSiguiente={onSiguiente}
        etiquetaSiguiente={elegidas > 0 ? `Continuar con ${elegidas} relacionadas` : 'Continuar sin relacionar'}
      />
    </>
  );
}

function PasoConfirmacion({ analisis, filasARelacionar, filasPendientes, importando, onVolver, onImportar }) {
  const { resumen, periodo, archivo } = analisis;
  const relacionadasTotal = resumen.matcheadas + filasARelacionar;

  return (
    <>
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="m-0 text-sm font-semibold text-fg">Esto es lo que se va a guardar</h3>
        <p className="m-0 mt-1 text-xs text-fg-muted">
          {archivo.nombre_archivo} · {formatFecha(periodo.fecha_inicio)} → {formatFecha(periodo.fecha_fin)}
        </p>

        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          <FilaResumen label="Datos importados" valor={formatNum(resumen.total)} />
          <FilaResumen
            label="Relacionados con una campaña"
            valor={formatNum(relacionadasTotal)}
            tono="text-success"
            detalle={filasARelacionar > 0 ? `${formatNum(resumen.matcheadas)} por código + ${formatNum(filasARelacionar)} que relacionaste ahora` : 'por su código [GSC-…]'}
          />
          <FilaResumen
            label="Quedan pendientes"
            valor={formatNum(filasPendientes)}
            tono={filasPendientes > 0 ? 'text-warning' : 'text-fg-muted'}
            detalle={filasPendientes > 0 ? 'su gasto no va a llegar a ningún producto hasta que los relaciones' : null}
          />
        </ul>
      </div>

      <Navegacion
        onVolver={onVolver}
        onSiguiente={onImportar}
        etiquetaSiguiente={importando ? 'Importando...' : 'Importar reporte'}
        deshabilitado={importando}
        cargando={importando}
        iconoSiguiente={Upload}
      />
    </>
  );
}

function FilaResumen({ label, valor, tono = 'text-fg', detalle }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-fg-muted">
        {label}
        {detalle && <span className="ml-1.5 text-[0.7rem] text-fg-subtle">({detalle})</span>}
      </span>
      <span className={`shrink-0 font-mono text-base font-semibold ${tono}`}>{valor}</span>
    </li>
  );
}

function Navegacion({ onVolver, onSiguiente, etiquetaVolver = 'Atrás', etiquetaSiguiente, deshabilitado, cargando, iconoSiguiente: Icono = ArrowRight }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
      <button type="button" className="btn-secondary" onClick={onVolver} disabled={cargando}>
        <ArrowLeft size={15} style={{ marginRight: '0.3rem' }} /> {etiquetaVolver}
      </button>
      <button type="button" className="btn-primary" onClick={onSiguiente} disabled={deshabilitado}>
        {cargando
          ? <Loader2 size={15} className="animate-spin" style={{ marginRight: '0.35rem' }} />
          : <Icono size={15} style={{ marginRight: '0.35rem' }} />}
        {etiquetaSiguiente}
      </button>
    </div>
  );
}

function Resultado({ resultado, archivo, onOtro, irA }) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="m-0 text-sm font-semibold text-fg">Reporte importado</h3>
            <p className="m-0 mt-0.5 text-xs text-fg-muted">{archivo?.name}</p>
          </div>
        </div>

        <dl className="m-0 mt-4 grid grid-cols-3 gap-3">
          {[
            { k: 'Datos', v: formatNum(resultado.total), tono: 'text-fg' },
            { k: 'Relacionados', v: formatNum(resultado.matcheadas), tono: 'text-success' },
            { k: 'Pendientes', v: formatNum(resultado.sin_match), tono: resultado.sin_match > 0 ? 'text-warning' : 'text-fg-muted' },
          ].map(({ k, v, tono }) => (
            <div key={k} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
              <dt className="m-0 text-[0.65rem] uppercase tracking-wide text-fg-subtle">{k}</dt>
              <dd className={`m-0 mt-0.5 font-mono text-lg font-semibold ${tono}`}>{v}</dd>
            </div>
          ))}
        </dl>

        {resultado.por_relacion_manual > 0 && (
          <p className="m-0 mt-3 flex items-center gap-1.5 text-xs text-fg-muted">
            <Link2 size={13} /> {formatNum(resultado.por_relacion_manual)} entraron ya relacionados por lo que elegiste en la revisión.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {resultado.sin_match > 0 && (
            <button type="button" className="btn-primary" onClick={() => irA('relaciones')}>
              <Link2 size={15} style={{ marginRight: '0.35rem' }} /> Resolver {formatNum(resultado.sin_match)} pendientes
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => irA('reportes')}>
            <FileText size={15} style={{ marginRight: '0.35rem' }} /> Ver reporte
          </button>
          <button type="button" className="btn-secondary" onClick={() => irA('resumen')}>
            <Megaphone size={15} style={{ marginRight: '0.35rem' }} /> Ir al resumen
          </button>
          <button type="button" className="btn-secondary ml-auto" onClick={onOtro}>
            <Upload size={15} style={{ marginRight: '0.35rem' }} /> Importar otro
          </button>
        </div>
      </div>
    </div>
  );
}
