import API from './api';

/**
 * Endpoints públicos del sitio institucional: no requieren sesión.
 *
 * Todos normalizan el error a un mensaje mostrable. El backend responde con
 * `message` para los errores de negocio y con `errores[]` cuando falla la
 * validación de esquema; acá se unifican para que el formulario solo tenga
 * que renderizar un string.
 */

function mensajeDeError(error, respaldo) {
  const datos = error?.response?.data;

  if (datos?.errores?.length) {
    return datos.errores.map((e) => e.mensaje).join(' ');
  }
  if (datos?.message) return datos.message;
  // Sin respuesta del servidor: no llegó la solicitud (red caída, CORS, API
  // apagada). Conviene distinguirlo de un rechazo del servidor, porque la
  // acción que tiene que tomar la persona es distinta.
  if (!error?.response) {
    return 'No pudimos conectar con el servidor. Revisá tu conexión y volvé a intentar.';
  }
  return respaldo;
}

/** Alta de una solicitud pública de eliminación de datos. */
export async function solicitarEliminacionDatos(datos) {
  try {
    const { data } = await API.post('/publico/eliminacion-datos', datos);
    return data;
  } catch (error) {
    throw new Error(
      mensajeDeError(error, 'No se pudo registrar la solicitud. Escribinos a privacy@gesicomm.com.')
    );
  }
}

/** Consulta del estado de una solicitud a partir de su código público. */
export async function consultarEstadoEliminacion(codigo) {
  try {
    const { data } = await API.get(`/publico/eliminacion-datos/${encodeURIComponent(codigo)}`);
    return data.solicitud;
  } catch (error) {
    throw new Error(
      mensajeDeError(error, 'No se pudo consultar el estado de la solicitud.')
    );
  }
}

/** Envío del formulario de contacto. */
export async function enviarMensajeContacto(datos) {
  try {
    const { data } = await API.post('/publico/contacto', datos);
    return data;
  } catch (error) {
    throw new Error(
      mensajeDeError(error, 'No se pudo enviar el mensaje. Escribinos a support@gesicomm.com.')
    );
  }
}
