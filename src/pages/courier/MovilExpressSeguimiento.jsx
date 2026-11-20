import { AlertCircle, ExternalLink, Loader2, Package } from 'lucide-react';
import { formatGs } from '../../lib/courier';
import { estadoMovilExpress } from './orderLifecycle';
import './movil-express-seguimiento.css';

/**
 * El envío de Móvil Express dentro de un pedido: la guía, en qué anda y el
 * enlace al seguimiento.
 *
 * Un solo componente para los tres lugares donde hace falta (la tabla de
 * pedidos, el panel de seguimiento comercial y la tarjeta en celular), con
 * `compacto` para cuando va dentro de una tarjeta. Si el pedido no salió
 * por Móvil Express no devuelve nada: la pantalla queda igual que antes
 * para quien no trabaja con ellos.
 */
export function MovilExpressSeguimiento({ envio, compacto = false }) {
  const estado = estadoMovilExpress(envio);
  if (!estado) return null;

  return (
    <div className={compacto ? 'mex-seg mex-seg--compacto' : 'mex-seg'}>
      <div className="mex-seg-cabecera">
        <span className="mex-seg-marca">
          <Package size={15} aria-hidden="true" />
          Móvil Express
        </span>
        <span className={`mex-seg-estado mex-seg-estado--${estado.tone}`}>
          {estado.procesando ? <><Loader2 size={13} className="mex-seg-girando" aria-hidden="true" /> Procesando</> : estado.label}
        </span>
      </div>

      <dl className="mex-seg-datos">
        <div>
          <dt>Guía</dt>
          <dd>{estado.guia || (estado.procesando ? 'Todavía no la asignaron' : '—')}</dd>
        </div>
        {estado.costo !== null && (
          <div>
            <dt>Costo del envío</dt>
            <dd>{formatGs(estado.costo)}</dd>
          </div>
        )}
      </dl>

      {estado.aviso && (
        <p className="mex-seg-aviso" role="status">
          <AlertCircle size={14} aria-hidden="true" />
          {estado.aviso}
        </p>
      )}

      {estado.trackingUrl ? (
        <a className="mex-seg-link" href={estado.trackingUrl} target="_blank" rel="noopener noreferrer">
          Ver seguimiento <ExternalLink size={14} aria-hidden="true" />
        </a>
      ) : (
        !estado.procesando && <p className="mex-seg-sin-link">El seguimiento público se habilita cuando emiten la guía.</p>
      )}
    </div>
  );
}

export default MovilExpressSeguimiento;
