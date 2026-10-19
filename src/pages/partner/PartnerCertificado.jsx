import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Check, CheckCircle2, FileText, GraduationCap, Globe2, Loader2, Repeat2, X } from 'lucide-react';
import { partnerService } from '../../services/partnerService';
import './partner.css';

function TerminosTexto({ texto }) {
  const inline = value => value.split(/(\*\*.*?\*\*)/g).map((parte, i) => parte.startsWith('**') ? <strong key={i}>{parte.slice(2, -2)}</strong> : parte);
  return texto.split(/\r?\n\r?\n/).map((bloque, i) => {
    if (bloque.startsWith('# ')) return <h3 key={i}>{bloque.slice(2)}</h3>;
    if (bloque.startsWith('### ')) return <h4 key={i}>{bloque.slice(4)}</h4>;
    if (bloque.startsWith('- ')) return <ul key={i}>{bloque.split(/\r?\n/).map((line, j) => <li key={j}>{inline(line.slice(2))}</li>)}</ul>;
    if (/^\d+\. /.test(bloque)) return <ol key={i}>{bloque.split(/\r?\n/).map((line, j) => <li key={j}>{inline(line.replace(/^\d+\. /, ''))}</li>)}</ol>;
    return <p key={i}>{inline(bloque)}</p>;
  });
}

function Terminos({ terminos, onCerrar, onAceptar, aceptado }) {
  const ref = useRef(null);
  const [check, setCheck] = useState(aceptado);
  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current.showModal();
    return () => { document.body.style.overflow = overflow; anterior?.focus?.(); };
  }, []);
  return <dialog ref={ref} className="pc-dialog" aria-labelledby="pc-terminos-titulo" onCancel={e => { e.preventDefault(); onCerrar(); }}>
    <header><div><span className="pc-eyebrow">Programa Partner Certificado Gesicom</span><h2 id="pc-terminos-titulo">Términos y condiciones</h2><p>Versión {terminos.version} · 14 de octubre de 2026</p></div><button className="pc-icon-btn" onClick={onCerrar} title="Cerrar términos" aria-label="Cerrar términos"><X size={20} /></button></header>
    <div className="pc-documento" tabIndex={0}><TerminosTexto texto={terminos.texto} /></div>
    <footer><label className="pc-checkbox"><input type="checkbox" checked={check} onChange={e => setCheck(e.target.checked)} /><span>Leí y acepto los términos y condiciones del Programa Partner Certificado Gesicom, versión {terminos.version}.</span></label><div className="pc-dialog-actions"><button className="pc-btn" onClick={onCerrar}>Volver</button><button className="pc-btn pc-primary" disabled={!check} onClick={onAceptar}><Check size={16} />Aceptar términos</button></div></footer>
  </dialog>;
}

