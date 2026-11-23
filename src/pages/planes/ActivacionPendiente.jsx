import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { planesService } from '../../services/planesService';
import Logo from '../../components/public/Logo';
import CorreoActivacionPendiente from './CorreoActivacionPendiente';
import './planes.css';

export default function ActivacionPendiente() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = location.state?.comprobante || '';
  const [cuenta, setCuenta] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let vigente = true;
    setError('');
    if (!token) { setError('Abrí esta página desde la confirmación de tu compra. Si ya activaste tu cuenta, iniciá sesión.'); return; }
    planesService.validarToken(token).then(datos => { if (vigente) setCuenta(datos); }).catch(() => {
      if (vigente) setError('Esta cuenta ya fue activada o el comprobante venció. Iniciá sesión o contactá a soporte.');
    });
    return () => { vigente = false; };
  }, [token]);
  const actualizar = datos => {
    setCuenta(prev => ({ ...prev, ...datos }));
    navigate('/activar-cuenta', { replace: true, state: { comprobante: datos.token_registro } });
  };
  return <main className="gc-panel pl-page pl-resultado">
    <Link to="/" aria-label="Gesicom, ir al inicio"><Logo fondoPanel="tema" size={38} /></Link>
    <div className="pl-estado ok">
      <h1>Tu acceso está listo</h1>
      <p>Un último paso para comenzar a usar Gesicom.</p>
      {error ? <><p role="alert">{error}</p><Link to="/login">Iniciar sesión</Link></> : cuenta ?
        <CorreoActivacionPendiente email={cuenta.email} token={token} onActualizar={actualizar} /> : <p role="status">Verificando tu compra…</p>}
    </div>
  </main>;
}
