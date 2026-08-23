import { Link } from 'react-router-dom';
import LegalDoc, { Subseccion, TablaLegal } from '../../components/public/LegalDoc';
import Alert from '../../components/public/Alert';

const Correo = ({ direccion }) => <a href={`mailto:${direccion}`}>{direccion}</a>;

const SECCIONES = [
  {
    id: 'que-son',
    titulo: 'Qué son las cookies y las tecnologías similares',
    contenido: (
      <>
        <p>
          Una <strong>cookie</strong> es un archivo de texto pequeño que un sitio web guarda en tu
          navegador. En visitas posteriores el navegador se la devuelve al sitio, lo que permite
          reconocer tu sesión o recordar una preferencia.
        </p>
        <p>Junto a las cookies existen otras tecnologías con finalidad equivalente:</p>
        <ul>
          <li>
            <strong>localStorage y sessionStorage:</strong> almacenamiento del navegador, con más
            capacidad que una cookie y que —a diferencia de ella— no viaja en cada solicitud al
            servidor.
          </li>
          <li>
            <strong>Píxeles de seguimiento:</strong> imágenes o fragmentos de código diminutos que
            registran que una página fue cargada.
          </li>
          <li>
            <strong>SDK y etiquetas de terceros:</strong> código de un proveedor externo que se
            ejecuta en la página, como una herramienta de analítica o un píxel publicitario.
          </li>
        </ul>
        <p>
          Esta política usa el término «cookies» para referirse a todas ellas, porque el marco
          legal aplicable las trata de forma equivalente.
        </p>
      </>
    ),
  },
  {
    id: 'enfoque',
    titulo: 'Nuestro enfoque',
    contenido: (
      <>
        <Alert tono="exito" titulo="El sitio público de Gesicom no te rastrea">
          En gesicomm.com —esta web institucional, con la landing y todas las páginas legales— no
          usamos cookies de analítica, de publicidad ni de terceros. No hay Google Analytics, no
          hay píxel de Meta y no hay banner de consentimiento, porque no hay nada que consentir.
        </Alert>
        <p className="mt-6">
          Las únicas tecnologías que se activan en este sitio son las{' '}
          <strong>estrictamente necesarias</strong> para que funcione, que según el artículo 5.3 de
          la Directiva ePrivacy y sus transposiciones nacionales están exentas del requisito de
          consentimiento previo.
        </p>
        <p>Hay tres contextos distintos, y conviene no confundirlos:</p>
        <ol>
          <li>
            <strong>El sitio institucional</strong> (gesicomm.com): solo lo estrictamente
            necesario.
          </li>
          <li>
            <strong>La aplicación</strong> (el panel, tras iniciar sesión): cookies de sesión y de
            seguridad, todas necesarias.
          </li>
          <li>
            <strong>Las tiendas y landings publicadas por nuestros clientes</strong>: pueden cargar
            herramientas de terceros que cada comerciante configura por su cuenta. Ver la sección{' '}
            <a href="#landings-clientes">Tiendas publicadas por clientes</a>.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: 'necesarias',
    titulo: 'Cookies estrictamente necesarias',
    contenido: (
      <>
        <p>
          Sin estas el servicio no puede funcionar. No requieren consentimiento y no se pueden
          desactivar desde el sitio, aunque sí desde tu navegador, con la consecuencia de que no
          vas a poder iniciar sesión.
        </p>

        <TablaLegal
          encabezados={['Nombre', 'Tipo', 'Finalidad', 'Duración']}
          filas={[
            [
              'accessToken',
              'Cookie propia, HttpOnly',
              'Mantiene tu sesión iniciada en el panel. Es HttpOnly, así que ningún script de la página puede leerla.',
              'Sesión / hasta su expiración corta',
            ],
            [
              'refreshToken',
              'Cookie propia, HttpOnly',
              'Permite renovar la sesión sin volver a pedirte la contraseña cada vez.',
              'Hasta 7 días',
            ],
            [
              'meta_oauth_state',
              'Cookie propia, HttpOnly',
              'Token antifalsificación del flujo de conexión con Meta. Evita que un tercero te haga vincular una cuenta ajena.',
              '10 minutos',
            ],
            [
              'meta_oauth_tenant / meta_oauth_user / meta_oauth_mode',
              'Cookie propia, HttpOnly',
              'Conservan a qué cuenta y usuario corresponde la conexión mientras dura el ida y vuelta con Meta.',
              '10 minutos',
            ],
            [
              'gesicomm-tema-publico',
              'localStorage',
              'Recuerda si elegiste el tema claro u oscuro en este sitio. Es una preferencia tuya, no un identificador: no permite reconocerte ni asociarte a ninguna otra información.',
              'Hasta que la borres',
            ],
          ]}
          notaAlPie="Todas las cookies de sesión se emiten con los atributos Secure, HttpOnly y SameSite, de modo que solo viajan por HTTPS, son inaccesibles desde JavaScript y no se envían en solicitudes originadas por otros sitios."
        />
      </>
    ),
  },
  {
    id: 'sesion-persistentes',
    titulo: 'Cookies de sesión y cookies persistentes',
    contenido: (
      <>
        <p>Según cuánto viven, las cookies se clasifican en dos grupos:</p>
        <ul>
          <li>
            <strong>De sesión.</strong> Existen mientras la pestaña o el navegador estén abiertos y
            se borran al cerrarlos. Gesicom las usa para el token de acceso: si cerrás el
            navegador, la sesión activa se pierde.
          </li>
          <li>
            <strong>Persistentes.</strong> Sobreviven al cierre del navegador hasta su fecha de
            expiración o hasta que las borres. Gesicom usa una sola de este tipo entre las
            necesarias —el token de renovación, con hasta 7 días— para no obligarte a escribir la
            contraseña en cada visita.
          </li>
        </ul>
        <p>
          Según quién las emite se dividen en <strong>propias</strong>, puestas por el dominio que
          estás visitando, y <strong>de terceros</strong>, puestas por otro dominio. En este sitio
          institucional <strong>no hay cookies de terceros</strong>.
        </p>
      </>
    ),
  },
  {
    id: 'analiticas',
    titulo: 'Cookies analíticas',
    contenido: (
      <>
        <p>
          Las cookies analíticas miden cómo se usa un sitio: páginas visitadas, tiempo de
          permanencia, origen del tráfico. Sirven para entender qué funciona y qué no.
        </p>
        <p>
          <strong>En gesicomm.com no las usamos hoy.</strong> Si en el futuro incorporáramos una
          herramienta de analítica, se activaría únicamente con tu consentimiento previo mediante
          un panel de preferencias, esta política se actualizaría antes de la activación y el
          consentimiento sería tan fácil de retirar como de otorgar.
        </p>

        <Subseccion titulo="Google Analytics">
          <p>
            Google Analytics 4 está disponible como herramienta{' '}
            <strong>que cada cliente puede configurar en su propia tienda</strong>, cargando su
            Measurement ID. En ese caso las cookies las emite Google en el contexto de esa tienda,
            no de gesicomm.com, y el responsable de recabar el consentimiento es el comerciante que
            la activó. Google actúa como proveedor de analítica de ese comerciante. Más información
            en las políticas de privacidad y de cookies de Google.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'marketing',
    titulo: 'Cookies de marketing y publicidad',
    contenido: (
      <>
        <p>
          Estas cookies permiten medir la efectividad de campañas publicitarias y mostrar anuncios
          en función de la navegación. Requieren siempre consentimiento previo, explícito e
          informado.
        </p>
        <p>
          <strong>Gesicom no muestra publicidad en su sitio institucional ni en su aplicación, y
          no instala cookies publicitarias propias.</strong>
        </p>

        <Subseccion titulo="Meta Pixel">
          <p>
            El Meta Pixel (píxel de Facebook) es una herramienta de Meta que registra acciones en
            un sitio web para atribuirlas a campañas publicitarias y construir públicos.
          </p>
          <p>
            En Gesicom el Meta Pixel es una <strong>funcionalidad para nuestros clientes</strong>:
            cada comerciante puede cargar su propio identificador de píxel para su tienda. Cuando
            lo hace:
          </p>
          <ul>
            <li>El píxel se carga en la tienda de ese comerciante, no en gesicomm.com.</li>
            <li>
              Las cookies que instala (<code>_fbp</code>, <code>_fbc</code>) son de Meta y su
              tratamiento se rige por la política de datos de Meta.
            </li>
            <li>
              <strong>El comerciante es el responsable</strong> de informar sobre el píxel en su
              propia política y de obtener el consentimiento de sus visitantes antes de activarlo.
            </li>
          </ul>
        </Subseccion>

        <Subseccion titulo="TikTok Pixel">
          <p>
            Igual que el Meta Pixel: es una integración opcional que cada comerciante configura
            para su tienda, bajo su propia responsabilidad y con las cookies emitidas por TikTok.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'landings-clientes',
    titulo: 'Tiendas y landings publicadas por clientes',
    contenido: (
      <>
        <p>
          Gesicom permite a sus clientes publicar tiendas y páginas de producto bajo un subdominio
          de gesicomm.com o bajo un dominio propio. Esas páginas <strong>no</strong> son el sitio
          institucional y pueden tener un comportamiento distinto en materia de cookies.
        </p>
        <p>En una tienda publicada por un cliente puede haber:</p>
        <ul>
          <li>Cookies técnicas necesarias para mostrar el catálogo y recordar el carrito.</li>
          <li>
            Meta Pixel, Google Analytics o TikTok Pixel, si el comerciante los configuró.
          </li>
        </ul>
        <Alert tono="advertencia" titulo="Responsabilidad del comerciante" className="mt-5">
          Cuando un comerciante activa una herramienta de analítica o de publicidad en su tienda,
          es él quien decide la finalidad del tratamiento y, por lo tanto, es el responsable de
          informarlo en su propia política de privacidad y de obtener el consentimiento de sus
          visitantes. Gesicom provee la herramienta técnica; no determina esa finalidad.
        </Alert>
        <p className="mt-5">
          Si sos visitante de una tienda hecha con Gesicom y tenés dudas sobre sus cookies,
          dirigite al comerciante titular de esa tienda.
        </p>
      </>
    ),
  },
  {
    id: 'deshabilitar',
    titulo: 'Cómo controlar o deshabilitar las cookies',
    contenido: (
      <>
        <p>
          Todos los navegadores permiten ver, bloquear y borrar cookies. Estas son las rutas en los
          más usados:
        </p>

        <TablaLegal
          encabezados={['Navegador', 'Dónde se configura']}
          filas={[
            ['Google Chrome', 'Configuración → Privacidad y seguridad → Cookies y otros datos de sitios'],
            ['Mozilla Firefox', 'Ajustes → Privacidad y seguridad → Cookies y datos del sitio'],
            ['Safari (macOS)', 'Safari → Ajustes → Privacidad → Gestionar datos de sitios web'],
            ['Safari (iOS)', 'Ajustes → Safari → Bloquear todas las cookies'],
            ['Microsoft Edge', 'Configuración → Cookies y permisos del sitio'],
            ['Opera', 'Configuración → Privacidad y seguridad → Cookies'],
          ]}
        />

        <Alert tono="advertencia" titulo="Qué pasa si bloqueás todas las cookies" className="mt-6">
          Las páginas públicas de gesicomm.com van a seguir funcionando con normalidad, porque no
          dependen de cookies. Pero <strong>no vas a poder iniciar sesión en el panel</strong>: la
          autenticación se apoya en cookies HttpOnly y sin ellas no hay forma de sostener la
          sesión.
        </Alert>

        <Subseccion titulo="Otras herramientas de control">
          <ul>
            <li>
              <strong>Modo de navegación privada:</strong> las cookies se borran al cerrar la
              ventana.
            </li>
            <li>
              <strong>Señales de exclusión del navegador</strong> como «Do Not Track» o «Global
              Privacy Control»: respetamos la señal GPC cuando el navegador la envía.
            </li>
            <li>
              <strong>Preferencias de anuncios de Meta:</strong> podés gestionarlas desde la
              configuración de tu cuenta de Facebook.
            </li>
            <li>
              <strong>Complemento de inhabilitación de Google Analytics:</strong> disponible para
              navegadores de escritorio, si visitás tiendas que lo tengan activo.
            </li>
          </ul>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'marco-legal',
    titulo: 'Marco legal aplicable',
    contenido: (
      <>
        <p>Esta política responde a las siguientes normas:</p>
        <ul>
          <li>
            <strong>Directiva 2002/58/CE (ePrivacy)</strong>, artículo 5.3, y sus transposiciones
            nacionales: exigen consentimiento previo para almacenar información en el equipo del
            usuario, salvo cuando sea estrictamente necesaria para prestar el servicio solicitado.
          </li>
          <li>
            <strong>Reglamento (UE) 2016/679 (RGPD)</strong>: rige el tratamiento de los datos
            personales que las cookies puedan recabar y define los requisitos del consentimiento
            válido.
          </li>
          <li>
            <strong>CCPA / CPRA de California</strong>: reconoce el derecho a excluirse de la venta
            o compartición de información personal. Gesicom no vende ni comparte información
            personal en ese sentido.
          </li>
          <li>
            <strong>Normativa local de Latinoamérica</strong> en materia de protección de datos,
            detallada en la <Link to="/privacy">Política de Privacidad</Link>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cambios',
    titulo: 'Cambios en esta política',
    contenido: (
      <>
        <p>
          Si incorporamos cookies nuevas, en especial de analítica o de marketing, actualizaremos
          esta política <strong>antes</strong> de activarlas e implementaremos el mecanismo de
          consentimiento que corresponda.
        </p>
        <p>
          La fecha de última actualización figura al inicio del documento. Te recomendamos
          revisarla periódicamente.
        </p>
      </>
    ),
  },
  {
    id: 'contacto',
    titulo: 'Contacto',
    contenido: (
      <p>
        Para consultas sobre esta política escribinos a{' '}
        <Correo direccion="contacto@gesicomm.com" /> o usá el{' '}
        <Link to="/contact">formulario de contacto</Link>.
      </p>
    ),
  },
];

export default function Cookies() {
  return (
    <LegalDoc
      titulo="Política de Cookies"
      descripcion="Qué cookies y tecnologías similares usa Gesicom, cuáles son estrictamente necesarias, qué hacen Meta Pixel y Google Analytics en las tiendas de nuestros clientes, y cómo controlarlas o deshabilitarlas desde tu navegador."
      resumen="El sitio público de Gesicom no usa cookies de analítica ni de publicidad. Acá está el detalle de qué se guarda en tu navegador, por qué, cuánto dura y cómo controlarlo."
      ruta="/cookies"
      actualizado="2026-08-03"
      vigenteDesde="2026-08-03"
      secciones={SECCIONES}
    />
  );
}
