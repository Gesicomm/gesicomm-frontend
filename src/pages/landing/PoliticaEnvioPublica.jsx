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

export default function PoliticaEnvioPublica() {
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

  useDocumentSeo(`Política de Envíos - ${data?.titulo || ''}`, data?.seo_descripcion || '');

  const catalogoCompleto = data?.catalogo_items?.length ? data.catalogo_items : (data?.items || []);
  const cartState = useStoreCart(slug, data, catalogoCompleto);

  if (estado === 'cargando') return <div className="min-h-screen flex items-center justify-center bg-canvas"><Loader className="animate-spin text-white/50" /></div>;
  if (estado === 'no-encontrada') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Tienda no encontrada.</div>;
  if (estado === 'no-disponible') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Esta tienda no está disponible actualmente.</div>;

  const datosTemplate = mapPublicDtoToTemplateData(data);
  const { nombreComercio, logo, tema: temaData } = datosTemplate;
  const tema = resolverTemaPorSlug(temaData, data?.template?.slug);
  const bordeSuave = hexToRgba(tema.texto, 0.1);

  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const linkInicio = isLocalFallback && slug ? `/l/${slug}` : '/';
  const linkCatalogo = isLocalFallback && slug ? `/l/${slug}/catalogo` : '/catalogo';
  const linkContacto = isLocalFallback && slug ? `/l/${slug}/contacto` : '/contacto';

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
        <h1 className="text-4xl font-bold mb-4">Política de Envíos</h1>
        <p className="text-sm opacity-70 mb-10">Última actualización: {fechaActualizacion}</p>

        <div className="prose prose-sm max-w-none opacity-90 leading-relaxed space-y-6" style={{ color: tema.texto }}>
          <p>
            En {nombreComercio} trabajamos para que su pedido llegue de forma rápida, segura y eficiente. A continuación, detallamos nuestras condiciones de envío:
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Envíos Locales</h2>
          <p>
            Realizamos entregas en nuestra ciudad y alrededores.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>El plazo estimado de entrega es de hasta 24 horas desde la confirmación del pedido.</li>
            <li>Los pedidos podrán abonarse mediante los métodos de pago habilitados por la tienda, incluyendo pago contra entrega cuando corresponda.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">2. Envíos Nacionales</h2>
          <p>
            Los pedidos con destino a otras regiones del país pueden requerir pago anticipado mediante transferencia bancaria o pasarela de pagos.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Una vez acreditado el pago, el pedido será preparado y entregado a la empresa de transporte o agencia de envíos tercerizada correspondiente.</li>
            <li>Desde el momento en que el paquete es depositado en la agencia de transporte, el plazo estimado de entrega dependerá de la localidad de destino y la operativa de la empresa transportadora.</li>
            <li>Los costos de envío pueden variar según la ubicación y estarán sujetos a confirmación antes del despacho.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">3. Tiempos de Entrega</h2>
          <p>
            Los plazos indicados son estimativos y pueden verse afectados por circunstancias ajenas a {nombreComercio}, incluyendo:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Condiciones climáticas.</li>
            <li>Retrasos operativos de empresas transportadoras.</li>
            <li>Días feriados o fechas de alta demanda.</li>
            <li>Situaciones de fuerza mayor.</li>
          </ul>
          <p>
            En estos casos, {nombreComercio} no garantiza fechas exactas de entrega, aunque realizará los esfuerzos razonables para cumplir los plazos informados.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">4. Datos de Entrega</h2>
          <p>
            Es responsabilidad del cliente proporcionar información correcta y completa para la entrega, incluyendo:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Nombre y apellido.</li>
            <li>Número de teléfono de contacto.</li>
            <li>Dirección exacta.</li>
            <li>Referencias adicionales cuando sean necesarias.</li>
          </ul>
          <p>
            {nombreComercio} no será responsable por demoras o inconvenientes derivados de información incorrecta o incompleta proporcionada por el cliente.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">5. Seguimiento y Recepción</h2>
          <p>
            Una vez despachado el pedido, el cliente podrá ser contactado por el servicio de entrega para coordinar la recepción. Es responsabilidad del cliente asegurarse de encontrarse disponible para recibir el pedido dentro del horario acordado.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">6. Modificaciones</h2>
          <p>
            {nombreComercio} se reserva el derecho de modificar esta Política de Envíos en cualquier momento para adaptarla a cambios operativos, logísticos o legales.
          </p>
          <p className="mt-6 italic">
            Al realizar una compra en {nombreComercio}, el cliente declara haber leído, comprendido y aceptado la presente Política de Envíos.
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
        onValidarCupon={cartState.validarCupon}
        pasarelas={data?.checkout?.pasarelas || []}
      />

      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={false} />
    </div>
  );
}
