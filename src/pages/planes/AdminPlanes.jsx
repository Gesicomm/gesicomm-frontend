import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Check, Plus, X, RotateCcw, AlertTriangle, Eye, EyeOff, BadgePercent, ListChecks, Settings2, Copy, Trash2, RefreshCw } from 'lucide-react';
import {
  cargarPlanes, guardarPlanes, restablecerPlanes, limpiarPlanesLocales,
  CAMPOS_EDITABLES, normalizarCatalogoPlanes,
} from '../../lib/planesCatalogo';
import { cargarAfiliadosLocal, guardarAfiliadosLocal, normalizarConfigAfiliados } from '../../lib/afiliadosPrograma';
import { afiliadosService } from '../../services/afiliadosService';
import { planesService } from '../../services/planesService';
import './planes.css';
import './adminPlanes.css';

/** Editor del catálogo comercial que se publica en /planes. */
export default function AdminPlanes() {
  const navigate = useNavigate();
  const [tabActiva, setTabActiva] = useState('planes');
  const [planes, setPlanes] = useState(() => cargarPlanes());
  const [afiliados, setAfiliados] = useState(() => cargarAfiliadosLocal());
  const [guardado, setGuardado] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const [cargandoPlanes, setCargandoPlanes] = useState(false);
  const [catalogoCargado, setCatalogoCargado] = useState(false);
  const [guardandoPlanes, setGuardandoPlanes] = useState(false);
  const [guardandoAfiliados, setGuardandoAfiliados] = useState(false);
  const [afiliadosGuardados, setAfiliadosGuardados] = useState(false);
const [errorAfiliados, setErrorAfiliados] = useState(null);
  const [listaAfiliados, setListaAfiliados] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [cargandoOperativo, setCargandoOperativo] = useState(false);
  const formAfiliadoInicial = {
    nombre: '',
    email: '',
    telefono: '',
    codigo: '',
    comision_pct: 40,
    estado: 'activo',
    metodo_pago: 'transferencia',
    entidad_pago: '',
    titular_pago: '',
    documento_pago: '',
    cuenta_pago: '',
    notas: '',
  };
  const [formAfiliado, setFormAfiliado] = useState(formAfiliadoInicial);

  useEffect(() => {
    let activo = true;
    setCargandoPlanes(true);
    planesService.planesAdmin()
      .then((catalogo) => {
        if (!activo) return;
        setPlanes(normalizarCatalogoPlanes(catalogo));
        setCatalogoCargado(true);
        setErrorGuardado(false);
      })
      .catch(() => {
        if (activo) setErrorGuardado('No se pudo cargar el catálogo del servidor. Se muestra una copia local.');
      })
      .finally(() => {
        if (activo) setCargandoPlanes(false);
      });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    planesService.afiliadosConfig()
      .then((config) => {
        if (!activo) return;
        const normalizada = normalizarConfigAfiliados(config);
        setAfiliados(normalizada);
        guardarAfiliadosLocal(normalizada);
      })
      .catch(() => {
        if (activo) setErrorAfiliados('No pudimos cargar la configuración del servidor. Se muestran los valores locales.');
      });
    return () => { activo = false; };
  }, []);

  async function cargarOperativoAfiliados() {
    setCargandoOperativo(true);
    try {
      const [afiliadosResp, comisionesResp] = await Promise.all([
        afiliadosService.listar(),
        afiliadosService.comisiones(),
      ]);
      setListaAfiliados(afiliadosResp);
      setComisiones(comisionesResp);
    } catch (err) {
      setErrorAfiliados(err.response?.data?.message || err.message || 'No se pudieron cargar afiliados y comisiones.');
    } finally {
      setCargandoOperativo(false);
    }
  }

  useEffect(() => {
    if (tabActiva === 'afiliados') cargarOperativoAfiliados();
  }, [tabActiva]);

  function actualizar(indice, campo, valor) {
    setPlanes(prev => prev.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)));
    setGuardado(false);
  }

  function actualizarFeature(indice, iFeature, valor) {
    setPlanes(prev => prev.map((p, i) => (
      i === indice ? { ...p, features: p.features.map((f, j) => (j === iFeature ? valor : f)) } : p
    )));
    setGuardado(false);
  }

  function agregarFeature(indice) {
    setPlanes(prev => prev.map((p, i) => (i === indice ? { ...p, features: [...p.features, ''] } : p)));
    setGuardado(false);
  }

  function quitarFeature(indice, iFeature) {
    setPlanes(prev => prev.map((p, i) => (
      i === indice ? { ...p, features: p.features.filter((_, j) => j !== iFeature) } : p
    )));
    setGuardado(false);
  }

  // Solo un plan puede ser el destacado: si se marca uno, se desmarca el resto.
  function marcarDestacado(indice, valor) {
    setPlanes(prev => prev.map((p, i) => ({ ...p, destacado: valor && i === indice })));
    setGuardado(false);
  }

  function cambiarVisibilidad(indice, visible) {
    setPlanes(prev => prev.map((p, i) => (
      i === indice ? { ...p, activo: visible, destacado: visible ? p.destacado : false } : p
    )));
    setGuardado(false);
  }

  async function handleGuardar() {
    const limpios = planes.map(p => ({
      ...p,
      precio: Number(p.precio) || 0,
      moneda: ['PYG', 'USD'].includes(p.moneda) ? p.moneda : 'PYG',
      features: p.features.map(f => f.trim()).filter(Boolean),
    }));
    setPlanes(limpios);
    setGuardandoPlanes(true);
    setErrorGuardado(false);
    try {
      const guardados = await planesService.guardarPlanesAdmin(limpios);
      setPlanes(normalizarCatalogoPlanes(guardados || limpios));
      limpiarPlanesLocales();
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3500);
    } catch (err) {
      const okLocal = guardarPlanes(limpios);
      setErrorGuardado(
        okLocal
          ? 'No se pudo guardar en el servidor. Dejé una copia local para que no pierdas los cambios.'
          : (err.response?.data?.message || err.message || 'No se pudo guardar el catálogo de planes.'),
      );
    } finally {
      setGuardandoPlanes(false);
    }
  }

  async function handleRestablecer() {
    if (!window.confirm('¿Volver al catálogo base de planes? Se reemplazará la configuración publicada.')) return;
    const base = restablecerPlanes();
    setPlanes(base);
    setGuardado(false);
    setErrorGuardado(false);
    setGuardandoPlanes(true);
    try {
      const guardados = await planesService.guardarPlanesAdmin(base);
      setPlanes(normalizarCatalogoPlanes(guardados || base));
      limpiarPlanesLocales();
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3500);
    } catch (err) {
      setErrorGuardado(err.response?.data?.message || err.message || 'No se pudo restablecer el catálogo en el servidor.');
    } finally {
      setGuardandoPlanes(false);
    }
  }

  function actualizarAfiliados(campo, valor) {
    setAfiliados(prev => normalizarConfigAfiliados({ ...prev, [campo]: valor }));
    setAfiliadosGuardados(false);
    setErrorAfiliados(null);
  }

  function actualizarLineaAfiliados(campo, indice, valor) {
    setAfiliados(prev => normalizarConfigAfiliados({
      ...prev,
      [campo]: prev[campo].map((item, i) => (i === indice ? valor : item)),
    }));
    setAfiliadosGuardados(false);
    setErrorAfiliados(null);
  }

  function agregarLineaAfiliados(campo) {
    setAfiliados(prev => normalizarConfigAfiliados({ ...prev, [campo]: [...prev[campo], ''] }));
    setAfiliadosGuardados(false);
  }

  function quitarLineaAfiliados(campo, indice) {
    setAfiliados(prev => normalizarConfigAfiliados({
      ...prev,
      [campo]: prev[campo].filter((_, i) => i !== indice),
    }));
    setAfiliadosGuardados(false);
  }

  async function handleGuardarAfiliados() {
    const limpia = normalizarConfigAfiliados(afiliados);
    setGuardandoAfiliados(true);
    setErrorAfiliados(null);
    setAfiliadosGuardados(false);
    try {
      const guardada = await planesService.guardarAfiliadosConfig(limpia);
      const normalizada = normalizarConfigAfiliados(guardada);
      setAfiliados(normalizada);
      guardarAfiliadosLocal(normalizada);
      setAfiliadosGuardados(true);
      setTimeout(() => setAfiliadosGuardados(false), 3500);
    } catch (err) {
      const okLocal = guardarAfiliadosLocal(limpia);
      setErrorAfiliados(
        okLocal
          ? 'No se pudo guardar en el servidor. Dejé una copia local en este navegador.'
          : (err.message || 'No se pudo guardar el programa de afiliados.'),
      );
    } finally {
      setGuardandoAfiliados(false);
    }
  }

  async function handleCrearAfiliado(e) {
    e.preventDefault();
    setErrorAfiliados(null);
    try {
      const creado = await afiliadosService.crear(formAfiliado);
      setListaAfiliados(prev => [creado, ...prev]);
      setFormAfiliado({ ...formAfiliadoInicial, comision_pct: afiliados.comision_pct });
    } catch (err) {
      setErrorAfiliados(err.response?.data?.message || err.message || 'No se pudo crear el afiliado.');
    }
  }

  async function actualizarAfiliado(id, cambios) {
    setErrorAfiliados(null);
    try {
      const actualizado = await afiliadosService.actualizar(id, cambios);
      setListaAfiliados(prev => prev.map(a => (a.id === id ? actualizado : a)));
    } catch (err) {
      setErrorAfiliados(err.response?.data?.message || err.message || 'No se pudo actualizar el afiliado.');
    }
  }

  async function eliminarAfiliado(id) {
    if (!window.confirm('¿Eliminar este afiliado? Las comisiones históricas pueden perder la relación directa.')) return;
    setErrorAfiliados(null);
    try {
      await afiliadosService.eliminar(id);
      setListaAfiliados(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setErrorAfiliados(err.response?.data?.message || err.message || 'No se pudo eliminar el afiliado.');
    }
  }

  async function actualizarEstadoComision(id, estado) {
    try {
      const actualizada = await afiliadosService.actualizarComision(id, { estado });
      setComisiones(prev => prev.map(c => (c.id === id ? actualizada : c)));
    } catch (err) {
      setErrorAfiliados(err.response?.data?.message || err.message || 'No se pudo actualizar la comisión.');
    }
  }

  async function copiarLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      setAfiliadosGuardados(true);
      setTimeout(() => setAfiliadosGuardados(false), 2000);
    } catch {
      setErrorAfiliados('No se pudo copiar el link. Podés seleccionarlo manualmente.');
    }
  }

  function formatUsd(valor) {
    return `USD ${Number(valor || 0).toLocaleString('en-US')}`;
  }

  function renderEditorPlanes() {
    return <>
      <div className="pl-catalog-intro"><div><h2>Cuatro planes, dos formas de trabajar</h2><p>Una ruta permite elegir E-commerce o Marca personal. Ambas rutas incluye los dos espacios.</p></div><span className="pl-catalog-count">4 planes</span></div>
      <p className="pl-catalog-legacy-note">Las cuentas migradas desde planes anteriores conservan ambas rutas sin vencimiento. Ese acceso no se vende como un plan adicional.</p>
      {errorGuardado && <div className="pl-aviso pl-aviso-error" role="alert"><AlertTriangle size={18}/><span>{errorGuardado}</span></div>}
      {cargandoPlanes ? <p className="pl-cargando" role="status"><RefreshCw size={18} className="spin-icon"/> Cargando catálogo…</p> :
      <div className="pl-catalog-grid">{planes.map((plan,i)=><section key={plan.codigo} className="pl-catalog-card" aria-labelledby={`plan-title-${plan.codigo}`}>
        <header className="pl-catalog-card-heading"><div><span className="pl-catalog-family">{plan.acceso_rutas==='elegir'?'1 ruta a elección':'2 rutas incluidas'}</span><h3 id={`plan-title-${plan.codigo}`}>{plan.nombre}</h3></div><span className="pl-catalog-period">{plan.periodicidad==='anual'?'Anual':'Mensual'}</span></header>
        <div className="pl-catalog-price"><strong>{plan.moneda==='USD'?'US$':'₲'} {Number(plan.precio||0).toLocaleString(plan.moneda==='USD'?'en-US':'es-PY')}</strong><span>{plan.periodicidad==='anual'?'por año · pago adelantado':'por mes'}</span></div>
        <p className="pl-catalog-scope">{plan.acceso_rutas==='elegir'?'E-commerce o Marca personal: el cliente elige una al contratar.':'E-commerce y Marca personal con acceso a los dos espacios.'}</p>
        <fieldset className="pl-catalog-fields" disabled={guardandoPlanes || !catalogoCargado}><legend>Precio y publicación</legend>
          <div className="pl-catalog-price-fields"><label className="pl-campo"><span>Precio del plan</span><input type="number" min="1" step="1" required value={plan.precio} onChange={e=>actualizar(i,'precio',e.target.value)}/></label>
          <label className="pl-campo"><span>Moneda</span><select value={plan.moneda||'PYG'} onChange={e=>actualizar(i,'moneda',e.target.value)}><option value="PYG">Guaraníes (PYG)</option><option value="USD">Dólares (USD)</option></select></label></div>
          <label className="pl-catalog-check"><input type="checkbox" checked={plan.activo!==false} onChange={e=>cambiarVisibilidad(i,e.target.checked)}/>{plan.activo!==false?<Eye size={17} aria-hidden="true"/>:<EyeOff size={17} aria-hidden="true"/>}<span>Visible en landing y /planes</span></label>
          <label className="pl-catalog-check"><input type="checkbox" checked={!!plan.destacado} disabled={plan.activo===false} onChange={e=>marcarDestacado(i,e.target.checked)}/><span>Destacar este plan</span></label>
        </fieldset>
        <details className="pl-catalog-details"><summary>Textos y beneficios del plan</summary><div>
          {CAMPOS_EDITABLES.filter(c=>!['precio','moneda'].includes(c.campo)).map(({campo,label,tipo,ayuda})=><label key={campo} className="pl-campo"><span>{label}</span>{tipo==='area'?<textarea rows={3} value={plan[campo]||''} onChange={e=>actualizar(i,campo,e.target.value)}/>:<input value={plan[campo]||''} onChange={e=>actualizar(i,campo,e.target.value)}/>} {ayuda&&<small>{ayuda}</small>}</label>)}
          <div className="pl-campo"><span>Qué incluye</span><div className="pl-features-editor">{plan.features.map((f,j)=><div key={j} className="pl-feature-row"><input value={f} aria-label={`Beneficio ${j+1} de ${plan.nombre}`} onChange={e=>actualizarFeature(i,j,e.target.value)}/><button type="button" className="pl-btn-icono" aria-label={`Quitar beneficio ${j+1} de ${plan.nombre}`} onClick={()=>quitarFeature(i,j)}><X size={16}/></button></div>)}<button type="button" className="pl-btn-texto" onClick={()=>agregarFeature(i)}><Plus size={16}/> Agregar beneficio</button></div></div>
        </div></details>
      </section>)}</div>}
    </>;
  }

  function renderListaEditable(campo, titulo, placeholder) {
    return (
      <div className="pl-campo">
        <span>{titulo}</span>
        <div className="pl-features-editor">
          {afiliados[campo].map((item, i) => (
            <div key={i} className="pl-feature-row">
              <input
                value={item}
                onChange={e => actualizarLineaAfiliados(campo, i, e.target.value)}
                placeholder={placeholder}
              />
              <button
                type="button"
                className="pl-btn-icono"
                onClick={() => quitarLineaAfiliados(campo, i)}
                title="Quitar esta regla"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="pl-btn-texto" onClick={() => agregarLineaAfiliados(campo)}>
            <Plus size={13} /> Agregar regla
          </button>
        </div>
      </div>
    );
  }

  function renderAfiliados() {
    return (
      <section className="pl-affiliates">
        <div className="pl-affiliates-summary">
          <div className="pl-affiliate-metric">
            <BadgePercent size={22} />
            <div>
              <strong>{afiliados.comision_pct}%</strong>
              <span>comisión recurrente</span>
            </div>
          </div>
          <div className="pl-affiliate-status">
            <span className={afiliados.activo ? 'activo' : 'pausado'}>{afiliados.activo ? 'Activo' : 'Pausado'}</span>
            <p>Aplica sobre suscripciones SaaS elegibles efectivamente cobradas.</p>
          </div>
        </div>

        {errorAfiliados && (
          <div className="pl-aviso pl-aviso-error">
            <AlertTriangle size={16} />
            <span>{errorAfiliados}</span>
          </div>
        )}

        <div className="pl-affiliates-grid">
          <section className="pl-editor-card">
            <div className="pl-editor-card-head">
              <h3>Configuración comercial</h3>
              <span className="pl-editor-id">Programa de Afiliados</span>
            </div>

            <label className="pl-campo pl-check">
              <input
                type="checkbox"
                checked={!!afiliados.activo}
                onChange={e => actualizarAfiliados('activo', e.target.checked)}
              />
              Programa activo
            </label>

            <label className="pl-campo">
              <span>Comisión recurrente (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={afiliados.comision_pct}
                onChange={e => actualizarAfiliados('comision_pct', e.target.value)}
              />
            </label>

            <label className="pl-campo">
              <span>Base comisionable</span>
              <textarea
                rows={2}
                value={afiliados.base_comisionable}
                onChange={e => actualizarAfiliados('base_comisionable', e.target.value)}
              />
            </label>

            <label className="pl-campo">
              <span>Recurrencia</span>
              <textarea
                rows={2}
                value={afiliados.recurrencia}
                onChange={e => actualizarAfiliados('recurrencia', e.target.value)}
              />
            </label>
          </section>

          <section className="pl-editor-card">
            <div className="pl-editor-card-head">
              <h3>Reglas y exclusiones</h3>
              <span className="pl-editor-id">Términos visibles</span>
            </div>
            {renderListaEditable('condiciones', 'Condiciones', 'Ej: El pago debe estar confirmado.')}
            {renderListaEditable('exclusiones', 'Exclusiones', 'Ej: No aplica a autorreferidos.')}
          </section>
        </div>

        <div className="pl-affiliate-section-head">
          <h3>Afiliados registrados</h3>
          <button type="button" className="pl-btn" onClick={cargarOperativoAfiliados} disabled={cargandoOperativo}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        <div className="pl-aviso pl-aviso-ok">
          <Check size={16} />
          <span>
            Los afiliados se activan desde el panel del usuario en “Quiero ser afiliado”.
            Desde acá se ajusta la comisión, el estado y la liquidación.
          </span>
        </div>

        <div className="pl-table-wrap">
          <table className="pl-admin-table">
            <thead>
              <tr>
                <th>Afiliado</th>
                <th>Código / link</th>
                <th>Comisión</th>
                <th>A liquidar</th>
                <th>Datos de pago</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listaAfiliados.length === 0 ? (
                <tr><td colSpan="7">Todavía no hay afiliados creados.</td></tr>
              ) : listaAfiliados.map(a => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.nombre}</strong>
                    <span>{a.email || 'Sin email'}{a.telefono ? ` · ${a.telefono}` : ''}</span>
                  </td>
                  <td>
                    <code>{a.codigo}</code>
                    <small>{a.link}</small>
                  </td>
                  <td>
                    <input
                      className="pl-mini-input"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={a.comision_pct}
                      onBlur={e => actualizarAfiliado(a.id, { comision_pct: e.target.value })}
                    />
                  </td>
                  <td>
                    <strong>{formatUsd(a.resumen_comisiones?.total_a_liquidar)}</strong>
                    <span>Pagado: {formatUsd(a.resumen_comisiones?.pagada)}</span>
                  </td>
                  <td>
                    <strong>{a.metodo_pago || 'Sin método'}</strong>
                    <span>{[a.entidad_pago, a.titular_pago].filter(Boolean).join(' · ') || 'Sin entidad/titular'}</span>
                    <small>{[a.documento_pago, a.cuenta_pago].filter(Boolean).join(' · ') || 'Sin cuenta cargada'}</small>
                  </td>
                  <td>
                    <select value={a.estado} onChange={e => actualizarAfiliado(a.id, { estado: e.target.value })}>
                      <option value="activo">Activo</option>
                      <option value="pausado">Pausado</option>
                    </select>
                  </td>
                  <td className="pl-table-actions">
                    <button type="button" className="pl-btn-icono" onClick={() => copiarLink(a.link)} title="Copiar link"><Copy size={14} /></button>
                    <button type="button" className="pl-btn-icono" onClick={() => eliminarAfiliado(a.id)} title="Eliminar afiliado"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pl-affiliate-section-head">
          <h3>Comisiones generadas</h3>
          <span>{comisiones.length} registros</span>
        </div>

        <div className="pl-table-wrap">
          <table className="pl-admin-table">
            <thead>
              <tr>
                <th>Afiliado</th>
                <th>Cliente / plan</th>
                <th>Base</th>
                <th>Comisión</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {comisiones.length === 0 ? (
                <tr><td colSpan="5">Aún no hay ventas atribuidas a afiliados.</td></tr>
              ) : comisiones.map(c => (
                <tr key={c.id}>
                  <td>{c.afiliado?.nombre || `#${c.afiliado_id}`}</td>
                  <td>
                    <strong>{c.cliente_email || 'Cliente sin email'}</strong>
                    <span>{c.plan || `Suscripción #${c.suscripcion_id}`}</span>
                  </td>
                  <td>{formatUsd(c.monto_base)}</td>
                  <td><strong>{formatUsd(c.monto_comision)}</strong> <span>{c.comision_pct}%</span></td>
                  <td>
                    <select value={c.estado} onChange={e => actualizarEstadoComision(c.id, e.target.value)}>
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobada">Aprobada</option>
                      <option value="pagada">Pagada</option>
                      <option value="anulada">Anulada</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <div className="pl-page pl-admin-page">
      <header className="pl-admin-head">
        <div>
          <h1>Planes</h1>
          <p>
            Administrá el precio y la publicación de los cuatro planes de Gesicom.
          </p>
        </div>
        <div className="pl-admin-acciones">
          <button type="button" className="pl-btn" onClick={() => navigate('/planes?preview=admin')}>
            <Eye size={14} /> Ver como comercio
          </button>
          {tabActiva === 'planes' && (
            <button type="button" className="pl-btn" onClick={handleRestablecer} disabled={guardandoPlanes || cargandoPlanes}>
              <RotateCcw size={14} /> Restablecer
            </button>
          )}
          {tabActiva === 'planes' && guardado && <span className="pl-guardado"><Check size={14} /> Guardado</span>}
          {tabActiva === 'afiliados' && afiliadosGuardados && <span className="pl-guardado"><Check size={14} /> Guardado</span>}
          {tabActiva === 'planes' ? (
            <button type="button" className="pl-btn primario" onClick={handleGuardar} disabled={guardandoPlanes || cargandoPlanes || !catalogoCargado}>
              {guardandoPlanes ? <RefreshCw size={14} className="spin-icon" /> : <Save size={14} />} {guardandoPlanes ? 'Guardando...' : 'Guardar planes'}
            </button>
          ) : (
            <button type="button" className="pl-btn primario" onClick={handleGuardarAfiliados} disabled={guardandoAfiliados}>
              <Save size={14} /> {guardandoAfiliados ? 'Guardando...' : 'Guardar afiliados'}
            </button>
          )}
        </div>
      </header>

      <div className="pl-tabs">
        <button
          type="button"
          className={tabActiva === 'planes' ? 'activo' : ''}
          onClick={() => setTabActiva('planes')}
        >
          <Settings2 size={15} /> Planes
        </button>
        <button
          type="button"
          className={tabActiva === 'afiliados' ? 'activo' : ''}
          onClick={() => setTabActiva('afiliados')}
        >
          <ListChecks size={15} /> Afiliados
        </button>
      </div>

      {tabActiva === 'planes' ? renderEditorPlanes() : renderAfiliados()}
    </div>
  );
}
