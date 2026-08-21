import React, { useState } from 'react';
import { X, Check, Loader, ImageOff } from 'lucide-react';
import { hexToRgba } from '../landing-simple/templates/themeUtils';
import { formatPrecio } from '../../lib/mensajeWhatsapp';

const FORM_VACIO = {
  nombre_cliente: '', ruc: '', telefono: '', ciudad: '', departamento: '', direccion: '', referencia: '',
};

/**
 * Checkout del embudo: UNA sola pantalla, sin pasar por el carrito.
 *
 * En venta directa el carrito es un paso de fuga — el comprador ya decidió
 * en la página; meterlo en un carrito multi-producto le da una oportunidad
 * más de irse. Por eso "Comprar ahora" abre esto directo.
 *
 * Sin order bump ni upsell a propósito: son mecanismos de otros embudos.
 */
export default function FunnelCheckout({ abierto, onCerrar, onConfirmar, resumen, tema }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [confirmado, setConfirmado] = useState(null);

  if (!abierto) return null;

  const bordeSuave = hexToRgba(tema.texto, 0.15);
  const valido = form.nombre_cliente.trim() && form.telefono.trim()
    && form.ciudad.trim() && form.direccion.trim() && acepta;

  function campo(clave, valor) {
    setForm(prev => ({ ...prev, [clave]: valor }));
  }

  function cerrar() {
    onCerrar();
    // Reset diferido: si se cierra a mitad del formulario o ya confirmado,
    // la próxima apertura arranca limpia.
    setTimeout(() => {
      setForm(FORM_VACIO);
      setAcepta(false);
      setError(null);
      setConfirmado(null);
    }, 200);
  }

  async function enviar(e) {
    e.preventDefault();
    if (!valido) return;
    setError(null);
    setEnviando(true);
    try {
      const res = await onConfirmar(form);
      setConfirmado(res || {});
    } catch (err) {
      setError(err?.message || 'No se pudo enviar el pedido. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '0.6rem',
    border: `1px solid ${bordeSuave}`,
    backgroundColor: hexToRgba(tema.texto, 0.04),
    color: tema.texto,
    fontSize: '0.9rem',
    outline: 'none',
  };
  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginBottom: '0.3rem',
    color: hexToRgba(tema.texto, 0.65),
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) cerrar(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: '440px',
          backgroundColor: tema.fondo, color: tema.texto,
          borderRadius: '1rem', padding: '1.5rem',
          position: 'relative', maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {!confirmado && (
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            style={{ position: 'absolute', top: '1rem', right: '1rem', color: hexToRgba(tema.texto, 0.5) }}
          >
            <X size={20} />
          </button>
        )}

        {confirmado ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div
              style={{
                width: 52, height: 52, borderRadius: '50%', margin: '0 auto 1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: hexToRgba(tema.acento, 0.15), color: tema.acento,
              }}
            >
              <Check size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>¡Pedido recibido!</h3>
            <p style={{ fontSize: '0.9rem', color: hexToRgba(tema.texto, 0.65), lineHeight: 1.5 }}>
              {confirmado.redirigido
                ? 'Te vamos a escribir por WhatsApp para coordinar el pago y la entrega.'
                : 'La tienda se va a contactar para coordinar el pago y la entrega.'}
            </p>
            <button
              type="button"
              onClick={cerrar}
              style={{
                marginTop: '1.5rem', width: '100%', padding: '0.75rem',
                borderRadius: '0.75rem', fontWeight: 700,
                backgroundColor: tema.acento, color: tema.fondo,
              }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.25rem' }}>Completá tu compra</h3>

            {/* Resumen: qué se está comprando exactamente, para que no haya
                sorpresas al confirmar. */}
            {resumen && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', borderRadius: '0.75rem',
                  border: `1px solid ${bordeSuave}`, marginBottom: '0.25rem',
                }}
              >
                <div
                  style={{
                    width: 46, height: 46, borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0,
                    backgroundColor: hexToRgba(tema.texto, 0.06),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {resumen.imagen
                    ? <img src={resumen.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <ImageOff size={18} style={{ color: hexToRgba(tema.texto, 0.3) }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{resumen.nombre}</p>
                  {resumen.variante && (
                    <p style={{ fontSize: '0.78rem', color: hexToRgba(tema.texto, 0.6) }}>{resumen.variante}</p>
                  )}
                </div>
                <strong style={{ fontSize: '1rem' }}>{formatPrecio(resumen.precio)}</strong>
              </div>
            )}

            {error && (
              <p style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>{error}</p>
            )}

            <div>
              <label style={labelStyle}>Nombre y Apellido *</label>
              <input required value={form.nombre_cliente} onChange={e => campo('nombre_cliente', e.target.value)} placeholder="Nombre y Apellido" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Celular *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: hexToRgba(tema.texto, 0.6) }}>+595</span>
                <input required value={form.telefono} onChange={e => campo('telefono', e.target.value)} placeholder="9XX XXXXXX" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Ciudad *</label>
              <input required value={form.ciudad} onChange={e => campo('ciudad', e.target.value)} placeholder="Ciudad" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Dirección *</label>
              <input required value={form.direccion} onChange={e => campo('direccion', e.target.value)} placeholder="Calle y número de casa" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Referencia</label>
              <input value={form.referencia} onChange={e => campo('referencia', e.target.value)} placeholder="Opcional — un punto conocido cerca" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>RUC (factura)</label>
              <input value={form.ruc} onChange={e => campo('ruc', e.target.value)} placeholder="Opcional" style={inputStyle} />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: hexToRgba(tema.texto, 0.7), cursor: 'pointer' }}>
              <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} style={{ marginTop: '0.15rem' }} />
              <span>Acepto que mis datos se usen para procesar este pedido.</span>
            </label>

            <button
              type="submit"
              disabled={!valido || enviando}
              style={{
                marginTop: '0.25rem', width: '100%', padding: '0.9rem',
                borderRadius: '0.75rem', fontWeight: 800, fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                backgroundColor: tema.acento, color: tema.fondo,
                opacity: (!valido || enviando) ? 0.5 : 1,
                cursor: (!valido || enviando) ? 'not-allowed' : 'pointer',
              }}
            >
              {enviando
                ? <><Loader size={17} className="animate-spin" /> Enviando...</>
                : `Confirmar pedido — ${formatPrecio(resumen?.precio)}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
