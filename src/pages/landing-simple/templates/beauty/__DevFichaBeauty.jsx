import React, { useState } from 'react';
import BeautyProductPage from './BeautyProductPage';
import StoreHeader from '../StoreHeader';
import FichaBeautyPanel from '../../panels/FichaBeautyPanel';
import { resolverFichaBeauty, fichaBeautyDesdeProducto } from './fichaBeauty';
import { armarItemFicha } from '../fichaComun';

const foto = (semilla, w = 800, h = 800) => `https://picsum.photos/seed/${semilla}/${w}/${h}`;

/**
 * Datos de prueba de la ficha Beauty. Todo lo que se ve acá entra por donde
 * entraría de verdad:
 *   - PRODUCTO.beneficios / confianza / propuesta_valor → "Vista del producto"
 *   - PRODUCTO.ficha_datos.beauty_*                     → "Vista del producto"
 *   - OFERTAS                                            → pestaña "Ofertas"
 *   - FICHA_LANDING / FICHA_PRODUCTO                     → panel del armador
 * Nada está hardcodeado en el renderer.
 */
const PRODUCTO = {
  nombre: 'Serum Glow Renew',
  categoria: 'Serums faciales',
  propuesta_valor: 'Transformá tu piel desde la primera aplicación. Reduce arrugas, manchas y líneas de expresión para una piel visiblemente más joven y luminosa.',
  beneficios: [
    { titulo: 'Hidrata en profundidad', texto: 'Mantiene tu piel hidratada todo el día.', icono: 'droplet' },
    { titulo: 'Reduce arrugas y líneas finas', texto: 'Reduce arrugas y líneas de expresión.', icono: 'sparkles' },
    { titulo: 'Unifica el tono', texto: 'Unifica el tono y reduce decoloraciones.', icono: 'sun' },
    { titulo: 'Aporta luminosidad natural', texto: 'Devuelve el brillo natural a tu piel.', icono: 'star' },
    { titulo: 'Apto para todo tipo de piel', texto: 'Textura suave y piel más tersa.', icono: 'heart' },
  ],
  confianza: [
    { icono: 'ShieldCheck', texto: 'Garantía 60 días' },
    { icono: 'CheckCircle2', texto: 'Dermatológicamente probado' },
    { icono: 'Star', texto: 'Libre de crueldad' },
    { icono: 'Truck', texto: 'Ingredientes seguros' },
    { icono: 'RotateCcw', texto: 'Pago 100% seguro' },
  ],
  ficha_rubro: 'beauty',
  ficha_datos: {
    beauty_ingredientes: [
      { icono: '💧', nombre: 'Ácido hialurónico', descripcion: 'Hidratación profunda y rellena arrugas' },
      { icono: '🧴', nombre: 'Niacinamida (B3)', descripcion: 'Reduce manchas y mejora la textura de la piel' },
      { icono: '🍊', nombre: 'Vitamina C', descripcion: 'Antioxidante que ilumina y protege la piel' },
      { icono: '🌿', nombre: 'Aloe vera', descripcion: 'Calma, hidrata y regenera la piel' },
      { icono: '✨', nombre: 'Péptidos', descripcion: 'Estimula colágeno y mejora la elasticidad' },
    ],
    beauty_resultados: [
      { nombre: 'Ana M.', calificacion: 5, testimonio: 'En 2 semanas mi piel se ve más luminosa y las manchas han disminuido visiblemente.', antes: foto('antes1', 400, 400), despues: foto('despues1', 400, 400) },
      { nombre: 'María G.', calificacion: 5, testimonio: 'Me encanta la textura y cómo hidrata mi piel. Mis líneas de expresión se ven mucho mejor.', antes: foto('antes2', 400, 400), despues: foto('despues2', 400, 400) },
      { nombre: 'Laura P.', calificacion: 5, testimonio: 'Este serum cambió mi piel por completo. Más firme, suave y radiante.', antes: foto('antes3', 400, 400), despues: foto('despues3', 400, 400) },
    ],
    beauty_pasos: [
      { paso: '1', titulo: 'Limpia', descripcion: 'Limpiá tu rostro completamente' },
      { paso: '2', titulo: 'Aplica', descripcion: 'Aplicá 2-3 gotas del serum en tu rostro' },
      { paso: '3', titulo: 'Masajea', descripcion: 'Masajeá suavemente hasta absorber' },
      { paso: '4', titulo: 'Transforma', descripcion: 'Usalo mañana y noche para mejores resultados' },
    ],
  },
};

