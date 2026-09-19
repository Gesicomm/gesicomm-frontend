import React, { useState, useEffect } from "react";
import { X, MessageCircle, Clock, Check, Calendar, Plus, Trash2, Tag, Loader2, Ban } from "lucide-react";
import Select, { components } from "react-select";
import { seguimientoService } from "../../services/seguimiento.service";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'var(--color-canvas)',
    borderColor: state.isFocused ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
    '&:hover': { borderColor: 'var(--color-primary)' },
    minHeight: '38px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem'
  }),
  menu: (base) => ({
    ...base,
    background: 'var(--color-surface-2)',
    border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    overflow: 'hidden',
    zIndex: 1050
  }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
    color: state.isFocused ? 'var(--color-primary-text)' : 'var(--color-fg)',
    cursor: 'pointer',
    padding: '8px 12px',
    fontSize: '0.85rem',
    '&:active': { background: 'color-mix(in srgb, var(--color-primary) 25%, transparent)' }
  }),
  singleValue: (base) => ({ ...base, color: 'var(--color-fg)' }),
  placeholder: (base) => ({ ...base, color: 'var(--color-fg-muted)' }),
  input: (base) => ({ ...base, color: 'var(--color-fg)' })
};

const EtiquetaOption = (props) => {
  return (
    <components.Option {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 12, height: 12, borderRadius: '3px', background: props.data.color || 'var(--color-fg)' }} />
        {props.data.label}
      </div>
    </components.Option>
  );
};

