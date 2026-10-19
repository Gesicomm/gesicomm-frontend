import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader, Lock, Mail, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useTema } from '../../components/public/ThemeProvider';
import { getRahaPortalToken, rahaPortalApi } from '../../services/rahaPortalApi';
import './raha-portal.css';

export default function RahaLogin() {
  const navigate = useNavigate();
  const { tema, alternarTema } = useTema();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getRahaPortalToken()) {
      navigate('/raha/solicitudes', { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await rahaPortalApi.login({ email, password });
      navigate('/raha/solicitudes', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Credenciales inválidas o cuenta inactiva.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="rp-root rp-login-wrap">
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', zIndex: 10 }}>
        <button
          type="button"
          className="rp-btn-theme"
          onClick={alternarTema}
          title={tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          aria-label={tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
        >
          {tema === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      <form className="rp-login-card" onSubmit={handleSubmit}>
        <div className="rp-badge-brand">
          <ShieldCheck size={28} />
        </div>

        <div>
          <h1 className="rp-login-title">Portal RAHA</h1>
          <p className="rp-login-subtitle">
            Acceso exclusivo para el equipo de RAHA: documentación de comercios, abastecimientos y solicitudes de envío de mercadería.
          </p>
        </div>

        {error && (
          <div className="rp-alert rp-alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="rp-field">
          <label htmlFor="rp-email">Email institucional</label>
          <div className="rp-input-wrap">
            <Mail size={16} />
            <input
              id="rp-email"
              type="email"
              className="rp-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operaciones@raha.com.py"
              autoComplete="email"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="rp-field">
          <label htmlFor="rp-password">Contraseña</label>
          <div className="rp-input-wrap">
            <Lock size={16} />
            <input
              id="rp-password"
              type="password"
              className="rp-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button type="submit" className="rp-btn-submit" disabled={loading}>
          {loading ? (
            <>
              <Loader size={16} className="raha-spin" /> Ingresando…
            </>
          ) : (
            <>
              <KeyRound size={16} /> Iniciar sesión
            </>
          )}
        </button>

        <p style={{ margin: 0, fontSize: '0.75rem', color: "var(--color-fg-muted)", textAlign: 'center' }}>
          ¿Necesitás una cuenta o restablecer contraseña? Contactá al administrador de Gesicomm.
        </p>
      </form>
    </main>
  );
}
