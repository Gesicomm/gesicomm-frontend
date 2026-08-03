import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Migas de pan. El último elemento no es un enlace y lleva
 * aria-current="page": es la página actual, no un destino.
 *
 * Los separadores van con aria-hidden para que un lector de pantalla lea
 * "Inicio, Legal, Política de privacidad" y no un ">" entre cada uno.
 */
export default function Breadcrumb({ migas, className = '' }) {
  return (
    <nav aria-label="Ruta de navegación" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {migas.map((miga, indice) => {
          const esUltima = indice === migas.length - 1;

          return (
            <li key={miga.href} className="flex items-center gap-1.5">
              {indice > 0 && (
                <ChevronRight size={14} className="text-fg-subtle" aria-hidden="true" />
              )}
              {esUltima ? (
                <span className="font-medium text-fg" aria-current="page">
                  {miga.etiqueta}
                </span>
              ) : (
                <Link to={miga.href} className="text-fg-muted transition-colors hover:text-fg">
                  {miga.etiqueta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
