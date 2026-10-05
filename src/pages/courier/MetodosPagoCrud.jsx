import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { CreditCard, Pencil, Plus, Trash2, X, Percent, ToggleLeft, ToggleRight } from "lucide-react"
import ConfirmDialog from "../../components/ConfirmDialog"
import { getMetodosPago, createMetodoPago, updateMetodoPago, deleteMetodoPago } from "../../services/courierApi"
import "./courier.css"
import "../productos/productos.css"


const emptyForm = {
  nombre: "",
  comision_porcentaje: 0,
  es_anticipado: false,
  custodia_cobro: "negocio",
  activo: false, // empieza inactivo — el usuario lo activa cuando está listo
}

export function MetodosPagoCrud() {
  const [metodos, setMetodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [metodoABorrar, setMetodoABorrar] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    cargarMetodos()
  }, [])

  async function cargarMetodos() {
    try {
      setLoading(true)
      const data = await getMetodosPago()
      setMetodos(data || [])
    } catch (err) {
      console.error("Error al cargar métodos de pago:", err)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError("")
    setOpen(true)
  }

  function openEdit(m) {
    setEditing(m)
    setForm({
      nombre: m.nombre,
      comision_porcentaje: m.comision_porcentaje,
      es_anticipado: m.es_anticipado,
      custodia_cobro: m.custodia_cobro || "negocio",
      activo: m.activo,
    })
    setError("")
    setOpen(true)
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    try {
      if (editing) {
        const res = await updateMetodoPago(editing.id, form)
        setMetodos(prev => prev.map(x => x.id === editing.id ? res : x))
      } else {
        const res = await createMetodoPago(form)
        setMetodos(prev => [...prev, res])
      }
      setOpen(false)
    } catch (err) {
      setError(err.response?.data?.error || "Ocurrió un error al guardar el método de pago")
    }
  }

  async function toggleActivo(m) {
    try {
      const res = await updateMetodoPago(m.id, { ...m, activo: !m.activo })
      setMetodos(prev => prev.map(x => x.id === m.id ? res : x))
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo cambiar el estado')
    }
  }

  async function confirmarBorrado() {
    try {
      await deleteMetodoPago(metodoABorrar.id)
      setMetodos(prev => prev.filter(x => x.id !== metodoABorrar.id))
      setMetodoABorrar(null)
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo eliminar el método de pago")
      setMetodoABorrar(null)
    }
  }

  return (
    <div style={{ background: 'var(--color-canvas)', borderRadius: '0.85rem', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', overflow: 'hidden', color: 'var(--color-fg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1.2rem', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-fg)' }}>Activa Tus Métodos de Pago</h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
            Configurá la comisión y custodia de cada medio de pago. El confirmador asignará estos métodos al momento de procesar cada pedido.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-nuevo-pedido">
          <Plus size={16} />
          Nuevo método
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="prod-table" style={{ margin: 0, width: '100%' }}>
          <thead>
            <tr>
              <th>Método</th>
              <th style={{ textAlign: 'center' }}>Comisión</th>
              <th style={{ textAlign: 'center' }}>El dinero queda en</th>
              <th style={{ textAlign: 'center' }}>Activo</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!loading && metodos.map((m) => (
              <tr key={m.id} style={{ opacity: m.activo ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: m.activo ? 'color-mix(in srgb, var(--color-success) 14%, transparent)' : 'color-mix(in srgb, var(--color-fg) 6%, transparent)',
                      color: m.activo ? 'var(--color-success)' : 'var(--color-fg-muted)'
                    }}>
                      <CreditCard size={15} />
                    </span>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--color-fg)' }}>{m.nombre}</span>
                      {!m.activo && <div style={{ fontSize: '0.7rem', color: 'var(--color-fg-subtle)', marginTop: '1px' }}>Inactivo — no aparece al crear pedidos</div>}
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-primary-text)' }}>
                  {Number(m.comision_porcentaje).toLocaleString('es-PY', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: m.custodia_cobro === 'courier' ? 'var(--color-warning)' : 'var(--color-fg-muted)' }}>
                    {m.custodia_cobro === 'courier' ? '🚚 Manos del courier' : '🏪 Cuenta del negocio'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => toggleActivo(m)}
                    title={m.activo ? 'Clic para desactivar' : 'Clic para activar'}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem',
                      color: m.activo ? 'var(--color-success)' : 'var(--color-fg-subtle)',
                      display: 'inline-flex', alignItems: 'center', transition: 'color 0.15s'
                    }}
                  >
                    {m.activo
                      ? <ToggleRight size={28} />
                      : <ToggleLeft size={28} />}
                  </button>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button type="button" className="btn-icon" onClick={() => openEdit(m)} title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="btn-icon danger" onClick={() => setMetodoABorrar(m)} title="Eliminar">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && metodos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-fg-muted)', background: 'transparent' }}>
                  No hay métodos de pago cargados todavía. Creá uno con el botón de arriba.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-fg-muted)', background: 'transparent' }}>
                  Cargando métodos de pago...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && createPortal((
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <form
            onSubmit={submit}
            className="modal-content"
            style={{
              background: 'var(--color-canvas)',
              border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
              borderRadius: '1rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              color: 'var(--color-fg)',
              maxWidth: '480px',
              padding: '1.75rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--color-fg)', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {editing ? "Editar método de pago" : "Nuevo método de pago"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-fg-muted)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)', color: 'var(--color-danger)', padding: '0.6rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div className="form-grid" style={{ gap: '1.25rem' }}>
              <div className="form-group full">
                <label style={{ color: 'var(--color-fg-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                  Nombre del Método de Pago
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <CreditCard size={16} style={{ position: 'absolute', left: '0.8rem', color: 'var(--color-fg-subtle)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej. Transferencia bancaria contra entrega"
                    required
                  />
                </div>
              </div>

              <div className="form-group full">
                <label style={{ color: 'var(--color-fg-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                  Comisión (%)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Percent size={16} style={{ position: 'absolute', left: '0.8rem', color: 'var(--color-fg-subtle)' }} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    value={form.comision_porcentaje}
                    onChange={(e) => setForm((f) => ({ ...f, comision_porcentaje: e.target.value }))}
                    placeholder="Ej. 2.2"
                  />
                </div>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-fg-subtle)' }}>
                  Porcentaje que se descuenta por cobrar con este método. Se usa en los reportes de rentabilidad.
                </p>
              </div>

              <div className="form-group full">
                <label style={{ color: 'var(--color-fg-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                  ¿Dónde queda el dinero cobrado con este método?
                </label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={form.custodia_cobro}
                  onChange={(e) => setForm((f) => ({ ...f, custodia_cobro: e.target.value }))}
                >
                  <option value="negocio">El dinero ya está en la cuenta del negocio</option>
                  <option value="courier">El courier recibe el dinero</option>
                </select>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-fg-subtle)' }}>
                  Define el motor de rendición: si el courier recibe el dinero, tiene que rendirlo; si ya está en la cuenta del negocio, el negocio le debe el costo de entrega.
                </p>
              </div>

              <div className="form-group full">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)', padding: '0.85rem 1rem', borderRadius: '0.6rem', border: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)', color: 'var(--color-fg-muted)', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                    checked={form.activo}
                    onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  />
                  <span>Método activo (visible al crear pedidos)</span>
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', paddingTop: '1.25rem', marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)',
                  color: 'var(--color-fg)',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '0.6rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-active))',
                  color: 'var(--color-primary-fg)',
                  border: 'none',
                  padding: '0.65rem 1.6rem',
                  borderRadius: '0.6rem',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary) 35%, transparent)'
                }}
              >
                {editing ? "Guardar cambios" : "Crear método"}
              </button>
            </div>
          </form>
        </div>
      ), document.body)}

      <ConfirmDialog
        open={!!metodoABorrar}
        title={`¿Eliminar "${metodoABorrar?.nombre}"?`}
        description="Esta acción no se puede deshacer. Si hay pedidos que usan este método, primero deberás desactivarlo."
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmarBorrado}
        onCancel={() => setMetodoABorrar(null)}
      />
    </div>
  )
}
