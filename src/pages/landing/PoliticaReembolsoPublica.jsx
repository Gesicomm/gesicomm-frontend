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

export default function PoliticaReembolsoPublica() {
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

  useDocumentSeo(`Política de Devoluciones y Reembolsos - ${data?.titulo || ''}`, data?.seo_descripcion || '');

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
        <h1 className="text-4xl font-bold mb-4">Política de Devoluciones y Reembolsos</h1>
        <p className="text-sm opacity-70 mb-10">Última actualización: {fechaActualizacion}</p>

        <div className="prose prose-sm max-w-none opacity-90 leading-relaxed space-y-6" style={{ color: tema.texto }}>
          <p>
            En {nombreComercio}, nos comprometemos a entregar productos en óptimas condiciones. Debido a la naturaleza de nuestros productos y por razones de higiene, seguridad y control de calidad, aplicamos la siguiente política de devoluciones y reembolsos:
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Productos con desperfectos de fábrica</h2>
          <p>
            Únicamente se aceptarán solicitudes de devolución, cambio o reembolso cuando el producto presente un desperfecto de fabricación comprobable.
          </p>
          <p>
            El cliente dispone de un plazo máximo de 24 horas desde la recepción del pedido para informar cualquier inconveniente.
          </p>
          <p>
            Para procesar la solicitud, el cliente deberá proporcionar:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Fotografías o videos donde se observe claramente el desperfecto.</li>
            <li>Nombre completo y número de pedido.</li>
            <li>Descripción detallada del problema detectado.</li>
          </ul>
          <p>
            Nuestro equipo evaluará la evidencia presentada y, en caso de confirmarse el desperfecto de fábrica, se procederá a:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Reemplazar el producto sin costo adicional; o</li>
            <li>Emitir un reembolso total, según corresponda.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">2. Casos que NO aplican para devolución o reembolso</h2>
          <p>
            No se realizarán devoluciones, cambios ni reembolsos en los siguientes casos:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>El cliente cambia de opinión después de recibir el producto.</li>
            <li>El producto no cumplió expectativas subjetivas o preferencias personales.</li>
            <li>Uso incorrecto, manipulación indebida o daños ocasionados por el cliente.</li>
            <li>Desgaste normal por uso.</li>
            <li>Solicitudes realizadas después de las 24 horas posteriores a la entrega.</li>
            <li>Errores de compra cometidos por el cliente (color, modelo, cantidad u otros detalles seleccionados al momento de realizar el pedido).</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">3. Plazo para reclamos</h2>
          <p>
            Toda reclamación relacionada con defectos de fábrica deberá realizarse dentro de las primeras 24 horas posteriores a la recepción del pedido.
          </p>
          <p>
            Una vez transcurrido dicho plazo, se considerará que el producto fue recibido en conformidad y no se aceptarán solicitudes de devolución, cambio o reembolso.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">4. Contacto</h2>
          <p>
            Para reportar un posible desperfecto de fábrica, comuníquese con nuestro equipo de atención al cliente a través de nuestros canales oficiales, adjuntando la evidencia correspondiente dentro del plazo establecido:
          </p>
          <ul className="list-none pl-0 space-y-1">
            <li><strong>Teléfono:</strong> {tel}</li>
            <li><strong>Email:</strong> {email}</li>
            <li><strong>Dirección:</strong> {direccion}</li>
          </ul>
          <p className="mt-6 italic">
            Al realizar una compra en {nombreComercio}, el cliente declara haber leído, comprendido y aceptado la presente Política de Devoluciones y Reembolsos.
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
