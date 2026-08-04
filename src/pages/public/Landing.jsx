import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  Eye,
  KeyRound,
  LineChart,
  Lock,
  Megaphone,
  MessageCircle,
  Network,
  Package,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import Seo, { SITIO, SCHEMA_ORGANIZACION } from '../../components/public/Seo';
import { Container, Section, SectionHeading, Eyebrow } from '../../components/public/Section';
import { FeatureCard } from '../../components/public/Card';
import Accordion from '../../components/public/Accordion';
import Badge from '../../components/public/Badge';
import Button from '../../components/public/Button';
import CTA from '../../components/public/CTA';
import Reveal from '../../components/public/Reveal';

const CARACTERISTICAS = [
  {
    icono: Package,
    titulo: 'Catálogo y productos',
    texto: 'Productos, variantes, categorías, marcas y combos con reglas de precio propias. Una sola fuente de verdad para todos tus canales.',
  },
  {
    icono: ShoppingCart,
    titulo: 'Pedidos en un tablero',
    texto: 'Cada pedido con su estado, su historial y su responsable, en un tablero que se mueve con la operación. Sin planillas paralelas.',
  },
  {
    icono: Boxes,
    titulo: 'Inventario en tiempo real',
    texto: 'Stock por sucursal y por depósito, descontado a medida que se vende. Alertas antes de quedarte sin producto, no después.',
  },
  {
    icono: Users,
    titulo: 'CRM y clientes',
    texto: 'Ficha completa de cada cliente: qué compró, cuándo, a qué precio y cómo le llegó el pedido.',
  },
  {
    icono: Truck,
    titulo: 'Logística y envíos',
    texto: 'Couriers, tarifas por zona, hojas de ruta e impresión de etiquetas. Del pedido confirmado a la puerta del cliente.',
  },
  {
    icono: Megaphone,
    titulo: 'Campañas de marketing',
    texto: 'Campañas conectadas a tu catálogo real, con el rendimiento de cada anuncio al lado del producto que promociona.',
  },
  {
    icono: BarChart3,
    titulo: 'Métricas y reportes',
    texto: 'Ventas, márgenes, rotación y costo por adquisición. Números que se calculan solos, no que alguien arma el lunes.',
  },
  {
    icono: Building2,
    titulo: 'Múltiples tiendas y equipos',
    texto: 'Varias tiendas, varias sucursales y los empleados que necesites, cada uno con los permisos exactos de su rol.',
  },
];

// Integraciones REALMENTE disponibles hoy. La lista se mantiene corta a
// propósito: anunciar conexiones que no existen es lo que hace que una
// revisión de plataforma se rechace, y obliga a describir en la Política de
// Privacidad datos que nunca se tratan.
const INTEGRACIONES = [
  {
    nombre: 'Meta Business',
    color: '#0081FB',
    icono: Network,
    descripcion:
      'Conectás tu Business Manager por OAuth y Gesicomm lee las cuentas publicitarias a las que ya tenés acceso. No creamos ni modificamos activos por tu cuenta.',
    datos: 'Business Managers y cuentas publicitarias que administrás.',
  },
  {
    nombre: 'Facebook Ads',
    color: '#1877F2',
    icono: Megaphone,
    descripcion:
      'Campañas, conjuntos de anuncios y su rendimiento, al lado del producto y del margen real que estás promocionando.',
    datos: 'Campañas, presupuestos, impresiones, clics, alcance, gasto y conversiones.',
  },
  {
    nombre: 'Meta Pixel',
    color: '#7C6BFF',
    icono: LineChart,
    descripcion:
      'Cargás el identificador de tu propio píxel y tu vitrina lo dispara, para que las conversiones vuelvan a tus campañas.',
    datos: 'Solo el identificador del píxel. Los eventos los recibe Meta directamente.',
  },
];

// Canales de venta que la vitrina usa sin API de por medio. Se listan aparte
// para no dar a entender que son integraciones con acceso a datos.
const CANALES_SIN_API = [
  {
    nombre: 'WhatsApp',
    color: '#25D366',
    icono: MessageCircle,
    descripcion:
      'El botón de tu vitrina abre un chat en el WhatsApp de quien te consulta, con el producto y el precio ya escritos. Es un enlace: la conversación ocurre entre tu cliente y vos, y Gesicomm no la ve ni la guarda.',
  },
];

