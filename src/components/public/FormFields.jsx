import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

const CLASES_CONTROL =
  'w-full rounded-md border bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Campos de formulario accesibles, compartidos por los formularios públicos.
 *
 * Tres detalles hacen el trabajo de accesibilidad, y los tres son fáciles de
 * omitir: el <label> asociado por id, `aria-invalid` para que el lector de
 * pantalla anuncie el campo como erróneo, y `aria-describedby` apuntando al
 * mensaje de error para que lo lea al enfocar el campo. Sin el tercero, el
 * error existe visualmente pero no para quien no lo ve.
 */
export function Campo({
  etiqueta,
  error,
  ayuda,
  requerido = false,
  tipo = 'text',
  registro,
  ...resto
}) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const descritoPor = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {etiqueta}
        {requerido && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
        {!requerido && <span className="ml-2 text-xs font-normal text-fg-subtle">(opcional)</span>}
      </label>

      <input
        id={id}
        type={tipo}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={descritoPor || undefined}
        className={`${CLASES_CONTROL} ${
          error ? 'border-danger' : 'border-border focus:border-primary'
        }`}
        {...registro}
        {...resto}
      />

      {ayuda && !error && (
        <p id={idAyuda} className="mt-1.5 text-xs text-fg-subtle">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function CampoTexto({ etiqueta, error, ayuda, requerido = false, filas = 5, registro, ...resto }) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const descritoPor = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {etiqueta}
        {requerido && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
        {!requerido && <span className="ml-2 text-xs font-normal text-fg-subtle">(opcional)</span>}
      </label>

      <textarea
        id={id}
        rows={filas}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={descritoPor || undefined}
        className={`${CLASES_CONTROL} resize-y ${
          error ? 'border-danger' : 'border-border focus:border-primary'
        }`}
        {...registro}
        {...resto}
      />

      {ayuda && !error && (
        <p id={idAyuda} className="mt-1.5 text-xs text-fg-subtle">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function CampoSeleccion({ etiqueta, error, ayuda, opciones, requerido = false, registro, ...resto }) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const descritoPor = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {etiqueta}
        {requerido && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <select
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={descritoPor || undefined}
        className={`${CLASES_CONTROL} ${
          error ? 'border-danger' : 'border-border focus:border-primary'
        }`}
        {...registro}
        {...resto}
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>

      {ayuda && !error && (
        <p id={idAyuda} className="mt-1.5 text-xs text-fg-subtle">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function CampoCasilla({ etiqueta, error, registro, ...resto }) {
  const id = useId();
  const idError = `${id}-error`;

  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? idError : undefined}
          className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer accent-[var(--color-primary)]"
          {...registro}
          {...resto}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-fg-muted">
          {etiqueta}
        </label>
      </div>
      {error && (
        <p id={idError} className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Campo trampa para bots.
 *
 * Va oculto por CSS y fuera del orden de tabulación, con autoComplete="off"
 * para que ningún gestor de contraseñas lo rellene por su cuenta. Una persona
 * nunca lo completa; muchos bots rellenan todo lo que encuentran en el DOM.
 * El backend descarta en silencio cualquier envío que traiga este campo con
 * contenido (ver el middleware honeypot en src/routes/publico.js).
 *
 * No se usa `type="hidden"`: los bots suelen ignorar esos campos. Tiene que
 * parecer un campo real y estar escondido visualmente.
 */
export function CampoTrampa({ registro }) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor="sitio_web">Sitio web (no completar)</label>
      <input id="sitio_web" type="text" tabIndex={-1} autoComplete="off" {...registro} />
    </div>
  );
}
