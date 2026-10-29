import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, AlertTriangle, CreditCard, GraduationCap, KeyRound, RefreshCw, ShieldCheck, Users, Activity, UserPlus, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authTrackingService } from '../../services/authTrackingService';
import './AdminDashboard.css';

const numero = value => Number(value || 0).toLocaleString('es-PY');
const monto = value => new Intl.NumberFormat('es-PY', {style:'currency',currency:'PYG',maximumFractionDigits:0}).format(Number(value || 0));
const ACCIONES = [
  {path:'/admin/codigos-prueba',icon:KeyRound,title:'Dar acceso de prueba',text:'Elegí el plan y los días. Enviá el código por correo.'},
  {path:'/admin/planes',icon:CreditCard,title:'Administrar planes',text:'Precios, duración y espacios incluidos.'},
  {path:'/admin/tutoriales',icon:GraduationCap,title:'Actualizar tutoriales',text:'Cargá los videos de cada sección del sistema.'},
  {path:'/admin/solicitudes-web',icon:MessageSquare,title:'Revisar solicitudes',text:'Atendé consultas y solicitudes de acceso de la landing.'},
];
function Indicador({icon:Icon,label,value,note}) {
  return <article className="admin-home-stat"><span className="admin-home-stat-icon"><Icon size={20} aria-hidden="true" /></span><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
export default function AdminDashboard() {
  const [dias,setDias]=useState(30);
  const [datos,setDatos]=useState({resumen:null,pagos:null});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [actualizado,setActualizado]=useState(null);
  const requestId=useRef(0);
  const cargar=useCallback(async()=>{
    const id=++requestId.current;
    setLoading(true);setError('');
    const [resumen,pagos]=await Promise.allSettled([authTrackingService.resumen(dias),authTrackingService.resumenPagosAdmin(dias)]);
    if(id!==requestId.current)return;
    setDatos({resumen:resumen.status==='fulfilled'?resumen.value:null,pagos:pagos.status==='fulfilled'?pagos.value:null});
    if(resumen.status==='rejected'||pagos.status==='rejected')setError('No pudimos cargar todos los datos. Los indicadores sin información aparecen con un guion. Podés volver a intentar.');
    setActualizado(new Date());setLoading(false);
  },[dias]);
  useEffect(()=>{cargar();return()=>{requestId.current++;};},[cargar]);
  const resumen=datos.resumen;
  // Separar los cobros del sistema de las ventas o el abastecimiento de tiendas.
  const suscripciones=datos.pagos?.tipos?.find(tipo=>tipo.tipo==='suscripciones');
  const pagado=suscripciones?.estados?.PAID;
  const pendientes=suscripciones?.estados?.PENDING;
  const fallidos=suscripciones?.estados?.FAILED;
  const valor=(obj,campo)=>obj ? numero(obj[campo]) : '—';
  const etapas=[['Registros',resumen?.registros_periodo],['Onboarding iniciado',resumen?.onboarding_iniciados_periodo],['Landing generada',resumen?.onboarding_landings_periodo]];
  const maximo=Math.max(1,...etapas.map(([,cantidad])=>Number(cantidad)||0));
  return <div className="admin-home" aria-busy={loading}>
    <header className="admin-home-heading"><div><span className="admin-home-eyebrow"><ShieldCheck size={16} aria-hidden="true" /> Administración de Gesicom</span><h1>Una mirada al sistema</h1><p>Usuarios, accesos y suscripciones. Todo lo que necesitás para administrar la plataforma.</p></div>
      <div className="admin-home-controls"><label><span>Período</span><select value={dias} onChange={e=>{setDatos({resumen:null,pagos:null});setDias(Number(e.target.value));}}><option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option></select></label><button type="button" onClick={cargar} disabled={loading}><RefreshCw size={17} className={loading?'admin-home-spin':''} aria-hidden="true" /> Actualizar</button></div>
    </header>
    {error&&<p role="alert" className="admin-home-error"><AlertTriangle size={20} aria-hidden="true" />{error}</p>}
    <div className="admin-home-freshness" role="status">{loading?'Actualizando indicadores…':error?'Actualización incompleta':`Actualizado a las ${actualizado?.toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'})}`}</div>
    <section className="admin-home-stats" aria-label="Resumen del sistema">
      <Indicador icon={Users} label="Usuarios del sistema" value={valor(resumen,'usuarios_total')} note={resumen?`${numero(resumen.usuarios_verificados)} con correo verificado`:'Sin datos disponibles'} />
      <Indicador icon={UserPlus} label="Nuevos registros" value={valor(resumen,'registros_periodo')} note={`En los últimos ${dias} días`} />
      <Indicador icon={Activity} label="Sesiones activas" value={valor(resumen,'sesiones_activas')} note="Actividad reciente en la plataforma" />
      <Indicador icon={CreditCard} label="Cobrado en suscripciones" value={pagado?monto(pagado.bruto):'—'} note={pagado?`${numero(pagado.cantidad)} pagos confirmados · importe bruto`:'Sin datos disponibles'} />
    </section>
    <div className="admin-home-columns">
      <section className="admin-home-panel"><header className="admin-home-panel-heading"><div><h2>Tu mesa de trabajo</h2><p>Las tareas de administración, a un clic.</p></div></header><div className="admin-home-shortcuts">{ACCIONES.map(({path,icon:Icon,title,text})=><Link to={path} key={path}><span className="admin-home-shortcut-icon"><Icon size={22} aria-hidden="true" /></span><span><strong>{title}</strong><span>{text}</span></span><ArrowRight size={18} aria-hidden="true" /></Link>)}</div></section>
      <section className="admin-home-panel"><header className="admin-home-panel-heading"><div><h2>Para revisar</h2><p>Seguimiento de accesos y cobros.</p></div></header><div className="admin-home-review">
        {[
          ['/admin/tracking-onboarding','Correos sin verificar','Total de cuentas pendientes',valor(resumen,'usuarios_pendientes')],
          ['/admin/tracking-pagos','Pagos pendientes','Suscripciones del período',valor(pendientes,'cantidad')],
          ['/admin/tracking-pagos','Pagos rechazados','Suscripciones del período',valor(fallidos,'cantidad')],
          ['/admin/tracking-onboarding','Fallos registrados','Acceso y onboarding del período',valor(resumen,'fallos_periodo')],
        ].map(([path,label,note,cantidad])=><Link to={path} key={label}><span>{label}<small>{note}</small></span><strong>{cantidad}</strong><ArrowRight size={17} aria-hidden="true" /></Link>)}
      </div></section>
    </div>
    <section className="admin-home-panel"><header className="admin-home-panel-heading"><div><h2>Primeros pasos de los usuarios</h2><p>Eventos registrados en los últimos {dias} días. Una persona puede generar más de un evento.</p></div><Link to="/admin/tracking-onboarding">Ver actividad <ArrowRight size={17} aria-hidden="true" /></Link></header><div className="admin-home-steps">{etapas.map(([label,cantidad],index)=><div key={label}><span className="admin-home-step-label"><span>{index+1}. {label}</span><strong>{resumen?numero(cantidad):'—'}</strong></span><span className="admin-home-track" aria-hidden="true"><span style={{width:`${resumen?Math.max(0,Number(cantidad)||0)/maximo*100:0}%`}} /></span></div>)}</div></section>
  </div>;
}
