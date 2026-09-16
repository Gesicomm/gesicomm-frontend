import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import LegalDoc, { Subseccion, TablaLegal } from '../../components/public/LegalDoc';
import Alert from '../../components/public/Alert';
import Timeline from '../../components/public/Timeline';
import { trackearEvento, generarEventId } from '../../lib/metaPixel';

const Correo = ({ direccion }) => <a href={`mailto:${direccion}`}>{direccion}</a>;

const PASOS_INCIDENTE = [
  {
    titulo: 'Detección y clasificación',
    plazo: 'Inmediato',
    descripcion:
      'El evento se registra y se clasifica por severidad según el impacto potencial sobre la confidencialidad, la integridad y la disponibilidad de los datos.',
  },
  {
    titulo: 'Contención',
    plazo: 'Primeras horas',
    descripcion:
      'Se aísla el componente afectado, se revocan las credenciales comprometidas y se cierra el vector de entrada para impedir que el incidente se extienda.',
  },
  {
    titulo: 'Evaluación de impacto',
    plazo: 'Dentro de 24-48 h',
    descripcion:
      'Se determina qué datos y qué cuentas se vieron afectados, y si el incidente supone un riesgo para los derechos y libertades de las personas.',
  },
  {
    titulo: 'Notificación',
    plazo: 'Dentro de 72 h',
    descripcion:
      'Si corresponde, se notifica a la autoridad de control competente dentro de las 72 horas exigidas por el RGPD, y a los clientes afectados sin dilación indebida, con la información necesaria para que puedan tomar medidas.',
  },
  {
    titulo: 'Erradicación y recuperación',
    plazo: 'Según severidad',
    descripcion:
      'Se elimina la causa raíz, se restauran los servicios desde un estado verificado como limpio y se confirma que la vulnerabilidad quedó cerrada.',
  },
  {
    titulo: 'Análisis posterior',
    plazo: 'Dentro de 30 días',
    descripcion:
      'Se documenta la cronología, la causa raíz y las acciones correctivas, y se implementan las mejoras que eviten la repetición del incidente.',
  },
];

