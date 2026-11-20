import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { rahaService } from '../../services/rahaService';
import RahaConexion, { ESTADOS_RAHA } from './RahaConexion';
import SpeedboxConfig from './SpeedboxConfig';
import MovilExpressConfig from './MovilExpressConfig';
import './conexion-logistica.css';

// Cada proveedor declara sus propias pantallas. `Solicitud` es opcional:
// Rahá revisa documentación antes de habilitar la validación, y Móvil
// Express no — su alta se hace con ellos y acá sólo se valida la cuenta.
const PROVEEDORES = [{
  id: 'raha', nombre: 'Rahá', logo: '/providers/raha.png',
  descripcion: 'Productos y logística para abastecer tu tienda y entregar a tus clientes.',
  etiquetas: ['Mercadería', 'Logística', 'Almacenamiento', 'Fulfillment', 'Envíos y entregas'],
  datoDestacado: 'Más de 3.500 productos · Entregas estimadas de 24 a 48 horas',
  obtenerSolicitud: rahaService.obtener, estados: ESTADOS_RAHA,
  solicitudAprobada: solicitud => solicitud?.estado === 'aprobada',
  Solicitud: RahaConexion, Validacion: SpeedboxConfig,
}, {
  // Logo provisorio y genérico hasta que llegue el archivo oficial;
  // cuando esté, cambiar por '/providers/movil-express.png'.
  id: 'movil-express', nombre: 'Móvil Express', logo: '/providers/movil-express.svg',
  descripcion: 'Última milla en Asunción y Central, con cobro contra entrega y seguimiento del envío.',
  etiquetas: ['Logística', 'Última milla', 'Cobro contra entrega', 'Seguimiento'],
  datoDestacado: 'Asunción y Central · costo de envío exacto antes de confirmar',
  Validacion: MovilExpressConfig,
// Oculto temporalmente hasta habilitar la conexión real de Móvil Express:
}].filter(p => p.id !== 'movil-express');

