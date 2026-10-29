import { useRef, useState } from 'react';

const CAPTURAS = [
  { id: 'ventas', titulo: 'Ventas y ganancias', descripcion: 'Consultá tus ventas entregadas y la ganancia estimada del período.', archivo: 'resumen.webp', alt: 'Resumen de ventas, pedidos entregados, utilidad neta y margen en el dashboard de Gesicom.' },
  { id: 'pedidos', titulo: 'Pedidos pendientes', descripcion: 'Identificá en qué etapa está cada pedido para organizar el próximo paso.', archivo: 'pedidos.webp', alt: 'Resumen de pedidos de Gesicom agrupados por su estado actual.' },
  { id: 'seguimiento', titulo: 'De la consulta a la venta', descripcion: 'Seguí las etapas de compra y detectá dónde necesitás mejorar el seguimiento.', archivo: 'seguimiento.webp', alt: 'Embudo de conversión de Gesicom con las etapas del recorrido de compra.' },
];

export default function ProductTour() {
  const [actual, setActual] = useState(0);
  const dialogRef = useRef(null);
  const abrirRef = useRef(null);
  const captura = CAPTURAS[actual];
  const src = `/brand/landing/product-tour/${captura.archivo}`;
  return <div className="home-product-tour">
    <div className="home-tour-options" role="group" aria-label="Capturas de la plataforma">
      {CAPTURAS.map((item, index) => <button key={item.id} type="button" className="btn" aria-pressed={actual === index} aria-controls="home-tour-preview" onClick={() => setActual(index)}>{item.titulo}</button>)}
    </div>
    <figure id="home-tour-preview">
      <button type="button" className="home-tour-image" ref={abrirRef} aria-label={`Ampliar captura: ${captura.titulo}`} onClick={() => dialogRef.current?.showModal()}><img src={src} alt={captura.alt} loading="lazy" width="1200" height="750" /><span className="home-tour-zoom" aria-hidden="true">Ampliar captura ↗</span></button>
      <figcaption aria-live="polite"><strong>{captura.titulo}</strong><p>{captura.descripcion}</p><span>Interfaz de Gesicom · Datos ficticios de demostración</span></figcaption>
    </figure>
    <a className="btn" href="#solicitar-demo">Solicitar asesoramiento</a>
    <dialog ref={dialogRef} className="home-tour-dialog" aria-labelledby="home-tour-dialog-title" onClose={() => abrirRef.current?.focus()}>
      <div className="home-tour-dialog-heading"><h3 id="home-tour-dialog-title">{captura.titulo}</h3><button type="button" className="btn" onClick={() => dialogRef.current?.close()} aria-label="Cerrar captura">Cerrar ×</button></div>
      <p>Captura de la plataforma con datos ficticios de demostración.</p>
      <div className="home-tour-full"><img src={src} alt={captura.alt} width="1200" height="750" /></div>
    </dialog>
  </div>;
}
