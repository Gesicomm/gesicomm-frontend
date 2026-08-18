import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Save, Loader, ArrowLeft, Eye, EyeOff, Monitor, Smartphone, AlertCircle, Check
} from 'lucide-react';
import { landingService } from '../../services/landingService';
import { productService } from '../../services/productService';
import { getMediaUrl } from '../../services/api';
import LandingPreview from './LandingPreview';
import InspectorSeccion from './InspectorSeccion';
import { BLOQUES_SCHEMA } from './BloquesSchema';

export default function MerchantEditor() {
  const { productoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [landing, setLanding] = useState(null);
  const [producto, setProducto] = useState(null);
  
  const [content, setContent] = useState({});
  const [seccionSeleccionadaId, setSeccionSeleccionadaId] = useState(null);
  const [dispositivo, setDispositivo] = useState('mobile'); // 'desktop' | 'mobile'
  const [previewCheckoutAbierto, setPreviewCheckoutAbierto] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [land, prod] = await Promise.all([
          landingService.obtenerLandingProducto(productoId),
          productService.obtener(productoId)
        ]);
        
        setLanding(land);
        setProducto(prod);
        setContent(land.content || {});
      } catch (err) {
        console.error(err);
        setError('Error al cargar la información del embudo.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [productoId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await landingService.guardarLandingProducto(productoId, content);
      // Podriamos mostrar un toast de exito aqui
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSeccion = useCallback((id, updates) => {
    setContent(prev => {
      const prevSectionData = prev[id] || {};
      
      // updates es un objeto que viene de InspectorSeccion (ej: { config: {...} } o { contenido: {...} })
      // Hacemos merge superficial. Como InspectorSeccion ya nos manda el sub-objeto completo 
      // (ej: { config: { ...prev.config, nuevoColor } }), no perdemos datos.
      return {
        ...prev,
        [id]: {
          ...prevSectionData,
          ...updates
        }
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--vit-bg)]">
        <Loader className="h-8 w-8 animate-spin text-[var(--vit-primary)]" />
      </div>
    );
  }

  if (!landing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--vit-bg)]">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-red-100 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-gray-800">Embudo no encontrado</h2>
          <p className="text-gray-600 mb-6">No pudimos cargar la configuración. Asegurate de haber seleccionado una estrategia primero.</p>
          <Link to={`/mi-landing/producto/${productoId}/funnel-selector`} className="lb-btn-primary">
            Elegir Embudo
          </Link>
        </div>
      </div>
    );
  }

  const schema = landing.template?.schema || [];
  
  // Transform schema and content into the shape LandingPreview expects
  const previewSections = schema.map((sSchema, idx) => {
    const sContent = content[sSchema.id] || {};
    return {
      ...sSchema,
      id: sSchema.id,
      orden: idx,
      // Hacemos merge del contenido del schema default y lo que llenó el usuario
      contenido: { ...(sSchema.contenido || {}), ...(sContent.contenido || {}) },
      config: { ...(sSchema.config || {}), ...(sContent.config || {}) },
      ancho_mitad: sContent.ancho_mitad !== undefined ? sContent.ancho_mitad : sSchema.ancho_mitad
    };
  });

  const seccionActiva = previewSections.find(s => s.id === seccionSeleccionadaId);
  const activeTabClass = "flex-1 py-3 text-sm font-semibold border-b-2 transition-colors";

  return (
    <div className="flex h-screen flex-col bg-[var(--vit-bg)] font-inter text-[var(--vit-text)]">
      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--vit-border)] bg-[var(--vit-card-bg)] px-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-1.5 text-[var(--vit-muted)] hover:text-[var(--vit-text)] hover:bg-[var(--vit-surface)] rounded-md transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="h-6 w-[1px] bg-[var(--vit-border)] mx-1"></div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--vit-primary)] mr-2">Editor</span>
            <span className="text-sm font-medium text-[var(--vit-text)] truncate max-w-[200px] inline-block align-bottom">{producto?.nombre}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {error && <span className="text-sm text-red-500 font-medium flex items-center gap-1"><AlertCircle size={14}/> {error}</span>}
          
          <div className="flex bg-[var(--vit-surface)] rounded-md p-1 border border-[var(--vit-border)]">
            <button
              onClick={() => setDispositivo('desktop')}
              className={`p-1.5 rounded-sm transition-colors ${dispositivo === 'desktop' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vista de Computadora"
            >
              <Monitor size={16} />
            </button>
            <button
              onClick={() => setDispositivo('mobile')}
              className={`p-1.5 rounded-sm transition-colors ${dispositivo === 'mobile' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vista de Celular"
            >
              <Smartphone size={16} />
            </button>
          </div>

          <button
            className="lb-btn-primary h-8 px-4 text-sm gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Form */}
        <div className="w-[340px] shrink-0 border-r border-[var(--vit-border)] bg-[var(--vit-card-bg)] flex flex-col z-10 shadow-sm relative overflow-hidden">
          {seccionSeleccionadaId ? (
            <InspectorSeccion
              seccion={seccionActiva}
              onUpdate={handleUpdateSeccion}
              onBack={() => setSeccionSeleccionadaId(null)}
              catalogo={{ productos: [], combos: [] }} // Pasamos mock vacio por ahora si no hay gestion de combos compleja aca
              productoId={productoId}
              previewCheckoutAbierto={previewCheckoutAbierto}
              onTogglePreviewCheckout={() => setPreviewCheckoutAbierto(!previewCheckoutAbierto)}
            />
          ) : (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
              <div className="p-5 border-b border-[var(--vit-border)] bg-[var(--vit-surface)]">
                <h2 className="text-lg font-bold text-[var(--vit-text)] mb-1">Estructura del Embudo</h2>
                <p className="text-xs text-[var(--vit-muted)] leading-relaxed">
                  Basado en: <span className="font-semibold text-gray-700">{landing.template?.name}</span>
                  <br/>Seleccioná cada sección para configurar su contenido.
                </p>
              </div>
              
              <div className="p-3 flex flex-col gap-2">
                {previewSections.map((s, idx) => {
                  const bsSchema = BLOQUES_SCHEMA[s.tipo];
                  const Icono = bsSchema?.icon || Settings;
                  const configurado = content[s.id] && Object.keys(content[s.id]).length > 0;
                  
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSeccionSeleccionadaId(s.id)}
                      className="group flex items-center gap-3 w-full p-3 text-left bg-white border border-[var(--vit-border)] rounded-xl hover:border-[var(--vit-primary)] hover:shadow-sm transition-all"
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${configurado ? 'bg-[var(--vit-primary)] text-white' : 'bg-[var(--vit-surface)] text-[var(--vit-muted)] group-hover:text-[var(--vit-primary)]'}`}>
                        <Icono size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--vit-text)] truncate">
                          {s.nombre_interno || bsSchema?.name || s.tipo}
                        </p>
                        <p className="text-xs text-[var(--vit-muted)] flex items-center gap-1 mt-0.5">
                          {configurado ? (
                            <><Check size={10} className="text-emerald-500" /> Configurado</>
                          ) : (
                            <>Pendiente</>
                          )}
                        </p>
                      </div>
                      <div className="text-[var(--vit-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                        &rarr;
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center Preview */}
        <div className="flex-1 flex flex-col bg-[#F3F4F6] relative overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex justify-center">
             <div className={`transition-all duration-300 ease-in-out bg-white shadow-xl ${dispositivo === 'mobile' ? 'w-[414px] rounded-[2rem] border-[12px] border-gray-900 overflow-hidden relative min-h-[800px]' : 'w-full max-w-6xl rounded-lg'}`}>
                {/* Mobile notch mockup */}
                {dispositivo === 'mobile' && (
                  <div className="absolute top-0 inset-x-0 h-6 bg-transparent z-50 flex justify-center">
                    <div className="w-32 h-6 bg-gray-900 rounded-b-xl"></div>
                  </div>
                )}
                
                <div className={`h-full w-full overflow-y-auto custom-scrollbar bg-[var(--vit-bg)] ${dispositivo === 'mobile' ? 'pt-6' : ''}`}>
                   <LandingPreview
                      titulo={producto?.nombre}
                      descripcion={producto?.descripcion}
                      filtros={{}}
                      items={[]} // En un funnel real esto vendría de los step products
                      catalogo={{}} 
                      tema={{
                        modo: 'claro',
                        primario: landing?.template?.design_tokens?.primary_color || '#3B82F6',
                        secundario: '#1E293B',
                        fondo: '#FFFFFF',
                        texto: undefined,
                        tarjeta: undefined
                      }}
                      diseno={{ 
                        radio_bordes: 'xl', 
                        fuente: landing?.template?.design_tokens?.font || 'inter' 
                      }}
                      contacto={{}}
                      secciones={previewSections}
                      seccionSeleccionadaId={seccionSeleccionadaId}
                      onSelectSeccion={setSeccionSeleccionadaId}
                      viewportMode={dispositivo}
                      previewCheckoutAbierto={previewCheckoutAbierto}
                      onTogglePreviewCheckout={setPreviewCheckoutAbierto}
                   />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