// Paquetes: Ofertas con estrategia 'normal' del producto.
const OFERTAS = [
  { id: 21, nombre: '3 frascos', estrategia: 'normal', tipo_contenido: 'pack', unidades: 3, precio: 990000, precio_efectivo: 990000, imagen: foto('pack3') },
  { id: 22, nombre: '6 frascos', estrategia: 'normal', tipo_contenido: 'pack', unidades: 6, precio: 1740000, precio_efectivo: 1740000, imagen: foto('pack6') },
  // Order bump: NO debe aparecer en la ficha, va en el checkout.
  { id: 23, nombre: 'Contorno de ojos', estrategia: 'order_bump', tipo_contenido: 'combo', precio: 119000 },
];

// Lo que el comercio configura desde el panel del armador.
const FICHA_LANDING = {
  prueba_social: {
    activo: true,
    etiqueta: 'Excelente',
    calificacion: 4.8,
    resenas_texto: '+12.847 reseñas verificadas',
    clientes_texto: '+25.000 clientas satisfechas',
    avatares: [{ nombre: 'Ana Martínez' }, { nombre: 'Sofía Rodríguez' }, { nombre: 'Laura Pérez' }],
  },
  precio: {
    packs: {
      21: { badge: 'Más vendido', subtitulo: '90 ml' },
      22: { badge: 'Mejor valor', subtitulo: '180 ml' },
    },
    etiqueta_individual: '1 frasco',
    suscripcion: { activo: true, titulo: 'Suscripción: 15% adicional + envío gratis siempre' },
  },
};

const FICHA_PRODUCTO = {
  hero: {
    etiqueta: 'Más vendido #1',
    eyebrow: 'en serums faciales',
    titulo: 'Piel radiante, hidratada y joven en 7 días',
    subtitulo: 'Serum Glow Renew — Fórmula avanzada',
  },
};

const TEMAS = {
  'Beauty (rosa)': { fondo: '#FFF7F8', texto: '#3A2A2E', acento: '#E4577C' },
  'Beauty (claro)': { fondo: '#FBEFEF', texto: '#3A2A2E', acento: '#C25A72' },
  'Oscuro': { fondo: '#17121A', texto: '#F6EEF2', acento: '#F0709A' },
};

