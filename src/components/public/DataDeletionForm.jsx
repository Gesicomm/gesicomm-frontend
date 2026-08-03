import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { CheckCircle2, Copy, Loader2, Trash2 } from 'lucide-react';

import { Campo, CampoCasilla, CampoTexto, CampoTrampa } from './FormFields';
import Alert from './Alert';
import Button from './Button';
import { solicitarEliminacionDatos } from '../../services/publicoService';

/**
 * Formulario público de solicitud de eliminación de datos.
 *
 * Es el mecanismo que exige Meta para las aplicaciones que usan Facebook
 * Login: tiene que funcionar sin iniciar sesión, porque quien ya perdió el
 * acceso a su cuenta conserva igual su derecho de supresión.
 */
export default function DataDeletionForm() {
  const [resultado, setResultado] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { nombre: '', email: '', empresa: '', motivo: '', confirmacion: false, sitio_web: '' },
  });

  const alEnviar = async (datos) => {
    setErrorEnvio(null);
    try {
      const respuesta = await solicitarEliminacionDatos(datos);
      setResultado(respuesta);
    } catch (error) {
      setErrorEnvio(error.message);
    }
  };

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(resultado.solicitud.codigo);
      setCodigoCopiado(true);
      window.setTimeout(() => setCodigoCopiado(false), 2500);
    } catch {
      // Sin permiso de portapapeles el código sigue visible en pantalla para
      // copiarlo a mano: no vale la pena molestar con un error por esto.
    }
  };

  if (resultado) {
    const { codigo, fecha_limite: fechaLimite } = resultado.solicitud;

    return (
      <div className="not-prose rounded-xl border border-success/30 bg-success/8 p-7">
        <div className="flex items-start gap-3.5">
          <CheckCircle2 size={22} className="mt-0.5 flex-shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-fg" style={{ letterSpacing: '-0.02em' }}>
              Solicitud registrada
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{resultado.message}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-canvas p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            Tu código de seguimiento
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <code className="break-all font-mono text-base font-semibold text-fg">{codigo}</code>
            <button
              type="button"
              onClick={copiarCodigo}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              <Copy size={13} aria-hidden="true" />
              {codigoCopiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="mt-3 text-sm text-fg-muted">
            Guardalo: es la única forma de consultar el estado de tu solicitud.
          </p>
        </div>

        <div className="mt-5 space-y-2 text-sm text-fg-muted">
          <p>
            <strong className="text-fg">Fecha límite de procesamiento:</strong>{' '}
            {new Date(fechaLimite).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p>
            Nuestro equipo de privacidad se va a comunicar a la dirección que indicaste para
            verificar tu identidad. Si necesitás apurar el trámite o agregar información,
            escribinos a{' '}
            <a href="mailto:privacy@gesicomm.com" className="text-primary underline underline-offset-4">
              privacy@gesicomm.com
            </a>{' '}
            citando tu código.
          </p>
        </div>

        <div className="mt-6">
          <Button to={`/data-deletion/estado/${codigo}`} variante="secundario">
            Ver el estado de mi solicitud
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(alEnviar)} noValidate className="not-prose">
      <CampoTrampa registro={register('sitio_web')} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre completo"
          requerido
          autoComplete="name"
          placeholder="Ana Pérez"
          error={errors.nombre?.message}
          registro={register('nombre', {
            required: 'Ingresá tu nombre completo.',
            minLength: { value: 2, message: 'Ingresá tu nombre completo.' },
          })}
        />

        <Campo
          etiqueta="Correo electrónico"
          tipo="email"
          requerido
          autoComplete="email"
          placeholder="ana@empresa.com"
          ayuda="Usá el correo con el que te registraste."
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

      <div className="mt-5">
        <Campo
          etiqueta="Empresa o nombre de la tienda"
          placeholder="Tienda Ejemplo"
          ayuda="Nos ayuda a localizar tu cuenta más rápido."
          error={errors.empresa?.message}
          registro={register('empresa')}
        />
      </div>

      <div className="mt-5">
        <CampoTexto
          etiqueta="Motivo de la solicitud"
          filas={4}
          placeholder="Contanos brevemente por qué querés eliminar tus datos. No es obligatorio, pero nos ayuda a mejorar."
          error={errors.motivo?.message}
          registro={register('motivo', {
            maxLength: { value: 2000, message: 'El motivo no puede superar los 2000 caracteres.' },
          })}
        />
      </div>

      <div className="mt-7 rounded-lg border border-warning/35 bg-warning/8 p-4">
        <CampoCasilla
          etiqueta={
            <>
              Entiendo que la eliminación es <strong className="text-fg">permanente e
              irreversible</strong>, que perderé el acceso a mi cuenta y a todo su contenido
              —catálogo, pedidos, clientes e historial— y que Gesicomm podrá conservar cierta
              información cuando una obligación legal lo exija, según se detalla en los{' '}
              <Link to="/privacy" className="text-primary underline underline-offset-4">
                plazos de retención
              </Link>
              .
            </>
          }
          error={errors.confirmacion?.message}
          registro={register('confirmacion', {
            required: 'Tenés que confirmar que entendés que la eliminación es permanente.',
          })}
        />
      </div>

      {errorEnvio && (
        <Alert tono="peligro" titulo="No se pudo enviar la solicitud" className="mt-6">
          {errorEnvio}
        </Alert>
      )}

      <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Button type="submit" disabled={isSubmitting} tamano="lg">
          {isSubmitting ? (
            <>
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Enviando…
            </>
          ) : (
            <>
              <Trash2 size={17} aria-hidden="true" />
              Solicitar eliminación
            </>
          )}
        </Button>

        <p className="text-xs leading-relaxed text-fg-subtle">
          Al enviar aceptás que verifiquemos tu identidad antes de procesar la solicitud.
        </p>
      </div>
    </form>
  );
}
