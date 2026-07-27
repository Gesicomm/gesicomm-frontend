import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function Login() {
  const [activeForm, setActiveForm] = useState('login');
  
  // Estados para los campos de los formularios
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: ''
  });

  // Estados de interfaz
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/auth/login', {
        email: formData.email,
        password: formData.password
      });
      // Redirigir al dashboard tras un inicio de sesión exitoso
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
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
      // Volver automáticamente al form de login y limpiar el form
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

  // Función para cambiar de formulario limpiando errores
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

        {/* Alertas */}
        {error && <div className="alert-error" style={{ color: '#ff4da6', marginBottom: '1rem', background: 'rgba(255,0,128,0.1)', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}
        {success && <div className="alert-success" style={{ color: '#00ff00', marginBottom: '1rem', background: 'rgba(0,255,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>{success}</div>}

        {/* Formulario de Login */}
        {activeForm === 'login' && (
          <form id="login-form" className="auth-form active" onSubmit={handleLogin}>
            <h2 className="auth-title">Iniciar Sesión</h2>
            <div className="input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input type="email" id="email" required placeholder="correo@ejemplo.com" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input type="password" id="password" required placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
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
          <form id="register-form" className="auth-form active" onSubmit={handleRegister}>
            <h2 className="auth-title">Crear Cuenta</h2>
            <div className="input-group">
              <label htmlFor="nombre">Nombre Completo</label>
              <input type="text" id="nombre" required placeholder="Tu nombre" value={formData.nombre} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input type="email" id="email" required placeholder="correo@ejemplo.com" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input type="password" id="password" required placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
              <small style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>Mínimo 8 caracteres, 1 mayúscula, 1 número.</small>
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
          <form id="forgot-form" className="auth-form active" onSubmit={handleForgot}>
            <h2 className="auth-title">Recuperar Contraseña</h2>
            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'left' }}>Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contraseña.</p>
            <div className="input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input type="email" id="email" required placeholder="correo@ejemplo.com" value={formData.email} onChange={handleInputChange} />
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
