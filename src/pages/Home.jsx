import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="splash-page">
      <header className="top-navbar">
        <div className="nav-brand"></div>
        <Link to="/login" className="login-btn" title="Iniciar Sesión">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Entrar</span>
        </Link>
      </header>

      <div className="container">
        <h1 className="glitch" data-text="GESICOMM">GESICOMM</h1>
        <div className="message">
          <p>Estamos desarrollando el gestor definitivo para tu e-commerce.</p>
          <p className="highlight">Prepárate para algo extraordinario.</p>
        </div>
        <div className="loader"></div>
      </div>
    </div>
  );
}
