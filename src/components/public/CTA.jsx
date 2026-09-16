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
  onClickPrimaria,
  onClickSecundaria,
}) {
  return (
    <section className="no-imprimir border-t border-border bg-surface py-16 sm:py-20">
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-xl">
            <h2 className="titular text-3xl text-fg sm:text-[2.4rem]">{titulo}</h2>
            <p className="mt-4 text-base leading-relaxed text-fg-muted">{descripcion}</p>
          </div>

          <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
            <Button
              to={accionPrimaria.to}
              tamano="lg"
              className="w-full sm:w-auto"
              onClick={onClickPrimaria}
            >
              {accionPrimaria.etiqueta}
            </Button>
            {accionSecundaria && (
              <Button
                to={accionSecundaria.to}
                variante="secundario"
                tamano="lg"
                className="w-full sm:w-auto"
                onClick={onClickSecundaria}
              >
                {accionSecundaria.etiqueta}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
