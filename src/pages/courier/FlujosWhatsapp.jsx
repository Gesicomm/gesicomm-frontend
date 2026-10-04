import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus, Trash2, Edit2, Loader2, GripVertical, Copy, X, Search,
  Clock, AlertCircle, Tag, Eye, Check, ArrowLeft, Info,
} from "lucide-react";
import { seguimientoService } from "../../services/seguimiento.service";
import {
  resolverConEjemplos, partirMensaje, variablesDesconocidas, agruparVariables,
  nombreSugerido, desarmarEspera, formatEspera, horaSimulada, UNIDADES,
} from "./variablesWhatsapp";
import "./flujos-whatsapp.css";

/**
 * Constructor de flujos de WhatsApp.
 *
 * Dos columnas: a la izquierda se construye el flujo, a la derecha se ve el
 * mensaje como lo va a recibir el cliente, con datos de ejemplo y en vivo
 * mientras se escribe. La fase que se está editando es la misma que muestra
 * el preview — no hay dos selecciones que puedan desincronizarse.
 *
 * La espera es SUGERIDA y vive en el conector entre fases, no adentro de
 * ellas: una fase no se completa ni se bloquea nunca. Desde el pedido el
 * operador abre cualquier fase, en cualquier orden, las veces que quiera.
 */

