// T2E OS se sirve en un origen separado: mantiene sus rutas y su propia sesión.
// En desarrollo apunta a la copia local (t2e-os-v2/gesicomm-dev-server.cjs),
// que usa la sesión del backend local; VITE_MARCA_PERSONAL_URL lo reemplaza.
export const MARCA_PERSONAL_URL = import.meta.env.VITE_MARCA_PERSONAL_URL
  || (import.meta.env.DEV ? 'http://localhost:3002/' : 'https://automation.gesicomm.com/');
