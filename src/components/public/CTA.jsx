import Button from './Button';
import { Container } from './Section';

/**
 * Bloque de cierre con llamada a la acción. Se repite al pie de la landing y
 * de las páginas legales, para que nadie termine de leer un documento y
 * quede sin un próximo paso.
 */
export default function CTA({
  titulo = '¿Listo para ordenar tu operación?',
  descripcion = 'Centralizá productos, pedidos, stock y campañas en un solo panel.',
  accionPrimaria = { etiqueta: 'Entrar al panel', to: '/login' },
  accionSecundaria = { etiqueta: 'Hablar con nosotros', to: '/contact' },
}) {
  return (
    <section className="no-imprimir border-t border-border bg-surface py-20 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-canvas px-8 py-14 text-center sm:px-14">
          {/* Resplandor de marca. aria-hidden: es decoración pura. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
            style={{ background: 'radial-gradient(circle, #6d5ef8 0%, transparent 70%)' }}
          />

          <div className="relative">
            <h2
              className="mx-auto max-w-2xl text-3xl font-bold text-fg sm:text-4xl"
              style={{ letterSpacing: '-0.03em' }}
            >
              {titulo}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-fg-muted">
              {descripcion}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button to={accionPrimaria.to} tamano="lg" className="w-full sm:w-auto">
                {accionPrimaria.etiqueta}
              </Button>
              {accionSecundaria && (
                <Button
                  to={accionSecundaria.to}
                  variante="secundario"
                  tamano="lg"
                  className="w-full sm:w-auto"
                >
                  {accionSecundaria.etiqueta}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
