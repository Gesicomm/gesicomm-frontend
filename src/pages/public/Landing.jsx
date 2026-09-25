import React, { useRef } from 'react';
import { ArrowRight, CheckCircle2, Package, Tag, ShoppingCart, Users, BarChart3, TrendingUp, ShieldCheck, Mail, Zap, LayoutDashboard, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

import Seo, { SITIO, SCHEMA_ORGANIZACION } from '../../components/public/Seo';
import { Container, Section, SectionHeading, Eyebrow } from '../../components/public/Section';
import Accordion from '../../components/public/Accordion';
import Button from '../../components/public/Button';
import CTA from '../../components/public/CTA';
import { trackearEvento, generarEventId } from '../../lib/metaPixel';

// -- DATOS DE EJEMPLO PARA MOCKUPS HTML --

const REGISTRO_STOCK = [
  { id: '1', nombre: 'Remera Básica Blanca', sku: 'REM-BLA-M', stock: 42, precio: '85.000' },
  { id: '2', nombre: 'Jeans Clásico Azul', sku: 'JEA-AZU-40', stock: 15, precio: '220.000' },
  { id: '3', nombre: 'Campera de Cuero', sku: 'CAM-CUE-L', stock: 5, precio: '450.000', alerta: true },
];

const REGISTRO_PEDIDOS = [
  { id: '#1044', cliente: 'María López', fecha: 'Hoy, 10:30', total: '305.000', estado: 'Confirmado', tono: 'text-info', bg: 'bg-info/10' },
  { id: '#1043', cliente: 'Carlos Ruiz', fecha: 'Ayer, 18:15', total: '85.000', estado: 'En armado', tono: 'text-warning', bg: 'bg-warning/10' },
  { id: '#1042', cliente: 'Ana Torres', fecha: 'Ayer, 14:20', total: '450.000', estado: 'Despachado', tono: 'text-fg-muted', bg: 'bg-surface-2' },
  { id: '#1041', cliente: 'Jorge Silva', fecha: '12 Sep', total: '120.000', estado: 'Entregado', tono: 'text-success', bg: 'bg-success/10' },
];

const REGISTRO_CLIENTES = [
  { metrica: 'Clientes con pedido', valor: '1.248', tendencia: '+12%' },
  { metrica: 'Tasa de recompra', valor: '34%', tendencia: '+5%' },
  { metrica: 'Ticket promedio', valor: 'Gs. 210.000', tendencia: '-2%' },
];

// -- INTEGRACIONES --

const INTEGRACIONES = [
  {
    nombre: 'Meta Pixel y Conversions API',
    color: '#3d5fa3',
    descripcion: 'Agregá tu ID de Pixel y token CAPI en un clic para que los eventos de tu tienda alimenten tus campañas. Esta integración no requiere inicio de sesión con Meta.',
  },
];

const CANALES_SIN_API = [
  {
    nombre: 'WhatsApp',
    color: '#25D366',
    descripcion: 'El botón de tu vitrina genera un enlace wa.me que abre la aplicación de WhatsApp en el dispositivo de tu visitante. La conversación ocurre directamente entre esa persona y vos, fuera de Gesicom. Hoy no hay integración de mensajería dentro de la plataforma.',
  },
];

// -- FAQ --

const PREGUNTAS = [
  {
    pregunta: '¿Tengo que saber programar o de diseño para armar mi tienda?',
    respuesta: 'No. Gesicom incluye plantillas listas para usar que completás con tu información, y si preferís podés armar algo desde cero con bloques visuales sin tocar una sola línea de código.',
  },
  {
    pregunta: '¿Funciona en el celular?',
    respuesta: 'Sí. Tanto la tienda que ven tus clientes como el panel donde vos administrás tu negocio están adaptados para funcionar en computadoras, tablets y celulares.',
  },
  {
    pregunta: '¿Tengo que instalar algo para empezar?',
    respuesta: 'Todo funciona desde el navegador web. Te creás la cuenta y ya estás adentro de tu panel listo para cargar tus productos y configurar tus precios.',
  },
  {
    pregunta: '¿Mis clientes tienen que descargarse una app para comprarme?',
    respuesta: 'No, tus clientes entran a tu tienda desde el enlace que vos compartas y compran directamente en la web desde su propio navegador.',
  },
  {
    pregunta: '¿Cómo conecto mi propio dominio?',
    respuesta: 'Si ya tenés un dominio (ej. mi-marca.com), podés apuntarlo a Gesicom modificando los registros DNS en la plataforma donde lo compraste. Nuestro equipo te guía si necesitás asistencia técnica.',
  },
  {
    pregunta: '¿Qué formas de pago puedo ofrecer a mis clientes?',
    respuesta: 'Podés configurar transferencias bancarias, efectivo, giros y billeteras digitales. Si tenés cuenta en PagoPar, también podés integrar cobros con tarjeta y códigos QR directamente en el carrito de tu tienda.',
  },
  {
    pregunta: '¿Cobran comisiones por las ventas que realizo?',
    respuesta: 'Nosotros no te cobramos comisiones por venta. El único gasto que vas a tener en Gesicom es el costo de tu plan. (Si integrás plataformas de pago de terceros, ellos sí pueden cobrar sus propios aranceles de transacción).',
  },
  {
    pregunta: '¿A qué se refiere "nivel de miembros fundadores"?',
    respuesta: 'Son los primeros clientes pagos en Paraguay que acceden a un precio especial que se mantiene congelado mientras la suscripción no se interrumpa. También acceden a beneficios, programas y formación exclusiva que se suman al ecosistema Gesicom.',
  },
];

// --- ANIMATION VARIANTS ---
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};

