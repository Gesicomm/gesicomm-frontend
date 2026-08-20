import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, RotateCcw, ShieldCheck } from 'lucide-react';
import { api } from '../utils/api';

const INPUT_CLASS = 'w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-primary';
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-fg-muted';
const LINK_CLASS = 'cursor-pointer font-medium text-primary hover:text-primary-hover';

const OTP_TTL = 15 * 60; // 15 minutos en segundos

// Componente de inputs de código OTP (6 celdas individuales)
function OTPInput({ value, onChange, disabled }) {
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
    if (e.key === 'ArrowLeft' && idx > 0) { inputsRef.current[idx - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && idx < 5) { inputsRef.current[idx + 1]?.focus(); return; }
  };

  const handleChange = (e, idx) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    // Permitir pegar código completo
    if (raw.length > 1) {
      const chars = raw.slice(0, 6).split('');
      const next = [...digits];
      chars.forEach((c, i) => { if (idx + i < 6) next[idx + i] = c; });
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
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputsRef.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          onFocus={e => e.target.select()}
          className="w-11 h-14 rounded-lg border border-border bg-surface-2 text-center text-xl font-bold text-fg outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          aria-label={`Dígito ${i + 1}`}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [activeForm, setActiveForm] = useState('login');

  const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(OTP_TTL);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  // Countdown del OTP
  useEffect(() => {
    if (activeForm !== 'verify') return;
    setOtpSecondsLeft(OTP_TTL);
    const interval = setInterval(() => {
      setOtpSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeForm, pendingEmail]);

  // Cooldown de reenvío (60s)
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const t = setTimeout(() => setOtpResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendCooldown]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if (error) setError(null);
  };

  const validateEmail = (email) =>
    String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Login ───────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email) return setError('El correo electrónico es requerido.');
    if (!validateEmail(formData.email)) return setError('Ingresá un correo electrónico válido.');
    if (!formData.password) return setError('La contraseña es requerida.');

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/login', {
        email: formData.email,
        password: formData.password,
      });
      const rutaDestino = res.usuario?.rol === 'administrador' 
        ? '/dashboard' 
        : res.usuario?.rol === 'solo_pedidos' 
          ? '/mis-pedidos' 
          : '/mi-catalogo';
      navigate(rutaDestino);
    } catch (err) {
      // Si el backend indica que necesita verificar el correo, llevar a la pantalla OTP
      if (err.response?.data?.requiere_verificacion) {
        setPendingEmail(err.response.data.email || formData.email);
        setOtpCode('');
        setActiveForm('verify');
        setError(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Register ─────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.nombre) return setError('El nombre completo es requerido.');
    if (formData.nombre.length < 3) return setError('El nombre debe tener al menos 3 caracteres.');
    if (!formData.email) return setError('El correo electrónico es requerido.');
    if (!validateEmail(formData.email)) return setError('Ingresá un correo electrónico válido.');
    if (!formData.password) return setError('La contraseña es requerida.');
    if (formData.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/api/auth/register', {
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
      });
      if (res.requiere_verificacion) {
        setPendingEmail(res.email || formData.email);
        setOtpCode('');
        setOtpResendCooldown(60);
        setActiveForm('verify');
      } else {
        setSuccess(res.message);
        setTimeout(() => { setActiveForm('login'); setSuccess(null); setFormData({ ...formData, password: '' }); }, 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Verify OTP ───────────────────────────────────────────────
  const handleVerify = async (e) => {
    e?.preventDefault();
    if (otpCode.length !== 6) return setError('Ingresá los 6 dígitos del código.');

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/verify-email', {
        email: pendingEmail,
        codigo: otpCode,
      });
      setSuccess(res.message);
      setTimeout(() => {
        const rutaDestino = res.usuario?.rol === 'administrador' 
          ? '/dashboard' 
          : res.usuario?.rol === 'solo_pedidos' 
            ? '/mis-pedidos' 
            : '/mi-catalogo';
        navigate(rutaDestino);
      }, 1000);
    } catch (err) {
      if (err.response?.data?.codigo_expirado) {
        setError('El código expiró. Solicitá uno nuevo con el botón de abajo.');
        setOtpSecondsLeft(0);
      } else {
        setError(err.message || 'Código incorrecto. Verificá e intentá de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit cuando se completan los 6 dígitos
  useEffect(() => {
    if (activeForm === 'verify' && otpCode.length === 6 && !loading) {
      handleVerify();
    }
  }, [otpCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Resend code ──────────────────────────────────────────────
  const handleResend = async () => {
    if (otpResendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/auth/resend-code', { email: pendingEmail });
      setOtpCode('');
      setOtpSecondsLeft(OTP_TTL);
      setOtpResendCooldown(60);
      setSuccess('Nuevo código enviado. Revisá tu bandeja de entrada.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot password ──────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();
    if (!formData.email) return setError('El correo electrónico es requerido.');
    if (!validateEmail(formData.email)) return setError('Ingresá un correo electrónico válido.');

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: formData.email });
      setSuccess(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchForm = (formName) => {
    setActiveForm(formName);
    setError(null);
    setSuccess(null);
    setFormData({ nombre: '', email: '', password: '' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12 text-fg">
      <Link
        to="/"
        className="absolute left-6 top-6 flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft size={18} />
        Volver
      </Link>

      <div className="w-full max-w-[400px] rounded-xl border border-border bg-surface p-8">
        <Link to="/" className="mb-8 block text-center text-lg font-bold tracking-tight text-fg">
          GESICOMM<span className="text-primary">.</span>
        </Link>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-danger/20 bg-danger/10 p-3.5 text-sm leading-snug text-danger">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong className="font-semibold">Error</strong>
              <div className="mt-0.5 text-danger/90">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-success/20 bg-success/10 p-3.5 text-sm leading-snug text-success">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong className="font-semibold">¡Éxito!</strong>
              <div className="mt-0.5 text-success/90">{success}</div>
            </div>
          </div>
        )}

        {/* ──────────── Login ──────────── */}
        {activeForm === 'login' && (
          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
            <h2 className="m-0 mb-1 text-xl font-semibold">Iniciar sesión</h2>
            <div>
              <label htmlFor="email" className={LABEL_CLASS}>Correo electrónico</label>
              <input type="email" id="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={handleInputChange} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="password" className={LABEL_CLASS}>Contraseña</label>
              <input type="password" id="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} className={INPUT_CLASS} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
            <div className="mt-1 flex flex-col gap-2 text-center text-sm text-fg-muted">
              <button type="button" onClick={() => switchForm('forgot')} className={`${LINK_CLASS} bg-transparent border-none`}>¿Olvidaste tu contraseña?</button>
              <p className="m-0">¿No tenés cuenta? <button type="button" onClick={() => switchForm('register')} className={`${LINK_CLASS} bg-transparent border-none`}>Registrate aquí</button></p>
            </div>
          </form>
        )}

        {/* ──────────── Register ──────────── */}
        {activeForm === 'register' && (
          <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
            <h2 className="m-0 mb-1 text-xl font-semibold">Crear cuenta</h2>
            <div>
              <label htmlFor="nombre" className={LABEL_CLASS}>Nombre completo</label>
              <input type="text" id="nombre" placeholder="Tu nombre" value={formData.nombre} onChange={handleInputChange} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="email" className={LABEL_CLASS}>Correo electrónico</label>
              <input type="email" id="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={handleInputChange} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="password" className={LABEL_CLASS}>Contraseña</label>
              <input type="password" id="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} className={INPUT_CLASS} />
              <small className="mt-1.5 block text-xs text-fg-subtle">Mínimo 8 caracteres, 1 mayúscula, 1 número.</small>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creando cuenta…' : 'Registrarse'}
            </button>
            <p className="m-0 text-center text-sm text-fg-muted">¿Ya tenés cuenta? <button type="button" onClick={() => switchForm('login')} className={`${LINK_CLASS} bg-transparent border-none`}>Iniciá sesión</button></p>
          </form>
        )}

        {/* ──────────── Verify OTP ──────────── */}
        {activeForm === 'verify' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck size={24} className="text-primary" />
              </div>
              <h2 className="m-0 mb-1 text-xl font-semibold">Verificá tu correo</h2>
              <p className="m-0 text-sm leading-relaxed text-fg-muted">
                Enviamos un código de 6 dígitos a<br />
                <strong className="text-fg">{pendingEmail}</strong>
              </p>
            </div>

            {/* Aviso spam — siempre visible antes de ingresar el código */}
            <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning/8 px-3.5 py-3 text-xs text-fg-muted leading-relaxed">
              <Mail size={14} className="mt-0.5 flex-shrink-0 text-warning" />
              <span>¿No ves el correo? <strong className="text-fg-muted">Revisá la carpeta de Spam</strong> o Correo no deseado antes de pedir uno nuevo.</span>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              <OTPInput value={otpCode} onChange={setOtpCode} disabled={loading || !!success} />

              <div className="text-center">
                {otpSecondsLeft > 0 ? (
                  <p className="text-xs text-fg-subtle">
                    El código vence en <strong className="text-fg-muted">{formatTime(otpSecondsLeft)}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-danger">El código expiró. Solicitá uno nuevo.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6 || !!success}
                className="rounded-md bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Verificando…' : 'Confirmar código'}
              </button>
            </form>

            {/* Reenviar código */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={otpResendCooldown > 0 || loading}
                className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={13} />
                {otpResendCooldown > 0
                  ? `Reenviar en ${otpResendCooldown}s`
                  : 'No me llegó el código, reenviar'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => switchForm('login')}
              className="text-center text-xs text-fg-subtle hover:text-fg-muted transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* ──────────── Forgot ──────────── */}
        {activeForm === 'forgot' && (
          <form onSubmit={handleForgot} noValidate className="flex flex-col gap-4">
            <h2 className="m-0 mb-1 text-xl font-semibold">Recuperar contraseña</h2>
            <p className="m-0 text-sm leading-relaxed text-fg-muted">Ingresá tu correo y te enviaremos las instrucciones para restablecer tu contraseña.</p>
            <div>
              <label htmlFor="email" className={LABEL_CLASS}>Correo electrónico</label>
              <input type="email" id="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={handleInputChange} className={INPUT_CLASS} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Enviando…' : 'Enviar instrucciones'}
            </button>
            <p className="m-0 text-center text-sm text-fg-muted">Volver a <button type="button" onClick={() => switchForm('login')} className={`${LINK_CLASS} bg-transparent border-none`}>iniciar sesión</button></p>
          </form>
        )}
      </div>
    </div>
  );
}
