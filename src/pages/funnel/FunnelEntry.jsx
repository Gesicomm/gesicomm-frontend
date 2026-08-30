import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, Zap, ShoppingCart, ArrowLeft, AlertCircle, Check, Star, ArrowDown } from 'lucide-react';
import { funnelService } from '../../services/funnelService';
import { productService } from '../../services/productService';
import { ofertaService } from '../../services/ofertaService';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import ComplementoConfig from './ComplementoConfig';
import { guardarComplementoDelFunnel, SLUG_VENTA_COMPLEMENTO } from './complementoOferta';

/**
 * Ficha de cada estrategia — lo que el comercio necesita para decidir en
 * pocos segundos. Se define acá (no en la base) porque es material de
 * venta del producto, no configuración del comercio: el `description` del
 * template en la base queda como resumen corto de una línea.
 */
const ESTRATEGIAS = {
  'venta-directa': {
    Icono: Zap,
    subtitulo: 'Vendé rápido y sin distracciones',
    descripcion: 'El cliente entiende el producto, decide y compra. Sin nada en el medio que lo saque del camino.',
    incluye: ['Producto principal', 'Variantes', 'Ofertas', 'Checkout'],
    idealPara: 'Ideal para: compras rápidas y productos que se entienden solos',
    ejemplos: [],
  },
  [SLUG_VENTA_COMPLEMENTO]: {
    Icono: ShoppingCart,
    subtitulo: 'Aumentá el valor de cada compra',
    descripcion: 'Vendé tu producto principal y ofrecé un complemento relacionado justo antes de finalizar la compra.',
    incluye: ['Producto principal', 'Variantes', 'Ofertas', '1 complemento', 'Checkout'],
    idealPara: 'Ideal para: productos con complementos naturales',
    ejemplos: ['Cámara + Memoria', 'Cafetera + Cápsulas', 'Zapatillas + Medias'],
  },
};

/** Diagrama del recorrido — es lo que hace entender la diferencia sin leer. */
function Recorrido({ slug, producto }) {
  const precio = Number(producto?.precio_efectivo ?? producto?.precio_base ?? 0);
  const paso = (texto, sub) => (
    <div className="w-full rounded-lg bg-fg/5 px-3 py-2 text-center">
      <p className="truncate text-[11px] font-bold text-fg">{texto}</p>
      {sub && <p className="truncate text-[10px] text-fg/45">{sub}</p>}
    </div>
  );
  const flecha = (
    <div className="flex justify-center py-1 text-fg/25">
      <ArrowDown size={12} />
    </div>
  );

  return (
    <div className="rounded-xl border border-fg/10 bg-black/25 p-3">
      {paso(producto?.nombre || 'Tu producto', precio ? formatPrecio(precio) : null)}
      {flecha}
      {slug === SLUG_VENTA_COMPLEMENTO && (
        <>
          <div className="w-full rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-center">
            <p className="text-[11px] font-bold text-accent">✨ ¿Querés agregar este producto?</p>
            <p className="text-[10px] text-fg/45">Complemento</p>
          </div>
          {flecha}
        </>
      )}
      {paso('Checkout')}
    </div>
  );
}

/**
 * Puerta de entrada de "/funnel/producto/:productoId".
 *
 * Si el producto ya tiene un embudo, entra directo al editor. Si no, el
 * comercio elige una ESTRATEGIA DE VENTA (no una configuración técnica) —
 * y si esa estrategia necesita datos extra (el complemento), se piden acá
 * antes de crear nada.
 */
