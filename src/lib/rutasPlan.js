export function accesoDelPlan(plan) {
  if (['elegir','fisico','personal','ambas'].includes(plan?.acceso_rutas)) return plan.acceso_rutas;
  return String(plan?.codigo || '').startsWith('una-ruta-') ? 'elegir' : 'ambas';
}
export const NOMBRES_RUTA = { fisico: 'Gestión de E-commerce', personal: 'Marca personal', ambas: 'E-commerce y marca personal', elegir: 'Una ruta a elegir' };