export default function PartnerCertificado() {
  const [panel, setPanel] = useState(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [aceptado, setAceptado] = useState(false);
  const [modal, setModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const formulario = useRef(null);
  const ocupado = useRef(false);
  async function cargar() {
    setCargando(true); setError('');
    try {
      const data = await partnerService.obtener();
      setPanel(data); setNombre(data.solicitud?.nombre || data.nombre || ''); setTelefono(data.solicitud?.telefono || '');
    } catch (err) { setError(err.response?.data?.message || 'No pudimos cargar el programa. Volvé a intentar.'); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);
  const irFormulario = () => {
    formulario.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    formulario.current?.querySelector('input')?.focus({ preventScroll: true });
  };
  async function enviar(e) {
    e.preventDefault();
    if (ocupado.current) return;
    if (!aceptado) { setModal(true); return; }
    ocupado.current = true; setEnviando(true); setError('');
    try {
      const data = await partnerService.solicitar({ nombre: nombre.trim(), telefono: telefono.trim(), acepta_terminos: true, terminos_version: panel.terminos.version });
      setPanel(prev => ({ ...prev, solicitud: data.solicitud }));
    } catch (err) { setError(err.response?.data?.message || 'No pudimos enviar tu solicitud. Volvé a intentar.'); }
    finally { ocupado.current = false; setEnviando(false); }
  }
  if (cargando) return <div className="pc-loading" role="status"><Loader2 size={22} className="pc-spin" />Cargando programa…</div>;
  if (!panel) return <div className="pc-page"><h1>Partner Certificado Gesicom</h1><p role="alert">{error}</p><button className="pc-btn" onClick={cargar}>Reintentar</button></div>;
  return <div className="pc-page"><div className="pc-shell">
    <header className="pc-nav"><span><BadgeCheck size={20} />Programa Partner Certificado</span><button className="pc-text-btn" onClick={() => setModal(true)}><FileText size={15} />Términos y condiciones</button></header>
    <section className="pc-intro">
      <img src="/brand/gesicomm-isotipo.svg" width="64" height="64" alt="Gesicom" className="pc-brand" />
      <span className="pc-eyebrow">Tecnología Gesicom. Tu propio negocio.</span>
      <h1>Conviértete en Partner Certificado Gesicom y construye tu propio negocio tecnológico.</h1>
      <p className="pc-lead">Una oportunidad para crear un negocio de alcance internacional, respaldado por la tecnología de Gesicom.</p>
      <p className="pc-description">Ayuda a emprendedores y empresas a vender, automatizar y gestionar sus negocios digitales. Genera ingresos recurrentes por cada cliente que incorpores y cobra por implementar soluciones tecnológicas, sin necesidad de desarrollar tu propio software.</p>
      <button className="pc-btn pc-primary" onClick={irFormulario}>{panel.solicitud ? 'Ver mi solicitud' : 'Quiero ser Partner Certificado'}<ArrowRight size={17} /></button>
    </section>
    <section className="pc-benefits" aria-label="Beneficios del programa">
      {[{ Icon: Repeat2, title: '30% recurrente', text: 'Sobre el ingreso neto comisionable de las suscripciones elegibles de tus clientes, mientras cumplas los requisitos del programa.' }, { Icon: BriefcaseBusiness, title: 'Tus servicios, tus precios', text: 'Cobra por configurar, implementar y acompañar negocios digitales. Tú defines los precios de tus servicios profesionales.' }, { Icon: GraduationCap, title: 'Formación y certificación', text: 'Desarrolla tus conocimientos sobre Gesicom y completa los requisitos de evaluación para obtener tu certificación.' }].map(({Icon, title, text}) => <article key={title}><Icon size={22} /><h2>{title}</h2><p>{text}</p></article>)}
    </section>
    <section className="pc-commercial" aria-labelledby="pc-inversion"><div><span className="pc-eyebrow">Condiciones del programa</span><h2 id="pc-inversion">Invierte en tu formación y en tu negocio</h2><p>La formación inicial y la membresía mensual son conceptos independientes. El alcance, los impuestos y las condiciones definitivas se informan antes de contratar.</p></div><dl><div><dt>Formación y certificación inicial</dt><dd>USD 997<span>Inversión de referencia</span></dd></div><div><dt>Membresía Partner Certificado</dt><dd>USD 247<span>Mensuales</span></dd></div></dl></section>
    <section className="pc-steps" aria-label="Proceso de incorporación"><h2>Tu camino como partner</h2><ol><li><span>01</span><div><strong>Postúlate al programa</strong><p>Déjanos tus datos para que el equipo se ponga en contacto contigo.</p></div></li><li><span>02</span><div><strong>Completa tu formación</strong><p>Conoce la oferta, recibe la aprobación comercial y cumple los requisitos de certificación.</p></div></li><li><span>03</span><div><strong>Desarrolla tu cartera</strong><p>Implementa soluciones para tus clientes y accede a los beneficios con tu membresía activa.</p></div></li></ol></section>
    <section ref={formulario} className="pc-apply" aria-labelledby="pc-apply-title">
      <div><Globe2 size={24} /><h2 id="pc-apply-title">Da el siguiente paso</h2><p>Solicita información y conoce cómo formar parte del Programa Partner Certificado Gesicom.</p><small>Enviar la solicitud no realiza ningún cobro ni otorga automáticamente la certificación. La participación está sujeta a aprobación, formación y condiciones comerciales.</small></div>
      {panel.solicitud ? <div className="pc-confirmation" role="status"><CheckCircle2 size={28} /><h3>Solicitud recibida</h3><p>El equipo de Gesicom revisará tu postulación y se comunicará contigo al {panel.solicitud.telefono}.</p><span className="pc-status">Pendiente de evaluación</span><small>Términos versión {panel.solicitud.terminos_version} aceptados el {new Intl.DateTimeFormat('es-PY', { dateStyle: 'medium', timeZone: 'America/Asuncion' }).format(new Date(panel.solicitud.terminos_aceptados_en))}.</small></div> :
        <form onSubmit={enviar}><label>Nombre o empresa<input value={nombre} onChange={e => setNombre(e.target.value)} required minLength={2} maxLength={150} autoComplete="name" disabled={enviando} /></label><label>Teléfono / WhatsApp<input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} required minLength={6} maxLength={50} autoComplete="tel" placeholder="+595…" disabled={enviando} /></label><div className="pc-consent-row">{aceptado ? <span><Check size={16} />Términos aceptados</span> : <span>Para postularte, acepta las condiciones del programa.</span>}<button type="button" className="pc-text-btn" onClick={() => setModal(true)}>{aceptado ? 'Volver a leer' : 'Leer y aceptar términos'}</button></div>{error && <p role="alert" className="pc-error">{error}</p>}<button type="submit" className="pc-btn pc-primary" disabled={enviando}>{enviando ? <Loader2 size={16} className="pc-spin" /> : <ArrowRight size={16} />}Enviar mi solicitud</button></form>}
    </section>
    <footer className="pc-footer"><BadgeCheck size={17} /><span>Partner Certificado Gesicom</span><p>Las comisiones están sujetas a elegibilidad. El programa no garantiza clientes, facturación ni rentabilidad.</p><button className="pc-text-btn" onClick={() => setModal(true)}>Consultar términos</button></footer>
  </div>{modal && <Terminos terminos={panel.terminos} aceptado={aceptado || !!panel.solicitud} onCerrar={() => setModal(false)} onAceptar={() => { setAceptado(true); setModal(false); }} />}</div>;
}
