import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, LayoutTemplate, Code2, ArrowRight } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import TemplateSelector from './TemplateSelector';

/**
 * Primera pantalla de "/landing" cuando el comercio todavía no tiene
 * ninguna: elegir CÓMO se arma la landing, antes de elegir con qué.
 *
 *   - Template  → sigue el flujo de siempre (TemplateSelector: grilla de
 *     los 4 templates rígidos → editor de contenido).
 *   - Lienzo en blanco → crea una landing kind='codigo' y abre el editor
 *     de HTML/CSS/JS (LandingCodigoEditor).
 *
 * Las dos terminan en la MISMA fila de Landing (mismo slug, mismo
 * es_home, mismo publicar) — lo único que cambia es qué se edita. Por eso
 * la decisión se toma una sola vez, acá, y no hay forma de convertir una
 * en la otra: para cambiar de modo se borra la landing y se vuelve a esta
 * pantalla (igual que el spec punto 12 para los templates).
 */
export default function ModoSelector({ onCreada }) {
  const navigate = useNavigate();
  const [modo, setModo] = useState(null); // null | 'template'
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  async function usarLienzoBlanco() {
    setError('');
    setCreando(true);
    try {
      const landing = await landingSimpleService.crearLienzoBlanco();
      if (onCreada) onCreada(landing);
      else navigate(`/landing/${landing.id}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la landing en blanco.');
    } finally {
      setCreando(false);
    }
  }

  if (modo === 'template') {
    return <TemplateSelector onCreada={onCreada} onVolver={() => setModo(null)} />;
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">¿Cómo querés armar tu landing?</h1>
      <p className="text-white/50 mb-8">Se elige una sola vez. Después podés cambiar de idea borrando la landing y empezando de nuevo.</p>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Opcion
          icono={LayoutTemplate}
          titulo="Con un template"
          descripcion="Elegís un diseño ya armado y solo cargás tus productos, contacto y preguntas frecuentes. No hace falta saber programar."
          puntos={['Estructura y diseño resueltos', 'Catálogo, carrito y checkout incluidos', 'Se edita desde paneles']}
          accion="Elegir template"
          onClick={() => setModo('template')}
        />
        <Opcion
          icono={Code2}
          titulo="Lienzo en blanco"
          descripcion="Empezás de cero y escribís vos el HTML, el CSS y el JavaScript. La página queda exactamente como la programes."
          puntos={['Control total del diseño', 'Vista previa en vivo mientras escribís', 'Requiere saber HTML y CSS']}
          accion="Empezar en blanco"
          onClick={usarLienzoBlanco}
          cargando={creando}
        />
      </div>
    </div>
  );
}

function Opcion({ icono: Icono, titulo, descripcion, puntos, accion, onClick, cargando }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
      <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
        <Icono size={20} className="text-white/80" />
      </div>
      <div>
        <h2 className="font-semibold text-white text-lg">{titulo}</h2>
        <p className="text-sm text-white/50 mt-1">{descripcion}</p>
      </div>
      <ul className="text-sm text-white/60 space-y-1.5 flex-1">
        {puntos.map(p => (
          <li key={p} className="flex gap-2">
            <span className="text-white/30">—</span>{p}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClick}
        disabled={cargando}
        className="inline-flex items-center justify-center gap-2 bg-white text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {cargando ? <Loader size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        {accion}
      </button>
    </div>
  );
}
