import { useTema } from './ThemeProvider';

/**
 * Logo de Gesicom — círculo abierto, check y punto digital.
 *
 * El wordmark se escribe **Gesicom**, con una sola m. El dominio sigue
 * siendo gesicomm.com (con dos): es una URL, no la marca — no unificar.
 *
 * El círculo hereda el color del tema. El panel usa los archivos de identidad aprobados.
 */
export default function Logo({ size = 32, conTexto = true, className = '', fondoPanel = 'tema' }) {
  const { tema } = useTema();
  const fondo = fondoPanel === 'tema' ? (tema === 'dark' ? 'oscuro' : 'claro') : fondoPanel;
  const formato = conTexto ? 'logo-web' : 'simbolo';
  return (
    <img
      src={`/brand/identidad/gesicom-${formato}-fondo-${fondo}.png`}
      width={conTexto ? 910 : size}
      height={conTexto ? 228 : size}
      className={`gc-approved-logo ${conTexto ? 'gc-approved-logo-wordmark' : ''} ${className}`}
      alt="Gesicom"
    />
  );
}