export function SeguimientoPanel({ open, envio, onClose, onRefreshPedido }) {
  const [plantillas, setPlantillas] = useState([]);
  const [configuracion, setConfiguracion] = useState(null);
  const [etiquetasPedido, setEtiquetasPedido] = useState([]);
  const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [horasProgramadas, setHorasProgramadas] = useState(null); // feedback visual botones de tiempo

  // Form states
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [telefonoPersonalizado, setTelefonoPersonalizado] = useState("");

  const [fechaCustom, setFechaCustom] = useState("");
  const [notaRecordatorio, setNotaRecordatorio] = useState("");

  useEffect(() => {
    if (!open || !envio) return;
    let activo = true;
    
    setCargando(true);
    setTelefonoPersonalizado(envio.telefono || "");

    Promise.all([
      seguimientoService.getPlantillas({ activo: true }),
      seguimientoService.getConfiguracion(),
      seguimientoService.getEtiquetasPedido(envio.id),
      seguimientoService.getEtiquetas()
    ]).then(([resPlantillas, resConfig, resEtiqPed, resEtiqDisp]) => {
      if (!activo) return;
      setPlantillas(resPlantillas || []);
      setConfiguracion(resConfig || { tiempos_rapidos_horas: [1, 2, 4, 8, 24] });
      setEtiquetasPedido(resEtiqPed || []);
      setEtiquetasDisponibles(resEtiqDisp || []);
      setCargando(false);
    }).catch(err => {
      console.error(err);
      if (activo) setCargando(false);
    });

    return () => { activo = false; };
  }, [open, envio]);

  const handleContactar = async () => {
    if (!plantillaSeleccionada) {
      alert("Selecciona una plantilla");
      return;
    }
    await saveAll({ whatsapp: true });
  };

  const handleGuardarSolo = async () => {
    await saveAll({ whatsapp: false });
  };

  const saveAll = async ({ whatsapp }) => {
    setLoadingAccion(true);
    try {
      // 1. WhatsApp Contact (only if requested)
      if (whatsapp) {
        const res = await seguimientoService.crearContacto(envio.id, {
          plantilla_id: plantillaSeleccionada,
          telefono: telefonoPersonalizado || envio.telefono
        });
        if (res.whatsapp_url) {
          window.open(res.whatsapp_url, '_blank');
        }
      }
      
      // 2. Note and Reminder
      if (notaRecordatorio.trim() || horasProgramadas || fechaCustom) {
        const payload = { nota: notaRecordatorio.trim() };
        if (horasProgramadas && horasProgramadas !== 'custom') {
          payload.horas = horasProgramadas;
        } else if (fechaCustom) {
          payload.ejecutar_en = new Date(fechaCustom).toISOString();
        }
        await seguimientoService.programarRecordatorio(envio.id, payload);
        setNotaRecordatorio("");
        setHorasProgramadas(null);
        setFechaCustom("");
      } else if (notaRecordatorio.trim()) {
        await seguimientoService.guardarNota(envio.id, notaRecordatorio.trim());
        setNotaRecordatorio("");
      }

      if (onRefreshPedido) onRefreshPedido();
      // Reload etiquetas to reflect changes (in case plantilla had auto tag)
      const resEtiqPed = await seguimientoService.getEtiquetasPedido(envio.id);
      setEtiquetasPedido(resEtiqPed || []);
    } catch (err) {
      console.error(err);
      alert("Ocurri un error al guardar");
    } finally {
      setLoadingAccion(false);
    }
  };

  const programarRapido = (horas) => {
    setHorasProgramadas(horas);
    setFechaCustom("");
  };

  const programarCustom = () => {
    if (!fechaCustom) return;
    setHorasProgramadas('custom');
  };

  const completar = async () => {
    if (!envio.recordatorio_id) return;
    setLoadingAccion(true);
    try {
      await seguimientoService.completarRecordatorio(envio.id, envio.recordatorio_id);
      if (onRefreshPedido) onRefreshPedido();
    } catch (e) {
      console.error(e);
      alert("Error al completar");
    } finally {
      setLoadingAccion(false);
    }
  };

  const cancelarRecordatorio = async () => {
    if (!envio.recordatorio_id) return;
    setLoadingAccion(true);
    try {
      await seguimientoService.cancelarRecordatorio(envio.id, envio.recordatorio_id);
      if (onRefreshPedido) onRefreshPedido();
    } catch (e) {
      console.error(e);
      alert("Error al cancelar");
    } finally {
      setLoadingAccion(false);
    }
  };

  const agregarEtiqueta = async (optValue) => {
    if (!optValue) return;
    // Optimistic update: find the etiqueta in available list and add it locally
    const etiqueta = etiquetasDisponibles.find(e => e.id === optValue);
    if (!etiqueta) return;
    const tempEntry = { id: Date.now(), etiqueta_id: etiqueta.id, etiqueta };
    setEtiquetasPedido(prev => [...prev, tempEntry]);
    setLoadingAccion(true);
    try {
      await seguimientoService.addEtiquetaPedido(envio.id, optValue);
      // Refresh from server to get real ID
      const resEtiqPed = await seguimientoService.getEtiquetasPedido(envio.id);
      setEtiquetasPedido(resEtiqPed || []);
    } catch (err) {
      console.error(err);
      // Revert optimistic update on error
      setEtiquetasPedido(prev => prev.filter(e => e.id !== tempEntry.id));
      alert('Error al agregar etiqueta');
    } finally {
      setLoadingAccion(false);
    }
  };

  const quitarEtiqueta = async (etiquetaId) => {
    // Optimistic update: remove locally immediately
    const prev = etiquetasPedido;
    setEtiquetasPedido(etiquetasPedido.filter(e => e.etiqueta_id !== etiquetaId));
    setLoadingAccion(true);
    try {
      await seguimientoService.removeEtiquetaPedido(envio.id, etiquetaId);
    } catch (err) {
      console.error(err);
      // Revert on error
      setEtiquetasPedido(prev);
      alert('Error al quitar etiqueta');
    } finally {
      setLoadingAccion(false);
    }
  };

  if (!open || !envio) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div style={{ width: "420px", maxWidth: "100%", height: "100%", background: "var(--color-canvas)", borderLeft: "1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)", color: "var(--color-fg)", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MessageCircle size={18} color="var(--color-primary-text)" /> Seguimiento
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button type="button" className="icon-button" onClick={() => window.open("/pedidos/configuracion", "_blank")} title="Configuración de Etiquetas y Plantillas">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button type="button" className="close-btn dark" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {cargando ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-fg-muted)" }}><Loader2 className="animate-spin" size={16} /> Cargando...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              {/* Etiquetas */}
              <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "8px", border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
                <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "var(--color-fg-subtle)", display: "flex", alignItems: "center", gap: "6px" }}><Tag size={14}/> Etiquetas</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "0.75rem" }}>
                  {etiquetasPedido.length === 0 && <span style={{ fontSize: "0.8rem", color: "var(--color-fg-muted)" }}>Sin etiquetas</span>}
                  {etiquetasPedido.map(ep => {
                    const bgColor = ep.etiqueta?.color ? `color-mix(in srgb, ${ep.etiqueta.color} 15%, transparent)` : 'color-mix(in srgb, var(--color-primary) 15%, transparent)';
                    const textColor = ep.etiqueta?.color || 'var(--color-primary-text)';
                    
                    return (
                      <div key={ep.id} style={{ background: bgColor, color: textColor, border: `1px solid color-mix(in srgb, ${textColor} 30%, transparent)`, fontSize: "0.75rem", padding: "4px 10px", borderRadius: "16px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                        {ep.etiqueta?.nombre || "Etiqueta"}
                        <button onClick={() => quitarEtiqueta(ep.etiqueta_id)} style={{ background: "none", border: "none", color: "currentColor", cursor: "pointer", padding: 0, display: "flex", opacity: 0.7 }} disabled={loadingAccion}>
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ marginTop: '0.5rem' }}>
                  {etiquetasDisponibles.length === 0 ? (
                    <div style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag size={16} style={{ flexShrink: 0 }} />
                      <span>No tienes etiquetas. <a href="/pedidos/configuracion" target="_blank" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>Crea una en configuración</a>.</span>
                    </div>
                  ) : (
                    <Select
                      styles={selectStyles}
                      components={{ Option: EtiquetaOption }}
                      placeholder="+ Agregar etiqueta..."
                      value={null}
                      onChange={(opt) => { if(opt) agregarEtiqueta(opt.value) }}
                      options={etiquetasDisponibles
                        .filter(ed => !etiquetasPedido.find(ep => ep.etiqueta_id === ed.id))
                        .map(ed => ({ value: ed.id, label: ed.nombre, color: ed.color }))
                      }
                      isDisabled={loadingAccion}
                      noOptionsMessage={() => "No hay más etiquetas"}
                      isSearchable={false}
                    />
                  )}
                </div>
              </div>

              {/* Contactar por WhatsApp */}
              <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "8px", border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
                <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "var(--color-fg-subtle)" }}>Acción WhatsApp</h3>
                <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "4px" }}>Plantilla</label>
                
                {plantillas.length === 0 ? (
                  <div style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <MessageCircle size={16} style={{ flexShrink: 0 }} />
                    <span>No tienes plantillas. <a href="/pedidos/configuracion" target="_blank" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>Crea una plantilla primero</a>.</span>
                  </div>
                ) : (
                  <Select
                    styles={selectStyles}
                    placeholder="Seleccionar plantilla..."
                    value={plantillas.map(p => ({ value: p.id, label: p.nombre })).find(o => o.value === plantillaSeleccionada) || null}
                    onChange={opt => setPlantillaSeleccionada(opt ? opt.value : "")}
                    options={plantillas.map(p => ({ value: p.id, label: p.nombre }))}
                    isClearable
                    isDisabled={loadingAccion}
                    noOptionsMessage={() => "No hay plantillas"}
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                )}
                
                <div style={{ height: '10px' }}></div>

                <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "4px" }}>Teléfono</label>
                <input type="text" className="form-input" value={telefonoPersonalizado} onChange={e => setTelefonoPersonalizado(e.target.value)} style={{ marginBottom: "12px" }} disabled={loadingAccion} />
                
                <button 
                  className="btn-primary" 
                  style={{ width: "100%", display: "flex", justifyContent: "center", gap: "6px", background: "#10b981", borderColor: "#10b981" }}
                  onClick={handleContactar}
                  disabled={loadingAccion || !plantillaSeleccionada}
                >
                  <MessageCircle size={16} /> Contactar por WhatsApp
                </button>
              </div>

              {/* Recordatorio */}
              <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "8px", border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
                <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "var(--color-fg-subtle)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={14}/> Próximo seguimiento
                </h3>
                
                {envio.recordatorio_id && envio.recordatorio_estado === 'PENDIENTE' ? (
                  <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--color-primary-text)" }}>Programado para:</div>
                    <div style={{ fontSize: "0.9rem", margin: "4px 0 10px 0" }}>{new Date(envio.recordatorio_ejecutar_en).toLocaleString('es-PY')}</div>
                    
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button className="btn-secondary" style={{ flex: 1, padding: "4px", fontSize: "0.8rem" }} onClick={completar} disabled={loadingAccion}><Check size={14}/> Completar</button>
                      <button className="btn-secondary" style={{ flex: 1, padding: "4px", fontSize: "0.8rem", color: "var(--color-danger)" }} onClick={cancelarRecordatorio} disabled={loadingAccion}><Ban size={14}/> Cancelar</button>
                    </div>
                  </div>
                ) : envio.recordatorio_id && envio.recordatorio_estado === 'VENCIDO' ? (
                   <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", borderRadius: "6px" }}>
                     <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--color-danger)" }}>Seguimiento vencido</div>
                   </div>
                ) : (
                  <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--color-fg-muted)" }}>
                    Sin próximo seguimiento
                  </div>
                )}

                <div style={{ borderTop: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)", paddingTop: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "4px" }}>Nota (opcional)</label>
                  
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <textarea className="form-input" value={notaRecordatorio} onChange={e => setNotaRecordatorio(e.target.value)} style={{ flex: 1, minHeight: '60px', resize: 'vertical' }} placeholder="Escribe una nota..." />
                  </div>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {configuracion?.tiempos_rapidos_horas?.map(h => {
                      const activo = horasProgramadas === h;
                      return (
                        <button
                          key={h}
                          className="btn-secondary"
                          style={{
                            padding: "6px 14px",
                            fontSize: "0.8rem",
                            borderRadius: "16px",
                            flex: "1 1 auto",
                            textAlign: "center",
                            transition: "all 0.18s ease",
                            background: activo ? "var(--color-primary)" : "var(--color-canvas)",
                            color: activo ? "var(--color-primary-fg)" : undefined,
                            borderColor: activo ? "var(--color-primary)" : "color-mix(in srgb, var(--color-fg) 12%, transparent)",
                            fontWeight: activo ? 700 : 400,
                          }}
                          onClick={() => programarRapido(h)}
                          disabled={loadingAccion}
                        >
                          {activo ? `✓ +${h}h` : `+${h}h`}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                    <input type="datetime-local" className="form-input" value={fechaCustom} onChange={e => { setFechaCustom(e.target.value); setHorasProgramadas(e.target.value ? 'custom' : null); }} style={{ flex: 1 }} disabled={loadingAccion}/>
                  </div>

                  {(notaRecordatorio.trim() || horasProgramadas || fechaCustom) && (
                    <button className="btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={handleGuardarSolo} disabled={loadingAccion}>
                      Guardar nota / recordatorio
                    </button>
                  )}
                </div>
                
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}