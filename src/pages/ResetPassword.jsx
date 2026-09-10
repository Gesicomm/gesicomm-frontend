import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { api } from '../utils/api';
import Logo from '../components/public/Logo';

const INPUT_CLASS = 'h-12 w-full rounded-lg border border-border bg-surface-2/80 px-11 pr-12 text-sm text-fg outline-none transition-all placeholder:text-fg-subtle hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70';

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

function PasswordField({ id, label, value, onChange, visible, onToggle, autoComplete }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-semibold text-fg">{label}</span>
      <span className="relative block">
        <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={INPUT_CLASS}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder="Mínimo 8 caracteres"
        />
        <PasswordToggle
          visible={visible}
          onClick={onToggle}
          label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        />
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

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const checks = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: !!confirmPassword && password === confirmPassword,
  }), [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return setError('El enlace de recuperación no es válido.');
    if (!checks.length) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (!checks.uppercase) return setError('La contraseña debe tener al menos una mayúscula.');
    if (!checks.number) return setError('La contraseña debe tener al menos un número.');
    if (!checks.match) return setError('Las contraseñas no coinciden.');

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/api/auth/reset-password', { token, password });
      setSuccess(res.message);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-canvas text-fg">
      <Link
        to="/login"
        className="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-lg border border-border bg-surface/75 px-3 py-2 text-sm font-semibold text-fg-muted backdrop-blur transition-colors hover:border-border-strong hover:text-fg"
      >
        <ArrowLeft size={18} />
        Iniciar sesión
      </Link>

      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-20">
        <section className="w-full max-w-[460px]">
          <div className="rounded-xl border border-border bg-surface/90 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur sm:p-8">
            <Link to="/" className="mb-7 flex justify-center text-fg">
              <Logo size={34} />
            </Link>

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

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/12 text-primary-text">
                  <ShieldCheck size={24} />
                </div>
                <h1 className="m-0 text-2xl font-bold">Nueva contraseña</h1>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  Elegí una contraseña segura para volver a entrar a tu panel.
                </p>
              </div>

              <PasswordField
                id="password"
                label="Contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                autoComplete="new-password"
              />

              <PasswordField
                id="confirmPassword"
                label="Repetir contraseña"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
                autoComplete="new-password"
              />

              <div className="flex flex-wrap gap-2">
                <PasswordRule ok={checks.length}>8 caracteres</PasswordRule>
                <PasswordRule ok={checks.uppercase}>1 mayúscula</PasswordRule>
                <PasswordRule ok={checks.number}>1 número</PasswordRule>
                <PasswordRule ok={checks.match}>Coinciden</PasswordRule>
              </div>

              <button
                type="submit"
                disabled={loading || !!success}
                className="mt-1 rounded-lg bg-primary py-3 text-sm font-bold text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