const faseNueva = (indice) => ({
  _key: `nueva-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  id: null,
  nombre: nombreSugerido(indice),
  mensaje: "",
  // La primera fase no tiene "espera desde la anterior": arranca cuando el
  // operador quiere. De la segunda en adelante, 4 h es el default razonable.
  espera_sugerida_minutos: indice === 0 ? 0 : 240,
  etiqueta_id: null,
});

const flujoNuevo = () => ({
  id: null,
  nombre: "",
  descripcion: "",
  activo: true,
  fases: [faseNueva(0)],
});

/** Las fases que llegan del backend necesitan una key estable para el drag & drop. */
function conKeys(fases) {
  return (fases || []).map((f) => ({
    ...f,
    _key: `fase-${f.id}`,
    etiqueta_id: f.etiqueta_id ?? null,
    espera_sugerida_minutos: f.espera_sugerida_minutos ?? 0,
  }));
}

/**
 * `servicio` existe solo como costura para el banco de pruebas
 * (__DevFlujos.jsx, ruta /dev/flujos): permite ver la pantalla con datos
 * falsos sin backend ni sesion. En produccion nunca se pasa, y el
 * componente es EL MISMO — no hay una segunda version de esta pantalla.
 */
export function FlujosWhatsapp({ onModoEdicion, servicio = seguimientoService }) {
  const [flujos, setFlujos] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [variables, setVariables] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState([]);

  // Una sola selección para el editor y el preview.
  const [faseActiva, setFaseActiva] = useState(0);
  const [modoPreview, setModoPreview] = useState("ejemplo");
  const [previewMovil, setPreviewMovil] = useState(false);
  const [flujoCompleto, setFlujoCompleto] = useState(false);

  // Para hacer scroll y dar foco a la fase recién agregada.
  const refsFase = useRef({});
  const faseAEnfocar = useRef(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resFlujos, resEtiquetas, resVariables] = await Promise.all([
        servicio.getFlujos(),
        servicio.getEtiquetas(),
        servicio.getVariables(),
      ]);
      setFlujos(resFlujos || []);
      setEtiquetas(resEtiquetas || []);
      setVariables(resVariables || []);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar los flujos");
    } finally {
      setCargando(false);
    }
  }, [servicio]);

  useEffect(() => { cargar(); }, [cargar]);

  // El constructor ocupa la pantalla: el contenedor esconde su encabezado y
  // las otras secciones mientras se edita un flujo.
  useEffect(() => {
    if (onModoEdicion) onModoEdicion(!!editando);
  }, [editando, onModoEdicion]);

  // Scroll + foco a la fase nueva, una vez que React la pintó.
  useEffect(() => {
    const indice = faseAEnfocar.current;
    if (indice === null || indice === undefined) return;
    faseAEnfocar.current = null;
    const nodo = refsFase.current[indice];
    if (!nodo) return;
    nodo.scrollIntoView({ behavior: "smooth", block: "center" });
    nodo.querySelector("input")?.focus();
  }, [editando?.fases?.length]);

  const abrirNuevo = () => {
    setErroresValidacion([]);
    setFaseActiva(0);
    setEditando(flujoNuevo());
  };

  const abrirExistente = async (flujo) => {
    setErroresValidacion([]);
    setFaseActiva(0);
    try {
      const completo = await servicio.getFlujo(flujo.id);
      setEditando({ ...completo, fases: conKeys(completo.fases) });
    } catch (e) {
      console.error(e);
      setError("No se pudo abrir el flujo");
    }
  };

  const cambiarFase = (idx, campo, valor) => {
    setEditando((prev) => ({
      ...prev,
      fases: prev.fases.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)),
    }));
  };

  const agregarFase = () => {
    const indiceNuevo = editando.fases.length;
    faseAEnfocar.current = indiceNuevo;
    setEditando((prev) => ({ ...prev, fases: [...prev.fases, faseNueva(prev.fases.length)] }));
    setFaseActiva(indiceNuevo);
  };

  const duplicarFase = (idx) => {
    const copia = {
      ...editando.fases[idx],
      id: null,
      _key: `nueva-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nombre: `${editando.fases[idx].nombre} (copia)`,
    };
    faseAEnfocar.current = idx + 1;
    setEditando((prev) => {
      const fases = [...prev.fases];
      fases.splice(idx + 1, 0, copia);
      return { ...prev, fases };
    });
    setFaseActiva(idx + 1);
  };

  const quitarFase = (idx) => {
    if (editando.fases.length === 1) return;
    const quedan = editando.fases.length - 1;
    setEditando((prev) => ({ ...prev, fases: prev.fases.filter((_, i) => i !== idx) }));
    setFaseActiva((activa) => Math.min(activa > idx ? activa - 1 : activa, quedan - 1));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    setEditando((prev) => {
      const fases = Array.from(prev.fases);
      const [movida] = fases.splice(source.index, 1);
      fases.splice(destination.index, 0, movida);
      return { ...prev, fases };
    });
    // El preview sigue a la fase que el usuario acaba de mover.
    setFaseActiva((activa) => {
      if (activa === source.index) return destination.index;
      if (source.index < activa && destination.index >= activa) return activa - 1;
      if (source.index > activa && destination.index <= activa) return activa + 1;
      return activa;
    });
  };

  const guardar = async () => {
    setErroresValidacion([]);
    const payload = {
      nombre: editando.nombre,
      descripcion: editando.descripcion,
      activo: editando.activo,
      // El orden es la posición en el array; el backend recalcula `orden`.
      fases: editando.fases.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        mensaje: f.mensaje,
        espera_sugerida_minutos: Number(f.espera_sugerida_minutos) || 0,
        etiqueta_id: f.etiqueta_id || null,
      })),
    };

    setGuardando(true);
    try {
      if (editando.id) await servicio.updateFlujo(editando.id, payload);
      else await servicio.createFlujo(payload);
      setEditando(null);
      await cargar();
    } catch (e) {
      console.error(e);
      const data = e.response?.data;
      if (data?.errores?.length) setErroresValidacion(data.errores);
      else setErroresValidacion([data?.error || data?.message || "No se pudo guardar el flujo"]);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (flujo) => {
    if (!window.confirm(`¿Eliminar el flujo "${flujo.nombre}"?`)) return;
    try {
      const res = await servicio.deleteFlujo(flujo.id);
      if (res?.desactivado) window.alert(res.message);
      await cargar();
    } catch (e) {
      console.error(e);
      window.alert(e.response?.data?.error || "No se pudo eliminar el flujo");
    }
  };

  if (cargando) {
    return (
      <div className="gw-shell" style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "var(--color-fg-muted)" }}>
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  const fases = editando?.fases || [];
  const faseEnPreview = fases[Math.min(faseActiva, fases.length - 1)] || null;

  return (
    <section className="gw-shell">
      {error && (
        <div className="gw-errors" role="alert">
          <AlertCircle size={16} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          {error}
        </div>
      )}

      {!editando ? (
        <>
          <header className="gw-head">
            <div className="gw-head-titles">
              <p className="gw-eyebrow">Seguimiento por WhatsApp</p>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Flujos de mensajes</h2>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.86rem", color: "var(--color-fg-muted)", maxWidth: "62ch" }}>
                Cada flujo es una secuencia de mensajes recomendada. Desde el pedido podés abrir
                cualquier fase cuando quieras, y repetirla las veces que necesites.
              </p>
            </div>
            <div className="gw-head-actions">
              <button className="gw-btn gw-btn--primary" onClick={abrirNuevo}>
                <Plus size={16} /> Nuevo flujo
              </button>
            </div>
          </header>
          <ListaFlujos flujos={flujos} onEditar={abrirExistente} onEliminar={eliminar} />
        </>
      ) : (
        <>
          <div className="gw-back-bar">
            <button
              type="button"
              className="gw-btn-back"
              onClick={() => setEditando(null)}
            >
              <ArrowLeft size={16} />
              <span>Volver a Flujos</span>
            </button>
            <span className="gw-edit-badge">
              {editando.id ? "Editando flujo" : "Nuevo flujo"}
            </span>
          </div>
          <header className="gw-head">
            <div className="gw-head-titles">
              <div className="gw-header-fields">
                <div className="gw-field-group">
                  <label className="gw-field-label">
                    <Edit2 size={12} className="gw-label-icon" />
                    Nombre del flujo <span className="gw-req">*</span>
                  </label>
                  <input
                    className="gw-input gw-input--title"
                    placeholder="Nombre del flujo (ej: Confirmación de pedido)"
                    value={editando.nombre}
                    onChange={(e) => setEditando((p) => ({ ...p, nombre: e.target.value }))}
                    aria-label="Nombre del flujo"
                  />
                </div>
                <div className="gw-field-group">
                  <label className="gw-field-label">
                    <Edit2 size={12} className="gw-label-icon" />
                    Descripción (opcional)
                  </label>
                  <input
                    className="gw-input gw-input--sub"
                    placeholder="Escribí para qué sirve este flujo..."
                    value={editando.descripcion || ""}
                    onChange={(e) => setEditando((p) => ({ ...p, descripcion: e.target.value }))}
                    aria-label="Descripción del flujo"
                  />
                </div>
              </div>
            </div>
            <div className="gw-head-actions">
              <button className="gw-btn gw-btn--ghost" onClick={() => setFlujoCompleto(true)}>
                <Eye size={15} /> Vista previa completa
              </button>
              <button className="gw-btn gw-btn--primary" onClick={guardar} disabled={guardando}>
                {guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Guardar cambios
              </button>
            </div>
          </header>

          {erroresValidacion.length > 0 && (
            <div className="gw-errors" role="alert">
              <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={15} /> No se pudo guardar
              </strong>
              <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          <div className="gw-grid">
            <div className="gw-builder">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="fases-flujo">
                  {(dropProvided) => (
                    <div className="gw-steps" ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                      {fases.map((fase, idx) => (
                        <Draggable key={fase._key} draggableId={fase._key} index={idx}>
                          {(dragProvided, snapshot) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} style={dragProvided.draggableProps.style}>
                              {idx > 0 && (
                                <ConnectorWait
                                  esperaMinutos={fase.espera_sugerida_minutos}
                                  onChangeEspera={(nuevosMinutos) => cambiarFase(idx, "espera_sugerida_minutos", nuevosMinutos)}
                                />
                              )}
                              <FaseCard
                                ref={(el) => { refsFase.current[idx] = el; }}
                                fase={fase}
                                idx={idx}
                                total={fases.length}
                                fases={fases}
                                etiquetas={etiquetas}
                                variables={variables}
                                activa={idx === faseActiva}
                                arrastrando={snapshot.isDragging}
                                dragHandleProps={dragProvided.dragHandleProps}
                                onSeleccionar={() => setFaseActiva(idx)}
                                onCampo={cambiarFase}
                                onDuplicar={duplicarFase}
                                onQuitar={quitarFase}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <button className="gw-add" onClick={agregarFase}>
                <Plus size={16} /> Agregar siguiente fase
              </button>

              <label className="gw-switch">
                <input
                  type="checkbox"
                  checked={!!editando.activo}
                  onChange={(e) => setEditando((p) => ({ ...p, activo: e.target.checked }))}
                />
                <span>Flujo activo</span>
                <span className="gw-tip" data-tip="Un flujo inactivo no aparece en el panel del pedido, pero no se borra.">
                  <Info size={13} />
                </span>
              </label>

              <button className="gw-btn gw-btn--ghost gw-fab" onClick={() => setPreviewMovil(true)}>
                <Eye size={15} /> Vista previa
              </button>
            </div>

            <aside className="gw-aside">
              <VistaPrevia
                fases={fases}
                indice={Math.min(faseActiva, fases.length - 1)}
                onIndice={setFaseActiva}
                variables={variables}
                modo={modoPreview}
                onModo={setModoPreview}
              />
            </aside>
          </div>

          {previewMovil && (
            <Modal
              titulo="Vista previa"
              subtitulo="Así se va a ver el mensaje de esta fase."
              onCerrar={() => setPreviewMovil(false)}
            >
              <VistaPrevia
                fases={fases}
                indice={Math.min(faseActiva, fases.length - 1)}
                onIndice={setFaseActiva}
                variables={variables}
                modo={modoPreview}
                onModo={setModoPreview}
                sinMarco
              />
            </Modal>
          )}

          {flujoCompleto && (
            <Modal
              titulo={editando.nombre?.trim() || "Flujo sin nombre"}
              subtitulo={`${fases.length} ${fases.length === 1 ? "fase" : "fases"} · el recorrido completo con datos de ejemplo`}
              onCerrar={() => setFlujoCompleto(false)}
            >
              <FlujoCompleto fases={fases} variables={variables} />
            </Modal>
          )}
        </>
      )}
    </section>
  );
}

/* ─── Listado ──────────────────────────────────────────────── */

function ListaFlujos({ flujos, onEditar, onEliminar }) {
  if (flujos.length === 0) {
    return (
      <div className="gw-empty">
        Todavía no hay flujos.<br />
        Creá el primero: por ejemplo “Confirmación de pedido”, con un primer contacto,
        un recordatorio a las 4 h y un último intento al día siguiente.
      </div>
    );
  }

  return (
    <div className="gw-cards">
      {flujos.map((flujo) => {
        const fases = flujo.fases || [];
        return (
          <article key={flujo.id} className={`gw-card ${flujo.activo ? "" : "is-off"}`}>
            <div className="gw-card-head">
              <div style={{ minWidth: 0 }}>
                <h4>{flujo.nombre}</h4>
                <div className="gw-card-meta">
                  {fases.length} {fases.length === 1 ? "fase" : "fases"}
                  {!flujo.activo && <> · <span className="gw-pill">Inactivo</span></>}
                </div>
              </div>
              <div className="gw-step-tools">
                <button className="gw-icon-btn" onClick={() => onEditar(flujo)} title="Editar flujo"><Edit2 size={15} /></button>
                <button className="gw-icon-btn gw-icon-btn--danger" onClick={() => onEliminar(flujo)} title="Eliminar flujo"><Trash2 size={15} /></button>
              </div>
            </div>

            {flujo.descripcion && (
              <p style={{ margin: "0.7rem 0 0", fontSize: "0.8rem", color: "var(--color-fg-muted)" }}>{flujo.descripcion}</p>
            )}

            <ul className="gw-card-steps">
              {fases.map((fase, i) => (
                <li key={fase.id} className="gw-card-step">
                  <span className="gw-badge">{i + 1}</span>
                  <span className="gw-card-step-name">{fase.nombre}</span>
                  {i > 0 && <span className="gw-card-step-wait">+{formatEspera(fase.espera_sugerida_minutos)}</span>}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

/* ─── Conector interactivo de espera entre fases ───────────── */
function ConnectorWait({ esperaMinutos, onChangeEspera }) {
  const { valor, unidad } = desarmarEspera(esperaMinutos);

  const cambiarEspera = (nuevoValor, nuevaUnidad) => {
    const factor = UNIDADES.find((u) => u.key === nuevaUnidad)?.factor || 1;
    const n = Math.max(0, Math.floor(Number(nuevoValor) || 0));
    onChangeEspera(n * factor);
  };

  return (
    <div className="gw-connector">
      <div className="gw-connector-line" />
      <div className="gw-wait-editable">
        <Clock size={13} className="gw-wait-icon" />
        <span className="gw-wait-text">esperar</span>
        <input
          type="number"
          min="0"
          className="gw-input gw-input--wait-num"
          value={valor}
          onChange={(e) => cambiarEspera(e.target.value, unidad)}
          aria-label="Tiempo de espera"
        />
        <select
          className="gw-select gw-select--wait-unit"
          value={unidad}
          onChange={(e) => cambiarEspera(valor, e.target.value)}
          aria-label="Unidad de tiempo de espera"
        >
          {UNIDADES.map((u) => (
            <option key={u.key} value={u.key}>
              {valor === 1 ? u.singular : u.plural}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ─── Una fase ─────────────────────────────────────────────── */

const FaseCard = React.forwardRef(function FaseCard({
  fase, idx, total, fases, etiquetas, variables, activa, arrastrando,
  dragHandleProps, onSeleccionar, onCampo, onDuplicar, onQuitar,
}, ref) {
  const { valor, unidad } = desarmarEspera(fase.espera_sugerida_minutos);

  const cambiarEspera = (nuevoValor, nuevaUnidad) => {
    const factor = UNIDADES.find((u) => u.key === nuevaUnidad)?.factor || 1;
    const n = Math.max(0, Math.floor(Number(nuevoValor) || 0));
    onCampo(idx, "espera_sugerida_minutos", n * factor);
  };

  const faseSiguiente = (fases && idx < total - 1) ? fases[idx + 1] : null;
  const { valor: valorSig, unidad: unidadSig } = desarmarEspera(faseSiguiente?.espera_sugerida_minutos || 0);

  const cambiarEsperaSig = (nuevoValor, nuevaUnidad) => {
    const factor = UNIDADES.find((u) => u.key === nuevaUnidad)?.factor || 1;
    const n = Math.max(0, Math.floor(Number(nuevoValor) || 0));
    onCampo(idx + 1, "espera_sugerida_minutos", n * factor);
  };

  return (
    <div
      ref={ref}
      className={`gw-step-card${activa ? " is-editing" : ""}${arrastrando ? " is-dragging" : ""}`}
      onFocus={onSeleccionar}
      onMouseDown={onSeleccionar}
    >
      <div className="gw-step-head">
        <span className="gw-badge">{idx + 1}</span>
        <input
          className="gw-input gw-step-name"
          placeholder="Nombre de la fase"
          value={fase.nombre}
          onChange={(e) => onCampo(idx, "nombre", e.target.value)}
          aria-label={`Nombre de la fase ${idx + 1}`}
        />
        {activa && <span className="gw-editing-tag">Editando</span>}
        <div className="gw-step-tools">
          <button className="gw-icon-btn gw-icon-btn--grab" {...dragHandleProps} title="Arrastrar para reordenar" aria-label="Reordenar fase">
            <GripVertical size={15} />
          </button>
          <button className="gw-icon-btn" onClick={() => onDuplicar(idx)} title="Duplicar fase"><Copy size={14} /></button>
          <button
            className="gw-icon-btn gw-icon-btn--danger"
            onClick={() => onQuitar(idx)}
            disabled={total <= 1}
            title={total > 1 ? "Eliminar fase" : "El flujo necesita al menos una fase"}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <EditorMensaje
        value={fase.mensaje}
        variables={variables}
        onChange={(texto) => onCampo(idx, "mensaje", texto)}
      />

      <div className="gw-cfg">
        {idx < total - 1 && (
          <div className="gw-cfg-field">
            <div className="gw-cfg-label">
              <Clock size={12} /> Seguimiento para la Fase {idx + 2}
              <span className="gw-tip" data-tip="Tiempo a esperar después de enviar esta fase para recordarte enviar el siguiente mensaje.">
                <Info size={12} />
              </span>
            </div>
            <div className="gw-cfg-row">
              <input
                type="number"
                min="0"
                className="gw-input gw-input--num"
                value={valorSig}
                onChange={(e) => cambiarEsperaSig(e.target.value, unidadSig)}
                aria-label="Cantidad de espera sugerida para la siguiente fase"
              />
              <select
                className="gw-select"
                value={unidadSig}
                onChange={(e) => cambiarEsperaSig(valorSig, e.target.value)}
                aria-label="Unidad de espera sugerida para la siguiente fase"
              >
                {UNIDADES.map((u) => <option key={u.key} value={u.key}>{u.plural} después</option>)}
              </select>
            </div>
          </div>
        )}

        {idx > 0 && idx === total - 1 && (
          <div className="gw-cfg-field">
            <div className="gw-cfg-label">
              <Clock size={12} /> Espera desde la Fase {idx}
              <span className="gw-tip" data-tip="Solo genera un recordatorio para vos. No envía mensajes automáticamente.">
                <Info size={12} />
              </span>
            </div>
            <div className="gw-cfg-row">
              <input
                type="number"
                min="0"
                className="gw-input gw-input--num"
                value={valor}
                onChange={(e) => cambiarEspera(e.target.value, unidad)}
                aria-label="Cantidad de espera sugerida"
              />
              <select
                className="gw-select"
                value={unidad}
                onChange={(e) => cambiarEspera(valor, e.target.value)}
                aria-label="Unidad de espera sugerida"
              >
                {UNIDADES.map((u) => <option key={u.key} value={u.key}>{u.plural} después</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="gw-cfg-field">
          <div className="gw-cfg-label">
            <Tag size={12} /> Etiqueta al abrir
          </div>
          <select
            className="gw-select"
            value={fase.etiqueta_id || ""}
            onChange={(e) => onCampo(idx, "etiqueta_id", e.target.value ? Number(e.target.value) : null)}
            aria-label="Etiqueta que se aplica al abrir la fase"
          >
            <option value="">Ninguna</option>
            {etiquetas.map((et) => <option key={et.id} value={et.id}>{et.nombre}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
});

/* ─── Editor con variables resaltadas ──────────────────────── */

/**
 * Textarea con las variables pintadas distinto del texto normal.
 *
 * Un textarea no puede contener HTML, así que se usan dos capas alineadas:
 * un div de fondo que pinta el texto con las variables resaltadas, y el
 * textarea encima con el texto transparente (aporta caret, selección y
 * edición). Las dos comparten la clase .gw-layer, que fija la MISMA
 * tipografía, padding y borde — cualquier diferencia desalinea el resaltado.
 *
 * Lo que se guarda sigue siendo el texto crudo con {variable}.
 */
function EditorMensaje({ value, variables, onChange }) {
  const taRef = useRef(null);
  const fondoRef = useRef(null);
  const [enfocado, setEnfocado] = useState(false);

  const tramos = useMemo(() => partirMensaje(value, variables), [value, variables]);
  const malEscritas = useMemo(() => variablesDesconocidas(value, variables), [value, variables]);

  const sincronizarScroll = () => {
    if (fondoRef.current && taRef.current) {
      fondoRef.current.scrollTop = taRef.current.scrollTop;
      fondoRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  // El mensaje se ve entero: el textarea crece con el texto en vez de
  // esconderlo detras de un scroll interno. Recien al pasarse de .gw-ta
  // (max-height) aparece scroll, y ahi el fondo lo sigue.
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    // scrollHeight no incluye los bordes y la caja es border-box: sin sumarlos
    // el textarea queda 2px corto y aparece un scroll de dos pixeles.
    const bordes = ta.offsetHeight - ta.clientHeight;
    ta.style.height = `${ta.scrollHeight + bordes}px`;
    sincronizarScroll();
  }, [value]);

  /** Inserta el token donde está el cursor y deja el caret después de él. */
  const insertar = (clave) => {
    const token = `{${clave}}`;
    const ta = taRef.current;
    const actual = value || "";
    if (!ta) {
      onChange(actual + token);
      return;
    }
    const inicio = ta.selectionStart ?? actual.length;
    const fin = ta.selectionEnd ?? actual.length;
    onChange(actual.slice(0, inicio) + token + actual.slice(fin));
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = inicio + token.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div>
      <div className={`gw-editor${enfocado ? " is-focused" : ""}`}>
        <div className="gw-layer gw-editor-backdrop" ref={fondoRef} aria-hidden="true">
          {tramos.map((t, i) => (
            t.tipo === "variable"
              ? <span key={i} className={`gw-chip${t.conocida ? "" : " gw-chip--bad"}`}>{t.valor}</span>
              : <span key={i}>{t.valor}</span>
          ))}
          {/* Sin esta última línea, un mensaje que termina en Enter deja el
              fondo más corto que el textarea y el resaltado se corre. */}
          {"\n"}
        </div>
        <textarea
          ref={taRef}
          className="gw-layer gw-ta"
          placeholder="Hola {cliente_nombre}, te escribimos para confirmar tu pedido #{pedido_id}. ¿Nos confirmás que podemos prepararlo?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={sincronizarScroll}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          spellCheck={false}
        />
      </div>

      <div className="gw-editor-bar">
        <SelectorVariables variables={variables} onInsertar={insertar} />
        {malEscritas.length > 0 && (
          <span className="gw-warn">
            <AlertCircle size={13} />
            {malEscritas.length === 1
              ? `{${malEscritas[0]}} no existe: va a llegar así al cliente`
              : `${malEscritas.length} variables no existen y van a llegar así al cliente`}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Selector de variables ────────────────────────────────── */

function SelectorVariables({ variables, onInsertar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const cajaRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const afuera = (e) => { if (!cajaRef.current?.contains(e.target)) setAbierto(false); };
    const escape = (e) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return variables;
    return variables.filter((v) =>
      v.key.toLowerCase().includes(q) ||
      (v.desc || "").toLowerCase().includes(q) ||
      (v.grupo || "").toLowerCase().includes(q));
  }, [variables, busqueda]);

  const grupos = useMemo(() => agruparVariables(filtradas), [filtradas]);

  const elegir = (clave) => {
    onInsertar(clave);
    setAbierto(false);
    setBusqueda("");
  };

  return (
    <div className="gw-varpick" ref={cajaRef}>
      <button
        className="gw-btn gw-btn--ghost"
        style={{ fontSize: "0.8rem", padding: "0.4rem 0.7rem" }}
        onClick={() => setAbierto((v) => !v)}
        type="button"
      >
        <Plus size={14} /> Insertar variable
      </button>

      {abierto && (
        <div className="gw-pop" role="dialog" aria-label="Insertar variable">
          <div className="gw-pop-search">
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-subtle)" }} />
              <input
                className="gw-input"
                style={{ paddingLeft: "1.9rem" }}
                placeholder="Buscar variable..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="gw-pop-list">
            {grupos.map((g) => (
              <div key={g.nombre}>
                <div className="gw-pop-group">{g.nombre}</div>
                {g.variables.map((v) => (
                  <button key={v.key} className="gw-pop-item" type="button" onClick={() => elegir(v.key)}>
                    <strong>{v.desc}</strong>
                    <span>{`{${v.key}}`} · {v.ejemplo}</span>
                  </button>
                ))}
              </div>
            ))}
            {grupos.length === 0 && <div className="gw-pop-empty">No hay variables que coincidan.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Vista previa ─────────────────────────────────────────── */

function VistaPrevia({ fases, indice, onIndice, variables, modo, onModo, sinMarco }) {
  const fase = fases[indice] || null;
  const cliente = variables.find((v) => v.key === "cliente_nombre")?.ejemplo || "Cliente";

  const cuerpo = (
    <>
      <div className="gw-preview-head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          {!sinMarco && <h3 className="gw-preview-title">Vista previa</h3>}
          <div className="gw-seg" role="group" aria-label="Modo de vista previa">
            <button className={`gw-seg-btn${modo === "ejemplo" ? " is-active" : ""}`} onClick={() => onModo("ejemplo")}>
              Datos de ejemplo
            </button>
            <button className={`gw-seg-btn${modo === "variables" ? " is-active" : ""}`} onClick={() => onModo("variables")}>
              Ver variables
            </button>
          </div>
        </div>
        {fases.length > 1 && (
          <div className="gw-tabs" role="tablist">
            {fases.map((f, i) => (
              <button
                key={f._key || f.id}
                role="tab"
                aria-selected={i === indice}
                className={`gw-tab${i === indice ? " is-active" : ""}`}
                onClick={() => onIndice(i)}
                title={f.nombre}
              >
                Fase {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <BurbujaWhatsapp
        mensaje={fase?.mensaje}
        variables={variables}
        modo={modo}
        quien={cliente}
      />

      <div className="gw-preview-foot">
        {modo === "ejemplo"
          ? "Datos ficticios con el mismo formato que usa el mensaje real."
          : "El texto tal como se guarda, antes de reemplazar las variables."}
        {indice > 0 && fase && (
          <> Sugerida {formatEspera(fase.espera_sugerida_minutos)} después de la fase anterior.</>
        )}
      </div>
    </>
  );

  if (sinMarco) return <div>{cuerpo}</div>;
  return <div className="gw-preview">{cuerpo}</div>;
}

function BurbujaWhatsapp({ mensaje, variables, modo, quien }) {
  const texto = String(mensaje || "");

  if (!texto.trim()) {
    return (
      <div className="gw-wa">
        <div className="gw-bubble gw-bubble--vacia">
          Escribí el mensaje de la fase para verlo acá.
        </div>
      </div>
    );
  }

  // En modo "ejemplo" se resuelve igual que el backend y lo que quede sin
  // resolver se marca: es exactamente lo que le llegaría al cliente.
  const contenido = modo === "ejemplo" ? resolverConEjemplos(texto, variables) : texto;
  const tramos = partirMensaje(contenido, variables);

  return (
    <div className="gw-wa">
      {quien && <span className="gw-wa-quien">{quien}</span>}
      <div className="gw-bubble">
        {tramos.map((t, i) => (
          t.tipo === "variable"
            ? <span key={i} className={`gw-chip${t.conocida ? "" : " gw-chip--bad"}`}>{t.valor}</span>
            : <span key={i}>{t.valor}</span>
        ))}
        <span className="gw-bubble-meta">{horaSimulada()} ✓✓</span>
      </div>
    </div>
  );
}

/* ─── Recorrido completo ───────────────────────────────────── */

function FlujoCompleto({ fases, variables }) {
  const cliente = variables.find((v) => v.key === "cliente_nombre")?.ejemplo || "Cliente";

  return (
    <div>
      {fases.map((fase, i) => (
        <div key={fase._key || fase.id} className="gw-timeline-step">
          {i > 0 && (
            <div className="gw-connector">
              <div className="gw-connector-line" />
              <span className="gw-wait"><Clock size={12} /> esperar {formatEspera(fase.espera_sugerida_minutos)}</span>
            </div>
          )}
          <div className="gw-timeline-label">
            <span className="gw-badge">{i + 1}</span>
            {fase.nombre}
          </div>
          <div className="gw-timeline-wa">
            <BurbujaWhatsapp mensaje={fase.mensaje} variables={variables} modo="ejemplo" quien={i === 0 ? cliente : null} />
          </div>
        </div>
      ))}
      <p style={{ fontSize: "0.76rem", color: "var(--color-fg-muted)", margin: "1rem 0 0", lineHeight: 1.5 }}>
        Las esperas son sugerencias. Desde el pedido podés abrir cualquier fase en cualquier
        momento, y repetir la misma todas las veces que necesites.
      </p>
    </div>
  );
}

/* ─── Modal ────────────────────────────────────────────────── */

function Modal({ titulo, subtitulo, onCerrar, children }) {
  useEffect(() => {
    const escape = (e) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onCerrar]);

  return (
    <div className="gw-modal-backdrop" onClick={onCerrar}>
      <div className="gw-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="gw-modal-head">
          <div style={{ minWidth: 0 }}>
            <h3>{titulo}</h3>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button className="gw-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="gw-modal-body">{children}</div>
      </div>
    </div>
  );
}
