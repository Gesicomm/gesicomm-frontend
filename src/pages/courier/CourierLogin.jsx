import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, MapPin, PackageCheck, Phone, ShieldCheck, Truck, Upload, UserRound, X } from "lucide-react";
import { courierLogin, courierRegister, getCourierApplicationGeography, getCourierToken } from "../../services/courierPortalApi";
import "./courier-portal.css";

const BENEFICIOS = ["Tus entregas y direcciones en un solo lugar", "Actualizá cada pedido desde el celular", "Registrá cobros, reprogramaciones e incidencias"];
const FILES_PERSONA = [
  ["antecedente_policial", "Antecedentes policiales (PDF)", "Certificado vigente, hasta 8 MB.", "application/pdf,.pdf"],
  ["cedula_pdf", "Cédula · frente y dorso (un PDF)", "Un solo PDF legible con ambos lados, hasta 8 MB.", "application/pdf,.pdf"],
];

export default function CourierLogin() {
  const navigate = useNavigate();
  const [modo, setModo] = useState("login");
  const [tipo, setTipo] = useState("persona");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [archivos, setArchivos] = useState({});
  const [geografia, setGeografia] = useState([]);
  const [errorGeografia, setErrorGeografia] = useState("");
  const [coberturaTipo, setCoberturaTipo] = useState("seleccionadas");
  const [departamentosSeleccionados, setDepartamentosSeleccionados] = useState([]);
  const [departamentoActivoId, setDepartamentoActivoId] = useState("");
  const [ciudadesSeleccionadas, setCiudadesSeleccionadas] = useState([]);
  const [selectorZonasAbierto, setSelectorZonasAbierto] = useState(false);
  const [busquedaDepartamento, setBusquedaDepartamento] = useState("");
  const selectorZonasRef = useRef(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(false);
  const esRegistro = modo === "registro";
  const nombresCiudadesSeleccionadas = geografia.flatMap(departamento => (departamento.ciudades || []).filter(ciudad => ciudadesSeleccionadas.includes(ciudad.id)).map(ciudad => `${departamento.nombre} · ${ciudad.nombre}`));

  useEffect(() => { if (getCourierToken()) navigate("/courier/pedidos", { replace: true }); }, [navigate]);
  useEffect(() => {
    if (!esRegistro) return undefined;
    let vigente = true;
    setErrorGeografia("");
    getCourierApplicationGeography().then(items => { if (vigente) setGeografia(items); })
      .catch(() => { if (vigente) setErrorGeografia("No pudimos cargar departamentos y ciudades. Reintentá en unos segundos."); });
    return () => { vigente = false; };
  }, [esRegistro]);
  useEffect(() => {
    const dialog = selectorZonasRef.current;
    if (!dialog) return;
    if (selectorZonasAbierto && !dialog.open) dialog.showModal();
    if (!selectorZonasAbierto && dialog.open) dialog.close();
  }, [selectorZonasAbierto]);

  function alternarCiudad(id, activo) {
    setCiudadesSeleccionadas(actual => activo ? [...new Set([...actual, id])] : actual.filter(actualId => actualId !== id));
  }

  function alternarDepartamento(id, activo) {
    const departamento = geografia.find(item => String(item.id) === String(id));
    const idsCiudades = (departamento?.ciudades || []).map(ciudad => ciudad.id);
    setDepartamentosSeleccionados(actual => activo ? [...new Set([...actual, id])] : actual.filter(actualId => String(actualId) !== String(id)));
    if (!activo) setCiudadesSeleccionadas(actual => actual.filter(ciudadId => !idsCiudades.includes(ciudadId)));
    if (activo) setDepartamentoActivoId(id);
    else if (String(departamentoActivoId) === String(id)) {
      const siguiente = departamentosSeleccionados.find(actualId => String(actualId) !== String(id));
      setDepartamentoActivoId(siguiente ?? "");
    }
  }

  async function submit(e) {
    e.preventDefault(); setLoading(true); setError(""); setAviso("");
    try {
      if (esRegistro) {
        if (coberturaTipo === "seleccionadas" && ciudadesSeleccionadas.length === 0) throw new Error("Elegí al menos una ciudad para tu zona de trabajo.");
        const form = new FormData();
        Object.entries({ nombre: nombre.trim(), email: email.trim().toLowerCase(), telefono: telefono.trim(), vehiculo, tipo_postulante: tipo, razon_social: razonSocial.trim(), ruc: ruc.trim(), cobertura_tipo: coberturaTipo, ciudades_ids: JSON.stringify(coberturaTipo === "todas" ? [] : ciudadesSeleccionadas), password, confirm_password: confirmPassword }).forEach(([key, value]) => form.append(key, value));
        Object.entries(archivos).forEach(([key, file]) => { if (file) form.append(key, file); });
        const result = await courierRegister(form);
        setAviso(result.message || "Recibimos tu postulación. El acceso se habilitará después de revisar tus documentos.");
        setPassword(""); setConfirmPassword("");
      } else {
        await courierLogin({ username: email.trim().toLowerCase(), password });
        navigate("/courier/pedidos", { replace: true });
      }
    } catch (err) { setError(err?.response?.data?.error || err?.message || (esRegistro ? "No pudimos enviar tu postulación." : "No pudimos iniciar sesión.")); }
    finally { setLoading(false); }
  }

  function cambiarModo(nuevoModo) { setModo(nuevoModo); setError(""); setAviso(""); setPassword(""); setConfirmPassword(""); }

  return <main className={`gc-panel cp-root cp-entry${esRegistro ? " cp-entry--register" : ""}`}>
    <div className="cp-entry-shell">
      <section className="cp-entry-story" aria-label="Acerca del portal courier">
        <a className="cp-brand" href="/courier/login" aria-label="Gesicom Courier, inicio"><span className="cp-brand-mark"><Truck size={22} /></span><span className="cp-brand-wordmark"><span>gesicom<span className="cp-brand-dot">.</span></span><small>COURIER</small></span></a>
        <div className="cp-story-copy"><span className="cp-story-kicker"><span /> TU JORNADA, MÁS CLARA</span><h1>Entregá con todo bajo control.</h1><p>Organizá tus pedidos, encontrá cada dirección y mantené al comercio al tanto de cada entrega.</p><ul className="cp-benefit-list">{BENEFICIOS.map(item => <li key={item}><span><Check size={15} /></span>{item}</li>)}</ul></div>
        <div className="cp-story-footer"><ShieldCheck size={17} /> Tus datos y operaciones están protegidos.</div><div className="cp-story-orbit cp-story-orbit-one" /><div className="cp-story-orbit cp-story-orbit-two" /><div className="cp-story-route"><span /><i /><i /><i /><MapPin size={20} /></div>
      </section>
      <section className="cp-entry-main"><div className="cp-entry-mobile-brand"><Truck size={20} /> Gesicom Courier</div><div className="cp-entry-card">
        <div className="cp-entry-heading"><span className="cp-login-badge"><PackageCheck size={23} /></span><div><p className="cp-login-eyebrow">PORTAL COURIER</p><h2 className="cp-login-title">{aviso ? "Postulación recibida" : esRegistro ? "Postulate como courier" : "Qué bueno verte"}</h2><p className="cp-login-subtitle">{aviso ? "El equipo de Gesicom revisará la información y los documentos antes de habilitar el acceso." : esRegistro ? "Completá tus datos y documentación. El acceso requiere aprobación de Gesicom." : "Ingresá a tu espacio para continuar con tus entregas."}</p></div></div>
        {aviso ? <div className="cp-stage-confirmation" role="status"><strong>{aviso}</strong><p>Cuando tu solicitud sea aprobada, vas a poder ingresar con tu correo y contraseña.</p><button className="cp-btn-submit" type="button" onClick={() => cambiarModo("login")}>Ir a iniciar sesión <ArrowRight size={18} /></button></div> : <>
          <div className="cp-entry-switch" role="tablist" aria-label="Acceso al portal courier"><button type="button" role="tab" aria-selected={!esRegistro} className={!esRegistro ? "is-active" : ""} onClick={() => cambiarModo("login")}>Iniciar sesión</button><button type="button" role="tab" aria-selected={esRegistro} className={esRegistro ? "is-active" : ""} onClick={() => cambiarModo("registro")}>Postularme</button></div>
          <form className="cp-entry-form" onSubmit={submit}>
            {esRegistro && <>
              <div className="cp-field cp-application-type"><label htmlFor="cp-applicant-type">Tipo de postulante</label><select id="cp-applicant-type" className="cp-select" value={tipo} onChange={e => { setTipo(e.target.value); setArchivos(actual => ({ foto_perfil: actual.foto_perfil })); }}><option value="persona">Persona</option><option value="empresa">Empresa</option></select></div>
              <div className="cp-field cp-application-name"><label htmlFor="cp-name">{tipo === "empresa" ? "Nombre de la persona representante" : "Nombre completo"}</label><div className="cp-input-wrap"><UserRound size={17} /><input id="cp-name" className="cp-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido" autoComplete="name" required /></div></div>
              {tipo === "empresa" && <div className="cp-entry-field-row cp-application-company"><div className="cp-field"><label htmlFor="cp-company">Razón social</label><input id="cp-company" className="cp-input" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} required /></div><div className="cp-field"><label htmlFor="cp-ruc">RUC</label><input id="cp-ruc" className="cp-input" value={ruc} onChange={e => setRuc(e.target.value)} required /></div></div>}
              <div className="cp-entry-field-row cp-application-contact"><div className="cp-field"><label htmlFor="cp-phone">Teléfono</label><div className="cp-input-wrap"><Phone size={17} /><input id="cp-phone" className="cp-input" type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="0981 000 000" autoComplete="tel" required /></div></div><div className="cp-field"><label htmlFor="cp-vehicle">Movilidad <span>(opcional)</span></label><select id="cp-vehicle" className="cp-select" value={vehiculo} onChange={e => setVehiculo(e.target.value)}><option value="">Elegir</option><option value="Moto">Moto</option><option value="Auto">Auto</option><option value="Bicicleta">Bicicleta</option><option value="Otro">Otra</option></select></div></div>
              <section className="cp-application-coverage" aria-labelledby="cp-coverage-title">
                <div className="cp-coverage-heading"><MapPin size={18} /><div><h3 id="cp-coverage-title">Zonas donde trabajás</h3><p>Indicá los departamentos y ciudades que cubrís.</p></div></div>
                {errorGeografia && <p className="cp-coverage-error" role="alert">{errorGeografia}</p>}
                {coberturaTipo === "todas" ? <div className="cp-coverage-national"><p>Tu perfil indicará cobertura en todo Paraguay.</p><button type="button" onClick={() => setCoberturaTipo("seleccionadas")}>Elegir zonas específicas</button></div> : <>
                  <button type="button" className="cp-coverage-open" onClick={() => { setBusquedaDepartamento(""); setSelectorZonasAbierto(true); }} disabled={!geografia.length}><MapPin size={17} /><span>Seleccionar departamentos y ciudades</span><strong>{ciudadesSeleccionadas.length ? `${ciudadesSeleccionadas.length} ciudad${ciudadesSeleccionadas.length === 1 ? "" : "es"} · ${departamentosSeleccionados.length} departamento${departamentosSeleccionados.length === 1 ? "" : "s"}` : "Aún sin seleccionar"}</strong></button>
                  {ciudadesSeleccionadas.length > 0 && <div className="cp-coverage-summary"><strong>Zonas elegidas:</strong> {nombresCiudadesSeleccionadas.slice(0, 3).join(", ")}{nombresCiudadesSeleccionadas.length > 3 ? ` y ${nombresCiudadesSeleccionadas.length - 3} más` : ""}</div>}
                  <button type="button" className="cp-coverage-national-link" onClick={() => setCoberturaTipo("todas")}>Trabajo en todo Paraguay</button>
                </>}
              </section>
              <div className="cp-entry-documents"><h3>Documentos para la revisión</h3><p>{tipo === "persona" ? "Adjuntá certificado policial vigente y un único PDF con el frente y dorso de tu cédula." : "Adjuntá la constancia oficial de RUC de la empresa."}</p>{[["foto_perfil", "Foto de perfil", "JPG, PNG o WebP. Mínimo 200 × 200 píxeles, hasta 5 MB.", "image/jpeg,image/png,image/webp"], ...(tipo === "persona" ? FILES_PERSONA : [["constancia_ruc", "Constancia de RUC (PDF)", "Documento oficial, hasta 8 MB.", "application/pdf,.pdf"]])].map(([key, label, help, accept]) => <label className={`cp-file-field${archivos[key] ? " is-selected" : ""}`} key={key}><span className="cp-file-field__heading"><Upload size={18} /><span>{label}</span><span className="cp-file-field__action">{key === "foto_perfil" ? "Elegir foto" : "Elegir PDF"}</span></span><input type="file" accept={accept} required aria-label={label} aria-describedby={`cp-file-help-${key}`} onChange={e => setArchivos(prev => ({ ...prev, [key]: e.target.files?.[0] || null }))} /><small id={`cp-file-help-${key}`} aria-live="polite">{archivos[key] ? `Archivo seleccionado: ${archivos[key].name}` : help}</small></label>)}</div>
            </>}
            <div className={`cp-field${esRegistro ? " cp-application-email" : ""}`}><label htmlFor="cp-email">{esRegistro ? "Correo electrónico" : "Usuario o correo electrónico"}</label><div className="cp-input-wrap"><Mail size={17} /><input id="cp-email" className="cp-input" type={esRegistro ? "email" : "text"} value={email} onChange={e => setEmail(e.target.value)} placeholder={esRegistro ? "vos@correo.com" : "Tu usuario o correo"} autoComplete={esRegistro ? "email" : "username"} autoFocus={!esRegistro} required /></div></div>
            <div className={`cp-field${esRegistro ? " cp-application-password" : ""}`}><label htmlFor="cp-password">Contraseña</label><div className="cp-input-wrap"><LockKeyhole size={17} /><input id="cp-password" className="cp-input" type={mostrarPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={esRegistro ? "Al menos 8 caracteres" : "Ingresá tu contraseña"} autoComplete={esRegistro ? "new-password" : "current-password"} minLength={esRegistro ? 8 : undefined} required /><button className="cp-password-toggle" type="button" onClick={() => setMostrarPassword(prev => !prev)} aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{mostrarPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
            {esRegistro && <div className="cp-field cp-application-confirm"><label htmlFor="cp-confirm-password">Repetí tu contraseña</label><div className="cp-input-wrap"><LockKeyhole size={17} /><input id="cp-confirm-password" className="cp-input" type={mostrarPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ingresala otra vez" autoComplete="new-password" minLength={8} required /></div></div>}
            {error && <div className={`cp-login-error${esRegistro ? " cp-application-error" : ""}`} role="alert">{error}</div>}<button type="submit" className={`cp-btn-submit${esRegistro ? " cp-application-submit" : ""}`} disabled={loading}>{loading ? (esRegistro ? "Enviando postulación…" : "Ingresando…") : (esRegistro ? "Enviar postulación" : "Ingresar al portal")} {!loading && <ArrowRight size={18} />}</button>
          </form>
          {esRegistro && <dialog className="cp-zone-dialog" ref={selectorZonasRef} aria-labelledby="cp-zone-dialog-title" onClose={() => setSelectorZonasAbierto(false)}>
            <header className="cp-zone-dialog__header"><div><span className="cp-zone-dialog__eyebrow"><MapPin size={16} /> ÁREA DE COBERTURA</span><h2 id="cp-zone-dialog-title">¿Dónde hacés entregas?</h2><p>Podés elegir varios departamentos y marcar solo las ciudades que cubrís.</p></div><button type="button" className="cp-zone-dialog__close" aria-label="Cerrar" onClick={() => setSelectorZonasAbierto(false)}><X size={20} /></button></header>
            {errorGeografia ? <p className="cp-coverage-error" role="alert">{errorGeografia}</p> : <div className="cp-zone-dialog__body">
              <section className="cp-zone-dialog__departments" aria-label="Departamentos"><div className="cp-zone-dialog__section-title"><strong>1. Departamentos</strong><span>{departamentosSeleccionados.length} elegidos</span></div><label className="cp-zone-dialog__search"><span className="sr-only">Buscar departamento</span><input value={busquedaDepartamento} onChange={e => setBusquedaDepartamento(e.target.value)} placeholder="Buscar departamento" /></label><div className="cp-zone-dialog__department-list">{geografia.filter(departamento => departamento.nombre.toLocaleLowerCase("es").includes(busquedaDepartamento.toLocaleLowerCase("es"))).map(departamento => {
                const elegido = departamentosSeleccionados.some(id => String(id) === String(departamento.id));
                const activo = String(departamentoActivoId) === String(departamento.id);
                const cantidadCiudades = (departamento.ciudades || []).filter(ciudad => ciudadesSeleccionadas.includes(ciudad.id)).length;
                return <div className={`cp-zone-department${activo ? " is-active" : ""}${elegido ? " is-selected" : ""}`} key={departamento.id}><label><input type="checkbox" checked={elegido} onChange={e => alternarDepartamento(departamento.id, e.target.checked)} /><span>{departamento.nombre}</span></label><button type="button" aria-label={`Ver ciudades de ${departamento.nombre}`} aria-current={activo ? "true" : undefined} onClick={() => { if (!elegido) alternarDepartamento(departamento.id, true); else setDepartamentoActivoId(departamento.id); }}><span>{cantidadCiudades ? `${cantidadCiudades} elegidas` : ""}</span><ArrowRight size={18} /></button></div>;
              })}</div></section>
              <section className="cp-zone-dialog__cities" aria-label="Ciudades"><div className="cp-zone-dialog__section-title"><strong>2. Ciudades</strong><span>{ciudadesSeleccionadas.length} elegidas</span></div>{departamentoActivoId && departamentosSeleccionados.some(id => String(id) === String(departamentoActivoId)) ? <><h3>{geografia.find(departamento => String(departamento.id) === String(departamentoActivoId))?.nombre}</h3><div className="cp-zone-dialog__city-list">{(geografia.find(departamento => String(departamento.id) === String(departamentoActivoId))?.ciudades || []).map(ciudad => <label className="cp-zone-city" key={ciudad.id}><input type="checkbox" checked={ciudadesSeleccionadas.includes(ciudad.id)} onChange={e => alternarCiudad(ciudad.id, e.target.checked)} /><span>{ciudad.nombre}</span></label>)}</div></> : <div className="cp-zone-dialog__empty"><MapPin size={24} /><p>Elegí un departamento para ver sus ciudades.</p></div>}</section>
            </div>}
            <footer className="cp-zone-dialog__footer"><span>{ciudadesSeleccionadas.length ? `${ciudadesSeleccionadas.length} ciudad${ciudadesSeleccionadas.length === 1 ? "" : "es"} en ${departamentosSeleccionados.length} departamento${departamentosSeleccionados.length === 1 ? "" : "s"}` : "Todavía no seleccionaste ciudades"}</span><button type="button" className="cp-btn-submit" onClick={() => setSelectorZonasAbierto(false)}>Listo, continuar <Check size={18} /></button></footer>
          </dialog>}
          <p className="cp-entry-note">{esRegistro ? "No se habilita ninguna cuenta hasta aprobar la identidad y los documentos presentados." : "Usá el usuario que te dio tu comercio o el correo de una cuenta courier aprobada."}</p>
        </>}
      </div><p className="cp-entry-legal">© {new Date().getFullYear()} Gesicom · Portal de entregas</p></section>
    </div>
  </main>;
}