export default function FunnelEntry() {
  const { productoId } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creandoId, setCreandoId] = useState(null);
  const [error, setError] = useState('');
  // Estrategia elegida que todavía necesita configuración antes de crearse.
  const [configurando, setConfigurando] = useState(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      funnelService.porProducto(productoId),
      productService.detalle(productoId).catch(() => null),
      funnelService.listarTemplates().catch(() => []),
      ofertaService.listarPorProducto(productoId, { soloActivas: true }).catch(() => []),
    ])
      .then(([funnel, prod, tpls, ofs]) => {
        if (!vivo) return;
        if (funnel) {
          navigate(`/funnel/${funnel.id}`, { replace: true });
          return;
        }
        setProducto(prod);
        setTemplates(tpls || []);
        setOfertas(Array.isArray(ofs) ? ofs : []);
        setCargando(false);
      })
      .catch(() => {
        if (!vivo) return;
        setError('No se pudo cargar la información del producto.');
        setCargando(false);
      });
    return () => { vivo = false; };
  }, [productoId, navigate]);

  // "Recomendado" no es un adorno fijo: se recomienda vender con
  // complemento solo si el producto YA tiene un order bump configurado,
  // porque en ese caso la estrategia se aprovecha desde el primer día.
  const bumpExistente = ofertas.find(o => o.estrategia === 'order_bump') || null;
  const slugRecomendado = bumpExistente ? SLUG_VENTA_COMPLEMENTO : 'venta-directa';

  async function elegir(tpl) {
    // La estrategia con complemento necesita saber QUÉ complemento antes de
    // existir — si no, se crearía un embudo a medias que no cumple lo que
    // su propia card promete.
    if (tpl.slug === SLUG_VENTA_COMPLEMENTO) {
      setConfigurando(tpl);
      return;
    }
    setCreandoId(tpl.id);
    setError('');
    try {
      const funnel = await funnelService.crear(productoId, tpl.id);
      navigate(`/funnel/${funnel.id}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear el embudo.');
      setCreandoId(null);
    }
  }

  async function crearConComplemento({ complementoId, precio, precioLista, descripcion, cantidad }) {
    setCreandoId(configurando.id);
    setError('');
    try {
      const funnel = await funnelService.crear(productoId, configurando.id);
      const nombreComplemento = (await productService.detalle(complementoId).catch(() => null))?.nombre
        || 'Complemento';
      await guardarComplementoDelFunnel({
        funnel,
        productoId: Number(productoId),
        complementoId,
        precio,
        precioLista,
        descripcion,
        cantidad,
        nombreComplemento,
        ofertaExistente: bumpExistente,
      });
      navigate(`/funnel/${funnel.id}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo crear el embudo.');
      setCreandoId(null);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 text-fg/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => (configurando ? setConfigurando(null) : navigate('/mi-catalogo'))}
        className="inline-flex items-center gap-1.5 text-sm text-fg/50 hover:text-fg mb-8"
      >
        <ArrowLeft size={15} /> {configurando ? 'Volver a las estrategias' : 'Volver a la Vitrina B2B'}
      </button>

      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent mb-1">
          {configurando ? 'Venta con complemento' : 'Nuevo embudo'}
        </p>
        <h1 className="text-2xl font-extrabold text-fg mb-2">
          {configurando
            ? 'Configurá tu complemento'
            : `¿Cómo querés vender ${producto?.nombre}?`}
        </h1>
        <p className="text-sm text-fg/50 leading-relaxed max-w-xl">
          {configurando
            ? 'Elegí qué producto se le va a ofrecer al cliente durante la compra, y a qué precio.'
            : 'Un embudo es una página dedicada a un solo producto, hecha para que el cliente decida y compre. Es distinta de tu landing: no tiene catálogo, ni menú, ni nada que lo distraiga.'}
        </p>
      </div>

      {error && !configurando && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {configurando ? (
        <div className="max-w-lg">
          <ComplementoConfig
            producto={producto}
            guardando={creandoId !== null}
            error={error || null}
            textoConfirmar="Crear embudo"
            onCancelar={() => { setConfigurando(null); setError(''); }}
            onConfirmar={crearConComplemento}
          />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-fg/40">No hay tipos de embudo disponibles todavía.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {templates.map(tpl => {
            const ficha = ESTRATEGIAS[tpl.slug] || ESTRATEGIAS['venta-directa'];
            const Icono = ficha.Icono;
            const creando = creandoId === tpl.id;
            const recomendado = tpl.slug === slugRecomendado;

            return (
              <div
                key={tpl.id}
                className={`flex flex-col rounded-2xl border p-6 transition-colors ${
                  recomendado ? 'border-accent/40 bg-accent/[0.04]' : 'border-fg/10 bg-fg/5 hover:border-fg/25'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Icono size={22} />
                  </div>
                  {recomendado && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                      <Star size={10} fill="currentColor" /> Recomendado
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-fg">{tpl.name}</h2>
                <p className="mb-2 text-sm font-semibold text-fg/80">{ficha.subtitulo}</p>
                <p className="mb-5 text-sm leading-relaxed text-fg/50">{ficha.descripcion}</p>

                {/* El recorrido, no un ícono decorativo: es lo que deja clara
                    la diferencia entre una estrategia y la otra. */}
                <div className="mb-5">
                  <Recorrido slug={tpl.slug} producto={producto} />
                </div>

                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  {ficha.incluye.map(item => (
                    <span key={item} className="inline-flex items-center gap-1.5 text-xs text-fg/60">
                      <Check size={12} className="text-accent" /> {item}
                    </span>
                  ))}
                </div>

                <div className="mb-5 flex-1">
                  <p className="text-[11px] text-fg/40">{ficha.idealPara}</p>
                  {ficha.ejemplos.length > 0 && (
                    <p className="mt-1 text-[11px] text-fg/30">{ficha.ejemplos.join(' · ')}</p>
                  )}
                  {tpl.slug === SLUG_VENTA_COMPLEMENTO && bumpExistente && (
                    <p className="mt-2 text-[11px] font-semibold text-accent">
                      Ya tenés un complemento configurado para este producto.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => elegir(tpl)}
                  disabled={creandoId !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-fg px-4 py-3 text-sm font-bold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {creando
                    ? <><Loader size={16} className="animate-spin" /> Creando...</>
                    : <><Check size={16} /> Usar esta estrategia</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
