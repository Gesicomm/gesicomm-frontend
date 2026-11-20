import { TutorialHeaderAction } from '../../components/TutorialDock';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Code2, ArrowRight } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { leerItemsPrefill } from './prefilledLandingItems';

/**
 * Primera pantalla de "/landing" cuando el comercio todavía no tiene
 * ninguna: crear la landing en modo Lienzo en blanco (editor libre).
 *
 * @deprecated El flujo de "Landing rígida" (TemplateSelector y AILandingWizard)
 * fue retirado de la UI y queda marcado como deprecado para eliminarlo más adelante.
 */
export default function ModoSelector({ onCreada }) {
  const navigate = useNavigate();
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  async function usarLienzoBlanco() {
    setError('');
    setCreando(true);
    try {
      const landing = await landingSimpleService.crearLienzoBlanco(leerItemsPrefill());
      if (onCreada) onCreada(landing);
      else navigate(`/landing/${landing.id}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la landing en blanco.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <div className="gc-tutorial-title-row"><h1 className="text-2xl font-bold text-fg mb-1">Creá tu e-commerce</h1><TutorialHeaderAction /></div>
      <p className="text-fg/50 mb-8">Arrancá con tu lienzo en blanco y personalizá el diseño, productos y vistas desde el editor libre.</p>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-danger/10 border border-danger/40 text-danger text-sm font-medium">{error}</div>}

      <div className="grid grid-cols-1 gap-6">
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
