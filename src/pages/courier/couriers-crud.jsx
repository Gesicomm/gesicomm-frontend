import { useState } from "react";
import { Bike, Building2, Car, Info, Pencil, Phone, Plus, Trash2, Truck, X } from "lucide-react";
import ConfirmDialog from "../../components/ConfirmDialog";

const VEHICULOS = ["Moto", "Auto", "Camioneta", "Bicicleta"];

const emptyForm = {
  nombre: "",
  telefono: "",
  vehiculo: "Moto",
  activo: true,
};

function VehiculoIcon({ v }) {
  if (v === "Moto" || v === "Bicicleta") return <Bike size={15} />;
  if (v === "Camioneta") return <Truck size={15} />;
  return <Car size={15} />;
}

function iniciales(nombre = "") {
  return nombre.trim().slice(0, 2).toUpperCase() || "CO";
}

export function CouriersCrud({
  couriers,
  enviosCountByCourier,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [courierABorrar, setCourierABorrar] = useState(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({
      nombre: c.nombre || "",
      telefono: c.telefono || "",
      vehiculo: c.vehiculo || "Moto",
      activo: c.activo !== false,
    });
    setOpen(true);
  }

  function submit(e) {
    e.preventDefault();
    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      vehiculo: form.vehiculo,
      activo: form.activo,
    };
    if (!payload.nombre) return;
    if (editing) onUpdate({ id: editing.id, ...payload });
    else onCreate(payload);
    setOpen(false);
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Directorio de Couriers</h2>
          <p style={styles.subtitle}>
            Gestioná los repartidores. Las tarifas y ciudades se asignan en la pestaña Ciudades.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-nuevo-pedido">
          <Plus size={16} />
          Nuevo courier
        </button>
      </div>

      <div style={styles.notice}>
        <Info size={16} />
        <span>
          En esta sección solo cargás los datos del courier. Para relacionarlo con una ciudad, agregá o editá un rango en <strong>Ciudades y tarifas</strong>.
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="prod-table" style={{ margin: 0, width: "100%" }}>
          <thead>
            <tr>
              <th>Courier</th>
              <th>Contacto</th>
              <th>Vehículo</th>
              <th style={{ textAlign: "center" }}>Envíos del día</th>
              <th style={{ textAlign: "center" }}>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {couriers.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={styles.courierCell}>
                    <span style={styles.avatar}>{iniciales(c.nombre)}</span>
                    <span style={styles.name}>{c.nombre}</span>
                  </div>
                </td>
                <td>
                  <span style={styles.contact}>
                    <Phone size={14} />
                    {c.telefono || "-"}
                  </span>
                </td>
                <td>
                  <span style={styles.vehicleBadge}>
                    <VehiculoIcon v={c.vehiculo} />
                    {c.vehiculo || "Sin definir"}
                  </span>
                </td>
                <td style={styles.todayCount}>
                  {enviosCountByCourier[c.id] ?? 0}
                </td>
                <td style={{ textAlign: "center" }}>
                  <span style={c.activo ? styles.statusActive : styles.statusInactive}>
                    <span style={{ ...styles.statusDot, background: c.activo ? "var(--color-success)" : "var(--color-fg-muted)" }} />
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="action-btns" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="btn-icon" onClick={() => openEdit(c)} title="Editar courier" aria-label={`Editar ${c.nombre}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="btn-icon danger" onClick={() => setCourierABorrar(c)} title="Eliminar courier" aria-label={`Eliminar ${c.nombre}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {couriers.length === 0 && (
              <tr>
                <td colSpan={6} style={styles.emptyCell}>
                  No hay couriers cargados todavía. Haz clic en <strong>Nuevo courier</strong> para agregar uno.
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
            style={styles.modal}
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <p style={styles.eyebrow}>Datos del courier</p>
                <h3 style={styles.modalTitle}>{editing ? "Editar courier" : "Nuevo courier"}</h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} title="Cerrar" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="form-grid" style={{ gap: "1.25rem" }}>
              <div className="form-group full">
                <label style={styles.label}>Nombre del courier o empresa</label>
                <div style={styles.inputWrap}>
                  <Building2 size={16} style={styles.inputIcon} />
                  <input
                    autoFocus
                    className="form-input"
                    style={styles.iconInput}
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej. Propio, TSI, PAP..."
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={styles.label}>Teléfono de contacto</label>
                <div style={styles.inputWrap}>
                  <Phone size={16} style={styles.inputIcon} />
                  <input
                    className="form-input"
                    style={styles.iconInput}
                    value={form.telefono}
                    onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    placeholder="0981 234 567"
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={styles.label}>Tipo de vehículo</label>
                <div style={styles.inputWrap}>
                  <div style={styles.inputIcon}>
                    <VehiculoIcon v={form.vehiculo} />
                  </div>
                  <select
                    className="form-input"
                    style={{ ...styles.iconInput, appearance: "auto" }}
                    value={form.vehiculo}
                    onChange={(e) => setForm((f) => ({ ...f, vehiculo: e.target.value }))}
                  >
                    {VEHICULOS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={styles.modalHint}>
              <Info size={15} />
              <span>Después asigná este courier a una ciudad desde la pestaña Ciudades, dentro del rango correspondiente.</span>
            </div>

            <div style={styles.footer}>
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-nuevo-pedido">
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
  );
}

const styles = {
  panel: {
    background: "var(--color-canvas)",
    borderRadius: "0.85rem",
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    overflow: "hidden",
    color: "var(--color-fg)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
    padding: "1.2rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  title: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--color-fg)",
  },
  subtitle: {
    margin: "0.2rem 0 0 0",
    fontSize: "0.8rem",
    color: "var(--color-fg-muted)",
  },
  notice: {
    display: "flex",
    alignItems: "center",
    gap: "0.55rem",
    margin: "1rem 1.2rem 0",
    padding: "0.75rem 0.9rem",
    borderRadius: 10,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 16%, transparent)",
    fontSize: "0.82rem",
  },
  courierCell: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  avatar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
    color: "var(--color-primary-text)",
    fontWeight: "bold",
    fontSize: 12,
  },
  name: {
    fontWeight: 600,
    color: "var(--color-fg)",
  },
  contact: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--color-fg-muted)",
  },
  vehicleBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "color-mix(in srgb, var(--color-fg) 6%, transparent)",
    padding: "0.25rem 0.6rem",
    borderRadius: "0.375rem",
    fontSize: "0.75rem",
    color: "var(--color-fg)",
    fontWeight: 600,
    border: "1px solid color-mix(in srgb, var(--color-fg) 5%, transparent)",
  },
  todayCount: {
    textAlign: "center",
    fontFamily: "monospace",
    color: "var(--color-success)",
    fontWeight: "bold",
  },
  statusActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.2rem 0.6rem",
    borderRadius: "1rem",
    fontSize: "0.75rem",
    fontWeight: 700,
    background: "color-mix(in srgb, var(--color-success) 15%, transparent)",
    color: "var(--color-success)",
    border: "1px solid color-mix(in srgb, var(--color-success) 30%, transparent)",
  },
  statusInactive: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.2rem 0.6rem",
    borderRadius: "1rem",
    fontSize: "0.75rem",
    fontWeight: 700,
    background: "color-mix(in srgb, var(--color-fg) 6%, transparent)",
    color: "var(--color-fg-muted)",
    border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },
  emptyCell: {
    textAlign: "center",
    padding: "3rem",
    color: "var(--color-fg-muted)",
    background: "transparent",
  },
  modal: {
    background: "var(--color-canvas)",
    border: "1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)",
    borderRadius: "1rem",
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
    color: "var(--color-fg)",
    maxWidth: 520,
    padding: "1.5rem",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    paddingBottom: "1rem",
    marginBottom: "1.25rem",
  },
  eyebrow: {
    margin: "0 0 0.25rem",
    color: "var(--color-fg-muted)",
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  modalTitle: {
    color: "var(--color-fg)",
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: 800,
  },
  label: {
    color: "var(--color-fg-muted)",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "0.35rem",
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
  modalHint: {
    display: "flex",
    gap: "0.55rem",
    alignItems: "flex-start",
    padding: "0.8rem 0.9rem",
    marginTop: "1.2rem",
    borderRadius: 10,
    color: "var(--color-fg-muted)",
    background: "color-mix(in srgb, var(--color-fg) 4%, transparent)",
    fontSize: "0.82rem",
  },
  footer: {
    borderTop: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
    paddingTop: "1.1rem",
    marginTop: "1.25rem",
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.85rem",
  },
};
