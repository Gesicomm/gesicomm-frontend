import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Megaphone, ArrowRight, ShieldCheck, LockKeyhole } from 'lucide-react';
import useSesion from '../../hooks/useSesion';
import useRutasPlan from '../../hooks/useRutasPlan';
import { PantallaErrorConexion, PantallaVerificandoSesion } from '../../components/EstadoSesion';
import { MARCA_PERSONAL_URL } from '../../lib/marcaPersonal';
import './SeleccionModulo.css';

export default function SeleccionModulo() {
  const navigate = useNavigate();
  const sesion = useSesion();
  const acceso = useRutasPlan(sesion.usuario);
  const usuario = sesion.usuario;
  if (sesion.estado === 'verificando' || acceso.estado === 'cargando') return <PantallaVerificandoSesion onReintentar={acceso.reintentar} />;
  if (sesion.estado === 'error' || acceso.estado === 'error') return <PantallaErrorConexion onReintentar={acceso.reintentar} />;
  const seleccionar = ruta => {
    if (!acceso.rutas[ruta]) {
      navigate('/planes', { state: { rutaRequerida: ruta } });
      return;
    }
    sessionStorage.setItem('moduloActivo', ruta === 'fisico' ? 'ecommerce' : 'marca_personal');
    if (ruta === 'fisico') navigate('/mi-dashboard');
    else window.location.assign(MARCA_PERSONAL_URL);
  };
  return <main className="gc-panel module-picker min-h-screen bg-canvas text-fg">
    <div className="module-picker__content">
    <header className="module-picker__header">
      <span className="module-picker__eyebrow">Tu espacio de trabajo</span>
      <h1>¡Hola, {usuario?.nombre || 'Usuario'}!</h1>
      <p>Elegí el espacio incluido en tu plan con el que querés trabajar.</p>
    </header>
    <div className="module-picker__grid">
      {usuario?.rol === 'administrador' && <button type="button" onClick={() => navigate('/dashboard')} className="module-card module-card--admin">
        <span className="module-card__icon"><ShieldCheck size={28} aria-hidden="true" /></span>
        <span className="module-card__status">Administración</span>
        <span className="module-card__title">Panel de administración</span>
        <span className="module-card__description">Gestioná Gesicom, las solicitudes y los códigos de acceso.</span>
        <span className="module-card__action">Entrar al panel <ArrowRight size={19} aria-hidden="true" /></span>
      </button>}
      {[{ruta:'fisico',nombre:'Gestión de E-commerce',Icon:ShoppingCart,texto:'Administrá tu tienda, productos, pedidos, logística, finanzas y anuncios.'},
        {ruta:'personal',nombre:'Marca Personal',Icon:Megaphone,texto:'Gestioná contenido, publicaciones, CRM y automatización de tu marca.'}].map(({ruta,nombre,Icon,texto}) => {
        const permitido = acceso.rutas[ruta];
        const accion = permitido ? `Entrar a ${nombre}` : `Ver planes para ${nombre}`;
        return <section className={`module-card ${permitido ? 'module-card--available' : 'module-card--locked'}`} key={ruta}>
          <span className="module-card__icon"><Icon size={28} aria-hidden="true" /></span>
          <span className="module-card__status">{permitido ? 'Acceso incluido' : 'Otro espacio'}</span>
          <h2 className="module-card__title">{nombre}</h2>
          {!permitido && <p className="module-card__notice">No incluido en tu plan actual</p>}
          <p className="module-card__description" id={`module-description-${ruta}`}>{texto}</p>
          <span className="module-card__action" aria-hidden="true">
            {!permitido && <LockKeyhole size={17} />}{accion}<ArrowRight size={19} className="module-card__arrow" />
          </span>
          <button type="button" className="module-card__hit" onClick={() => seleccionar(ruta)} aria-label={accion} aria-describedby={`module-description-${ruta}`} />
        </section>;
      })}
    </div>
    {(!acceso.rutas.fisico || !acceso.rutas.personal) && <p className="module-picker__footer">Podés consultar las opciones para ampliar tu acceso. <Link to="/planes">Ver planes</Link></p>}
    </div>
  </main>;
}
