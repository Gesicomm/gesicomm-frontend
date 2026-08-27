import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, LayoutTemplate, CheckCircle2, AlertCircle } from 'lucide-react';
import { landingService } from '../../services/landingService';
import { productService } from '../../services/productService';
import { getMediaUrl } from '../../services/api';

export default function FunnelSelector() {
  const { productoId } = useParams();
  const navigate = useNavigate();
  
  const [producto, setProducto] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [instanciandoId, setInstanciandoId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Load product and templates in parallel
        const [prod, tpls] = await Promise.all([
          productService.obtener(productoId),
          landingService.listarTemplates()
        ]);
        
        setProducto(prod);
        setTemplates(tpls);
      } catch (err) {
        console.error(err);
        setError('Error al cargar la información. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [productoId]);

  const handleSelectTemplate = async (templateId) => {
    try {
      setInstanciandoId(templateId);
      setError('');
      // This instantiates the landing with the selected template idempotently
      await landingService.instanciarLanding(productoId, templateId);
      // Proceed to the Merchant Editor
      navigate(`/mi-landing/producto/${productoId}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Hubo un error al configurar el embudo.');
      setInstanciandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Navbar/Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/products')}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Estrategia de Venta
              </p>
              <h1 className="text-lg font-bold text-gray-900 truncate max-w-md">
                {producto?.nombre}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 pt-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] shadow-sm">
            <Sparkles size={32} />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Elegí cómo querés vender
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Seleccioná la estructura de página que mejor se adapte a tu producto.
            Nosotros nos encargamos del diseño técnico para que convierta más.
          </p>
        </div>

        {error && (
          <div className="mx-auto mb-8 flex max-w-3xl items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const isInstantiating = instanciandoId === tpl.id;
            
            return (
              <div 
                key={tpl.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Image Placeholder or Preview */}
                <div className="aspect-[4/3] w-full bg-gray-100 relative overflow-hidden border-b border-gray-100">
                  {tpl.preview_image ? (
                    <img 
                      src={getMediaUrl(tpl.preview_image)} 
                      alt={tpl.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
                      <LayoutTemplate size={48} className="text-gray-300" />
                    </div>
                  )}
                  {tpl.funnel_type === 'direct_sale' && (
                    <div className="absolute top-4 left-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-black shadow-sm">
                      ⚡ Más Recomendado
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="mb-2 text-xl font-bold text-gray-900">{tpl.name}</h3>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-gray-500">
                    {tpl.description}
                  </p>

                  <button
                    onClick={() => handleSelectTemplate(tpl.id)}
                    disabled={instanciandoId !== null}
                    className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-fg shadow-sm transition-all hover:bg-gray-800 disabled:opacity-70 disabled:hover:bg-gray-900"
                  >
                    {isInstantiating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Configurando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Usar este embudo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
