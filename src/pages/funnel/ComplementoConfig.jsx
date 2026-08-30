import React, { useEffect, useMemo, useState } from 'react';
import { Search, ImageOff, Loader, Plus, Check, ArrowLeft, Sparkles } from 'lucide-react';
import { productService } from '../../services/productService';
import { getMediaUrl } from '../../services/api';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import CurrencyInput from '../../components/CurrencyInput';

function imagenDe(p) {
  const url = p?.imagenes?.[0]?.url || p?.imagen || null;
  return url ? getMediaUrl(url) : null;
}

function precioDe(p) {
  return Number(p?.precio_efectivo ?? p?.precio_base ?? 0);
}

/** Miniatura cuadrada con fallback — el mismo trato para principal y complemento. */
function Miniatura({ src, size = 48 }) {
  return (
    <div
      className="rounded-lg overflow-hidden bg-fg/5 border border-fg/10 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {src
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : <ImageOff size={size / 3} className="text-fg/25" />}
    </div>
  );
}

/**
 * Configuración del complemento — la pantalla que va ENTRE elegir la
 * estrategia "Venta con complemento" y entrar al editor.
 *
 * El comercio elige qué producto se ofrece durante la compra y a qué
 * precio. No se le pide nada de la implementación (order bump, estrategia,
 * tipo_contenido): eso lo arma el sistema al guardar.
 *
 * Se usa en dos lugares con la misma UI: al crear el embudo (FunnelEntry) y
 * después para cambiarlo (pestaña "Complemento" del editor).
 */
