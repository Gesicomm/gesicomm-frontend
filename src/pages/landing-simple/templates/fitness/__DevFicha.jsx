import React, { useState } from 'react';
import FitnessProductPage from './FitnessProductPage';
import { armarItemFicha, resolverFichaFitness, fichaDesdeMarketing } from './fichaFitness';

const PRODUCTO = {
  nombre: 'AdelFit - Suplemento natural para bajar de peso y controlar el apetito',
  categoria: 'Proteínas',
  propuesta_valor: 'Proteína aislada de rápida absorción para recuperar mejor después de cada entrenamiento.',
  beneficios: [
    { titulo: 'Recuperación más rápida', texto: 'Menos dolor muscular al día siguiente.' },
    { titulo: 'Masa magra', texto: '27 g de proteína por medida.' },
    { titulo: 'Sin azúcar agregada', texto: 'Menos de 1 g de carbohidratos.' },
    { titulo: 'Se disuelve al instante', texto: 'Sin grumos, con agua o leche.' },
  ],
  confianza: [
    { icono: 'ShieldCheck', texto: 'Garantía de 30 días' },
    { icono: 'Truck', texto: 'Envío a todo el país' },
    { icono: 'RotateCcw', texto: 'Cambios sin vueltas' },
    { icono: 'Headphones', texto: 'Asesoría gratuita' },
  ],
};

const FICHA_PRODUCTO = {
  prueba_social: {
    activo: true, etiqueta: 'Excelente', calificacion: 4.8,
    resenas_texto: '+2.847 reseñas verificadas',
    clientes_texto: '+10.000 clientes satisfechos',
    avatares: [{ nombre: 'María González' }, { nombre: 'Juan Pérez' }, { nombre: 'Carlos Rojas' }],
  },
  ingredientes: {
    activo: true, titulo: 'Qué lleva cada medida',
    items: [
      { icono: 'leaf', nombre: 'Proteína aislada', dosis: '27g', texto: 'Absorción rápida, ideal post entrenamiento.' },
      { icono: 'zap', nombre: 'BCAA', dosis: '5.5g', texto: 'Reduce el catabolismo muscular.' },
      { icono: 'droplet', nombre: 'Glutamina', dosis: '4g', texto: 'Acelera la recuperación.' },
      { icono: 'shield', nombre: 'Enzimas digestivas', dosis: '50mg', texto: 'Evita la hinchazón.' },
    ],
  },
  opiniones: {
    activo: true, titulo: 'Lo que dicen nuestros clientes',
    items: [
      { nombre: 'Juan P.', calificacion: 5, comentario: 'La mejor que probé. Se disuelve perfecto y el sabor no empalaga.' },
      { nombre: 'María G.', calificacion: 5, comentario: 'En dos semanas noté muchísimo la diferencia en la recuperación.' },
      { nombre: 'Carlos R.', calificacion: 4, comentario: 'Buena relación precio-calidad, y llegó al día siguiente.' },
    ],
  },
  como_funciona: {
    activo: true, titulo: 'Cómo se toma',
    pasos: [
      { icono: 'package', titulo: 'Medí', texto: 'Una medida rasa en 250 ml de agua.' },
      { icono: 'droplet', titulo: 'Mezclá', texto: 'Agitá 15 segundos en la coctelera.' },
      { icono: 'zap', titulo: 'Tomá', texto: 'Dentro de los 30 min post entrenamiento.' },
      { icono: 'thumbs-up', titulo: 'Resultados', texto: 'Mejor recuperación desde la primera semana.' },
    ],
  },
};

const OFERTAS = [
  { id: 1, nombre: 'Pack x2', estrategia: 'normal', tipo_contenido: 'pack', unidades: 2, precio: 460000, precio_efectivo: 460000 },
  { id: 2, nombre: 'Pack x3', estrategia: 'normal', tipo_contenido: 'pack', unidades: 3, precio: 630000, precio_efectivo: 630000 },
];

const TEMAS = {
  'Fitness (oscuro)': { fondo: '#0B0B0E', texto: '#FFFFFF', acento: '#FF5A1F' },
  'Claro': { fondo: '#F7F8F6', texto: '#17231C', acento: '#238B35' },
  'Beauty': { fondo: '#FBEFEF', texto: '#3A2A2E', acento: '#C25A72' },
};

export default function DevFicha() {
  const [temaNombre, setTemaNombre] = useState('Fitness (oscuro)');
  const [movil, setMovil] = useState(false);

  const ficha = resolverFichaFitness(FICHA_PRODUCTO, {
    ofertas: { packs: { 1: { badge: 'Más vendido', subtitulo: '2 potes' }, 2: { badge: 'Mejor valor', subtitulo: '3 potes' } }, suscripcion: { activo: true, titulo: 'Suscribite y ahorrá 10%', detalle: 'Te llega cada 30 días. Cancelás cuando quieras.' } },
    hero: { cta_texto: 'Comprar ahora con descuento' },
  }, fichaDesdeMarketing(PRODUCTO));

  const item = armarItemFicha({
    nombre: PRODUCTO.nombre,
    categoria: PRODUCTO.categoria,
    descripcion: PRODUCTO.propuesta_valor,
    precio: 249000,
    precioAntes: 299000,
    imagenes: [],
    ofertas: OFERTAS,
    faq: [
      { pregunta: '¿Cuánto tiempo tarda en hacer efecto?', respuesta: 'La mayoría nota mejor recuperación en las primeras dos semanas de uso constante.' },
      { pregunta: '¿Cómo debo tomarlo?', respuesta: 'Una medida con 250 ml de agua, después de entrenar.' },
      { pregunta: '¿Tiene efectos secundarios?', respuesta: 'No contiene estimulantes. Consultá a tu médico si estás embarazada.' },
      { pregunta: '¿Hacen envíos al interior?', respuesta: 'Sí, a todo Paraguay. Envío gratis en compras mayores a 300.000 Gs.' },
    ],
    relacionados: [
      { id: 9, nombre: 'Creatina Monohidratada', precio: 189000, precio_ancla: 220000, descripcion: 'Fuerza y potencia' },
      { id: 10, nombre: 'Multivitamínico', precio: 99000, descripcion: 'Sistema inmune' },
    ],
    relacionadosTitulo: 'Complementá tu rutina',
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', zIndex: 99, top: 8, right: 8, display: 'flex', gap: 6, background: '#111', padding: 6, borderRadius: 8 }}>
        {Object.keys(TEMAS).map(n => (
          <button key={n} onClick={() => setTemaNombre(n)} style={{ fontSize: 11, padding: '4px 8px', background: n === temaNombre ? '#fff' : '#333', color: n === temaNombre ? '#000' : '#fff', border: 0, borderRadius: 5 }}>{n}</button>
        ))}
        <button onClick={() => setMovil(!movil)} style={{ fontSize: 11, padding: '4px 8px', background: movil ? '#fff' : '#333', color: movil ? '#000' : '#fff', border: 0, borderRadius: 5 }}>Móvil</button>
      </div>
      <FitnessProductPage
        item={item}
        ficha={ficha}
        tema={TEMAS[temaNombre]}
        isMobile={movil}
        previewMode
        onVolver={() => {}}
        onComprar={() => {}}
      />
    </div>
  );
}
