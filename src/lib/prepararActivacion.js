// Retirar el enlace privado antes de inicializar el router o los píxeles.
export function prepararActivacion(ventana) {
  const url = new URL(ventana.location.href);
  const fragmento = new URLSearchParams(url.hash.slice(1));
  const activacion = fragmento.get('activacion') || url.searchParams.get('activacion');
  const comprobante = fragmento.get('comprobante');
  if ((!activacion || url.pathname !== '/registro') && (!comprobante || url.pathname !== '/activar-cuenta')) return;
  url.searchParams.delete('activacion');
  url.hash = '';
  const state = ventana.history.state || {};
  ventana.history.replaceState({ ...state, usr: { ...state.usr, ...(url.pathname === '/registro' ? { activacion } : { comprobante }) } }, '', `${url.pathname}${url.search}`);
}
