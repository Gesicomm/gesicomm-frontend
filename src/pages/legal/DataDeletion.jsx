import { Link } from 'react-router-dom';
import LegalDoc, { Subseccion, TablaLegal } from '../../components/public/LegalDoc';
import Alert from '../../components/public/Alert';
import Timeline from '../../components/public/Timeline';
import DataDeletionForm from '../../components/public/DataDeletionForm';

const Correo = ({ direccion }) => <a href={`mailto:${direccion}`}>{direccion}</a>;

const PASOS = [
  {
    titulo: 'Recibimos tu solicitud',
    plazo: 'Día 0',
    descripcion:
      'Queda registrada con un código de seguimiento único y una fecha límite de procesamiento a 30 días. Podés consultar su estado en cualquier momento con ese código.',
  },
  {
    titulo: 'Verificamos tu identidad',
    plazo: 'Días 1 a 5',
    descripcion:
      'Nuestro equipo de privacidad se comunica a la dirección indicada para confirmar que la solicitud proviene del titular. Este paso no es un trámite: es lo que impide que un tercero elimine los datos de otra persona haciéndose pasar por ella. Si la solicitud se hizo desde el panel con la sesión iniciada, se saltea: la identidad ya está probada.',
  },
  {
    titulo: 'Identificamos toda tu información',
    plazo: 'Días 5 a 10',
    descripcion:
      'Localizamos tu cuenta, tus datos operativos, las integraciones conectadas y los registros asociados en todos los sistemas donde estén.',
  },
  {
    titulo: 'Revocamos la conexión con Meta',
    plazo: 'Inmediato tras la verificación',
    descripcion:
      'Se revoca y elimina el token de acceso de Meta y cesa toda consulta a su API.',
  },
  {
    titulo: 'Eliminamos los datos',
    plazo: 'Hasta el día 30',
    descripcion:
      'Se borran de la base de datos activa. Lo que deba conservarse por obligación legal se aísla y se documenta el motivo y el plazo.',
  },
  {
    titulo: 'Te confirmamos la eliminación',
    plazo: 'Al completarse',
    descripcion:
      'Recibís un correo de confirmación y el estado de tu código pasa a «completada», con la fecha exacta en que se procesó.',
  },
  {
    titulo: 'Rotación de las copias de seguridad',
    plazo: 'Hasta 35 días después',
    descripcion:
      'Las copias de seguridad existentes al momento del borrado se sobrescriben en su ciclo normal de rotación. Durante ese lapso los datos permanecen cifrados y fuera de todo uso operativo.',
  },
];

