import { Link } from 'react-router-dom';

const VARIANTES = {
  primario:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-sm',
  secundario:
    'border border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2',
  fantasma:
    'text-fg-muted hover:bg-surface-2 hover:text-fg',
};

const TAMANOS = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/**
 * Botón del sitio público. Elige el elemento correcto según lo que reciba:
 * <Link> para rutas internas, <a> para enlaces externos o mailto, y <button>
 * para acciones. Importa para accesibilidad: un botón que navega tiene que
 * ser un enlace real para que funcione con clic medio, "abrir en pestaña
 * nueva" y lectores de pantalla.
 */
export default function Button({
  children,
  to,
  href,
  variante = 'primario',
  tamano = 'md',
  className = '',
  ...resto
}) {
  const clases = `inline-flex items-center justify-center rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={clases} {...resto}>
        {children}
      </Link>
    );
  }

  if (href) {
    const esExterno = href.startsWith('http');
    return (
      <a
        href={href}
        className={clases}
        {...(esExterno ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...resto}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={clases} {...resto}>
      {children}
    </button>
  );
}
