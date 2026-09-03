import React, { useState } from 'react';
import BasicoProductPage from './BasicoProductPage';
import FichaBasicoPanel from '../../panels/FichaBasicoPanel';
import { resolverFichaBasico, fichaBasicoDesdeProducto } from './fichaBasico';
import { armarItemFicha } from '../fichaComun';

const foto = (semilla, w = 800, h = 800) => `https://picsum.photos/seed/${semilla}/${w}/${h}`;

/**
 * Vista de prueba de la ficha del template Básico (/dev/ficha-basico).
 *
 * Todo lo que se ve acá entra por donde entraría de verdad:
 *   - PRODUCTO.*          → pestaña "Marketing & Embudo" de Mis Productos
 *   - OFERTAS             → pestaña "Ofertas"
 *   - FICHA_LANDING       → panel del armador, modo landing
 *   - FICHA_PRODUCTO      → panel del armador, modo producto
 * Nada está hardcodeado en el renderer.
 */
const PRODUCTO = {
  nombre: 'Organizador modular de escritorio',
  categoria: 'Oficina y escritorio',
  propuesta_valor: 'Un producto pensado para ofrecer resultados reales, una experiencia superior y la confianza que buscás al comprar online.',
  sobre_este_producto: 'Todo lo que necesitás en un solo producto. Su diseño combina practicidad, materiales confiables y una experiencia pensada para que obtengas más valor en cada uso.',
  beneficios: [
    { titulo: 'Calidad superior', texto: 'Materiales y acabados seleccionados', icono: 'star' },
    { titulo: 'Fácil de usar', texto: 'Diseñado para simplificar tu rutina', icono: 'check' },
    { titulo: 'Resultados reales', texto: 'Miles de clientes ya lo disfrutan', icono: 'heart' },
    { titulo: 'Compra segura', texto: 'Garantía y soporte incluido', icono: 'shield' },
    { titulo: 'Sin riesgos', texto: 'Devolución fácil si cambiás de opinión', icono: 'rotate' },
  ],
  confianza: [
    { icono: 'ShieldCheck', texto: 'Garantía 30 días' },
    { icono: 'Truck', texto: 'Envío gratis' },
    { icono: 'Star', texto: 'Calidad verificada' },
    { icono: 'Headphones', texto: 'Soporte' },
    { icono: 'CheckCircle2', texto: 'Pago seguro' },
  ],
};

const OFERTAS = [
  { id: 41, nombre: '3 unidades', estrategia: 'normal', tipo_contenido: 'pack', unidades: 3, precio: 690000, precio_efectivo: 690000, imagen: foto('pack3b') },
  { id: 42, nombre: '6 unidades', estrategia: 'normal', tipo_contenido: 'pack', unidades: 6, precio: 1150000, precio_efectivo: 1150000, imagen: foto('pack6b') },
  // Order bump: NO debe aparecer en la ficha, va en el checkout.
  { id: 43, nombre: 'Funda protectora', estrategia: 'order_bump', tipo_contenido: 'combo', precio: 79000 },
];

const FICHA_LANDING = {
  prueba_social: {
    activo: true,
    etiqueta: 'Excelente',
    calificacion: 4.8,
    resenas_texto: '2.847 reseñas verificadas',
    clientes_texto: '+10.000 pedidos entregados',
  },
  opciones: {
    packs: {
      41: { badge: 'Más vendido', subtitulo: 'La más elegida' },
      42: { badge: 'Mejor valor', subtitulo: 'Máximo ahorro' },
    },
  },
  garantias: {
    texto: 'Si no cumple tus expectativas, escribinos dentro de los 30 días. Te ayudamos con un cambio o una devolución clara y sencilla.',
  },
};

const FICHA_PRODUCTO = {
  hero: {
    etiqueta: 'Más vendido',
    eyebrow: 'Producto destacado · calidad garantizada',
    titulo: 'La solución simple para',
    titulo_destacado: 'mejorar tu día.',
  },
  descripcion: {
    encabezado: 'Diseñado para funcionar, creado para durar',
    destacados: ['Diseño inteligente', 'Calidad comprobada', 'Uso diario'],
  },
  usos: {
    pasos: [
      { paso: '1', titulo: 'Elegí', texto: 'Seleccioná la opción ideal para vos.' },
      { paso: '2', titulo: 'Usalo', texto: 'Seguí las indicaciones, es sencillo.' },
      { paso: '3', titulo: 'Disfrutá', texto: 'Incorporalo a tu día a día.' },
      { paso: '4', titulo: 'Compartí', texto: 'Contales tu experiencia a otros.' },
    ],
  },
  comparacion: {
    activo: true,
    imagen_otros: foto('otros'),
    items: [
      { caracteristica: 'Calidad premium', nosotros: true, otros: false },
      { caracteristica: 'Garantía incluida', nosotros: true, otros: false },
      { caracteristica: 'Soporte real', nosotros: true, otros: false },
      { caracteristica: 'Envío con seguimiento', nosotros: true, otros: true },
    ],
  },
};

