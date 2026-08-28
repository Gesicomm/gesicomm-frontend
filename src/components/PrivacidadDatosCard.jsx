import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader, ShieldOff, Trash2 } from 'lucide-react';
import { api } from '../utils/api';

/**
 * Sección "Privacidad y datos" de Configuración.
 *
 * Es el «Método 1» que documenta la página pública /data-deletion, y tiene
 * que existir de verdad: un revisor de Meta sigue esos pasos literalmente
 * durante la revisión de la aplicación. Si la pantalla que describe el
 * documento no está, la revisión se rechaza.
 *
 * La solicitud no borra en el acto: registra un pedido con la identidad ya
 * verificada —sesión más contraseña— que se procesa dentro de los 30 días
 * comprometidos públicamente. Es el mismo plazo y el mismo circuito que el
 * formulario público, con la diferencia de que acá el paso de verificación
 * por correo se saltea porque ya está probada.
 */
const OPCIONES = [
  {
    valor: 'datos',
    titulo: 'Eliminar todos mis datos',
    descripcion:
      'Borra el contenido de la cuenta —catálogo, pedidos, clientes, envíos, campañas e historial— y conserva la cuenta activa para empezar de cero.',
  },
  {
    valor: 'cuenta',
    titulo: 'Eliminar mi cuenta',
    descripcion:
      'Borra la cuenta completa, todos sus datos y todos sus usuarios. Perdés el acceso definitivamente.',
  },
];

