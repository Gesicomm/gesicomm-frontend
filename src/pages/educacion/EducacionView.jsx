import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  Lock,
  Clock,
  Award,
  BookOpen,
  Sparkles,
  ChevronRight,
  FileCheck,
  RotateCcw,
  X,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  getModulosEducacion,
  getDetalleModulo,
  marcarVideoVisto,
  enviarExamenModulo
} from '../../services/educacionApi';
import './EducacionView.css';

// Helper para convertir cualquier link de YouTube en URL de Embed segura
function getYouTubeEmbedUrl(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
  }
  if (url.includes('embed/')) return url;
  return url;
}

// Micro-celebración con confetti canvas (slack-gif)
function lanzarConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#38bdf8'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let animationFrame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravedad
      p.rotation += p.vRot;
      p.opacity -= 0.012;

      if (p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationFrame);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  animate();
}

const EducacionView = () => {
  const [modulos, setModulos] = useState([]);
  const [resumen, setResumen] = useState({ totalModulos: 0, completados: 0, porcentajeProgreso: 0 });
  const [moduloActivo, setModuloActivo] = useState(null);
  const [detalleModulo, setDetalleModulo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Estados del Modal de Examen
  const [modalExamenAbierto, setModalExamenAbierto] = useState(false);
  const [respuestasUsuario, setRespuestasUsuario] = useState({});
  const [enviandoExamen, setEnviandoExamen] = useState(false);
  const [resultadoExamen, setResultadoExamen] = useState(null);

  useEffect(() => {
    cargarModulos();
  }, []);

  const cargarModulos = async (mantenerId = null) => {
    try {
      setLoading(true);
      const data = await getModulosEducacion();
      setModulos(data.modulos || []);
      setResumen(data.resumen || { totalModulos: 0, completados: 0, porcentajeProgreso: 0 });

      // Seleccionar el primer módulo desbloqueado o el solicitado
      if (data.modulos && data.modulos.length > 0) {
        let moduloTarget = null;
        if (mantenerId) {
          moduloTarget = data.modulos.find(m => m.id === Number(mantenerId));
        }
        if (!moduloTarget) {
          moduloTarget = data.modulos.find(m => m.desbloqueado && !m.completado) || data.modulos[0];
        }
        if (moduloTarget) {
          setModuloActivo(moduloTarget);
          try {
            const detalle = await getDetalleModulo(moduloTarget.id);
            setDetalleModulo(detalle);
          } catch (e) {
            console.error('Error al recargar detalle:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error al cargar módulos de educación:', err);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarModulo = async (modulo) => {
    if (!modulo || !modulo.desbloqueado) return;
    setModuloActivo(modulo);
    setResultadoExamen(null);
    setRespuestasUsuario({});
    try {
      setLoadingDetalle(true);
      const detalle = await getDetalleModulo(modulo.id);
      setDetalleModulo(detalle);
    } catch (err) {
      console.error('Error al cargar detalle del módulo:', err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleMarcarVideoVisto = async () => {
    if (!moduloActivo) return;
    try {
      await marcarVideoVisto(moduloActivo.id);
      // Recargar datos
      await cargarModulos(moduloActivo.id);
    } catch (err) {
      console.error('Error al marcar video como visto:', err);
    }
  };

  const handleAbrirExamen = () => {
    setRespuestasUsuario({});
    setResultadoExamen(null);
    setModalExamenAbierto(true);
  };

  const handleSeleccionarOpcion = (preguntaId, opcionId) => {
    setRespuestasUsuario(prev => ({
      ...prev,
      [preguntaId]: opcionId
    }));
  };

  const handleEnviarExamen = async () => {
    if (!moduloActivo) return;
    try {
      setEnviandoExamen(true);
      const res = await enviarExamenModulo(moduloActivo.id, respuestasUsuario);
      setResultadoExamen(res);

      if (res.aprobado) {
        lanzarConfetti();
        // Recargar listado para reflejar el desbloqueo del siguiente módulo
        await cargarModulos(moduloActivo.id);
      }
    } catch (err) {
      console.error('Error al calificar el examen:', err);
    } finally {
      setEnviandoExamen(false);
    }
  };

  if (loading && modulos.length === 0) {
    return (
      <div className="academia-container" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <GraduationCap size={48} className="animate-spin" style={{ color: '#3b82f6', margin: '0 auto 1rem auto' }} />
        <p style={{ color: '#94a3b8' }}>Cargando contenidos de la Academia...</p>
      </div>
    );
  }

  return (
    <div className="academia-container">
      {/* Header & Stats Banner */}
      <header className="academia-header">
        <div className="academia-title-row">
          <div className="academia-title-group">
            <h1>
              <GraduationCap style={{ color: '#3b82f6' }} />
              Academia Gesicomm
            </h1>
            <p>Aprende las mejores estrategias para escalar tus ventas y dominar la plataforma.</p>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="academia-stats-banner">
          <div className="academia-stats-content">
            <div className="academia-stat-item">
              <div className="academia-stat-icon">
                <BookOpen size={22} />
              </div>
              <div className="academia-stat-info">
                <div className="stat-value">{resumen.completados} / {resumen.totalModulos}</div>
                <div className="stat-label">Módulos Completados</div>
              </div>
            </div>

            <div className="academia-stat-item">
              <div className="academia-stat-icon trophy">
                <Award size={22} />
              </div>
              <div className="academia-stat-info">
                <div className="stat-value">
                  {resumen.porcentajeProgreso === 100 ? 'Master E-commerce 🏆' : 'En Progreso 🚀'}
                </div>
                <div className="stat-label">Nivel de Aprendizaje</div>
              </div>
            </div>

            <div className="academia-stat-item">
              <div className="academia-stat-icon check">
                <Sparkles size={22} />
              </div>
              <div className="academia-stat-info">
                <div className="stat-value">{resumen.porcentajeProgreso}%</div>
                <div className="stat-label">Progreso Global</div>
              </div>
            </div>
          </div>

          <div className="academia-progress-wrapper">
            <div className="academia-progress-text">
              <span>Progreso de la Formación</span>
              <span>{resumen.porcentajeProgreso}% completado</span>
            </div>
            <div className="academia-progress-bar">
              <div
                className="academia-progress-fill"
                style={{ width: `${resumen.porcentajeProgreso}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Grid Principal */}
      <div className="academia-grid">
        {/* Playlist de Módulos (Sidebar Izquierdo) */}
        <aside className="academia-playlist-card">
          <div className="academia-playlist-header">
            <h3>
              <BookOpen size={18} />
              Temario del Curso
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {modulos.length} lecciones
            </span>
          </div>

          <ul className="academia-modules-list">
            {modulos.map((m, idx) => {
              const isActive = moduloActivo?.id === m.id;
              const isLocked = !m.desbloqueado;
              const isDone = m.completado;

              return (
                <li
                  key={m.id}
                  className={`academia-module-item ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => !isLocked && seleccionarModulo(m)}
                  title={isLocked ? 'Completa el módulo anterior para desbloquear' : ''}
                >
                  <div className="module-badge-index">
                    {isDone ? (
                      <CheckCircle2 size={16} />
                    ) : isLocked ? (
                      <Lock size={14} />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  <div className="module-meta-content">
                    <div className="module-meta-title">{m.titulo}</div>
                    <div className="module-meta-badges">
                      {m.duracion_minutos && (
                        <span className="module-tag-duration">
                          <Clock size={12} /> {m.duracion_minutos} min
                        </span>
                      )}
                      {isDone ? (
                        <span className="module-tag-status done">Completado</span>
                      ) : isLocked ? (
                        <span className="module-tag-status locked">Bloqueado 🔒</span>
                      ) : (
                        <span className="module-tag-status in-progress">En curso ▶️</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Reproductor de Video y Contenido */}
        <main className="academia-player-card">
          {moduloActivo ? (
            <>
              <div className="academia-player-wrapper">
                <iframe
                  src={getYouTubeEmbedUrl(moduloActivo.video_url)}
                  title={moduloActivo.titulo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              <div className="academia-player-details">
                <div className="academia-player-title-row">
                  <div>
                    <h2>{moduloActivo.titulo}</h2>
                    <p className="academia-player-description">
                      {moduloActivo.descripcion || 'Sin descripción disponible para este módulo.'}
                    </p>
                  </div>

                  {moduloActivo.menu_desbloqueado && (
                    <div className="academia-unlocked-menu-hint">
                      <Sparkles size={16} />
                      Desbloquea: <strong>{moduloActivo.menu_desbloqueado}</strong>
                    </div>
                  )}
                </div>

                {/* Barra de Acciones del Módulo */}
                <div className="academia-actions-row">
                  {detalleModulo?.progreso?.video_completado ? (
                    <button className="btn-academia-action success" disabled>
                      <CheckCircle2 size={18} /> Video Completado
                    </button>
                  ) : (
                    <button
                      className="btn-academia-action primary"
                      onClick={handleMarcarVideoVisto}
                    >
                      <CheckCircle2 size={18} /> Marcar Video como Visto
                    </button>
                  )}

                  {detalleModulo?.examen && (
                    <button
                      className={`btn-academia-action ${detalleModulo.progreso?.examen_aprobado ? 'gold' : 'primary'}`}
                      onClick={handleAbrirExamen}
                    >
                      <FileCheck size={18} />
                      {detalleModulo.progreso?.examen_aprobado
                        ? `Examen Aprobado (${detalleModulo.progreso.puntaje_obtenido}%) - Repasar`
                        : 'Rendir Evaluación'}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
              <BookOpen size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <p>Selecciona un módulo del temario para comenzar a estudiar.</p>
            </div>
          )}
        </main>
      </div>

      {/* Modal de Examen / Formulario */}
      {modalExamenAbierto && detalleModulo?.examen && (
        <div className="examen-modal-overlay">
          <div className="examen-modal-card">
            <header className="examen-modal-header">
              <h3>
                <FileCheck style={{ color: '#3b82f6' }} />
                {detalleModulo.examen.titulo}
              </h3>
              <button
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setModalExamenAbierto(false)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="examen-modal-body">
              {!resultadoExamen ? (
                <>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    {detalleModulo.examen.descripcion ||
                      `Responde las siguientes preguntas. Necesitas al menos un ${detalleModulo.examen.puntaje_minimo}% para aprobar y desbloquear el siguiente módulo.`}
                  </p>

                  {detalleModulo.examen.preguntas && detalleModulo.examen.preguntas.map((p, idx) => (
                    <div key={p.id} className="examen-question-block">
                      <div className="examen-question-title">
                        {idx + 1}. {p.pregunta}
                      </div>

                      <div className="examen-options-list">
                        {Array.isArray(p.opciones) && p.opciones.map(opt => {
                          const isSelected = String(respuestasUsuario[p.id]) === String(opt.id);
                          return (
                            <label
                              key={opt.id}
                              className={`examen-option-label ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`pregunta_${p.id}`}
                                value={opt.id}
                                checked={isSelected}
                                onChange={() => handleSeleccionarOpcion(p.id, opt.id)}
                              />
                              <span>{opt.texto}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                /* Resultados del Examen */
                <div className="examen-result-view">
                  <div className={`examen-score-circle ${resultadoExamen.aprobado ? 'pass' : 'fail'}`}>
                    {resultadoExamen.puntaje}%
                  </div>

                  <div className={`examen-result-title ${resultadoExamen.aprobado ? 'pass' : 'fail'}`}>
                    {resultadoExamen.aprobado
                      ? '🎉 ¡Felicitaciones! Has aprobado'
                      : '⚠️ No alcanzaste el puntaje requerido'}
                  </div>

                  <p className="examen-result-text">
                    {resultadoExamen.aprobado
                      ? `Obtuviste ${resultadoExamen.correctas} de ${resultadoExamen.total_preguntas} correctas. ¡Has desbloqueado el siguiente nivel!`
                      : `Obtuviste ${resultadoExamen.correctas} de ${resultadoExamen.total_preguntas} correctas. El mínimo requerido es ${resultadoExamen.puntaje_minimo}%. Repasa el video y vuelve a intentarlo.`}
                  </p>

                  {resultadoExamen.menu_desbloqueado && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      padding: '0.85rem 1.25rem',
                      borderRadius: '12px',
                      fontWeight: '600',
                      marginBottom: '1.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <Sparkles size={18} />
                      ¡Sección "{resultadoExamen.menu_desbloqueado}" habilitada en tu menú!
                    </div>
                  )}

                  {/* Detalle de Corrección */}
                  <div className="examen-detail-list">
                    {resultadoExamen.detalles && resultadoExamen.detalles.map((det, idx) => (
                      <div
                        key={det.pregunta_id}
                        className={`examen-detail-card ${det.es_correcta ? 'correct' : 'incorrect'}`}
                      >
                        <div className="detail-q-title">
                          {idx + 1}. {det.pregunta}
                        </div>
                        <div style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                          <strong>Estado: </strong>
                          <span style={{ color: det.es_correcta ? '#34d399' : '#f87171' }}>
                            {det.es_correcta ? '✅ Correcta' : '❌ Incorrecta'}
                          </span>
                        </div>
                        {det.explicacion && (
                          <div className="detail-explanation">
                            💡 {det.explicacion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <footer className="examen-modal-footer">
              {!resultadoExamen ? (
                <>
                  <button
                    className="btn-academia-action secondary"
                    onClick={() => setModalExamenAbierto(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-academia-action primary"
                    disabled={enviandoExamen}
                    onClick={handleEnviarExamen}
                  >
                    {enviandoExamen ? 'Calificando...' : 'Entregar Examen'}
                  </button>
                </>
              ) : (
                <>
                  {!resultadoExamen.aprobado ? (
                    <button
                      className="btn-academia-action gold"
                      onClick={() => {
                        setResultadoExamen(null);
                        setRespuestasUsuario({});
                      }}
                    >
                      <RotateCcw size={16} /> Reintentar Evaluación
                    </button>
                  ) : null}
                  <button
                    className="btn-academia-action primary"
                    onClick={() => setModalExamenAbierto(false)}
                  >
                    Cerrar
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducacionView;
