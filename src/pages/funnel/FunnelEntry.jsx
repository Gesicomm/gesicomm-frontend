import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, Zap, ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { funnelService } from '../../services/funnelService';
import { productService } from '../../services/productService';

// Icono por tipo de embudo. Hoy existe uno solo (Venta Directa); cuando se
// sumen los demás, cada uno entra acá con su icono.
const ICONOS = {
  'venta-directa': Zap,
};

/**
 * Puerta de entrada de "/funnel/producto/:productoId".
 *
 * Si el producto ya tiene un embudo, entra directo al editor. Si no, se
 * muestra el selector de tipo de embudo — no se crea uno automáticamente:
 * el tipo define cómo se le vende al cliente, es una decisión del comercio.
 */
export default function FunnelEntry() {
  const { productoId } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creandoId, setCreandoId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([
      funnelService.porProducto(productoId),
      productService.detalle(productoId).catch(() => null),
      funnelService.listarTemplates().catch(() => []),
    ])
      .then(([funnel, prod, tpls]) => {
        if (!vivo) return;
        if (funnel) {
          navigate(`/funnel/${funnel.id}`, { replace: true });
          return;
        }
        setProducto(prod);
        setTemplates(tpls || []);
        setCargando(false);
      })
      .catch(() => {
        if (!vivo) return;
        setError('No se pudo cargar la información del producto.');
        setCargando(false);
      });
    return () => { vivo = false; };
  }, [productoId, navigate]);

  async function elegir(templateId) {
    setCreandoId(templateId);
    setError('');
    try {
      const funnel = await funnelService.crear(productoId, templateId);
      navigate(`/funnel/${funnel.id}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear el embudo.');
      setCreandoId(null);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 text-white/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/mi-catalogo')}
        className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-8"
      >
        <ArrowLeft size={15} /> Volver a la Vitrina B2B
      </button>

      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300 mb-1">
          Nuevo embudo
        </p>
        <h1 className="text-2xl font-extrabold text-white mb-2">
          ¿Cómo querés vender {producto?.nombre}?
        </h1>
        <p className="text-sm text-white/50 leading-relaxed max-w-xl">
          Un embudo es una página dedicada a un solo producto, hecha para que el
          cliente decida y compre. Es distinta de tu landing: no tiene catálogo,
          ni menú, ni nada que lo distraiga de comprar.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {templates.length === 0 ? (
        <p className="text-sm text-white/40">
          No hay tipos de embudo disponibles todavía.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map(tpl => {
            const Icono = ICONOS[tpl.slug] || Zap;
            const creando = creandoId === tpl.id;
            return (
              <div
                key={tpl.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/25"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                  <Icono size={22} />
                </div>
                <h2 className="mb-2 text-lg font-bold text-white">{tpl.name}</h2>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-white/50">
                  {tpl.description}
                </p>
                <button
                  type="button"
                  onClick={() => elegir(tpl.id)}
                  disabled={creandoId !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {creando
                    ? <><Loader size={16} className="animate-spin" /> Creando...</>
                    : <><Check size={16} /> Usar este embudo</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
