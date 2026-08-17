// Estilo de los elementos de texto del footer, en UN solo lugar: lo usan
// tanto BuilderElement.jsx (lo que se ve en el editor) como
// PublicFooterRenderer.jsx (lo que se ve en el sitio). Si cada uno resolviera
// el estilo por su cuenta terminarían mostrando cosas distintas, que es
// justo el problema que ya tuvimos con los íconos de redes.

// Mismos valores/etiquetas que SIZE_OPTIONS en BloquesSchema.js, para que
// "Pequeño/Mediano/Grande" signifique lo mismo acá que en el resto de las
// secciones.
export const TAMANOS_TEXTO = [
  { value: 'sm', label: 'Pequeño' },
  { value: 'md', label: 'Mediano' },
  { value: 'lg', label: 'Grande' },
];

// Alineados con .lp-texto-sm/-lg de landingPublica.css (0.95rem / 1.25rem),
// con el mediano en el tamaño base del cuerpo.
const FONT_SIZE = { sm: '0.95rem', md: '1rem', lg: '1.25rem' };

export function estiloTexto(settings = {}) {
  return {
    margin: 0,
    fontSize: FONT_SIZE[settings.tamano] || FONT_SIZE.md,
    fontWeight: settings.negrita ? 700 : 400,
    textAlign: settings.alineacion || 'left',
    color: settings.color || 'inherit',
    lineHeight: 1.6,
  };
}

// Mismo look que .lp-banner-btn en landingPublica.css (el botón de "Ver
// catálogo"/banner) para que un botón del footer no desentone del resto del
// sitio por default — pero acá color_fondo/color_texto son POR BOTÓN, no
// el color_boton de toda la sección: así se puede tener un botón verde y
// otro rojo en el mismo footer.
export function estiloBoton(settings = {}) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: settings.color_fondo || 'var(--l-primary)',
    color: settings.color_texto || 'var(--l-on-primary, #0b1211)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 700,
    padding: '0.7rem 1.5rem',
    borderRadius: 'var(--l-radius-sm, 9px)',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  };
}
