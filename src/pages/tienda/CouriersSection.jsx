import React, { useCallback, useEffect, useState } from 'react';
import { DeliveryPanel } from '../courier/DeliveryPanel';
import {
  getCouriers,
  getDeliveryZonas,
  replaceDeliveryZonas,
  createCourier,
  updateCourier,
  deleteCourier,
  createCourierAccess,
  changeCourierAccessPassword,
  updateCourierAccessStatus,
} from '../../services/courierApi';
// DeliveryPanel y su asistente usan las clases de formulario y botones de
// Pedidos (form-input, btn-nuevo-pedido): nacieron ahí, cuando esto era la
// pestaña Delivery.
import '../courier/courier.css';

/**
 * Los couriers del comercio dentro de Depósitos: quién entrega, qué ciudades
 * cubre y cuánto cobra. Es el mismo panel que antes vivía como pestaña
 * "Delivery" en Pedidos — acá carga sus propios datos en vez de recibirlos.
 *
 * `recargarKey` cambia cuando otra parte de la página crea un courier (el
 * asistente de alta de depósito) y hay que volver a leer la lista.
 */
export default function CouriersSection({ esAdmin = false, recargarKey = 0, onCambio }) {
  const [couriers, setCouriers] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const [couriersData, zonasData] = await Promise.all([getCouriers(), getDeliveryZonas()]);
      setCouriers(couriersData || []);
      setZonas(zonasData || []);
    } catch (err) {
      console.error('Error cargando couriers:', err);
      setError('No se pudieron cargar los couriers.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar, recargarKey]);

  if (cargando) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-surface">
        <span className="loader" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4 text-sm text-danger">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => { setCargando(true); cargar(); }}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const conAcceso = (id, acceso) => setCouriers(prev => prev.map(x => (x.id === id ? { ...x, acceso } : x)));

  return (
    <DeliveryPanel
      zonas={zonas}
      couriers={couriers}
      esAdmin={esAdmin}
      onSaveZonas={async (nuevasZonas, courierIds) => {
        setZonas(await replaceDeliveryZonas(nuevasZonas, courierIds));
      }}
      onCreateCourier={async (c) => {
        const res = await createCourier(c);
        setCouriers(prev => [...prev, res]);
        onCambio?.();
        return res;
      }}
      onUpdateCourier={async (c) => {
        const res = await updateCourier(c.id, c);
        setCouriers(prev => prev.map(x => (x.id === c.id ? res : x)));
        onCambio?.();
        return res;
      }}
      onDeleteCourier={async (id) => {
        await deleteCourier(id);
        setCouriers(prev => prev.filter(x => x.id !== id));
        onCambio?.();
      }}
      onCreateAccess={async (id, payload) => {
        const acceso = await createCourierAccess(id, payload);
        conAcceso(id, acceso);
        return acceso;
      }}
      onChangeAccessPassword={async (id, payload) => {
        const acceso = await changeCourierAccessPassword(id, payload);
        conAcceso(id, acceso);
        return acceso;
      }}
      onUpdateAccessStatus={async (id, activo) => {
        const acceso = await updateCourierAccessStatus(id, activo);
        conAcceso(id, acceso);
        return acceso;
      }}
    />
  );
}
