import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Truck, AlertCircle } from 'lucide-react';
import { redFulfillmentService } from '../../services/redFulfillment.service';
import FulfillmentKpis from '../../components/fulfillment/FulfillmentKpis';
import FulfillmentEmptyState from '../../components/fulfillment/FulfillmentEmptyState';
import FulfillmentCenterCard from '../../components/fulfillment/FulfillmentCenterCard';

/**
 * Red de Fulfillment — entrada del producto logístico de Gesicomm.
 *
 * No es "otra pantalla de couriers": el courier es una pieza interna de esta
 * red. Acá se habla de centros, cobertura, tarifas y proveedores, que es lo
 * que define el servicio que se le vende a los comercios.
 */
export default function RedFulfillment() {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [centros, setCentros] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [res, listado, provs] = await Promise.all([
        redFulfillmentService.resumen(),
        redFulfillmentService.listarCentros(),
        redFulfillmentService.proveedores(),
      ]);
      setResumen(res);
      setCentros(listado.centros || []);
      setCandidatos(listado.candidatos || []);
      setProveedores(provs || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar la red de fulfillment.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-56 animate-pulse rounded bg-surface-2" />
        <div className="mt-6 flex flex-wrap gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 flex-1 min-w-[160px] animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Network size={22} />
        </span>
        <div>
          <h1 className="m-0 text-2xl font-bold text-fg">Red de Fulfillment</h1>
          <p className="m-0 mt-1 text-sm text-fg-muted">
            Administrá los centros, la cobertura y los costos de la operación logística de Gesicomm.
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="m-0">{error}</p>
        </div>
      )}

      {!resumen?.configurada ? (
        <FulfillmentEmptyState candidatos={candidatos} onListo={cargar} />
      ) : (
        <>
          <FulfillmentKpis resumen={resumen} />

          <section className="mt-8">
            <h2 className="m-0 mb-3 text-base font-semibold text-fg">Centros</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {centros.map((c) => (
                <FulfillmentCenterCard
                  key={c.id}
                  centro={c}
                  onAbrir={(centro) => navigate(`/fulfillment/centros/${centro.id}`)}
                />
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-base font-semibold text-fg">Proveedores logísticos</h2>
            </div>
            {proveedores.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-center">
                <p className="m-0 text-sm text-fg-muted">
                  Aún no hay proveedores logísticos en la red.
                </p>
                <p className="m-0 mt-1 text-[13px] text-fg-subtle">
                  Un proveedor define a qué ciudades llega y cuánto cuesta cada entrega.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {proveedores.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-surface p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <Truck size={15} className="text-fg-muted" />
                      <h3 className="m-0 text-sm font-semibold text-fg">{p.nombre}</h3>
                      {!p.activo && (
                        <span className="rounded-full bg-fg-muted/10 px-2 py-0.5 text-[10px] font-bold uppercase text-fg-muted">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-[13px] text-fg-muted">
                      {p.ciudades} ciudad(es) cubiertas
                      {p.desde != null && ` · desde Gs. ${Number(p.desde).toLocaleString('es-PY')}`}
                    </p>
                    {p.ciudades === 0 && (
                      <p className="m-0 mt-1 text-[12px] text-warning">
                        Sin cobertura configurada: todavía no puede cotizar entregas.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