export default function ComplementoConfig({
  producto,
  complementoInicialId = null,
  precioInicial = null,
  precioListaInicial = null,
  descripcionInicial = '',
  cantidadInicial = 1,
  guardando = false,
  error = null,
  textoConfirmar = 'Continuar',
  onCancelar,
  onConfirmar,
}) {
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [eligiendo, setEligiendo] = useState(!complementoInicialId);
  const [busqueda, setBusqueda] = useState('');
  const [complementoId, setComplementoId] = useState(complementoInicialId);
  const [precio, setPrecio] = useState(precioInicial ?? '');
  const [precioLista, setPrecioLista] = useState(precioListaInicial ?? '');
  const [descripcion, setDescripcion] = useState(descripcionInicial || '');
  const [cantidad, setCantidad] = useState(cantidadInicial || 1);

  useEffect(() => {
    let vivo = true;
    productService.buscar({ activo: true, limit: 300, mios_solamente: false })
      .then(res => {
        if (!vivo) return;
        setCatalogo(res?.productos || []);
        setCargando(false);
      })
      .catch(() => { if (vivo) { setCatalogo([]); setCargando(false); } });
    return () => { vivo = false; };
  }, []);

  const complemento = useMemo(
    () => catalogo.find(p => Number(p.id) === Number(complementoId)) || null,
    [catalogo, complementoId]
  );

  // Al elegir un complemento sin precio propio cargado, se propone el precio
  // del producto — nunca 0, que sería regalarlo por un campo vacío.
  useEffect(() => {
    if (complemento && (precio === '' || precio === null)) {
      setPrecio(precioDe(complemento) || '');
    }
  }, [complemento]); // eslint-disable-line react-hooks/exhaustive-deps

  const opciones = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return catalogo
      .filter(p => Number(p.id) !== Number(producto?.id)) // nunca puede complementarse a sí mismo
      .filter(p => !q || p.nombre.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [catalogo, busqueda, producto?.id]);

  const precioNumero = Number(precio) || 0;
  const precioListaNumero = Number(precioLista) || 0;
  const cantidadNumero = Math.max(1, Number(cantidad) || 1);
  // El tachado del checkout solo aparece si el de lista es realmente mayor.
  const hayDescuento = precioListaNumero > precioNumero;
  const ahorro = hayDescuento ? precioListaNumero - precioNumero : 0;
  const puedeConfirmar = !!complementoId && precioNumero > 0 && !guardando;

  return (
    <div className="flex flex-col gap-6">
      {/* Producto principal — fijo, ya viene definido por dónde se entró */}
      <div>
        <p className="text-xs font-semibold text-fg/60 mb-2">Tu producto principal</p>
        <div className="flex items-center gap-3 rounded-xl border border-fg/10 bg-fg/5 p-3">
          <Miniatura src={imagenDe(producto)} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-fg truncate">{producto?.nombre}</p>
            <p className="text-xs text-fg/50">{formatPrecio(precioDe(producto))}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center -my-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-fg/10 text-fg/60">
          <Plus size={14} />
        </div>
      </div>

      {/* Complemento */}
      <div>
        <p className="text-xs font-semibold text-fg/60 mb-2">Complemento</p>

        {complemento && !eligiendo ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-fg/10 bg-fg/5 p-3">
              <Miniatura src={imagenDe(complemento)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-fg truncate">{complemento.nombre}</p>
                <p className="text-xs text-fg/50">{formatPrecio(precioDe(complemento))} en su ficha</p>
              </div>
              <button
                type="button"
                onClick={() => setEligiendo(true)}
                className="shrink-0 text-xs font-semibold text-accent hover:opacity-80"
              >
                Cambiar producto
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg/60 mb-1.5">
                Texto de la oferta
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ideal para acompañar tu compra"
                maxLength={120}
                className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-fg/30"
              />
              <p className="text-[11px] text-fg/35 mt-1.5 leading-relaxed">
                Es el título de la tarjeta en el checkout. Si lo dejás vacío se
                usa el nombre del producto.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-fg/60 mb-1.5">
                  Precio de lista
                </label>
                <CurrencyInput
                  value={precioLista}
                  onChange={setPrecioLista}
                  className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-fg/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fg/60 mb-1.5">
                  Precio en el checkout
                </label>
                <CurrencyInput
                  value={precio}
                  onChange={setPrecio}
                  className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-fg/30"
                />
              </div>
            </div>
            <p className="text-[11px] text-fg/35 -mt-1 leading-relaxed">
              {hayDescuento
                ? `El comprador ve el de lista tachado y ahorra ${formatPrecio(ahorro)}.`
                : 'Poné un precio de lista mayor al del checkout para que se vea tachado. Si lo dejás vacío, se muestra un solo precio.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-fg/60 mb-1.5">
                Cantidad que se agrega
              </label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-fg/30"
              />
              <p className="text-[11px] text-fg/35 mt-1.5 leading-relaxed">
                Cuántas unidades del complemento entran al pedido al aceptarlo.
              </p>
            </div>
          </div>
        ) : (
          /* Selector de complemento */
          <div className="rounded-xl border border-fg/10 bg-fg/5 p-3">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/35" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                autoFocus
                className="w-full bg-fg/5 border border-fg/10 rounded-lg pl-8 pr-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-fg/30"
              />
            </div>

            {cargando ? (
              <div className="flex items-center gap-2 p-4 text-xs text-fg/40">
                <Loader size={14} className="animate-spin" /> Cargando productos...
              </div>
            ) : opciones.length === 0 ? (
              <p className="p-4 text-xs text-fg/40">No se encontraron productos.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
                {opciones.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setComplementoId(p.id);
                      setPrecio(precioDe(p) || '');
                      setEligiendo(false);
                    }}
                    className="flex items-center gap-3 rounded-lg p-2 text-left hover:bg-fg/10 transition-colors"
                  >
                    <Miniatura src={imagenDe(p)} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-fg truncate">{p.nombre}</p>
                      <p className="text-[11px] text-fg/45">{formatPrecio(precioDe(p))}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {complemento && (
              <button
                type="button"
                onClick={() => setEligiendo(false)}
                className="mt-2 text-xs text-fg/45 hover:text-fg"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vista previa de cómo lo ve el comprador — el mismo copy y forma que
          FunnelCheckout.jsx, para que no haya sorpresas al publicar. */}
      {complemento && precioNumero > 0 && (
        <div>
          <p className="text-xs font-semibold text-fg/60 mb-2">Cómo aparecerá al comprar</p>
          <div className="rounded-xl border border-fg/10 bg-black/30 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-fg">
              <Sparkles size={14} className="text-accent" /> Completá tu compra
            </p>
            <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-fg/15 p-3">
              <div className="h-4 w-4 shrink-0 rounded border-2 border-fg/30" />
              <Miniatura src={imagenDe(complemento)} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-fg truncate">
                  {descripcion.trim() || `Agregar ${complemento.nombre}`}
                </p>
                <p className="text-[11px] text-fg/50 truncate">
                  {cantidadNumero > 1 ? `${cantidadNumero} × ` : ''}{complemento.nombre}
                </p>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-sm font-extrabold text-fg">{formatPrecio(precioNumero)}</span>
                  {hayDescuento && (
                    <span className="text-[11px] text-fg/45 line-through">{formatPrecio(precioListaNumero)}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
      )}

      <div className="flex items-center gap-2">
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-fg/60 hover:text-fg disabled:opacity-50"
          >
            <ArrowLeft size={15} /> Volver
          </button>
        )}
        <button
          type="button"
          onClick={() => onConfirmar({
            complementoId: Number(complementoId),
            precio: precioNumero,
            precioLista: precioListaNumero || null,
            descripcion: descripcion.trim() || null,
            cantidad: cantidadNumero,
          })}
          disabled={!puedeConfirmar}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-fg px-4 py-3 text-sm font-bold text-canvas transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {guardando
            ? <><Loader size={16} className="animate-spin" /> Guardando...</>
            : <><Check size={16} /> {textoConfirmar}</>}
        </button>
      </div>
    </div>
  );
}
