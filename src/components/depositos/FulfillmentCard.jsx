import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Building2,
  Check,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Eye,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { tiendaService } from '../../services/tiendaService';
import { useDebounce } from '../../hooks/useDebounce';
import FulfillmentCoverageViewer from '../fulfillment/FulfillmentCoverageViewer';

function formatGs(valor) {
  const n = Math.max(0, Math.round(Number(valor) || 0));
  return `Gs. ${n.toLocaleString('es-PY')}`;
}

/**
 * Cómo entrega el comercio lo que vende.
 *
 * No confundir con la logística de abastecimiento (dónde recibe el stock que
 * compra): son decisiones distintas y se configuran por separado. Acá sólo
 * se decide qué pasa cuando hay una venta.
 */
export default function FulfillmentCard({ onCambio }) {
  const [config, setConfig] = useState(null);
  const [modalidad, setModalidad] = useState('PROPIA');
  const [depositoId, setDepositoId] = useState(null);
  const [depositos, setDepositos] = useState([]);
  const [depositoFueraDePagina, setDepositoFueraDePagina] = useState(null);
  const [depositosPage, setDepositosPage] = useState(1);
  const [depositosMeta, setDepositosMeta] = useState({ total: 0, totalPages: 0 });
  const [depositosLoading, setDepositosLoading] = useState(false);
  const [depositosError, setDepositosError] = useState(null);
  const [buscarDeposito, setBuscarDeposito] = useState('');
  const [filtrosDeposito, setFiltrosDeposito] = useState({ ciudad: '', departamento: '' });
  const [opcionesFiltros, setOpcionesFiltros] = useState({ ciudades: [], departamentos: [] });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const [verCobertura, setVerCobertura] = useState(false);
  const debouncedBuscarDeposito = useDebounce(buscarDeposito, 350);
  const depositosLimit = 6;

  const cargar = () => {
    setCargando(true);
    tiendaService.obtenerFulfillment()
      .then((data) => {
        setConfig(data);
        setModalidad(data.modalidad);
        setDepositoId(data.deposito_fulfillment_id || null);
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.message || 'No se pudo cargar la configuración de entregas.'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  useEffect(() => {
    if (!config || modalidad !== 'PROPIA') return;

    let cancelado = false;
    setDepositosLoading(true);
    setDepositosError(null);

    tiendaService.listarDepositosFulfillment({
      page: depositosPage,
      limit: depositosLimit,
      buscar: debouncedBuscarDeposito || undefined,
      filtros: {
        ciudad: filtrosDeposito.ciudad || undefined,
        departamento: filtrosDeposito.departamento || undefined,
      },
      depositoSeleccionadoId: depositoId || undefined,
    })
      .then((data) => {
        if (cancelado) return;
        const lista = data.data || [];
        setDepositos(lista);
        setDepositoFueraDePagina(data.seleccionado || null);
        setDepositosMeta({ total: data.total || 0, totalPages: data.totalPages || 0 });
        setOpcionesFiltros(data.filtros || { ciudades: [], departamentos: [] });
        if (!depositoId && lista.length > 0) {
          setDepositoId(lista[0].id);
        }
      })
      .catch((err) => {
        if (cancelado) return;
        setDepositosError(err.response?.data?.message || 'No se pudieron cargar los depósitos.');
      })
      .finally(() => {
        if (!cancelado) setDepositosLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [
    config,
    modalidad,
    depositosPage,
    debouncedBuscarDeposito,
    filtrosDeposito.ciudad,
    filtrosDeposito.departamento,
    depositoId,
  ]);

  if (cargando) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-fg-muted">
        Cargando configuración de entregas...
      </div>
    );
  }
  if (!config) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-danger">{error}</div>
    );
  }

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      const data = await tiendaService.guardarFulfillment(modalidad, modalidad === 'PROPIA' ? depositoId : null);
      setConfig(data);
      setOk(true);
      onCambio?.();
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  const hayCambios = modalidad !== config.modalidad
    || (modalidad === 'PROPIA' && depositoId !== config.deposito_fulfillment_id);

  const hayFiltrosDeposito = Boolean(
    debouncedBuscarDeposito
      || filtrosDeposito.ciudad
      || filtrosDeposito.departamento,
  );
  const totalDepositosPropios = config.propia.total_depositos ?? config.propia.depositos?.length ?? 0;
  const hayDepositosPropios = Boolean(totalDepositosPropios > 0 || depositosMeta.total > 0 || depositos.length > 0 || depositoFueraDePagina);
  const totalPagesDepositos = Math.max(1, depositosMeta.totalPages || 1);

  const seleccionarDeposito = (d) => {
    setDepositoId(d.id);
    setDepositoFueraDePagina(null);
  };

  const DepositoOpcion = ({ deposito, destacado = false }) => {
    const elegido = depositoId === deposito.id;
    return (
      <button
        key={deposito.id}
        type="button"
        onClick={() => seleccionarDeposito(deposito)}
        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
          elegido ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        } ${destacado ? 'border-dashed' : ''}`}
      >
        <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${elegido ? 'border-primary bg-primary' : 'border-fg-muted'}`}>
          {elegido && <Check size={10} className="text-white" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{deposito.nombre}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[12px] text-fg-muted">
            <MapPin size={11} className="flex-shrink-0" />
            <span className="truncate">
              {deposito.ciudad}
              {deposito.departamento ? ` · ${deposito.departamento}` : ''}
            </span>
          </span>
        </span>
      </button>
    );
  };

  const Opcion = ({ valor, icono: Icono, titulo, children, deshabilitada, motivo }) => {
    const activa = modalidad === valor;
    return (
      <button
        type="button"
        onClick={() => {
          if (deshabilitada) {
            toast.error(motivo || 'Opción no disponible');
            return;
          }
          setModalidad(valor);
        }}
        className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
          deshabilitada ? 'cursor-not-allowed opacity-60' : ''
        } ${
          activa ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${activa ? 'border-primary bg-primary' : 'border-fg-muted'}`}>
            {activa && <Check size={10} className="text-white" />}
          </span>
          <Icono size={16} className={activa ? 'text-primary' : 'text-fg-muted'} />
          <h4 className={`m-0 text-[15px] font-semibold ${activa ? 'text-primary' : 'text-fg'}`}>{titulo}</h4>
        </div>
        <div className="pl-6 text-[13px] text-fg-muted">{children}</div>
        {deshabilitada && motivo && (
          <p className="m-0 mt-2 pl-6 text-[12px] text-warning">{motivo}</p>
        )}
      </button>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-1 flex items-center gap-2">
        <Truck size={18} className="text-primary" />
        <h3 className="m-0 text-base font-semibold text-fg">¿Cómo querés gestionar las entregas de tus pedidos?</h3>
      </div>
      <p className="m-0 mb-4 text-sm text-fg-muted">
        Esto define quién prepara y entrega cuando vendés. Es independiente de dónde recibís el stock que comprás.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Opcion
          valor="GESICOMM"
          icono={Truck}
          titulo="Gesicomm gestiona mis envíos"
          deshabilitada={!config.gesicomm.disponible}
          motivo="Gesicomm todavía no tiene cobertura configurada."
        >
          Gesicomm prepara y despacha tus pedidos con sus proveedores logísticos.
          {config.gesicomm.costo_desde !== null && (
            <span className="mt-1 block font-medium text-fg">
              Desde {formatGs(config.gesicomm.costo_desde)} por entrega
            </span>
          )}
          <span className="mt-1 block">El costo depende de la ciudad del destinatario.</span>
        </Opcion>

        <Opcion
          valor="PROPIA"
          icono={Building2}
          titulo="Quiero gestionar mis propios envíos"
          deshabilitada={!config.propia.disponible}
          motivo="Necesitás tener al menos un depósito activo."
        >
          Despachás desde tu depósito y elegís el courier al crear el pedido.
        </Opcion>
      </div>

      {/* El enlace a la cobertura va fuera de la tarjeta de opción: esa tarjeta
          ya es un <button>, y anidar botones rompe el HTML y la navegación por
          teclado. */}
      {modalidad === 'GESICOMM' && (
        <button
          type="button"
          onClick={() => setVerCobertura(true)}
          className="mt-3 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm font-medium text-primary hover:underline"
        >
          <Eye size={14} /> Ver cobertura y precios
        </button>
      )}

      {modalidad === 'PROPIA' && !depositosLoading && !hayFiltrosDeposito && !hayDepositosPropios && (
        <p className="mt-3 rounded-md bg-surface-2 px-4 py-3 text-[13px] text-fg-muted">
          Todavía no tenés depósitos.{' '}
          <Link to="/mi-tienda/depositos" className="font-medium text-primary hover:underline">
            Creá uno <ArrowRight size={12} className="inline" />
          </Link>
        </p>
      )}

      {modalidad === 'PROPIA' && (hayDepositosPropios || hayFiltrosDeposito || depositosLoading) && (
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-fg">¿Desde qué depósito despachás?</label>
          <div className="mb-3 grid gap-2 md:grid-cols-[minmax(180px,1fr)_160px_160px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={15} />
              <input
                type="search"
                value={buscarDeposito}
                onChange={(e) => {
                  setBuscarDeposito(e.target.value);
                  setDepositosPage(1);
                }}
                placeholder="Buscar depósito"
                className="h-9 w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none transition-colors focus:border-primary"
              />
            </div>
            <select
              value={filtrosDeposito.ciudad}
              onChange={(e) => {
                setFiltrosDeposito((prev) => ({ ...prev, ciudad: e.target.value }));
                setDepositosPage(1);
              }}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-primary"
            >
              <option value="">Todas las ciudades</option>
              {opcionesFiltros.ciudades.map((ciudad) => (
                <option key={ciudad} value={ciudad}>{ciudad}</option>
              ))}
            </select>
            <select
              value={filtrosDeposito.departamento}
              onChange={(e) => {
                setFiltrosDeposito((prev) => ({ ...prev, departamento: e.target.value }));
                setDepositosPage(1);
              }}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-primary"
            >
              <option value="">Todos los departamentos</option>
              {opcionesFiltros.departamentos.map((departamento) => (
                <option key={departamento} value={departamento}>{departamento}</option>
              ))}
            </select>
          </div>

          <div className="relative flex flex-col gap-2">
            {depositoFueraDePagina && <DepositoOpcion deposito={depositoFueraDePagina} destacado />}

            {depositos.map((d) => <DepositoOpcion key={d.id} deposito={d} />)}

            {!depositosLoading && depositos.length === 0 && !depositoFueraDePagina && (
              <div className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-fg-muted">
                {hayFiltrosDeposito ? 'No encontramos depósitos con esos filtros.' : 'No tenés depósitos activos.'}
              </div>
            )}

            {depositosLoading && (
              <div className="rounded-lg border border-border bg-surface-2 px-4 py-5 text-center text-sm text-fg-muted">
                Cargando depósitos...
              </div>
            )}
          </div>

          {depositosError && (
            <p className="m-0 mt-2 text-[12px] text-danger">{depositosError}</p>
          )}

          {(depositosMeta.total > depositosLimit || totalPagesDepositos > 1) && (
            <div className="mt-3 flex flex-col gap-2 text-[12px] text-fg-muted sm:flex-row sm:items-center sm:justify-between">
              <span>
                {depositosMeta.total} resultado{depositosMeta.total === 1 ? '' : 's'} · página {depositosPage} de {totalPagesDepositos}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={depositosPage <= 1 || depositosLoading}
                  onClick={() => setDepositosPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={depositosPage >= totalPagesDepositos || depositosLoading}
                  onClick={() => setDepositosPage((p) => Math.min(totalPagesDepositos, p + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-3">
            {hayFiltrosDeposito ? (
              <button
                type="button"
                onClick={() => {
                  setBuscarDeposito('');
                  setFiltrosDeposito({ ciudad: '', departamento: '' });
                  setDepositosPage(1);
                }}
                className="border-none bg-transparent p-0 text-[12px] font-medium text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            ) : (
              <span />
            )}
            <Link to="/mi-tienda/depositos" className="text-[12px] font-medium text-primary hover:underline">
              Gestionar depósitos <ArrowRight size={12} className="inline" />
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="m-0">{error}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        {ok && (
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-success">
            <CheckCircle2 size={14} /> Guardado
          </span>
        )}
        <button
          type="button"
          disabled={!hayCambios || guardando}
          onClick={guardar}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          Guardar
        </button>
      </div>

      <FulfillmentCoverageViewer open={verCobertura} onClose={() => setVerCobertura(false)} />
    </div>
  );
}
