import React from 'react';
import { useParams } from 'react-router-dom';
import LandingCodigoPublica from './LandingCodigoPublica';
import { PLANTILLA_INICIO } from './plantillasBaseCodigo';

/**
 * Banco de pruebas del lienzo en blanco publicado, sin backend: la misma
 * LandingCodigoPublica (iframe + carrito + checkout) con un catálogo falso
 * que trae order bump, upsell y productos para cross-sell. Sirve para
 * revisar el recorrido de compra entero sin una landing real.
 *
 * El slug no existe: "Confirmar pedido" falla con 404 y nunca crea nada.
 * Se borra junto con la ruta /dev/lienzo cuando ya no haga falta.
 */

// Imágenes de public/__dev-lienzo: el runtime solo acepta imágenes http(s).
const foto = nombre => `${window.location.origin}/__dev-lienzo/${nombre}.png`;

const IMPLEMENTA = { nombre: 'Implementa · Suplemento natural para dolores articulares', imagen: foto('implementa') };

const ADELFIT = {
  content_id: 'adelfit',
  referencia_id: 1,
  tipo: 'producto',
  nombre: 'AdelFit – Suplemento natural para bajar de peso y controlar el apetito',
  descripcion: 'Cápsulas naturales que ayudan a bloquear la absorción de grasa, acelerar el metabolismo y controlar el apetito.',
  descripcion_larga: 'AdelFit es la solución natural diseñada para potenciar tu pérdida de peso de forma segura.\n\nSu fórmula termogénica acompaña la quema de calorías y ayuda a reducir la ansiedad por dulces.',
  precio: 40000,
  precio_antes: 55000,
  imagen: foto('adelfit'),
  imagenes: [foto('adelfit')],
  categoria: 'Suplementos',
  stock: 50,
  variantes: [],
  ofertas: [
    {
      id: 901,
      nombre: 'Implementa · Suplemento natural para dolores articulares y óseos',
      estrategia: 'order_bump',
      descripcion: null,
      precio_normal: 170000,
      precio_efectivo: 120000,
      imagen: IMPLEMENTA.imagen,
      producto_complementario: IMPLEMENTA,
    },
    {
      id: 902,
      nombre: 'Llevá 2 AdelFit más con 40% OFF',
      estrategia: 'upsell',
      descripcion: 'Completá el tratamiento de 90 días al mejor precio.',
      precio_normal: 80000,
      precio_efectivo: 48000,
      imagen: foto('adelfit2'),
      producto_complementario: { nombre: 'AdelFit', imagen: foto('adelfit') },
      beneficios: ['Tratamiento completo de 90 días', 'Mismo envío, sin costo extra'],
    },
  ],
};

const OTROS = [
  { content_id: 'colageno', referencia_id: 2, tipo: 'producto', nombre: 'Colágeno hidrolizado 300 g', precio: 95000, precio_antes: 120000, imagen: foto('colageno'), categoria: 'Suplementos', stock: 20, variantes: [], ofertas: [], etiqueta: 'Más vendido' },
  { content_id: 'magnesio', referencia_id: 3, tipo: 'producto', nombre: 'Citrato de magnesio 120 cápsulas', precio: 65000, imagen: foto('magnesio'), categoria: 'Suplementos', stock: 20, variantes: [], ofertas: [] },
  { content_id: 'shaker', referencia_id: 4, tipo: 'producto', nombre: 'Shaker 700 ml', precio: 35000, imagen: foto('shaker'), categoria: 'Accesorios', stock: 20, variantes: [], ofertas: [] },
];

function datos(productId, fondoMarca) {
  const finOferta = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
  return {
    disponible: true,
    titulo: 'Ecom',
    tienda: { nombre: 'Ecom', colores: { primario: '#16a36a', secundario: '#ffb547', fondo: fondoMarca } },
    // Tema guardado de la tienda (fondo de marca de Mi Tienda).
    tema: { fondo: fondoMarca, primario: '#16a36a' },
    contacto_landing: { whatsapp: '0981123456', instagram: '@ecom.py', facebook: 'ecompy', tiktok: '@ecom.py', email: 'hola@ecom.com.py' },
    content: {
      codigo: PLANTILLA_INICIO,
      venta: {
        tipo: 'catalogo',
        urgencia: { activo: true, fin_at: finOferta, estado: 'confirmado' },
      },
    },
    template: { kind: 'codigo' },
    catalogo_items: [ADELFIT, ...OTROS],
    items: [ADELFIT, ...OTROS],
    producto: productId ? [ADELFIT, ...OTROS].find(p => p.content_id === productId) : null,
    checkout: { pasarelas: [] },
    delivery_ciudades: [{ ciudad: 'Asunción', departamento: 'Central', precio: 20000 }, { ciudad: 'Luque', departamento: 'Central', precio: 25000 }],
  };
}

export default function DevLienzo() {
  const { productId } = useParams();
  const data = React.useMemo(() => datos(productId, '#ffffff'), [productId]);
  return (
    <LandingCodigoPublica
      codigo={data.content.codigo}
      titulo="Ecom"
      data={data}
      slug="dev-lienzo-sin-backend"
      productId={productId || null}
    />
  );
}
