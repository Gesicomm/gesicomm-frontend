import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { obtenerLandingPublica } from '../../services/landingPublicaService';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import { mapPublicDtoToTemplateData } from '../landing-simple/mapLandingToTemplateData';
import { Store, Loader } from 'lucide-react';
import { hexToRgba, resolverTemaPorSlug } from '../landing-simple/templates/themeUtils';
import StoreFooterLegal from './StoreFooterLegal';
import StoreHeader from '../landing-simple/templates/StoreHeader';
import CartDrawer from './CartDrawer';
import { useStoreCart } from './useStoreCart';

export default function TerminosServicioPublica() {
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

  useDocumentSeo(`Términos de Servicio - ${data?.titulo || ''}`, data?.seo_descripcion || '');

  const catalogoCompleto = data?.catalogo_items?.length ? data.catalogo_items : (data?.items || []);
  const cartState = useStoreCart(slug, data, catalogoCompleto);

  if (estado === 'cargando') return <div className="min-h-screen flex items-center justify-center bg-canvas"><Loader className="animate-spin text-white/50" /></div>;
  if (estado === 'no-encontrada') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Tienda no encontrada.</div>;
  if (estado === 'no-disponible') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Esta tienda no está disponible actualmente.</div>;

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

  const fechaActualizacion = data?.updated_at ? new Date(data.updated_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '24 de Junio del 2026';
  
  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: tema.fondo, color: tema.texto }}>
      {data?.template?.kind === 'rigido' ? (
        <StoreHeader
          templateSlug={data.template.slug}
          nombreComercio={nombreComercio}
          logo={logo}
          tema={resolverTemaPorSlug(temaData, data.template.slug)}
          cantidadCarrito={Array.from(cartState.carrito.values()).reduce((s, it) => s + it.cantidad, 0)}
          onAbrirCarrito={() => cartState.setCarritoAbierto(true)}
          linkInicio={linkInicio}
          linkCatalogo={isLocalFallback && slug ? `/l/${slug}/catalogo` : '/catalogo'}
          linkContacto={isLocalFallback && slug ? `/l/${slug}/contacto` : '/contacto'}
          previewMode={false}
        />
      ) : (
        <header className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur z-10" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(temaData?.fondo || '#fff', 0.95) }}>
          <a href={linkInicio} className="flex items-center gap-2 transition-opacity hover:opacity-80">
            {logo ? (
              <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: temaData?.acento }}><Store size={18} style={{ color: temaData?.fondo }} /></div>
            )}
            <span className="font-bold tracking-tight text-lg" style={{ color: temaData?.texto }}>{nombreComercio}</span>
          </a>
          <nav className="flex gap-4">
            <a href={isLocalFallback && slug ? `/l/${slug}/catalogo` : '/catalogo'} className="font-semibold text-sm hover:opacity-80 transition-opacity" style={{ color: temaData?.texto }}>Catálogo</a>
          </nav>
        </header>
      )}

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-10 pb-20">
        <h1 className="text-4xl font-bold mb-4">Términos de Servicio</h1>
        <p className="text-sm opacity-70 mb-10">Última actualización: {fechaActualizacion}</p>

        <div className="prose prose-sm max-w-none opacity-90 leading-relaxed space-y-6" style={{ color: tema.texto }}>
          <p>
            Bienvenido a {nombreComercio}. Al acceder a nuestro sitio web y realizar una compra, usted acepta los presentes Términos de Servicio. Le recomendamos leerlos detenidamente antes de utilizar nuestros servicios.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Información General</h2>
          <p>
            {nombreComercio} opera como una tienda de comercio electrónico dedicada a la comercialización de productos para el bienestar, descanso y rendimiento personal.
          </p>
          <p>
            Al realizar una compra en nuestro sitio, usted declara ser mayor de edad y contar con capacidad legal para celebrar contratos vinculantes.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">2. Productos y Disponibilidad</h2>
          <p>
            Nos esforzamos por mantener la información de nuestros productos actualizada y precisa. Sin embargo:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Las imágenes son ilustrativas y pueden presentar leves variaciones respecto al producto recibido.</li>
            <li>Los colores pueden variar según la configuración de la pantalla del dispositivo utilizado.</li>
            <li>La disponibilidad de stock puede cambiar sin previo aviso.</li>
          </ul>
          <p>
            Nos reservamos el derecho de limitar o cancelar pedidos cuando existan errores evidentes de precio, stock o descripción.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">3. Precios y Pagos</h2>
          <p>
            Todos los precios publicados se encuentran expresados en la moneda oficial indicada en la tienda, salvo indicación contraria.
          </p>
          <p>
            Aceptamos los métodos de pago informados en el sitio web al momento de la compra.
          </p>
          <p>
            Nos reservamos el derecho de modificar precios, promociones y condiciones comerciales en cualquier momento sin previo aviso.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">4. Envíos</h2>
          <p>
            Los plazos de entrega son estimados y pueden verse afectados por factores ajenos a {nombreComercio}, incluyendo condiciones climáticas, retrasos logísticos o situaciones de fuerza mayor.
          </p>
          <p>
            El cliente es responsable de proporcionar datos de entrega correctos y completos.
          </p>
          <p>
            Si la entrega no pudiera realizarse por información incorrecta o ausencia del destinatario, {nombreComercio} podrá cancelar el pedido o coordinar una nueva entrega bajo las condiciones que correspondan.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">5. Uso Adecuado de los Productos</h2>
          <p>
            Todos los productos deben utilizarse siguiendo las instrucciones proporcionadas por el fabricante o por {nombreComercio}.
          </p>
          <p>
            {nombreComercio} no será responsable por daños, perjuicios o inconvenientes derivados del uso incorrecto, negligente o contrario a las recomendaciones de uso.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">6. Limitación de Responsabilidad</h2>
          <p>
            Los productos comercializados por {nombreComercio} no sustituyen asesoramiento médico, diagnóstico profesional ni tratamiento de salud.
          </p>
          <p>
            La información proporcionada en el sitio web, publicidad, redes sociales o materiales informativos tiene fines exclusivamente informativos y comerciales.
          </p>
          <p>
            En la máxima medida permitida por la legislación aplicable, {nombreComercio} no será responsable por daños indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de los productos adquiridos.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">7. Política de Devoluciones y Reembolsos</h2>
          <p>
            Las devoluciones, cambios y reembolsos se regirán exclusivamente por la Política de Devoluciones y Reembolsos vigente publicada en este sitio.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">8. Propiedad Intelectual</h2>
          <p>
            Todo el contenido presente en el sitio web, incluyendo textos, imágenes, logotipos, diseños, gráficos, fotografías, videos y material publicitario, es propiedad de {nombreComercio} o de sus respectivos titulares y se encuentra protegido por las leyes aplicables de propiedad intelectual.
          </p>
          <p>
            Queda prohibida su reproducción, distribución o utilización sin autorización previa y por escrito.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">9. Modificaciones de los Términos</h2>
          <p>
            {nombreComercio} podrá actualizar o modificar estos Términos de Servicio en cualquier momento.
          </p>
          <p>
            Las modificaciones entrarán en vigencia desde su publicación en el sitio web.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">10. Contacto</h2>
          <p>
            Para consultas relacionadas con estos Términos de Servicio, el cliente podrá comunicarse a través de los canales oficiales de atención de {nombreComercio}:
          </p>
          <ul className="list-none pl-0 space-y-1">
            <li><strong>Teléfono:</strong> {tel}</li>
            <li><strong>Email:</strong> {email}</li>
            <li><strong>Dirección:</strong> {direccion}</li>
          </ul>
          <p className="mt-6 italic">
            Al utilizar este sitio web y realizar una compra, usted reconoce haber leído, comprendido y aceptado estos Términos de Servicio en su totalidad.
          </p>
        </div>
      </main>
      <CartDrawer
        items={Array.from(cartState.carrito.values())}
        sugerencias={cartState.sugerenciasCarrito}
        onAgregarSugerencia={cartState.agregarSugerencia}
        abierto={cartState.carritoAbierto}
        onAbrir={() => cartState.setCarritoAbierto(true)}
        onCerrar={() => cartState.setCarritoAbierto(false)}
        onCantidad={cartState.cambiarCantidadCarrito}
        onQuitar={cartState.quitarDelCarrito}
        onConfirmarPedido={cartState.confirmarPedido}
        pasarelas={data?.checkout?.pasarelas || []}
      />

      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={false} />
    </div>
  );
}
