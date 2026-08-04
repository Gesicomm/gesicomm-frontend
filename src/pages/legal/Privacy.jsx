import { Link } from 'react-router-dom';
import LegalDoc, { Subseccion, TablaLegal } from '../../components/public/LegalDoc';
import Alert from '../../components/public/Alert';

const Correo = ({ direccion }) => <a href={`mailto:${direccion}`}>{direccion}</a>;

const SECCIONES = [
  {
    id: 'responsable',
    titulo: 'Quién es responsable de tus datos',
    contenido: (
      <>
        <p>
          Gesicomm («Gesicomm», «nosotros») opera la plataforma de gestión de eCommerce disponible
          en <strong>https://gesicomm.com</strong> y su API en <strong>https://api.gesicomm.com</strong>.
        </p>
        <p>
          Para los datos de las personas que contratan y usan Gesicomm —titulares de cuenta,
          administradores y empleados de una cuenta— actuamos como <strong>responsable del
          tratamiento</strong>: decidimos qué datos recogemos y para qué.
        </p>
        <p>
          Para los datos que vos cargás o sincronizás sobre <strong>tus propios clientes</strong>
          {' '}(compradores de tu tienda), actuamos como <strong>encargado del tratamiento</strong>:
          los procesamos siguiendo tus instrucciones, para prestarte el servicio, y no los usamos
          para fines propios. Vos seguís siendo el responsable frente a esas personas. La
          distinción importa porque determina a quién le corresponde responder si uno de tus
          compradores ejerce sus derechos: ver la sección{' '}
          <a href="#roles">Nuestro rol según el tipo de dato</a>.
        </p>
        <p>
          Contacto en materia de privacidad: <Correo direccion="contacto@gesicomm.com" />.
        </p>
      </>
    ),
  },
  {
    id: 'alcance',
    titulo: 'Alcance de esta política',
    contenido: (
      <>
        <p>Esta política se aplica a:</p>
        <ul>
          <li>El sitio web público gesicomm.com y todas sus páginas.</li>
          <li>La aplicación web de Gesicomm y el panel de administración.</li>
          <li>La API de Gesicomm (api.gesicomm.com).</li>
          <li>
            La integración con Meta que decidas conectar, para el seguimiento de tus campañas de
            Facebook Ads. Es la única integración con acceso a datos que existe hoy.
          </li>
          <li>
            Las tiendas y páginas públicas que publicás con Gesicomm bajo un subdominio de
            gesicomm.com o un dominio propio.
          </li>
        </ul>
        <p>
          <strong>No se aplica</strong> a los sitios y servicios de terceros a los que puedas
          llegar desde Gesicomm. Cuando conectás una plataforma externa, el tratamiento que esa
          plataforma haga de tus datos se rige por su propia política de privacidad, no por esta.
        </p>
      </>
    ),
  },
  {
    id: 'informacion-recopilada',
    titulo: 'Qué información recopilamos',
    contenido: (
      <>
        <p>
          Recopilamos información en tres formas: la que nos das directamente, la que se genera
          automáticamente cuando usás el servicio, y la que recibimos de las plataformas que
          conectás.
        </p>

        <Subseccion titulo="3.1 Información de la cuenta y del usuario">
          <ul>
            <li>
              <strong>Datos de registro:</strong> nombre y apellido, dirección de correo
              electrónico y contraseña. La contraseña nunca se almacena en texto plano: guardamos
              únicamente un hash con bcrypt, del que no es posible recuperar la contraseña
              original.
            </li>
            <li>
              <strong>Datos del negocio:</strong> nombre comercial, tipo de actividad, país,
              moneda, zona horaria, teléfono de contacto y logotipo.
            </li>
            <li>
              <strong>Datos de los empleados que invites:</strong> nombre, correo, rol asignado y
              permisos. Sos vos quien decide a quién invitar y con qué nivel de acceso.
            </li>
            <li>
              <strong>Preferencias de configuración:</strong> ajustes de la tienda, del catálogo,
              del motor de precios y de las notificaciones.
            </li>
            <li>
              <strong>Comunicaciones:</strong> el contenido de los mensajes que nos enviás por el
              formulario de contacto, por correo o por soporte, junto con nuestras respuestas.
            </li>
          </ul>
        </Subseccion>

        <Subseccion titulo="3.2 Información del navegador y del dispositivo">
          <p>
            Cuando visitás el sitio o usás la aplicación, tu navegador transmite automáticamente:
          </p>
          <ul>
            <li>Tipo y versión del navegador, y motor de renderizado.</li>
            <li>Sistema operativo y tipo de dispositivo.</li>
            <li>Idioma y configuración regional.</li>
            <li>Resolución de pantalla y tamaño de ventana.</li>
            <li>Página de origen (referrer) y páginas visitadas dentro del sitio.</li>
          </ul>
        </Subseccion>

        <Subseccion titulo="3.3 Direcciones IP y registros del servidor (logs)">
          <p>
            Nuestros servidores registran cada solicitud que reciben. Un registro típico incluye:
          </p>
          <ul>
            <li>
              <strong>Dirección IP</strong> desde la que se hizo la solicitud. La dirección IP se
              considera dato personal en el RGPD, y por eso se trata como tal.
            </li>
            <li>Fecha y hora exacta.</li>
            <li>Método HTTP, ruta solicitada y código de respuesta.</li>
            <li>Agente de usuario (user agent).</li>
            <li>
              Identificador del usuario y de la cuenta cuando la solicitud está autenticada.
            </li>
          </ul>
          <p>
            Además llevamos un <strong>registro de auditoría</strong> de las acciones sensibles:
            inicios de sesión y sus fallos, cambios de contraseña, alta y baja de usuarios,
            conexión y desconexión de integraciones, y modificaciones de permisos. Por diseño
            explícito, en estos registros <strong>nunca</strong> se escriben contraseñas, tokens
            de sesión, tokens de acceso de Meta, ni ningún otro secreto.
          </p>
        </Subseccion>

        <Subseccion titulo="3.4 Cookies y tecnologías similares">
          <p>
            Usamos cookies propias estrictamente necesarias para mantener tu sesión iniciada y
            proteger los formularios, y —solo con tu consentimiento— cookies de analítica y de
            marketing. El detalle completo, cookie por cookie, está en la{' '}
            <Link to="/cookies">Política de Cookies</Link>.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'integraciones',
    titulo: 'Información que recibimos de Meta',
    contenido: (
      <>
        <p>
          <strong>Meta es hoy la única plataforma externa que Gesicomm integra.</strong> No hay
          integración con Instagram, con WhatsApp Business Platform, con Shopify ni con ninguna
          otra plataforma. Si alguna se agrega en el futuro, esta política se actualiza y se
          notifica <strong>antes</strong> de activarla.
        </p>
        <p>
          La conexión es opcional: Gesicomm solo accede a Meta si vos la habilitás explícitamente
          desde Configuración, y podés revocarla en cualquier momento.
        </p>

        <Subseccion titulo="4.1 Información obtenida mediante OAuth">
          <p>
            La conexión se establece mediante el protocolo <strong>OAuth 2.0</strong>. Eso
            significa que <strong>nunca vemos ni recibimos tu contraseña</strong> de Facebook:
            recibimos un token de acceso emitido por Meta, limitado a los permisos concedidos y
            revocable por vos en cualquier momento, tanto desde Gesicomm como desde tu propia
            configuración de Facebook.
          </p>
          <p>
            Los tokens de acceso se almacenan <strong>cifrados con AES-256-GCM</strong>, nunca en
            texto plano, y no se exponen en ninguna respuesta de la API ni en los registros.
          </p>
        </Subseccion>

        <Subseccion titulo="4.2 Los dos únicos permisos que pedimos">
          <p>
            Gesicomm solicita exactamente dos permisos de la plataforma de Meta, y ninguno más:
          </p>

          <TablaLegal
            encabezados={['Permiso', 'Para qué lo usamos', 'Qué obtenemos']}
            filas={[
              [
                'ads_management',
                'Leer el rendimiento de tus campañas de Facebook Ads y mostrarlo junto al producto y al margen que promocionan.',
                'Campañas, conjuntos de anuncios y anuncios, con su objetivo, presupuesto, impresiones, clics, alcance, gasto y conversiones.',
              ],
              [
                'business_management',
                'Listar los Business Managers y las cuentas publicitarias a las que ya tenés acceso, para que elijas cuál conectar.',
                'Identificador y nombre de los Business Managers y de las cuentas publicitarias que administrás.',
              ],
            ]}
            notaAlPie="Podés verificar esta lista vos mismo: Meta muestra los permisos solicitados en su propia pantalla de autorización antes de que confirmes la conexión."
          />
        </Subseccion>

        <Subseccion titulo="4.3 Lo que explícitamente NO recibimos de Meta">
          <p>
            Con esos dos permisos, Meta <strong>no</strong> nos entrega —y por lo tanto nunca
            tratamos— nada de lo siguiente:
          </p>
          <ul>
            <li>Tu perfil personal, tu nombre, tu foto o tu dirección de correo de Facebook.</li>
            <li>Tu lista de amigos o cualquier dato de tus contactos.</li>
            <li>Tus publicaciones, tu muro o el contenido de tu actividad personal.</li>
            <li>Tus páginas de Facebook ni el contenido publicado en ellas.</li>
            <li>Cuentas de Instagram, sus publicaciones o sus métricas.</li>
            <li>Mensajes de Messenger, de Instagram Direct ni de WhatsApp.</li>
            <li>Catálogos de productos de Meta ni sus artículos.</li>
          </ul>
        </Subseccion>

        <Subseccion titulo="4.4 No usamos Facebook Login para autenticarte">
          <p>
            El acceso a Gesicomm se hace con <strong>correo electrónico y contraseña propios</strong>,
            gestionados por nosotros. Conectar Meta es una acción posterior e independiente, que
            solo vincula tus cuentas publicitarias. Desconectar Meta no te deja fuera de Gesicomm.
          </p>
        </Subseccion>

        <Subseccion titulo="4.5 Meta Pixel en tu vitrina">
          <p>
            Aparte de la conexión anterior, podés cargar el identificador de{' '}
            <strong>tu propio Meta Pixel</strong> para que se dispare en la vitrina pública de tu
            tienda. En ese caso Gesicomm solo almacena ese identificador: los eventos de navegación
            los recibe Meta directamente desde el navegador de tu visitante, y su tratamiento se
            rige por la política de datos de Meta. Sos vos, como titular de esa vitrina, quien
            responde por informarlo y por recabar el consentimiento de tus visitantes. Está
            detallado en la <Link to="/cookies">Política de Cookies</Link>.
          </p>
        </Subseccion>

        <Subseccion titulo="4.6 WhatsApp: un enlace, no una integración">
          <p>
            El botón de WhatsApp de tu vitrina genera un enlace <code>wa.me</code> con el mensaje
            ya escrito. Al tocarlo, se abre la aplicación de WhatsApp en el dispositivo de tu
            visitante y la conversación ocurre <strong>directamente entre esa persona y vos</strong>.
          </p>
          <p>
            Gesicomm <strong>no usa la API de WhatsApp Business</strong>, no envía mensajes, no
            recibe mensajes y <strong>no almacena ninguna conversación ni número de teléfono de
            tus compradores por esa vía</strong>. El único número de WhatsApp que guardamos es{' '}
            <strong>el tuyo</strong>, el que configurás como contacto de tu tienda para que el
            enlace apunte a algún lado.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'categorias-datos',
    titulo: 'Categorías de datos operativos',
    contenido: (
      <>
        <p>
          Además de los datos de cuenta, Gesicomm procesa la información operativa de tu negocio.
          Esta tabla resume qué se guarda en cada categoría y quién es el titular de esos datos.
        </p>

        <TablaLegal
          encabezados={['Categoría', 'Qué incluye', 'Nuestro rol']}
          filas={[
            [
              'Datos de productos',
              'Nombre, descripción, SKU, código de barras, categoría, marca, variantes, atributos, imágenes, costos, precios, márgenes y reglas de combos.',
              'Encargado',
            ],
            [
              'Datos de pedidos',
              'Número de pedido, fecha, artículos y cantidades, importes, descuentos, impuestos, medio de pago declarado, estado del pedido y su historial de cambios.',
              'Encargado',
            ],
            [
              'Datos de clientes (compradores)',
              'Nombre, correo electrónico, teléfono, direcciones de envío y facturación, documento de identidad si lo cargás, historial de compras y notas internas.',
              'Encargado',
            ],
            [
              'Datos de logística',
              'Courier asignado, zona y tarifa, número de seguimiento, estado del envío, fechas de despacho y entrega, y observaciones del repartidor.',
              'Encargado',
            ],
            [
              'Datos de empleados',
              'Nombre, correo, rol, permisos, estado de la cuenta, fecha de alta y registro de accesos y acciones.',
              'Responsable',
            ],
            [
              'Datos financieros del negocio',
              'Costos, precios, márgenes, configuración económica de combos, comisiones y reportes de rentabilidad.',
              'Encargado',
            ],
            [
              'Datos de facturación de la suscripción',
              'Razón social, identificación fiscal, dirección de facturación, plan contratado, historial de pagos y facturas emitidas.',
              'Responsable',
            ],
            [
              'Datos de campañas',
              'Identificadores de campañas, conjuntos de anuncios y anuncios, presupuestos, públicos configurados y métricas de rendimiento.',
              'Responsable / Encargado',
            ],
          ]}
          notaAlPie="Los datos de pago de tu suscripción (número de tarjeta, CVV) son procesados directamente por nuestro proveedor de pagos. Gesicomm nunca almacena esos números."
        />
      </>
    ),
  },
  {
    id: 'finalidades',
    titulo: 'Para qué usamos la información',
    contenido: (
      <>
        <p>Tratamos los datos exclusivamente para las siguientes finalidades:</p>
        <ul>
          <li>
            <strong>Prestar el servicio:</strong> crear y mantener tu cuenta, administrar tu
            catálogo y tus pedidos, calcular precios y márgenes, y gestionar inventario y envíos.
          </li>
          <li>
            <strong>Autenticar y autorizar:</strong> verificar tu identidad al iniciar sesión y
            aplicar los permisos de tu rol en cada acción.
          </li>
          <li>
            <strong>Seguridad y prevención del fraude:</strong> detectar accesos no autorizados,
            uso abusivo, ataques automatizados y actividad anómala.
          </li>
          <li>
            <strong>Soporte:</strong> responder tus consultas, reproducir errores que reportes y
            darte seguimiento.
          </li>
          <li>
            <strong>Mejora del producto:</strong> entender qué funciones se usan y dónde se traba
            la gente, en forma agregada.
          </li>
          <li>
            <strong>Facturación y administración:</strong> emitir facturas, cobrar la suscripción
            y llevar la contabilidad exigida por ley.
          </li>
          <li>
            <strong>Comunicaciones sobre el servicio:</strong> avisos de mantenimiento, cambios en
            los términos, incidentes de seguridad y novedades relevantes de tu cuenta.
          </li>
          <li>
            <strong>Cumplimiento legal:</strong> responder requerimientos de autoridades
            competentes y conservar lo que la ley obliga a conservar.
          </li>
        </ul>
        <p>
          <strong>Lo que no hacemos:</strong> no vendemos datos personales; no los compartimos con
          terceros para su publicidad; no usamos el contenido de tus pedidos ni los datos de tus
          clientes para entrenar modelos de inteligencia artificial de terceros; y no construimos
          perfiles de tus compradores para fines ajenos a tu negocio.
        </p>
      </>
    ),
  },
  {
    id: 'base-legal',
    titulo: 'Base legal del tratamiento',
    contenido: (
      <>
        <p>
          Bajo el RGPD y normas equivalentes, todo tratamiento necesita una base jurídica. Estas
          son las nuestras, finalidad por finalidad:
        </p>

        <TablaLegal
          encabezados={['Finalidad', 'Base legal', 'Detalle']}
          filas={[
            [
              'Prestación del servicio contratado',
              'Ejecución de un contrato (art. 6.1.b RGPD)',
              'Sin estos datos no es materialmente posible darte el servicio que contrataste.',
            ],
            [
              'Conexión de la integración con Meta',
              'Consentimiento (art. 6.1.a RGPD)',
              'Se pide en la pantalla de autorización de cada plataforma y es revocable en cualquier momento.',
            ],
            [
              'Cookies de analítica y marketing',
              'Consentimiento (art. 6.1.a RGPD)',
              'Solo se activan si las aceptás en el aviso de cookies. Podés retirarlo cuando quieras.',
            ],
            [
              'Seguridad, antifraude y registros de auditoría',
              'Interés legítimo (art. 6.1.f RGPD)',
              'Nuestro interés en proteger el servicio y tus datos, ponderado contra tu expectativa razonable de privacidad.',
            ],
            [
              'Mejora del producto en forma agregada',
              'Interés legítimo (art. 6.1.f RGPD)',
              'Se trabaja con datos agregados o seudonimizados siempre que sea posible.',
            ],
            [
              'Comunicaciones sobre el servicio',
              'Ejecución de un contrato / Interés legítimo',
              'Avisos operativos y de seguridad que necesitás recibir como titular de la cuenta.',
            ],
            [
              'Comunicaciones comerciales',
              'Consentimiento (art. 6.1.a RGPD)',
              'Solo si te suscribís. Cada mensaje incluye un enlace de baja.',
            ],
            [
              'Facturación y contabilidad',
              'Obligación legal (art. 6.1.c RGPD)',
              'Las normas fiscales imponen plazos de conservación que no podemos acortar.',
            ],
            [
              'Respuesta a requerimientos de autoridades',
              'Obligación legal (art. 6.1.c RGPD)',
              'Solo ante requerimientos válidos y de autoridad competente.',
            ],
          ]}
        />

        <p>
          Cuando la base es el <strong>consentimiento</strong>, podés retirarlo en cualquier
          momento sin que eso afecte la licitud del tratamiento anterior. Cuando la base es el{' '}
          <strong>interés legítimo</strong>, tenés derecho a oponerte: lo evaluamos caso por caso y
          dejamos de tratar los datos salvo que existan motivos imperiosos que prevalezcan.
        </p>
      </>
    ),
  },
  {
    id: 'roles',
    titulo: 'Nuestro rol según el tipo de dato',
    contenido: (
      <>
        <p>
          Gesicomm cumple dos roles distintos según de quién sean los datos, y de eso depende a
          quién hay que dirigirse para ejercer derechos.
        </p>
        <ul>
          <li>
            <strong>Responsable del tratamiento</strong> respecto de los datos de los usuarios de
            la plataforma: titulares de cuenta, administradores y empleados invitados. Si sos uno
            de ellos, ejercés tus derechos directamente ante nosotros.
          </li>
          <li>
            <strong>Encargado del tratamiento</strong> respecto de los datos de tus compradores y
            de la operación de tu negocio. Vos sos el responsable: definís las finalidades y
            nosotros seguimos tus instrucciones.
          </li>
        </ul>
        <Alert tono="info" titulo="Si sos comprador de una tienda que usa Gesicomm" className="mt-5">
          Tus datos están en Gesicomm porque el comercio donde compraste usa nuestra plataforma.
          Para ejercer tus derechos, dirigite primero a ese comercio, que es el responsable. Si no
          obtenés respuesta, escribinos a <Correo direccion="contacto@gesicomm.com" /> y te ayudamos
          a canalizar el pedido con el comercio correspondiente.
        </Alert>
        <p>
          Como encargados, actuamos únicamente conforme a tus instrucciones documentadas,
          garantizamos la confidencialidad de quienes acceden a los datos, aplicamos las medidas
          de seguridad descritas en la <Link to="/security">página de Seguridad</Link>, y te
          asistimos para responder los pedidos de ejercicio de derechos que recibas.
        </p>
      </>
    ),
  },
  {
    id: 'subprocesadores',
    titulo: 'Con quién compartimos la información',
    contenido: (
      <>
        <p>
          No vendemos ni alquilamos datos personales. Los compartimos únicamente con las
          categorías de destinatarios que son necesarias para prestar el servicio:
        </p>

        <TablaLegal
          encabezados={['Categoría de destinatario', 'Para qué', 'Datos involucrados']}
          filas={[
            [
              'Proveedor de infraestructura y alojamiento',
              'Servidores, base de datos y copias de seguridad.',
              'Todos los datos alojados en la plataforma, cifrados en tránsito y en reposo.',
            ],
            [
              'Red de distribución y protección (CDN/WAF)',
              'Entrega del sitio, certificados TLS y mitigación de ataques.',
              'Direcciones IP, cabeceras de solicitud y metadatos de tráfico.',
            ],
            [
              'Proveedor de correo transaccional',
              'Verificaciones, restablecimiento de contraseña y avisos del servicio.',
              'Dirección de correo, nombre y contenido del mensaje enviado.',
            ],
            [
              'Plataformas que vos conectás',
              'Meta, únicamente si conectás la integración de Facebook Ads.',
              'Únicamente los datos necesarios para la integración autorizada.',
            ],
            [
              'Proveedor de procesamiento de pagos',
              'Cobro de la suscripción y emisión de comprobantes.',
              'Datos de facturación. Los datos de la tarjeta los procesa el proveedor, no Gesicomm.',
            ],
            [
              'Herramientas de analítica',
              'Métricas de uso agregadas del sitio.',
              'Identificadores de cookie e IP, solo si consentiste su uso.',
            ],
            [
              'Asesores profesionales',
              'Auditoría contable, asesoramiento legal.',
              'Lo estrictamente necesario, bajo deber de confidencialidad.',
            ],
            [
              'Autoridades competentes',
              'Cumplimiento de requerimientos legales válidos.',
              'Lo que la orden exija, revisando su validez antes de responder.',
            ],
          ]}
          notaAlPie="La lista nominal y actualizada de subprocesadores está disponible escribiendo a contacto@gesicomm.com. Notificamos con antelación razonable la incorporación de un subprocesador nuevo."
        />

        <p>
          Todos nuestros subprocesadores están vinculados por contratos que les imponen
          obligaciones de confidencialidad y de seguridad equivalentes a las nuestras, y que les
          prohíben usar los datos para fines propios.
        </p>
        <p>
          Si Gesicomm se viera involucrada en una fusión, adquisición o venta de activos, los datos
          podrían transferirse como parte de la operación. En ese caso lo notificaríamos con
          antelación y la política aplicable seguiría siendo esta hasta que se comunique un cambio.
        </p>
      </>
    ),
  },
  {
    id: 'transferencias',
    titulo: 'Transferencias internacionales',
    contenido: (
      <>
        <p>
          Gesicomm opera con proveedores de infraestructura que pueden estar ubicados fuera de tu
          país de residencia, y Meta —si conectás la integración— procesa datos en Estados Unidos
          y en otras jurisdicciones.
        </p>
        <p>Cuando una transferencia sale del Espacio Económico Europeo o del Reino Unido, se ampara en:</p>
        <ul>
          <li>
            Una <strong>decisión de adecuación</strong> de la Comisión Europea, cuando el país de
            destino la tiene; o
          </li>
          <li>
            Las <strong>Cláusulas Contractuales Tipo</strong> aprobadas por la Comisión Europea
            (Decisión 2021/914), complementadas cuando corresponde con el Addendum del Reino Unido; y
          </li>
          <li>
            Una <strong>evaluación de impacto de la transferencia</strong> y las medidas técnicas
            complementarias que resulten necesarias, como el cifrado en tránsito y en reposo.
          </li>
        </ul>
        <p>
          Podés solicitar copia de las garantías aplicables escribiendo a{' '}
          <Correo direccion="contacto@gesicomm.com" />.
        </p>
      </>
    ),
  },
  {
    id: 'almacenamiento',
    titulo: 'Dónde se almacena la información',
    contenido: (
      <>
        <p>
          Los datos se almacenan en servidores gestionados de nuestro proveedor de infraestructura,
          en centros de datos con controles de seguridad física y lógica y con certificaciones
          reconocidas del sector.
        </p>
        <ul>
          <li>
            La base de datos principal no es accesible desde internet: solo la alcanza la
            aplicación, dentro de una red privada.
          </li>
          <li>
            Las copias de seguridad se realizan de forma periódica, se almacenan cifradas y se
            prueba su restauración.
          </li>
          <li>
            Los archivos que subís (imágenes de productos, logotipos) se almacenan en el mismo
            entorno controlado y se sirven mediante la red de distribución.
          </li>
        </ul>
        <p>
          El detalle técnico de los controles está en la{' '}
          <Link to="/security">página de Seguridad de la Información</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'retencion',
    titulo: 'Cuánto tiempo conservamos los datos',
    contenido: (
      <>
        <p>
          Conservamos cada dato el tiempo necesario para la finalidad que lo justifica, y después
          lo eliminamos o lo anonimizamos de forma irreversible.
        </p>

        <TablaLegal
          encabezados={['Tipo de dato', 'Plazo de conservación', 'Motivo']}
          filas={[
            [
              'Datos de cuenta y perfil',
              'Mientras la cuenta esté activa, y hasta 30 días después de solicitada su eliminación.',
              'Prestación del servicio.',
            ],
            [
              'Datos operativos (productos, pedidos, clientes)',
              'Mientras la cuenta esté activa. Se eliminan junto con la cuenta.',
              'Prestación del servicio.',
            ],
            [
              'Token de acceso de Meta',
              'Hasta que revoques la conexión. Se elimina de inmediato al desconectar.',
              'Consentimiento.',
            ],
            [
              'Registros de acceso y auditoría',
              'Hasta 12 meses.',
              'Seguridad e investigación de incidentes.',
            ],
            [
              'Registros técnicos del servidor',
              'Hasta 90 días.',
              'Diagnóstico y seguridad.',
            ],
            [
              'Solicitudes de eliminación de datos',
              'Hasta 3 años, conservando únicamente el código, el estado y las fechas.',
              'Poder acreditar que se cumplió con el derecho de supresión.',
            ],
            [
              'Facturas y documentación contable',
              'El plazo que fije la ley fiscal aplicable, habitualmente entre 5 y 10 años.',
              'Obligación legal.',
            ],
            [
              'Copias de seguridad',
              'Rotación de hasta 35 días.',
              'Continuidad del servicio.',
            ],
          ]}
          notaAlPie="Un dato eliminado de la base activa puede sobrevivir hasta el vencimiento del ciclo de copias de seguridad. Durante ese lapso queda cifrado y fuera de todo uso, y se elimina definitivamente al rotar la copia."
        />
      </>
    ),
  },
  {
    id: 'proteccion',
    titulo: 'Cómo protegemos la información',
    contenido: (
      <>
        <p>Aplicamos medidas técnicas y organizativas apropiadas al riesgo, entre ellas:</p>
        <ul>
          <li>
            <strong>Cifrado en tránsito:</strong> todo el tráfico viaja por HTTPS con TLS 1.2 o
            superior, con HSTS habilitado.
          </li>
          <li>
            <strong>Cifrado de secretos:</strong> el token de acceso de Meta se guarda cifrado
            con AES-256-GCM y claves gestionadas fuera del código.
          </li>
          <li>
            <strong>Contraseñas con hash:</strong> bcrypt con sal por usuario. Ni siquiera nosotros
            podemos leer tu contraseña.
          </li>
          <li>
            <strong>Control de acceso basado en roles:</strong> cada operación exige un permiso
            concreto, verificado en el servidor y no solo en la interfaz.
          </li>
          <li>
            <strong>Aislamiento por cuenta:</strong> cada registro está asociado a su cuenta y las
            consultas se filtran por ella a nivel de modelo de datos.
          </li>
          <li>
            <strong>Cabeceras de seguridad, límite de tasa y validación estricta de entradas</strong>{' '}
            en todos los extremos de la API.
          </li>
          <li>
            <strong>Cookies de sesión HttpOnly, Secure y SameSite</strong>, inaccesibles desde
            JavaScript.
          </li>
          <li>
            <strong>Principio de mínimo privilegio</strong> en el acceso del personal, con registro
            de cada acceso.
          </li>
        </ul>
        <p>
          Ninguna medida elimina el riesgo por completo. Si ocurriera una violación de seguridad
          que suponga un riesgo para tus derechos, te lo notificaremos sin dilación indebida y, en
          el ámbito del RGPD, dentro de las <strong>72 horas</strong> de tener conocimiento, junto
          con la notificación a la autoridad de control que corresponda.
        </p>
      </>
    ),
  },
  {
    id: 'derechos',
    titulo: 'Tus derechos sobre tus datos',
    contenido: (
      <>
        <p>Con independencia de dónde vivas, te reconocemos los siguientes derechos:</p>
        <ul>
          <li>
            <strong>Acceso.</strong> Saber si tratamos datos tuyos, cuáles son, con qué finalidad,
            a quién se comunican y cuánto tiempo se conservan, y obtener una copia.
          </li>
          <li>
            <strong>Rectificación.</strong> Corregir datos inexactos y completar los incompletos.
            La mayoría podés editarlos vos desde el panel.
          </li>
          <li>
            <strong>Supresión.</strong> Pedir la eliminación de tus datos cuando ya no sean
            necesarios, retires el consentimiento o te opongas con fundamento. Ver la página de{' '}
            <Link to="/data-deletion">Eliminación de Datos</Link>.
          </li>
          <li>
            <strong>Portabilidad.</strong> Recibir tus datos en un formato estructurado, de uso
            común y lectura mecánica (exportamos en CSV y JSON), y transmitirlos a otro proveedor.
          </li>
          <li>
            <strong>Oposición.</strong> Oponerte a tratamientos basados en interés legítimo, y en
            cualquier momento y sin justificación a los de mercadotecnia directa.
          </li>
          <li>
            <strong>Limitación.</strong> Pedir que suspendamos el tratamiento mientras se verifica
            una impugnación, en lugar de eliminar los datos.
          </li>
          <li>
            <strong>Retirar el consentimiento</strong> en cualquier momento, sin efecto retroactivo
            sobre lo ya tratado lícitamente.
          </li>
          <li>
            <strong>No ser objeto de decisiones automatizadas</strong> con efectos jurídicos o
            significativos. Gesicomm no toma decisiones de ese tipo sobre personas.
          </li>
          <li>
            <strong>Reclamar ante una autoridad de control</strong> si considerás que tratamos tus
            datos de forma indebida.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'ejercer-derechos',
    titulo: 'Cómo ejercer tus derechos',
    contenido: (
      <>
        <p>Hay tres vías, y ninguna tiene costo:</p>
        <ol>
          <li>
            <strong>Desde el panel.</strong> Con la sesión iniciada, en Configuración podés ver y
            editar tus datos, exportarlos y eliminar tu cuenta.
          </li>
          <li>
            <strong>Formulario público.</strong> Para la eliminación de datos, incluso sin acceso a
            la cuenta, usá el formulario de{' '}
            <Link to="/data-deletion">Eliminación de Datos</Link>.
          </li>
          <li>
            <strong>Por correo.</strong> Escribinos a <Correo direccion="contacto@gesicomm.com" />{' '}
            indicando qué derecho querés ejercer.
          </li>
        </ol>
        <p>
          <strong>Verificación de identidad.</strong> Antes de actuar sobre un pedido verificamos
          que provenga del titular, para no exponer datos a un tercero que se haga pasar por vos.
          Puede implicar confirmar el pedido desde la dirección de correo registrada o aportar
          información que solo el titular conoce. No pedimos documentos de identidad salvo que no
          exista otra forma razonable de verificar, y en ese caso los eliminamos apenas concluye la
          verificación.
        </p>
        <p>
          <strong>Plazos.</strong> Acusamos recibo en un plazo máximo de 5 días hábiles y
          respondemos dentro de los <strong>30 días</strong> corridos. Si el pedido es
          especialmente complejo podemos prorrogarlo por 60 días más, avisándote el motivo antes
          de que venza el plazo original.
        </p>
      </>
    ),
  },
  {
    id: 'gdpr',
    titulo: 'Información adicional para el EEE y el Reino Unido (RGPD)',
    contenido: (
      <>
        <p>
          Si residís en el Espacio Económico Europeo, Suiza o el Reino Unido, se aplican
          adicionalmente estas precisiones:
        </p>
        <ul>
          <li>
            <strong>Responsable:</strong> Gesicomm. Contacto en materia de protección de datos:{' '}
            <Correo direccion="contacto@gesicomm.com" />.
          </li>
          <li>
            <strong>Bases jurídicas:</strong> las detalladas en la sección{' '}
            <a href="#base-legal">Base legal del tratamiento</a>.
          </li>
          <li>
            <strong>Transferencias internacionales:</strong> amparadas en Cláusulas Contractuales
            Tipo y, para el Reino Unido, en el Addendum correspondiente.
          </li>
          <li>
            <strong>Derecho de reclamación:</strong> podés reclamar ante la autoridad de control de
            tu país de residencia, de tu lugar de trabajo o del lugar donde se produjo la supuesta
            infracción. En el Reino Unido, ante la Information Commissioner's Office (ICO).
          </li>
          <li>
            <strong>Encargados de tratamiento:</strong> cuando actuamos como encargado, firmamos un
            Acuerdo de Tratamiento de Datos (DPA) con las cláusulas del artículo 28 del RGPD.
            Solicitalo en <Correo direccion="contacto@gesicomm.com" />.
          </li>
          <li>
            <strong>Evaluaciones de impacto:</strong> realizamos evaluaciones de impacto relativas
            a la protección de datos cuando un tratamiento nuevo puede entrañar un alto riesgo.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'ccpa',
    titulo: 'Información adicional para California (CCPA / CPRA)',
    contenido: (
      <>
        <p>
          Si sos residente de California, la California Consumer Privacy Act, reformada por la
          California Privacy Rights Act, te reconoce derechos específicos.
        </p>
        <p>
          <strong>Categorías de información personal recopiladas</strong> en los últimos doce
          meses, según la terminología de la CCPA: identificadores (nombre, correo, IP,
          identificadores de cuenta); información comercial (historial de pedidos y productos);
          información de actividad en internet (páginas visitadas, interacción con el servicio);
          información profesional o de empleo (rol dentro de la cuenta); y datos de geolocalización
          aproximada derivada de la IP.
        </p>
        <p>
          <strong>Venta y compartición.</strong> Gesicomm{' '}
          <strong>no vende información personal</strong> ni la <strong>comparte</strong> para
          publicidad conductual entre contextos, según la definición de esos términos en la CCPA.
          Tampoco lo hemos hecho en los doce meses anteriores. No vendemos ni compartimos
          información personal de menores de 16 años.
        </p>
        <p>
          <strong>Información sensible.</strong> No usamos ni divulgamos información personal
          sensible para fines distintos de los permitidos por la sección 7027(m) de las
          regulaciones de la CPRA, por lo que no corresponde el derecho de limitación de su uso.
        </p>
        <p>Tus derechos bajo la CCPA/CPRA:</p>
        <ul>
          <li>Derecho a saber qué información recopilamos, usamos y divulgamos.</li>
          <li>Derecho a eliminar la información personal que tengamos sobre vos.</li>
          <li>Derecho a corregir información personal inexacta.</li>
          <li>Derecho a excluirte de la venta o compartición (no aplicable: no lo hacemos).</li>
          <li>
            Derecho a la no discriminación: no te vamos a negar el servicio, cobrar distinto ni
            degradar la calidad por ejercer tus derechos.
          </li>
          <li>
            Derecho a designar un <strong>agente autorizado</strong> para ejercerlos en tu nombre,
            acreditando su representación.
          </li>
        </ul>
        <p>
          Para ejercerlos, escribí a <Correo direccion="contacto@gesicomm.com" /> con el asunto
          «Solicitud CCPA» o usá el formulario de{' '}
          <Link to="/data-deletion">Eliminación de Datos</Link>. Respondemos dentro de los 45 días,
          prorrogables por 45 días adicionales con aviso previo.
        </p>
      </>
    ),
  },
  {
    id: 'latam',
    titulo: 'Información adicional para Latinoamérica',
    contenido: (
      <>
        <p>
          Gesicomm opera principalmente en Latinoamérica y ajusta su tratamiento a la normativa
          local aplicable en cada país.
        </p>
        <ul>
          <li>
            <strong>Paraguay.</strong> Ley N.º 6534/2020 de Protección de Datos Personales
            Crediticios y las normas concordantes de protección de datos personales, además de las
            garantías constitucionales de acceso y rectificación.
          </li>
          <li>
            <strong>Argentina.</strong> Ley N.º 25.326 de Protección de los Datos Personales y su
            reglamentación. Podés ejercer los derechos de acceso, rectificación, actualización y
            supresión, y reclamar ante la Agencia de Acceso a la Información Pública.
          </li>
          <li>
            <strong>Brasil.</strong> Lei Geral de Proteção de Dados (Lei N.º 13.709/2018). Se
            reconocen los derechos de confirmación, acceso, corrección, anonimización, bloqueo,
            eliminación, portabilidad, información sobre uso compartido y revocación del
            consentimiento. Autoridad: ANPD.
          </li>
          <li>
            <strong>México.</strong> Ley Federal de Protección de Datos Personales en Posesión de
            los Particulares. Podés ejercer tus derechos ARCO —Acceso, Rectificación, Cancelación y
            Oposición— y reclamar ante el organismo garante competente.
          </li>
          <li>
            <strong>Chile.</strong> Ley N.º 19.628 sobre Protección de la Vida Privada y su
            actualización normativa en materia de datos personales.
          </li>
          <li>
            <strong>Colombia.</strong> Ley 1581 de 2012 y sus decretos reglamentarios. Autoridad:
            Superintendencia de Industria y Comercio.
          </li>
          <li>
            <strong>Perú.</strong> Ley N.º 29733 de Protección de Datos Personales y su reglamento.
          </li>
          <li>
            <strong>Uruguay.</strong> Ley N.º 18.331 de Protección de Datos Personales y Acción de
            Habeas Data.
          </li>
        </ul>
        <p>
          En todos los casos el canal para ejercer derechos es el mismo:{' '}
          <Correo direccion="contacto@gesicomm.com" /> o el formulario de{' '}
          <Link to="/data-deletion">Eliminación de Datos</Link>. Si tu país reconoce un derecho más
          amplio que el descrito en esta política, prevalece el derecho local.
        </p>
      </>
    ),
  },
  {
    id: 'menores',
    titulo: 'Menores de edad',
    contenido: (
      <>
        <p>
          Gesicomm es una herramienta profesional dirigida exclusivamente a personas mayores de
          edad que administran un negocio. No está dirigida a menores de 16 años y no recopilamos
          conscientemente datos de menores como usuarios de la plataforma.
        </p>
        <p>
          Si detectamos que se creó una cuenta con datos de un menor sin la autorización que exija
          la ley aplicable, la eliminamos. Si sos madre, padre o tutor y creés que un menor a tu
          cargo nos proporcionó datos, escribinos a <Correo direccion="contacto@gesicomm.com" /> y
          procedemos a eliminarlos.
        </p>
      </>
    ),
  },
  {
    id: 'datos-meta',
    titulo: 'Uso y eliminación de datos obtenidos de Meta',
    contenido: (
      <>
        <p>
          Esta sección detalla nuestro compromiso específico respecto de los datos obtenidos a
          través de las plataformas de Meta, en cumplimiento de las Meta Platform Terms y de las
          Developer Policies.
        </p>
        <ul>
          <li>
            Usamos los datos de Meta <strong>únicamente</strong> para prestarte la funcionalidad
            que autorizaste al conectar la integración.
          </li>
          <li>
            <strong>No</strong> vendemos, licenciamos ni cedemos datos de la plataforma de Meta a
            corredores de datos, redes publicitarias, servicios de monetización de datos ni ningún
            tercero ajeno a la prestación del servicio.
          </li>
          <li>
            <strong>No</strong> usamos datos de Meta para tomar decisiones sobre elegibilidad
            crediticia, laboral, de seguros, de vivienda ni ninguna otra decisión que afecte
            derechos de una persona.
          </li>
          <li>
            Solicitamos <strong>únicamente los permisos mínimos</strong> necesarios para cada
            funcionalidad, y no pedimos permisos «por si acaso».
          </li>
          <li>
            Al desconectar la integración, <strong>revocamos y eliminamos los tokens de acceso de
            inmediato</strong> y dejamos de sincronizar datos nuevos.
          </li>
          <li>
            Eliminamos los datos obtenidos de Meta cuando ya no son necesarios para la finalidad
            autorizada, cuando revocás el permiso, cuando eliminás tu cuenta o cuando Meta nos lo
            requiere.
          </li>
        </ul>
        <p>
          <strong>Eliminación iniciada desde Meta.</strong> Si quitás la aplicación desde la
          configuración de tu cuenta de Facebook, Meta nos notifica automáticamente a
          través de nuestro <em>Data Deletion Callback</em>. Al recibir esa notificación
          verificamos criptográficamente que provenga realmente de Meta, registramos la solicitud y
          te devolvemos un código de confirmación con una URL pública donde podés seguir el estado
          del borrado. El proceso está descrito paso a paso en la página de{' '}
          <Link to="/data-deletion">Eliminación de Datos</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'cambios',
    titulo: 'Cambios en esta política',
    contenido: (
      <>
        <p>
          Podemos actualizar esta política para reflejar cambios en el servicio, en la normativa
          aplicable o en nuestras prácticas. La fecha de última actualización figura al inicio del
          documento.
        </p>
        <ul>
          <li>
            <strong>Cambios menores</strong> (correcciones de redacción, precisiones que no alteran
            el tratamiento) se publican directamente en esta página.
          </li>
          <li>
            <strong>Cambios sustanciales</strong> —una finalidad nueva, una categoría nueva de
            datos, un destinatario nuevo— se notifican por correo a la dirección registrada y
            mediante un aviso destacado en la aplicación, con al menos{' '}
            <strong>30 días de antelación</strong> a su entrada en vigor.
          </li>
          <li>
            Si el cambio requiere tu consentimiento, no se aplica hasta que lo prestes. Si no estás
            de acuerdo con un cambio sustancial, podés cancelar tu cuenta antes de que entre en
            vigor y solicitar la eliminación de tus datos.
          </li>
        </ul>
        <p>
          Conservamos las versiones anteriores de esta política y podés solicitarlas a{' '}
          <Correo direccion="contacto@gesicomm.com" />.
        </p>
      </>
    ),
  },
  {
    id: 'contacto',
    titulo: 'Contacto',
    contenido: (
      <>
        <p>Para cualquier consulta sobre esta política o sobre el tratamiento de tus datos:</p>
        <ul>
          <li>
            <strong>Privacidad y ejercicio de derechos:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Consultas legales y contractuales:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Soporte del producto:</strong> <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Formulario de contacto:</strong> <Link to="/contact">gesicomm.com/contact</Link>
          </li>
          <li>
            <strong>Eliminación de datos:</strong>{' '}
            <Link to="/data-deletion">gesicomm.com/data-deletion</Link>
          </li>
        </ul>
        <p>
          Si no quedás conforme con nuestra respuesta, tenés derecho a presentar una reclamación
          ante la autoridad de protección de datos de tu país de residencia.
        </p>
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalDoc
      titulo="Política de Privacidad"
      descripcion="Cómo Gesicomm recopila, usa, comparte, protege y elimina los datos personales: qué información obtenemos de Meta al conectar Facebook Ads, con qué base legal, cuánto la conservamos y cómo ejercer tus derechos bajo el RGPD, la CCPA/CPRA y la normativa de Latinoamérica."
      resumen="Esta política explica qué datos trata Gesicomm, por qué, durante cuánto tiempo y qué control tenés sobre ellos. Está escrita para que se entienda sin ser abogado, sin perder precisión jurídica."
      ruta="/privacy"
      actualizado="2026-08-03"
      vigenteDesde="2026-08-03"
      secciones={SECCIONES}
    >
      <Alert tono="info" titulo="Lo esencial, en cinco líneas" className="mb-10">
        <ul className="mt-2 space-y-1.5">
          <li>No vendemos tus datos ni los de tus clientes, a nadie, nunca.</li>
          <li>Solo accedemos a las plataformas que conectás, y solo con los permisos que autorizás.</li>
          <li>Podés exportar todo lo tuyo y podés pedir que lo borremos todo.</li>
          <li>Las contraseñas se guardan con hash y los tokens de integraciones, cifrados.</li>
          <li>Una eliminación solicitada se completa en un máximo de 30 días.</li>
        </ul>
      </Alert>
    </LegalDoc>
  );
}
