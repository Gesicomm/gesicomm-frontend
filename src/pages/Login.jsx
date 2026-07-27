import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

// Ícono estético de alerta
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

// Ícono estético de éxito
const SuccessIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

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
      await api.post('/api/auth/login', {
        email: formData.email,
        password: formData.password
      });
      navigate('/dashboard');
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
    <>
      <Link to="/" className="back-home">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Volver
      </Link>

      <div className="auth-container">
        <Link to="/" className="auth-logo glitch" data-text="GESICOMM" style={{ fontSize: '2rem', textShadow: '0.025em 0 0 rgba(255,0,0,0.75), -0.0125em -0.025em 0 rgba(0,255,0,0.75), 0.0125em 0.025em 0 rgba(0,0,255,0.75)' }}>
          GESICOMM
        </Link>

        {/* Alertas Estéticas */}
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#ff4da6', marginBottom: '1.5rem', background: 'rgba(255,0,128,0.08)', border: '1px solid rgba(255,0,128,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem', lineHeight: '1.4' }}>
            <AlertIcon />
            <div>
              <strong>Error de Validación</strong>
              <div style={{ opacity: 0.9, marginTop: '0.25rem' }}>{error}</div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#00ff88', marginBottom: '1.5rem', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem', lineHeight: '1.4' }}>
            <SuccessIcon />
            <div>
              <strong>¡Éxito!</strong>
              <div style={{ opacity: 0.9, marginTop: '0.25rem' }}>{success}</div>
            </div>
          </div>
        )}

        {/* Formulario de Login (con noValidate para evitar globos HTML nativos) */}
        {activeForm === 'login' && (
          <form id="login-form" className="auth-form active" onSubmit={handleLogin} noValidate>
            <h2 className="auth-title">Iniciar Sesión</h2>
            <div className="input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input type="email" id="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input type="password" id="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <div className="auth-links">
              <p><a onClick={() => switchForm('forgot')}>¿Olvidaste tu contraseña?</a></p>
              <p>¿No tienes cuenta? <a onClick={() => switchForm('register')}>Regístrate aquí</a></p>
            </div>
          </form>
        )}

        {/* Formulario de Registro */}
        {activeForm === 'register' && (
          <form id="register-form" className="auth-form active" onSubmit={handleRegister} noValidate>
            <h2 className="auth-title">Crear Cuenta</h2>
            <div className="input-group">
              <label htmlFor="nombre">Nombre Completo</label>
              <input type="text" id="nombre" placeholder="Tu nombre" value={formData.nombre} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input type="email" id="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input type="password" id="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
              <small style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.4rem', display: 'block' }}>Mínimo 8 caracteres, 1 mayúscula, 1 número.</small>
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
            <div className="auth-links">
              <p>¿Ya tienes cuenta? <a onClick={() => switchForm('login')}>Inicia sesión</a></p>
            </div>
          </form>
        )}

        {/* Formulario de Recuperación */}
        {activeForm === 'forgot' && (
          <form id="forgot-form" className="auth-form active" onSubmit={handleForgot} noValidate>
            <h2 className="auth-title">Recuperar Contraseña</h2>
            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'left', lineHeight: '1.5' }}>Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contraseña.</p>
            <div className="input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input type="email" id="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={handleInputChange} />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Instrucciones'}
            </button>
            <div className="auth-links">
              <p>Volver a <a onClick={() => switchForm('login')}>Iniciar Sesión</a></p>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
