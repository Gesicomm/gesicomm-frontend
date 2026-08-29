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

export default function AvisoLegalPublico() {
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

  useDocumentSeo(`Aviso Legal - ${data?.titulo || ''}`, data?.seo_descripcion || '');

  if (estado === 'cargando') return <div className="min-h-screen flex items-center justify-center bg-canvas"><Loader className="animate-spin text-white/50" /></div>;
  if (estado === 'no-encontrada') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Tienda no encontrada.</div>;
  if (estado === 'no-disponible') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Esta tienda no está disponible actualmente.</div>;

  const datosTemplate = mapPublicDtoToTemplateData(data);
  const { nombreComercio, logo, contacto, tema: temaData } = datosTemplate;
  const tema = resolverTemaPorSlug(temaData, data?.template?.slug);
  const bordeSuave = hexToRgba(tema.texto, 0.1);

  const catalogoCompleto = data?.catalogo_items?.length ? data.catalogo_items : (data?.items || []);
  const cartState = useStoreCart(slug, data, catalogoCompleto);

  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const linkInicio = isLocalFallback && slug ? `/l/${slug}` : '/';
  const linkCatalogo = isLocalFallback && slug ? `/l/${slug}/catalogo` : '/catalogo';
  const linkContacto = isLocalFallback && slug ? `/l/${slug}/contacto` : '/contacto';
  
  const tel = contacto?.telefono || 'No especificado';
  const email = contacto?.email || 'No especificado';
  const direccion = contacto?.direccion ? `${contacto.direccion}${contacto.ciudad ? `, ${contacto.ciudad}` : ''}${contacto.pais ? `, ${contacto.pais}` : ''}` : 'No especificada';

  const fechaActualizacion = data?.updated_at ? new Date(data.updated_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '24 de junio de 2026';
  
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
        <h1 className="text-4xl font-bold mb-4">Aviso Legal</h1>
        <p className="text-sm opacity-70 mb-10">Última actualización: {fechaActualizacion}</p>

        <div className="prose prose-sm max-w-none opacity-90 leading-relaxed space-y-6" style={{ color: tema.texto }}>
          <p>
            La información contenida en este sitio web es proporcionada por {nombreComercio} con fines informativos y comerciales.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Información General</h2>
          <p>
            {nombreComercio} realiza esfuerzos razonables para mantener actualizada y precisa la información publicada en este sitio web. Sin embargo, no garantiza que toda la información se encuentre libre de errores, omisiones o desactualizaciones.
          </p>
          <p>
            Nos reservamos el derecho de modificar, actualizar o eliminar contenidos, productos, precios, promociones y servicios en cualquier momento y sin previo aviso.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">2. Productos y Resultados</h2>
          <p>
            Las imágenes, fotografías, videos y demás materiales visuales utilizados en este sitio tienen fines ilustrativos y pueden presentar variaciones respecto al producto recibido.
          </p>
          <p>
            Los resultados obtenidos mediante el uso de nuestros productos pueden variar entre personas dependiendo de múltiples factores individuales, por lo que no se garantizan resultados específicos.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">3. Información de Salud y Bienestar</h2>
          <p>
            Los productos comercializados por {nombreComercio} no constituyen asesoramiento médico, diagnóstico, tratamiento ni sustituyen la consulta con profesionales de la salud.
          </p>
          <p>
            Toda información relacionada con bienestar, descanso, sueño, rendimiento o cualquier otro beneficio potencial tiene carácter informativo y no debe interpretarse como una garantía de resultados ni como recomendación médica.
          </p>
          <p>
            Ante cualquier condición médica, tratamiento o duda relacionada con la salud, se recomienda consultar con un profesional calificado.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">4. Limitación de Responsabilidad</h2>
          <p>
            En la máxima medida permitida por la legislación aplicable, {nombreComercio} no será responsable por daños directos, indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso de los productos, servicios o contenidos publicados en este sitio web.
          </p>
          <p>
            El uso de los productos adquiridos es responsabilidad exclusiva del cliente.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">5. Enlaces Externos</h2>
          <p>
            Este sitio puede contener enlaces a sitios web de terceros. {nombreComercio} no controla ni asume responsabilidad alguna por el contenido, políticas o prácticas de dichos sitios externos.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">6. Propiedad Intelectual</h2>
          <p>
            Todo el contenido presente en este sitio web, incluyendo textos, imágenes, diseños, logotipos, fotografías, videos, gráficos y material publicitario, se encuentra protegido por las leyes de propiedad intelectual aplicables.
          </p>
          <p>
            Queda prohibida su reproducción, distribución o utilización sin autorización previa y por escrito de {nombreComercio}.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">7. Información de Contacto</h2>
          <p>
            Si tiene consultas relacionadas con este Aviso Legal, puede comunicarse con nosotros:
          </p>
          <ul className="list-none pl-0 space-y-1">
            <li><strong>Teléfono:</strong> {tel}</li>
            <li><strong>Email:</strong> {email}</li>
            <li><strong>Dirección:</strong> {direccion}</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">8. Modificaciones</h2>
          <p>
            {nombreComercio} se reserva el derecho de modificar el presente Aviso Legal en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en el sitio web.
          </p>
          <p className="mt-6 italic">
            Al acceder y utilizar este sitio web, usted reconoce haber leído, comprendido y aceptado el presente Aviso Legal.
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
      />

      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={false} />
    </div>
  );
}
