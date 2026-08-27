import { Link } from 'react-router-dom';
import Seo from '../../components/public/Seo';
import Button from '../../components/public/Button';
import { Container } from '../../components/public/Section';

const ENLACES = [
  { etiqueta: 'Inicio', href: '/' },
  { etiqueta: 'Política de Privacidad', href: '/privacy' },
  { etiqueta: 'Términos y Condiciones', href: '/terms' },
  { etiqueta: 'Eliminación de Datos', href: '/data-deletion' },
  { etiqueta: 'Seguridad', href: '/security' },
  { etiqueta: 'Contacto', href: '/contact' },
];

/**
 * 404 del sitio público.
 *
 * Existe sobre todo para que una URL mal tipeada no deje una pantalla en
 * blanco: sin ruta comodín, React Router no renderiza nada y la página queda
 * vacía, que es exactamente la impresión que no querés dar cuando alguien
 * está revisando tu aplicación.
 */
export default function NotFound() {
  return (
    <>
      <Seo
        titulo="Página no encontrada"
        descripcion="La página que buscás no existe o cambió de dirección."
        ruta="/404"
        noIndex
      />

      <Container ancho="estrecho" className="py-24 text-center sm:py-32">
        <p
          className="text-sm font-semibold uppercase text-primary-text"
          style={{ letterSpacing: '0.08em' }}
        >
          Error 404
        </p>
        <h1
          className="mt-4 text-3xl font-bold text-fg sm:text-5xl"
          style={{ letterSpacing: '-0.035em' }}
        >
          Esta página no existe
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-fg-muted">
          Puede que el enlace esté mal escrito o que la página haya cambiado de dirección.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button to="/" tamano="lg" className="w-full sm:w-auto">
            Volver al inicio
          </Button>
          <Button to="/contact" variante="secundario" tamano="lg" className="w-full sm:w-auto">
            Contactarnos
          </Button>
        </div>

        <nav aria-label="Páginas principales" className="mt-16 border-t border-border pt-9">
          <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            Quizás buscabas
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {ENLACES.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  to={enlace.href}
                  className="inline-flex rounded-md border border-border bg-surface px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </>
  );
}
