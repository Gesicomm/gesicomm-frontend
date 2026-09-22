import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Warehouse, MapPin, Phone, User, AlertCircle, ExternalLink } from 'lucide-react';
import { redFulfillmentService } from '../../services/redFulfillment.service';
import FulfillmentCoverage from '../../components/fulfillment/FulfillmentCoverage';
import FulfillmentProviderCard from '../../components/fulfillment/FulfillmentProviderCard';
import { formatGs } from '../../components/fulfillment/vocabulario';

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'cobertura', label: 'Cobertura y tarifas' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'config', label: 'Configuración' },
];

function Dato({ icono: Icono, etiqueta, valor }) {
  if (!valor) return null;
  return (
    <div className="flex items-start gap-2">
      {Icono && <Icono size={14} className="mt-0.5 flex-shrink-0 text-fg-subtle" />}
      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{etiqueta}</span>
        <span className="block text-sm text-fg">{valor}</span>
      </div>
    </div>
  );
}

/**
 * Detalle operativo de un centro de fulfillment.
 *
 * La pestaña activa vive en estado local, no en la URL: el proyecto no usa
 * query params para estado de UI.
 */
export default function CentroDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('resumen');
  const [detalle, setDetalle] = useState(null);
  const [cobertura, setCobertura] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [det, cob, provs] = await Promise.all([
        redFulfillmentService.detalleCentro(id),
        redFulfillmentService.coberturaCentro(id),
        redFulfillmentService.proveedores(),
      ]);
      setDetalle(det);
      setCobertura(cob || []);
      setProveedores(provs || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el centro.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-2" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }

  if (error || !detalle) {
    return (
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate('/fulfillment')}
          className="mb-4 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft size={15} /> Red de Fulfillment
        </button>
        <div className="flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="m-0">{error || 'Centro no encontrado.'}</p>
        </div>
      </div>
    );
  }

  const { centro, capacidad, tarifas } = detalle;

  return (
    <div className="mx-auto max-w-6xl">
      <button
        type="button"
        onClick={() => navigate('/fulfillment')}
        className="mb-4 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> Red de Fulfillment
      </button>

      <header className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Warehouse size={21} />
        </span>
        <div className="flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
            Centro de fulfillment
          </span>
          <h1 className="m-0 text-2xl font-bold text-fg">{centro.nombre}</h1>
          <p className="m-0 mt-0.5 flex items-center gap-1 text-sm text-fg-muted">
            <MapPin size={13} />
            {[centro.ciudad, centro.departamento].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
          centro.activo ? 'bg-success/10 text-success' : 'bg-fg-muted/10 text-fg-muted'
        }`}>
          {centro.activo ? 'Activo' : 'Inactivo'}
        </span>
      </header>

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cursor-pointer border-none bg-transparent px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-b-2 border-primary text-primary-text'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[160px] flex-1 rounded-xl border border-border bg-surface p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Proveedores</span>
            <p className="m-0 mt-1 text-2xl font-bold text-fg">{capacidad.proveedores}</p>
          </div>
          <div className="min-w-[160px] flex-1 rounded-xl border border-border bg-surface p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Ciudades</span>
            <p className="m-0 mt-1 text-2xl font-bold text-fg">{capacidad.ciudades}</p>
            <p className="m-0 text-[12px] text-fg-muted">{capacidad.departamentos} departamento(s)</p>
          </div>
          <div className="min-w-[160px] flex-1 rounded-xl border border-border bg-surface p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Tarifas</span>
            <p className="m-0 mt-1 text-2xl font-bold text-fg">
              {tarifas.desde != null ? `desde ${formatGs(tarifas.desde)}` : '—'}
            </p>
            {tarifas.hasta != null && (
              <p className="m-0 text-[12px] text-fg-muted">hasta {formatGs(tarifas.hasta)}</p>
            )}
          </div>
        </div>
      )}

      {tab === 'cobertura' && (
        <FulfillmentCoverage grupos={cobertura} proveedores={proveedores} />
      )}

      {tab === 'proveedores' && (
        proveedores.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="m-0 text-sm font-medium text-fg">Este centro todavía no tiene proveedores</p>
            <p className="m-0 mt-1 text-[13px] text-fg-muted">
              Un proveedor define a qué ciudades llega la red y cuánto cuesta cada entrega.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {proveedores.map((p) => (
              <FulfillmentProviderCard key={p.id} proveedor={p} />
            ))}
          </div>
        )
      )}

      {tab === 'config' && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dato etiqueta="Dirección" valor={centro.direccion} icono={MapPin} />
            <Dato etiqueta="Referencia" valor={centro.referencia} />
            <Dato etiqueta="Persona de contacto" valor={centro.persona_contacto} icono={User} />
            <Dato etiqueta="Teléfono" valor={centro.telefono_contacto} icono={Phone} />
          </div>
          {centro.google_maps_url && (
            <a
              href={centro.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Ver en Google Maps <ExternalLink size={13} />
            </a>
          )}
          <p className="m-0 mt-5 border-t border-border pt-4 text-[13px] text-fg-muted">
            Los datos del depósito se editan en{' '}
            <Link to="/mi-tienda/depositos" className="font-medium text-primary hover:underline">
              Mi tienda → Depósitos
            </Link>
            . Acá se ven porque son los que usa la red para coordinar retiros y entregas.
          </p>
        </div>
      )}
    </div>
  );
}