const fadeUpDelayed = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] } }
};

const fadeLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};

const fadeRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const popIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

function GlowBlob({ color, size, top, left, right, bottom, delay = 0 }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: [0.15, 0.3, 0.15],
        scale: [1, 1.05, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: "easeInOut" }}
      className={`absolute rounded-full blur-[100px] pointer-events-none -z-10`}
      style={{ 
        backgroundColor: color, 
        width: size, 
        height: size,
        top, left, right, bottom
      }}
    />
  );
}

function FloatingMockup({ children, title, delay = 0 }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.4 } }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent opacity-0 blur transition-opacity duration-500 group-hover:opacity-100"></div>
      <div className="relative flex w-full flex-col overflow-hidden rounded-xl border border-border/80 bg-canvas/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-2 border-b border-border/50 bg-surface/80 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-border-strong/80"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-border-strong/80"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-border-strong/80"></div>
          </div>
          <div className="mx-auto flex h-6 w-1/2 items-center justify-center rounded bg-surface-2 px-2 text-[10px] text-fg-subtle">
            gesicomm.com/panel/{title.toLowerCase()}
          </div>
        </div>
        <div className="bg-canvas p-4 sm:p-5">{children}</div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      SCHEMA_ORGANIZACION,
      {
        '@type': 'WebSite',
        '@id': `${SITIO}/#sitio`,
        url: SITIO,
        name: 'Gesicom',
        inLanguage: 'es',
        publisher: { '@id': `${SITIO}/#organizacion` },
      },
      {
        '@type': 'WebPage',
        '@id': `${SITIO}/#webpage`,
        url: SITIO,
        name: 'Gesicom | Todo en un solo lugar',
        description: 'La plataforma que une tu tienda, tu catálogo y tus ventas en un panel simple.',
        isPartOf: { '@id': `${SITIO}/#sitio` },
        inLanguage: 'es',
      },
    ],
  };

  return (
    <>
      <Seo 
        titulo="Gesicom | Gestioná tu negocio e-commerce"
        descripcion="Creá tu tienda online, cargá tus productos y gestioná tus pedidos, clientes y ventas desde un solo lugar. Simple y profesional."
        ruta="/"
        schema={schema} 
      />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-40 sm:pb-32">
        <GlowBlob color="var(--primary)" size="600px" top="-200px" left="-100px" />
        <GlowBlob color="#0ea5e9" size="500px" top="100px" right="-150px" delay={2} />
        
        <Container>
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-2xl"
            >
              <motion.div variants={fadeUp}>
                <Eyebrow className="mb-6"><Zap size={14} className="inline mr-1" /> Todo en un solo lugar</Eyebrow>
              </motion.div>
              <motion.h1 
                variants={fadeUp}
                className="titular text-[2.75rem] leading-[1.1] tracking-tight text-fg sm:text-[3.5rem] lg:text-[4rem]"
              >
                Vender online debería ser más <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-hover">simple</span>.
              </motion.h1>
              <motion.p 
                variants={fadeUp}
                className="mt-6 text-lg leading-relaxed text-fg-muted sm:text-xl"
              >
                Gesicom es la plataforma que une tu tienda, tu catálogo y tus ventas en un panel pensado para que entiendas qué pasa en tu negocio sin ser técnico.
              </motion.p>
              
              <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
                <Button
                  to="/registro"
                  tamano="lg"
                  onClick={() => trackearEvento('Lead', generarEventId())}
                  className="shadow-lg shadow-primary/20"
                >
                  Registrarse
                  <ArrowRight size={17} aria-hidden="true" />
                </Button>
                <Button
                  to="/planes"
                  variante="secundario"
                  tamano="lg"
                >
                  Ver planes
                </Button>
              </motion.div>
              
              <motion.div variants={fadeUpDelayed} className="mt-8 flex items-center gap-3 text-sm text-fg-subtle">
                <CheckCircle2 size={16} className="text-success" /> Sin comisiones por venta. No requiere instalación.
              </motion.div>
            </motion.div>

            {/* MOCKUP VISUAL */}
            <motion.div 
              initial={{ opacity: 0, rotateY: 15, x: 50 }}
              animate={{ opacity: 1, rotateY: 0, x: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ perspective: 1000 }}
              className="relative hidden lg:block"
            >
              <FloatingMockup title="Resumen" delay={0.2}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-surface-2 p-4">
                    <span className="text-sm font-medium text-fg-muted">Ventas de hoy</span>
                    <strong className="mt-1 block text-2xl text-fg">Gs. 850.000</strong>
                    <span className="mt-2 inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-xs font-semibold text-success">
                      <TrendingUp size={12} /> +12%
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 p-4">
                    <span className="text-sm font-medium text-fg-muted">Nuevos Pedidos</span>
                    <strong className="mt-1 block text-2xl text-fg">14</strong>
                    <span className="mt-2 block text-xs text-fg-subtle">4 pendientes de cobro</span>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-fg">Últimos ingresos</span>
                    <span className="text-xs text-primary-text">Ver todos</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <div>
                        <p className="text-sm font-medium text-fg">Laura M.</p>
                        <p className="text-xs text-fg-subtle">Remera Básica Blanca</p>
                      </div>
                      <span className="text-sm font-semibold text-fg">Gs. 85.000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-fg">Esteban V.</p>
                        <p className="text-xs text-fg-subtle">Campera de Cuero</p>
                      </div>
                      <span className="text-sm font-semibold text-fg">Gs. 450.000</span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-fg-subtle/70">Representación visual. Datos de ejemplo.</p>
              </FloatingMockup>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* EL RECORRIDO (Cómo funciona) */}
      <section id="como-funciona" className="relative overflow-hidden border-t border-border bg-surface-2/30 py-24 lg:py-32">
        <GlowBlob color="var(--primary)" size="400px" top="30%" right="-100px" delay={1} />
        <GlowBlob color="#a855f7" size="500px" bottom="10%" left="-200px" delay={3} />
        
        <Container>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="mx-auto max-w-3xl text-center mb-20"
          >
            <motion.div variants={fadeUp}><Eyebrow>El recorrido</Eyebrow></motion.div>
            <motion.h2 variants={fadeUp} className="titular mt-4 text-3xl text-fg sm:text-4xl">Cómo Gesicom ordena tu negocio</motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg leading-relaxed text-fg-muted">
              Una plataforma que te acompaña desde que publicás un producto hasta que entendés quién te lo compró.
            </motion.p>
          </motion.div>

          <div className="space-y-24 lg:space-y-32">
            {/* 1. Producto */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeRight}
                className="order-2 lg:order-1"
              >
                <FloatingMockup title="Productos">
                  <div className="space-y-2">
                    {REGISTRO_STOCK.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-canvas text-fg-subtle">
                            <Tag size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-fg">{item.nombre}</p>
                            <p className="text-xs text-fg-subtle">SKU: {item.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-fg">Gs. {item.precio}</p>
                          <p className={`text-xs ${item.alerta ? 'text-danger font-medium' : 'text-fg-subtle'}`}>Stock: {item.stock}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-xs text-fg-subtle">Representación del producto. Datos de ejemplo.</p>
                </FloatingMockup>
              </motion.div>
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeLeft}
                className="order-1 lg:order-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shadow-inner text-lg font-bold text-primary-text">1</span>
                <h3 className="titular mt-5 text-2xl text-fg sm:text-3xl">Producto</h3>
                <p className="mt-2 text-lg font-medium text-fg">El punto de partida de tu catálogo.</p>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  Cargá tus productos, organizá el inventario, definí precios y ofertas. Esta es la base de todo: lo que guardás acá es exactamente lo que tus clientes van a ver publicado en tu tienda, sin que tengas que actualizar la información en dos lugares distintos.
                </p>
              </motion.div>
            </div>

            {/* 2. Venta */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeRight}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shadow-inner text-lg font-bold text-primary-text">2</span>
                <h3 className="titular mt-5 text-2xl text-fg sm:text-3xl">Venta</h3>
                <p className="mt-2 text-lg font-medium text-fg">Un catálogo listo para recibir visitas.</p>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  Tus clientes entran a tu sitio, arman su carrito y envían su pedido. Tienen una experiencia rápida y clara, con el diseño que vos elegiste, para que puedan comprarte desde el celular de forma intuitiva.
                </p>
              </motion.div>
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeLeft}
              >
                <FloatingMockup title="Tienda Pública">
                  <div className="rounded border border-border bg-surface p-4">
                    <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
                      <strong className="text-fg">Tu Marca</strong>
                      <ShoppingCart size={18} className="text-fg-subtle" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded border border-border p-2">
                        <div className="mb-2 h-20 rounded bg-canvas"></div>
                        <p className="text-xs font-semibold text-fg">Remera Blanca</p>
                        <p className="text-xs text-fg-muted">Gs. 85.000</p>
                        <button className="mt-2 w-full rounded bg-primary py-1 text-[10px] font-bold text-white">Agregar</button>
                      </div>
                      <div className="rounded border border-border p-2">
                        <div className="mb-2 h-20 rounded bg-canvas"></div>
                        <p className="text-xs font-semibold text-fg">Jeans Azul</p>
                        <p className="text-xs text-fg-muted">Gs. 220.000</p>
                        <button className="mt-2 w-full rounded bg-primary py-1 text-[10px] font-bold text-white">Agregar</button>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs text-fg-subtle">Representación del producto. Datos de ejemplo.</p>
                </FloatingMockup>
              </motion.div>
            </div>

            {/* 3. Pedido */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeRight}
                className="order-2 lg:order-1"
              >
                <FloatingMockup title="Pedidos">
                  <div className="overflow-hidden rounded-lg border border-border bg-surface">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-canvas text-xs text-fg-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">Pedido</th>
                          <th className="px-3 py-2 font-medium">Cliente</th>
                          <th className="px-3 py-2 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {REGISTRO_PEDIDOS.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2 font-medium text-fg">{p.id}</td>
                            <td className="px-3 py-2 text-fg-subtle">{p.cliente}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.tono} ${p.bg}`}>
                                {p.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-center text-xs text-fg-subtle">Representación del producto. Datos de ejemplo.</p>
                </FloatingMockup>
              </motion.div>
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeLeft}
                className="order-1 lg:order-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shadow-inner text-lg font-bold text-primary-text">3</span>
                <h3 className="titular mt-5 text-2xl text-fg sm:text-3xl">Pedido</h3>
                <p className="mt-2 text-lg font-medium text-fg">Todo concentrado en una sola pantalla.</p>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  Apenas el cliente confirma, recibís el detalle ordenado en el panel. Revisá qué compraron, dónde hay que entregarlo, cuánto hay que cobrar y contactá al cliente por WhatsApp directo si necesitás confirmar algo.
                </p>
              </motion.div>
            </div>

            {/* 4. Operación */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeRight}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shadow-inner text-lg font-bold text-primary-text">4</span>
                <h3 className="titular mt-5 text-2xl text-fg sm:text-3xl">Operación</h3>
                <p className="mt-2 text-lg font-medium text-fg">Actualizá estados para mantener el control.</p>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  El stock se descuenta solo al vender. Mantené el orden de lo que tenés que preparar, enviá la información correcta y asegurate de que todo llegue a su destino.
                </p>
              </motion.div>
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeLeft}
              >
                <FloatingMockup title="Operacion">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-fg">Pedido #1044 Confirmado</p>
                        <p className="text-xs text-fg-subtle">Stock descontado automáticamente</p>
                      </div>
                    </div>
                    <div className="ml-4 h-6 border-l-2 border-dashed border-border"></div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning text-white">
                        <Package size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-fg">En Preparación</p>
                        <p className="text-xs text-fg-subtle">Asignando al equipo de armado</p>
                      </div>
                    </div>
                    <div className="ml-4 h-6 border-l-2 border-dashed border-border"></div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface text-fg-muted">
                        <Truck size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-fg-muted">Despacho</p>
                        <p className="text-xs text-fg-subtle">Pendiente de envío</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs text-fg-subtle">Representación del producto. Datos de ejemplo.</p>
                </FloatingMockup>
              </motion.div>
            </div>

            {/* 5. Cliente */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeRight}
                className="order-2 lg:order-1"
              >
                <FloatingMockup title="Clientes">
                  <div className="mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-fg">María López</p>
                        <p className="text-xs text-fg-subtle">Cliente frecuente • 5 pedidos</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {REGISTRO_CLIENTES.map((metrica, i) => (
                      <div key={i} className="rounded border border-border bg-surface p-2 text-center">
                        <p className="text-[10px] text-fg-muted">{metrica.metrica}</p>
                        <p className="mt-1 text-sm font-bold text-fg">{metrica.valor}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-xs text-fg-subtle">Representación del producto. Datos de ejemplo.</p>
                </FloatingMockup>
              </motion.div>
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeLeft}
                className="order-1 lg:order-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shadow-inner text-lg font-bold text-primary-text">5</span>
                <h3 className="titular mt-5 text-2xl text-fg sm:text-3xl">Cliente</h3>
                <p className="mt-2 text-lg font-medium text-fg">Entendé quién compra y quién vuelve.</p>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  Conocé la salud de tu cartera de clientes. Revisá cuántos de ellos vuelven a comprar, cuál es el promedio de gasto y qué volumen de personas confía en tu negocio.
                </p>
              </motion.div>
            </div>

            {/* 6. Decisión */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeRight}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shadow-inner text-lg font-bold text-primary-text">6</span>
                <h3 className="titular mt-5 text-2xl text-fg sm:text-3xl">Decisión</h3>
                <p className="mt-2 text-lg font-medium text-fg">Mirá cómo va tu negocio y decidí con datos.</p>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  Analizá el rendimiento general desde un dashboard central. Vas a tener métricas reales de tus ventas para saber si las cosas van bien o qué necesitás ajustar.
                </p>
              </motion.div>
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeLeft}
              >
                <FloatingMockup title="Dashboard">
                  <div className="mb-4 flex items-end justify-between border-b border-border pb-3">
                    <div>
                      <p className="text-xs text-fg-muted">Ingresos de la semana</p>
                      <p className="text-xl font-bold text-fg">Gs. 3.450.000</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-success">
                      <TrendingUp size={14} /> +24%
                    </div>
                  </div>
                  <div className="flex h-24 items-end justify-between gap-2">
                    {/* Gráfico de barras simulado */}
                    <div className="w-full bg-primary/20 rounded-t-sm h-[40%]"></div>
                    <div className="w-full bg-primary/20 rounded-t-sm h-[60%]"></div>
                    <div className="w-full bg-primary/20 rounded-t-sm h-[30%]"></div>
                    <div className="w-full bg-primary/50 rounded-t-sm h-[80%]"></div>
                    <div className="w-full bg-primary rounded-t-sm h-[100%] shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"></div>
                    <div className="w-full bg-primary/20 rounded-t-sm h-[50%]"></div>
                    <div className="w-full bg-primary/20 rounded-t-sm h-[70%]"></div>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-fg-muted">
                    <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
                  </div>
                  <p className="mt-3 text-center text-xs text-fg-subtle">Representación del producto. Datos de ejemplo.</p>
                </FloatingMockup>
              </motion.div>
            </div>
          </div>
        </Container>
      </section>

      {/* INTEGRACIONES */}
      <Section id="integraciones" className="border-t border-border bg-surface">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
        >
          <SectionHeading
            eyebrow="Integraciones"
            titulo="Conectado con lo que usás"
            descripcion="Gesicom se integra de forma nativa con el ecosistema de Meta para que potencies tus ventas y ordenes la comunicación."
          />
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mt-16"
        >
          <motion.div variants={fadeUp}>
            <h3 className="mb-6 text-lg font-bold text-fg">Disponible actualmente</h3>
          </motion.div>

          {INTEGRACIONES.map((integracion) => (
            <motion.div variants={fadeUp} key={integracion.nombre}>
              <div className="grid gap-x-10 gap-y-5 border-t border-border py-7 lg:grid-cols-[15rem_1fr] hover:bg-surface-2/30 transition-colors duration-300 px-4 rounded-xl -mx-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 flex-shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: integracion.color, color: integracion.color }}
                    />
                    <h3 className="text-base font-semibold text-fg">{integracion.nombre}</h3>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
                    {integracion.descripcion}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          <motion.div variants={fadeUp} className="mt-12 mb-6">
            <h3 className="text-lg font-bold text-fg">En desarrollo</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted max-w-3xl">
              Estamos desarrollando conexiones para gestionar campañas y consultar sus resultados en Meta Ads; publicar contenido en páginas de Facebook y cuentas profesionales de Instagram; y gestionar conversaciones de Instagram y WhatsApp Business con asistencia de IA. Cada función se habilitará cuando esté implementada, y cuente con los permisos correspondientes de Meta y sea autorizada por el cliente.
            </p>
          </motion.div>

          {CANALES_SIN_API.map((canal) => (
            <motion.div variants={fadeUp} key={canal.nombre}>
              <div className="grid gap-x-10 gap-y-5 border-t border-dashed border-border-strong py-7 lg:grid-cols-[15rem_1fr] hover:bg-surface-2/30 transition-colors duration-300 px-4 rounded-xl -mx-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 flex-shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: canal.color, color: canal.color }}
                    />
                    <h3 className="text-base font-semibold text-fg">{canal.nombre}</h3>
                  </div>
                  <p className="cifra mt-2 pl-4 text-xs text-fg-subtle font-medium uppercase tracking-wider">Enlace directo</p>
                </div>

                <p className="min-w-0 max-w-2xl text-sm leading-relaxed text-fg-muted">
                  {canal.descripcion}
                </p>
              </div>
            </motion.div>
          ))}
          <div className="border-t border-border" />
        </motion.div>
      </Section>

      {/* SEGURIDAD */}
      <Section id="seguridad" className="border-t border-border">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-20">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeRight}
          >
            <Eyebrow className="mb-4">Seguridad y Confianza</Eyebrow>
            <h2 className="titular text-3xl text-fg sm:text-[2.6rem]">
              Construido para proteger la información de tu negocio
            </h2>
            <p className="mt-5 text-base leading-relaxed text-fg-muted">
              Sabemos que los datos de tus ventas y de tus clientes son lo más importante. La plataforma cuenta con controles de seguridad diseñados para que operes con tranquilidad.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/politica-privacidad" variante="secundario">
                Ver políticas
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </div>
          </motion.div>

          <motion.dl 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="border-t border-border"
          >
            <motion.div variants={fadeUp} className="border-b border-border py-6 group hover:pl-2 transition-all duration-300">
              <dt className="text-base font-semibold text-fg flex items-center gap-2"><ShieldCheck size={18} className="text-primary-text" /> Tráfico seguro y cifrado</dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted pl-6">La información que viaja hacia y desde la plataforma está protegida mediante protocolos seguros estándar de la industria.</dd>
            </motion.div>
            <motion.div variants={fadeUp} className="border-b border-border py-6 group hover:pl-2 transition-all duration-300">
              <dt className="text-base font-semibold text-fg flex items-center gap-2"><Users size={18} className="text-primary-text" /> Privacidad de datos</dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted pl-6">Tus clientes y tus números te pertenecen. Mantenemos la información de cada negocio aislada y no la compartimos para fines publicitarios de terceros.</dd>
            </motion.div>
            <motion.div variants={fadeUp} className="border-b border-border py-6 group hover:pl-2 transition-all duration-300">
              <dt className="text-base font-semibold text-fg flex items-center gap-2"><CheckCircle2 size={18} className="text-primary-text" /> Soporte y cumplimiento</dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted pl-6">Nuestras prácticas de tratamiento de datos están alineadas con las regulaciones vigentes para que tu operación esté siempre respaldada.</dd>
            </motion.div>
          </motion.dl>
        </div>
      </Section>

      {/* PLANES */}
      <section className="relative overflow-hidden border-t border-border bg-surface py-20 lg:py-32">
        <GlowBlob color="var(--primary)" size="800px" top="-400px" left="50%" style={{ transform: "translateX(-50%)" }} />
        
        <Container>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={popIn}
            className="mx-auto max-w-3xl text-center relative z-10 p-12 rounded-3xl border border-border/50 bg-canvas/40 backdrop-blur-md shadow-xl"
          >
            <h2 className="titular text-3xl text-fg sm:text-4xl">
              Encontrá el plan que mejor acompaña el tamaño de tu negocio
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-fg-muted">
              Opciones claras y transparentes para negocios que recién empiezan o para operaciones que necesitan más volumen.
            </p>
            <div className="mt-10 flex justify-center">
              <Button
                to="/planes"
                tamano="lg"
                className="shadow-xl shadow-primary/20 scale-105"
              >
                Ver planes y precios
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <Section id="faq" className="border-t border-border">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeRight}
          >
            <SectionHeading
              eyebrow="Preguntas frecuentes"
              titulo="Resolvé tus dudas"
              descripcion="Todo lo que necesitás saber antes de empezar a usar Gesicom."
            />
            <p className="mt-6 text-sm leading-relaxed text-fg-muted flex flex-col gap-2">
              <span>¿Tenés otra consulta?</span>
              <a
                href="mailto:contacto@gesicomm.com"
                className="inline-flex items-center gap-2 font-medium text-primary-text hover:text-primary-hover transition-colors w-max bg-primary/5 px-4 py-2 rounded-full"
              >
                <Mail size={16} /> contacto@gesicomm.com
              </a>
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeLeft}
          >
            <div className="border-t border-border">
              <Accordion
                items={PREGUNTAS.map((item) => ({
                  pregunta: item.pregunta,
                  respuesta: item.respuesta,
                }))}
              />
            </div>
          </motion.div>
        </div>
      </Section>

      <CTA
        onClickPrimaria={() => trackearEvento('Lead', generarEventId())}
        onClickSecundaria={() => trackearEvento('Contact', generarEventId())}
      />
    </>
  );
}
