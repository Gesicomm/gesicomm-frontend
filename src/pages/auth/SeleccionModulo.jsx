import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Megaphone, ArrowRight, ShieldCheck, LockKeyhole } from 'lucide-react';
import useSesion from '../../hooks/useSesion';
import useRutasPlan from '../../hooks/useRutasPlan';
import { PantallaErrorConexion, PantallaVerificandoSesion } from '../../components/EstadoSesion';
import { MARCA_PERSONAL_URL } from '../../lib/marcaPersonal';

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
  return <main className="gc-panel flex min-h-screen flex-col items-center justify-center bg-canvas p-6 text-fg">
    <header className="mb-8 text-center"><h1 className="text-3xl font-bold mb-3">¡Hola, {usuario?.nombre || 'Usuario'}!</h1>
      <p className="text-fg-muted">Elegí el espacio incluido en tu plan con el que querés trabajar.</p></header>
    <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl">
      {usuario?.rol === 'administrador' && <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 rounded-xl border border-border bg-surface p-8 text-left">
        <ShieldCheck size={32} aria-hidden="true" /><h2 className="my-4">Administración</h2><p>Gestioná Gesicom, las solicitudes y los códigos de acceso.</p><span>Entrar al panel <ArrowRight size={16} className="inline" /></span>
      </button>}
      {[{ruta:'fisico',nombre:'Gestión de E-commerce',Icon:ShoppingCart,texto:'Administrá tu tienda, productos, pedidos, logística, finanzas y anuncios.'},
        {ruta:'personal',nombre:'Marca Personal',Icon:Megaphone,texto:'Gestioná contenido, publicaciones, CRM y automatización de tu marca.'}].map(({ruta,nombre,Icon,texto}) => {
        const permitido = acceso.rutas[ruta];
        return <section className="flex-1 rounded-xl border border-border bg-surface p-8" key={ruta}>
          <Icon size={32} className={permitido ? 'text-primary-text' : 'text-fg-muted'} aria-hidden="true" />
          <h2 className="my-4">{nombre}</h2>{!permitido && <p className="text-sm text-fg-muted mb-3">No incluido en tu plan actual</p>}<p className="mb-6 text-fg-muted">{texto}</p>
          <button type="button" onClick={() => seleccionar(ruta)}
            className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-base font-semibold ${permitido ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface-2 text-fg hover:border-primary hover:text-primary-text'}`}>
            {permitido ? <>Entrar a {nombre} <ArrowRight size={16} aria-hidden="true" /></> : <><LockKeyhole size={17} aria-hidden="true" />Ver planes para {nombre}</>}
          </button>
        </section>;
      })}
    </div>
    {(!acceso.rutas.fisico || !acceso.rutas.personal) && <p className="mt-6 text-center text-fg-muted">Podés consultar las opciones para ampliar tu acceso. <Link to="/planes" className="text-primary-text underline">Ver planes</Link></p>}
  </main>;
}
