import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Users, Plus, Eye, EyeOff, ShieldCheck, Search, X } from 'lucide-react';
import { api } from '../utils/api';
import './personasPermisos.css';

export default function PersonasPermisos() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [revocar, setRevocar] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [pestana, setPestana] = useState('datos');
  const dialogo = useRef(null);
  const inicial = useRef('');
  const disparador = useRef(null);
  const abierto = Boolean(form);
  useEffect(() => {
    if (!abierto) return;
    const modal = dialogo.current;
    modal.showModal();
    modal.querySelector('input:not(:disabled)')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      modal.close();
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => disparador.current?.focus());
    };
  }, [abierto]);
  function cerrar() {
    if (ocupado) return;
    if (JSON.stringify(form) !== inicial.current) setConfirmarSalida(true);
    else setForm(null);
  }
  function mantenerFoco(e) {
    if (e.key !== 'Tab') return;
    const controles = [...dialogo.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
    const primero = controles[0], ultimo = controles[controles.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo?.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
  }
  const normalizar = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtrados = (datos?.modulos || []).filter(m => normalizar(`${m.nombre} ${m.seccion || ''}`).includes(normalizar(busqueda.trim())));
  async function cargar() {
    setError('');
    try { setDatos(await api.get('/api/personas')); } catch (e) { setError(e.message); }
  }
  useEffect(() => { cargar(); }, []);
  async function guardar(e) {
    e.preventDefault(); setOcupado(true); setError(''); setMensaje('');
    try {
      if (!form.id && form.password !== form.confirmacion) throw new Error('Las contraseñas no coinciden.');
      if (form.id) await api.patch(`/api/personas/${form.id}`, { permisos: form.permisos, ...(form.estado === 'revocado' ? { estado: 'activo' } : {}) });
      else {
        await api.post('/api/personas', { nombre: form.nombre, email: form.email, password: form.password, permisos: form.permisos });
      }
      setMensaje(form.id ? 'Acceso actualizado. Se aplica en la próxima acción de la persona.' : 'Cuenta creada. Ya puede ingresar con el correo y la contraseña que definiste.');
      setForm(null); await cargar();
    } catch (e) { setError(e.message); } finally { setOcupado(false); }
  }
  async function confirmarRevocacion() {
    setOcupado(true); setError('');
    try {
      await api.patch(`/api/personas/${revocar.id}`, { estado: 'revocado' });
      setRevocar(null); setMensaje('Acceso revocado. La persona ya no puede operar en esta tienda.'); await cargar();
    } catch (e) { setError(e.message); } finally { setOcupado(false); }
  }
  function abrir(persona) {
    disparador.current = document.activeElement;
    setMensaje(''); setError(''); setRevocar(null); setMostrarPassword(false); setBusqueda(''); setConfirmarSalida(false);
    const nuevo = persona ? { ...persona } : { nombre: '', email: '', password: '', confirmacion: '', permisos: { comercial: 'ver' } };
    inicial.current = JSON.stringify(nuevo);
    setPestana(persona ? 'permisos' : 'datos');
    setForm(nuevo);
  }
  return <section className="card personas-permisos" aria-labelledby="personas-titulo">
    <div className="personas-cabecera">
      <div><h2 id="personas-titulo"><Users size={22} /> Personas y permisos</h2>
        <p>Creá las cuentas de tu equipo y elegí qué puede hacer cada persona en {datos?.tienda?.nombre || 'esta tienda'}.</p></div>
      <button type="button" className="meta-connect-btn" disabled={!datos || ocupado || Boolean(form)} onClick={() => abrir()}><Plus size={18} /> Agregar persona</button>
    </div>
    <p className="personas-ayuda"><ShieldCheck size={16} /> Elegí los accesos de esta tienda. Los catálogos, integraciones y programas compartidos conservan su alcance de cuenta. Solo el propietario puede administrar personas.</p>
    {error && !form && <div role="alert" className="personas-error">{error} {!datos && <button type="button" onClick={cargar}>Reintentar</button>}</div>}
    {mensaje && <p role="status">{mensaje}</p>}
    {!datos && !error && <p role="status">Cargando personas…</p>}
    {form && createPortal(<dialog ref={dialogo} className="personas-permisos personas-modal gc-panel" aria-labelledby="persona-modal-titulo" onKeyDown={mantenerFoco} onCancel={e => { e.preventDefault(); cerrar(); }}>
    <form onSubmit={guardar} className="personas-modal-form" onInvalidCapture={e => {
      if (pestana !== 'datos' && e.target.closest('.personas-datos')) {
        e.preventDefault(); setPestana('datos');
        const input = e.target; requestAnimationFrame(() => { input.focus(); input.reportValidity(); });
      }
    }}>
      <header className="personas-modal-cabecera">
        <div><h2 id="persona-modal-titulo">{form.id ? `Permisos de ${form.nombre}` : 'Agregar persona'}</h2><p className="personas-ayuda">{datos?.tienda?.nombre} · Cuenta y accesos del equipo</p></div>
        <button type="button" aria-label="Cerrar ventana" disabled={ocupado} onClick={cerrar}><X size={20} /></button>
      </header>
      <nav className="personas-pestanas" aria-label="Pasos de la persona">
        <button type="button" aria-pressed={pestana === 'datos'} onClick={() => setPestana('datos')}>Datos</button>
        <button type="button" aria-pressed={pestana === 'permisos'} onClick={() => setPestana('permisos')}>Permisos ({Object.keys(form.permisos).length})</button>
      </nav>
      <div className="personas-modal-cuerpo" data-pestana={pestana}>
      <section className="personas-datos" aria-labelledby="persona-datos-titulo">
      <h3 id="persona-datos-titulo">Datos de la persona</h3>
      <div className="personas-campos">
        <label>Nombre<input autoFocus={!form.id} required maxLength={120} value={form.nombre} disabled={ocupado || Boolean(form.id)} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label>
        <label>Correo electrónico<input required type="email" maxLength={254} value={form.email} disabled={ocupado || Boolean(form.id)} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
      </div>
      {!form.id && <>
        <div className="personas-campos" style={{ marginTop: 16 }}>
          <label>Contraseña inicial<input type={mostrarPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} pattern="(?=.*[A-Z])(?=.*[0-9]).{8,72}" value={form.password} disabled={ocupado} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <label>Confirmar contraseña<input type={mostrarPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} value={form.confirmacion} disabled={ocupado} onChange={e => setForm({ ...form, confirmacion: e.target.value })} /></label>
        </div>
        <button type="button" aria-pressed={mostrarPassword} style={{ marginTop: 12 }} onClick={() => setMostrarPassword(v => !v)}>{mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}{mostrarPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}</button>
        <p className="personas-ayuda">Al menos 8 caracteres, una mayúscula y un número. Compartí los datos de acceso con la persona.</p>
      </>}
      <p className="personas-ayuda">Solo ver permite consultar. Ver y gestionar permite realizar cambios. Podés combinar secciones y ajustar los permisos después.</p>
      </section>
      <section className="personas-secciones" aria-labelledby="persona-secciones-titulo">
      <div className="personas-buscador">
        <h3 id="persona-secciones-titulo">Secciones y permisos</h3>
        <label className="personas-busqueda"><span className="sr-only">Buscar secciones</span><Search size={18} aria-hidden="true" />
          <input type="search" autoFocus={Boolean(form.id)} placeholder="Buscar sección…" value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} />
        </label>
        <p className="personas-ayuda" role="status">{filtrados.length} de {datos.modulos.length} secciones · {Object.keys(form.permisos).length} con acceso</p>
      </div>
      <fieldset disabled={ocupado} className="personas-resultados"><legend className="sr-only">Secciones y acciones permitidas</legend>
        {filtrados.map((m, index) => <div key={m.clave}>
          {m.seccion && filtrados[index - 1]?.seccion !== m.seccion && <h4 className="personas-grupo">{m.seccion}</h4>}
          <label className="personas-permiso" key={m.clave}><span>{m.nombre}</span>
          <select aria-label={`Acceso a ${m.nombre}`} value={form.permisos[m.clave] || ''} onChange={e => {
            const permisos = { ...form.permisos }; if (e.target.value) permisos[m.clave] = e.target.value; else delete permisos[m.clave]; setForm({ ...form, permisos });
          }}><option value="">Sin acceso</option><option value="ver">Solo ver</option>{m.gestionable && <option value="gestionar">Ver y gestionar</option>}</select>
        </label></div>)}
      </fieldset>
      {!filtrados.length && <div className="personas-sin-resultados"><p>No hay secciones que coincidan con “{busqueda}”.</p><button type="button" onClick={() => setBusqueda('')}>Limpiar búsqueda</button></div>}
      </section>
      </div>
      <footer className="personas-modal-pie">
        {error && <div role="alert" className="personas-error">{error}</div>}
        {confirmarSalida ? <div className="personas-descartar" role="alert"><p>Tenés cambios sin guardar. ¿Querés descartarlos?</p><div className="personas-acciones"><button type="button" onClick={() => setConfirmarSalida(false)}>Seguir editando</button><button type="button" onClick={() => { setError(''); setForm(null); }}>Descartar cambios</button></div></div> : <div className="personas-pie-acciones">
          <span className="personas-ayuda">{Object.keys(form.permisos).length} secciones con acceso</span>
          <div className="personas-acciones"><button type="button" disabled={ocupado} onClick={cerrar}>Cancelar</button><button className="meta-connect-btn" disabled={ocupado || !Object.keys(form.permisos).length}>{ocupado ? 'Guardando…' : form.id ? (form.estado === 'revocado' ? 'Restablecer acceso' : 'Guardar permisos') : 'Crear persona'}</button></div>
        </div>}
      </footer>
    </form></dialog>, document.body)}
    {datos?.personas.length === 0 && <p className="personas-vacio">Todavía no agregaste personas. Podés dar acceso únicamente a Gestión Comercial, por ejemplo.</p>}
    <div className="personas-lista">{datos?.personas.map(p => <article key={p.id} className="personas-persona">
      <div><h3>{p.nombre}</h3><p>{p.email}</p><span className="personas-estado">{p.estado === 'activo' ? 'Activo' : p.estado === 'revocado' ? 'Sin acceso' : 'Invitación pendiente'}</span>
        <p className="personas-ayuda">{datos.modulos.filter(m => p.permisos[m.clave]).map(m => `${m.nombre}: ${p.permisos[m.clave] === 'gestionar' ? 'gestionar' : 'solo ver'}`).join(' · ')}</p></div>
      <div className="personas-acciones"><button type="button" disabled={ocupado || Boolean(form)} onClick={() => abrir(p)}>{p.estado === 'revocado' ? 'Restablecer acceso' : 'Editar permisos'}</button>
        {p.estado !== 'revocado' && <button type="button" disabled={ocupado} onClick={() => setRevocar(p)}>Revocar acceso</button>}</div>
    </article>)}</div>
    {revocar && <div className="personas-confirmacion" role="alert"><p>¿Revocar el acceso de <strong>{revocar.nombre}</strong> a esta tienda? Sus pedidos e historial se conservan.</p>
      <div className="personas-acciones"><button type="button" disabled={ocupado} onClick={confirmarRevocacion}>Revocar acceso</button><button type="button" disabled={ocupado} onClick={() => setRevocar(null)}>Cancelar</button></div></div>}
  </section>;
}
