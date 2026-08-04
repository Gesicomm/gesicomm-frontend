import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import Breadcrumb from './Breadcrumb';
import { Container } from './Section';
import Seo, { SITIO, schemaMigas } from './Seo';

const DOCUMENTOS = [
  { etiqueta: 'Política de Privacidad', href: '/privacy' },
  { etiqueta: 'Términos y Condiciones', href: '/terms' },
  { etiqueta: 'Política de Cookies', href: '/cookies' },
  { etiqueta: 'Eliminación de Datos', href: '/data-deletion' },
  { etiqueta: 'Seguridad de la Información', href: '/security' },
  { etiqueta: 'Cumplimiento Legal', href: '/compliance' },
];

/**
 * Índice lateral con resaltado de la sección en pantalla.
 *
 * El observer se arma sobre los mismos ids que ya tiene `secciones`, así que
 * el índice no puede desincronizarse del documento: ambos salen de la misma
 * estructura de datos que declara la página.
 */
function IndiceLateral({ secciones }) {
  const [activa, setActiva] = useState(secciones[0]?.id);

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        const visibles = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visibles.length > 0) setActiva(visibles[0].target.id);
      },
      // La banda alta y angosta hace que se marque la sección que está
      // arriba de la pantalla, no la que ocupa más área.
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );

    secciones.forEach(({ id }) => {
      const elemento = document.getElementById(id);
      if (elemento) observador.observe(elemento);
    });

    return () => observador.disconnect();
  }, [secciones]);

  return (
    <nav aria-label="Contenido del documento" className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
        Contenido
      </p>
      <ul className="space-y-0.5 border-l border-border">
        {secciones.map((seccion) => (
          <li key={seccion.id}>
            <a
              href={`#${seccion.id}`}
              aria-current={activa === seccion.id ? 'true' : undefined}
              className={`-ml-px block border-l py-1.5 pl-3.5 leading-snug transition-colors ${
                activa === seccion.id
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg'
              }`}
            >
              {seccion.titulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Estructura común de todos los documentos legales.
 *
 * La página declara `secciones` una sola vez y de ahí salen el índice, los
 * encabezados numerados, las anclas y el JSON-LD. Es lo que garantiza que un
 * documento de treinta secciones no termine con el índice apuntando a
 * títulos que ya no existen.
 */
export default function LegalDoc({
  titulo,
  descripcion,
  resumen,
  ruta,
  actualizado,
  vigenteDesde,
  secciones,
  children,
}) {
  const migas = [
    { etiqueta: 'Inicio', href: '/' },
    { etiqueta: titulo, href: ruta },
  ];

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      schemaMigas(migas),
      {
        '@type': 'WebPage',
        '@id': `${SITIO}${ruta}`,
        url: `${SITIO}${ruta}`,
        name: titulo,
        description: descripcion,
        inLanguage: 'es',
        dateModified: actualizado,
        isPartOf: { '@id': `${SITIO}/#sitio` },
      },
    ],
  };

  const formatearFecha = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <>
      <Seo titulo={titulo} descripcion={descripcion} ruta={ruta} tipo="article" schema={schema} />

      <div className="border-b border-border bg-surface">
        <Container className="py-12 sm:py-16">
          <Breadcrumb migas={migas} className="mb-7 no-imprimir" />

          <h1 className="titular max-w-3xl text-3xl text-fg sm:text-[2.6rem]">{titulo}</h1>

          {resumen && (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
              {resumen}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-fg-subtle">
            <span>
              Última actualización:{' '}
              <time dateTime={actualizado} className="font-medium text-fg-muted">
                {formatearFecha(actualizado)}
              </time>
            </span>
            {vigenteDesde && (
              <span>
                Vigente desde:{' '}
                <time dateTime={vigenteDesde} className="font-medium text-fg-muted">
                  {formatearFecha(vigenteDesde)}
                </time>
              </span>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="no-imprimir inline-flex items-center gap-1.5 text-fg-muted transition-colors hover:text-primary"
            >
              <Printer size={14} aria-hidden="true" />
              Imprimir o guardar en PDF
            </button>
          </div>
        </Container>
      </div>

      <Container className="py-12 sm:py-16">
        <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
          <aside className="no-imprimir mb-10 lg:mb-0">
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              <IndiceLateral secciones={secciones} />
            </div>
          </aside>

          <article className="texto-legal min-w-0 text-[0.9375rem] text-fg-muted">
            {children}

            {secciones.map((seccion, indice) => (
              <section key={seccion.id} id={seccion.id} className="pt-10 first:pt-0">
                <h2
                  className="text-xl font-bold text-fg sm:text-2xl"
                  style={{ letterSpacing: '-0.025em' }}
                >
                  <span className="cifra mr-2.5 text-base text-fg-subtle">{indice + 1}.</span>
                  {seccion.titulo}
                </h2>
                <div className="mt-4">{seccion.contenido}</div>
              </section>
            ))}

            <div className="mt-16 border-t border-border pt-8 no-imprimir">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Otros documentos
              </p>
              <ul className="flex flex-wrap gap-2">
                {DOCUMENTOS.filter((doc) => doc.href !== ruta).map((doc) => (
                  <li key={doc.href}>
                    <Link
                      to={doc.href}
                      className="inline-flex rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                    >
                      {doc.etiqueta}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </Container>
    </>
  );
}

/** Subtítulo dentro de una sección, para documentos con mucho nivel de detalle. */
export function Subseccion({ titulo, children, id }) {
  return (
    <div id={id} className="pt-6">
      <h3 className="text-base font-semibold text-fg" style={{ letterSpacing: '-0.015em' }}>
        {titulo}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/**
 * Tabla de datos dentro de un documento legal (categorías de datos,
 * subprocesadores, tipos de cookies).
 *
 * El contenedor con overflow-x propio es lo que impide que una tabla ancha
 * rompa el layout en móvil: scrollea la tabla, no la página.
 */
export function TablaLegal({ encabezados, filas, notaAlPie }) {
  return (
    <div className="mt-5 not-prose">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead className="bg-surface-2">
            <tr>
              {encabezados.map((encabezado) => (
                <th
                  key={encabezado}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle"
                >
                  {encabezado}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, indiceFila) => (
              <tr key={indiceFila} className="border-t border-border align-top">
                {fila.map((celda, indiceCelda) => (
                  <td
                    key={indiceCelda}
                    className={`px-4 py-3.5 leading-relaxed ${
                      indiceCelda === 0 ? 'font-medium text-fg' : 'text-fg-muted'
                    }`}
                  >
                    {celda}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notaAlPie && <p className="mt-2.5 text-xs text-fg-subtle">{notaAlPie}</p>}
    </div>
  );
}