function ProveedorLogistico({ proveedor, tienda, abrirValidacion = false, onEstadoChange }) {
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] = useState('resumen');
  const { Solicitud, Validacion } = proveedor;
  // Sin pantalla de solicitud no hay nada que aprobar: la validación se
  // abre de entrada y el paso 1 no se dibuja.
  const pideSolicitud = Boolean(Solicitud);
  const actualizarSolicitud = useCallback(solicitud => {
    setSolicitud(solicitud);
    onEstadoChange?.();
  }, [onEstadoChange]);
  const aprobado = pideSolicitud ? proveedor.solicitudAprobada(solicitud) : true;
  const motivoBloqueo = `${proveedor.nombre} tiene que aprobar tu solicitud para que puedas acceder a este siguiente paso y validar tu cuenta.`;
  const cargar = useCallback(async () => {
    if (!pideSolicitud) { setLoading(false); return; }
    setLoading(true); setError('');
    try { setSolicitud(await proveedor.obtenerSolicitud()); }
    catch { setSolicitud(null); setError('No se pudo consultar el estado de tu solicitud. Volvé a intentar.'); }
    finally { setLoading(false); }
  }, [pideSolicitud, proveedor]);
  useEffect(() => { cargar(); }, [cargar, tienda?.id]);
  useEffect(() => {
    if (abrirValidacion && aprobado) setVista('validacion');
  }, [abrirValidacion, aprobado]);

  return <article className="logistica-provider">
    <div className="logistica-provider-main">
      {/* Si todavía no está el archivo del logo, mejor la inicial que una imagen rota. */}
      <div className="logistica-logo">
        <img src={proveedor.logo} alt={proveedor.nombre}
          onError={evento => { evento.currentTarget.hidden = true; evento.currentTarget.parentElement.dataset.inicial = proveedor.nombre.trim()[0]; }} />
      </div>
      <div className="logistica-provider-copy"><h3>{proveedor.nombre}</h3><p>{proveedor.descripcion}</p>
        <ul className="logistica-tags" aria-label="Servicios que ofrece">{proveedor.etiquetas.map(etiqueta => <li key={etiqueta}>{etiqueta}</li>)}</ul>
        <p className="logistica-provider-data">{proveedor.datoDestacado}</p>
      </div>
      <button type="button" className="raha-icon" aria-label={`Actualizar estado de ${proveedor.nombre}`} disabled={loading} onClick={() => { cargar(); onEstadoChange?.(); }}><RefreshCw size={16} /></button>
    </div>
    {error && <p className="raha-alert raha-error" role="alert">{error}</p>}
    {pideSolicitud && <div className="logistica-application">
      <div><span className="logistica-step">1. Solicitud de afiliación</span><p role="status">{loading ? 'Consultando solicitud…' : proveedor.estados[solicitud?.estado] || 'Estado no disponible'}</p></div>
      <button type="button" className="raha-button raha-primary" disabled={loading || !solicitud} aria-expanded={vista === 'solicitud'} onClick={() => setVista(vista === 'solicitud' ? 'resumen' : 'solicitud')}>
        {solicitud?.estado === 'borrador' ? `Iniciar afiliación a ${proveedor.nombre}` : 'Ver solicitud'}<ArrowRight size={16} />
      </button>
    </div>}
    {pideSolicitud && vista === 'solicitud' && <div className="logistica-detail"><Solicitud tienda={tienda} onSolicitudChange={actualizarSolicitud} /></div>}
    <div className="logistica-validation">
      <div><span className="logistica-step">{pideSolicitud ? '2. Validación de cuenta' : 'Validación de cuenta'}</span><strong>{aprobado ? 'Validación pendiente' : 'Pendiente de aprobación'}</strong>
        <p>{aprobado
          ? pideSolicitud
            ? 'Ingresá tus claves, completá las pruebas y solicitá la habilitación en producción.'
            : `Cargá la clave que te dio ${proveedor.nombre}, registrá tu comercio y activá los envíos.`
          : `Primero enviá tu documentación y esperá la aprobación de ${proveedor.nombre}.`}</p>
      </div>
      <span className="logistica-validation-action" tabIndex={!aprobado ? 0 : undefined} aria-describedby={!aprobado ? `logistica-bloqueo-${proveedor.id}` : undefined}>
        <button type="button" className="raha-button" disabled={!aprobado || loading} aria-expanded={vista === 'validacion' && aprobado} onClick={() => setVista(vista === 'validacion' ? 'resumen' : 'validacion')}><ShieldCheck size={16} />Validar cuenta</button>
        {!aprobado && <span role="tooltip" id={`logistica-bloqueo-${proveedor.id}`} className="logistica-tooltip">{motivoBloqueo}</span>}
      </span>
    </div>
    {vista === 'validacion' && aprobado && <div className="logistica-detail logistica-validation-detail">
      <button type="button" className="raha-button" onClick={() => setVista('resumen')}><ArrowLeft size={16} />Volver al proveedor</button>
      <Validacion onConfigChange={onEstadoChange} />
    </div>}
  </article>;
}

export default function ConexionLogistica({ tienda, abrirValidacion = false, onEstadoChange }) {
  return <div className="logistica"><p className="logistica-intro">Elegí un proveedor para conectar tu tienda. Cada uno revisará tu documentación antes de habilitar la validación de tu cuenta.</p>
    {/* `abrirValidacion` viene del enlace viejo ?tab=speedbox, que es de
        Rahá: no tiene que abrir la validación de los demás proveedores. */}
    <div className="logistica-providers">{PROVEEDORES.map(proveedor => <ProveedorLogistico key={`${tienda?.id || ''}-${proveedor.id}`} onEstadoChange={onEstadoChange} proveedor={proveedor} tienda={tienda} abrirValidacion={abrirValidacion && proveedor.id === 'raha'} />)}</div>
  </div>;
}