const SEGURIDAD = [
  {
    icono: Lock,
    titulo: 'Cifrado de extremo a extremo del canal',
    texto: 'Todo el tráfico viaja por HTTPS con TLS 1.2 o superior y HSTS. Las credenciales de integraciones se guardan cifradas con AES-256-GCM.',
  },
  {
    icono: KeyRound,
    titulo: 'Roles y permisos granulares',
    texto: 'Cada acción del sistema está detrás de un permiso concreto. Un empleado ve exactamente lo que su rol necesita, nada más.',
  },
  {
    icono: ScrollText,
    titulo: 'Auditoría de eventos',
    texto: 'Los accesos y las acciones sensibles quedan registrados con usuario, fecha e IP. Nunca se registran contraseñas ni tokens.',
  },
  {
    icono: Eye,
    titulo: 'Aislamiento entre cuentas',
    texto: 'Los datos de cada cuenta están separados a nivel de modelo de datos, no solo por un filtro en la interfaz.',
  },
];

const PREGUNTAS = [
  {
    pregunta: '¿Qué datos de Meta usa Gesicomm exactamente?',
    respuesta:
      'Al conectar tu cuenta pedimos dos permisos y nada más: ads_management y business_management. Con eso leemos los Business Managers y las cuentas publicitarias a las que ya tenés acceso, y las métricas de tus campañas de Facebook Ads. No pedimos tu perfil, ni tu correo, ni tus páginas, ni tus contactos, ni tu muro, ni ningún tipo de mensajería. Podés verificarlo vos mismo en la pantalla de permisos que te muestra Meta al conectar.',
  },
  {
    pregunta: '¿Gesicomm tiene integración con Instagram, WhatsApp o Shopify?',
    respuesta:
      'No. Hoy la única integración con acceso a datos es la de Meta para Facebook Ads. El botón de WhatsApp de tu vitrina es un enlace wa.me que abre la aplicación en el teléfono de quien te consulta: no usa la API de WhatsApp y Gesicomm no ve ni guarda esas conversaciones. Instagram y Shopify no están integrados. Si en algún momento se agregan, esta página y la Política de Privacidad se actualizan antes de activarlos.',
  },
  {
    pregunta: '¿Usan Facebook Login para entrar a Gesicomm?',
    respuesta:
      'No. El acceso a Gesicomm es con correo y contraseña propios. La conexión con Meta es una acción aparte, dentro de Configuración, y sirve únicamente para vincular tus cuentas publicitarias.',
  },
  {
    pregunta: '¿Puedo desconectar Meta sin perder mis datos?',
    respuesta:
      'Sí. Desde Configuración podés desvincular la conexión en cualquier momento. Al hacerlo eliminamos el token de acceso y dejamos de consultar la API; tu catálogo, tus pedidos y tu historial dentro de Gesicomm quedan intactos.',
  },
  {
    pregunta: '¿Cómo pido que eliminen mis datos?',
    respuesta:
      'De dos maneras: desde Configuración → Privacidad y datos si tenés sesión activa, o completando el formulario público de la página de Eliminación de Datos si ya no podés entrar. Verificamos tu identidad y procesamos la eliminación en un plazo máximo de 30 días.',
  },
  {
    pregunta: '¿Gesicomm vende o comparte mis datos con terceros?',
    respuesta:
      'No. No vendemos datos personales ni los compartimos con fines publicitarios de terceros. Solo intervienen los subprocesadores necesarios para prestar el servicio (infraestructura, red de distribución) y la propia API de Meta cuando la conectás, listados uno por uno en la Política de Privacidad.',
  },
  {
    pregunta: '¿Qué pasa si dejo de pagar la suscripción?',
    respuesta:
      'La cuenta pasa a modo de solo lectura durante el período de gracia indicado en los Términos y Condiciones, para que puedas exportar tu información. Vencido ese plazo la cuenta se suspende y luego se elimina según los plazos de retención publicados.',
  },
];

