import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, BarChart3, Check, CheckCircle2,
  Eye, EyeOff, Lock, Mail, RotateCcw, ShieldCheck, ShoppingBag, Store, User
} from 'lucide-react';
import { api } from '../utils/api';
import Logo from '../components/public/Logo';
import { AvisoSesionExpirada } from '../components/EstadoSesion';
import { AVISO_SESION_EXPIRADA, tomarAvisoSesion } from '../utils/sesion';

const INPUT_CLASS = 'h-12 w-full rounded-lg border border-border bg-surface-2/80 px-11 pr-12 text-sm text-fg outline-none transition-all placeholder:text-fg-subtle hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70';
const LABEL_CLASS = 'mb-2 block text-sm font-semibold text-fg';
const LINK_CLASS = 'cursor-pointer font-semibold text-primary-text transition-colors hover:text-accent-text';

const OTP_TTL = 15 * 60; // 15 minutos en segundos

const BENEFICIOS = [
  { icono: Store, titulo: 'Crea tu tienda', detalle: 'Publicá tu catálogo, selecciona tus productos y compartí tu link en minutos.' },
  { icono: ShoppingBag, titulo: 'Pedidos en orden', detalle: 'Consultas, ventas y estados operativos centralizados en un solo panel.' },
  { icono: BarChart3, titulo: 'Métricas listas', detalle: 'Reportes para saber qué productos y campañas empujan tus ventas.' },
];