const TEMAS = {
  'Básico (de fábrica)': { fondo: '#FFFFFF', texto: '#000000', acento: '#000000' },
  'Neutro + azul': { fondo: '#F7F9FC', texto: '#17233F', acento: '#2468DF' },
  'Oscuro': { fondo: '#101418', texto: '#EDF1F6', acento: '#5B9DFF' },
};

export default function DevFichaBasico() {
  const [temaNombre, setTemaNombre] = useState('Neutro + azul');
  const [movil, setMovil] = useState(false);
  const [sinDatos, setSinDatos] = useState(false);
  const [panel, setPanel] = useState(false);
  // Lo que el producto pisa en esta landing: arranca en null, que es el
  // estado en el que el panel de Beauty se rompía.
  const [fichaProducto, setFichaProducto] = useState(null);

  const producto = sinDatos ? { nombre: PRODUCTO.nombre, categoria: PRODUCTO.categoria } : PRODUCTO;
  const fichaDelProducto = fichaBasicoDesdeProducto(producto);
  const fichaLanding = sinDatos ? null : FICHA_LANDING;

  const ficha = resolverFichaBasico(
    fichaProducto ?? (sinDatos ? null : FICHA_PRODUCTO),
    fichaLanding,
    fichaDelProducto
  );

  const item = armarItemFicha({
    nombre: producto.nombre,
    categoria: producto.categoria,
    descripcion: producto.propuesta_valor,
    precio: 259000,
    precioAntes: 329000,
    imagenes: sinDatos ? [] : [foto('org1'), foto('org2'), foto('org3')],
    ofertas: sinDatos ? [] : OFERTAS,
    faq: sinDatos ? [] : [
      { pregunta: '¿Cuánto tarda en llegar?', respuesta: 'Recibís tu pedido entre 2 y 5 días hábiles, con seguimiento incluido.' },
      { pregunta: '¿Puedo devolverlo?', respuesta: 'Sí, tenés 30 días para pedir un cambio o una devolución.' },
      { pregunta: '¿Qué incluye la compra?', respuesta: 'El producto elegido, la guía de uso y soporte posventa.' },
      { pregunta: '¿Es seguro comprar?', respuesta: 'Todos los pagos están protegidos con cifrado SSL.' },
      { pregunta: '¿Hay garantía?', respuesta: 'Incluye garantía de satisfacción para comprar sin riesgos.' },
      { pregunta: '¿Hacen envíos a todo el país?', respuesta: 'Sí, enviamos a todo Paraguay.' },
    ],
    relacionados: sinDatos ? [] : [
      { id: 51, nombre: 'Accesorio premium', descripcion: 'Complemento ideal', precio: 119000, imagen: foto('acc1') },
      { id: 52, nombre: 'Complemento esencial', descripcion: 'Para el día a día', precio: 149000, imagen: foto('acc2') },
      { id: 53, nombre: 'Protección extendida', descripcion: '12 meses más', precio: 99000, imagen: foto('acc3') },
      { id: 54, nombre: 'Pack completo', descripcion: 'Todo junto', precio: 299000, imagen: foto('acc4') },
    ],
  });

  const btn = (activo) => ({
    padding: '6px 12px', fontSize: 12, cursor: 'pointer',
    border: '1px solid #888', background: activo ? '#222' : '#fff',
    color: activo ? '#fff' : '#222',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b0f19' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, padding: 10, background: '#111', flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.keys(TEMAS).map(n => (
            <button key={n} type="button" style={btn(temaNombre === n)} onClick={() => setTemaNombre(n)}>{n}</button>
          ))}
          <button type="button" style={btn(movil)} onClick={() => setMovil(!movil)}>Móvil</button>
          <button type="button" style={btn(sinDatos)} onClick={() => setSinDatos(!sinDatos)}>Sin datos</button>
          <button type="button" data-test="abrir-panel" style={btn(panel)} onClick={() => setPanel(!panel)}>Panel</button>
        </div>
        <BasicoProductPage
          item={item}
          ficha={ficha}
          tema={TEMAS[temaNombre]}
          isMobile={movil}
          previewMode
          contacto={{ whatsapp: '0981123456', instagram: 'gesicomm' }}
          nombreComercio="Tu comercio"
          onComprar={(e) => window.alert(`Comprar: ${JSON.stringify(e?.pack?.nombre || 'individual')} — ${e?.precio}`)}
          onAgregar={(e) => window.alert(`Agregar: ${e?.pack?.nombre || 'individual'} — ${e?.precio}`)}
          onVolver={() => {}}
          onClickRelacionado={(r) => window.alert(r.nombre)}
        />
      </div>

      {panel && (
        <div data-test="panel-ficha" style={{ width: 380, borderLeft: '1px solid #333', overflow: 'auto', maxHeight: '100vh' }}>
          <FichaBasicoPanel
            ficha={fichaProducto}
            fichaResuelta={ficha}
            fichaLanding={fichaLanding}
            fichaDelProducto={fichaDelProducto}
            packs={item.packs}
            respaldos={{
              titulo: producto.nombre,
              eyebrow: producto.categoria,
              lead: producto.propuesta_valor || '',
              descripcion: producto.sobre_este_producto || '',
            }}
            modo="producto"
            onChange={setFichaProducto}
          />
        </div>
      )}
    </div>
  );
}
