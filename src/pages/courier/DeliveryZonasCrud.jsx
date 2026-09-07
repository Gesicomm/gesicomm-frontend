import { useEffect, useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";

const TIPOS_PAGO = ["Ambos", "Al Recibir", "Anticipado"];

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
  const hasta = regla.rango_max === "" || regla.rango_max === null || regla.rango_max === undefined ? "+" : regla.rango_max;
  return `${desde} a ${hasta} productos`;
}

function precioLabel(valor) {
  return `Gs ${Number(valor || 0).toLocaleString("es-PY")}`;
}

export function DeliveryZonasCrud({ zonas = [], couriers = [], onSave }) {
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [ciudadModal, setCiudadModal] = useState(null);
  const [reglaModal, setReglaModal] = useState(null);

  useEffect(() => {
    setFilas((zonas || []).map(z => ({
      id: z.id,
      departamento: z.departamento || "",
      ciudad: z.ciudad || "",
      courier_id: z.courier_id || "",
      tipo_pago: z.tipo_pago || "Ambos",
      rango_min: z.rango_min ?? 0,
      rango_max: z.rango_max ?? "",
      costo: z.costo ?? 0,
      tiempo_entrega_hs: z.tiempo_entrega_hs || "",
      activo: z.activo !== false,
    })));
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
    return Array.from(map.values()).sort((a, b) => {
      const dep = a.departamento.localeCompare(b.departamento, "es");
      return dep || a.ciudad.localeCompare(b.ciudad, "es");
    });
  }, [filas]);

  function courierNombre(id) {
    if (!id) return "Sin courier";
    return couriers.find(c => Number(c.id) === Number(id))?.nombre || "Courier no disponible";
  }

  function abrirCiudadNueva() {
    setCiudadModal({ departamento: "", ciudad: "" });
  }

  function crearPrimeraRegla(e) {
    e.preventDefault();
    const departamento = ciudadModal?.departamento?.trim() || "";
    const ciudad = ciudadModal?.ciudad?.trim() || "";
    if (!ciudad) return;
    setCiudadModal(null);
    setReglaModal({ index: null, regla: nuevaRegla(departamento, ciudad) });
  }

  function abrirReglaNueva(grupo) {
    setReglaModal({ index: null, regla: nuevaRegla(grupo.departamento, grupo.ciudad) });
  }

  function abrirEditarRegla(regla) {
    setReglaModal({ index: regla.index, regla: { ...regla } });
  }

  function updateRegla(field, value) {
    setReglaModal(prev => ({ ...prev, regla: { ...prev.regla, [field]: value } }));
  }

  function guardarRegla(e) {
    e.preventDefault();
    const regla = {
      ...reglaModal.regla,
      ciudad: reglaModal.regla.ciudad.trim(),
      departamento: reglaModal.regla.departamento?.trim() || "",
    };
    if (!regla.ciudad) return;
    setFilas(prev => {
      if (reglaModal.index === null || reglaModal.index === undefined) return [...prev, regla];
      return prev.map((fila, index) => index === reglaModal.index ? regla : fila);
    });
    setReglaModal(null);
  }

  function eliminarRegla(index) {
    setFilas(prev => prev.filter((_, i) => i !== index));
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

  return (
    <div style={{ background: 'var(--color-canvas)', borderRadius: '0.85rem', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', overflow: 'hidden', color: 'var(--color-fg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1.2rem', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-fg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} /> Ciudades y tarifas
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
            Configuración por ciudad con rangos de cantidad y courier opcional.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={abrirCiudadNueva}>
            <Plus size={16} /> Agregar ciudad
          </button>
          <button type="button" className="btn-nuevo-pedido" onClick={guardar} disabled={guardando}>
            <Save size={16} /> {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>
          <MapPin size={30} style={{ opacity: 0.35, margin: '0 auto 0.75rem' }} />
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-fg)' }}>No hay ciudades configuradas</p>
          <p style={{ margin: '0.3rem 0 1rem', fontSize: '0.86rem' }}>Agregá una ciudad para habilitarla en el checkout.</p>
          <button type="button" className="btn-nuevo-pedido" onClick={abrirCiudadNueva}>
            <Plus size={16} /> Agregar ciudad
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.9rem', padding: '1rem' }}>
          {grupos.map(grupo => (
            <section key={grupo.key} style={{ border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', borderRadius: '0.75rem', overflow: 'hidden', background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'center', padding: '0.95rem 1rem', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 7%, transparent)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--color-fg)' }}>{grupo.ciudad}</h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--color-fg-muted)' }}>{grupo.departamento || "Sin departamento"} · {grupo.reglas.length} rango{grupo.reglas.length === 1 ? "" : "s"}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button type="button" className="btn-secondary" onClick={() => abrirReglaNueva(grupo)}>
                    <Plus size={15} /> Agregar rango
                  </button>
                  <button type="button" className="btn-icon danger" onClick={() => eliminarCiudad(grupo)} title="Eliminar ciudad">
                    <Trash2 size={16} />
                  </button>
                </div>
              </header>

              <div style={{ display: 'grid' }}>
                {grupo.reglas
                  .sort((a, b) => (Number(a.rango_min) || 0) - (Number(b.rango_min) || 0))
                  .map(regla => (
                    <div key={regla.index} style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 1fr 0.8fr auto', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 5%, transparent)' }}>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--color-fg)' }}>{rangoLabel(regla)}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>{regla.tipo_pago || "Ambos"}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>{courierNombre(regla.courier_id)}</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--color-success)', fontFamily: 'monospace' }}>{precioLabel(regla.costo)}</strong>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button type="button" className="btn-icon" onClick={() => abrirEditarRegla(regla)} title="Editar rango">
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="btn-icon danger" onClick={() => eliminarRegla(regla.index)} title="Eliminar rango">
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

      {ciudadModal && (
        <div className="modal-overlay" onClick={() => setCiudadModal(null)}>
          <form onSubmit={crearPrimeraRegla} className="modal-content" style={{ maxWidth: 440, padding: '1.5rem', background: 'var(--color-canvas)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)' }} onClick={e => e.stopPropagation()}>
            <ModalHead title="Nueva ciudad" onClose={() => setCiudadModal(null)} />
            <div className="form-grid" style={{ gap: '1rem' }}>
              <Campo label="Departamento">
                <input autoFocus className="form-input" value={ciudadModal.departamento} onChange={e => setCiudadModal(prev => ({ ...prev, departamento: e.target.value }))} placeholder="Central" />
              </Campo>
              <Campo label="Ciudad">
                <input className="form-input" value={ciudadModal.ciudad} onChange={e => setCiudadModal(prev => ({ ...prev, ciudad: e.target.value }))} placeholder="Luque" required />
              </Campo>
            </div>
            <ModalActions onCancel={() => setCiudadModal(null)} submitLabel="Configurar rango" />
          </form>
        </div>
      )}

      {reglaModal && (
        <div className="modal-overlay" onClick={() => setReglaModal(null)}>
          <form onSubmit={guardarRegla} className="modal-content" style={{ maxWidth: 560, padding: '1.5rem', background: 'var(--color-canvas)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)' }} onClick={e => e.stopPropagation()}>
            <ModalHead title={`${reglaModal.regla.ciudad} · ${reglaModal.regla.departamento || "Sin departamento"}`} onClose={() => setReglaModal(null)} />
            <div className="form-grid" style={{ gap: '1rem' }}>
              <Campo label="Desde">
                <input autoFocus type="number" min="0" className="form-input" value={reglaModal.regla.rango_min} onChange={e => updateRegla('rango_min', Number(e.target.value))} />
              </Campo>
              <Campo label="Hasta">
                <input type="number" min="0" className="form-input" value={reglaModal.regla.rango_max ?? ""} onChange={e => updateRegla('rango_max', e.target.value === "" ? "" : Number(e.target.value))} placeholder="Sin límite" />
              </Campo>
              <Campo label="Pago">
                <select className="form-input" value={reglaModal.regla.tipo_pago} onChange={e => updateRegla('tipo_pago', e.target.value)}>
                  {TIPOS_PAGO.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </Campo>
              <Campo label="Courier">
                <select className="form-input" value={reglaModal.regla.courier_id || ""} onChange={e => updateRegla('courier_id', e.target.value)}>
                  <option value="">Sin asignar</option>
                  {couriers.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Campo>
              <Campo label="Costo">
                <CurrencyInput className="form-input" value={reglaModal.regla.costo} onChange={val => updateRegla('costo', val)} prefix="" />
              </Campo>
              <Campo label="Tiempo">
                <input className="form-input" value={reglaModal.regla.tiempo_entrega_hs} onChange={e => updateRegla('tiempo_entrega_hs', e.target.value)} placeholder="En el día" />
              </Campo>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-fg-muted)', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={reglaModal.regla.activo} onChange={e => updateRegla('activo', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                Rango activo
              </label>
            </div>
            <ModalActions onCancel={() => setReglaModal(null)} submitLabel="Guardar rango" />
          </form>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div className="form-group">
      <label style={{ color: 'var(--color-fg-muted)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', display: 'block' }}>{label}</label>
      {children}
    </div>
  );
}

function ModalHead({ title, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', paddingBottom: '0.9rem', marginBottom: '1rem' }}>
      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-fg)' }}>{title}</h3>
      <button type="button" className="btn-icon" onClick={onClose} title="Cerrar"><X size={18} /></button>
    </div>
  );
}

function ModalActions({ onCancel, submitLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', paddingTop: '1rem', marginTop: '1.2rem' }}>
      <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
      <button type="submit" className="btn-nuevo-pedido">{submitLabel}</button>
    </div>
  );
}