const PrivacidadDatosCard = () => {
    const [abierto, setAbierto] = useState(false);
    const [alcance, setAlcance] = useState('datos');
    const [password, setPassword] = useState('');
    const [motivo, setMotivo] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState(null);
    const [resultado, setResultado] = useState(null);

    const enviar = async (e) => {
        e.preventDefault();
        const opcion = OPCIONES.find(o => o.valor === alcance);
        if (!window.confirm(`¿Confirmás la solicitud "${opcion.titulo}"? Esta acción es irreversible una vez procesada.`)) return;

        setEnviando(true);
        setError(null);
        try {
            const data = await api.post('/api/publico/mi-cuenta/eliminacion', { alcance, password, motivo });
            setResultado(data);
            setPassword('');
        } catch (err) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    };

    if (resultado) {
        return (
            <div className="card" id="privacidad-y-datos">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Solicitud de eliminación registrada</h3>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-fg-muted)', lineHeight: 1.6 }}>
                            {resultado.message}
                        </p>
                        <p style={{ margin: '0.9rem 0 0', fontSize: '0.85rem', color: 'var(--color-fg-muted)' }}>
                            Código de seguimiento:{' '}
                            <code style={{ color: 'var(--color-fg)', fontWeight: 600 }}>{resultado.solicitud.codigo}</code>
                        </p>
                        <a
                            href={`/data-deletion/estado/${resultado.solicitud.codigo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-block', marginTop: '0.9rem', fontSize: '0.85rem', color: '#7d9bd6' }}
                        >
                            Ver el estado de mi solicitud →
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card" id="privacidad-y-datos" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <ShieldOff size={18} color="#fff" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Privacidad y datos</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
                        Exportá o eliminá la información de tu cuenta
                    </p>
                </div>
            </div>

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'var(--color-fg-muted)', lineHeight: 1.65 }}>
                Podés solicitar la eliminación de tus datos personales en cualquier momento y sin costo.
                Procesamos cada pedido en un plazo máximo de 30 días. Antes de continuar, revisá qué se
                elimina y qué se conserva por obligación legal en{' '}
                <a href="/data-deletion" target="_blank" rel="noopener noreferrer" style={{ color: '#7d9bd6' }}>
                    la página de Eliminación de Datos
                </a>.
            </p>

            {!abierto ? (
                <button
                    type="button"
                    onClick={() => setAbierto(true)}
                    style={{
                        background: 'transparent', border: '1px solid rgba(255,100,100,0.35)',
                        color: '#ff6b6b', padding: '0.6rem 1.1rem', borderRadius: '8px',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.85rem', fontWeight: 600
                    }}
                >
                    <Trash2 size={15} />
                    Solicitar eliminación de datos
                </button>
            ) : (
                <form onSubmit={enviar}>
                    <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.25rem' }}>
                        <legend style={{ fontSize: '0.85rem', fontWeight: 600, padding: 0, marginBottom: '0.75rem' }}>
                            ¿Qué querés eliminar?
                        </legend>

                        {OPCIONES.map((opcion) => (
                            <label
                                key={opcion.valor}
                                style={{
                                    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                                    padding: '0.85rem 1rem', marginBottom: '0.6rem',
                                    background: alcance === opcion.valor ? 'rgba(61,95,163,0.08)' : 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
                                    border: `1px solid ${alcance === opcion.valor ? 'rgba(61,95,163,0.4)' : 'color-mix(in srgb, var(--color-fg) 8%, transparent)'}`,
                                    borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                <input
                                    type="radio"
                                    name="alcance"
                                    value={opcion.valor}
                                    checked={alcance === opcion.valor}
                                    onChange={(ev) => setAlcance(ev.target.value)}
                                    style={{ marginTop: '0.2rem', accentColor: '#3d5fa3' }}
                                />
                                <span>
                                    <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600 }}>
                                        {opcion.titulo}
                                    </span>
                                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-fg-muted)', marginTop: '0.25rem', lineHeight: 1.55 }}>
                                        {opcion.descripcion}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </fieldset>

                    <div style={{ marginBottom: '1.1rem' }}>
                        <label htmlFor="motivo-eliminacion" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                            Motivo <span style={{ fontWeight: 400, color: 'var(--color-fg-muted)' }}>(opcional)</span>
                        </label>
                        <textarea
                            id="motivo-eliminacion"
                            value={motivo}
                            onChange={(ev) => setMotivo(ev.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Nos ayuda a mejorar, pero no es obligatorio."
                            style={{
                                width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.85rem',
                                background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)', color: 'var(--color-fg)',
                                border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', borderRadius: '8px',
                                fontFamily: 'inherit', resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.1rem' }}>
                        <label htmlFor="password-eliminacion" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                            Confirmá con tu contraseña <span style={{ color: '#ff6b6b' }}>*</span>
                        </label>
                        <input
                            id="password-eliminacion"
                            type="password"
                            value={password}
                            onChange={(ev) => setPassword(ev.target.value)}
                            required
                            autoComplete="current-password"
                            style={{
                                width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.85rem',
                                background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)', color: 'var(--color-fg)',
                                border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', borderRadius: '8px',
                                fontFamily: 'inherit'
                            }}
                        />
                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--color-fg-subtle)' }}>
                            Te la pedimos de nuevo para que una sesión abierta y sin atender no alcance para
                            disparar el borrado.
                        </p>
                    </div>

                    <div style={{
                        display: 'flex', gap: '0.7rem', alignItems: 'flex-start',
                        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem'
                    }}>
                        <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-fg-muted)', lineHeight: 1.6 }}>
                            La eliminación es permanente e irreversible. Exportá lo que necesites antes de
                            confirmar: una vez procesada, no podemos recuperar la información.
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.35)',
                            padding: '0.85rem 1rem', color: '#ff6b6b', borderRadius: '8px',
                            marginBottom: '1.1rem', fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                        <button
                            type="submit"
                            disabled={enviando || !password}
                            style={{
                                background: '#ef4444', border: 'none', color: '#fff',
                                padding: '0.65rem 1.2rem', borderRadius: '8px',
                                cursor: enviando || !password ? 'not-allowed' : 'pointer',
                                opacity: enviando || !password ? 0.55 : 1,
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                fontSize: '0.85rem', fontWeight: 600
                            }}
                        >
                            {enviando ? <Loader size={15} className="spin" /> : <Trash2 size={15} />}
                            {enviando ? 'Enviando…' : 'Confirmar solicitud'}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setAbierto(false); setError(null); setPassword(''); }}
                            style={{
                                background: 'transparent', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                                color: 'var(--color-fg-muted)', padding: '0.65rem 1.2rem', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default PrivacidadDatosCard;
