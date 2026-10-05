import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImageOff, Layers, ShoppingCart } from 'lucide-react';
import CodigoPreview from './CodigoPreview';
import { contentIdPanel, datosRuntimePreview } from './datosRuntime';
import { getMediaUrl } from '../../services/api';

// El ID 0 identifica únicamente este borrador en el preview; nunca se guarda.
export function itemComboEnCurso({ combo, principal, upsells = [], precioTotal, imagenes = [], faq = [] }) {
  const productos = [principal, ...upsells].filter(Boolean);
  const fotos = [...imagenes].sort((a, b) => Number(Boolean(b.es_principal)) - Number(Boolean(a.es_principal)))
    .map(i => typeof i === 'string' ? i : i.url).filter(Boolean);
  return {
    ...combo, id: 0, tipo: 'combo', precio: Number(precioTotal), precio_efectivo: Number(precioTotal),
    imagen: fotos[0] || principal?.imagen || null,
    imagenes: fotos.length ? fotos : productos.map(p => p.imagen).filter(Boolean),
    preguntas_frecuentes: faq,
    productos_incluidos: productos.map(p => p.nombre).join(', '),
    productos_combo: productos.map(p => ({ id: Number(p.id), nombre: p.nombre, imagen: p.imagen,
      slug: p.slug, precio: Number(p.precio_base), cantidad: 1 })),
  };
}

