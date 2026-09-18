import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Loader2, Save, X, MessageCircle, Tag, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { seguimientoService } from "../../services/seguimiento.service";

export function SeguimientoConfig() {
  const [plantillas, setPlantillas] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [variables, setVariables] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editandoPlantilla, setEditandoPlantilla] = useState(null);
  const [editandoEtiqueta, setEditandoEtiqueta] = useState(null);
  const [tiemposInput, setTiemposInput] = useState("");

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resP, resE, resC] = await Promise.all([
        seguimientoService.getPlantillas(),
        seguimientoService.getEtiquetas(),
        seguimientoService.getConfiguracion()
      ]);
      setPlantillas(resP || []);
      setEtiquetas(resE || []);
      setConfig(resC || { tiempos_rapidos_horas: [1, 2, 4, 8, 24] });
      setTiemposInput((resC?.tiempos_rapidos_horas || [1, 2, 4, 8, 24]).join(", "));
      
      // Variables predefinidas hardcodeadas según los requisitos
      setVariables([
        { key: "cliente_nombre", desc: "Nombre del cliente" },
        { key: "pedido_id", desc: "Número del pedido" },
        { key: "productos", desc: "Lista de productos del pedido" },
        { key: "direccion_entrega", desc: "Dirección de entrega" },
        { key: "total_gs", desc: "Monto total en guaraníes" },
        { key: "courier_nombre", desc: "Nombre del repartidor/courier" }
      ]);
    } catch (e) {
      console.error(e);
      setError("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const saveConfig = async () => {
    try {
      const parsed = tiemposInput.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      await seguimientoService.updateConfiguracion({ tiempos_rapidos_horas: parsed });
      alert("Configuración de tiempos guardada");
      cargarDatos();
    } catch (e) {
      alert("Error al guardar config");
    }
  };

  const savePlantilla = async (p) => {
    if (!p.nombre?.trim()) {
      alert("Atencin: El nombre de la plantilla es obligatorio.");
      return;
    }
    if (!p.mensaje_template?.trim()) {
      alert("Atencin: El mensaje de la plantilla no puede estar vaco.");
      return;
    }
    try {
      if (p.id) {
        await seguimientoService.updatePlantilla(p.id, p);
      } else {
        await seguimientoService.createPlantilla(p);
      }
      setEditandoPlantilla(null);
      cargarDatos();
    } catch (e) {
      console.error(e);
      const errMsg = e.response?.data?.error || "Error al guardar plantilla. Verifica los datos.";
      alert(`Error del servidor: ${errMsg}`);
    }
  };

  const deletePlantilla = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta plantilla?")) return;
    try {
      await seguimientoService.deletePlantilla(id);
      cargarDatos();
    } catch (e) {
      alert("Error al eliminar la plantilla");
    }
  };

  const saveEtiqueta = async (e) => {
    if (!e.nombre?.trim()) {
      alert("Atencin: El nombre de la etiqueta es obligatorio.");
      return;
    }
    try {
      if (e.id) {
        await seguimientoService.updateEtiqueta(e.id, e);
      } else {
        await seguimientoService.createEtiqueta(e);
      }
      setEditandoEtiqueta(null);
      cargarDatos();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Error al guardar etiqueta";
      alert(`Error del servidor: ${errMsg}`);
    }
  };

  const deleteEtiqueta = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta etiqueta?")) return;
    try {
      await seguimientoService.deleteEtiqueta(id);
      cargarDatos();
    } catch (err) {
      alert("Error al eliminar la etiqueta");
    }
  };

  const insertVariable = (variableKey) => {
    if (editandoPlantilla) {
      const newVal = editandoPlantilla.mensaje_template + " {" + variableKey + "}";
      setEditandoPlantilla({ ...editandoPlantilla, mensaje_template: newVal });
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem", color: "var(--color-fg-muted)" }}>
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem", color: "var(--color-fg)" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.5rem 0" }}>Configuración de Seguimiento</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
          Administra las plantillas de WhatsApp, las etiquetas de estado global y los tiempos de recordatorio.
        </p>
      </header>

      {error && (
        <div style={{ background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", color: "var(--color-danger)", padding: "1rem", borderRadius: "8px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
        
        {/* PLANTILLAS DE WHATSAPP */}
        <section style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MessageCircle size={20} color="var(--color-primary-text)" /> Plantillas de WhatsApp
              </h2>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "var(--color-fg-muted)" }}>Mensajes predefinidos para enviar a clientes.</p>
            </div>
            <button className="btn-primary" onClick={() => setEditandoPlantilla({ nombre: "", mensaje_template: "", activo: true })}>
              <Plus size={16} /> Nueva Plantilla
            </button>
          </div>

          <div style={{ padding: "1.5rem" }}>
            {editandoPlantilla && (
              <div style={{ background: "var(--color-canvas)", border: "1px solid var(--color-primary)", borderRadius: "8px", padding: "1.5rem", marginBottom: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>{editandoPlantilla.id ? "Editar Plantilla" : "Nueva Plantilla"}</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <label>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.25rem" }}>Nombre de la plantilla</span>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ width: "100%", maxWidth: "400px" }}
                      placeholder="Ej: Confirmación de Pedido" 
                      value={editandoPlantilla.nombre} 
                      onChange={e => setEditandoPlantilla({...editandoPlantilla, nombre: e.target.value})} 
                    />
                  </label>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", alignItems: "start" }}>
                    <label>
                      <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.25rem" }}>Mensaje</span>
                      <textarea 
                        className="form-input" 
                        style={{ width: "100%", height: "180px", fontFamily: "monospace", fontSize: "0.9rem" }}
                        placeholder="¡Hola {cliente_nombre}! Tu pedido..." 
                        value={editandoPlantilla.mensaje_template} 
                        onChange={e => setEditandoPlantilla({...editandoPlantilla, mensaje_template: e.target.value})} 
                      />
                    </label>
                    
                    <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                      <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>Variables disponibles</span>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-fg-muted)", marginBottom: "1rem" }}>
                        Haz clic en una variable para insertarla en tu mensaje.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "150px", overflowY: "auto" }}>
                        {variables.map(v => (
                          <button 
                            key={v.key} 
                            type="button" 
                            onClick={() => insertVariable(v.key)}
                            style={{ textAlign: "left", background: "var(--color-canvas)", border: "1px dashed var(--color-border)", padding: "0.4rem", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer", transition: "border-color 0.15s" }}
                          >
                            <strong style={{ color: "var(--color-primary-text)", display: "block" }}>{"{" + v.key + "}"}</strong>
                            <span style={{ color: "var(--color-fg-subtle)" }}>{v.desc}</span>
                          </button>
                        ))}
                        {variables.length === 0 && (
                          <span style={{ fontSize: "0.8rem", color: "var(--color-fg-muted)" }}>No se encontraron variables dinámicas.</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", width: "fit-content" }}>
                    <input 
                      type="checkbox" 
                      checked={editandoPlantilla.activo} 
                      onChange={e => setEditandoPlantilla({...editandoPlantilla, activo: e.target.checked})} 
                    /> 
                    <span style={{ fontWeight: 500 }}>Plantilla Activa</span>
                  </label>
                </div>
                
                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--color-border)" }}>
                  <button className="btn-primary" onClick={() => savePlantilla(editandoPlantilla)}>Guardar plantilla</button>
                  <button className="btn-secondary" onClick={() => setEditandoPlantilla(null)}>Cancelar</button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1rem" }}>
              {plantillas.map(p => (
                <div key={p.id} style={{ display: "flex", flexDirection: "column", padding: "1.25rem", background: "var(--color-canvas)", borderRadius: "8px", border: "1px solid var(--color-border)", opacity: p.activo ? 1 : 0.6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h4 style={{ margin: 0, fontSize: "1rem" }}>{p.nombre}</h4>
                      {!p.activo && <span style={{ fontSize: "0.7rem", background: "var(--color-surface-2)", padding: "2px 6px", borderRadius: "4px" }}>Inactivo</span>}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="icon-button" onClick={() => setEditandoPlantilla(p)}><Edit2 size={16}/></button>
                      <button className="icon-button" onClick={() => deletePlantilla(p.id)} style={{ color: "var(--color-danger)" }}><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-fg-muted)", whiteSpace: "pre-wrap", maxHeight: "100px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
                    {p.mensaje_template}
                  </div>
                </div>
              ))}
              {plantillas.length === 0 && !editandoPlantilla && (
                <div style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center", color: "var(--color-fg-muted)", border: "1px dashed var(--color-border)", borderRadius: "8px" }}>
                  No hay plantillas creadas.
                </div>
              )}
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem" }}>
          
          {/* ETIQUETAS */}
          <section style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Tag size={18} color="var(--color-success)" /> Etiquetas del Sistema
                </h2>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "var(--color-fg-muted)" }}>Categorías globales para identificar etapas.</p>
              </div>
              <button className="btn-secondary" onClick={() => setEditandoEtiqueta({ nombre: "", color: "#3b82f6", activo: true })}>
                <Plus size={14} /> Nueva
              </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
              {editandoEtiqueta && (
                <div style={{ background: "var(--color-canvas)", border: "1px solid var(--color-success)", borderRadius: "8px", padding: "1.25rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                    <label style={{ flex: 1, minWidth: "200px" }}>
                      <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}>Nombre</span>
                      <input type="text" className="form-input" style={{ width: "100%" }} value={editandoEtiqueta.nombre} onChange={e => setEditandoEtiqueta({...editandoEtiqueta, nombre: e.target.value})} />
                    </label>
                    <label>
                      <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}>Color</span>
                      <input type="color" value={editandoEtiqueta.color} onChange={e => setEditandoEtiqueta({...editandoEtiqueta, color: e.target.value})} style={{ height: "38px", width: "60px", padding: "2px", cursor: "pointer", borderRadius: "4px", border: "1px solid var(--color-border)" }} />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", height: "38px" }}>
                      <input type="checkbox" checked={editandoEtiqueta.activo} onChange={e => setEditandoEtiqueta({...editandoEtiqueta, activo: e.target.checked})} /> 
                      <span style={{ fontSize: "0.9rem" }}>Activo</span>
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                    <button className="btn-primary" style={{ padding: "0.4rem 1rem" }} onClick={() => saveEtiqueta(editandoEtiqueta)}>Guardar</button>
                    <button className="btn-secondary" style={{ padding: "0.4rem 1rem" }} onClick={() => setEditandoEtiqueta(null)}>Cancelar</button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {etiquetas.map(e => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--color-canvas)", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: 14, height: 14, borderRadius: "4px", background: e.color }} />
                      <span style={{ fontWeight: 600, color: e.activo ? "var(--color-fg)" : "var(--color-fg-muted)" }}>{e.nombre} {!e.activo && "(Inactivo)"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="icon-button" onClick={() => setEditandoEtiqueta(e)}><Edit2 size={14}/></button>
                      <button className="icon-button" style={{ color: "var(--color-danger)" }} onClick={() => deleteEtiqueta(e.id)}><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
                {etiquetas.length === 0 && !editandoEtiqueta && (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--color-fg-muted)", fontStyle: "italic" }}>
                    Sin etiquetas configuradas
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* RECORDATORIOS */}
          <section style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Clock size={18} color="var(--color-warning)" /> Opciones de Tiempos
              </h2>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "var(--color-fg-muted)" }}>Tiempos de acceso rápido (en horas) para recordatorios.</p>
            </div>
            
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label>
                  <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>Horas (separadas por coma)</span>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej: 1, 2, 4, 8, 24, 48" 
                    value={tiemposInput} 
                    onChange={e => setTiemposInput(e.target.value)} 
                    style={{ width: "100%", fontFamily: "monospace" }} 
                  />
                </label>
                <button className="btn-primary" onClick={saveConfig} style={{ alignSelf: "flex-start" }}>Guardar Tiempos</button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}