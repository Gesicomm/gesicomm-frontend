import { TutorialHeaderAction } from '../../components/TutorialDock';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeDollarSign, Wallet, Copy, Check, ArrowUpRight, MousePointer2, Users, UserCheck, CalendarDays, FileText, X, Save, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { afiliadosService } from '../../services/afiliadosService';
import './afiliados.css';

const FORM_INICIAL = { nombre: '', telefono: '', metodo_pago: 'transferencia', entidad_pago: '', titular_pago: '', documento_pago: '', cuenta_pago: '' };
const dinero = valor => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(Number(valor) || 0);
const fecha = valor => valor ? new Intl.DateTimeFormat('es-PY', { dateStyle: 'medium', timeZone: 'America/Asuncion' }).format(new Date(valor)) : 'Sin fecha registrada';
const ESTADOS = { pendiente: 'Pendiente', aprobada: 'Aprobada', pagada: 'Pagada', anulada: 'Anulada' };
const errorMensaje = err => err.response?.data?.message || 'No pudimos conectar. Volvé a intentar.';

function TextoTerminos({ texto = '' }) {
  const inline = line => line.split(/(\*\*.*?\*\*)/g).map((part, i) => part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
  return texto.split(/\r?\n\r?\n/).map((bloque, i) => {
    if (bloque.startsWith('# ')) return <h3 key={i}>{bloque.slice(2)}</h3>;
    if (bloque.startsWith('### ')) return <h4 key={i}>{bloque.slice(4)}</h4>;
    if (bloque.startsWith('- ')) return <ul key={i}>{bloque.split(/\r?\n/).map((line, j) => <li key={j}>{inline(line.replace(/^- /, ''))}</li>)}</ul>;
    return <p key={i}>{inline(bloque)}</p>;
  });
}

function TerminosModal({ terminos, obligatorio, guardando, error, onAceptar, onCerrar, condiciones }) {
  const dialog = useRef(null);
  const [aceptado, setAceptado] = useState(false);
  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.showModal();
    return () => { document.body.style.overflow = overflow; anterior?.focus?.(); };
  }, []);
  return (
    <dialog ref={dialog} className="af-dialog" aria-labelledby="af-terminos-titulo" onCancel={e => { e.preventDefault(); if (!guardando) onCerrar(); }}>
      <header className="af-dialog-head">
        <div><span className="af-eyebrow">Programa de afiliados</span><h2 id="af-terminos-titulo">Términos y condiciones</h2><p>Versión {terminos.version} · 14 de octubre de 2026</p></div>
        <button type="button" className="af-icon-btn" title="Cerrar términos" aria-label="Cerrar términos" onClick={onCerrar} disabled={guardando}><X size={20} /></button>
      </header>
      <div className="af-terminos-texto" tabIndex={0}><TextoTerminos texto={terminos.texto} /></div>
      <footer className="af-dialog-footer">
        <p className="af-payment-note">Días de depósito: {condiciones?.dias_deposito || 'A definir'}. Mínimo de liquidación: {condiciones?.minimo_liquidacion == null ? 'a definir' : dinero(condiciones.minimo_liquidacion)}.</p>
        {obligatorio ? <>
          <label className="af-consent"><input type="checkbox" checked={aceptado} onChange={e => setAceptado(e.target.checked)} disabled={guardando} /><span>Leí y acepto los términos y condiciones del Programa de Afiliados Gesicom, versión {terminos.version}.</span></label>
          {error && <p className="af-error" role="alert">{error}</p>}
          <div className="af-dialog-actions"><button type="button" className="af-btn" onClick={onCerrar} disabled={guardando}>Volver</button><button type="button" className="af-btn af-primary" onClick={onAceptar} disabled={!aceptado || guardando}>{guardando ? <Loader2 size={16} className="af-spin" /> : <Check size={16} />}Aceptar y activar mi afiliación</button></div>
        </> : <button type="button" className="af-btn" onClick={onCerrar}>Cerrar</button>}
      </footer>
    </dialog>
  );
}

