import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Megaphone, ArrowRight } from 'lucide-react';
import { verificarSesion } from '../../utils/auth';

export default function SeleccionModulo() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    verificarSesion().then((sesion) => {
      setUsuario(sesion);
    });
  }, []);

  const seleccionarModulo = (modulo) => {
    // Guardamos la preferencia en la sesión para que el Sidebar sepa qué menú renderizar
    sessionStorage.setItem('moduloActivo', modulo);
    
    if (modulo === 'ecommerce') {
      navigate('/mi-dashboard');
    } else {
      navigate('/automatizacion');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-muted p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-fg mb-2">¡Hola, {usuario?.nombre || 'Usuario'}!</h1>
        <p className="text-fg-muted">Selecciona el módulo con el que deseas trabajar hoy</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
        
        {/* Módulo E-commerce */}
        <div 
          onClick={() => seleccionarModulo('ecommerce')}
          className="flex-1 bg-bg border border-border rounded-xl p-8 cursor-pointer transition-all hover:border-primary hover:shadow-lg group flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
            <ShoppingCart size={32} />
          </div>
          <h2 className="text-xl font-bold text-fg mb-3">Gestión de E-commerce</h2>
          <p className="text-fg-muted mb-6 text-sm">
            Administra tu tienda, productos, pedidos, logística, finanzas y reportes de anuncios.
          </p>
          <button className="btn-secondary w-full group-hover:bg-primary group-hover:text-primary-fg transition-colors">
            Entrar a E-commerce <ArrowRight size={16} className="ml-2 inline" />
          </button>
        </div>

        {/* Módulo Marca Personal (Automation Hub) */}
        <div 
          onClick={() => seleccionarModulo('marca_personal')}
          className="flex-1 bg-bg border border-border rounded-xl p-8 cursor-pointer transition-all hover:border-[#10b981] hover:shadow-lg group flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-[#10b981]/10 rounded-full flex items-center justify-center mb-6 text-[#10b981] group-hover:scale-110 transition-transform">
            <Megaphone size={32} />
          </div>
          <h2 className="text-xl font-bold text-fg mb-3">Marca Personal (Automation)</h2>
          <p className="text-fg-muted mb-6 text-sm">
            Calendario de contenido, publicaciones, CRM, ManyChat y automatización.
          </p>
          <button className="btn-secondary w-full group-hover:bg-[#10b981] group-hover:text-white transition-colors">
            Entrar a Automation Hub <ArrowRight size={16} className="ml-2 inline" />
          </button>
        </div>

      </div>
    </div>
  );
}
