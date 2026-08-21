import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { obtenerLandingPublica } from '../../services/landingPublicaService';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import { mapPublicDtoToTemplateData } from '../landing-simple/mapLandingToTemplateData';
import { ContactoSection, DatosContactoSection } from '../landing-simple/templates/sections';
import { Store, Loader } from 'lucide-react';
import { hexToRgba, resolverTemaPorSlug } from '../landing-simple/templates/themeUtils';
import StoreFooterLegal from './StoreFooterLegal';


export default function ContactoPublico() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
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
  }, []);

  useDocumentSeo(data?.seo_titulo || data?.titulo || 'Contacto', data?.seo_descripcion || '');

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
        </nav>
      </header>

      {/* Dos bloques distintos: los datos de contacto reales (dirección,
          ciudad, país, teléfono, email, horarios) y aparte las redes
          sociales. Antes esta página mostraba SOLO redes y descartaba los
          datos reales aunque estuvieran cargados. */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-10 pb-20">
        <h1 className="text-4xl font-bold text-center mb-4">Información de Contacto</h1>
        <p className="text-center max-w-2xl mx-auto mb-10 opacity-80" style={{ color: tema.texto }}>
          Si tiene consultas, reclamos o necesita asistencia relacionada con nuestros productos, pedidos o políticas, puede comunicarse con nosotros a través de los siguientes medios. Nuestro equipo de atención al cliente hará sus mejores esfuerzos para responder en el menor tiempo posible.
        </p>
        <div className="rounded-3xl px-6 shadow-sm" style={{ border: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.03) }}>
           <DatosContactoSection
             contacto={contacto}
             acento={tema.acento}
             tituloClase="font-bold"
             bordeSuave="transparent"
             textoSuave={(a) => ({ color: hexToRgba(tema.texto, a) })}
             isMobile={false}
           />
           <ContactoSection contacto={contacto} acento={tema.acento} tituloClase="font-bold" bordeSuave={bordeSuave} isMobile={false} />
        </div>
      </main>

      {/* Mismo pie que el home y el catálogo — consistente en las 3 páginas. */}
      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={false} />
    </div>
  );
}
