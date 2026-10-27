import { useLocation } from 'react-router-dom';
import useTutorialesSistema from '../hooks/useTutorialesSistema';
import { MODULOS_ACCESO, moduloDeRuta } from '../utils/accesos';
import TutorialSeccion from '../pages/tienda/TutorialSeccion';
import './tutorialModulo.css';

export default function TutorialModulo() {
  const { pathname } = useLocation();
  const clave = moduloDeRuta(pathname);
  const modulo = MODULOS_ACCESO.find(item => item.clave === clave);

  // Mi negocio tiene su tutorial destacado dentro de la propia pantalla.
  // El editor de E-commerce ya muestra el video de cada vista en su preview.
  if (!modulo || clave === 'negocio' || /^\/(?:mi-landing|landing)\/[^/]+/.test(pathname)) return null;

  return <TutorialModuloVisible modulo={modulo} clave={clave} />;
}

function TutorialModuloVisible({ modulo, clave }) {
  const videos = useTutorialesSistema();
  return <div className="gc-module-tutorial">
    <TutorialSeccion nombre={modulo.nombre} url={videos[`modulo.${clave}`]} />
  </div>;
}
