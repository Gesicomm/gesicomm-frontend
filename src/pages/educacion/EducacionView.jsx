import React, { useState, useEffect } from 'react';
import {
  getModulosEducacion,
  getDetalleModulo,
  marcarLeccionCompletada,
  enviarExamenModulo,
} from '../../services/educacionApi';
import { getEmbedUrl } from '../../utils/videoEmbed';
import { verificarSesion } from '../../utils/auth';
import confetti from '../../utils/confetti';
import {
  GraduationCap,
  Video,
  CheckCircle2,
  Lock,
  Clock,
  Play,
  Award,
  HelpCircle,
  X,
  RotateCcw,
  FileText,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import './EducacionView.css';

export default function EducacionView() {
  const [usuario, setUsuario] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [estadisticas, setEstadisticas] = useState({
    total_modulos: 0,
    modulos_completados: 0,
    total_lecciones: 0,
    lecciones_completadas: 0,
    porcentaje_global: 0,
    nivel_actual: 'Iniciante 🌱',
  });
  const [loading, setLoading] = useState(true);

  // Protección anti-grabación y captura de pantalla
  const [pantallaOculta, setPantallaOculta] = useState(false);
  const [alertaCaptura, setAlertaCaptura] = useState(false);

  // Módulo y Lección Activa
  const [moduloActivo, setModuloActivo] = useState(null);
  const [leccionActiva, setLeccionActiva] = useState(null);
  const [savingLeccion, setSavingLeccion] = useState(false);

  // Modal de Examen
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examenData, setExamenData] = useState(null);
  const [respuestasUsuario, setRespuestasUsuario] = useState({});
  const [resultadoExamen, setResultadoExamen] = useState(null);
  const [submittingExamen, setSubmittingExamen] = useState(false);

  // Timer de cuenta regresiva para exámenes bloqueados por penalización
  const [segundosRestantesBloqueo, setSegundosRestantesBloqueo] = useState(0);

  useEffect(() => {
    let timer = null;
    const segsIniciales = resultadoExamen?.segundos_restantes ?? moduloActivo?.progreso_usuario?.segundos_restantes_bloqueo ?? 0;

    if (segsIniciales > 0) {
      setSegundosRestantesBloqueo(segsIniciales);
      timer = setInterval(() => {
        setSegundosRestantesBloqueo(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (moduloActivo?.id) {
              cargarDatos(moduloActivo.id);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSegundosRestantesBloqueo(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resultadoExamen, moduloActivo]);

  const formatTiempoRestante = (totalSegundos) => {
    if (!totalSegundos || totalSegundos <= 0) return '00:00:00';
    const hrs = Math.floor(totalSegundos / 3600);
    const mins = Math.floor((totalSegundos % 3600) / 60);
    const secs = totalSegundos % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const estaExamenBloqueado = Boolean(
    segundosRestantesBloqueo > 0 ||
    resultadoExamen?.bloqueado ||
    moduloActivo?.progreso_usuario?.examen_bloqueado
  );

  const cargarDatos = async (preferModuloId = null) => {
    try {
      setLoading(true);
      const data = await getModulosEducacion();
      setModulos(data.modulos || []);
      if (data.estadisticas) {
        setEstadisticas(data.estadisticas);
      }

      // Seleccionar módulo activo (el preferido o el primer desbloqueado)
      if (data.modulos && data.modulos.length > 0) {
        let targetModulo = null;
        if (preferModuloId) {
          targetModulo = data.modulos.find(m => m.id === preferModuloId && m.desbloqueado);
        }
        if (!targetModulo) {
          targetModulo = data.modulos.find(m => m.desbloqueado) || data.modulos[0];
        }

        if (targetModulo) {
          await seleccionarModulo(targetModulo.id);
        }
      }
    } catch (error) {
      console.error('Error al cargar academia:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verificarSesion().then(setUsuario);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setPantallaOculta(true);
      }
    };

    const handleWindowBlur = () => {
      // Bloquear pantalla al perder foco (ej. snipping tools, grabadores externos de pantalla)
      setPantallaOculta(true);
    };

    const handleKeyDown = (e) => {
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isDevTools = (e.ctrlKey && e.shiftKey && ['I', 'i', 'C', 'c', 'J', 'j'].includes(e.key)) || e.key === 'F12';
      const isSaveOrSource = e.ctrlKey && ['s', 'S', 'u', 'U', 'p', 'P'].includes(e.key);
      const isMacScreenshot = (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key));

      if (isPrintScreen || isDevTools || isSaveOrSource || isMacScreenshot) {
        e.preventDefault();
        try {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch { /* clipboard api no disponible */ }
        setPantallaOculta(true);
        setAlertaCaptura(true);
        setTimeout(() => setAlertaCaptura(false), 4000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    cargarDatos();
  }, []);

  const seleccionarModulo = async (moduloId) => {
    try {
      const detalle = await getDetalleModulo(moduloId);
      setModuloActivo(detalle);
      if (detalle.lecciones && detalle.lecciones.length > 0) {
        // Seleccionar la primera lección no completada o la primera disponible
        const primeraNoCompletada = detalle.lecciones.find(l => !l.completada) || detalle.lecciones[0];
        setLeccionActiva(primeraNoCompletada);
      } else {
        setLeccionActiva(null);
      }
    } catch (error) {
      console.error('Error al seleccionar módulo:', error);
    }
  };

  const handleCompletarLeccion = async () => {
    if (!leccionActiva) return;
    try {
      setSavingLeccion(true);
      await marcarLeccionCompletada(leccionActiva.id);

      // Disparar micro confetti
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });

      // Recargar datos y mantener módulo activo
      await cargarDatos(moduloActivo.id);
    } catch (error) {
      console.error('Error al marcar lección como completada:', error);
    } finally {
      setSavingLeccion(false);
    }
  };

  const handleOpenExam = () => {
    if (!moduloActivo?.examen) return;
    setExamenData(moduloActivo.examen);
    setRespuestasUsuario({});
    setResultadoExamen(null);
    setIsExamModalOpen(true);
  };

  const handleSelectRespuesta = (preguntaId, opcionId, isMulti = false) => {
    setRespuestasUsuario(prev => {
      if (!isMulti) {
        return { ...prev, [preguntaId]: opcionId };
      }
      const current = prev[preguntaId];
      let arr = [];
      if (Array.isArray(current)) arr = [...current];
      else if (typeof current === 'string') arr = current.split(',').map(s => s.trim()).filter(Boolean);
      else if (current) arr = [current];

      if (arr.includes(opcionId)) {
        arr = arr.filter(x => x !== opcionId);
      } else {
        arr = [...arr, opcionId].sort();
      }
      return {
        ...prev,
        [preguntaId]: arr.join(','),
      };
    });
  };

  const handleEnviarExamen = async () => {
    if (!moduloActivo) return;
    try {
      setSubmittingExamen(true);
      const resultado = await enviarExamenModulo(moduloActivo.id, respuestasUsuario);
      setResultadoExamen(resultado);

      if (resultado.aprobado) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
        // Disparar evento para actualizar Sidebar
        window.dispatchEvent(new CustomEvent('sidebar-refresh'));
      }
      // Recargar datos
      await cargarDatos(moduloActivo.id);
    } catch (error) {
      console.error('Error al enviar examen:', error);
      const errorData = error?.response?.data;
      if (errorData?.bloqueado) {
        setResultadoExamen({
          aprobado: false,
          bloqueado: true,
          bloqueado_hasta: errorData.bloqueado_hasta,
          segundos_restantes: errorData.segundos_restantes,
          puntaje: 0,
          puntaje_minimo: moduloActivo?.examen?.puntaje_minimo || 80,
          correctas: 0,
          total_preguntas: moduloActivo?.examen?.preguntas?.length || 0,
        });
      } else {
        alert(errorData?.message || 'Error al calificar el examen. Por favor intenta de nuevo.');
      }
    } finally {
      setSubmittingExamen(false);
    }
  };

  return (
    <div className="aca-container">
      {/* 1. HERO HEADER & GLOBAL PROGRESS */}
      <header className="aca-header-card">
        <div className="aca-header-left">
          <span className="aca-badge-pill">
            <GraduationCap size={16} /> Academia Gesicomm
          </span>
          <h1 className="aca-title">Ruta de Formación E-commerce</h1>
          <p className="aca-subtitle">
            Aprende paso a paso a dominar cada herramienta del ecosistema y desbloquea nuevas capacidades.
          </p>
        </div>

        {/* Global Progress Radial Cluster */}
        <div className="aca-progress-cluster">
          <div className="aca-progress-info">
            <span className="aca-progress-label">Progreso Global</span>
            <span className="aca-progress-percent">{estadisticas.porcentaje_global}%</span>
            <div className="aca-progress-bar-wrap">
              <div
                className="aca-progress-bar-fill"
                style={{ width: `${estadisticas.porcentaje_global}%` }}
              />
            </div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Nivel</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'white' }}>
              {estadisticas.nivel_actual}
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN LEARNING SPLIT WORKSPACE */}
      {loading && !moduloActivo ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          <p>Cargando tu ruta de aprendizaje...</p>
        </div>
      ) : (
        <main className="aca-main-workspace">
          {/* Left Sidebar: Modules Roadmap */}
          <aside className="aca-modules-nav-list">
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>
              Módulos del Programa ({modulos.length})
            </h3>

            {modulos.map((mod, index) => {
              const isSelected = moduloActivo?.id === mod.id;
              const isLocked = !mod.desbloqueado;

              return (
                <div
                  key={mod.id}
                  className={`aca-module-nav-card ${isSelected ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => !isLocked && seleccionarModulo(mod.id)}
                >
                  <div className="aca-nav-card-header">
                    <div className="aca-nav-card-emoji-title">
                      <span className="aca-nav-card-emoji">{mod.icono || '🎓'}</span>
                      <h4 className="aca-nav-card-title">{mod.titulo}</h4>
                    </div>
                    {isLocked ? (
                      <Lock size={16} color="#64748b" />
                    ) : mod.examen_aprobado ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold' }}>
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  <div className="aca-nav-card-meta">
                    <span>⏱ {mod.duracion_minutos || 10} min</span>
                    <span>
                      📹 {mod.total_lecciones || 0} {mod.total_lecciones === 1 ? 'clase' : 'clases'}
                    </span>
                  </div>
                </div>
              );
            })}
          </aside>

          {/* Right Workspace: Video Player, Multi-Lesson Playlist & Exam */}
          {moduloActivo && (
            <section className="aca-player-workspace">
              <div className="aca-player-header">
                <div className="aca-player-title-group">
                  <span style={{ fontSize: '2rem' }}>{moduloActivo.icono || '🚀'}</span>
                  <div>
                    <h2 className="aca-player-title">{moduloActivo.titulo}</h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.88rem', color: '#94a3b8' }}>
                      {moduloActivo.descripcion}
                    </p>
                  </div>
                </div>
              </div>

              {/* YouTube Video Player Screen con Protección Anti-Grabación */}
              {leccionActiva?.url_video ? (
                <div
                  className={`aca-video-screen-container ${pantallaOculta ? 'protegido' : ''}`}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <iframe
                    src={getEmbedUrl(leccionActiva.url_video)}
                    title={leccionActiva.titulo}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />

                  {/* Marca de agua dinámica de seguridad */}
                  <div className="aca-watermark-overlay" aria-hidden="true">
                    <span>
                      <ShieldCheck size={11} /> Gesicomm Academia • {usuario?.email || usuario?.nombre || 'Alumno'} • ID: #{usuario?.id || 'PRO'}
                    </span>
                  </div>

                  {/* Escudo opaco cuando se detecta pérdida de foco / captura de pantalla */}
                  {pantallaOculta && (
                    <div className="aca-shield-overlay" onClick={() => setPantallaOculta(false)}>
                      <div className="aca-shield-content">
                        <ShieldAlert size={44} className="aca-shield-icon" />
                        <h3>Contenido protegido contra grabación</h3>
                        <p>
                          Por políticas de seguridad y derechos de autor, el video se oculta automáticamente si la ventana pierde el foco o se detectan herramientas de captura.
                        </p>
                        <button
                          type="button"
                          className="aca-shield-resume-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPantallaOculta(false);
                          }}
                        >
                          <Play size={14} /> Reanudar reproducción
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    aspectRatio: '16/9',
                    background: '#090a0f',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    marginBottom: '1.5rem',
                  }}
                >
                  Selecciona una clase de la playlist para iniciar la reproducción
                </div>
              )}

              {/* Toast de alerta de captura bloqueada */}
              {alertaCaptura && (
                <div className="aca-capture-toast">
                  <ShieldAlert size={16} /> Captura de pantalla bloqueada: el contenido de la Academia está protegido.
                </div>
              )}

              {/* Multi-Video Lesson Playlist Selector */}
              {moduloActivo.lecciones && moduloActivo.lecciones.length > 0 && (
                <div className="aca-playlist-drawer">
                  <div className="aca-playlist-header">
                    <span>Temario del Módulo ({moduloActivo.lecciones.length} Clases)</span>
                    <span style={{ color: '#34d399' }}>
                      {moduloActivo.lecciones.filter(l => l.completada).length} / {moduloActivo.lecciones.length} Completadas
                    </span>
                  </div>

                  <div className="aca-playlist-items-grid">
                    {moduloActivo.lecciones.map((lec, idx) => {
                      const isPlaying = leccionActiva?.id === lec.id;
                      return (
                        <div
                          key={lec.id || idx}
                          className={`aca-playlist-item ${isPlaying ? 'playing' : ''}`}
                          onClick={() => setLeccionActiva(lec)}
                        >
                          <div className="aca-playlist-item-left">
                            <div className={`aca-lesson-check-circle ${lec.completada ? 'completed' : ''}`}>
                              {lec.completada ? '✓' : idx + 1}
                            </div>
                            <span className="aca-playlist-item-title">{lec.titulo}</span>
                          </div>
                          <span className="aca-playlist-item-duration">
                            ⏱ {lec.duracion_min || 5} min
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Control Strip */}
              <div className="aca-action-strip">
                <div>
                  {leccionActiva && (
                    <button
                      className={`aca-btn-complete-video ${leccionActiva.completada ? 'done' : ''}`}
                      disabled={savingLeccion}
                      onClick={handleCompletarLeccion}
                    >
                      <CheckCircle2 size={16} />
                      {leccionActiva.completada ? '✓ Lección Completada' : 'Marcar Lección como Vista'}
                    </button>
                  )}
                </div>

                {moduloActivo.examen && (
                  <button 
                    className={`aca-btn-take-quiz ${estaExamenBloqueado ? 'cooldown-locked' : ''}`}
                    onClick={handleOpenExam}
                  >
                    {estaExamenBloqueado ? (
                      <>
                        <Clock size={16} className="spin-slow" />
                        <span>Examen Bloqueado ({formatTiempoRestante(segundosRestantesBloqueo)})</span>
                      </>
                    ) : moduloActivo.progreso_usuario?.examen_aprobado ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Evaluación Aprobada ✓</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle size={16} />
                        <span>
                          Realizar Evaluación
                          {(moduloActivo.progreso_usuario?.intentos_fallidos || 0) > 0
                            ? ` (${Math.max(0, 3 - moduloActivo.progreso_usuario.intentos_fallidos)} intentos restantes)`
                            : ''}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </section>
          )}
        </main>
      )}

      {/* 3. EXAM & EVALUATION MODAL */}
      {isExamModalOpen && examenData && (
        <div className="aca-quiz-modal-backdrop">
          <div className="aca-quiz-modal-card">
            <div className="aca-quiz-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Award color="#f59e0b" />
                {examenData.titulo || 'Evaluación del Módulo'}
              </h3>
              <button
                className="lms-btn-icon-sm"
                onClick={() => setIsExamModalOpen(false)}
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="aca-quiz-modal-body">
              {estaExamenBloqueado && !resultadoExamen ? (
                /* Cooldown Lockout View */
                <div className="aca-score-card examen-cooldown-view">
                  <div className="aca-cooldown-badge">
                    <Clock size={32} color="#f43f5e" />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', color: 'white', margin: '0.75rem 0 0.5rem 0' }}>
                    Examen Bloqueado Temporalmente (4 Horas)
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginBottom: '1.25rem', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
                    Has alcanzado el límite de <strong>3 intentos fallidos</strong>. Para garantizar la asimilación de los conceptos, el examen permanecerá bloqueado durante 4 horas.
                  </p>

                  <div className="aca-countdown-clock">
                    <span className="aca-countdown-digits">{formatTiempoRestante(segundosRestantesBloqueo)}</span>
                    <span className="aca-countdown-label">Tiempo restante para volver a intentar</span>
                  </div>

                  <div className="aca-recommendation-box">
                    <div className="aca-rec-icon">📺</div>
                    <div className="aca-rec-content">
                      <h4 className="aca-rec-title">Recomendación Pedagógica</h4>
                      <p className="aca-rec-desc">
                        Aprovechá este período de espera para <strong>volver a mirar las clases en video</strong> del módulo. Repasar con atención los temas clave te asegurará aprobar con éxito en tu próximo intento.
                      </p>
                    </div>
                  </div>
                </div>
              ) : !resultadoExamen ? (
                /* Question List */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                      {examenData.descripcion ||
                        `Responde las siguientes preguntas. Necesitas al menos un ${examenData.puntaje_minimo}% para aprobar.`}
                    </p>
                    {(moduloActivo.progreso_usuario?.intentos_fallidos || 0) > 0 && (
                      <span className="aca-attempts-remaining-pill" style={{ margin: 0, padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}>
                        Intentos restantes: <strong>{Math.max(0, 3 - moduloActivo.progreso_usuario.intentos_fallidos)}</strong> / 3
                      </span>
                    )}
                  </div>

                  {(examenData.preguntas || []).map((preg, pIdx) => {
                    const isMulti = String(preg.respuesta_correcta || '').includes(',') ||
                      (Array.isArray(preg.respuesta_correcta) && preg.respuesta_correcta.length > 1);

                    const isSelected = (optId) => {
                      const val = respuestasUsuario[preg.id];
                      if (!val) return false;
                      if (Array.isArray(val)) return val.includes(optId);
                      if (typeof val === 'string') return val.split(',').map(s => s.trim().toUpperCase()).includes(String(optId).trim().toUpperCase());
                      return String(val).toUpperCase() === String(optId).toUpperCase();
                    };

                    return (
                      <div key={preg.id || pIdx} className="aca-quiz-question-box examen-question-block">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <p style={{ fontWeight: 700, color: '#f8fafc', margin: 0, fontSize: '1rem' }}>
                            {pIdx + 1}. {preg.pregunta}
                          </p>
                          {isMulti && (
                            <span style={{ fontSize: '0.75rem', color: '#60a5fa', background: 'rgba(59,130,246,0.12)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.25)' }}>
                              Selección múltiple
                            </span>
                          )}
                        </div>

                        <div className="aca-quiz-options-group">
                          {(preg.opciones || []).map((opt, optIdx) => {
                            const selected = isSelected(opt.id);
                            return (
                              <label
                                key={optIdx}
                                className={`aca-quiz-option-label ${selected ? 'selected' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSelectRespuesta(preg.id, opt.id, isMulti);
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <input
                                  type={isMulti ? 'checkbox' : 'radio'}
                                  name={`pregunta_${preg.id}`}
                                  value={opt.id}
                                  checked={selected}
                                  onChange={() => {}}
                                  style={{ accentColor: '#3b82f6' }}
                                />
                                <span style={{ fontSize: '0.9rem', color: selected ? 'white' : '#cbd5e1', fontWeight: selected ? 600 : 400 }}>
                                  <strong style={{ color: '#93c5fd', marginRight: '0.4rem' }}>{opt.id}.</strong> {opt.texto}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Exam Results Breakdown View */
                <div className={`aca-score-card examen-result-view ${resultadoExamen.aprobado ? '' : 'failed'}`}>
                  <div
                    className={`aca-score-circle examen-score-circle ${resultadoExamen.aprobado ? '' : 'failed'}`}
                  >
                    {resultadoExamen.puntaje}%
                  </div>

                  <h3 style={{ fontSize: '1.5rem', color: 'white', margin: '0 0 0.5rem 0' }}>
                    {resultadoExamen.aprobado
                      ? '🎉 ¡Felicitaciones! Has Aprobado el Módulo'
                      : '⚠️ No alcanzaste la nota mínima'}
                  </h3>

                  <p style={{ color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                    {resultadoExamen.aprobado
                      ? 'Has desbloqueado el siguiente módulo y las herramientas correspondientes en tu barra lateral.'
                      : `Obtuviste ${resultadoExamen.correctas} de ${resultadoExamen.total_preguntas} preguntas correctas. Se requiere un ${resultadoExamen.puntaje_minimo}% para aprobar.`}
                  </p>

                  {resultadoExamen.bloqueado ? (
                    <div className="aca-cooldown-lock-notice">
                      <div className="aca-cooldown-header-notice">
                        <Clock size={20} color="#f43f5e" />
                        <span>Límite de 3 intentos alcanzado · Examen bloqueado por 4 horas</span>
                      </div>
                      <div className="aca-countdown-clock small">
                        <span className="aca-countdown-digits">{formatTiempoRestante(segundosRestantesBloqueo)}</span>
                      </div>
                    </div>
                  ) : !resultadoExamen.aprobado ? (
                    <div className="aca-attempts-remaining-pill">
                      <span>
                        Te {resultadoExamen.intentos_restantes === 1 ? 'queda' : 'quedan'}{' '}
                        <strong style={{ color: '#f59e0b' }}>
                          {resultadoExamen.intentos_restantes} {resultadoExamen.intentos_restantes === 1 ? 'intento' : 'intentos'}
                        </strong>{' '}
                        antes del bloqueo de 4 horas.
                      </span>
                    </div>
                  ) : null}

                  {/* Recommendation Card */}
                  {!resultadoExamen.aprobado && (
                    <div className="aca-recommendation-box">
                      <div className="aca-rec-icon">📺</div>
                      <div className="aca-rec-content">
                        <h4 className="aca-rec-title">Recomendación Pedagógica</h4>
                        <p className="aca-rec-desc">
                          {resultadoExamen.recomendacion ||
                            'Para asimilar correctamente los conocimientos, te sugerimos volver a mirar las clases en video y repasar el contenido del módulo antes de volver a rendir la evaluación.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="aca-quiz-modal-footer">
              {estaExamenBloqueado && !resultadoExamen ? (
                <button
                  className="aca-btn-take-quiz"
                  onClick={() => setIsExamModalOpen(false)}
                >
                  📺 Volver a Repasar Clases en Video
                </button>
              ) : !resultadoExamen ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Intentos fallidos acumulados: {moduloActivo.progreso_usuario?.intentos_fallidos || 0} / 3
                  </span>
                  <button
                    className="aca-btn-take-quiz"
                    disabled={submittingExamen}
                    onClick={handleEnviarExamen}
                  >
                    {submittingExamen ? 'Calificando...' : 'Entregar Examen'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
                  {!resultadoExamen.aprobado && !resultadoExamen.bloqueado && (
                    <button
                      className="lms-btn-secondary"
                      onClick={() => {
                        setResultadoExamen(null);
                        setRespuestasUsuario({});
                      }}
                    >
                      <RotateCcw size={14} /> Reintentar Evaluación
                    </button>
                  )}
                  <button
                    className="aca-btn-take-quiz"
                    onClick={() => setIsExamModalOpen(false)}
                  >
                    {resultadoExamen.aprobado ? 'Continuar en la Academia →' : '📺 Repasar Videos del Módulo'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