export default function DevFichaBeauty() {
  const [temaNombre, setTemaNombre] = useState('Beauty (rosa)');
  const [movil, setMovil] = useState(false);
  const [sinDatos, setSinDatos] = useState(false);
  const [crudo, setCrudo] = useState(true);
  const [panel, setPanel] = useState(false);
  // Lo que el producto pisa en esta landing: arranca en null, que es
  // justamente el estado en el que el panel se rompía.
  const [fichaProducto, setFichaProducto] = useState(null);

  const producto = sinDatos ? { nombre: PRODUCTO.nombre, categoria: PRODUCTO.categoria } : PRODUCTO;

  const ficha = resolverFichaBeauty(
    fichaProducto ?? (sinDatos ? null : FICHA_PRODUCTO),
    sinDatos ? null : FICHA_LANDING,
    fichaBeautyDesdeProducto(producto)
  );

  const item = armarItemFicha({
    nombre: producto.nombre,
    categoria: producto.categoria,
    descripcion: producto.propuesta_valor,
    precio: 390000,
    precioAntes: 490000,
    imagenes: sinDatos ? [] : [foto('serum1'), foto('serum2'), foto('serum3'), foto('serum4')],
    ofertas: sinDatos ? [] : OFERTAS,
    faq: sinDatos ? [] : [
      { pregunta: '¿Cuánto tiempo tarda en ver resultados?', respuesta: 'La mayoría nota más luminosidad en la primera semana y cambios visibles a las 4 semanas de uso constante.' },
      { pregunta: '¿Cómo debo aplicar el serum?', respuesta: '2 a 3 gotas sobre el rostro limpio, mañana y noche, masajeando hasta absorber.' },
      { pregunta: '¿Es adecuado para piel sensible?', respuesta: 'Sí. Está dermatológicamente probado y no contiene fragancias añadidas.' },
      { pregunta: '¿Tiene efectos secundarios?', respuesta: 'No se reportaron. Ante dudas, consultá con tu dermatóloga.' },
      { pregunta: '¿Puedo usarlo con otros productos?', respuesta: 'Sí, aplicalo antes de la crema hidratante.' },
      { pregunta: '¿Hacen envíos internacionales?', respuesta: 'Enviamos a todo Paraguay con seguimiento incluido.' },
    ],
    relacionados: sinDatos ? [] : [
      { id: 31, nombre: 'Crema hidratante', descripcion: 'Hidratación 24h + protección', precio: 240000, imagen: foto('crema') },
      { id: 32, nombre: 'Contorno de ojos', descripcion: 'Reduce ojeras y líneas de expresión', precio: 190000, imagen: foto('contorno') },
      { id: 33, nombre: 'Limpiador facial', descripcion: 'Limpieza profunda y suave', precio: 160000, imagen: foto('limpiador') },
      { id: 34, nombre: 'Pack completo', descripcion: 'Rutina completa, ahorrá 30%', precio: 490000, precio_ancla: 700000, imagen: foto('packc') },
    ],
    relacionadosTitulo: '',
  });

  const btn = (activo) => ({
    fontSize: 11, padding: '4px 8px', border: 0, borderRadius: 5,
    background: activo ? '#fff' : '#333', color: activo ? '#000' : '#fff',
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', zIndex: 99, top: 8, right: 8, display: 'flex', gap: 6, background: '#111', padding: 6, borderRadius: 8 }}>
        {Object.keys(TEMAS).map(n => (
          <button key={n} onClick={() => setTemaNombre(n)} style={btn(n === temaNombre)}>{n}</button>
        ))}
        <button onClick={() => setMovil(!movil)} style={btn(movil)}>Móvil</button>
        <button onClick={() => setSinDatos(!sinDatos)} style={btn(sinDatos)}>Sin datos</button>
        <button onClick={() => setCrudo(!crudo)} style={btn(crudo)} data-test="tema-crudo">Tema crudo</button>
        <button onClick={() => setPanel(!panel)} style={btn(panel)} data-test="abrir-panel">Panel</button>
      </div>
      {panel && (
        <div
          data-test="panel-ficha"
          style={{
            position: 'fixed', zIndex: 90, top: 44, left: 0, bottom: 0, width: 330,
            overflowY: 'auto', padding: 12, background: '#0f1420', color: '#e8ecf5',
            borderRight: '1px solid rgba(255,255,255,.12)',
          }}
        >
          <FichaBeautyPanel
            ficha={fichaProducto}
            fichaResuelta={ficha}
            fichaLanding={sinDatos ? null : FICHA_LANDING}
            fichaDelProducto={fichaBeautyDesdeProducto(producto)}
            packs={OFERTAS.filter(o => o.estrategia === 'normal')}
            respaldos={{ titulo: producto.nombre, eyebrow: producto.categoria, lead: producto.propuesta_valor }}
            modo="producto"
            onChange={setFichaProducto}
          />
        </div>
      )}

      {/* Header con el tema CRUDO (fondo/texto/acento en null), que es como
          llega desde el editor cuando el comercio no tocó los colores: es el
          caso que lo dejaba negro. Ahora lo resuelve el propio header. */}
      <StoreHeader
        templateSlug="beauty-skincare"
        nombreComercio="Beauty & Skin Care"
        isMobile={movil}
        tema={crudo ? { fondo: null, texto: null, acento: null } : TEMAS[temaNombre]}
        previewMode
        linkInicio="#" linkCatalogo="#" linkContacto="#"
      />
      <BeautyProductPage
        item={item}
        ficha={ficha}
        tema={TEMAS[temaNombre]}
        isMobile={movil}
        previewMode
        onVolver={() => {}}
        onComprar={() => {}}
        onAgregar={() => {}}
      />
    </div>
  );
}
