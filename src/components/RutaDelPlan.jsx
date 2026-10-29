import { useId } from 'react';
import { accesoDelPlan, NOMBRES_RUTA } from '../lib/rutasPlan';
export default function RutaDelPlan({ plan, value, onChange, disabled = false }) {
  const labelId = useId();
  const acceso = accesoDelPlan(plan);
  if (acceso !== 'elegir') return <p className="pl-aviso">Acceso incluido: {NOMBRES_RUTA[acceso]}.</p>;
  return <label className="pl-campo mb-6"><span id={labelId}>Espacio incluido en tu plan</span>
    <select aria-labelledby={labelId} value={value} onChange={event => onChange(event.target.value)} disabled={disabled} required className="w-full min-h-12 rounded-lg border border-border bg-surface px-3 text-base text-fg">
      <option value="fisico">Gestión de E-commerce · Productos</option><option value="personal">Marca personal · Marca y servicios</option>
    </select><span>Elegí Gestión de E-commerce para vender productos o Marca personal para desarrollar tu marca y ofrecer servicios. Este plan habilita un espacio.</span>
  </label>;
}
