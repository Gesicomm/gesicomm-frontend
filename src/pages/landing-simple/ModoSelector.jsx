import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, LayoutTemplate, Code2, ArrowRight, Wand2 } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import TemplateSelector from './TemplateSelector';
import AILandingWizard from './AILandingWizard';

/**
 * Primera pantalla de "/landing" cuando el comercio todavía no tiene
 * ninguna: elegir CÓMO se arma la landing, antes de elegir con qué.
 *
 *   - Template  → sigue el flujo de siempre (TemplateSelector: grilla de
 *     los templates rígidos → editor de contenido).
 *   - Lienzo en blanco → crea una landing kind='codigo' y abre el editor
 *     de HTML/CSS/JS (LandingCodigoEditor).
 *   - Generar con IA → wizard propio, pero termina en el mismo editor libre
 *     que el lienzo porque el resultado técnico también es código.
 *
 * Los tres caminos terminan en la misma entidad Landing (mismo slug,
 * mismo es_home, mismo publicar). Lo que cambia es el editor real:
 * rígida usa editor estructurado; lienzo e IA usan editor libre.
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
      let items = [];
      try {
        const stored = sessionStorage.getItem('gesicomm:prefilledLandingItems');
        if (stored) items = JSON.parse(stored);
      } catch (e) {}
      const landing = await landingSimpleService.crearLienzoBlanco(items);
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
  
  if (modo === 'ia') {
    return <AILandingWizard onCreada={(landing) => {
      if (onCreada) onCreada(landing);
      else navigate(`/landing/${landing.id}`, { replace: true });
    }} />;
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-fg mb-1">¿Cómo querés crear tu landing?</h1>
      <p className="text-fg/50 mb-8">Elegí el punto de partida. Después vas a poder editar, publicar y ajustar la venta desde su editor.</p>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-danger/10 border border-danger/40 text-danger text-sm font-medium">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Opcion
          icono={Wand2}
          titulo="Generar con IA"
          descripcion="Elegís productos, oferta e instrucciones. La IA arma la landing y después la editás en el editor libre."
          puntos={['Wizard con producto y oferta', 'Diseño y textos generados', 'Luego podés pedir cambios o editar código']}
          accion="Generar con IA"
          onClick={() => setModo('ia')}
        />
        <Opcion
          icono={LayoutTemplate}
          titulo="Landing rígida"
          descripcion="Elegís un diseño ya armado y editás contenido desde paneles. Ideal si querés una estructura guiada."
          puntos={['Estructura y diseño resueltos', 'Catálogo, carrito y checkout incluidos', 'Se edita desde paneles']}
          accion="Elegir landing rígida"
          onClick={() => setModo('template')}
        />
        <Opcion
          icono={Code2}
          titulo="Lienzo en blanco"
          descripcion="Arrancás desde cero en el editor libre. Podés construir manualmente, pegar HTML y ajustar cada vista."
          puntos={['Control total del diseño', 'Ficha de producto y páginas del footer editables', 'Carrito, pedidos y tracking ya conectados']}
          accion="Empezar con lienzo"
          onClick={usarLienzoBlanco}
          cargando={creando}
        />
      </div>
    </div>
  );
}

function Opcion({ icono: Icono, titulo, descripcion, puntos, accion, onClick, cargando }) {
  return (
    <div className="rounded-2xl border border-fg/10 bg-fg/5 p-6 flex flex-col gap-4">
      <div className="w-11 h-11 rounded-xl bg-fg/10 flex items-center justify-center">
        <Icono size={20} className="text-fg/80" />
      </div>
      <div>
        <h2 className="font-semibold text-fg text-lg">{titulo}</h2>
        <p className="text-sm text-fg/50 mt-1">{descripcion}</p>
      </div>
      <ul className="text-sm text-fg/60 space-y-1.5 flex-1">
        {puntos.map(p => (
          <li key={p} className="flex gap-2">
            <span className="text-fg/30">—</span>{p}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClick}
        disabled={cargando}
        className="inline-flex items-center justify-center gap-2 bg-fg text-canvas font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-fg-muted transition-colors disabled:opacity-50"
      >
        {cargando ? <Loader size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        {accion}
      </button>
    </div>
  );
}
