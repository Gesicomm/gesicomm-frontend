import { Link } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import { Container } from './Section';

const COLUMNAS = [
  {
    titulo: 'Producto',
    enlaces: [
      { etiqueta: 'Características', href: '/#producto' },
      { etiqueta: 'Integraciones', href: '/#integraciones' },
      { etiqueta: 'Seguridad', href: '/security' },
      { etiqueta: 'Preguntas frecuentes', href: '/#faq' },
      { etiqueta: 'Entrar al panel', href: '/login' },
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
    titulo: 'Confianza',
    enlaces: [
      { etiqueta: 'Seguridad de la Información', href: '/security' },
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
              Plataforma de gestión de eCommerce. Productos, pedidos, inventario, clientes,
              logística y campañas en un solo panel.
            </p>

            <p className="mt-6 flex items-center gap-2 text-sm">
              <Mail size={14} className="flex-shrink-0 text-fg-subtle" aria-hidden="true" />
              <a
                href={`mailto:${CORREO_CONTACTO}`}
                className="text-fg-muted transition-colors hover:text-primary"
              >
                {CORREO_CONTACTO}
              </a>
            </p>
            <p className="mt-1.5 text-xs text-fg-subtle">
              Soporte, privacidad y consultas legales.
            </p>
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
