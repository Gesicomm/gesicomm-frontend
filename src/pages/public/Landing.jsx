import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import Seo, { SITIO, SCHEMA_ORGANIZACION } from '../../components/public/Seo';
import { Container, Section, SectionHeading, Eyebrow } from '../../components/public/Section';
import Accordion from '../../components/public/Accordion';
import Button from '../../components/public/Button';
import CTA from '../../components/public/CTA';
import Reveal from '../../components/public/Reveal';

/**
 * Contenido del registro de la portada.
 *
 * Son datos de ejemplo y la página lo dice al pie, con todas las letras. Se
 * eligieron para mostrar lo único que el producto hace y una planilla no: la
 * inversión en anuncios y el margen real del producto en la misma columna.
 * Ninguna cifra pretende ser una métrica de la empresa ni de un cliente.
 */
const REGISTRO_PEDIDOS = [
  { id: '1044', destino: 'Asunción', estado: 'En armado', tono: 'fg-muted' },
  { id: '1043', destino: 'Ciudad del Este', estado: 'Despachado', tono: 'fg-muted' },
  { id: '1042', destino: 'Encarnación', estado: 'Entregado', tono: 'success' },
];

const REGISTRO_STOCK = [
  { deposito: 'Depósito Central', unidades: '412', alerta: false },
  { deposito: 'Sucursal San Lorenzo', unidades: '88', alerta: false },
  { deposito: 'Sucursal Luque', unidades: '12', alerta: true },
];

// Importes en guaraníes, con el punto como separador de miles y sin
// decimales, que es como se escribe la moneda acá. Mismo criterio que
// formatPYG en pages/Ads.jsx: es-PY / PYG / cero decimales.
const REGISTRO_CAMPANA = [
  { concepto: 'Inversión en anuncios', valor: '4.850.000' },
  { concepto: 'Ingreso atribuido', valor: '15.200.000' },
  { concepto: 'Margen real', valor: '5.640.000', destacado: true },
];

/**
 * Los módulos agrupados por dónde caen en la operación, no en una grilla
 * suelta. El agrupamiento es la información: dice que el catálogo, el pedido
 * y el envío son etapas de una misma cadena y no ocho productos distintos.
 */
const MODULOS = [
  {
    grupo: 'Catálogo y venta',
    filas: [
      {
        modulo: 'Catálogo y productos',
        resuelve:
          'Productos, variantes, categorías, marcas y combos con reglas de precio propias. Una sola fuente de verdad para todos tus canales.',
      },
      {
        modulo: 'Pedidos',
        resuelve:
          'Cada pedido con su estado, su historial y su responsable, en un tablero que se mueve con la operación. Sin planillas paralelas.',
      },
    ],
  },
  {
    grupo: 'Cumplimiento',
    filas: [
      {
        modulo: 'Inventario',
        resuelve:
          'Stock por sucursal y por depósito, descontado a medida que se vende. Alertas antes de quedarte sin producto, no después.',
      },
      {
        modulo: 'Logística y envíos',
        resuelve:
          'Couriers, tarifas por zona, hojas de ruta e impresión de etiquetas. Del pedido confirmado a la puerta del cliente.',
      },
    ],
  },
  {
    grupo: 'Crecimiento y control',
    filas: [
      {
        modulo: 'CRM y clientes',
        resuelve:
          'Ficha completa de cada cliente: qué compró, cuándo, a qué precio y cómo le llegó el pedido.',
      },
      {
        modulo: 'Campañas de marketing',
        resuelve:
          'Campañas conectadas a tu catálogo real, con el rendimiento de cada anuncio al lado del producto que promociona.',
      },
      {
        modulo: 'Métricas y reportes',
        resuelve:
          'Ventas, márgenes, rotación y costo por adquisición. Números que se calculan solos, no que alguien arma el lunes.',
      },
      {
        modulo: 'Tiendas y equipos',
        resuelve:
          'Varias tiendas, varias sucursales y los empleados que necesites, cada uno con los permisos exactos de su rol.',
      },
    ],
  },
];

