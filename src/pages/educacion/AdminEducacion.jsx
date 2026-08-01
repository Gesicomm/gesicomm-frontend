import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Video,
  FileQuestion,
  CheckCircle2,
  X,
  Save,
  HelpCircle,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  adminListModulos,
  adminCreateModulo,
  adminUpdateModulo,
  adminDeleteModulo
} from '../../services/educacionApi';
import './EducacionView.css';

const AdminEducacion = () => {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [moduloEditando, setModuloEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    orden: 1,
    video_url: '',
    duracion_minutos: 10,
    menu_desbloqueado: '',
    activo: true,
    examen: {
      titulo: 'Evaluación del Módulo',
      descripcion: '',
      puntaje_minimo: 70,
      activo: true,
      preguntas: [],
    },
  });

  useEffect(() => {
    cargarModulos();
  }, []);

  const cargarModulos = async () => {
    try {
      setLoading(true);
      const data = await adminListModulos();
      setModulos(data.modulos || []);
    } catch (err) {
      console.error('Error al cargar módulos (admin):', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirNuevo = () => {
    setModuloEditando(null);
    setFormData({
      titulo: '',
      descripcion: '',
      orden: modulos.length + 1,
      video_url: '',
      duracion_minutos: 10,
      menu_desbloqueado: '',
      activo: true,
      examen: {
        titulo: 'Evaluación del Módulo',
        descripcion: '',
        puntaje_minimo: 70,
        activo: true,
        preguntas: [
          {
            pregunta: 'Pregunta 1...',
            tipo: 'opcion_multiple',
            opciones: [
              { id: 'A', texto: 'Opción A' },
              { id: 'B', texto: 'Opción B' },
            ],
            respuesta_correcta: 'A',
            explicacion: '',
            orden: 1,
          },
        ],
      },
    });
    setModalAbierto(true);
  };

  const handleAbrirEditar = (m) => {
    setModuloEditando(m);
    setFormData({
      titulo: m.titulo,
      descripcion: m.descripcion || '',
      orden: m.orden,
      video_url: m.video_url,
      duracion_minutos: m.duracion_minutos || 10,
      menu_desbloqueado: m.menu_desbloqueado || '',
      activo: m.activo,
      examen: m.examen
        ? {
            titulo: m.examen.titulo,
            descripcion: m.examen.descripcion || '',
            puntaje_minimo: m.examen.puntaje_minimo,
            activo: m.examen.activo,
            preguntas: m.examen.preguntas || [],
          }
        : {
            titulo: 'Evaluación del Módulo',
            descripcion: '',
            puntaje_minimo: 70,
            activo: true,
            preguntas: [],
          },
    });
    setModalAbierto(true);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este módulo de educación?')) return;
    try {
      await adminDeleteModulo(id);
      await cargarModulos();
    } catch (err) {
      console.error('Error al eliminar módulo:', err);
    }
  };

  const handleAgregarPregunta = () => {
    setFormData(prev => ({
      ...prev,
      examen: {
        ...prev.examen,
        preguntas: [
          ...prev.examen.preguntas,
          {
            pregunta: `Nueva Pregunta ${prev.examen.preguntas.length + 1}`,
            tipo: 'opcion_multiple',
            opciones: [
              { id: 'A', texto: 'Opción A' },
              { id: 'B', texto: 'Opción B' },
            ],
            respuesta_correcta: 'A',
            explicacion: '',
            orden: prev.examen.preguntas.length + 1,
          },
        ],
      },
    }));
  };

  const handleEliminarPregunta = (pIdx) => {
    setFormData(prev => ({
      ...prev,
      examen: {
        ...prev.examen,
        preguntas: prev.examen.preguntas.filter((_, idx) => idx !== pIdx),
      },
    }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      setGuardando(true);
      if (moduloEditando) {
        await adminUpdateModulo(moduloEditando.id, formData);
      } else {
        await adminCreateModulo(formData);
      }
      setModalAbierto(false);
      await cargarModulos();
    } catch (err) {
      console.error('Error al guardar módulo:', err);
      alert('Error al guardar el módulo de educación.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="academia-container">
      <header className="academia-header">
        <div className="academia-title-row">
          <div className="academia-title-group">
            <h1>
              <GraduationCap style={{ color: '#3b82f6' }} />
              Gestión de Academia & Cursos (Admin)
            </h1>
            <p>Configura los módulos educativos, videos de YouTube y cuestionarios interactivos.</p>
          </div>

          <button className="btn-academia-action primary" onClick={handleAbrirNuevo}>
            <Plus size={18} /> Crear Nuevo Módulo
          </button>
        </div>
      </header>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando módulos...</p>
      ) : (
        <div className="academia-playlist-card" style={{ padding: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f1f5f9' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Orden</th>
                <th style={{ padding: '0.75rem' }}>Título</th>
                <th style={{ padding: '0.75rem' }}>Video</th>
                <th style={{ padding: '0.75rem' }}>Menú Desbloqueado</th>
                <th style={{ padding: '0.75rem' }}>Examen</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {modulos.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <span className="module-badge-index">{m.orden}</span>
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{m.titulo}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <a
                      href={m.video_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Video size={15} /> Ver Video
                    </a>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {m.menu_desbloqueado ? (
                      <span className="module-tag-status in-progress">
                        🔓 {m.menu_desbloqueado}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {m.examen ? (
                      <span style={{ color: '#34d399', fontSize: '0.85rem' }}>
                        ✅ {m.examen.preguntas?.length || 0} preguntas
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sin examen</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button
                      className="btn-academia-action secondary"
                      style={{ padding: '0.4rem 0.75rem', marginRight: '0.5rem' }}
                      onClick={() => handleAbrirEditar(m)}
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    <button
                      className="btn-academia-action secondary"
                      style={{ padding: '0.4rem 0.75rem', color: '#f87171' }}
                      onClick={() => handleEliminar(m.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear / Editar */}
      {modalAbierto && (
        <div className="examen-modal-overlay">
          <div className="examen-modal-card" style={{ maxWidth: '800px' }}>
            <header className="examen-modal-header">
              <h3>
                <GraduationCap style={{ color: '#3b82f6' }} />
                {moduloEditando ? 'Editar Módulo de Educación' : 'Crear Nuevo Módulo'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setModalAbierto(false)}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="examen-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Título del Módulo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.titulo}
                      onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Orden Secuencial
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.orden}
                      onChange={e => setFormData({ ...formData, orden: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Link del Video de YouTube *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={formData.video_url}
                      onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Duración (min)
                    </label>
                    <input
                      type="number"
                      value={formData.duracion_minutos}
                      onChange={e => setFormData({ ...formData, duracion_minutos: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Menú del Sidebar que Desbloquea (opcional)
                  </label>
                  <select
                    value={formData.menu_desbloqueado}
                    onChange={e => setFormData({ ...formData, menu_desbloqueado: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                  >
                    <option value="">-- Ninguno (Módulo Libre) --</option>
                    <option value="mi-landing">Mi Landing Page (/mi-landing)</option>
                    <option value="mis-anuncios">Anuncios & Campañas (/mis-anuncios)</option>
                    <option value="mis-pedidos">Mis Pedidos (/mis-pedidos)</option>
                    <option value="control-courier">Control de Couriers (/control-courier)</option>
                  </select>
                </div>

                {/* Sección Examen */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileQuestion size={18} style={{ color: '#fbbf24' }} />
                      Evaluación / Examen del Módulo
                    </h4>
                    <button
                      type="button"
                      className="btn-academia-action secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={handleAgregarPregunta}
                    >
                      <Plus size={14} /> Agregar Pregunta
                    </button>
                  </div>

                  {formData.examen.preguntas.map((preg, pIdx) => (
                    <div key={pIdx} className="examen-question-block" style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => handleEliminarPregunta(pIdx)}
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>

                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Pregunta {pIdx + 1}</label>
                        <input
                          type="text"
                          required
                          value={preg.pregunta}
                          onChange={e => {
                            const nuevasPreg = [...formData.examen.preguntas];
                            nuevasPreg[pIdx].pregunta = e.target.value;
                            setFormData({ ...formData, examen: { ...formData.examen, preguntas: nuevasPreg } });
                          }}
                          style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {preg.opciones.map((opt, oIdx) => (
                          <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>{opt.id}:</span>
                            <input
                              type="text"
                              required
                              value={opt.texto}
                              onChange={e => {
                                const nuevasPreg = [...formData.examen.preguntas];
                                nuevasPreg[pIdx].opciones[oIdx].texto = e.target.value;
                                setFormData({ ...formData, examen: { ...formData.examen, preguntas: nuevasPreg } });
                              }}
                              style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.85rem' }}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Respuesta Correcta:</label>
                          <select
                            value={preg.respuesta_correcta}
                            onChange={e => {
                              const nuevasPreg = [...formData.examen.preguntas];
                              nuevasPreg[pIdx].respuesta_correcta = e.target.value;
                              setFormData({ ...formData, examen: { ...formData.examen, preguntas: nuevasPreg } });
                            }}
                            style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                          >
                            {preg.opciones.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                Opción {opt.id} ({opt.texto.substring(0, 20)}...)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Explicación Didáctica:</label>
                          <input
                            type="text"
                            placeholder="Feedback didáctico al calificar"
                            value={preg.explicacion || ''}
                            onChange={e => {
                              const nuevasPreg = [...formData.examen.preguntas];
                              nuevasPreg[pIdx].explicacion = e.target.value;
                              setFormData({ ...formData, examen: { ...formData.examen, preguntas: nuevasPreg } });
                            }}
                            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <footer className="examen-modal-footer">
                <button
                  type="button"
                  className="btn-academia-action secondary"
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-academia-action primary"
                  disabled={guardando}
                >
                  <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar Módulo'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEducacion;
