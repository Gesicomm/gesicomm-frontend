import React, { useState, useEffect } from 'react';
import {
  adminListModulos,
  adminCreateModulo,
  adminUpdateModulo,
  adminDeleteModulo,
  adminReordenarModulos,
  adminDuplicarModulo,
} from '../../services/educacionApi';
import { getEmbedUrl, detectVideoPlatform } from '../../utils/videoEmbed';
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit3,
  Video,
  CheckCircle2,
  Lock,
  ArrowUp,
  ArrowDown,
  Copy,
  Layers,
  Clock,
  HelpCircle,
  Rocket,
  Package,
  Truck,
  Megaphone,
  BarChart3,
  X,
  Eye,
  Link as LinkIcon,
  Play,
} from 'lucide-react';
import './AdminEducacion.css';

const EMOJI_OPTIONS = ['🚀', '🎯', '🚚', '📦', '📊', '💡', '🎓', '⚡', '🔥', '⚙️', '💎', '📈'];
const COLOR_OPTIONS = ['#3b82f6', '#2e4a85', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'];

const UNLOCK_OPTIONS = [
  {
    id: 'mi-landing',
    titulo: 'Landing Pages',
    desc: 'Creador visual y páginas de venta de alta conversión.',
    icon: <Rocket size={20} color="#3b82f6" />,
  },
  {
    id: 'productos',
    titulo: 'Catálogo & Combos',
    desc: 'Gestión de productos, variantes y descuentos por volumen.',
    icon: <Package size={20} color="#2e4a85" />,
  },
  {
    id: 'pedidos',
    titulo: 'Envíos & Couriers',
    desc: 'Control de logística, estados de despacho y tarifas por rango.',
    icon: <Truck size={20} color="#10b981" />,
  },
  {
    id: 'ads',
    titulo: 'Meta Ads & Campañas',
    desc: 'Integración con Meta Pixel, CAPI y creador de anuncios.',
    icon: <Megaphone size={20} color="#f59e0b" />,
  },
  {
    id: 'reportes',
    titulo: 'Reportes Financieros',
    desc: 'Caja neta, facturación total y métricas de rentabilidad.',
    icon: <BarChart3 size={20} color="#06b6d4" />,
  },
  {
    id: '',
    titulo: 'Módulo Libre',
    desc: 'No bloquea ningún menú del sidebar (formación general).',
    icon: <GraduationCap size={20} color="#94a3b8" />,
  },
];

export default function AdminEducacion() {
  const [modulos, setModulos] = useState([]);
  const [metricas, setMetricas] = useState({
    total_modulos: 0,
    total_lecciones: 0,
    total_duracion_minutos: 0,
    total_preguntas: 0,
    menus_desbloqueables: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado del Modal de Studio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [previewLeccionIndex, setPreviewLeccionIndex] = useState(0);

  // Formulario del Studio
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    icono: '🚀',
    color_accent: '#3b82f6',
    estado: 'publicado',
    duracion_minutos: 15,
    menu_desbloqueado: 'mi-landing',
    recursos_descarga: [],
    lecciones: [
      {
        titulo: 'Clase 1: Introducción práctica',
        descripcion: '',
        url_video: 'https://www.youtube.com/watch?v=1F_47Z4G6o8',
        duracion_min: 5,
        tipo: 'video',
      },
    ],
    examen: {
      titulo: 'Evaluación de Conocimientos',
      descripcion: 'Responde correctamente para aprobar y desbloquear la siguiente lección.',
      puntaje_minimo: 80,
      preguntas: [
        {
          pregunta: '¿Cuál es el principal beneficio de este módulo?',
          opciones: [
            { id: 'A', texto: 'Aprender a escalar ventas y pedidos de manera eficiente' },
            { id: 'B', texto: 'Reducir el tiempo de despacho' },
            { id: 'C', texto: 'Todas las anteriores' },
          ],
          respuesta_correcta: 'C',
          explicacion: 'Este módulo integra conocimientos transversales del negocio.',
        },
      ],
    },
  });

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const data = await adminListModulos();
      setModulos(data.modulos || []);
      if (data.metricas) {
        setMetricas(data.metricas);
      }
    } catch (error) {
      console.error('Error al cargar módulos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingModuleId(null);
    setCurrentStep(1);
    setFormData({
      titulo: '',
      descripcion: '',
      icono: '🚀',
      color_accent: '#3b82f6',
      estado: 'publicado',
      duracion_minutos: 10,
      menu_desbloqueado: '',
      recursos_descarga: [],
      lecciones: [
        {
          titulo: 'Clase 1: Introducción',
          descripcion: '',
          url_video: 'https://www.youtube.com/watch?v=1F_47Z4G6o8',
          duracion_min: 5,
          tipo: 'video',
        },
      ],
      examen: {
        titulo: 'Evaluación del Módulo',
        descripcion: '',
        puntaje_minimo: 80,
        preguntas: [
          {
            pregunta: '¿Pregunta clave de aprendizaje?',
            opciones: [
              { id: 'A', texto: 'Opción 1' },
              { id: 'B', texto: 'Opción 2' },
            ],
            respuesta_correcta: 'A',
            explicacion: 'Explicación didáctica de la respuesta correcta.',
          },
        ],
      },
    });
    setPreviewLeccionIndex(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mod) => {
    setEditingModuleId(mod.id);
    setCurrentStep(1);
    setPreviewLeccionIndex(0);
    setFormData({
      titulo: mod.titulo || '',
      descripcion: mod.descripcion || '',
      icono: mod.icono || '🎓',
      color_accent: mod.color_accent || '#3b82f6',
      estado: mod.estado || 'publicado',
      duracion_minutos: mod.duracion_minutos || 10,
      menu_desbloqueado: mod.menu_desbloqueado || '',
      recursos_descarga: mod.recursos_descarga || [],
      lecciones:
        mod.lecciones && mod.lecciones.length > 0
          ? mod.lecciones.map(l => ({
              id: l.id,
              titulo: l.titulo,
              descripcion: l.descripcion || '',
              url_video: l.url_video || '',
              duracion_min: l.duracion_min || 5,
              tipo: l.tipo || 'video',
            }))
          : [
              {
                titulo: 'Clase 1: Introducción',
                descripcion: '',
                url_video: '',
                duracion_min: 5,
                tipo: 'video',
              },
            ],
      examen: mod.examen
        ? {
            id: mod.examen.id,
            titulo: mod.examen.titulo || '',
            descripcion: mod.examen.descripcion || '',
            puntaje_minimo: mod.examen.puntaje_minimo || 80,
            preguntas:
              mod.examen.preguntas && mod.examen.preguntas.length > 0
                ? mod.examen.preguntas.map(p => ({
                    id: p.id,
                    pregunta: p.pregunta,
                    opciones: Array.isArray(p.opciones) ? p.opciones : [],
                    respuesta_correcta: p.respuesta_correcta,
                    explicacion: p.explicacion || '',
                  }))
                : [],
          }
        : null,
    });
    setIsModalOpen(true);
  };

  const handleSaveStudio = async () => {
    if (!formData.titulo.trim()) {
      alert('Por favor ingresa un título para el módulo.');
      setCurrentStep(1);
      return;
    }

    try {
      setSaving(true);
      if (editingModuleId) {
        await adminUpdateModulo(editingModuleId, formData);
      } else {
        await adminCreateModulo(formData);
      }
      setIsModalOpen(false);
      await cargarDatos();
    } catch (error) {
      console.error('Error al guardar módulo en Studio:', error);
      alert('Error al guardar el módulo. Revisa los datos ingresados.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (id, titulo) => {
    if (window.confirm(`¿Estás seguro de eliminar el módulo "${titulo}" de la ruta?`)) {
      try {
        await adminDeleteModulo(id);
        await cargarDatos();
      } catch (error) {
        console.error('Error al eliminar módulo:', error);
      }
    }
  };

  const handleDuplicateModule = async (id) => {
    try {
      await adminDuplicarModulo(id);
      await cargarDatos();
    } catch (error) {
      console.error('Error al duplicar módulo:', error);
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= modulos.length) return;

    const newModulos = [...modulos];
    const [moved] = newModulos.splice(index, 1);
    newModulos.splice(targetIndex, 0, moved);

    setModulos(newModulos);
    try {
      const idsOrdenados = newModulos.map(m => m.id);
      await adminReordenarModulos(idsOrdenados);
    } catch (error) {
      console.error('Error al reordenar:', error);
      await cargarDatos();
    }
  };

  // Helpers para manejo dinámico de Lecciones
  const handleAddLeccion = () => {
    setFormData(prev => {
      const nextIndex = prev.lecciones.length;
      setPreviewLeccionIndex(nextIndex);
      return {
        ...prev,
        lecciones: [
          ...prev.lecciones,
          {
            titulo: `Clase ${nextIndex + 1}`,
            descripcion: '',
            url_video: '',
            duracion_min: 5,
            tipo: 'video',
          },
        ],
      };
    });
  };

  const handleRemoveLeccion = (idx) => {
    setFormData(prev => ({
      ...prev,
      lecciones: prev.lecciones.filter((_, i) => i !== idx),
    }));
    setPreviewLeccionIndex(prev => (prev >= idx ? Math.max(0, prev - 1) : prev));
  };

  const handleUpdateLeccion = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.lecciones];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, lecciones: updated };
    });
    if (field === 'url_video') {
      setPreviewLeccionIndex(idx);
    }
  };

  // Helper para verificar si una opción está marcada como correcta
  const isOptionCorrect = (respuesta, optId) => {
    if (!respuesta || !optId) return false;
    const optUpper = String(optId).trim().toUpperCase();
    if (Array.isArray(respuesta)) {
      return respuesta.map(r => String(r).trim().toUpperCase()).includes(optUpper);
    }
    if (typeof respuesta === 'string') {
      return respuesta.split(',').map(r => r.trim().toUpperCase()).includes(optUpper);
    }
    return String(respuesta).trim().toUpperCase() === optUpper;
  };

  // Helpers para manejo dinámico de Preguntas de Examen
  const handleAddPregunta = () => {
    const defaultExamen = formData.examen || {
      titulo: 'Evaluación del Módulo',
      descripcion: '',
      puntaje_minimo: 80,
      preguntas: [],
    };
    const totalPreguntas = defaultExamen.preguntas?.length || 0;
    const nuevaPregunta = {
      pregunta: `Pregunta ${totalPreguntas + 1}`,
      opciones: [
        { id: 'A', texto: 'Opción A' },
        { id: 'B', texto: 'Opción B' },
      ],
      respuesta_correcta: 'A',
      explicacion: '',
    };
    
    setFormData(prev => ({
      ...prev,
      examen: {
        ...defaultExamen,
        preguntas: [...(defaultExamen.preguntas || []), nuevaPregunta],
      },
    }));

    // Auto-scroll directo a la nueva pregunta creada
    setTimeout(() => {
      const cards = document.querySelectorAll('.lms-quiz-question-card');
      if (cards && cards.length > 0) {
        const lastCard = cards[cards.length - 1];
        lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        lastCard.classList.add('lms-newly-added-pulse');
        setTimeout(() => lastCard.classList.remove('lms-newly-added-pulse'), 1500);
      }
    }, 80);
  };

  const handleRemovePregunta = (pIdx) => {
    if (!formData.examen) return;
    setFormData(prev => ({
      ...prev,
      examen: {
        ...prev.examen,
        preguntas: prev.examen.preguntas.filter((_, i) => i !== pIdx),
      },
    }));
  };

  const handleUpdatePregunta = (pIdx, field, value) => {
    setFormData(prev => {
      if (!prev.examen) return prev;
      const updatedPreguntas = prev.examen.preguntas.map((preg, idx) => {
        if (idx !== pIdx) return preg;
        return { ...preg, [field]: value };
      });
      return { ...prev, examen: { ...prev.examen, preguntas: updatedPreguntas } };
    });
  };

  // Toggle para permitir marcar 1 o varias respuestas correctas
  const handleToggleRespuestaCorrecta = (pIdx, optId) => {
    setFormData(prev => {
      if (!prev.examen) return prev;
      const updatedPreguntas = prev.examen.preguntas.map((preg, idx) => {
        if (idx !== pIdx) return preg;
        const optUpper = String(optId).trim().toUpperCase();
        let currentArr = [];
        if (Array.isArray(preg.respuesta_correcta)) {
          currentArr = preg.respuesta_correcta.map(r => String(r).trim().toUpperCase());
        } else if (typeof preg.respuesta_correcta === 'string') {
          currentArr = preg.respuesta_correcta.split(',').map(r => r.trim().toUpperCase()).filter(Boolean);
        } else if (preg.respuesta_correcta) {
          currentArr = [String(preg.respuesta_correcta).trim().toUpperCase()];
        }

        let nextArr;
        if (currentArr.includes(optUpper)) {
          // Deseleccionar
          nextArr = currentArr.filter(id => id !== optUpper);
          // Mantener al menos 1 seleccionada
          if (nextArr.length === 0) nextArr = [optUpper];
        } else {
          // Agregar a respuestas correctas
          nextArr = [...currentArr, optUpper].sort();
        }

        return {
          ...preg,
          respuesta_correcta: nextArr.join(','),
        };
      });

      return { ...prev, examen: { ...prev.examen, preguntas: updatedPreguntas } };
    });
  };

  // Agregar alternativa de forma inmutable (sin duplicación de estado)
  const handleAddOpcion = (pIdx) => {
    setFormData(prev => {
      if (!prev.examen) return prev;
      const updatedPreguntas = prev.examen.preguntas.map((preg, idx) => {
        if (idx !== pIdx) return preg;
        const opciones = preg.opciones ? [...preg.opciones] : [];
        const letter = String.fromCharCode(65 + opciones.length); // A, B, C, D...
        return {
          ...preg,
          opciones: [...opciones, { id: letter, texto: `Opción ${letter}` }],
        };
      });
      return { ...prev, examen: { ...prev.examen, preguntas: updatedPreguntas } };
    });
  };

  // Eliminar alternativa específica
  const handleRemoveOpcion = (pIdx, optIdx) => {
    setFormData(prev => {
      if (!prev.examen) return prev;
      const updatedPreguntas = prev.examen.preguntas.map((preg, idx) => {
        if (idx !== pIdx) return preg;
        const opciones = (preg.opciones || []).filter((_, i) => i !== optIdx);
        // Re-indexar letras A, B, C...
        const remappedOpciones = opciones.map((opt, i) => ({
          ...opt,
          id: String.fromCharCode(65 + i),
        }));

        const removedOpt = (preg.opciones || [])[optIdx];
        const removedId = removedOpt ? String(removedOpt.id).toUpperCase() : null;

        let currentArr = typeof preg.respuesta_correcta === 'string'
          ? preg.respuesta_correcta.split(',').map(r => r.trim().toUpperCase()).filter(Boolean)
          : [String(preg.respuesta_correcta || 'A').toUpperCase()];

        let nextArr = currentArr.filter(id => id !== removedId);
        if (nextArr.length === 0 && remappedOpciones.length > 0) {
          nextArr = [remappedOpciones[0].id];
        }

        return {
          ...preg,
          opciones: remappedOpciones,
          respuesta_correcta: nextArr.join(','),
        };
      });

      return { ...prev, examen: { ...prev.examen, preguntas: updatedPreguntas } };
    });
  };

  const handleUpdateOpcionTexto = (pIdx, optIdx, texto) => {
    setFormData(prev => {
      if (!prev.examen) return prev;
      const updatedPreguntas = prev.examen.preguntas.map((preg, idx) => {
        if (idx !== pIdx) return preg;
        const opciones = (preg.opciones || []).map((opt, oIdx) => {
          if (oIdx !== optIdx) return opt;
          return { ...opt, texto };
        });
        return { ...preg, opciones };
      });
      return { ...prev, examen: { ...prev.examen, preguntas: updatedPreguntas } };
    });
  };

  return (
    <div className="lms-studio-container">
      {/* 1. HERO HEADER & METRICS BAR (Linear / Notion Style) */}
      <header className="lms-studio-header">
        <div className="lms-header-top">
          <div className="lms-header-title-area">
            <span className="lms-badge-tag">
              <GraduationCap size={16} /> Gesicom Learning Journey Studio
            </span>
            <h1 className="lms-studio-title">Ruta de Aprendizaje & Academia</h1>
            <p className="lms-studio-subtitle">
              Diseña el recorrido formativo para que tus usuarios dominen el e-commerce, desbloqueen
              herramientas clave y escalen sus ventas.
            </p>
          </div>
          <button className="lms-btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={16} /> Crear Nuevo Módulo
          </button>
        </div>

        {/* Dynamic Metric Counters */}
        <div className="lms-stats-grid">
          <div className="lms-stat-item">
            <div className="lms-stat-icon-wrapper" style={{ color: '#60a5fa' }}>
              <Layers size={20} />
            </div>
            <div className="lms-stat-info">
              <span className="lms-stat-value">{metricas.total_modulos}</span>
              <span className="lms-stat-label">Módulos en Ruta</span>
            </div>
          </div>
          <div className="lms-stat-item">
            <div className="lms-stat-icon-wrapper" style={{ color: '#34d399' }}>
              <Video size={20} />
            </div>
            <div className="lms-stat-info">
              <span className="lms-stat-value">{metricas.total_lecciones}</span>
              <span className="lms-stat-label">Lecciones / Videos</span>
            </div>
          </div>
          <div className="lms-stat-item">
            <div className="lms-stat-icon-wrapper" style={{ color: '#fbbf24' }}>
              <Clock size={20} />
            </div>
            <div className="lms-stat-info">
              <span className="lms-stat-value">{metricas.total_duracion_minutos} min</span>
              <span className="lms-stat-label">Tiempo Total</span>
            </div>
          </div>
          <div className="lms-stat-item">
            <div className="lms-stat-icon-wrapper" style={{ color: '#d4a537' }}>
              <HelpCircle size={20} />
            </div>
            <div className="lms-stat-info">
              <span className="lms-stat-value">{metricas.total_preguntas}</span>
              <span className="lms-stat-label">Preguntas Activas</span>
            </div>
          </div>
          <div className="lms-stat-item">
            <div className="lms-stat-icon-wrapper" style={{ color: '#f43f5e' }}>
              <Lock size={20} />
            </div>
            <div className="lms-stat-info">
              <span className="lms-stat-value">{metricas.menus_desbloqueables}</span>
              <span className="lms-stat-label">Menús Vinculados</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. TIMELINE JOURNEY ROADMAP (Notion + Kajabi Cards) */}
      <main className="lms-journey-wrapper">
        <div className="lms-journey-line" />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            <p>Cargando ruta de aprendizaje...</p>
          </div>
        ) : (
          <div className="lms-journey-list">
            {modulos.map((mod, index) => {
              const duracion = mod.duracion_minutos || 10;
              const leccionesCount = mod.total_lecciones || mod.lecciones?.length || 0;
              const preguntasCount = mod.examen?.preguntas?.length || mod.examen?.total_preguntas || 0;
              const menuObj = UNLOCK_OPTIONS.find(u => u.id === mod.menu_desbloqueado);

              return (
                <div key={mod.id} className="lms-journey-step">
                  {/* Big Numbered Node */}
                  <div
                    className="lms-step-node"
                    style={{ borderColor: mod.color_accent || '#3b82f6' }}
                  >
                    {index + 1}
                  </div>

                  {/* High-Impact Journey Card */}
                  <div
                    className="lms-journey-card"
                    style={{ '--accent-color': mod.color_accent || '#3b82f6' }}
                  >
                    <div className="lms-card-accent-bar" />

                    <div className="lms-card-header">
                      <div className="lms-card-title-group">
                        <span className="lms-card-emoji">{mod.icono || '🎓'}</span>
                        <div>
                          <h3 className="lms-card-title">{mod.titulo}</h3>
                        </div>
                      </div>
                      <span className={`lms-status-badge lms-status-${mod.estado || 'publicado'}`}>
                        ● {mod.estado || 'publicado'}
                      </span>
                    </div>

                    <p className="lms-card-desc">{mod.descripcion}</p>

                    {/* Metadata Badges */}
                    <div className="lms-card-meta-grid">
                      <span className="lms-meta-pill">
                        <Clock size={14} /> {duracion} min
                      </span>
                      <span className="lms-meta-pill">
                        <Video size={14} /> {leccionesCount} {leccionesCount === 1 ? 'video' : 'videos'}
                      </span>
                      <span className="lms-meta-pill">
                        <HelpCircle size={14} /> {preguntasCount} preguntas
                      </span>
                      {mod.menu_desbloqueado && (
                        <span className="lms-meta-pill lms-meta-pill-unlock">
                          <Lock size={14} /> Desbloquea: {menuObj?.titulo || mod.menu_desbloqueado}
                        </span>
                      )}
                    </div>

                    {/* Multi-Lesson List Preview */}
                    {mod.lecciones && mod.lecciones.length > 0 && (
                      <div className="lms-card-lessons-preview">
                        {mod.lecciones.map((lec, lIdx) => (
                          <div key={lec.id || lIdx} className="lms-lesson-sub-item">
                            <span className="lms-lesson-sub-title">
                              <Video color="#60a5fa" size={12} />
                              {lec.titulo}
                            </span>
                            <span className="lms-lesson-sub-duration">
                              ⏱ {lec.duracion_min || 5} min
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions & Reordering */}
                    <div className="lms-card-actions">
                      <div className="lms-card-order-controls">
                        <button
                          className="lms-btn-icon-sm"
                          title="Subir de posición"
                          disabled={index === 0}
                          onClick={() => handleMoveOrder(index, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="lms-btn-icon-sm"
                          title="Bajar de posición"
                          disabled={index === modulos.length - 1}
                          onClick={() => handleMoveOrder(index, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>

                      <div className="lms-card-btn-group">
                        <button
                          className="lms-btn-secondary"
                          onClick={() => handleDuplicateModule(mod.id)}
                          title="Duplicar módulo y contenido"
                        >
                          <Copy size={14} /> Duplicar
                        </button>
                        <button
                          className="lms-btn-secondary"
                          onClick={() => handleOpenEditModal(mod)}
                        >
                          <Edit3 size={14} /> Editar en Studio
                        </button>
                        <button
                          className="lms-btn-secondary lms-btn-danger"
                          onClick={() => handleDeleteModule(mod.id, mod.titulo)}
                          title="Eliminar de la ruta"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Seamless Add Step Node at the End */}
            <div className="lms-journey-add-step">
              <div className="lms-node-add">
                <Plus size={20} />
              </div>
              <div className="lms-card-add-trigger" onClick={handleOpenCreateModal}>
                <Plus size={16} /> Agregar Siguiente Módulo a la Ruta
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. STUDIO MODAL & 4-STEP BUILDER WITH LIVE SIMULATOR */}
      {isModalOpen && (
        <div className="lms-modal-backdrop">
          <div className="lms-studio-modal">
            {/* Modal Header with 4-Step Nav */}
            <div className="lms-studio-modal-header">
              <h2 className="lms-studio-modal-title">
                <GraduationCap color="#3b82f6" />
                {editingModuleId ? 'Studio: Editar Módulo' : 'Studio: Diseñar Nuevo Módulo'}
              </h2>

              <nav className="lms-step-nav">
                <button
                  className={`lms-step-nav-btn ${currentStep === 1 ? 'active' : ''}`}
                  onClick={() => setCurrentStep(1)}
                >
                  ① Información
                </button>
                <button
                  className={`lms-step-nav-btn ${currentStep === 2 ? 'active' : ''}`}
                  onClick={() => setCurrentStep(2)}
                >
                  ② Lecciones Multi-Video
                </button>
                <button
                  className={`lms-step-nav-btn ${currentStep === 3 ? 'active' : ''}`}
                  onClick={() => setCurrentStep(3)}
                >
                  ③ Desbloqueos
                </button>
                <button
                  className={`lms-step-nav-btn ${currentStep === 4 ? 'active' : ''}`}
                  onClick={() => setCurrentStep(4)}
                >
                  ④ Evaluación
                </button>
              </nav>

              <button
                className="lms-btn-icon-sm"
                onClick={() => setIsModalOpen(false)}
                title="Cerrar Studio"
              >
                <X size={16} />
              </button>
            </div>

            {/* Split Screen Body */}
            <div className="lms-studio-body">
              {/* Left Pane: Active Step Form */}
              <div className="lms-studio-form-pane">
                {/* STEP 1: INFORMACIÓN & BRANDING */}
                {currentStep === 1 && (
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--color-fg)' }}>
                      Paso 1: Información General & Estilo
                    </h3>

                    <div className="lms-form-group">
                      <label className="lms-form-label">Título del Módulo</label>
                      <input
                        type="text"
                        className="lms-input-text"
                        placeholder="Ej: Fundamentos de E-commerce y Landing Pages"
                        value={formData.titulo}
                        onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                      />
                    </div>

                    <div className="lms-form-group">
                      <label className="lms-form-label">Descripción Pedagógica</label>
                      <textarea
                        className="lms-textarea"
                        rows={3}
                        placeholder="Explica a los alumnos qué aprenderán en este módulo..."
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                      />
                    </div>

                    <div className="lms-form-group">
                      <label className="lms-form-label">Icono / Emoji Temático</label>
                      <div className="lms-emoji-picker-grid">
                        {EMOJI_OPTIONS.map(emoji => (
                          <div
                            key={emoji}
                            className={`lms-emoji-pill ${formData.icono === emoji ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, icono: emoji })}
                          >
                            {emoji}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lms-form-group">
                      <label className="lms-form-label">Color de Acento / Aura</label>
                      <div className="lms-color-picker-grid">
                        {COLOR_OPTIONS.map(color => (
                          <div
                            key={color}
                            className={`lms-color-pill ${formData.color_accent === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setFormData({ ...formData, color_accent: color })}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="lms-form-group">
                      <label className="lms-form-label">Estado de Publicación</label>
                      <select
                        className="lms-select"
                        value={formData.estado}
                        onChange={e => setFormData({ ...formData, estado: e.target.value })}
                      >
                        <option value="publicado">🟢 Publicado (Disponible para alumnos)</option>
                        <option value="borrador">🟡 Borrador (En edición)</option>
                        <option value="construccion">⚪ En Construcción</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 2: LECCIONES & VIDEOS MÚLTIPLES */}
                {currentStep === 2 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--color-fg)' }}>
                          Paso 2: Lecciones y Videos del Módulo
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
                          Puedes agregar tantas clases o videos como desees (Drive, YouTube, Loom, Vimeo).
                        </p>
                      </div>
                      <button className="lms-btn-primary" onClick={handleAddLeccion}>
                        <Plus size={16} /> Agregar Video / Clase
                      </button>
                    </div>

                    <div className="lms-lessons-builder-list">
                      {formData.lecciones.map((lec, idx) => {
                        const isPreviewing = previewLeccionIndex === idx;
                        return (
                          <div key={idx} className="lms-lesson-builder-card">
                            <div className="lms-lesson-builder-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="lms-lesson-badge">Lección #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => setPreviewLeccionIndex(idx)}
                                  style={{
                                    background: isPreviewing ? 'rgba(59, 130, 246, 0.25)' : 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
                                    border: isPreviewing ? '1px solid #3b82f6' : '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)',
                                    color: isPreviewing ? '#60a5fa' : '#94a3b8',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: isPreviewing ? 600 : 400,
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Mostrar este video en el Simulador en Vivo"
                                >
                                  <Play size={10} fill={isPreviewing ? '#60a5fa' : 'none'} />
                                  {isPreviewing ? 'En Simulador' : 'Ver en Simulador'}
                                </button>
                              </div>
                              {formData.lecciones.length > 1 && (
                                <button
                                  className="lms-btn-icon-sm lms-btn-danger"
                                  title="Eliminar lección"
                                  onClick={() => handleRemoveLeccion(idx)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                          <div className="lms-form-group">
                            <label className="lms-form-label">Título de la Lección</label>
                            <input
                              type="text"
                              className="lms-input-text"
                              placeholder="Ej: Clase 1: Configuración de Métodos de Pago"
                              value={lec.titulo}
                              onChange={e => handleUpdateLeccion(idx, 'titulo', e.target.value)}
                            />
                          </div>

                          <div className="lms-form-group">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                              <label className="lms-form-label" style={{ margin: 0 }}>
                                Enlace del Video (YouTube, Google Drive, Loom, Vimeo, etc.)
                              </label>
                              {(() => {
                                const detected = detectVideoPlatform(lec.url_video);
                                if (!detected) return null;
                                return (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: '600',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      background: `${detected.color}22`,
                                      color: detected.color,
                                      border: `1px solid ${detected.color}44`,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <span>{detected.icon}</span> {detected.badge} Detectado
                                  </span>
                                );
                              })()}
                            </div>
                            <input
                              type="text"
                              className="lms-input-text"
                              placeholder="Ej: https://drive.google.com/file/d/... o https://youtube.com/watch?v=..."
                              value={lec.url_video}
                              onChange={e => handleUpdateLeccion(idx, 'url_video', e.target.value)}
                            />
                            {lec.url_video?.includes('drive.google.com') && (
                              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                💡 <strong>Drive:</strong> Se convertirá a /preview automáticamente. Recuerda configurar el archivo en Drive como "Cualquier persona con el enlace (Lector)".
                              </p>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="lms-form-group">
                              <label className="lms-form-label">Duración Estimada (minutos)</label>
                              <input
                                type="number"
                                className="lms-input-text"
                                min={1}
                                value={lec.duracion_min}
                                onChange={e => handleUpdateLeccion(idx, 'duracion_min', e.target.value)}
                              />
                            </div>
                            <div className="lms-form-group">
                              <label className="lms-form-label">Tipo de Contenido</label>
                              <select
                                className="lms-select"
                                value={lec.tipo || 'video'}
                                onChange={e => handleUpdateLeccion(idx, 'tipo', e.target.value)}
                              >
                                <option value="video">📹 Video YouTube</option>
                                <option value="articulo">📄 Guía / Texto</option>
                                <option value="recurso">📦 Archivo Descargable</option>
                              </select>
                            </div>
                          </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: DESBLOQUEOS DE ECOSISTEMA */}
                {currentStep === 3 && (
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-fg)' }}>
                      Paso 3: Desbloqueos del Ecosistema
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                      Selecciona qué menú o herramienta se desbloqueará en el Sidebar cuando el alumno
                      apruebe este módulo:
                    </p>

                    <div className="lms-ecosystem-grid">
                      {UNLOCK_OPTIONS.map(opt => {
                        const isSelected = formData.menu_desbloqueado === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`lms-ecosystem-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, menu_desbloqueado: opt.id })}
                          >
                            <div className="lms-ecosystem-card-title">
                              {opt.icon} {opt.titulo}
                            </div>
                            <p className="lms-ecosystem-card-desc">{opt.desc}</p>
                            {isSelected && (
                              <span style={{ fontSize: '0.75rem', color: '#d4a537', fontWeight: 'bold' }}>
                                ✓ Seleccionado para desbloquear
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 4: EXAMEN & EVALUACIÓN */}
                {currentStep === 4 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--color-fg)' }}>
                          Paso 4: Constructor de Examen
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
                          Crea preguntas interactivas. Puedes marcar <strong>una o varias respuestas correctas</strong> por pregunta.
                        </p>
                      </div>
                      <button type="button" className="lms-btn-primary" onClick={handleAddPregunta}>
                        <Plus size={16} /> Agregar Pregunta
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label className="lms-form-label">Título de la Evaluación</label>
                        <input
                          type="text"
                          className="lms-input-text"
                          value={formData.examen?.titulo || ''}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              examen: { ...(prev.examen || {}), titulo: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="lms-form-label">Nota Mínima Aprobatoria (%)</label>
                        <input
                          type="number"
                          className="lms-input-text"
                          min={50}
                          max={100}
                          value={formData.examen?.puntaje_minimo || 80}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              examen: { ...(prev.examen || {}), puntaje_minimo: Number(e.target.value) },
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Question Cards */}
                    {(formData.examen?.preguntas || []).map((preg, pIdx) => (
                      <div key={pIdx} className="lms-quiz-question-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '0.92rem' }}>
                              Pregunta #{pIdx + 1}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'color-mix(in srgb, var(--color-fg) 6%, transparent)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                              {String(preg.respuesta_correcta || '').includes(',') ? 'Múltiples correctas' : 'Opción simple'}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="lms-btn-icon-sm lms-btn-danger"
                            onClick={() => handleRemovePregunta(pIdx)}
                            title="Eliminar pregunta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="lms-form-group">
                          <label className="lms-form-label">Enunciado de la Pregunta</label>
                          <input
                            type="text"
                            className="lms-input-text"
                            placeholder="Ej: ¿Cuál es el objetivo principal de una landing page?"
                            value={preg.pregunta}
                            onChange={e => handleUpdatePregunta(pIdx, 'pregunta', e.target.value)}
                          />
                        </div>

                        <div className="lms-form-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <label className="lms-form-label" style={{ margin: 0 }}>
                              Alternativas de Respuesta:
                            </label>
                            <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>
                              (Haz clic en "Marcar Correcta" para seleccionar 1 o varias)
                            </span>
                          </div>

                          {(preg.opciones || []).map((opt, optIdx) => {
                            const isCorrect = isOptionCorrect(preg.respuesta_correcta, opt.id);
                            return (
                              <div key={optIdx} className="lms-option-row">
                                <span className="lms-option-label-badge">{opt.id}</span>
                                <input
                                  type="text"
                                  className="lms-input-text"
                                  value={opt.texto}
                                  onChange={e => handleUpdateOpcionTexto(pIdx, optIdx, e.target.value)}
                                  placeholder={`Texto de la opción ${opt.id}...`}
                                />
                                <button
                                  type="button"
                                  className={`lms-option-radio-btn ${isCorrect ? 'is-correct' : ''}`}
                                  onClick={() => handleToggleRespuestaCorrecta(pIdx, opt.id)}
                                  title={isCorrect ? 'Desmarcar como correcta' : 'Marcar como correcta'}
                                >
                                  {isCorrect ? '✓ Correcta' : '+ Marcar Correcta'}
                                </button>
                                <button
                                  type="button"
                                  className="lms-option-delete-btn"
                                  disabled={(preg.opciones || []).length <= 2}
                                  onClick={() => handleRemoveOpcion(pIdx, optIdx)}
                                  title={(preg.opciones || []).length <= 2 ? 'Mínimo 2 alternativas por pregunta' : 'Eliminar alternativa'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            className="lms-btn-secondary"
                            style={{ marginTop: '0.5rem' }}
                            onClick={() => handleAddOpcion(pIdx)}
                          >
                            <Plus size={14} /> Agregar Alternativa
                          </button>
                        </div>

                        <div className="lms-form-group" style={{ marginBottom: 0 }}>
                          <label className="lms-form-label">Explicación Didáctica (Feedback para el alumno)</label>
                          <input
                            type="text"
                            className="lms-input-text"
                            placeholder="Por qué esta respuesta es la correcta..."
                            value={preg.explicacion}
                            onChange={e => handleUpdatePregunta(pIdx, 'explicacion', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Bottom Add Question Button */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem', marginBottom: '0.5rem' }}>
                      <button
                        type="button"
                        className="lms-btn-secondary"
                        style={{ width: '100%', padding: '0.85rem', borderStyle: 'dashed' }}
                        onClick={handleAddPregunta}
                      >
                        <Plus size={16} /> + Agregar Otra Pregunta al Examen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Pane: Live Student Simulator (Editor Visual en Tiempo Real) */}
              <div className="lms-studio-preview-pane">
                <div className="lms-preview-title">
                  <span>
                    <Eye size={16} /> Simulador en Vivo (Vista del Alumno)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Live Preview</span>
                </div>

                <div className="lms-simulator-device">
                  <div className="lms-simulator-screen">
                    {/* Simulator Course Card */}
                    <div
                      style={{
                        background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
                        border: `1px solid ${formData.color_accent}`,
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{formData.icono}</span>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>
                          {formData.titulo || 'Título del Módulo'}
                        </h4>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                        {formData.descripcion || 'Sin descripción ingresada aún.'}
                      </p>
                    </div>

                    {/* Simulator Video Player */}
                    {(() => {
                      const safePreviewIndex = Math.min(previewLeccionIndex, Math.max(0, formData.lecciones.length - 1));
                      const activePreviewLeccion = formData.lecciones[safePreviewIndex] || formData.lecciones[0];

                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Play size={12} fill="#38bdf8" /> Clase {safePreviewIndex + 1} de {formData.lecciones.length}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              ⏱ {activePreviewLeccion?.duracion_min || 5} min
                            </span>
                          </div>

                          {activePreviewLeccion?.url_video ? (
                            <div className="lms-video-preview-embed">
                              <iframe
                                key={`preview-video-${safePreviewIndex}-${activePreviewLeccion.url_video}`}
                                src={getEmbedUrl(activePreviewLeccion.url_video)}
                                title={activePreviewLeccion.titulo || `Clase ${safePreviewIndex + 1}`}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                aspectRatio: '16/9',
                                background: 'var(--color-canvas)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b',
                                fontSize: '0.85rem',
                                marginBottom: '1rem',
                                textAlign: 'center',
                                padding: '1rem',
                                border: '1px dashed color-mix(in srgb, var(--color-fg) 10%, transparent)',
                              }}
                            >
                              La Clase #{safePreviewIndex + 1} no tiene enlace de video aún.
                            </div>
                          )}

                          {/* Simulator Playlist */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8' }}>
                                Contenido del Módulo ({formData.lecciones.length} clases):
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                Clic para previsualizar
                              </span>
                            </div>
                            {formData.lecciones.map((lec, idx) => {
                              const isCurrent = safePreviewIndex === idx;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setPreviewLeccionIndex(idx)}
                                  role="button"
                                  tabIndex={0}
                                  title={`Clic para ver preview de la Clase ${idx + 1}`}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: isCurrent ? 'rgba(59, 130, 246, 0.2)' : 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
                                    padding: '0.55rem 0.75rem',
                                    borderRadius: '8px',
                                    border: isCurrent ? '1px solid #3b82f6' : '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)',
                                    boxShadow: isCurrent ? '0 0 12px rgba(59, 130, 246, 0.25)' : 'none',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isCurrent) e.currentTarget.style.background = 'color-mix(in srgb, var(--color-fg) 7%, transparent)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isCurrent) e.currentTarget.style.background = 'color-mix(in srgb, var(--color-fg) 3%, transparent)';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <span style={{ color: isCurrent ? '#38bdf8' : '#64748b', display: 'flex', alignItems: 'center' }}>
                                      {isCurrent ? <Play size={12} fill="#38bdf8" /> : '▶'}
                                    </span>
                                    <span
                                      style={{
                                        color: isCurrent ? '#ffffff' : '#cbd5e1',
                                        fontWeight: isCurrent ? 600 : 400,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {lec.titulo || `Clase ${idx + 1}`}
                                    </span>
                                  </div>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      color: isCurrent ? '#93c5fd' : '#64748b',
                                      flexShrink: 0,
                                      marginLeft: '8px',
                                    }}
                                  >
                                    ⏱ {lec.duracion_min || 5} min
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="lms-studio-modal-footer">
              <div>
                {currentStep > 1 && (
                  <button className="lms-btn-secondary" onClick={() => setCurrentStep(currentStep - 1)}>
                    ← Anterior
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {currentStep < 4 ? (
                  <button className="lms-btn-primary" onClick={() => setCurrentStep(currentStep + 1)}>
                    Siguiente →
                  </button>
                ) : (
                  <button className="lms-btn-primary" disabled={saving} onClick={handleSaveStudio}>
                    {saving ? 'Guardando en la Ruta...' : '✓ Guardar y Publicar en Ruta'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
