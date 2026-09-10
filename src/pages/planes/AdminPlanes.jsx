import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Check, Plus, X, RotateCcw, AlertTriangle, Eye, BadgePercent, ListChecks, Settings2, Copy, Trash2, RefreshCw } from 'lucide-react';
import {
  cargarPlanes, guardarPlanes, restablecerPlanes, hayPersonalizacion,
  CAMPOS_EDITABLES,
} from '../../lib/planesCatalogo';
import { cargarAfiliadosLocal, guardarAfiliadosLocal, normalizarConfigAfiliados } from '../../lib/afiliadosPrograma';
import { afiliadosService } from '../../services/afiliadosService';
import { planesService } from '../../services/planesService';
import './planes.css';

/**
 * Editor del catálogo de planes — el equivalente de landingTemplates.js pero
 * editable desde la UI.
 *
 * ⚠️ Sin backend: lo que se guarda acá va a localStorage, así que aplica
 *    solo a ESTE navegador. El aviso de arriba de la pantalla lo dice para
 *    que nadie asuma que cambió el precio para todos los comercios.
 */
export default function AdminPlanes() {
  const navigate = useNavigate();
  const [tabActiva, setTabActiva] = useState('planes');
  const [planes, setPlanes] = useState(() => cargarPlanes());
  const [afiliados, setAfiliados] = useState(() => cargarAfiliadosLocal());
  const [guardado, setGuardado] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const [personalizado, setPersonalizado] = useState(() => hayPersonalizacion());
  const [guardandoAfiliados, setGuardandoAfiliados] = useState(false);
  const [afiliadosGuardados, setAfiliadosGuardados] = useState(false);
const [errorAfiliados, setErrorAfiliados] = useState(null);
  const [listaAfiliados, setListaAfiliados] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [cargandoOperativo, setCargandoOperativo] = useState(false);
  const [formAfiliado, setFormAfiliado] = useState({
    nombre: '',
    email: '',
    codigo: '',
    comision_pct: 40,
    estado: 'activo',
    notas: '',
  });

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

  function handleGuardar() {
    const limpios = planes.map(p => ({
      ...p,
      precio: Number(p.precio) || 0,
      features: p.features.map(f => f.trim()).filter(Boolean),
    }));
    setPlanes(limpios);
    const ok = guardarPlanes(limpios);
    setErrorGuardado(!ok);
    setGuardado(ok);
    if (ok) {
      setPersonalizado(true);
      setTimeout(() => setGuardado(false), 3500);
    }
  }

  function handleRestablecer() {
    if (!window.confirm('¿Volver al catálogo de planes por defecto? Se pierden los cambios guardados en este navegador.')) return;
    setPlanes(restablecerPlanes());
    setPersonalizado(false);
    setGuardado(false);
    setErrorGuardado(false);
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
      setFormAfiliado({ nombre: '', email: '', codigo: '', comision_pct: afiliados.comision_pct, estado: 'activo', notas: '' });
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

  function renderEditorPlanes() {
    return (
      <>
        <div className="pl-aviso">
          <AlertTriangle size={16} />
          <span>
            <strong>Provisional: esto no viaja al servidor.</strong>
            Los cambios se guardan en el almacenamiento de este navegador, así que los ves
            solo vos — ningún comercio ni ningún otro admin los recibe. Los precios y features
            que vienen cargados son de ejemplo, todavía sin validar comercialmente.
          </span>
        </div>

        {errorGuardado && (
          <div className="pl-aviso" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
            <AlertTriangle size={16} />
            <span>No se pudo guardar: el navegador está bloqueando el almacenamiento local (ventana privada o cookies deshabilitadas).</span>
          </div>
        )}

        <div className="pl-editor-grid">
          {planes.map((plan, i) => (
            <section key={plan.id} className="pl-editor-card">
              <div className="pl-editor-card-head">
                <h3>{plan.nombre || 'Sin nombre'}</h3>
                <span className="pl-editor-id">id: {plan.id} · plan real: {plan.equivale}</span>
              </div>

              {CAMPOS_EDITABLES.map(({ campo, label, tipo, ayuda }) => (
                <label key={campo} className="pl-campo">
                  <span>{label} {ayuda && <em>— {ayuda}</em>}</span>
                  {tipo === 'area' ? (
                    <textarea
                      value={plan[campo] ?? ''}
                      onChange={e => actualizar(i, campo, e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <input
                      type={tipo === 'numero' ? 'number' : 'text'}
                      min={tipo === 'numero' ? 0 : undefined}
                      step={tipo === 'numero' ? 1000 : undefined}
                      value={plan[campo] ?? ''}
                      onChange={e => actualizar(i, campo, e.target.value)}
                    />
                  )}
                </label>
              ))}

              <div className="pl-campo">
                <span>Qué incluye</span>
                <div className="pl-features-editor">
                  {plan.features.map((f, j) => (
                    <div key={j} className="pl-feature-row">
                      <input
                        value={f}
                        onChange={e => actualizarFeature(i, j, e.target.value)}
                        placeholder="Ej: Dominio propio con certificado"
                      />
                      <button
                        type="button"
                        className="pl-btn-icono"
                        onClick={() => quitarFeature(i, j)}
                        title="Quitar esta línea"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="pl-btn-texto" onClick={() => agregarFeature(i)}>
                    <Plus size={13} /> Agregar línea
                  </button>
                </div>
              </div>

              <label className="pl-campo pl-check">
                <input
                  type="checkbox"
                  checked={!!plan.destacado}
                  onChange={e => marcarDestacado(i, e.target.checked)}
                />
                Destacar este plan (solo uno a la vez)
              </label>
            </section>
          ))}
        </div>
      </>
    );
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

        <form className="pl-affiliate-form" onSubmit={handleCrearAfiliado}>
          <label className="pl-campo">
            <span>Nombre</span>
            <input value={formAfiliado.nombre} onChange={e => setFormAfiliado(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Agencia ABC" />
          </label>
          <label className="pl-campo">
            <span>Email</span>
            <input value={formAfiliado.email} onChange={e => setFormAfiliado(f => ({ ...f, email: e.target.value }))} placeholder="afiliado@email.com" />
          </label>
          <label className="pl-campo">
            <span>Código</span>
            <input value={formAfiliado.codigo} onChange={e => setFormAfiliado(f => ({ ...f, codigo: e.target.value }))} placeholder="Se genera si queda vacío" />
          </label>
          <label className="pl-campo">
            <span>Comisión %</span>
            <input type="number" min="0" max="100" value={formAfiliado.comision_pct} onChange={e => setFormAfiliado(f => ({ ...f, comision_pct: e.target.value }))} />
          </label>
          <button type="submit" className="pl-btn primario"><Plus size={14} /> Crear afiliado</button>
        </form>

        <div className="pl-table-wrap">
          <table className="pl-admin-table">
            <thead>
              <tr>
                <th>Afiliado</th>
                <th>Código / link</th>
                <th>Comisión</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listaAfiliados.length === 0 ? (
                <tr><td colSpan="5">Todavía no hay afiliados creados.</td></tr>
              ) : listaAfiliados.map(a => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.nombre}</strong>
                    <span>{a.email || 'Sin email'}</span>
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
                  <td>USD {Number(c.monto_base || 0).toLocaleString('en-US')}</td>
                  <td><strong>USD {Number(c.monto_comision || 0).toLocaleString('en-US')}</strong> <span>{c.comision_pct}%</span></td>
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
    <div className="pl-page">
      <header className="pl-admin-head">
        <div>
          <h1>Planes</h1>
          <p>
            Definí qué ve un comercio en la pantalla de planes: nombre, precio, resumen,
            features y cuál es el plan destacado.
          </p>
        </div>
        <div className="pl-admin-acciones">
          <button type="button" className="pl-btn" onClick={() => navigate('/planes')}>
            <Eye size={14} /> Ver como comercio
          </button>
          {tabActiva === 'planes' && personalizado && (
            <button type="button" className="pl-btn" onClick={handleRestablecer}>
              <RotateCcw size={14} /> Restablecer
            </button>
          )}
          {tabActiva === 'planes' && guardado && <span className="pl-guardado"><Check size={14} /> Guardado</span>}
          {tabActiva === 'afiliados' && afiliadosGuardados && <span className="pl-guardado"><Check size={14} /> Guardado</span>}
          {tabActiva === 'planes' ? (
            <button type="button" className="pl-btn primario" onClick={handleGuardar}>
              <Save size={14} /> Guardar planes
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
