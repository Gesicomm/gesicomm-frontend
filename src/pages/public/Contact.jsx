import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  FileText,
  LifeBuoy,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import Seo, { SITIO, SCHEMA_ORGANIZACION, schemaMigas } from '../../components/public/Seo';
import Breadcrumb from '../../components/public/Breadcrumb';
import Alert from '../../components/public/Alert';
import Button from '../../components/public/Button';
import { Container } from '../../components/public/Section';
import { Campo, CampoSeleccion, CampoTexto, CampoTrampa } from '../../components/public/FormFields';
import { enviarMensajeContacto } from '../../services/publicoService';

const CANALES = [
  {
    icono: LifeBuoy,
    titulo: 'Soporte',
    correo: 'support@gesicomm.com',
    descripcion: 'Problemas con el producto, dudas de uso, facturación y suscripciones.',
    plazo: 'Respuesta dentro de un día hábil',
  },
  {
    icono: Lock,
    titulo: 'Privacidad',
    correo: 'privacy@gesicomm.com',
    descripcion: 'Ejercicio de derechos sobre datos personales, consultas sobre el tratamiento y DPA.',
    plazo: 'Acuse dentro de 5 días hábiles',
  },
  {
    icono: FileText,
    titulo: 'Legal',
    correo: 'legal@gesicomm.com',
    descripcion: 'Cuestiones contractuales, términos de servicio, cumplimiento y requerimientos.',
    plazo: 'Respuesta dentro de 5 días hábiles',
  },
  {
    icono: ShieldCheck,
    titulo: 'Seguridad',
    correo: 'security@gesicomm.com',
    descripcion: 'Reporte de vulnerabilidades y cuestionarios de seguridad de proveedores.',
    plazo: 'Acuse dentro de 3 días hábiles',
  },
];

const AREAS = [
  { valor: 'soporte', etiqueta: 'Soporte del producto' },
  { valor: 'comercial', etiqueta: 'Consulta comercial' },
  { valor: 'privacidad', etiqueta: 'Privacidad y datos personales' },
  { valor: 'legal', etiqueta: 'Legal y contractual' },
  { valor: 'seguridad', etiqueta: 'Seguridad' },
];

