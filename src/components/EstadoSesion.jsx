import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, WifiOff } from 'lucide-react';
import { registrarSesionPerdida } from '../utils/sesion';

/**
 * Pantallas compartidas por los guards de ruta mientras se resuelve la sesión.
 *
 * Regla del módulo: ninguna de estas pantallas es un callejón sin salida. El
 * spinner siempre termina en algo (sesión válida, login o error con
 * reintento), y si tarda demasiado se lo dice al usuario en vez de girar para
 * siempre — que es exactamente lo que pasaba en producción cuando vencía el
 * token.
 */

const SEGUNDOS_PARA_AVISAR = 8;

/** Spinner de verificación de sesión, con salida si se demora de más. */
export function PantallaVerificandoSesion({ onReintentar }) {
  const [demorado, setDemorado] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDemorado(true), SEGUNDOS_PARA_AVISAR * 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-screen flex-col items-center justify-center gap-5 bg-canvas px-6 text-center"
    >
      <div className="loader" />
      <span className="sr-only">Verificando tu sesión…</span>

      {demorado && (
        <div className="max-w-sm text-sm text-fg-muted">
          <p className="m-0">
            Esto está tardando más de lo normal. Puede ser tu conexión o que el
            servidor esté ocupado.
          </p>
          {onReintentar && (
            <button
              type="button"
              onClick={onReintentar}
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
            >
              <RotateCcw size={14} />
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** El backend no respondió: NO es sesión vencida, así que no se manda al login. */
export function PantallaErrorConexion({ onReintentar }) {
  return (
    <div className="flex h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[420px] rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <WifiOff size={22} className="text-warning" />
        </div>
        <h1 className="m-0 mb-2 text-lg font-semibold text-fg">
          No pudimos conectar con el servidor
        </h1>
        <p className="m-0 text-sm leading-relaxed text-fg-muted">
          Tu sesión sigue activa, pero no llegamos a verificarla. Revisá tu
          conexión a internet e intentá de nuevo.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onReintentar}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <RotateCcw size={15} />
            Reintentar
          </button>
          <a
            href="/login"
            className="rounded-md py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          >
            Ir al inicio de sesión
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Redirige al login dejando anotado el aviso de sesión vencida (solo si esta
 * pestaña llegó a tener sesión; a quien entra directo a una URL privada sin
 * haber iniciado sesión no hay nada que avisarle).
 */
export function RedirigirALogin() {
  const [avisado] = useState(() => registrarSesionPerdida());

  // El aviso lo pinta la pantalla de login leyendo sessionStorage; acá solo
  // dejamos el rastro en el render para las herramientas de test.
  return <Navigate to="/login" replace state={avisado ? { sesionExpirada: true } : undefined} />;
}

/** Aviso reutilizable de sesión vencida (lo usa la pantalla de login). */
export function AvisoSesionExpirada() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-md border border-warning/25 bg-warning/10 p-3.5 text-sm leading-snug text-fg">
      <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-warning" />
      <div>
        <strong className="font-semibold">Tu sesión expiró</strong>
        <div className="mt-0.5 text-fg-muted">
          Por seguridad cerramos la sesión después de un tiempo de inactividad.
          Por favor, volvé a ingresar para continuar.
        </div>
      </div>
    </div>
  );
}
