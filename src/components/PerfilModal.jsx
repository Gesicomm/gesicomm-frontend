import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  Loader,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../utils/api';
import './perfilModal.css';

/**
 * Componente de 6 celdas para el código OTP.
 */
function OTPCells({ value = '', onChange, disabled }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) {
        next[idx] = '';
      } else if (idx > 0) {
        next[idx - 1] = '';
        inputsRef.current[idx - 1]?.focus();
      }
      onChange(next.join(''));
      return;
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
      return;
    }
    if (e.key === 'ArrowRight' && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
      return;
    }
  };

  const handleChange = (e, idx) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    if (raw.length > 1) {
      const chars = raw.slice(0, 6).split('');
      const next = [...digits];
      chars.forEach((c, i) => {
        if (idx + i < 6) next[idx + i] = c;
      });
      onChange(next.join(''));
      const focusIdx = Math.min(idx + chars.length, 5);
      inputsRef.current[focusIdx]?.focus();
      return;
    }
    const next = [...digits];
    next[idx] = raw;
    onChange(next.join(''));
    if (idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    const focusIdx = Math.min(pasted.length, 5);
    inputsRef.current[focusIdx]?.focus();
  };

  return (
    <div className="profile-otp-cells flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          type="text"
          aria-label={`Dígito ${idx + 1} del código`}
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={digit}
          disabled={disabled}
          autoFocus={idx === 0}
          onKeyDown={(e) => handleKey(e, idx)}
          onChange={(e) => handleChange(e, idx)}
          className={`h-12 w-11 rounded-lg border text-center text-xl font-bold transition-all focus:outline-none ${
            digit
              ? 'border-primary bg-primary/10 text-primary-text'
              : 'border-border bg-surface-2 text-fg focus:border-primary'
          } disabled:opacity-50`}
        />
      ))}
    </div>
  );
}

