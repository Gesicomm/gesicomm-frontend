import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Lock, Truck, User } from "lucide-react";
import { courierLogin, getCourierToken } from "../../services/courierPortalApi";
import "./courier-portal.css";

export default function CourierLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getCourierToken()) navigate("/courier/pedidos", { replace: true });
  }, [navigate]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await courierLogin({ username: username.trim().toLowerCase(), password });
      navigate("/courier/pedidos", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || "No pudimos iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cp-root cp-login">
      <form className="cp-login-card" onSubmit={submit}>
        <span className="cp-login-badge"><Truck size={24} /></span>

        <div>
          <p className="cp-login-eyebrow">Portal courier</p>
          <h1 className="cp-login-title">Acceso a tus entregas</h1>
          <p className="cp-login-subtitle">Ingresá con el usuario y contraseña que te dio el comercio.</p>
        </div>

        <div className="cp-field">
          <label htmlFor="cp-username">Usuario</label>
          <div className="cp-input-wrap">
            <User size={16} />
            <input
              id="cp-username"
              className="cp-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="courier_aex_01"
              autoComplete="username"
              autoFocus
              required
            />
          </div>
        </div>

        <div className="cp-field">
          <label htmlFor="cp-password">Contraseña</label>
          <div className="cp-input-wrap">
            <Lock size={16} />
            <input
              id="cp-password"
              className="cp-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        {error && <div className="cp-login-error">{error}</div>}

        <button type="submit" className="cp-btn-submit" disabled={loading}>
          <KeyRound size={16} /> {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <p className="cp-login-foot">¿No tenés acceso? Pedíselo al comercio que te asignó las entregas.</p>
      </form>
    </main>
  );
}
