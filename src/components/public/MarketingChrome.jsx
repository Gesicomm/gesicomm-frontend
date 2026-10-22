import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '@fontsource-variable/manrope';
import '../../pages/public/home/reference.css';
import '../../pages/public/home/landing.css';

const enlaces = [['Plataforma', 'solucion'], ['Soluciones', 'rutas'], ['Precios', 'precios'], ['Demo', 'solicitar-demo'], ['Proveedores', 'registro-proveedores']];
const legales = [['Política de Privacidad', '/privacy'], ['Términos y Condiciones', '/terms'], ['Política de Cookies', '/cookies'], ['Eliminación de Datos', '/data-deletion']];
const confianza = [['Seguridad de la Información', '/security'], ['Cumplimiento Legal', '/compliance'], ['Contacto', '/contact']];
const Marca = () => <img className="home-brand" src="/brand/gesicomm-horizontal-oscuro.svg" width="150" height="48" alt="Gesicom" />;

/** Páginas legales y contacto: mismo lenguaje visual que la portada de referencia. */
export default function MarketingChrome({ children }) {
  const [menu, setMenu] = useState(false);
  const { pathname, hash } = useLocation();
  useEffect(() => setMenu(false), [pathname, hash]);
  useEffect(() => {
    if (!menu) return;
    const cerrar = event => { if (event.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', cerrar);
    return () => document.removeEventListener('keydown', cerrar);
  }, [menu]);
  return <div className="gl-landing home-document">
    <a className="home-skip-link" href="#contenido">Saltar al contenido</a>
    <header className="nav"><div className="wrap nav-in">
      <Link className="logo" to="/" aria-label="Gesicom, ir al inicio"><Marca /></Link>
      <nav className="nav-links" aria-label="Principal">{enlaces.map(([label, id]) => <Link key={id} to={`/#${id}`}>{label}</Link>)}</nav>
      <div className="home-nav-actions"><Link className="home-login" to="/login">Ingresar</Link><Link className="btn primary" to="/#precios">Comenzar ↗</Link><button className="home-menu-button btn" type="button" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu} aria-controls="home-mobile-menu" onClick={() => setMenu(value => !value)}>☰</button></div>
    </div><nav id="home-mobile-menu" className="home-mobile-menu" aria-label="Navegación móvil" hidden={!menu}>{enlaces.map(([label, id]) => <Link key={id} to={`/#${id}`}>{label}</Link>)}<Link to="/login">Ingresar</Link></nav></header>
    <main id="contenido" className="sitio-publico min-w-0">{children}</main>
    <footer className="footer"><div className="wrap"><div className="foot-links"><Link className="logo" to="/" aria-label="Gesicom, ir al inicio"><Marca /></Link><Link to="/#precios">Planes</Link><Link to="/#solicitar-demo">Solicitar demo</Link><Link to="/#registro-proveedores">Proveedores</Link><Link to="/#partners">Partners</Link></div>
      <p>© {new Date().getFullYear()} Gesicom. Todos los derechos reservados.</p>
      <div className="home-footer-grid"><nav aria-label="Legal"><h3>Legal</h3>{legales.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}</nav><nav aria-label="Confianza y contacto"><h3>Confianza y contacto</h3>{confianza.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}<a href="mailto:contacto@gesicomm.com">contacto@gesicomm.com</a></nav><div><h3>Gesicom E.A.S.</h3><p>Plataforma desarrollada y operada en Paraguay.</p><p>RUC: 80178777-7</p><p>Charles de Gaulle 1176 esquina de las palmeras.</p></div></div>
    </div></footer>
  </div>;
}
