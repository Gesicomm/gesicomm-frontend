import React, { useEffect, useMemo, useRef, useState } from 'react';
import CodigoPreview from './CodigoPreview';
import { contentIdPanel, datosRuntimePreview } from './datosRuntime';

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
  const codigo = landing.codigos?.[vista === 'producto' ? 'producto' : 'inicio'];
  const anchoDispositivo = { desktop: 1280, tablet: 768, mobile: 390 }[device] || 1280;
  const escala = ancho ? Math.min(1, ancho / anchoDispositivo) : 1;
  const navegar = evento => {
    if (evento.destino === 'inicio') setVista('inicio');
    else if (evento.destino === 'producto' && evento.producto === contentIdPanel(item)) setVista('producto');
    else setAviso('Esta vista previa está enfocada en el combo que estás armando.');
  };
  return <section className="product-preview-panel" aria-label="Vista del combo en el HTML de la landing">
    <div className="product-preview-toolbar">
      <div><span className="product-preview-kicker">HTML de esta landing</span><h3>Cómo se ve este combo en tu diseño</h3></div>
      <div className="product-preview-devices" role="group" aria-label="Resolución de preview">
        {['desktop', 'tablet', 'mobile'].map(d => <button key={d} type="button" className={device === d ? 'active' : ''} aria-pressed={device === d} onClick={() => onDeviceChange(d)}>{({ desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' })[d]}</button>)}
      </div>
    </div>
    <div className="product-preview-toolbar">
      <div role="group" aria-label="Vista de la landing">
        <button type="button" className="btn-secondary" aria-pressed={vista === 'inicio'} onClick={() => { setVista('inicio'); setError(''); setAviso(''); }}>Inicio</button>{' '}
        <button type="button" className="btn-secondary" aria-pressed={vista === 'producto'} onClick={() => { setVista('producto'); setError(''); setAviso(''); }}>Ficha del combo</button>
      </div>
      <p>Usa tu HTML, CSS y JavaScript actuales. Los datos del combo todavía son un borrador.</p>
    </div>
    {error && <p role="alert">Error en el código de la landing: {error}</p>}
    {aviso && <p role="status">{aviso}</p>}
    <div ref={contenedor} style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
      {codigo?.html?.trim() ? <div style={{ width: anchoDispositivo * escala, height: 600, margin: '0 auto', overflow: 'hidden' }}>
        <CodigoPreview codigo={codigo} datos={datos} titulo="Combo en el HTML de esta landing" onError={setError} onNavegar={navegar}
          onCheckout={() => setAviso('Es una vista previa: no se crean pedidos desde el armador.')}
          style={{ width: anchoDispositivo, height: 600 / escala, transform: `scale(${escala})`, transformOrigin: 'top left', border: 0 }} />
      </div> : <p role="status" style={{ padding: '2rem' }}>Esta landing todavía no tiene HTML para {vista === 'producto' ? 'la ficha del combo' : 'el inicio'}. Configurá esa vista en el editor para previsualizar tu diseño aquí.</p>}
    </div>
  </section>;
}
