import { Link } from 'react-router-dom';
import LegalDoc, { Subseccion, TablaLegal } from '../../components/public/LegalDoc';
import Alert from '../../components/public/Alert';

const Correo = ({ direccion }) => <a href={`mailto:${direccion}`}>{direccion}</a>;

const SECCIONES = [
  {
    id: 'marco',
    titulo: 'Nuestro marco de cumplimiento',
    contenido: (
      <>
        <p>
          Gesicom opera como plataforma SaaS que trata datos personales por cuenta propia y por
          cuenta de sus clientes, y que se integra con plataformas de terceros sujetas a sus
          propias condiciones. Eso nos coloca bajo tres bloques normativos simultáneos:
        </p>
        <ul>
          <li>
            <strong>Protección de datos personales:</strong> RGPD, CCPA/CPRA y las leyes
            nacionales de Latinoamérica.
          </li>
          <li>
            <strong>Condiciones de plataforma:</strong> Meta Platform Terms y Meta Developer
            Policies.
          </li>
          <li>
            <strong>Normativa de comercio electrónico y consumo</strong> aplicable en los países
            donde operan nuestros clientes.
          </li>
        </ul>
        <p>
          Esta página resume cómo cumplimos cada uno. Los documentos vinculantes son la{' '}
          <Link to="/privacy">Política de Privacidad</Link> y los{' '}
          <Link to="/terms">Términos y Condiciones</Link>.
        </p>

        <Alert tono="info" titulo="Transparencia sobre certificaciones" className="mt-6">
          Gesicom alinea sus prácticas con los controles del marco ISO/IEC 27001 y con los
          criterios de SOC 2, pero <strong>no declara estar certificada</strong> en ninguno de
          ellos. Preferimos decirlo con claridad antes que insinuar una certificación que no
          tenemos. Si necesitás completar un cuestionario de seguridad de proveedores, escribinos a{' '}
          <Correo direccion="contacto@gesicomm.com" /> y lo respondemos con el detalle real de
          nuestros controles.
        </Alert>
      </>
    ),
  },
  {
    id: 'gdpr',
    titulo: 'RGPD — Reglamento General de Protección de Datos',
    contenido: (
      <>
        <p>
          El Reglamento (UE) 2016/679 se aplica al tratamiento de datos de personas en la Unión
          Europea, con independencia de dónde esté establecido el responsable. Gesicom lo toma
          como estándar de referencia global: aplicamos sus garantías a todos los usuarios, no solo
          a los europeos, porque mantener dos niveles de protección distintos sería peor producto y
          peor ingeniería.
        </p>

        <Subseccion titulo="2.1 Principios del artículo 5">
          <TablaLegal
            encabezados={['Principio', 'Cómo lo aplicamos']}
            filas={[
              [
                'Licitud, lealtad y transparencia',
                'Cada finalidad tiene una base jurídica identificada y publicada en la tabla de bases legales de la Política de Privacidad.',
              ],
              [
                'Limitación de la finalidad',
                'Los datos se usan para prestar el servicio contratado. No se reutilizan para fines incompatibles ni se venden.',
              ],
              [
                'Minimización de datos',
                'Solicitamos los permisos mínimos en cada integración y no pedimos campos que no se usan.',
              ],
              [
                'Exactitud',
                'Podés corregir tus datos desde el panel en cualquier momento, sin intervención de soporte.',
              ],
              [
                'Limitación del plazo de conservación',
                'Cada categoría de dato tiene un plazo de retención definido y publicado.',
              ],
              [
                'Integridad y confidencialidad',
                'Cifrado en tránsito y en reposo, control de acceso por roles y registro de auditoría.',
              ],
              [
                'Responsabilidad proactiva',
                'Documentamos decisiones de tratamiento, medidas de seguridad y procedimientos de respuesta.',
              ],
            ]}
          />
        </Subseccion>

        <Subseccion titulo="2.2 Derechos de los interesados">
          <p>
            Atendemos los derechos de acceso, rectificación, supresión, limitación, portabilidad y
            oposición, además de la retirada del consentimiento, en un plazo máximo de{' '}
            <strong>30 días</strong> y sin costo. El procedimiento está detallado en la{' '}
            <Link to="/privacy">Política de Privacidad</Link> y el canal de supresión, en{' '}
            <Link to="/data-deletion">Eliminación de Datos</Link>.
          </p>
        </Subseccion>

        <Subseccion titulo="2.3 Encargado del tratamiento y DPA">
          <p>
            Respecto de los datos de tus compradores, Gesicom actúa como{' '}
            <strong>encargado del tratamiento</strong>. Ofrecemos un Acuerdo de Tratamiento de
            Datos con las cláusulas exigidas por el artículo 28 del RGPD, que cubre el objeto y la
            duración del tratamiento, la naturaleza y finalidad, el tipo de datos y las categorías
            de interesados, las obligaciones de confidencialidad, las medidas de seguridad, el
            régimen de subencargados, la asistencia en el ejercicio de derechos, la notificación de
            brechas y el destino de los datos al finalizar. Solicitalo a{' '}
            <Correo direccion="contacto@gesicomm.com" />.
          </p>
        </Subseccion>

        <Subseccion titulo="2.4 Transferencias internacionales">
          <p>
            Las transferencias fuera del EEE se amparan en decisiones de adecuación o en las
            Cláusulas Contractuales Tipo de la Decisión 2021/914, complementadas con el Addendum
            del Reino Unido cuando corresponde, y acompañadas de una evaluación de impacto de la
            transferencia.
          </p>
        </Subseccion>

        <Subseccion titulo="2.5 Notificación de violaciones de seguridad">
          <p>
            Ante una violación de seguridad que suponga un riesgo para los derechos y libertades de
            las personas, notificamos a la autoridad de control dentro de las{' '}
            <strong>72 horas</strong> de tener conocimiento, y a los interesados afectados sin
            dilación indebida cuando el riesgo sea alto. El procedimiento completo está en la{' '}
            <Link to="/security">página de Seguridad</Link>.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'ccpa',
    titulo: 'CCPA / CPRA — California',
    contenido: (
      <>
        <p>
          La California Consumer Privacy Act, reformada por la California Privacy Rights Act,
          reconoce derechos específicos a los residentes de California.
        </p>

        <TablaLegal
          encabezados={['Obligación de la CCPA/CPRA', 'Situación en Gesicom']}
          filas={[
            [
              'Aviso en el momento de la recolección',
              'La Política de Privacidad detalla las categorías recopiladas y su finalidad, y está enlazada desde el pie de todas las páginas.',
            ],
            [
              'Derecho a saber',
              'Atendido. Se informan categorías, fuentes, finalidades y destinatarios.',
            ],
            [
              'Derecho a eliminar',
              'Atendido mediante el panel y el formulario público de eliminación de datos.',
            ],
            [
              'Derecho a corregir',
              'Atendido. Editable desde el panel o a pedido.',
            ],
            [
              'Derecho a excluirse de la venta o compartición',
              'No aplicable: Gesicom no vende ni comparte información personal en el sentido de la norma. Por eso no publicamos un enlace «Do Not Sell or Share».',
            ],
            [
              'Derecho a limitar el uso de información sensible',
              'No aplicable: no usamos información sensible fuera de los fines permitidos por la sección 7027(m).',
            ],
            [
              'Derecho a la no discriminación',
              'Garantizado. Ejercer un derecho no altera el precio, la calidad ni el acceso al servicio.',
            ],
            [
              'Agentes autorizados',
              'Aceptados, acreditando la representación del titular.',
            ],
            [
              'Señal Global Privacy Control',
              'Respetada cuando el navegador la envía.',
            ],
          ]}
        />

        <p className="mt-5">
          Cuando actuamos como <strong>proveedor de servicios</strong> («service provider») de
          nuestros clientes, tratamos la información personal únicamente para prestarles el
          servicio y no la retenemos, usamos ni divulgamos para ningún otro fin comercial, tal como
          exige la sección 1798.140(ag).
        </p>
      </>
    ),
  },
  {
    id: 'meta',
    titulo: 'Meta Platform Terms y Developer Policies',
    contenido: (
      <>
        <p>
          Gesicom es un desarrollador de la plataforma de Meta y cumple con las Meta Platform
          Terms, las Developer Policies y las políticas específicas de cada producto que utiliza.
        </p>

        <TablaLegal
          encabezados={['Requisito de Meta', 'Cómo lo cumplimos']}
          filas={[
            [
              'Política de privacidad pública y accesible',
              'Publicada en gesicomm.com/privacy, sin necesidad de iniciar sesión, con detalle de qué datos de Meta se usan y para qué.',
            ],
            [
              'Instrucciones de eliminación de datos',
              'Publicadas en gesicomm.com/data-deletion, con formulario público operativo y sin requerir cuenta.',
            ],
            [
              'Data Deletion Callback',
              'Implementado. Meta nos notifica cuando alguien quita la aplicación; verificamos el signed_request por HMAC-SHA256 contra el App Secret y devolvemos url y confirmation_code.',
            ],
            [
              'Uso limitado de los datos de la plataforma',
              'Los datos de Meta se usan solo para la funcionalidad autorizada. No se venden, no se ceden a corredores de datos ni a redes publicitarias.',
            ],
            [
              'Prohibición de decisiones sensibles',
              'No usamos datos de Meta para decisiones de crédito, empleo, seguros, vivienda ni ninguna otra que afecte derechos de una persona.',
            ],
            [
              'Permisos mínimos necesarios',
              'Cada integración solicita únicamente los permisos que su funcionalidad requiere.',
            ],
            [
              'Eliminación al revocar el permiso',
              'Al desconectar la integración se revocan y eliminan los tokens de inmediato y cesa la sincronización.',
            ],
            [
              'Seguridad de los datos de la plataforma',
              'Tokens cifrados con AES-256-GCM, transporte por HTTPS y acceso restringido por roles.',
            ],
            [
              'Transparencia sobre la relación con Meta',
              'El pie de todas las páginas aclara que Gesicom no está afiliada ni respaldada por Meta.',
            ],
          ]}
        />

        <Subseccion titulo="4.1 Alcance real de nuestra integración">
          <p>
            Gesicom usa <strong>un solo producto</strong> de la plataforma de Meta: la Marketing
            API, con los permisos <code>ads_management</code> y <code>business_management</code>.
            No usamos Facebook Login como método de autenticación, no usamos la Pages API, no
            usamos la Instagram Graph API y no usamos la WhatsApp Business Platform.
          </p>
          <p>
            Lo declaramos explícitamente porque el principio de minimización de permisos es un
            requisito de las Developer Policies, y porque solicitar alcances que no se usan es una
            de las causas más frecuentes de rechazo en la revisión de aplicaciones.
          </p>
        </Subseccion>
      </>
    ),
  },
  {
    id: 'latam',
    titulo: 'Normativa de Latinoamérica',
    contenido: (
      <>
        <p>
          Gesicom opera principalmente en Latinoamérica y ajusta su tratamiento a la ley de cada
          país. En todos los casos aplicamos el estándar más protector entre el local y el RGPD.
        </p>

        <TablaLegal
          encabezados={['País', 'Norma principal', 'Autoridad']}
          filas={[
            ['Paraguay', 'Ley N.º 6534/2020 y normativa concordante de protección de datos', 'Autoridad competente en materia de datos personales'],
            ['Argentina', 'Ley N.º 25.326 de Protección de los Datos Personales', 'Agencia de Acceso a la Información Pública'],
            ['Brasil', 'Lei N.º 13.709/2018 (LGPD)', 'Autoridade Nacional de Proteção de Dados (ANPD)'],
            ['México', 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares', 'Organismo garante competente'],
            ['Chile', 'Ley N.º 19.628 sobre Protección de la Vida Privada', 'Autoridad competente en materia de datos personales'],
            ['Colombia', 'Ley 1581 de 2012 y decretos reglamentarios', 'Superintendencia de Industria y Comercio'],
            ['Perú', 'Ley N.º 29733 y su reglamento', 'Autoridad Nacional de Protección de Datos Personales'],
            ['Uruguay', 'Ley N.º 18.331 y Acción de Habeas Data', 'Unidad Reguladora y de Control de Datos Personales'],
          ]}
          notaAlPie="Si tu país reconoce un derecho más amplio que el descrito en nuestras políticas, prevalece el derecho local."
        />
      </>
    ),
  },
  {
    id: 'comercio',
    titulo: 'Comercio electrónico y defensa del consumidor',
    contenido: (
      <>
        <p>
          Gesicom es una herramienta de gestión: no vende productos al consumidor final ni
          interviene en la relación entre el comerciante y su comprador. Esa relación —precio,
          entrega, garantía, devoluciones, facturación— es responsabilidad exclusiva del
          comerciante.
        </p>
        <p>
          Dicho eso, el producto está diseñado para <strong>facilitar</strong> ese cumplimiento:
        </p>
        <ul>
          <li>Trazabilidad completa de cada pedido y de sus cambios de estado.</li>
          <li>Historial de precios, para acreditar el precio vigente al momento de la venta.</li>
          <li>Registro de envíos y de sus fechas, útil ante un reclamo de entrega.</li>
          <li>Exportación de datos en formatos abiertos, para responder auditorías o reclamos.</li>
        </ul>
        <p>
          Como comerciante, seguís siendo responsable de informar precios de forma clara, respetar
          el derecho de arrepentimiento donde la ley lo reconozca, emitir los comprobantes fiscales
          que correspondan y atender los reclamos de tus compradores.
        </p>
      </>
    ),
  },
  {
    id: 'accesibilidad',
    titulo: 'Accesibilidad',
    contenido: (
      <>
        <p>
          Trabajamos para que el sitio público y la aplicación sean utilizables por la mayor
          cantidad de personas posible, tomando como referencia las{' '}
          <strong>Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1, nivel AA</strong>.
        </p>
        <p>Medidas implementadas en este sitio:</p>
        <ul>
          <li>Estructura semántica con encabezados jerárquicos y regiones identificadas.</li>
          <li>Enlace de salto al contenido principal como primer elemento tabulable.</li>
          <li>Navegación completa por teclado, con indicador de foco siempre visible.</li>
          <li>Contraste de color suficiente en ambos temas, claro y oscuro.</li>
          <li>Atributos ARIA en los componentes interactivos: acordeones, menús y avisos.</li>
          <li>Respeto de la preferencia de movimiento reducido del sistema operativo.</li>
          <li>Diseño adaptable, legible desde 320 px de ancho en adelante.</li>
        </ul>
        <p>
          La accesibilidad es un proceso, no un estado. Si encontrás una barrera, escribinos a{' '}
          <Correo direccion="contacto@gesicomm.com" /> y la corregimos.
        </p>
      </>
    ),
  },
  {
    id: 'subprocesadores',
    titulo: 'Subprocesadores y cadena de proveedores',
    contenido: (
      <>
        <p>Antes de incorporar un subprocesador evaluamos:</p>
        <ul>
          <li>Sus medidas técnicas y organizativas de seguridad.</li>
          <li>Su ubicación y las garantías de transferencia internacional aplicables.</li>
          <li>Sus certificaciones y auditorías independientes.</li>
          <li>Su historial de incidentes de seguridad.</li>
          <li>Su disposición a firmar un acuerdo de tratamiento con obligaciones equivalentes.</li>
        </ul>
        <p>
          Mantenemos una lista actualizada de subprocesadores, disponible a pedido en{' '}
          <Correo direccion="contacto@gesicomm.com" />, y notificamos con antelación razonable
          antes de incorporar uno nuevo, para que puedas oponerte si tenés motivos fundados.
        </p>
      </>
    ),
  },
  {
    id: 'requerimientos',
    titulo: 'Requerimientos de autoridades',
    contenido: (
      <>
        <p>Ante un requerimiento de una autoridad que solicite datos de un cliente:</p>
        <ol>
          <li>
            <strong>Verificamos su validez:</strong> que provenga de autoridad competente, que esté
            debidamente fundado y que tenga la forma legal exigible.
          </li>
          <li>
            <strong>Evaluamos su alcance:</strong> entregamos lo estrictamente requerido, nunca
            más. Un pedido genérico o desproporcionado se impugna.
          </li>
          <li>
            <strong>Notificamos al cliente afectado</strong>, salvo que la ley nos prohíba hacerlo
            o exista una orden de reserva.
          </li>
          <li>
            <strong>Documentamos</strong> cada requerimiento recibido y la respuesta dada.
          </li>
        </ol>
        <p>
          No entregamos datos de forma voluntaria ni establecemos accesos permanentes o
          automatizados para ninguna autoridad.
        </p>
      </>
    ),
  },
  {
    id: 'gobernanza',
    titulo: 'Gobernanza interna',
    contenido: (
      <>
        <ul>
          <li>
            <strong>Responsable de privacidad</strong> designado, con contacto público en{' '}
            <Correo direccion="contacto@gesicomm.com" />.
          </li>
          <li>
            <strong>Registro de actividades de tratamiento</strong> mantenido conforme al artículo
            30 del RGPD.
          </li>
          <li>
            <strong>Evaluaciones de impacto</strong> antes de lanzar tratamientos que puedan
            entrañar alto riesgo.
          </li>
          <li>
            <strong>Deber de confidencialidad</strong> para todo el personal con acceso a datos de
            clientes.
          </li>
          <li>
            <strong>Revisión periódica</strong> de políticas, accesos y proveedores.
          </li>
          <li>
            <strong>Privacidad desde el diseño y por defecto:</strong> cada funcionalidad nueva se
            evalúa por su impacto en datos personales antes de construirse.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'contacto',
    titulo: 'Contacto de cumplimiento',
    contenido: (
      <>
        <ul>
          <li>
            <strong>Consultas de cumplimiento y contractuales:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Protección de datos y ejercicio de derechos:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Cuestionarios de seguridad de proveedores:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
          <li>
            <strong>Solicitud de DPA o de la lista de subprocesadores:</strong>{' '}
            <Correo direccion="contacto@gesicomm.com" />
          </li>
        </ul>
      </>
    ),
  },
];

export default function Compliance() {
  return (
    <LegalDoc
      titulo="Cumplimiento Legal"
      descripcion="Cómo cumple Gesicom con el RGPD, la CCPA/CPRA, las Meta Platform Terms y la normativa de protección de datos de Latinoamérica, incluyendo el Data Deletion Callback de Meta, los DPA y la gestión de subprocesadores."
      resumen="Un resumen del marco normativo que nos aplica y de las medidas concretas con las que lo cumplimos. Incluye lo que sí tenemos y, con la misma claridad, lo que todavía no."
      ruta="/compliance"
      actualizado="2026-08-03"
      vigenteDesde="2026-08-03"
      secciones={SECCIONES}
    />
  );
}