export default function MiAfiliado() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [sinAcceso, setSinAcceso] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [modal, setModal] = useState(false);
  const [filtro, setFiltro] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const afiliado = panel?.afiliado;
  const requiereAceptacion = !afiliado || afiliado.requiere_aceptacion;

  async function cargar() {
    setCargando(true);
    setError('');
    setSinAcceso(false);
    try {
      const data = await afiliadosService.miAfiliado();
      setPanel(data);
      setForm(Object.fromEntries(Object.keys(FORM_INICIAL).map(key => [key, data.afiliado?.[key] || FORM_INICIAL[key]])));
      setModal(!data.afiliado || data.afiliado.requiere_aceptacion);
    } catch (err) { setError(errorMensaje(err)); setSinAcceso(err.response?.status === 403); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);

  async function guardar(e, aceptar = false) {
    e?.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const data = await afiliadosService.solicitarMiAfiliado({ ...form, nombre: form.nombre || undefined, ...(aceptar ? { acepta_terminos: true, terminos_version: panel.terminos.version } : {}) });
      setPanel(prev => ({ ...prev, afiliado: data.afiliado }));
      setForm(prev => ({ ...prev, nombre: data.afiliado.nombre, titular_pago: prev.titular_pago || data.afiliado.nombre }));
      setModal(false);
      setMensaje(aceptar ? 'Tu afiliación está activa. Ya podés compartir tu enlace.' : 'Datos de cobro actualizados.');
      const actualizado = await afiliadosService.miAfiliado().catch(() => null);
      if (actualizado) setPanel(actualizado);
    } catch (err) { setError(errorMensaje(err)); }
    finally { setGuardando(false); }
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(afiliado.link); setMensaje('Enlace copiado.'); }
    catch { setError('No pudimos copiar el enlace. Podés seleccionarlo en el campo.'); }
  }
  if (cargando) return <div className="af-page af-loading" role="status"><Loader2 className="af-spin" size={22} />Cargando tu afiliación…</div>;
  if (!panel) return <div className="af-page"><div className="af-shell"><h1>Quiero ser afiliado</h1><p className={sinAcceso ? '' : 'af-error'} role={sinAcceso ? 'status' : 'alert'}>{error}</p>{sinAcceso ? <Link to="/planes" className="af-btn af-primary">Ver planes</Link> : <button className="af-btn" onClick={cargar}><RefreshCw size={16} />Reintentar</button>}</div></div>;

  const saldo = afiliado?.resumen_comisiones || {};
  const metricas = panel.metricas || {};
  const movimientos = (panel.movimientos || []).filter(m => filtro === 'todas' || m.estado === filtro);
  const paginas = Math.max(1, Math.ceil(movimientos.length / 8));
  const paginaActual = Math.min(pagina, paginas);
  const pagos = (panel.movimientos || []).filter(m => m.estado === 'pagada' && m.pagada_en).sort((a, b) => new Date(b.pagada_en) - new Date(a.pagada_en));
  const actualizar = (key, value) => { setForm(prev => ({ ...prev, [key]: value })); setMensaje(''); };
  return (
    <div className="af-page"><div className="af-shell">
      <header className="af-heading"><span className="af-heading-icon"><BadgeDollarSign size={24} /></span><div><span className="af-eyebrow">Tu red de recomendaciones</span><h1>Quiero ser afiliado</h1><p>Tu enlace, tus referidos y tus comisiones en un solo lugar.</p></div><div className="gc-tutorial-heading-actions af-tutorial-actions"><TutorialHeaderAction /><button className="af-btn af-terms-btn" onClick={() => setModal(true)}><FileText size={16} />Términos y condiciones</button></div></header>
      {mensaje && <p className="af-notice" role="status"><Check size={16} />{mensaje}</p>}
      {error && !modal && <p className="af-error" role="alert">{error}</p>}
      {!requiereAceptacion && <>
        <div className="af-overview">
          <section className="af-wallet" aria-labelledby="af-wallet-title">
            <div className="af-wallet-top"><span id="af-wallet-title"><Wallet size={19} />Mi billetera</span><span className={'af-status ' + afiliado.estado}>{afiliado.estado === 'activo' ? 'Afiliación activa' : 'Afiliación pausada'}</span></div>
            <span className="af-balance-label">Total a liquidar</span><strong className="af-balance">{dinero(saldo.total_a_liquidar)}</strong>
            <div className="af-wallet-breakdown"><div><span>Pendiente de aprobación</span><strong>{dinero(saldo.pendiente)}</strong></div><div><span>Aprobado para pago</span><strong>{dinero(saldo.aprobada)}</strong></div></div>
            <div className="af-wallet-paid"><span>Total depositado</span><strong>{dinero(saldo.pagada)}</strong></div>
          </section>
          <section className="af-deposits" aria-labelledby="af-deposit-title"><h2 id="af-deposit-title"><CalendarDays size={18} />Depósitos</h2><dl>
            <div><dt>Días de depósito</dt><dd>{panel.condiciones_pago?.dias_deposito || 'A definir'}</dd></div>
            <div><dt>Mínimo de liquidación</dt><dd>{panel.condiciones_pago?.minimo_liquidacion == null ? 'A definir' : dinero(panel.condiciones_pago.minimo_liquidacion)}</dd></div>
            <div><dt>Último depósito registrado</dt><dd>{pagos.length ? fecha(pagos[0].pagada_en) : 'Sin depósitos con fecha registrada'}</dd></div>
          </dl><p>Los días y el mínimo de pago se comunicarán al confirmar las condiciones comerciales del programa.</p></section>
        </div>
        <section className="af-referral" aria-labelledby="af-referral-title"><div><h2 id="af-referral-title">Tu enlace de afiliado</h2><span>Código: {afiliado.codigo}</span></div><div className="af-link-row"><input aria-label="Tu enlace de afiliado" value={afiliado.link || ''} readOnly onFocus={e => e.target.select()} /><button className="af-btn af-primary" onClick={copiar} disabled={!afiliado.link}><Copy size={16} />Copiar enlace</button></div><p>Comisión vigente: <strong>{afiliado.comision_pct}%</strong> · {metricas.clientes_activos || 0} clientes activos con pagos</p></section>
        <section className="af-metrics" aria-label="Resultados de tu enlace">
          {[{ icon: MousePointer2, label: 'Visitas al enlace', value: metricas.visitas, detail: (metricas.visitantes_estimados || 0) + ' visitantes estimados por IP' }, { icon: Users, label: 'Registros atribuidos', value: metricas.registros, detail: 'Cuentas creadas con tu referencia' }, { icon: UserCheck, label: 'Clientes con pagos', value: metricas.clientes_pagados, detail: (metricas.clientes_activos || 0) + ' con suscripción activa' }, { icon: ArrowUpRight, label: 'Comisiones acumuladas', value: dinero(saldo.total_generado), detail: 'Pendientes, aprobadas y pagadas' }].map(({icon: Icon, label, value, detail}) => <div className="af-metric" key={label}><Icon size={18} /><span>{label}</span><strong>{value ?? 0}</strong><small>{detail}</small></div>)}
        </section>
        <section className="af-history" aria-labelledby="af-history-title">
          <div className="af-section-head"><h2 id="af-history-title">Movimientos de comisiones</h2><label>Estado<select aria-label="Estado" value={filtro} onChange={e => { setFiltro(e.target.value); setPagina(1); }}><option value="todas">Todos</option>{Object.entries(ESTADOS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
          <div className="af-table-scroll"><table><thead><tr><th>Operación</th><th>Fecha</th><th>Base registrada</th><th>Porcentaje</th><th>Comisión</th><th>Estado</th><th>Depositado el</th></tr></thead><tbody>{movimientos.slice((paginaActual - 1) * 8, paginaActual * 8).map(m => <tr key={m.id}><td><strong>{m.plan}</strong><small>Comisión #{m.id}</small></td><td>{fecha(m.created_at)}</td><td>{dinero(m.monto_base)}</td><td>{m.comision_pct}%</td><td className="af-amount">{dinero(m.monto_comision)}</td><td><span className={'af-status ' + m.estado}>{ESTADOS[m.estado] || m.estado}</span></td><td>{m.estado === 'pagada' ? fecha(m.pagada_en) : '—'}</td></tr>)}</tbody></table></div>
          {!movimientos.length && <div className="af-empty"><Wallet size={26} /><strong>{filtro === 'todas' ? 'Todavía no hay comisiones' : 'Sin movimientos en este estado'}</strong><p>Las comisiones de tus suscripciones referidas aparecerán aquí cuando se registren.</p></div>}
          {!!movimientos.length && <div className="af-pagination"><span>{movimientos.length} movimientos · Página {paginaActual} de {paginas}</span><button className="af-icon-btn" title="Página anterior" aria-label="Página anterior" disabled={paginaActual <= 1} onClick={() => setPagina(paginaActual - 1)}><ChevronLeft size={18} /></button><button className="af-icon-btn" title="Página siguiente" aria-label="Página siguiente" disabled={paginaActual >= paginas} onClick={() => setPagina(paginaActual + 1)}><ChevronRight size={18} /></button></div>}
        </section>
        <details className="af-account" open={!afiliado.cuenta_pago || undefined}><summary><span>Datos para recibir tus depósitos</span><span>{afiliado.cuenta_pago ? 'Ver y editar' : 'Completar datos de cobro'}</span></summary>
          <form onSubmit={guardar}><div className="af-fields">
            {[['nombre', 'Nombre o marca', 'text'], ['telefono', 'Teléfono', 'tel'], ['titular_pago', 'Titular de la cuenta', 'text'], ['documento_pago', 'Documento / RUC', 'text'], ['entidad_pago', 'Banco o billetera', 'text'], ['cuenta_pago', 'Cuenta / alias / teléfono', 'text']].map(([key, label, type]) => <label key={key}>{label}<input type={type} value={form[key]} maxLength={key === 'telefono' ? 50 : key === 'entidad_pago' ? 120 : key === 'documento_pago' ? 80 : key === 'cuenta_pago' ? 160 : 150} required={key === 'nombre'} onChange={e => actualizar(key, e.target.value)} /></label>)}
            <label>Medio de cobro<select value={form.metodo_pago} onChange={e => actualizar('metodo_pago', e.target.value)}><option value="transferencia">Transferencia bancaria</option><option value="billetera">Billetera electrónica</option>{!['transferencia','billetera'].includes(form.metodo_pago) && <option value={form.metodo_pago}>{form.metodo_pago}</option>}</select></label>
          </div><button className="af-btn af-primary" disabled={guardando}>{guardando ? <Loader2 size={16} className="af-spin" /> : <Save size={16} />}Guardar datos</button></form>
        </details>
        <footer className="af-footer"><FileText size={15} /><span>Términos versión {afiliado.terminos_version} aceptados el {fecha(afiliado.terminos_aceptados_en)}.</span><button onClick={() => setModal(true)}>Consultar términos</button></footer>
      </>}
      {requiereAceptacion && !modal && <button className="af-btn af-primary" onClick={() => setModal(true)}>Leer y aceptar términos</button>}
    </div>
    {modal && panel.terminos && <TerminosModal terminos={panel.terminos} condiciones={panel.condiciones_pago} obligatorio={requiereAceptacion} guardando={guardando} error={error} onAceptar={() => guardar(null, true)} onCerrar={() => requiereAceptacion ? navigate('/mi-dashboard') : setModal(false)} />}
    </div>
  );
}