export default function Landing() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      SCHEMA_ORGANIZACION,
      {
        '@type': 'WebSite',
        '@id': `${SITIO}/#sitio`,
        url: SITIO,
        name: 'Gesicomm',
        inLanguage: 'es',
        publisher: { '@id': `${SITIO}/#organizacion` },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Gesicomm',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITIO,
        description:
          'Plataforma SaaS de gestión de eCommerce: catálogo, pedidos, inventario, clientes, logística, CRM y métricas en un solo panel, con integración a Meta Business para el seguimiento de campañas de Facebook Ads.',
        publisher: { '@id': `${SITIO}/#organizacion` },
      },
      {
        '@type': 'FAQPage',
        mainEntity: PREGUNTAS.map((item) => ({
          '@type': 'Question',
          name: item.pregunta,
          acceptedAnswer: { '@type': 'Answer', text: item.respuesta },
        })),
      },
    ],
  };

  return (
    <>
      <Seo
        titulo="Gesicomm · Gestión de eCommerce en un solo panel"
        descripcion="Plataforma SaaS para administrar toda la operación de tu eCommerce: productos, pedidos, inventario, clientes, logística, CRM y métricas en un solo panel, con integración a Meta Business para seguir el rendimiento de tus campañas de Facebook Ads."
        ruta="/"
        schema={schema}
      />

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 h-[32rem] opacity-45"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 40%, #6d5ef8 0%, rgba(109,94,248,0.18) 45%, transparent 75%)',
          }}
        />

        <Container className="relative pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
          <div className="animar-entrada">
            <Badge tono="primario" icono={Sparkles} className="mb-7">
              Integrado con Meta Business y Facebook Ads
            </Badge>

            <h1
              className="mx-auto max-w-4xl text-4xl font-bold text-fg sm:text-6xl sm:leading-[1.05]"
              style={{ letterSpacing: '-0.04em' }}
            >
              Toda la operación de tu eCommerce, en un solo lugar.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
              Gesicomm reúne catálogo, pedidos, inventario, clientes, logística y campañas en un
              único panel, con el rendimiento de tus anuncios de Facebook al lado del margen real
              de cada producto.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button to="/login" tamano="lg" className="w-full sm:w-auto">
                Entrar al panel
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
              <Button to="/contact" variante="secundario" tamano="lg" className="w-full sm:w-auto">
                Hablar con nosotros
              </Button>
            </div>

            <p className="mt-8 text-sm text-fg-subtle">
              Cifrado en tránsito y en reposo · Roles y permisos por empleado ·{' '}
              <Link to="/data-deletion" className="underline underline-offset-4 hover:text-fg-muted">
                Eliminación de datos a pedido
              </Link>
            </p>
          </div>
        </Container>

        {/* Franja de canales conectados */}
        <Container className="relative pb-16">
          <div className="rounded-xl border border-border bg-surface/60 px-6 py-6 backdrop-blur-sm">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              Lo que se conecta hoy
            </p>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {INTEGRACIONES.map((integracion) => (
                <li key={integracion.nombre} className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `${integracion.color}1f`,
                      color: integracion.color,
                    }}
                  >
                    <integracion.icono size={15} />
                  </span>
                  <span className="text-sm font-medium text-fg-muted">{integracion.nombre}</span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* ───────── Características ───────── */}
      <Section id="producto" className="border-t border-border">
        <Reveal>
          <SectionHeading
            eyebrow="Producto"
            titulo="Un panel que cubre la operación completa"
            descripcion="No es un módulo suelto conectado a otros seis. Catálogo, venta, stock, cliente y envío comparten los mismos datos, así que lo que cambiás en un lado se refleja en el resto."
            centrado
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CARACTERISTICAS.map((caracteristica, indice) => (
            <Reveal key={caracteristica.titulo} delay={(indice % 4) * 70}>
              <FeatureCard icono={caracteristica.icono} titulo={caracteristica.titulo} className="h-full">
                {caracteristica.texto}
              </FeatureCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ───────── Integraciones ───────── */}
      <Section id="integraciones" className="border-t border-border bg-surface">
        <Reveal>
          <SectionHeading
            eyebrow="Integraciones"
            titulo="Una sola integración, y bien hecha"
            descripcion="Hoy Gesicomm se conecta con Meta y nada más. Pide exactamente dos permisos —ads_management y business_management— y podés revocarla en cualquier momento desde Configuración."
            centrado
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRACIONES.map((integracion, indice) => (
            <Reveal key={integracion.nombre} delay={(indice % 3) * 70}>
              <div className="h-full rounded-xl border border-border bg-canvas p-6 transition-colors hover:border-border-strong">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${integracion.color}1f`,
                      color: integracion.color,
                    }}
                  >
                    <integracion.icono size={19} />
                  </span>
                  <h3
                    className="text-base font-semibold text-fg"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    {integracion.nombre}
                  </h3>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                  {integracion.descripcion}
                </p>

                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    Datos que se usan
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{integracion.datos}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Canales sin API: van separados y explicados, porque presentarlos
            como "integración" daría a entender un acceso a datos que no
            existe. */}
        {CANALES_SIN_API.map((canal) => (
          <Reveal key={canal.nombre}>
            <div className="mt-5 rounded-xl border border-dashed border-border bg-canvas p-6">
              {/* Un solo <h3>: duplicarlo para mostrar uno u otro según el
                  ancho dejaría dos encabezados en el árbol de accesibilidad
                  para un mismo bloque. El icono se reordena con flex. */}
              <div className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${canal.color}1f`, color: canal.color }}
                >
                  <canal.icono size={19} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <h3
                      className="text-base font-semibold text-fg"
                      style={{ letterSpacing: '-0.02em' }}
                    >
                      {canal.nombre}
                    </h3>
                    <Badge tono="neutro">Sin API · no es una integración</Badge>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">
                    {canal.descripcion}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}

        <Reveal>
          <p className="mt-8 text-center text-sm text-fg-muted">
            Instagram, WhatsApp Cloud API y Shopify <strong className="font-semibold text-fg">no
            están integrados</strong> hoy. Si se agregan, se anuncian acá y en la Política de
            Privacidad antes de activarse.
          </p>
        </Reveal>

        <Reveal>
          <p className="mt-10 text-center text-sm text-fg-muted">
            El detalle de qué se recopila, con qué base legal y por cuánto tiempo está en la{' '}
            <Link to="/privacy" className="font-medium text-primary underline underline-offset-4">
              Política de Privacidad
            </Link>
            .
          </p>
        </Reveal>
      </Section>

      {/* ───────── Seguridad ───────── */}
      <Section id="seguridad" className="border-t border-border">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-20">
          <Reveal>
            <Eyebrow className="mb-3">Seguridad</Eyebrow>
            <h2
              className="text-3xl font-bold text-fg sm:text-4xl"
              style={{ letterSpacing: '-0.03em' }}
            >
              La información de tus clientes no es un detalle de implementación
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-muted">
              Gesicomm procesa datos de compradores reales: nombres, direcciones, teléfonos e
              historial de compra. El control de acceso, el cifrado y la auditoría son parte del
              diseño del sistema, no una capa agregada después.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/security" variante="secundario">
                Ver prácticas de seguridad
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
              <Button to="/compliance" variante="fantasma">
                Cumplimiento legal
              </Button>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2">
            {SEGURIDAD.map((item, indice) => (
              <Reveal key={item.titulo} delay={(indice % 2) * 80}>
                <FeatureCard icono={item.icono} titulo={item.titulo} className="h-full">
                  {item.texto}
                </FeatureCard>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ───────── Cumplimiento ───────── */}
      <section className="border-t border-border bg-surface py-16">
        <Container>
        <Reveal>
          <div className="flex flex-col items-center gap-6 text-center">
            <ShieldCheck size={26} className="text-primary" aria-hidden="true" />
            <p className="max-w-3xl text-base leading-relaxed text-fg-muted">
              Nuestras prácticas de tratamiento de datos están alineadas con el{' '}
              <strong className="font-semibold text-fg">RGPD</strong> europeo, la{' '}
              <strong className="font-semibold text-fg">CCPA/CPRA</strong> de California y las{' '}
              <strong className="font-semibold text-fg">Meta Platform Terms</strong>, además de la
              normativa de protección de datos de los países de Latinoamérica donde operamos.
            </p>
            <Link
              to="/compliance"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Leer la página de cumplimiento
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
        </Container>
      </section>

      {/* ───────── FAQ ───────── */}
      <Section id="faq" className="border-t border-border" ancho="normal">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <SectionHeading
              eyebrow="Preguntas frecuentes"
              titulo="Lo que más nos preguntan"
              descripcion="Sobre datos, permisos e integraciones. Si te falta algo, escribinos."
              centrado
            />
          </Reveal>

          <Reveal>
            <div className="mt-12 rounded-xl border border-border bg-surface px-6 sm:px-8">
              <Accordion items={PREGUNTAS.map((item) => ({ pregunta: item.pregunta, respuesta: item.respuesta }))} />
            </div>
          </Reveal>

          <Reveal>
            <p className="mt-8 text-center text-sm text-fg-muted">
              ¿Tenés otra consulta?{' '}
              <Link to="/contact" className="font-medium text-primary underline underline-offset-4">
                Escribinos
              </Link>{' '}
              o mandanos un correo a{' '}
              <a
                href="mailto:contacto@gesicomm.com"
                className="font-medium text-primary underline underline-offset-4"
              >
                contacto@gesicomm.com
              </a>
              .
            </p>
          </Reveal>
        </div>
      </Section>

      <CTA />
    </>
  );
}
