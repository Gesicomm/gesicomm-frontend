import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { planesService } from '../../services/planesService';
import { formatMoneda } from '../../utils/currency';
import './planes.css';

/**
 * Pantalla a la que PagoPar devuelve al comprador después de pagar
 * (URL DE REDIRECCIONAMIENTO del panel de PagoPar).
 *
 * El pago NO se da por bueno porque el navegador haya vuelto acá: eso lo
 * decide el callback server-to-server. Esta pantalla solo consulta el estado
 * real y espera. Por eso reintenta: la redirección del comprador suele
 * llegar antes que el aviso de PagoPar a nuestro backend.
 */
const INTENTOS_MAX = 10;
const ESPERA_MS = 3000;

export default function ResultadoPago() {
  const { hash } = useParams();
  const navigate = useNavigate();
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [intentos, setIntentos] = useState(0);
  const cancelado = useRef(false);

  useEffect(() => {
    cancelado.current = false;
    let timer;

    async function consultar(n) {
      try {
        const data = await planesService.estado(hash);
        if (cancelado.current) return;
        setEstado(data);
        setIntentos(n);

        if (data.estado_pago !== 'PAID' && data.estado_pago !== 'FAILED' && n < INTENTOS_MAX) {
          timer = setTimeout(() => consultar(n + 1), ESPERA_MS);
        }
      } catch (err) {
        if (cancelado.current) return;
        setError(err.response?.data?.error || 'No pudimos consultar el estado de tu pago.');
      }
    }

    consultar(0);
    return () => { cancelado.current = true; clearTimeout(timer); };
  }, [hash]);

  if (error) {
    return (
      <div className="pl-page pl-resultado">
        <div className="pl-estado error">
          <AlertCircle size={40} />
          <h1>No pudimos verificar tu pago</h1>
          <p>{error}</p>
          <p className="pl-referencia">Referencia: <code>{hash}</code></p>
          <p className="pl-field-nota">Guardá esa referencia y escribinos: podemos verificarlo a mano.</p>
        </div>
      </div>
    );
  }

  if (!estado) {
    return (
      <div className="pl-page pl-resultado">
        <div className="pl-estado">
          <Loader size={36} className="spin-icon" />
          <h1>Verificando tu pago...</h1>
        </div>
      </div>
    );
  }

  const pagado = estado.estado_pago === 'PAID';
  const fallido = estado.estado_pago === 'FAILED';

  if (fallido) {
    return (
      <div className="pl-page pl-resultado">
        <div className="pl-estado error">
          <AlertCircle size={40} />
          <h1>El pago no fue acreditado</h1>
          <p>{estado.error_pago || 'PagoPar informó que la operación no quedó pagada.'}</p>
          <button type="button" className="pl-cta primario" onClick={() => navigate('/planes')}>
            Volver a intentar <ArrowRight size={16} />
          </button>
          <p className="pl-referencia">Referencia: <code>{hash}</code></p>
        </div>
      </div>
    );
  }

  if (!pagado) {
    const agotado = intentos >= INTENTOS_MAX;
    return (
      <div className="pl-page pl-resultado">
        <div className="pl-estado pendiente">
          {agotado ? <Clock size={40} /> : <Loader size={36} className="spin-icon" />}
          <h1>{agotado ? 'Tu pago sigue procesándose' : 'Confirmando tu pago...'}</h1>
          <p>
            {agotado
              ? 'PagoPar todavía no nos confirmó la operación. Puede tardar unos minutos — te avisamos por correo apenas se acredite.'
              : 'Esperando la confirmación de PagoPar. No cierres esta pantalla.'}
          </p>
          <p className="pl-referencia">Referencia: <code>{hash}</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-page pl-resultado">
      <div className="pl-estado ok">
        <CheckCircle2 size={44} />
        <h1>¡Pago acreditado!</h1>
        <p>
          Tu plan <strong>{estado.plan?.nombre}</strong> quedó activo
          {estado.monto ? <> por {formatMoneda(estado.monto)}</> : null}.
        </p>

        {estado.token_registro ? (
          <>
            <p>Último paso: creá tu cuenta con <strong>{estado.email}</strong> para entrar al sistema.</p>
            <button
              type="button"
              className="pl-cta primario"
              onClick={() => navigate(`/registro?token=${estado.token_registro}`)}
            >
              Crear mi cuenta <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <p>Tu cuenta ya está creada. Ya podés continuar con tu plan activo.</p>
            <button type="button" className="pl-cta primario" onClick={() => navigate('/mi-dashboard')}>
              Ir a mi panel <ArrowRight size={16} />
            </button>
          </>
        )}

        <p className="pl-referencia">Referencia: <code>{hash}</code></p>
      </div>
    </div>
  );
}
