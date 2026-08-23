import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, Search, ShieldQuestion, XCircle } from 'lucide-react';

import Seo from '../../components/public/Seo';
import Breadcrumb from '../../components/public/Breadcrumb';
import Alert from '../../components/public/Alert';
import Button from '../../components/public/Button';
import { Container } from '../../components/public/Section';
import { consultarEstadoEliminacion } from '../../services/publicoService';

const ESTADOS = {
  recibida: {
    etiqueta: 'Recibida',
    descripcion: 'Tu solicitud está registrada y en cola para la verificación de identidad.',
    Icono: Clock,
    clases: 'border-info/30 bg-info/8 text-info',
  },
  verificando_identidad: {
    etiqueta: 'Verificando identidad',
    descripcion:
      'Te enviamos un correo para confirmar que la solicitud proviene del titular. Revisá tu bandeja de entrada y la carpeta de correo no deseado.',
    Icono: ShieldQuestion,
    clases: 'border-warning/35 bg-warning/8 text-warning',
  },
  en_proceso: {
    etiqueta: 'En proceso',
    descripcion:
      'Identidad confirmada. Estamos eliminando tu información de todos los sistemas donde esté.',
    Icono: Loader2,
    clases: 'border-primary/30 bg-primary/10 text-primary',
  },
  completada: {
    etiqueta: 'Completada',
    descripcion:
      'La eliminación terminó. Tus datos personales fueron borrados de nuestros sistemas activos.',
    Icono: CheckCircle2,
    clases: 'border-success/30 bg-success/8 text-success',
  },
  rechazada: {
    etiqueta: 'Rechazada',
    descripcion:
      'No pudimos procesar la solicitud. Te enviamos el motivo por correo. Si creés que fue un error, escribinos a contacto@gesicomm.com.',
    Icono: XCircle,
    clases: 'border-danger/35 bg-danger/8 text-danger',
  },
};

const formatearFecha = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

/**
 * Página pública de estado de una solicitud de eliminación de datos.
 *
 * Es la URL que se le devuelve a Meta en el Data Deletion Callback, así que
 * tiene que ser accesible sin sesión y funcionar con el código solo. Por eso
 * también va con noIndex: el código es la única credencial, y no tiene
 * sentido que estas páginas terminen en un buscador.
 */
export default function DataDeletionStatus() {
  const { codigo: codigoUrl } = useParams();
  const navigate = useNavigate();

  const [codigoBuscado, setCodigoBuscado] = useState(codigoUrl || '');
  const [solicitud, setSolicitud] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const consultar = useCallback(async (codigo) => {
    setCargando(true);
    setError(null);
    setSolicitud(null);
    try {
      setSolicitud(await consultarEstadoEliminacion(codigo));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (codigoUrl) {
      setCodigoBuscado(codigoUrl);
      consultar(codigoUrl);
    }
  }, [codigoUrl, consultar]);

  const alBuscar = (evento) => {
    evento.preventDefault();
    const codigo = codigoBuscado.trim();
    if (!codigo) return;
    // Navegar en vez de consultar directamente deja la URL compartible y
    // recargable, que es justamente lo que se le promete a Meta.
    navigate(`/data-deletion/estado/${encodeURIComponent(codigo)}`);
  };

  const info = solicitud ? ESTADOS[solicitud.estado] : null;

  return (
    <>
      <Seo
        titulo="Estado de la solicitud de eliminación"
        descripcion="Consultá el estado de tu solicitud de eliminación de datos personales en Gesicom usando el código de seguimiento."
        ruta="/data-deletion/estado"
        noIndex
      />

      <div className="border-b border-border bg-surface">
        <Container className="py-12 sm:py-16">
          <Breadcrumb
            migas={[
              { etiqueta: 'Inicio', href: '/' },
              { etiqueta: 'Eliminación de Datos', href: '/data-deletion' },
              { etiqueta: 'Estado de la solicitud', href: '/data-deletion/estado' },
            ]}
            className="mb-7"
          />
          <h1
            className="max-w-3xl text-3xl font-bold text-fg sm:text-[2.6rem] sm:leading-[1.1]"
            style={{ letterSpacing: '-0.035em' }}
          >
            Estado de tu solicitud
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            Ingresá el código de seguimiento que recibiste al solicitar la eliminación de tus datos.
          </p>
        </Container>
      </div>

      <Container ancho="estrecho" className="py-12 sm:py-16">
        <form onSubmit={alBuscar} className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="codigo-solicitud" className="mb-1.5 block text-sm font-medium text-fg">
              Código de seguimiento
            </label>
            <input
              id="codigo-solicitud"
              type="text"
              value={codigoBuscado}
              onChange={(evento) => setCodigoBuscado(evento.target.value)}
              placeholder="Por ejemplo: 4f2a9c1e7b3d8065af12cd94"
              autoComplete="off"
              spellCheck="false"
              className="w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 font-mono text-sm text-fg transition-colors placeholder:font-sans placeholder:text-fg-subtle focus:border-primary focus:outline-none"
            />
          </div>
          <div className="sm:pt-7">
            <Button type="submit" disabled={cargando || !codigoBuscado.trim()} className="w-full sm:w-auto">
              {cargando ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Search size={16} aria-hidden="true" />
              )}
              Consultar
            </Button>
          </div>
        </form>

        {/* aria-live: quien usa lector de pantalla tiene que enterarse del
            resultado sin volver a recorrer la página. */}
        <div aria-live="polite" className="mt-8">
          {error && (
            <Alert tono="advertencia" titulo="No encontramos esa solicitud">
              <p>{error}</p>
              <p className="mt-2">
                Verificá que el código esté completo y sin espacios. Si el problema persiste,
                escribinos a{' '}
                <a
                  href="mailto:contacto@gesicomm.com"
                  className="text-primary underline underline-offset-4"
                >
                  contacto@gesicomm.com
                </a>{' '}
                y lo revisamos.
              </p>
            </Alert>
          )}

          {solicitud && info && (
            <div className="rounded-xl border border-border bg-surface p-7">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 ${info.clases}`}>
                <info.Icono
                  size={15}
                  aria-hidden="true"
                  className={solicitud.estado === 'en_proceso' ? 'animate-spin' : ''}
                />
                <span className="text-sm font-semibold">{info.etiqueta}</span>
              </div>

              <p className="mt-5 text-base leading-relaxed text-fg-muted">{info.descripcion}</p>

              <dl className="mt-7 grid gap-5 border-t border-border pt-6 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    Solicitud recibida
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-fg">
                    {formatearFecha(solicitud.recibida_en)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    {solicitud.procesada_en ? 'Procesada el' : 'Fecha límite'}
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-fg">
                    {formatearFecha(solicitud.procesada_en || solicitud.fecha_limite)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    Plazo comprometido
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-fg">{solicitud.plazo_dias} días</dd>
                </div>
              </dl>

              <div className="mt-6 border-t border-border pt-5">
                <p className="font-mono text-xs text-fg-subtle">Código: {solicitud.codigo}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <h2 className="text-base font-semibold text-fg" style={{ letterSpacing: '-0.02em' }}>
            ¿No tenés un código?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            El código se genera al enviar una solicitud de eliminación. Si todavía no hiciste una,
            podés hacerla desde la página de eliminación de datos.
          </p>
          <div className="mt-5">
            <Button to="/data-deletion" variante="secundario">
              Ir a Eliminación de Datos
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
}
