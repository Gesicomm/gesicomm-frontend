import { getComponenteTemplate } from '../landing-simple/templates';

export default function TemplateRigidoPublico({ templateSlug, ...props }) {
  const ComponenteRigido = getComponenteTemplate(templateSlug);
  if (!ComponenteRigido) {
    return <div className="lp-status-page"><h1>Esta vidriera no está disponible</h1></div>;
  }
  return <ComponenteRigido {...props} />;
}
