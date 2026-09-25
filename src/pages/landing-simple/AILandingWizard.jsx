import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, User, Loader2, Send, ShoppingBag, Check } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import CodigoPreview from './CodigoPreview';
import ProductPicker from '../landing/ProductPicker';
import { datosRuntimePreview } from './datosRuntime';
import '../landing/landing.css';

export default function AILandingWizard({ onCreada }) {
  const [mensajes, setMensajes] = useState([
    {
      id: 1,
      rol: 'bot',
      texto: '¡Hola! Soy la IA de Gesicomm. Estoy listo para armarte una Landing Page de alta conversión.\n\nContame, ¿qué querés vender y cómo es la promo? (Ej: "Landing para el día de la madre con el combo matero, tonos pastel y texto persuasivo").',
    }
  ]);
  const [input, setInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [paso, setPaso] = useState('prompt'); // 'prompt' | 'productos' | 'generando' | 'listo'
  const [landingGenerada, setLandingGenerada] = useState(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState(new Map());
  const mensajesFinRef = useRef(null);

  useEffect(() => {
    mensajesFinRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const agregarMensaje = (rol, texto, widget = null) => {
    setMensajes(prev => [...prev, { id: Date.now(), rol, texto, widget }]);
  };

  const enviarPrompt = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const texto = input.trim();
    setPrompt(texto);
    setInput('');
    agregarMensaje('user', texto);
    
    setTimeout(() => {
      agregarMensaje('bot', '¡Entendido! Ahora, elegí los productos o combos que querés incluir en la landing.', 'productos');
      setPaso('productos');
    }, 600);
  };

  const generarLanding = async () => {
    if (productosSeleccionados.size === 0) {
      alert("Por favor elegí al menos un producto.");
      return;
    }
    
    setPaso('generando');
    agregarMensaje('user', `Seleccioné ${productosSeleccionados.size} producto(s).`);
    
    setTimeout(() => {
      agregarMensaje('bot', '¡Perfecto! Estoy escribiendo los textos persuasivos, organizando la estructura y aplicando el diseño... Esto puede demorar entre 15 y 30 segundos. 🚀');
    }, 500);

    try {
      const items = Array.from(productosSeleccionados.values()).map(item => ({
        tipo: item.tipo, // 'producto' o 'combo'
        id: Number(item.id)
      }));
      
      const landing = await landingSimpleService.crearDesdeIA(prompt, items);
      
      agregarMensaje('bot', '¡Landing generada con éxito! Podés ver la vista previa a la derecha. Si te gusta, guardala para ir al editor completo.', 'listo');
      setPaso('listo');
      setLandingGenerada(landing);
    } catch (error) {
      setPaso('error');
      agregarMensaje('bot', error?.response?.data?.message || error.message || 'Ocurrió un error al generar la landing.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[700px] max-h-[85vh] gap-6">
      {/* Columna Izquierda: Chat */}
      <div className="w-full md:w-[45%] flex flex-col bg-surface border border-fg/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-fg/10 bg-fg/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold text-fg">Asistente IA</h2>
            <p className="text-xs text-fg/60">Creador de Landing Pages</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-surface">
          {mensajes.map((m) => (
            <div key={m.id} className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-2xl px-5 py-3 shadow-sm ${
                m.rol === 'user' 
                  ? 'bg-primary text-white rounded-br-sm' 
                  : 'bg-fg/5 text-fg rounded-bl-sm border border-fg/10'
              }`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.texto}</div>
                
                {m.widget === 'productos' && paso === 'productos' && (
                  <div className="mt-4 bg-surface rounded-xl p-4 border border-fg/10 shadow-sm">
                    <ProductPicker
                      catalogo={{ productos: [], combos: [] }}
                      seleccion={productosSeleccionados}
                      itemsOrdenados={Array.from(productosSeleccionados.values())}
                      onToggle={(item) => {
                        setProductosSeleccionados(prev => {
                          const nueva = new Map(prev);
                          const clave = `${item.tipo}:${item.id}`;
                          if (nueva.has(clave)) nueva.delete(clave);
                          else nueva.set(clave, item);
                          return nueva;
                        });
                      }}
                      onReordenar={() => {}}
                      max={10}
                      triggerLabel="Abrir catálogo"
                      modalTitle="Seleccioná los productos para la IA"
                      refrescarCatalogoAlAbrir={true}
                      themeScopeClassName="light"
                    />
                    <div className="mt-4 flex justify-end">
                      <button 
                        onClick={generarLanding}
                        disabled={productosSeleccionados.size === 0}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-all"
                      >
                        Generar Landing <Check size={16} />
                      </button>
                    </div>
                  </div>
                )}
                
                {m.rol === 'bot' && paso === 'generando' && m.id === mensajes[mensajes.length - 1].id && (
                  <div className="mt-3 flex items-center gap-2 text-primary text-sm font-medium">
                    <Loader2 size={16} className="animate-spin" /> Creando landing magia...
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={mensajesFinRef} />
        </div>

        {(paso === 'prompt' || paso === 'listo' || paso === 'error') && (
          <div className="p-4 bg-surface border-t border-fg/10">
            <form onSubmit={enviarPrompt} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ej: Promo para el día de la madre..."
                className="w-full bg-fg/5 border border-fg/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-fg"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Columna Derecha: Preview */}
      <div className="hidden md:flex flex-1 bg-surface border border-fg/10 rounded-2xl flex-col items-center justify-center relative overflow-hidden">
        {paso === 'listo' && landingGenerada ? (
          <div className="w-full h-full flex flex-col">
            <div className="p-3 bg-fg/5 border-b border-fg/10 flex justify-between items-center shrink-0">
              <span className="text-sm font-bold text-fg ml-2">Vista Previa IA</span>
              <button onClick={() => onCreada(landingGenerada)} className="px-4 py-1.5 bg-primary text-white text-sm rounded-lg font-semibold hover:bg-primary/90 shadow transition-colors">
                Llevar al Editor Completo
              </button>
            </div>
              <div className="w-full flex-1">
                <CodigoPreview
                  codigo={landingGenerada.content?.codigo}
                  titulo={landingGenerada.titulo}
                  datos={datosRuntimePreview({
                    productos: Array.from(productosSeleccionados.values()),
                    venta: landingGenerada.content?.venta,
                  })}
                />
              </div>
          </div>
        ) : (
          <div className="flex flex-col items-center p-8 text-center max-w-sm text-fg/40">
            <div className="w-20 h-20 bg-fg/10 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag size={32} className="opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-fg/60 mb-2">Vista Previa</h3>
            <p className="text-sm leading-relaxed">
              Describile a la IA qué querés vender. Cuando termine de generar, podrás ver el resultado aquí antes de llevarlo al editor final.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
