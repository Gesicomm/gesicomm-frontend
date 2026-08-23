import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { Container } from './Section';

const ENLACES = [
  { etiqueta: 'Producto', href: '/#producto' },
  { etiqueta: 'Integraciones', href: '/#integraciones' },
  { etiqueta: 'Seguridad', href: '/security' },
  { etiqueta: 'Cumplimiento', href: '/compliance' },
  { etiqueta: 'Contacto', href: '/contact' },
];

export default function PublicNavbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [conFondo, setConFondo] = useState(false);
  const { pathname, hash } = useLocation();

  // El borde inferior y el fondo difuminado aparecen recién al hacer
  // scroll: arriba de todo la navbar se funde con el hero.
  useEffect(() => {
    const alScrollear = () => setConFondo(window.scrollY > 8);
    alScrollear();
    window.addEventListener('scroll', alScrollear, { passive: true });
    return () => window.removeEventListener('scroll', alScrollear);
  }, []);

  // Cerrar el menú móvil al navegar, si no queda abierto tapando la página
  // nueva.
  useEffect(() => setMenuAbierto(false), [pathname, hash]);

  // Con el menú desplegado se bloquea el scroll del fondo y se habilita
  // Escape para cerrarlo.
  useEffect(() => {
    if (!menuAbierto) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const alPresionar = (evento) => {
      if (evento.key === 'Escape') setMenuAbierto(false);
    };
    document.addEventListener('keydown', alPresionar);

    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener('keydown', alPresionar);
    };
  }, [menuAbierto]);

  return (
    <header
      className={`no-imprimir sticky top-0 z-50 transition-colors duration-200 ${
        conFondo
          ? 'border-b border-border bg-canvas/85 backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <Container>
        <nav className="flex h-16 items-center justify-between gap-6" aria-label="Principal">
          <Link to="/" className="flex-shrink-0" aria-label="Gesicom, ir al inicio">
            <Logo size={30} />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {ENLACES.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  to={enlace.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link
              to="/login"
              className="hidden h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:inline-flex"
            >
              Entrar
              <ArrowRight size={15} aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={() => setMenuAbierto((valor) => !valor)}
              aria-expanded={menuAbierto}
              aria-controls="menu-movil"
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-fg lg:hidden"
            >
              {menuAbierto ? <X size={17} aria-hidden="true" /> : <Menu size={17} aria-hidden="true" />}
            </button>
          </div>
        </nav>
      </Container>

      {menuAbierto && (
        <div
          id="menu-movil"
          className="fixed inset-0 top-16 z-40 overflow-y-auto border-t border-border bg-canvas lg:hidden"
        >
          <Container className="py-6">
            <ul className="flex flex-col gap-1">
              {ENLACES.map((enlace) => (
                <li key={enlace.href}>
                  <Link
                    to={enlace.href}
                    className="block rounded-md px-3 py-3 text-base font-medium text-fg transition-colors hover:bg-surface-2"
                  >
                    {enlace.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              to="/login"
              className="mt-5 flex h-11 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Entrar al panel
              <ArrowRight size={16} aria-hidden="true" />
            </Link>

            <div className="mt-8 border-t border-border pt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Legal
              </p>
              <ul className="flex flex-col gap-1">
                {[
                  { etiqueta: 'Política de Privacidad', href: '/privacy' },
                  { etiqueta: 'Términos y Condiciones', href: '/terms' },
                  { etiqueta: 'Política de Cookies', href: '/cookies' },
                  { etiqueta: 'Eliminación de Datos', href: '/data-deletion' },
                ].map((enlace) => (
                  <li key={enlace.href}>
                    <Link
                      to={enlace.href}
                      className="block rounded-md px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                      {enlace.etiqueta}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
