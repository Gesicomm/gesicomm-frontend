import { useId, useState } from 'react';
import { Mail, Pencil, ArrowRight } from 'lucide-react';
import { planesService } from '../../services/planesService';
import './correoActivacion.css';

export default function CorreoActivacionPendiente({ email, token, onActualizar }) {
  const id = useId();
  const [editando, setEditando] = useState(false);
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const iniciarEdicion = () => { setNuevoCorreo(email || ''); setConfirmacion(''); setEditando(true); setError(''); setAviso(''); };
  const reenviar = async () => {
    setEnviando(true); setError(''); setAviso('');
    try { setAviso((await planesService.reenviarActivacion(token)).message); }
    catch (err) { setError(err.response?.data?.message || 'No pudimos reenviar el enlace. Volvé a intentar en unos minutos.'); }
    finally { setEnviando(false); }
  };
  const guardar = async event => {
    event.preventDefault();
    const correo = nuevoCorreo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { setError('Ingresá un correo electrónico válido.'); return; }
    if (correo !== confirmacion.trim().toLowerCase()) { setError('Los correos no coinciden. Revisalos antes de continuar.'); return; }
    setEnviando(true); setError(''); setAviso('');
    try {
      const datos = await planesService.corregirCorreoActivacion(token, correo);
      onActualizar(datos);
      setEditando(false); setAviso(datos.message);
    } catch (err) { setError(err.response?.data?.message || 'No pudimos cambiar el correo. Volvé a intentar.'); }
    finally { setEnviando(false); }
  };
  return <section className="gc-activation-email" aria-labelledby={`${id}-titulo`}>
    <Mail size={25} aria-hidden="true" />
    <h2 id={`${id}-titulo`}>Revisá tu correo para activar tu cuenta</h2>
    <p>El enlace de activación llegará a:</p>
    <strong className="gc-activation-email__address">{email}</strong>
    <p>Revisá que esté bien escrito. A esta dirección te enviaremos el enlace para verificar tu correo y crear tu contraseña.</p>
    <p className="gc-activation-email__help">Buscalo también en Spam o Correo no deseado. Tu compra queda guardada aunque cierres esta página.</p>
    {!editando ? <div className="gc-activation-email__actions">
      <button type="button" className="gc-activation-email__primary" disabled={enviando} onClick={reenviar}>{enviando ? 'Enviando enlace…' : 'Reenviar enlace'} <ArrowRight size={17} aria-hidden="true" /></button>
      <button type="button" className="gc-activation-email__secondary" disabled={enviando} onClick={iniciarEdicion}><Pencil size={16} aria-hidden="true" /> Cambiar correo</button>
    </div> : <form onSubmit={guardar} className="gc-activation-email__form">
      <label htmlFor={`${id}-correo`}>Nuevo correo electrónico</label>
      <input id={`${id}-correo`} type="email" autoComplete="email" required maxLength={254} value={nuevoCorreo} onChange={event => setNuevoCorreo(event.target.value)} disabled={enviando} aria-describedby={`${id}-ayuda`} />
      <label htmlFor={`${id}-confirmacion`}>Repetí el nuevo correo</label>
      <input id={`${id}-confirmacion`} type="email" autoComplete="off" required maxLength={254} value={confirmacion} onChange={event => setConfirmacion(event.target.value)} disabled={enviando} />
      <p id={`${id}-ayuda`} className="gc-activation-email__help">Enviaremos un enlace al nuevo correo. El enlace anterior dejará de funcionar.</p>
      <div className="gc-activation-email__actions">
        <button type="submit" className="gc-activation-email__primary" disabled={enviando}>{enviando ? 'Guardando y enviando…' : 'Guardar correo y enviar enlace'}</button>
        <button type="button" className="gc-activation-email__secondary" disabled={enviando} onClick={() => { setEditando(false); setError(''); }}>Cancelar</button>
      </div>
    </form>}
    {aviso && <p role="status" className="gc-activation-email__notice">{aviso}</p>}
    {error && <p role="alert" className="gc-activation-email__error">{error}</p>}
  </section>;
}
