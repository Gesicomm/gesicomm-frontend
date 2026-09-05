import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Ticket, Trash2, Loader, AlertCircle, Check } from 'lucide-react';
import { cuponService } from '../../services/cuponService';
import ProductPicker from '../landing/ProductPicker';
import '../landing/landing.css';

/**
 * Cupones de descuento del comercio: alta, listado y baja.
 *
 * El alcance ('tienda' o 'productos') se elige acá y no se puede cambiar
 * después: cambiarlo daría vuelta el significado de un código que quizás ya
 * está circulando impreso o compartido.
 */

function formatGs(n) {
  return Number(n || 0).toLocaleString('es-PY', { maximumFractionDigits: 0 });
}

const FORM_VACIO = {
  codigo: '',
  descuento_porcentaje: '',
  alcance: 'tienda',
  fecha_vencimiento: '',
  max_usos: '',
};

export default function CuponesModal({ abierto, onCerrar, catalogo }) {
  const [cupones, setCupones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_VACIO);
  const [seleccion, setSeleccion] = useState(new Map());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!abierto) return;
    setForm(FORM_VACIO);
    setSeleccion(new Map());
    setError(null);
    cargar();
  }, [abierto]);

  async function cargar() {
    setCargando(true);
    try {
      setCupones(await cuponService.listar());
    } catch {
      setCupones([]);
    } finally {
      setCargando(false);
    }
  }

  function toggleProducto(item) {
    setSeleccion(prev => {
      const copia = new Map(prev);
      const clave = `producto:${item.id}`;
      if (copia.has(clave)) copia.delete(clave);
      else copia.set(clave, { id: item.id, tipo: 'producto' });
      return copia;
    });
  }

  const productoIds = useMemo(
    () => [...seleccion.values()].map(v => v.id),
    [seleccion]
  );

  async function crear(e) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await cuponService.crear({
        codigo: form.codigo,
        descuento_porcentaje: form.descuento_porcentaje,
        alcance: form.alcance,
        producto_ids: form.alcance === 'productos' ? productoIds : [],
        fecha_vencimiento: form.fecha_vencimiento || null,
        max_usos: form.max_usos === '' ? null : form.max_usos,
      });
      setForm(FORM_VACIO);
      setSeleccion(new Map());
      await cargar();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear el cupón.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(cupon) {
    await cuponService.actualizar(cupon.id, { activo: !cupon.activo });
    cargar();
  }

  async function eliminar(cupon) {
    if (!window.confirm(`¿Eliminar el cupón ${cupon.codigo}? Los clientes que lo tengan ya no van a poder usarlo.`)) return;
    await cuponService.eliminar(cupon.id);
    cargar();
  }

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onCerrar}>
      <div
        className="bg-surface-2 border border-fg/10 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-fg/10 bg-fg/5">
          <h3 className="text-base font-semibold text-fg flex items-center gap-2">
            <Ticket size={18} /> Cupones de descuento
          </h3>
          <button type="button" onClick={onCerrar} className="p-1.5 text-fg/40 hover:text-fg hover:bg-fg/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <form onSubmit={crear} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
              <label className="form-group">
                <span className="form-label">Código</span>
                <input
                  className="form-input"
                  placeholder="VERANO20"
                  value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                  maxLength={40}
                  required
                />
              </label>
              <label className="form-group">
                <span className="form-label">Descuento (%)</span>
                <input
                  className="form-input"
                  type="number" min="1" max="100"
                  placeholder="15"
                  value={form.descuento_porcentaje}
                  onChange={e => setForm(f => ({ ...f, descuento_porcentaje: e.target.value }))}
                  required
                />
              </label>
              <label className="form-group">
                <span className="form-label">Vence el <small style={{ opacity: 0.6 }}>(opcional)</small></span>
                <input
                  className="form-input"
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                />
              </label>
              <label className="form-group">
                <span className="form-label">Máx. de usos <small style={{ opacity: 0.6 }}>(opcional)</small></span>
                <input
                  className="form-input"
                  type="number" min="1"
                  placeholder="Sin límite"
                  value={form.max_usos}
                  onChange={e => setForm(f => ({ ...f, max_usos: e.target.value }))}
                />
              </label>
            </div>

            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <span className="form-label">¿A qué aplica?</span>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="radio" name="alcance" value="tienda"
                    checked={form.alcance === 'tienda'}
                    onChange={() => setForm(f => ({ ...f, alcance: 'tienda' }))}
                  />
                  Todo el pedido
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="radio" name="alcance" value="productos"
                    checked={form.alcance === 'productos'}
                    onChange={() => setForm(f => ({ ...f, alcance: 'productos' }))}
                  />
                  Solo algunos productos
                </label>
              </div>
            </div>

            {form.alcance === 'productos' && (
              <div style={{ marginTop: '0.5rem' }}>
                {/* Mismo selector visual que el editor de landing. Va por
                    encima de este modal (z-index 100) o se abriría detrás. */}
                <ProductPicker
                  catalogo={catalogo}
                  seleccion={seleccion}
                  onToggle={toggleProducto}
                  max={100}
                  mostrarLista={false}
                  zIndexModal={1100}
                />
                {productoIds.length === 0 && (
                  <p className="field-hint" style={{ color: '#f59e0b' }}>
                    Elegí al menos un producto, o pasá el cupón a "Todo el pedido".
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="field-hint" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem' }}>
                <AlertCircle size={14} /> {error}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={guardando} style={{ marginTop: '0.75rem' }}>
              {guardando ? <Loader size={14} className="spin-icon" /> : <Ticket size={14} />} Generar cupón
            </button>
          </form>

          <h4 className="form-label" style={{ marginBottom: '0.5rem' }}>Cupones creados</h4>
          {cargando ? (
            <p className="field-hint"><Loader size={14} className="spin-icon" /> Cargando…</p>
          ) : cupones.length === 0 ? (
            <p className="field-hint">Todavía no generaste ningún cupón.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="md-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Código</th>
                    <th>Descuento</th>
                    <th>Aplica a</th>
                    <th>Usos</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cupones.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, letterSpacing: '0.04em' }}>{c.codigo}</td>
                      <td>{c.descuento_porcentaje}%</td>
                      <td>{c.alcance === 'tienda' ? 'Todo el pedido' : `${c.producto_ids.length} producto(s)`}</td>
                      <td>{c.usos}{c.max_usos != null ? ` / ${c.max_usos}` : ''}</td>
                      <td>{c.fecha_vencimiento || '—'}</td>
                      <td>
                        {/* "vigente" lo calcula el backend con el mismo criterio
                            que usa el checkout, para que no puedan discrepar. */}
                        <button
                          type="button"
                          onClick={() => alternarActivo(c)}
                          title={c.activo ? 'Desactivar' : 'Activar'}
                          style={{
                            border: 'none', cursor: 'pointer', borderRadius: '999px',
                            padding: '0.15rem 0.55rem', fontSize: '0.72rem', fontWeight: 700,
                            background: c.vigente ? 'rgba(16,185,129,0.15)' : 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
                            color: c.vigente ? '#10b981' : 'var(--color-fg-muted)',
                          }}
                        >
                          {c.vigente ? <><Check size={11} /> Vigente</> : c.activo ? 'Agotado o vencido' : 'Desactivado'}
                        </button>
                      </td>
                      <td>
                        <button type="button" className="btn-icon danger" onClick={() => eliminar(c)} title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
