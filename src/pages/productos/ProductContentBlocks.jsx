import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const BLOQUES_CONTENIDO_PRODUCTO = [
  { id: 'presentacion', titulo: 'Presentación', ayuda: 'Nombre comercial, propuesta de valor y descripciones.', destino: 'nombre_comercial', zonas: ['nombre_comercial', 'encabezado'] },
  { id: 'precio', titulo: 'Precio y botones', ayuda: 'Mensajes de precio, botón principal y beneficios rápidos.', destino: 'precio' },
  { id: 'oferta', titulo: 'Oferta por tiempo limitado', ayuda: 'Encabezado y mensaje de la oferta.', destino: 'oferta' },
  { id: 'detalles', titulo: 'Detalles del producto', ayuda: 'Materiales, medidas, cuidados y otra información útil.', destino: 'descripcion' },
  { id: 'beneficios', titulo: 'Beneficios', ayuda: 'Qué aporta el producto y por qué elegirlo.', destino: 'beneficios' },
  { id: 'incluye', titulo: 'Qué incluye el pedido', ayuda: 'Los artículos que recibe el cliente.', destino: 'incluye' },
  { id: 'opiniones', titulo: 'Opiniones y estrellas', ayuda: 'Cantidad de estrellas, texto de reseñas y títulos de las opiniones.', destino: 'resenas_comerciales', zonas: ['resenas_comerciales', 'opiniones'] },
  { id: 'preguntas', titulo: 'Preguntas frecuentes', ayuda: 'Preguntas y respuestas propias de este producto.', destino: 'preguntas' },
  { id: 'confianza', titulo: 'Confianza y garantías', ayuda: 'Condiciones de compra, entrega y soporte.', destino: 'confianza' },
];

export default function ProductContentBlocks({ seleccionado, onSeleccionar, bloques, introduccion }) {
  const indice = BLOQUES_CONTENIDO_PRODUCTO.findIndex(b => b.id === seleccionado);
  const actual = BLOQUES_CONTENIDO_PRODUCTO[indice];
  const contenidoRef = useRef(null);
  const tituloRef = useRef(null);
  const listadoScroll = useRef(0);
  const ultimo = useRef(null);
  useEffect(() => {
    if (contenidoRef.current) contenidoRef.current.scrollTop = actual ? 0 : listadoScroll.current;
    if (ultimo.current !== seleccionado) tituloRef.current?.focus({ preventScroll: true });
    ultimo.current = seleccionado;
  }, [seleccionado, actual]);
  const elegir = id => {
    if (!actual) listadoScroll.current = contenidoRef.current?.scrollTop || 0;
    onSeleccionar(id);
  };
  return <section className="product-view-editor product-block-editor" aria-label="Bloques de la página del producto">
    <header className="product-block-header">
      {actual ? <>
        <button type="button" className="product-block-back" onClick={() => elegir(null)}><ArrowLeft size={16} aria-hidden="true" /> Bloques del producto</button>
        <span className="product-block-progress">Bloque {indice + 1} de {BLOQUES_CONTENIDO_PRODUCTO.length}</span>
        <h2 ref={tituloRef} tabIndex={-1}>{actual.titulo}</h2><p>{actual.ayuda}</p>
      </> : <><h2 ref={tituloRef} tabIndex={-1}>Página del producto</h2><p>Elegí un bloque para editarlo. Podés seguir en orden o volver a cualquiera.</p></>}
    </header>
    <div className="product-block-content" ref={contenidoRef}>
      <div hidden={!!actual}>
        <div className="product-block-intro">{introduccion}</div>
        <ol className="product-block-list">
          {BLOQUES_CONTENIDO_PRODUCTO.map((bloque, i) => <li key={bloque.id}><button type="button" onClick={() => elegir(bloque.id)}>
            <span className="product-block-number" aria-hidden="true">{i + 1}</span>
            <span><strong>{bloque.titulo}</strong><small>{bloque.ayuda}</small></span><ArrowRight size={18} aria-hidden="true" />
          </button></li>)}
        </ol>
      </div>
      {bloques.map(bloque => <div key={bloque.id} hidden={seleccionado !== bloque.id} className="product-block-fields" role="region" aria-label={`Editar ${BLOQUES_CONTENIDO_PRODUCTO.find(b => b.id === bloque.id)?.titulo}`}>
        {bloque.contenido}
      </div>)}
    </div>
    {actual && <footer className="product-block-footer">
      <button type="button" className="btn-secondary" onClick={() => elegir(indice > 0 ? BLOQUES_CONTENIDO_PRODUCTO[indice - 1].id : null)}><ArrowLeft size={16} aria-hidden="true" />{indice > 0 ? 'Anterior' : 'Ver bloques'}</button>
      <button type="button" className="btn-primary" onClick={() => elegir(BLOQUES_CONTENIDO_PRODUCTO[indice + 1]?.id || null)}>{indice < BLOQUES_CONTENIDO_PRODUCTO.length - 1 ? 'Siguiente bloque' : 'Volver a bloques'}<ArrowRight size={16} aria-hidden="true" /></button>
    </footer>}
  </section>;
}