// Integraciones REALMENTE disponibles hoy. La lista se mantiene corta a
// propósito: anunciar conexiones que no existen es lo que hace que una
// revisión de plataforma se rechace, y obliga a describir en la Política de
// Privacidad datos que nunca se tratan.
//
// `alcance` es el permiso literal que se pide. Va en la tabla, no en la letra
// chica: es el dato que alguien evaluando la plataforma viene a buscar.
const INTEGRACIONES = [
  {
    nombre: 'Meta Business',
    color: '#0081FB',
    alcance: 'business_management',
    descripcion:
      'Conectás tu Business Manager por OAuth y Gesicomm lee las cuentas publicitarias a las que ya tenés acceso. No creamos ni modificamos activos por tu cuenta.',
    datos: 'Business Managers y cuentas publicitarias que administrás.',
  },
  {
    nombre: 'Facebook Ads',
    color: '#1877F2',
    alcance: 'ads_management',
    descripcion:
      'Campañas, conjuntos de anuncios y su rendimiento, al lado del producto y del margen real que estás promocionando.',
    datos: 'Campañas, presupuestos, impresiones, clics, alcance, gasto y conversiones.',
  },
  {
    nombre: 'Meta Pixel',
    color: '#3d5fa3',
    alcance: 'Sin permiso de API',
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
    descripcion:
      'El botón de tu vitrina abre un chat en el WhatsApp de quien te consulta, con el producto y el precio ya escritos. Es un enlace: la conversación ocurre entre tu cliente y vos, y Gesicomm no la ve ni la guarda.',
  },
];

