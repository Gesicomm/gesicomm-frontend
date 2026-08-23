import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { obtenerLandingPublica } from '../../services/landingPublicaService';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import { mapPublicDtoToTemplateData } from '../landing-simple/mapLandingToTemplateData';
import { Store, Loader } from 'lucide-react';
import { hexToRgba, resolverTemaPorSlug } from '../landing-simple/templates/themeUtils';
import StoreFooterLegal from './StoreFooterLegal';

export default function PoliticaPrivacidadPublica() {
  const { slug } = useParams();
  const [estado, setEstado] = useState('cargando');
  const [data, setData] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerLandingPublica(slug)
      .then((res) => {
        if (!activo) return;
        if (res === null) return setEstado('no-encontrada');
        if (!res.disponible) return setEstado('no-disponible');
        setData(res);
        setEstado('ok');
      })
      .catch(() => {
        if (activo) setEstado('no-encontrada');
      });
    return () => { activo = false; };
  }, [slug]);

  useDocumentSeo(`Política de Privacidad - ${data?.titulo || ''}`, data?.seo_descripcion || '');

  if (estado === 'cargando') return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader className="animate-spin text-white/50" /></div>;
  if (estado === 'no-encontrada') return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Tienda no encontrada.</div>;
  if (estado === 'no-disponible') return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Esta tienda no está disponible actualmente.</div>;

  const datosTemplate = mapPublicDtoToTemplateData(data);
  const { nombreComercio, logo, contacto, tema: temaData } = datosTemplate;
  const tema = resolverTemaPorSlug(temaData, data?.template?.slug);
  const bordeSuave = hexToRgba(tema.texto, 0.1);

  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const linkInicio = isLocalFallback && slug ? `/l/${slug}` : '/';
  const linkCatalogo = isLocalFallback && slug ? `/l/${slug}/catalogo` : '/catalogo';
  const linkContacto = isLocalFallback && slug ? `/l/${slug}/contacto` : '/contacto';

  const tel = contacto?.telefono || 'No especificado';
  const email = contacto?.email || 'No especificado';
  const direccion = contacto?.direccion ? `${contacto.direccion}${contacto.ciudad ? `, ${contacto.ciudad}` : ''}${contacto.pais ? `, ${contacto.pais}` : ''}` : 'No especificada';
  
  const fechaActualizacion = data?.updated_at ? new Date(data.updated_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '29 de julio de 2026';
  
  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: tema.fondo, color: tema.texto }}>
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur z-10" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.fondo, 0.95) }}>
        <a href={linkInicio} className="flex items-center gap-2 transition-opacity hover:opacity-80">
          {logo ? (
            <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[120px] object-contain" />
          ) : (
            <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: tema.acento }}><Store size={18} style={{ color: tema.fondo }} /></div>
          )}
          <span className="font-bold tracking-tight text-lg">{nombreComercio}</span>
        </a>
        <nav className="flex gap-4">
          <a href={linkCatalogo} className="font-semibold text-sm hover:opacity-80 transition-opacity">Catálogo</a>
          <a href={linkContacto} className="font-semibold text-sm hover:opacity-80 transition-opacity">Contacto</a>
        </nav>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-10 pb-20">
        <h1 className="text-4xl font-bold mb-4">Política de privacidad</h1>
        <p className="text-sm opacity-70 mb-10">Última actualización: {fechaActualizacion}</p>

        <div className="prose prose-sm max-w-none opacity-90 leading-relaxed space-y-6" style={{ color: tema.texto }}>
          <p>
            {nombreComercio} gestiona esta tienda y este sitio web, incluidos los datos, el contenido, las funciones, las herramientas, los productos y los servicios para ofrecerle a usted, el cliente, una experiencia de compra seleccionada (los "Servicios"). {nombreComercio} cuenta con tecnología de Gesicom que nos permite ofrecerle los Servicios. Esta Política de privacidad describe cómo recopilamos, utilizamos y divulgamos su información personal cuando visita, utiliza o realiza una compra u otra transacción a través de los Servicios o cuando se comunica con nosotros por cualquier otro medio. En caso de conflicto entre nuestros Términos del Servicio y esta Política de privacidad, prevalecerá esta Política de privacidad en lo que respecta a la recopilación, el tratamiento y la divulgación de su información personal.
          </p>
          <p>
            Le rogamos que lea atentamente esta Política de privacidad. Al utilizar y acceder a cualquiera de los Servicios, usted reconoce haber leído esta Política de privacidad y entender la forma en que se recopila, utiliza y divulga su información personal, de conformidad con lo establecido en la presente Política de privacidad.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Información personal que recopilamos o tratamos</h2>
          <p>
            Cuando utilizamos el término "información personal", nos referimos a cualquier dato que le identifique o que pueda vincularse razonablemente con usted o con otra persona. La información personal no incluye los datos recopilados de forma anónima ni aquellos que hayan sido desidentificados, de modo que no puedan identificarle ni vincularse razonablemente con usted. Podemos recopilar o tratar las siguientes categorías de información personal —incluidas las inferencias obtenidas a partir de dicha información—, en función de cómo interactúe con los Servicios, del lugar en el que resida y de lo que permita o exija la legislación aplicable:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Detalles de contacto</strong> incluidos su nombre, dirección, dirección de facturación, dirección de envío, número de teléfono y dirección de correo electrónico.</li>
            <li><strong>Información financiera</strong> incluidos los números de tarjeta de crédito, tarjeta de débito y cuentas financieras, la información de las tarjetas de pago, los datos de cuentas financieras, los detalles de las transacciones, la forma de pago, la confirmación del pago y otra información relacionada con el pago.</li>
            <li><strong>Información de la cuenta</strong> incluidos su nombre de usuario, contraseña, preguntas de seguridad, preferencias y configuración.</li>
            <li><strong>Información sobre transacciones</strong> incluidos los artículos que consulta, añade a su carrito, guarda en su lista de deseos o compra, devuelve, cambia o cancela, así como sus transacciones anteriores.</li>
            <li><strong>Comunicaciones con nosotros</strong> incluida la información que nos facilite en sus comunicaciones con nosotros, por ejemplo, al enviar una reclamación al servicio de atención al cliente.</li>
            <li><strong>Información del dispositivo</strong> incluida información sobre su dispositivo, navegador o conexión de red, su dirección IP y otros identificadores únicos.</li>
            <li><strong>Información sobre el uso</strong> incluida la información relativa a su interacción con los Servicios, como el modo y el momento en que los utiliza o navega por ellos.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">Fuentes de información personal</h2>
          <p>Podemos recopilar información personal de las siguientes fuentes:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Directamente de usted</strong> incluido cuando crea una cuenta, visita o utiliza los Servicios, se comunica con nosotros o nos proporciona su información personal por cualquier otro medio.</li>
            <li><strong>Automáticamente a través de los Servicios</strong> incluida la información procedente de su dispositivo cuando utiliza nuestros productos o servicios o visita nuestros sitios web, así como mediante el uso de cookies y tecnologías similares.</li>
            <li><strong>De nuestros proveedores de servicios</strong> incluido cuando los contratamos para habilitar determinada tecnología o cuando recopilan o tratan su información personal en nuestro nombre.</li>
            <li><strong>De nuestros partners o de otros terceros.</strong></li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">Cómo utilizamos su información personal</h2>
          <p>Según cómo interactúe con nosotros o qué Servicios utilice, podemos utilizar su información personal para los siguientes fines:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Prestar, personalizar y mejorar los Servicios.</strong> Utilizamos su información personal para prestarle los Servicios, lo que incluye cumplir el contrato celebrado con usted, procesar sus pagos, gestionar sus pedidos, recordar sus preferencias y los artículos que le interesan, enviarle notificaciones relacionadas con su cuenta, tramitar compras, devoluciones, cambios u otras transacciones, crear, mantener y gestionar su cuenta, organizar el envío, facilitar devoluciones y cambios, permitirle publicar reseñas y ofrecerle una experiencia de compra personalizada.</li>
            <li><strong>Marketing y publicidad.</strong> Utilizamos su información personal con fines de marketing y promoción, como enviarle comunicaciones comerciales, publicitarias y promocionales por correo electrónico, mensaje de texto o correo postal, así como mostrarle anuncios en línea.</li>
            <li><strong>Seguridad y prevención de fraudes.</strong> Utilizamos su información personal para autenticar su cuenta, ofrecer una experiencia de compra y pago segura, detectar, investigar o actuar ante posibles actividades fraudulentas.</li>
            <li><strong>Comunicaciones con usted.</strong> Utilizamos su información personal para ofrecerle atención al cliente, responder a sus solicitudes y mantener nuestra relación comercial.</li>
            <li><strong>Motivos legales.</strong> Utilizamos su información personal para cumplir con la legislación aplicable o responder a procedimientos legales válidos.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">Cómo divulgamos la información personal</h2>
          <p>En determinadas circunstancias, podemos divulgar su información personal a terceros por motivos legítimos. Tales circunstancias pueden incluir:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Con Gesicom, proveedores y otros terceros que prestan servicios en nuestro nombre (por ejemplo, gestión de TI, procesamiento de pagos, análisis de datos, atención al cliente, almacenamiento en la nube, gestión de pedidos y envíos).</li>
            <li>Con partners comerciales y de marketing para prestar servicios de marketing y mostrarle publicidad.</li>
            <li>Cuando usted nos lo indique, lo solicite o consienta de otro modo la divulgación de determinada información a terceros.</li>
            <li>Con nuestros afiliados o, en general, dentro de nuestro grupo empresarial.</li>
            <li>En relación con una transacción comercial, como una fusión o un proceso de insolvencia, para cumplir con obligaciones legales aplicables.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">Relación con Gesicom</h2>
          <p>
            Los Servicios se alojan en Gesicom, que recopila y procesa información personal sobre su acceso y uso de los Servicios, a fin de proporcionarle y mejorar los Servicios para usted. Con el objetivo de ofrecerle y mejorar los Servicios, la información que usted envíe a los Servicios se transmitirá y compartirá con Gesicom y con terceros que podrían estar ubicados en países diferentes al suyo. Además, para ayudar a proteger, desarrollar y mejorar nuestro negocio, utilizamos determinadas funciones avanzadas de Gesicom. Para obtener más información sobre cómo Gesicom utiliza su información personal, puede consultar la Política de privacidad de Gesicom en nuestro sitio web oficial.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Sitios web y enlaces de terceros</h2>
          <p>
            Los Servicios pueden incluir enlaces a sitios web u otras plataformas en línea gestionadas por terceros. Si accede a enlaces que dirigen a sitios no afiliados ni controlados por nosotros, le recomendamos que revise sus políticas de privacidad y seguridad. No garantizamos ni nos hacemos responsables de la privacidad o la seguridad de dichos sitios.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Datos de menores</h2>
          <p>
            Los Servicios no están destinados a ser utilizados por menores, y no recopilamos conscientemente información personal de menores de 16 años. Si usted es padre, madre o tutor legal de un menor que nos haya facilitado su información personal, puede ponerse en contacto con nosotros para solicitar su eliminación.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Seguridad y retención de su información</h2>
          <p>
            Tenga en cuenta que ninguna medida de seguridad es perfecta o infalible. El tiempo durante el cual conservamos su información personal depende de varios factores, como la necesidad de mantener su cuenta, prestarle los Servicios o cumplir con obligaciones legales.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Sus derechos y opciones</h2>
          <p>
            Según el lugar en el que resida, es posible que tenga derecho de acceso, supresión, rectificación, portabilidad de datos y gestión de preferencias de comunicación sobre la información personal que conservamos sobre usted. Podrá ejercer cualquiera de estos derechos poniéndose en contacto con nosotros a través de los detalles que se proporcionan más abajo.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Transferencias internacionales</h2>
          <p>
            Tenga en cuenta que podemos transferir, almacenar y tratar su información personal fuera del país en el que reside, utilizando mecanismos de transferencia reconocidos cuando corresponda.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Contacto</h2>
          <p>
            Si tiene alguna pregunta sobre nuestras prácticas de privacidad o sobre esta Política de privacidad, o si desea ejercer cualquiera de los derechos que le corresponden, puede ponerse en contacto con nosotros:
          </p>
          <ul className="list-none pl-0 space-y-1">
            <li><strong>Teléfono:</strong> {tel}</li>
            <li><strong>Email:</strong> {email}</li>
            <li><strong>Dirección:</strong> {direccion}</li>
          </ul>
        </div>
      </main>

      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={false} />
    </div>
  );
}
