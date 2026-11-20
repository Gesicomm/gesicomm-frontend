import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Bell, Check, Copy, KeyRound, Loader, PowerOff, RefreshCw, Truck } from 'lucide-react';
import { movilExpressService } from '../../services/movilExpressService';
import './movil-express.css';

const money = valor => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(valor || 0);
const fecha = valor => (valor ? new Date(valor).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' }) : null);

/**
 * Los tres pasos de la puesta en marcha, en el orden en que dependen uno
 * del otro: sin clave verificada no se pueden declarar los avisos, y sin
 * avisos declarados los pedidos saldrían sin que nadie se entere de su
 * estado.
 *
 * Se muestra UNO a la vez. La versión anterior apilaba todo en la misma
 * pantalla y había que hacer scroll por cuatro bloques para saber en cuál
 * estabas; acá el paso actual ocupa la pantalla y los otros son un
 * encabezado en el que se puede volver.
 *
 * Lo que NO está acá, a propósito:
 *  - El courier. Móvil Express es el courier: se crea solo al activar.
 *  - El punto de despacho. Se decide en cada pedido, porque dos pedidos de
 *    la misma tienda pueden salir de depósitos distintos.
 */
function definirPasos(conexion) {
  return [
    {
      id: 'clave',
      titulo: 'Clave de la conexión',
      resumen: 'Conectar tu cuenta de Móvil Express',
      icono: KeyRound,
      listo: Boolean(conexion?.me_verified_at) && conexion?.merchant_estado === 'active',
      detalle: !conexion?.me_verified_at
        ? 'Cargá la clave que te entregó Móvil Express.'
        : conexion?.merchant_estado === 'active'
          ? `Conectada el ${fecha(conexion.me_verified_at)}`
          : conexion?.merchant_estado === 'review_required'
            ? 'Móvil Express está revisando el alta de tu comercio.'
            : 'La clave sirve, falta dar de alta tu comercio.',
    },
    {
      id: 'avisos',
      titulo: 'Avisos de estado',
      resumen: 'Que Móvil Express nos avise cada movimiento',
      icono: Bell,
      listo: Boolean(conexion?.tiene_webhook),
      detalle: conexion?.webhook_verified_at
        ? `Último aviso recibido el ${fecha(conexion.webhook_verified_at)}`
        : conexion?.tiene_webhook
          ? 'Declarados. Todavía no llegó ningún aviso.'
          : 'Falta declararlos.',
    },
    {
      id: 'activar',
      titulo: 'Probar y activar',
      resumen: 'Cotizar un envío y encender el servicio',
      icono: Truck,
      listo: Boolean(conexion?.activo),
      detalle: conexion?.activo ? `Activo desde el ${fecha(conexion.enabled_at)}` : 'Los envíos todavía no salen por Móvil Express.',
    },
  ];
}

export default function MovilExpressConfig({ onConfigChange }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [indice, setIndice] = useState(0);
  const [tocado, setTocado] = useState(false);
  const [form, setForm] = useState({ public_id: '', secret: '', usa_clave_plataforma: false });
  const [prueba, setPrueba] = useState({ ciudad: '', resultado: null });

  const conexion = datos?.conexion || null;
  const pasos = useMemo(() => definirPasos(conexion), [conexion]);
  const paso = pasos[indice] || pasos[0];

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await movilExpressService.obtener();
      setDatos(respuesta);
      setForm(previo => ({ ...previo, usa_clave_plataforma: respuesta.conexion?.usa_clave_plataforma ?? false }));
      return respuesta;
    } catch (problema) {
      setError(problema?.response?.data?.message || 'No pudimos consultar el estado de la conexión.');
      return null;
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Al abrir se arranca en el primer paso pendiente, no en el primero de
  // todos: a quien ya tiene la clave cargada no se le hace repetirla.
  useEffect(() => {
    if (tocado || !datos) return;
    const pendiente = definirPasos(datos.conexion).findIndex(item => !item.listo);
    setIndice(pendiente === -1 ? 2 : pendiente);
  }, [datos, tocado]);

  const ir = useCallback(destino => {
    setIndice(Math.max(0, Math.min(2, destino)));
    setTocado(true);
    setError('');
    setAviso('');
  }, []);

  const ejecutar = useCallback(async (id, accion, exito) => {
    setTrabajando(id);
    setError('');
    setAviso('');
    try {
      const resultado = await accion();
      await cargar();
      onConfigChange?.();
      setAviso(typeof exito === 'function' ? exito(resultado) : exito);
      return resultado;
    } catch (problema) {
      const cuerpo = problema?.response?.data;
      setError([cuerpo?.message || problema.message, cuerpo?.codigo ? `(${cuerpo.codigo})` : ''].filter(Boolean).join(' '));
      return null;
    } finally {
      setTrabajando('');
    }
  }, [cargar, onConfigChange]);

  const ocupado = Boolean(trabajando) || cargando;
  const ciudades = datos?.ciudades_cobertura || [];

  if (cargando && !datos) {
    return <p className="mex-cargando" role="status"><Loader size={16} className="mex-spin" /> Consultando la conexión con Móvil Express…</p>;
  }

  return (
    <section className="mex" aria-label="Puesta en marcha de Móvil Express">
      <header className="mex-encabezado">
        <div>
          <h4>Puesta en marcha</h4>
          <p>Tres pasos. Cuando los termines, cada pedido que confirmes sale solo a Móvil Express.</p>
        </div>
        <button type="button" className="raha-icon" aria-label="Actualizar estado" disabled={ocupado} onClick={cargar}>
          <RefreshCw size={16} />
        </button>
      </header>

      {/* Mapa de los pasos: dice dónde estás y deja volver a los hechos. */}
      <nav className="mex-mapa" aria-label="Pasos de la puesta en marcha">
        <p className="mex-mapa-movil">Paso {indice + 1} de {pasos.length}</p>
        <ol>
          {pasos.map((item, numero) => {
            const actual = numero === indice;
            const Icono = item.icono;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="mex-hito"
                  aria-current={actual ? 'step' : undefined}
                  data-estado={item.listo ? 'listo' : actual ? 'actual' : 'pendiente'}
                  onClick={() => ir(numero)}
                >
                  <span className="mex-hito-marca" aria-hidden="true">
                    {item.listo ? <Check size={15} /> : <Icono size={15} />}
                  </span>
                  <span className="mex-hito-texto">
                    <strong>{item.titulo}</strong>
                    <em>{item.listo ? 'Listo' : item.resumen}</em>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <p className="mex-ambiente">
        Ambiente: <strong>{datos?.environment === 'production' ? 'Producción' : 'Sandbox (pruebas)'}</strong>
        {!datos?.habilitado && <span className="mex-pausa"> · los envíos están pausados en el servidor</span>}
      </p>

      {error && <p className="raha-alert raha-error" role="alert"><AlertCircle size={16} />{error}</p>}
      {aviso && <p className="raha-alert raha-ok" role="status"><Check size={16} />{aviso}</p>}

      <div className="mex-panel">
        <h5>{paso.titulo}</h5>

        {paso.id === 'clave' && (
          <>
            <p className="mex-intro">
              Móvil Express entrega una clave de prueba (<code>mxt_</code>) y, cuando el convenio queda activo, una de
              producción (<code>mxk_</code>). Con la clave guardada damos de alta tu comercio del otro lado, con tus
              depósitos como puntos de retiro posibles.
            </p>

            <label className="mex-eleccion">
              <input
                type="checkbox"
                checked={form.usa_clave_plataforma}
                disabled={ocupado}
                onChange={evento => setForm(previo => ({ ...previo, usa_clave_plataforma: evento.target.checked }))}
              />
              <span>
                Usar el convenio de Gesicom
                <em>Los envíos salen por la conexión corporativa y no necesitás clave propia.</em>
              </span>
            </label>

            {!form.usa_clave_plataforma && (
              <div className="mex-campos">
                <label>
                  <span className="mex-etiqueta">Identificador público</span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder={conexion?.public_id_visible || 'mxt_…'}
                    value={form.public_id}
                    disabled={ocupado}
                    onChange={evento => setForm(previo => ({ ...previo, public_id: evento.target.value.trim() }))}
                  />
                </label>
                <label>
                  <span className="mex-etiqueta">Secreto</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder={conexion?.tiene_clave ? 'Guardado · escribí uno nuevo para reemplazarlo' : 'El secreto que te dieron'}
                    value={form.secret}
                    disabled={ocupado}
                    onChange={evento => setForm(previo => ({ ...previo, secret: evento.target.value }))}
                  />
                </label>
                <p className="mex-ayuda">
                  Se guarda cifrado y no se vuelve a mostrar. Móvil Express la entrega una sola vez: si la perdés, hay
                  que pedir una nueva.
                </p>
              </div>
            )}

            <div className="mex-acciones">
              <button
                type="button"
                className="raha-button raha-primary"
                disabled={ocupado}
                onClick={() => ejecutar('clave', async () => {
                  await movilExpressService.guardar({
                    usa_clave_plataforma: form.usa_clave_plataforma,
                    ...(form.public_id ? { public_id: form.public_id } : {}),
                    ...(form.secret ? { secret: form.secret } : {}),
                  });
                  setForm(previo => ({ ...previo, secret: '' }));
                  await movilExpressService.verificarClave();
                  // El alta del comercio va pegada a la clave: es el mismo
                  // trámite partido en dos llamadas, no una decisión del
                  // comercio.
                  return movilExpressService.registrarComercio();
                }, resultado => resultado?.estado === 'active'
                  ? 'Clave verificada y comercio dado de alta en Móvil Express.'
                  : 'Clave verificada. Móvil Express encontró un comercio parecido y está revisando el alta; te avisan cuando quede.')}
              >
                {trabajando === 'clave' ? <Loader size={16} className="mex-spin" /> : <KeyRound size={16} />}
                Conectar la cuenta
              </button>
              {conexion?.external_merchant_id && (
                <span className="mex-dato">Comercio: <code>{conexion.external_merchant_id}</code></span>
              )}
            </div>
          </>
        )}

        {paso.id === 'avisos' && (
          <>
            <p className="mex-intro">
              Móvil Express avisa a esta dirección cada movimiento del pedido: retirado, en ruta, entregado, ausente,
              devuelto. Los avisos vienen firmados y se verifica la firma antes de mover nada.
            </p>
            {datos?.webhook_url ? (
              <div className="mex-url">
                <code>{datos.webhook_url}</code>
                <button
                  type="button"
                  className="raha-icon"
                  aria-label="Copiar la dirección de avisos"
                  onClick={() => { navigator.clipboard?.writeText(datos.webhook_url); setAviso('Dirección de avisos copiada.'); }}
                >
                  <Copy size={15} />
                </button>
              </div>
            ) : (
              <p className="raha-alert raha-error" role="alert">
                <AlertCircle size={16} />
                Falta configurar la dirección pública del servidor (<code>MOVIL_EXPRESS_PUBLIC_BASE_URL</code>) para
                poder declarar los avisos.
              </p>
            )}
            <p className="mex-ayuda">Es una dirección del servidor de Gesicom. No hace falta que hagas nada con ella: el botón se la declara a Móvil Express.</p>
            <div className="mex-acciones">
              <button
                type="button"
                className="raha-button raha-primary"
                disabled={ocupado || !datos?.webhook_url || !conexion?.me_verified_at}
                onClick={() => ejecutar('avisos', movilExpressService.registrarWebhook, 'Avisos declarados y firma guardada.')}
              >
                {trabajando === 'avisos' ? <Loader size={16} className="mex-spin" /> : <Bell size={16} />}
                Declarar los avisos
              </button>
            </div>
            {!conexion?.me_verified_at && <p className="mex-ayuda">Primero hay que conectar la cuenta, en el paso 1.</p>}
          </>
        )}

        {paso.id === 'activar' && (
          <>
            <p className="mex-intro">
              Probá una cotización real: consulta el costo exacto del envío sin crear ningún pedido. Móvil Express
              cubre Asunción y Gran Asunción.
            </p>

            <div className="mex-prueba">
              <label>
                <span className="mex-etiqueta">Ciudad de destino</span>
                <select
                  value={prueba.ciudad}
                  disabled={ocupado || !ciudades.length}
                  onChange={evento => setPrueba({ ciudad: evento.target.value, resultado: null })}
                >
                  <option value="">Elegí una ciudad</option>
                  {ciudades.map(ciudad => (
                    <option key={ciudad.id} value={ciudad.nombre}>{ciudad.nombre}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="raha-button"
                disabled={ocupado || !prueba.ciudad || !conexion?.me_verified_at}
                onClick={() => ejecutar('cotizar', async () => {
                  const resultado = await movilExpressService.cotizar({ ciudad: prueba.ciudad });
                  setPrueba(previo => ({ ...previo, resultado }));
                  return resultado;
                }, resultado => resultado?.elegible
                  ? `Costo exacto para ${prueba.ciudad}: ${money(resultado.costo)}`
                  : `Sin tarifa para ${prueba.ciudad}: ${resultado?.motivo || 'destino fuera de cobertura.'}`)}
              >
                {trabajando === 'cotizar' ? <Loader size={16} className="mex-spin" /> : <Truck size={16} />}
                Cotizar
              </button>
            </div>
            {!ciudades.length && <p className="mex-ayuda">No pudimos cargar el listado de ciudades de Asunción y Gran Asunción.</p>}
            {prueba.resultado && (
              <p className={prueba.resultado.elegible ? 'mex-resultado mex-resultado-ok' : 'mex-resultado'}>
                {prueba.resultado.elegible
                  ? <>Envío a <strong>{prueba.resultado.ciudad_destino || prueba.ciudad}</strong>: <strong>{money(prueba.resultado.costo)}</strong></>
                  : <>{prueba.resultado.motivo}</>}
              </p>
            )}

            <hr className="mex-separador" />

            <p className="mex-intro">
              Al activar creamos el courier <strong>Móvil Express</strong> en tu lista. Desde ahí, cada pedido que
              confirmes con ese courier se manda solo; los que salgan con otro courier no se tocan. El punto de retiro
              sale del depósito desde el que se despacha ese pedido.
            </p>

            <div className="mex-acciones">
              <button
                type="button"
                className={conexion?.activo ? 'raha-button' : 'raha-button raha-primary'}
                disabled={ocupado || (!conexion?.activo && !(pasos[0].listo && pasos[1].listo))}
                onClick={() => ejecutar('activo', () => movilExpressService.guardar({ activo: !conexion?.activo }),
                  conexion?.activo ? 'Envíos con Móvil Express desactivados.' : 'Listo: los pedidos con el courier Móvil Express salen por el proveedor.')}
              >
                {trabajando === 'activo' ? <Loader size={16} className="mex-spin" /> : conexion?.activo ? <PowerOff size={16} /> : <Check size={16} />}
                {conexion?.activo ? 'Desactivar los envíos' : 'Activar los envíos'}
              </button>
              {conexion?.activo && datos?.courier && (
                <span className="mex-dato">Courier: <strong>{datos.courier.nombre}</strong></span>
              )}
            </div>

            {!conexion?.activo && !(pasos[0].listo && pasos[1].listo) && (
              <p className="mex-ayuda">Para activar faltan los pasos anteriores: {pasos.filter(item => !item.listo && item.id !== 'activar').map(item => item.titulo).join(' y ')}.</p>
            )}
          </>
        )}
      </div>

      <div className="mex-navegacion">
        <button type="button" className="raha-button" disabled={indice === 0} onClick={() => ir(indice - 1)}>
          <ArrowLeft size={16} /> Atrás
        </button>
        <span className="mex-navegacion-estado">{paso.detalle}</span>
        <button type="button" className="raha-button" disabled={indice === pasos.length - 1} onClick={() => ir(indice + 1)}>
          Siguiente <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