const SEGURIDAD = [
  {
    titulo: 'Cifrado del canal y de las credenciales',
    texto:
      'Todo el tráfico viaja por HTTPS con TLS 1.2 o superior y HSTS. Las credenciales de integraciones se guardan cifradas con AES-256-GCM.',
  },
  {
    titulo: 'Roles y permisos granulares',
    texto:
      'Cada acción del sistema está detrás de un permiso concreto. Un empleado ve exactamente lo que su rol necesita, nada más.',
  },
  {
    titulo: 'Auditoría de eventos',
    texto:
      'Los accesos y las acciones sensibles quedan registrados con usuario, fecha e IP. Nunca se registran contraseñas ni tokens.',
  },
  {
    titulo: 'Aislamiento entre cuentas',
    texto:
      'Los datos de cada cuenta están separados a nivel de modelo de datos, no solo por un filtro en la interfaz.',
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

/** Bloque con rótulo dentro del registro de la portada. */
function BloqueRegistro({ rotulo, children }) {
  return (
    <div className="border-t border-border px-4 py-3.5 sm:px-5">
      <p className="etiqueta mb-2.5 text-fg-subtle">{rotulo}</p>
      {children}
    </div>
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

  // Contador continuo para escalonar la entrada de las filas del registro
  // sin reiniciar el retardo en cada bloque.
  let ordenFila = 0;
  const retardo = () => ({ animationDelay: `${180 + ordenFila++ * 55}ms` });

  return (
    <>
      <Seo
        titulo="Gesicomm · Gestión de eCommerce en un solo panel"
        descripcion="Plataforma SaaS para administrar toda la operación de tu eCommerce: productos, pedidos, inventario, clientes, logística, CRM y métricas en un solo panel, con integración a Meta Business para seguir el rendimiento de tus campañas de Facebook Ads."
        ruta="/"
        schema={schema}
      />

      {/* ───────── Portada ─────────
          Dos columnas: el argumento a la izquierda, el registro a la
          derecha. El registro es la tesis de la página — lo característico
          de este producto no es una promesa, es una fila de datos reales de
          la operación con el gasto en anuncios y el margen en la misma
          columna. */}
      <section className="border-b border-border">
        <Container className="grid items-center gap-12 pb-14 pt-14 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16 lg:pb-16 lg:pt-18">
          <div className="animar-entrada">
            <p className="etiqueta text-fg-subtle">ERP para eCommerce y Shopify</p>

            <h1 className="titular mt-5 text-[2.15rem] text-fg sm:text-5xl lg:text-6xl">
              Toda la operación de tu eCommerce, en un solo lugar.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
              Gesicomm es un ERP y software SaaS para gestión de eCommerce que reúne catálogo, pedidos,
              inventario, clientes, logística y campañas en un único panel. Ve el rendimiento de tus
              anuncios de Facebook Ads al lado del margen real de cada producto. Ideal para tiendas en línea,
              Shopify y negocios de venta por internet que necesitan control operativo real.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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

          {/* Registro operativo. aria-hidden no: el contenido se lee bien en
              orden y aporta contexto real de qué hace el producto. */}
          <div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-5">
                <p className="etiqueta text-fg">Registro operativo</p>
                <p className="etiqueta text-fg-subtle">Hoy</p>
              </div>

              <BloqueRegistro rotulo="Pedidos">
                <ul className="space-y-2">
                  {REGISTRO_PEDIDOS.map((pedido) => (
                    <li
                      key={pedido.id}
                      style={retardo()}
                      className="registro-fila flex items-baseline gap-3 text-sm"
                    >
                      <span className="cifra text-xs text-fg-subtle">{pedido.id}</span>
                      <span className="min-w-0 flex-1 truncate text-fg">{pedido.destino}</span>
                      <span
                        className={`cifra text-xs ${
                          pedido.tono === 'success' ? 'text-success' : 'text-fg-muted'
                        }`}
                      >
                        {pedido.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              </BloqueRegistro>

              <BloqueRegistro rotulo="Stock disponible">
                <ul className="space-y-2">
                  {REGISTRO_STOCK.map((linea) => (
                    <li
                      key={linea.deposito}
                      style={retardo()}
                      className="registro-fila flex items-baseline gap-3 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate text-fg">{linea.deposito}</span>
                      {linea.alerta && (
                        <span className="etiqueta text-warning">Bajo</span>
                      )}
                      <span
                        className={`cifra text-sm ${
                          linea.alerta ? 'text-warning' : 'text-fg-muted'
                        }`}
                      >
                        {linea.unidades}
                      </span>
                    </li>
                  ))}
                </ul>
              </BloqueRegistro>

              <BloqueRegistro rotulo="Campañas · Facebook Ads">
                <ul className="space-y-2">
                  {REGISTRO_CAMPANA.map((linea) => (
                    <li
                      key={linea.concepto}
                      style={retardo()}
                      className={`registro-fila flex items-baseline gap-3 text-sm ${
                        linea.destacado ? 'border-t border-border pt-2.5' : ''
                      }`}
                    >
                      <span
                        className={`min-w-0 flex-1 truncate ${
                          linea.destacado ? 'font-semibold text-fg' : 'text-fg-muted'
                        }`}
                      >
                        {linea.concepto}
                      </span>
                      <span
                        className={`cifra text-sm ${
                          linea.destacado ? 'font-semibold text-fg' : 'text-fg-muted'
                        }`}
                      >
                        Gs. {linea.valor}
                      </span>
                    </li>
                  ))}
                </ul>
              </BloqueRegistro>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
              Representación del panel. Los datos son de ejemplo.
            </p>
          </div>
        </Container>
      </section>

      {/* Franja de lo conectado: una línea de registro, no una tarjeta. */}
      <section className="border-b border-border bg-surface">
        <Container className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-8">
          <p className="etiqueta flex-shrink-0 text-fg-subtle">Conectado hoy</p>
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-2">
            {INTEGRACIONES.map((integracion) => (
              <li key={integracion.nombre} className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: integracion.color }}
                />
                <span className="text-sm text-fg-muted">{integracion.nombre}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ───────── Módulos ─────────
          Registro de módulos, agrupado por etapa de la operación. Una grilla
          de ocho tarjetas iguales diría que son ocho cosas sueltas; la tabla
          agrupada dice lo que el producto realmente es. */}
      <Section id="producto">
        <Reveal>
          <SectionHeading
            eyebrow="Producto"
            titulo="Un panel que cubre la operación completa"
            descripcion="No es un módulo suelto conectado a otros seis. Catálogo, venta, stock, cliente y envío comparten los mismos datos, así que lo que cambiás en un lado se refleja en el resto."
          />
        </Reveal>

        <div className="mt-16 space-y-12">
          {MODULOS.map((grupo) => (
            <Reveal key={grupo.grupo}>
              <div className="grid gap-4 lg:grid-cols-[13rem_1fr] lg:gap-10">
                <p className="etiqueta pt-5 text-primary lg:pt-6">{grupo.grupo}</p>

                {/* La regla de apertura va en la <dl> y la de cierre en cada
                    fila: así el grupo queda encerrado y no se cuela una
                    última fila sin línea de abajo. */}
                <dl className="min-w-0 border-t border-border">
                  {grupo.filas.map((fila) => (
                    <div
                      key={fila.modulo}
                      className="grid gap-x-8 gap-y-1.5 border-b border-border py-5 sm:grid-cols-[minmax(0,13rem)_1fr] sm:py-6"
                    >
                      <dt className="text-base font-semibold text-fg">{fila.modulo}</dt>
                      <dd className="text-sm leading-relaxed text-fg-muted">{fila.resuelve}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ───────── Integraciones ─────────
          Cada integración es una fila con su permiso literal y los datos que
          toca. Esa es la información que viene a buscar quien evalúa la
          plataforma, así que va en la tabla y no en un pie de página. */}
      <Section id="integraciones" className="border-t border-border bg-surface">
        <Reveal>
          <SectionHeading
            eyebrow="Integraciones"
            titulo="Una sola integración, y bien hecha"
            descripcion="Hoy Gesicomm se conecta con Meta y nada más. Pide exactamente dos permisos y podés revocarla en cualquier momento desde Configuración."
          />
        </Reveal>

        <div className="mt-16">
          {INTEGRACIONES.map((integracion) => (
            <Reveal key={integracion.nombre}>
              <div className="grid gap-x-10 gap-y-5 border-t border-border py-7 lg:grid-cols-[15rem_1fr]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: integracion.color }}
                    />
                    <h3 className="text-base font-semibold text-fg">{integracion.nombre}</h3>
                  </div>
                  <p className="cifra mt-2 pl-4 text-xs text-fg-subtle">{integracion.alcance}</p>
                </div>

                <div className="min-w-0">
                  <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
                    {integracion.descripcion}
                  </p>
                  <p className="etiqueta mt-4 text-fg-subtle">Datos que se usan</p>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-subtle">
                    {integracion.datos}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}

          {/* Canales sin API: van separados y explicados, porque presentarlos
              como "integración" daría a entender un acceso a datos que no
              existe. El borde punteado es la señal de que esta fila no
              pertenece a la tabla de arriba. */}
          {CANALES_SIN_API.map((canal) => (
            <Reveal key={canal.nombre}>
              <div className="grid gap-x-10 gap-y-5 border-t border-dashed border-border-strong py-7 lg:grid-cols-[15rem_1fr]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: canal.color }}
                    />
                    <h3 className="text-base font-semibold text-fg">{canal.nombre}</h3>
                  </div>
                  <p className="cifra mt-2 pl-4 text-xs text-fg-subtle">No es una integración</p>
                </div>

                <p className="min-w-0 max-w-2xl text-sm leading-relaxed text-fg-muted">
                  {canal.descripcion}
                </p>
              </div>
            </Reveal>
          ))}

          <div className="border-t border-border" />
        </div>

        <Reveal>
          <div className="mt-10 max-w-2xl space-y-3 text-sm leading-relaxed text-fg-muted">
            <p>
              Instagram, WhatsApp Cloud API y Shopify{' '}
              <strong className="font-semibold text-fg">no están integrados</strong> hoy. Si se
              agregan, se anuncian acá y en la Política de Privacidad antes de activarse.
            </p>
            <p>
              El detalle de qué se recopila, con qué base legal y por cuánto tiempo está en la{' '}
              <Link to="/privacy" className="font-medium text-primary underline underline-offset-4">
                Política de Privacidad
              </Link>
              .
            </p>
          </div>
        </Reveal>
      </Section>

      {/* ───────── Seguridad ───────── */}
      <Section id="seguridad" className="border-t border-border">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-20">
          <Reveal>
            <Eyebrow className="mb-4">Seguridad</Eyebrow>
            <h2 className="titular text-3xl text-fg sm:text-[2.6rem]">
              La información de tus clientes no es un detalle de implementación
            </h2>
            <p className="mt-5 text-base leading-relaxed text-fg-muted">
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

          <dl className="border-t border-border">
            {SEGURIDAD.map((item) => (
              <Reveal key={item.titulo}>
                <div className="border-b border-border py-6">
                  <dt className="text-base font-semibold text-fg">{item.titulo}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-fg-muted">{item.texto}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </Section>

      {/* ───────── Cumplimiento ───────── */}
      <section className="border-t border-border bg-surface py-14">
        <Container>
          <Reveal>
            <div className="grid gap-5 lg:grid-cols-[13rem_1fr] lg:gap-10">
              <p className="etiqueta text-fg-subtle lg:pt-1">Marco legal</p>
              <div className="min-w-0">
                <p className="max-w-3xl text-base leading-relaxed text-fg-muted">
                  Nuestras prácticas de tratamiento de datos están alineadas con el{' '}
                  <strong className="font-semibold text-fg">RGPD</strong> europeo, la{' '}
                  <strong className="font-semibold text-fg">CCPA/CPRA</strong> de California y las{' '}
                  <strong className="font-semibold text-fg">Meta Platform Terms</strong>, además de
                  la normativa de protección de datos de los países de Latinoamérica donde
                  operamos.
                </p>
                <Link
                  to="/compliance"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Leer la página de cumplimiento
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ───────── Preguntas frecuentes ───────── */}
      <Section id="faq" className="border-t border-border">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <SectionHeading
              eyebrow="Preguntas frecuentes"
              titulo="Lo que más nos preguntan"
              descripcion="Sobre datos, permisos e integraciones. Si te falta algo, escribinos."
            />
            <p className="mt-6 text-sm leading-relaxed text-fg-muted">
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

          <Reveal>
            <div className="border-t border-border">
              <Accordion
                items={PREGUNTAS.map((item) => ({
                  pregunta: item.pregunta,
                  respuesta: item.respuesta,
                }))}
              />
            </div>
          </Reveal>
        </div>
      </Section>

      <CTA />
    </>
  );
}
