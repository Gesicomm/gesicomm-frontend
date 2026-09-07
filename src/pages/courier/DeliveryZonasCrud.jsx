import { useEffect, useState } from "react";
import { MapPin, Plus, Save, Trash2 } from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";

const TIPOS_PAGO = ["Anticipado", "Al Recibir", "Ambos"];

const nuevaZona = () => ({
  departamento: "",
  ciudad: "",
  courier_id: "",
  tipo_pago: "Ambos",
  rango_min: 0,
  rango_max: "",
  costo: 0,
  tiempo_entrega_hs: "En el día",
  activo: true,
});

export function DeliveryZonasCrud({ zonas = [], couriers = [], onSave }) {
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);

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

  function updateFila(index, field, value) {
    setFilas(prev => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [field]: value };
      return copia;
    });
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
            Estas son las ciudades que aparecen en el checkout público. El courier asignado es opcional.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={() => setFilas(prev => [...prev, nuevaZona()])}>
            <Plus size={16} /> Agregar ciudad
          </button>
          <button type="button" className="btn-nuevo-pedido" onClick={guardar} disabled={guardando}>
            <Save size={16} /> {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="prod-table" style={{ margin: 0, minWidth: '980px' }}>
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Ciudad</th>
              <th>Courier</th>
              <th>Pago</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Costo</th>
              <th>Tiempo</th>
              <th>Activa</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, index) => (
              <tr key={fila.id || index}>
                <td>
                  <input className="form-input" style={{ padding: '0.35rem 0.55rem' }} value={fila.departamento} onChange={e => updateFila(index, 'departamento', e.target.value)} placeholder="Central" />
                </td>
                <td>
                  <input className="form-input" style={{ padding: '0.35rem 0.55rem' }} value={fila.ciudad} onChange={e => updateFila(index, 'ciudad', e.target.value)} placeholder="Luque" />
                </td>
                <td>
                  <select className="form-input" style={{ padding: '0.35rem 0.55rem', minWidth: 150 }} value={fila.courier_id || ""} onChange={e => updateFila(index, 'courier_id', e.target.value)}>
                    <option value="">Sin asignar</option>
                    {couriers.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </td>
                <td>
                  <select className="form-input" style={{ padding: '0.35rem 0.55rem' }} value={fila.tipo_pago} onChange={e => updateFila(index, 'tipo_pago', e.target.value)}>
                    {TIPOS_PAGO.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </td>
                <td>
                  <input type="number" min="0" className="form-input" style={{ width: 72, padding: '0.35rem 0.55rem' }} value={fila.rango_min} onChange={e => updateFila(index, 'rango_min', Number(e.target.value))} />
                </td>
                <td>
                  <input type="number" min="0" className="form-input" style={{ width: 72, padding: '0.35rem 0.55rem' }} value={fila.rango_max ?? ""} onChange={e => updateFila(index, 'rango_max', e.target.value === "" ? "" : Number(e.target.value))} placeholder="+" />
                </td>
                <td>
                  <CurrencyInput className="form-input" style={{ width: 110, padding: '0.35rem 0.55rem', textAlign: 'right', fontFamily: 'monospace' }} value={fila.costo} onChange={val => updateFila(index, 'costo', val)} prefix="" />
                </td>
                <td>
                  <input className="form-input" style={{ width: 115, padding: '0.35rem 0.55rem' }} value={fila.tiempo_entrega_hs} onChange={e => updateFila(index, 'tiempo_entrega_hs', e.target.value)} placeholder="24 hs" />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={fila.activo} onChange={e => updateFila(index, 'activo', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button type="button" className="btn-icon danger" onClick={() => setFilas(prev => prev.filter((_, i) => i !== index))}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-fg-muted)' }}>
                  Todavía no hay ciudades configuradas. Agregá la primera para habilitar el selector del checkout.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
