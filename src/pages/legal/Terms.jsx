import { Link } from 'react-router-dom';
import LegalDoc, { Subseccion, TablaLegal } from '../../components/public/LegalDoc';
import Alert from '../../components/public/Alert';

const Correo = ({ direccion }) => <a href={`mailto:${direccion}`}>{direccion}</a>;

const SECCIONES = [
  {
    id: 'aceptacion',
    titulo: 'Aceptación de los términos',
    contenido: (
      <>
        <p>
          Estos Términos y Condiciones («Términos») constituyen un contrato vinculante entre
          Gesicom y la persona física o jurídica que contrata o utiliza el servicio («vos», «el
          Cliente»).
        </p>
        <p>
          Al crear una cuenta, acceder al panel, utilizar la API o conectar una integración,
          declarás que leíste, entendiste y aceptás estos Términos en su totalidad, junto con la{' '}
          <Link to="/privacy">Política de Privacidad</Link> y la{' '}
          <Link to="/cookies">Política de Cookies</Link>, que forman parte integrante de este
          acuerdo. Si no estás de acuerdo con alguna disposición, no debés usar el servicio.
        </p>
        <p>
          Si aceptás estos Términos en nombre de una empresa u organización, declarás que contás
          con facultades suficientes para obligarla, y «el Cliente» se refiere a esa entidad.
        </p>
        <p>
          <strong>Capacidad legal.</strong> Debés ser mayor de edad y tener capacidad legal para
          contratar en tu jurisdicción. Gesicom no está dirigida a menores de edad.
        </p>
      </>
    ),
  },
  {
    id: 'definiciones',
    titulo: 'Definiciones',
    contenido: (
      <>
        <ul>
          <li>
            <strong>Servicio:</strong> la plataforma Gesicom, incluyendo el sitio web, la
            aplicación web, el panel de administración, la API y todas sus funcionalidades.
          </li>
          <li>
            <strong>Cuenta:</strong> el espacio de trabajo del Cliente, con sus usuarios,
            configuración y datos.
          </li>
          <li>
            <strong>Usuario:</strong> toda persona autorizada por el Cliente para acceder a la
            Cuenta, incluidos empleados y colaboradores.
          </li>
          <li>
            <strong>Contenido del Cliente:</strong> todos los datos que el Cliente carga, genera o
            sincroniza en el Servicio: catálogo, pedidos, clientes, imágenes, textos y
            configuraciones.
          </li>
          <li>
            <strong>Integraciones:</strong> las conexiones con plataformas de terceros, incluyendo
            hoy únicamente Meta, para el seguimiento de campañas de Facebook Ads.
          </li>
          <li>
            <strong>Suscripción:</strong> el plan contratado, con su alcance funcional, sus límites
            y su período de facturación.
          </li>
          <li>
            <strong>Oferta Miembros Fundadores:</strong> campaña de lanzamiento limitada que puede
            otorgar precio y beneficios especiales a los primeros clientes pagos que cumplan las
            condiciones comunicadas por Gesicom.
          </li>
          <li>
            <strong>Programa de Afiliados:</strong> programa opcional mediante el cual ciertos
            clientes o participantes autorizados pueden recomendar Gesicom y generar comisiones bajo
            las reglas vigentes del programa.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'servicio',
    titulo: 'Descripción del servicio',
    contenido: (
      <>
        <p>
          Gesicom es una plataforma de software como servicio (SaaS) para administrar la operación
          de un negocio de comercio electrónico. Según el plan contratado, permite gestionar
          catálogo y productos, pedidos, inventario, clientes y CRM, logística y envíos, campañas
          de marketing, métricas y reportes, usuarios y permisos, y múltiples tiendas y sucursales.
        </p>
        <p>
          El Servicio se presta en modalidad de acceso remoto: no se entrega ni se licencia una
          copia del software. Gesicom conserva el control sobre la infraestructura y sobre las
          decisiones de arquitectura, versiones y despliegue.
        </p>
        <p>
          Gesicom es una <strong>herramienta de gestión</strong>. No es un procesador de pagos, no
          es un transportista, no es un asesor fiscal ni contable, y no sustituye tus obligaciones
          legales como comerciante. Las decisiones comerciales, fiscales y logísticas siguen siendo
          tuyas.
        </p>
      </>
    ),
  },
  {
    id: 'registro',
    titulo: 'Registro, cuenta y credenciales',
    contenido: (
      <>
        <Subseccion titulo="4.1 Datos de registro">
          <p>
            Te comprometés a proporcionar información veraz, exacta y actualizada al registrarte, y
            a mantenerla actualizada. Gesicom puede suspender o cancelar una cuenta con
            información falsa o desactualizada.
          </p>
        </Subseccion>

        <Subseccion titulo="4.2 Seguridad de las credenciales">
          <p>
            Sos responsable de mantener la confidencialidad de tus credenciales y de toda actividad
            realizada bajo tu cuenta. En particular:
          </p>
          <ul>
            <li>No compartas tu contraseña ni permitas que varias personas usen un mismo usuario.</li>
            <li>Usá contraseñas robustas y distintas de las de otros servicios.</li>
            <li>
              Notificanos de inmediato a <Correo direccion="contacto@gesicomm.com" /> ante cualquier
              uso no autorizado o sospecha de compromiso.
            </li>
          </ul>
          <p>
            Gesicom no es responsable por pérdidas derivadas del uso no autorizado de credenciales
            cuando ese uso no sea consecuencia de un incumplimiento nuestro.
          </p>
        </Subseccion>

        <Subseccion titulo="4.3 Usuarios y permisos">
          <p>
            Podés invitar usuarios y asignarles roles. Sos responsable de los actos y omisiones de
            los usuarios que autorices, como si fueran propios, y de revocar sus accesos cuando
            corresponda —por ejemplo, al desvincularse de tu empresa—.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'responsabilidades',
    titulo: 'Responsabilidades del Cliente',
    contenido: (
      <>
        <p>Al usar Gesicom, te comprometés a:</p>
        <ul>
          <li>
            Cumplir toda la normativa aplicable a tu actividad: comercial, fiscal, aduanera, de
            defensa del consumidor, de comercio electrónico y de protección de datos.
          </li>
          <li>
            Tener <strong>base legal suficiente</strong> para cargar en Gesicom los datos
            personales de tus clientes, y haberles informado adecuadamente sobre el tratamiento.
          </li>
          <li>
            Contar con los derechos necesarios sobre las imágenes, textos, marcas y demás contenido
            que subas.
          </li>
          <li>
            Obtener y mantener vigentes las autorizaciones que exijan las plataformas que conectás,
            y cumplir sus propios términos de servicio.
          </li>
          <li>
            Responder ante tus clientes por la venta, la entrega, la facturación, las garantías y
            la posventa de tus productos.
          </li>
          <li>Mantener copias de tu información crítica cuando tu operación lo requiera.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'uso-indebido',
    titulo: 'Uso aceptable y usos prohibidos',
    contenido: (
      <>
        <p>Está expresamente prohibido usar Gesicom para:</p>

        <Subseccion titulo="6.1 Actividades ilícitas o lesivas">
          <ul>
            <li>Vender productos o servicios cuya comercialización esté prohibida o restringida.</li>
            <li>Lavado de activos, financiamiento del terrorismo o evasión de sanciones.</li>
            <li>Infringir derechos de propiedad intelectual, industrial o de imagen de terceros.</li>
            <li>Difundir contenido ilegal, difamatorio, discriminatorio o que incite a la violencia.</li>
            <li>Realizar actividades fraudulentas o engañosas hacia consumidores.</li>
          </ul>
        </Subseccion>

        <Subseccion titulo="6.2 Spam y comunicaciones no solicitadas">
          <ul>
            <li>
              Enviar comunicaciones comerciales masivas no solicitadas por cualquier canal,
              incluidos los contactos que obtengas a través de tu vitrina.
            </li>
            <li>
              Usar listas de contactos obtenidas sin consentimiento o compradas a terceros.
            </li>
            <li>
              Contactar por WhatsApp a personas que no hayan iniciado ellas la conversación, o
              incumplir las políticas de mensajería de WhatsApp. El botón de tu vitrina existe
              para que sea tu comprador quien te escriba primero.
            </li>
            <li>Omitir un mecanismo simple y efectivo de baja en las comunicaciones comerciales.</li>
          </ul>
          <p>
            El incumplimiento de estas reglas puede acarrear, además de la suspensión de tu cuenta
            en Gesicom, el bloqueo de tu número por parte de Meta, sobre el cual no tenemos
            control.
          </p>
        </Subseccion>

        <Subseccion titulo="6.3 Bots, automatización y abuso técnico">
          <ul>
            <li>
              Usar bots, scrapers, crawlers o cualquier medio automatizado para acceder al Servicio
              fuera de la API oficial y de sus límites documentados.
            </li>
            <li>
              Eludir, deshabilitar o interferir los límites de tasa, la autenticación, las cuotas
              del plan o cualquier medida de seguridad.
            </li>
            <li>
              Realizar pruebas de carga, escaneos de vulnerabilidades o pruebas de penetración sin
              autorización previa y por escrito.
            </li>
            <li>
              Introducir código malicioso, virus o cualquier elemento que pueda dañar el Servicio o
              a otros clientes.
            </li>
            <li>
              Sobrecargar deliberadamente la infraestructura o degradar el servicio de terceros.
            </li>
          </ul>
        </Subseccion>

        <Subseccion titulo="6.4 Ingeniería inversa y competencia">
          <ul>
            <li>
              Descompilar, desensamblar o aplicar ingeniería inversa al Servicio, salvo en la
              medida en que la ley lo permita de forma imperativa y no renunciable.
            </li>
            <li>
              Copiar, reproducir o crear obras derivadas de la interfaz, la lógica de negocio, la
              documentación o el diseño del Servicio.
            </li>
            <li>
              Acceder al Servicio con el fin de construir un producto o servicio competidor, o de
              copiar sus funcionalidades.
            </li>
            <li>
              Revender, sublicenciar, alquilar o poner el Servicio a disposición de terceros como
              si fuera propio, salvo acuerdo expreso por escrito.
            </li>
          </ul>
        </Subseccion>

        <Alert tono="advertencia" titulo="Consecuencias" className="mt-6">
          El uso indebido faculta a Gesicom a suspender el acceso de inmediato, sin aviso previo y
          sin derecho a reembolso, además de perseguir las acciones legales que correspondan.
        </Alert>
      </>
    ),
  },
  {
    id: 'propiedad-intelectual',
    titulo: 'Propiedad intelectual',
    contenido: (
      <>
        <Subseccion titulo="7.1 Propiedad de Gesicom">
          <p>
            El Servicio, su código fuente, su arquitectura, su interfaz, su diseño, sus bases de
            datos, su documentación, la marca «Gesicom», su logotipo y todos los signos
            distintivos asociados son propiedad exclusiva de Gesicom o de sus licenciantes, y
            están protegidos por la normativa de propiedad intelectual e industrial.
          </p>
          <p>
            Estos Términos no transfieren ningún derecho de propiedad sobre el Servicio. Todos los
            derechos no concedidos expresamente quedan reservados.
          </p>
        </Subseccion>

        <Subseccion titulo="7.2 Licencia de uso que te otorgamos">
          <p>
            Mientras tu suscripción esté vigente y al día, Gesicom te concede una licencia{' '}
            <strong>limitada, no exclusiva, intransferible, no sublicenciable y revocable</strong>{' '}
            para acceder y usar el Servicio con fines internos de tu negocio, conforme al plan
            contratado y a estos Términos.
          </p>
        </Subseccion>

        <Subseccion titulo="7.3 Tu contenido sigue siendo tuyo">
          <p>
            El Contenido del Cliente es y sigue siendo de tu propiedad. Gesicom no reclama ningún
            derecho de propiedad sobre él.
          </p>
          <p>
            Nos otorgás una licencia <strong>limitada, mundial y libre de regalías</strong> para
            alojar, copiar, transmitir, mostrar y procesar tu contenido{' '}
            <strong>con el único fin de prestarte el Servicio</strong> y de cumplir con estos
            Términos. Esta licencia termina cuando eliminás el contenido o cerrás tu cuenta, salvo
            por las copias residuales en respaldos hasta su rotación.
          </p>
        </Subseccion>

        <Subseccion titulo="7.4 Comentarios y sugerencias">
          <p>
            Si nos enviás sugerencias, ideas o propuestas de mejora, podremos usarlas libremente y
            sin contraprestación para desarrollar el Servicio, sin que ello genere derecho alguno a
            tu favor.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'integraciones',
    titulo: 'Integraciones con plataformas de terceros',
    contenido: (
      <>
        <p>
          Gesicom permite conectar plataformas de terceros. Estas integraciones son opcionales y
          se activan únicamente con tu autorización expresa mediante OAuth.
        </p>

        <Subseccion titulo="8.1 Condiciones generales de las integraciones">
          <ul>
            <li>
              Al conectar una plataforma aceptás <strong>además</strong> los términos y políticas de
              esa plataforma, que son independientes de estos Términos.
            </li>
            <li>
              Gesicom no controla las plataformas de terceros y no responde por su disponibilidad,
              por cambios en sus APIs, por sus decisiones de suspensión ni por sus políticas.
            </li>
            <li>
              Si una plataforma modifica o discontinúa su API, la funcionalidad correspondiente
              puede verse afectada o discontinuarse, sin que ello genere responsabilidad para
              Gesicom.
            </li>
            <li>
              Podés revocar cualquier integración en cualquier momento desde Configuración.
            </li>
          </ul>
        </Subseccion>

        <Subseccion titulo="8.2 Meta y Facebook Ads">
          <p>
            La integración con Meta solicita exactamente dos permisos —<code>ads_management</code>{' '}
            y <code>business_management</code>— y su uso está sujeto a las Meta Platform Terms, las
            Developer Policies, las Community Standards y las Advertising Policies de Meta. En
            particular:
          </p>
          <ul>
            <li>
              Sos responsable del contenido de tus anuncios y del cumplimiento de las políticas
              publicitarias de Meta.
            </li>
            <li>
              Gesicom no responde por el rechazo de anuncios, la inhabilitación de cuentas
              publicitarias, la restricción de páginas ni ninguna otra medida que Meta adopte sobre
              tus activos.
            </li>
            <li>
              El gasto publicitario se factura directamente entre vos y Meta. Gesicom no
              intermedia en ese pago ni percibe comisión sobre él, salvo pacto expreso distinto.
            </li>
          </ul>
        </Subseccion>

        <Subseccion titulo="8.3 WhatsApp: enlace, no integración">
          <p>
            Gesicom <strong>no usa la API de WhatsApp Business</strong>. El botón de tu vitrina
            genera un enlace <code>wa.me</code> que abre la aplicación en el dispositivo de quien
            te consulta, y la conversación transcurre directamente entre esa persona y vos.
          </p>
          <p>
            En consecuencia, Gesicom no envía ni recibe mensajes, no accede a su contenido y no
            responde por lo que ocurra en esas conversaciones. El cumplimiento de las políticas de
            WhatsApp respecto del número que publicás, y de la normativa de protección de datos
            aplicable a esos intercambios, corresponde exclusivamente a vos.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'pagos',
    titulo: 'Planes, precios, pagos y suscripciones',
    contenido: (
      <>
        <Subseccion titulo="9.1 Planes y precios">
          <p>
            El Servicio se presta mediante suscripción. El alcance funcional, los límites de uso y
            el precio de cada plan son los publicados o los pactados por escrito al momento de la
            contratación. Los precios se expresan en la moneda indicada y, salvo mención en
            contrario, no incluyen impuestos, que se adicionan según la normativa aplicable.
          </p>
        </Subseccion>

        <Subseccion titulo="9.2 Facturación y renovación">
          <ul>
            <li>
              La suscripción se factura por adelantado, al inicio de cada período (mensual o anual,
              según el plan).
            </li>
            <li>
              Se <strong>renueva automáticamente</strong> por períodos iguales, salvo que la
              canceles antes del vencimiento del período en curso.
            </li>
            <li>
              Autorizás a Gesicom y a su proveedor de pagos a debitar el importe correspondiente en
              cada renovación, con el medio de pago registrado.
            </li>
            <li>
              Es tu responsabilidad mantener vigente y con fondos el medio de pago registrado.
            </li>
          </ul>
        </Subseccion>

        <Subseccion titulo="9.3 Cambios de precio">
          <p>
            Gesicom puede modificar sus precios notificándolo con al menos{' '}
            <strong>30 días de antelación</strong> a la fecha de renovación. El precio nuevo rige a
            partir del período siguiente. Si no estás de acuerdo, podés cancelar antes de esa fecha
            sin penalidad.
          </p>
        </Subseccion>

        <Subseccion titulo="9.4 Falta de pago">
          <p>
            Ante el impago de una factura vencida:
          </p>

          <TablaLegal
            encabezados={['Momento', 'Qué ocurre']}
            filas={[
              ['Vencimiento', 'Se notifica el impago y se reintenta el cobro.'],
              [
                'Hasta 7 días después',
                'La cuenta sigue plenamente operativa. Período de regularización.',
              ],
              [
                'De 8 a 30 días',
                'La cuenta pasa a modo de solo lectura: podés consultar y exportar tu información, pero no cargar operaciones nuevas.',
              ],
              [
                'A partir de 30 días',
                'La cuenta se suspende y las integraciones se desconectan.',
              ],
              [
                'A partir de 90 días',
                'La cuenta y sus datos pueden eliminarse definitivamente, previo aviso a la dirección registrada.',
              ],
            ]}
          />
        </Subseccion>

        <Subseccion titulo="9.5 Cancelación">
          <p>
            Podés cancelar tu suscripción en cualquier momento desde Configuración o escribiendo a{' '}
            <Correo direccion="contacto@gesicomm.com" />. La cancelación surte efecto{' '}
            <strong>al final del período ya facturado</strong>: conservás el acceso hasta esa
            fecha y no se genera un cobro nuevo.
          </p>
        </Subseccion>

        <Subseccion titulo="9.6 Reembolsos">
          <p>
            Salvo que la ley aplicable disponga lo contrario, las suscripciones{' '}
            <strong>no son reembolsables por períodos ya iniciados</strong>. Sí corresponde
            reembolso, total o proporcional, cuando:
          </p>
          <ul>
            <li>
              Gesicom discontinúa el Servicio o una funcionalidad esencial durante un período ya
              pagado.
            </li>
            <li>
              Se produjo un error de facturación imputable a Gesicom, como un cobro duplicado.
            </li>
            <li>
              Una indisponibilidad prolongada e imputable a Gesicom impidió materialmente el uso
              del Servicio.
            </li>
            <li>
              Corresponde un derecho de desistimiento irrenunciable según la normativa de consumo
              aplicable a tu jurisdicción.
            </li>
          </ul>
          <p>
            Las solicitudes se envían a <Correo direccion="contacto@gesicomm.com" /> y se responden
            dentro de los 15 días hábiles.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'fundadores-afiliados',
    titulo: 'Ofertas especiales, Fundadores y Programa de Afiliados',
    contenido: (
      <>
        <Subseccion titulo="10.1 Ofertas comerciales especiales">
          <p>
            Gesicom puede lanzar ofertas, descuentos, bonos, planes promocionales o beneficios
            limitados por tiempo, cupo, territorio, canal comercial o segmento de clientes. Estas
            condiciones especiales se aplican únicamente cuando hayan sido comunicadas por Gesicom y
            aceptadas por el Cliente al momento de contratar.
          </p>
          <p>
            Si existiera conflicto entre una comunicación comercial específica y estos Términos,
            prevalecerán estos Términos salvo que Gesicom haya pactado expresamente una excepción
            por escrito.
          </p>
        </Subseccion>

        <Subseccion titulo="10.2 Miembros Fundadores">
          <p>
            La Oferta Miembros Fundadores, cuando esté disponible, está limitada a los cupos,
            fechas, mercado y condiciones informadas en la campaña correspondiente. El precio
            Fundador se conserva únicamente mientras la suscripción permanezca activa, al día y sin
            cancelación.
          </p>
          <ul>
            <li>Cancelar la suscripción implica renunciar a la condición de Miembro Fundador.</li>
            <li>
              La condición de Miembro Fundador, el precio protegido y los beneficios asociados no
              se recuperan automáticamente si el Cliente vuelve a contratar más adelante.
            </li>
            <li>
              El Cliente que regrese después de cancelar deberá contratar bajo los precios, planes
              y condiciones vigentes en ese momento.
            </li>
            <li>
              Los beneficios Fundadores no incluyen servicios profesionales, consultoría,
              implementación individual, operación del e-commerce ni desarrollos personalizados,
              salvo pacto expreso.
            </li>
          </ul>
        </Subseccion>

        <Subseccion titulo="10.3 Programa de Afiliados">
          <p>
            Los Miembros Fundadores y otros participantes autorizados podrán acceder al Programa de
            Afiliados Gesicom conforme a las reglas vigentes publicadas o comunicadas por Gesicom.
            Salvo que Gesicom indique una condición distinta, la comisión base del programa será del{' '}
            <strong>40% recurrente</strong> sobre la suscripción SaaS elegible de cada cliente
            referido.
          </p>
          <ul>
            <li>
              La comisión se calcula únicamente sobre pagos elegibles efectivamente cobrados por
              Gesicom.
            </li>
            <li>
              El cliente referido debe permanecer activo, con sus pagos al día y cumpliendo estos
              Términos.
            </li>
            <li>
              No se generan comisiones por autorreferidos, cuentas duplicadas, fraude, abuso,
              tráfico engañoso o referencias que Gesicom considere inválidas.
            </li>
            <li>
              Cancelaciones, devoluciones, descuentos, créditos, contracargos o pagos revertidos
              podrán anular o ajustar las comisiones correspondientes.
            </li>
            <li>
              Servicios adicionales, implementaciones, consumos, impuestos, cargos de terceros u
              otros conceptos no SaaS pueden quedar excluidos de la base comisionable.
            </li>
          </ul>
          <p>
            Participar en el Programa de Afiliados no crea relación laboral, sociedad, franquicia,
            mandato, agencia ni representación legal entre el participante y Gesicom. El afiliado no
            está autorizado a asumir obligaciones, hacer garantías, modificar precios ni prometer
            condiciones en nombre de Gesicom.
          </p>
        </Subseccion>

        <Subseccion titulo="10.4 Cambios, suspensión y baja del programa">
          <p>
            Gesicom puede actualizar las reglas operativas del Programa de Afiliados, suspenderlo o
            dar de baja a un participante cuando exista incumplimiento, fraude, abuso, conflicto de
            intereses, daño reputacional o uso de prácticas comerciales engañosas. Las comisiones
            válidamente devengadas antes de una modificación se tratarán conforme a las reglas
            vigentes al momento de generarse, salvo fraude, contracargo o incumplimiento.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'disponibilidad',
    titulo: 'Disponibilidad, mantenimiento y soporte',
    contenido: (
      <>
        <p>
          Gesicom hace esfuerzos comercialmente razonables para mantener el Servicio disponible de
          forma continua, pero no garantiza una disponibilidad ininterrumpida ni libre de errores,
          salvo que se haya pactado un Acuerdo de Nivel de Servicio (SLA) por escrito.
        </p>
        <ul>
          <li>
            <strong>Mantenimiento programado:</strong> se avisa con antelación razonable y se
            procura realizarlo en franjas de baja actividad.
          </li>
          <li>
            <strong>Mantenimiento de emergencia:</strong> puede ejecutarse sin aviso previo cuando
            sea necesario para preservar la seguridad o la integridad del Servicio.
          </li>
          <li>
            <strong>Soporte:</strong> se presta por correo electrónico en{' '}
            <Correo direccion="contacto@gesicomm.com" />, en días hábiles, con los tiempos de
            respuesta que corresponda a tu plan.
          </li>
        </ul>
        <p>
          No se consideran indisponibilidad imputable a Gesicom las interrupciones causadas por
          fallas de plataformas de terceros, de tu conexión o equipos, por eventos de fuerza mayor,
          o por un uso del Servicio contrario a estos Términos.
        </p>
      </>
    ),
  },
  {
    id: 'suspension',
    titulo: 'Suspensión de la cuenta',
    contenido: (
      <>
        <p>
          Gesicom puede suspender total o parcialmente el acceso, de forma inmediata, cuando:
        </p>
        <ul>
          <li>Se incumplan estos Términos, en particular la sección de usos prohibidos.</li>
          <li>Exista un riesgo de seguridad para el Servicio, para otros clientes o para terceros.</li>
          <li>Se detecte actividad fraudulenta o que pueda generar responsabilidad legal.</li>
          <li>Lo exija una orden de autoridad competente.</li>
          <li>Se verifique impago conforme a los plazos de la sección 9.4.</li>
        </ul>
        <p>
          Siempre que sea razonablemente posible, notificamos la suspensión y su motivo, y damos
          oportunidad de subsanar. Cuando el riesgo lo justifique, la suspensión puede ser previa a
          la notificación.
        </p>
      </>
    ),
  },
  {
    id: 'terminacion',
    titulo: 'Terminación del contrato',
    contenido: (
      <>
        <p>
          <strong>Por tu parte:</strong> podés terminar el contrato en cualquier momento cancelando
          la suscripción, con efecto al final del período facturado.
        </p>
        <p>
          <strong>Por parte de Gesicom:</strong> podemos terminar el contrato con{' '}
          <strong>30 días de preaviso</strong> sin necesidad de invocar causa, o de forma inmediata
          ante un incumplimiento grave, actividad ilícita o impago sostenido.
        </p>
        <p>
          <strong>Efectos de la terminación.</strong> Cesa tu derecho de acceso al Servicio; se
          revocan y eliminan los tokens de integraciones; y disponés de{' '}
          <strong>30 días</strong> desde la terminación para solicitar la exportación de tu
          Contenido del Cliente. Vencido ese plazo, los datos se eliminan conforme a los plazos de
          retención de la <Link to="/privacy">Política de Privacidad</Link>, salvo lo que debamos
          conservar por obligación legal.
        </p>
        <p>
          <strong>Supervivencia.</strong> Sobreviven a la terminación las secciones sobre propiedad
          intelectual, confidencialidad, limitación de responsabilidad, indemnización, ley
          aplicable y jurisdicción, y toda obligación de pago devengada antes de la terminación.
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    titulo: 'Protección de datos personales',
    contenido: (
      <>
        <p>
          El tratamiento de datos personales se rige por la{' '}
          <Link to="/privacy">Política de Privacidad</Link>, que forma parte de estos Términos.
        </p>
        <p>
          Respecto de los datos de tus clientes, actuás como <strong>responsable</strong> y Gesicom
          como <strong>encargado del tratamiento</strong>. Gesicom tratará esos datos únicamente
          conforme a tus instrucciones documentadas y a lo previsto en estos Términos, aplicará
          medidas de seguridad apropiadas, impondrá deber de confidencialidad a su personal, te
          asistirá en la atención de los derechos de los titulares y, al terminar el contrato,
          eliminará o devolverá los datos según tu instrucción.
        </p>
        <p>
          Si necesitás un Acuerdo de Tratamiento de Datos (DPA) firmado con las cláusulas del
          artículo 28 del RGPD, solicitalo a <Correo direccion="contacto@gesicomm.com" />.
        </p>
      </>
    ),
  },
  {
    id: 'confidencialidad',
    titulo: 'Confidencialidad',
    contenido: (
      <>
        <p>
          Cada parte se obliga a mantener en confidencialidad la información no pública de la otra a
          la que acceda con motivo de esta relación, incluyendo datos comerciales, precios, costos,
          estrategias, información técnica y de seguridad.
        </p>
        <p>La obligación de confidencialidad no alcanza a la información que:</p>
        <ul>
          <li>Ya era de dominio público, o pasó a serlo sin incumplimiento de la parte receptora.</li>
          <li>La parte receptora ya conocía legítimamente antes de recibirla.</li>
          <li>Fue desarrollada de forma independiente, sin usar la información confidencial.</li>
          <li>
            Deba divulgarse por mandato legal o de autoridad competente, en cuyo caso se notificará
            previamente a la otra parte cuando ello sea legalmente posible.
          </li>
        </ul>
        <p>
          Esta obligación se mantiene vigente durante la relación contractual y por{' '}
          <strong>tres años</strong> después de su terminación. Para los secretos comerciales, se
          mantiene mientras conserven tal carácter.
        </p>
      </>
    ),
  },
  {
    id: 'garantias',
    titulo: 'Garantías y exención de responsabilidad',
    contenido: (
      <>
        <p>
          Gesicom garantiza que prestará el Servicio con la diligencia profesional razonable y
          conforme a la descripción de su plan.
        </p>
        <p>
          Fuera de esa garantía, y en la máxima medida permitida por la ley aplicable, el Servicio
          se provee <strong>«tal cual» y «según disponibilidad»</strong>, sin garantías de ningún
          otro tipo, expresas o implícitas, incluidas —sin limitación— las garantías implícitas de
          comerciabilidad, idoneidad para un fin determinado y no infracción.
        </p>
        <p>En particular, Gesicom no garantiza que:</p>
        <ul>
          <li>El Servicio funcione de forma ininterrumpida o libre de errores.</li>
          <li>Los resultados obtenidos satisfagan tus expectativas comerciales.</li>
          <li>
            Las plataformas de terceros mantengan sus APIs, sus condiciones o su disponibilidad.
          </li>
          <li>Los datos sincronizados desde terceros sean exactos o completos.</li>
        </ul>
        <Alert tono="info" titulo="Derechos del consumidor" className="mt-5">
          Si la ley de tu jurisdicción te reconoce garantías legales irrenunciables como
          consumidor, esta sección no las limita ni las excluye: se aplican en su totalidad.
        </Alert>
      </>
    ),
  },
  {
    id: 'responsabilidad',
    titulo: 'Limitación de responsabilidad',
    contenido: (
      <>
        <p>En la máxima medida permitida por la ley aplicable:</p>
        <ul>
          <li>
            Gesicom <strong>no responde</strong> por daños indirectos, incidentales, especiales,
            punitivos o consecuenciales, ni por lucro cesante, pérdida de ingresos, de clientela,
            de oportunidades comerciales o de datos, aun cuando se hubiera advertido de su
            posibilidad.
          </li>
          <li>
            La <strong>responsabilidad total y acumulada</strong> de Gesicom por cualquier
            reclamación derivada de estos Términos o del uso del Servicio no excederá, en conjunto,
            el <strong>importe efectivamente pagado por el Cliente en los doce meses anteriores</strong>{' '}
            al hecho que motiva la reclamación.
          </li>
          <li>
            Gesicom no responde por hechos de plataformas de terceros, incluyendo suspensiones o
            inhabilitaciones de cuentas publicitarias, cambios en la API de Meta o pérdida de datos
            en el origen.
          </li>
        </ul>
        <p>
          Estas limitaciones <strong>no se aplican</strong> a los daños causados por dolo o culpa
          grave de Gesicom, a los daños a la vida o la integridad física de las personas, ni a
          ninguna responsabilidad que la ley declare irrenunciable.
        </p>
        <p>
          Las partes reconocen que estas limitaciones son un elemento esencial del equilibrio
          económico del contrato y que, sin ellas, el precio del Servicio sería distinto.
        </p>
      </>
    ),
  },
  {
    id: 'indemnizacion',
    titulo: 'Indemnidad',
    contenido: (
      <>
        <p>
          Te obligás a mantener indemne a Gesicom, sus socios, administradores y personal frente a
          toda reclamación, demanda, sanción, pérdida, daño, costo o gasto —incluidos honorarios
          razonables de abogados— que derive de:
        </p>
        <ul>
          <li>Tu incumplimiento de estos Términos o de la normativa aplicable.</li>
          <li>El Contenido del Cliente y su licitud.</li>
          <li>
            El tratamiento de datos personales de tus clientes sin base legal suficiente o sin la
            información debida.
          </li>
          <li>Tus productos, tus ventas, tus envíos y tu relación con tus compradores.</li>
          <li>
            El incumplimiento de los términos de las plataformas de terceros que hayas conectado.
          </li>
          <li>
            Reclamaciones de terceros por infracción de derechos de propiedad intelectual sobre el
            contenido que subiste.
          </li>
        </ul>
        <p>
          Gesicom te notificará la reclamación sin demora injustificada y podrá participar en su
          defensa con letrado propio y a su costa.
        </p>
      </>
    ),
  },
  {
    id: 'fuerza-mayor',
    titulo: 'Fuerza mayor',
    contenido: (
      <p>
        Ninguna parte será responsable por el incumplimiento de sus obligaciones —salvo las de
        pago— cuando se deba a causas fuera de su control razonable: catástrofes naturales,
        conflictos armados, actos de autoridad, emergencias sanitarias, cortes generalizados de
        energía o de telecomunicaciones, ataques informáticos a gran escala, o fallas prolongadas de
        proveedores esenciales de infraestructura. La parte afectada lo notificará sin demora y
        ambas colaborarán de buena fe para mitigar los efectos.
      </p>
    ),
  },
  {
    id: 'modificaciones',
    titulo: 'Modificaciones del Servicio y de los Términos',
    contenido: (
      <>
        <p>
          <strong>Del Servicio.</strong> Gesicom puede modificar, agregar o discontinuar
          funcionalidades para mejorar el producto. Si se discontinúa una funcionalidad esencial
          del plan contratado, se avisa con al menos 60 días de antelación y podés cancelar sin
          penalidad, con reembolso proporcional del período no utilizado.
        </p>
        <p>
          <strong>De los Términos.</strong> Podemos actualizar estos Términos. Los cambios
          sustanciales se notifican por correo a la dirección registrada y mediante aviso en la
          aplicación, con al menos <strong>30 días de antelación</strong> a su entrada en vigor.
          Si continuás usando el Servicio después de esa fecha, se entiende que los aceptás. Si no
          estás de acuerdo, podés cancelar antes de que entren en vigor.
        </p>
      </>
    ),
  },
  {
    id: 'cesion',
    titulo: 'Cesión',
    contenido: (
      <p>
        No podés ceder ni transferir este contrato, total o parcialmente, sin el consentimiento
        previo y por escrito de Gesicom. Gesicom puede cederlo en el marco de una reorganización
        societaria, fusión, adquisición o venta de activos, notificándolo con antelación razonable
        y sin que ello altere tus derechos bajo estos Términos.
      </p>
    ),
  },
  {
    id: 'ley-aplicable',
    titulo: 'Ley aplicable y jurisdicción',
    contenido: (
      <>
        <p>
          Estos Términos se rigen por las leyes de la <strong>República del Paraguay</strong>, con
          exclusión de sus normas de conflicto de leyes y de la Convención de las Naciones Unidas
          sobre los Contratos de Compraventa Internacional de Mercaderías.
        </p>
        <p>
          Para toda controversia derivada de estos Términos, las partes se someten a la
          jurisdicción de los <strong>tribunales ordinarios de la ciudad de Asunción,
          Paraguay</strong>, con renuncia expresa a cualquier otro fuero que pudiera
          corresponderles.
        </p>
        <p>
          <strong>Excepción para consumidores.</strong> Si usás Gesicom como consumidor y la
          normativa de tu país de residencia te reconoce el derecho a demandar ante los tribunales
          de tu domicilio, esa norma prevalece sobre esta cláusula.
        </p>
      </>
    ),
  },
  {
    id: 'conflictos',
    titulo: 'Resolución de conflictos',
    contenido: (
      <>
        <p>Antes de acudir a la vía judicial, las partes se comprometen a intentar una solución amistosa:</p>
        <ol>
          <li>
            <strong>Notificación.</strong> La parte afectada comunica el conflicto por escrito a{' '}
            <Correo direccion="contacto@gesicomm.com" />, describiendo los hechos y la solución
            pretendida.
          </li>
          <li>
            <strong>Negociación directa.</strong> Las partes negocian de buena fe durante{' '}
            <strong>30 días corridos</strong> desde la notificación.
          </li>
          <li>
            <strong>Mediación.</strong> Si no hay acuerdo, cualquiera de las partes puede proponer
            una mediación ante un centro reconocido. Los costos se reparten por mitades, salvo
            acuerdo distinto.
          </li>
          <li>
            <strong>Vía judicial.</strong> Agotadas las instancias anteriores, o si la otra parte no
            responde en 30 días, queda expedita la vía judicial ante los tribunales indicados en la
            sección anterior.
          </li>
        </ol>
        <p>
          Nada de lo anterior impide a ninguna de las partes solicitar medidas cautelares urgentes
          ante el tribunal competente cuando exista riesgo de daño irreparable.
        </p>
      </>
    ),
  },
  {
    id: 'generales',
    titulo: 'Disposiciones generales',
    contenido: (
      <>
        <ul>
          <li>
            <strong>Acuerdo íntegro.</strong> Estos Términos, junto con la Política de Privacidad y
            la Política de Cookies, constituyen el acuerdo completo entre las partes y reemplazan
            todo entendimiento previo sobre su objeto.
          </li>
          <li>
            <strong>Divisibilidad.</strong> Si una cláusula fuera declarada nula o inaplicable, se
            reemplazará por otra válida de efecto económico equivalente y el resto conservará plena
            vigencia.
          </li>
          <li>
            <strong>No renuncia.</strong> La tolerancia ante un incumplimiento no implica renuncia
            a exigir su cumplimiento en el futuro.
          </li>
          <li>
            <strong>Independencia de las partes.</strong> Nada en estos Términos crea una sociedad,
            empresa conjunta, relación laboral ni de agencia entre las partes.
          </li>
          <li>
            <strong>Notificaciones.</strong> Las notificaciones a Gesicom se envían a{' '}
            <Correo direccion="contacto@gesicomm.com" />. Las dirigidas al Cliente se envían a la
            dirección de correo registrada en la Cuenta, y se tienen por recibidas al día hábil
            siguiente de su envío.
          </li>
          <li>
            <strong>Idioma.</strong> La versión en español de estos Términos es la que prevalece
            ante cualquier discrepancia con una traducción.
          </li>
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
            <strong>Consultas legales y contractuales:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Soporte y facturación:</strong> <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Privacidad:</strong> <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Formulario de contacto:</strong> <Link to="/contact">gesicomm.com/contact</Link>
          </li>
        </ul>
      </>
    ),
  },
];

export default function Terms() {
  return (
    <LegalDoc
      titulo="Términos y Condiciones"
      descripcion="Condiciones de uso del servicio Gesicom: registro y cuenta, responsabilidades, propiedad intelectual, integración con Meta para Facebook Ads, suscripciones y reembolsos, limitación de responsabilidad, ley aplicable y resolución de conflictos."
      resumen="Estas condiciones regulan la relación entre Gesicom y quienes usan la plataforma. Definen qué podés hacer, qué nos comprometemos a hacer y qué pasa cuando algo sale mal."
      ruta="/terms"
      actualizado="2026-09-10"
      vigenteDesde="2026-09-10"
      secciones={SECCIONES}
    />
  );
}