const SECCIONES = [
  {
    id: 'tu-derecho',
    titulo: 'Tu derecho a eliminar tus datos',
    contenido: (
      <>
        <Alert tono="info" titulo="Compromiso de Gesicomm">
          <p className="text-base font-medium text-fg">
            Los usuarios pueden solicitar la eliminación completa de sus datos personales en
            cualquier momento.
          </p>
          <p className="mt-2">
            Sin condiciones, sin costo, sin necesidad de justificar el motivo y sin tener que
            conservar el acceso a la cuenta.
          </p>
        </Alert>

        <p className="mt-6">
          Este derecho está reconocido por el artículo 17 del RGPD («derecho de supresión» o
          «derecho al olvido»), por la sección 1798.105 de la CCPA/CPRA de California y por la
          normativa de protección de datos de los países de Latinoamérica donde operamos. Gesicomm
          lo aplica a todos sus usuarios, con independencia de dónde residan.
        </p>
        <p>
          Hay <strong>dos formas</strong> de ejercerlo, y una tercera automática cuando la
          eliminación se inicia desde Meta. Todas conducen al mismo proceso y al mismo plazo
          máximo.
        </p>
      </>
    ),
  },
  {
    id: 'metodo-1',
    titulo: 'Método 1 — Desde tu cuenta',
    contenido: (
      <>
        <p>
          Si podés iniciar sesión, esta es la vía más rápida: la identidad ya está verificada por
          el propio inicio de sesión.
        </p>

        <ol>
          <li>
            Iniciá sesión en <Link to="/login">gesicomm.com/login</Link>.
          </li>
          <li>
            Entrá a <strong>Configuración</strong> desde el menú lateral.
          </li>
          <li>
            Bajá hasta la sección <strong>Privacidad y datos</strong>.
          </li>
          <li>
            Elegí una de las dos opciones disponibles:
            <ul>
              <li>
                <strong>Eliminar todos mis datos.</strong> Borra el contenido de la cuenta
                —catálogo, pedidos, clientes, envíos, campañas e historial— pero conserva la cuenta
                activa. Sirve para empezar de cero sin perder el acceso.
              </li>
              <li>
                <strong>Eliminar mi cuenta.</strong> Borra la cuenta completa, todos sus datos y
                todos sus usuarios. Es irreversible.
              </li>
            </ul>
          </li>
          <li>
            Confirmá la operación escribiendo tu contraseña. Es una segunda barrera deliberada
            frente a un clic accidental o a una sesión abierta que alguien más encuentre.
          </li>
          <li>
            La pantalla te muestra el <strong>código de seguimiento</strong> de la solicitud.
            Guardalo: con él podés consultar el estado en cualquier momento.
          </li>
        </ol>

        <p>
          Como llegaste con la sesión iniciada y reconfirmaste la contraseña, tu identidad ya queda
          verificada y la solicitud entra directamente en proceso, sin el paso de verificación por
          correo que sí requiere el formulario público. El plazo máximo sigue siendo de{' '}
          <strong>30 días</strong>.
        </p>

        <Alert tono="advertencia" titulo="Antes de eliminar, exportá" className="mt-6">
          Desde Configuración podés exportar tu catálogo, tus pedidos y tus clientes en CSV y JSON.
          Una vez completada la eliminación no hay forma de recuperar la información, ni siquiera
          para nosotros: ese es exactamente el punto de eliminarla.
        </Alert>
      </>
    ),
  },
  {
    id: 'metodo-2',
    titulo: 'Método 2 — Formulario público',
    contenido: (
      <>
        <p>
          Si ya no tenés acceso a tu cuenta, si nunca completaste el registro o si simplemente
          preferís este camino, usá el formulario. <strong>No requiere iniciar sesión.</strong>
        </p>

        <div className="mt-7 rounded-xl border border-border bg-surface p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-fg" style={{ letterSpacing: '-0.02em' }}>
            Solicitar la eliminación de mis datos
          </h3>
          <p className="mt-2 mb-7 text-sm text-fg-muted">
            Completá los campos y te enviamos un código para seguir el estado del pedido.
          </p>

          <DataDeletionForm />
        </div>

        <p className="mt-7">
          También podés escribirnos directamente a <Correo direccion="contacto@gesicomm.com" /> con
          el asunto <strong>«Solicitud de eliminación de datos»</strong>. El plazo y el proceso son
          los mismos.
        </p>
      </>
    ),
  },
  {
    id: 'metodo-meta',
    titulo: 'Método 3 — Desde tu configuración de Meta',
    contenido: (
      <>
        <p>
          Si conectaste Gesicomm con tu cuenta de Facebook, podés iniciar la eliminación desde la
          propia configuración de Meta:
        </p>
        <ol>
          <li>
            Entrá a <strong>Configuración y privacidad → Configuración</strong> en Facebook.
          </li>
          <li>
            Buscá <strong>Aplicaciones y sitios web</strong>.
          </li>
          <li>
            Localizá <strong>Gesicomm</strong> en la lista.
          </li>
          <li>
            Seleccioná <strong>Quitar</strong> y confirmá.
          </li>
        </ol>
        <p>
          Cuando lo hacés, Meta nos notifica automáticamente a través de nuestro{' '}
          <strong>Data Deletion Callback</strong>. Al recibir esa notificación:
        </p>
        <ul>
          <li>
            <strong>Verificamos criptográficamente</strong> que la solicitud provenga realmente de
            Meta, comprobando la firma HMAC-SHA256 del <code>signed_request</code> contra el App
            Secret de nuestra aplicación. Una firma inválida se rechaza y se registra como intento
            de acceso indebido.
          </li>
          <li>Registramos la solicitud con un código de confirmación único.</li>
          <li>
            Devolvemos a Meta ese código y una <strong>URL pública de seguimiento</strong>, con el
            formato <code>gesicomm.com/data-deletion/estado/&lt;código&gt;</code>.
          </li>
          <li>Revocamos los tokens y eliminamos los datos obtenidos de Meta.</li>
        </ul>
        <p>
          La eliminación por esta vía alcanza a los datos obtenidos de las plataformas de Meta. Si
          además querés eliminar el resto de tu información en Gesicomm, usá el método 1 o el
          método 2.
        </p>
      </>
    ),
  },
  {
    id: 'proceso',
    titulo: 'Qué pasa después de solicitarlo',
    contenido: (
      <>
        <p>
          Sea cual sea el método, el proceso es el mismo y el plazo máximo comprometido es de{' '}
          <strong>30 días corridos</strong>.
        </p>
        <div className="not-prose mt-7">
          <Timeline pasos={PASOS} />
        </div>
        <p className="mt-8">
          Si tu solicitud fuera especialmente compleja podríamos necesitar más tiempo. En ese caso
          te avisamos <strong>antes</strong> de que venza el plazo original, explicando el motivo y
          la nueva fecha estimada.
        </p>
      </>
    ),
  },
  {
    id: 'verificacion',
    titulo: 'Verificación de identidad',
    contenido: (
      <>
        <p>
          <strong>Verificamos la identidad de quien solicita antes de eliminar nada.</strong> Sin
          esta verificación, cualquiera podría destruir los datos de otra persona con solo conocer
          su dirección de correo.
        </p>
        <p>La verificación consiste, según el caso, en:</p>
        <ul>
          <li>
            Confirmar la solicitud desde el <strong>correo registrado en la cuenta</strong>, con un
            enlace de un solo uso y vigencia limitada.
          </li>
          <li>
            Aportar información que solo el titular pueda conocer: fecha aproximada de alta,
            nombre exacto de la tienda, últimos movimientos.
          </li>
          <li>
            Iniciar sesión en la cuenta, cuando eso sea posible: es la verificación más fuerte.
          </li>
        </ul>
        <p>
          <strong>No pedimos documentos de identidad</strong> salvo que no exista ninguna otra
          forma razonable de verificar. Si llegara a ser necesario, el documento se usa únicamente
          para esa verificación y se elimina apenas concluye.
        </p>
        <Alert tono="advertencia" titulo="Si no podemos verificar tu identidad" className="mt-6">
          No vamos a poder procesar la solicitud, y te lo explicaremos indicando qué información
          adicional necesitamos. Es la contracara necesaria de proteger las cuentas: preferimos
          demorar una eliminación legítima antes que ejecutar una fraudulenta.
        </Alert>
      </>
    ),
  },
  {
    id: 'que-se-elimina',
    titulo: 'Qué se elimina y qué se conserva',
    contenido: (
      <>
        <Subseccion titulo="Se elimina de forma permanente">
          <ul>
            <li>Tu perfil de usuario: nombre, correo, contraseña con hash y preferencias.</li>
            <li>Los datos de tu empresa y la configuración de la cuenta.</li>
            <li>El catálogo completo: productos, variantes, categorías, marcas, combos e imágenes.</li>
            <li>Los pedidos, sus artículos y todo su historial de estados.</li>
            <li>Los datos de tus clientes cargados en el CRM.</li>
            <li>Los envíos, couriers, tarifas y hojas de ruta.</li>
            <li>Las tiendas y landings publicadas, que dejan de estar accesibles.</li>
            <li>El token de acceso de Meta, si conectaste la integración.</li>
            <li>Los usuarios y empleados asociados a la cuenta.</li>
            <li>La configuración económica, los precios propios y los reportes.</li>
          </ul>
        </Subseccion>

        <Subseccion titulo="Puede conservarse, y por qué">
          <p>
            La ley no solo permite conservar cierta información: en algunos casos obliga a hacerlo.
            Esto es lo que puede sobrevivir a una eliminación, con su motivo y su plazo:
          </p>

          <TablaLegal
            encabezados={['Qué se conserva', 'Motivo', 'Plazo']}
            filas={[
              [
                'Facturas y comprobantes de la suscripción',
                'Obligación fiscal y contable. No es una decisión nuestra: las normas tributarias imponen su conservación.',
                'El que fije la ley fiscal aplicable, habitualmente de 5 a 10 años',
              ],
              [
                'Registro de la solicitud de eliminación',
                'Poder acreditar ante una autoridad que cumplimos con tu derecho de supresión. Se conserva solo el código, el estado y las fechas: ni el nombre, ni el correo, ni el motivo.',
                'Hasta 3 años',
              ],
              [
                'Registros de seguridad y auditoría',
                'Investigación de incidentes y prevención del fraude. Se seudonimizan.',
                'Hasta 12 meses',
              ],
              [
                'Información sujeta a un litigio o requerimiento en curso',
                'Deber legal de preservación de prueba mientras dure el proceso.',
                'Mientras dure la obligación',
              ],
              [
                'Copias de seguridad',
                'Continuidad del servicio. Quedan cifradas y fuera de uso operativo hasta su rotación.',
                'Hasta 35 días',
              ],
              [
                'Datos agregados y anonimizados',
                'Estadísticas de uso del producto. Ya no son datos personales: no permiten identificarte ni son reversibles.',
                'Indefinido',
              ],
            ]}
          />
        </Subseccion>
      </>
    ),
  },
  {
    id: 'consultar-estado',
    titulo: 'Cómo consultar el estado de tu solicitud',
    contenido: (
      <>
        <p>
          Al registrar una solicitud recibís un <strong>código de seguimiento</strong> de 24
          caracteres. Con él podés consultar el estado en cualquier momento, sin iniciar sesión, en:
        </p>
        <p>
          <code>https://gesicomm.com/data-deletion/estado/&lt;tu-código&gt;</code>
        </p>
        <p>
          O directamente desde{' '}
          <Link to="/data-deletion/estado">la página de consulta de estado</Link>.
        </p>

        <TablaLegal
          encabezados={['Estado', 'Qué significa']}
          filas={[
            ['Recibida', 'La solicitud está registrada y en cola para verificación.'],
            ['Verificando identidad', 'Te enviamos el correo de verificación y esperamos tu confirmación.'],
            ['En proceso', 'Identidad confirmada. Estamos eliminando la información.'],
            ['Completada', 'La eliminación terminó. Se indica la fecha exacta.'],
            ['Rechazada', 'No pudimos verificar la identidad o la solicitud no correspondía. Se explica el motivo por correo.'],
          ]}
        />

        <Alert tono="info" titulo="Por qué la consulta pública muestra tan poco" className="mt-6">
          A la página de estado se llega solo con el código, sin autenticación, así que no hay
          forma de saber quién la está mirando. Por eso muestra únicamente el estado y las fechas:
          nunca el nombre, el correo ni el motivo de la solicitud. Sería contradictorio exponer
          esos datos en la página que existe para eliminarlos.
        </Alert>
      </>
    ),
  },
  {
    id: 'clientes-de-tiendas',
    titulo: 'Si sos comprador de una tienda que usa Gesicomm',
    contenido: (
      <>
        <p>
          Si tus datos están en Gesicomm porque le compraste a un comercio que usa nuestra
          plataforma, la situación es distinta: <strong>el responsable de esos datos es el
          comercio</strong>, no Gesicomm. Nosotros actuamos como encargado del tratamiento y
          seguimos sus instrucciones.
        </p>
        <p>Qué hacer:</p>
        <ol>
          <li>
            <strong>Contactá primero al comercio</strong> donde compraste y pedile la eliminación
            de tus datos. Es quien tiene la obligación legal de responderte.
          </li>
          <li>
            Si no obtenés respuesta en un plazo razonable, escribinos a{' '}
            <Correo direccion="contacto@gesicomm.com" /> indicando el nombre de la tienda. Vamos a
            trasladarle el pedido y a asistirlo para que lo resuelva.
          </li>
          <li>
            Si el comercio ya no opera o no responde, evaluamos el caso y actuamos según lo que
            exija la normativa aplicable.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: 'preguntas',
    titulo: 'Preguntas frecuentes',
    contenido: (
      <>
        <Subseccion titulo="¿Puedo cancelar una solicitud ya enviada?">
          <p>
            Sí, siempre que todavía no se haya completado. Escribinos a{' '}
            <Correo direccion="contacto@gesicomm.com" /> con tu código de seguimiento y la
            detenemos. Una vez que el estado pasa a «completada», la información ya no existe y no
            hay nada que cancelar.
          </p>
        </Subseccion>

        <Subseccion titulo="¿Eliminar mis datos cancela mi suscripción?">
          <p>
            Eliminar la cuenta sí implica el fin de la suscripción. Eliminar solo los datos
            operativos, conservando la cuenta, no la cancela: si querés dar de baja el cobro,
            hacelo por separado desde Configuración o escribiendo a{' '}
            <Correo direccion="contacto@gesicomm.com" />.
          </p>
        </Subseccion>

        <Subseccion titulo="¿Se eliminan también mis datos en Meta?">
          <p>
            No. Gesicomm elimina lo que tiene en <strong>sus</strong> sistemas y revoca su acceso a
            la API de Meta. Los datos que residan en Facebook —tus campañas, tus cuentas
            publicitarias, tu perfil— siguen bajo el control de Meta, y para eliminarlos hay que
            pedírselo directamente a ellos.
          </p>
        </Subseccion>

        <Subseccion titulo="¿Tiene algún costo?">
          <p>
            Ninguno. Ejercer el derecho de supresión es gratuito. Solo en casos manifiestamente
            infundados o excesivos —por ejemplo, solicitudes repetitivas— la normativa permite
            cobrar un canon razonable o negarse, y en ese caso lo justificaríamos por escrito.
          </p>
        </Subseccion>

        <Subseccion titulo="¿Y si tengo una deuda pendiente?">
          <p>
            Eliminamos igual tus datos personales. Podemos conservar la información estrictamente
            necesaria para la gestión del cobro y para cumplir las obligaciones contables, tal como
            figura en la tabla de conservación.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'contacto',
    titulo: 'Contacto',
    contenido: (
      <>
        <ul>
          <li>
            <strong>Privacidad y eliminación de datos:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Soporte del producto:</strong> <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Consultas legales:</strong> <Correo direccion="contacto@gesicomm.com" />
          </li>
        </ul>
        <p>
          Si no quedás conforme con nuestra gestión, podés presentar una reclamación ante la
          autoridad de protección de datos de tu país de residencia.
        </p>
      </>
    ),
  },
];

export default function DataDeletion() {
  return (
    <LegalDoc
      titulo="Eliminación de Datos"
      descripcion="Cómo solicitar la eliminación completa de tus datos personales en Gesicomm: desde tu cuenta, mediante el formulario público sin iniciar sesión, o desde la configuración de Meta. Plazo máximo de 30 días, con verificación de identidad y seguimiento por código."
      resumen="Podés pedir que eliminemos todos tus datos personales en cualquier momento, sin costo y sin dar explicaciones. Acá está el cómo, el cuándo y el qué se elimina exactamente."
      ruta="/data-deletion"
      actualizado="2026-08-03"
      vigenteDesde="2026-08-03"
      secciones={SECCIONES}
    />
  );
}
