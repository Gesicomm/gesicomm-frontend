import modulos from './modulosAcceso.json';
export const MODULOS_ACCESO = modulos;
export function moduloDeRuta(ruta) {
  const path = ruta.split('?')[0].replace(/\/$/, '');
  if (/^\/mi-tienda\/(depositos|couriers)(\/|$)/.test(path) || /^\/inventario(\/|$)/.test(path)) return 'depositos';
  if (/^\/(mi-catalogo|products|combos|categorias)(\/|$)/.test(path)) return 'productos';
  if (/^\/(landing|mi-landing)(\/|$)/.test(path)) return 'ecommerce';
  if (path === '/pedidos/configuracion') return 'comercial';
  return modulos.find(m => m.ruta === path)?.clave;
}
export function destinoColaborador(usuario) {
  if (!usuario?.tiendaId) return '/acceso-tiendas';
  return modulos.find(m => usuario.accesos?.[m.clave])?.ruta || '/sin-acceso';
}
export function rutaPermitida(usuario, ruta) {
  if (usuario?.rol !== 'colaborador') return true;
  if (['/acceso-tiendas', '/sin-acceso'].includes(ruta)) return true;
  const modulo = moduloDeRuta(ruta);
  if (!modulo || !usuario.accesos?.[modulo]) return false;
  if (/\/(nuevo|editar|precios)$/.test(ruta) || ruta === '/pedidos/configuracion') return usuario.accesos[modulo] === 'gestionar';
  return true;
}
