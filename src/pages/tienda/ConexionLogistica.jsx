import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Package, RefreshCw, ShieldCheck } from 'lucide-react';
import { rahaService } from '../../services/rahaService';
import RahaConexion, { ESTADOS_RAHA } from './RahaConexion';
import SpeedboxConfig from './SpeedboxConfig';
import './conexion-logistica.css';

// Cada proveedor declara sus propias pantallas de solicitud y validación.
const PROVEEDORES = [{
  id: 'raha', nombre: 'Rahá', logo: '/providers/raha.png',
  descripcion: 'Productos y logística para abastecer tu tienda y entregar a tus clientes.',
  beneficios: [{ icono: Package, texto: 'Más de 3.500 productos' }, { icono: Clock3, texto: 'Entregas de 24 a 48 horas' }],
  obtenerSolicitud: rahaService.obtener, estados: ESTADOS_RAHA,
  solicitudAprobada: solicitud => solicitud?.estado === 'aprobada',
  Solicitud: RahaConexion, Validacion: SpeedboxConfig,
}];

function ProveedorLogistico({ proveedor, tienda, abrirValidacion = false }) {
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] = useState('resumen');
  const { Solicitud, Validacion } = proveedor;
  const aprobado = proveedor.solicitudAprobada(solicitud);
  const motivoBloqueo = `${proveedor.nombre} tiene que aprobar tu solicitud para que puedas acceder a este siguiente paso y validar tu cuenta.`;
  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try { setSolicitud(await proveedor.obtenerSolicitud()); }
    catch { setSolicitud(null); setError('No se pudo consultar el estado de tu solicitud. Volvé a intentar.'); }
    finally { setLoading(false); }
  }, [proveedor]);
  useEffect(() => { cargar(); }, [cargar, tienda?.id]);
  useEffect(() => {
    if (abrirValidacion && aprobado) setVista('validacion');
  }, [abrirValidacion, aprobado]);

  return <article className="logistica-provider">
    <div className="logistica-provider-main">
      <div className="logistica-logo"><img src={proveedor.logo} alt={proveedor.nombre} /></div>
      <div className="logistica-provider-copy"><h3>{proveedor.nombre}</h3><p>{proveedor.descripcion}</p>
        <ul className="logistica-benefits">{proveedor.beneficios.map(({ icono: Icono, texto }) => <li key={texto}><Icono size={17} />{texto}</li>)}</ul>
      </div>
      <button type="button" className="raha-icon" aria-label={`Actualizar estado de ${proveedor.nombre}`} disabled={loading} onClick={cargar}><RefreshCw size={16} /></button>
    </div>
    {error && <p className="raha-alert raha-error" role="alert">{error}</p>}
    <div className="logistica-application">
      <div><span className="logistica-step">1. Solicitud de conexión</span><p role="status">{loading ? 'Consultando solicitud…' : proveedor.estados[solicitud?.estado] || 'Estado no disponible'}</p></div>
      <button type="button" className="raha-button raha-primary" disabled={loading || !solicitud} aria-expanded={vista === 'solicitud'} onClick={() => setVista(vista === 'solicitud' ? 'resumen' : 'solicitud')}>
        {solicitud?.estado === 'borrador' ? `Conectarme a ${proveedor.nombre}` : 'Ver solicitud'}<ArrowRight size={16} />
      </button>
    </div>
    {vista === 'solicitud' && <div className="logistica-detail"><Solicitud tienda={tienda} onSolicitudChange={setSolicitud} /></div>}
    <div className="logistica-validation">
      <div><span className="logistica-step">2. Validación de cuenta</span><strong>{aprobado ? 'Validación pendiente' : 'Pendiente de aprobación'}</strong>
        <p>{aprobado ? 'Ingresá tus claves, completá las pruebas y solicitá la habilitación en producción.' : `Primero enviá tu documentación y esperá la aprobación de ${proveedor.nombre}.`}</p>
      </div>
      <span className="logistica-validation-action" tabIndex={!aprobado ? 0 : undefined} aria-describedby={!aprobado ? `logistica-bloqueo-${proveedor.id}` : undefined}>
        <button type="button" className="raha-button" disabled={!aprobado || loading} aria-expanded={vista === 'validacion' && aprobado} onClick={() => setVista(vista === 'validacion' ? 'resumen' : 'validacion')}><ShieldCheck size={16} />Validar cuenta</button>
        {!aprobado && <span role="tooltip" id={`logistica-bloqueo-${proveedor.id}`} className="logistica-tooltip">{motivoBloqueo}</span>}
      </span>
    </div>
    {vista === 'validacion' && aprobado && <div className="logistica-detail logistica-validation-detail">
      <button type="button" className="raha-button" onClick={() => setVista('resumen')}><ArrowLeft size={16} />Volver al proveedor</button>
      <Validacion />
    </div>}
  </article>;
}

export default function ConexionLogistica({ tienda, abrirValidacion = false }) {
  return <div className="logistica"><p className="logistica-intro">Elegí un proveedor para conectar tu tienda. Cada uno revisará tu documentación antes de habilitar la validación de tu cuenta.</p>
    <div className="logistica-providers">{PROVEEDORES.map(proveedor => <ProveedorLogistico key={`${tienda?.id || ''}-${proveedor.id}`} proveedor={proveedor} tienda={tienda} abrirValidacion={abrirValidacion} />)}</div>
  </div>;
}
