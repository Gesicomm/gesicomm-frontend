import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Check, Plus, X, RotateCcw, AlertTriangle, Eye } from 'lucide-react';
import {
  cargarPlanes, guardarPlanes, restablecerPlanes, hayPersonalizacion,
  CAMPOS_EDITABLES,
} from '../../lib/planesCatalogo';
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
  const [planes, setPlanes] = useState(() => cargarPlanes());
  const [guardado, setGuardado] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const [personalizado, setPersonalizado] = useState(() => hayPersonalizacion());

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
          {personalizado && (
            <button type="button" className="pl-btn" onClick={handleRestablecer}>
              <RotateCcw size={14} /> Restablecer
            </button>
          )}
          {guardado && <span className="pl-guardado"><Check size={14} /> Guardado</span>}
          <button type="button" className="pl-btn primario" onClick={handleGuardar}>
            <Save size={14} /> Guardar planes
          </button>
        </div>
      </header>

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
    </div>
  );
}
