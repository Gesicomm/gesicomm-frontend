import { useEffect, useState } from 'react';
import API from '../../services/api';
import { accesoDelPlan, NOMBRES_RUTA } from '../../lib/rutasPlan';

export default function CodigosPrueba() {
  const [datos, setDatos] = useState({ codigos: [], planes: [] });
  const [form, setForm] = useState({ dias: '', plan_id: '', email: '', vence_en: '', ruta_acceso: 'fisico' });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [generado, setGenerado] = useState(null);
  const [aviso, setAviso] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    API.get('/publico/admin/codigos-prueba').then(({ data }) => { if (vigente) setDatos(data); })
      .catch(() => { if (vigente) setError('No pudimos cargar los códigos. Volvé a intentar.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [revision]);
  const planElegido = datos.planes.find(p => p.id === Number(form.plan_id));
  const politica = accesoDelPlan(planElegido);
  const cambiar = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const generar = async e => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true); setError(''); setAviso(''); setGenerado(null);
    try {
      const { data } = await API.post('/publico/admin/codigos-prueba', {
        dias: Number(form.dias), plan_id: Number(form.plan_id),
        ruta_acceso: politica === 'elegir' ? form.ruta_acceso : politica,
        email: form.email.trim() || undefined,
        vence_en: form.vence_en ? new Date(form.vence_en).toISOString() : undefined,
      });
      setGenerado(data); setRevision(r => r + 1);
    } catch (err) { setError(err.response?.data?.message || 'No pudimos generar el código. Revisá los datos e intentá de nuevo.'); }
    finally { setGuardando(false); }
  };
  const desactivar = async id => {
    setGuardando(true); setError('');
    try {
      await API.patch(`/publico/admin/codigos-prueba/${id}/desactivar`);
      setAviso('Código desactivado. Las pruebas ya activadas conservan su duración.');
      setRevision(r => r + 1);
    } catch { setError('No pudimos desactivar el código.'); }
    finally { setGuardando(false); }
  };
  const enviarCorreo = async codigo => {
    setGuardando(true); setError(''); setAviso('');
    try {
      const {data} = await API.post(`/publico/admin/codigos-prueba/${codigo.id}/enviar-correo`);
      if (generado?.id === codigo.id) setGenerado(prev => ({...prev,...data}));
      setAviso(data.emailEnviado ? `Correo enviado a ${codigo.email}.` : 'No se confirmó el envío. El código sigue disponible; podés reintentar sin generar otro.');
    } catch (err) { setError(err.response?.data?.message || 'No pudimos enviar el correo. El código no cambió.'); }
    finally { setGuardando(false); }
  };
  return <section className="trial-codes" aria-labelledby="trial-codes-title">
    <h2 id="trial-codes-title">Códigos de prueba gratuita</h2>
    <p>Elegí el plan y la duración. Cada código se usa una sola vez al registrarse; los días empiezan a contar desde ese registro. El usuario debe verificar su correo.</p>
    <form onSubmit={generar} className="trial-code-form">
      <label><span id="trial-plan-label">Plan de la prueba</span><select aria-labelledby="trial-plan-label" name="plan_id" required value={form.plan_id} onChange={cambiar}><option value="">Elegí un plan</option>{datos.planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
      {planElegido && (politica === 'elegir' ? <label><span id="trial-route-label">Acceso del código</span><select aria-labelledby="trial-route-label" name="ruta_acceso" value={form.ruta_acceso} onChange={cambiar} required><option value="fisico">Gestión de E-commerce</option><option value="personal">Marca personal</option></select><span>El código habilita solo la ruta elegida.</span></label> : <p>Acceso del código: {NOMBRES_RUTA[politica]}.</p>)}
      <label><span id="trial-days-label">Duración en días</span><input aria-labelledby="trial-days-label" name="dias" type="number" required min="1" max="365" step="1" placeholder="Ej.: 14 o 20" value={form.dias} onChange={cambiar} /><span>Entre 1 y 365 días de acceso.</span></label>
      <label><span id="trial-email-label">Correo del destinatario (opcional)</span><input aria-labelledby="trial-email-label" name="email" type="email" value={form.email} onChange={cambiar} placeholder="persona@correo.com" /><span>Le enviamos el código y las instrucciones de acceso. Solo ese correo podrá canjearlo.</span></label>
      <label><span id="trial-expiry-label">Fecha límite para canjear (opcional)</span><input aria-labelledby="trial-expiry-label" name="vence_en" type="datetime-local" value={form.vence_en} onChange={cambiar} /><span>Limita cuándo se puede usar el código, no la duración de la prueba.</span></label>
      <button type="submit" disabled={cargando || guardando || !datos.planes.length}>{guardando ? 'Procesando…' : form.email.trim() ? 'Generar y enviar código' : 'Generar código de prueba'}</button>
    </form>
    {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => { setError(''); setRevision(r => r + 1); }}>Actualizar códigos</button></div>}
    {aviso && <p role="status">{aviso}</p>}
    {generado && <div className="trial-code-result" role="status"><strong>Prueba de {generado.dias} días · código generado</strong><code>{generado.codigo}</code>{generado.ruta_acceso && <p>Acceso: {NOMBRES_RUTA[generado.ruta_acceso]}.</p>}
      <p>{generado.email ? generado.emailEnviado ? `Correo enviado a ${generado.email} con el código y las instrucciones.` : 'El código quedó creado, pero no se confirmó el envío del correo. Reintentá el envío sin generar otro código.' : 'Entregalo al destinatario para que lo ingrese en «Código de prueba» al crear su cuenta.'}</p>
      <p>Es personal y de un solo uso. El destinatario no debe compartirlo ni reenviarlo.</p>
      <div className="trial-code-actions">{generado.email && !generado.emailEnviado && <button type="button" disabled={guardando} onClick={() => enviarCorreo(generado)}>Reintentar envío</button>}<button type="button" onClick={async () => { try { await navigator.clipboard.writeText(generado.codigo); setAviso('Código copiado.'); } catch { setAviso('Seleccioná el código para copiarlo manualmente.'); } }}>Copiar código</button></div></div>}
    <h3>Últimos códigos generados</h3>
    {cargando ? <p role="status">Cargando códigos…</p> : !datos.codigos.length ? <p>Todavía no generaste códigos de prueba.</p> : <div className="trial-code-list">{datos.codigos.map(c => {
      const usado = Boolean(c.usado_en);
      const vencido = c.vence_en && new Date(c.vence_en) <= new Date();
      const estado = usado ? 'Utilizado' : !c.activo ? 'Desactivado' : vencido ? 'Vencido' : 'Disponible';
      return <article key={c.id}><div><code>{c.codigo}</code><p>{c.dias} días · {datos.planes.find(p => p.id === c.plan_id)?.nombre || `Plan #${c.plan_id}`} · {NOMBRES_RUTA[c.ruta_acceso] || 'Acceso según plan'}</p><p>{c.email || 'Sin restricción de correo'} · {estado}</p>{c.vence_en && <p>Canjear antes del {new Date(c.vence_en).toLocaleString('es-PY')}</p>}{usado && <p>Usado el {new Date(c.usado_en).toLocaleString('es-PY')} · usuario #{c.usado_por}</p>}</div>{!usado && c.activo && !vencido && <div className="trial-code-actions">{c.email && <button type="button" disabled={guardando} onClick={() => enviarCorreo(c)}>Enviar por correo</button>}<button type="button" disabled={guardando} onClick={() => desactivar(c.id)}>Desactivar</button></div>}</article>;
    })}</div>}
  </section>;
}