const SECCIONES = [
  {
    id: 'principios',
    titulo: 'Principios de seguridad',
    contenido: (
      <>
        <p>
          Gesicom procesa información sensible de negocios reales: catálogos con costos y
          márgenes, pedidos, datos de contacto de compradores y conversaciones. La seguridad no es
          una capa que se agrega al final, sino una restricción de diseño desde el modelo de datos.
        </p>
        <p>Cuatro principios guían las decisiones técnicas:</p>
        <ul>
          <li>
            <strong>Mínimo privilegio.</strong> Cada usuario, cada servicio y cada token tiene
            exactamente los permisos que necesita, y ninguno más.
          </li>
          <li>
            <strong>Defensa en profundidad.</strong> Ningún control es el único que separa un
            atacante de los datos. Si uno falla, hay otro detrás.
          </li>
          <li>
            <strong>Seguro por defecto.</strong> Una funcionalidad nueva arranca cerrada y se abre
            explícitamente, nunca al revés.
          </li>
          <li>
            <strong>Verificación en el servidor.</strong> Ningún control de acceso depende de la
            interfaz. Todo permiso se comprueba del lado del servidor, en cada solicitud.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cifrado-transito',
    titulo: 'Cifrado en tránsito: HTTPS y TLS',
    contenido: (
      <>
        <p>
          Todo el tráfico entre tu navegador y Gesicom viaja cifrado. No existe forma de acceder
          al servicio por HTTP sin cifrar: las conexiones no cifradas se redirigen a HTTPS.
        </p>
        <ul>
          <li>
            <strong>TLS 1.2 como mínimo</strong>, con preferencia por TLS 1.3. Los protocolos y
            cifrados obsoletos —SSLv3, TLS 1.0 y 1.1, RC4, 3DES— están deshabilitados.
          </li>
          <li>
            <strong>HSTS</strong> (HTTP Strict Transport Security): instruye al navegador a no
            intentar nunca una conexión sin cifrar con nuestros dominios.
          </li>
          <li>
            <strong>Certificados gestionados y renovados automáticamente</strong>, tanto para
            gesicomm.com y api.gesicomm.com como para los dominios propios de cada tienda.
          </li>
          <li>
            <strong>Perfect Forward Secrecy:</strong> el compromiso de una clave no permite
            descifrar sesiones anteriores capturadas.
          </li>
        </ul>
        <p>
          Las llamadas a la Graph API de Meta, la única API externa que Gesicom consume, también
          se realizan exclusivamente sobre HTTPS.
        </p>
      </>
    ),
  },
  {
    id: 'cifrado-reposo',
    titulo: 'Cifrado en reposo y gestión de secretos',
    contenido: (
      <>
        <Subseccion titulo="3.1 Credenciales de integraciones">
          <p>
            El token de acceso de Meta <strong>nunca se almacena en texto plano</strong>. Se cifran con{' '}
            <strong>AES-256-GCM</strong>, un algoritmo de cifrado autenticado: además de ocultar el
            contenido, detecta cualquier manipulación del dato cifrado.
          </p>
          <ul>
            <li>La clave de cifrado se gestiona como variable de entorno del servidor, fuera del código y fuera del repositorio.</li>
            <li>Cada valor cifrado usa un vector de inicialización único.</li>
            <li>Los tokens descifrados existen solo en memoria, durante la llamada que los necesita.</li>
            <li>Ningún extremo de la API devuelve un token, ni cifrado ni descifrado.</li>
          </ul>
        </Subseccion>

        <Subseccion titulo="3.2 Contraseñas">
          <p>
            Las contraseñas se procesan con <strong>bcrypt</strong>, una función de derivación
            deliberadamente lenta y con sal única por usuario. Eso significa que:
          </p>
          <ul>
            <li>La contraseña original no se guarda en ningún lado y no es recuperable.</li>
            <li>Dos usuarios con la misma contraseña producen hashes distintos.</li>
            <li>
              Las tablas precalculadas de hashes son inútiles, y probar contraseñas por fuerza
              bruta resulta computacionalmente costoso.
            </li>
            <li>
              Ante un olvido, la contraseña no se envía por correo: se emite un enlace de
              restablecimiento de un solo uso y vigencia corta.
            </li>
          </ul>
          <p>
            La política mínima exige <strong>8 caracteres, al menos una mayúscula y al menos un
            número</strong>, y se valida en el servidor.
          </p>
        </Subseccion>

        <Subseccion titulo="3.3 Datos en la base y en las copias">
          <p>
            El almacenamiento de la base de datos y sus copias de seguridad están cifrados a nivel
            de volumen. La base no es accesible desde internet: solo la alcanza la aplicación,
            dentro de una red privada.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'autenticacion',
    titulo: 'Autenticación',
    contenido: (
      <>
        <p>
          La sesión se sostiene con <strong>JSON Web Tokens</strong> transportados en{' '}
          <strong>cookies HttpOnly</strong>, no en localStorage. La diferencia es sustancial: una
          cookie HttpOnly es invisible para JavaScript, de modo que una vulnerabilidad de tipo XSS
          no permite robar la sesión.
        </p>

        <TablaLegal
          encabezados={['Atributo de la cookie', 'Valor', 'Qué previene']}
          filas={[
            ['HttpOnly', 'Activado', 'Que un script de la página lea el token de sesión.'],
            ['Secure', 'Activado en producción', 'Que la cookie viaje por una conexión sin cifrar.'],
            ['SameSite', 'Restrictivo', 'Que otro sitio provoque solicitudes autenticadas en tu nombre (CSRF).'],
            ['Expiración', 'Corta para el token de acceso', 'Que un token filtrado siga siendo útil de forma indefinida.'],
          ]}
        />

        <p className="mt-5">
          El token de acceso es de vida corta y se renueva de forma transparente con un token de
          actualización de vida más larga. Si la renovación falla, la sesión se cierra y se pide
          autenticación nueva.
        </p>

        <Subseccion titulo="4.1 OAuth 2.0 para integraciones">
          <p>
            La conexión con Meta usa OAuth 2.0. Gesicom <strong>nunca recibe ni almacena tu
            contraseña</strong> de Facebook, y solo solicita los permisos{' '}
            <code>ads_management</code> y <code>business_management</code>.
          </p>
          <p>
            El flujo incluye un <strong>parámetro <code>state</code> aleatorio</strong> generado por
            el servidor y guardado en una cookie HttpOnly de vigencia corta, que se verifica al
            volver del proveedor. Es lo que impide que un tercero te induzca a vincular una cuenta
            que no es tuya.
          </p>
        </Subseccion>

        <Subseccion titulo="4.2 Protección contra ataques de fuerza bruta">
          <p>
            Los extremos de autenticación tienen un límite de tasa más estricto que el resto de la
            API, y los intentos fallidos quedan registrados en el log de auditoría con su IP de
            origen, para poder detectar patrones de ataque.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'autorizacion',
    titulo: 'Autorización: roles y permisos',
    contenido: (
      <>
        <p>
          Gesicom implementa <strong>control de acceso basado en roles (RBAC)</strong> con
          permisos granulares definidos en base de datos, no fijados en el código.
        </p>
        <ul>
          <li>
            Cada acción sensible exige un <strong>permiso concreto</strong>: crear productos,
            editar combos, gestionar usuarios, configurar la tienda, resolver solicitudes de datos.
          </li>
          <li>
            Los permisos se agrupan en <strong>roles</strong>, y cada usuario tiene un rol. La
            relación entre roles y permisos vive en la base y se puede ajustar sin desplegar
            código.
          </li>
          <li>
            La verificación ocurre <strong>en el servidor, en cada solicitud</strong>. Ocultar un
            botón en la interfaz no es un control de seguridad, y no lo tratamos como tal.
          </li>
          <li>
            <strong>No hay superusuario con bypass.</strong> Ni siquiera el rol de administrador
            omite la verificación: si un permiso no está asignado a su rol, la acción se rechaza.
          </li>
        </ul>
        <p>
          Como titular de la cuenta, definís qué rol tiene cada empleado y podés revocar su acceso
          en cualquier momento.
        </p>
      </>
    ),
  },
  {
    id: 'aislamiento',
    titulo: 'Aislamiento entre cuentas',
    contenido: (
      <>
        <p>
          Gesicom es una plataforma multiinquilino: varias cuentas comparten la misma
          infraestructura. El aislamiento entre ellas está garantizado{' '}
          <strong>a nivel del modelo de datos</strong>, no por un filtro en la interfaz.
        </p>
        <ul>
          <li>
            Cada registro —producto, pedido, cliente, envío, campaña— lleva el identificador de la
            cuenta a la que pertenece.
          </li>
          <li>
            Toda consulta se construye filtrando por la cuenta derivada del token de sesión, no de
            un parámetro que el cliente pueda manipular.
          </li>
          <li>
            Los identificadores de recursos se validan siempre contra la cuenta del solicitante:
            pedir el producto de otra cuenta devuelve «no encontrado», nunca el dato.
          </li>
          <li>
            Los archivos subidos se sirven desde rutas controladas, asociadas a la cuenta
            propietaria.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'aplicacion',
    titulo: 'Seguridad de la aplicación',
    contenido: (
      <>
        <TablaLegal
          encabezados={['Control', 'Implementación']}
          filas={[
            [
              'Validación de entradas',
              'Todo cuerpo de solicitud se valida contra un esquema estricto antes de llegar a la lógica de negocio. Lo que no coincide se rechaza con 400; no se intenta «arreglar» una entrada inválida.',
            ],
            [
              'Inyección SQL',
              'El acceso a datos se hace mediante un ORM con consultas parametrizadas. No se construye SQL concatenando entradas del usuario.',
            ],
            [
              'Cross-Site Scripting (XSS)',
              'El framework de interfaz escapa por defecto todo contenido dinámico, y la Content Security Policy restringe el origen de los scripts.',
            ],
            [
              'Cross-Site Request Forgery (CSRF)',
              'Cookies con SameSite restrictivo, verificación de origen y parámetro state en los flujos OAuth.',
            ],
            [
              'Cabeceras de seguridad HTTP',
              'Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy y HSTS, aplicadas de forma centralizada a todas las respuestas.',
            ],
            [
              'CORS',
              'Lista blanca explícita de orígenes autorizados. Cualquier otro origen se rechaza.',
            ],
            [
              'Límite de tasa',
              'Global para toda la API, y más estricto en autenticación y en los formularios públicos.',
            ],
            [
              'Límite de tamaño de solicitud',
              'El cuerpo de las solicitudes está acotado, para impedir la denegación de servicio por agotamiento de memoria.',
            ],
            [
              'Carga de archivos',
              'Validación de tipo y tamaño, y procesamiento de las imágenes antes de almacenarlas, de modo que no se guarda el archivo original tal como llegó.',
            ],
            [
              'Mensajes de error',
              'Al cliente se le devuelve un mensaje genérico. Las trazas de pila y los detalles internos quedan solo en los registros del servidor.',
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: 'auditoria',
    titulo: 'Registros y auditoría',
    contenido: (
      <>
        <p>
          Gesicom mantiene dos tipos de registro: los técnicos, de cada solicitud recibida, y los
          de <strong>auditoría</strong>, de las acciones con relevancia de seguridad.
        </p>
        <p>Se registran, entre otros:</p>
        <ul>
          <li>Inicios de sesión, exitosos y fallidos.</li>
          <li>Cambios de contraseña y restablecimientos.</li>
          <li>Alta, baja y modificación de usuarios y de sus permisos.</li>
          <li>Conexión y desconexión de integraciones.</li>
          <li>Solicitudes de eliminación de datos y su resolución.</li>
          <li>Acciones de administración sobre la configuración de la cuenta.</li>
        </ul>
        <p>Cada entrada incluye el evento, el usuario, la cuenta, la IP de origen y la marca temporal.</p>

        <Alert tono="exito" titulo="Lo que nunca se escribe en un log" className="mt-5">
          Por diseño explícito, el registrador filtra y descarta contraseñas, tokens de sesión,
          el token de acceso de Meta, claves de cifrado y cualquier otro secreto{' '}
          <strong>antes</strong> de escribir la entrada. Un volcado de logs no expone credenciales.
        </Alert>

        <p className="mt-5">
          La IP real del visitante se resuelve correctamente detrás del proxy inverso y de la red
          de distribución, para que el límite de tasa y la trazabilidad no se vean neutralizados
          por la infraestructura intermedia.
        </p>
      </>
    ),
  },
  {
    id: 'infraestructura',
    titulo: 'Protección de la infraestructura',
    contenido: (
      <>
        <ul>
          <li>
            <strong>Segmentación de red.</strong> La base de datos y los servicios internos no
            tienen exposición pública; solo el proxy inverso escucha en internet.
          </li>
          <li>
            <strong>Proxy inverso y WAF.</strong> El tráfico pasa por una red de distribución con
            protección contra denegación de servicio y filtrado de patrones de ataque conocidos.
          </li>
          <li>
            <strong>Aislamiento por contenedores.</strong> Los servicios corren en contenedores con
            imágenes reproducibles, lo que acota el impacto de un compromiso.
          </li>
          <li>
            <strong>Actualización de dependencias.</strong> Se revisan y actualizan periódicamente,
            con prioridad para las que tengan vulnerabilidades conocidas de severidad alta.
          </li>
          <li>
            <strong>Gestión de secretos.</strong> Las credenciales viven en variables de entorno
            del servidor, nunca en el repositorio.
          </li>
          <li>
            <strong>Acceso administrativo.</strong> El acceso a servidores se realiza por canales
            cifrados y autenticación por clave, restringido al personal que lo necesita.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'copias',
    titulo: 'Copias de seguridad y continuidad',
    contenido: (
      <>
        <ul>
          <li>
            <strong>Frecuencia:</strong> copias automáticas periódicas de la base de datos completa.
          </li>
          <li>
            <strong>Cifrado:</strong> todas las copias se almacenan cifradas.
          </li>
          <li>
            <strong>Retención:</strong> rotación de hasta 35 días.
          </li>
          <li>
            <strong>Verificación:</strong> se prueba la restauración, porque una copia que nunca se
            restauró no es una copia: es una suposición.
          </li>
          <li>
            <strong>Separación:</strong> las copias se guardan en una ubicación distinta de la del
            entorno de producción.
          </li>
        </ul>
        <Alert tono="advertencia" titulo="Sobre la eliminación de datos y las copias" className="mt-5">
          Cuando se elimina un dato de la base activa, puede seguir existiendo en las copias de
          seguridad hasta que esa copia rote, en un máximo de 35 días. Durante ese lapso permanece
          cifrado y fuera de todo uso operativo. Es una consecuencia inevitable de tener copias de
          seguridad, y está declarado en la{' '}
          <Link to="/privacy">Política de Privacidad</Link>.
        </Alert>
      </>
    ),
  },
  {
    id: 'desarrollo',
    titulo: 'Desarrollo seguro',
    contenido: (
      <>
        <ul>
          <li>
            <strong>Control de versiones</strong> con historial completo y revisión de los cambios
            antes de integrarlos.
          </li>
          <li>
            <strong>Separación de entornos:</strong> desarrollo y producción están separados, con
            credenciales distintas.
          </li>
          <li>
            <strong>Datos de prueba:</strong> el desarrollo no se hace contra datos reales de
            clientes.
          </li>
          <li>
            <strong>Pruebas automatizadas</strong> sobre la lógica sensible, incluida la
            verificación criptográfica de las solicitudes firmadas que recibimos de Meta.
          </li>
          <li>
            <strong>Revisión de dependencias</strong> antes de incorporar una biblioteca nueva.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'incidentes',
    titulo: 'Respuesta a incidentes',
    contenido: (
      <>
        <p>
          Ningún sistema es invulnerable. Lo que distingue a una organización seria no es no tener
          incidentes, sino cómo responde cuando ocurren. Este es nuestro procedimiento:
        </p>
        <div className="not-prose mt-7">
          <Timeline pasos={PASOS_INCIDENTE} />
        </div>
        <p className="mt-8">
          Las notificaciones a clientes afectados se envían a la dirección de correo registrada e
          incluyen la naturaleza del incidente, las categorías de datos implicadas, las
          consecuencias probables, las medidas adoptadas y las recomendaciones concretas.
        </p>
      </>
    ),
  },
  {
    id: 'divulgacion',
    titulo: 'Divulgación responsable de vulnerabilidades',
    contenido: (
      <>
        <p>
          Si encontraste una vulnerabilidad en Gesicom, queremos saberlo. Escribinos a{' '}
          <Correo direccion="contacto@gesicomm.com" /> con:
        </p>
        <ul>
          <li>Una descripción de la vulnerabilidad y del componente afectado.</li>
          <li>Los pasos para reproducirla.</li>
          <li>El impacto potencial que le atribuís.</li>
          <li>Tus datos de contacto, si querés que te reconozcamos el hallazgo.</li>
        </ul>
        <p>Nos comprometemos a:</p>
        <ul>
          <li>Acusar recibo dentro de los 3 días hábiles.</li>
          <li>Mantenerte informado del avance de la corrección.</li>
          <li>
            No emprender acciones legales contra quien investigue de buena fe y respete estas
            reglas.
          </li>
          <li>Reconocer públicamente tu contribución, si así lo preferís.</li>
        </ul>

        <Alert tono="peligro" titulo="Reglas de la investigación" className="mt-6">
          Está prohibido acceder a datos de otros clientes, degradar el servicio, ejecutar pruebas
          de carga o de denegación de servicio, aplicar ingeniería social sobre nuestro personal o
          divulgar la vulnerabilidad antes de que esté corregida. Si accedés accidentalmente a
          datos ajenos, detené la prueba y avisanos de inmediato.
        </Alert>
      </>
    ),
  },
  {
    id: 'tu-parte',
    titulo: 'Lo que depende de vos',
    contenido: (
      <>
        <p>
          Buena parte de la seguridad de una cuenta depende de cómo se la administra. Te
          recomendamos:
        </p>
        <ul>
          <li>Usar una contraseña larga, única y guardada en un gestor de contraseñas.</li>
          <li>
            No compartir usuarios entre personas: una cuenta por empleado hace posible saber quién
            hizo qué.
          </li>
          <li>Asignar el rol mínimo que cada persona necesite para su trabajo.</li>
          <li>Revocar el acceso de quienes dejan de trabajar con vos, el mismo día.</li>
          <li>Revisar periódicamente las integraciones conectadas y desconectar las que no uses.</li>
          <li>Desconfiar de cualquier correo que te pida tu contraseña: nunca te la vamos a pedir.</li>
          <li>Mantener actualizados el navegador y el sistema operativo de tus equipos.</li>
        </ul>
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
            <strong>Reportar una vulnerabilidad:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Consultas de seguridad y cuestionarios de proveedores:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Privacidad y datos personales:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Soporte general:</strong> <Correo direccion="contacto@gesicomm.com" />
          </li>
        </ul>
        <p>
          Para incidentes en curso que afecten a tu cuenta, escribinos con el asunto{' '}
          <strong>«URGENTE — Seguridad»</strong> para que se priorice.
        </p>
      </>
    ),
  },
];

export default function Security() {
  useEffect(() => {
    trackearEvento('ViewContent', generarEventId(), { content_name: 'security', content_category: 'legal' });
  }, []);

  return (
    <LegalDoc
      titulo="Seguridad de la Información"
      descripcion="Cómo protege Gesicom los datos: cifrado TLS en tránsito y AES-256-GCM en reposo, contraseñas con bcrypt, autenticación por cookies HttpOnly, control de acceso por roles, aislamiento entre cuentas, auditoría, copias de seguridad y respuesta a incidentes."
      resumen="Las medidas técnicas y organizativas concretas con las que protegemos tu información y la de tus clientes. Sin generalidades: qué se cifra, con qué, quién puede acceder y qué pasa si algo falla."
      ruta="/security"
      actualizado="2026-08-03"
      vigenteDesde="2026-08-03"
      secciones={SECCIONES}
    />
  );
}
