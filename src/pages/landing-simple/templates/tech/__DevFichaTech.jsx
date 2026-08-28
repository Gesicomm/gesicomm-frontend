import React, { useState } from 'react';
import TechProductPage from './TechProductPage';
import { resolverFichaTech, fichaTechDesdeProducto } from './fichaTech';
import { armarItemFicha } from '../fichaComun';

const PRODUCTO = {
  nombre: 'Auriculares Inalámbricos ProSound Max con cancelación activa de ruido',
  categoria: 'Auriculares',
  propuesta_valor: 'Sonido premium. Comodidad extrema. Tecnología de última generación.',
  beneficios: [
    { titulo: 'Sonido Hi-Fi con bajos profundos', texto: 'Audio de alta definición.' },
    { titulo: 'Cancelación activa de ruido', texto: 'Bloquea el ruido externo al 95%.' },
    { titulo: 'Hasta 50 horas de batería', texto: 'Reproducción continua.' },
    { titulo: 'Bluetooth 5.3 estable', texto: 'Conexión de última generación.' },
  ],
  confianza: [
    { icono: 'ShieldCheck', texto: 'Garantía 2 años' },
    { icono: 'RotateCcw', texto: 'Devoluciones 30 días' },
    { icono: 'Truck', texto: 'Envío gratis' },
    { icono: 'Headphones', texto: 'Soporte 24/7' },
  ],
  // Lo que se carga en Mis Productos → Ficha del rubro (rubro tecnología).
  ficha_rubro: 'tecnologia',
  ficha_datos: {
    especificaciones: [
      { clave: 'Conectividad', valor: 'Bluetooth 5.3' },
      { clave: 'Alcance', valor: 'Hasta 15 metros' },
      { clave: 'Batería', valor: '50 horas de reproducción' },
      { clave: 'Tiempo de carga', valor: '2 horas' },
      { clave: 'Peso', valor: '250 g' },
      { clave: 'Compatibilidad', valor: 'iOS, Android, Windows, Mac' },
    ],
    en_la_caja: [
      '1x Auriculares ProSound Max',
      '1x Cable de carga USB-C',
      '1x Cable de audio 3.5 mm',
      '1x Estuche de viaje',
      '1x Manual de usuario',
    ],
    comparativa: [
      { caracteristica: 'Sonido Hi-Fi premium', nosotros: true, otros: false },
      { caracteristica: 'Cancelación de ruido ANC', nosotros: true, otros: false },
      { caracteristica: 'Batería 50 horas', nosotros: true, otros: false },
      { caracteristica: 'Bluetooth 5.3', nosotros: true, otros: true },
      { caracteristica: 'Garantía 2 años', nosotros: true, otros: false },
    ],
  },
};

const FICHA_PRODUCTO = {
  prueba_social: { activo: true, calificacion: 4.8, resenas_texto: '1.248 reseñas', clientes_texto: '+5.000 clientes satisfechos' },
  precio: { activo: true, cuotas_texto: 'o 3 cuotas sin interés de 366.000 Gs' },
  resenas: {
    activo: true,
    items: [
      { nombre: 'María G.', calificacion: 5, comentario: 'La calidad de sonido es increíble, la cancelación funciona perfecto.', verificada: true },
      { nombre: 'Carlos M.', calificacion: 5, comentario: 'Batería que dura días enteros. Perfectos para viajes largos.', verificada: true },
      { nombre: 'Ana L.', calificacion: 4, comentario: 'Muy cómodos y ligeros. Los uso todo el día sin molestia.', verificada: false },
    ],
  },
  comparativa: { activo: true, nosotros: 'ProSound Max', otros: 'Otras marcas' },
  multimedia: {
    activo: true,
    items: [
      { titulo: 'Video demostrativo', video: true },
      { titulo: 'Cancelación de ruido', video: true },
      { titulo: '50 horas de batería' },
      { titulo: 'Diseño plegable' },
    ],
  },
};

const TEMAS = {
  'Tech (oscuro)': { fondo: '#0B1220', texto: '#E5EEF7', acento: '#3AB0FF' },
  'Violeta claro': { fondo: '#F7F7F8', texto: '#111114', acento: '#7134C9' },
  'Fitness (naranja)': { fondo: '#0B0B0E', texto: '#FFFFFF', acento: '#FF5A1F' },
};

export default function DevFichaTech() {
  const [temaNombre, setTemaNombre] = useState('Violeta claro');
  const [movil, setMovil] = useState(false);

  const ficha = resolverFichaTech(
    FICHA_PRODUCTO,
    { hero: { titulo_destacado: 'ProSound Max' } },
    fichaTechDesdeProducto(PRODUCTO)
  );

  const item = armarItemFicha({
    nombre: PRODUCTO.nombre,
    categoria: PRODUCTO.categoria,
    descripcion: PRODUCTO.propuesta_valor,
    precio: 1099000,
    precioAntes: 1465000,
    imagenes: [],
    variantes: [
      { id: 1, nombre: 'Premium', precio_efectivo: 1319000, stock: 5 },
      { id: 2, nombre: 'Edición limitada', precio_efectivo: 1499000, stock: 0 },
    ],
    faq: [
      { pregunta: '¿Cuánto dura la batería?', respuesta: 'Hasta 50 horas de reproducción y carga rápida por USB-C.' },
      { pregunta: '¿Cómo funciona la cancelación de ruido?', respuesta: 'El ANC genera una señal opuesta al ruido exterior y lo reduce hasta un 95%.' },
      { pregunta: '¿Es compatible con mi dispositivo?', respuesta: 'Sí: iOS, Android, Windows, Mac y cualquier equipo con Bluetooth 5.3.' },
      { pregunta: '¿Tiene garantía?', respuesta: 'Garantía oficial de 2 años y soporte 24/7.' },
    ],
    relacionados: [
      { id: 9, nombre: 'Estuche de viaje premium', precio: 149000, precio_ancla: 189000 },
      { id: 10, nombre: 'Cable USB-C premium', precio: 79000 },
    ],
    relacionadosTitulo: 'Complementá tu compra',
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', zIndex: 99, top: 8, right: 8, display: 'flex', gap: 6, background: '#111', padding: 6, borderRadius: 8 }}>
        {Object.keys(TEMAS).map(n => (
          <button key={n} onClick={() => setTemaNombre(n)} style={{ fontSize: 11, padding: '4px 8px', background: n === temaNombre ? '#fff' : '#333', color: n === temaNombre ? '#000' : '#fff', border: 0, borderRadius: 5 }}>{n}</button>
        ))}
        <button onClick={() => setMovil(!movil)} style={{ fontSize: 11, padding: '4px 8px', background: movil ? '#fff' : '#333', color: movil ? '#000' : '#fff', border: 0, borderRadius: 5 }}>Móvil</button>
      </div>
      <TechProductPage
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
