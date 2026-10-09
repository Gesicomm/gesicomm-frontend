import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Ticket, Trash2, Loader, AlertCircle, Check, ShoppingCart, Package, Calendar, Hash } from 'lucide-react';
import { cuponService } from '../../services/cuponService';
import ProductPicker from '../landing/ProductPicker';
import '../landing/landing.css';
import './cuponesModal.css';

/**
 * Cupones de descuento del comercio: alta, listado y baja.
 *
 * El alcance ('tienda' o 'productos') se elige acá y no se puede cambiar
 * después: cambiarlo daría vuelta el significado de un código que quizás ya
 * está circulando impreso o compartido.
 */

function hoyInput() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' });
}

function formatFecha(fecha) {
  if (!fecha) return 'Sin vencimiento';
  const [y, m, d] = String(fecha).split('-');
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

function estadoCupon(cupon) {
  if (cupon.vigente) return { label: 'Vigente', tone: 'ok' };
  if (cupon.estado_motivo === 'vencido') return { label: 'Vencido', tone: 'warn' };
  if (cupon.estado_motivo === 'agotado') return { label: 'Sin canjes', tone: 'warn' };
  return { label: 'Desactivado', tone: 'muted' };
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
  const puedeCrear = !guardando && form.codigo.trim() && form.descuento_porcentaje && (form.alcance !== 'productos' || productoIds.length > 0);
  const resumenAlcance = form.alcance === 'tienda'
    ? 'Descuenta sobre todos los productos del carrito que puedan recibir descuento.'
    : productoIds.length
      ? `Descuenta solo ${productoIds.length} producto${productoIds.length === 1 ? '' : 's'} elegido${productoIds.length === 1 ? '' : 's'}.`
      : 'Elegí los productos que aceptan este cupón.';

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

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar cup-modal-body">
          <form onSubmit={crear} className="cup-form">
            <div className="cup-intro">
              <div>
                <strong>Armá un cupón listo para anuncios</strong>
                <span>El cliente escribe el código en el checkout. Si vence o se queda sin canjes, el backend lo rechaza automáticamente.</span>
              </div>
              <Ticket size={22} />
            </div>

            <div className="cup-fields">
              <label className="form-group">
                <span className="form-label"><Hash size={13} /> Código para anunciar</span>
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
                <span className="form-label"><Calendar size={13} /> Vence el <small>(opcional)</small></span>
                <input
                  className="form-input"
                  type="date"
                  min={hoyInput()}
                  value={form.fecha_vencimiento}
                  onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                />
                <p className="cup-hint">Disponible hasta el final de ese día, hora Paraguay.</p>
              </label>
              <label className="form-group">
                <span className="form-label">Límite de canjes <small>(opcional)</small></span>
                <input
                  className="form-input"
                  type="number" min="1" step="1"
                  placeholder="Ilimitado"
                  value={form.max_usos}
                  onChange={e => setForm(f => ({ ...f, max_usos: e.target.value }))}
                />
                <p className="cup-hint">Se cuenta cuando se crea un pedido, no cuando prueban el código.</p>
              </label>
            </div>

            <div className="cup-scope">
              <span className="form-label">¿Dónde se aplica el descuento?</span>
              <div className="cup-scope-grid">
                <label className={`cup-scope-card ${form.alcance === 'tienda' ? 'is-active' : ''}`}>
                  <input
                    type="radio" name="alcance" value="tienda"
                    checked={form.alcance === 'tienda'}
                    onChange={() => setForm(f => ({ ...f, alcance: 'tienda' }))}
                  />
                  <span className="cup-scope-icon"><ShoppingCart size={18} /></span>
                  <span>
                    <strong>Carrito completo</strong>
                    <small>Descuenta el total de productos del pedido. Ideal para anuncios generales.</small>
                  </span>
                </label>
                <label className={`cup-scope-card ${form.alcance === 'productos' ? 'is-active' : ''}`}>
                  <input
                    type="radio" name="alcance" value="productos"
                    checked={form.alcance === 'productos'}
                    onChange={() => setForm(f => ({ ...f, alcance: 'productos' }))}
                  />
                  <span className="cup-scope-icon"><Package size={18} /></span>
                  <span>
                    <strong>Productos elegidos</strong>
                    <small>Solo descuenta los productos que selecciones abajo.</small>
                  </span>
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
                  <p className="cup-warning">
                    <AlertCircle size={14} /> Elegí al menos un producto, o cambiá a "Carrito completo".
                  </p>
                )}
              </div>
            )}

            <div className="cup-summary" aria-live="polite">
              <strong>{form.codigo.trim() || 'CÓDIGO'}</strong>
              <span>{form.descuento_porcentaje || 0}% de descuento</span>
              <span>{resumenAlcance}</span>
              <span>{form.max_usos ? `${form.max_usos} canje${Number(form.max_usos) === 1 ? '' : 's'} como máximo` : 'Canjes ilimitados'} · {formatFecha(form.fecha_vencimiento)}</span>
            </div>

            {error && (
              <p className="field-hint" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem' }}>
                <AlertCircle size={14} /> {error}
              </p>
            )}

            <button type="submit" className="btn-primary cup-submit" disabled={!puedeCrear}>
              {guardando ? <Loader size={14} className="spin-icon" /> : <Ticket size={14} />} Generar cupón
            </button>
          </form>

          <h4 className="form-label cup-created-title">Cupones creados</h4>
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
                    <th>Alcance</th>
                    <th>Canjes</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cupones.map(c => {
                    const estado = estadoCupon(c);
                    const max = c.max_usos == null ? null : Number(c.max_usos);
                    const usados = Number(c.usos || 0);
                    const progreso = max ? Math.min(100, Math.round((usados / max) * 100)) : 0;
                    return (
                    <tr key={c.id}>
                      <td><span className="cup-code">{c.codigo}</span></td>
                      <td>{c.descuento_porcentaje}%</td>
                      <td>{c.alcance === 'tienda' ? 'Carrito completo' : `${c.producto_ids.length} producto(s)`}</td>
                      <td>
                        <div className="cup-usage">
                          <span>{usados}{max ? ` / ${max}` : ' usados'}</span>
                          {max ? <i style={{ '--cup-progress': `${progreso}%` }} /> : <small>Ilimitado</small>}
                        </div>
                      </td>
                      <td>{formatFecha(c.fecha_vencimiento)}</td>
                      <td>
                        {/* "vigente" lo calcula el backend con el mismo criterio
                            que usa el checkout, para que no puedan discrepar. */}
                        <button
                          type="button"
                          onClick={() => alternarActivo(c)}
                          title={c.activo ? 'Desactivar' : 'Activar'}
                          className={`cup-status cup-status--${estado.tone}`}
                        >
                          {c.vigente && <Check size={11} />} {estado.label}
                        </button>
                      </td>
                      <td>
                        <button type="button" className="btn-icon danger" onClick={() => eliminar(c)} title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );})}
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
