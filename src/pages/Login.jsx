import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../utils/api';

const INPUT_CLASS = 'w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-primary';
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-fg-muted';
const LINK_CLASS = 'cursor-pointer font-medium text-primary hover:text-primary-hover';

export default function Login() {
  const [activeForm, setActiveForm] = useState('login');

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
    // Limpiamos el error en cuanto el usuario empiece a escribir
    if (error) setError(null);
  };

  // Función interna para validación JS
  const validateEmail = (email) => {
    return String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validación JS antes de llamar a la API
    if (!formData.email) return setError("El correo electrónico es requerido.");
    if (!validateEmail(formData.email)) return setError("Ingresa un correo electrónico válido.");
    if (!formData.password) return setError("La contraseña es requerida.");

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/login', {
        email: formData.email,
        password: formData.password
      });
      navigate(res.usuario?.rol === 'administrador' ? '/dashboard' : '/mi-catalogo');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validación JS
    if (!formData.nombre) return setError("El nombre completo es requerido.");
    if (formData.nombre.length < 3) return setError("El nombre debe tener al menos 3 caracteres.");
    if (!formData.email) return setError("El correo electrónico es requerido.");
    if (!validateEmail(formData.email)) return setError("Ingresa un correo electrónico válido.");
    if (!formData.password) return setError("La contraseña es requerida.");
    if (formData.password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/api/auth/register', {
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password
      });
      setSuccess(res.message);
      setTimeout(() => {
        setActiveForm('login');
        setSuccess(null);
        setFormData({ ...formData, password: '' });
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();

    if (!formData.email) return setError("El correo electrónico es requerido.");
    if (!validateEmail(formData.email)) return setError("Ingresa un correo electrónico válido.");

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/api/auth/forgot-password', {
        email: formData.email
      });
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
              <strong className="font-semibold">Error de validación</strong>
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
