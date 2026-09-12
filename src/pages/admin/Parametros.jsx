import React, { useState, useEffect, useMemo } from 'react';
import {
  Save, Loader, ShieldCheck, AlertCircle, CheckCircle2, KeyRound, Phone, Info, Mail,
} from 'lucide-react';
import { parametrosService } from '../../services/parametrosService';
import './parametros.css';

/**
 * Configuración del sistema (solo admin).
 *
 * Estos parámetros son de GESICOMM, no de un comercio. Ojo con la diferencia:
 * las credenciales de PagoPar que se cargan acá son las que usa Gesicomm para
 * cobrar las suscripciones de sus clientes. Cada comercio carga las SUYAS en
 * /mi-tienda → Pagos, para cobrarle a sus propios compradores. Son dos cosas
 * distintas que se parecen mucho, así que la pantalla lo dice explícito.
 *
 * El token privado nunca vuelve del backend: solo llega si está configurado o
 * no. Por eso el campo se deja vacío y vacío significa "no lo toques".
 */

const GRUPOS = [
  {
    id: 'pagopar',
    titulo: 'PagoPar de Gesicomm',
    icono: KeyRound,
    desc: 'Credenciales con las que Gesicomm cobra las suscripciones de sus clientes. No son las de ningún comercio.',
    campos: [
      { clave: 'PAGOPAR_PUBLIC_KEY', label: 'Token público', placeholder: '579b67fc967f03c923969dbc08095827' },
      { clave: 'PAGOPAR_PRIVATE_KEY', label: 'Token privado', placeholder: 'Pegalo solo si lo vas a cambiar', secreto: true },
    ],
  },
  {
    id: 'contacto',
    titulo: 'Contacto del administrador',
    icono: Phone,
    desc: 'A dónde escriben los comercios cuando tienen un problema de cobro o de plan.',
    campos: [
      { clave: 'ADMIN_TELEFONO_CONTACTO', label: 'WhatsApp / teléfono', placeholder: '595981234567', ayuda: 'Con código de país, sin espacios ni signos.' },
    ],
  },
  {
    id: 'notificaciones',
    titulo: 'Notificaciones internas',
    icono: Mail,
    desc: 'Correos internos de Gesicom para avisos operativos del sistema.',
    campos: [
      {
        clave: 'ABASTECIMIENTO_NOTIFICACION_EMAIL',
        label: 'Email para abastecimiento',
        placeholder: 'operaciones@gesicomm.com',
        ayuda: 'A este correo llega el aviso cuando un pedido confirmado requiere pago o acreditación de abastecimiento.',
        tipo: 'email',
      },
    ],
  },
];

