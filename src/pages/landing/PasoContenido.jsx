import React from 'react';
import { ChevronUp, ChevronDown, ImagePlus, Loader, Plus, Trash2 } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import StarRating from './StarRating';

const MAX_TESTIMONIOS = 20;
const MAX_FAQ = 20;

/**
 * Paso "Opiniones y FAQ" del constructor. Testimonios/FAQ son propios de
 * ESTA landing (igual que el banner) y se guardan en bloque junto con el
 * resto del form — no tienen ABM propio con guardado inmediato, así que las
 * filas viven en el estado local del wizard hasta el próximo Guardar.
 */
export default function PasoContenido({
  mostrarTestimonios, mostrarFaq, onChange,
  testimonios, onAgregarTestimonio, onActualizarTestimonio, onQuitarTestimonio, onMoverTestimonio,
  onSubirFotoTestimonio, subiendoFotoTestimonio,
  faqs, onAgregarFaq, onActualizarFaq, onQuitarFaq, onMoverFaq,
}) {
  return (
    <div className="lb-section">
      <header className="lb-section-head">
        <h2>Opiniones de tus clientes</h2>
        <p>Testimonios reales que aparecen en un carrusel de tu landing pública.</p>
      </header>

      <label className="lb-switch">
        <input
          type="checkbox"
          checked={mostrarTestimonios}
          onChange={e => onChange('mostrar_testimonios', e.target.checked)}
        />
        <span className="lb-switch-track" />
        <span className="lb-switch-label">Mostrar sección de opiniones en esta landing</span>
      </label>

      {mostrarTestimonios && (
        <div className="lb-contenido-lista">
          {testimonios.map((t, idx) => (
            <div key={idx} className="lb-contenido-fila">
              <div className="lb-contenido-fila-head">
                <div className="lb-contenido-orden">
                  <button type="button" onClick={() => onMoverTestimonio(idx, -1)} disabled={idx === 0} title="Subir">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => onMoverTestimonio(idx, 1)} disabled={idx === testimonios.length - 1} title="Bajar">
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className="lb-contenido-numero">#{idx + 1}</span>
                <button type="button" className="lb-contenido-quitar" onClick={() => onQuitarTestimonio(idx)} title="Quitar testimonio">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="lb-testimonio-cuerpo">
                <div className="lb-testimonio-foto">
                  {t.foto ? (
                    <img src={getMediaUrl(t.foto)} alt="" />
                  ) : (
                    <label className="lb-testimonio-foto-vacia">
                      {subiendoFotoTestimonio === idx ? <Loader size={16} className="spin-icon" /> : <ImagePlus size={16} />}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        disabled={subiendoFotoTestimonio === idx}
                        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onSubirFotoTestimonio(idx, f); }}
                      />
                    </label>
                  )}
                </div>

                <div className="lb-testimonio-campos">
                  <label className="lb-field">
                    <span>Nombre</span>
                    <input
                      value={t.nombre}
                      onChange={e => onActualizarTestimonio(idx, 'nombre', e.target.value)}
                      placeholder="Ej: María González"
                      maxLength={150}
                    />
                  </label>
                  <div className="lb-field">
                    <span>Calificación</span>
                    <StarRating value={t.calificacion} onChange={(v) => onActualizarTestimonio(idx, 'calificacion', v)} size={18} />
                  </div>
                  <label className="lb-field ancho-total">
                    <span>Comentario</span>
                    <textarea
                      rows={2}
                      value={t.comentario}
                      onChange={e => onActualizarTestimonio(idx, 'comentario', e.target.value)}
                      placeholder="Lo que dijo tu cliente"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}

          {testimonios.length < MAX_TESTIMONIOS ? (
            <button type="button" className="lb-btn-ghost" onClick={onAgregarTestimonio}>
              <Plus size={14} /> Agregar testimonio
            </button>
          ) : (
            <small className="lb-sin-guardar">Llegaste al máximo de {MAX_TESTIMONIOS} testimonios.</small>
          )}
        </div>
      )}

      <header className="lb-section-head separada">
        <h2>Preguntas frecuentes</h2>
        <p>Un acordeón con las dudas más comunes, antes del pie de tu landing.</p>
      </header>

      <label className="lb-switch">
        <input
          type="checkbox"
          checked={mostrarFaq}
          onChange={e => onChange('mostrar_faq', e.target.checked)}
        />
        <span className="lb-switch-track" />
        <span className="lb-switch-label">Mostrar sección de preguntas frecuentes en esta landing</span>
      </label>

      {mostrarFaq && (
        <div className="lb-contenido-lista">
          {faqs.map((f, idx) => (
            <div key={idx} className="lb-contenido-fila">
              <div className="lb-contenido-fila-head">
                <div className="lb-contenido-orden">
                  <button type="button" onClick={() => onMoverFaq(idx, -1)} disabled={idx === 0} title="Subir">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => onMoverFaq(idx, 1)} disabled={idx === faqs.length - 1} title="Bajar">
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className="lb-contenido-numero">#{idx + 1}</span>
                <button type="button" className="lb-contenido-quitar" onClick={() => onQuitarFaq(idx)} title="Quitar pregunta">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="lb-form-grid">
                <label className="lb-field ancho-total">
                  <span>Pregunta</span>
                  <input
                    value={f.pregunta}
                    onChange={e => onActualizarFaq(idx, 'pregunta', e.target.value)}
                    placeholder="Ej: ¿Hacen envíos a todo el país?"
                    maxLength={300}
                  />
                </label>
                <label className="lb-field ancho-total">
                  <span>Respuesta</span>
                  <textarea
                    rows={2}
                    value={f.respuesta}
                    onChange={e => onActualizarFaq(idx, 'respuesta', e.target.value)}
                    placeholder="La respuesta que va a ver el visitante"
                  />
                </label>
              </div>
            </div>
          ))}

          {faqs.length < MAX_FAQ ? (
            <button type="button" className="lb-btn-ghost" onClick={onAgregarFaq}>
              <Plus size={14} /> Agregar pregunta
            </button>
          ) : (
            <small className="lb-sin-guardar">Llegaste al máximo de {MAX_FAQ} preguntas.</small>
          )}
        </div>
      )}
    </div>
  );
}
