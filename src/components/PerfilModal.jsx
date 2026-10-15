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
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          type="text"
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

  // Cargar datos actuales cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

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
        if (data) {
          if (data.nombre) setNombre(data.nombre);
          if (data.email) setEmail(data.email);
          if (data.telefono !== undefined && data.telefono !== null) setTelefono(data.telefono);
        }
      })
      .catch(() => {});
  }, [isOpen, usuarioActual]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-text font-bold text-base">
              {nombre ? nombre.slice(0, 1).toUpperCase() : <User size={20} />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg m-0">Configuración de Perfil</h2>
              <p className="text-xs text-fg-subtle m-0">Administra tus datos personales y credenciales</p>
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
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger flex items-start gap-2">
              <span className="font-bold flex-shrink-0">Advertencia:</span>
              <span>{error}</span>
            </div>
          )}

          {mensajeExito && (
            <div className="mb-4 rounded-lg bg-success/10 border border-success/20 p-3 text-sm text-success flex items-center gap-2">
              <Check size={16} className="flex-shrink-0" />
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* PASO 1: Formulario de edición */}
          {paso === 'formulario' && (
            <form onSubmit={handleSolicitarOTP} className="flex flex-col gap-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">
                  Nombre completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-subtle pointer-events-none">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    placeholder="Ej. Juan Pérez"
                    className="w-full rounded-lg border border-border bg-canvas pl-9 pr-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Correo electrónico (Solo lectura) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                    Correo electrónico
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] text-fg-subtle">
                    <Lock size={11} /> No modificable
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-subtle pointer-events-none">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 py-2 text-sm text-fg-muted cursor-not-allowed opacity-80"
                  />
                </div>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  El correo identifica tu cuenta y tus pagos, por lo que no puede ser modificado.
                </p>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">
                  Número de teléfono / WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-subtle pointer-events-none">
                    <Phone size={16} />
                  </span>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. +595 981 123456"
                    className="w-full rounded-lg border border-border bg-canvas pl-9 pr-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  Número de contacto personal para avisos de la plataforma.
                </p>
              </div>

              {/* Sección Contraseña */}
              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setCambiarPassword(!cambiarPassword);
                    if (cambiarPassword) {
                      setPassword('');
                      setConfirmarPassword('');
                    }
                  }}
                  className="flex items-center justify-between w-full py-2 text-left bg-transparent border-none cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-primary-text" />
                    <span className="text-sm font-semibold text-fg group-hover:text-primary-text transition-colors">
                      {cambiarPassword ? 'Cancelar cambio de contraseña' : '¿Deseas cambiar tu contraseña?'}
                    </span>
                  </div>
                  {cambiarPassword ? (
                    <ChevronUp size={16} className="text-fg-subtle" />
                  ) : (
                    <ChevronDown size={16} className="text-fg-subtle" />
                  )}
                </button>

                {cambiarPassword && (
                  <div className="mt-3 flex flex-col gap-3 p-3.5 rounded-xl bg-surface-2 border border-border/60">
                    <div>
                      <label className="block text-xs font-medium text-fg-muted mb-1">
                        Nueva contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={mostrarPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
                          className="w-full rounded-lg border border-border bg-canvas px-3 py-2 pr-10 text-sm text-fg focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarPassword(!mostrarPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-fg-subtle hover:text-fg border-none bg-transparent cursor-pointer"
                        >
                          {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-fg-muted mb-1">
                        Confirmar nueva contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={mostrarConfirmarPassword ? 'text' : 'password'}
                          value={confirmarPassword}
                          onChange={(e) => setConfirmarPassword(e.target.value)}
                          placeholder="Repite la nueva contraseña"
                          className="w-full rounded-lg border border-border bg-canvas px-3 py-2 pr-10 text-sm text-fg focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-fg-subtle hover:text-fg border-none bg-transparent cursor-pointer"
                        >
                          {mostrarConfirmarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={cargando}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors border border-border bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover transition-colors border-none cursor-pointer disabled:opacity-60"
                >
                  {cargando ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Enviando código...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Guardar cambios
                    </>
                  )}
                </button>
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
