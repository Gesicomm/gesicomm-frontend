import React, { useMemo } from 'react';
import { ArrowLeft, Loader, Lock, Save, Star, Trash2, Upload } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import FaqPanel from './FaqPanel';
import ProductPicker from '../../landing/ProductPicker';
import ProductCheckoutOfertas from '../../landing/ProductCheckoutOfertas';
import FichaFitnessPanel from './FichaFitnessPanel';
import FichaTechPanel from './FichaTechPanel';
import CurrencyInput from '../../../components/CurrencyInput';
import { formatPrecio } from '../../../lib/mensajeWhatsapp';
import FichaBeautyPanel from './FichaBeautyPanel';
import '../../landing/landing.css';

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-fg/30';

/**
 * Panel de edición de UN producto, dentro del sidebar del armador de
 * landing. La sección "Productos relacionados" usa el mismo ProductPicker
 * que CatalogoPanel para mantener consistencia de UX/UI.
 */
export default function ProductoPanel({
  producto, editable, cargando,
  // Ficha rediseñada del template Fitness (12 secciones editables, ver
  // templates/fitness/). Solo aparece en ese template: los otros tres
  // siguen con la ficha genérica de siempre, así que sin estas props el
  // panel se comporta exactamente como antes.
  fichaActiva = false, ficha = null, fichaResuelta = null,
  fichaLanding = null, fichaMarketing = null, onFicha = null,
  // Ídem para Electrónica & Tecnología. Solo una de las dos puede estar
  // activa: la landing usa un template y ese decide qué ficha se edita.
  fichaTechActiva = false, fichaTech = null, fichaTechResuelta = null,
  fichaTechLanding = null, fichaTechDelProducto = null, onFichaTech = null,
  fichaBeautyActiva = false, fichaBeauty = null, fichaBeautyResuelta = null, fichaBeautyLanding = null, fichaBeautyDelProducto = null, onFichaBeauty = null,
  descripcion, onDescripcion,
  // Precio tachado de ESTE producto en ESTA landing (LandingItem.precio_ancla).
  // `precioActual` es solo para calcular el descuento que se muestra al lado.
  precioAncla = null, onPrecioAncla = null, precioActual = null,
  packs = [],
  imagenes, imagenesEditables = true, subiendoImg, onSubirImagen, onEliminarImagen, onMarcarPrincipal,
  faqTitulo, onFaqTitulo,
  faq, onFaqChange,
  relacionadosTitulo, onRelacionadosTitulo,
  relacionados, relacionadosAutomatico, onAgregarRelacionado, onQuitarRelacionado, catalogo,
  guardando, onGuardar, aviso, error,
  config, onChange,
  onOfertasChange,
  onVolver,
}) {
  // Mapeamos `relacionados` (array [{id, nombre, imagen, precio_efectivo}]) a
  // un Map con clave "producto:id" para reutilizar ProductPicker sin cambios.
  const [tab, setTab] = React.useState('detalles');

  const seleccionRelacionados = useMemo(() => {
    const map = new Map();
    (relacionados || []).forEach(r => {
      map.set(`producto:${r.id}`, { id: r.id, tipo: 'producto', etiqueta: '', precio_ancla: '' });
    });
    return map;
  }, [relacionados]);

  // ProductPicker llama onToggle con el item completo — necesitamos
  // traducir eso a agregar/quitar del array de relacionados.
  function handleToggleRelacionado(item) {
    const yaEsta = (relacionados || []).some(r => r.id === item.id);
    if (item.id === producto?.id) return; // no se puede relacionar consigo mismo
    if (yaEsta) {
      onQuitarRelacionado(item.id);
    } else {
      onAgregarRelacionado(item);
    }
  }

  // itemsOrdenados para la vista "Orden y etiquetas" del picker (solo lectura,
  // sin precio ancla ni etiqueta en relacionados — no aplica acá).
  const itemsOrdenados = useMemo(() => {
    return (relacionados || []).map(r => ({
      id: r.id,
      tipo: 'producto',
      nombre: r.nombre,
      imagen: r.imagen,
      precio_efectivo: r.precio_efectivo,
      etiqueta: '',
      precio_ancla: '',
    }));
  }, [relacionados]);

  return (
    <div className="flex flex-col h-full">
      <button type="button" onClick={onVolver} className="p-4 border-b border-fg/10 flex items-center gap-3 hover:bg-fg/5 transition-colors w-full text-left">
        <div className="p-1 rounded-full transition-colors">
          <ArrowLeft size={16} />
        </div>
        <span className="text-sm font-semibold">Volver a la landing</span>
      </button>

      <div className="flex bg-fg/5 border-b border-fg/10 shrink-0">
        <button type="button" onClick={() => setTab('detalles')} className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${tab === 'detalles' ? 'border-primary text-primary-text' : 'border-transparent text-fg/50 hover:text-fg'}`}>Detalles</button>
        <button type="button" onClick={() => setTab('relacionados')} className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${tab === 'relacionados' ? 'border-primary text-primary-text' : 'border-transparent text-fg/50 hover:text-fg'}`}>Relacionados</button>
        <button type="button" onClick={() => setTab('ofertas')} className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${tab === 'ofertas' ? 'border-primary text-primary-text' : 'border-transparent text-fg/50 hover:text-fg'}`}>Ofertas</button>
        {(fichaActiva || fichaTechActiva || fichaBeautyActiva) && (
          <button type="button" onClick={() => setTab('ficha')} className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${tab === 'ficha' ? 'border-primary text-primary-text' : 'border-transparent text-fg/50 hover:text-fg'}`}>Ficha</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        <div>
          <p className="text-xs text-fg/40 mb-0.5">Editando producto</p>
          <p className="text-sm font-bold text-fg truncate">{producto?.nombre}</p>
        </div>

        {!editable ? (
          <p className="text-xs text-fg/40">Los combos se editan desde Mis Productos.</p>
        ) : cargando ? (
          <div className="flex items-center gap-2 text-fg/40 text-xs"><Loader size={14} className="animate-spin" /> Cargando...</div>
        ) : (
          <>
            {tab === 'detalles' && (
              <div className="flex flex-col gap-5">
            {/* ─── Imágenes ─────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-fg/60 mb-1.5">Imágenes</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {imagenes.map(img => (
                  <div key={img.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-fg/10 group">
                    <img src={getMediaUrl(img.url)} alt="" className="w-full h-full object-cover" />
                    {img.es_principal && <span className="absolute top-0.5 left-0.5 bg-fg rounded-full p-0.5"><Star size={9} className="text-canvas" fill="var(--color-canvas)" /></span>}
                    {imagenesEditables && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {!img.es_principal && (
                          <button type="button" onClick={() => onMarcarPrincipal(img.id)} title="Marcar como principal" className="p-1 rounded bg-fg hover:bg-fg/80">
                            <Star size={11} />
                          </button>
                        )}
                        <button type="button" onClick={() => onEliminarImagen(img.id)} title="Eliminar" className="p-1 rounded bg-fg hover:bg-fg/80">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {imagenesEditables ? (
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg cursor-pointer w-fit">
                  {subiendoImg ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />}
                  Agregar imagen
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onSubirImagen} disabled={subiendoImg} />
                </label>
              ) : (
                /* A diferencia de la descripción o la FAQ, las imágenes no se
                   pueden personalizar por landing: son del producto del
                   catálogo, que es compartido. Se explica en vez de mostrar un
                   botón que el backend va a rechazar. */
                <p className="text-xs text-fg/40 flex items-start gap-1.5 bg-fg/5 border border-fg/10 rounded-lg px-2 py-1.5">
                  <Lock size={12} className="mt-0.5 shrink-0" />
                  <span>Las imágenes son del producto del catálogo y las administra quien lo cargó. Todo lo demás de esta página sí lo podés editar.</span>
                </p>
              )}
            </div>

            {/* ─── Precio tachado ───────────────────────────────────── */}
            {onPrecioAncla && (
              <div>
                <label className="block text-xs font-semibold text-fg/60 mb-1.5">Precio tachado</label>
                <CurrencyInput
                  value={precioAncla ?? ''}
                  onChange={onPrecioAncla}
                  placeholder="Sin precio tachado"
                  className={CAMPO}
                />
                <ResumenAncla ancla={precioAncla} actual={precioActual} />
              </div>
            )}

            {/* ─── Descripción ──────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-fg/60 mb-1.5">Descripción</label>
              <textarea
                value={descripcion}
                onChange={e => onDescripcion(e.target.value)}
                rows={4}
                placeholder="Contale al cliente de qué se trata este producto..."
                className={CAMPO}
              />
            </div>

            {/* ─── FAQ ──────────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-fg/60 mb-1.5">Todo lo que necesitas saber</label>
              <p className="text-xs text-fg/30 mb-2">Preguntas frecuentes propias de este producto.</p>

              <div className="mb-3">
                <input
                  type="text"
                  value={faqTitulo}
                  onChange={e => onFaqTitulo(e.target.value)}
                  placeholder="Ej: Todo lo que necesitas saber"
                  className={CAMPO}
                />
              </div>

              <FaqPanel faq={faq} onChange={onFaqChange} />
            </div>
            </div>
            )}

            {tab === 'relacionados' && (
              <div className="flex flex-col gap-5">
            {/* ─── Productos relacionados ───────────────────────────── */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-fg/60">Productos relacionados</label>

              {relacionadosAutomatico ? (
                <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
                  Se muestran productos de la misma categoría. Agregá productos específicos abajo para personalizar.
                </p>
              ) : (
                <p className="text-xs text-fg/30">
                  Se muestran al final de la página de este producto.
                </p>
              )}

              {/* Título de la sección */}
              <input
                type="text"
                value={relacionadosTitulo}
                onChange={e => onRelacionadosTitulo(e.target.value)}
                placeholder="Título (ej: Productos relacionados)"
                className={CAMPO}
              />

              {/* Picker igual al del catálogo */}
              <ProductPicker
                catalogo={catalogo}
                seleccion={seleccionRelacionados}
                itemsOrdenados={itemsOrdenados}
                onToggle={handleToggleRelacionado}
                onEtiqueta={() => {}}
                onPrecioAncla={() => {}}
                onReordenar={() => {}}
                max={12}
                mostrarInputs={false}
              />
            </div>
            </div>
            )}

            {tab === 'ofertas' && (
              <div className="flex flex-col gap-5">
              <ProductCheckoutOfertas producto={producto} config={config} onChange={onChange} catalogo={catalogo} onOfertasChange={onOfertasChange} />
              </div>
            )}

            {tab === 'ficha' && fichaTechActiva && fichaTechResuelta && (
              <FichaTechPanel
                ficha={fichaTech}
                fichaResuelta={fichaTechResuelta}
                fichaLanding={fichaTechLanding}
                fichaDelProducto={fichaTechDelProducto}
                respaldos={{
                  titulo: producto?.nombre || '',
                  eyebrow: producto?.categoria?.nombre || producto?.categoria || '',
                  lead: descripcion || '',
                  faqTitulo: faqTitulo || 'Preguntas frecuentes',
                  upsellsTitulo: relacionadosTitulo || '',
                }}
                modo="producto"
                onChange={onFichaTech}
              />
            )}

            {tab === 'ficha' && fichaBeautyActiva && fichaBeautyResuelta && (
              <FichaBeautyPanel
                ficha={fichaBeauty}
                fichaResuelta={fichaBeautyResuelta}
                fichaLanding={fichaBeautyLanding}
                fichaDelProducto={fichaBeautyDelProducto}
                respaldos={{
                  titulo: producto?.nombre || '',
                  eyebrow: producto?.categoria?.nombre || producto?.categoria || '',
                  lead: descripcion || '',
                  faqTitulo: faqTitulo || 'Preguntas frecuentes',
                  upsellsTitulo: relacionadosTitulo || '',
                }}
                modo="producto"
                onChange={onFichaBeauty}
              />
            )}

            {tab === 'ficha' && fichaActiva && fichaResuelta && (
              <FichaFitnessPanel
                ficha={ficha}
                fichaResuelta={fichaResuelta}
                fichaLanding={fichaLanding}
                fichaMarketing={fichaMarketing}
                packs={packs}
                respaldos={{
                  titulo: producto?.nombre || '',
                  eyebrow: producto?.categoria?.nombre || producto?.categoria || '',
                  lead: descripcion || '',
                  faqTitulo: faqTitulo || 'Preguntas frecuentes',
                  upsellsTitulo: relacionadosTitulo || '',
                }}
                modo="producto"
                onChange={onFicha}
              />
            )}

            {/* ─── Guardar ──────────────────────────────────────────── */}
            <button
              type="button"
              onClick={onGuardar}
              disabled={guardando}
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-fg text-canvas hover:bg-fg-muted disabled:opacity-50"
            >
              {guardando ? <Loader size={14} className="animate-spin" /> : <Save size={14} />} Guardar cambios
            </button>
            {aviso && <p className="text-xs text-emerald-400">{aviso}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Qué va a ver el cliente con el ancla que se acaba de escribir. Un ancla
 * por debajo del precio real no muestra nada (sería un "descuento" negativo)
 * y sin este aviso el comercio lo escribe, no ve cambios en el preview y no
 * entiende por qué.
 */
function ResumenAncla({ ancla, actual }) {
  const a = Number(ancla);
  const p = Number(actual);

  if (!ancla) {
    return (
      <p className="text-[11px] text-fg/30 mt-1.5 leading-relaxed">
        Vale solo para esta landing. Vacío = se usa el precio tachado del producto, si tiene.
      </p>
    );
  }

  if (!Number.isFinite(a) || !Number.isFinite(p) || p <= 0) return null;

  if (a <= p) {
    return (
      <p className="text-[11px] text-amber-400/90 mt-1.5 leading-relaxed">
        Tiene que ser mayor que el precio de venta ({formatPrecio(p)}) para que se vea tachado. Así como está,
        la ficha no muestra ni el tachado ni el descuento.
      </p>
    );
  }

  return (
    <p className="text-[11px] text-emerald-400/90 mt-1.5 leading-relaxed">
      Se muestra <s className="opacity-70">{formatPrecio(a)}</s> junto a {formatPrecio(p)} — descuento del{' '}
      {Math.round((1 - p / a) * 100)}%.
    </p>
  );
}
