import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { cerrarSesion, verificarSesion } from '../utils/auth';
import { destinoColaborador } from '../utils/accesos';
import '../components/personasPermisos.css';

export function AceptarInvitacion() {
  const [token] = useState(() => window.location.hash.slice(1));
  const [datos, setDatos] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aceptado, setAceptado] = useState(false);
  useEffect(() => {
    // El enlace usa fragmento: el token no se envía en Referer ni logs HTTP.
    api.post('/api/personas/invitacion', { token }).then(setDatos).catch(e => setError(e.message));
  }, [token]);
  async function aceptar(e) {
    e.preventDefault(); setOcupado(true); setError('');
    try { await api.post('/api/personas/aceptar', { token, password }); setPassword(''); setAceptado(true); window.history.replaceState(null, '', window.location.pathname); }
    catch (e) { setError(e.message); } finally { setOcupado(false); }
  }
  return <main className="gc-panel personas-permisos" style={{ maxWidth:640, margin:'40px auto', padding:24 }}>
    <h1>Acceso al equipo</h1>
    {error && <p role="alert">{error}</p>}
    {aceptado ? <><p role="status">Tu acceso está activo. Iniciá sesión con tu correo y contraseña.</p><Link to="/login">Iniciar sesión</Link></> : datos ? <form onSubmit={aceptar}>
      <p>{datos.nombre}, te invitaron a trabajar en <strong>{datos.tienda}</strong> con el correo {datos.email}.</p>
      <ul>{datos.modulos.filter(m => datos.permisos[m.clave]).map(m => <li key={m.clave}>{m.nombre}: {datos.permisos[m.clave] === 'ver' ? 'solo ver' : 'ver y gestionar'}</li>)}</ul>
      <label>{datos.existente ? 'Tu contraseña actual' : 'Creá tu contraseña'}<input type="password" autoComplete={datos.existente ? 'current-password' : 'new-password'} minLength={8} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <p className="personas-ayuda">Entre 8 y 72 caracteres, con una mayúscula y un número.</p>
      <button className="meta-connect-btn" disabled={ocupado}>{ocupado ? 'Activando…' : 'Aceptar invitación'}</button>
    </form> : !error && <p>Cargando invitación…</p>}
  </main>;
}

export function TiendasColaborador() {
  const [tiendas, setTiendas] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { api.get('/api/tiendas/mias').then(setTiendas).catch(e => setError(e.message)); }, []);
  async function elegir(id) {
    setOcupado(true); setError('');
    try { await api.post('/api/auth/seleccionar-tienda', { tienda_id:id }); const usuario = await verificarSesion(); navigate(destinoColaborador(usuario), { replace:true }); }
    catch(e) { setError(e.message); } finally { setOcupado(false); }
  }
  return <main className="gc-panel personas-permisos" style={{ maxWidth:640, margin:'40px auto', padding:24 }}><h1>Tus tiendas autorizadas</h1>
    <p>Elegí dónde querés trabajar.</p>{error && <p role="alert">{error}</p>}
    {tiendas === null && !error && <p>Cargando tiendas…</p>}
    {tiendas?.length === 0 && <p>No tenés accesos activos. Pedí al propietario que te invite.</p>}
    <div className="personas-acciones">{tiendas?.map(t => <button key={t.id} disabled={ocupado} onClick={() => elegir(t.id)}>{t.nombre}</button>)}</div>
    <button style={{marginTop:24}} onClick={async () => { await cerrarSesion(); window.location.href='/login'; }}>Cerrar sesión</button>
  </main>;
}

export function SinAcceso() {
  return <main className="gc-panel personas-permisos" style={{padding:24}}><h1>Sin acceso a esta sección</h1><p>El propietario puede actualizar tus permisos.</p><Link to="/acceso-tiendas">Elegir otra tienda</Link></main>;
}
