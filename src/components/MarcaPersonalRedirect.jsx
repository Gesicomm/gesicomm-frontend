import { useEffect } from 'react';
import RequireRuta from './RequireRuta';
import { MARCA_PERSONAL_URL } from '../lib/marcaPersonal';

export default function MarcaPersonalRedirect() { return <RequireRuta ruta="personal"><AbrirMarca /></RequireRuta>; }
function AbrirMarca() {
  useEffect(() => {
    sessionStorage.removeItem('moduloActivo');
    window.location.replace(MARCA_PERSONAL_URL);
  }, []);

  return <p>Abriendo Marca Personal… <a href={MARCA_PERSONAL_URL}>Continuar</a></p>;
}
