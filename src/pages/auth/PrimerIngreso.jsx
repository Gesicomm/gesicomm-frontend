import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import useSesion from '../../hooks/useSesion';
import { PantallaErrorConexion, PantallaVerificandoSesion } from '../../components/EstadoSesion';
import './PrimerIngreso.css';

export default function PrimerIngreso() {
  const navigate = useNavigate();
  const location = useLocation();
  const sesion = useSesion();
  const [enviando, setEnviando] = useState('');
  const [error, setError] = useState('');

  if (sesion.estado === 'verificando') return <PantallaVerificandoSesion onReintentar={sesion.reintentar} />;
  if (sesion.estado === 'error') return <PantallaErrorConexion onReintentar={sesion.reintentar} />;

  const elegir = async tipo => {
    if (enviando) return;
    setEnviando(tipo);
    setError('');
    try {
      await API.post('/auth/primer-ingreso', { tipo });
      if (tipo === 'proveedor') {
        navigate('/proveedor', { replace: true });
        return;
      }
      navigate(location.state?.destino || '/seleccionar-modulo', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos guardar tu elección. Volvé a intentar.');
    } finally {
      setEnviando('');
    }
  };

  return <main className="gc-panel first-entry min-h-screen bg-canvas text-fg">
    <section className="first-entry__content" aria-labelledby="first-entry-title">
      <header className="first-entry__header">
        <span className="first-entry__eyebrow">Primer paso</span>
        <h1 id="first-entry-title">¿Cómo querés usar Gesicom?</h1>
        <p>Elegí el camino que mejor describe lo que querés hacer hoy. Después vas a poder conocer otras opciones.</p>
      </header>

      <div className="first-entry__options">
        <button type="button" className="first-entry__option" onClick={() => elegir('usuario')} disabled={Boolean(enviando)}>
          <span className="first-entry__icon"><UserRound size={29} aria-hidden="true" /></span>
          <span className="first-entry__kind">Quiero usar Gesicom</span>
          <strong>Crear y gestionar mi negocio</strong>
          <span>Vendé productos, ofrecé servicios o desarrollá tu marca desde tus espacios de trabajo.</span>
          <span className="first-entry__action">{enviando === 'usuario' ? 'Guardando…' : 'Continuar con Gesicom'} <ArrowRight size={19} aria-hidden="true" /></span>
        </button>

        <button type="button" className="first-entry__option first-entry__option--provider" onClick={() => elegir('proveedor')} disabled={Boolean(enviando)}>
          <span className="first-entry__icon"><BriefcaseBusiness size={29} aria-hidden="true" /></span>
          <span className="first-entry__kind">Quiero ser proveedor</span>
          <strong>Ofrecer mis servicios a la comunidad</strong>
          <span>Postulate para ofrecer logística, publicidad, edición, desarrollo u otros servicios a negocios en Gesicom.</span>
          <span className="first-entry__action">{enviando === 'proveedor' ? 'Guardando…' : 'Completar mi postulación'} <ArrowRight size={19} aria-hidden="true" /></span>
        </button>
      </div>

      <p className="first-entry__help">Si elegís proveedor, primero revisaremos tu postulación antes de incorporarte al ecosistema.</p>
      {error && <p className="first-entry__error" role="alert">{error}</p>}
    </section>
  </main>;
}