export default function Parametros() {
  const [estado, setEstado] = useState([]);
  const [valores, setValores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try {
      const data = await parametrosService.listar();
      setEstado(Array.isArray(data) ? data : []);
      // Los no secretos se precargan con lo que hay; los secretos quedan
      // vacíos a propósito (el backend no los devuelve).
      const iniciales = {};
      (data || []).forEach(p => { if (!p.secreto && p.valor) iniciales[p.clave] = p.valor; });
      setValores(iniciales);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los parámetros.');
    } finally {
      setCargando(false);
    }
  }

  const porClave = useMemo(
    () => Object.fromEntries(estado.map(p => [p.clave, p])),
    [estado],
  );

  function cambiar(clave, valor) {
    setValores(prev => ({ ...prev, [clave]: valor }));
    setOk(null);
  }

  // Solo se manda lo que tiene contenido: un secreto vacío significa
  // "dejalo como está", no "borralo".
  const cambios = useMemo(() => {
    const salida = {};
    Object.entries(valores).forEach(([clave, valor]) => {
      const original = porClave[clave];
      const limpio = String(valor ?? '').trim();
      if (!limpio) return;
      if (!original?.secreto && limpio === (original?.valor || '')) return; // sin cambios
      salida[clave] = limpio;
    });
    return salida;
  }, [valores, porClave]);

  const hayCambios = Object.keys(cambios).length > 0;

  async function guardar(e) {
    e.preventDefault();
    if (!hayCambios) return;
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      const res = await parametrosService.guardar(cambios);
      setOk(`Guardado: ${(res.actualizados || Object.keys(cambios)).join(', ')}.`);
      // Limpiar los secretos del formulario y releer el estado real.
      setValores(prev => {
        const copia = { ...prev };
        Object.keys(cambios).forEach(k => { if (porClave[k]?.secreto) delete copia[k]; });
        return copia;
      });
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron guardar los parámetros.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="pa-page">
        <div className="pa-cargando"><Loader size={20} className="spin-icon" /><span>Cargando parámetros...</span></div>
      </div>
    );
  }

  return (
    <div className="pa-page">
      <header className="pa-head">
        <h1>Configuración del sistema</h1>
        <p>
          Parámetros de Gesicomm, editables sin tocar el servidor. Los valores secretos
          se guardan cifrados y no se muestran una vez cargados.
        </p>
      </header>

      {error && (
        <div className="pa-alerta error"><AlertCircle size={16} /><span>{error}</span></div>
      )}
      {ok && (
        <div className="pa-alerta ok"><CheckCircle2 size={16} /><span>{ok}</span></div>
      )}

      <form onSubmit={guardar} className="pa-form">
        {GRUPOS.map(grupo => {
          const Icono = grupo.icono;
          return (
            <section key={grupo.id} className="pa-grupo">
              <div className="pa-grupo-head">
                <span className="pa-grupo-icon"><Icono size={16} /></span>
                <div>
                  <h2>{grupo.titulo}</h2>
                  <p>{grupo.desc}</p>
                </div>
              </div>

              <div className="pa-campos">
                {grupo.campos.map(campo => {
                  const info = porClave[campo.clave];
                  return (
                    <label key={campo.clave} className="pa-campo">
                      <span className="pa-campo-label">
                        {campo.label}
                        {info && (
                          <span className={`pa-estado ${info.configurado ? 'ok' : 'falta'}`}>
                            {info.configurado
                              ? (info.origen === 'entorno' ? 'Cargado desde el .env' : 'Configurado')
                              : 'Sin configurar'}
                          </span>
                        )}
                      </span>

                      <input
                        type={campo.secreto ? 'password' : (campo.tipo || 'text')}
                        value={valores[campo.clave] || ''}
                        onChange={e => cambiar(campo.clave, e.target.value)}
                        placeholder={campo.placeholder}
                        autoComplete={campo.secreto ? 'new-password' : 'off'}
                        spellCheck={false}
                      />

                      {campo.ayuda && <span className="pa-ayuda">{campo.ayuda}</span>}
                      {campo.secreto && (
                        <span className="pa-ayuda">
                          <ShieldCheck size={12} /> Se cifra antes de guardarse y nunca vuelve a mostrarse.
                          {info?.configurado ? ' Dejalo vacío para conservar el actual.' : ''}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="pa-nota">
          <Info size={14} />
          <span>
            Los tokens público y privado de PagoPar son un <strong>par</strong>: se validan juntos.
            Si regenerás en el panel de PagoPar, tenés que actualizar los dos acá o los cobros
            van a fallar con “Token no coincide”.
          </span>
        </div>

        <div className="pa-footer">
          <span className="pa-footer-nota">
            {hayCambios
              ? `Hay ${Object.keys(cambios).length} cambio(s) sin guardar.`
              : 'No hay cambios pendientes.'}
          </span>
          <button type="submit" className="pa-btn" disabled={guardando || !hayCambios}>
            {guardando ? <Loader size={15} className="spin-icon" /> : <Save size={15} />}
            Guardar parámetros
          </button>
        </div>
      </form>
    </div>
  );
}
