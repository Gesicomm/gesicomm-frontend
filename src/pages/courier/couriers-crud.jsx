import { useState } from "react"
import { Bike, Car, Pencil, Phone, Plus, Trash2, Truck, X, Building2, MapPin, DollarSign, Layers } from "lucide-react"
import CurrencyInput from "../../components/CurrencyInput"
import ConfirmDialog from "../../components/ConfirmDialog"

const VEHICULOS = ["Moto", "Auto", "Camioneta", "Bicicleta"]
const TIPOS_PAGO = ["Anticipado", "Al Recibir", "Ambos"]

const emptyForm = {
  nombre: "",
  telefono: "",
  vehiculo: "Moto",
  activo: true,
  tarifas: []
}

function VehiculoIcon({ v }) {
  if (v === "Moto" || v === "Bicicleta") return <Bike size={15} />
  if (v === "Camioneta") return <Truck size={15} />
  return <Car size={15} />
}

export function CouriersCrud({
  couriers,
  enviosCountByCourier,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [courierABorrar, setCourierABorrar] = useState(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(c) {
    setEditing(c)
    setForm({ 
      nombre: c.nombre, 
      telefono: c.telefono, 
      vehiculo: c.vehiculo, 
      activo: c.activo,
      tarifas: c.tarifas || [] 
    })
    setOpen(true)
  }

  function submit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    if (editing) onUpdate({ ...editing, ...form })
    else onCreate(form)
    setOpen(false)
  }

  function addTarifa() {
    setForm(f => ({
      ...f,
      tarifas: [...f.tarifas, { ciudad_zona: "", tipo_pago: "Anticipado", rango_min: 0, rango_max: "", costo: 0, tiempo_entrega_hs: "En el día" }]
    }))
  }

  function updateTarifa(index, field, value) {
    setForm(f => {
      const nuevas = [...f.tarifas];
      nuevas[index][field] = value;
      return { ...f, tarifas: nuevas };
    });
  }

  function removeTarifa(index) {
    setForm(f => ({
      ...f,
      tarifas: f.tarifas.filter((_, i) => i !== index)
    }));
  }

  return (
    <div style={{ background: '#0a0a0b', borderRadius: '0.85rem', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Directorio de Couriers</h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#888888' }}>Gestioná tu red de repartidores y sus tarifas dinámicas</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-nuevo-pedido"
        >
          <Plus size={16} />
          Nuevo courier
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="prod-table" style={{ margin: 0, width: '100%' }}>
          <thead>
            <tr>
              <th>Courier</th>
              <th>Contacto</th>
              <th>Vehículo</th>
              <th style={{ textAlign: 'center' }}>Envíos del día</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {couriers.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 'bold', fontSize: '12px' }}>
                      {c.nombre.slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{c.nombre}</span>
                  </div>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaaaaa' }}>
                    <Phone size={14} />
                    {c.telefono || '-'}
                  </span>
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', padding: '0.25rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#e0e0e0', fontWeight: 600, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <VehiculoIcon v={c.vehiculo} />
                    {c.vehiculo}
                  </span>
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#34d399', fontWeight: 'bold' }}>
                  {enviosCountByCourier[c.id] ?? 0}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700,
                    background: c.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)', 
                    color: c.activo ? '#34d399' : '#888888',
                    border: c.activo ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.activo ? '#10b981' : '#64748b' }} />
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="action-btns" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-icon" onClick={() => openEdit(c)}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="btn-icon danger" onClick={() => setCourierABorrar(c)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {couriers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#888888', background: 'transparent' }}>
                  No hay couriers cargados todavía. Haz clic en <strong>+ Nuevo courier</strong> para agregar uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <form
            onSubmit={submit}
            className="modal-content"
            style={{ 
              background: '#0e0e11', 
              border: '1px solid rgba(255,255,255,0.12)', 
              borderRadius: '1rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              color: '#fff', 
              maxWidth: '720px',
              padding: '1.75rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header con botón X minimalista */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#ffffff', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {editing ? "Editar courier" : "Nuevo courier"}
              </h3>
              <button 
                type="button" 
                onClick={() => setOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: '#888888', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', borderRadius: '0.375rem', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = '#888888'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Inputs del formulario con iconos */}
            <div className="form-grid" style={{ gap: '1.25rem' }}>
              <div className="form-group full">
                <label style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                  Nombre del Courier o Empresa
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: '0.8rem', color: '#666' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej. Propio, TSI, PAP..."
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                  Teléfono
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '0.8rem', color: '#666' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    value={form.telefono}
                    onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    placeholder="0981 234 567"
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                  Vehículo Principal
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '0.8rem', color: '#666', pointerEvents: 'none' }}>
                    <VehiculoIcon v={form.vehiculo} />
                  </div>
                  <select
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%', appearance: 'auto' }}
                    value={form.vehiculo}
                    onChange={(e) => setForm((f) => ({ ...f, vehiculo: e.target.value }))}
                  >
                    {VEHICULOS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group full">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.06)', color: '#999999', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                    checked={form.activo}
                    onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  />
                  <span>Courier activo para recibir envíos</span>
                </label>
              </div>
            </div>

            {/* Sección Matriz de Tarifas */}
            <div className="tarifas-section" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Matriz de Tarifas</h4>
                <button 
                  type="button" 
                  onClick={addTarifa} 
                  style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={16} /> Agregar tarifa
                </button>
              </div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#666666' }}>
                Configura los costos por ciudad, tipo de pago y cantidad de envíos.
              </p>

              {form.tarifas.length === 0 ? (
                <div style={{ 
                  padding: '2rem 1.5rem', 
                  textAlign: 'center', 
                  color: '#666666', 
                  fontSize: '0.85rem',
                  border: '1px dashed rgba(255,255,255,0.12)', 
                  borderRadius: '0.75rem',
                  background: 'rgba(255,255,255,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', opacity: 0.4 }}>
                    <Layers size={22} />
                    <MapPin size={22} />
                  </div>
                  <span>No hay tarifas configuradas. Este courier no generará costos automáticamente.</span>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="prod-table" style={{ margin: 0, minWidth: '650px' }}>
                    <thead>
                      <tr>
                        <th>Ciudad/Zona</th>
                        <th>Pago</th>
                        <th>Rango Min</th>
                        <th>Rango Max</th>
                        <th>Costo (Gs)</th>
                        <th>Tiempo Entrega</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.tarifas.map((t, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              className="form-input" style={{ padding: '0.3rem 0.5rem' }}
                              placeholder="Ej. Asunción"
                              value={t.ciudad_zona}
                              onChange={(e) => updateTarifa(i, 'ciudad_zona', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <select
                              className="form-input" style={{ padding: '0.3rem 0.5rem' }}
                              value={t.tipo_pago}
                              onChange={(e) => updateTarifa(i, 'tipo_pago', e.target.value)}
                            >
                              {TIPOS_PAGO.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number" min="0"
                              className="form-input" style={{ width: '60px', padding: '0.3rem 0.5rem' }}
                              value={t.rango_min}
                              onChange={(e) => updateTarifa(i, 'rango_min', Number(e.target.value))}
                            />
                          </td>
                          <td>
                            <input
                              type="number" min="0" placeholder="+"
                              className="form-input" style={{ width: '60px', padding: '0.3rem 0.5rem' }}
                              value={t.rango_max === null ? "" : t.rango_max}
                              onChange={(e) => updateTarifa(i, 'rango_max', e.target.value === "" ? null : Number(e.target.value))}
                            />
                          </td>
                          <td>
                            <CurrencyInput
                              className="form-input"
                              style={{ width: '100px', padding: '0.3rem 0.5rem', fontFamily: 'monospace', textAlign: 'right' }}
                              value={t.costo}
                              onChange={(val) => updateTarifa(i, 'costo', val)}
                              prefix=""
                            />
                          </td>
                          <td>
                            <input
                              className="form-input" style={{ width: '90px', padding: '0.3rem 0.5rem' }}
                              placeholder="Ej. 24 hs"
                              value={t.tiempo_entrega_hs}
                              onChange={(e) => updateTarifa(i, 'tiempo_entrega_hs', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" onClick={() => removeTarifa(i)} className="btn-icon danger">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer de Acciones bien espaciado */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ 
                  background: 'rgba(255,255,255,0.04)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  color: '#cccccc', 
                  padding: '0.65rem 1.4rem', 
                  borderRadius: '0.6rem', 
                  fontWeight: 600, 
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #6d5ef8, #5b4bd6)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.6rem',
                  borderRadius: '0.6rem',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(109, 94, 248, 0.4)',
                  transition: 'all 0.2s'
                }}
              >
                {editing ? "Guardar cambios" : "Crear courier"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!courierABorrar}
        title={`¿Eliminar "${courierABorrar?.nombre}"?`}
        description="Esta acción no se puede deshacer. Los envíos ya asignados a este courier no se ven afectados."
        confirmLabel="Eliminar"
        danger
        onConfirm={() => { onDelete(courierABorrar.id); setCourierABorrar(null); }}
        onCancel={() => setCourierABorrar(null)}
      />
    </div>
  )
}
