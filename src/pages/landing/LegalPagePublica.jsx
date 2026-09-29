import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { obtenerLandingPublica } from '../../services/landingPublicaService';
import { cargarFuenteGoogle } from '../../lib/landingDiseno';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import TiendaPaginaView from './TiendaPaginaView';
import LandingCodigoPublica from '../landing-simple/LandingCodigoPublica';
import { esPlantillaLegalGenerica, normalizarEstiloPaginaFooter, plantillaLegalPara } from '../landing-simple/plantillasLegalesCodigo';

const TITULOS = {
  politica_privacidad: 'Politica de privacidad',
  politica_reembolso: 'Politica de reembolso',
  terminos_servicio: 'Terminos del servicio',
  politica_envio: 'Politica de envio',
  aviso_legal: 'Aviso legal',
};

function tiendaParaPlantillaLegal(data) {
  return {
    nombre: data?.tienda?.nombre || data?.titulo || '',
    telefono: data?.contacto_landing?.telefono || data?.contacto?.telefono || data?.contacto_telefono || '',
    whatsapp: data?.contacto_landing?.whatsapp || data?.contacto?.whatsapp || data?.contacto_whatsapp || '',
    email: data?.contacto_landing?.email || data?.contacto?.email || data?.contacto_email || '',
    direccion_publica: data?.contacto_landing?.direccion || data?.contacto?.direccion || data?.contacto_direccion || '',
    ciudad_publica: data?.contacto_landing?.ciudad || data?.contacto_ciudad || '',
    ruc: data?.tienda?.ruc || '',
    documento: data?.tienda?.documento || '',
  };
}

export default function LegalPagePublica({ tipoPagina }) {
  const { slug } = useParams();
  const [estado, setEstado] = useState('cargando');
  const [data, setData] = useState(null);
  const [codigoLegal, setCodigoLegal] = useState(null);

  useEffect(() => {
    let activo = true;
    setEstado('cargando');
    setCodigoLegal(null);
    obtenerLandingPublica(slug)
      .then(async (home) => {
        if (!activo) return;
        const guardado = home?.content?.vistas?.legales?.[tipoPagina];
        const codigo = guardado?.html && !esPlantillaLegalGenerica(guardado)
          ? normalizarEstiloPaginaFooter(guardado)
          : plantillaLegalPara(tipoPagina, tiendaParaPlantillaLegal(home));
        if (home?.disponible && home?.template?.kind === 'codigo' && codigo?.html) {
          setData(home);
          setCodigoLegal(codigo);
          setEstado('ok');
          return;
        }
        const res = await obtenerLandingPublica(slug, { tipoPagina });
        if (!activo) return;
        if (res === null) return setEstado('no-encontrada');
        if (!res.disponible) return setEstado('no-disponible');
        setData(res);
        setEstado('ok');
        if (res.diseno?.fuente) cargarFuenteGoogle(res.diseno.fuente);
      })
      .catch(() => {
        if (activo) setEstado('no-encontrada');
      });
    return () => { activo = false; };
  }, [slug, tipoPagina]);

  useDocumentSeo(data?.seo || {
    titulo: `${TITULOS[tipoPagina] || 'Pagina legal'} - ${data?.tienda?.nombre || data?.titulo || ''}`,
    descripcion: data?.descripcion || '',
  }, typeof window !== 'undefined' ? window.location.href : undefined);

  if (estado === 'cargando') {
    return <div className="lp-status-page"><div className="lp-spinner" /></div>;
  }

  if (estado === 'no-encontrada' || estado === 'no-disponible') {
    return (
      <div className="lp-status-page">
        <h1>Esta pagina no esta disponible</h1>
        <p>El link puede haber cambiado o la tienda todavia no publico este contenido.</p>
      </div>
    );
  }

  if (codigoLegal) {
    return (
      <LandingCodigoPublica
        codigo={codigoLegal}
        titulo={`${TITULOS[tipoPagina] || 'Pagina legal'} - ${data?.tienda?.nombre || data?.titulo || ''}`}
        data={data}
        slug={slug}
        modoLegal
      />
    );
  }

  return <TiendaPaginaView data={data} slug={slug} />;
}