function formatearSegundos(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function PerfilModal({ isOpen, onClose, usuarioActual, onUsuarioActualizado }) {
  const dialogRef = useRef(null);
  const accionesRef = useRef(null);
  accionesRef.current = { onClose, cargando: false };
  const [paso, setPaso] = useState('formulario'); // 'formulario' | 'otp' | 'exito'
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  // Contraseña
  const [cambiarPassword, setCambiarPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);

  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);

  // Estados de carga y error
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  accionesRef.current.cargando = cargando;
  useEffect(() => {
    if (!isOpen) return;
    const anterior = document.activeElement;
    const dialogo = dialogRef.current;
    dialogo?.focus();
    const teclado = event => {
      if (event.key === 'Escape' && !accionesRef.current.cargando) {
        event.preventDefault();
        accionesRef.current.onClose();
      }
      if (event.key !== 'Tab') return;
      const controles = [...dialogo.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], select, textarea')].filter(el => el.getClientRects().length);
      const primero = controles[0], ultimo = controles.at(-1);
      if (!primero) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === primero || document.activeElement === dialogo)) {
        event.preventDefault(); ultimo.focus();
      } else if (!event.shiftKey && (document.activeElement === ultimo || document.activeElement === dialogo)) {
        event.preventDefault(); primero.focus();
      }
    };
    dialogo?.addEventListener('keydown', teclado);
    return () => { dialogo?.removeEventListener('keydown', teclado); anterior?.focus?.(); };
  }, [isOpen]);

  // Cargar datos actuales cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    let vigente = true;
    setError(null);
    setPaso('formulario');
    setOtpCode('');
    setPassword('');
    setConfirmarPassword('');
    setCambiarPassword(false);

    if (usuarioActual) {
      setNombre(usuarioActual.nombre || '');
      setEmail(usuarioActual.email || usuarioActual.correo_electronico || '');
      setTelefono(usuarioActual.telefono || '');
    }

    // Traer datos frescos del perfil (incluyendo teléfono de la BD)
    api.get('/api/auth/perfil')
      .then((data) => {
        if (vigente && data) {
          if (data.nombre) setNombre(data.nombre);
          if (data.email) setEmail(data.email);
          if (data.telefono !== undefined && data.telefono !== null) setTelefono(data.telefono);
        }
      })
      .catch(() => {});
    return () => { vigente = false; };
    // Inicializar al abrir: actualizar el usuario al guardar no debe reiniciar el paso de éxito.
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Temporizadores para OTP
  useEffect(() => {
    if (paso !== 'otp') return;

    const timer = setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setOtpResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [paso]);

  // Auto-submit cuando se completan los 6 dígitos del OTP
  useEffect(() => {
    if (paso === 'otp' && otpCode.length === 6 && !cargando) {
      handleConfirmarOTP();
    }
  }, [otpCode, paso]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  // Paso 1: Validar formulario y solicitar código OTP
  const handleSolicitarOTP = async (e) => {
    e?.preventDefault();
    setError(null);

    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    const telLimpio = telefono.trim();
    if (telLimpio.length > 0 && telLimpio.replace(/\D/g, '').length < 6) {
      setError('El teléfono debe tener al menos 6 dígitos numéricos.');
      return;
    }

    if (cambiarPassword || password.trim().length > 0) {
      const pass = password.trim();
      if (pass.length < 8) {
        setError('La nueva contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (!/[A-Z]/.test(pass)) {
        setError('La contraseña debe contener al menos una letra mayúscula.');
        return;
      }
      if (!/[0-9]/.test(pass)) {
        setError('La contraseña debe contener al menos un número.');
        return;
      }
      if (pass !== confirmarPassword.trim()) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setCargando(true);
    try {
      await api.post('/api/auth/perfil/solicitar-otp');
      setPaso('otp');
      setOtpCode('');
      setOtpSecondsLeft(15 * 60); // 15 minutos
      setOtpResendCooldown(60);   // 60 segundos para reenviar
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código de verificación.');
    } finally {
      setCargando(false);
    }
  };

  // Reenviar código OTP
  const handleReenviarOTP = async () => {
    if (otpResendCooldown > 0 || cargando) return;
    setCargando(true);
    setError(null);
    try {
      await api.post('/api/auth/perfil/solicitar-otp');
      setOtpCode('');
      setOtpSecondsLeft(15 * 60);
      setOtpResendCooldown(60);
      setMensajeExito('Se envió un nuevo código a tu correo.');
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      setError(err.message || 'No se pudo reenviar el código.');
    } finally {
      setCargando(false);
    }
  };

  // Paso 2: Confirmar código OTP y aplicar cambios
  const handleConfirmarOTP = async (e) => {
    e?.preventDefault();
    if (otpCode.length !== 6) {
      setError('Ingresá los 6 dígitos del código.');
      return;
    }

    setCargando(true);
    setError(null);
    try {
      const payload = {
        codigo_otp: otpCode,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      };
      if (cambiarPassword && password.trim().length > 0) {
        payload.password = password.trim();
      }

      const res = await api.post('/api/auth/perfil', payload);

      setPaso('exito');
      const usuarioActualizado = res.usuario || {
        ...usuarioActual,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      };

      if (onUsuarioActualizado) {
        onUsuarioActualizado(usuarioActualizado);
      }

      // Notificar a toda la aplicación
      window.dispatchEvent(new CustomEvent('usuario-actualizado', { detail: usuarioActualizado }));

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      if (err.response?.data?.codigo_expirado) {
        setError('El código expiró. Solicitá uno nuevo con el botón de abajo.');
        setOtpSecondsLeft(0);
      } else {
        setError(err.message || 'Código incorrecto. Revisá el correo e intentá de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="profile-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        aria-describedby="profile-description"
        tabIndex={-1}
        className="profile-dialog rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Encabezado */}
        <div className="profile-header">
          <div className="profile-header-main">
            <div className="profile-avatar">
              {nombre ? nombre.slice(0, 1).toUpperCase() : <User size={20} />}
            </div>
            <div>
              <h2 id="profile-title" className="text-base font-semibold text-fg m-0">Configuración de Perfil</h2>
              <p id="profile-description">Tu información personal y la seguridad de tu cuenta, en un solo lugar.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="profile-body overflow-y-auto flex-1">
          {error && (
            <div role="alert" className="mb-4 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger flex items-start gap-2">
              <span className="font-bold flex-shrink-0">Advertencia:</span>
              <span>{error}</span>
            </div>
          )}

          {mensajeExito && (
            <div role="status" className="mb-4 rounded-lg bg-success/10 border border-success/20 p-3 text-sm text-success flex items-center gap-2">
              <Check size={16} className="flex-shrink-0" />
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* PASO 1: Formulario de edición */}
          {paso === 'formulario' && (
            <form onSubmit={handleSolicitarOTP} className="profile-form">
              <section className="profile-section" aria-labelledby="profile-personal-title">
                <div className="profile-section-heading"><span className="profile-section-icon"><User size={20} /></span><div><h3 id="profile-personal-title">Datos personales</h3><p>Así te identificamos y nos ponemos en contacto con vos.</p></div></div>
                <div className="profile-personal-grid">
                  <div className="profile-field">
                    <label htmlFor="profile-name">Nombre completo</label>
                    <div className="profile-input"><User size={18} /><input id="profile-name" type="text" autoComplete="name" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej. Juan Pérez" disabled={cargando} /></div>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profile-phone">Número de teléfono / WhatsApp</label>
                    <div className="profile-input"><Phone size={18} /><input id="profile-phone" type="tel" autoComplete="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej. +595 981 123456" disabled={cargando} aria-describedby="profile-phone-help" /></div>
                    <p className="profile-help" id="profile-phone-help">Tu contacto personal para avisos de la plataforma.</p>
                  </div>
                </div>
                <div className="profile-email-card profile-field">
                  <div className="profile-label-row"><label htmlFor="profile-email">Correo electrónico</label><span className="profile-readonly"><Lock size={13} /> No modificable</span></div>
                  <div className="profile-input"><Mail size={18} /><input id="profile-email" type="email" value={email} readOnly disabled aria-describedby="profile-email-help" /></div>
                  <p className="profile-help" id="profile-email-help">Este correo identifica tu cuenta y tus pagos, por eso no se puede modificar.</p>
                </div>
              </section>
              <section className="profile-section profile-security" aria-labelledby="profile-security-title">
                <div className="profile-section-heading"><span className="profile-section-icon"><ShieldCheck size={20} /></span><div><h3 id="profile-security-title">Seguridad de tu cuenta</h3><p>Actualizá tu contraseña cuando lo necesites.</p></div></div>
                <button type="button" className="profile-security-toggle" aria-expanded={cambiarPassword} aria-controls="profile-password-fields" disabled={cargando} onClick={() => {
                  setCambiarPassword(!cambiarPassword);
                  if (cambiarPassword) { setPassword(''); setConfirmarPassword(''); }
                }}>
                  <span><KeyRound size={19} />{cambiarPassword ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}</span>
                  {cambiarPassword ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {cambiarPassword && <div id="profile-password-fields" className="profile-password-fields">
                  <div className="profile-field"><label htmlFor="profile-password">Nueva contraseña</label>
                    <div className="profile-input"><input id="profile-password" type={mostrarPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} aria-describedby="profile-password-help" disabled={cargando} />
                      <button type="button" aria-label={mostrarPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'} onClick={() => setMostrarPassword(!mostrarPassword)}>{mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div><p id="profile-password-help" className="profile-help">Usá al menos 8 caracteres, una mayúscula y un número.</p>
                  </div>
                  <div className="profile-field"><label htmlFor="profile-password-confirm">Confirmar nueva contraseña</label>
                    <div className="profile-input"><input id="profile-password-confirm" type={mostrarConfirmarPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmarPassword} onChange={e => setConfirmarPassword(e.target.value)} disabled={cargando} />
                      <button type="button" aria-label={mostrarConfirmarPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'} onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)}>{mostrarConfirmarPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                </div>}
              </section>
              <div className="profile-verification-note"><ShieldCheck size={19} /><p>Para guardar, te enviaremos un código de verificación a tu correo.</p></div>
              <div className="profile-actions">
                <button type="button" className="profile-cancel" onClick={onClose} disabled={cargando}>Cancelar</button>
                <button type="submit" className="profile-save" disabled={cargando}>{cargando ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />}{cargando ? 'Enviando código...' : 'Guardar cambios'}</button>
              </div>
            </form>
          )}

          {/* PASO 2: Confirmación con código OTP */}
          {paso === 'otp' && (
            <div className="flex flex-col gap-5 py-2">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary-text">
                  <ShieldCheck size={26} />
                </div>
                <h3 className="text-base font-bold text-fg m-0">Confirmación de Seguridad</h3>
                <p className="mt-1.5 text-xs text-fg-muted max-w-sm mx-auto">
                  Por seguridad, te enviamos un código de 6 dígitos a{' '}
                  <strong className="text-fg font-semibold">{email}</strong>. Ingrésalo para aplicar los cambios en tu cuenta.
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1 text-[11px] text-fg-subtle border border-border">
                  <Mail size={12} className="text-primary-text" />
                  <span>¿No lo ves? Revisá Spam o Correo no deseado.</span>
                </div>
              </div>

              <form onSubmit={handleConfirmarOTP} className="flex flex-col gap-4">
                <OTPCells value={otpCode} onChange={setOtpCode} disabled={cargando} />

                <div className="text-center">
                  {otpSecondsLeft > 0 ? (
                    <p className="text-xs text-fg-subtle m-0">
                      El código vence en <strong className="text-fg-muted">{formatearSegundos(otpSecondsLeft)}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-danger m-0">
                      El código expiró. Solicitá uno nuevo abajo.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={cargando || otpCode.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-fg hover:bg-primary-hover transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cargando ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Verificando y guardando...
                      </>
                    ) : (
                      'Confirmar y guardar cambios'
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaso('formulario');
                        setError(null);
                      }}
                      disabled={cargando}
                      className="text-fg-subtle hover:text-fg transition-colors bg-transparent border-none cursor-pointer"
                    >
                      Volver a editar datos
                    </button>

                    <button
                      type="button"
                      onClick={handleReenviarOTP}
                      disabled={otpResendCooldown > 0 || cargando}
                      className="inline-flex items-center gap-1 text-primary-text hover:underline transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                    >
                      <RotateCcw size={12} />
                      {otpResendCooldown > 0
                        ? `Reenviar en ${otpResendCooldown}s`
                        : 'Reenviar código'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* PASO 3: Éxito */}
          {paso === 'exito' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success mb-3">
                <Check size={28} />
              </div>
              <h3 className="text-lg font-bold text-fg m-0">¡Perfil actualizado!</h3>
              <p className="text-xs text-fg-muted mt-1">
                Tus datos y credenciales se guardaron exitosamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
