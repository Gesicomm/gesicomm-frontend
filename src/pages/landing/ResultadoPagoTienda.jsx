import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, Loader } from 'lucide-react';
import { consultarResultadoPagoLanding } from '../../services/landingPublicaService';
import { formatMoneda } from '../../utils/currency';

const INTENTOS_MAX = 10;
const ESPERA_MS = 3000;

export default function ResultadoPagoTienda() {
  const { hash } = useParams();
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [intentos, setIntentos] = useState(0);
  const cancelado = useRef(false);

  useEffect(() => {
    cancelado.current = false;
    let timer;

    async function consultar(n) {
      try {
        const data = await consultarResultadoPagoLanding(hash);
        if (cancelado.current) return;
        setEstado(data);
        setIntentos(n);

        if (!data.pagado && n < INTENTOS_MAX) {
          timer = setTimeout(() => consultar(n + 1), ESPERA_MS);
        }
      } catch (err) {
        if (cancelado.current) return;
        setError(err.message || 'No pudimos consultar el resultado del pago.');
      }
    }

    consultar(0);
    return () => {
      cancelado.current = true;
      clearTimeout(timer);
    };
  }, [hash]);

  const contenedor = 'min-h-screen bg-white text-slate-950 flex items-center justify-center px-4 py-12';
  const tarjeta = 'w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm';

  if (error) {
    return (
      <main className={contenedor}>
        <section className={tarjeta}>
          <AlertCircle className="mx-auto mb-4 text-red-500" size={44} />
          <h1 className="text-2xl font-semibold">No pudimos verificar tu pago</h1>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
          <p className="mt-5 text-xs text-slate-500">Referencia: <code>{hash}</code></p>
          <Link className="mt-6 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" to="/">
            Volver a la tienda
          </Link>
        </section>
      </main>
    );
  }

  if (!estado) {
    return (
      <main className={contenedor}>
        <section className={tarjeta}>
          <Loader className="mx-auto mb-4 animate-spin text-slate-500" size={40} />
          <h1 className="text-2xl font-semibold">Verificando tu pago...</h1>
        </section>
      </main>
    );
  }

  if (!estado.pagado) {
    const agotado = intentos >= INTENTOS_MAX;
    return (
      <main className={contenedor}>
        <section className={tarjeta}>
          {agotado ? (
            <Clock className="mx-auto mb-4 text-amber-500" size={44} />
          ) : (
            <Loader className="mx-auto mb-4 animate-spin text-slate-500" size={40} />
          )}
          <h1 className="text-2xl font-semibold">
            {agotado ? 'Tu pago sigue procesándose' : 'Confirmando tu pago...'}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {agotado
              ? 'PagoPar todavía no confirmó la operación. Si el débito se realizó, la tienda podrá verificarlo con esta referencia.'
              : 'Esperando la confirmación de PagoPar. No cierres esta pantalla.'}
          </p>
          <p className="mt-5 text-xs text-slate-500">Referencia: <code>{hash}</code></p>
        </section>
      </main>
    );
  }

  return (
    <main className={contenedor}>
      <section className={tarjeta}>
        <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={48} />
        <h1 className="text-2xl font-semibold">Pago acreditado</h1>
        <p className="mt-3 text-sm text-slate-600">
          Recibimos el pago del pedido #{estado.numero_pedido || estado.pedido_id}
          {estado.monto ? <> por <strong>{formatMoneda(estado.monto)}</strong></> : null}.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          La tienda ya puede preparar tu pedido.
        </p>
        <p className="mt-5 text-xs text-slate-500">Referencia: <code>{hash}</code></p>
        <Link className="mt-6 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" to="/">
          Volver a la tienda
        </Link>
      </section>
    </main>
  );
}
