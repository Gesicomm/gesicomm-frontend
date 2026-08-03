import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  Eye,
  KeyRound,
  Lock,
  Megaphone,
  MessageCircle,
  Network,
  Package,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
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
    titulo: 'Pedidos sincronizados',
    texto: 'Los pedidos de cada canal entran al mismo tablero, con su estado, su historial y su responsable. Sin planillas paralelas.',
  },
  {
    icono: Boxes,
    titulo: 'Inventario en tiempo real',
    texto: 'Stock por sucursal y por depósito, descontado a medida que se vende. Alertas antes de quedarte sin producto, no después.',
  },
  {
    icono: Users,
    titulo: 'CRM y clientes',
    texto: 'Ficha completa de cada cliente: qué compró, cuándo, por qué canal y qué conversaciones tuvo con tu equipo.',
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

const INTEGRACIONES = [
  {
    nombre: 'Shopify',
    color: '#95BF47',
    icono: Store,
    descripcion: 'Sincronización bidireccional de productos, variantes, stock y pedidos con tu tienda Shopify.',
    datos: 'Productos, inventario, pedidos y datos de contacto del comprador.',
  },
  {
    nombre: 'Meta',
    color: '#0081FB',
    icono: Network,
    descripcion: 'Conexión con tu Business Manager para administrar activos publicitarios y catálogos.',
    datos: 'Cuentas publicitarias, catálogos, campañas y métricas de rendimiento.',
  },
  {
    nombre: 'Facebook',
    color: '#1877F2',
    icono: Megaphone,
    descripcion: 'Inicio de sesión con Facebook y gestión de las páginas vinculadas a tu negocio.',
    datos: 'Perfil público básico, correo y páginas que administrás.',
  },
  {
    nombre: 'Instagram',
    color: '#E1306C',
    icono: Sparkles,
    descripcion: 'Cuentas profesionales de Instagram vinculadas a tus páginas y a tu catálogo de productos.',
    datos: 'Cuenta profesional, publicaciones promocionadas y métricas.',
  },
  {
    nombre: 'WhatsApp Cloud API',
    color: '#25D366',
    icono: MessageCircle,
    descripcion: 'Conversaciones con clientes desde el mismo lugar donde ves su pedido y su historial.',
    datos: 'Número de teléfono, mensajes y estado de entrega de cada conversación.',
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
    pregunta: '¿Qué datos de Meta, Facebook, Instagram y WhatsApp usa Gesicomm?',
    respuesta:
      'Solo los permisos que autorizás explícitamente durante la conexión: tu perfil público básico, el correo de la cuenta, las páginas e cuentas profesionales que administrás, tus catálogos y tus cuentas publicitarias, además de las conversaciones de WhatsApp de los números que conectás. No accedemos a tus contactos personales, a tu muro ni a mensajes privados ajenos al número que conectaste. El detalle completo está en la Política de Privacidad.',
  },
  {
    pregunta: '¿Puedo desconectar una integración sin perder mis datos?',
    respuesta:
      'Sí. Desde Configuración podés desvincular cualquier integración en cualquier momento. Al hacerlo revocamos los tokens de acceso y dejamos de sincronizar; tu catálogo, tus pedidos y tu historial dentro de Gesicomm quedan intactos.',
  },
  {
    pregunta: '¿Cómo pido que eliminen mis datos?',
    respuesta:
      'De dos maneras: desde Configuración → Eliminar cuenta si tenés sesión activa, o completando el formulario público de la página de Eliminación de Datos si ya no podés entrar. Verificamos tu identidad y procesamos la eliminación en un plazo máximo de 30 días.',
  },
  {
    pregunta: '¿Dónde se almacenan los datos?',
    respuesta:
      'En servidores de nuestro proveedor de infraestructura, con copias de seguridad cifradas. Si un dato tiene que salir de su región por una integración —por ejemplo, al consultar la Graph API de Meta— la transferencia se ampara en cláusulas contractuales tipo. Está detallado en la sección de transferencias internacionales de la Política de Privacidad.',
  },
  {
    pregunta: '¿Gesicomm vende o comparte mis datos con terceros?',
    respuesta:
      'No. No vendemos datos personales ni los compartimos con fines publicitarios de terceros. Solo intervienen los subprocesadores necesarios para prestar el servicio (infraestructura, correo transaccional, las propias plataformas que conectás), listados uno por uno en la Política de Privacidad.',
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
          'Plataforma SaaS de gestión de eCommerce: sincroniza productos, pedidos, inventario, clientes, logística, CRM, campañas y métricas desde un solo panel, con integraciones a Shopify, Meta, Facebook, Instagram y WhatsApp Cloud API.',
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
        descripcion="Plataforma SaaS para administrar toda la operación de tu eCommerce: productos, pedidos, inventario, clientes, logística, CRM, campañas y métricas. Integrada con Shopify, Meta, Facebook, Instagram y WhatsApp Cloud API."
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
              Integrado con Shopify, Meta y WhatsApp Cloud API
            </Badge>

            <h1
              className="mx-auto max-w-4xl text-4xl font-bold text-fg sm:text-6xl sm:leading-[1.05]"
              style={{ letterSpacing: '-0.04em' }}
            >
              Toda la operación de tu eCommerce, en un solo lugar.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
              Gesicomm reúne catálogo, pedidos, inventario, clientes, logística y campañas en un
              único panel. Conectás tus canales una vez y dejás de reconciliar planillas.
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
              Canales que se conectan
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
            titulo="Conectá tus canales, no los migres"
            descripcion="Cada integración pide únicamente los permisos que necesita para funcionar, y podés revocarla en cualquier momento desde Configuración."
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
              <strong className="font-semibold text-fg">CCPA/CPRA</strong> de California, las{' '}
              <strong className="font-semibold text-fg">Meta Platform Terms</strong> y los{' '}
              <strong className="font-semibold text-fg">Shopify API Terms</strong>, además de la
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
                href="mailto:support@gesicomm.com"
                className="font-medium text-primary underline underline-offset-4"
              >
                support@gesicomm.com
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
