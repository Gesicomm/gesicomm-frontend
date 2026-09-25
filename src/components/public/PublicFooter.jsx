import { Link } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import { Container } from './Section';

const COLUMNAS = [
  {
    titulo: 'Producto',
    enlaces: [
      { etiqueta: 'Cómo funciona', href: '/#como-funciona' },
      { etiqueta: 'Características', href: '/#producto' },
      { etiqueta: 'Integraciones', href: '/#integraciones' },
      { etiqueta: 'Planes', href: '/planes' },
      { etiqueta: 'Preguntas frecuentes', href: '/#faq' },
    ],
  },
  {
    titulo: 'Legal',
    enlaces: [
      { etiqueta: 'Política de Privacidad', href: '/privacy' },
      { etiqueta: 'Términos y Condiciones', href: '/terms' },
      { etiqueta: 'Política de Cookies', href: '/cookies' },
      { etiqueta: 'Eliminación de Datos', href: '/data-deletion' },
    ],
  },
  {
    titulo: 'Gesicom',
    enlaces: [
      { etiqueta: 'Seguridad', href: '/security' },
      { etiqueta: 'Cumplimiento Legal', href: '/compliance' },
      { etiqueta: 'Contacto', href: '/contact' },
    ],
  },
];

// Una sola casilla para todo: soporte, privacidad y legal. Publicar
// direcciones separadas que en realidad llegan al mismo lugar solo genera
// expectativas de equipos distintos que no existen.
const CORREO_CONTACTO = 'contacto@gesicomm.com';

export default function PublicFooter() {
  const anio = new Date().getFullYear();

  return (
    <footer className="no-imprimir border-t border-border bg-surface">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-8">
          <div className="max-w-sm">
            <Logo size={30} />
            <p className="mt-4 text-sm leading-relaxed text-fg-muted">
              Gestioná tus productos, pedidos y ventas desde un solo lugar.
            </p>

            <p className="mt-6 flex items-center gap-2 text-sm">
              <Mail size={14} className="flex-shrink-0 text-fg-subtle" aria-hidden="true" />
              <a
                href={`mailto:${CORREO_CONTACTO}`}
                className="text-fg-muted transition-colors hover:text-primary-text"
              >
                {CORREO_CONTACTO}
              </a>
            </p>
            <p className="mt-1.5 text-xs text-fg-subtle">
              Soporte, privacidad y consultas legales.
            </p>

            <div className="mt-6 border-t border-border pt-4 text-xs text-fg-muted">
              <p>Gesicom es una plataforma desarrollada y operada por <strong>GESICOM E.A.S.</strong>, Paraguay.</p>
              <p className="mt-1">RUC: 80178777-7 · Charles de Gaulle 1176 esquina de las palmeras</p>
            </div>
          </div>

          {COLUMNAS.map((columna) => (
            <nav key={columna.titulo} aria-label={columna.titulo}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">
                {columna.titulo}
              </h2>
              <ul className="mt-4 space-y-3">
                {columna.enlaces.map((enlace) => (
                  <li key={enlace.href + enlace.etiqueta}>
                    <Link
                      to={enlace.href}
                      className="text-sm text-fg-muted transition-colors hover:text-fg"
                    >
                      {enlace.etiqueta}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fg-subtle">
            © {anio} Gesicom. Todos los derechos reservados.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-success" aria-hidden="true" />
              Cifrado en tránsito y en reposo
            </span>
            <span>GDPR</span>
            <span>CCPA / CPRA</span>
            <span>Meta Platform Terms</span>
          </div>
        </div>

        <p className="mt-6 max-w-4xl text-xs leading-relaxed text-fg-subtle">
          Gesicom no está afiliada, patrocinada ni respaldada por Meta Platforms, Inc. ni por
          ninguna de sus filiales. Facebook y WhatsApp son marcas registradas de Meta Platforms,
          Inc. Los nombres se usan únicamente para describir la integración disponible.
        </p>
      </Container>
    </footer>
  );
}