export default function Contact() {
  const [enviado, setEnviado] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      area: 'soporte',
      nombre: '',
      email: '',
      empresa: '',
      asunto: '',
      mensaje: '',
      sitio_web: '',
    },
  });

  const alEnviar = async (datos) => {
    setErrorEnvio(null);
    try {
      const respuesta = await enviarMensajeContacto(datos);
      setEnviado(respuesta);
      reset();
    } catch (error) {
      setErrorEnvio(error.message);
    }
  };

  const migas = [
    { etiqueta: 'Inicio', href: '/' },
    { etiqueta: 'Contacto', href: '/contact' },
  ];

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      schemaMigas(migas),
      SCHEMA_ORGANIZACION,
      {
        '@type': 'ContactPage',
        '@id': `${SITIO}/contact`,
        url: `${SITIO}/contact`,
        name: 'Contacto · Gesicomm',
        inLanguage: 'es',
      },
    ],
  };

  return (
    <>
      <Seo
        titulo="Contacto"
        descripcion="Contactá con Gesicomm: soporte del producto, consultas comerciales, privacidad y ejercicio de derechos sobre datos personales, cuestiones legales y reporte de vulnerabilidades de seguridad."
        ruta="/contact"
        schema={schema}
      />

      <div className="border-b border-border bg-surface">
        <Container className="py-12 sm:py-16">
          <Breadcrumb migas={migas} className="mb-7" />
          <h1
            className="max-w-3xl text-3xl font-bold text-fg sm:text-[2.6rem] sm:leading-[1.1]"
            style={{ letterSpacing: '-0.035em' }}
          >
            Hablemos
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            Escribinos por el canal que corresponda y te respondemos. Si es sobre tus datos
            personales, tenemos un canal específico y plazos comprometidos.
          </p>
        </Container>
      </div>

      <Container className="py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
          {/* ───── Canales ───── */}
          <div>
            <h2 className="text-xl font-bold text-fg" style={{ letterSpacing: '-0.025em' }}>
              Canales directos
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              Si preferís el correo, escribí directo a la casilla del área.
            </p>

            <ul className="mt-7 space-y-4">
              {CANALES.map((canal) => (
                <li key={canal.correo} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary"
                    >
                      <canal.icono size={17} />
                    </span>
                    <div className="min-w-0">
                      <h3
                        className="text-sm font-semibold text-fg"
                        style={{ letterSpacing: '-0.01em' }}
                      >
                        {canal.titulo}
                      </h3>
                      <a
                        href={`mailto:${canal.correo}`}
                        className="mt-0.5 block break-all text-sm text-primary hover:underline"
                      >
                        {canal.correo}
                      </a>
                      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                        {canal.descripcion}
                      </p>
                      <p className="mt-2 text-xs text-fg-subtle">{canal.plazo}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-danger/25 bg-danger/10 text-danger"
                >
                  <Trash2 size={17} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-fg" style={{ letterSpacing: '-0.01em' }}>
                    ¿Querés eliminar tus datos?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    Hay un formulario específico para eso, que no requiere iniciar sesión y te da
                    un código de seguimiento.
                  </p>
                  <Link
                    to="/data-deletion"
                    className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Ir a Eliminación de Datos →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ───── Formulario ───── */}
          <div>
            <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
              <h2 className="text-xl font-bold text-fg" style={{ letterSpacing: '-0.025em' }}>
                Enviarnos un mensaje
              </h2>
              <p className="mt-2 mb-7 text-sm leading-relaxed text-fg-muted">
                Elegí el área y contanos en qué podemos ayudarte.
              </p>

              <div aria-live="polite">
                {enviado && (
                  <div className="mb-7 rounded-lg border border-success/30 bg-success/8 p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={19}
                        className="mt-0.5 flex-shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 text-sm leading-relaxed text-fg-muted">
                        <p className="font-semibold text-fg">Mensaje enviado</p>
                        <p className="mt-1">{enviado.message}</p>
                        <p className="mt-2">
                          Derivado a{' '}
                          <strong className="text-fg">{enviado.mensaje.derivado_a}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit(alEnviar)} noValidate>
                <CampoTrampa registro={register('sitio_web')} />

                <div className="space-y-5">
                  <CampoSeleccion
                    etiqueta="Área"
                    requerido
                    opciones={AREAS}
                    error={errors.area?.message}
                    registro={register('area', { required: 'Elegí un área.' })}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Campo
                      etiqueta="Nombre"
                      requerido
                      autoComplete="name"
                      placeholder="Ana Pérez"
                      error={errors.nombre?.message}
                      registro={register('nombre', {
                        required: 'Ingresá tu nombre.',
                        minLength: { value: 2, message: 'Ingresá tu nombre.' },
                      })}
                    />

                    <Campo
                      etiqueta="Correo electrónico"
                      tipo="email"
                      requerido
                      autoComplete="email"
                      placeholder="ana@empresa.com"
                      error={errors.email?.message}
                      registro={register('email', {
                        required: 'Ingresá tu correo electrónico.',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Ingresá un correo electrónico válido.',
                        },
                      })}
                    />
                  </div>

                  <Campo
                    etiqueta="Empresa"
                    autoComplete="organization"
                    placeholder="Tienda Ejemplo"
                    error={errors.empresa?.message}
                    registro={register('empresa')}
                  />

                  <Campo
                    etiqueta="Asunto"
                    requerido
                    placeholder="Resumí tu consulta en una línea"
                    error={errors.asunto?.message}
                    registro={register('asunto', {
                      required: 'Escribí un asunto.',
                      minLength: { value: 3, message: 'El asunto es demasiado corto.' },
                    })}
                  />

                  <CampoTexto
                    etiqueta="Mensaje"
                    requerido
                    filas={6}
                    placeholder="Contanos en detalle qué necesitás."
                    error={errors.mensaje?.message}
                    registro={register('mensaje', {
                      required: 'Escribí tu mensaje.',
                      minLength: {
                        value: 10,
                        message: 'Contanos un poco más (mínimo 10 caracteres).',
                      },
                      maxLength: {
                        value: 5000,
                        message: 'El mensaje no puede superar los 5000 caracteres.',
                      },
                    })}
                  />
                </div>

                {errorEnvio && (
                  <Alert tono="peligro" titulo="No se pudo enviar el mensaje" className="mt-6">
                    {errorEnvio}
                  </Alert>
                )}

                <div className="mt-7">
                  <Button type="submit" disabled={isSubmitting} tamano="lg" className="w-full sm:w-auto">
                    {isSubmitting ? (
                      <>
                        <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                        Enviando…
                      </>
                    ) : (
                      <>
                        <Send size={17} aria-hidden="true" />
                        Enviar mensaje
                      </>
                    )}
                  </Button>
                </div>

                <p className="mt-5 text-xs leading-relaxed text-fg-subtle">
                  Al enviar este formulario aceptás que tratemos tus datos para responder tu
                  consulta, conforme a nuestra{' '}
                  <Link to="/privacy" className="text-primary underline underline-offset-4">
                    Política de Privacidad
                  </Link>
                  . No los usamos para enviarte publicidad.
                </p>
              </form>
            </div>
          </div>
        </div>

        <Alert tono="info" titulo="Sobre los tiempos de respuesta" className="mt-14">
          Los plazos indicados corresponden a días hábiles y se cuentan desde la recepción del
          mensaje. Las solicitudes de ejercicio de derechos sobre datos personales tienen un plazo
          máximo de resolución de <strong>30 días corridos</strong>, según lo detallado en la{' '}
          <Link to="/privacy" className="text-primary underline underline-offset-4">
            Política de Privacidad
          </Link>
          .
        </Alert>
      </Container>
    </>
  );
}