export default function ComboCodigoPreview({ landing, device, onDeviceChange, ...armado }) {
  const [vista, setVista] = useState('producto');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ancho, setAncho] = useState(0);
  const contenedor = useRef(null);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(entries => setAncho(entries[0].contentRect.width));
    if (contenedor.current) observer.observe(contenedor.current);
    return () => observer.disconnect();
  }, []);
  const item = useMemo(() => itemComboEnCurso(armado), [armado.combo, armado.principal, armado.upsells, armado.precioTotal, armado.imagenes, armado.faq]);
  const datos = useMemo(() => datosRuntimePreview({
    productos: [...(landing.productos || []).filter(p => !(p.tipo === 'combo' && Number(p.id) === 0)), item],
    tienda: landing.tienda, venta: landing.venta, ofertas: landing.ofertas || [],
    vista, productoId: contentIdPanel(item),
  }), [landing, item, vista]);
  const codigoInicio = landing.codigos?.inicio;
  const anchoDispositivo = { desktop: 1280, tablet: 768, mobile: 390 }[device] || 1280;
  const escala = ancho ? Math.min(1, ancho / anchoDispositivo) : 1;
  const navegar = evento => {
    if (evento.destino === 'inicio') setVista('inicio');
    else if (evento.destino === 'producto' && evento.producto === contentIdPanel(item)) setVista('producto');
    else setAviso('Esta vista previa está enfocada en el combo que estás armando.');
  };
  return <section className="product-preview-panel combo-code-preview" aria-label="Vista propia del combo">
    <div className="product-preview-toolbar">
      <div><span className="product-preview-kicker">Bundle offer block</span><h3>Cómo se vende este combo</h3></div>
      <div className="product-preview-devices" role="group" aria-label="Resolución de preview">
        {['desktop', 'tablet', 'mobile'].map(d => <button key={d} type="button" className={device === d ? 'active' : ''} aria-pressed={device === d} onClick={() => onDeviceChange(d)}>{({ desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' })[d]}</button>)}
      </div>
    </div>
    <div className="product-preview-toolbar">
      <div role="group" aria-label="Vista de la landing">
        <button type="button" className="btn-secondary" aria-pressed={vista === 'inicio'} onClick={() => { setVista('inicio'); setError(''); setAviso(''); }}>Inicio</button>{' '}
        <button type="button" className="btn-secondary" aria-pressed={vista === 'producto'} onClick={() => { setVista('producto'); setError(''); setAviso(''); }}>Ficha del combo</button>
      </div>
      <p>{vista === 'producto' ? 'Vista propia de oferta: imagen, contenido, valor por separado, ahorro y CTA.' : 'Inicio usa tu HTML, CSS y JavaScript actuales con el combo como borrador.'}</p>
    </div>
    {error && <p role="alert">Error en el código de la landing: {error}</p>}
    {aviso && <p role="status">{aviso}</p>}
    <output data-testid="datos-combo" hidden>{JSON.stringify(datos)}</output>
    <div ref={contenedor} style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
      {vista === 'producto' ? (
        <ComboOfferDraftPreview item={item} datos={datos} device={device} />
      ) : codigoInicio?.html?.trim() ? <div style={{ width: anchoDispositivo * escala, height: 600, margin: '0 auto', overflow: 'hidden' }}>
        <CodigoPreview codigo={codigoInicio} datos={datos} titulo="Combo en el HTML de esta landing" onError={setError} onNavegar={navegar}
          onCheckout={() => setAviso('Es una vista previa: no se crean pedidos desde el armador.')}
          style={{ width: anchoDispositivo, height: 600 / escala, transform: `scale(${escala})`, transformOrigin: 'top left', border: 0 }} />
      </div> : <p role="status" style={{ padding: '2rem' }}>Esta landing todavía no tiene HTML para el inicio. Configurá esa vista en el editor para previsualizar tu diseño aquí.</p>}
    </div>
  </section>;
}

function ComboOfferDraftPreview({ item, datos, device }) {
  const productos = item.productos_combo || [];
  const productoRuntime = datos.producto || {};
  const precioCombo = Number(item.precio) || 0;
  const valorSeparado = productos.reduce((sum, p) => sum + (Number(p.precio) || 0) * (Number(p.cantidad) || 1), 0);
  const ahorro = valorSeparado > precioCombo ? valorSeparado - precioCombo : 0;
  const descuento = ahorro ? Math.round((ahorro / valorSeparado) * 100) : 0;
  const imagenes = item.imagenes?.length ? item.imagenes : productos.map(p => p.imagen).filter(Boolean);
  const hero = imagenes[0] || item.imagen || null;
  const nombreTienda = datos.tienda?.nombre || 'Tu tienda';
  const confianza = ['Envío a todo Paraguay', 'Pago contra entrega', 'Stock disponible'];

  return (
    <div className={`combo-offer-preview ${device}`}>
      <div className="combo-offer-topbar">
        <span>{nombreTienda}</span>
        <span>Oferta de combo</span>
      </div>
      <article className="combo-offer-hero">
        <div className="combo-offer-headline">
          <span className="combo-offer-eyebrow"><Layers size={14} /> Kit completo</span>
          <h1>{item.nombre || 'Combo sin nombre'}</h1>
          {item.descripcion && <p>{item.descripcion}</p>}
        </div>

        <div className="combo-offer-media">
          <div className="combo-offer-image">
            {hero ? <img src={getMediaUrl(hero)} alt={item.nombre || 'Combo'} /> : <ImageOff size={42} />}
          </div>
          {productos.length > 0 && (
            <div className="combo-offer-includes" aria-label="Productos incluidos">
              {productos.slice(0, 4).map((p, index) => (
                <React.Fragment key={p.id || p.nombre}>
                  {index > 0 && <b className="combo-offer-plus">+</b>}
                  <div className="combo-offer-mini">
                    <span>{p.imagen ? <img src={getMediaUrl(p.imagen)} alt="" /> : <ImageOff size={16} />}</span>
                    <strong>{p.nombre}</strong>
                    <small>x{p.cantidad || 1}</small>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="combo-offer-card">
          <div className="combo-offer-card-head">
            <span>Todo lo que necesitás</span>
            <strong>{productos.length || 1} productos</strong>
          </div>
          <dl className="combo-offer-prices">
            <div>
              <dt>Valor por separado</dt>
              <dd>{valorSeparado ? formatGs(valorSeparado) : 'Por definir'}</dd>
            </div>
            <div className="principal">
              <dt>Hoy</dt>
              <dd>{formatGs(precioCombo)}</dd>
            </div>
          </dl>
          {ahorro > 0 && (
            <div className="combo-offer-saving">
              <span>Ahorrás {formatGs(ahorro)}</span>
              <b>{descuento}% OFF</b>
            </div>
          )}
          <button type="button" className="combo-offer-cta">
            <ShoppingCart size={16} /> Quiero mi combo
          </button>
          <div className="combo-offer-trust">
            {confianza.map(texto => <span key={texto}><Check size={13} /> {texto}</span>)}
          </div>
        </div>
      </article>

      <section className="combo-offer-detail">
        <div>
          <span className="combo-offer-section-label">Qué incluye</span>
          <h2>Tu combo viene listo para venderse como una oferta</h2>
        </div>
        <div className="combo-offer-list">
          {productos.map(p => (
            <div className="combo-offer-row" key={p.id || p.nombre}>
              <span>{p.imagen ? <img src={getMediaUrl(p.imagen)} alt="" /> : <ImageOff size={18} />}</span>
              <strong>{p.nombre}</strong>
              <small>x{p.cantidad || 1}</small>
              <b>{p.precio ? formatGs(Number(p.precio) * (Number(p.cantidad) || 1)) : 'Incluido'}</b>
            </div>
          ))}
          {productos.length === 0 && <p className="combo-offer-empty">Agregá productos para ver el contenido del combo.</p>}
        </div>
      </section>

      <p className="combo-offer-note">ID temporal: {productoRuntime.id || 'combo-0'}. Esta vista no crea pedidos desde el armador.</p>
    </div>
  );
}

function formatGs(valor) {
  const n = Number(valor) || 0;
  return `${new Intl.NumberFormat('es-PY').format(Math.round(n))} Gs`;
}