function PasswordToggle({ visible, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
      aria-label={label}
      title={label}
    >
      {visible ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );
}

function AuthField({ id, label, icon: Icon, type = 'text', rightSlot, className = '', ...props }) {
  return (
    <label htmlFor={id} className="block">
      <span className={LABEL_CLASS}>{label}</span>
      <span className="relative block">
        <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
        <input id={id} type={type} className={`${INPUT_CLASS} ${className}`} {...props} />
        {rightSlot}
      </span>
    </label>
  );
}

function PasswordRule({ ok, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
      ok
        ? 'border-success/25 bg-success/10 text-success'
        : 'border-border bg-surface-2 text-fg-muted'
    }`}>
      <Check size={12} />
      {children}
    </span>
  );
}

function SegmentOption({ active, onSelect, children }) {
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onSelect();
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`rounded-md px-3 py-2.5 text-center text-sm font-bold transition-all ${
        active
          ? 'bg-[#0d1b3d] text-white shadow-[0_8px_22px_rgba(13,27,61,0.18)]'
          : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
      }`}
    >
      {children}
    </span>
  );
}

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
  const location = useLocation();
  const navigate = useNavigate();
  const paramsIniciales = new URLSearchParams(location.search);
  const tokenSuscripcionInicial = paramsIniciales.get('token') || '';
  const esRutaRegistro = location.pathname === '/registro' || paramsIniciales.get('registro') === '1';
  const [activeForm, setActiveForm] = useState(esRutaRegistro ? 'register' : 'login');

  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', confirmPassword: '' });
  const [tokenSuscripcion, setTokenSuscripcion] = useState(tokenSuscripcionInicial);
  const [suscripcionRegistro, setSuscripcionRegistro] = useState(null);
  const [validandoSuscripcion, setValidandoSuscripcion] = useState(Boolean(tokenSuscripcionInicial));
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(OTP_TTL);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Aviso de sesión vencida: lo deja anotado el guard que expulsó al usuario
  // (ver components/EstadoSesion.jsx). Se consume una sola vez, así no vuelve
  // a aparecer si la persona recarga el login más tarde.
  const [sesionExpirada, setSesionExpirada] = useState(false);
  useEffect(() => {
    setSesionExpirada(tomarAvisoSesion() === AVISO_SESION_EXPIRADA);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token') || '';
    const debeRegistrar = location.pathname === '/registro' || params.get('registro') === '1';

    if (debeRegistrar) setActiveForm('register');
    setTokenSuscripcion(token);
    setSuscripcionRegistro(null);

    if (!token) {
      setValidandoSuscripcion(false);
      return;
    }

    let activo = true;
    setValidandoSuscripcion(true);
    setError(null);
    api.get(`/api/suscripciones/token/${token}`)
      .then((data) => {
        if (!activo) return;
        setSuscripcionRegistro(data);
        setFormData(prev => ({
          ...prev,
          nombre: prev.nombre || data.nombre || '',
          email: data.email || prev.email,
        }));
        setPendingEmail(data.email || '');
      })
      .catch((err) => {
        if (activo) setError(err.response?.data?.error || err.message || 'Ese enlace de registro no es válido.');
      })
      .finally(() => {
        if (activo) setValidandoSuscripcion(false);
      });

    return () => { activo = false; };
  }, [location.pathname, location.search]);

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

  const passwordChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    match: !!formData.confirmPassword && formData.password === formData.confirmPassword,
  };

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
    if (!passwordChecks.uppercase) return setError('La contraseña debe tener al menos una mayúscula.');
    if (!passwordChecks.number) return setError('La contraseña debe tener al menos un número.');
    if (!formData.confirmPassword) return setError('Repetí la contraseña para confirmar.');
    if (!passwordChecks.match) return setError('Las contraseñas no coinciden.');

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/api/auth/register', {
        nombre: formData.nombre.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        token_suscripcion: tokenSuscripcion || undefined,
      });
      if (res.requiere_verificacion) {
        setPendingEmail(res.email || formData.email);
        setOtpCode('');
        setOtpResendCooldown(60);
        setActiveForm('verify');
      } else {
        setSuccess(res.message);
        setTimeout(() => { setActiveForm('login'); setSuccess(null); setFormData({ ...formData, password: '', confirmPassword: '' }); }, 3000);
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
        const rutaDestino = tokenSuscripcion
          ? '/onboarding'
          : res.usuario?.rol === 'administrador'
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
    setMostrarPassword(false);
    setMostrarConfirmPassword(false);
    setFormData(prev => ({
      nombre: formName === 'register' ? prev.nombre : '',
      email: prev.email,
      password: '',
      confirmPassword: '',
    }));
  };

  return (
    <div className="min-h-screen overflow-hidden bg-canvas text-fg">
      <Link
        to="/"
        className="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-lg border border-border bg-surface/75 px-3 py-2 text-sm font-semibold text-fg-muted backdrop-blur transition-colors hover:border-border-strong hover:text-fg"
      >
        <ArrowLeft size={18} />
        Volver
      </Link>

      <main className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 px-4 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-10 lg:py-10">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-accent-text">
              <ShoppingBag size={14} />
              Ecommerce operativo
            </div>

            <h1 className="m-0 text-5xl font-bold leading-[1.02] text-fg">
              Crea tu tienda, selecciona los productos y vende.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-fg-muted">
              Gestioná tu catálogo, recibí consultas y pedidos directos, y monitoreá tus ventas sin configuraciones complejas.
            </p>

            <div className="mt-9 grid gap-4">
              {BENEFICIOS.map(({ icono: Icono, titulo, detalle }) => (
                <div key={titulo} className="flex items-start gap-4 rounded-lg border border-border bg-surface/70 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-text">
                    <Icono size={19} />
                  </span>
                  <span>
                    <strong className="block text-sm font-bold text-fg">{titulo}</strong>
                    <span className="mt-1 block text-sm leading-6 text-fg-muted">{detalle}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-border bg-surface-2/60 p-4">
              <p className="m-0 text-sm leading-6 text-fg-muted">
                El registro crea tu cuenta. La tienda, pagos, dominios, píxeles y datos avanzados se ajustan después desde el panel.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[460px]">
          <div className="rounded-xl border border-border bg-surface/90 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur sm:p-8">
            <Link to="/" className="mb-7 flex justify-center text-fg">
              <Logo size={34} />
            </Link>

            <div className="mb-7 grid grid-cols-2 rounded-lg border border-border bg-canvas p-1">
              <SegmentOption active={activeForm === 'login'} onSelect={() => switchForm('login')}>
                Ingresar
              </SegmentOption>
              <SegmentOption active={activeForm === 'register'} onSelect={() => switchForm('register')}>
                Crear cuenta
              </SegmentOption>
            </div>

            {sesionExpirada && !error && activeForm === 'login' && <AvisoSesionExpirada />}

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/10 p-3.5 text-sm leading-snug text-danger">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="font-semibold">Revisá estos datos</strong>
                  <div className="mt-0.5 text-danger/90">{error}</div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-success/20 bg-success/10 p-3.5 text-sm leading-snug text-success">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="font-semibold">Listo</strong>
                  <div className="mt-0.5 text-success/90">{success}</div>
                </div>
              </div>
            )}

            {/* ──────────── Login ──────────── */}
            {activeForm === 'login' && (
              <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
                <div>
                  <h2 className="m-0 text-2xl font-bold">Iniciar sesión</h2>
                  <p className="mt-2 text-sm leading-6 text-fg-muted">Usá tu correo o Gmail para volver a tu panel de ventas.</p>
                </div>
                <AuthField
                  id="email"
                  label="Correo electrónico"
                  icon={Mail}
                  type="email"
                  placeholder="tu@gmail.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  autoFocus
                />
                <AuthField
                  id="password"
                  label="Contraseña"
                  icon={Lock}
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="current-password"
                  rightSlot={
                    <PasswordToggle
                      visible={mostrarPassword}
                      onClick={() => setMostrarPassword(v => !v)}
                      label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    />
                  }
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-fg shadow-[0_14px_34px_rgba(61,95,163,0.28)] transition-all hover:-translate-y-0.5 hover:bg-primary-hover disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? 'Ingresando...' : 'Entrar al panel'}
                  {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                </button>
                <div className="mt-1 flex flex-col gap-2 text-center text-sm text-fg-muted">
                  <button type="button" onClick={() => switchForm('forgot')} className={`${LINK_CLASS} bg-transparent border-none`}>¿Olvidaste tu contraseña?</button>
                  <p className="m-0">¿Todavía no tenés cuenta? <button type="button" onClick={() => switchForm('register')} className={`${LINK_CLASS} bg-transparent border-none`}>Creá una gratis</button></p>
                </div>
              </form>
            )}

            {/* ──────────── Register ──────────── */}
            {activeForm === 'register' && (
              <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
                <div>
                  <h2 className="m-0 text-2xl font-bold">Crear cuenta</h2>
                  <p className="mt-2 text-sm leading-6 text-fg-muted">
                    {tokenSuscripcion
                      ? `Registrá tu cuenta para activar ${suscripcionRegistro?.plan?.nombre || 'tu plan'} y continuar al onboarding.`
                      : 'Registrate con tu correo o Gmail. Después vas a preparar tu tienda sin cargar pagos ni píxeles ahora.'}
                  </p>
                </div>
                {validandoSuscripcion && (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg-muted">
                    <RotateCcw size={14} className="animate-spin" />
                    Validando tu pago...
                  </div>
                )}
                {tokenSuscripcion && suscripcionRegistro?.documento && (
                  <div className="rounded-lg border border-success/20 bg-success/10 px-3.5 py-3 text-sm leading-6 text-success">
                    Cédula y teléfono ya cargados desde el pago. Los vamos a usar para completar el onboarding sin pedirlos dos veces.
                  </div>
                )}
                <AuthField
                  id="nombre"
                  label="Nombre completo"
                  icon={User}
                  placeholder="Tu nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  autoComplete="name"
                  autoFocus
                />
                <AuthField
                  id="email"
                  label="Correo electrónico"
                  icon={Mail}
                  type="email"
                  placeholder="tu@gmail.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  disabled={Boolean(tokenSuscripcion)}
                />
                <AuthField
                  id="password"
                  label="Contraseña"
                  icon={Lock}
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  rightSlot={
                    <PasswordToggle
                      visible={mostrarPassword}
                      onClick={() => setMostrarPassword(v => !v)}
                      label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    />
                  }
                />
                <AuthField
                  id="confirmPassword"
                  label="Repetir contraseña"
                  icon={ShieldCheck}
                  type={mostrarConfirmPassword ? 'text' : 'password'}
                  placeholder="Volvé a escribirla"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  rightSlot={
                    <PasswordToggle
                      visible={mostrarConfirmPassword}
                      onClick={() => setMostrarConfirmPassword(v => !v)}
                      label={mostrarConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                    />
                  }
                />

                <div className="flex flex-wrap gap-2">
                  <PasswordRule ok={passwordChecks.length}>8 caracteres</PasswordRule>
                  <PasswordRule ok={passwordChecks.uppercase}>1 mayúscula</PasswordRule>
                  <PasswordRule ok={passwordChecks.number}>1 número</PasswordRule>
                  <PasswordRule ok={passwordChecks.match}>Coinciden</PasswordRule>
                </div>

                <button
                  type="submit"
                  disabled={loading || validandoSuscripcion}
                  className="group mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-fg shadow-[0_14px_34px_rgba(61,95,163,0.28)] transition-all hover:-translate-y-0.5 hover:bg-primary-hover disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                  {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                </button>
                <p className="m-0 text-center text-sm text-fg-muted">¿Ya tenés cuenta? <button type="button" onClick={() => switchForm('login')} className={`${LINK_CLASS} bg-transparent border-none`}>Iniciá sesión</button></p>
              </form>
            )}

            {/* ──────────── Verify OTP ──────────── */}
            {activeForm === 'verify' && (
              <div className="flex flex-col gap-5">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/12 text-primary-text">
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="m-0 mb-1 text-2xl font-bold">Verificá tu correo</h2>
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
                    className="rounded-lg bg-primary py-3 text-sm font-bold text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Verificando...' : 'Confirmar código'}
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
                  Volver al inicio de sesión
                </button>
              </div>
            )}

            {/* ──────────── Forgot ──────────── */}
            {activeForm === 'forgot' && (
              <form onSubmit={handleForgot} noValidate className="flex flex-col gap-4">
                <div>
                  <h2 className="m-0 text-2xl font-bold">Recuperar contraseña</h2>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">Ingresá tu correo y te enviaremos las instrucciones para restablecer tu contraseña.</p>
                </div>
                <AuthField
                  id="email"
                  label="Correo electrónico"
                  icon={Mail}
                  type="email"
                  placeholder="tu@gmail.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-lg bg-primary py-3 text-sm font-bold text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Enviando...' : 'Enviar instrucciones'}
                </button>
                <p className="m-0 text-center text-sm text-fg-muted">Volver a <button type="button" onClick={() => switchForm('login')} className={`${LINK_CLASS} bg-transparent border-none`}>iniciar sesión</button></p>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
