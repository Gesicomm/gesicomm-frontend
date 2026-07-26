import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [activeForm, setActiveForm] = useState('login');

  const handleSubmit = (e) => {
    e.preventDefault();
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

        {/* Formulario de Login */}
        {activeForm === 'login' && (
          <form id="login-form" className="auth-form active" onSubmit={handleSubmit}>
            <h2 className="auth-title">Iniciar Sesión</h2>
            <div className="input-group">
              <label htmlFor="login-email">Correo Electrónico</label>
              <input type="email" id="login-email" required placeholder="correo@ejemplo.com" />
            </div>
            <div className="input-group">
              <label htmlFor="login-password">Contraseña</label>
              <input type="password" id="login-password" required placeholder="••••••••" />
            </div>
            <button type="submit" className="auth-btn">Ingresar</button>
            <div className="auth-links">
              <p><a onClick={() => setActiveForm('forgot')}>¿Olvidaste tu contraseña?</a></p>
              <p>¿No tienes cuenta? <a onClick={() => setActiveForm('register')}>Regístrate aquí</a></p>
            </div>
          </form>
        )}

        {/* Formulario de Registro */}
        {activeForm === 'register' && (
          <form id="register-form" className="auth-form active" onSubmit={handleSubmit}>
            <h2 className="auth-title">Crear Cuenta</h2>
            <div className="input-group">
              <label htmlFor="reg-name">Nombre Completo</label>
              <input type="text" id="reg-name" required placeholder="Tu nombre" />
            </div>
            <div className="input-group">
              <label htmlFor="reg-email">Correo Electrónico</label>
              <input type="email" id="reg-email" required placeholder="correo@ejemplo.com" />
            </div>
            <div className="input-group">
              <label htmlFor="reg-password">Contraseña</label>
              <input type="password" id="reg-password" required placeholder="••••••••" />
            </div>
            <button type="submit" className="auth-btn">Registrarse</button>
            <div className="auth-links">
              <p>¿Ya tienes cuenta? <a onClick={() => setActiveForm('login')}>Inicia sesión</a></p>
            </div>
          </form>
        )}

        {/* Formulario de Recuperación */}
        {activeForm === 'forgot' && (
          <form id="forgot-form" className="auth-form active" onSubmit={handleSubmit}>
            <h2 className="auth-title">Recuperar Contraseña</h2>
            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'left' }}>Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contraseña.</p>
            <div className="input-group">
              <label htmlFor="forgot-email">Correo Electrónico</label>
              <input type="email" id="forgot-email" required placeholder="correo@ejemplo.com" />
            </div>
            <button type="submit" className="auth-btn">Enviar Instrucciones</button>
            <div className="auth-links">
              <p>Volver a <a onClick={() => setActiveForm('login')}>Iniciar Sesión</a></p>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
