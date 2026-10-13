import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck } from 'lucide-react';
import CouriersSection from './CouriersSection';
import useSesion from '../../hooks/useSesion';

export default function CouriersCatalogPage() {
  const navigate = useNavigate();
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'administrador';

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <button
        type="button"
        onClick={() => navigate('/mi-tienda/depositos')}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft size={16} />
        Volver a Depósitos
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck size={19} />
          </span>
          <div>
            <h1 className="m-0 text-2xl font-bold text-fg">Catálogo de couriers</h1>
            <p className="m-0 mt-1 text-sm text-fg-muted">
              Datos globales, cobertura, tarifas, rangos y accesos de tus couriers.
            </p>
          </div>
        </div>
      </div>

      <CouriersSection esAdmin={esAdmin} />
    </div>
  );
}
